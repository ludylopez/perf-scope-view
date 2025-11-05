import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  Key,
  Save,
  Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getEvaluationDraft, hasSubmittedEvaluation, saveEvaluationDraft, submitEvaluation, EvaluationDraft } from "@/lib/storage";
import { INSTRUMENT_A1 } from "@/data/instruments";
import { toast } from "@/hooks/use-toast";
import { setGeminiApiKey, getGeminiApiKey, removeGeminiApiKey } from "@/lib/gemini";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [evaluationStatus, setEvaluationStatus] = useState<"not_started" | "in_progress" | "submitted">("not_started");
  const [progress, setProgress] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);

  const isColaborador = user?.rol === "colaborador";
  const isJefe = user?.rol === "jefe";
  const isAdminRRHH = user?.rol === "admin_rrhh";
  const isAdminGeneral = user?.rol === "admin_general";

  useEffect(() => {
    if (!user) return;

    // Check evaluation status
    const isSubmitted = hasSubmittedEvaluation(user.dpi, "2025-1");
    if (isSubmitted) {
      setEvaluationStatus("submitted");
      setProgress(100);
    } else {
      const draft = getEvaluationDraft(user.dpi, "2025-1");
      if (draft && Object.keys(draft.responses).length > 0) {
        setEvaluationStatus("in_progress");
        setProgress(draft.progreso);
      } else {
        setEvaluationStatus("not_started");
        setProgress(0);
      }
    }

    // Check if API key exists
    const existingKey = getGeminiApiKey();
    setHasApiKey(!!existingKey);
  }, [user]);

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa una clave de API válida",
        variant: "destructive",
      });
      return;
    }

    setGeminiApiKey(apiKey.trim());
    setHasApiKey(true);
    setApiKey("");
    
    toast({
      title: "✓ Clave guardada",
      description: "Tu clave de Google AI ha sido configurada correctamente",
    });
  };

  const handleRemoveApiKey = () => {
    removeGeminiApiKey();
    setHasApiKey(false);
    setApiKey("");
    
    toast({
      title: "Clave eliminada",
      description: "La clave de API ha sido removida",
    });
  };

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

  const fillSampleData = () => {
    if (!user) return;

    const instrument = INSTRUMENT_A1;
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
      periodoId: "2025-1",
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
            Ver Mi Autoevaluación
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* AI Configuration Card */}
            <Card className="md:col-span-2 lg:col-span-3 border-info/20 bg-info/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-info" />
                  Configuración de IA
                </CardTitle>
                <CardDescription>
                  Configura tu clave de Google AI para obtener análisis inteligentes de tu desempeño
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                  <div className="flex gap-2">
                    <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-warning mb-1">Nota de seguridad</p>
                      <p className="text-muted-foreground">
                        Esta clave se almacena en tu navegador. Para mayor seguridad en producción, 
                        considera usar Lovable Cloud para proteger tus claves de API.
                      </p>
                    </div>
                  </div>
                </div>

                {hasApiKey ? (
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-success/5 border-success/20">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <div>
                        <p className="font-medium">Clave de API configurada</p>
                        <p className="text-sm text-muted-foreground">
                          El análisis de IA está habilitado
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleRemoveApiKey}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">Clave de API de Google AI</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        placeholder="Ingresa tu clave de Google AI (Gemini)"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Obtén tu clave en:{" "}
                        <a 
                          href="https://aistudio.google.com/app/apikey" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Google AI Studio
                        </a>
                      </p>
                    </div>
                    <Button onClick={handleSaveApiKey} className="w-full">
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Clave
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

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
                    <p className="font-medium">Periodo: 2025-1</p>
                    <p className="text-sm text-muted-foreground">
                      Fecha límite: 31 de Marzo, 2025
                    </p>
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-accent" />
                  Mis Resultados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Los resultados finales estarán disponibles cuando su jefe complete la
                  evaluación y el periodo cierre.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => navigate("/mis-resultados")}
                >
                  Ver Resultados
                </Button>
              </CardContent>
            </Card>

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
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Evaluación Jefe</p>
                      <p className="text-xs text-muted-foreground">En espera</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 rounded-lg border p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Resultados Finales</p>
                      <p className="text-xs text-muted-foreground">No disponible</p>
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
                    <p className="text-3xl font-bold text-primary">5</p>
                    <p className="text-sm text-muted-foreground">Total Colaboradores</p>
                  </div>
                  <div className="rounded-lg border bg-card p-4 text-center">
                    <p className="text-3xl font-bold text-warning">5</p>
                    <p className="text-sm text-muted-foreground">Pendientes</p>
                  </div>
                  <div className="rounded-lg border bg-card p-4 text-center">
                    <p className="text-3xl font-bold text-success">0</p>
                    <p className="text-sm text-muted-foreground">Completadas</p>
                  </div>
                </div>
                
                <Button className="w-full" size="lg" onClick={() => navigate("/evaluacion-equipo")}>
                  Evaluar Mi Equipo
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-accent" />
                  Reportes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Avance por Colaborador
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Comparativo de Equipo
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate("/estadisticas-grupales")}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Estadísticas Grupales
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
                    onClick={() => {
                      // Crear reporte básico para admin
                      const reportData = {
                        title: "Reporte de Administración",
                        periodo: "2025-1",
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
                  <p className="text-xs text-muted-foreground mt-1">2025-1 en curso</p>
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
                  
                  <Button variant="outline" className="justify-start h-auto py-4">
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">Instrumentos</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Editar evaluaciones</span>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="justify-start h-auto py-4">
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">Usuarios</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Gestión completa</span>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="justify-start h-auto py-4">
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
