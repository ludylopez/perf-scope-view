// @ts-nocheck
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Trash2,
  Database
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getEvaluationDraft, hasSubmittedEvaluation, saveEvaluationDraft, submitEvaluation, EvaluationDraft, getSubmittedEvaluation, hasJefeEvaluation, getJefeEvaluationDraft } from "@/lib/storage";
import { getInstrumentForUser } from "@/lib/instruments";
import { toast } from "@/hooks/use-toast";
import { getJerarquiaInfo } from "@/lib/jerarquias";
import { getColaboradorJefe } from "@/lib/supabase";
import { calculatePerformanceScore, scoreToPercentage, calculateDimensionPercentage, calculateDimensionAverage } from "@/lib/calculations";
import { TrendingUp, Award, Lightbulb } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  return dimension.nombre.length > 40 ? dimension.nombre.substring(0, 40) + "..." : dimension.nombre;
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { activePeriodId, activePeriod, isLoading: periodLoading } = usePeriod();
  
  const [evaluationStatus, setEvaluationStatus] = useState<"not_started" | "in_progress" | "submitted">("not_started");
  const [progress, setProgress] = useState(0);
  const [jerarquiaInfo, setJerarquiaInfo] = useState<any>(null);
  const [resultadoData, setResultadoData] = useState<{
    performancePercentage: number;
    jefeCompleto: boolean;
    fortalezas: any[];
    areasOportunidad: any[];
    instrument: any;
  } | null>(null);

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
          numero: idx + 1,
          tuEvaluacion: calculateDimensionPercentage(responsesToUse, dim),
          puntaje: calculateDimensionAverage(responsesToUse, dim),
          dimensionData: dim
        }));

        const sortedDimensions = [...radarData].sort((a, b) => b.tuEvaluacion - a.tuEvaluacion);
        const fortalezas = sortedDimensions.slice(0, 3);
        const areasOportunidad = sortedDimensions.slice(-3).reverse();

        setResultadoData({
          performancePercentage,
          jefeCompleto,
          fortalezas,
          areasOportunidad,
          instrument
        });
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
              <>
                {/* Resumen de Resultados */}
                <Card className="border-2 border-primary/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-primary" />
                          Mis Resultados - Periodo {activePeriod?.nombre || 'N/A'}
                        </CardTitle>
                        <CardDescription>
                          {resultadoData.jefeCompleto 
                            ? "Resultado consolidado de tu evaluación de desempeño"
                            : "Autoevaluación enviada. Esperando evaluación del jefe para resultado consolidado."}
                        </CardDescription>
                      </div>
                      <Badge className={resultadoData.jefeCompleto ? "bg-success text-success-foreground" : "bg-info text-info-foreground"}>
                        {resultadoData.jefeCompleto ? "Resultado Consolidado" : "Autoevaluación Enviada"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Puntaje Global */}
                      <div className="flex flex-col items-center gap-4">
                        <Badge className={`${getScoreInterpretation(resultadoData.performancePercentage).color} px-4 py-2 text-base font-medium`}>
                          <TrendingUp className="mr-2 h-4 w-4" />
                          Tu desempeño es {getScoreInterpretation(resultadoData.performancePercentage).label}
                        </Badge>
                        
                        <div className="relative w-48 h-48">
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
                              <div className="text-4xl font-bold text-primary">{resultadoData.performancePercentage}%</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Fortalezas y Áreas de Oportunidad */}
                      <div className="space-y-4">
                        {resultadoData.fortalezas.length > 0 && (
                          <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                            <div className="flex-shrink-0 p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                              <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm mb-1 text-foreground">
                                {resultadoData.fortalezas[0].dimension}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Tu mayor fortaleza con {resultadoData.fortalezas[0].tuEvaluacion}%
                              </p>
                            </div>
                          </div>
                        )}

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
                                <strong>{resultadoData.areasOportunidad[0].dimension}:</strong>{" "}
                                {resultadoData.areasOportunidad[0].tuEvaluacion}%
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {!resultadoData.jefeCompleto && (
                      <Alert className="mt-4 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertDescription className="text-blue-800 dark:text-blue-200">
                          Su autoevaluación fue recibida. Cuando su jefe complete la evaluación, aquí aparecerá su resultado consolidado.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="mt-6 flex gap-3">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => navigate("/mi-autoevaluacion")}
                      >
                        Ver Detalle Completo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
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

            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle>Estado del Proceso</CardTitle>
                <CardDescription>
                  Timeline de su evaluación de desempeño
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center gap-3 rounded-lg border p-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      evaluationStatus === "submitted" 
                        ? "bg-success/10" 
                        : evaluationStatus === "in_progress"
                        ? "bg-info/10"
                        : "bg-warning/10"
                    }`}>
                      {evaluationStatus === "submitted" ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <Clock className={`h-5 w-5 ${
                          evaluationStatus === "in_progress" ? "text-info" : "text-warning"
                        }`} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Autoevaluación</p>
                      <p className="text-xs text-muted-foreground">
                        {evaluationStatus === "submitted" 
                          ? "Completada" 
                          : evaluationStatus === "in_progress"
                          ? `En progreso (${Math.round(progress)}%)`
                          : "Pendiente"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 rounded-lg border p-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      resultadoData?.jefeCompleto 
                        ? "bg-success/10" 
                        : evaluationStatus === "submitted"
                        ? "bg-info/10"
                        : "bg-muted"
                    }`}>
                      {resultadoData?.jefeCompleto ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <Clock className={`h-5 w-5 ${
                          evaluationStatus === "submitted" ? "text-info" : "text-muted-foreground"
                        }`} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Evaluación Jefe</p>
                      <p className="text-xs text-muted-foreground">
                        {resultadoData?.jefeCompleto 
                          ? "Completada" 
                          : evaluationStatus === "submitted"
                          ? "En espera"
                          : "Pendiente"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 rounded-lg border p-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      resultadoData?.jefeCompleto 
                        ? "bg-success/10" 
                        : "bg-muted"
                    }`}>
                      {resultadoData?.jefeCompleto ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <BarChart3 className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Resultados Finales</p>
                      <p className="text-xs text-muted-foreground">
                        {resultadoData?.jefeCompleto ? "Disponible" : "No disponible"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
