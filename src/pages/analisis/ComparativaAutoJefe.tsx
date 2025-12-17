import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getActivePeriod } from "@/lib/supabase";
import { getEvaluationsForPeriod } from "@/lib/statisticalAnalysis";
import { scoreToPercentage } from "@/lib/calculations";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ArrowLeft, GitCompare, TrendingUp, TrendingDown, Minus, User, UserCheck } from "lucide-react";
import {
  StatCard,
  StatCardGrid,
  BoxPlotChart,
  StatsTable,
  DivergingBarChart,
  DistributionHistogram,
  ScatterPlotCorrelation,
  CorrelationInterpretation,
  ComparisonTable,
} from "@/components/charts";
import { mean, standardDeviation, median as calcMedian, percentile, pearsonCorrelation, getCorrelationInterpretation, tTestPaired } from "@/lib/advancedStatistics";
import type { BoxPlotData, EstadisticasCompletas } from "@/types/analisis";

interface ComparativaColaborador {
  id: string;
  nombre: string;
  auto: number;
  jefe: number;
  brecha: number;
  nivel: string;
  direccion: string;
  tipoPuesto: string;
}

interface SegmentoComparativa {
  segmento: string;
  promedioAuto: number;
  promedioJefe: number;
  brecha: number;
  cantidad: number;
  statsAuto: EstadisticasCompletas;
  statsJefe: EstadisticasCompletas;
}

export default function ComparativaAutoJefe() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [colaboradores, setColaboradores] = useState<ComparativaColaborador[]>([]);
  const [porNivel, setPorNivel] = useState<SegmentoComparativa[]>([]);
  const [porDireccion, setPorDireccion] = useState<SegmentoComparativa[]>([]);
  const [porTipoPuesto, setPorTipoPuesto] = useState<SegmentoComparativa[]>([]);
  const [correlacion, setCorrelacion] = useState({ coeficiente: 0, interpretacion: getCorrelationInterpretation(0) });
  const [tTest, setTTest] = useState<{ tStatistic: number; pValue: number; isSignificant: boolean } | null>(null);

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

      // Obtener evaluaciones enviadas del período y calcular score (1-5) usando instrumentos
      const evals = await getEvaluationsForPeriod(periodo.id);
      if (!evals || evals.length === 0) {
        setError("No hay evaluaciones enviadas en el período actual");
        return;
      }

      // Agrupar por colaborador: auto (usuario_id) y jefe (colaborador_id; puede haber múltiples)
      const autoMap = new Map<string, number>(); // colaborador_dpi -> % auto
      const jefeMap = new Map<string, number[]>(); // colaborador_dpi -> [% jefe...]

      evals.forEach((ev) => {
        const scorePct = scoreToPercentage(ev.score);
        if (ev.tipo === "auto") {
          autoMap.set(ev.usuario_id, scorePct);
        } else if (ev.tipo === "jefe" && ev.colaborador_id) {
          if (!jefeMap.has(ev.colaborador_id)) jefeMap.set(ev.colaborador_id, []);
          jefeMap.get(ev.colaborador_id)!.push(scorePct);
        }
      });

      // Filtrar solo los que tienen ambas
      const colaboradorIds = Array.from(autoMap.keys()).filter((id) => {
        const jefeScores = jefeMap.get(id);
        return jefeScores && jefeScores.length > 0;
      });

      if (colaboradorIds.length === 0) {
        setError("No hay colaboradores con ambas evaluaciones (auto y jefe)");
        return;
      }

      // Obtener datos de usuarios
      const { data: users } = await supabase
        .from("users")
        .select("dpi, nombre, apellidos, nivel, direccion_unidad, tipo_puesto")
        .in("dpi", colaboradorIds);

      if (!users) return;

      // Procesar colaboradores
      const colabs: ComparativaColaborador[] = colaboradorIds
        .map(id => {
          const auto = autoMap.get(id);
          const jefeArr = jefeMap.get(id) || [];
          const jefe = jefeArr.length > 0 ? mean(jefeArr) : undefined;
          const user = users.find(u => u.dpi === id);

          if (auto === undefined || jefe === undefined) return null;

          return {
            id,
            nombre: user?.nombre && user?.apellidos ? `${user.nombre} ${user.apellidos}` : (user?.nombre || "Sin nombre"),
            auto,
            jefe,
            brecha: jefe - auto, // (Jefe - Auto) en puntos porcentuales
            nivel: user?.nivel || "Sin nivel",
            direccion: user?.direccion_unidad || "Sin dirección",
            tipoPuesto: user?.tipo_puesto || "Sin tipo",
          };
        })
        .filter((c): c is ComparativaColaborador => c !== null);

      setColaboradores(colabs);

      // Calcular correlación
      if (colabs.length > 5) {
        const corrCoef = pearsonCorrelation(
          colabs.map(c => c.auto),
          colabs.map(c => c.jefe)
        );
        setCorrelacion({
          coeficiente: corrCoef,
          interpretacion: getCorrelationInterpretation(corrCoef),
        });

        // T-test pareado
        try {
          const tResult = tTestPaired(
            colabs.map(c => c.auto),
            colabs.map(c => c.jefe)
          );
          setTTest(tResult);
        } catch (e) {
          console.log("Error en t-test:", e);
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

      // Función para agrupar por segmento
      const agruparPor = (key: "nivel" | "direccion" | "tipoPuesto"): SegmentoComparativa[] => {
        const grupos: Record<string, ComparativaColaborador[]> = {};

        colabs.forEach(c => {
          const segmento = c[key];
          if (!grupos[segmento]) grupos[segmento] = [];
          grupos[segmento].push(c);
        });

        return Object.entries(grupos)
          .filter(([_, arr]) => arr.length >= 3)
          .map(([segmento, arr]) => ({
            segmento,
            promedioAuto: mean(arr.map(c => c.auto)),
            promedioJefe: mean(arr.map(c => c.jefe)),
            brecha: mean(arr.map(c => c.brecha)),
            cantidad: arr.length,
            statsAuto: calcStats(arr.map(c => c.auto)),
            statsJefe: calcStats(arr.map(c => c.jefe)),
          }))
          .sort((a, b) => Math.abs(b.brecha) - Math.abs(a.brecha));
      };

      setPorNivel(agruparPor("nivel"));
      setPorDireccion(agruparPor("direccion"));
      setPorTipoPuesto(agruparPor("tipoPuesto"));
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

  // Estadísticas globales
  const promedioAuto = mean(colaboradores.map(c => c.auto));
  const promedioJefe = mean(colaboradores.map(c => c.jefe));
  const brechaGlobal = promedioJefe - promedioAuto;
  const autoMayorQueJefe = colaboradores.filter(c => c.brecha < 0).length;
  const jefeMayorQueAuto = colaboradores.filter(c => c.brecha > 0).length;
  const coinciden = colaboradores.filter(c => Math.abs(c.brecha) < 5).length;

  // Calcular estadísticas
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

  const statsAuto = calcStats(colaboradores.map(c => c.auto));
  const statsJefe = calcStats(colaboradores.map(c => c.jefe));
  const statsBrechas = calcStats(colaboradores.map(c => c.brecha));

  // Box plots comparativos
  const boxPlotComparativo: BoxPlotData[] = [
    { segment: "Autoevaluación", ...statsAuto, median: statsAuto.mediana, mean: statsAuto.promedio },
    { segment: "Evaluación Jefe", ...statsJefe, median: statsJefe.mediana, mean: statsJefe.promedio },
  ];

  // Scatter data
  const scatterData = colaboradores.map(c => ({
    x: c.auto,
    y: c.jefe,
    name: c.nombre,
  }));

  // Histograma de brechas
  const histogramData = colaboradores.map(c => c.brecha);

  // Diverging data por nivel
  const divergingNivel = porNivel.map(n => ({
    label: n.segmento,
    positive: n.promedioJefe,
    negative: n.promedioAuto,
    difference: n.brecha,
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
              <GitCompare className="h-8 w-8" />
              Comparativa Autoevaluación vs Jefe
            </h1>
            <p className="text-muted-foreground mt-1">Período: <span className="font-semibold">{periodoNombre}</span></p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Análisis de Percepción</p>
          </div>
        </div>

        {/* KPIs */}
        <StatCardGrid columns={4}>
          <StatCard
            title="Promedio Auto"
            value={promedioAuto}
            format="percentage"
            subtitle={`${colaboradores.length} colaboradores`}
            icon={<User className="h-5 w-5" />}
          />
          <StatCard
            title="Promedio Jefe"
            value={promedioJefe}
            format="percentage"
            subtitle={`${colaboradores.length} evaluaciones`}
            icon={<UserCheck className="h-5 w-5" />}
          />
          <StatCard
            title="Brecha Promedio"
            value={Math.abs(brechaGlobal)}
            format="decimal"
            subtitle={brechaGlobal > 0 ? "Jefe > Auto" : brechaGlobal < 0 ? "Auto > Jefe" : "Sin brecha"}
            color={Math.abs(brechaGlobal) > 5 ? "warning" : "success"}
          />
          <StatCard
            title="Correlación"
            value={correlacion.coeficiente}
            format="decimal"
            subtitle={correlacion.interpretacion.strength}
            color={correlacion.coeficiente > 0.5 ? "success" : correlacion.coeficiente > 0.3 ? "warning" : "danger"}
          />
        </StatCardGrid>

        {/* Resumen de distribución */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={`border-2 ${autoMayorQueJefe > jefeMayorQueAuto ? "border-blue-300 bg-blue-50" : "border-gray-200"}`}>
            <CardContent className="pt-6 text-center">
              <TrendingDown className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-3xl font-bold text-blue-700">{autoMayorQueJefe}</p>
              <p className="text-sm text-blue-600">Auto &gt; Jefe</p>
              <p className="text-xs text-muted-foreground mt-1">
                {((autoMayorQueJefe / colaboradores.length) * 100).toFixed(1)}% del total
              </p>
            </CardContent>
          </Card>

          <Card className={`border-2 ${coinciden > Math.max(autoMayorQueJefe, jefeMayorQueAuto) ? "border-green-300 bg-green-50" : "border-gray-200"}`}>
            <CardContent className="pt-6 text-center">
              <Minus className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-3xl font-bold text-green-700">{coinciden}</p>
              <p className="text-sm text-green-600">Coinciden (±5%)</p>
              <p className="text-xs text-muted-foreground mt-1">
                {((coinciden / colaboradores.length) * 100).toFixed(1)}% del total
              </p>
            </CardContent>
          </Card>

          <Card className={`border-2 ${jefeMayorQueAuto > autoMayorQueJefe ? "border-orange-300 bg-orange-50" : "border-gray-200"}`}>
            <CardContent className="pt-6 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <p className="text-3xl font-bold text-orange-700">{jefeMayorQueAuto}</p>
              <p className="text-sm text-orange-600">Jefe &gt; Auto</p>
              <p className="text-xs text-muted-foreground mt-1">
                {((jefeMayorQueAuto / colaboradores.length) * 100).toFixed(1)}% del total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Análisis de correlación */}
        <Card>
          <CardHeader>
            <CardTitle>Análisis de Correlación Auto vs Jefe</CardTitle>
            <CardDescription>Relación entre la autoevaluación y la evaluación del jefe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-2">
                <ScatterPlotCorrelation
                  data={scatterData}
                  title=""
                  xLabel="Autoevaluación (%)"
                  yLabel="Evaluación Jefe (%)"
                  showRegression
                />
              </div>
              <div className="space-y-4">
                <CorrelationInterpretation
                  variable1="Autoevaluación"
                  variable2="Evaluación Jefe"
                  coefficient={correlacion.coeficiente}
                />
                {tTest && (
                  <div className={`p-4 rounded-lg ${tTest.isSignificant ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
                    <h4 className={`font-semibold mb-2 ${tTest.isSignificant ? "text-amber-800" : "text-green-800"}`}>
                      Test de Diferencias (t-test pareado)
                    </h4>
                    <p className="text-sm">
                      <strong>t-statistic:</strong> {tTest.tStatistic.toFixed(3)}
                    </p>
                    <p className="text-sm">
                      <strong>p-value:</strong> {tTest.pValue.toFixed(4)}
                    </p>
                    <p className={`text-sm mt-2 ${tTest.isSignificant ? "text-amber-700" : "text-green-700"}`}>
                      {tTest.isSignificant
                        ? "La diferencia entre autoevaluación y evaluación del jefe es estadísticamente significativa (p < 0.05)."
                        : "No hay diferencia estadísticamente significativa entre ambas evaluaciones."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Box plots y distribución */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BoxPlotChart
            data={boxPlotComparativo}
            title="Distribución Comparativa"
            description="Dispersión de calificaciones en cada tipo de evaluación"
            yLabel="Puntaje (%)"
          />
          <DistributionHistogram
            data={histogramData}
            title="Distribución de Brechas"
            description="Frecuencia de diferencias (Jefe - Auto)"
            xLabel="Brecha (%)"
            bins={10}
          />
        </div>

        {/* Comparación por segmentos */}
        <Tabs defaultValue="nivel" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="nivel">Por Nivel</TabsTrigger>
            <TabsTrigger value="direccion">Por Dirección</TabsTrigger>
            <TabsTrigger value="tipo">Por Tipo Puesto</TabsTrigger>
          </TabsList>

          <TabsContent value="nivel" className="space-y-6 mt-6">
            {porNivel.length > 0 && (
              <>
                <DivergingBarChart
                  data={divergingNivel}
                  title="Brechas por Nivel Jerárquico"
                  leftLabel="Autoevaluación"
                  rightLabel="Evaluación Jefe"
                />
                <ComparisonTable
                  groups={[
                    { name: "Autoevaluación", color: "#3b82f6" },
                    { name: "Evaluación Jefe", color: "#f59e0b" },
                  ]}
                  metrics={porNivel.map(n => ({
                    label: n.segmento,
                    values: [n.promedioAuto, n.promedioJefe],
                    format: "decimal" as const,
                    highlightDiff: true,
                  }))}
                  title="Comparativa por Nivel"
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="direccion" className="space-y-6 mt-6">
            {porDireccion.length > 0 && (
              <ComparisonTable
                groups={[
                  { name: "Autoevaluación", color: "#3b82f6" },
                  { name: "Evaluación Jefe", color: "#f59e0b" },
                ]}
                metrics={porDireccion.slice(0, 10).map(d => ({
                  label: d.segmento.length > 30 ? d.segmento.substring(0, 30) + "..." : d.segmento,
                  values: [d.promedioAuto, d.promedioJefe],
                  format: "decimal" as const,
                  highlightDiff: true,
                }))}
                title="Comparativa por Dirección (Top 10 por brecha)"
              />
            )}
          </TabsContent>

          <TabsContent value="tipo" className="space-y-6 mt-6">
            {porTipoPuesto.length > 0 && (
              <ComparisonTable
                groups={[
                  { name: "Autoevaluación", color: "#3b82f6" },
                  { name: "Evaluación Jefe", color: "#f59e0b" },
                ]}
                metrics={porTipoPuesto.map(t => ({
                  label: t.segmento,
                  values: [t.promedioAuto, t.promedioJefe],
                  format: "decimal" as const,
                  highlightDiff: true,
                }))}
                title="Comparativa por Tipo de Puesto"
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Estadísticas detalladas */}
        <Card>
          <CardHeader>
            <CardTitle>Estadísticas Detalladas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Métrica</th>
                    <th className="text-right py-2">Autoevaluación</th>
                    <th className="text-right py-2">Evaluación Jefe</th>
                    <th className="text-right py-2">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">Promedio</td>
                    <td className="text-right font-mono">{statsAuto.promedio.toFixed(2)}%</td>
                    <td className="text-right font-mono">{statsJefe.promedio.toFixed(2)}%</td>
                    <td className={`text-right font-mono ${brechaGlobal > 0 ? "text-orange-600" : brechaGlobal < 0 ? "text-blue-600" : ""}`}>
                      {brechaGlobal > 0 ? "+" : ""}{brechaGlobal.toFixed(2)}%
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Mediana</td>
                    <td className="text-right font-mono">{statsAuto.mediana.toFixed(2)}%</td>
                    <td className="text-right font-mono">{statsJefe.mediana.toFixed(2)}%</td>
                    <td className="text-right font-mono">{(statsJefe.mediana - statsAuto.mediana).toFixed(2)}%</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Desv. Estándar</td>
                    <td className="text-right font-mono">{statsAuto.desviacion.toFixed(2)}</td>
                    <td className="text-right font-mono">{statsJefe.desviacion.toFixed(2)}</td>
                    <td className="text-right font-mono">-</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Mínimo</td>
                    <td className="text-right font-mono">{statsAuto.min.toFixed(2)}%</td>
                    <td className="text-right font-mono">{statsJefe.min.toFixed(2)}%</td>
                    <td className="text-right font-mono">-</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Máximo</td>
                    <td className="text-right font-mono">{statsAuto.max.toFixed(2)}%</td>
                    <td className="text-right font-mono">{statsJefe.max.toFixed(2)}%</td>
                    <td className="text-right font-mono">-</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Rango Intercuartil (Q1-Q3)</td>
                    <td className="text-right font-mono">{statsAuto.q1.toFixed(1)}% - {statsAuto.q3.toFixed(1)}%</td>
                    <td className="text-right font-mono">{statsJefe.q1.toFixed(1)}% - {statsJefe.q3.toFixed(1)}%</td>
                    <td className="text-right font-mono">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Interpretación */}
        <Card>
          <CardHeader>
            <CardTitle>Interpretación de Resultados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Hallazgos */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-3">Hallazgos Principales</h4>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li>
                    <strong>Tendencia general:</strong>{" "}
                    {brechaGlobal > 3
                      ? "Los jefes tienden a evaluar más alto que los colaboradores a sí mismos."
                      : brechaGlobal < -3
                      ? "Los colaboradores tienden a autoevaluarse más alto que la evaluación de sus jefes."
                      : "Las percepciones de colaboradores y jefes están relativamente alineadas."}
                  </li>
                  <li>
                    <strong>Correlación:</strong> {correlacion.interpretacion.description}
                    {correlacion.coeficiente < 0.5 &&
                      " Esto sugiere que hay diferencias importantes en cómo cada parte percibe el desempeño."}
                  </li>
                  <li>
                    <strong>Coincidencias:</strong> {coinciden} colaboradores ({((coinciden / colaboradores.length) * 100).toFixed(1)}%)
                    tienen evaluaciones que coinciden en ±5 puntos.
                  </li>
                  {tTest && tTest.isSignificant && (
                    <li>
                      <strong>Significancia:</strong> La diferencia observada es estadísticamente significativa,
                      lo que indica un sesgo sistemático en alguna de las evaluaciones.
                    </li>
                  )}
                </ul>
              </div>

              {/* Recomendaciones */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-3">Recomendaciones</h4>
                <ul className="space-y-2 text-sm text-green-700">
                  {Math.abs(brechaGlobal) > 5 && (
                    <li>
                      <strong>Calibración:</strong> Realizar sesiones de calibración para alinear criterios
                      de evaluación entre evaluadores.
                    </li>
                  )}
                  {correlacion.coeficiente < 0.5 && (
                    <li>
                      <strong>Retroalimentación:</strong> Fomentar conversaciones de retroalimentación continua
                      entre jefes y colaboradores para alinear expectativas.
                    </li>
                  )}
                  <li>
                    <strong>Capacitación:</strong> Entrenar a evaluadores en técnicas de evaluación objetiva
                    para reducir sesgos de lenidad o severidad.
                  </li>
                  <li>
                    <strong>Seguimiento:</strong> Monitorear las brechas por nivel y dirección para
                    identificar patrones específicos que requieran intervención.
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
