import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ArrowLeft, BarChart3, TrendingUp, Target, Brain } from "lucide-react";
import {
  CorrelationHeatmap,
  ScatterPlotCorrelation,
  CorrelationInterpretation,
  StatsTable,
} from "@/components/charts";
import {
  multipleRegression,
  oneWayANOVA,
  identifyPredictiveFactors,
  pearsonCorrelation,
  mean,
  standardDeviation,
  type MultipleRegressionResult,
  type ANOVAResult,
  type PredictiveFactor,
} from "@/lib/advancedStatistics";
import type { EstadisticasCompletas } from "@/types/analisis";

interface ColaboradorCompleto {
  id: string;
  desempeno: number;
  potencial: number;
  edad: number;
  antiguedadMeses: number;
  genero: string;
  tipoPuesto: string;
  nivel: string;
  direccion: string;
  nps?: number;
  dimensiones?: Record<string, number>;
}

export default function AnalisisEstadisticoAvanzado() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [colaboradores, setColaboradores] = useState<ColaboradorCompleto[]>([]);
  
  // Resultados de análisis
  const [regresionMultiple, setRegresionMultiple] = useState<MultipleRegressionResult | null>(null);
  const [anovaGenero, setAnovaGenero] = useState<ANOVAResult | null>(null);
  const [anovaTipoPuesto, setAnovaTipoPuesto] = useState<ANOVAResult | null>(null);
  const [anovaNivel, setAnovaNivel] = useState<ANOVAResult | null>(null);
  const [factoresPredictivos, setFactoresPredictivos] = useState<PredictiveFactor[]>([]);
  const [correlacionNPS, setCorrelacionNPS] = useState<number | null>(null);
  const [productividadPorDimension, setProductividadPorDimension] = useState<Array<{
    dimension: string;
    correlacion: number;
    importancia: number;
  }>>([]);
  const [correlacionesMultidimensionales, setCorrelacionesMultidimensionales] = useState<Array<{
    variables: string[];
    correlacion: number;
    interpretacion: string;
  }>>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const periodo = await getActivePeriod();
      if (!periodo) {
        setError("No se encontró un período de evaluación activo");
        return;
      }

      setPeriodoNombre(periodo.nombre);

      // Cargar resultados consolidados
      const { data: results } = await supabase
        .from("final_evaluation_results_consolidated")
        .select("colaborador_id, desempeno_porcentaje_promedio, potencial_porcentaje_promedio")
        .eq("periodo_id", periodo.id);

      if (!results || results.length === 0) {
        setError("No hay resultados de evaluación");
        return;
      }

      const colaboradorIds = results.map(r => r.colaborador_id);

      // Cargar datos de usuarios
      const { data: users } = await supabase
        .from("users")
        .select("dpi, edad, genero, tipo_puesto, nivel, direccion_unidad, area, fecha_ingreso, rol")
        .in("dpi", colaboradorIds);

      // Cargar NPS
      const { data: npsData } = await supabase
        .from("evaluations")
        .select("usuario_id, nps_score")
        .eq("periodo_id", periodo.id)
        .eq("tipo", "auto")
        .eq("estado", "enviado")
        .not("nps_score", "is", null);

      // Filtrar usuarios administrativos
      const validUsers = users?.filter(u => u.rol !== 'admin_general' && u.rol !== 'admin_rrhh') || [];
      const npsMap = new Map(npsData?.map(e => [e.usuario_id, e.nps_score]) || []);

      // Combinar datos
      const now = new Date();
      const colabData: ColaboradorCompleto[] = results
        .map(r => {
          const user = validUsers.find(u => u.dpi === r.colaborador_id);
          if (!user) return null;

          const fechaIngreso = user.fecha_ingreso ? new Date(user.fecha_ingreso) : null;
          const antiguedadMeses = fechaIngreso
            ? Math.floor((now.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 30))
            : 0;

          const desempeno = (r as any).desempeno_porcentaje_promedio ?? 0;
          const potencial = (r as any).potencial_porcentaje_promedio ?? 0;

          return {
            id: r.colaborador_id,
            desempeno,
            potencial,
            edad: user.edad || 0,
            antiguedadMeses,
            genero: user.genero || "no_especificado",
            tipoPuesto: user.tipo_puesto || "",
            nivel: user.nivel || "",
            direccion: user.direccion_unidad || user.area || "",
            nps: npsMap.get(r.colaborador_id),
          };
        })
        .filter((c): c is ColaboradorCompleto => c !== null && c.desempeno > 0);

      setColaboradores(colabData);

      // 1. REGRESIÓN MÚLTIPLE
      if (colabData.length >= 20) {
        const validData = colabData.filter(c => c.edad > 0 && c.antiguedadMeses > 0);
        if (validData.length >= 20) {
          const regression = multipleRegression(
            validData.map(c => c.desempeno),
            {
              Edad: validData.map(c => c.edad),
              Antigüedad: validData.map(c => c.antiguedadMeses),
              Potencial: validData.filter(c => c.potencial > 0).map(c => c.potencial),
            }
          );
          setRegresionMultiple(regression);
        }
      }

      // 2. ANOVA POR GÉNERO
      const gruposGenero: Record<string, number[]> = {};
      colabData.forEach(c => {
        if (c.genero && c.genero !== "no_especificado") {
          if (!gruposGenero[c.genero]) gruposGenero[c.genero] = [];
          gruposGenero[c.genero].push(c.desempeno);
        }
      });
      if (Object.keys(gruposGenero).length >= 2) {
        setAnovaGenero(oneWayANOVA(gruposGenero));
      }

      // 3. ANOVA POR TIPO DE PUESTO
      const gruposTipo: Record<string, number[]> = {};
      colabData.forEach(c => {
        if (c.tipoPuesto) {
          if (!gruposTipo[c.tipoPuesto]) gruposTipo[c.tipoPuesto] = [];
          gruposTipo[c.tipoPuesto].push(c.desempeno);
        }
      });
      if (Object.keys(gruposTipo).length >= 2) {
        setAnovaTipoPuesto(oneWayANOVA(gruposTipo));
      }

      // 4. ANOVA POR NIVEL
      const gruposNivel: Record<string, number[]> = {};
      colabData.forEach(c => {
        if (c.nivel) {
          if (!gruposNivel[c.nivel]) gruposNivel[c.nivel] = [];
          gruposNivel[c.nivel].push(c.desempeno);
        }
      });
      if (Object.keys(gruposNivel).length >= 2) {
        setAnovaNivel(oneWayANOVA(gruposNivel));
      }

      // 5. FACTORES PREDICTIVOS
      const factores = identifyPredictiveFactors(
        colabData.map(c => c.desempeno),
        {
          Edad: colabData.map(c => c.edad),
          Antigüedad: colabData.map(c => c.antiguedadMeses),
          Potencial: colabData.map(c => c.potencial),
        }
      );
      setFactoresPredictivos(factores);

      // 6. CORRELACIÓN NPS-DESEMPEÑO
      const datosNPS = colabData.filter(c => c.nps !== undefined && c.nps !== null);
      if (datosNPS.length >= 10) {
        const corr = pearsonCorrelation(
          datosNPS.map(c => c.nps!),
          datosNPS.map(c => c.desempeno)
        );
        setCorrelacionNPS(corr);
      }

      // 7. PRODUCTIVIDAD POR DIMENSIÓN (cargar dimensiones desde evaluaciones)
      await loadProductividadPorDimension(periodo.id, colabData);

      // 8. CORRELACIONES MULTIDIMENSIONALES (interacciones entre variables)
      const validData = colabData.filter(c => c.edad > 0 && c.antiguedadMeses > 0 && c.potencial > 0);
      if (validData.length >= 20) {
        // Calcular interacciones: Edad × Antigüedad, Edad × Potencial, Antigüedad × Potencial
        const interacciones: Array<{ variables: string[]; correlacion: number; interpretacion: string }> = [];

        // Edad × Antigüedad vs Desempeño
        const edadAntiguedad = validData.map(c => c.edad * c.antiguedadMeses);
        const corrEdadAnt = pearsonCorrelation(edadAntiguedad, validData.map(c => c.desempeno));
        if (Math.abs(corrEdadAnt) > 0.1) {
          interacciones.push({
            variables: ['Edad', 'Antigüedad'],
            correlacion: corrEdadAnt,
            interpretacion: corrEdadAnt > 0
              ? 'La combinación de mayor edad y antigüedad se asocia con mejor desempeño.'
              : 'La combinación de mayor edad y antigüedad se asocia con menor desempeño.',
          });
        }

        // Edad × Potencial vs Desempeño
        const edadPotencial = validData.map(c => c.edad * c.potencial);
        const corrEdadPot = pearsonCorrelation(edadPotencial, validData.map(c => c.desempeno));
        if (Math.abs(corrEdadPot) > 0.1) {
          interacciones.push({
            variables: ['Edad', 'Potencial'],
            correlacion: corrEdadPot,
            interpretacion: corrEdadPot > 0
              ? 'Colaboradores mayores con alto potencial muestran mejor desempeño.'
              : 'Colaboradores mayores con alto potencial muestran menor desempeño.',
          });
        }

        // Antigüedad × Potencial vs Desempeño
        const antiguedadPotencial = validData.map(c => c.antiguedadMeses * c.potencial);
        const corrAntPot = pearsonCorrelation(antiguedadPotencial, validData.map(c => c.desempeno));
        if (Math.abs(corrAntPot) > 0.1) {
          interacciones.push({
            variables: ['Antigüedad', 'Potencial'],
            correlacion: corrAntPot,
            interpretacion: corrAntPot > 0
              ? 'Mayor antigüedad combinada con alto potencial se asocia con mejor desempeño.'
              : 'Mayor antigüedad combinada con alto potencial se asocia con menor desempeño.',
          });
        }

        setCorrelacionesMultidimensionales(interacciones.sort((a, b) => Math.abs(b.correlacion) - Math.abs(a.correlacion)));
      }

    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("Error al cargar los datos de análisis estadístico avanzado");
    } finally {
      setLoading(false);
    }
  };

  const loadProductividadPorDimension = async (periodoId: string, colabData: ColaboradorCompleto[]) => {
    try {
      // Cargar instrumentos para crear mapa de items a dimensiones
      const { data: instruments } = await supabase
        .from("instrument_configs")
        .select("id, nivel, dimensiones_desempeno")
        .eq("activo", true);

      if (!instruments) return;

      // Crear mapa de item -> dimensión (igual que en AnalisisPorDimension)
      const itemToDimensionMap = new Map<string, string>();
      instruments.forEach(inst => {
        const dims = inst.dimensiones_desempeno as Array<{
          id: string;
          nombre: string;
          items: Array<{ id: string }>;
        }> | null;

        if (dims && Array.isArray(dims)) {
          dims.forEach(dim => {
            if (dim.items && Array.isArray(dim.items)) {
              dim.items.forEach(item => {
                itemToDimensionMap.set(item.id, dim.nombre);
              });
            }
          });
        }
      });

      // Cargar evaluaciones (jefe 70%, auto 30%)
      const { data: bossEvals } = await supabase
        .from("evaluations")
        .select("colaborador_id, responses")
        .eq("periodo_id", periodoId)
        .eq("tipo", "jefe")
        .eq("estado", "enviado");

      const { data: selfEvals } = await supabase
        .from("evaluations")
        .select("colaborador_id, responses")
        .eq("periodo_id", periodoId)
        .eq("tipo", "auto")
        .eq("estado", "enviado");

      if (!bossEvals && !selfEvals) return;

      // Calcular promedios por dimensión para cada colaborador (con peso 70/30)
      const dimensionScores: Record<string, Record<string, { suma: number; count: number }>> = {};
      const colaboradorDesempeno: Record<string, number> = {};
      
      colabData.forEach(c => {
        colaboradorDesempeno[c.id] = c.desempeno;
      });

      const processResponses = (responses: Record<string, number> | null, peso: number, colaboradorId: string) => {
        if (!responses || typeof responses !== "object") return;

        Object.entries(responses).forEach(([itemId, score]) => {
          if (typeof score !== "number") return;

          // Buscar dimensión por item ID
          let dimension = itemToDimensionMap.get(itemId);

          // Fallback: intentar extraer número de dimensión del ID
          if (!dimension && itemId.match(/^d\d+_i\d+_/)) {
            const dimNum = itemId.match(/^d(\d+)_/)?.[1];
            if (dimNum) {
              for (const [key, dimName] of itemToDimensionMap.entries()) {
                if (key.match(/^d\d+_/) && key.match(/^d(\d+)_/)?.[1] === dimNum) {
                  dimension = dimName;
                  break;
                }
              }
            }
          }

          if (dimension) {
            if (!dimensionScores[dimension]) {
              dimensionScores[dimension] = {};
            }
            if (!dimensionScores[dimension][colaboradorId]) {
              dimensionScores[dimension][colaboradorId] = { suma: 0, count: 0 };
            }
            // Convertir score (1-5) a porcentaje (0-100)
            const porcentaje = ((score - 1) / 4) * 100;
            dimensionScores[dimension][colaboradorId].suma += porcentaje * peso;
            dimensionScores[dimension][colaboradorId].count += peso;
          }
        });
      };

      // Procesar evaluaciones de jefes (peso 70%)
      bossEvals?.forEach(ev => {
        const colaboradorId = ev.colaborador_id;
        if (colaboradorDesempeno[colaboradorId]) {
          processResponses(ev.responses as Record<string, number> | null, 0.7, colaboradorId);
        }
      });

      // Procesar autoevaluaciones (peso 30%)
      selfEvals?.forEach(ev => {
        const colaboradorId = ev.colaborador_id;
        if (colaboradorDesempeno[colaboradorId]) {
          processResponses(ev.responses as Record<string, number> | null, 0.3, colaboradorId);
        }
      });

      // Calcular correlación de cada dimensión con desempeño
      const productividad: Array<{ dimension: string; correlacion: number; importancia: number }> = [];
      
      for (const [dimNombre, colaboradoresScores] of Object.entries(dimensionScores)) {
        const desempenos: number[] = [];
        const promediosDimension: number[] = [];

        Object.entries(colaboradoresScores).forEach(([colabId, data]) => {
          if (colaboradorDesempeno[colabId] && data.count > 0) {
            const promedioDim = data.suma / data.count;
            desempenos.push(colaboradorDesempeno[colabId]);
            promediosDimension.push(promedioDim);
          }
        });

        if (desempenos.length >= 10) {
          const corr = pearsonCorrelation(desempenos, promediosDimension);
          productividad.push({
            dimension: dimNombre,
            correlacion: corr,
            importancia: Math.abs(corr) * 100,
          });
        }
      }

      setProductividadPorDimension(productividad.sort((a, b) => b.importancia - a.importancia));
    } catch (err) {
      console.error("Error cargando productividad por dimensión:", err);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              to="/analisis"
              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a dashboards
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8" />
              Análisis Estadístico Avanzado
            </h1>
            <p className="text-muted-foreground mt-1">
              Período: <span className="font-semibold">{periodoNombre}</span> |{" "}
              <span className="font-semibold">{colaboradores.length}</span> colaboradores analizados
            </p>
          </div>
        </div>

        <Tabs defaultValue="regresion" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="regresion">Regresión Múltiple</TabsTrigger>
            <TabsTrigger value="anova">ANOVA</TabsTrigger>
            <TabsTrigger value="factores">Factores Predictivos</TabsTrigger>
            <TabsTrigger value="nps">NPS-Desempeño</TabsTrigger>
            <TabsTrigger value="dimensiones">Productividad por Dimensión</TabsTrigger>
            <TabsTrigger value="multidimensional">Correlaciones Multidimensionales</TabsTrigger>
          </TabsList>

          {/* REGRESIÓN MÚLTIPLE */}
          <TabsContent value="regresion" className="space-y-6 mt-6">
            {regresionMultiple ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Regresión Múltiple: Predicción de Desempeño</CardTitle>
                    <CardDescription>
                      Modelo que predice el desempeño basado en múltiples variables independientes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">R² Ajustado</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {(regresionMultiple.adjustedRSquared * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">F-Estadístico</p>
                        <p className="text-2xl font-bold text-green-600">
                          {regresionMultiple.fStatistic.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Significancia</p>
                        <p className="text-2xl font-bold text-purple-600 capitalize">
                          {regresionMultiple.significance.replace('_', ' ')}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Coeficientes del Modelo</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between p-2 bg-muted rounded">
                          <span>Intercepto:</span>
                          <span className="font-mono">{regresionMultiple.intercept.toFixed(4)}</span>
                        </div>
                        {Object.entries(regresionMultiple.coefficients).map(([varName, coeff]) => (
                          <div key={varName} className="flex justify-between p-2 bg-muted rounded">
                            <span>{varName}:</span>
                            <span className="font-mono">{coeff > 0 ? '+' : ''}{coeff.toFixed(4)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{regresionMultiple.interpretation}</AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Datos insuficientes para regresión múltiple (se requieren al menos 20 observaciones con datos completos).</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* ANOVA */}
          <TabsContent value="anova" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {anovaGenero && (
                <Card>
                  <CardHeader>
                    <CardTitle>ANOVA: Por Género</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {anovaGenero.groups.map(g => (
                        <div key={g.name} className="flex justify-between p-2 bg-muted rounded">
                          <span className="capitalize">{g.name}:</span>
                          <span className="font-mono">{g.mean.toFixed(1)}% (n={g.n})</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-blue-50 rounded">
                      <p className="text-sm font-semibold">F = {anovaGenero.fStatistic.toFixed(4)}</p>
                      <p className="text-sm">p = {anovaGenero.pValue.toFixed(4)}</p>
                      <p className="text-sm mt-2">{anovaGenero.interpretation}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {anovaTipoPuesto && (
                <Card>
                  <CardHeader>
                    <CardTitle>ANOVA: Por Tipo de Puesto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {anovaTipoPuesto.groups.map(g => (
                        <div key={g.name} className="flex justify-between p-2 bg-muted rounded">
                          <span className="capitalize">{g.name}:</span>
                          <span className="font-mono">{g.mean.toFixed(1)}% (n={g.n})</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-green-50 rounded">
                      <p className="text-sm font-semibold">F = {anovaTipoPuesto.fStatistic.toFixed(4)}</p>
                      <p className="text-sm">p = {anovaTipoPuesto.pValue.toFixed(4)}</p>
                      <p className="text-sm mt-2">{anovaTipoPuesto.interpretation}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {anovaNivel && (
                <Card>
                  <CardHeader>
                    <CardTitle>ANOVA: Por Nivel Jerárquico</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {anovaNivel.groups.map(g => (
                        <div key={g.name} className="flex justify-between p-2 bg-muted rounded">
                          <span>{g.name}:</span>
                          <span className="font-mono">{g.mean.toFixed(1)}% (n={g.n})</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-purple-50 rounded">
                      <p className="text-sm font-semibold">F = {anovaNivel.fStatistic.toFixed(4)}</p>
                      <p className="text-sm">p = {anovaNivel.pValue.toFixed(4)}</p>
                      <p className="text-sm mt-2">{anovaNivel.interpretation}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {!anovaGenero && !anovaTipoPuesto && !anovaNivel && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Datos insuficientes para análisis ANOVA.</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* FACTORES PREDICTIVOS */}
          <TabsContent value="factores" className="space-y-6 mt-6">
            {factoresPredictivos.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Factores Predictivos del Desempeño</CardTitle>
                  <CardDescription>
                    Variables que mejor predicen el desempeño de los colaboradores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {factoresPredictivos.map((factor, idx) => (
                      <div key={factor.variable} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-semibold">{factor.variable}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Importancia</p>
                            <p className="text-xl font-bold">{factor.importance.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Correlación: {factor.correlation > 0 ? '+' : ''}{factor.correlation.toFixed(4)}</span>
                            <span className="capitalize">{factor.direction === 'positive' ? 'Positiva' : 'Negativa'}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${factor.direction === 'positive' ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{ width: `${factor.importance}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{factor.interpretation}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No se pudieron identificar factores predictivos.</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* NPS-DESEMPEÑO */}
          <TabsContent value="nps" className="space-y-6 mt-6">
            {correlacionNPS !== null ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Correlación NPS-Desempeño</CardTitle>
                    <CardDescription>
                      Relación entre la satisfacción del colaborador (NPS) y su desempeño
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="p-4 bg-blue-50 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">Correlación</p>
                        <p className="text-3xl font-bold text-blue-600">
                          {correlacionNPS > 0 ? '+' : ''}{correlacionNPS.toFixed(4)}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">Interpretación</p>
                        <p className="text-lg font-semibold text-green-600 capitalize">
                          {Math.abs(correlacionNPS) > 0.5 ? 'Fuerte' : 
                           Math.abs(correlacionNPS) > 0.3 ? 'Moderada' : 'Débil'}
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">Dirección</p>
                        <p className="text-lg font-semibold text-purple-600 capitalize">
                          {correlacionNPS > 0 ? 'Positiva' : 'Negativa'}
                        </p>
                      </div>
                    </div>
                    <CorrelationInterpretation
                      correlation={correlacionNPS}
                      variable1="NPS (Satisfacción)"
                      variable2="Desempeño"
                    />
                    <Alert className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {Math.abs(correlacionNPS) > 0.3
                          ? "Existe una relación significativa entre la satisfacción del colaborador y su desempeño. Los colaboradores más satisfechos tienden a tener mejor desempeño."
                          : "La relación entre satisfacción y desempeño es débil. Esto sugiere que otros factores influyen más en el desempeño que la satisfacción medida por NPS."}
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No hay suficientes datos de NPS para calcular la correlación (se requieren al menos 10 observaciones).</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* PRODUCTIVIDAD POR DIMENSIÓN */}
          <TabsContent value="dimensiones" className="space-y-6 mt-6">
            {productividadPorDimension.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Productividad por Dimensión</CardTitle>
                  <CardDescription>
                    Qué dimensiones de evaluación impactan más en el desempeño global
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {productividadPorDimension.slice(0, 10).map((dim, idx) => (
                      <div key={dim.dimension} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-semibold">{dim.dimension}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Impacto</p>
                            <p className="text-xl font-bold">{dim.importancia.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Correlación: {dim.correlacion > 0 ? '+' : ''}{dim.correlacion.toFixed(4)}</span>
                            <span>{dim.correlacion > 0 ? 'Positiva' : 'Negativa'}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${dim.correlacion > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{ width: `${dim.importancia}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No se pudieron calcular las correlaciones por dimensión. Verifique que haya datos de evaluaciones con respuestas por dimensión.</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* CORRELACIONES MULTIDIMENSIONALES */}
          <TabsContent value="multidimensional" className="space-y-6 mt-6">
            {correlacionesMultidimensionales.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Correlaciones Multidimensionales</CardTitle>
                  <CardDescription>
                    Análisis de interacciones entre variables: cómo la combinación de factores afecta el desempeño
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {correlacionesMultidimensionales.map((interaccion, idx) => (
                      <div key={idx} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-lg">
                              {interaccion.variables.join(' × ')}
                            </h4>
                            <p className="text-sm text-muted-foreground">Interacción con Desempeño</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Correlación</p>
                            <p className={`text-2xl font-bold ${Math.abs(interaccion.correlacion) > 0.3 ? 'text-blue-600' : 'text-gray-600'}`}>
                              {interaccion.correlacion > 0 ? '+' : ''}{interaccion.correlacion.toFixed(4)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div
                              className={`h-2 rounded-full ${interaccion.correlacion > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.abs(interaccion.correlacion) * 100}%` }}
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">{interaccion.interpretacion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Las correlaciones multidimensionales muestran cómo interactúan las variables entre sí. 
                      Una correlación positiva indica que la combinación de ambas variables se asocia con mejor desempeño.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No se encontraron interacciones significativas entre variables (se requieren al menos 20 observaciones con datos completos).
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
