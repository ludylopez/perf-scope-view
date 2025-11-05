import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
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
import { Progress } from "@/components/ui/progress";
import { LikertScale } from "@/components/evaluation/LikertScale";
import { DimensionProgress } from "@/components/evaluation/DimensionProgress";
import { AutoSaveIndicator } from "@/components/evaluation/AutoSaveIndicator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { INSTRUMENT_A1 } from "@/data/instruments";
import {
  saveEvaluationDraft,
  getJefeEvaluationDraft,
  submitEvaluation,
  hasJefeEvaluation,
  getSubmittedEvaluation,
  getMockColaboradorEvaluation,
  EvaluationDraft,
} from "@/lib/storage";
import {
  isEvaluationComplete,
  getIncompleteDimensions,
  getDimensionProgress,
} from "@/lib/calculations";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Send,
  AlertTriangle,
  Eye,
  FileEdit,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { generateDevelopmentPlan } from "@/lib/developmentPlan";
import { calculateCompleteFinalScore } from "@/lib/finalScore";
import { getInstrumentForUser } from "@/lib/instruments";
import { supabase } from "@/integrations/supabase/client";

// Datos mock del colaborador
const MOCK_COLABORADORES: Record<string, any> = {
  "1": {
    id: "1",
    dpi: "4567890123104",
    nombre: "Roberto Hernández Silva",
    cargo: "Coordinador",
    nivel: "S2",
    area: "Tecnología",
  },
};

const EvaluacionColaborador = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [instrument, setInstrument] = useState(INSTRUMENT_A1);

  const [colaborador, setColaborador] = useState<any>(null);
  const [autoevaluacion, setAutoevaluacion] = useState<any>(null);
  const [jefeAlreadyEvaluated, setJefeAlreadyEvaluated] = useState(false);
  const [evaluacionTab, setEvaluacionTab] = useState<"auto" | "desempeno" | "potencial">("desempeno");
  
  // Estados para evaluación de desempeño del jefe
  const [desempenoResponses, setDesempenoResponses] = useState<Record<string, number>>({});
  const [desempenoComments, setDesempenoComments] = useState<Record<string, string>>({});
  const [currentDesempenoDimension, setCurrentDesempenoDimension] = useState(0);
  
  // Estados para evaluación de potencial del jefe
  const [potencialResponses, setPotencialResponses] = useState<Record<string, number>>({});
  const [potencialComments, setPotencialComments] = useState<Record<string, string>>({});
  const [currentPotencialDimension, setCurrentPotencialDimension] = useState(0);
  
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const desempenoDimensions = instrument.dimensionesDesempeno;
  const potencialDimensions = instrument.dimensionesPotencial;
  
  const desempenoTotalItems = desempenoDimensions.reduce((sum, dim) => sum + dim.items.length, 0);
  const potencialTotalItems = potencialDimensions.reduce((sum, dim) => sum + dim.items.length, 0);
  
  const desempenoAnsweredItems = Object.keys(desempenoResponses).length;
  const potencialAnsweredItems = Object.keys(potencialResponses).length;
  
  const desempenoProgress = (desempenoAnsweredItems / desempenoTotalItems) * 100;
  const potencialProgress = (potencialAnsweredItems / potencialTotalItems) * 100;
  
  // Usar useMemo para recalcular cuando cambien las respuestas
  const desempenoComplete = useMemo(() => 
    isEvaluationComplete(desempenoResponses, desempenoDimensions),
    [desempenoResponses, desempenoDimensions]
  );
  
  const potencialComplete = useMemo(() => 
    isEvaluationComplete(potencialResponses, potencialDimensions),
    [potencialResponses, potencialDimensions]
  );
  
  const isComplete = desempenoComplete && potencialComplete;

  useEffect(() => {
    if (!id || !user) {
      navigate("/evaluacion-equipo");
      return;
    }

    const loadData = async () => {
      try {
        // Cargar colaborador desde Supabase usando el DPI (id)
        const { data: colaboradorData, error: colaboradorError } = await supabase
          .from("users")
          .select("*")
          .eq("dpi", id)
          .single();

        let colaboradorFormatted: any;
        let instrumentoOverride: string | undefined;
        
        if (colaboradorError || !colaboradorData) {
          // Fallback a datos mock si no se encuentra en Supabase
          const mockColaborador = MOCK_COLABORADORES[id];
          if (!mockColaborador) {
            toast.error("Colaborador no encontrado");
            navigate("/evaluacion-equipo");
            return;
          }
          colaboradorFormatted = mockColaborador;
        } else {
          // Formatear datos del colaborador desde Supabase
          colaboradorFormatted = {
            id: colaboradorData.dpi,
            dpi: colaboradorData.dpi,
            nombre: `${colaboradorData.nombre} ${colaboradorData.apellidos}`,
            cargo: colaboradorData.cargo,
            nivel: colaboradorData.nivel,
            area: colaboradorData.area,
          };
          instrumentoOverride = colaboradorData.instrumento_id || undefined;
        }

        setColaborador(colaboradorFormatted);

        // Cargar instrumento según el nivel del colaborador
        if (colaboradorFormatted.nivel) {
          const userInstrument = await getInstrumentForUser(
            colaboradorFormatted.nivel,
            instrumentoOverride
          );
          if (userInstrument) {
            setInstrument(userInstrument);
          }
        }

        // Cargar autoevaluación del colaborador solo si el jefe ya completó su evaluación
        const jefeDraft = await getJefeEvaluationDraft(user.dpi, colaboradorFormatted.dpi, "2025-1");
        const jefeCompleto = jefeDraft?.estado === "enviado";
        setJefeAlreadyEvaluated(jefeCompleto);
        
        if (jefeCompleto) {
          // Solo mostrar autoevaluación si el jefe ya completó su evaluación
          const submittedAuto = await getSubmittedEvaluation(colaboradorFormatted.dpi, "2025-1");
          const mockAuto = getMockColaboradorEvaluation(colaboradorFormatted.dpi);
          setAutoevaluacion(submittedAuto || mockAuto);
          // Cambiar a la pestaña de autoevaluación cuando está disponible
          setEvaluacionTab("auto");
        } else {
          // Si el jefe no ha completado, empezar en desempeño
          setEvaluacionTab("desempeno");
        }

        // Cargar evaluación del jefe si existe
        if (jefeDraft) {
          setDesempenoResponses(jefeDraft.responses);
          setDesempenoComments(jefeDraft.comments);
          if (jefeDraft.evaluacionPotencial) {
            setPotencialResponses(jefeDraft.evaluacionPotencial.responses);
            setPotencialComments(jefeDraft.evaluacionPotencial.comments);
          }
          
          if (jefeDraft.estado === "enviado") {
            toast.info("Esta evaluación ya fue enviada");
          } else {
            toast.info("Se ha cargado su borrador guardado");
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Error al cargar datos del colaborador");
      }
    };

    loadData();
  }, [id, user, navigate]);

  // Auto-save functionality
  const performAutoSave = useCallback(() => {
    if (!user || !colaborador) return;

    setAutoSaveStatus("saving");
    
    const draft: EvaluationDraft = {
      usuarioId: colaborador.dpi,
      periodoId: "2025-1",
      tipo: "jefe",
      responses: desempenoResponses,
      comments: desempenoComments,
      evaluadorId: user.dpi,
      colaboradorId: colaborador.dpi,
      evaluacionPotencial: {
        responses: potencialResponses,
        comments: potencialComments,
      },
      estado: "borrador",
      progreso: Math.round((desempenoProgress + potencialProgress) / 2),
      fechaUltimaModificacion: new Date().toISOString(),
    };

    saveEvaluationDraft(draft);
    
    setTimeout(() => {
      setAutoSaveStatus("saved");
      setHasUnsavedChanges(false);
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    }, 500);
  }, [user, colaborador, desempenoResponses, desempenoComments, potencialResponses, potencialComments, desempenoProgress, potencialProgress]);

  useEffect(() => {
    if (hasUnsavedChanges) {
      const timer = setTimeout(() => {
        performAutoSave();
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [hasUnsavedChanges, performAutoSave]);

  const handleDesempenoResponseChange = (itemId: string, value: number) => {
    setDesempenoResponses((prev) => ({ ...prev, [itemId]: value }));
    setHasUnsavedChanges(true);
  };

  const handleDesempenoCommentChange = (dimensionId: string, comment: string) => {
    setDesempenoComments((prev) => ({ ...prev, [dimensionId]: comment }));
    setHasUnsavedChanges(true);
  };

  const handlePotencialResponseChange = (itemId: string, value: number) => {
    setPotencialResponses((prev) => ({ ...prev, [itemId]: value }));
    setHasUnsavedChanges(true);
  };

  const handlePotencialCommentChange = (dimensionId: string, comment: string) => {
    setPotencialComments((prev) => ({ ...prev, [dimensionId]: comment }));
    setHasUnsavedChanges(true);
  };

  const handleSaveDraft = () => {
    performAutoSave();
    toast.success("Borrador guardado correctamente");
  };

  const handleSubmitClick = () => {
    if (!desempenoComplete) {
      const incompleteDims = getIncompleteDimensions(desempenoResponses, desempenoDimensions);
      const dimNames = incompleteDims.map((d) => d.nombre).join(", ");
      toast.error(
        `Faltan ítems por responder en Desempeño: ${dimNames}`,
        { duration: 5000 }
      );
      return;
    }

    if (!potencialComplete) {
      const incompleteDims = getIncompleteDimensions(potencialResponses, potencialDimensions);
      const dimNames = incompleteDims.map((d) => d.nombre).join(", ");
      toast.error(
        `Faltan ítems por responder en Potencial: ${dimNames}`,
        { duration: 5000 }
      );
      return;
    }

    setShowSubmitDialog(true);
  };

  const handleConfirmSubmit = async () => {
    if (!user || !colaborador) return;

    const draft: EvaluationDraft = {
      usuarioId: colaborador.dpi,
      periodoId: "2025-1",
      tipo: "jefe",
      responses: desempenoResponses,
      comments: desempenoComments,
      evaluadorId: user.dpi,
      colaboradorId: colaborador.dpi,
      evaluacionPotencial: {
        responses: potencialResponses,
        comments: potencialComments,
      },
      estado: "enviado",
      progreso: 100,
      fechaUltimaModificacion: new Date().toISOString(),
    };

    await submitEvaluation(draft);
    
    // Generar resultado final automáticamente
    await generateFinalResult(colaborador.dpi, "2025-1");
    
    toast.success("¡Evaluación enviada exitosamente! Se ha generado el resultado final.");
    navigate("/evaluacion-equipo");
  };
  
  // Función para generar resultado final automáticamente
  const generateFinalResult = async (colaboradorId: string, periodoId: string) => {
    try {
      const autoevaluacion = await getSubmittedEvaluation(colaboradorId, periodoId) || 
                           getMockColaboradorEvaluation(colaboradorId);
      const evaluacionJefe = await getJefeEvaluationDraft(user?.dpi || "", colaboradorId, periodoId);
      
      if (!autoevaluacion || !evaluacionJefe) return;
      
      // Calcular resultado final
      const resultadoFinal = calculateCompleteFinalScore(
        autoevaluacion,
        evaluacionJefe,
        desempenoDimensions,
        potencialDimensions
      );
      
      // Guardar resultado final (por ahora en localStorage, luego en Supabase)
      const resultadoKey = `final_result_${colaboradorId}_${periodoId}`;
      localStorage.setItem(resultadoKey, JSON.stringify({
        colaboradorId,
        periodoId,
        resultadoFinal,
        fechaGeneracion: new Date().toISOString(),
      }));
      
      // Generar plan de desarrollo con IA automáticamente
      try {
        const plan = await generateDevelopmentPlan(
          colaboradorId,
          periodoId,
          autoevaluacion,
          evaluacionJefe,
          resultadoFinal,
          desempenoDimensions,
          potencialDimensions
        );
        
        if (plan) {
          const planKey = `development_plan_${colaboradorId}_${periodoId}`;
          localStorage.setItem(planKey, JSON.stringify(plan));
          
          // Guardar en Supabase también
          await saveDevelopmentPlanToSupabase(plan);
        }
      } catch (error) {
        console.error("Error generando plan de desarrollo:", error);
        // Continuar aunque falle la generación del plan
      }
    } catch (error) {
      console.error("Error generando resultado final:", error);
    }
  };
  
  // Función auxiliar para guardar plan en Supabase
  const saveDevelopmentPlanToSupabase = async (plan: any) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from("development_plans")
        .insert({
          evaluacion_id: plan.evaluacionId,
          colaborador_id: plan.colaboradorId,
          periodo_id: plan.periodoId,
          competencias_desarrollar: plan.competenciasDesarrollar,
          feedback_individual: plan.feedbackIndividual,
          feedback_grupal: plan.feedbackGrupal,
          editable: plan.editable,
        });
      
      if (error) throw error;
    } catch (error) {
      console.error("Error saving plan to Supabase:", error);
    }
  };

  if (!colaborador) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <p>Cargando...</p>
        </main>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={() => navigate("/evaluacion-equipo")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Equipo
          </Button>
          <div className="flex items-center gap-4">
            {!jefeAlreadyEvaluated && <AutoSaveIndicator status={autoSaveStatus} />}
            <div className="text-right text-sm text-muted-foreground">
              <p>Periodo: 2025-1</p>
              <p>Colaborador: {colaborador.nivel}</p>
            </div>
          </div>
        </div>

        {/* Title and description */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">
              Evaluación de {colaborador.nombre}
            </h1>
            {jefeAlreadyEvaluated && (
              <>
                <Badge className="bg-success text-success-foreground">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Completada
                </Badge>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/evaluacion-equipo/${id}/comparativa`)}
                >
                  Ver Comparativa
                </Button>
              </>
            )}
          </div>
          <p className="text-xl text-muted-foreground">
            {colaborador.cargo} - {colaborador.area} - Nivel {colaborador.nivel}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <p>
              <strong>Evaluador:</strong> {user?.nombre} {user?.apellidos}
            </p>
            <p>
              <strong>Periodo:</strong> Del 1 de Enero al 31 de Marzo, 2025
            </p>
          </div>
        </div>

        {/* Tabs principales */}
        <Tabs value={evaluacionTab} onValueChange={(v) => setEvaluacionTab(v as any)} className="mb-6">
          <TabsList className="w-full">
            <TabsTrigger 
              value="auto" 
              className="flex-1"
              disabled={!jefeAlreadyEvaluated}
            >
              <Eye className="mr-2 h-4 w-4" />
              Autoevaluación del Colaborador
              {!jefeAlreadyEvaluated && <AlertTriangle className="ml-2 h-4 w-4 text-warning" />}
            </TabsTrigger>
            <TabsTrigger value="desempeno" className="flex-1">
              <FileEdit className="mr-2 h-4 w-4" />
              Evaluación de Desempeño
              {desempenoComplete && <CheckCircle2 className="ml-2 h-4 w-4 text-success" />}
            </TabsTrigger>
            <TabsTrigger value="potencial" className="flex-1">
              <FileEdit className="mr-2 h-4 w-4" />
              Evaluación de Potencial
              {potencialComplete && <CheckCircle2 className="ml-2 h-4 w-4 text-success" />}
            </TabsTrigger>
          </TabsList>

          {/* Tab: Autoevaluación del Colaborador (solo lectura) - Solo visible cuando el jefe completó */}
          <TabsContent value="auto" className="space-y-6">
            {jefeAlreadyEvaluated && autoevaluacion ? (
              <Card>
                <CardHeader>
                  <CardTitle>Autoevaluación del Colaborador</CardTitle>
                  <CardDescription>
                    Esta es la autoevaluación realizada por el colaborador. Ahora puede compararla con su evaluación.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {desempenoDimensions.map((dim, idx) => {
                      const dimResponses = dim.items.map(item => autoevaluacion.responses[item.id]).filter(v => v !== undefined);
                      const avg = dimResponses.length > 0 
                        ? dimResponses.reduce((sum, val) => sum + val, 0) / dimResponses.length 
                        : 0;
                      
                      return (
                        <div key={dim.id} className="p-4 rounded-lg border border-border bg-muted/30">
                          <div className="mb-3">
                            <h3 className="font-semibold">{dim.nombre}</h3>
                            <p className="text-sm text-muted-foreground">{dim.descripcion}</p>
                            <div className="mt-2 text-sm">
                              <strong>Promedio:</strong> {avg.toFixed(2)}/5.0
                            </div>
                          </div>
                          <div className="space-y-2">
                            {dim.items.map((item) => (
                              <LikertScale
                                key={item.id}
                                itemId={item.id}
                                itemText={`${item.orden}. ${item.texto}`}
                                value={autoevaluacion.responses[item.id]}
                                onChange={() => {}}
                                disabled={true}
                              />
                            ))}
                          </div>
                          {autoevaluacion.comments[dim.id] && (
                            <div className="mt-3 p-3 bg-background rounded border">
                              <Label className="text-xs text-muted-foreground">Comentarios del colaborador:</Label>
                              <p className="text-sm mt-1">{autoevaluacion.comments[dim.id]}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : jefeAlreadyEvaluated ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  El colaborador aún no ha completado su autoevaluación.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Autoevaluación no disponible</h3>
                  <p className="text-muted-foreground">
                    Complete primero su evaluación de desempeño y potencial para poder ver la autoevaluación del colaborador y realizar la comparación.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Evaluación de Desempeño del Jefe */}
          <TabsContent value="desempeno" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">
                      Evaluación de Desempeño
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Evalúe el desempeño del colaborador en cada dimensión
                    </CardDescription>
                  </div>
                  <DimensionProgress
                    answered={desempenoAnsweredItems}
                    total={desempenoTotalItems}
                  />
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progreso</span>
                    <span className="text-sm text-muted-foreground">
                      {desempenoAnsweredItems} de {desempenoTotalItems} ítems ({Math.round(desempenoProgress)}%)
                    </span>
                  </div>
                  <Progress value={desempenoProgress} className="h-2" />
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={currentDesempenoDimension.toString()} className="w-full">
                  <TabsList className="mb-6 w-full flex-wrap justify-start h-auto gap-2">
                    {desempenoDimensions.map((dim, idx) => {
                      const progress = getDimensionProgress(desempenoResponses, dim);
                      const isComplete = progress.answered === progress.total;

                      return (
                        <TabsTrigger
                          key={dim.id}
                          value={idx.toString()}
                          onClick={() => setCurrentDesempenoDimension(idx)}
                          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          <div className="flex items-center gap-2">
                            <span>Dim. {idx + 1}</span>
                            {isComplete && <span>✓</span>}
                            {!isComplete && (
                              <Badge variant="secondary" className="text-xs">
                                {progress.answered}/{progress.total}
                              </Badge>
                            )}
                          </div>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {desempenoDimensions.map((dim, idx) => {
                    const currentDimProgress = getDimensionProgress(desempenoResponses, dim);
                    return (
                      <TabsContent key={dim.id} value={idx.toString()} className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {dim.nombre} ({Math.round(dim.peso * 100)}%)
                          </h3>
                          <CardDescription className="mt-2">
                            <strong>Peso: {Math.round(dim.peso * 100)}%</strong> •{" "}
                            Dimensión {idx + 1} de {desempenoDimensions.length}
                          </CardDescription>
                          {dim.descripcion && (
                            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                              {dim.descripcion}
                            </p>
                          )}
                        </div>

                        {dim.items.map((item) => (
                          <LikertScale
                            key={item.id}
                            itemId={item.id}
                            itemText={`${item.orden}. ${item.texto}`}
                            value={desempenoResponses[item.id]}
                            onChange={(value) => handleDesempenoResponseChange(item.id, value)}
                            disabled={jefeAlreadyEvaluated}
                          />
                        ))}

                        <div className="mt-6 space-y-2 pt-6 border-t">
                          <Label htmlFor={`comment-desempeno-${dim.id}`}>
                            Comentarios y observaciones
                          </Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Agregue comentarios, ejemplos concretos o observaciones sobre el desempeño del colaborador en esta dimensión.
                          </p>
                          <Textarea
                            id={`comment-desempeno-${dim.id}`}
                            placeholder="Escriba sus comentarios aquí..."
                            value={desempenoComments[dim.id] || ""}
                            onChange={(e) => handleDesempenoCommentChange(dim.id, e.target.value)}
                            rows={4}
                            maxLength={1000}
                            className="resize-none"
                            disabled={jefeAlreadyEvaluated}
                          />
                          <p className="text-xs text-muted-foreground text-right">
                            {desempenoComments[dim.id]?.length || 0}/1000 caracteres
                          </p>
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>

                <div className="mt-8 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentDesempenoDimension(Math.max(0, currentDesempenoDimension - 1))}
                    disabled={currentDesempenoDimension === 0 || jefeAlreadyEvaluated}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentDesempenoDimension(Math.min(desempenoDimensions.length - 1, currentDesempenoDimension + 1))
                    }
                    disabled={currentDesempenoDimension === desempenoDimensions.length - 1 || jefeAlreadyEvaluated}
                  >
                    Siguiente
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>

                {!desempenoComplete && !jefeAlreadyEvaluated && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      Complete todos los ítems de desempeño para poder enviar la evaluación
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Evaluación de Potencial del Jefe */}
          <TabsContent value="potencial" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">
                      Evaluación de Potencial
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Evalúe el potencial futuro del colaborador
                    </CardDescription>
                  </div>
                  <DimensionProgress
                    answered={potencialAnsweredItems}
                    total={potencialTotalItems}
                  />
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progreso</span>
                    <span className="text-sm text-muted-foreground">
                      {potencialAnsweredItems} de {potencialTotalItems} ítems ({Math.round(potencialProgress)}%)
                    </span>
                  </div>
                  <Progress value={potencialProgress} className="h-2" />
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={currentPotencialDimension.toString()} className="w-full">
                  <TabsList className="mb-6 w-full flex-wrap justify-start h-auto gap-2">
                    {potencialDimensions.map((dim, idx) => {
                      const progress = getDimensionProgress(potencialResponses, dim);
                      const isComplete = progress.answered === progress.total;

                      return (
                        <TabsTrigger
                          key={dim.id}
                          value={idx.toString()}
                          onClick={() => setCurrentPotencialDimension(idx)}
                          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          <div className="flex items-center gap-2">
                            <span>Pot. {idx + 1}</span>
                            {isComplete && <span>✓</span>}
                            {!isComplete && (
                              <Badge variant="secondary" className="text-xs">
                                {progress.answered}/{progress.total}
                              </Badge>
                            )}
                          </div>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {potencialDimensions.map((dim, idx) => (
                    <TabsContent key={dim.id} value={idx.toString()} className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {dim.nombre} ({Math.round(dim.peso * 100)}%)
                        </h3>
                        <CardDescription className="mt-2">
                          <strong>Peso: {Math.round(dim.peso * 100)}%</strong> •{" "}
                          Dimensión {idx + 1} de {potencialDimensions.length}
                        </CardDescription>
                        {dim.descripcion && (
                          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                            {dim.descripcion}
                          </p>
                        )}
                      </div>

                      {dim.items.map((item) => (
                        <LikertScale
                          key={item.id}
                          itemId={item.id}
                          itemText={`${item.orden}. ${item.texto}`}
                          value={potencialResponses[item.id]}
                          onChange={(value) => handlePotencialResponseChange(item.id, value)}
                          disabled={jefeAlreadyEvaluated}
                        />
                      ))}

                      <div className="mt-6 space-y-2 pt-6 border-t">
                        <Label htmlFor={`comment-potencial-${dim.id}`}>
                          Comentarios y observaciones
                        </Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Agregue comentarios sobre el potencial del colaborador en esta dimensión.
                        </p>
                        <Textarea
                          id={`comment-potencial-${dim.id}`}
                          placeholder="Escriba sus comentarios aquí..."
                          value={potencialComments[dim.id] || ""}
                          onChange={(e) => handlePotencialCommentChange(dim.id, e.target.value)}
                          rows={4}
                          maxLength={1000}
                          className="resize-none"
                          disabled={jefeAlreadyEvaluated}
                        />
                        <p className="text-xs text-muted-foreground text-right">
                          {potencialComments[dim.id]?.length || 0}/1000 caracteres
                        </p>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>

                <div className="mt-8 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPotencialDimension(Math.max(0, currentPotencialDimension - 1))}
                    disabled={currentPotencialDimension === 0 || jefeAlreadyEvaluated}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentPotencialDimension(Math.min(potencialDimensions.length - 1, currentPotencialDimension + 1))
                    }
                    disabled={currentPotencialDimension === potencialDimensions.length - 1 || jefeAlreadyEvaluated}
                  >
                    Siguiente
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>

                {!potencialComplete && !jefeAlreadyEvaluated && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      Complete todos los ítems de potencial para poder enviar la evaluación
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action buttons */}
        {!jefeAlreadyEvaluated && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={handleSaveDraft}>
              <Save className="mr-2 h-4 w-4" />
              Guardar Borrador
            </Button>
            <Button 
              onClick={handleSubmitClick}
              disabled={!isComplete}
              className="relative"
            >
              <Send className="mr-2 h-4 w-4" />
              Enviar Evaluación Completa
            </Button>
          </div>
        )}

        {!isComplete && !jefeAlreadyEvaluated && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-warning">
              <AlertTriangle className="h-4 w-4" />
              <span>
                Complete todas las secciones (Desempeño y Potencial) para poder enviar la evaluación
              </span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Estado Desempeño: {desempenoComplete ? "✓ Completo" : `Faltan ${desempenoTotalItems - desempenoAnsweredItems} ítems`}</p>
              <p>Estado Potencial: {potencialComplete ? "✓ Completo" : `Faltan ${potencialTotalItems - potencialAnsweredItems} ítems`}</p>
            </div>
          </div>
        )}
      </main>

      {/* Submit confirmation dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de enviar su evaluación?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Una vez enviada, no podrá modificarla a menos que RR.HH. reabra su
                evaluación.
              </p>
              <p className="font-semibold text-foreground">
                Desempeño: {desempenoAnsweredItems}/{desempenoTotalItems} ítems completados
              </p>
              <p className="font-semibold text-foreground">
                Potencial: {potencialAnsweredItems}/{potencialTotalItems} ítems completados
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit}>
              Sí, enviar evaluación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EvaluacionColaborador;