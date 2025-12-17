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
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { exportToPDF, exportToExcel, ExportData } from "@/lib/exports";
import { getAPIUsageStats } from "@/lib/openai";
import { scoreToPercentage } from "@/lib/calculations";

interface DashboardStats {
  totalUsuarios: number;
  totalJefes: number;
  evaluacionesCompletadas: number;
  evaluacionesPendientes: number;
  evaluacionesEnProgreso: number;
  reaperturas?: number; // Evaluaciones reaperturadas
  porcentajeCompletitud: number;
  promedioDesempeno: number;
  promedioPotencial: number;
  npsPromedio?: number;
  npsPromoters?: number;
  npsPassives?: number;
  npsDetractors?: number;
  distribucion9Box: Record<string, number>;
  evaluacionesPorArea: Array<{ area: string; completadas: number; total: number }>;
  evaluacionesPorNivel: Array<{ nivel: string; completadas: number; total: number }>;
  tendenciaSemanal: Array<{ semana: string; completadas: number }>;
  autoevaluacionesJefesCompletadas?: number; // Autoevaluaciones de jefes completadas
  autoevaluacionesJefesEnProgreso?: number; // Autoevaluaciones de jefes en progreso
  autoevaluacionesJefesPendientes?: number; // Autoevaluaciones de jefes pendientes
  totalJefesConAutoevaluacion?: number; // Total de jefes que deberían tener autoevaluación
  autoevaluacionesColaboradoresCompletadas?: number; // Autoevaluaciones de colaboradores completadas
  autoevaluacionesColaboradoresEnProgreso?: number; // Autoevaluaciones de colaboradores en progreso
  totalColaboradoresConAutoevaluacion?: number; // Total de colaboradores que deberían tener autoevaluación
}

const DashboardRRHH = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [advancedStats, setAdvancedStats] = useState<any>(null);
  const [executiveKPIs, setExecutiveKPIs] = useState<any>(null);
  const [desarrolloStats, setDesarrolloStats] = useState<any>(null);
  const [seguimientoData, setSeguimientoData] = useState<any[]>([]);
  const [resumenSeguimiento, setResumenSeguimiento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [periodoId, setPeriodoId] = useState<string>("2025-1");
  const [activePeriodId, setActivePeriodId] = useState<string>("");
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [apiUsageStats, setApiUsageStats] = useState(getAPIUsageStats());

  useEffect(() => {
    if (!user || (user.rol !== "admin_rrhh" && user.rol !== "admin_general")) {
      navigate("/dashboard");
      return;
    }
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Obtener período activo
      const { data: periodData } = await supabase
        .from("evaluation_periods")
        .select("id")
        .eq("estado", "en_curso")
        .single();
      
      const currentPeriodId = periodData?.id || periodoId;
      setActivePeriodId(currentPeriodId);

      // OPTIMIZACIÓN: Usar función SQL para obtener todas las estadísticas de una vez
      // Esto reduce significativamente la carga de datos al cliente (de ~1200 registros a 1 JSONB)
      const { data: statsData, error: statsError } = await supabase
        .rpc("get_dashboard_stats", { periodo_id_param: currentPeriodId });

      if (statsError) {
        console.error("Error loading stats:", statsError);
        // Fallback a método anterior si la función no existe aún
        await loadStatsFallback(currentPeriodId);
        return;
      }

      if (!statsData) {
        await loadStatsFallback(currentPeriodId);
        return;
      }

      // Mapear datos de la función SQL
      const distribucion9Box = statsData.distribucion9Box || {};
      const evaluacionesPorArea = (statsData.evaluacionesPorArea || []) as Array<{ area: string; completadas: number; total: number }>;
      const evaluacionesPorNivel = (statsData.evaluacionesPorNivel || []) as Array<{ nivel: string; completadas: number; total: number }>;
      
      // Tendencia semanal REAL desde la base de datos
      const tendenciaSemanal = (statsData.tendenciaSemanal || []) as Array<{ semana: string; completadas: number }>;

      // Debug: Verificar datos de NPS
      console.log("📊 NPS Data from SQL:", {
        npsPromedio: statsData.npsPromedio,
        npsPromoters: statsData.npsPromoters,
        npsPassives: statsData.npsPassives,
        npsDetractors: statsData.npsDetractors,
        allKeys: Object.keys(statsData)
      });

      // Cargar métricas avanzadas
      const { data: advancedStatsData, error: advancedError } = await supabase
        .rpc("get_advanced_dashboard_stats", { periodo_id_param: currentPeriodId });

      if (advancedError) {
        console.error("Error loading advanced stats:", advancedError);
        toast.error("Error al cargar métricas avanzadas", {
          description: advancedError.message
        });
      } else if (advancedStatsData) {
        console.log("Advanced stats loaded:", {
          hasElegibilidad: !!advancedStatsData.elegibilidad,
          hasAntiguedadDistribution: !!advancedStatsData.antiguedadDistribution,
          hasAntiguedadCompleta: !!advancedStatsData.antiguedadCompleta,
          keys: Object.keys(advancedStatsData)
        });
        setAdvancedStats(advancedStatsData);
      } else {
        console.warn("No advanced stats data returned");
      }

      // Cargar KPIs ejecutivos
      const { data: executiveKPIsData, error: executiveError } = await supabase
        .rpc("get_executive_kpis", { periodo_id_param: currentPeriodId });

      if (!executiveError && executiveKPIsData) {
        setExecutiveKPIs(executiveKPIsData);
      }

      // Cargar métricas de desarrollo (si hay período anterior)
      const { data: periodosData } = await supabase
        .from("evaluation_periods")
        .select("id, nombre")
        .order("nombre", { ascending: false })
        .limit(2);

      if (periodosData && periodosData.length >= 2) {
        const periodoAnteriorId = periodosData[1].id;
        const { data: desarrolloData, error: desarrolloError } = await supabase
          .rpc("get_desarrollo_metrics", { 
            periodo_actual_id: currentPeriodId,
            periodo_anterior_id: periodoAnteriorId
          });

        if (!desarrolloError && desarrolloData) {
          setDesarrolloStats(desarrolloData);
        }
      }

      // Cargar seguimiento de evaluaciones
      const { data: seguimientoData, error: seguimientoError } = await supabase
        .rpc("get_seguimiento_evaluaciones", { periodo_id_param: currentPeriodId });

      if (seguimientoError) {
        console.error("❌ Error cargando seguimiento de evaluaciones:", seguimientoError);
        console.error("Período usado:", currentPeriodId);
        toast.error("Error al cargar seguimiento de evaluaciones", {
          description: seguimientoError.message
        });
        setSeguimientoData([]);
      } else {
        console.log("✅ Seguimiento de evaluaciones cargado:", {
          periodo: currentPeriodId,
          cantidadJefes: seguimientoData?.length || 0,
          datos: seguimientoData
        });
        setSeguimientoData(seguimientoData || []);
      }

      // Cargar resumen de seguimiento
      const { data: resumenData, error: resumenError } = await supabase
        .rpc("get_resumen_seguimiento", { periodo_id_param: currentPeriodId });

      if (!resumenError && resumenData) {
        setResumenSeguimiento(resumenData);
      }

      // Cargar estadísticas de múltiples evaluadores
      const { data: multipleEvaluatorsStats, error: multipleEvaluatorsError } = await supabase
        .rpc("get_multiple_evaluators_stats", { periodo_id_param: currentPeriodId });

      if (!multipleEvaluatorsError && multipleEvaluatorsStats) {
        // Agregar estadísticas de múltiples evaluadores a advancedStats
        setAdvancedStats((prev: any) => ({
          ...prev,
          multipleEvaluators: multipleEvaluatorsStats,
        }));
      }

      // Cargar autoevaluaciones de jefes completadas
      let autoevaluacionesJefesCompletadas = 0;
      let autoevaluacionesJefesEnProgreso = 0;
      let autoevaluacionesJefesPendientes = 0;
      let totalJefesConAutoevaluacion = 0;

      try {
        // Obtener jefes activos que NO son externos (excluir evaluadores externos)
        // Incluye usuarios con es_externo = false o es_externo = NULL (para compatibilidad)
        const { data: jefesData, error: jefesError } = await supabase
          .from("users")
          .select("dpi")
          .eq("rol", "jefe")
          .eq("estado", "activo")
          .or("es_externo.is.null,es_externo.eq.false");

        if (jefesError) {
          console.error("Error cargando jefes:", jefesError);
        } else {
          const jefesIds = jefesData?.map(j => j.dpi) || [];
          totalJefesConAutoevaluacion = jefesIds.length;

          if (jefesIds.length > 0) {
            // Autoevaluaciones completadas
            const { count: countCompletadas, error: errorCompletadas } = await supabase
              .from("evaluations")
              .select("*", { count: "exact", head: true })
              .eq("periodo_id", currentPeriodId)
              .eq("tipo", "auto")
              .eq("estado", "enviado")
              .in("usuario_id", jefesIds);

            if (errorCompletadas) {
              console.error("Error contando autoevaluaciones completadas de jefes:", errorCompletadas);
            } else {
              autoevaluacionesJefesCompletadas = countCompletadas || 0;
            }

            // Autoevaluaciones en progreso
            const { count: countEnProgreso, error: errorEnProgreso } = await supabase
              .from("evaluations")
              .select("*", { count: "exact", head: true })
              .eq("periodo_id", currentPeriodId)
              .eq("tipo", "auto")
              .eq("estado", "borrador")
              .in("usuario_id", jefesIds);

            if (errorEnProgreso) {
              console.error("Error contando autoevaluaciones en progreso de jefes:", errorEnProgreso);
            } else {
              autoevaluacionesJefesEnProgreso = countEnProgreso || 0;
            }

            // Autoevaluaciones pendientes = Total jefes - Completadas - En Progreso
            autoevaluacionesJefesPendientes = Math.max(0, totalJefesConAutoevaluacion - autoevaluacionesJefesCompletadas - autoevaluacionesJefesEnProgreso);
          }
        }
      } catch (error) {
        console.error("Error en carga de autoevaluaciones de jefes:", error);
        // Continuar con valores por defecto (0)
      }

      // Cargar autoevaluaciones de colaboradores
      let autoevaluacionesColaboradoresCompletadas = 0;
      let autoevaluacionesColaboradoresEnProgreso = 0;
      let totalColaboradoresConAutoevaluacion = 0;

      try {
        const { data: colaboradoresData, error: colaboradoresError } = await supabase
          .from("users")
          .select("dpi")
          .eq("rol", "colaborador")
          .eq("estado", "activo");

        if (colaboradoresError) {
          console.error("Error cargando colaboradores:", colaboradoresError);
        } else {
          const colaboradoresIds = colaboradoresData?.map(c => c.dpi) || [];
          totalColaboradoresConAutoevaluacion = colaboradoresIds.length;

          if (colaboradoresIds.length > 0) {
            // Autoevaluaciones de colaboradores completadas
            const { count: countCompletadasColab, error: errorCompletadas } = await supabase
              .from("evaluations")
              .select("*", { count: "exact", head: true })
              .eq("periodo_id", currentPeriodId)
              .eq("tipo", "auto")
              .eq("estado", "enviado")
              .in("usuario_id", colaboradoresIds);

            if (errorCompletadas) {
              console.error("Error contando autoevaluaciones completadas de colaboradores:", errorCompletadas);
            } else {
              autoevaluacionesColaboradoresCompletadas = countCompletadasColab || 0;
            }

            // Autoevaluaciones de colaboradores en progreso
            const { count: countEnProgresoColab, error: errorEnProgreso } = await supabase
              .from("evaluations")
              .select("*", { count: "exact", head: true })
              .eq("periodo_id", currentPeriodId)
              .eq("tipo", "auto")
              .eq("estado", "borrador")
              .in("usuario_id", colaboradoresIds);

            if (errorEnProgreso) {
              console.error("Error contando autoevaluaciones en progreso de colaboradores:", errorEnProgreso);
            } else {
              autoevaluacionesColaboradoresEnProgreso = countEnProgresoColab || 0;
            }
          }
        }
      } catch (error) {
        console.error("Error en carga de autoevaluaciones de colaboradores:", error);
        // Continuar con valores por defecto (0)
      }

      console.log("✅ Preparando setStats con datos:", {
        totalUsuarios: statsData.totalUsuarios || 0,
        autoevaluacionesJefesCompletadas,
        autoevaluacionesColaboradoresCompletadas,
      });

      setStats({
        totalUsuarios: statsData.totalUsuarios || 0,
        totalJefes: statsData.totalJefes || 0,
        evaluacionesCompletadas: statsData.evaluacionesCompletadas || 0,
        evaluacionesPendientes: statsData.evaluacionesPendientes || 0,
        evaluacionesEnProgreso: statsData.evaluacionesEnProgreso || 0,
        porcentajeCompletitud: statsData.porcentajeCompletitud || 0,
        promedioDesempeno: statsData.promedioDesempeno || 0,
        promedioPotencial: statsData.promedioPotencial || 0,
        npsPromedio: statsData.npsPromedio !== null && statsData.npsPromedio !== undefined ? statsData.npsPromedio : undefined,
        npsPromoters: statsData.npsPromoters !== null && statsData.npsPromoters !== undefined ? statsData.npsPromoters : undefined,
        npsPassives: statsData.npsPassives !== null && statsData.npsPassives !== undefined ? statsData.npsPassives : undefined,
        npsDetractors: statsData.npsDetractors !== null && statsData.npsDetractors !== undefined ? statsData.npsDetractors : undefined,
        distribucion9Box: distribucion9Box as Record<string, number>,
        evaluacionesPorArea,
        evaluacionesPorNivel,
        tendenciaSemanal,
        autoevaluacionesJefesCompletadas,
        autoevaluacionesJefesEnProgreso,
        autoevaluacionesJefesPendientes,
        totalJefesConAutoevaluacion,
        autoevaluacionesColaboradoresCompletadas,
        autoevaluacionesColaboradoresEnProgreso,
        totalColaboradoresConAutoevaluacion,
      });

      console.log("✅ setStats ejecutado correctamente");

      // Cargar estadísticas de uso de OpenAI API desde Supabase
      const { data: openaiStatsData, error: openaiStatsError } = await supabase
        .rpc("get_openai_usage_stats", {
          periodo_id_param: currentPeriodId
        });

      if (openaiStatsError) {
        console.error("Error loading OpenAI usage stats:", openaiStatsError);
        // Fallback a localStorage si la función SQL falla
        setApiUsageStats(getAPIUsageStats());
      } else if (openaiStatsData) {
        console.log("OpenAI usage stats loaded:", openaiStatsData);
        setApiUsageStats({
          totalCalls: openaiStatsData.totalLlamadas || 0,
          totalTokens: openaiStatsData.totalTokens || 0,
          successfulCalls: openaiStatsData.llamadasExitosas || 0,
          failedCalls: openaiStatsData.llamadasFallidas || 0,
          lastCallDate: openaiStatsData.ultimaLlamada || undefined,
          costoEstimadoUSD: openaiStatsData.costoEstimadoUSD || 0,
          tasaExito: openaiStatsData.tasaExito || 0,
        });
      } else {
        // Si no hay datos, inicializar con ceros
        setApiUsageStats({
          totalCalls: 0,
          totalTokens: 0,
          successfulCalls: 0,
          failedCalls: 0,
          lastCallDate: undefined,
          costoEstimadoUSD: 0,
          tasaExito: 0,
        });
      }
    } catch (error: any) {
      console.error("Error loading stats:", error);
      toast.error("Error al cargar estadísticas");
      // Asegurar que stats tenga valores por defecto incluso si hay error
      if (!stats) {
        setStats({
          totalUsuarios: 0,
          totalJefes: 0,
          evaluacionesCompletadas: 0,
          evaluacionesPendientes: 0,
          evaluacionesEnProgreso: 0,
          porcentajeCompletitud: 0,
          promedioDesempeno: 0,
          promedioPotencial: 0,
          distribucion9Box: {},
          evaluacionesPorArea: [],
          evaluacionesPorNivel: [],
          tendenciaSemanal: [],
          autoevaluacionesJefesCompletadas: 0,
          autoevaluacionesJefesEnProgreso: 0,
          autoevaluacionesJefesPendientes: 0,
          totalJefesConAutoevaluacion: 0,
          autoevaluacionesColaboradoresCompletadas: 0,
          autoevaluacionesColaboradoresEnProgreso: 0,
          totalColaboradoresConAutoevaluacion: 0,
        });
      }
    } finally {
      setLoading(false);
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

      // Obtener NPS scores de autoevaluaciones
      const { data: npsData } = await supabase
        .from("evaluations")
        .select("nps_score")
        .eq("periodo_id", activePeriodId)
        .eq("tipo", "auto")
        .not("nps_score", "is", null);

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

      // Calcular estadísticas NPS
      let npsPromedio = 0;
      let npsPromoters = 0;
      let npsPassives = 0;
      let npsDetractors = 0;
      
      if (npsData && npsData.length > 0) {
        const scores = npsData.map(d => d.nps_score).filter(s => s !== null) as number[];
        npsPromedio = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        npsPromoters = scores.filter(s => s >= 9).length;
        npsPassives = scores.filter(s => s >= 7 && s < 9).length;
        npsDetractors = scores.filter(s => s < 7).length;
      }

      // Tendencia semanal REAL - obtener desde la base de datos
      const { data: tendenciaData, error: tendenciaError } = await supabase
        .rpc("get_tendencia_semanal", { periodo_id_param: activePeriodId });
      
      const tendenciaSemanal = (tendenciaData || []) as Array<{ semana: string; completadas: number }>;

      setStats({
        totalUsuarios: usuariosData?.length || 0,
        totalJefes: usuariosData?.filter(u => u.rol === "jefe").length || 0,
        evaluacionesCompletadas: completadas,
        evaluacionesPendientes: pendientes,
        evaluacionesEnProgreso: enProgreso,
        porcentajeCompletitud: totalEsperadas > 0 ? Math.round((completadas / totalEsperadas) * 100) : 0,
        promedioDesempeno,
        promedioPotencial,
        npsPromedio,
        npsPromoters,
        npsPassives,
        npsDetractors,
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
        ...(advancedStats?.multipleEvaluators ? [
          { label: "Colaboradores con Múltiples Evaluadores", value: advancedStats.multipleEvaluators.colaboradores_con_multiples || 0 },
          { label: "Promedio de Evaluadores por Colaborador", value: advancedStats.multipleEvaluators.promedio_evaluadores?.toFixed(1) || "0" },
        ] : []),
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
        ...(advancedStats?.multipleEvaluators?.distribucion ? [{
          title: "Distribución de Evaluadores",
          headers: ["Número de Evaluadores", "Cantidad de Colaboradores"],
          rows: advancedStats.multipleEvaluators.distribucion.map((item: any) => [
            item.evaluadores,
            item.colaboradores,
          ]),
        }] : []),
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
    console.log("⏳ Estado de carga:", { loading, stats: stats ? "existe" : "null" });
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

  console.log("✅ Renderizando dashboard con stats:", { 
    totalUsuarios: stats.totalUsuarios,
    evaluacionesCompletadas: stats.evaluacionesCompletadas 
  });

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

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              const periodo = activePeriodId || periodoId;
              navigate(`/admin/evaluaciones/completadas?periodo=${periodo}`);
            }}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Evaluaciones Completadas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-success">{stats.evaluacionesCompletadas}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.porcentajeCompletitud}% del total
              </p>
              <Progress value={stats.porcentajeCompletitud} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Click para ver detalles
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              const periodo = activePeriodId || periodoId;
              navigate(`/admin/evaluaciones/en-progreso?periodo=${periodo}`);
            }}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-info">{stats.evaluacionesEnProgreso}</p>
              <p className="text-xs text-muted-foreground mt-1">Requieren seguimiento</p>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Click para ver detalles
              </p>
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

          {stats.autoevaluacionesJefesCompletadas !== undefined && (
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                const periodo = activePeriodId || periodoId;
                navigate(`/admin/autoevaluaciones-jefes?periodo=${periodo}`);
              }}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Autoevaluaciones de Jefes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">
                  {stats.autoevaluacionesJefesCompletadas} / {stats.totalJefesConAutoevaluacion || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalJefesConAutoevaluacion && stats.totalJefesConAutoevaluacion > 0
                    ? Math.round((stats.autoevaluacionesJefesCompletadas / stats.totalJefesConAutoevaluacion) * 100)
                    : 0}% completadas
                </p>
                <Progress 
                  value={stats.totalJefesConAutoevaluacion && stats.totalJefesConAutoevaluacion > 0
                    ? (stats.autoevaluacionesJefesCompletadas / stats.totalJefesConAutoevaluacion) * 100
                    : 0} 
                  className="mt-2 h-2" 
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Click para ver detalles
                </p>
              </CardContent>
            </Card>
          )}

          {stats.autoevaluacionesJefesEnProgreso !== undefined && stats.autoevaluacionesJefesEnProgreso > 0 && (
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                const periodo = activePeriodId || periodoId;
                navigate(`/admin/autoevaluaciones-jefes?periodo=${periodo}&tab=en_progreso`);
              }}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Autoevaluaciones Jefes - En Progreso</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-info">{stats.autoevaluacionesJefesEnProgreso}</p>
                <p className="text-xs text-muted-foreground mt-1">Requieren seguimiento</p>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Click para ver detalles
                </p>
              </CardContent>
            </Card>
          )}

          {stats.autoevaluacionesJefesPendientes !== undefined && stats.autoevaluacionesJefesPendientes > 0 && (
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                const periodo = activePeriodId || periodoId;
                navigate(`/admin/autoevaluaciones-jefes?periodo=${periodo}&tab=pendientes`);
              }}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Autoevaluaciones Jefes - Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-warning">{stats.autoevaluacionesJefesPendientes}</p>
                <p className="text-xs text-muted-foreground mt-1">Sin iniciar</p>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Click para ver detalles
                </p>
              </CardContent>
            </Card>
          )}

          {stats.autoevaluacionesColaboradoresCompletadas !== undefined && (
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                const periodo = activePeriodId || periodoId;
                navigate(`/admin/autoevaluaciones-colaboradores?periodo=${periodo}&tab=completadas`);
              }}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Autoevaluaciones Colaboradores - Completadas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-success">{stats.autoevaluacionesColaboradoresCompletadas}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalColaboradoresConAutoevaluacion && stats.totalColaboradoresConAutoevaluacion > 0
                    ? Math.round((stats.autoevaluacionesColaboradoresCompletadas / stats.totalColaboradoresConAutoevaluacion) * 100)
                    : 0}% del total
                </p>
                <Progress 
                  value={stats.totalColaboradoresConAutoevaluacion && stats.totalColaboradoresConAutoevaluacion > 0
                    ? (stats.autoevaluacionesColaboradoresCompletadas / stats.totalColaboradoresConAutoevaluacion) * 100
                    : 0} 
                  className="mt-2 h-2" 
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Click para ver detalles
                </p>
              </CardContent>
            </Card>
          )}

          {stats.autoevaluacionesColaboradoresEnProgreso !== undefined && stats.autoevaluacionesColaboradoresEnProgreso > 0 && (
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                const periodo = activePeriodId || periodoId;
                navigate(`/admin/autoevaluaciones-colaboradores?periodo=${periodo}&tab=en_progreso`);
              }}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Autoevaluaciones Colaboradores - En Progreso</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-info">{stats.autoevaluacionesColaboradoresEnProgreso}</p>
                <p className="text-xs text-muted-foreground mt-1">Requieren seguimiento</p>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Click para ver detalles
                </p>
              </CardContent>
            </Card>
          )}

          {stats.reaperturas !== undefined && stats.reaperturas > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Reaperturas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-info">{stats.reaperturas}</p>
                <p className="text-xs text-muted-foreground mt-1">Este período</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Promedios y Distribución */}
        <div className="grid gap-6 mb-6 md:grid-cols-2 lg:grid-cols-4">
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

          {/* Net Promoter Score */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Net Promoter Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-success">
                {stats.npsPromedio ? stats.npsPromedio.toFixed(1) : "N/A"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Recomendación promedio (0-10)
              </p>
              {stats.npsPromoters !== undefined && (
                <div className="mt-4 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-success">Promotores (9-10):</span>
                    <span className="font-semibold">{stats.npsPromoters}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-warning">Pasivos (7-8):</span>
                    <span className="font-semibold">{stats.npsPassives}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-destructive">Detractores (0-6):</span>
                    <span className="font-semibold">{stats.npsDetractors}</span>
                  </div>
                </div>
              )}
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

          {/* Múltiples Evaluadores */}
          {advancedStats?.multipleEvaluators && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Múltiples Evaluadores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {advancedStats.multipleEvaluators.colaboradores_con_multiples || 0}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Colaboradores con múltiples evaluadores
                </p>
                {advancedStats.multipleEvaluators.promedio_evaluadores > 0 && (
                  <div className="mt-4 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Promedio de evaluadores:</span>
                      <span className="font-semibold">
                        {advancedStats.multipleEvaluators.promedio_evaluadores.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total evaluaciones:</span>
                      <span className="font-semibold">
                        {advancedStats.multipleEvaluators.total_evaluaciones || 0}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tarjeta de Uso de API de IA - Solo para Admin General */}
        {user?.rol === "admin_general" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-info" />
                Uso de API de OpenAI
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
                <p className="text-sm text-muted-foreground mb-1">Tokens Consumidos</p>
                <p className="text-2xl font-bold text-info">{(apiUsageStats.totalTokens || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ${(apiUsageStats.costoEstimadoUSD || 0).toFixed(4)} USD estimado
                </p>
              </div>
            </div>
            {apiUsageStats.totalCalls === 0 ? (
              <div className="mt-4 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>ℹ️ No hay registros de uso de API aún.</strong>
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Los datos aparecerán automáticamente cuando se generen planes de desarrollo usando la API de OpenAI.
                  Asegúrate de que la Edge Function <code className="bg-yellow-100 px-1 rounded">generate-development-plan</code> esté desplegada con el código actualizado.
                </p>
              </div>
            ) : (
              <>
                {apiUsageStats.lastCallDate && (
                  <div className="mt-4 p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      Última llamada: {new Date(apiUsageStats.lastCallDate).toLocaleString("es-GT", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                    {apiUsageStats.tasaExito > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Tasa de éxito: {apiUsageStats.tasaExito.toFixed(1)}%
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        )}

        {/* Gráficos Detallados */}
        <Tabs defaultValue="general" className="mb-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="antiguedad">Antigüedad</TabsTrigger>
            <TabsTrigger value="genero">Equidad</TabsTrigger>
            <TabsTrigger value="rotacion">Rotación</TabsTrigger>
            <TabsTrigger value="desarrollo">Desarrollo</TabsTrigger>
            <TabsTrigger value="ejecutivo">Ejecutivo</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
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
            <Card>
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
          </TabsContent>

          <TabsContent value="antiguedad" className="space-y-6">
            {/* Mensaje si no hay datos */}
            {!advancedStats && (
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Cargando métricas de antigüedad...
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Elegibilidad */}
            {advancedStats?.elegibilidad && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Elegibles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-success">{advancedStats.elegibilidad.elegibles}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {advancedStats.elegibilidad.porcentajeElegibles}% del total
                    </p>
                    <Progress value={advancedStats.elegibilidad.porcentajeElegibles} className="mt-2 h-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">No Elegibles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-warning">{advancedStats.elegibilidad.noElegibles}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Requieren datos o antigüedad
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Admin. Elegibles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-info">{advancedStats.elegibilidad.elegiblesAdministrativos}</p>
                    <p className="text-xs text-muted-foreground mt-1">≥3 meses</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Op. Elegibles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-info">{advancedStats.elegibilidad.elegiblesOperativos}</p>
                    <p className="text-xs text-muted-foreground mt-1">≥6 meses</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Mensaje si no hay distribución de antigüedad */}
            {advancedStats && !advancedStats.antiguedadDistribution && (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="pt-6">
                  <p className="text-center text-yellow-800">
                    ⚠️ No se encontraron datos de distribución de antigüedad. Verifica la consola para más detalles.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Distribución de Antigüedad */}
            {advancedStats?.antiguedadDistribution && (
              <Card>
                <CardHeader>
                  <CardTitle>Distribución de Antigüedad</CardTitle>
                  <CardDescription>
                    Colaboradores por rangos de tiempo en la organización
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { rango: "0-3 meses", cantidad: advancedStats.antiguedadDistribution.rango0_3 },
                      { rango: "3-6 meses", cantidad: advancedStats.antiguedadDistribution.rango3_6 },
                      { rango: "6-12 meses", cantidad: advancedStats.antiguedadDistribution.rango6_12 },
                      { rango: "1-3 años", cantidad: advancedStats.antiguedadDistribution.rango1_3 },
                      { rango: "3-5 años", cantidad: advancedStats.antiguedadDistribution.rango3_5 },
                      { rango: "5+ años", cantidad: advancedStats.antiguedadDistribution.rango5_plus },
                    ]}>
                      <XAxis dataKey="rango" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="cantidad" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Promedio de antigüedad:</strong> {Math.round(advancedStats.antiguedadDistribution.promedioMeses)} meses
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Antigüedad vs Desempeño */}
            {advancedStats?.antiguedadVsDesempeno && advancedStats.antiguedadVsDesempeno.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Correlación Antigüedad vs Desempeño</CardTitle>
                  <CardDescription>
                    Desempeño promedio por rango de antigüedad
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={advancedStats.antiguedadVsDesempeno}>
                      <XAxis dataKey="rangoAntiguedad" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="promedioDesempeno" stroke="#8884d8" strokeWidth={2} name="Desempeño %" />
                      <Line type="monotone" dataKey="promedioPotencial" stroke="#82ca9d" strokeWidth={2} name="Potencial %" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Tiempo Promedio por Área */}
            {advancedStats?.tiempoPromedioPorArea && (
              <Card>
                <CardHeader>
                  <CardTitle>Tiempo Promedio en el Puesto por Área</CardTitle>
                  <CardDescription>
                    Antigüedad promedio de colaboradores por área
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={advancedStats.tiempoPromedioPorArea.map(a => ({
                      area: a.area,
                      meses: Math.round(a.promedioMeses)
                    }))}>
                      <XAxis dataKey="area" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="meses" fill="#10b981" name="Meses promedio" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Estadísticas de Retención */}
            {advancedStats?.antiguedadCompleta?.retencion && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Tasa Retención General</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-primary">
                      {Math.round(advancedStats.antiguedadCompleta.retencion.tasaRetencionGeneral)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">≥12 meses</p>
                    <Progress value={advancedStats.antiguedadCompleta.retencion.tasaRetencionGeneral} className="mt-2 h-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Tasa Retención 3+ Años</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-success">
                      {Math.round(advancedStats.antiguedadCompleta.retencion.tasaRetencion3Anos)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">≥36 meses</p>
                    <Progress value={advancedStats.antiguedadCompleta.retencion.tasaRetencion3Anos} className="mt-2 h-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Nuevos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-info">
                      {advancedStats.antiguedadCompleta.retencion.colaboradoresNuevos}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">&lt;6 meses</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Estables</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-success">
                      {advancedStats.antiguedadCompleta.retencion.colaboradoresEstables}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">≥12 meses</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Veteranos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-accent">
                      {advancedStats.antiguedadCompleta.retencion.colaboradoresVeteranos}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">≥36 meses</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Distribución de Antigüedad por Área */}
            {advancedStats?.antiguedadCompleta?.distribucionPorArea && advancedStats.antiguedadCompleta.distribucionPorArea.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Distribución de Antigüedad por Área</CardTitle>
                  <CardDescription>
                    Análisis detallado de antigüedad por área organizacional
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Área</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Promedio (meses)</TableHead>
                        <TableHead>0-3m</TableHead>
                        <TableHead>3-6m</TableHead>
                        <TableHead>6-12m</TableHead>
                        <TableHead>1-3a</TableHead>
                        <TableHead>3-5a</TableHead>
                        <TableHead>5+a</TableHead>
                        <TableHead>Tasa Retención</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {advancedStats.antiguedadCompleta.distribucionPorArea.map((area: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{area.area}</TableCell>
                          <TableCell>{area.totalColaboradores}</TableCell>
                          <TableCell>{Math.round(area.promedioAntiguedad)}</TableCell>
                          <TableCell>{area.rango0_3}</TableCell>
                          <TableCell>{area.rango3_6}</TableCell>
                          <TableCell>{area.rango6_12}</TableCell>
                          <TableCell>{area.rango1_3}</TableCell>
                          <TableCell>{area.rango3_5}</TableCell>
                          <TableCell>{area.rango5_plus}</TableCell>
                          <TableCell>
                            <Badge variant={area.tasaRetencion >= 70 ? "default" : area.tasaRetencion >= 50 ? "secondary" : "destructive"}>
                              {area.tasaRetencion}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Distribución de Antigüedad por Nivel */}
            {advancedStats?.antiguedadCompleta?.distribucionPorNivel && advancedStats.antiguedadCompleta.distribucionPorNivel.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Distribución de Antigüedad por Nivel</CardTitle>
                  <CardDescription>
                    Análisis de antigüedad por nivel organizacional
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={advancedStats.antiguedadCompleta.distribucionPorNivel.map((nivel: any) => ({
                      nivel: nivel.nivel,
                      promedio: Math.round(nivel.promedioAntiguedad),
                      rango0_3: nivel.rango0_3,
                      rango3_6: nivel.rango3_6,
                      rango6_12: nivel.rango6_12,
                      rango1_3: nivel.rango1_3,
                      rango3_5: nivel.rango3_5,
                      rango5_plus: nivel.rango5_plus,
                    }))}>
                      <XAxis dataKey="nivel" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="rango0_3" stackId="a" fill="#ff6b6b" name="0-3 meses" />
                      <Bar dataKey="rango3_6" stackId="a" fill="#ffd93d" name="3-6 meses" />
                      <Bar dataKey="rango6_12" stackId="a" fill="#6bcf7f" name="6-12 meses" />
                      <Bar dataKey="rango1_3" stackId="a" fill="#4d96ff" name="1-3 años" />
                      <Bar dataKey="rango3_5" stackId="a" fill="#9b59b6" name="3-5 años" />
                      <Bar dataKey="rango5_plus" stackId="a" fill="#34495e" name="5+ años" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="genero" className="space-y-6">
            {/* Estadísticas por Género */}
            {advancedStats?.generoStats && advancedStats.generoStats.length > 0 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Distribución por Género</CardTitle>
                    <CardDescription>
                      Total de colaboradores por género
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={advancedStats.generoStats.map(g => ({
                        genero: g.genero === 'no_especificado' ? 'No especificado' : g.genero,
                        total: g.totalColaboradores,
                        completadas: g.evaluacionesCompletadas,
                      }))}>
                        <XAxis dataKey="genero" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="total" fill="#8884d8" name="Total" />
                        <Bar dataKey="completadas" fill="#10b981" name="Evaluadas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Desempeño Promedio por Género</CardTitle>
                    <CardDescription>
                      Comparación de desempeño y potencial por género
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={advancedStats.generoStats
                        .filter(g => g.promedioDesempeno != null)
                        .map(g => ({
                          genero: g.genero === 'no_especificado' ? 'No especificado' : g.genero,
                          desempeno: Math.round(g.promedioDesempeno || 0),
                          potencial: Math.round(g.promedioPotencial || 0),
                        }))}>
                        <XAxis dataKey="genero" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="desempeno" fill="#8884d8" name="Desempeño %" />
                        <Bar dataKey="potencial" fill="#82ca9d" name="Potencial %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Índices de Equidad */}
                {advancedStats?.equidadCompleta?.indicesEquidad && (
                  <div className="grid gap-6 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Índice de Paridad General</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-primary">
                          {Math.round(advancedStats.equidadCompleta.indicesEquidad.indiceParidadGeneral)}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Balance de género en la organización
                        </p>
                        <Progress value={advancedStats.equidadCompleta.indicesEquidad.indiceParidadGeneral} className="mt-2 h-2" />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Distribución General</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Masculino:</span>
                            <span className="font-semibold">
                              {advancedStats.equidadCompleta.indicesEquidad.distribucionGeneral.porcentajeMasculino}%
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Femenino:</span>
                            <span className="font-semibold">
                              {advancedStats.equidadCompleta.indicesEquidad.distribucionGeneral.porcentajeFemenino}%
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Brecha de Desempeño</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-warning">
                          {Math.abs(Math.round(advancedStats.equidadCompleta.brechasDesempeno?.brechaDesempeno || 0))}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {advancedStats.equidadCompleta.brechasDesempeno?.brechaDesempeno > 0 
                            ? 'A favor masculino' 
                            : advancedStats.equidadCompleta.brechasDesempeno?.brechaDesempeno < 0 
                            ? 'A favor femenino' 
                            : 'Equilibrado'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Liderazgo por Género */}
                {advancedStats?.equidadCompleta?.liderazgoPorGenero && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Liderazgo por Género</CardTitle>
                      <CardDescription>
                        Distribución de jefes y líderes por género
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-4 mb-4">
                        <div className="p-4 rounded-lg border">
                          <p className="text-sm text-muted-foreground mb-1">Total Jefes</p>
                          <p className="text-2xl font-bold">{advancedStats.equidadCompleta.liderazgoPorGenero.totalJefes}</p>
                        </div>
                        <div className="p-4 rounded-lg border">
                          <p className="text-sm text-muted-foreground mb-1">Masculino</p>
                          <p className="text-2xl font-bold text-primary">
                            {advancedStats.equidadCompleta.liderazgoPorGenero.jefesMasculino}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {advancedStats.equidadCompleta.liderazgoPorGenero.porcentajeJefesMasculino}%
                          </p>
                        </div>
                        <div className="p-4 rounded-lg border">
                          <p className="text-sm text-muted-foreground mb-1">Femenino</p>
                          <p className="text-2xl font-bold text-accent">
                            {advancedStats.equidadCompleta.liderazgoPorGenero.jefesFemenino}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {advancedStats.equidadCompleta.liderazgoPorGenero.porcentajeJefesFemenino}%
                          </p>
                        </div>
                        <div className="p-4 rounded-lg border">
                          <p className="text-sm text-muted-foreground mb-1">Índice Paridad Liderazgo</p>
                          <p className="text-2xl font-bold text-success">
                            {Math.round(advancedStats.equidadCompleta.liderazgoPorGenero.indiceParidadLiderazgo)}%
                          </p>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={[
                          {
                            categoria: 'Liderazgo',
                            masculino: advancedStats.equidadCompleta.liderazgoPorGenero.jefesMasculino,
                            femenino: advancedStats.equidadCompleta.liderazgoPorGenero.jefesFemenino,
                          }
                        ]}>
                          <XAxis dataKey="categoria" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="masculino" fill="#8884d8" name="Masculino" />
                          <Bar dataKey="femenino" fill="#82ca9d" name="Femenino" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Distribución por Género en Áreas */}
                {advancedStats?.equidadCompleta?.distribucionPorArea && advancedStats.equidadCompleta.distribucionPorArea.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Distribución por Género en Áreas</CardTitle>
                      <CardDescription>
                        Análisis de equidad de género por área organizacional
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Área</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Masculino</TableHead>
                            <TableHead>Femenino</TableHead>
                            <TableHead>% M</TableHead>
                            <TableHead>% F</TableHead>
                            <TableHead>Índice Paridad</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {advancedStats.equidadCompleta.distribucionPorArea.map((area: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{area.area}</TableCell>
                              <TableCell>{area.totalColaboradores}</TableCell>
                              <TableCell>{area.masculino}</TableCell>
                              <TableCell>{area.femenino}</TableCell>
                              <TableCell>{area.porcentajeMasculino}%</TableCell>
                              <TableCell>{area.porcentajeFemenino}%</TableCell>
                              <TableCell>
                                <Badge variant={area.indiceParidad >= 80 ? "default" : area.indiceParidad >= 60 ? "secondary" : "destructive"}>
                                  {area.indiceParidad}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Desempeño por Género y Área */}
                {advancedStats?.equidadCompleta?.desempenoPorGeneroArea && advancedStats.equidadCompleta.desempenoPorGeneroArea.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Desempeño por Género y Área</CardTitle>
                      <CardDescription>
                        Comparación de desempeño entre géneros por área
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart 
                          data={advancedStats.equidadCompleta.desempenoPorGeneroArea
                            .filter((d: any) => d.promedioDesempeno != null)
                            .reduce((acc: any[], item: any) => {
                              const existing = acc.find(a => a.area === item.area);
                              if (existing) {
                                existing[item.genero] = Math.round(item.promedioDesempeno || 0);
                              } else {
                                acc.push({
                                  area: item.area,
                                  [item.genero]: Math.round(item.promedioDesempeno || 0)
                                });
                              }
                              return acc;
                            }, [])}
                          layout="vertical"
                        >
                          <XAxis type="number" />
                          <YAxis dataKey="area" type="category" width={150} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="masculino" fill="#8884d8" name="Masculino" />
                          <Bar dataKey="femenino" fill="#82ca9d" name="Femenino" />
                          <Bar dataKey="otro" fill="#ffc658" name="Otro" />
                          <Bar dataKey="no_especificado" fill="#ff7300" name="No especificado" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="rotacion" className="space-y-6">
            {/* Rotación por Área */}
            {advancedStats?.rotacionStats && (
              <Card>
                <CardHeader>
                  <CardTitle>Estabilidad del Equipo por Área</CardTitle>
                  <CardDescription>
                    Análisis de rotación y estabilidad organizacional
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Área</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Antigüedad Promedio</TableHead>
                        <TableHead>Nuevos (&lt;6 meses)</TableHead>
                        <TableHead>Estables (≥1 año)</TableHead>
                        <TableHead>Veteranos (≥3 años)</TableHead>
                        <TableHead>Tasa Estabilidad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {advancedStats.rotacionStats.map((area: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{area.area}</TableCell>
                          <TableCell>{area.totalColaboradores}</TableCell>
                          <TableCell>{Math.round(area.promedioAntiguedad || 0)} meses</TableCell>
                          <TableCell>{area.colaboradoresNuevos}</TableCell>
                          <TableCell>{area.colaboradoresEstables}</TableCell>
                          <TableCell>{area.colaboradoresVeteranos}</TableCell>
                          <TableCell>
                            <Badge variant={area.tasaEstabilidad >= 70 ? "default" : area.tasaEstabilidad >= 50 ? "secondary" : "destructive"}>
                              {area.tasaEstabilidad}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="desarrollo" className="space-y-6">
            {/* Resumen de Progresión */}
            {desarrolloStats?.resumenProgresion && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Con Mejora</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-success">
                      {desarrolloStats.resumenProgresion.colaboradoresConMejora}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {desarrolloStats.resumenProgresion.totalColaboradoresComparados > 0
                        ? Math.round((desarrolloStats.resumenProgresion.colaboradoresConMejora / desarrolloStats.resumenProgresion.totalColaboradoresComparados) * 100)
                        : 0}% del total
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Sin Cambio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-muted-foreground">
                      {desarrolloStats.resumenProgresion.colaboradoresSinCambio}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Con Retroceso</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-destructive">
                      {desarrolloStats.resumenProgresion.colaboradoresConRetroceso}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Promedio Mejora</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-primary">
                      {desarrolloStats.resumenProgresion.promedioMejora 
                        ? Math.round(desarrolloStats.resumenProgresion.promedioMejora * 10) / 10
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {desarrolloStats.resumenProgresion.promedioTasaMejora 
                        ? `Tasa: ${Math.round(desarrolloStats.resumenProgresion.promedioTasaMejora * 10) / 10}%`
                        : 'Sin datos'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Top Mejoras */}
            {desarrolloStats?.topMejoras && desarrolloStats.topMejoras.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Mejoras de Desempeño</CardTitle>
                  <CardDescription>
                    Colaboradores con mayor mejora entre períodos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Área</TableHead>
                        <TableHead>Desempeño Anterior</TableHead>
                        <TableHead>Desempeño Actual</TableHead>
                        <TableHead>Mejora</TableHead>
                        <TableHead>Tasa Mejora</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {desarrolloStats.topMejoras.slice(0, 10).map((colaborador: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{colaborador.nombreCompleto}</TableCell>
                          <TableCell>{colaborador.area}</TableCell>
                          <TableCell>{Math.round(colaborador.desempenoAnterior)}%</TableCell>
                          <TableCell>{Math.round(colaborador.desempenoActual)}%</TableCell>
                          <TableCell>
                            <Badge variant="default" className="bg-success">
                              +{Math.round(colaborador.mejora)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {colaborador.tasaMejora ? `${Math.round(colaborador.tasaMejora)}%` : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Desarrollo por Área */}
            {desarrolloStats?.desarrolloPorArea && desarrolloStats.desarrolloPorArea.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Índice de Desarrollo por Área</CardTitle>
                  <CardDescription>
                    Métricas de desarrollo y potencial por área organizacional
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={desarrolloStats.desarrolloPorArea
                      .filter((a: any) => a.indiceDesarrollo != null)
                      .map((a: any) => ({
                        area: a.area,
                        indice: Math.round(a.indiceDesarrollo || 0),
                        desempeno: Math.round(a.promedioDesempeno || 0),
                        potencial: Math.round(a.promedioPotencial || 0),
                      }))}>
                      <XAxis dataKey="area" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="indice" fill="#8884d8" name="Índice Desarrollo" />
                      <Bar dataKey="desempeno" fill="#82ca9d" name="Desempeño %" />
                      <Bar dataKey="potencial" fill="#ffc658" name="Potencial %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="ejecutivo" className="space-y-6">
            {/* KPIs Estratégicos */}
            {executiveKPIs && (
              <>
                {/* Scorecards de KPIs */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Índice Completitud</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-primary">
                        {Math.round(executiveKPIs.indiceCompletitud)}%
                      </p>
                      <Badge 
                        variant={
                          executiveKPIs.scorecards?.completitud === 'excelente' ? 'default' :
                          executiveKPIs.scorecards?.completitud === 'bueno' ? 'secondary' :
                          executiveKPIs.scorecards?.completitud === 'regular' ? 'outline' : 'destructive'
                        }
                        className="mt-2"
                      >
                        {executiveKPIs.scorecards?.completitud === 'excelente' ? 'Excelente' :
                         executiveKPIs.scorecards?.completitud === 'bueno' ? 'Bueno' :
                         executiveKPIs.scorecards?.completitud === 'regular' ? 'Regular' : 'Bajo'}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-2">
                        {executiveKPIs.evaluacionesCompletadas} de {executiveKPIs.totalActivos} evaluaciones
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Índice Desempeño</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-success">
                        {Math.round(executiveKPIs.indiceDesempenoOrganizacional)}%
                      </p>
                      <Badge 
                        variant={
                          executiveKPIs.scorecards?.desempeno === 'excelente' ? 'default' :
                          executiveKPIs.scorecards?.desempeno === 'bueno' ? 'secondary' :
                          executiveKPIs.scorecards?.desempeno === 'regular' ? 'outline' : 'destructive'
                        }
                        className="mt-2"
                      >
                        {executiveKPIs.scorecards?.desempeno === 'excelente' ? 'Excelente' :
                         executiveKPIs.scorecards?.desempeno === 'bueno' ? 'Bueno' :
                         executiveKPIs.scorecards?.desempeno === 'regular' ? 'Regular' : 'Bajo'}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-2">
                        Desempeño organizacional promedio
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Índice Desarrollo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-info">
                        {Math.round(executiveKPIs.indiceDesarrolloTalento)}%
                      </p>
                      <Badge 
                        variant={
                          executiveKPIs.scorecards?.desarrollo === 'excelente' ? 'default' :
                          executiveKPIs.scorecards?.desarrollo === 'bueno' ? 'secondary' :
                          executiveKPIs.scorecards?.desarrollo === 'regular' ? 'outline' : 'destructive'
                        }
                        className="mt-2"
                      >
                        {executiveKPIs.scorecards?.desarrollo === 'excelente' ? 'Excelente' :
                         executiveKPIs.scorecards?.desarrollo === 'bueno' ? 'Bueno' :
                         executiveKPIs.scorecards?.desarrollo === 'regular' ? 'Regular' : 'Bajo'}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-2">
                        Desarrollo del talento
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Índice Estabilidad</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-accent">
                        {Math.round(executiveKPIs.indiceEstabilidadEquipo)}%
                      </p>
                      <Badge 
                        variant={
                          executiveKPIs.scorecards?.estabilidad === 'excelente' ? 'default' :
                          executiveKPIs.scorecards?.estabilidad === 'bueno' ? 'secondary' :
                          executiveKPIs.scorecards?.estabilidad === 'regular' ? 'outline' : 'destructive'
                        }
                        className="mt-2"
                      >
                        {executiveKPIs.scorecards?.estabilidad === 'excelente' ? 'Excelente' :
                         executiveKPIs.scorecards?.estabilidad === 'bueno' ? 'Bueno' :
                         executiveKPIs.scorecards?.estabilidad === 'regular' ? 'Regular' : 'Bajo'}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-2">
                        Estabilidad del equipo
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Métricas Adicionales */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Alto Potencial</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-success">
                        {executiveKPIs.colaboradoresAltoPotencial}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {executiveKPIs.tasaAltoPotencial}% del total evaluado
                      </p>
                      <Progress value={executiveKPIs.tasaAltoPotencial} className="mt-2 h-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">En Riesgo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-destructive">
                        {executiveKPIs.colaboradoresRiesgo}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {executiveKPIs.tasaRiesgo}% del total evaluado
                      </p>
                      <Progress value={executiveKPIs.tasaRiesgo} className="mt-2 h-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Elegibles</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-primary">
                        {executiveKPIs.totalElegibles}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {executiveKPIs.porcentajeElegibles}% del total activo
                      </p>
                      <Progress value={executiveKPIs.porcentajeElegibles} className="mt-2 h-2" />
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Resumen de Seguimiento */}
        {resumenSeguimiento && (
          <div className="grid gap-6 mb-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Jefes Completados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-success">{resumenSeguimiento.jefesCompletados}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  de {resumenSeguimiento.totalJefes} jefes
                </p>
                <Progress 
                  value={resumenSeguimiento.totalJefes > 0 ? (resumenSeguimiento.jefesCompletados / resumenSeguimiento.totalJefes) * 100 : 0} 
                  className="mt-2 h-2" 
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Jefes en Progreso</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-info">{resumenSeguimiento.jefesEnProgreso}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Requieren seguimiento
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Jefes Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-warning">{resumenSeguimiento.jefesPendientes}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sin iniciar evaluaciones
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Con Retraso</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-destructive">{resumenSeguimiento.jefesConRetraso}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  &gt;7 días sin actividad
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Lista de Pendientes */}
        <Card>
          <CardHeader>
            <CardTitle>Evaluaciones Requiriendo Seguimiento</CardTitle>
            <CardDescription>
              Jefes con evaluaciones pendientes o en progreso
            </CardDescription>
          </CardHeader>
          <CardContent>
            {seguimientoData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-success opacity-50" />
                <p>No hay jefes con evaluaciones pendientes</p>
                <p className="text-sm mt-2">Todas las evaluaciones están completadas</p>
              </div>
            ) : (
              <>
                {/* Gráfica de Barras */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Resumen por Jefe</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={seguimientoData.map(jefe => ({
                      nombre: jefe.jefeNombre.split(' ')[0], // Solo primer nombre
                      pendientes: jefe.evaluacionesPendientes,
                      completadas: jefe.evaluacionesCompletadas
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nombre" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="pendientes" fill="#f59e0b" name="Pendientes" />
                      <Bar dataKey="completadas" fill="#10b981" name="Completadas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Tabla Simplificada */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Detalle por Jefe</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jefe Evaluador</TableHead>
                        <TableHead className="text-center">Pendientes</TableHead>
                        <TableHead className="text-center">Completadas</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">% Completitud</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {seguimientoData.map((jefe: any) => {
                        const total = jefe.totalColaboradores || (jefe.evaluacionesPendientes + jefe.evaluacionesEnProgreso + jefe.evaluacionesCompletadas);
                        const porcentaje = total > 0 ? Math.round((jefe.evaluacionesCompletadas / total) * 100) : 0;
                        const todasCompletadas = jefe.evaluacionesCompletadas === total && total > 0;
                        
                        return (
                          <TableRow 
                            key={jefe.jefeId}
                            className={todasCompletadas ? "bg-green-50/50 dark:bg-green-950/20" : ""}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {todasCompletadas && (
                                  <CheckCircle2 className="h-4 w-4 text-success" />
                                )}
                                <div>
                                  <p>{jefe.jefeNombre}</p>
                                  <p className="text-xs text-muted-foreground">{jefe.jefeCargo} • {jefe.jefeArea}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-semibold text-warning text-lg">
                                {jefe.evaluacionesPendientes}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-semibold text-success text-lg">
                                {jefe.evaluacionesCompletadas}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-semibold text-primary">
                                {total}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={porcentaje === 100 ? "default" : porcentaje >= 50 ? "secondary" : "destructive"}>
                                {porcentaje}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const periodo = activePeriodId || periodoId;
                                    navigate(`/admin/evaluaciones/jefe/${jefe.jefeId}?periodo=${periodo}`);
                                  }}
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  Ver Detalles
                                </Button>
                                {jefe.jefeCorreo && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      window.location.href = `mailto:${jefe.jefeCorreo}?subject=Recordatorio: Evaluaciones Pendientes&body=Estimado/a ${jefe.jefeNombre},%0D%0A%0D%0ATiene ${jefe.evaluacionesPendientes} evaluaciones pendientes y ${jefe.evaluacionesEnProgreso} en progreso.%0D%0A%0D%0APor favor complete las evaluaciones pendientes.`;
                                      toast.info("Abriendo cliente de correo para enviar recordatorio");
                                    }}
                                  >
                                    <AlertCircle className="h-4 w-4 mr-1" />
                                    Recordatorio
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DashboardRRHH;

