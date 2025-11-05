import { useState, useEffect, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
import { LikertScale } from "@/components/evaluation/LikertScale";
import { EvaluationInstructions } from "@/components/evaluation/EvaluationInstructions";
import { DimensionProgress } from "@/components/evaluation/DimensionProgress";
import { AutoSaveIndicator } from "@/components/evaluation/AutoSaveIndicator";
import { INSTRUMENT_A1 } from "@/data/instruments";
import {
  saveEvaluationDraft,
  getEvaluationDraft,
  submitEvaluation,
  hasSubmittedEvaluation,
  EvaluationDraft,
} from "@/lib/storage";
import {
  isEvaluationComplete,
  getIncompleteDimensions,
  getDimensionProgress,
} from "@/lib/calculations";
import { OpenQuestions } from "@/components/evaluation/OpenQuestions";
import { getOpenQuestions, saveOpenQuestionResponses } from "@/lib/supabase";
import { getActivePeriod } from "@/lib/supabase";
import { ArrowLeft, ArrowRight, Save, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAutoSave } from "@/hooks/useAutoSave";

const Autoevaluacion = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const instrument = INSTRUMENT_A1;

  const [responses, setResponses] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [openQuestionResponses, setOpenQuestionResponses] = useState<Record<string, string>>({});
  const [openQuestions, setOpenQuestions] = useState<Array<{
    id: string;
    pregunta: string;
    tipo: "capacitacion" | "herramienta" | "otro";
    orden: number;
    obligatoria: boolean;
  }>>([]);
  const [currentDimension, setCurrentDimension] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [periodoId, setPeriodoId] = useState<string>("");

  const dimensions = instrument.dimensionesDesempeno;
  const totalItems = dimensions.reduce((sum, dim) => sum + dim.items.length, 0);
  const answeredItems = Object.keys(responses).length;
  const progressPercentage = (answeredItems / totalItems) * 100;
  const isComplete = isEvaluationComplete(responses, dimensions);

  // Load existing draft and open questions on mount
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        // Obtener período activo
        const activePeriod = await getActivePeriod();
        if (activePeriod) {
          setPeriodoId(activePeriod.id);
        } else {
          // Fallback: buscar período 2025-1 por nombre
          const { supabase } = await import("@/integrations/supabase/client");
          const { data: periodData } = await supabase
            .from("evaluation_periods")
            .select("id")
            .eq("nombre", "2025-1")
            .single();
          if (periodData) {
            setPeriodoId(periodData.id);
          } else {
            toast.error("No se encontró un período de evaluación activo");
            return;
          }
        }

        const periodoIdFinal = activePeriod?.id || periodoId;

        // Check if already submitted
        const alreadySubmitted = await hasSubmittedEvaluation(user.dpi, periodoIdFinal);
        if (alreadySubmitted) {
          navigate("/mi-autoevaluacion");
          return;
        }

        // Load draft
        const draft = await getEvaluationDraft(user.dpi, periodoIdFinal);
        if (draft) {
          setResponses(draft.responses);
          setComments(draft.comments);
          toast.info("Se ha cargado su borrador guardado");
        }

        // Load open questions
        const questions = await getOpenQuestions();
        setOpenQuestions(questions);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Error al cargar datos");
      }
    };

    loadData();
  }, [user, navigate]);

  // Auto-save functionality mejorado con hook personalizado
  const performAutoSave = useCallback(async () => {
    if (!user || !periodoId) return;

    setAutoSaveStatus("saving");
    
    const draft: EvaluationDraft = {
      usuarioId: user.dpi,
      periodoId: periodoId,
      tipo: "auto",
      responses,
      comments,
      estado: "borrador",
      progreso: progressPercentage,
      fechaUltimaModificacion: new Date().toISOString(),
    };

    await saveEvaluationDraft(draft);
    
    // Guardar también respuestas a preguntas abiertas
    if (Object.keys(openQuestionResponses).length > 0) {
      const openQuestionsKey = `open_questions_${user.dpi}_${periodoId}`;
      localStorage.setItem(openQuestionsKey, JSON.stringify(openQuestionResponses));
    }
    
    setAutoSaveStatus("saved");
    setHasUnsavedChanges(false);
    setTimeout(() => setAutoSaveStatus("idle"), 2000);
  }, [user, periodoId, responses, comments, progressPercentage, openQuestionResponses]);

  // Usar hook de auto-guardado mejorado
  // Guarda automáticamente 2 segundos después de la última edición
  // También guarda antes de cerrar la página y cada 30 segundos como respaldo
  useAutoSave(performAutoSave, hasUnsavedChanges, {
    debounceMs: 2000, // Guardar 2 segundos después de dejar de escribir
    periodicSaveMs: 30000, // Guardado periódico cada 30 segundos como respaldo
    saveBeforeUnload: true, // Guardar antes de cerrar la página
  });

  const handleResponseChange = (itemId: string, value: number) => {
    setResponses((prev) => ({ ...prev, [itemId]: value }));
    setHasUnsavedChanges(true);
  };

  const handleOpenQuestionChange = (questionId: string, respuesta: string) => {
    setOpenQuestionResponses((prev) => ({ ...prev, [questionId]: respuesta }));
    setHasUnsavedChanges(true);
  };

const handleCommentChange = (dimensionId: string, value: string) => {
  setComments((prev) => ({ ...prev, [dimensionId]: value }));
  setHasUnsavedChanges(true);
};

const handleSaveDraft = () => {
    performAutoSave();
    toast.success("Borrador guardado correctamente");
  };

  const handleSubmitClick = () => {
    if (!isComplete) {
      const incompleteDims = getIncompleteDimensions(responses, dimensions);
      const dimNames = incompleteDims.map((d) => d.nombre).join(", ");
      toast.error(
        `Faltan ${totalItems - answeredItems} ítems por responder en: ${dimNames}`,
        { duration: 5000 }
      );
      return;
    }

    setShowSubmitDialog(true);
  };

  const handleConfirmSubmit = async () => {
    if (!user) return;

    const draft: EvaluationDraft = {
      usuarioId: user.dpi,
      periodoId: "2025-1",
      tipo: "auto",
      responses,
      comments,
      estado: "enviado",
      progreso: 100,
      fechaUltimaModificacion: new Date().toISOString(),
    };

    await submitEvaluation(draft);
    
    // Guardar respuestas a preguntas abiertas
    if (Object.keys(openQuestionResponses).length > 0) {
      // Obtener el ID de la evaluación guardada (necesitaríamos obtenerlo de Supabase)
      // Por ahora guardamos en localStorage como backup
      const openQuestionsKey = `open_questions_${user.dpi}_2025-1`;
      localStorage.setItem(openQuestionsKey, JSON.stringify(openQuestionResponses));
      
      // Intentar guardar en Supabase también
      await saveOpenQuestionResponses("", openQuestionResponses); // El ID se obtendría de Supabase
    }
    
    toast.success("¡Autoevaluación enviada exitosamente!");
    navigate("/dashboard");
  };

  const currentDim = dimensions[currentDimension];
  const dimProgress = getDimensionProgress(responses, currentDim);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Button>
          <div className="flex items-center gap-4">
            <AutoSaveIndicator status={autoSaveStatus} />
            <div className="text-right text-sm text-muted-foreground">
              <p>Periodo: 2025-1</p>
              <p>Nivel: {user?.nivel}</p>
            </div>
          </div>
        </div>

        {/* Title and description */}
        <div className="mb-6 space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            INSTRUMENTO DE EVALUACIÓN DE DESEMPEÑO Y POTENCIAL
          </h1>
          <p className="text-xl text-muted-foreground">
            {user?.cargo} - NIVEL {user?.nivel}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <p>
              <strong>Nombre:</strong> {user?.nombre} {user?.apellidos}
            </p>
            <p>
              <strong>Periodo:</strong> Del 1 de Enero al 31 de Marzo, 2025
            </p>
            {instrument.tiempoEstimado && (
              <Badge variant="outline">⏱️ {instrument.tiempoEstimado}</Badge>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-6">
          <EvaluationInstructions />
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progreso General</span>
            <span className="text-sm text-muted-foreground">
              {answeredItems} de {totalItems} ítems respondidos ({Math.round(progressPercentage)}%)
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Evaluation form */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">
                  {currentDim.nombre}
                </CardTitle>
                <CardDescription className="mt-2">
                  <strong>Peso: {Math.round(currentDim.peso * 100)}%</strong> •{" "}
                  Dimensión {currentDimension + 1} de {dimensions.length}
                </CardDescription>
                {currentDim.descripcion && (
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    {currentDim.descripcion}
                  </p>
                )}
              </div>
              <DimensionProgress
                answered={dimProgress.answered}
                total={dimProgress.total}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={currentDimension.toString()} className="w-full">
              <TabsList className="mb-6 w-full flex-wrap justify-start h-auto gap-2">
                {dimensions.map((dim, idx) => {
                  const progress = getDimensionProgress(responses, dim);
                  const isComplete = progress.answered === progress.total;

                  return (
                    <TabsTrigger
                      key={dim.id}
                      value={idx.toString()}
                      onClick={() => setCurrentDimension(idx)}
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

              {dimensions.map((dim, idx) => (
                <TabsContent key={dim.id} value={idx.toString()} className="space-y-4">
                  {dim.items.map((item) => (
                    <LikertScale
                      key={item.id}
                      itemId={item.id}
                      itemText={`${item.orden}. ${item.texto}`}
                      value={responses[item.id]}
                      onChange={(value) => handleResponseChange(item.id, value)}
                    />
                  ))}

                  <div className="mt-6 space-y-2 pt-6 border-t">
                    <Label htmlFor={`comment-${dim.id}`}>
                      Comentarios y evidencias
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Agregue comentarios, ejemplos concretos, logros específicos o
                      evidencias que respalden su autoevaluación en esta dimensión.
                      Recomendado para calificaciones de 1 o 5.
                    </p>
                    <Textarea
                      id={`comment-${dim.id}`}
                      placeholder="Escriba sus comentarios aquí..."
                      value={comments[dim.id] || ""}
                      onChange={(e) => handleCommentChange(dim.id, e.target.value)}
                      rows={4}
                      maxLength={1000}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {comments[dim.id]?.length || 0}/1000 caracteres
                    </p>
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {/* Navigation and action buttons */}
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
                    setCurrentDimension(Math.min(dimensions.length - 1, currentDimension + 1))
                  }
                  disabled={currentDimension === dimensions.length - 1}
                >
                  Siguiente
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-2">
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
                  Enviar Evaluación
                </Button>
              </div>
            </div>

            {!isComplete && (
              <div className="mt-4 flex items-center gap-2 text-sm text-warning">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  Complete todos los ítems para poder enviar su evaluación
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preguntas Abiertas */}
        {openQuestions.length > 0 && (
          <OpenQuestions
            questions={openQuestions}
            responses={openQuestionResponses}
            onChange={handleOpenQuestionChange}
          />
        )}
      </main>

      {/* Submit confirmation dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de enviar su autoevaluación?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Una vez enviada, no podrá modificarla a menos que RR.HH. reabra su
                evaluación.
              </p>
              <p className="font-semibold text-foreground">
                Ha completado {answeredItems}/{totalItems} ítems (100%)
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

export default Autoevaluacion;
