import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ArrowLeft, GitCompare, TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import {
  StatCard,
  StatCardGrid,
  DivergingBarChart,
  StatsTable,
  BoxPlotChart,
  CorrelationInterpretation,
  InterpretationCard,
} from "@/components/charts";
import { mean, standardDeviation, median as calcMedian, percentile, pearsonCorrelation, getCorrelationInterpretation, tTestPaired } from "@/lib/advancedStatistics";
import type { BoxPlotData, EstadisticasCompletas } from "@/types/analisis";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

interface BrechaDimension {
  dimension: string;
  promedioAuto: number;
  promedioJefe: number;
  brecha: number;
  brechaAbs: number;
  direccion: "positiva" | "negativa" | "neutral";
  significativa: boolean;
  n: number;
}

interface BrechaPorNivel {
  nivel: string;
  brechaPromedio: number;
  correlacion: number;
  n: number;
}

interface ColaboradorBrecha {
  id: string;
  autoPromedio: number;
  jefePromedio: number;
  brecha: number;
  nivel: string;
  direccion: string;
}

export default function AnalisisBrechasAutoJefe() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [brechasPorDimension, setBrechasPorDimension] = useState<BrechaDimension[]>([]);
  const [brechasPorNivel, setBrechasPorNivel] = useState<BrechaPorNivel[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorBrecha[]>([]);
  const [brechaGlobal, setBrechaGlobal] = useState(0);
  const [correlacionGlobal, setCorrelacionGlobal] = useState(0);
  const [testResult, setTestResult] = useState<{ tStatistic: number; pValue: number } | null>(null);

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

      // Obtener autoevaluaciones
      const { data: autoEvals } = await supabase
        .from("self_evaluations")
        .select("evaluador_id, respuestas")
        .eq("periodo_id", periodo.id);

      // Obtener evaluaciones de jefe
      const { data: jefeEvals } = await supabase
        .from("boss_evaluations")
        .select("colaborador_id, respuestas")
        .eq("periodo_id", periodo.id);

      if (!autoEvals || !jefeEvals || autoEvals.length === 0 || jefeEvals.length === 0) {
        setError("No hay suficientes evaluaciones para comparar");
        return;
      }

      // Obtener preguntas y dimensiones
      const { data: questions } = await supabase
        .from("questions")
        .select("id, dimension, subdimension");

      if (!questions) return;

      // Crear mapa de dimensiones
      const dimensionMap = new Map<string, string>();
      questions.forEach(q => {
        if (q.dimension) dimensionMap.set(q.id.toString(), q.dimension);
      });

      // Obtener usuarios para nivel y dirección
      const colaboradorIds = autoEvals.map(e => e.evaluador_id);
      const { data: users } = await supabase
        .from("users")
        .select("dpi, nivel, direccion_unidad")
        .in("dpi", colaboradorIds);

      // Encontrar pares auto-jefe
      const pares: Array<{
        colaboradorId: string;
        autoRespuestas: Record<string, number>;
        jefeRespuestas: Record<string, number>;
        nivel: string;
        direccion: string;
      }> = [];

      autoEvals.forEach(autoEval => {
        const jefeEval = jefeEvals.find(j => j.colaborador_id === autoEval.evaluador_id);
        if (jefeEval && autoEval.respuestas && jefeEval.respuestas) {
          const user = users?.find(u => u.dpi === autoEval.evaluador_id);
          pares.push({
            colaboradorId: autoEval.evaluador_id,
            autoRespuestas: autoEval.respuestas as Record<string, number>,
            jefeRespuestas: jefeEval.respuestas as Record<string, number>,
            nivel: user?.nivel || "Sin nivel",
            direccion: user?.direccion_unidad || "Sin dirección",
          });
        }
      });

      if (pares.length === 0) {
        setError("No se encontraron pares de evaluaciones auto-jefe");
        return;
      }

      // Calcular brechas por dimensión
      const dimensionScores: Record<string, { auto: number[]; jefe: number[] }> = {};

      pares.forEach(par => {
        Object.entries(par.autoRespuestas).forEach(([qId, autoScore]) => {
          const jefeScore = par.jefeRespuestas[qId];
          if (typeof jefeScore === "number" && typeof autoScore === "number") {
            const dimension = dimensionMap.get(qId) || "Sin dimensión";
            if (!dimensionScores[dimension]) {
              dimensionScores[dimension] = { auto: [], jefe: [] };
            }
            dimensionScores[dimension].auto.push(autoScore);
            dimensionScores[dimension].jefe.push(jefeScore);
          }
        });
      });

      // Calcular estadísticas por dimensión
      const brechasDim: BrechaDimension[] = Object.entries(dimensionScores)
        .filter(([_, data]) => data.auto.length >= 5)
        .map(([dimension, data]) => {
          const promedioAuto = mean(data.auto);
          const promedioJefe = mean(data.jefe);
          const brecha = promedioAuto - promedioJefe;
          const brechaAbs = Math.abs(brecha);

          // Prueba t pareada para significancia
          let significativa = false;
          if (data.auto.length >= 10) {
            const tTest = tTestPaired(data.auto, data.jefe);
            significativa = tTest.pValue < 0.05;
          }

          return {
            dimension,
            promedioAuto,
            promedioJefe,
            brecha,
            brechaAbs,
            direccion: brecha > 0.5 ? "positiva" : brecha < -0.5 ? "negativa" : "neutral",
            significativa,
            n: data.auto.length,
          };
        })
        .sort((a, b) => Math.abs(b.brecha) - Math.abs(a.brecha));

      setBrechasPorDimension(brechasDim);

      // Calcular brechas por colaborador
      const colabData: ColaboradorBrecha[] = pares.map(par => {
        const autoScores = Object.values(par.autoRespuestas).filter((v): v is number => typeof v === "number");
        const jefeScores = Object.values(par.jefeRespuestas).filter((v): v is number => typeof v === "number");

        return {
          id: par.colaboradorId,
          autoPromedio: autoScores.length > 0 ? mean(autoScores) : 0,
          jefePromedio: jefeScores.length > 0 ? mean(jefeScores) : 0,
          brecha: autoScores.length > 0 && jefeScores.length > 0
            ? mean(autoScores) - mean(jefeScores)
            : 0,
          nivel: par.nivel,
          direccion: par.direccion,
        };
      });

      setColaboradores(colabData);

      // Brecha global
      const allAutoScores = colabData.map(c => c.autoPromedio);
      const allJefeScores = colabData.map(c => c.jefePromedio);
      const globalBrecha = mean(allAutoScores) - mean(allJefeScores);
      setBrechaGlobal(globalBrecha);

      // Correlación global auto-jefe
      if (colabData.length > 5) {
        const corr = pearsonCorrelation(allAutoScores, allJefeScores);
        setCorrelacionGlobal(corr);

        // Test t pareado global
        const tTest = tTestPaired(allAutoScores, allJefeScores);
        setTestResult(tTest);
      }

      // Brechas por nivel
      const byNivel: Record<string, ColaboradorBrecha[]> = {};
      colabData.forEach(c => {
        if (!byNivel[c.nivel]) byNivel[c.nivel] = [];
        byNivel[c.nivel].push(c);
      });

      const nivelesData: BrechaPorNivel[] = Object.entries(byNivel)
        .filter(([_, arr]) => arr.length >= 3)
        .map(([nivel, arr]) => {
          const autoScores = arr.map(c => c.autoPromedio);
          const jefeScores = arr.map(c => c.jefePromedio);
          const corr = arr.length >= 5 ? pearsonCorrelation(autoScores, jefeScores) : 0;

          return {
            nivel,
            brechaPromedio: mean(arr.map(c => c.brecha)),
            correlacion: corr,
            n: arr.length,
          };
        })
        .sort((a, b) => Math.abs(b.brechaPromedio) - Math.abs(a.brechaPromedio));

      setBrechasPorNivel(nivelesData);

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

  // Estadísticas de brecha
  const brechasPositivas = colaboradores.filter(c => c.brecha > 0.5).length;
  const brechasNegativas = colaboradores.filter(c => c.brecha < -0.5).length;
  const sinBrechaSignificativa = colaboradores.length - brechasPositivas - brechasNegativas;

  // Datos para gráfico de barras divergentes
  const divergingData = brechasPorDimension.map(b => ({
    label: b.dimension,
    value: b.brecha,
    color: b.brecha > 0 ? "#3b82f6" : "#ef4444",
  }));

  // Datos para comparación lado a lado
  const comparisonChartData = brechasPorDimension.slice(0, 10).map(b => ({
    dimension: b.dimension.length > 20 ? b.dimension.substring(0, 20) + "..." : b.dimension,
    Auto: b.promedioAuto,
    Jefe: b.promedioJefe,
    Brecha: b.brecha,
  }));

  // Box plot de brechas por nivel
  const boxPlotBrechas: BoxPlotData[] = brechasPorNivel.map(n => {
    const nivelColabs = colaboradores.filter(c => c.nivel === n.nivel);
    const brechas = nivelColabs.map(c => c.brecha);
    return {
      segment: n.nivel,
      min: Math.min(...brechas),
      q1: percentile(brechas, 25),
      median: calcMedian(brechas),
      q3: percentile(brechas, 75),
      max: Math.max(...brechas),
      mean: mean(brechas),
    };
  }).filter(b => !isNaN(b.median));

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
              Análisis de Brechas Auto vs Jefe
            </h1>
            <p className="text-muted-foreground mt-1">Período: <span className="font-semibold">{periodoNombre}</span></p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Comparativa por Dimensión</p>
          </div>
        </div>

        {/* KPIs */}
        <StatCardGrid columns={4}>
          <StatCard
            title="Brecha Promedio Global"
            value={brechaGlobal}
            format="decimal"
            subtitle={brechaGlobal > 0 ? "Auto > Jefe" : brechaGlobal < 0 ? "Jefe > Auto" : "Sin brecha"}
            color={Math.abs(brechaGlobal) > 0.5 ? "warning" : "success"}
          />
          <StatCard
            title="Correlación Auto-Jefe"
            value={correlacionGlobal}
            format="decimal"
            subtitle={getCorrelationInterpretation(correlacionGlobal).strength}
            color={correlacionGlobal > 0.6 ? "success" : correlacionGlobal > 0.3 ? "warning" : "danger"}
          />
          <StatCard
            title="Sobreestimación"
            value={brechasPositivas}
            subtitle={`${((brechasPositivas / colaboradores.length) * 100).toFixed(1)}% del total`}
            color="info"
          />
          <StatCard
            title="Subestimación"
            value={brechasNegativas}
            subtitle={`${((brechasNegativas / colaboradores.length) * 100).toFixed(1)}% del total`}
            color="warning"
          />
        </StatCardGrid>

        {/* Test estadístico */}
        {testResult && (
          <InterpretationCard
            title={testResult.pValue < 0.05 ? "Diferencia Estadísticamente Significativa" : "Sin Diferencia Significativa"}
            description={
              testResult.pValue < 0.05
                ? `La prueba t pareada (t=${testResult.tStatistic.toFixed(2)}, p=${testResult.pValue.toFixed(4)}) indica que existe una diferencia significativa entre las autoevaluaciones y las evaluaciones de jefes. ${brechaGlobal > 0 ? "Los colaboradores tienden a calificarse más alto que sus jefes." : "Los jefes tienden a calificar más alto que los colaboradores."}`
                : `La prueba t pareada (t=${testResult.tStatistic.toFixed(2)}, p=${testResult.pValue.toFixed(4)}) no encontró diferencias significativas entre autoevaluaciones y evaluaciones de jefes. Existe buena alineación general entre ambas perspectivas.`
            }
            type={testResult.pValue < 0.05 ? "warning" : "success"}
          />
        )}

        {/* Correlación */}
        <Card>
          <CardHeader>
            <CardTitle>Alineación Autoevaluación - Evaluación de Jefe</CardTitle>
          </CardHeader>
          <CardContent>
            <CorrelationInterpretation
              variable1="Autoevaluación"
              variable2="Evaluación de Jefe"
              coefficient={correlacionGlobal}
            />
          </CardContent>
        </Card>

        {/* Gráfico de comparación */}
        <Card>
          <CardHeader>
            <CardTitle>Comparativa por Dimensión</CardTitle>
            <CardDescription>Promedios de autoevaluación vs evaluación de jefe en cada competencia</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparisonChartData}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 120, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 5]} />
                  <YAxis type="category" dataKey="dimension" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [value.toFixed(2), name]}
                  />
                  <Legend />
                  <Bar dataKey="Auto" fill="#3b82f6" name="Autoevaluación" barSize={12} />
                  <Bar dataKey="Jefe" fill="#22c55e" name="Jefe" barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Brechas por dimensión */}
        <Card>
          <CardHeader>
            <CardTitle>Brechas por Dimensión (Auto - Jefe)</CardTitle>
            <CardDescription>
              Valores positivos = autoevaluación mayor que jefe | Valores negativos = jefe mayor que autoevaluación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DivergingBarChart
              data={divergingData}
              title=""
              positiveLabel="Sobreestimación"
              negativeLabel="Subestimación"
            />
          </CardContent>
        </Card>

        {/* Tabs para análisis detallado */}
        <Tabs defaultValue="dimensiones" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dimensiones">Por Dimensión</TabsTrigger>
            <TabsTrigger value="niveles">Por Nivel</TabsTrigger>
          </TabsList>

          <TabsContent value="dimensiones" className="space-y-6 mt-6">
            {/* Tabla de brechas por dimensión */}
            <Card>
              <CardHeader>
                <CardTitle>Detalle de Brechas por Dimensión</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Dimensión</th>
                        <th className="text-right p-2">Prom. Auto</th>
                        <th className="text-right p-2">Prom. Jefe</th>
                        <th className="text-right p-2">Brecha</th>
                        <th className="text-center p-2">Dirección</th>
                        <th className="text-center p-2">Significativa</th>
                        <th className="text-right p-2">n</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brechasPorDimension.map((b, idx) => (
                        <tr key={b.dimension} className={idx % 2 === 0 ? "bg-muted/30" : ""}>
                          <td className="p-2 font-medium">{b.dimension}</td>
                          <td className="text-right p-2 font-mono">{b.promedioAuto.toFixed(2)}</td>
                          <td className="text-right p-2 font-mono">{b.promedioJefe.toFixed(2)}</td>
                          <td className={`text-right p-2 font-mono font-bold ${
                            b.brecha > 0.5 ? "text-blue-600" : b.brecha < -0.5 ? "text-red-600" : "text-gray-600"
                          }`}>
                            {b.brecha > 0 ? "+" : ""}{b.brecha.toFixed(2)}
                          </td>
                          <td className="text-center p-2">
                            {b.direccion === "positiva" ? (
                              <TrendingUp className="h-4 w-4 text-blue-600 inline" />
                            ) : b.direccion === "negativa" ? (
                              <TrendingDown className="h-4 w-4 text-red-600 inline" />
                            ) : (
                              <Minus className="h-4 w-4 text-gray-400 inline" />
                            )}
                          </td>
                          <td className="text-center p-2">
                            {b.significativa ? (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Sí</span>
                            ) : (
                              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">No</span>
                            )}
                          </td>
                          <td className="text-right p-2 text-muted-foreground">{b.n}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="niveles" className="space-y-6 mt-6">
            {/* Box plot de brechas por nivel */}
            {boxPlotBrechas.length > 0 && (
              <BoxPlotChart
                data={boxPlotBrechas}
                title="Distribución de Brechas por Nivel Jerárquico"
                description="Variabilidad de la diferencia auto-jefe en cada nivel"
                yLabel="Brecha (puntos)"
              />
            )}

            {/* Tabla de brechas por nivel */}
            <Card>
              <CardHeader>
                <CardTitle>Brechas por Nivel Jerárquico</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {brechasPorNivel.map(n => (
                    <div
                      key={n.nivel}
                      className={`p-4 rounded-lg border ${
                        n.brechaPromedio > 0.5 ? "bg-blue-50 border-blue-200" :
                        n.brechaPromedio < -0.5 ? "bg-red-50 border-red-200" :
                        "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-semibold">{n.nivel}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            (n={n.n}, corr={n.correlacion.toFixed(2)})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {n.brechaPromedio > 0.5 ? (
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                          ) : n.brechaPromedio < -0.5 ? (
                            <TrendingDown className="h-5 w-5 text-red-600" />
                          ) : (
                            <Minus className="h-5 w-5 text-gray-400" />
                          )}
                          <span className={`font-mono font-bold text-lg ${
                            n.brechaPromedio > 0.5 ? "text-blue-600" :
                            n.brechaPromedio < -0.5 ? "text-red-600" :
                            "text-gray-600"
                          }`}>
                            {n.brechaPromedio > 0 ? "+" : ""}{n.brechaPromedio.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Interpretación */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">Interpretación de las Brechas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-blue-900">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white/70 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold">Sobreestimación</span>
                </div>
                <p className="text-sm">
                  {brechasPositivas} colaboradores ({((brechasPositivas / colaboradores.length) * 100).toFixed(1)}%)
                  se califican significativamente más alto que sus jefes.
                  Puede indicar falta de autocrítica o expectativas no alineadas.
                </p>
              </div>

              <div className="p-4 bg-white/70 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <span className="font-semibold">Subestimación</span>
                </div>
                <p className="text-sm">
                  {brechasNegativas} colaboradores ({((brechasNegativas / colaboradores.length) * 100).toFixed(1)}%)
                  se califican significativamente más bajo que sus jefes.
                  Puede indicar falta de confianza o alta autocrítica.
                </p>
              </div>

              <div className="p-4 bg-white/70 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Minus className="h-5 w-5 text-gray-600" />
                  <span className="font-semibold">Alineados</span>
                </div>
                <p className="text-sm">
                  {sinBrechaSignificativa} colaboradores ({((sinBrechaSignificativa / colaboradores.length) * 100).toFixed(1)}%)
                  muestran buena alineación entre auto y jefe.
                  Indica comunicación efectiva y expectativas claras.
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-800 mb-2">Recomendaciones</h4>
              <ul className="space-y-1 text-sm text-amber-700 list-disc list-inside">
                <li>Las dimensiones con brechas significativas requieren calibración de criterios de evaluación.</li>
                <li>Los niveles con alta sobreestimación pueden beneficiarse de feedback más frecuente.</li>
                <li>Una correlación auto-jefe menor a 0.5 sugiere necesidad de mejorar la comunicación de expectativas.</li>
                <li>Considere sesiones de retroalimentación para alinear percepciones entre colaboradores y jefes.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
