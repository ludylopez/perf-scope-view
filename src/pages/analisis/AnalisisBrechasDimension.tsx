import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ArrowLeft, Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  StatCard,
  StatCardGrid,
  LollipopChart,
  RadarMultiLevel,
  BoxPlotChart,
  StatsTable,
  DivergingBarChart,
} from "@/components/charts";
import { mean, standardDeviation, median as calcMedian, percentile } from "@/lib/advancedStatistics";
import type { BoxPlotData, EstadisticasCompletas, RadarChartData } from "@/types/analisis";

interface DimensionBrechas {
  id: string;
  nombre: string;
  promedioAuto: number;
  promedioJefe: number;
  promedioGlobal: number;
  brecha: number; // jefe - auto
  brechaVsOrg: number;
  clasificacion: "fortaleza" | "oportunidad" | "critica";
  stats: EstadisticasCompletas;
  cantidadEvaluados: number;
}

interface NivelDimensiones {
  nivel: string;
  dimensiones: Record<string, number>;
}

export default function AnalisisBrechasDimension() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [dimensiones, setDimensiones] = useState<DimensionBrechas[]>([]);
  const [porNivel, setPorNivel] = useState<NivelDimensiones[]>([]);
  const [promedioOrg, setPromedioOrg] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const periodo = await getActivePeriod();
      if (!periodo) {
        setError("No se encontró un período activo");
        return;
      }

      setPeriodoNombre(periodo.nombre);

      // Obtener resultados con detalles de dimensiones
      const { data: results } = await supabase
        .from("final_evaluation_results")
        .select("colaborador_id, desempeno_porcentaje, resultado_final")
        .eq("periodo_id", periodo.id);

      if (!results || results.length === 0) {
        setError("No hay resultados de evaluación");
        return;
      }

      // Obtener usuarios con nivel
      const colaboradorIds = results.map(r => r.colaborador_id);
      const { data: users } = await supabase
        .from("users")
        .select("dpi, nivel")
        .in("dpi", colaboradorIds);

      // Calcular promedio organizacional
      const allDesempeno = results
        .map(r => r.desempeno_porcentaje)
        .filter((v): v is number => v !== null && v > 0);
      const orgAvg = mean(allDesempeno);
      setPromedioOrg(orgAvg);

      // Parsear dimensiones desde resultado_final
      const dimensionData: Record<string, { auto: number[]; jefe: number[]; total: number[] }> = {};
      const dimensionByNivel: Record<string, Record<string, number[]>> = {};

      results.forEach(r => {
        const resultado = r.resultado_final as Record<string, unknown> | null;
        if (!resultado) return;

        const user = users?.find(u => u.dpi === r.colaborador_id);
        const nivel = user?.nivel || "Sin nivel";

        // Buscar dimensiones en el resultado
        // La estructura puede variar según el instrumento
        const dimensionesObj = resultado.dimensiones as Record<string, { promedio?: number; auto?: number; jefe?: number }> | undefined;

        if (dimensionesObj && typeof dimensionesObj === "object") {
          Object.entries(dimensionesObj).forEach(([dimId, dimData]) => {
            if (!dimensionData[dimId]) {
              dimensionData[dimId] = { auto: [], jefe: [], total: [] };
            }

            if (typeof dimData === "object" && dimData !== null) {
              if (typeof dimData.auto === "number") {
                dimensionData[dimId].auto.push(dimData.auto);
              }
              if (typeof dimData.jefe === "number") {
                dimensionData[dimId].jefe.push(dimData.jefe);
              }
              if (typeof dimData.promedio === "number") {
                dimensionData[dimId].total.push(dimData.promedio);

                // Por nivel
                if (!dimensionByNivel[nivel]) {
                  dimensionByNivel[nivel] = {};
                }
                if (!dimensionByNivel[nivel][dimId]) {
                  dimensionByNivel[nivel][dimId] = [];
                }
                dimensionByNivel[nivel][dimId].push(dimData.promedio);
              }
            }
          });
        }

        // Alternativa: buscar por estructura plana
        Object.entries(resultado).forEach(([key, value]) => {
          if (key.startsWith("dim_") && typeof value === "number") {
            const dimId = key.replace("dim_", "");
            if (!dimensionData[dimId]) {
              dimensionData[dimId] = { auto: [], jefe: [], total: [] };
            }
            dimensionData[dimId].total.push(value);
          }
        });
      });

      // Si no hay datos de dimensiones, intentar obtener desde otra fuente
      if (Object.keys(dimensionData).length === 0) {
        // Fallback compatible con el esquema actual:
        // - Usar `evaluations.responses` (JSONB) y derivar dimensión desde el prefijo del itemId (d1_i..., d2_i..., etc.)
        // - Convertir score 1-5 a porcentaje 0-100 y agregar por tipo (auto/jefe)
        const { data: evaluaciones } = await supabase
          .from("evaluations")
          .select("usuario_id, colaborador_id, tipo, responses")
          .eq("periodo_id", periodo.id)
          .eq("estado", "enviado");

        if (evaluaciones && evaluaciones.length > 0) {
          evaluaciones.forEach((ev) => {
            const responses = ev.responses as Record<string, unknown> | null;
            if (!responses || typeof responses !== "object") return;

            const tipo = ev.tipo === "auto" ? "auto" : "jefe";

            Object.entries(responses).forEach(([itemId, rawScore]) => {
              if (typeof rawScore !== "number") return;

              // Extraer número de dimensión desde itemId: d{N}_i{M}...
              const match = itemId.match(/^d(\d+)_/);
              if (!match) return;

              const dimId = `dim${match[1]}`; // ej: dim1, dim2...
              if (!dimensionData[dimId]) {
                dimensionData[dimId] = { auto: [], jefe: [], total: [] };
              }

              // Convertir 1-5 a porcentaje
              const pct = ((rawScore - 1) / 4) * 100;
              dimensionData[dimId][tipo].push(pct);
            });
          });

          // Calcular totales ponderados por dimensión si hay ambos grupos
          Object.entries(dimensionData).forEach(([dimId, data]) => {
            if (data.auto.length > 0 && data.jefe.length > 0) {
              const avgAuto = mean(data.auto);
              const avgJefe = mean(data.jefe);
              data.total.push(avgAuto * 0.3 + avgJefe * 0.7);
            }
          });
        }
      }

      // Función para calcular estadísticas
      const calcStats = (arr: number[]): EstadisticasCompletas => {
        if (arr.length === 0) return { promedio: 0, mediana: 0, desviacion: 0, min: 0, max: 0, q1: 0, q3: 0 };
        return {
          promedio: mean(arr),
          mediana: calcMedian(arr),
          desviacion: standardDeviation(arr),
          min: Math.min(...arr),
          max: Math.max(...arr),
          q1: percentile(arr, 25),
          q3: percentile(arr, 75),
        };
      };

      // Obtener nombres de dimensiones
      const { data: dimensionesInfo } = await supabase
        .from("dimension_templates")
        .select("id, nombre");

      const dimNombres: Record<string, string> = {};
      dimensionesInfo?.forEach(d => {
        dimNombres[d.id] = d.nombre;
      });

      // Procesar dimensiones
      const dimensionesProcessed: DimensionBrechas[] = Object.entries(dimensionData)
        .filter(([_, data]) => data.total.length >= 3 || data.auto.length >= 3 || data.jefe.length >= 3)
        .map(([dimId, data]) => {
          const promedioAuto = data.auto.length > 0 ? mean(data.auto) : 0;
          const promedioJefe = data.jefe.length > 0 ? mean(data.jefe) : 0;
          const allScores = [...data.total, ...data.auto, ...data.jefe].filter(v => v > 0);
          const promedioGlobal = allScores.length > 0 ? mean(allScores) : 0;
          const brecha = promedioJefe - promedioAuto;

          // Clasificación basada en promedio vs objetivo (75%)
          const objetivo = 75;
          let clasificacion: "fortaleza" | "oportunidad" | "critica";
          if (promedioGlobal >= objetivo + 5) {
            clasificacion = "fortaleza";
          } else if (promedioGlobal >= objetivo - 10) {
            clasificacion = "oportunidad";
          } else {
            clasificacion = "critica";
          }

          return {
            id: dimId,
            nombre: dimNombres[dimId] || dimId,
            promedioAuto,
            promedioJefe,
            promedioGlobal,
            brecha,
            brechaVsOrg: promedioGlobal - orgAvg,
            clasificacion,
            stats: calcStats(allScores),
            cantidadEvaluados: allScores.length,
          };
        })
        .sort((a, b) => b.promedioGlobal - a.promedioGlobal);

      setDimensiones(dimensionesProcessed);

      // Procesar por nivel
      const nivelesProcessed: NivelDimensiones[] = Object.entries(dimensionByNivel)
        .filter(([_, dims]) => Object.keys(dims).length > 0)
        .map(([nivel, dims]) => ({
          nivel,
          dimensiones: Object.fromEntries(
            Object.entries(dims).map(([dimId, scores]) => [
              dimNombres[dimId] || dimId,
              mean(scores),
            ])
          ),
        }));

      setPorNivel(nivelesProcessed);
    } catch (err) {
      console.error("Error:", err);
      setError("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  if (dimensiones.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto p-6">
          <Link to="/analisis" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Volver a dashboards
          </Link>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Sin datos de dimensiones</AlertTitle>
            <AlertDescription>
              No se encontraron datos de dimensiones en los resultados de evaluación.
              Esto puede deberse a que el instrumento utilizado no registra puntajes por dimensión
              o que los datos aún no han sido procesados.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Estadísticas resumen
  const fortalezas = dimensiones.filter(d => d.clasificacion === "fortaleza");
  const oportunidades = dimensiones.filter(d => d.clasificacion === "oportunidad");
  const criticas = dimensiones.filter(d => d.clasificacion === "critica");

  // Brecha promedio auto vs jefe
  const dimsConBrecha = dimensiones.filter(d => d.promedioAuto > 0 && d.promedioJefe > 0);
  const brechaPromedio = dimsConBrecha.length > 0
    ? mean(dimsConBrecha.map(d => d.brecha))
    : 0;

  // Datos para gráficos
  const lollipopData = dimensiones.map(d => ({
    label: d.nombre.length > 25 ? d.nombre.substring(0, 25) + "..." : d.nombre,
    value: d.brechaVsOrg,
    baseline: 0,
    color: d.brechaVsOrg >= 0 ? "#22c55e" : "#ef4444",
  }));

  const divergingData = dimsConBrecha.map(d => ({
    label: d.nombre.length > 20 ? d.nombre.substring(0, 20) + "..." : d.nombre,
    positive: d.promedioJefe,
    negative: d.promedioAuto,
    difference: d.brecha,
  }));

  const boxPlotData: BoxPlotData[] = dimensiones
    .filter(d => d.stats.max > 0)
    .map(d => ({
      segment: d.nombre.length > 15 ? d.nombre.substring(0, 15) + "..." : d.nombre,
      min: d.stats.min,
      q1: d.stats.q1,
      median: d.stats.mediana,
      q3: d.stats.q3,
      max: d.stats.max,
      mean: d.stats.promedio,
    }));

  const statsTableData = dimensiones.map(d => ({
    segmento: d.nombre,
    stats: d.stats,
    n: d.cantidadEvaluados,
  }));

  // Radar por nivel (si hay datos)
  const radarData: RadarChartData[] = porNivel.map(n => ({
    name: n.nivel,
    values: n.dimensiones,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link to="/analisis" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2">
              <ArrowLeft className="h-4 w-4" />
              Volver a dashboards
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Target className="h-8 w-8" />
              Análisis de Brechas por Dimensión
            </h1>
            <p className="text-muted-foreground mt-1">Período: <span className="font-semibold">{periodoNombre}</span></p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Competencias y Comportamientos</p>
          </div>
        </div>

        {/* KPIs */}
        <StatCardGrid columns={4}>
          <StatCard
            title="Dimensiones Analizadas"
            value={dimensiones.length}
            subtitle={`De ${dimensiones.reduce((sum, d) => sum + d.cantidadEvaluados, 0)} evaluaciones`}
          />
          <StatCard
            title="Fortalezas"
            value={fortalezas.length}
            subtitle={`≥80% promedio`}
            color="success"
          />
          <StatCard
            title="Críticas"
            value={criticas.length}
            subtitle={`<65% promedio`}
            color="danger"
          />
          <StatCard
            title="Brecha Auto-Jefe"
            value={brechaPromedio}
            format="decimal"
            subtitle={brechaPromedio > 0 ? "Jefe > Auto" : brechaPromedio < 0 ? "Auto > Jefe" : "Sin brecha"}
            color={Math.abs(brechaPromedio) > 5 ? "warning" : "default"}
          />
        </StatCardGrid>

        {/* Clasificación de dimensiones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Fortalezas */}
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-700 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Fortalezas ({fortalezas.length})
              </CardTitle>
              <CardDescription>Dimensiones ≥80%</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {fortalezas.slice(0, 5).map(d => (
                  <li key={d.id} className="flex justify-between items-center">
                    <span className="truncate max-w-[180px] text-sm">{d.nombre}</span>
                    <span className="font-mono font-semibold text-green-600">
                      {d.promedioGlobal.toFixed(1)}%
                    </span>
                  </li>
                ))}
                {fortalezas.length === 0 && (
                  <li className="text-sm text-muted-foreground">No hay fortalezas identificadas</li>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Oportunidades */}
          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-yellow-700 flex items-center gap-2">
                <Minus className="h-5 w-5" />
                Oportunidades ({oportunidades.length})
              </CardTitle>
              <CardDescription>Dimensiones 65-79%</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {oportunidades.slice(0, 5).map(d => (
                  <li key={d.id} className="flex justify-between items-center">
                    <span className="truncate max-w-[180px] text-sm">{d.nombre}</span>
                    <span className="font-mono font-semibold text-yellow-600">
                      {d.promedioGlobal.toFixed(1)}%
                    </span>
                  </li>
                ))}
                {oportunidades.length === 0 && (
                  <li className="text-sm text-muted-foreground">No hay oportunidades identificadas</li>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Críticas */}
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-700 flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Críticas ({criticas.length})
              </CardTitle>
              <CardDescription>Dimensiones &lt;65%</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {criticas.slice(0, 5).map(d => (
                  <li key={d.id} className="flex justify-between items-center">
                    <span className="truncate max-w-[180px] text-sm">{d.nombre}</span>
                    <span className="font-mono font-semibold text-red-600">
                      {d.promedioGlobal.toFixed(1)}%
                    </span>
                  </li>
                ))}
                {criticas.length === 0 && (
                  <li className="text-sm text-muted-foreground">No hay dimensiones críticas</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Brecha vs Organizacional */}
        <Card>
          <CardHeader>
            <CardTitle>Brecha vs Promedio Organizacional</CardTitle>
            <CardDescription>
              Promedio organizacional: {promedioOrg.toFixed(1)}% - Valores positivos indican mejor que el promedio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LollipopChart
              data={lollipopData}
              title=""
              showBaseline
              orientation="horizontal"
            />
          </CardContent>
        </Card>

        {/* Comparativa Auto vs Jefe */}
        {dimsConBrecha.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Comparativa Autoevaluación vs Evaluación del Jefe</CardTitle>
              <CardDescription>
                Diferencia entre la percepción del colaborador y la de su jefe por dimensión
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DivergingBarChart
                data={divergingData}
                title=""
                leftLabel="Autoevaluación"
                rightLabel="Evaluación Jefe"
              />
            </CardContent>
          </Card>
        )}

        {/* Radar por nivel */}
        {radarData.length > 0 && radarData.some(r => Object.keys(r.values).length > 0) && (
          <RadarMultiLevel
            data={radarData.filter(r => Object.keys(r.values).length > 0).slice(0, 5)}
            title="Dimensiones por Nivel Jerárquico"
            description="Comparativa de promedios por dimensión entre niveles"
          />
        )}

        {/* Box Plot */}
        {boxPlotData.length > 0 && (
          <BoxPlotChart
            data={boxPlotData}
            title="Distribución de Puntajes por Dimensión"
            description="Dispersión y valores atípicos en cada dimensión evaluada"
            yLabel="Puntaje (%)"
          />
        )}

        {/* Tabla de estadísticas */}
        <StatsTable
          data={statsTableData}
          title="Estadísticas Detalladas por Dimensión"
          showPercentiles
          showBoxPlot
        />

        {/* Interpretación */}
        <Card>
          <CardHeader>
            <CardTitle>Interpretación y Recomendaciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Hallazgos */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-3">Hallazgos Principales</h4>
                <ul className="space-y-2 text-sm text-blue-700">
                  {fortalezas.length > 0 && (
                    <li>
                      <strong>Fortaleza destacada:</strong> "{fortalezas[0]?.nombre}" con un promedio de{" "}
                      {fortalezas[0]?.promedioGlobal.toFixed(1)}%.
                    </li>
                  )}
                  {criticas.length > 0 && (
                    <li>
                      <strong>Área de mejora prioritaria:</strong> "{criticas[0]?.nombre}" con un promedio de{" "}
                      {criticas[0]?.promedioGlobal.toFixed(1)}%.
                    </li>
                  )}
                  {Math.abs(brechaPromedio) > 5 && (
                    <li>
                      <strong>Brecha de percepción:</strong> Existe una diferencia significativa de{" "}
                      {Math.abs(brechaPromedio).toFixed(1)} puntos entre autoevaluación y evaluación del jefe.
                      {brechaPromedio > 0
                        ? " Los jefes tienden a evaluar más alto."
                        : " Los colaboradores tienden a autoevaluarse más alto."}
                    </li>
                  )}
                  <li>
                    <strong>Distribución:</strong> {fortalezas.length} fortalezas, {oportunidades.length} oportunidades
                    y {criticas.length} áreas críticas identificadas.
                  </li>
                </ul>
              </div>

              {/* Acciones */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-3">Acciones Recomendadas</h4>
                <ul className="space-y-2 text-sm text-green-700">
                  {criticas.length > 0 && (
                    <li>
                      <strong>Capacitación prioritaria:</strong> Diseñar programas de desarrollo para las{" "}
                      {criticas.length} dimensiones críticas identificadas.
                    </li>
                  )}
                  {fortalezas.length > 0 && (
                    <li>
                      <strong>Buenas prácticas:</strong> Identificar y documentar las prácticas de los
                      colaboradores destacados en "{fortalezas[0]?.nombre}".
                    </li>
                  )}
                  {Math.abs(brechaPromedio) > 5 && (
                    <li>
                      <strong>Calibración:</strong> Revisar criterios de evaluación y realizar sesiones de
                      calibración entre evaluadores.
                    </li>
                  )}
                  <li>
                    <strong>Seguimiento:</strong> Establecer indicadores de progreso para las dimensiones
                    de oportunidad en el próximo período de evaluación.
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
