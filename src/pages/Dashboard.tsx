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
  Grid3x3
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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

// Helper para calcular respuestas consolidadas (70% jefe + 30% auto)
const calculateConsolidatedResponses = (
  autoResponses: Record<string, number>,
  jefeResponses: Record<string, number>
): Record<string, number> => {
  const consolidated: Record<string, number> = {};
  
  const allItemIds = new Set([
    ...Object.keys(autoResponses),
    ...Object.keys(jefeResponses)
  ]);
  
  allItemIds.forEach((itemId) => {
    const autoValue = autoResponses[itemId] || 0;
    const jefeValue = jefeResponses[itemId] || 0;
    
    if (autoResponses[itemId] !== undefined && jefeResponses[itemId] !== undefined) {
      consolidated[itemId] = Math.round((jefeValue * 0.7 + autoValue * 0.3) * 100) / 100;
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
  const { activePeriodId, activePeriod } = usePeriod();

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

  const isColaborador = user?.rol === "colaborador";
  const isJefe = user?.rol === "jefe";
  const isAdminRRHH = user?.rol === "admin_rrhh";
  const isAdminGeneral = user?.rol === "admin_general";

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

    const checkStatus = async () => {
      // Check evaluation status con período activo real
      const isSubmitted = await hasSubmittedEvaluation(user.dpi, activePeriodId);
      if (isSubmitted) {
        setEvaluationStatus("submitted");
        setProgress(100);
        
        // Cargar datos de resultados si está enviada
        // IMPORTANTE: Para C1 (Concejo Municipal) y A1 (Alcalde), cargar resultados inmediatamente ya que solo tienen autoevaluación
        // Para otros niveles, solo cargar resultados si el jefe completó su evaluación
        if (user.nivel === 'C1' || user.nivel === 'A1') {
          // C1 y A1 solo tienen autoevaluación, cargar resultados inmediatamente
          await loadResultadosData();
        } else if (isColaborador) {
          const jefeId = await getColaboradorJefe(user.dpi);
          if (jefeId) {
            const jefeCompleto = await hasJefeEvaluation(jefeId, user.dpi, activePeriodId);
            if (jefeCompleto) {
              await loadResultadosData();
            } else {
              console.log('⏳ [Dashboard] Autoevaluación enviada, pero jefe aún no ha completado. No se mostrarán resultados.');
              setResultadoData(null);
            }
          } else {
            // Si no tiene jefe, cargar resultados de autoevaluación
            await loadResultadosData();
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
    };

    const loadResultadosData = async () => {
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

        const jefeId = await getColaboradorJefe(user.dpi);
        let jefeCompleto = false;
        let responsesToUse = submitted.responses;

        if (jefeId) {
          jefeCompleto = await hasJefeEvaluation(jefeId, user.dpi, activePeriodId);
          console.log('📊 [Dashboard] Estado evaluación jefe:', { jefeId, jefeCompleto });
          if (jefeCompleto) {
            const jefeEval = await getJefeEvaluationDraft(jefeId, user.dpi, activePeriodId);
            if (jefeEval) {
              responsesToUse = calculateConsolidatedResponses(submitted.responses, jefeEval.responses);
              console.log('✅ [Dashboard] Usando respuestas consolidadas:', { 
                autoCount: Object.keys(submitted.responses).length,
                jefeCount: Object.keys(jefeEval.responses).length,
                consolidadasCount: Object.keys(responsesToUse).length
              });
            }
          }
        }

        console.log('📊 [Dashboard] Respuestas a usar:', { 
          count: Object.keys(responsesToUse).length,
          sample: Object.entries(responsesToUse).slice(0, 5)
        });

        const performanceScore = calculatePerformanceScore(responsesToUse, instrument.dimensionesDesempeno);
        const performancePercentage = scoreToPercentage(performanceScore);
        console.log('📊 [Dashboard] Score calculado:', { performanceScore, performancePercentage });

        // Primero generar todos los títulos para detectar duplicados
        const titulosGenerados: string[] = [];
        const radarData = instrument.dimensionesDesempeno.map((dim, idx) => {
          const promedio = calculateDimensionAverage(responsesToUse, dim);
          const porcentaje = calculateDimensionPercentage(responsesToUse, dim);
          
          // Log detallado para cada dimensión
          const itemIds = dim.items.map(item => item.id);
          const itemValues = itemIds.map(id => responsesToUse[id]).filter(v => v !== undefined);
          console.log(`📊 [Dashboard] Dimensión ${idx + 1} (${dim.nombre}):`, {
            id: dim.id,
            itemsCount: dim.items.length,
            itemIds: itemIds,
            itemValues: itemValues,
            promedio: promedio,
            porcentaje: porcentaje,
            verificado: `Promedio ${promedio} → Porcentaje ${porcentaje}%`,
            conversion: `scoreToPercentage(${promedio}) = ${porcentaje}`
          });
          
          // Log adicional para verificar la conversión
          if (porcentaje < 0 || porcentaje > 100) {
            console.error(`❌ [Dashboard] ERROR: Porcentaje fuera de rango para ${dim.nombre}:`, {
              promedio,
              porcentaje,
              esperado: '0-100'
            });
          }
          
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

        // Calcular promedio municipal de resultados finales consolidados SOLO para el mismo nivel de puesto
        let promedioMunicipal: Record<string, number> = {};
        try {
          // Primero obtener los DPIs de colaboradores del mismo nivel
          const { data: usuariosMismoNivel } = await supabase
            .from('users')
            .select('dpi')
            .eq('nivel', user.nivel)
            .eq('estado', 'activo')
            .in('rol', ['colaborador', 'jefe']);

          const dpisMismoNivel = usuariosMismoNivel?.map(u => u.dpi) || [];
          
          console.log('📊 [Dashboard] Calculando promedio municipal para nivel:', {
            nivel: user.nivel,
            totalUsuariosMismoNivel: dpisMismoNivel.length
          });

          if (dpisMismoNivel.length > 0) {
            // Usar vista consolidada para obtener resultados con múltiples evaluadores
            const { data: finalResults } = await supabase
              .from('final_evaluation_results_consolidated')
              .select('colaborador_id, desempeno_final_promedio')
              .eq('periodo_id', activePeriodId)
              .in('colaborador_id', dpisMismoNivel); // Filtrar solo mismo nivel

            console.log('📊 [Dashboard] Resultados consolidados encontrados para mismo nivel:', finalResults?.length || 0);

            if (finalResults && finalResults.length > 0) {
              // Obtener autoevaluaciones para calcular promedios por dimensión
              const { data: autoEvals } = await supabase
                .from('evaluations')
                .select('id, responses, usuario_id')
                .eq('periodo_id', activePeriodId)
                .eq('tipo', 'auto')
                .eq('estado', 'enviado')
                .in('usuario_id', dpisMismoNivel);

              const autoEvalMap = new Map((autoEvals || []).map(e => [e.usuario_id, (e.responses as Record<string, number>) || {}]));

              instrument.dimensionesDesempeno.forEach((dim) => {
                let sumaPorcentajes = 0;
                let contador = 0;

                finalResults.forEach((resultado) => {
                  const autoResponses = autoEvalMap.get(resultado.colaborador_id) || {};
                  
                  // Para resultados consolidados, usar el desempeño promedio directamente
                  if (resultado.desempeno_final_promedio) {
                    // Usar el promedio consolidado directamente
                    const porcentaje = scoreToPercentage(resultado.desempeno_final_promedio);
                    if (porcentaje > 0) {
                      sumaPorcentajes += porcentaje;
                      contador++;
                    }
                  } else {
                    // Fallback: calcular desde autoevaluación si no hay promedio consolidado
                    const porcentaje = calculateDimensionPercentage(autoResponses, dim);
                    if (porcentaje > 0) {
                      sumaPorcentajes += porcentaje;
                      contador++;
                    }
                  }
                });

                promedioMunicipal[dim.id] = contador > 0 ? Math.round(sumaPorcentajes / contador) : 0;
              });

              console.log('📊 [Dashboard] Promedio municipal calculado:', promedioMunicipal);
            } else {
              console.warn('⚠️ [Dashboard] No se encontraron resultados finales para calcular promedio municipal');
            }
          } else {
            console.warn('⚠️ [Dashboard] No se encontraron usuarios del mismo nivel para calcular promedio');
          }
        } catch (error) {
          console.error('❌ Error calculando promedio municipal:', error);
        }

        // Agregar promedio municipal a radarData
        const radarDataWithPromedio = radarData.map(d => ({
          ...d,
          promedioMunicipal: promedioMunicipal[d.dimensionData.id] || 0
        }));

        console.log('📊 [Dashboard] RadarData final con promedios:', radarDataWithPromedio);

        setResultadoData({
          performancePercentage,
          jefeCompleto,
          fortalezas,
          areasOportunidad,
          instrument,
          radarData: radarDataWithPromedio,
          promedioMunicipal
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

  const getStatusBadge = () => {
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
    switch (evaluationStatus) {
      case "submitted":
        return (
          <Button 
            className="w-full" 
            size="lg"
            variant="outline"
            onClick={() => navigate("/mi-autoevaluacion")}
          >
            Ver Mis Resultados
          </Button>
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

        {/* Colaborador Dashboard - Mostrar para colaboradores, C1 (Concejo) y A1 (Alcalde) */}
        {(isColaborador || user?.nivel === 'C1' || user?.nivel === 'A1') && (
          <div className="space-y-6">
            {/* Mostrar resultados si están disponibles Y el jefe completó (o es C1/A1 que solo tienen autoevaluación) */}
            {evaluationStatus === "submitted" && resultadoData && (resultadoData.jefeCompleto || user?.nivel === 'C1' || user?.nivel === 'A1') && (
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
                        : user?.nivel === 'A1'
                          ? "Resultado final de tu autoevaluación (Alcalde Municipal)"
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
                        : user?.nivel === 'A1'
                          ? "Su autoevaluación fue recibida exitosamente. Como Alcalde Municipal, su resultado final está disponible inmediatamente."
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
                            Acciones concretas con responsables, fechas e indicadores
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[50px]">#</TableHead>
                                  <TableHead className="min-w-[300px]">Acción</TableHead>
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
                                  .map((accion: any, idx: number) => (
                                    <TableRow key={idx}>
                                      <TableCell className="font-medium text-center">
                                        {idx + 1}
                                      </TableCell>
                                      <TableCell className="font-medium">
                                        {accion.descripcion}
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
                                  ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Dimensiones que Requieren Atención */}
                    {planDesarrollo.planEstructurado.dimensionesDebiles && Array.isArray(planDesarrollo.planEstructurado.dimensionesDebiles) && planDesarrollo.planEstructurado.dimensionesDebiles.length > 0 && (
                      <Card className="border-warning">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-warning" />
                            Dimensiones que Requieren Atención
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {planDesarrollo.planEstructurado.dimensionesDebiles.map((dim: any, idx: number) => (
                              <div key={idx} className="border-l-4 border-warning pl-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold">{dim.dimension}</h4>
                                  <Badge variant="outline">
                                    Score: {dim.score?.toFixed(2) || "N/A"}/5.0 ({dim.score ? ((dim.score / 5) * 100).toFixed(0) : "N/A"}%)
                                  </Badge>
                                </div>
                                <ul className="space-y-1 text-sm">
                                  {dim.accionesEspecificas && Array.isArray(dim.accionesEspecificas) && dim.accionesEspecificas.map((accion: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span className="text-warning mt-1">•</span>
                                      <span>{accion}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Recomendaciones */}
                    {planDesarrollo.recomendaciones && Array.isArray(planDesarrollo.recomendaciones) && planDesarrollo.recomendaciones.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Recomendaciones Generales</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {planDesarrollo.recomendaciones.map((rec: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-primary mt-1">→</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
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

            {/* Mostrar mensaje si autoevaluación enviada pero jefe no completó (excepto C1 que ya tiene resultados) */}
            {evaluationStatus === "submitted" && (!resultadoData || (!resultadoData.jefeCompleto && user?.nivel !== 'C1')) && (
              <Card className="md:col-span-2 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Autoevaluación Enviada
                  </CardTitle>
                  <CardDescription>
                    Su autoevaluación ha sido recibida exitosamente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                    <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="text-blue-800 dark:text-blue-200">
                      {user?.nivel === 'C1' ? (
                        <>
                          <strong>Su autoevaluación fue enviada correctamente.</strong> Como miembro del Concejo Municipal, 
                          su resultado final ya está disponible. Puede ver su gráfico radar, fortalezas y áreas de mejora 
                          en la sección de resultados.
                        </>
                      ) : (
                        <>
                          <strong>Su autoevaluación fue enviada correctamente.</strong> Cuando su jefe complete la evaluación, 
                          aquí aparecerá su resultado consolidado con el gráfico radar, fortalezas y áreas de mejora.
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
            {evaluationStatus !== "submitted" && (
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
                      <p className="text-3xl font-bold text-warning">-</p>
                      <p className="text-sm text-muted-foreground">Pendientes</p>
                    </div>
                    <div className="rounded-lg border bg-card p-4 text-center">
                      <p className="text-3xl font-bold text-success">-</p>
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
              </CardContent>
            </Card>
            )}

            {/* Dashboard Consolidado (si tiene jefes subordinados O colaboradores) */}
            {(jerarquiaInfo?.tieneJefesSubordinados || jerarquiaInfo?.tieneColaboradores) && (
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
                    variant="outline" 
                    className="w-full mt-4" 
                    onClick={() => navigate("/dashboard-consolidado")}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Ver Dashboard Consolidado Completo
                  </Button>
                </CardContent>
              </Card>
            )}
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
