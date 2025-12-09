import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, FileText, User, CheckCircle2, Clock, AlertCircle, Sparkles, FileDown, Loader2, Download, XCircle, Wand2, Brain, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { calculatePerformanceScore, calculateDimensionAverage, calculateDimensionPercentage, scoreToPercentage } from "@/lib/calculations";
import { getInstrumentForUser } from "@/lib/instruments";
import { getInstrumentCalculationConfig } from "@/lib/instrumentCalculations";
import { getConsolidatedResult } from "@/lib/finalResultSupabase";
import { exportEvaluacionCompletaPDFReact, exportMultiplePDFsToZip, ColaboradorExportData, getDirectoraRRHHNombre, exportTeamAnalysisPDF } from "@/lib/exports";
import { getEquipoDirectoCompleto, getEquipoCascadaCompleto } from "@/lib/teamAnalysis";
import type { TeamAnalysisStats, TeamMember9Box, TeamAIAnalysisResponse, JefeParaFiltro } from "@/types/teamAnalysis";
import { Progress } from "@/components/ui/progress";
import { Package } from "lucide-react";

const VistaDetalleJefe = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const periodoId = searchParams.get("periodo") || "";

  const [jefe, setJefe] = useState<any>(null);
  const [evaluaciones, setEvaluaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEsperadas, setTotalEsperadas] = useState(0);
  const [planesDesarrollo, setPlanesDesarrollo] = useState<Map<string, any>>(new Map());
  const [generandoPlanes, setGenerandoPlanes] = useState<Set<string>>(new Set());
  const [datosExportacionPDF, setDatosExportacionPDF] = useState<Map<string, any>>(new Map());
  const [exportandoTodos, setExportandoTodos] = useState(false);
  const [progresoExportacion, setProgresoExportacion] = useState({ current: 0, total: 0, nombre: "" });
  const [generandoPlanesMasivo, setGenerandoPlanesMasivo] = useState(false);
  const [progresoPlanes, setProgresoPlanes] = useState({ current: 0, total: 0, nombre: "", exitosos: 0, errores: 0, tiempoRestante: "" });
  const [nombreDirectoraRRHH, setNombreDirectoraRRHH] = useState<string | null>(null);
  const cancelarGeneracionRef = useRef(false);

  // Estados para análisis IA de equipo/unidad
  const [analisisEquipoExiste, setAnalisisEquipoExiste] = useState(false);
  const [analisisUnidadExiste, setAnalisisUnidadExiste] = useState(false);
  const [generandoAnalisisEquipo, setGenerandoAnalisisEquipo] = useState(false);
  const [generandoAnalisisUnidad, setGenerandoAnalisisUnidad] = useState(false);

  // Estados para exportación PDF de análisis
  const [exportandoPDFEquipo, setExportandoPDFEquipo] = useState(false);
  const [exportandoPDFUnidad, setExportandoPDFUnidad] = useState(false);

  // Cargar total de asignaciones esperadas
  useEffect(() => {
    const loadTotalEsperadas = async () => {
      if (!id) return;

      const { count } = await supabase
        .from("user_assignments")
        .select("*", { count: "exact", head: true })
        .eq("jefe_id", id)
        .eq("activo", true);

      setTotalEsperadas(count || 0);
    };

    loadTotalEsperadas();
  }, [id]);

  useEffect(() => {
    if (!id) {
      navigate("/admin/dashboard");
      return;
    }

    // Verificar que el usuario tenga permisos (admin o rrhh)
    if (user?.rol !== "admin_general" && user?.rol !== "admin_rrhh") {
      toast.error("No tienes permisos para ver esta información");
      navigate("/admin/dashboard");
      return;
    }

    loadData();
    // Cargar nombre de la directora de RRHH
    getDirectoraRRHHNombre().then(nombre => {
      setNombreDirectoraRRHH(nombre);
    });
    // Verificar si ya existen análisis IA de equipo/unidad
    checkExistingAnalysis();
  }, [id, periodoId, user]);

  // Verificar si ya existen análisis IA guardados
  const checkExistingAnalysis = async () => {
    if (!id || !periodoId) return;

    try {
      const { data } = await supabase
        .from("team_analysis")
        .select("tipo")
        .eq("jefe_dpi", id)
        .eq("periodo_id", periodoId);

      if (data) {
        setAnalisisEquipoExiste(data.some(d => d.tipo === 'directo'));
        setAnalisisUnidadExiste(data.some(d => d.tipo === 'cascada'));
      }
    } catch (error) {
      console.error("Error verificando análisis existentes:", error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar información del jefe
      const { data: jefeData, error: jefeError } = await supabase
        .from("users")
        .select("*")
        .eq("dpi", id)
        .single();

      if (jefeError) throw jefeError;
      setJefe(jefeData);

      // Cargar todas las asignaciones activas del jefe
      const periodoFinal = periodoId || (await getActivePeriodId());
      
      if (periodoFinal && id) {
        // 1. Obtener todas las asignaciones activas del jefe
        const { data: asignacionesData, error: asignacionesError } = await supabase
          .from("user_assignments")
          .select(`
            colaborador_id,
            colaborador:users!user_assignments_colaborador_id_fkey(
              dpi,
              nombre,
              apellidos,
              cargo,
              area,
              nivel
            )
          `)
          .eq("jefe_id", id)
          .eq("activo", true);

        if (asignacionesError) throw asignacionesError;

        if (!asignacionesData || asignacionesData.length === 0) {
          setEvaluaciones([]);
          return;
        }

        // 2. Obtener todas las evaluaciones existentes del jefe para este período
        const colaboradoresIds = asignacionesData.map(a => a.colaborador_id).filter(Boolean);
        
        const { data: evaluacionesData, error: evalError } = await supabase
          .from("evaluations")
          .select("*")
          .eq("evaluador_id", id)
          .eq("periodo_id", periodoFinal)
          .eq("tipo", "jefe")
          .in("colaborador_id", colaboradoresIds);

        if (evalError) throw evalError;

        // 3. Crear mapa de evaluaciones por colaborador_id
        const evaluacionesMap = new Map();
        evaluacionesData?.forEach(evaluacion => {
          evaluacionesMap.set(evaluacion.colaborador_id, evaluacion);
        });

        // 4. Combinar asignaciones con evaluaciones (o crear entrada pendiente si no existe)
        const evaluacionesCompletas = asignacionesData.map(asignacion => {
          const colaborador = asignacion.colaborador;
          const evaluacion = evaluacionesMap.get(asignacion.colaborador_id);

          if (evaluacion) {
            // Ya existe evaluación
            return {
              ...evaluacion,
              colaborador: colaborador
            };
          } else {
            // Pendiente - no hay evaluación aún
            return {
              id: null,
              colaborador_id: asignacion.colaborador_id,
              evaluador_id: id,
              periodo_id: periodoFinal,
              tipo: "jefe",
              estado: "pendiente",
              progreso: 0,
              responses: {},
              comments: {},
              created_at: null,
              updated_at: null,
              colaborador: colaborador
            };
          }
        });

        // 5. Cargar planes de desarrollo para cada colaborador
        const planesMap = new Map<string, any>();
        if (colaboradoresIds.length > 0) {
          const { data: planesData, error: planesError } = await supabase
            .from("development_plans")
            .select("*")
            .eq("periodo_id", periodoFinal)
            .in("colaborador_id", colaboradoresIds)
            .order("created_at", { ascending: false });

          if (!planesError && planesData) {
            // Agrupar por colaborador_id y tomar el más reciente de cada uno
            planesData.forEach((plan) => {
              if (!planesMap.has(plan.colaborador_id)) {
                planesMap.set(plan.colaborador_id, plan);
              }
            });
          }
        }
        setPlanesDesarrollo(planesMap);

        // 6. Ordenar: pendientes primero, luego en progreso, luego completadas
        evaluacionesCompletas.sort((a, b) => {
          const order = { pendiente: 1, borrador: 2, enviado: 3 };
          const aOrder = order[a.estado as keyof typeof order] || 4;
          const bOrder = order[b.estado as keyof typeof order] || 4;
          
          if (aOrder !== bOrder) {
            return aOrder - bOrder;
          }
          
          // Si mismo estado, ordenar por fecha de actualización (más reciente primero)
          const aDate = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const bDate = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return bDate - aDate;
        });

        setEvaluaciones(evaluacionesCompletas);
      }
    } catch (error: any) {
      console.error("Error cargando datos:", error);
      toast.error("Error al cargar información del jefe");
    } finally {
      setLoading(false);
    }
  };

  const getActivePeriodId = async () => {
    const { data } = await supabase
      .from("evaluation_periods")
      .select("id")
      .eq("activo", true)
      .single();
    return data?.id || "";
  };

  // Helper para calcular respuestas consolidadas
  const calculateConsolidatedResponses = (
    autoResponses: Record<string, number>,
    jefeResponses: Record<string, number>,
    instrumentId?: string
  ): Record<string, number> => {
    const consolidated: Record<string, number> = {};
    
    // Obtener pesos del instrumento (por defecto 70/30)
    let pesoJefe = 0.7;
    let pesoAuto = 0.3;
    
    if (instrumentId) {
      try {
        const instrumentConfig = getInstrumentCalculationConfig(instrumentId);
        if (instrumentConfig?.pesoJefe !== undefined && instrumentConfig?.pesoAuto !== undefined) {
          pesoJefe = instrumentConfig.pesoJefe;
          pesoAuto = instrumentConfig.pesoAuto;
        }
      } catch (error) {
        console.warn(`⚠️ No se pudo obtener configuración del instrumento ${instrumentId}, usando pesos por defecto 70/30`);
      }
    }
    
    const allItemIds = new Set([
      ...Object.keys(autoResponses),
      ...Object.keys(jefeResponses)
    ]);
    
    allItemIds.forEach((itemId) => {
      const autoValue = autoResponses[itemId] || 0;
      const jefeValue = jefeResponses[itemId] || 0;
      
      if (autoResponses[itemId] !== undefined && jefeResponses[itemId] !== undefined) {
        // Aplicar pesos dinámicos
        consolidated[itemId] = Math.round((jefeValue * pesoJefe + autoValue * pesoAuto) * 100) / 100;
      } else if (autoResponses[itemId] !== undefined) {
        consolidated[itemId] = autoValue;
      } else if (jefeResponses[itemId] !== undefined) {
        consolidated[itemId] = jefeValue;
      }
    });
    
    return consolidated;
  };

  // Helper para obtener título amigable de dimensión
  const getDimensionFriendlyTitle = (dimension: any): string => {
    const nombre = dimension.nombre.toLowerCase();
    
    // Casos específicos
    if (nombre.includes("servicio institucional") && nombre.includes("transparencia")) return "Servicio y Transparencia";
    if (nombre.includes("liderazgo estratégico")) return "Liderazgo Estratégico";
    if (nombre.includes("gestión") && nombre.includes("toma de decisiones")) return "Gestión y Decisiones";
    if (nombre.includes("desarrollo") && nombre.includes("aprendizaje")) return "Desarrollo y Aprendizaje";
    if (nombre.includes("visión institucional")) return "Visión Institucional";
    
    // Casos generales
    if (nombre.includes("competencias laborales") && nombre.includes("técnica")) return "Competencias Laborales";
    if (nombre.includes("comportamiento") && nombre.includes("organizacional")) return "Comportamiento Organizacional";
    if (nombre.includes("relaciones interpersonales") || nombre.includes("trabajo en equipo")) return "Relaciones Interpersonales";
    if (nombre.includes("orientación al servicio") || nombre.includes("atención al usuario")) return "Orientación al Servicio";
    if (nombre.includes("calidad del trabajo") || nombre.includes("calidad")) return "Calidad";
    if (nombre.includes("productividad") || nombre.includes("cumplimiento")) return "Productividad";
    if (nombre.includes("liderazgo") || nombre.includes("dirección")) return "Liderazgo";
    if (nombre.includes("ciudadan") || nombre.includes("servicio")) return "Servicio al Ciudadano";
    if (nombre.includes("gestión") && nombre.includes("resultado")) return "Gestión de Resultados";
    if (nombre.includes("transparencia") || nombre.includes("ética")) return "Ética y Transparencia";
    
    return dimension.nombre.length > 40 ? dimension.nombre.substring(0, 40) + "..." : dimension.nombre;
  };

  // Función para validar que existan ambas evaluaciones antes de generar plan
  const validarEvaluacionesParaPlan = async (colaboradorId: string, periodoId: string): Promise<boolean> => {
    try {
      // Verificar autoevaluación
      const { data: autoevaluacion, error: autoError } = await supabase
        .from("evaluations")
        .select("id")
        .eq("usuario_id", colaboradorId)
        .eq("periodo_id", periodoId)
        .eq("tipo", "auto")
        .eq("estado", "enviado")
        .single();

      if (autoError || !autoevaluacion) {
        toast.error("El colaborador debe tener su autoevaluación completada");
        return false;
      }

      // Verificar evaluación del jefe
      const { data: evaluacionJefe, error: jefeError } = await supabase
        .from("evaluations")
        .select("id")
        .eq("colaborador_id", colaboradorId)
        .eq("periodo_id", periodoId)
        .eq("tipo", "jefe")
        .eq("estado", "enviado")
        .single();

      if (jefeError || !evaluacionJefe) {
        toast.error("Debe completar la evaluación del colaborador primero");
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error validando evaluaciones:", error);
      return false;
    }
  };

  // Función para generar plan de desarrollo
  const generarPlanDesarrollo = async (colaboradorId: string, colaboradorNombre: string) => {
    const periodoFinal = periodoId || (await getActivePeriodId());
    if (!periodoFinal) {
      toast.error("No hay período activo");
      return;
    }

    // Validar evaluaciones
    const puedeGenerar = await validarEvaluacionesParaPlan(colaboradorId, periodoFinal);
    if (!puedeGenerar) {
      return;
    }

    // Marcar como generando
    setGenerandoPlanes(prev => new Set(prev).add(colaboradorId));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://oxadpbdlpvwyapuondei.supabase.co";
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94YWRwYmRscHZ3eWFwdW9uZGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMjU5MzcsImV4cCI6MjA3NzkwMTkzN30.HjIoMaw20qx7DscE-XWCaz88EWa0Jv_aCDcMtv6eadw";
      
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-development-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          colaborador_id: colaboradorId,
          periodo_id: periodoFinal,
        }),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData?.success) {
        throw new Error(responseData?.error || "Error generando plan");
      }

      toast.success(`Plan de desarrollo generado para ${colaboradorNombre}`);
      
      // Recargar datos para actualizar el indicador
      await loadData();
    } catch (error: any) {
      console.error("Error generando plan:", error);
      toast.error(`Error al generar plan: ${error?.message || "Error desconocido"}`);
    } finally {
      setGenerandoPlanes(prev => {
        const newSet = new Set(prev);
        newSet.delete(colaboradorId);
        return newSet;
      });
    }
  };

  // Función para generar análisis IA de equipo o unidad
  const generarAnalisisIA = async (tipo: 'directo' | 'cascada') => {
    const setGenerando = tipo === 'directo' ? setGenerandoAnalisisEquipo : setGenerandoAnalisisUnidad;
    const setExiste = tipo === 'directo' ? setAnalisisEquipoExiste : setAnalisisUnidadExiste;
    const label = tipo === 'directo' ? 'equipo' : 'unidad';

    setGenerando(true);

    try {
      toast.loading(`Generando análisis de ${label}...`, { id: `analisis-${tipo}` });

      const { data, error } = await supabase.functions.invoke('generate-team-analysis', {
        body: { jefeDpi: id, periodoId, tipo }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Error desconocido');

      // Guardar el análisis en la base de datos
      const { error: saveError } = await supabase
        .from("team_analysis")
        .upsert(
          {
            jefe_dpi: id,
            periodo_id: periodoId,
            tipo: tipo,
            analysis: data.analysis,
            fecha_generacion: new Date().toISOString(),
          },
          {
            onConflict: "jefe_dpi,periodo_id,tipo",
          }
        );

      if (saveError) {
        console.error(`Error guardando análisis ${tipo}:`, saveError);
        console.error(`Detalles del error:`, {
          code: saveError.code,
          message: saveError.message,
          details: saveError.details,
          hint: saveError.hint
        });
        toast.error(`Análisis generado pero no se pudo guardar en la base de datos: ${saveError.message}`, { 
          id: `analisis-${tipo}`,
          duration: 5000 
        });
      } else {
        // Actualizar estado y verificar desde la base de datos
        setExiste(true);
        // Verificar nuevamente desde la BD para asegurar sincronización
        await checkExistingAnalysis();
        console.log(`✅ Análisis ${tipo} guardado exitosamente para jefe ${id}, período ${periodoId}`);
        toast.success(`Análisis de ${label} generado y guardado correctamente`, { id: `analisis-${tipo}` });
      }

    } catch (err: any) {
      console.error(`Error generando análisis ${tipo}:`, err);
      toast.error(`Error: ${err.message || 'No se pudo generar el análisis'}`, { id: `analisis-${tipo}` });
    } finally {
      setGenerando(false);
    }
  };

  // Función para exportar PDF de análisis de equipo o unidad
  const exportarAnalisisPDF = async (tipo: 'equipo' | 'unidad') => {
    const setExportando = tipo === 'equipo' ? setExportandoPDFEquipo : setExportandoPDFUnidad;
    const tipoAnalisis = tipo === 'equipo' ? 'directo' : 'cascada';

    setExportando(true);

    try {
      toast.loading(`Preparando exportación de ${tipo}...`, { id: `export-${tipo}` });

      // Obtener datos del equipo/unidad
      const getData = tipo === 'equipo' ? getEquipoDirectoCompleto : getEquipoCascadaCompleto;
      const data = await getData(id!, periodoId);

      if (!data || data.colaboradores.length === 0) {
        throw new Error('No hay datos disponibles para exportar');
      }

      // Obtener análisis IA si existe
      const { data: analysisData } = await supabase
        .from("team_analysis")
        .select("analysis")
        .eq("jefe_dpi", id)
        .eq("periodo_id", periodoId)
        .eq("tipo", tipoAnalisis)
        .maybeSingle();

      let aiAnalysis: TeamAIAnalysisResponse | null = null;
      if (analysisData?.analysis) {
        try {
          aiAnalysis = typeof analysisData.analysis === 'string'
            ? JSON.parse(analysisData.analysis)
            : analysisData.analysis as TeamAIAnalysisResponse;
        } catch (e) {
          console.warn('Error parsing AI analysis:', e);
        }
      }

      // Preparar stats
      const stats: TeamAnalysisStats = {
        ...data.estadisticas,
        eNPS: data.eNPS?.valor ?? undefined,
        eNPSPromoters: data.eNPS?.promoters,
        eNPSPassives: data.eNPS?.passives,
        eNPSDetractors: data.eNPS?.detractors,
        eNPSTotalRespuestas: data.eNPS?.totalRespuestas,
      };

      // Convertir colaboradores al formato 9-Box
      const colaboradores: TeamMember9Box[] = data.colaboradores
        .filter((c: any) => c.tieneEvaluacion && c.posicion9Box)
        .map((c: any) => ({
          dpi: c.dpi,
          nombre: c.nombreCompleto || '',
          nombreCompleto: c.nombreCompleto || '',
          cargo: c.cargo || '',
          area: c.area || '',
          nivel: c.nivel || '',
          desempenoFinal: c.desempenoPorcentaje || 0,
          potencial: c.potencialPorcentaje || 0,
          desempenoPorcentaje: c.desempenoPorcentaje || 0,
          potencialPorcentaje: c.potencialPorcentaje || 0,
          posicion9Box: c.posicion9Box!,
          jefeDpi: c.jefeDpi || id!,
          jefeNombre: c.jefeNombre || '',
        }));

      // Obtener nombre del periodo
      const { data: periodoData } = await supabase
        .from("evaluation_periods")
        .select("nombre")
        .eq("id", periodoId)
        .single();

      // Preparar jefes subordinados (solo para unidad)
      let jefesSubordinados: JefeParaFiltro[] | undefined;
      if (tipo === 'unidad' && data.jefesSubordinados) {
        jefesSubordinados = data.jefesSubordinados;
      }

      // Exportar PDF
      await exportTeamAnalysisPDF(
        tipo,
        {
          nombre: jefe?.nombre && jefe?.apellidos ? `${jefe.nombre} ${jefe.apellidos}` : jefe?.nombre || '',
          cargo: jefe?.cargo || '',
          area: jefe?.area || '',
          dpi: id!
        },
        { id: periodoId, nombre: periodoData?.nombre || periodoId },
        stats,
        colaboradores,
        aiAnalysis,
        jefesSubordinados
      );

      toast.success(`PDF de análisis de ${tipo} exportado`, { id: `export-${tipo}` });

    } catch (err: any) {
      console.error(`Error exportando PDF ${tipo}:`, err);
      toast.error(`Error: ${err.message || 'No se pudo exportar el PDF'}`, { id: `export-${tipo}` });
    } finally {
      setExportando(false);
    }
  };

  // Función para generar todos los planes de desarrollo masivamente
  const generarTodosLosPlanes = async (soloSinPlan: boolean = true) => {
    const periodoFinal = periodoId || (await getActivePeriodId());
    if (!periodoFinal) {
      toast.error("No hay período activo");
      return;
    }

    // Filtrar evaluaciones completadas
    const evaluacionesCompletadas = evaluaciones.filter(e => e.estado === "enviado");

    // Filtrar según si solo queremos los que no tienen plan
    const evaluacionesParaProcesar = soloSinPlan
      ? evaluacionesCompletadas.filter(e => !planesDesarrollo.has(e.colaborador_id))
      : evaluacionesCompletadas;

    if (evaluacionesParaProcesar.length === 0) {
      toast.info(soloSinPlan
        ? "Todos los colaboradores ya tienen plan de desarrollo generado"
        : "No hay evaluaciones completadas para generar planes"
      );
      return;
    }

    // Confirmar acción
    const tiempoEstimado = Math.ceil((evaluacionesParaProcesar.length * 40) / 60);
    const confirmado = window.confirm(
      `Se generarán ${evaluacionesParaProcesar.length} planes de desarrollo.\n\n` +
      `Tiempo estimado: ${tiempoEstimado} minutos aproximadamente.\n\n` +
      `Durante este proceso:\n` +
      `• No cierre esta ventana\n` +
      `• Puede cancelar en cualquier momento\n\n` +
      `¿Desea continuar?`
    );

    if (!confirmado) return;

    setGenerandoPlanesMasivo(true);
    cancelarGeneracionRef.current = false;
    setProgresoPlanes({
      current: 0,
      total: evaluacionesParaProcesar.length,
      nombre: "",
      exitosos: 0,
      errores: 0,
      tiempoRestante: `~${tiempoEstimado} min`
    });

    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://oxadpbdlpvwyapuondei.supabase.co";
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94YWRwYmRscHZ3eWFwdW9uZGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMjU5MzcsImV4cCI6MjA3NzkwMTkzN30.HjIoMaw20qx7DscE-XWCaz88EWa0Jv_aCDcMtv6eadw";

    let exitosos = 0;
    let errores = 0;
    const erroresDetalle: string[] = [];
    const tiempoInicio = Date.now();

    try {
      for (let i = 0; i < evaluacionesParaProcesar.length; i++) {
        // Verificar si se canceló
        if (cancelarGeneracionRef.current) {
          toast.info(`Generación cancelada. ${exitosos} planes generados, ${errores} errores.`);
          break;
        }

        const evaluacion = evaluacionesParaProcesar[i];
        const colaborador = evaluacion.colaborador;
        const nombreCompleto = `${colaborador?.nombre || ""} ${colaborador?.apellidos || ""}`.trim();

        // Calcular tiempo restante
        const tiempoTranscurrido = (Date.now() - tiempoInicio) / 1000;
        const tiempoPorPlan = i > 0 ? tiempoTranscurrido / i : 40;
        const planesRestantes = evaluacionesParaProcesar.length - i;
        const segundosRestantes = Math.ceil(tiempoPorPlan * planesRestantes);
        const minutosRestantes = Math.floor(segundosRestantes / 60);
        const segsRestantes = segundosRestantes % 60;
        const tiempoRestante = minutosRestantes > 0
          ? `~${minutosRestantes}m ${segsRestantes}s`
          : `~${segsRestantes}s`;

        setProgresoPlanes({
          current: i + 1,
          total: evaluacionesParaProcesar.length,
          nombre: nombreCompleto,
          exitosos,
          errores,
          tiempoRestante
        });

        try {
          // Validar que tenga ambas evaluaciones
          const tieneAuto = await supabase
            .from("evaluations")
            .select("id")
            .eq("usuario_id", evaluacion.colaborador_id)
            .eq("periodo_id", periodoFinal)
            .eq("tipo", "auto")
            .eq("estado", "enviado")
            .single();

          if (!tieneAuto.data) {
            errores++;
            erroresDetalle.push(`${nombreCompleto}: Falta autoevaluación`);
            continue;
          }

          // Llamar a la API para generar el plan
          const response = await fetch(`${supabaseUrl}/functions/v1/generate-development-plan`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token || supabaseKey}`,
              'apikey': supabaseKey,
            },
            body: JSON.stringify({
              colaborador_id: evaluacion.colaborador_id,
              periodo_id: periodoFinal,
            }),
          });

          const responseData = await response.json();

          if (!response.ok || !responseData?.success) {
            throw new Error(responseData?.error || "Error generando plan");
          }

          exitosos++;
          console.log(`✅ Plan generado para ${nombreCompleto} (${i + 1}/${evaluacionesParaProcesar.length})`);

        } catch (error: any) {
          errores++;
          erroresDetalle.push(`${nombreCompleto}: ${error?.message || "Error desconocido"}`);
          console.error(`❌ Error generando plan para ${nombreCompleto}:`, error);
        }

        // Pequeña pausa entre cada generación para no saturar la API
        // Solo pausar si no es el último
        if (i < evaluacionesParaProcesar.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos de pausa
        }
      }

      // Mostrar resultado final
      if (erroresDetalle.length > 0) {
        console.warn("⚠️ Errores durante la generación de planes:", erroresDetalle);
      }

      if (exitosos > 0) {
        toast.success(
          `Generación completada: ${exitosos} planes generados${errores > 0 ? `, ${errores} errores` : ""}`
        );
      } else if (errores > 0) {
        toast.error(`No se pudo generar ningún plan. ${errores} errores.`);
      }

      // Recargar datos para actualizar los indicadores
      await loadData();

    } catch (error: any) {
      console.error("Error en generación masiva de planes:", error);
      toast.error(`Error en generación masiva: ${error?.message || "Error desconocido"}`);
    } finally {
      setGenerandoPlanesMasivo(false);
      cancelarGeneracionRef.current = false;
      setProgresoPlanes({ current: 0, total: 0, nombre: "", exitosos: 0, errores: 0, tiempoRestante: "" });
    }
  };

  // Función para preparar datos para PDF
  const prepararDatosParaPDF = async (colaborador: any, evaluacionJefe: any) => {
    try {
      // Obtener autoevaluación
      const periodoFinal = periodoId || (await getActivePeriodId());
      const { data: autoevaluacion, error: autoError } = await supabase
        .from("evaluations")
        .select("*")
        .eq("usuario_id", colaborador.dpi)
        .eq("periodo_id", periodoFinal)
        .eq("tipo", "auto")
        .eq("estado", "enviado")
        .single();

      if (autoError || !autoevaluacion) {
        throw new Error("Autoevaluación no encontrada");
      }

      // Obtener instrumento
      const nivelColaborador = colaborador.nivel || colaborador.colaborador?.nivel || "";
      const instrument = await getInstrumentForUser(nivelColaborador);
      if (!instrument) {
        throw new Error("Instrumento no encontrado");
      }

      // USAR DATOS DEL BACKEND en lugar de calcular en el frontend
      const { getFinalResultFromSupabase } = await import("@/lib/finalResultSupabase");
      const resultadoFinal = await getFinalResultFromSupabase(colaborador.dpi, periodoFinal);
      
      let performancePercentage = 0;
      let radarDataPDF: Array<{
        dimension: string;
        nombreCompleto: string;
        numero: number;
        tuEvaluacion: number;
        puntaje: number;
        dimensionData: any;
      }> = [];

      if (resultadoFinal && resultadoFinal.dimensiones) {
        // USAR DATOS DEL BACKEND: porcentajes por dimensión ya calculados
        performancePercentage = scoreToPercentage(resultadoFinal.desempenoFinal);
        
        const titulosGenerados: string[] = [];
        radarDataPDF = instrument.dimensionesDesempeno.map((dim, idx) => {
          // Obtener porcentaje del BACKEND
          const dimensionBackend = resultadoFinal.dimensiones?.find((d: any) => d.id === dim.id);
          const porcentaje = dimensionBackend?.porcentaje ?? 0;
          const promedio = dimensionBackend?.promedio ?? 0;
          
          let dimensionTitle = getDimensionFriendlyTitle(dim);
          if (titulosGenerados.includes(dimensionTitle)) {
            dimensionTitle = dim.nombre.length <= 30 
              ? dim.nombre 
              : `${dimensionTitle} (${idx + 1})`;
          }
          titulosGenerados.push(dimensionTitle);
          
          return {
            dimension: dimensionTitle,
            nombreCompleto: dim.nombre,
            numero: idx + 1,
            tuEvaluacion: porcentaje,
            puntaje: promedio,
            dimensionData: dim
          };
        });
        
        console.log('✅ [VistaDetalleJefe] Usando datos del BACKEND para PDF:', radarDataPDF);
      } else {
        // FALLBACK: calcular desde respuestas si no hay resultado del backend
        console.warn('⚠️ [VistaDetalleJefe] No hay resultado del backend, calculando desde respuestas (fallback)');
        const instrumentId = instrument.id || colaborador.nivel;
        const responsesToUse = calculateConsolidatedResponses(
          autoevaluacion.responses,
          evaluacionJefe.responses,
          instrumentId
        );
        
        const performanceScore = calculatePerformanceScore(responsesToUse, instrument.dimensionesDesempeno);
        performancePercentage = scoreToPercentage(performanceScore);
        
        const titulosGenerados: string[] = [];
        radarDataPDF = instrument.dimensionesDesempeno.map((dim, idx) => {
          const promedio = calculateDimensionAverage(responsesToUse, dim);
          const porcentaje = calculateDimensionPercentage(responsesToUse, dim);
          
          let dimensionTitle = getDimensionFriendlyTitle(dim);
          if (titulosGenerados.includes(dimensionTitle)) {
            dimensionTitle = dim.nombre.length <= 30 
              ? dim.nombre 
              : `${dimensionTitle} (${idx + 1})`;
          }
          titulosGenerados.push(dimensionTitle);
          
          return {
            dimension: dimensionTitle,
            nombreCompleto: dim.nombre,
            numero: idx + 1,
            tuEvaluacion: porcentaje,
            puntaje: promedio,
            dimensionData: dim
          };
        });
      }

      // Obtener promedio municipal desde el BACKEND (no calcular en frontend)
      let promedioMunicipal: Record<string, number> = {};
      try {
        const { getMunicipalAverageByDimension } = await import("@/lib/backendStatistics");
        const promedioMunicipalData = await getMunicipalAverageByDimension(colaborador.nivel, periodoFinal);
        
        // Convertir a formato esperado por el componente
        instrument.dimensionesDesempeno.forEach((dim) => {
          const dimData = promedioMunicipalData[dim.id];
          promedioMunicipal[dim.id] = dimData?.porcentaje || 0;
        });

        console.log('✅ [VistaDetalleJefe] Promedio municipal obtenido del BACKEND:', promedioMunicipal);
      } catch (error) {
        console.error('❌ Error obteniendo promedio municipal del backend:', error);
      }

      // Identificar fortalezas y áreas de oportunidad
      const sortedDimensions = [...radarDataPDF].sort((a, b) => b.tuEvaluacion - a.tuEvaluacion);
      const fortalezas = sortedDimensions.slice(0, 3).map(f => ({
        dimension: f.dimension,
        nombreCompleto: f.nombreCompleto,
        tuEvaluacion: f.tuEvaluacion,
        promedioMunicipal: promedioMunicipal[f.dimensionData.id] || 0
      }));
      
      const areasOportunidad = sortedDimensions.slice(-3).reverse().map(a => ({
        dimension: a.dimension,
        nombreCompleto: a.nombreCompleto,
        tuEvaluacion: a.tuEvaluacion,
        promedioMunicipal: promedioMunicipal[a.dimensionData.id] || 0
      }));

      return {
        radarDataPDF: radarDataPDF.map(d => ({
          dimension: d.dimension,
          tuEvaluacion: d.tuEvaluacion,
          promedioMunicipal: promedioMunicipal[d.dimensionData.id] || 0,
          dimensionId: d.dimensionData?.id,
          descripcion: d.dimensionData?.descripcion
        })),
        fortalezas,
        areasOportunidad,
        performancePercentage,
        jefeCompleto: true
      };
    } catch (error: any) {
      console.error("Error preparando datos para PDF:", error);
      throw error;
    }
  };

  // Función para exportar todos los PDFs de evaluaciones completadas en un ZIP
  const exportarTodosLosPDFs = async () => {
    const evaluacionesCompletadas = evaluaciones.filter(e => e.estado === "enviado");

    if (evaluacionesCompletadas.length === 0) {
      toast.error("No hay evaluaciones completadas para exportar");
      return;
    }

    setExportandoTodos(true);
    setProgresoExportacion({ current: 0, total: evaluacionesCompletadas.length, nombre: "" });

    try {
      const periodoFinal = periodoId || (await getActivePeriodId());
      if (!periodoFinal) {
        toast.error("No hay período activo");
        setExportandoTodos(false);
        return;
      }

      // Obtener nombre del período
      const { data: periodoData } = await supabase
        .from("evaluation_periods")
        .select("nombre")
        .eq("id", periodoFinal)
        .single();

      const periodoNombre = periodoData?.nombre || periodoFinal;

      // Preparar datos para cada colaborador
      const colaboradoresData: ColaboradorExportData[] = [];

      for (const evaluacion of evaluacionesCompletadas) {
        const colaborador = evaluacion.colaborador;

        try {
          // Obtener datos completos del colaborador
          const { data: colaboradorCompleto } = await supabase
            .from("users")
            .select("*")
            .eq("dpi", colaborador.dpi)
            .single();

          if (!colaboradorCompleto) continue;

          // Usar prepararDatosParaPDF para obtener datos correctos
          const datosPreparados = await prepararDatosParaPDF(colaboradorCompleto, evaluacion);

          // Cargar plan de desarrollo si existe
          const planDesarrollo = planesDesarrollo.get(colaborador.dpi);
          let planParaPDF = null;
          if (planDesarrollo) {
            const competencias = planDesarrollo.competencias_desarrollar || {};
            planParaPDF = {
              planEstructurado: planDesarrollo.planEstructurado || (typeof competencias === 'object' && competencias.acciones ? competencias : null),
              recomendaciones: planDesarrollo.recomendaciones || (typeof competencias === 'object' && competencias.recomendaciones ? competencias.recomendaciones : [])
            };
          }

          colaboradoresData.push({
            empleado: {
              nombre: colaboradorCompleto.nombre || colaborador.nombre || "",
              apellidos: colaboradorCompleto.apellidos || colaborador.apellidos || "",
              dpi: colaboradorCompleto.dpi || colaborador.dpi || "",
              cargo: colaboradorCompleto.cargo || colaborador.cargo || "",
              area: colaboradorCompleto.area || colaborador.area || "",
              nivel: colaboradorCompleto.nivel || colaborador.nivel || "",
              direccionUnidad: colaboradorCompleto.direccion_unidad || "",
              departamentoDependencia: colaboradorCompleto.departamento_dependencia || "",
              profesion: colaboradorCompleto.profesion || "",
              correo: colaboradorCompleto.correo || "",
              telefono: colaboradorCompleto.telefono || "",
              jefeNombre: jefe ? `${jefe.nombre} ${jefe.apellidos}` : "",
              directoraRRHHNombre: nombreDirectoraRRHH || undefined,
            },
            resultadoData: {
              performancePercentage: datosPreparados.performancePercentage,
              jefeCompleto: datosPreparados.jefeCompleto,
              fortalezas: datosPreparados.fortalezas,
              areasOportunidad: datosPreparados.areasOportunidad,
              radarData: datosPreparados.radarDataPDF,
            },
            planDesarrollo: planParaPDF
          });

        } catch (error) {
          console.error(`Error preparando datos para ${colaborador?.nombre}:`, error);
        }
      }

      if (colaboradoresData.length === 0) {
        toast.error("No se pudieron preparar los datos de ningún colaborador");
        setExportandoTodos(false);
        return;
      }

      // Exportar todos en ZIP
      await exportMultiplePDFsToZip(
        colaboradoresData,
        periodoNombre,
        jefe ? `${jefe.nombre} ${jefe.apellidos}` : "Jefe",
        (current, total, nombre) => {
          setProgresoExportacion({ current, total, nombre });
        }
      );

    } catch (error: any) {
      console.error("Error en exportación masiva:", error);
      toast.error(`Error al exportar: ${error?.message || "Error desconocido"}`);
    } finally {
      setExportandoTodos(false);
      setProgresoExportacion({ current: 0, total: 0, nombre: "" });
    }
  };

  // Componente para exportar PDF usando exportEvaluacionCompletaPDFReact (igual que VistaComparativa)
  const BotonExportarPDF = ({ colaborador, evaluacion }: { colaborador: any; evaluacion: any }) => {
    const [exportando, setExportando] = useState(false);

    const handleExportarPDF = async () => {
      if (evaluacion.estado !== "enviado") {
        toast.error("La evaluación debe estar completada para exportar el PDF");
        return;
      }

      setExportando(true);
      try {
        const periodoFinal = periodoId || (await getActivePeriodId());
        if (!periodoFinal) {
          toast.error("No hay período activo");
          setExportando(false);
          return;
        }

        // Obtener datos del colaborador completo
        const { data: colaboradorCompleto } = await supabase
          .from("users")
          .select("*")
          .eq("dpi", colaborador.dpi)
          .single();

        if (!colaboradorCompleto) {
          toast.error("No se encontraron datos del colaborador");
          setExportando(false);
          return;
        }

        // Cargar autoevaluación
        const { data: autoevaluacion } = await supabase
          .from("evaluations")
          .select("*")
          .eq("usuario_id", colaborador.dpi)
          .eq("periodo_id", periodoFinal)
          .eq("tipo", "auto")
          .eq("estado", "enviado")
          .single();

        if (!autoevaluacion) {
          toast.error("La autoevaluación debe estar completada");
          setExportando(false);
          return;
        }

        // Usar prepararDatosParaPDF para obtener datos correctos con cálculos consolidados
        const datosPreparados = await prepararDatosParaPDF(colaboradorCompleto, evaluacion);

        // Obtener nombre del período
        const { data: periodoData } = await supabase
          .from("evaluation_periods")
          .select("nombre")
          .eq("id", periodoFinal)
          .single();

        // Obtener nombre y cargo del jefe
        const { data: assignment } = await supabase
          .from("user_assignments")
          .select("jefe_id")
          .eq("colaborador_id", colaborador.dpi)
          .eq("activo", true)
          .single();

        let nombreJefe = "N/A";
        let cargoJefe = "Jefe Inmediato";
        if (assignment?.jefe_id) {
          const { data: jefeData } = await supabase
            .from("users")
            .select("nombre, apellidos, cargo")
            .eq("dpi", assignment.jefe_id)
            .single();
          if (jefeData) {
            nombreJefe = `${jefeData.nombre} ${jefeData.apellidos || ''}`.trim();
            if (jefeData.cargo && typeof jefeData.cargo === 'string' && jefeData.cargo.trim() !== '') {
              cargoJefe = jefeData.cargo.trim();
            }
          }
        }

        // Cargar plan de desarrollo
        const planDesarrollo = planesDesarrollo.get(colaborador.dpi);
        let planParaPDF = null;
        if (planDesarrollo) {
          const competencias = planDesarrollo.competencias_desarrollar || {};
          planParaPDF = {
            planEstructurado: planDesarrollo.planEstructurado || (typeof competencias === 'object' && competencias.acciones ? competencias : null),
            recomendaciones: planDesarrollo.recomendaciones || (typeof competencias === 'object' && competencias.recomendaciones ? competencias.recomendaciones : [])
          };
        }

        // Exportar usando la función estándar del sistema
        await exportEvaluacionCompletaPDFReact(
          {
            nombre: colaboradorCompleto.nombre || colaborador.nombre || "",
            apellidos: colaboradorCompleto.apellidos || colaborador.apellidos || "",
            dpi: colaboradorCompleto.dpi || colaborador.dpi || "",
            cargo: colaboradorCompleto.cargo || colaborador.cargo || "",
            area: colaboradorCompleto.area || colaborador.area || "",
            nivel: colaboradorCompleto.nivel || colaborador.nivel || "",
            direccionUnidad: colaboradorCompleto.direccion_unidad || "",
            departamentoDependencia: colaboradorCompleto.departamento_dependencia || "",
            profesion: colaboradorCompleto.profesion || "",
            correo: colaboradorCompleto.correo || "",
            telefono: colaboradorCompleto.telefono || "",
            jefeNombre: nombreJefe,
            jefeCargo: cargoJefe,
            directoraRRHHNombre: nombreDirectoraRRHH || undefined,
            directoraRRHHCargo: undefined, // Se obtendrá automáticamente en preparePDFData
          },
          periodoData?.nombre || periodoFinal,
          new Date(),
          {
            performancePercentage: datosPreparados.performancePercentage,
            jefeCompleto: datosPreparados.jefeCompleto,
            fortalezas: datosPreparados.fortalezas,
            areasOportunidad: datosPreparados.areasOportunidad,
            radarData: datosPreparados.radarDataPDF,
            resultadoConsolidado: undefined,
          },
          planParaPDF
        );

        toast.success("PDF generado. Listo para imprimir y firmar.");
      } catch (error: any) {
        console.error("Error al generar PDF:", error);
        toast.error(`Error al generar PDF: ${error?.message || "Error desconocido"}`);
      } finally {
        setExportando(false);
      }
    };

    if (evaluacion.estado !== "enviado") {
      return (
        <Button variant="outline" size="sm" disabled>
          <FileDown className="h-3 w-3 mr-1" />
          Exportar PDF
        </Button>
      );
    }

    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExportarPDF}
        disabled={exportando}
      >
        {exportando ? (
          <>
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Generando...
          </>
        ) : (
          <>
            <Download className="h-3 w-3 mr-1" />
            Exportar PDF
          </>
        )}
      </Button>
    );
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "enviado":
        return <Badge className="bg-success text-white"><CheckCircle2 className="h-3 w-3 mr-1" />Completada</Badge>;
      case "borrador":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En Progreso</Badge>;
      default:
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Pendiente</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto p-6">
          <div className="text-center py-12">Cargando...</div>
        </main>
      </div>
    );
  }

  if (!jefe) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Jefe no encontrado</p>
            <Button onClick={() => navigate("/admin/dashboard")} className="mt-4">
              Volver al Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const completadas = evaluaciones.filter(e => e.estado === "enviado").length;
  const enProgreso = evaluaciones.filter(e => e.estado === "borrador").length;
  const pendientes = Math.max(0, totalEsperadas - completadas - enProgreso);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información del Jefe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nombre</p>
                <p className="font-semibold">{jefe.nombre} {jefe.apellidos}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cargo</p>
                <p className="font-semibold">{jefe.cargo || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Área</p>
                <p className="font-semibold">{jefe.area || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nivel</p>
                <p className="font-semibold">{jefe.nivel || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Resumen de Evaluaciones</CardTitle>
            <CardDescription>
              Estado de las evaluaciones realizadas por este jefe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-success">{completadas}</p>
                <p className="text-sm text-muted-foreground">Completadas</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-warning">{enProgreso}</p>
                <p className="text-sm text-muted-foreground">En Progreso</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-destructive">{pendientes}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Evaluaciones por Colaborador
                </CardTitle>
                <CardDescription>
                  Lista detallada de todas las evaluaciones: completadas, en progreso y pendientes
                </CardDescription>
              </div>
              {completadas > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Botón para generar todos los planes */}
                  {(() => {
                    const sinPlan = evaluaciones.filter(e => e.estado === "enviado" && !planesDesarrollo.has(e.colaborador_id)).length;
                    return sinPlan > 0 && (
                      <Button
                        onClick={() => generarTodosLosPlanes(true)}
                        disabled={generandoPlanesMasivo || exportandoTodos}
                        variant="outline"
                        className="gap-2"
                      >
                        {generandoPlanesMasivo ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generando planes...
                          </>
                        ) : (
                          <>
                            <Wand2 className="h-4 w-4" />
                            Generar Planes ({sinPlan})
                          </>
                        )}
                      </Button>
                    );
                  })()}

                  {/* Botón para regenerar todos los planes */}
                  {planesDesarrollo.size > 0 && (
                    <Button
                      onClick={() => generarTodosLosPlanes(false)}
                      disabled={generandoPlanesMasivo || exportandoTodos}
                      variant="outline"
                      className="gap-2"
                    >
                      {generandoPlanesMasivo ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Regenerando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Regenerar Todos ({completadas})
                        </>
                      )}
                    </Button>
                  )}

                  {/* Botón para exportar todos los PDFs */}
                  <Button
                    onClick={exportarTodosLosPDFs}
                    disabled={exportandoTodos || generandoPlanesMasivo}
                    className="gap-2"
                  >
                    {exportandoTodos ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Exportando...
                      </>
                    ) : (
                      <>
                        <Package className="h-4 w-4" />
                        Exportar Todos ({completadas} PDFs)
                      </>
                    )}
                  </Button>

                  {/* Separador visual */}
                  <div className="h-8 w-px bg-border mx-1" />

                  {/* Botón Generar/Regenerar Análisis IA Equipo */}
                  <Button
                    onClick={() => generarAnalisisIA('directo')}
                    disabled={generandoAnalisisEquipo || generandoAnalisisUnidad || generandoPlanesMasivo || exportandoTodos}
                    variant="outline"
                    className="gap-2"
                  >
                    {generandoAnalisisEquipo ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4" />
                        {analisisEquipoExiste ? 'Regenerar' : 'Generar'} Análisis Equipo
                      </>
                    )}
                  </Button>

                  {/* Botón Generar/Regenerar Análisis IA Unidad */}
                  <Button
                    onClick={() => generarAnalisisIA('cascada')}
                    disabled={generandoAnalisisEquipo || generandoAnalisisUnidad || generandoPlanesMasivo || exportandoTodos}
                    variant="outline"
                    className="gap-2"
                  >
                    {generandoAnalisisUnidad ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-4 w-4" />
                        {analisisUnidadExiste ? 'Regenerar' : 'Generar'} Análisis Unidad
                      </>
                    )}
                  </Button>

                  {/* Botón Exportar PDF Análisis Equipo */}
                  <Button
                    onClick={() => exportarAnalisisPDF('equipo')}
                    disabled={exportandoPDFEquipo || exportandoPDFUnidad || generandoPlanesMasivo || exportandoTodos}
                    variant="outline"
                    className="gap-2"
                  >
                    {exportandoPDFEquipo ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Exportando...
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4" />
                        PDF Análisis Equipo
                      </>
                    )}
                  </Button>

                  {/* Botón Exportar PDF Análisis Unidad */}
                  <Button
                    onClick={() => exportarAnalisisPDF('unidad')}
                    disabled={exportandoPDFEquipo || exportandoPDFUnidad || generandoPlanesMasivo || exportandoTodos}
                    variant="outline"
                    className="gap-2"
                  >
                    {exportandoPDFUnidad ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Exportando...
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4" />
                        PDF Análisis Unidad
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
            {/* Barra de progreso para exportación masiva */}
            {exportandoTodos && progresoExportacion.total > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Generando PDF {progresoExportacion.current} de {progresoExportacion.total}
                  </span>
                  <span className="font-medium">
                    {Math.round((progresoExportacion.current / progresoExportacion.total) * 100)}%
                  </span>
                </div>
                <Progress
                  value={(progresoExportacion.current / progresoExportacion.total) * 100}
                  className="h-2"
                />
                {progresoExportacion.nombre && (
                  <p className="text-xs text-muted-foreground">
                    Procesando: {progresoExportacion.nombre}
                  </p>
                )}
              </div>
            )}

            {/* Barra de progreso para generación masiva de planes */}
            {generandoPlanesMasivo && progresoPlanes.total > 0 && (
              <div className="mt-4 space-y-2 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Wand2 className="h-4 w-4 animate-pulse" />
                    Generando plan {progresoPlanes.current} de {progresoPlanes.total}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">
                      {progresoPlanes.tiempoRestante}
                    </span>
                    <span className="font-medium">
                      {Math.round((progresoPlanes.current / progresoPlanes.total) * 100)}%
                    </span>
                  </div>
                </div>
                <Progress
                  value={(progresoPlanes.current / progresoPlanes.total) * 100}
                  className="h-2"
                />
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    {progresoPlanes.nombre && (
                      <span className="text-muted-foreground">
                        Procesando: <span className="font-medium">{progresoPlanes.nombre}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-green-600">
                      ✓ {progresoPlanes.exitosos} exitosos
                    </span>
                    {progresoPlanes.errores > 0 && (
                      <span className="text-red-600">
                        ✗ {progresoPlanes.errores} errores
                      </span>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        cancelarGeneracionRef.current = true;
                        toast.info("Cancelando... espere a que termine el plan actual");
                      }}
                      className="h-6 px-2 text-xs"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {evaluaciones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Este jefe no tiene colaboradores asignados</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Última Actualización</TableHead>
                    <TableHead>Plan de Desarrollo</TableHead>
                    <TableHead>Exportar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluaciones.map((evaluacion) => {
                    const colaborador = evaluacion.colaborador;
                    const progreso = evaluacion.progreso || 0;
                    const estaCompletada = evaluacion.estado === "enviado";
                    
                    return (
                      <TableRow 
                        key={evaluacion.id}
                        className={estaCompletada ? "bg-green-50/50 dark:bg-green-950/20" : ""}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {estaCompletada && (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            )}
                            {colaborador?.nombre} {colaborador?.apellidos}
                          </div>
                        </TableCell>
                        <TableCell>{colaborador?.cargo || "N/A"}</TableCell>
                        <TableCell>{colaborador?.area || "N/A"}</TableCell>
                        <TableCell>{getEstadoBadge(evaluacion.estado)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${progreso}%` }}
                              />
                            </div>
                            <span className="text-sm">{progreso}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {evaluacion.estado === "pendiente" 
                            ? "Sin iniciar"
                            : evaluacion.updated_at
                            ? new Date(evaluacion.updated_at).toLocaleDateString("es-ES", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const plan = planesDesarrollo.get(evaluacion.colaborador_id);
                            const estaGenerando = generandoPlanes.has(evaluacion.colaborador_id);
                            
                            if (plan) {
                              return (
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-success text-white">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Plan Generado
                                  </Badge>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => generarPlanDesarrollo(evaluacion.colaborador_id, `${colaborador?.nombre} ${colaborador?.apellidos}`)}
                                    disabled={estaGenerando}
                                  >
                                    {estaGenerando ? (
                                      <>
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        Generando...
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="h-3 w-3 mr-1" />
                                        Regenerar
                                      </>
                                    )}
                                  </Button>
                                </div>
                              );
                            } else {
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => generarPlanDesarrollo(evaluacion.colaborador_id, `${colaborador?.nombre} ${colaborador?.apellidos}`)}
                                  disabled={estaGenerando || evaluacion.estado !== "enviado"}
                                >
                                  {estaGenerando ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Generando...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="h-3 w-3 mr-1" />
                                      Generar Plan
                                    </>
                                  )}
                                </Button>
                              );
                            }
                          })()}
                        </TableCell>
                        <TableCell>
                          <BotonExportarPDF colaborador={colaborador} evaluacion={evaluacion} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default VistaDetalleJefe;

