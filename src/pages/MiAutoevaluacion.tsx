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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LikertScale } from "@/components/evaluation/LikertScale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Instrument } from "@/types/evaluation";
import { getInstrumentForUser } from "@/lib/instruments";
import { getSubmittedEvaluation } from "@/lib/storage";
import {
  calculatePerformanceScore,
  getDimensionProgress,
  scoreToPercentage,
  calculateDimensionPercentage,
  calculateDimensionAverage
} from "@/lib/calculations";
import { ArrowLeft, CheckCircle2, FileDown, Sparkles, TrendingUp, Target, Award, AlertCircle, Lightbulb, Shield, Brain, Heart, Users, HandHeart, ChevronDown, ChevronUp } from "lucide-react";
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

// Helper para obtener el ícono de cada dimensión
const getDimensionIcon = (dimensionId: string) => {
  const icons: Record<string, any> = {
    dim1: Target,
    dim2: Shield,
    dim3: Brain,
    dim4: Heart,
    dim5: Users,
    dim6: HandHeart,
  };
  return icons[dimensionId] || Target;
};

// Helper para obtener el color de cada dimensión
const getDimensionColor = (dimensionId: string) => {
  const colors: Record<string, string> = {
    dim1: "text-blue-500 bg-blue-500/10",
    dim2: "text-purple-500 bg-purple-500/10",
    dim3: "text-orange-500 bg-orange-500/10",
    dim4: "text-pink-500 bg-pink-500/10",
    dim5: "text-indigo-500 bg-indigo-500/10",
    dim6: "text-teal-500 bg-teal-500/10",
  };
  return colors[dimensionId] || "text-primary bg-primary/10";
};

// Helper para interpretar el puntaje
const getScoreInterpretation = (percentage: number) => {
  if (percentage >= 90) return { label: "Excelente", color: "text-green-600 bg-green-50 border-green-200" };
  if (percentage >= 75) return { label: "Bueno", color: "text-blue-600 bg-blue-50 border-blue-200" };
  if (percentage >= 60) return { label: "Regular", color: "text-yellow-600 bg-yellow-50 border-yellow-200" };
  return { label: "Necesita mejorar", color: "text-orange-600 bg-orange-50 border-orange-200" };
};

// Helper para obtener ejemplos de cada dimensión
const getDimensionExamples = (dimensionId: string) => {
  const examples: Record<string, string[]> = {
    dim1: [
      "Cumplir con las metas del Plan Operativo Anual",
      "Ejecutar el presupuesto en tiempo y forma",
      "Implementar acuerdos del Concejo Municipal"
    ],
    dim2: [
      "Mantener transparencia en el manejo de recursos",
      "Cumplir con leyes y normativas vigentes",
      "Presentar informes completos y puntuales"
    ],
    dim3: [
      "Dominar la gestión pública municipal",
      "Aplicar herramientas de planificación estratégica",
      "Tomar decisiones fundamentadas"
    ],
    dim4: [
      "Actuar con integridad y transparencia",
      "Orientarse a resultados y mejora continua",
      "Mantener compromiso con las responsabilidades"
    ],
    dim5: [
      "Dirigir efectivamente al equipo directivo",
      "Coordinar entre dependencias municipales",
      "Comunicarse clara y oportunamente"
    ],
    dim6: [
      "Priorizar el interés ciudadano",
      "Atender demandas de la población",
      "Mantener buena imagen institucional"
    ]
  };
  return examples[dimensionId] || [];
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
    return "Tus Habilidades Técnicas";
  }
  if (nombre.toLowerCase().includes("comportamiento") && nombre.toLowerCase().includes("organizacional")) {
    return "Tu Actitud y Valores";
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

const MiAutoevaluacion = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { activePeriodId, activePeriod } = usePeriod();
  const [instrument, setInstrument] = useState<Instrument | null>(null);

  const [evaluation, setEvaluation] = useState<any>(null);
  const [currentDimension, setCurrentDimension] = useState(0);
  const [expandedDimensions, setExpandedDimensions] = useState<Record<number, boolean>>({});
  const [promedioMunicipal, setPromedioMunicipal] = useState<Record<string, number>>({});

  const toggleDimension = (idx: number) => {
    setExpandedDimensions(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

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

      // Calcular promedio municipal
      try {
        const { data: allEvaluations } = await supabase
          .from('evaluations')
          .select('responses')
          .eq('periodo_id', activePeriodId)
          .eq('tipo_evaluacion', 'autoevaluacion')
          .eq('enviada', true);

        if (allEvaluations && allEvaluations.length > 0) {
          // Calcular promedio por dimensión
          const promedios: Record<string, number> = {};
          
          userInstrument.dimensionesDesempeno.forEach((dim) => {
            let sumaPorcentajes = 0;
            let contador = 0;

            allEvaluations.forEach((evaluacion) => {
              const porcentaje = calculateDimensionPercentage(evaluacion.responses || {}, dim);
              if (porcentaje > 0) {
                sumaPorcentajes += porcentaje;
                contador++;
              }
            });

            promedios[dim.id] = contador > 0 ? Math.round(sumaPorcentajes / contador) : 0;
          });

          setPromedioMunicipal(promedios);
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
  const performanceScore = calculatePerformanceScore(
    evaluation.responses,
    dimensions
  );
  const performancePercentage = scoreToPercentage(performanceScore);

  const currentDim = dimensions[currentDimension];
  const dimProgress = getDimensionProgress(evaluation.responses, currentDim);

  // Preparar datos para el gráfico de radar
  const radarData = dimensions.map((dim, idx) => ({
    dimension: getDimensionFriendlyTitle(dim), // Usar título simplificado
    nombreCompleto: dim.nombre,
    numero: idx + 1,
    tuEvaluacion: calculateDimensionPercentage(evaluation.responses, dim),
    promedioMunicipal: promedioMunicipal[dim.id] || 0,
    puntaje: calculateDimensionAverage(evaluation.responses, dim),
    dimensionData: dim // Incluir toda la dimensión
  }));

  // Identificar fortalezas (top 3) y áreas de mejora (bottom 3)
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
              Mi Autoevaluación
            </h1>
            <Badge className="bg-success text-success-foreground">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Enviada
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Enviada el{" "}
            {format(new Date(evaluation.fechaEnvio), "d 'de' MMMM, yyyy", {
              locale: es,
            })}
          </p>
        </div>

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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Panorama de Competencias</CardTitle>
            <CardDescription>
              Vista integral de tu desempeño por dimensión comparado con el promedio municipal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <defs>
                    <linearGradient id="colorTuEval" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <PolarGrid 
                    stroke="hsl(var(--border))" 
                    strokeWidth={1}
                  />
                  <PolarAngleAxis 
                    dataKey="dimension" 
                    tick={{ 
                      fill: 'hsl(var(--foreground))', 
                      fontSize: 13,
                      fontWeight: 500
                    }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickCount={6}
                  />
                  
                  {/* Promedio Municipal - Segunda línea */}
                  {Object.keys(promedioMunicipal).length > 0 && (
                    <Radar
                      name="Promedio Municipal"
                      dataKey="promedioMunicipal"
                      stroke="hsl(var(--muted-foreground))"
                      fill="hsl(var(--muted))"
                      fillOpacity={0.15}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  )}
                  
                  {/* Tu Evaluación - Primera línea */}
                  <Radar
                    name="Tu Evaluación"
                    dataKey="tuEvaluacion"
                    stroke="hsl(var(--primary))"
                    fill="url(#colorTuEval)"
                    fillOpacity={0.4}
                    strokeWidth={3}
                  />
                  
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border-2 border-primary/20 rounded-lg p-4 shadow-xl">
                            <p className="font-bold text-base mb-2 text-foreground">{data.dimension}</p>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-sm text-muted-foreground">Tu evaluación:</span>
                                <span className="text-sm font-bold text-primary">{data.tuEvaluacion}%</span>
                              </div>
                              {data.promedioMunicipal > 0 && (
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-sm text-muted-foreground">Promedio municipal:</span>
                                  <span className="text-sm font-semibold text-muted-foreground">{data.promedioMunicipal}%</span>
                                </div>
                              )}
                              <div className="pt-2 mt-2 border-t border-border">
                                <span className="text-xs text-muted-foreground">
                                  Puntaje Likert: {data.puntaje.toFixed(1)}/5.0
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  
                  <Legend 
                    wrapperStyle={{
                      paddingTop: '20px'
                    }}
                    iconType="circle"
                    formatter={(value) => (
                      <span style={{ 
                        color: 'hsl(var(--foreground))', 
                        fontSize: '14px',
                        fontWeight: 500
                      }}>
                        {value}
                      </span>
                    )}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4">
              {radarData.map((data, idx) => {
                const Icon = getDimensionIcon(data.dimensionData.id);
                const colorClasses = getDimensionColor(data.dimensionData.id);
                const interpretation = getScoreInterpretation(data.tuEvaluacion);
                const isExpanded = expandedDimensions[idx];
                const examples = getDimensionExamples(data.dimensionData.id);

                return (
                  <div
                    key={idx}
                    className="border border-border rounded-lg overflow-hidden hover:shadow-md transition-all"
                  >
                    {/* Header de la tarjeta - clickeable */}
                    <div
                      className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleDimension(idx)}
                    >
                      {/* Ícono de la dimensión */}
                      <div className={`flex-shrink-0 p-3 rounded-full ${colorClasses}`}>
                        <Icon className="h-6 w-6" />
                      </div>

                      {/* Contenido principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-medium text-muted-foreground">Área {data.numero}</p>
                          <Badge className={`text-xs px-2 py-0 ${interpretation.color}`}>
                            {interpretation.label}
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold text-foreground mb-1">
                          {data.nombreCompleto}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {data.dimensionData.descripcion}
                        </p>
                      </div>

                      {/* Puntaje y chevron */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">{data.tuEvaluacion}%</p>
                          <p className="text-xs text-muted-foreground">{data.puntaje.toFixed(1)}/5.0</p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Contenido expandible */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 bg-muted/20 border-t border-border">
                        <div className="space-y-3">
                          {/* Descripción completa */}
                          <div>
                            <p className="text-xs font-semibold text-foreground mb-1">¿Qué se evalúa?</p>
                            <p className="text-xs text-muted-foreground">
                              {data.dimensionData.descripcion}
                            </p>
                          </div>

                          {/* Ejemplos concretos */}
                          {examples.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-foreground mb-2">Ejemplos de lo que incluye:</p>
                              <ul className="space-y-1">
                                {examples.map((example, exIdx) => (
                                  <li key={exIdx} className="flex items-start gap-2 text-xs text-muted-foreground">
                                    <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                                    <span>{example}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Peso de la dimensión */}
                          <div className="pt-2 border-t border-border/50">
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Peso en evaluación: </span>
                              {Math.round(data.dimensionData.peso * 100)}% del total
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 mb-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-success" />
                Fortalezas Identificadas
              </CardTitle>
              <CardDescription>
                Dimensiones con mejor desempeño
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fortalezas.map((dim, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-success/20 bg-success/5">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-success/20 text-success font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{dim.nombreCompleto}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Puntaje: {dim.puntaje.toFixed(2)}/5.0
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-success transition-all" 
                            style={{ width: `${dim.tuEvaluacion}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-success">{dim.tuEvaluacion}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-warning" />
                Áreas de Oportunidad
              </CardTitle>
              <CardDescription>
                Dimensiones para enfocarse en mejorar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {areasDeOportunidad.map((dim, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-warning/20 bg-warning/5">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-warning/20 text-warning font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{dim.nombreCompleto}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Puntaje: {dim.puntaje.toFixed(2)}/5.0
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-warning transition-all" 
                            style={{ width: `${dim.tuEvaluacion}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-warning">{dim.tuEvaluacion}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 mb-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Logros Destacados del Periodo
              </CardTitle>
              <CardDescription>
                Principales logros y resultados obtenidos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
                  <p className="text-sm text-muted-foreground text-center">
                    No se han documentado logros para este periodo
                  </p>
                </div>
                <Button variant="outline" className="w-full" disabled>
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Agregar Logro
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Plan de Desarrollo Individual
              </CardTitle>
              <CardDescription>
                Objetivos y áreas de mejora para el próximo periodo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
                  <p className="text-sm text-muted-foreground text-center">
                    No se han establecido objetivos para el siguiente periodo
                  </p>
                </div>
                <Button variant="outline" className="w-full" disabled>
                  <Target className="mr-2 h-4 w-4" />
                  Establecer Objetivos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Mis Respuestas por Dimensión</CardTitle>
            <CardDescription>
              Visualización completa de su autoevaluación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={currentDimension.toString()} className="w-full">
              <TabsList className="mb-6 w-full flex-wrap justify-start h-auto gap-2">
                {dimensions.map((dim, idx) => {
                  const progress = getDimensionProgress(evaluation.responses, dim);
                  return (
                    <TabsTrigger
                      key={dim.id}
                      value={idx.toString()}
                      onClick={() => setCurrentDimension(idx)}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      Dim. {idx + 1}
                      {progress.answered === progress.total && " ✓"}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {dimensions.map((dim, idx) => (
                <TabsContent key={dim.id} value={idx.toString()} className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">
                      {dim.nombre} ({Math.round(dim.peso * 100)}%)
                    </h3>
                    {dim.descripcion && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {dim.descripcion}
                      </p>
                    )}
                  </div>

                  {dim.items.map((item) => (
                    <LikertScale
                      key={item.id}
                      itemId={item.id}
                      itemText={`${item.orden}. ${item.texto}`}
                      value={evaluation.responses[item.id]}
                      onChange={() => {}}
                      disabled={true}
                    />
                  ))}

                  {evaluation.comments[dim.id] && (
                    <div className="mt-6 space-y-2">
                      <Label>Comentarios y evidencias:</Label>
                      <Textarea
                        value={evaluation.comments[dim.id]}
                        disabled
                        rows={4}
                        className="resize-none bg-muted"
                      />
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentDimension(Math.max(0, currentDimension - 1))}
                  disabled={currentDimension === 0}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentDimension(
                      Math.min(dimensions.length - 1, currentDimension + 1)
                    )
                  }
                  disabled={currentDimension === dimensions.length - 1}
                >
                  Siguiente
                  <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                </Button>
              </div>

              <Button variant="outline" disabled>
                <FileDown className="mr-2 h-4 w-4" />
                Descargar PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MiAutoevaluacion;
