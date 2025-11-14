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
  Database
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
import { exportEvaluacionCompletaPDF, exportEvaluacionCompletaPDFFromElement } from "@/lib/exports";

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
  if (nombre.includes("competencias laborales") && nombre.includes("técnica")) return "Competencias Laborales";
  if (nombre.includes("comportamiento") && nombre.includes("organizacional")) return "Comportamiento Organizacional";
  if (nombre.includes("relaciones interpersonales") || nombre.includes("trabajo en equipo")) return "Relaciones Interpersonales";
  if (nombre.includes("orientación al servicio") || nombre.includes("atención al usuario")) return "Orientación al Servicio";
  if (nombre.includes("calidad del trabajo")) return "Calidad del Trabajo";
  if (nombre.includes("productividad") || nombre.includes("cumplimiento")) return "Productividad";
  if (nombre.includes("liderazgo") || nombre.includes("dirección")) return "Tu Liderazgo";
  if (nombre.includes("ciudadan") || nombre.includes("servicio")) return "Tu Servicio al Ciudadano";
  if (nombre.includes("gestión") && nombre.includes("resultado")) return "Tus Resultados";
  if (nombre.includes("transparencia") || nombre.includes("ética")) return "Tu Ética y Transparencia";
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

  const isColaborador = user?.rol === "colaborador";
  const isJefe = user?.rol === "jefe";
  const isAdminRRHH = user?.rol === "admin_rrhh";
  const isAdminGeneral = user?.rol === "admin_general";

  useEffect(() => {
    if (!user || !activePeriodId) return;

    const checkStatus = async () => {
      // Check evaluation status con período activo real
      const isSubmitted = await hasSubmittedEvaluation(user.dpi, activePeriodId);
      if (isSubmitted) {
        setEvaluationStatus("submitted");
        setProgress(100);
        
        // Cargar datos de resultados si está enviada
        if (isColaborador) {
          await loadResultadosData();
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
        const instrument = await getInstrumentForUser(user.nivel);
        if (!instrument) return;

        const submitted = await getSubmittedEvaluation(user.dpi, activePeriodId);
        if (!submitted) return;

        const jefeId = await getColaboradorJefe(user.dpi);
        let jefeCompleto = false;
        let responsesToUse = submitted.responses;

        if (jefeId) {
          jefeCompleto = await hasJefeEvaluation(jefeId, user.dpi, activePeriodId);
          if (jefeCompleto) {
            const jefeEval = await getJefeEvaluationDraft(jefeId, user.dpi, activePeriodId);
            if (jefeEval) {
              responsesToUse = calculateConsolidatedResponses(submitted.responses, jefeEval.responses);
            }
          }
        }

        const performanceScore = calculatePerformanceScore(responsesToUse, instrument.dimensionesDesempeno);
        const performancePercentage = scoreToPercentage(performanceScore);

        const radarData = instrument.dimensionesDesempeno.map((dim, idx) => ({
          dimension: getDimensionFriendlyTitle(dim),
          nombreCompleto: dim.nombre,
          numero: idx + 1,
          tuEvaluacion: calculateDimensionPercentage(responsesToUse, dim),
          puntaje: calculateDimensionAverage(responsesToUse, dim),
          dimensionData: dim
        }));

        const sortedDimensions = [...radarData].sort((a, b) => b.tuEvaluacion - a.tuEvaluacion);
        const fortalezas = sortedDimensions.slice(0, 3);
        const areasOportunidad = sortedDimensions.slice(-3).reverse();

        // Calcular promedio municipal de resultados finales consolidados
        let promedioMunicipal: Record<string, number> = {};
        try {
          const { data: finalResults } = await supabase
            .from('final_evaluation_results')
            .select('colaborador_id, resultado_final, autoevaluacion_id, evaluacion_jefe_id')
            .eq('periodo_id', activePeriodId);

          if (finalResults && finalResults.length > 0) {
            const autoevaluacionIds = finalResults.map(r => r.autoevaluacion_id).filter(id => id);
            const jefeEvaluacionIds = finalResults.map(r => r.evaluacion_jefe_id).filter(id => id);
            
            const { data: autoEvals } = await supabase
              .from('evaluations')
              .select('id, responses')
              .in('id', autoevaluacionIds)
              .eq('tipo', 'auto');

            const { data: jefeEvals } = await supabase
              .from('evaluations')
              .select('id, responses')
              .in('id', jefeEvaluacionIds)
              .eq('tipo', 'jefe');

            const autoEvalMap = new Map((autoEvals || []).map(e => [e.id, (e.responses as Record<string, number>) || {}]));
            const jefeEvalMap = new Map((jefeEvals || []).map(e => [e.id, (e.responses as Record<string, number>) || {}]));

            instrument.dimensionesDesempeno.forEach((dim) => {
              let sumaPorcentajes = 0;
              let contador = 0;

              finalResults.forEach((resultado) => {
                const autoResponses = autoEvalMap.get(resultado.autoevaluacion_id) || {};
                const jefeResponses = jefeEvalMap.get(resultado.evaluacion_jefe_id) || {};
                const consolidadas = calculateConsolidatedResponses(autoResponses, jefeResponses);
                const porcentaje = calculateDimensionPercentage(consolidadas, dim);
                if (porcentaje > 0) {
                  sumaPorcentajes += porcentaje;
                  contador++;
                }
              });

              promedioMunicipal[dim.id] = contador > 0 ? Math.round(sumaPorcentajes / contador) : 0;
            });
          }
        } catch (error) {
          console.error('Error calculando promedio municipal:', error);
        }

        // Agregar promedio municipal a radarData
        const radarDataWithPromedio = radarData.map(d => ({
          ...d,
          promedioMunicipal: promedioMunicipal[d.dimensionData.id] || 0
        }));

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
          const { data: planData, error: planError } = await supabase
            .from("development_plans")
            .select("*")
            .eq("colaborador_id", user.dpi) // Filtrar por el DPI del colaborador autenticado
            .eq("periodo_id", activePeriodId) // Filtrar por el período activo
            .maybeSingle();

          if (planError) {
            console.error('Error al cargar plan de desarrollo:', planError);
            setPlanDesarrollo(null);
          } else if (planData) {
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
              tieneAcciones: !!(competencias && typeof competencias === 'object' && competencias.acciones),
              tieneObjetivos: !!(competencias && typeof competencias === 'object' && competencias.objetivos),
            });
            
            // Extraer estructura del plan desde competencias_desarrollar
            let planEstructurado = null;
            let recomendaciones = [];
            
            if (typeof competencias === 'object' && competencias !== null) {
              // Verificar si tiene la estructura completa
              if (competencias.acciones && Array.isArray(competencias.acciones)) {
                planEstructurado = {
                  objetivos: Array.isArray(competencias.objetivos) ? competencias.objetivos : [],
                  acciones: competencias.acciones,
                  dimensionesDebiles: Array.isArray(competencias.dimensionesDebiles) ? competencias.dimensionesDebiles : [],
                };
                recomendaciones = Array.isArray(competencias.recomendaciones) ? competencias.recomendaciones : [];
              }
              // Si tiene objetivos pero no acciones, crear estructura básica
              else if (Array.isArray(competencias.objetivos) && competencias.objetivos.length > 0) {
                planEstructurado = {
                  objetivos: competencias.objetivos,
                  acciones: [],
                  dimensionesDebiles: Array.isArray(competencias.dimensionesDebiles) ? competencias.dimensionesDebiles : [],
                };
                recomendaciones = Array.isArray(competencias.recomendaciones) ? competencias.recomendaciones : [];
              }
              // Si solo tiene acciones sin objetivos, crear estructura con acciones
              else if (competencias.acciones && Array.isArray(competencias.acciones) && competencias.acciones.length > 0) {
                planEstructurado = {
                  objetivos: [],
                  acciones: competencias.acciones,
                  dimensionesDebiles: Array.isArray(competencias.dimensionesDebiles) ? competencias.dimensionesDebiles : [],
                };
                recomendaciones = Array.isArray(competencias.recomendaciones) ? competencias.recomendaciones : [];
              }
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
        setJerarquiaInfo(info);
      } catch (error) {
        console.error("Error loading hierarchy info:", error);
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

  const fillSampleData = async () => {
    if (!user || !activePeriodId) return;

    const instrument = await getInstrumentForUser(user.nivel);
    if (!instrument) {
      toast({ title: "Error", description: "No se encontró instrumento para su nivel", variant: "destructive" });
      return;
    }
    const allItems = instrument.dimensionesDesempeno.flatMap(d => d.items);
    
    // Create varied responses (mix of 3, 4, and 5 for realistic data)
    const responses: Record<string, number> = {};
    allItems.forEach((item, idx) => {
      // Create a pattern: mostly 4s and 5s, some 3s
      const value = idx % 5 === 0 ? 3 : idx % 3 === 0 ? 5 : 4;
      responses[item.id] = value;
    });

    // Add sample comments for each dimension
    const comments: Record<string, string> = {
      "dim-1": "He cumplido con todos los objetivos propuestos para el periodo, incluyendo la implementación de nuevos procesos de gestión que han mejorado la eficiencia del área en un 15%. Ejemplo: Proyecto de modernización administrativa completado antes del plazo.",
      "dim-2": "La calidad de mi trabajo se ha mantenido consistentemente alta, cumpliendo con todos los estándares normativos. He implementado controles adicionales que han reducido errores en un 20%.",
      "dim-3": "He desarrollado nuevas competencias técnicas mediante capacitaciones en gestión pública moderna. Las competencias conductuales se reflejan en el liderazgo positivo del equipo y la mejora del clima laboral.",
      "dim-4": "Mi conducta ética ha sido intachable, siempre actuando con transparencia y responsabilidad. He participado activamente en iniciativas de gobierno abierto y rendición de cuentas.",
      "dim-5": "Como líder del equipo directivo, he fomentado la colaboración interdepartamental y he coordinado exitosamente proyectos transversales. El equipo ha mostrado mejora en indicadores de satisfacción.",
      "dim-6": "He priorizado la atención ciudadana, implementando canales de comunicación más efectivos y reduciendo tiempos de respuesta en un 30%. La satisfacción ciudadana ha aumentado según encuestas."
    };

    const draft: EvaluationDraft = {
      usuarioId: user.dpi,
      periodoId: activePeriodId, // Usar período activo real
      tipo: "auto",
      responses,
      comments,
      estado: "enviado",
      progreso: 100,
      fechaUltimaModificacion: new Date().toISOString(),
      fechaEnvio: new Date().toISOString()
    };

    submitEvaluation(draft);
    
    toast({
      title: "✓ Datos de ejemplo cargados",
      description: "Se ha completado una autoevaluación de ejemplo. Redirigiendo...",
    });

    setTimeout(() => {
      navigate("/mi-autoevaluacion");
    }, 1500);
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
          <div className="space-y-2">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => navigate("/autoevaluacion")}
            >
              Comenzar Autoevaluación
            </Button>
            <Button 
              className="w-full" 
              size="sm"
              variant="outline"
              onClick={fillSampleData}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Llenar datos de ejemplo
            </Button>
          </div>
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

        {/* Colaborador Dashboard */}
        {isColaborador && (
          <div className="space-y-6">
            {/* Mostrar resultados si están disponibles */}
            {evaluationStatus === "submitted" && resultadoData && (
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
                      : "Autoevaluación enviada. Esperando evaluación del jefe para resultado consolidado."}
                  </p>
                </div>

                {/* Mensaje informativo si el jefe no ha completado */}
                {!resultadoData.jefeCompleto && (
                  <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                    <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="text-blue-800 dark:text-blue-200">
                      Su autoevaluación fue recibida. Cuando su jefe complete la evaluación, aquí aparecerá su resultado consolidado.
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
                <div className="mb-6">
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
                              await exportEvaluacionCompletaPDFFromElement(
                                "resultados-evaluacion-container",
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
                                new Date()
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

        {/* Jefe Dashboard */}
        {isJefe && (
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
                  
                  <Button className="w-full" size="lg" onClick={() => navigate("/evaluacion-equipo")}>
                    Evaluar Mi Equipo
                  </Button>
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
                <p className="text-3xl font-bold text-primary">124</p>
                <p className="text-xs text-muted-foreground mt-1">Activos en el sistema</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Evaluaciones Completadas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-success">45</p>
                <p className="text-xs text-muted-foreground mt-1">36% del total</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-warning">79</p>
                <p className="text-xs text-muted-foreground mt-1">Requieren seguimiento</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Reaperturas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-info">3</p>
                <p className="text-xs text-muted-foreground mt-1">Este periodo</p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:col-span-4">
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
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
                      // Crear reporte básico para admin
                      const reportData = {
                        title: "Reporte de Administración",
                        periodo: activePeriod?.nombre || "N/A",
                        fecha: new Date().toLocaleDateString("es-GT"),
                        summary: [
                          { label: "Total Usuarios", value: "124" },
                          { label: "Evaluaciones Completadas", value: "45" },
                          { label: "Pendientes", value: "79" },
                        ],
                      };
                      toast({
                        title: "Exportación",
                        description: "Función de exportación disponible en Dashboard de RR.HH.",
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
