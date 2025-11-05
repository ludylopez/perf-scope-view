import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BarChart3, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
  Filter,
  RefreshCw,
  Zap
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { exportToPDF, exportToExcel, ExportData } from "@/lib/exports";
import { getAPIUsageStats } from "@/lib/gemini";
import { scoreToPercentage } from "@/lib/calculations";

interface DashboardStats {
  totalUsuarios: number;
  totalJefes: number;
  evaluacionesCompletadas: number;
  evaluacionesPendientes: number;
  evaluacionesEnProgreso: number;
  porcentajeCompletitud: number;
  promedioDesempeno: number;
  promedioPotencial: number;
  distribucion9Box: Record<string, number>;
  evaluacionesPorArea: Array<{ area: string; completadas: number; total: number }>;
  evaluacionesPorNivel: Array<{ nivel: string; completadas: number; total: number }>;
  tendenciaSemanal: Array<{ semana: string; completadas: number }>;
}

const DashboardRRHH = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodoId, setPeriodoId] = useState<string>("2025-1");
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [apiUsageStats, setApiUsageStats] = useState(getAPIUsageStats());

  useEffect(() => {
    if (!user || (user.rol !== "admin_rrhh" && user.rol !== "admin_general")) {
      navigate("/dashboard");
      return;
    }
    loadStats();
  }, [user, navigate, periodoId, selectedArea]);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Obtener período activo
      const { data: periodData } = await supabase
        .from("evaluation_periods")
        .select("id")
        .eq("estado", "en_curso")
        .single();
      
      const activePeriodId = periodData?.id || periodoId;

      // OPTIMIZACIÓN: Usar función SQL para obtener todas las estadísticas de una vez
      // Esto reduce significativamente la carga de datos al cliente (de ~1200 registros a 1 JSONB)
      const { data: statsData, error: statsError } = await supabase
        .rpc("get_dashboard_stats", { periodo_id_param: activePeriodId });

      if (statsError) {
        console.error("Error loading stats:", statsError);
        // Fallback a método anterior si la función no existe aún
        await loadStatsFallback(activePeriodId);
        return;
      }

      if (!statsData) {
        await loadStatsFallback(activePeriodId);
        return;
      }

      // Mapear datos de la función SQL
      const distribucion9Box = statsData.distribucion9Box || {};
      const evaluacionesPorArea = (statsData.evaluacionesPorArea || []) as Array<{ area: string; completadas: number; total: number }>;
      const evaluacionesPorNivel = (statsData.evaluacionesPorNivel || []) as Array<{ nivel: string; completadas: number; total: number }>;

      // Tendencia semanal (simulada por ahora)
      const completadas = statsData.evaluacionesCompletadas || 0;
      const tendenciaSemanal = [
        { semana: "Sem 1", completadas: Math.floor(completadas * 0.1) },
        { semana: "Sem 2", completadas: Math.floor(completadas * 0.25) },
        { semana: "Sem 3", completadas: Math.floor(completadas * 0.5) },
        { semana: "Sem 4", completadas: Math.floor(completadas * 0.75) },
        { semana: "Actual", completadas },
      ];

      setStats({
        totalUsuarios: statsData.totalUsuarios || 0,
        totalJefes: statsData.totalJefes || 0,
        evaluacionesCompletadas: statsData.evaluacionesCompletadas || 0,
        evaluacionesPendientes: statsData.evaluacionesPendientes || 0,
        evaluacionesEnProgreso: statsData.evaluacionesEnProgreso || 0,
        porcentajeCompletitud: statsData.porcentajeCompletitud || 0,
        promedioDesempeno: statsData.promedioDesempeno || 0,
        promedioPotencial: statsData.promedioPotencial || 0,
        distribucion9Box: distribucion9Box as Record<string, number>,
        evaluacionesPorArea,
        evaluacionesPorNivel,
        tendenciaSemanal,
      });
    } catch (error: any) {
      console.error("Error loading stats:", error);
      toast.error("Error al cargar estadísticas");
    } finally {
      setLoading(false);
      setApiUsageStats(getAPIUsageStats());
    }
  };

  // Método fallback si la función SQL no está disponible
  const loadStatsFallback = async (activePeriodId: string) => {
    try {
      // Estadísticas básicas
      const { data: usuariosData } = await supabase
        .from("users")
        .select("dpi, rol, area, nivel")
        .eq("estado", "activo");

      const { data: evaluacionesData } = await supabase
        .from("evaluations")
        .select("estado, tipo, usuario_id, colaborador_id")
        .eq("periodo_id", activePeriodId);

      // Contar evaluaciones
      const evaluacionesJefe = evaluacionesData?.filter(e => e.tipo === "jefe") || [];
      
      const completadas = evaluacionesJefe.filter(e => e.estado === "enviado").length;
      const enProgreso = evaluacionesJefe.filter(e => e.estado === "borrador").length;
      const totalEsperadas = usuariosData?.filter(u => u.rol === "jefe").length || 0;
      const pendientes = totalEsperadas - completadas - enProgreso;

      // Obtener resultados finales para estadísticas
      const { data: resultadosData } = await supabase
        .from("final_evaluation_results")
        .select("resultado_final")
        .eq("periodo_id", activePeriodId);

      // Calcular promedios usando porcentajes directamente
      const promedios = resultadosData?.reduce((acc, r) => {
        const resultado = r.resultado_final as any;
        const desempenoPercent = resultado.desempenoFinal ? scoreToPercentage(resultado.desempenoFinal) : 0;
        const potencialPercent = resultado.potencial ? scoreToPercentage(resultado.potencial) : 0;
        acc.desempeno += desempenoPercent;
        acc.potencial += potencialPercent;
        acc.count++;
        return acc;
      }, { desempeno: 0, potencial: 0, count: 0 }) || { desempeno: 0, potencial: 0, count: 0 };

      const promedioDesempeno = promedios.count > 0 ? promedios.desempeno / promedios.count : 0;
      const promedioPotencial = promedios.count > 0 ? promedios.potencial / promedios.count : 0;

      // Distribución 9-box
      const distribucion9Box: Record<string, number> = {
        "alto-alto": 0,
        "alto-medio": 0,
        "alto-bajo": 0,
        "medio-alto": 0,
        "medio-medio": 0,
        "medio-bajo": 0,
        "bajo-alto": 0,
        "bajo-medio": 0,
        "bajo-bajo": 0,
      };

      resultadosData?.forEach((r) => {
        const resultado = r.resultado_final as any;
        if (resultado.posicion9Box) {
          distribucion9Box[resultado.posicion9Box] = (distribucion9Box[resultado.posicion9Box] || 0) + 1;
        }
      });

      // Estadísticas por área
      const areasMap = new Map<string, { completadas: number; total: number }>();
      usuariosData?.forEach((u) => {
        if (!areasMap.has(u.area)) {
          areasMap.set(u.area, { completadas: 0, total: 0 });
        }
        const area = areasMap.get(u.area)!;
        area.total++;
      });

      evaluacionesJefe.forEach((e) => {
        const usuario = usuariosData?.find(u => u.dpi === e.colaborador_id);
        if (usuario && e.estado === "enviado") {
          const area = areasMap.get(usuario.area);
          if (area) area.completadas++;
        }
      });

      const evaluacionesPorArea = Array.from(areasMap.entries()).map(([area, data]) => ({
        area,
        ...data,
      }));

      // Estadísticas por nivel
      const nivelesMap = new Map<string, { completadas: number; total: number }>();
      usuariosData?.forEach((u) => {
        if (!nivelesMap.has(u.nivel)) {
          nivelesMap.set(u.nivel, { completadas: 0, total: 0 });
        }
        const nivel = nivelesMap.get(u.nivel)!;
        nivel.total++;
      });

      evaluacionesJefe.forEach((e) => {
        const usuario = usuariosData?.find(u => u.dpi === e.colaborador_id);
        if (usuario && e.estado === "enviado") {
          const nivel = nivelesMap.get(usuario.nivel);
          if (nivel) nivel.completadas++;
        }
      });

      const evaluacionesPorNivel = Array.from(nivelesMap.entries()).map(([nivel, data]) => ({
        nivel,
        ...data,
      }));

      // Tendencia semanal
      const tendenciaSemanal = [
        { semana: "Sem 1", completadas: Math.floor(completadas * 0.1) },
        { semana: "Sem 2", completadas: Math.floor(completadas * 0.25) },
        { semana: "Sem 3", completadas: Math.floor(completadas * 0.5) },
        { semana: "Sem 4", completadas: Math.floor(completadas * 0.75) },
        { semana: "Actual", completadas },
      ];

      setStats({
        totalUsuarios: usuariosData?.length || 0,
        totalJefes: usuariosData?.filter(u => u.rol === "jefe").length || 0,
        evaluacionesCompletadas: completadas,
        evaluacionesPendientes: pendientes,
        evaluacionesEnProgreso: enProgreso,
        porcentajeCompletitud: totalEsperadas > 0 ? Math.round((completadas / totalEsperadas) * 100) : 0,
        promedioDesempeno,
        promedioPotencial,
        distribucion9Box,
        evaluacionesPorArea,
        evaluacionesPorNivel,
        tendenciaSemanal,
      });
    } catch (error: any) {
      console.error("Error in fallback:", error);
      toast.error("Error al cargar estadísticas");
    }
  };

  const handleExportReport = () => {
    if (!stats) return;

    const exportData: ExportData = {
      title: "Reporte de Evaluaciones - Dashboard RR.HH.",
      subtitle: "Análisis Global del Período",
      periodo: periodoId,
      fecha: format(new Date(), "dd/MM/yyyy HH:mm", { locale: es }),
      summary: [
        { label: "Total Usuarios", value: stats.totalUsuarios },
        { label: "Total Jefes", value: stats.totalJefes },
        { label: "Evaluaciones Completadas", value: stats.evaluacionesCompletadas },
        { label: "Evaluaciones Pendientes", value: stats.evaluacionesPendientes },
        { label: "Evaluaciones en Progreso", value: stats.evaluacionesEnProgreso },
        { label: "Porcentaje de Completitud", value: `${stats.porcentajeCompletitud}%` },
        { label: "Promedio de Desempeño", value: `${scoreToPercentage(stats.promedioDesempeno)}%` },
        { label: "Promedio de Potencial", value: `${scoreToPercentage(stats.promedioPotencial)}%` },
      ],
      tables: [
        {
          title: "Evaluaciones por Área",
          headers: ["Área", "Completadas", "Total", "Porcentaje"],
          rows: stats.evaluacionesPorArea.map((area) => [
            area.area,
            area.completadas,
            area.total,
            `${Math.round((area.completadas / area.total) * 100)}%`,
          ]),
        },
        {
          title: "Evaluaciones por Nivel",
          headers: ["Nivel", "Completadas", "Total", "Porcentaje"],
          rows: stats.evaluacionesPorNivel.map((nivel) => [
            nivel.nivel,
            nivel.completadas,
            nivel.total,
            `${Math.round((nivel.completadas / nivel.total) * 100)}%`,
          ]),
        },
        {
          title: "Distribución 9-Box",
          headers: ["Posición", "Cantidad"],
          rows: Object.entries(stats.distribucion9Box)
            .filter(([_, count]) => count > 0)
            .map(([position, count]) => [
              position.replace("-", " ").toUpperCase(),
              count,
            ]),
        },
        {
          title: "Tendencia Semanal",
          headers: ["Semana", "Evaluaciones Completadas"],
          rows: stats.tendenciaSemanal.map((item) => [
            item.semana,
            item.completadas,
          ]),
        },
      ],
    };

    // Mostrar opciones de exportación
    const formatChoice = window.prompt("Seleccione formato:\n1. PDF\n2. Excel\n\nIngrese 1 o 2:");
    if (formatChoice === "1") {
      exportToPDF(exportData, `reporte_rrhh_${periodoId}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Reporte PDF generado exitosamente");
    } else if (formatChoice === "2") {
      exportToExcel(exportData, `reporte_rrhh_${periodoId}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast.success("Reporte Excel generado exitosamente");
    }
  };

  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00", "#ff00ff", "#00ffff", "#ff0000", "#0000ff"];

  const pieData = stats?.distribucion9Box ? Object.entries(stats.distribucion9Box)
    .filter(([_, count]) => count > 0)
    .map(([position, count]) => ({
      name: position.replace("-", " ").toUpperCase(),
      value: count,
    })) : [];

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Dashboard de RR.HH. - Monitoreo Global
            </h1>
            <p className="text-muted-foreground mt-2">
              Estadísticas y análisis del período 2025-1
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadStats}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
            <Button 
              variant="outline"
              onClick={handleExportReport}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar Reporte
            </Button>
          </div>
        </div>

        {/* Tarjetas de Resumen */}
        <div className="grid gap-6 mb-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{stats.totalUsuarios}</p>
              <p className="text-xs text-muted-foreground mt-1">Activos en el sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Evaluaciones Completadas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-success">{stats.evaluacionesCompletadas}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.porcentajeCompletitud}% del total
              </p>
              <Progress value={stats.porcentajeCompletitud} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-info">{stats.evaluacionesEnProgreso}</p>
              <p className="text-xs text-muted-foreground mt-1">Requieren seguimiento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-warning">{stats.evaluacionesPendientes}</p>
              <p className="text-xs text-muted-foreground mt-1">Sin iniciar</p>
            </CardContent>
          </Card>
        </div>

        {/* Promedios y Distribución */}
        <div className="grid gap-6 mb-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Promedio de Desempeño</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">{scoreToPercentage(stats.promedioDesempeno)}%</p>
              <p className="text-sm text-muted-foreground mt-2">Desempeño promedio</p>
              <Progress value={scoreToPercentage(stats.promedioDesempeno)} className="mt-4" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Promedio de Potencial</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-accent">{scoreToPercentage(stats.promedioPotencial)}%</p>
              <p className="text-sm text-muted-foreground mt-2">Potencial promedio</p>
              <Progress value={scoreToPercentage(stats.promedioPotencial)} className="mt-4" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribución 9-Box</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay datos suficientes
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tarjeta de Uso de API de IA */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-info" />
              Uso de API de Google AI (Gemini)
            </CardTitle>
            <CardDescription>
              Consumo de créditos de IA para generación de planes de desarrollo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">Total de Llamadas</p>
                <p className="text-2xl font-bold text-primary">{apiUsageStats.totalCalls || 0}</p>
              </div>
              <div className="p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">Exitosas</p>
                <p className="text-2xl font-bold text-success">{apiUsageStats.successfulCalls || 0}</p>
                {apiUsageStats.totalCalls > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((apiUsageStats.successfulCalls / apiUsageStats.totalCalls) * 100)}% éxito
                  </p>
                )}
              </div>
              <div className="p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">Fallidas</p>
                <p className="text-2xl font-bold text-destructive">{apiUsageStats.failedCalls || 0}</p>
              </div>
              <div className="p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">Tokens Estimados</p>
                <p className="text-2xl font-bold text-info">{(apiUsageStats.totalTokens || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ~${((apiUsageStats.totalTokens || 0) / 1000000 * 0.10).toFixed(4)} USD
                </p>
              </div>
            </div>
            {apiUsageStats.lastCallDate && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Última llamada: {new Date(apiUsageStats.lastCallDate).toLocaleString("es-GT", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráficos Detallados */}
        <div className="grid gap-6 mb-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Evaluaciones por Área</CardTitle>
              <CardDescription>
                Completitud de evaluaciones por área organizacional
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.evaluacionesPorArea}>
                  <XAxis dataKey="area" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completadas" fill="#10b981" name="Completadas" />
                  <Bar dataKey="total" fill="#e5e7eb" name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evaluaciones por Nivel</CardTitle>
              <CardDescription>
                Distribución de evaluaciones completadas por nivel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.evaluacionesPorNivel}>
                  <XAxis dataKey="nivel" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completadas" fill="#8884d8" name="Completadas" />
                  <Bar dataKey="total" fill="#e5e7eb" name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tendencia Semanal */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Tendencia de Completitud</CardTitle>
            <CardDescription>
              Evolución semanal de evaluaciones completadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.tendenciaSemanal}>
                <XAxis dataKey="semana" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="completadas" stroke="#8884d8" strokeWidth={2} name="Completadas" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lista de Pendientes */}
        <Card>
          <CardHeader>
            <CardTitle>Evaluaciones Requiriendo Seguimiento</CardTitle>
            <CardDescription>
              Jefes con evaluaciones pendientes o en progreso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jefe Evaluador</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Colaboradores Pendientes</TableHead>
                  <TableHead>Última Actividad</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Funcionalidad en desarrollo - Se mostrará lista de jefes con evaluaciones pendientes
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DashboardRRHH;

