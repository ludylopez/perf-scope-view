import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ArrowLeft, Users, CheckCircle2, BarChart3, Target } from "lucide-react";
import {
  StatCard,
  StatCardGrid,
  GaugeChart,
  PerformanceDistributionChart,
} from "@/components/charts";
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
} from "recharts";
import type { ResumenEjecutivo as ResumenEjecutivoType, ParticipacionNivel } from "@/types/analisis";

const COLORS_9BOX = {
  "alto-alto": "#22c55e",
  "alto-medio": "#84cc16",
  "alto-bajo": "#eab308",
  "medio-alto": "#84cc16",
  "medio-medio": "#eab308",
  "medio-bajo": "#f97316",
  "bajo-alto": "#eab308",
  "bajo-medio": "#f97316",
  "bajo-bajo": "#ef4444",
};

const LABELS_9BOX: Record<string, string> = {
  "alto-alto": "Estrellas",
  "alto-medio": "Alto Potencial",
  "alto-bajo": "Enigmas",
  "medio-alto": "Futuros Estrellas",
  "medio-medio": "Profesionales Clave",
  "medio-bajo": "Dilemas",
  "bajo-alto": "Efectivos",
  "bajo-medio": "Promedio",
  "bajo-bajo": "Bajo Rendimiento",
};

export default function ResumenEjecutivo() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [data, setData] = useState<ResumenEjecutivoType | null>(null);

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

      // Llamar a la función RPC del backend
      const { data: resumen, error: rpcError } = await supabase.rpc("get_resumen_ejecutivo", {
        periodo_id_param: periodo.id,
      });

      if (rpcError) {
        console.error("Error en RPC:", rpcError);
        // Si la función no existe, cargar datos manualmente
        await loadDataManually(periodo.id);
        return;
      }

      if (resumen) {
        setData(resumen as ResumenEjecutivoType);
      } else {
        await loadDataManually(periodo.id);
      }
    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("Error al cargar los datos del resumen ejecutivo");
    } finally {
      setLoading(false);
    }
  };

  const loadDataManually = async (periodoId: string) => {
    // Cargar datos de evaluaciones directamente
    const { data: users } = await supabase
      .from("users")
      .select("dpi, nivel")
      .not("nivel", "is", null);

    const { data: results } = await supabase
      .from("final_evaluation_results")
      .select("*")
      .eq("periodo_id", periodoId);

    const { data: jobLevels } = await supabase
      .from("job_levels")
      .select("code, name, category, hierarchical_order");

    if (!users || !results || !jobLevels) {
      setError("No se pudieron cargar los datos");
      return;
    }

    const totalColaboradores = users.length;
    const totalEvaluados = results.length;
    const tasaParticipacion = totalColaboradores > 0 ? (totalEvaluados / totalColaboradores) * 100 : 0;

    // Calcular participación por nivel
    const usersByNivel = users.reduce((acc, u) => {
      if (u.nivel) {
        acc[u.nivel] = (acc[u.nivel] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const evaluadosByNivel = results.reduce((acc, r) => {
      const user = users.find(u => u.dpi === r.colaborador_id);
      if (user?.nivel) {
        acc[user.nivel] = (acc[user.nivel] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const participacionPorNivel: ParticipacionNivel[] = jobLevels
      .sort((a, b) => (a.hierarchical_order || 0) - (b.hierarchical_order || 0))
      .map(jl => ({
        nivel: jl.code,
        nombre: jl.name,
        total: usersByNivel[jl.code] || 0,
        evaluados: evaluadosByNivel[jl.code] || 0,
        porcentaje: usersByNivel[jl.code]
          ? ((evaluadosByNivel[jl.code] || 0) / usersByNivel[jl.code]) * 100
          : 0,
      }))
      .filter(p => p.total > 0);

    // Calcular promedios
    const promedioDesempeno = results.length > 0
      ? results.reduce((sum, r) => sum + (r.desempeno_porcentaje || 0), 0) / results.length
      : 0;

    const resultadosConPotencial = results.filter(r => r.potencial_porcentaje !== null);
    const promedioPotencial = resultadosConPotencial.length > 0
      ? resultadosConPotencial.reduce((sum, r) => sum + (r.potencial_porcentaje || 0), 0) / resultadosConPotencial.length
      : 0;

    // Distribución 9-Box
    const distribucion9Box = results.reduce((acc, r) => {
      if (r.posicion_9box) {
        acc[r.posicion_9box] = (acc[r.posicion_9box] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    setData({
      totalColaboradores,
      totalEvaluados,
      tasaParticipacion,
      participacionPorNivel,
      promedioDesempeno,
      promedioPotencial,
      distribucion9Box,
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Cargando resumen ejecutivo...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "No se encontraron datos"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Preparar datos para gráficos
  const participacionChartData = data.participacionPorNivel.map(p => ({
    nivel: p.nivel,
    nombre: p.nombre.length > 20 ? p.nombre.substring(0, 20) + "..." : p.nombre,
    total: p.total,
    evaluados: p.evaluados,
    porcentaje: p.porcentaje,
  }));

  const pieData9Box = Object.entries(data.distribucion9Box)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: LABELS_9BOX[key] || key,
      value,
      color: COLORS_9BOX[key as keyof typeof COLORS_9BOX] || "#6b7280",
    }));

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
              <BarChart3 className="h-8 w-8" />
              Resumen Ejecutivo
            </h1>
            <p className="text-muted-foreground mt-1">
              Período: <span className="font-semibold">{periodoNombre}</span>
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Sección 1 del Informe</p>
            <p>KPIs y Participación</p>
          </div>
        </div>

        {/* KPIs principales */}
        <StatCardGrid columns={4}>
          <StatCard
            title="Total Colaboradores"
            value={data.totalColaboradores}
            icon={<Users className="h-5 w-5 text-blue-600" />}
            color="info"
          />
          <StatCard
            title="Evaluados"
            value={data.totalEvaluados}
            subtitle={`de ${data.totalColaboradores} colaboradores`}
            icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
            color="success"
          />
          <StatCard
            title="Promedio Desempeño"
            value={data.promedioDesempeno}
            format="percentage"
            icon={<Target className="h-5 w-5 text-purple-600" />}
            color={data.promedioDesempeno >= 75 ? "success" : data.promedioDesempeno >= 60 ? "warning" : "danger"}
          />
          <StatCard
            title="Promedio Potencial"
            value={data.promedioPotencial}
            format="percentage"
            icon={<BarChart3 className="h-5 w-5 text-amber-600" />}
            color={data.promedioPotencial >= 75 ? "success" : data.promedioPotencial >= 60 ? "warning" : "danger"}
          />
        </StatCardGrid>

        {/* Gauge de participación */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GaugeChart
            value={data.tasaParticipacion}
            title="Tasa de Participación Global"
            subtitle="Porcentaje de colaboradores evaluados"
            segments={[
              { from: 0, to: 50, color: "#ef4444", label: "Baja" },
              { from: 50, to: 70, color: "#f97316", label: "Moderada" },
              { from: 70, to: 85, color: "#eab308", label: "Buena" },
              { from: 85, to: 95, color: "#84cc16", label: "Alta" },
              { from: 95, to: 100, color: "#22c55e", label: "Completa" },
            ]}
            size="lg"
          />

          {/* Distribución 9-Box */}
          <Card>
            <CardHeader>
              <CardTitle>Distribución 9-Box</CardTitle>
              <CardDescription>Clasificación de colaboradores por desempeño y potencial</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData9Box}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData9Box.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value} colaboradores (${((value / data.totalEvaluados) * 100).toFixed(1)}%)`,
                        name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Leyenda organizada en grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 pt-4 border-t">
                {pieData9Box
                  .sort((a, b) => b.value - a.value)
                  .map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}</span>
                    <span className="font-mono text-muted-foreground ml-auto">
                      {item.value} <span className="text-xs">({((item.value / data.totalEvaluados) * 100).toFixed(0)}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Participación por nivel */}
        <Card>
          <CardHeader>
            <CardTitle>Participación por Nivel Jerárquico</CardTitle>
            <CardDescription>
              Cantidad de colaboradores y evaluados por cada nivel organizacional
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={participacionChartData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    tick={{ fontSize: 11 }}
                    width={90}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                          <p className="font-semibold">{d.nombre}</p>
                          <p className="text-muted-foreground">Código: {d.nivel}</p>
                          <div className="mt-2 space-y-1">
                            <p>Total: <span className="font-mono font-medium">{d.total}</span></p>
                            <p>Evaluados: <span className="font-mono font-medium">{d.evaluados}</span></p>
                            <p>Participación: <span className="font-mono font-medium">{d.porcentaje.toFixed(1)}%</span></p>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <Bar dataKey="total" name="Total" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="evaluados" name="Evaluados" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabla de resumen */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Nivel</th>
                    <th className="text-right py-2 font-medium">Total</th>
                    <th className="text-right py-2 font-medium">Evaluados</th>
                    <th className="text-right py-2 font-medium">Participación</th>
                  </tr>
                </thead>
                <tbody>
                  {data.participacionPorNivel.map((p) => (
                    <tr key={p.nivel} className="border-b">
                      <td className="py-2">
                        <span className="font-mono text-xs text-muted-foreground mr-2">{p.nivel}</span>
                        {p.nombre}
                      </td>
                      <td className="text-right py-2 font-mono">{p.total}</td>
                      <td className="text-right py-2 font-mono">{p.evaluados}</td>
                      <td className="text-right py-2">
                        <span
                          className={`font-mono px-2 py-0.5 rounded text-xs ${
                            p.porcentaje >= 90
                              ? "bg-green-100 text-green-700"
                              : p.porcentaje >= 70
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {p.porcentaje.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="py-2">TOTAL</td>
                    <td className="text-right py-2 font-mono">{data.totalColaboradores}</td>
                    <td className="text-right py-2 font-mono">{data.totalEvaluados}</td>
                    <td className="text-right py-2 font-mono">{data.tasaParticipacion.toFixed(1)}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
