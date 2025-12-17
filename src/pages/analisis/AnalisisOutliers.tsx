import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
} from "lucide-react";
import { StatCard, StatCardGrid, InterpretationCard } from "@/components/charts";
import {
  detectOutliersIQR,
  mean,
  standardDeviation,
  percentile,
} from "@/lib/advancedStatistics";
import type { InterpretacionStats } from "@/types/analisis";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface ColaboradorData {
  id: string;
  nombre: string;
  nivel: string;
  direccion: string;
  porcentajeFinal: number;
  porcentajeAuto: number | null;
  porcentajeJefe: number | null;
  brecha: number | null;
}

interface OutlierColaborador extends ColaboradorData {
  outlierType: "extreme_high" | "mild_high" | "mild_low" | "extreme_low";
  zScore: number;
}

export default function AnalisisOutliers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [colaboradores, setColaboradores] = useState<ColaboradorData[]>([]);
  const [outliers, setOutliers] = useState<OutlierColaborador[]>([]);
  const [bounds, setBounds] = useState({
    lowerExtreme: 0,
    lowerMild: 0,
    upperMild: 100,
    upperExtreme: 100,
  });
  const [stats, setStats] = useState({ total: 0, outlierCount: 0, outlierPercent: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const periodo = await getActivePeriod();
      if (!periodo) {
        setError("No se encontró un período de evaluación activo");
        return;
      }
      setPeriodoNombre(periodo.nombre);

      // Cargar resultados finales del período
      const { data: results } = await supabase
        .from("final_evaluation_results")
        .select("colaborador_id, desempeno_porcentaje, potencial_porcentaje")
        .eq("periodo_id", periodo.id)
        .not("desempeno_porcentaje", "is", null);

      if (!results || results.length === 0) {
        setError("No hay evaluaciones completadas para este período");
        return;
      }

      const colaboradorIds = results.map(r => r.colaborador_id);

      // Obtener datos de usuarios
      const { data: users } = await supabase
        .from("users")
        .select("dpi, nombre, nivel, direccion_unidad")
        .in("dpi", colaboradorIds);

      if (!users) {
        setError("No se pudieron cargar los datos de colaboradores");
        return;
      }

      // Procesar datos de colaboradores
      const colabData: ColaboradorData[] = results
        .map(r => {
          const user = users.find(u => u.dpi === r.colaborador_id);
          if (!r.desempeno_porcentaje) return null;

          return {
            id: r.colaborador_id,
            nombre: user?.nombre || "Sin nombre",
            nivel: user?.nivel || "Sin nivel",
            direccion: user?.direccion_unidad || "Sin dirección",
            porcentajeFinal: r.desempeno_porcentaje,
            porcentajeAuto: null, // No disponible en final_evaluation_results
            porcentajeJefe: null, // No disponible en final_evaluation_results
            brecha: null,
          };
        })
        .filter((c): c is ColaboradorData => c !== null);

      setColaboradores(colabData);

      // Detectar outliers
      const outlierResult = detectOutliersIQR(
        colabData.map((c) => ({ ...c, value: c.porcentajeFinal })),
        (item) => item.value
      );

      setOutliers(
        outlierResult.outliers.map((o) => ({
          id: o.id,
          nombre: o.nombre,
          nivel: o.nivel,
          direccion: o.direccion,
          porcentajeFinal: o.porcentajeFinal,
          porcentajeAuto: o.porcentajeAuto,
          porcentajeJefe: o.porcentajeJefe,
          brecha: o.brecha,
          outlierType: o.outlierType,
          zScore: o.zScore,
        }))
      );
      setBounds(outlierResult.bounds);
      setStats(outlierResult.stats);
    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("Error al cargar el análisis de outliers");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando análisis de outliers...</span>
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

  const avg = mean(colaboradores.map((c) => c.porcentajeFinal));
  const std = standardDeviation(colaboradores.map((c) => c.porcentajeFinal));

  const outliersAltos = outliers.filter(
    (o) => o.outlierType === "extreme_high" || o.outlierType === "mild_high"
  );
  const outliersBajos = outliers.filter(
    (o) => o.outlierType === "extreme_low" || o.outlierType === "mild_low"
  );

  // Datos para scatter plot
  const scatterData = colaboradores.map((c) => ({
    x: colaboradores.indexOf(c) + 1,
    y: c.porcentajeFinal,
    nombre: c.nombre,
    nivel: c.nivel,
    isOutlier: outliers.some((o) => o.id === c.id),
    outlierType: outliers.find((o) => o.id === c.id)?.outlierType,
  }));

  // Distribución por nivel de outliers
  const outliersByNivel: Record<string, { altos: number; bajos: number }> = {};
  outliers.forEach((o) => {
    if (!outliersByNivel[o.nivel]) {
      outliersByNivel[o.nivel] = { altos: 0, bajos: 0 };
    }
    if (o.outlierType.includes("high")) {
      outliersByNivel[o.nivel].altos++;
    } else {
      outliersByNivel[o.nivel].bajos++;
    }
  });

  const nivelData = Object.entries(outliersByNivel).map(([nivel, data]) => ({
    nivel,
    "Alto rendimiento": data.altos,
    "Bajo rendimiento": data.bajos,
  }));

  const interpretacion: InterpretacionStats = {
    titulo: "Resumen de Casos Atípicos",
    descripcion: `Se identificaron ${stats.outlierCount} colaboradores con desempeño atípico (${stats.outlierPercent}% del total).`,
    hallazgos: [
      `${outliersAltos.length} casos de alto rendimiento excepcional (Z > 1.5)`,
      `${outliersBajos.length} casos de bajo rendimiento atípico (Z < -1.5)`,
      `Media organizacional: ${avg.toFixed(1)}%, Desviación estándar: ${std.toFixed(1)}%`,
      `Rango normal: ${bounds.lowerMild.toFixed(1)}% - ${bounds.upperMild.toFixed(1)}%`,
    ],
    recomendaciones:
      outliersBajos.length > 0
        ? [
            "Investigar causas de bajo rendimiento en casos atípicos",
            "Diseñar planes de mejora individualizados",
            outliersAltos.length > 0
              ? "Considerar a los de alto rendimiento como mentores"
              : "",
          ].filter(Boolean)
        : ["Los casos de alto rendimiento pueden servir como modelos a seguir"],
    nivel:
      outliersBajos.length > colaboradores.length * 0.1
        ? "critico"
        : outliersBajos.length > 0
        ? "atencion"
        : "positivo",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              to="/analisis"
              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a dashboards
            </Link>
            <h1 className="text-3xl font-bold">Análisis de Outliers</h1>
            <p className="text-muted-foreground">{periodoNombre}</p>
          </div>
        </div>

        <StatCardGrid columns={4}>
          <StatCard
            title="Total Evaluados"
            value={stats.total}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            title="Casos Atípicos"
            value={stats.outlierCount}
            subtitle={`${stats.outlierPercent}% del total`}
            icon={<AlertTriangle className="h-5 w-5" />}
            color={stats.outlierPercent > 10 ? "red" : "amber"}
          />
          <StatCard
            title="Alto Rendimiento"
            value={outliersAltos.length}
            subtitle="Sobre el rango normal"
            icon={<TrendingUp className="h-5 w-5" />}
            color="green"
          />
          <StatCard
            title="Bajo Rendimiento"
            value={outliersBajos.length}
            subtitle="Bajo el rango normal"
            icon={<TrendingDown className="h-5 w-5" />}
            color="red"
          />
        </StatCardGrid>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Distribución de Desempeño</CardTitle>
              <CardDescription>
                Visualización de todos los colaboradores con identificación de outliers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Colaborador"
                    tick={false}
                    label={{ value: "Colaboradores", position: "bottom" }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Desempeño"
                    domain={[0, 100]}
                    label={{ value: "Desempeño %", angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip
                    content={({ payload }) => {
                      if (payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold">{data.nombre}</p>
                            <p className="text-sm text-muted-foreground">{data.nivel}</p>
                            <p className="text-sm font-mono">
                              Desempeño: {data.y.toFixed(1)}%
                            </p>
                            {data.isOutlier && (
                              <Badge
                                variant={
                                  data.outlierType?.includes("high")
                                    ? "default"
                                    : "destructive"
                                }
                                className="mt-1"
                              >
                                {data.outlierType?.includes("extreme")
                                  ? "Extremo"
                                  : "Moderado"}
                              </Badge>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={bounds.upperMild}
                    stroke="#22c55e"
                    strokeDasharray="5 5"
                    label={{ value: "Límite superior", position: "right", fill: "#22c55e" }}
                  />
                  <ReferenceLine
                    y={avg}
                    stroke="#3b82f6"
                    strokeDasharray="3 3"
                    label={{ value: "Media", position: "right", fill: "#3b82f6" }}
                  />
                  <ReferenceLine
                    y={bounds.lowerMild}
                    stroke="#ef4444"
                    strokeDasharray="5 5"
                    label={{ value: "Límite inferior", position: "right", fill: "#ef4444" }}
                  />
                  <Scatter name="Colaboradores" data={scatterData}>
                    {scatterData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.isOutlier
                            ? entry.outlierType?.includes("high")
                              ? "#22c55e"
                              : "#ef4444"
                            : "#94a3b8"
                        }
                        opacity={entry.isOutlier ? 1 : 0.5}
                        r={entry.isOutlier ? 8 : 4}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <InterpretationCard data={interpretacion} />
        </div>

        {nivelData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Outliers por Nivel Jerárquico</CardTitle>
              <CardDescription>Distribución de casos atípicos por nivel</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={nivelData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nivel" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Alto rendimiento" fill="#22c55e" />
                  <Bar dataKey="Bajo rendimiento" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="bajos" className="w-full">
          <TabsList>
            <TabsTrigger value="bajos" className="text-red-600">
              Bajo Rendimiento ({outliersBajos.length})
            </TabsTrigger>
            <TabsTrigger value="altos" className="text-green-600">
              Alto Rendimiento ({outliersAltos.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bajos">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Colaboradores con Bajo Rendimiento Atípico
                </CardTitle>
                <CardDescription>
                  Casos que requieren atención y posible intervención
                </CardDescription>
              </CardHeader>
              <CardContent>
                {outliersBajos.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No se identificaron casos de bajo rendimiento atípico
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2">Colaborador</th>
                          <th className="text-left py-3 px-2">Nivel</th>
                          <th className="text-left py-3 px-2">Dirección</th>
                          <th className="text-right py-3 px-2">Final</th>
                          <th className="text-right py-3 px-2">Auto</th>
                          <th className="text-right py-3 px-2">Jefe</th>
                          <th className="text-right py-3 px-2">Z-Score</th>
                          <th className="text-center py-3 px-2">Severidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outliersBajos
                          .sort((a, b) => a.porcentajeFinal - b.porcentajeFinal)
                          .map((o) => (
                            <tr key={o.id} className="border-b hover:bg-muted/50">
                              <td className="py-3 px-2 font-medium">{o.nombre}</td>
                              <td className="py-3 px-2">{o.nivel}</td>
                              <td className="py-3 px-2 text-sm text-muted-foreground">
                                {o.direccion}
                              </td>
                              <td className="py-3 px-2 text-right font-mono text-red-600">
                                {o.porcentajeFinal.toFixed(1)}%
                              </td>
                              <td className="py-3 px-2 text-right font-mono">
                                {o.porcentajeAuto?.toFixed(1) || "-"}%
                              </td>
                              <td className="py-3 px-2 text-right font-mono">
                                {o.porcentajeJefe?.toFixed(1) || "-"}%
                              </td>
                              <td className="py-3 px-2 text-right font-mono">
                                {o.zScore.toFixed(2)}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <Badge
                                  variant={
                                    o.outlierType === "extreme_low"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                >
                                  {o.outlierType === "extreme_low" ? "Extremo" : "Moderado"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="altos">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Colaboradores con Alto Rendimiento Excepcional
                </CardTitle>
                <CardDescription>
                  Casos destacados que pueden servir como referencia
                </CardDescription>
              </CardHeader>
              <CardContent>
                {outliersAltos.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No se identificaron casos de alto rendimiento excepcional
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2">Colaborador</th>
                          <th className="text-left py-3 px-2">Nivel</th>
                          <th className="text-left py-3 px-2">Dirección</th>
                          <th className="text-right py-3 px-2">Final</th>
                          <th className="text-right py-3 px-2">Auto</th>
                          <th className="text-right py-3 px-2">Jefe</th>
                          <th className="text-right py-3 px-2">Z-Score</th>
                          <th className="text-center py-3 px-2">Nivel</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outliersAltos
                          .sort((a, b) => b.porcentajeFinal - a.porcentajeFinal)
                          .map((o) => (
                            <tr key={o.id} className="border-b hover:bg-muted/50">
                              <td className="py-3 px-2 font-medium">{o.nombre}</td>
                              <td className="py-3 px-2">{o.nivel}</td>
                              <td className="py-3 px-2 text-sm text-muted-foreground">
                                {o.direccion}
                              </td>
                              <td className="py-3 px-2 text-right font-mono text-green-600">
                                {o.porcentajeFinal.toFixed(1)}%
                              </td>
                              <td className="py-3 px-2 text-right font-mono">
                                {o.porcentajeAuto?.toFixed(1) || "-"}%
                              </td>
                              <td className="py-3 px-2 text-right font-mono">
                                {o.porcentajeJefe?.toFixed(1) || "-"}%
                              </td>
                              <td className="py-3 px-2 text-right font-mono">
                                +{o.zScore.toFixed(2)}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <Badge
                                  variant="default"
                                  className={
                                    o.outlierType === "extreme_high"
                                      ? "bg-green-600"
                                      : "bg-green-400"
                                  }
                                >
                                  {o.outlierType === "extreme_high"
                                    ? "Excepcional"
                                    : "Destacado"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Eye className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-400">
                  Metodología de Detección
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Los outliers se identifican usando el método del Rango Intercuartílico (IQR).
                  Valores por encima de Q3 + 1.5×IQR o por debajo de Q1 - 1.5×IQR se consideran
                  atípicos moderados. Valores más allá de 3×IQR se consideran extremos. Este
                  método es robusto ante distribuciones asimétricas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
