import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { MobileLikertScale } from "@/components/evaluation/MobileLikertScale";
import { MobileNPSQuestion } from "@/components/evaluation/MobileNPSQuestion";
import { MobileOpenQuestions } from "@/components/evaluation/MobileOpenQuestions";
import { EvaluationInstructions } from "@/components/evaluation/EvaluationInstructions";
import { AutoSaveIndicator } from "@/components/evaluation/AutoSaveIndicator";
import { WizardHeader } from "@/components/evaluation/wizard/WizardHeader";
import { WizardStep } from "@/components/evaluation/wizard/WizardStep";
import { WizardFooter } from "@/components/evaluation/wizard/WizardFooter";
import { Instrument, Dimension } from "@/types/evaluation";
import { EvaluationPeriod } from "@/types/period";
import { getInstrumentForUser } from "@/lib/instruments";
import {
  saveEvaluationDraft,
  getEvaluationDraft,
  submitEvaluation,
  hasSubmittedEvaluation,
  EvaluationDraft,
} from "@/lib/storage";
import {
  getDimensionProgress,
} from "@/lib/calculations";
import { getOpenQuestions, saveOpenQuestionResponses } from "@/lib/supabase";
import { getActivePeriod } from "@/lib/supabase";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { useAutoSave } from "@/hooks/useAutoSave";

const Autoevaluacion = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [instrument, setInstrument] = useState<Instrument | null>(null);

  const [responses, setResponses] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [openQuestionResponses, setOpenQuestionResponses] = useState<Record<string, string>>({});
  const [npsScore, setNpsScore] = useState<number | undefined>(undefined);
  const [openQuestions, setOpenQuestions] = useState<Array<{
    id: string;
    pregunta: string;
    tipo: "capacitacion" | "herramienta" | "otro";
    orden: number;
    obligatoria: boolean;
  }>>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [periodoId, setPeriodoId] = useState<string>("");
  const [periodoActivo, setPeriodoActivo] = useState<EvaluationPeriod | null>(null);

  const dimensions = instrument?.dimensionesDesempeno || [];
  const totalItems = dimensions.reduce((sum, dim) => sum + dim.items.length, 0);
  const answeredItems = Object.keys(responses).length;
  const progressPercentage = totalItems > 0 ? (answeredItems / totalItems) * 100 : 0;

  // Wizard steps: dimensiones + NPS + preguntas abiertas
  const wizardSteps = useMemo(() => {
    const steps: Array<{
      id: string;
      label: string;
      completed: boolean;
      type: "dimension" | "nps" | "open-questions";
      data?: Dimension;
    }> = [];

    // Agregar dimensiones
    dimensions.forEach((dim, idx) => {
      const dimProgress = getDimensionProgress(responses, dim);
      steps.push({
        id: dim.id,
        label: dim.nombre,
        completed: dimProgress.answered === dimProgress.total,
        type: "dimension",
        data: dim,
      });
    });

    // Agregar NPS
    steps.push({
      id: "nps",
      label: "Recomendación",
      completed: npsScore !== undefined,
      type: "nps",
    });

    // Agregar preguntas abiertas
    if (openQuestions.length > 0) {
      const allAnswered = openQuestions
        .filter((q) => q.obligatoria)
        .every((q) => openQuestionResponses[q.id]?.trim().length > 0);
      steps.push({
        id: "open-questions",
        label: "Necesidades",
        completed: allAnswered,
        type: "open-questions",
      });
    }

    return steps;
  }, [dimensions, responses, npsScore, openQuestions, openQuestionResponses]);

  const currentWizardStep = wizardSteps[currentStep];
  const isLastStep = currentStep === wizardSteps.length - 1;

  // Load existing draft and open questions on mount
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        // Obtener período activo
        const activePeriod = await getActivePeriod();
        let resolvedPeriod: EvaluationPeriod | null = null;

        if (activePeriod) {
          resolvedPeriod = activePeriod;
        } else {
          // Fallback: buscar período 2025-1 por nombre
          const { supabase } = await import("@/integrations/supabase/client");
          const { data: periodData } = await supabase
            .from("evaluation_periods")
            .select("*")
            .eq("nombre", "2025-1")
            .single();
          if (periodData) {
            resolvedPeriod = {
              id: periodData.id,
              nombre: periodData.nombre,
              fechaInicio: periodData.fecha_inicio,
              fechaFin: periodData.fecha_fin,
              fechaCierreAutoevaluacion: periodData.fecha_cierre_autoevaluacion,
              fechaCierreEvaluacionJefe: periodData.fecha_cierre_evaluacion_jefe,
              estado: periodData.estado,
              descripcion: periodData.descripcion,
              createdAt: periodData.created_at,
              updatedAt: periodData.updated_at,
            };
          } else {
            toast.error("No se encontró un período de evaluación activo");
            return;
          }
        }

        if (!resolvedPeriod) {
          toast.error("No se logró determinar el período de evaluación activo");
          return;
        }

        setPeriodoActivo(resolvedPeriod);
        setPeriodoId(resolvedPeriod.id);

        const periodoIdFinal = resolvedPeriod.id;

        // Cargar instrumento según nivel del usuario
        const userInstrument = await getInstrumentForUser(user.nivel);
        if (!userInstrument) {
          toast.error("No se encontró un instrumento de evaluación para su nivel");
          return;
        }
        setInstrument(userInstrument);

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
          // Cargar NPS si existe en el draft (almacenado como extensión)
          const npsKey = `nps_${user.dpi}_${periodoIdFinal}`;
          const savedNps = localStorage.getItem(npsKey);
          if (savedNps) {
            setNpsScore(parseInt(savedNps));
          }
          toast.info("Se ha cargado su borrador guardado");
        }

        // Load open questions
        const questions = await getOpenQuestions();
        setOpenQuestions(questions);

        const openQuestionsKey = `open_questions_${user.dpi}_${periodoIdFinal}`;
        const savedOpenQuestions = localStorage.getItem(openQuestionsKey);
        if (savedOpenQuestions) {
          try {
            const parsed = JSON.parse(savedOpenQuestions);
            setOpenQuestionResponses(parsed);
          } catch {
            // ignore parsing errors
          }
        }

        const npsKey = `nps_${user.dpi}_${periodoIdFinal}`;
        const savedNps = localStorage.getItem(npsKey);
        if (savedNps) {
          setNpsScore(parseInt(savedNps));
        }
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
    
    // Guardar también respuestas a preguntas abiertas y NPS
    if (Object.keys(openQuestionResponses).length > 0) {
      const openQuestionsKey = `open_questions_${user.dpi}_${periodoId}`;
      localStorage.setItem(openQuestionsKey, JSON.stringify(openQuestionResponses));
    }
    
    if (npsScore !== undefined) {
      const npsKey = `nps_${user.dpi}_${periodoId}`;
      localStorage.setItem(npsKey, npsScore.toString());
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

  const handleNpsChange = (value: number) => {
    setNpsScore(value);
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

  // Validación del paso actual
  const canGoNext = useMemo(() => {
    if (!currentWizardStep) return false;

    if (currentWizardStep.type === "dimension" && currentWizardStep.data) {
      // Validar que todas las preguntas de la dimensión actual estén respondidas
      return currentWizardStep.data.items.every((item) => responses[item.id] !== undefined);
    }

    if (currentWizardStep.type === "nps") {
      return npsScore !== undefined;
    }

    if (currentWizardStep.type === "open-questions") {
      // Validar preguntas obligatorias
      return openQuestions
        .filter((q) => q.obligatoria)
        .every((q) => openQuestionResponses[q.id]?.trim().length > 0);
    }

    return false;
  }, [currentWizardStep, responses, npsScore, openQuestions, openQuestionResponses]);

  const handleNext = () => {
    if (!canGoNext) {
      toast.error("Por favor completa todas las respuestas antes de continuar");
      return;
    }
    if (currentStep < wizardSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmitClick = () => {
    if (!canGoNext) {
      toast.error("Por favor completa todas las respuestas antes de enviar");
      return;
    }
    setShowSubmitDialog(true);
  };

  const handleConfirmSubmit = async () => {
    if (!user || !periodoId) return;
    setIsSubmitting(true);

    const draft: EvaluationDraft = {
      usuarioId: user.dpi,
      periodoId: periodoId,
      tipo: "auto",
      responses,
      comments,
      estado: "enviado",
      progreso: 100,
      fechaUltimaModificacion: new Date().toISOString(),
    };

    // Guardar en Supabase con NPS
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: evalData } = await supabase
      .from("evaluations")
      .select("id")
      .eq("usuario_id", user.dpi)
      .eq("periodo_id", periodoId)
      .eq("tipo", "auto")
      .single();

    if (evalData?.id && npsScore !== undefined) {
      await supabase
        .from("evaluations")
        .update({ nps_score: npsScore })
        .eq("id", evalData.id);
    }
    
    await submitEvaluation(draft);

    // Obtener ID definitivo de la evaluación después del submit
    let evaluationId = evalData?.id;
    if (!evaluationId) {
      const { data: refreshed, error: refreshedError } = await supabase
        .from("evaluations")
        .select("id")
        .eq("usuario_id", user.dpi)
        .eq("periodo_id", periodoId)
        .eq("tipo", "auto")
        .single();
      if (!refreshedError) {
        evaluationId = refreshed?.id;
      }
    }

    // Guardar respuestas a preguntas abiertas
    if (Object.keys(openQuestionResponses).length > 0) {
      const openQuestionsKey = `open_questions_${user.dpi}_${periodoId}`;
      localStorage.setItem(openQuestionsKey, JSON.stringify(openQuestionResponses));

      if (evaluationId) {
        await saveOpenQuestionResponses(evaluationId, openQuestionResponses);
      }
    }

    // Guardar respuesta NPS en localStorage para referencia y limpiar luego
    if (npsScore !== undefined) {
      const npsKey = `nps_${user.dpi}_${periodoId}`;
      localStorage.setItem(npsKey, npsScore.toString());
    }
    
    toast.success("¡Autoevaluación enviada exitosamente!");
    setIsSubmitting(false);
    navigate("/dashboard");
  };

  // Loading state
  if (!instrument) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <p>Cargando instrumento de evaluación...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Volver al Dashboard</span>
            <span className="sm:hidden">Volver</span>
          </Button>
          <div className="flex items-center gap-3 sm:gap-4">
            <AutoSaveIndicator status={autoSaveStatus} />
            <Button variant="outline" size="sm" onClick={handleSaveDraft}>
              <Save className="mr-2 h-3 w-3" />
              Guardar
            </Button>
          </div>
        </div>

        {/* Title and period info */}
        <div className="mb-6 space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Autoevaluación de Desempeño
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground">
            {user?.nombre} {user?.apellidos} • {user?.cargo}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Badge variant="outline">Nivel {user?.nivel}</Badge>
            <span>•</span>
            <span>{periodoActivo?.nombre ?? "Período activo"}</span>
            {instrument.tiempoEstimado && (
              <>
                <span>•</span>
                <Badge variant="secondary">⏱️ {instrument.tiempoEstimado}</Badge>
              </>
            )}
          </div>
        </div>

        {/* Instructions - Collapsible on mobile */}
        <div className="mb-6">
          <EvaluationInstructions />
        </div>

        {/* Wizard Header con Stepper */}
        <WizardHeader
          steps={wizardSteps}
          currentStep={currentStep}
          totalProgress={progressPercentage}
          answeredItems={answeredItems}
          totalItems={totalItems}
        />

        {/* Wizard Step Content */}
        <div className="mb-6">
          {currentWizardStep?.type === "dimension" && currentWizardStep.data && (
            <WizardStep
              title={currentWizardStep.data.nombre}
              description={currentWizardStep.data.descripcion}
              weight={currentWizardStep.data.peso}
              currentStep={currentStep}
              totalSteps={wizardSteps.length}
              answered={getDimensionProgress(responses, currentWizardStep.data).answered}
              total={getDimensionProgress(responses, currentWizardStep.data).total}
            >
              <div className="space-y-6">
                {currentWizardStep.data.items.map((item) => (
                  <MobileLikertScale
                    key={item.id}
                    itemId={item.id}
                    itemText={`${item.orden}. ${item.texto}`}
                    value={responses[item.id]}
                    onChange={(value) => handleResponseChange(item.id, value)}
                  />
                ))}

                <div className="mt-8 space-y-3 pt-6 border-t-2">
                  <Label htmlFor={`comment-${currentWizardStep.data.id}`} className="text-base font-semibold">
                    Comentarios y evidencias (opcional)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Agregue comentarios, ejemplos concretos, logros específicos o evidencias que respalden su autoevaluación en esta dimensión.
                  </p>
                  <Textarea
                    id={`comment-${currentWizardStep.data.id}`}
                    placeholder="Escriba sus comentarios aquí..."
                    value={comments[currentWizardStep.data.id] || ""}
                    onChange={(e) => handleCommentChange(currentWizardStep.data!.id, e.target.value)}
                    rows={5}
                    maxLength={1000}
                    className="resize-none text-base"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {comments[currentWizardStep.data.id]?.length || 0}/1000 caracteres
                  </p>
                </div>
              </div>
            </WizardStep>
          )}

          {currentWizardStep?.type === "nps" && (
            <WizardStep
              title="Recomendación Institucional"
              description="Tu opinión nos ayuda a mejorar como organización"
              currentStep={currentStep}
              totalSteps={wizardSteps.length}
            >
              <MobileNPSQuestion value={npsScore} onChange={handleNpsChange} />
            </WizardStep>
          )}

          {currentWizardStep?.type === "open-questions" && (
            <WizardStep
              title="Necesidades de Desarrollo"
              description="Comparta sus necesidades para mejorar su desempeño"
              currentStep={currentStep}
              totalSteps={wizardSteps.length}
            >
              <MobileOpenQuestions
                questions={openQuestions}
                responses={openQuestionResponses}
                onChange={handleOpenQuestionChange}
              />
            </WizardStep>
          )}
        </div>

        {/* Wizard Footer con Navegación */}
        <WizardFooter
          currentStep={currentStep}
          totalSteps={wizardSteps.length}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSubmit={handleSubmitClick}
          canGoNext={canGoNext}
          isLastStep={isLastStep}
          isSubmitting={isSubmitting}
        />
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
