import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { useNavigate } from "react-router-dom";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Instrument } from "@/types/evaluation";
import { getInstrumentForUser } from "@/lib/instruments";
import { getSubmittedEvaluation, hasJefeEvaluation, getJefeEvaluationDraft } from "@/lib/storage";
import {
  calculatePerformanceScore,
  scoreToPercentage,
  calculateDimensionPercentage,
  calculateDimensionAverage
} from "@/lib/calculations";
import { getColaboradorJefe } from "@/lib/supabase";
import { getFinalResultFromSupabase } from "@/lib/finalResultSupabase";
import { calculateFinalScore } from "@/lib/finalScore";
import { ArrowLeft, CheckCircle2, FileDown, Sparkles, TrendingUp, Target, Award, AlertCircle, Lightbulb } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";
import { PerformanceRadarAnalysis } from "@/components/evaluation/PerformanceRadarAnalysis";

// Helper para interpretar el puntaje
const getScoreInterpretation = (percentage: number) => {
  if (percentage >= 90) return { label: "Excelente", color: "text-green-600 bg-green-50 border-green-200" };
  if (percentage >= 75) return { label: "Bueno", color: "text-blue-600 bg-blue-50 border-blue-200" };
  if (percentage >= 60) return { label: "Regular", color: "text-yellow-600 bg-yellow-50 border-yellow-200" };
  return { label: "Necesita mejorar", color: "text-orange-600 bg-orange-50 border-orange-200" };
};

// Helper para obtener descripción amigable de la dimensión
const getDimensionFriendlyDescription = (dimension: any, percentage: number): string => {
  const nombre = dimension.nombre.toLowerCase();
  
  // Analizar el contenido para generar descripciones contextuales
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

// Helper para obtener título amigable
const getDimensionFriendlyTitle = (dimension: any): string => {
  const nombre = dimension.nombre;
  
  // Simplificar nombres técnicos a algo más comprensible
  if (nombre.toLowerCase().includes("competencias laborales") && nombre.toLowerCase().includes("técnica")) {
    return "Competencias Laborales";
  }
  if (nombre.toLowerCase().includes("comportamiento") && nombre.toLowerCase().includes("organizacional")) {
    return "Comportamiento Organizacional";
  }
  if (nombre.toLowerCase().includes("relaciones interpersonales") || nombre.toLowerCase().includes("trabajo en equipo")) {
    return "Relaciones Interpersonales";
  }
  if (nombre.toLowerCase().includes("orientación al servicio") || nombre.toLowerCase().includes("atención al usuario")) {
    return "Orientación al Servicio";
  }
  if (nombre.toLowerCase().includes("calidad del trabajo")) {
    return "Calidad del Trabajo";
  }
  if (nombre.toLowerCase().includes("productividad") || nombre.toLowerCase().includes("cumplimiento")) {
    return "Productividad";
  }
  if (nombre.toLowerCase().includes("liderazgo") || nombre.toLowerCase().includes("dirección")) {
    return "Tu Liderazgo";
  }
  if (nombre.toLowerCase().includes("ciudadan") || nombre.toLowerCase().includes("servicio")) {
    return "Tu Servicio al Ciudadano";
  }
  if (nombre.toLowerCase().includes("gestión") && nombre.toLowerCase().includes("resultado")) {
    return "Tus Resultados";
  }
  if (nombre.toLowerCase().includes("transparencia") || nombre.toLowerCase().includes("ética")) {
    return "Tu Ética y Transparencia";
  }
  
  // Si no hay match, usar el nombre original pero más corto
  return nombre.length > 40 ? nombre.substring(0, 40) + "..." : nombre;
};

// Helper para obtener descripción corta y simple
const getDimensionShortDescription = (dimension: any): string => {
  const nombre = dimension.nombre.toLowerCase();
  
  if (nombre.includes("competencias laborales") && nombre.includes("técnica")) {
    return "Técnicas y específicas";
  }
  if (nombre.includes("comportamiento") && nombre.includes("organizacional")) {
    return "Actitud laboral";
  }
  if (nombre.includes("relaciones interpersonales") || nombre.includes("trabajo en equipo")) {
    return "Trabajo en equipo";
  }
  if (nombre.includes("orientación al servicio") || nombre.includes("atención al usuario")) {
    return "Atención al usuario";
  }
  if (nombre.includes("calidad del trabajo")) {
    return "Estándares y precisión";
  }
  if (nombre.includes("productividad") || nombre.includes("cumplimiento")) {
    return "Cumplimiento de objetivos";
  }
  
  return "Desempeño evaluado";
};

// Helper para calcular respuestas consolidadas (70% jefe + 30% auto)
const calculateConsolidatedResponses = (
  autoResponses: Record<string, number>,
  jefeResponses: Record<string, number>
): Record<string, number> => {
  const consolidated: Record<string, number> = {};
  
  // Obtener todos los ítems únicos de ambas evaluaciones
  const allItemIds = new Set([
    ...Object.keys(autoResponses),
    ...Object.keys(jefeResponses)
  ]);
  
  allItemIds.forEach((itemId) => {
    const autoValue = autoResponses[itemId] || 0;
    const jefeValue = jefeResponses[itemId] || 0;
    
    // Si ambos tienen valor, calcular consolidado
    if (autoResponses[itemId] !== undefined && jefeResponses[itemId] !== undefined) {
      consolidated[itemId] = Math.round((jefeValue * 0.7 + autoValue * 0.3) * 100) / 100;
    } else if (autoResponses[itemId] !== undefined) {
      // Si solo auto tiene valor, usar auto (fallback)
      consolidated[itemId] = autoValue;
    } else if (jefeResponses[itemId] !== undefined) {
      // Si solo jefe tiene valor, usar jefe (fallback)
      consolidated[itemId] = jefeValue;
    }
  });
  
  return consolidated;
};

const MiAutoevaluacion = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { activePeriodId, activePeriod } = usePeriod();
  const [instrument, setInstrument] = useState<Instrument | null>(null);

  const [evaluation, setEvaluation] = useState<any>(null);
  const [evaluacionJefe, setEvaluacionJefe] = useState<any>(null);
  const [jefeCompleto, setJefeCompleto] = useState<boolean>(false);
  const [responsesConsolidadas, setResponsesConsolidadas] = useState<Record<string, number>>({});
  const [promedioMunicipal, setPromedioMunicipal] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user || !activePeriodId) return;

    const loadData = async () => {
      // Cargar instrumento según nivel del usuario
      const userInstrument = await getInstrumentForUser(user.nivel);
      if (!userInstrument) {
        toast.error("No se encontró un instrumento de evaluación para su nivel");
        navigate("/dashboard");
        return;
      }
      setInstrument(userInstrument);

      // Cargar evaluación enviada con período activo real
      const submitted = await getSubmittedEvaluation(user.dpi, activePeriodId);

      if (!submitted) {
        navigate("/autoevaluacion");
        return;
      }

      setEvaluation(submitted);

      // Obtener jefe del colaborador
      const jefeId = await getColaboradorJefe(user.dpi);
      
      if (!jefeId) {
        // Si no tiene jefe, usar solo autoevaluación
        setJefeCompleto(false);
        setResponsesConsolidadas(submitted.responses);
      } else {
        // Verificar si el jefe completó la evaluación
        const jefeCompletoEvaluacion = await hasJefeEvaluation(jefeId, user.dpi, activePeriodId);
        setJefeCompleto(jefeCompletoEvaluacion);

        if (jefeCompletoEvaluacion) {
          // Obtener evaluación del jefe
          const jefeEval = await getJefeEvaluationDraft(jefeId, user.dpi, activePeriodId);
          
          if (jefeEval) {
            setEvaluacionJefe(jefeEval);
            
            // Calcular respuestas consolidadas
            const consolidadas = calculateConsolidatedResponses(
              submitted.responses,
              jefeEval.responses
            );
            setResponsesConsolidadas(consolidadas);
          } else {
            // Fallback a autoevaluación si no se puede obtener evaluación del jefe
            setResponsesConsolidadas(submitted.responses);
          }
        } else {
          // Jefe no ha completado, usar solo autoevaluación
          setResponsesConsolidadas(submitted.responses);
        }
      }

      // Calcular promedio municipal de resultados finales consolidados
      try {
        // Obtener todos los resultados finales del período
        const { data: finalResults, error: finalResultsError } = await supabase
          .from('final_evaluation_results')
          .select('colaborador_id, resultado_final, autoevaluacion_id, evaluacion_jefe_id')
          .eq('periodo_id', activePeriodId);

        if (finalResultsError) {
          console.error('Error obteniendo resultados finales:', finalResultsError);
        }

        if (finalResults && finalResults.length > 0) {
          // Para cada resultado final, necesitamos obtener las evaluaciones para calcular porcentajes por dimensión
          const promedios: Record<string, number> = {};
          
          // Obtener todas las evaluaciones necesarias
          const colaboradorIds = finalResults.map(r => r.colaborador_id);
          const autoevaluacionIds = finalResults.map(r => r.autoevaluacion_id).filter(id => id);
          const jefeEvaluacionIds = finalResults.map(r => r.evaluacion_jefe_id).filter(id => id);
          
          // Obtener autoevaluaciones
          const { data: autoEvals } = await supabase
            .from('evaluations')
            .select('id, responses')
            .in('id', autoevaluacionIds)
            .eq('tipo', 'auto');

          // Obtener evaluaciones del jefe
          const { data: jefeEvals } = await supabase
            .from('evaluations')
            .select('id, responses')
            .in('id', jefeEvaluacionIds)
            .eq('tipo', 'jefe');

          // Crear mapas para acceso rápido
          const autoEvalMap = new Map((autoEvals || []).map(e => [e.id, (e.responses as Record<string, number>) || {}]));
          const jefeEvalMap = new Map((jefeEvals || []).map(e => [e.id, (e.responses as Record<string, number>) || {}]));

          // Calcular promedio por dimensión usando respuestas consolidadas
          userInstrument.dimensionesDesempeno.forEach((dim) => {
            let sumaPorcentajes = 0;
            let contador = 0;

            finalResults.forEach((resultado) => {
              const autoResponses = autoEvalMap.get(resultado.autoevaluacion_id) || {};
              const jefeResponses = jefeEvalMap.get(resultado.evaluacion_jefe_id) || {};
              
              // Calcular respuestas consolidadas para este colaborador
              const consolidadas = calculateConsolidatedResponses(autoResponses, jefeResponses);
              
              // Calcular porcentaje por dimensión
              const porcentaje = calculateDimensionPercentage(consolidadas, dim);
              if (porcentaje > 0) {
                sumaPorcentajes += porcentaje;
                contador++;
              }
            });

            promedios[dim.id] = contador > 0 ? Math.round(sumaPorcentajes / contador) : 0;
          });

          setPromedioMunicipal(promedios);
        } else {
          // Si no hay resultados finales, calcular promedio de autoevaluaciones como fallback
          const { data: allEvaluations } = await supabase
            .from('evaluations')
            .select('responses')
            .eq('periodo_id', activePeriodId)
            .eq('tipo', 'auto')
            .eq('estado', 'enviado');

          if (allEvaluations && allEvaluations.length > 0) {
            const promedios: Record<string, number> = {};
            
            userInstrument.dimensionesDesempeno.forEach((dim) => {
              let sumaPorcentajes = 0;
              let contador = 0;

              allEvaluations.forEach((evaluacion) => {
                const porcentaje = calculateDimensionPercentage((evaluacion.responses as Record<string, number>) || {}, dim);
                if (porcentaje > 0) {
                  sumaPorcentajes += porcentaje;
                  contador++;
                }
              });

              promedios[dim.id] = contador > 0 ? Math.round(sumaPorcentajes / contador) : 0;
            });

            setPromedioMunicipal(promedios);
          }
        }
      } catch (error) {
        console.error('Error calculando promedio municipal:', error);
      }
    };

    loadData();
  }, [user, activePeriodId, navigate]);

  if (!evaluation || !instrument) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <p>Cargando...</p>
        </main>
      </div>
    );
  }

  const dimensions = instrument.dimensionesDesempeno;
  
  // Usar respuestas consolidadas si están disponibles, sino usar autoevaluación
  const responsesToUse = Object.keys(responsesConsolidadas).length > 0 
    ? responsesConsolidadas 
    : evaluation.responses;
  
  const performanceScore = calculatePerformanceScore(
    responsesToUse,
    dimensions
  );
  const performancePercentage = scoreToPercentage(performanceScore);

  // Preparar datos para el gráfico de radar
  const radarData = dimensions.map((dim, idx) => ({
    dimension: getDimensionFriendlyTitle(dim), // Usar título simplificado
    nombreCompleto: dim.nombre,
    numero: idx + 1,
    tuEvaluacion: calculateDimensionPercentage(responsesToUse, dim),
    promedioMunicipal: promedioMunicipal[dim.id] || 0,
    puntaje: calculateDimensionAverage(responsesToUse, dim),
    dimensionData: dim // Incluir toda la dimensión
  }));

  // Identificar fortalezas (top 3) y áreas de mejora (bottom 3) basadas en resultado consolidado
  const sortedDimensions = [...radarData].sort((a, b) => b.tuEvaluacion - a.tuEvaluacion);
  const fortalezas = sortedDimensions.slice(0, 3);
  const areasDeOportunidad = sortedDimensions.slice(-3).reverse();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Button>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Periodo: {activePeriod?.nombre || 'N/A'}</p>
            <p className="text-sm text-muted-foreground">Nivel: {user?.nivel}</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">
              Mis Resultados
            </h1>
            <Badge className="bg-success text-success-foreground">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              {jefeCompleto ? "Resultado Consolidado" : "Autoevaluación Enviada"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {jefeCompleto 
              ? "Resultado consolidado de tu evaluación de desempeño"
              : `Autoevaluación enviada el ${format(new Date(evaluation.fechaEnvio), "d 'de' MMMM, yyyy", { locale: es })}`}
          </p>
        </div>

        {/* Mensaje informativo si el jefe no ha completado */}
        {!jefeCompleto && (
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
                  Tu desempeño es {getScoreInterpretation(performancePercentage).label}
                </Badge>
                
                <div className="relative w-64 h-64">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    {/* Círculo de fondo */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="hsl(var(--muted))"
                      strokeWidth="8"
                    />
                    {/* Círculo de progreso */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="8"
                      strokeDasharray={`${performancePercentage * 2.513} 251.3`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-primary">{performancePercentage}%</div>
                    </div>
                  </div>
                </div>
                
                <p className="text-center text-sm text-muted-foreground max-w-md">
                  Con un puntaje global de <strong>{performancePercentage}%</strong>,
                  {performancePercentage >= 75 
                    ? " estás cumpliendo satisfactoriamente con las expectativas del cargo." 
                    : " hay áreas importantes que requieren atención y mejora."}
                </p>
              </div>

              {/* Sección derecha: Tarjetas informativas */}
              <div className="flex flex-col gap-4 lg:w-1/2">
                {/* Tu Mayor Fortaleza */}
                {fortalezas.length > 0 && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                    <div className="flex-shrink-0 p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                      <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1 text-foreground">
                        {getDimensionFriendlyTitle(fortalezas[0].dimensionData)}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {getDimensionFriendlyDescription(fortalezas[0].dimensionData, fortalezas[0].tuEvaluacion)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Área Prioritaria de Mejora */}
                {areasDeOportunidad.length > 0 && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                    <div className="flex-shrink-0 p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                      <Lightbulb className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1 text-foreground">
                        Área para Fortalecer
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        <strong>{getDimensionFriendlyTitle(areasDeOportunidad[0].dimensionData)}:</strong>{" "}
                        {getDimensionFriendlyDescription(areasDeOportunidad[0].dimensionData, areasDeOportunidad[0].tuEvaluacion)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Nota: Progreso vs. Periodo Anterior se mostrará solo cuando haya datos reales del período anterior */}
              </div>
            </div>
          </CardContent>
        </Card>

<div className="mb-6">
  <PerformanceRadarAnalysis
    radarData={radarData.map(d => ({
      dimension: d.dimension,
      tuResultado: d.tuEvaluacion,
      promedioMunicipal: Object.keys(promedioMunicipal).length > 0 ? d.promedioMunicipal : undefined,
    }))}
    dimensionAnalysis={radarData.map(d => ({
      nombre: d.nombreCompleto || d.dimension,
      descripcion: d.dimensionData?.descripcion,
      porcentaje: d.tuEvaluacion,
      isFortaleza: d.tuEvaluacion >= 80,
      promedioMunicipal: Object.keys(promedioMunicipal).length > 0 ? d.promedioMunicipal : undefined,
    }))}
    title="Panorama de Competencias"
    description={jefeCompleto ? "Vista integral de tu desempeño por dimensión comparado con el promedio municipal" : "Vista de tu autoevaluación por dimensión comparado con el promedio municipal"}
  />
</div>


        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <FileDown className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Ver Detalle de Respuestas</h3>
                  <p className="text-sm text-muted-foreground">
                    Revisa todas tus respuestas por cada dimensión evaluada
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => navigate("/mis-respuestas-detalle")}
                className="w-full sm:w-auto"
              >
                Ver Detalle Completo
                <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MiAutoevaluacion;
