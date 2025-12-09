// @ts-nocheck
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  ClipboardCheck,
  Users,
  BarChart3,
  Settings,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  PlayCircle,
  Sparkles,
  Database,
  Grid3x3,
  Eye
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { getEvaluationDraft, hasSubmittedEvaluation, submitEvaluation, EvaluationDraft, getSubmittedEvaluation, hasJefeEvaluation, getJefeEvaluationDraft } from "@/lib/storage";
import { getInstrumentForUser } from "@/lib/instruments";
import { toast } from "@/hooks/use-toast";
import { getJerarquiaInfo } from "@/lib/jerarquias";
import { getColaboradorJefe } from "@/lib/supabase";
import { calculatePerformanceScore, scoreToPercentage, calculateDimensionPercentage, calculateDimensionAverage } from "@/lib/calculations";
import { TrendingUp, Award, Lightbulb, FileDown, Target, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PerformanceRadarAnalysis } from "@/components/evaluation/PerformanceRadarAnalysis";
import { supabase } from "@/integrations/supabase/client";
import { exportEvaluacionCompletaPDF, exportEvaluacionCompletaPDFFromElement, exportEvaluacionCompletaPDFReact } from "@/lib/exports";
import { getInstrumentCalculationConfig } from "@/lib/instrumentCalculations";

// Helper para calcular respuestas consolidadas con pesos dinámicos según el nivel
// A1 (Alcalde): 55% jefe + 45% auto
// C1 (Concejo): 100% auto (no tiene jefe)
// Otros: 70% jefe + 30% auto
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
        console.log(`📊 [Dashboard] Usando pesos del instrumento ${instrumentId}:`, { pesoJefe, pesoAuto });
      }
    } catch (error) {
      console.warn(`⚠️ [Dashboard] No se pudo obtener configuración del instrumento ${instrumentId}, usando pesos por defecto 70/30`);
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

// Helper para interpretar el puntaje
const getScoreInterpretation = (percentage: number) => {
  if (percentage >= 90) return { label: "Excelente", color: "text-green-600 bg-green-50 border-green-200" };
  if (percentage >= 75) return { label: "Bueno", color: "text-blue-600 bg-blue-50 border-blue-200" };
  if (percentage >= 60) return { label: "Regular", color: "text-yellow-600 bg-yellow-50 border-yellow-200" };
  return { label: "Necesita mejorar", color: "text-orange-600 bg-orange-50 border-orange-200" };
};

// Helper para obtener título amigable de dimensión
const getDimensionFriendlyTitle = (dimension: any): string => {
  const nombre = dimension.nombre.toLowerCase();
  
  // Casos específicos para S2
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

// Helper para obtener descripción amigable de la dimensión
const getDimensionFriendlyDescription = (dimension: any, percentage: number): string => {
  const nombre = dimension.nombre.toLowerCase();
  
  if (nombre.includes("técnica") || nombre.includes("competencia") || nombre.includes("conocimiento")) {
    if (percentage >= 85) {
      return `con ${percentage}%. Tus habilidades técnicas son tu diferenciador más fuerte.`;
    } else if (percentage >= 70) {
      return `con ${percentage}%. Tienes buenos conocimientos en tu área de trabajo.`;
    } else {
      return `con ${percentage}%. Hay oportunidad de fortalecer tus conocimientos técnicos.`;
    }
  }
  
  if (nombre.includes("comportamiento") || nombre.includes("actitud") || nombre.includes("valor")) {
    if (percentage >= 70) {
      return `con ${percentage}%. Tus valores y actitud son un buen soporte.`;
    } else {
      return `con ${percentage}%. Enfócate en alinear mejor con la cultura y valores.`;
    }
  }
  
  if (nombre.includes("liderazgo") || nombre.includes("dirección") || nombre.includes("gestión")) {
    if (percentage >= 75) {
      return `con ${percentage}%. Tu capacidad de liderazgo es notable.`;
    } else {
      return `con ${percentage}%. Puedes mejorar tus habilidades de gestión de equipo.`;
    }
  }
  
  if (nombre.includes("ciudadano") || nombre.includes("servicio") || nombre.includes("orientación")) {
    if (percentage >= 70) {
      return `con ${percentage}%. Tu compromiso con el servicio es evidente.`;
    } else {
      return `con ${percentage}%. Fortalece tu enfoque en las necesidades ciudadanas.`;
    }
  }
  
  // Default genérico
  if (percentage >= 75) {
    return `con ${percentage}%. Esta es una de tus áreas más fuertes.`;
  } else {
    return `con ${percentage}%. Aquí hay espacio para crecer y mejorar.`;
  }
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { activePeriodId, activePeriod } = usePeriod();

  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [isResultadosLoading, setIsResultadosLoading] = useState(false);
  const [pendingResultadosScroll, setPendingResultadosScroll] = useState(false);
  const [evaluationStatus, setEvaluationStatus] = useState<"not_started" | "in_progress" | "submitted">("not_started");
  const [progress, setProgress] = useState(0);
  const [jerarquiaInfo, setJerarquiaInfo] = useState<any>(null);
  const [resultadoData, setResultadoData] = useState<{
    performancePercentage: number;
    jefeCompleto: boolean;
    fortalezas: any[];
    areasOportunidad: any[];
    instrument: any;
    radarData: any[];
    promedioMunicipal: Record<string, number>;
  } | null>(null);
  const [planDesarrollo, setPlanDesarrollo] = useState<any>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [jefesEvaluacionInfo, setJefesEvaluacionInfo] = useState<{
    totalJefes: number;
    jefesCompletados: number;
  } | null>(null);
  const [equipoEvaluaciones, setEquipoEvaluaciones] = useState<{
    pendientes: number;
    completadas: number;
  }>({ pendientes: 0, completadas: 0 });

  const focusResultadosSection = () => {
    const element = document.getElementById("resultados-evaluacion-container");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingResultadosScroll(false);
    } else {
      setPendingResultadosScroll(true);
    }
  };

  const isColaborador = user?.rol === "colaborador";
  const isJefe = user?.rol === "jefe";
  const isAdminRRHH = user?.rol === "admin_rrhh";
  const isAdminGeneral = user?.rol === "admin_general";

  useEffect(() => {
    if (location.state?.focusResultados) {
      setPendingResultadosScroll(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (!pendingResultadosScroll) return;
    const timer = setTimeout(() => {
      const element = document.getElementById("resultados-evaluacion-container");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        setPendingResultadosScroll(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [pendingResultadosScroll, resultadoData, evaluationStatus, isResultadosLoading]);

  // Cargar estadísticas del dashboard para RRHH
  useEffect(() => {
    if (!user || !activePeriodId) return;
    if (!isAdminRRHH && !isAdminGeneral) return;

    const loadDashboardStats = async () => {
      try {
        const { data, error } = await supabase
          .rpc("get_dashboard_stats", { periodo_id_param: activePeriodId });

        if (error) {
          console.error("Error loading dashboard stats:", error);
          return;
        }

        setDashboardStats(data);
      } catch (error) {
        console.error("Error loading dashboard stats:", error);
      }
    };

    loadDashboardStats();
  }, [user, activePeriodId, isAdminRRHH, isAdminGeneral]);

  useEffect(() => {
    if (!user || !activePeriodId) return;

    setIsStatusLoading(true);

    const checkStatus = async () => {
      try {
        // Check evaluation status con período activo real
        const isSubmitted = await hasSubmittedEvaluation(user.dpi, activePeriodId);
        if (isSubmitted) {
          setEvaluationStatus("submitted");
          setProgress(100);
          
          // Cargar datos de resultados si está enviada
          // IMPORTANTE: C1 (Concejo Municipal) solo tiene autoevaluación, cargar resultados inmediatamente
          // A1 (Alcalde) es evaluado por el Concejo, debe esperar a que todos completen
          // Otros niveles también esperan a que todos sus jefes completen
          if (user.nivel === 'C1') {
            // C1 solo tiene autoevaluación, cargar resultados inmediatamente
            await loadResultadosData();
          } else if (isColaborador || user.nivel === 'A1') {
            // Obtener TODOS los jefes asignados al colaborador
            const { supabase } = await import("@/integrations/supabase/client");
            const { data: asignaciones } = await supabase
              .from("user_assignments")
              .select("jefe_id")
              .eq("colaborador_id", user.dpi)
              .eq("activo", true);
            
            const jefesAsignados = asignaciones?.map(a => a.jefe_id) || [];
            const totalJefes = jefesAsignados.length;
            
            if (totalJefes === 0) {
              // Si no tiene jefes, cargar resultados de autoevaluación
              console.log('✅ [Dashboard] Colaborador sin jefes asignados, cargando autoevaluación...');
              await loadResultadosData();
            } else {
              // Verificar cuántos jefes han completado su evaluación
              // Primero verificar directamente en evaluations (más confiable)
              const { data: evaluacionesJefes, count: countEvaluaciones } = await supabase
                .from("evaluations")
                .select("evaluador_id", { count: 'exact' })
                .eq("colaborador_id", user.dpi)
                .eq("periodo_id", activePeriodId)
                .eq("tipo", "jefe")
                .eq("estado", "enviado")
                .in("evaluador_id", jefesAsignados);
              
              // También verificar en evaluation_results_by_evaluator (por si el trigger ya corrió)
              const { data: resultadosExistentes, count: countResultados } = await supabase
                .from("evaluation_results_by_evaluator")
                .select("evaluador_id", { count: 'exact' })
                .eq("colaborador_id", user.dpi)
                .eq("periodo_id", activePeriodId)
                .in("evaluador_id", jefesAsignados);
              
              // Usar el máximo entre ambos para asegurar que contamos correctamente
              // Si hay evaluación enviada pero no resultado, el trigger puede no haberse ejecutado aún
              const jefesCompletadosEvaluaciones = countEvaluaciones || (evaluacionesJefes?.length || 0);
              const jefesCompletadosResultados = countResultados || (resultadosExistentes?.length || 0);
              const jefesCompletados = Math.max(jefesCompletadosEvaluaciones, jefesCompletadosResultados);
              const todosCompletaron = jefesCompletados === totalJefes;
              
              // Guardar información de progreso de jefes
              setJefesEvaluacionInfo({
                totalJefes,
                jefesCompletados
              });
              
              console.log('📊 [Dashboard] Estado de evaluaciones de jefes:', {
                totalJefes,
                jefesCompletados,
                todosCompletaron,
                faltan: totalJefes - jefesCompletados
              });
              
              if (todosCompletaron) {
                console.log('✅ [Dashboard] Todos los jefes han completado, cargando resultado consolidado...');
                await loadResultadosData();
              } else {
                console.log(`⏳ [Dashboard] Autoevaluación enviada, pero solo ${jefesCompletados} de ${totalJefes} jefe(s) han completado. Esperando a que todos completen.`);
                setResultadoData(null);
              }
            }
          }
        } else {
          const draft = await getEvaluationDraft(user.dpi, activePeriodId);
          if (draft && Object.keys(draft.responses).length > 0) {
            setEvaluationStatus("in_progress");
            setProgress(draft.progreso);
          } else {
            setEvaluationStatus("not_started");
            setProgress(0);
          }
        }
      } finally {
        setIsStatusLoading(false);
      }
    };

    const loadResultadosData = async () => {
      setIsResultadosLoading(true);
      try {
        console.log('🔍 [Dashboard] Iniciando carga de resultados para:', { dpi: user.dpi, nivel: user.nivel, periodo: activePeriodId });
        
        const instrument = await getInstrumentForUser(user.nivel, user.instrumentoId, user.cargo);
        if (!instrument) {
          console.error('❌ [Dashboard] No se encontró instrumento para nivel:', user.nivel);
          return;
        }
        console.log('✅ [Dashboard] Instrumento cargado:', { 
          id: instrument.id, 
          nombre: instrument.nombre,
          dimensionesDesempeno: instrument.dimensionesDesempeno?.length || 0 
        });

        const submitted = await getSubmittedEvaluation(user.dpi, activePeriodId);
        if (!submitted) {
          console.warn('⚠️ [Dashboard] No se encontró autoevaluación enviada para:', { dpi: user.dpi, periodo: activePeriodId });
          return;
        }
        console.log('✅ [Dashboard] Autoevaluación encontrada:', { 
          id: submitted.id, 
          respuestasCount: Object.keys(submitted.responses || {}).length,
          respuestas: submitted.responses 
        });

        // Obtener TODOS los jefes asignados y verificar que todos hayan completado
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: asignaciones } = await supabase
          .from("user_assignments")
          .select("jefe_id")
          .eq("colaborador_id", user.dpi)
          .eq("activo", true);
        
        const jefesAsignados = asignaciones?.map(a => a.jefe_id) || [];
        const totalJefes = jefesAsignados.length;
        let jefeCompleto = false;
        let responsesToUse = submitted.responses;

        if (totalJefes === 0) {
          // Si no tiene jefes, usar solo autoevaluación
          jefeCompleto = false; // No hay jefe que complete
          console.log('📊 [Dashboard] Sin jefes asignados, usando solo autoevaluación');
        } else {
          // Verificar que TODOS los jefes hayan completado
          // Primero verificar directamente en evaluations (más confiable)
          const { data: evaluacionesJefes, count: countEvaluaciones } = await supabase
            .from("evaluations")
            .select("evaluador_id", { count: 'exact' })
            .eq("colaborador_id", user.dpi)
            .eq("periodo_id", activePeriodId)
            .eq("tipo", "jefe")
            .eq("estado", "enviado")
            .in("evaluador_id", jefesAsignados);
          
          // También verificar en evaluation_results_by_evaluator (por si el trigger ya corrió)
          const { data: resultadosExistentes, count: countResultados } = await supabase
            .from("evaluation_results_by_evaluator")
            .select("evaluador_id", { count: 'exact' })
            .eq("colaborador_id", user.dpi)
            .eq("periodo_id", activePeriodId)
            .in("evaluador_id", jefesAsignados);
          
          // Usar el máximo entre ambos para asegurar que contamos correctamente
          const jefesCompletadosEvaluaciones = countEvaluaciones || (evaluacionesJefes?.length || 0);
          const jefesCompletadosResultados = countResultados || (resultadosExistentes?.length || 0);
          const jefesCompletados = Math.max(jefesCompletadosEvaluaciones, jefesCompletadosResultados);
          jefeCompleto = jefesCompletados === totalJefes;
          
          console.log('📊 [Dashboard] Estado de evaluaciones:', { 
            totalJefes,
            jefesCompletados,
            jefeCompleto,
            faltan: totalJefes - jefesCompletados
          });
          
          if (jefeCompleto) {
            // Si todos completaron, usar resultado consolidado de getConsolidatedResult
            // que ya calcula el promedio de todos los evaluadores
            const { getConsolidatedResult } = await import("@/lib/finalResultSupabase");
            const consolidado = await getConsolidatedResult(user.dpi, activePeriodId);
            
            if (consolidado && consolidado.totalEvaluadores > 0) {
              // Usar el desempeño promedio consolidado
              // Para el radar, necesitamos calcular desde las respuestas consolidadas
              // Obtener todas las evaluaciones de jefes para consolidar
              const evaluacionesJefes = await Promise.all(
                jefesAsignados.map(jefeId => 
                  getJefeEvaluationDraft(jefeId, user.dpi, activePeriodId)
                )
              );
              
              // Consolidar todas las evaluaciones de jefes (promedio)
              const todasLasRespuestasJefe: Record<string, number[]> = {};
              evaluacionesJefes.forEach(jefeEval => {
                if (jefeEval) {
                  Object.entries(jefeEval.responses).forEach(([key, value]) => {
                    if (!todasLasRespuestasJefe[key]) {
                      todasLasRespuestasJefe[key] = [];
                    }
                    todasLasRespuestasJefe[key].push(value);
                  });
                }
              });
              
              // Calcular promedio de todas las evaluaciones de jefes
              const respuestasJefePromedio: Record<string, number> = {};
              Object.entries(todasLasRespuestasJefe).forEach(([key, values]) => {
                const promedio = values.reduce((sum, val) => sum + val, 0) / values.length;
                respuestasJefePromedio[key] = Math.round(promedio * 100) / 100; // Redondear a 2 decimales
              });
              
              // Consolidar con autoevaluación
              const instrumentId = instrument?.id || user?.nivel;
              responsesToUse = calculateConsolidatedResponses(submitted.responses, respuestasJefePromedio, instrumentId);
              
              console.log('✅ [Dashboard] Usando respuestas consolidadas de todos los jefes:', { 
                totalJefes,
                autoCount: Object.keys(submitted.responses).length,
                jefePromedioCount: Object.keys(respuestasJefePromedio).length,
                consolidadasCount: Object.keys(responsesToUse).length,
                instrumentId,
                desempenoPromedio: consolidado.desempenoPorcentajePromedio
              });
            } else {
              // Fallback: usar solo el primer jefe si no hay consolidado
              const jefeId = jefesAsignados[0];
              const jefeEval = await getJefeEvaluationDraft(jefeId, user.dpi, activePeriodId);
              if (jefeEval) {
                const instrumentId = instrument?.id || user?.nivel;
                responsesToUse = calculateConsolidatedResponses(submitted.responses, jefeEval.responses, instrumentId);
              }
            }
          } else {
            console.log(`⏳ [Dashboard] Solo ${jefesCompletados} de ${totalJefes} jefe(s) han completado. Usando solo autoevaluación.`);
          }
        }

        // USAR DATOS DEL BACKEND en lugar de calcular en el frontend
        // Obtener resultado final del backend que ya incluye dimensiones
        const { getFinalResultFromSupabase } = await import("@/lib/finalResultSupabase");
        const resultadoFinal = await getFinalResultFromSupabase(user.dpi, activePeriodId);
        
        let performancePercentage = 0;
        let radarData: Array<{
          dimension: string;
          nombreCompleto: string;
          numero: number;
          tuEvaluacion: number;
          puntaje: number;
          dimensionData: any;
        }> = [];

        if (resultadoFinal && resultadoFinal.dimensiones && jefeCompleto) {
          // USAR DATOS DEL BACKEND: porcentajes por dimensión ya calculados
          performancePercentage = scoreToPercentage(resultadoFinal.desempenoFinal);
          
          const titulosGenerados: string[] = [];
          radarData = instrument.dimensionesDesempeno.map((dim, idx) => {
            // Obtener porcentaje del BACKEND
            const dimensionBackend = resultadoFinal.dimensiones?.find((d: any) => d.id === dim.id);
            const porcentaje = dimensionBackend?.porcentaje ?? 0;
            const promedio = dimensionBackend?.promedio ?? 0;
            
            // Asegurar que el porcentaje sea un número válido
            const porcentajeFinal = typeof porcentaje === 'number' && !isNaN(porcentaje) ? porcentaje : 0;
            
            // Generar título único para evitar duplicados en el gráfico
            let dimensionTitle = getDimensionFriendlyTitle(dim);
            // Si el título ya existe, usar el nombre completo o agregar un identificador
            if (titulosGenerados.includes(dimensionTitle)) {
              // Usar el nombre completo si es corto, o una versión truncada con identificador
              dimensionTitle = dim.nombre.length <= 30 
                ? dim.nombre 
                : `${dimensionTitle} (${idx + 1})`;
              console.warn(`⚠️ [Dashboard] Título duplicado detectado para "${getDimensionFriendlyTitle(dim)}", usando: "${dimensionTitle}"`);
            }
            titulosGenerados.push(dimensionTitle);
            
            return {
              dimension: dimensionTitle,
              nombreCompleto: dim.nombre,
              numero: idx + 1,
              tuEvaluacion: porcentajeFinal, // Asegurar que es porcentaje (0-100)
              puntaje: promedio, // Mantener el promedio para referencia
              dimensionData: dim
            };
          });
          
          console.log('✅ [Dashboard] Usando datos del BACKEND para radar:', radarData);
        } else {
          // FALLBACK: calcular desde respuestas si no hay resultado del backend
          console.warn('⚠️ [Dashboard] No hay resultado del backend, calculando desde respuestas (fallback)');
          performancePercentage = scoreToPercentage(calculatePerformanceScore(responsesToUse, instrument.dimensionesDesempeno));
          
          const titulosGenerados: string[] = [];
          radarData = instrument.dimensionesDesempeno.map((dim, idx) => {
            const promedio = calculateDimensionAverage(responsesToUse, dim);
            const porcentaje = calculateDimensionPercentage(responsesToUse, dim);
            
            // Asegurar que el porcentaje sea un número válido
            const porcentajeFinal = typeof porcentaje === 'number' && !isNaN(porcentaje) ? porcentaje : 0;
            
            // Generar título único para evitar duplicados en el gráfico
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
              tuEvaluacion: porcentajeFinal,
              puntaje: promedio,
              dimensionData: dim
            };
          });
        }

        console.log('📊 [Dashboard] RadarData generado:', radarData);
        console.log('📊 [Dashboard] Verificación de porcentajes:');
        radarData.forEach((d, idx) => {
          console.log(`  Dimensión ${idx + 1} (${d.dimension}):`, {
            tuEvaluacion: d.tuEvaluacion,
            tipo: typeof d.tuEvaluacion,
            esPorcentaje: d.tuEvaluacion >= 0 && d.tuEvaluacion <= 100,
            puntaje: d.puntaje
          });
        });

        const sortedDimensions = [...radarData].sort((a, b) => b.tuEvaluacion - a.tuEvaluacion);
        const fortalezas = sortedDimensions.slice(0, 3);
        const areasOportunidad = sortedDimensions.slice(-3).reverse();

        // Obtener promedio municipal desde el BACKEND (no calcular en frontend)
        let promedioMunicipal: Record<string, number> = {};
        try {
          const { getMunicipalAverageByDimension } = await import("@/lib/backendStatistics");
          const promedioMunicipalData = await getMunicipalAverageByDimension(user.nivel, activePeriodId);
          
          // Convertir a formato esperado por el componente
          instrument.dimensionesDesempeno.forEach((dim) => {
            const dimData = promedioMunicipalData[dim.id];
            promedioMunicipal[dim.id] = dimData?.porcentaje || 0;
          });

          console.log('✅ [Dashboard] Promedio municipal obtenido del BACKEND:', promedioMunicipal);
        } catch (error) {
          console.error('❌ Error obteniendo promedio municipal del backend:', error);
        }

        // Agregar promedio municipal a radarData
        const radarDataWithPromedio = radarData.map(d => ({
          ...d,
          promedioMunicipal: promedioMunicipal[d.dimensionData.id] || 0
        }));

        console.log('📊 [Dashboard] RadarData final con promedios:', radarDataWithPromedio);

        // Si todos los jefes completaron, usar el resultado consolidado calculado
        let performancePercentageFinal = performancePercentage;
        if (jefeCompleto && totalJefes > 0) {
          // Obtener resultado consolidado que ya tiene el promedio de todos los evaluadores
          const { getConsolidatedResult } = await import("@/lib/finalResultSupabase");
          const consolidado = await getConsolidatedResult(user.dpi, activePeriodId);
          
          if (consolidado && consolidado.desempenoPorcentajePromedio) {
            performancePercentageFinal = consolidado.desempenoPorcentajePromedio;
            console.log('✅ [Dashboard] Usando desempeño porcentaje consolidado (promedio de todos los jefes):', {
              calculadoDesdeRespuestas: performancePercentage,
              consolidado: consolidado.desempenoPorcentajePromedio,
              totalEvaluadores: consolidado.totalEvaluadores
            });
          }
        }

        setResultadoData({
          performancePercentage: performancePercentageFinal,
          jefeCompleto,
          fortalezas,
          areasOportunidad,
          instrument,
          radarData: radarDataWithPromedio,
          promedioMunicipal
        });
        
        console.log('✅ [Dashboard] resultadoData establecido:', {
          performancePercentage: performancePercentageFinal,
          jefeCompleto,
          tieneResultado,
          fortalezasCount: fortalezas.length,
          areasOportunidadCount: areasOportunidad.length
        });

        // Cargar plan de desarrollo si existe
        // IMPORTANTE: Verificar que el plan corresponda al colaborador actual
        try {
          // Obtener todos los planes y tomar el más reciente (puede haber múltiples)
          const { data: plansArray, error: planError } = await supabase
            .from("development_plans")
            .select("*")
            .eq("colaborador_id", user.dpi) // Filtrar por el DPI del colaborador autenticado
            .eq("periodo_id", activePeriodId) // Filtrar por el período activo
            .order("created_at", { ascending: false }); // Ordenar por fecha descendente

          let planData = null;
          
          if (planError) {
            console.error('❌ Error al cargar plan de desarrollo:', planError);
            setPlanDesarrollo(null);
          } else if (plansArray && plansArray.length > 0) {
            // Tomar el más reciente (ya está ordenado por created_at DESC)
            planData = plansArray[0];
            console.log(`✅ Se encontraron ${plansArray.length} planes, usando el más reciente:`, planData.id);
          } else {
            console.log('⚠️ No se encontró plan de desarrollo para este colaborador');
            setPlanDesarrollo(null);
          }

          if (planData) {
            // Validación adicional: asegurar que el plan pertenece al colaborador correcto
            if (planData.colaborador_id !== user.dpi) {
              console.warn('⚠️ Plan de desarrollo no corresponde al colaborador actual. Ignorando plan.');
              setPlanDesarrollo(null);
              return;
            }

            // Procesar el plan de desarrollo
            // El plan se guarda en competencias_desarrollar como JSONB con estructura:
            // { objetivos: [], acciones: [], dimensionesDebiles: [], recomendaciones: [] }
            let competencias = planData.competencias_desarrollar || {};
            
            // Si viene como string, parsearlo
            if (typeof competencias === 'string') {
              try {
                competencias = JSON.parse(competencias);
              } catch (e) {
                console.error('Error parseando competencias_desarrollar como string:', e);
                competencias = {};
              }
            }
            
            console.log('🔍 Plan raw desde BD:', { 
              id: planData.id, 
              competencias_desarrollar: competencias,
              tipo: typeof competencias,
              esArray: Array.isArray(competencias),
              esObjeto: typeof competencias === 'object' && competencias !== null && !Array.isArray(competencias),
              keys: typeof competencias === 'object' && competencias !== null ? Object.keys(competencias) : [],
            });
            
            // Extraer estructura del plan desde competencias_desarrollar
            let planEstructurado = null;
            let recomendaciones = [];
            
            if (typeof competencias === 'object' && competencias !== null && !Array.isArray(competencias)) {
              console.log('✅ competencias es objeto válido, verificando estructura...');
              console.log('  - tiene acciones:', !!(competencias.acciones && Array.isArray(competencias.acciones)));
              console.log('  - tiene objetivos:', !!(competencias.objetivos && Array.isArray(competencias.objetivos)));
              console.log('  - tiene dimensionesDebiles:', !!(competencias.dimensionesDebiles && Array.isArray(competencias.dimensionesDebiles)));
              console.log('  - tiene recomendaciones:', !!(competencias.recomendaciones && Array.isArray(competencias.recomendaciones)));
              
              // Verificar si tiene la estructura completa
              if (competencias.acciones && Array.isArray(competencias.acciones)) {
                console.log('✅ Plan tiene acciones, creando planEstructurado completo');
                planEstructurado = {
                  objetivos: Array.isArray(competencias.objetivos) ? competencias.objetivos : [],
                  acciones: competencias.acciones,
                  dimensionesDebiles: Array.isArray(competencias.dimensionesDebiles) ? competencias.dimensionesDebiles : [],
                };
                recomendaciones = Array.isArray(competencias.recomendaciones) ? competencias.recomendaciones : [];
              }
              // Si tiene objetivos pero no acciones, crear estructura básica
              else if (Array.isArray(competencias.objetivos) && competencias.objetivos.length > 0) {
                console.log('✅ Plan tiene objetivos pero no acciones, creando estructura básica');
                planEstructurado = {
                  objetivos: competencias.objetivos,
                  acciones: [],
                  dimensionesDebiles: Array.isArray(competencias.dimensionesDebiles) ? competencias.dimensionesDebiles : [],
                };
                recomendaciones = Array.isArray(competencias.recomendaciones) ? competencias.recomendaciones : [];
              }
              // Si solo tiene acciones sin objetivos, crear estructura con acciones
              else if (competencias.acciones && Array.isArray(competencias.acciones) && competencias.acciones.length > 0) {
                console.log('✅ Plan tiene acciones sin objetivos, creando estructura con acciones');
                planEstructurado = {
                  objetivos: [],
                  acciones: competencias.acciones,
                  dimensionesDebiles: Array.isArray(competencias.dimensionesDebiles) ? competencias.dimensionesDebiles : [],
                };
                recomendaciones = Array.isArray(competencias.recomendaciones) ? competencias.recomendaciones : [];
              } else {
                console.warn('⚠️ Plan no tiene estructura reconocida:', competencias);
              }
            } else {
              console.warn('⚠️ competencias no es un objeto válido:', typeof competencias, competencias);
            }

            const planCargado = {
              id: planData.id,
              evaluacion_id: planData.evaluacion_id,
              colaborador_id: planData.colaborador_id,
              periodo_id: planData.periodo_id,
              planEstructurado: planEstructurado,
              recomendaciones: recomendaciones,
              feedbackIndividual: planData.feedback_individual || "",
              feedbackGrupal: planData.feedback_grupal || null,
              generado_por_ia: planData.generado_por_ia,
              editable: planData.editable
            };

            console.log('📋 Plan procesado en Dashboard:', planCargado);
            console.log('🔍 Verificación planEstructurado:', {
              existe: !!planCargado.planEstructurado,
              tieneObjetivos: !!planCargado.planEstructurado?.objetivos,
              tieneAcciones: !!planCargado.planEstructurado?.acciones,
              tieneDimensiones: !!planCargado.planEstructurado?.dimensionesDebiles,
              tieneRecomendaciones: !!planCargado.recomendaciones,
            });
            setPlanDesarrollo(planCargado);
          } else {
            console.log('⚠️ No se encontró plan de desarrollo en BD');
            setPlanDesarrollo(null);
          }
        } catch (error) {
          console.error('Error cargando plan de desarrollo:', error);
          setPlanDesarrollo(null);
        }
      } catch (error) {
        console.error('Error cargando resultados:', error);
      } finally {
        setIsResultadosLoading(false);
      }
    };

    checkStatus();
  }, [user, activePeriodId, isColaborador]);

  // Cargar información de jerarquía
  useEffect(() => {
    if (!user) return;

    const loadJerarquia = async () => {
      try {
        const info = await getJerarquiaInfo(user.dpi);
        console.log("✅ [Dashboard] Información de jerarquía cargada:", {
          usuario: `${user.nombre} ${user.apellidos}`,
          nivel: user.nivel,
          rol: user.rol,
          tieneColaboradores: info.tieneColaboradores,
          totalColaboradores: info.totalColaboradores,
          tieneJefeSuperior: info.tieneJefeSuperior,
          tieneJefesSubordinados: info.tieneJefesSubordinados
        });
        setJerarquiaInfo(info);
      } catch (error) {
        console.error("❌ [Dashboard] Error loading hierarchy info:", error);
      }
    };

    loadJerarquia();
  }, [user]);

  // Cargar evaluaciones del equipo (pendientes y completadas)
  useEffect(() => {
    if (!user || !activePeriodId || !jerarquiaInfo?.tieneColaboradores) return;

    const loadEquipoEvaluaciones = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        
        // Obtener colaboradores del jefe
        const { data: asignaciones } = await supabase
          .from("user_assignments")
          .select("colaborador_id")
          .eq("jefe_id", user.dpi)
          .eq("activo", true);
        
        const colaboradoresIds = asignaciones?.map(a => a.colaborador_id) || [];
        
        if (colaboradoresIds.length === 0) {
          setEquipoEvaluaciones({ pendientes: 0, completadas: 0 });
          return;
        }

        // Contar evaluaciones completadas (enviadas)
        const { count: completadas } = await supabase
          .from("evaluations")
          .select("*", { count: "exact", head: true })
          .eq("evaluador_id", user.dpi)
          .eq("periodo_id", activePeriodId)
          .eq("tipo", "jefe")
          .eq("estado", "enviado")
          .in("colaborador_id", colaboradoresIds);

        // Contar evaluaciones en progreso (borrador)
        const { count: enProgreso } = await supabase
          .from("evaluations")
          .select("*", { count: "exact", head: true })
          .eq("evaluador_id", user.dpi)
          .eq("periodo_id", activePeriodId)
          .eq("tipo", "jefe")
          .eq("estado", "borrador")
          .in("colaborador_id", colaboradoresIds);

        const totalEsperadas = colaboradoresIds.length;
        const completadasCount = completadas || 0;
        const enProgresoCount = enProgreso || 0;
        const pendientes = totalEsperadas - completadasCount - enProgresoCount;

        setEquipoEvaluaciones({
          pendientes: Math.max(0, pendientes),
          completadas: completadasCount
        });
      } catch (error) {
        console.error("Error cargando evaluaciones del equipo:", error);
      }
    };

    loadEquipoEvaluaciones();
  }, [user, activePeriodId, jerarquiaInfo?.tieneColaboradores]);

  const getStatusBadge = () => {
    if (isStatusLoading) {
      return <div className="h-6 w-24 rounded-full bg-muted animate-pulse" />;
    }
    switch (evaluationStatus) {
      case "submitted":
        return (
          <Badge className="bg-success text-success-foreground">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Enviada
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="outline" className="text-info border-info">
            <PlayCircle className="mr-1 h-3 w-3" />
            En progreso
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-warning border-warning">
            <Clock className="mr-1 h-3 w-3" />
            Pendiente
          </Badge>
        );
    }
  };


  const getActionButton = () => {
    if (isStatusLoading) {
      return <div className="h-12 w-full rounded-md bg-muted animate-pulse" />;
    }
    switch (evaluationStatus) {
      case "submitted":
        return (
          <div className="space-y-3">
            <Button 
              className="w-full" 
              size="lg"
              variant="outline"
              disabled={isResultadosLoading && !resultadoData}
              onClick={() => {
                if (!resultadoData && !isResultadosLoading) {
                  toast({
                    title: "Resultados en proceso",
                    description: "Mostraremos tus resultados finales cuando se consoliden con la evaluación de tu jefe.",
                  });
                }
                focusResultadosSection();
              }}
            >
              Ver Mis Resultados
            </Button>
            <Button 
              className="w-full" 
              size="lg"
              variant="secondary"
              onClick={() => navigate("/mis-respuestas-detalle")}
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver Mis Respuestas
            </Button>
          </div>
        );
      case "in_progress":
        return (
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => navigate("/autoevaluacion")}
          >
            Continuar Autoevaluación ({Math.round(progress)}%)
          </Button>
        );
      default:
        return (
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => navigate("/autoevaluacion")}
          >
            Comenzar Autoevaluación
          </Button>
        );
    }
  };

  const ResultadosSkeleton = () => (
    <Card className="border-primary/20">
      <CardContent className="pt-6 space-y-4 animate-pulse">
        <div className="h-6 w-48 rounded bg-muted" />
        <div className="h-4 w-64 rounded bg-muted" />
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="h-64 flex-1 rounded bg-muted" />
          <div className="flex-1 space-y-3">
            <div className="h-16 rounded bg-muted" />
            <div className="h-16 rounded bg-muted" />
          </div>
        </div>
        <div className="h-48 rounded bg-muted" />
      </CardContent>
    </Card>
  );

  const AutoevaluacionSkeleton = () => (
    <Card className="md:col-span-2">
      <CardContent className="pt-6 space-y-4 animate-pulse">
        <div className="h-6 w-40 rounded bg-muted" />
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-2 w-full rounded bg-muted" />
        <div className="h-12 w-full rounded bg-muted" />
      </CardContent>
    </Card>
  );

  const shouldShowCollaboratorDashboard = (isColaborador || user?.nivel === 'C1' || user?.nivel === 'A1') && !jerarquiaInfo?.tieneColaboradores && !isAdminRRHH && !isAdminGeneral;
  
  // Verificar si se deben mostrar resultados consolidados
  const canShowConsolidatedResults = import.meta.env.VITE_MOSTRAR_RESULTADOS_CONSOLIDADOS === "true";
  const isRestrictedLevel = ["O1", "O2"].includes((user?.nivel || "").toUpperCase());
  const shouldHideResults = !canShowConsolidatedResults || isRestrictedLevel;
  
  const canDisplayResultados = evaluationStatus === "submitted" && resultadoData && (resultadoData.jefeCompleto || user?.nivel === 'C1' || user?.nivel === 'A1') && !shouldHideResults;
  const shouldShowResultadosSkeleton = evaluationStatus === "submitted" && isResultadosLoading;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Bienvenido, {user?.nombre}
          </h2>
          <p className="text-muted-foreground">
            {user?.cargo} • {user?.area}
          </p>
        </div>

        {/* Colaborador Dashboard - Mostrar para colaboradores, C1 (Concejo) y A1 (Alcalde) 
            PERO solo si NO tienen colaboradores asignados (para evitar duplicación) */}
        {shouldShowCollaboratorDashboard && (
          <div className="space-y-6">
            {shouldShowResultadosSkeleton && <ResultadosSkeleton />}
            {/* Mostrar resultados si están disponibles Y el jefe completó (o es C1/A1 que solo tienen autoevaluación) */}
            {canDisplayResultados && (
              <div id="resultados-evaluacion-container">
                {/* Título y Badge */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-foreground">
                      Mis Resultados
                    </h1>
                    <Badge className="bg-success text-success-foreground">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      {resultadoData.jefeCompleto ? "Resultado Consolidado" : "Autoevaluación Enviada"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {resultadoData.jefeCompleto 
                      ? "Resultado consolidado de tu evaluación de desempeño"
                      : user?.nivel === 'C1'
                        ? "Resultado final de tu autoevaluación (Concejo Municipal)"
                        : jefesEvaluacionInfo
                          ? user?.nivel === 'A1'
                            ? `Autoevaluación enviada. ${jefesEvaluacionInfo.jefesCompletados} de ${jefesEvaluacionInfo.totalJefes} miembro(s) del Concejo han completado su evaluación. Esperando a que todos completen para mostrar resultado consolidado.`
                            : `Autoevaluación enviada. ${jefesEvaluacionInfo.jefesCompletados} de ${jefesEvaluacionInfo.totalJefes} jefe(s) han completado su evaluación. Esperando a que todos completen para mostrar resultado consolidado.`
                          : user?.nivel === 'A1'
                            ? "Autoevaluación enviada. Esperando evaluación del Concejo Municipal para resultado consolidado."
                            : "Autoevaluación enviada. Esperando evaluación del jefe para resultado consolidado."}
                  </p>
                </div>

                {/* Mensaje informativo si el jefe no ha completado */}
                {!resultadoData.jefeCompleto && (
                  <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                    <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="text-blue-800 dark:text-blue-200">
                      {user?.nivel === 'C1'
                        ? "Su autoevaluación fue recibida exitosamente. Como miembro del Concejo Municipal, su resultado final está disponible inmediatamente."
                        : jefesEvaluacionInfo
                          ? user?.nivel === 'A1'
                            ? `Su autoevaluación fue recibida exitosamente. ${jefesEvaluacionInfo.jefesCompletados} de ${jefesEvaluacionInfo.totalJefes} miembro(s) del Concejo han completado su evaluación. El resultado consolidado se mostrará cuando todos los miembros del Concejo hayan completado.`
                            : `Su autoevaluación fue recibida exitosamente. ${jefesEvaluacionInfo.jefesCompletados} de ${jefesEvaluacionInfo.totalJefes} jefe(s) han completado su evaluación. El resultado consolidado se mostrará cuando todos los jefes asignados hayan completado.`
                          : user?.nivel === 'A1'
                            ? "Su autoevaluación fue recibida. Cuando el Concejo Municipal complete la evaluación, aquí aparecerá su resultado consolidado."
                            : "Su autoevaluación fue recibida. Cuando su jefe complete la evaluación, aquí aparecerá su resultado consolidado."}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Resumen visual mejorado */}
                <Card className="mb-6 border-2 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row gap-8 items-center">
                      {/* Sección izquierda: Badge y gráfico circular */}
                      <div className="flex flex-col items-center gap-4 lg:w-1/2">
                        <Badge className="bg-success hover:bg-success text-success-foreground px-4 py-2 text-base font-medium">
                          <TrendingUp className="mr-2 h-4 w-4" />
                          Tu desempeño es {getScoreInterpretation(resultadoData.performancePercentage).label}
                        </Badge>
                        
                        <div className="relative w-64 h-64">
                          <svg className="w-full h-full" viewBox="0 0 100 100">
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke="hsl(var(--muted))"
                              strokeWidth="8"
                            />
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke="hsl(var(--primary))"
                              strokeWidth="8"
                              strokeDasharray={`${resultadoData.performancePercentage * 2.513} 251.3`}
                              strokeLinecap="round"
                              transform="rotate(-90 50 50)"
                              className="transition-all duration-1000"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-5xl font-bold text-primary">{resultadoData.performancePercentage}%</div>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-center text-sm text-muted-foreground max-w-md">
                          Con un puntaje global de <strong>{resultadoData.performancePercentage}%</strong>,
                          {resultadoData.performancePercentage >= 75 
                            ? " estás cumpliendo satisfactoriamente con las expectativas del cargo." 
                            : " hay áreas importantes que requieren atención y mejora."}
                        </p>
                      </div>

                      {/* Sección derecha: Tarjetas informativas */}
                      <div className="flex flex-col gap-4 lg:w-1/2">
                        {/* Tu Mayor Fortaleza */}
                        {resultadoData.fortalezas.length > 0 && (
                          <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                            <div className="flex-shrink-0 p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                              <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm mb-1 text-foreground">
                                {getDimensionFriendlyTitle(resultadoData.fortalezas[0].dimensionData)}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {getDimensionFriendlyDescription(resultadoData.fortalezas[0].dimensionData, resultadoData.fortalezas[0].tuEvaluacion)}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Área Prioritaria de Mejora */}
                        {resultadoData.areasOportunidad.length > 0 && (
                          <div className="flex items-start gap-3 p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                            <div className="flex-shrink-0 p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                              <Lightbulb className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm mb-1 text-foreground">
                                Área para Fortalecer
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                <strong>{getDimensionFriendlyTitle(resultadoData.areasOportunidad[0].dimensionData)}:</strong>{" "}
                                {getDimensionFriendlyDescription(resultadoData.areasOportunidad[0].dimensionData, resultadoData.areasOportunidad[0].tuEvaluacion)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Gráfico de Radar */}
                <div className="mb-6" data-radar-chart>
                  <PerformanceRadarAnalysis
                    radarData={resultadoData.radarData.map(d => ({
                      dimension: d.dimension,
                      tuResultado: d.tuEvaluacion,
                      promedioMunicipal: Object.keys(resultadoData.promedioMunicipal).length > 0 ? d.promedioMunicipal : undefined,
                    }))}
                    dimensionAnalysis={resultadoData.radarData.map(d => ({
                      nombre: d.nombreCompleto || d.dimension,
                      descripcion: d.dimensionData?.descripcion,
                      porcentaje: d.tuEvaluacion,
                      isFortaleza: d.tuEvaluacion >= 80,
                      promedioMunicipal: Object.keys(resultadoData.promedioMunicipal).length > 0 ? d.promedioMunicipal : undefined,
                    }))}
                    title="Panorama de Competencias"
                    description={resultadoData.jefeCompleto ? "Vista integral de tu desempeño por dimensión comparado con el promedio municipal" : "Vista de tu autoevaluación por dimensión comparado con el promedio municipal"}
                  />
                </div>

                {/* Plan de Desarrollo - Acciones y Objetivos 
                    Plan generado con IA desde la vista del jefe */}
                {planDesarrollo ? (
                  <div className="space-y-6 mb-6">
                    {!planDesarrollo.planEstructurado ? (
                      <Card className="border-warning">
                        <CardContent className="pt-6">
                          <div className="text-center text-muted-foreground">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-warning" />
                            <p className="font-medium">Plan de desarrollo encontrado pero sin estructura completa.</p>
                            <p className="text-sm mt-2">Contacta a tu jefe para que genere el plan de desarrollo con IA.</p>
                            <p className="text-xs mt-4 text-muted-foreground">
                              Debug: Plan ID: {planDesarrollo.id}, tiene planEstructurado: {planDesarrollo.planEstructurado ? 'Sí' : 'No'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                    {/* Objetivos */}
                    {planDesarrollo.planEstructurado.objetivos && Array.isArray(planDesarrollo.planEstructurado.objetivos) && planDesarrollo.planEstructurado.objetivos.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            Objetivos de Desarrollo
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {planDesarrollo.planEstructurado.objetivos.map((obj: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                                <span>{obj}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Acciones Priorizadas en formato tabla */}
                    {planDesarrollo.planEstructurado.acciones && Array.isArray(planDesarrollo.planEstructurado.acciones) && planDesarrollo.planEstructurado.acciones.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Plan de Acción Detallado</CardTitle>
                          <CardDescription>
                            Acciones concretas con responsables, fechas e indicadores. El color del borde izquierdo indica la dimensión que desarrolla cada acción.
                          </CardDescription>
                          {/* Leyenda de dimensiones - Solo las usadas */}
                          {(() => {
                            const usedDimensions = planDesarrollo.planEstructurado.acciones
                              .map((accion: any) => {
                                const dimension = accion.dimension && accion.dimension.trim()
                                  ? accion.dimension.trim()
                                  : planDesarrollo.planEstructurado.dimensionesDebiles && Array.isArray(planDesarrollo.planEstructurado.dimensionesDebiles)
                                    ? (() => {
                                        const descripcionLower = accion.descripcion.toLowerCase();
                                        let bestMatch: { dimension: string; score: number } | null = null;
                                        planDesarrollo.planEstructurado.dimensionesDebiles.forEach((dim: any) => {
                                          const dimLower = dim.dimension.toLowerCase();
                                          const palabrasDimension = dimLower.split(/\s+/);
                                          let score = 0;
                                          palabrasDimension.forEach((palabra: string) => {
                                            if (palabra.length > 3 && descripcionLower.includes(palabra)) {
                                              score += palabra.length;
                                            }
                                          });
                                          if (score > 0 && (!bestMatch || score > bestMatch.score)) {
                                            bestMatch = { dimension: dim.dimension, score };
                                          }
                                        });
                                        return bestMatch && bestMatch.score > 5 ? bestMatch.dimension : null;
                                      })()
                                    : null;
                                return dimension;
                              })
                              .filter((dim: string | null): dim is string => dim !== null);
                            
                            const uniqueDimensions = Array.from(new Set(usedDimensions))
                              .map((dimName) => {
                                const dimLower = dimName.toLowerCase();
                                let color = '#6b7280';
                                if (dimLower.includes('productividad') || dimLower.includes('cumplimiento') || dimLower.includes('objetivos')) color = '#3b82f6';
                                else if (dimLower.includes('calidad')) color = '#10b981';
                                else if (dimLower.includes('competencia') || dimLower.includes('técnica') || dimLower.includes('laboral')) color = '#f59e0b';
                                else if (dimLower.includes('comportamiento') || dimLower.includes('actitud') || dimLower.includes('organizacional')) color = '#8b5cf6';
                                else if (dimLower.includes('relaciones') || dimLower.includes('equipo') || dimLower.includes('interpersonal')) color = '#ec4899';
                                else if (dimLower.includes('servicio') || dimLower.includes('atención') || dimLower.includes('usuario') || dimLower.includes('orientación')) color = '#06b6d4';
                                else if (dimLower.includes('liderazgo') || dimLower.includes('dirección') || dimLower.includes('coordinación')) color = '#6366f1';
                                else if (dimLower.includes('transparencia') || dimLower.includes('probidad') || dimLower.includes('ética')) color = '#14b8a6';
                                return { name: dimName, color };
                              })
                              .sort((a, b) => a.name.localeCompare(b.name));
                            
                            if (uniqueDimensions.length === 0) return null;
                            
                            return (
                              <div className="mt-4 p-3 bg-muted/50 rounded-md">
                                <p className="text-sm font-semibold mb-2">Leyenda de Dimensiones:</p>
                                <div className={`grid gap-2 text-xs ${uniqueDimensions.length <= 4 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                                  {uniqueDimensions.map((dim, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <div className="w-4 h-4 rounded" style={{ backgroundColor: dim.color }}></div>
                                      <span>{dim.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[50px]">#</TableHead>
                                  <TableHead className="min-w-[300px]">Acción</TableHead>
                                  <TableHead className="w-[120px]">Tipo</TableHead>
                                  <TableHead className="w-[120px]">Prioridad</TableHead>
                                  <TableHead className="w-[140px]">Responsable</TableHead>
                                  <TableHead className="w-[140px]">Fecha</TableHead>
                                  <TableHead className="min-w-[250px]">Indicador</TableHead>
                                  <TableHead className="min-w-[200px]">Recursos</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {planDesarrollo.planEstructurado.acciones
                                  .sort((a: any, b: any) => {
                                    const prioridadOrder = { alta: 1, media: 2, baja: 3 };
                                    return (prioridadOrder[a.prioridad] || 99) - (prioridadOrder[b.prioridad] || 99);
                                  })
                                  .map((accion: any, idx: number) => {
                                    // Obtener dimensión de la acción (con fallback si no existe)
                                    const dimension = accion.dimension && accion.dimension.trim()
                                      ? accion.dimension.trim()
                                      : planDesarrollo.planEstructurado.dimensionesDebiles && Array.isArray(planDesarrollo.planEstructurado.dimensionesDebiles)
                                        ? (() => {
                                            const descripcionLower = accion.descripcion.toLowerCase();
                                            let bestMatch: { dimension: string; score: number } | null = null;
                                            planDesarrollo.planEstructurado.dimensionesDebiles.forEach((dim: any) => {
                                              const dimLower = dim.dimension.toLowerCase();
                                              const palabrasDimension = dimLower.split(/\s+/);
                                              let score = 0;
                                              palabrasDimension.forEach((palabra: string) => {
                                                if (palabra.length > 3 && descripcionLower.includes(palabra)) {
                                                  score += palabra.length;
                                                }
                                              });
                                              if (score > 0 && (!bestMatch || score > bestMatch.score)) {
                                                bestMatch = { dimension: dim.dimension, score };
                                              }
                                            });
                                            return bestMatch && bestMatch.score > 5 ? bestMatch.dimension : null;
                                          })()
                                        : null;
                                    const dimensionColor = dimension
                                      ? (() => {
                                          const dimLower = dimension.toLowerCase();
                                          if (dimLower.includes('productividad') || dimLower.includes('cumplimiento') || dimLower.includes('objetivos')) return '#3b82f6';
                                          if (dimLower.includes('calidad')) return '#10b981';
                                          if (dimLower.includes('competencia') || dimLower.includes('técnica') || dimLower.includes('laboral')) return '#f59e0b';
                                          if (dimLower.includes('comportamiento') || dimLower.includes('actitud') || dimLower.includes('organizacional')) return '#8b5cf6';
                                          if (dimLower.includes('relaciones') || dimLower.includes('equipo') || dimLower.includes('interpersonal')) return '#ec4899';
                                          if (dimLower.includes('servicio') || dimLower.includes('atención') || dimLower.includes('usuario') || dimLower.includes('orientación')) return '#06b6d4';
                                          if (dimLower.includes('liderazgo') || dimLower.includes('dirección') || dimLower.includes('coordinación')) return '#6366f1';
                                          if (dimLower.includes('transparencia') || dimLower.includes('probidad') || dimLower.includes('ética')) return '#14b8a6';
                                          return '#6b7280';
                                        })()
                                      : null;
                                    
                                    return (
                                      <TableRow 
                                        key={idx}
                                        style={dimension ? { borderLeft: `4px solid ${dimensionColor}` } : {}}
                                      >
                                        <TableCell className="font-medium text-center">
                                          {idx + 1}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                          <div>
                                            {accion.descripcion}
                                            {dimension && (
                                              <Badge variant="outline" className="ml-2 text-xs" style={{ borderColor: dimensionColor, color: dimensionColor }}>
                                                {dimension}
                                              </Badge>
                                            )}
                                          </div>
                                        </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                          {accion.tipoAprendizaje === "experiencia" ? "🔄 Experiencia" : accion.tipoAprendizaje === "social" ? "👥 Social" : accion.tipoAprendizaje === "formal" ? "📚 Formal" : "N/A"}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <Badge 
                                          variant={accion.prioridad === "alta" ? "destructive" : accion.prioridad === "media" ? "default" : "secondary"}
                                          className="text-xs"
                                        >
                                          {accion.prioridad === "alta" ? "🔴 Alta" : accion.prioridad === "media" ? "🟡 Media" : "🟢 Baja"}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-sm">
                                        {accion.responsable}
                                      </TableCell>
                                      <TableCell className="text-sm">
                                        {accion.fecha}
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground">
                                        {accion.indicador}
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground">
                                        {accion.recursos && accion.recursos.length > 0 
                                          ? accion.recursos.join(", ")
                                          : "N/A"
                                        }
                                      </TableCell>
                                    </TableRow>
                                    );
                                  })}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Secciones eliminadas: Dimensiones que Requieren Atención y Recomendaciones Generales */}
                    {/* La información ahora se muestra en la tabla de acciones con indicador visual por dimensión */}
                      </>
                    )}
                  </div>
                ) : (
                  <Card className="border-muted mb-6">
                    <CardContent className="pt-6">
                      <div className="text-center text-muted-foreground">
                        <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="font-medium">No hay plan de desarrollo disponible</p>
                        <p className="text-sm mt-2">Tu jefe generará tu plan de desarrollo con IA después de completar tu evaluación.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Botones de acción */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Botón para ver detalle de respuestas */}
                  <Card className="border-primary/20">
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center gap-4 text-center">
                        <div className="p-3 rounded-xl bg-primary/10">
                          <Target className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Ver Detalle de Respuestas</h3>
                          <p className="text-sm text-muted-foreground">
                            Revisa todas tus respuestas por cada dimensión evaluada
                          </p>
                        </div>
                        <Button 
                          onClick={() => navigate("/mis-respuestas-detalle")}
                          className="w-full"
                          variant="outline"
                        >
                          Ver Detalle Completo
                          <Target className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Botón para exportar a PDF */}
                  <Card className="border-green-200 dark:border-green-800">
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center gap-4 text-center">
                        <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/20">
                          <FileDown className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Exportar Evaluación</h3>
                          <p className="text-sm text-muted-foreground">
                            Descarga tu evaluación completa en formato PDF
                          </p>
                        </div>
                        <Button 
                          onClick={async () => {
                            if (!resultadoData) {
                              toast({
                                title: "Error",
                                description: "No hay datos disponibles para exportar",
                                variant: "destructive"
                              });
                              return;
                            }
                            try {
                              await exportEvaluacionCompletaPDFReact(
                                {
                                  nombre: user?.nombre || "N/A",
                                  apellidos: user?.apellidos,
                                  dpi: user?.dpi,
                                  cargo: user?.cargo,
                                  area: user?.area,
                                  nivel: user?.nivel,
                                  direccionUnidad: user?.direccionUnidad,
                                  departamentoDependencia: user?.departamentoDependencia,
                                  profesion: user?.profesion,
                                  correo: user?.correo,
                                  telefono: user?.telefono
                                },
                                activePeriod?.nombre || "N/A",
                                new Date(),
                                {
                                  performancePercentage: resultadoData.performancePercentage,
                                  jefeCompleto: resultadoData.jefeCompleto,
                                  fortalezas: resultadoData.fortalezas.map(f => ({
                                    dimension: f.dimension,
                                    nombreCompleto: f.nombreCompleto,
                                    tuEvaluacion: f.tuEvaluacion,
                                    promedioMunicipal: f.promedioMunicipal
                                  })),
                                  areasOportunidad: resultadoData.areasOportunidad.map(a => ({
                                    dimension: a.dimension,
                                    nombreCompleto: a.nombreCompleto,
                                    tuEvaluacion: a.tuEvaluacion,
                                    promedioMunicipal: a.promedioMunicipal
                                  })),
                                  radarData: resultadoData.radarData.map(r => ({
                                    dimension: r.dimension,
                                    tuEvaluacion: r.tuEvaluacion,
                                    promedioMunicipal: r.promedioMunicipal,
                                    dimensionId: r.dimensionData?.id,
                                    descripcion: r.dimensionData?.descripcion
                                  }))
                                },
                                planDesarrollo
                              );
                            } catch (error) {
                              console.error("Error al exportar:", error);
                              // El toast de error ya se maneja en la función
                            }
                          }}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <FileDown className="mr-2 h-4 w-4" />
                          Exportar a PDF
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Mostrar mensaje si autoevaluación enviada pero jefe no completó O si los resultados están ocultos (excepto C1 que ya tiene resultados) */}
            {!isStatusLoading && evaluationStatus === "submitted" && (!resultadoData || (!resultadoData.jefeCompleto && user?.nivel !== 'C1') || shouldHideResults) && (
              <Card className="md:col-span-2 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Autoevaluación Enviada
                  </CardTitle>
                  <CardDescription>
                    {shouldHideResults 
                      ? (isRestrictedLevel 
                          ? "Su autoevaluación ha sido recibida exitosamente. Los colaboradores con nivel O1 y O2 verán su resultado consolidado más adelante."
                          : "Su autoevaluación ha sido recibida exitosamente. Los resultados consolidados aún no están disponibles.")
                      : jefesEvaluacionInfo
                        ? user?.nivel === 'A1'
                          ? `Su autoevaluación ha sido recibida exitosamente. ${jefesEvaluacionInfo.jefesCompletados} de ${jefesEvaluacionInfo.totalJefes} miembro(s) del Concejo han completado su evaluación. ${jefesEvaluacionInfo.totalJefes - jefesEvaluacionInfo.jefesCompletados > 0 ? `Faltan ${jefesEvaluacionInfo.totalJefes - jefesEvaluacionInfo.jefesCompletados} miembro(s) del Concejo por completar.` : ''} Una vez que todos completen, podrá ver su resultado consolidado aquí.`
                          : `Su autoevaluación ha sido recibida exitosamente. ${jefesEvaluacionInfo.jefesCompletados} de ${jefesEvaluacionInfo.totalJefes} jefe(s) han completado su evaluación. ${jefesEvaluacionInfo.totalJefes - jefesEvaluacionInfo.jefesCompletados > 0 ? `Faltan ${jefesEvaluacionInfo.totalJefes - jefesEvaluacionInfo.jefesCompletados} jefe(s) por completar.` : ''} Una vez que todos completen, podrá ver su resultado consolidado aquí.`
                        : user?.nivel === 'A1'
                          ? "Su autoevaluación ha sido recibida exitosamente. El resultado consolidado se mostrará cuando el Concejo Municipal complete la evaluación."
                          : "Su autoevaluación ha sido recibida exitosamente"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                    <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="text-blue-800 dark:text-blue-200">
                      {shouldHideResults ? (
                        <>
                          <strong>Su autoevaluación fue enviada correctamente.</strong>{" "}
                          {isRestrictedLevel 
                            ? "Los colaboradores con nivel O1 y O2 verán su resultado consolidado más adelante. Le avisaremos cuando esté disponible."
                            : "Los resultados consolidados aún no están disponibles. Le avisaremos cuando puedan consultarlos."}
                        </>
                      ) : user?.nivel === 'C1' ? (
                        <>
                          <strong>Su autoevaluación fue enviada correctamente.</strong> Como miembro del Concejo Municipal, 
                          su resultado final ya está disponible. Puede ver su gráfico radar, fortalezas y áreas de mejora 
                          en la sección de resultados.
                        </>
                      ) : (
                        <>
                          <strong>Su autoevaluación fue enviada correctamente.</strong>{" "}
                          {jefesEvaluacionInfo ? (
                            <>
                              {user?.nivel === 'A1' ? (
                                <>
                                  {jefesEvaluacionInfo.jefesCompletados} de {jefesEvaluacionInfo.totalJefes} miembro(s) del Concejo han completado su evaluación.
                                  {jefesEvaluacionInfo.totalJefes - jefesEvaluacionInfo.jefesCompletados > 0 && (
                                    <> Faltan {jefesEvaluacionInfo.totalJefes - jefesEvaluacionInfo.jefesCompletados} miembro(s) del Concejo por completar.</>
                                  )}
                                </>
                              ) : (
                                <>
                                  {jefesEvaluacionInfo.jefesCompletados} de {jefesEvaluacionInfo.totalJefes} jefe(s) han completado su evaluación.
                                  {jefesEvaluacionInfo.totalJefes - jefesEvaluacionInfo.jefesCompletados > 0 && (
                                    <> Faltan {jefesEvaluacionInfo.totalJefes - jefesEvaluacionInfo.jefesCompletados} jefe(s) por completar.</>
                                  )}
                                </>
                              )}
                              {" "}Una vez que todos completen, aquí aparecerá su resultado consolidado con el gráfico radar, fortalezas y áreas de mejora.
                            </>
                          ) : (
                            user?.nivel === 'A1'
                              ? "Cuando el Concejo Municipal complete la evaluación, aquí aparecerá su resultado consolidado con el gráfico radar, fortalezas y áreas de mejora."
                              : "Cuando su jefe complete la evaluación, aquí aparecerá su resultado consolidado con el gráfico radar, fortalezas y áreas de mejora."
                          )}
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                  <div className="flex items-center justify-center p-4">
                    <Badge className="bg-success text-success-foreground px-4 py-2 text-base">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Autoevaluación Completada
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mostrar formulario o mensaje si no está completada */}
            {!isStatusLoading && evaluationStatus !== "submitted" && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                    Mi Autoevaluación
                  </CardTitle>
                  <CardDescription>
                    Complete su evaluación de desempeño
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Periodo: {activePeriod?.nombre || 'Cargando...'}</p>
                      <p className="text-sm text-muted-foreground">
                        Fecha límite: {activePeriod ? new Date(activePeriod.fechaCierreAutoevaluacion).toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                      </p>
                    </div>
                    {getStatusBadge()}
                  </div>
                  
                  {evaluationStatus === "in_progress" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progreso</span>
                        <span className="font-medium">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  {getActionButton()}
                </CardContent>
              </Card>
            )}
            {isStatusLoading && <AutoevaluacionSkeleton />}
          </div>
        )}

        {/* Jefe Dashboard - Mostrar para jefes que tienen colaboradores asignados */}
        {(isJefe || jerarquiaInfo?.tieneColaboradores) && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Autoevaluación del jefe */}
            {(jerarquiaInfo?.tieneJefeSuperior || true) && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                    Mi Autoevaluación
                  </CardTitle>
                  <CardDescription>
                    Complete su evaluación de desempeño
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Periodo: {activePeriod?.nombre || 'Cargando...'}</p>
                    </div>
                    {getStatusBadge()}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progreso</span>
                      <span className="font-medium">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  {getActionButton()}
                </CardContent>
              </Card>
            )}

            {/* Equipo de colaboradores directos */}
            {jerarquiaInfo?.tieneColaboradores && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Mi Equipo
                  </CardTitle>
                  <CardDescription>
                    Evaluaciones pendientes y completadas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border bg-card p-4 text-center">
                      <p className="text-3xl font-bold text-primary">{jerarquiaInfo?.totalColaboradores || 0}</p>
                      <p className="text-sm text-muted-foreground">Total Colaboradores</p>
                    </div>
                    <div className="rounded-lg border bg-card p-4 text-center">
                      <p className="text-3xl font-bold text-warning">{equipoEvaluaciones.pendientes}</p>
                      <p className="text-sm text-muted-foreground">Pendientes</p>
                    </div>
                    <div className="rounded-lg border bg-card p-4 text-center">
                      <p className="text-3xl font-bold text-success">{equipoEvaluaciones.completadas}</p>
                      <p className="text-sm text-muted-foreground">Completadas</p>
                    </div>
                  </div>
                  
                  <div className="grid gap-3 md:grid-cols-2">
                    <Button className="w-full" size="lg" onClick={() => navigate("/evaluacion-equipo")}>
                      <Users className="mr-2 h-4 w-4" />
                      Evaluar Mi Equipo
                    </Button>
                    <Button className="w-full" size="lg" variant="outline" onClick={() => navigate("/matriz-9box")}>
                      <Grid3x3 className="mr-2 h-4 w-4" />
                      Matriz 9-Box
                    </Button>
                  </div>
                  {/* Botón para Dashboard Consolidado - Siempre visible para jefes */}
                  <Button 
                    className="w-full mt-3" 
                    size="lg" 
                    variant="default"
                    onClick={() => navigate("/dashboard-consolidado")}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Dashboard Consolidado
                  </Button>
              </CardContent>
            </Card>
            )}

            {/* Dashboard Consolidado - Siempre visible para jefes */}
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-accent" />
                  Dashboard Consolidado
                </CardTitle>
                <CardDescription>
                  Vista consolidada de toda su jerarquía organizacional y equipos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 rounded-lg border bg-card">
                    <p className="text-sm text-muted-foreground mb-1">Total Colaboradores Directos</p>
                    <p className="text-2xl font-bold text-primary">{jerarquiaInfo?.totalColaboradores || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <p className="text-sm text-muted-foreground mb-1">Jefes Subordinados</p>
                    <p className="text-2xl font-bold text-info">{jerarquiaInfo?.totalJefesSubordinados || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <p className="text-sm text-muted-foreground mb-1">Posición</p>
                    <p className="text-lg font-bold text-accent">
                      {jerarquiaInfo?.esJefeIntermedio ? 'Jefe Intermedio' : 
                       jerarquiaInfo?.esJefeSinJefe ? 'Jefe Superior' : 'Jefe'}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="default" 
                  className="w-full mt-4" 
                  size="lg"
                  onClick={() => navigate("/dashboard-consolidado")}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Ver Dashboard Consolidado Completo
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Admin RR.HH. Dashboard */}
        {isAdminRRHH && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">
                  {dashboardStats?.totalUsuarios || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Activos en el sistema</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Evaluaciones Completadas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-success">
                  {dashboardStats?.evaluacionesCompletadas || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {dashboardStats?.porcentajeCompletitud || 0}% del total
                </p>
                <Progress value={dashboardStats?.porcentajeCompletitud || 0} className="mt-2 h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-warning">
                  {dashboardStats?.evaluacionesPendientes || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Sin iniciar</p>
              </CardContent>
            </Card>

            {dashboardStats?.evaluacionesEnProgreso > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-info">
                    {dashboardStats?.evaluacionesEnProgreso || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Requieren seguimiento</p>
                </CardContent>
              </Card>
            )}

            {dashboardStats?.reaperturas > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Reaperturas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-info">
                    {dashboardStats?.reaperturas || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Este período</p>
                </CardContent>
              </Card>
            )}

            <Card className="md:col-span-2 lg:col-span-4">
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => navigate("/admin/personal")}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Análisis de Personal
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => navigate("/admin/usuarios")}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Gestión de Usuarios
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => navigate("/matriz-9box")}
                  >
                    <Grid3x3 className="mr-2 h-4 w-4" />
                    Matriz 9-Box
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => navigate("/admin/grupos")}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Grupos/Cuadrillas
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => navigate("/admin/asignaciones")}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Asignaciones
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => navigate("/admin/dashboard")}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Monitoreo
                  </Button>
                  {isAdminGeneral && (
                    <>
                      <Button
                        variant="outline"
                        className="justify-start"
                        onClick={() => navigate("/admin/supabase-utils")}
                      >
                        <Database className="mr-2 h-4 w-4" />
                        Estado Base de Datos
                      </Button>
                      <Button
                        variant="outline"
                        className="justify-start"
                        onClick={() => navigate("/admin/configuracion")}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Configuración Sistema
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      toast({
                        title: "Reportes Completos",
                        description: "Accede al Dashboard de Monitoreo para reportes detallados y exportación.",
                      });
                      navigate("/admin/dashboard");
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Exportar Datos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Admin General Dashboard */}
        {isAdminGeneral && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Periodos Activos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">1</p>
                  <p className="text-xs text-muted-foreground mt-1">{activePeriod?.nombre || 'Sin período'} en curso</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Instrumentos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-accent">11</p>
                  <p className="text-xs text-muted-foreground mt-1">Por nivel de puesto</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Cobertura</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-success">100%</p>
                  <p className="text-xs text-muted-foreground mt-1">Todos los niveles</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Avance Global</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-info">36%</p>
                  <p className="text-xs text-muted-foreground mt-1">Del periodo actual</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Administración del Sistema</CardTitle>
                <CardDescription>Configuración y gestión global</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <Button
                    variant="outline"
                    className="justify-start h-auto py-4"
                    onClick={() => navigate("/matriz-9box")}
                  >
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2">
                        <Grid3x3 className="h-4 w-4" />
                        <span className="font-medium">Matriz 9-Box</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Análisis de talento</span>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="justify-start h-auto py-4"
                    onClick={() => navigate("/admin/periodos")}
                  >
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        <span className="font-medium">Periodos</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Crear y gestionar periodos</span>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="justify-start h-auto py-4"
                    onClick={() => navigate("/admin/instrumentos")}
                  >
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">Instrumentos</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Editar evaluaciones</span>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="justify-start h-auto py-4"
                    onClick={() => navigate("/admin/usuarios")}
                  >
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">Usuarios</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Gestión completa</span>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="justify-start h-auto py-4"
                    onClick={() => navigate("/admin/dashboard")}
                  >
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        <span className="font-medium">Analítica</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Dashboard avanzado</span>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="justify-start h-auto py-4">
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">Auditoría</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Registro de cambios</span>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="justify-start h-auto py-4">
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">Exportaciones</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Reportes globales</span>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
