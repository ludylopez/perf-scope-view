import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ArrowLeft, TrendingUp } from "lucide-react";
import {
  CorrelationHeatmap,
  ScatterPlotCorrelation,
  DesempenoPotencialScatter,
  EdadDesempenoScatter,
  AntiguedadDesempenoScatter,
  CorrelationInterpretation,
  StatsTable,
  BoxPlotChart,
} from "@/components/charts";
import {
  pearsonCorrelation,
  correlationMatrix,
  calculateSegmentStatistics,
  mean,
  standardDeviation,
  median as calcMedian,
  percentile,
} from "@/lib/advancedStatistics";
import type { BoxPlotData, EstadisticasCompletas } from "@/types/analisis";

interface ColaboradorData {
  id: string;
  nombre?: string;
  desempeno: number;
  potencial: number;
  edad: number;
  antiguedadMeses: number;
  genero: string;
  nivel: string;
  tipoPuesto: string;
  renglon: string;
}

export default function AnalisisCorrelaciones() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [colaboradores, setColaboradores] = useState<ColaboradorData[]>([]);
  const [correlaciones, setCorrelaciones] = useState<Record<string, Record<string, number>>>({});

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

      // Usar final_evaluation_results_consolidated para evitar duplicados y tener datos correctos
      const { data: results } = await supabase
        .from("final_evaluation_results_consolidated")
        .select("colaborador_id, desempeno_porcentaje_promedio, potencial_porcentaje_promedio")
        .eq("periodo_id", periodo.id);

      if (!results || results.length === 0) {
        setError("No hay resultados de evaluación para este período");
        return;
      }

      const colaboradorIds = results.map(r => r.colaborador_id);

      // Obtener usuarios con todos los datos necesarios, incluyendo rol para filtrar administrativos
      const { data: users } = await supabase
        .from("users")
        .select("dpi, nombre, apellidos, edad, genero, nivel, tipo_puesto, renglon, fecha_ingreso, rol")
        .in("dpi", colaboradorIds);

      if (!users) {
        setError("No se pudieron cargar los datos de usuarios");
        return;
      }

      // Filtrar usuarios administrativos de monitoreo
      const validUsers = users?.filter(u => u.rol !== 'admin_general' && u.rol !== 'admin_rrhh') || [];

      // Combinar datos
      const now = new Date();
      const colabData: ColaboradorData[] = results
        .map(r => {
          const user = validUsers.find(u => u.dpi === r.colaborador_id);
          // Excluir usuarios administrativos de monitoreo
          if (!user || (user.rol === 'admin_general' || user.rol === 'admin_rrhh')) {
            return null;
          }

          const fechaIngreso = user.fecha_ingreso ? new Date(user.fecha_ingreso) : null;
          const antiguedadMeses = fechaIngreso
            ? Math.floor((now.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 30))
            : 0;

          // Usar desempeno_porcentaje_promedio de consolidated
          const desempeno = (r as any).desempeno_porcentaje_promedio ?? (r as any).desempeno_porcentaje ?? 0;
          const potencial = (r as any).potencial_porcentaje_promedio ?? (r as any).potencial_porcentaje ?? 0;

          return {
            id: r.colaborador_id,
            nombre: `${user.nombre || ""} ${user.apellidos || ""}`.trim(),
            desempeno,
            potencial,
            edad: user.edad || 0,
            antiguedadMeses,
            genero: user.genero || "no_especificado",
            nivel: user.nivel || "",
            tipoPuesto: user.tipo_puesto || "",
            renglon: user.renglon || "",
          };
        })
        .filter((c): c is ColaboradorData => c !== null && c.desempeno > 0);

      setColaboradores(colabData);

      // Calcular matriz de correlaciones
      if (colabData.length > 2) {
        const variables: Record<string, number[]> = {
          Desempeño: colabData.map(c => c.desempeno),
          Potencial: colabData.filter(c => c.potencial > 0).map(c => c.potencial),
          Edad: colabData.filter(c => c.edad > 0).map(c => c.edad),
          Antigüedad: colabData.filter(c => c.antiguedadMeses > 0).map(c => c.antiguedadMeses),
        };

        // Solo incluir variables con suficientes datos
        const validVariables: Record<string, number[]> = {};
        Object.entries(variables).forEach(([key, values]) => {
          if (values.length >= 10) {
            validVariables[key] = values;
          }
        });

        if (Object.keys(validVariables).length >= 2) {
          const matrix = correlationMatrix(validVariables);
          setCorrelaciones(matrix);
        }
      }
    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("Error al cargar los datos de correlaciones");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Cargando análisis de correlaciones...</p>
          </div>
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

  // Preparar datos para gráficos
  const scatterDataDesempenoPotencial = colaboradores
    .filter(c => c.potencial > 0)
    .map(c => ({
      nombre: c.nombre,
      desempeno: c.desempeno,
      potencial: c.potencial,
      grupo: c.tipoPuesto,
    }));

  const scatterDataEdad = colaboradores
    .filter(c => c.edad > 0)
    .map(c => ({
      nombre: c.nombre,
      edad: c.edad,
      desempeno: c.desempeno,
      grupo: c.genero,
    }));

  const scatterDataAntiguedad = colaboradores
    .filter(c => c.antiguedadMeses > 0)
    .map(c => ({
      nombre: c.nombre,
      antiguedadMeses: c.antiguedadMeses,
      desempeno: c.desempeno,
    }));

  // Calcular estadísticas por segmento
  const calcularStatsSegmento = (
    segmentos: Array<{ nombre: string; valores: number[] }>
  ): Array<{ segmento: string; stats: EstadisticasCompletas; n: number }> => {
    return segmentos
      .filter(s => s.valores.length > 0)
      .map(s => {
        const vals = s.valores;
        return {
          segmento: s.nombre,
          n: vals.length,
          stats: {
            promedio: mean(vals),
            mediana: calcMedian(vals),
            desviacion: standardDeviation(vals),
            min: Math.min(...vals),
            max: Math.max(...vals),
            q1: percentile(vals, 25),
            q3: percentile(vals, 75),
          },
        };
      });
  };

  // Stats por género
  const generos = [...new Set(colaboradores.map(c => c.genero))].filter(Boolean);
  const statsPorGenero = calcularStatsSegmento(
    generos.map(g => ({
      nombre: g === "masculino" ? "Masculino" : g === "femenino" ? "Femenino" : g,
      valores: colaboradores.filter(c => c.genero === g).map(c => c.desempeno),
    }))
  );

  // Stats por tipo de puesto
  const tiposPuesto = [...new Set(colaboradores.map(c => c.tipoPuesto))].filter(Boolean);
  const statsPorTipo = calcularStatsSegmento(
    tiposPuesto.map(t => ({
      nombre: t === "administrativo" ? "Administrativo" : t === "operativo" ? "Operativo" : t,
      valores: colaboradores.filter(c => c.tipoPuesto === t).map(c => c.desempeno),
    }))
  );

  // Box plot por rango de edad
  const rangosEdad = [
    { nombre: "18-25", min: 18, max: 25 },
    { nombre: "26-35", min: 26, max: 35 },
    { nombre: "36-45", min: 36, max: 45 },
    { nombre: "46-55", min: 46, max: 55 },
    { nombre: "56+", min: 56, max: 100 },
  ];

  const boxPlotEdad: BoxPlotData[] = rangosEdad
    .map(rango => {
      const valores = colaboradores
        .filter(c => c.edad >= rango.min && c.edad <= rango.max)
        .map(c => c.desempeno);
      if (valores.length < 2) return null;

      return {
        segment: rango.nombre,
        min: Math.min(...valores),
        q1: percentile(valores, 25),
        median: calcMedian(valores),
        q3: percentile(valores, 75),
        max: Math.max(...valores),
        mean: mean(valores),
      };
    })
    .filter((d): d is BoxPlotData => d !== null);

  // Box plot por rango de antigüedad
  const rangosAntiguedad = [
    { nombre: "0-1 año", min: 0, max: 12 },
    { nombre: "1-2 años", min: 13, max: 24 },
    { nombre: "2-5 años", min: 25, max: 60 },
    { nombre: "5-10 años", min: 61, max: 120 },
    { nombre: "10+ años", min: 121, max: 600 },
  ];

  const boxPlotAntiguedad: BoxPlotData[] = rangosAntiguedad
    .map(rango => {
      const valores = colaboradores
        .filter(c => c.antiguedadMeses >= rango.min && c.antiguedadMeses <= rango.max)
        .map(c => c.desempeno);
      if (valores.length < 2) return null;

      return {
        segment: rango.nombre,
        min: Math.min(...valores),
        q1: percentile(valores, 25),
        median: calcMedian(valores),
        q3: percentile(valores, 75),
        max: Math.max(...valores),
        mean: mean(valores),
      };
    })
    .filter((d): d is BoxPlotData => d !== null);

  // Correlaciones específicas
  const corrDesempenoPotencial =
    scatterDataDesempenoPotencial.length > 2
      ? pearsonCorrelation(
          scatterDataDesempenoPotencial.map(d => d.desempeno),
          scatterDataDesempenoPotencial.map(d => d.potencial)
        )
      : 0;

  const corrEdadDesempeno =
    scatterDataEdad.length > 2
      ? pearsonCorrelation(
          scatterDataEdad.map(d => d.edad),
          scatterDataEdad.map(d => d.desempeno)
        )
      : 0;

  const corrAntiguedadDesempeno =
    scatterDataAntiguedad.length > 2
      ? pearsonCorrelation(
          scatterDataAntiguedad.map(d => d.antiguedadMeses),
          scatterDataAntiguedad.map(d => d.desempeno)
        )
      : 0;

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
              <TrendingUp className="h-8 w-8" />
              Análisis de Correlaciones
            </h1>
            <p className="text-muted-foreground mt-1">
              Período: <span className="font-semibold">{periodoNombre}</span> |{" "}
              <span className="font-semibold">{colaboradores.length}</span> colaboradores analizados
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Estadística Avanzada</p>
            <p>Correlaciones Multidimensionales</p>
          </div>
        </div>

        <Tabs defaultValue="matriz" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="matriz">Matriz</TabsTrigger>
            <TabsTrigger value="desempeno-potencial">Desempeño-Potencial</TabsTrigger>
            <TabsTrigger value="edad">Por Edad</TabsTrigger>
            <TabsTrigger value="antiguedad">Por Antigüedad</TabsTrigger>
            <TabsTrigger value="segmentos">Por Segmentos</TabsTrigger>
          </TabsList>

          <TabsContent value="matriz" className="space-y-6 mt-6">
            {Object.keys(correlaciones).length > 0 ? (
              <>
                <CorrelationHeatmap
                  matrix={correlaciones}
                  title="Matriz de Correlaciones"
                  description="Correlaciones de Pearson entre variables numéricas. Valores cercanos a 1 o -1 indican correlación fuerte."
                />
                <Card>
                  <CardHeader>
                    <CardTitle>Interpretación de la Matriz</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-muted-foreground">
                    <p>
                      <strong>Correlación positiva (verde):</strong> Cuando una variable aumenta, la otra también tiende a aumentar.
                    </p>
                    <p>
                      <strong>Correlación negativa (rojo):</strong> Cuando una variable aumenta, la otra tiende a disminuir.
                    </p>
                    <p>
                      <strong>Sin correlación (blanco):</strong> No hay relación lineal significativa entre las variables.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="font-medium">|r| &lt; 0.2</p>
                        <p className="text-xs">Muy débil</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="font-medium">0.2 ≤ |r| &lt; 0.4</p>
                        <p className="text-xs">Débil</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="font-medium">0.4 ≤ |r| &lt; 0.6</p>
                        <p className="text-xs">Moderada</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="font-medium">|r| ≥ 0.6</p>
                        <p className="text-xs">Fuerte</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Datos insuficientes</AlertTitle>
                <AlertDescription>
                  Se requieren al menos 10 registros con datos completos para calcular correlaciones.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="desempeno-potencial" className="space-y-6 mt-6">
            {scatterDataDesempenoPotencial.length > 2 ? (
              <>
                <DesempenoPotencialScatter
                  data={scatterDataDesempenoPotencial}
                  title="Correlación Desempeño vs Potencial"
                  description="Cada punto representa un colaborador. La línea de tendencia muestra la relación entre ambas variables."
                  showQuadrants
                />
                <CorrelationInterpretation
                  correlation={corrDesempenoPotencial}
                  variable1="Desempeño"
                  variable2="Potencial"
                />
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Datos insuficientes para el análisis.</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="edad" className="space-y-6 mt-6">
            {scatterDataEdad.length > 2 ? (
              <>
                <EdadDesempenoScatter
                  data={scatterDataEdad}
                  title="Correlación Edad vs Desempeño"
                />
                <CorrelationInterpretation
                  correlation={corrEdadDesempeno}
                  variable1="Edad"
                  variable2="Desempeño"
                />
                {boxPlotEdad.length > 0 && (
                  <BoxPlotChart
                    data={boxPlotEdad}
                    title="Distribución de Desempeño por Rango de Edad"
                    description="Box plots que muestran la distribución del desempeño en cada grupo etario"
                    yLabel="Desempeño (%)"
                  />
                )}
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Datos de edad insuficientes para el análisis.</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="antiguedad" className="space-y-6 mt-6">
            {scatterDataAntiguedad.length > 2 ? (
              <>
                <AntiguedadDesempenoScatter
                  data={scatterDataAntiguedad}
                  title="Correlación Antigüedad vs Desempeño"
                />
                <CorrelationInterpretation
                  correlation={corrAntiguedadDesempeno}
                  variable1="Antigüedad"
                  variable2="Desempeño"
                />
                {boxPlotAntiguedad.length > 0 && (
                  <BoxPlotChart
                    data={boxPlotAntiguedad}
                    title="Distribución de Desempeño por Antigüedad"
                    description="Box plots que muestran la distribución del desempeño según tiempo en la organización"
                    yLabel="Desempeño (%)"
                  />
                )}
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Datos de antigüedad insuficientes para el análisis.</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="segmentos" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {statsPorGenero.length > 0 && (
                <StatsTable
                  data={statsPorGenero}
                  title="Estadísticas por Género"
                  showBoxPlot
                />
              )}
              {statsPorTipo.length > 0 && (
                <StatsTable
                  data={statsPorTipo}
                  title="Estadísticas por Tipo de Puesto"
                  showBoxPlot
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
