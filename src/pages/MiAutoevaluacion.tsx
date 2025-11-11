import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip
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

const MiAutoevaluacion = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [instrument, setInstrument] = useState<Instrument | null>(null);

  const [evaluation, setEvaluation] = useState<any>(null);
  const [currentDimension, setCurrentDimension] = useState(0);
  const [expandedDimensions, setExpandedDimensions] = useState<Record<number, boolean>>({});

  const toggleDimension = (idx: number) => {
    setExpandedDimensions(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      // Cargar instrumento según nivel del usuario
      const userInstrument = await getInstrumentForUser(user.nivel);
      if (!userInstrument) {
        toast.error("No se encontró un instrumento de evaluación para su nivel");
        navigate("/dashboard");
        return;
      }
      setInstrument(userInstrument);

      // Cargar evaluación enviada
      const submitted = await getSubmittedEvaluation(user.dpi, "2025-1");

      if (!submitted) {
        navigate("/autoevaluacion");
        return;
      }

      setEvaluation(submitted);
    };

    loadData();
  }, [user, navigate]);

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
    dimension: dim.nombre.length > 25 ? dim.nombre.substring(0, 25) + "..." : dim.nombre,
    nombreCompleto: dim.nombre,
    numero: idx + 1,
    porcentaje: calculateDimensionPercentage(evaluation.responses, dim),
    puntaje: calculateDimensionAverage(evaluation.responses, dim),
    dimensionData: dim // Incluir toda la dimensión
  }));

  // Identificar fortalezas (top 3) y áreas de mejora (bottom 3)
  const sortedDimensions = [...radarData].sort((a, b) => b.porcentaje - a.porcentaje);
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
            <p className="text-sm text-muted-foreground">Periodo: 2025-1</p>
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

        <Alert className="mb-6 border-info bg-info/10">
          <AlertDescription className="text-sm">
            Esta es su autoevaluación enviada. Los resultados finales se calcularán
            como <strong>30% de su autoevaluación + 70% de la evaluación de su
            jefe</strong>. Recibirá los resultados finales cuando el periodo de
            evaluación cierre.
          </AlertDescription>
        </Alert>

        {/* Resumen ejecutivo simple */}
        <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 p-3 rounded-full ${getScoreInterpretation(performancePercentage).color}`}>
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">
                  Tu desempeño es {getScoreInterpretation(performancePercentage).label}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Con un puntaje global de <strong>{performancePercentage}%</strong>,
                  {performancePercentage >= 75 ? " estás cumpliendo satisfactoriamente con las expectativas del cargo." : " hay áreas importantes que requieren atención y mejora."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {fortalezas.length > 0 && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Destacas en: </span>
                      <span className="font-semibold text-success">{fortalezas[0].nombreCompleto}</span>
                    </div>
                  )}
                  {areasDeOportunidad.length > 0 && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">• Puedes mejorar en: </span>
                      <span className="font-semibold text-warning">{areasDeOportunidad[0].nombreCompleto}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 mb-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Puntaje Global de Autoevaluación
              </CardTitle>
              <CardDescription>
                Resultado ponderado de sus respuestas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <div className="text-6xl font-bold text-primary">
                    {performancePercentage}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Desempeño global
                  </p>
                </div>
                <div className="h-20 w-px bg-border" />
                <div className="text-center">
                  <div className="text-3xl font-semibold text-foreground">
                    {performanceScore.toFixed(1)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    de 5.0
                  </p>
                  <p className="text-xs text-muted-foreground">
                    escala Likert
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Análisis Personalizado con IA
              </CardTitle>
              <CardDescription>
                Insights basados en sus resultados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-full text-center py-4">
                <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  El análisis personalizado con IA estará disponible próximamente.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Recibirá recomendaciones específicas basadas en sus fortalezas y áreas de mejora.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Resultados por Áreas Evaluadas</CardTitle>
            <CardDescription>
              Cada área representa aspectos clave de tu trabajo. Haz clic en cada tarjeta para ver más detalles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis 
                    dataKey="dimension" 
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Radar
                    name="Porcentaje"
                    dataKey="porcentaje"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border rounded-lg p-3 shadow-lg max-w-xs">
                            <p className="font-semibold text-sm mb-1">{data.nombreCompleto}</p>
                            <p className="text-xs text-muted-foreground">
                              Puntaje: {data.puntaje.toFixed(2)}/5.0
                            </p>
                            <p className="text-sm font-medium text-primary">
                              {data.porcentaje}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4">
              {radarData.map((data, idx) => {
                const Icon = getDimensionIcon(data.dimensionData.id);
                const colorClasses = getDimensionColor(data.dimensionData.id);
                const interpretation = getScoreInterpretation(data.porcentaje);
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
                          <p className="text-2xl font-bold text-primary">{data.porcentaje}%</p>
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
                            style={{ width: `${dim.porcentaje}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-success">{dim.porcentaje}%</span>
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
                            style={{ width: `${dim.porcentaje}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-warning">{dim.porcentaje}%</span>
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
