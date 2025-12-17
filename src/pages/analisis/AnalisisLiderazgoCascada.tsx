import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Users,
  TrendingUp,
  TrendingDown,
  GitBranch,
  BarChart3,
} from "lucide-react";
import {
  StatCard,
  StatCardGrid,
  InterpretationCard,
  CorrelationInterpretation,
} from "@/components/charts";
import {
  pearsonCorrelation,
  mean,
  standardDeviation,
  tTestIndependent,
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
  BarChart,
  Bar,
  Cell,
  Legend,
} from "recharts";

interface JefeConEquipo {
  jefeId: string;
  jefeNombre: string;
  jefeNivel: string;
  jefeDireccion: string;
  jefeDesempeno: number;
  equipoDesempenoPromedio: number;
  equipoSize: number;
  equipoDesviacion: number;
  miembros: Array<{
    id: string;
    nombre: string;
    desempeno: number;
  }>;
}

export default function AnalisisLiderazgoCascada() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [jefesConEquipo, setJefesConEquipo] = useState<JefeConEquipo[]>([]);
  const [correlacionGlobal, setCorrelacionGlobal] = useState<number | null>(null);

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

      // 1. Cargar resultados finales del período
      const { data: results } = await supabase
        .from("final_evaluation_results")
        .select("colaborador_id, desempeno_porcentaje")
        .eq("periodo_id", periodo.id)
        .not("desempeno_porcentaje", "is", null);

      if (!results || results.length === 0) {
        setError("No hay evaluaciones completadas para este período");
        return;
      }

      // 2. Cargar asignaciones jefe-colaborador activas
      const { data: assignments } = await supabase
        .from("user_assignments")
        .select("colaborador_id, jefe_id")
        .eq("activo", true);

      if (!assignments || assignments.length === 0) {
        setError("No hay asignaciones de jefes para este período");
        return;
      }

      // 3. Cargar datos de usuarios
      const allUserIds = [...new Set([
        ...results.map(r => r.colaborador_id),
        ...assignments.map(a => a.jefe_id)
      ])];

      const { data: users } = await supabase
        .from("users")
        .select("dpi, nombre, nivel, direccion_unidad")
        .in("dpi", allUserIds);

      if (!users) {
        setError("No se pudieron cargar los datos de colaboradores");
        return;
      }

      // Crear mapa de desempeño por colaborador
      const desempenoMap = new Map<string, number>();
      results.forEach((r) => {
        if (r.desempeno_porcentaje) {
          desempenoMap.set(r.colaborador_id, r.desempeno_porcentaje);
        }
      });

      // Crear mapa de usuarios
      const usersMap = new Map(users.map(u => [u.dpi, u]));

      // Agrupar por jefe
      const jefeEquipos = new Map<
        string,
        {
          miembros: Array<{ id: string; nombre: string; desempeno: number }>;
        }
      >();

      assignments.forEach((a) => {
        const colaboradorDesempeno = desempenoMap.get(a.colaborador_id);
        if (colaboradorDesempeno) {
          if (!jefeEquipos.has(a.jefe_id)) {
            jefeEquipos.set(a.jefe_id, { miembros: [] });
          }

          const user = usersMap.get(a.colaborador_id);
          jefeEquipos.get(a.jefe_id)?.miembros.push({
            id: a.colaborador_id,
            nombre: user?.nombre || "Sin nombre",
            desempeno: colaboradorDesempeno,
          });
        }
      });

      // Construir datos de jefes con equipos
      const jefesData: JefeConEquipo[] = [];

      jefeEquipos.forEach((data, jefeId) => {
        const jefeDesempeno = desempenoMap.get(jefeId);
        const jefeUser = usersMap.get(jefeId);

        if (jefeDesempeno && data.miembros.length >= 2) {
          const equipoDesempenos = data.miembros.map((m) => m.desempeno);
          const equipoPromedio = mean(equipoDesempenos);
          const equipoStd = standardDeviation(equipoDesempenos);

          jefesData.push({
            jefeId,
            jefeNombre: jefeUser?.nombre || "Sin nombre",
            jefeNivel: jefeUser?.nivel || "Sin nivel",
            jefeDireccion: jefeUser?.direccion_unidad || "Sin dirección",
            jefeDesempeno,
            equipoDesempenoPromedio: equipoPromedio,
            equipoSize: data.miembros.length,
            equipoDesviacion: equipoStd,
            miembros: data.miembros,
          });
        }
      });

      setJefesConEquipo(jefesData);

      // Calcular correlación global jefe-equipo
      if (jefesData.length >= 5) {
        const jefeScores = jefesData.map((j) => j.jefeDesempeno);
        const equipoScores = jefesData.map((j) => j.equipoDesempenoPromedio);
        const corr = pearsonCorrelation(jefeScores, equipoScores);
        setCorrelacionGlobal(corr);
      }
    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("Error al cargar el análisis de liderazgo en cascada");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando análisis de liderazgo...</span>
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

  const promedioJefes = mean(jefesConEquipo.map((j) => j.jefeDesempeno));
  const promedioEquipos = mean(jefesConEquipo.map((j) => j.equipoDesempenoPromedio));
  const totalColaboradores = jefesConEquipo.reduce((sum, j) => sum + j.equipoSize, 0);

  // Clasificar jefes por efectividad de liderazgo
  const jefesEfectivos = jefesConEquipo.filter(
    (j) => j.jefeDesempeno >= 75 && j.equipoDesempenoPromedio >= 70
  );
  const jefesConOportunidad = jefesConEquipo.filter(
    (j) => j.jefeDesempeno >= 70 && j.equipoDesempenoPromedio < 65
  );

  // Datos para scatter plot
  const scatterData = jefesConEquipo.map((j) => ({
    x: j.jefeDesempeno,
    y: j.equipoDesempenoPromedio,
    nombre: j.jefeNombre,
    nivel: j.jefeNivel,
    equipoSize: j.equipoSize,
    z: j.equipoSize * 5,
  }));

  // Datos para bar chart comparativo
  const barData = jefesConEquipo
    .sort((a, b) => b.equipoDesempenoPromedio - a.equipoDesempenoPromedio)
    .slice(0, 15)
    .map((j) => ({
      nombre: j.jefeNombre.split(" ").slice(0, 2).join(" "),
      "Desempeño Jefe": j.jefeDesempeno,
      "Promedio Equipo": j.equipoDesempenoPromedio,
      equipoSize: j.equipoSize,
    }));

  const interpretacion: InterpretacionStats = {
    titulo: "Efecto Cascada del Liderazgo",
    descripcion: `Análisis de ${jefesConEquipo.length} líderes con equipos de 2+ colaboradores, supervisando ${totalColaboradores} personas en total.`,
    hallazgos: [
      `Correlación jefe-equipo: ${correlacionGlobal?.toFixed(3) || "N/A"}`,
      `Promedio de desempeño de jefes: ${promedioJefes.toFixed(1)}%`,
      `Promedio de equipos: ${promedioEquipos.toFixed(1)}%`,
      `${jefesEfectivos.length} jefes con liderazgo efectivo (ambos ≥70%)`,
      jefesConOportunidad.length > 0
        ? `${jefesConOportunidad.length} jefes con buen desempeño pero equipos por debajo`
        : "",
    ].filter(Boolean),
    recomendaciones:
      correlacionGlobal && correlacionGlobal > 0.5
        ? [
            "La correlación positiva sugiere que el desempeño del líder impacta al equipo",
            "Invertir en desarrollo de líderes puede mejorar resultados organizacionales",
          ]
        : [
            "Investigar factores adicionales que afectan el desempeño de equipos",
            "Evaluar competencias de liderazgo independientemente del desempeño individual",
          ],
    nivel:
      correlacionGlobal && correlacionGlobal > 0.5
        ? "positivo"
        : correlacionGlobal && correlacionGlobal > 0.3
        ? "neutral"
        : "atencion",
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
            <h1 className="text-3xl font-bold">Liderazgo en Cascada</h1>
            <p className="text-muted-foreground">{periodoNombre}</p>
          </div>
        </div>

        <StatCardGrid columns={4}>
          <StatCard
            title="Líderes Analizados"
            value={jefesConEquipo.length}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            title="Colaboradores Supervisados"
            value={totalColaboradores}
            icon={<GitBranch className="h-5 w-5" />}
          />
          <StatCard
            title="Correlación Jefe-Equipo"
            value={correlacionGlobal?.toFixed(2) || "N/A"}
            icon={<BarChart3 className="h-5 w-5" />}
            color={
              correlacionGlobal && correlacionGlobal > 0.5
                ? "green"
                : correlacionGlobal && correlacionGlobal > 0.3
                ? "amber"
                : "red"
            }
          />
          <StatCard
            title="Líderes Efectivos"
            value={jefesEfectivos.length}
            subtitle={`${((jefesEfectivos.length / jefesConEquipo.length) * 100).toFixed(0)}%`}
            icon={<TrendingUp className="h-5 w-5" />}
            color="green"
          />
        </StatCardGrid>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Correlación Jefe vs Equipo</CardTitle>
              <CardDescription>
                Cada punto representa un líder. Tamaño indica cantidad de colaboradores.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Desempeño Jefe"
                    domain={[40, 100]}
                    label={{ value: "Desempeño del Jefe %", position: "bottom" }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Promedio Equipo"
                    domain={[40, 100]}
                    label={{ value: "Promedio Equipo %", angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip
                    content={({ payload }) => {
                      if (payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold">{data.nombre}</p>
                            <p className="text-sm text-muted-foreground">{data.nivel}</p>
                            <p className="text-sm">Equipo: {data.equipoSize} personas</p>
                            <p className="text-sm font-mono">
                              Jefe: {data.x.toFixed(1)}% | Equipo: {data.y.toFixed(1)}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine x={70} stroke="#3b82f6" strokeDasharray="3 3" />
                  <ReferenceLine y={70} stroke="#3b82f6" strokeDasharray="3 3" />
                  <Scatter name="Jefes" data={scatterData} fill="#8b5cf6">
                    {scatterData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.x >= 70 && entry.y >= 70
                            ? "#22c55e"
                            : entry.x < 60 || entry.y < 60
                            ? "#ef4444"
                            : "#f59e0b"
                        }
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <InterpretationCard data={interpretacion} />

            {correlacionGlobal !== null && (
              <CorrelationInterpretation
                correlation={correlacionGlobal}
                variable1="desempeño del jefe"
                variable2="promedio del equipo"
              />
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Comparativa Top 15 Líderes</CardTitle>
            <CardDescription>
              Desempeño del jefe vs promedio de su equipo (ordenado por equipo)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="nombre" type="category" width={100} tick={{ fontSize: 11 }} />
                <Tooltip
                  content={({ payload, label }) => {
                    if (payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{label}</p>
                          <p className="text-sm">Equipo: {data.equipoSize} personas</p>
                          {payload.map((p: { name: string; value: number; color: string }) => (
                            <p key={p.name} className="text-sm" style={{ color: p.color }}>
                              {p.name}: {(p.value as number).toFixed(1)}%
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="Desempeño Jefe" fill="#8b5cf6" />
                <Bar dataKey="Promedio Equipo" fill="#06b6d4" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="text-green-700 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Líderes con Alta Efectividad ({jefesEfectivos.length})
              </CardTitle>
              <CardDescription>Jefes ≥75% con equipos ≥70%</CardDescription>
            </CardHeader>
            <CardContent>
              {jefesEfectivos.length === 0 ? (
                <p className="text-muted-foreground">No hay líderes en esta categoría</p>
              ) : (
                <div className="space-y-3">
                  {jefesEfectivos.slice(0, 10).map((j) => (
                    <div
                      key={j.jefeId}
                      className="flex items-center justify-between p-2 rounded bg-white/50 dark:bg-black/20"
                    >
                      <div>
                        <p className="font-medium">{j.jefeNombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {j.jefeNivel} • {j.equipoSize} colaboradores
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-green-600">
                          {j.jefeDesempeno.toFixed(0)}%
                        </Badge>
                        <span className="mx-1">→</span>
                        <Badge className="bg-green-600">
                          {j.equipoDesempenoPromedio.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="text-amber-700 flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Oportunidad de Mejora ({jefesConOportunidad.length})
              </CardTitle>
              <CardDescription>Jefes ≥70% con equipos &lt;65%</CardDescription>
            </CardHeader>
            <CardContent>
              {jefesConOportunidad.length === 0 ? (
                <p className="text-muted-foreground">No hay casos identificados</p>
              ) : (
                <div className="space-y-3">
                  {jefesConOportunidad.slice(0, 10).map((j) => (
                    <div
                      key={j.jefeId}
                      className="flex items-center justify-between p-2 rounded bg-white/50 dark:bg-black/20"
                    >
                      <div>
                        <p className="font-medium">{j.jefeNombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {j.jefeNivel} • {j.equipoSize} colaboradores
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-green-600">
                          {j.jefeDesempeno.toFixed(0)}%
                        </Badge>
                        <span className="mx-1">→</span>
                        <Badge variant="destructive">
                          {j.equipoDesempenoPromedio.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <GitBranch className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-800 dark:text-blue-400">
                  Interpretación del Efecto Cascada
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Una correlación positiva fuerte (r &gt; 0.5) sugiere que el desempeño del líder
                  influye significativamente en su equipo. Esto puede deberse a: modelaje de
                  comportamiento, calidad del coaching, establecimiento de expectativas, y cultura
                  de equipo. Líderes con buen desempeño personal pero equipos rezagados pueden
                  necesitar desarrollo en competencias de gestión de personas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
