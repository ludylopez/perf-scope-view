import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Users,
  AlertTriangle,
  Shield,
  TrendingDown,
  Clock,
  UserMinus,
} from "lucide-react";
import { StatCard, StatCardGrid, InterpretationCard } from "@/components/charts";
import { calculateRiskScore, mean, type RiskFactor } from "@/lib/advancedStatistics";
import type { InterpretacionStats } from "@/types/analisis";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from "recharts";

interface ColaboradorRiesgo {
  id: string;
  nombre: string;
  nivel: string;
  direccion: string;
  desempeno: number;
  antiguedadAnios: number;
  edad: number | null;
  brecha: number;
  riskScore: number;
  riskLevel: "bajo" | "medio" | "alto" | "critico";
  factores: Array<{ name: string; contribution: number; alert: boolean }>;
}

const RISK_COLORS = {
  bajo: "#22c55e",
  medio: "#f59e0b",
  alto: "#f97316",
  critico: "#ef4444",
};

export default function AnalisisRiesgoRotacion() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [colaboradores, setColaboradores] = useState<ColaboradorRiesgo[]>([]);

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

      // Obtener datos de usuarios (incluyendo fecha_ingreso y fecha_nacimiento)
      const { data: users } = await supabase
        .from("users")
        .select("dpi, nombre, nivel, direccion_unidad, fecha_ingreso, fecha_nacimiento")
        .in("dpi", colaboradorIds);

      if (!users) {
        setError("No se pudieron cargar los datos de colaboradores");
        return;
      }

      const colabData: ColaboradorRiesgo[] = [];
      const now = new Date();

      results.forEach((r) => {
        const user = users.find(u => u.dpi === r.colaborador_id);
        if (!r.desempeno_porcentaje || !user) return;

        const desempeno = r.desempeno_porcentaje;
        // Brecha no disponible sin datos de auto/jefe individuales
        const brecha = 0;

        // Calcular antigüedad
        const fechaIngreso = user.fecha_ingreso ? new Date(user.fecha_ingreso) : null;
        const antiguedadAnios = fechaIngreso
          ? (now.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 365)
          : 5; // default 5 años si no hay fecha

        // Calcular edad
        const fechaNacimiento = user.fecha_nacimiento ? new Date(user.fecha_nacimiento) : null;
        const edad = fechaNacimiento
          ? Math.floor(
              (now.getTime() - fechaNacimiento.getTime()) / (1000 * 60 * 60 * 24 * 365)
            )
          : null;

        // Calcular score de riesgo con factores ponderados
        const factores: RiskFactor[] = [
          {
            name: "Bajo desempeño",
            value: desempeno,
            weight: 0.35,
            threshold: 60,
            direction: "lower_is_risk",
          },
          {
            name: "Baja antigüedad",
            value: antiguedadAnios,
            weight: 0.2,
            threshold: 2,
            direction: "lower_is_risk",
          },
          {
            name: "Alta brecha percepción",
            value: Math.abs(brecha),
            weight: 0.25,
            threshold: 10,
            direction: "higher_is_risk",
          },
          {
            name: "Rango de edad crítico",
            value: edad ? (edad < 30 || edad > 55 ? 1 : 0) : 0,
            weight: 0.1,
            threshold: 0.5,
            direction: "higher_is_risk",
          },
          {
            name: "Estancamiento (alta antigüedad + bajo desempeño)",
            value: antiguedadAnios > 10 && desempeno < 65 ? 1 : 0,
            weight: 0.1,
            threshold: 0.5,
            direction: "higher_is_risk",
          },
        ];

        const riskResult = calculateRiskScore(factores);

        colabData.push({
          id: r.colaborador_id,
          nombre: user.nombre || "Sin nombre",
          nivel: user.nivel || "Sin nivel",
          direccion: user.direccion_unidad || "Sin dirección",
          desempeno,
          antiguedadAnios,
          edad,
          brecha,
          riskScore: riskResult.totalScore,
          riskLevel: riskResult.riskLevel,
          factores: riskResult.contributingFactors,
        });
      });

      // Ordenar por riesgo descendente
      colabData.sort((a, b) => b.riskScore - a.riskScore);
      setColaboradores(colabData);
    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("Error al cargar el análisis de riesgo");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando análisis de riesgo...</span>
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

  // Estadísticas por nivel de riesgo
  const porNivelRiesgo = {
    bajo: colaboradores.filter((c) => c.riskLevel === "bajo"),
    medio: colaboradores.filter((c) => c.riskLevel === "medio"),
    alto: colaboradores.filter((c) => c.riskLevel === "alto"),
    critico: colaboradores.filter((c) => c.riskLevel === "critico"),
  };

  const riskScorePromedio = mean(colaboradores.map((c) => c.riskScore));

  // Datos para pie chart
  const pieData = [
    { name: "Bajo", value: porNivelRiesgo.bajo.length, fill: RISK_COLORS.bajo },
    { name: "Medio", value: porNivelRiesgo.medio.length, fill: RISK_COLORS.medio },
    { name: "Alto", value: porNivelRiesgo.alto.length, fill: RISK_COLORS.alto },
    { name: "Crítico", value: porNivelRiesgo.critico.length, fill: RISK_COLORS.critico },
  ].filter((d) => d.value > 0);

  // Top 15 colaboradores en riesgo
  const topRiesgo = colaboradores.slice(0, 15).map((c) => ({
    nombre: c.nombre.split(" ").slice(0, 2).join(" "),
    riskScore: c.riskScore,
    color: RISK_COLORS[c.riskLevel],
  }));

  // Scatter: Desempeño vs Antigüedad
  const scatterData = colaboradores.map((c) => ({
    x: c.antiguedadAnios,
    y: c.desempeno,
    nombre: c.nombre,
    nivel: c.nivel,
    riskLevel: c.riskLevel,
    riskScore: c.riskScore,
  }));

  // Por dirección
  const porDireccion = colaboradores.reduce((acc, c) => {
    if (!acc[c.direccion]) {
      acc[c.direccion] = { total: 0, enRiesgo: 0 };
    }
    acc[c.direccion].total++;
    if (c.riskLevel === "alto" || c.riskLevel === "critico") {
      acc[c.direccion].enRiesgo++;
    }
    return acc;
  }, {} as Record<string, { total: number; enRiesgo: number }>);

  const direccionData = Object.entries(porDireccion)
    .map(([dir, data]) => ({
      direccion: dir.length > 20 ? dir.substring(0, 18) + "..." : dir,
      total: data.total,
      enRiesgo: data.enRiesgo,
      porcentaje: ((data.enRiesgo / data.total) * 100).toFixed(1),
    }))
    .sort((a, b) => b.enRiesgo - a.enRiesgo)
    .slice(0, 10);

  const interpretacion: InterpretacionStats = {
    titulo: "Análisis de Riesgo de Rotación",
    descripcion: `Evaluación de ${colaboradores.length} colaboradores para identificar riesgo potencial de salida.`,
    hallazgos: [
      `${porNivelRiesgo.critico.length} colaboradores en riesgo crítico (${(
        (porNivelRiesgo.critico.length / colaboradores.length) *
        100
      ).toFixed(1)}%)`,
      `${porNivelRiesgo.alto.length} en riesgo alto`,
      `Score de riesgo promedio: ${riskScorePromedio.toFixed(1)}`,
      `${porNivelRiesgo.bajo.length} colaboradores con bajo riesgo`,
    ],
    recomendaciones:
      porNivelRiesgo.critico.length > 0 || porNivelRiesgo.alto.length > 0
        ? [
            "Priorizar entrevistas de retención con colaboradores en riesgo crítico",
            "Revisar compensación y oportunidades de desarrollo",
            "Implementar planes de carrera personalizados",
          ]
        : ["Mantener monitoreo preventivo regular"],
    nivel:
      porNivelRiesgo.critico.length > colaboradores.length * 0.1
        ? "critico"
        : porNivelRiesgo.alto.length > colaboradores.length * 0.15
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
            <h1 className="text-3xl font-bold">Riesgo de Rotación</h1>
            <p className="text-muted-foreground">{periodoNombre}</p>
          </div>
        </div>

        <StatCardGrid columns={5}>
          <StatCard
            title="Total Analizados"
            value={colaboradores.length}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            title="Riesgo Crítico"
            value={porNivelRiesgo.critico.length}
            icon={<AlertTriangle className="h-5 w-5" />}
            color="red"
          />
          <StatCard
            title="Riesgo Alto"
            value={porNivelRiesgo.alto.length}
            icon={<TrendingDown className="h-5 w-5" />}
            color="amber"
          />
          <StatCard
            title="Riesgo Medio"
            value={porNivelRiesgo.medio.length}
            icon={<Clock className="h-5 w-5" />}
            color="blue"
          />
          <StatCard
            title="Riesgo Bajo"
            value={porNivelRiesgo.bajo.length}
            icon={<Shield className="h-5 w-5" />}
            color="green"
          />
        </StatCardGrid>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribución de Riesgo</CardTitle>
              <CardDescription>Colaboradores por nivel de riesgo</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Top 15 Colaboradores en Riesgo</CardTitle>
              <CardDescription>Ordenados por score de riesgo</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topRiesgo} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="nombre" type="category" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(1)}`, "Score de Riesgo"]}
                  />
                  <Bar dataKey="riskScore">
                    {topRiesgo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Desempeño vs Antigüedad</CardTitle>
              <CardDescription>
                Zona de riesgo: bajo desempeño + baja antigüedad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Antigüedad"
                    label={{ value: "Años de antigüedad", position: "bottom" }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Desempeño"
                    domain={[30, 100]}
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
                            <p className="text-sm">
                              Antigüedad: {data.x.toFixed(1)} años
                            </p>
                            <p className="text-sm">Desempeño: {data.y.toFixed(1)}%</p>
                            <Badge
                              className="mt-1"
                              style={{ backgroundColor: RISK_COLORS[data.riskLevel as keyof typeof RISK_COLORS] }}
                            >
                              Riesgo: {data.riskScore.toFixed(0)}
                            </Badge>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine x={2} stroke="#f59e0b" strokeDasharray="3 3" />
                  <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="3 3" />
                  <Scatter name="Colaboradores" data={scatterData}>
                    {scatterData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={RISK_COLORS[entry.riskLevel as keyof typeof RISK_COLORS]}
                        opacity={entry.riskLevel === "bajo" ? 0.5 : 1}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <InterpretationCard data={interpretacion} />
        </div>

        {direccionData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Riesgo por Dirección</CardTitle>
              <CardDescription>
                Direcciones con mayor cantidad de colaboradores en riesgo alto/crítico
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={direccionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="direccion" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" name="Total" fill="#94a3b8" />
                  <Bar dataKey="enRiesgo" name="En Riesgo Alto/Crítico" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <UserMinus className="h-5 w-5" />
              Colaboradores en Riesgo Crítico y Alto
            </CardTitle>
            <CardDescription>
              Casos que requieren atención prioritaria de retención
            </CardDescription>
          </CardHeader>
          <CardContent>
            {porNivelRiesgo.critico.length === 0 && porNivelRiesgo.alto.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay colaboradores en riesgo alto o crítico
              </p>
            ) : (
              <div className="space-y-4">
                {[...porNivelRiesgo.critico, ...porNivelRiesgo.alto].slice(0, 20).map((c) => (
                  <div
                    key={c.id}
                    className={`p-4 rounded-lg border ${
                      c.riskLevel === "critico"
                        ? "border-red-300 bg-red-50 dark:bg-red-950/20"
                        : "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{c.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {c.nivel} • {c.direccion}
                        </p>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span>Desempeño: {c.desempeno.toFixed(1)}%</span>
                          <span>Antigüedad: {c.antiguedadAnios.toFixed(1)} años</span>
                          {c.edad && <span>Edad: {c.edad} años</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={
                            c.riskLevel === "critico" ? "bg-red-500" : "bg-amber-500"
                          }
                        >
                          {c.riskLevel.toUpperCase()}
                        </Badge>
                        <div className="mt-2">
                          <Progress
                            value={c.riskScore}
                            className="h-2 w-24"
                          />
                          <span className="text-xs text-muted-foreground">
                            Score: {c.riskScore.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Factores de riesgo:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {c.factores
                          .filter((f) => f.contribution > 5)
                          .map((f, idx) => (
                            <Badge
                              key={idx}
                              variant={f.alert ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {f.name} ({f.contribution.toFixed(0)}%)
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-orange-800 dark:text-orange-400">
                  Metodología de Cálculo de Riesgo
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  El score de riesgo se calcula combinando múltiples factores ponderados: bajo
                  desempeño (35%), baja antigüedad (20%), brecha de percepción auto-jefe (25%),
                  rango de edad crítico (10%), y estancamiento (10%). Este modelo predictivo
                  ayuda a identificar colaboradores que podrían estar considerando dejar la
                  organización, permitiendo intervenciones preventivas de retención.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
