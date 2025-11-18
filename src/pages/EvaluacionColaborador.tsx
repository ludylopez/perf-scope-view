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
import { MobileLikertScale } from "@/components/evaluation/MobileLikertScale";
import { DimensionProgress } from "@/components/evaluation/DimensionProgress";
import { AutoSaveIndicator } from "@/components/evaluation/AutoSaveIndicator";
import { WizardHeader } from "@/components/evaluation/wizard/WizardHeader";
import { WizardStep } from "@/components/evaluation/wizard/WizardStep";
import { WizardFooter } from "@/components/evaluation/wizard/WizardFooter";
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
import { Instrument } from "@/types/evaluation";
import { EvaluationPeriod } from "@/types/period";
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
  Users2,
} from "lucide-react";
import { toast } from "sonner";
import { generateDevelopmentPlan } from "@/lib/developmentPlan";
import { getInstrumentForUser } from "@/lib/instruments";
import { getActivePeriod } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { perteneceACuadrilla as verificarCuadrilla, getGruposDelColaborador } from "@/lib/jerarquias";
import { Checkbox } from "@/components/ui/checkbox";
import { useAutoSave } from "@/hooks/useAutoSave";
import { validateEvaluationPermission } from "@/lib/validations";

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
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [periodoId, setPeriodoId] = useState<string>("");
  const [periodoActivo, setPeriodoActivo] = useState<EvaluationPeriod | null>(null);

  const [colaborador, setColaborador] = useState<any>(null);
  const [autoevaluacion, setAutoevaluacion] = useState<any>(null);
  const [jefeAlreadyEvaluated, setJefeAlreadyEvaluated] = useState(false);
  const [evaluacionTab, setEvaluacionTab] = useState<"auto" | "evaluacion" | "desempeno" | "potencial">("evaluacion");
  const [perteneceACuadrilla, setPerteneceACuadrilla] = useState(false);
  const [gruposColaborador, setGruposColaborador] = useState<any[]>([]);
  const [generarFeedbackGrupal, setGenerarFeedbackGrupal] = useState(false);
  
  const [desempenoResponses, setDesempenoResponses] = useState<Record<string, number>>({});
  const [desempenoComments, setDesempenoComments] = useState<Record<string, string>>({});
  const [currentDesempenoDimension, setCurrentDesempenoDimension] = useState(0);
  
  const [potencialResponses, setPotencialResponses] = useState<Record<string, number>>({});
  const [potencialComments, setPotencialComments] = useState<Record<string, string>>({});
  const [currentPotencialDimension, setCurrentPotencialDimension] = useState(0);
  
  // Wizard state - unificar desempeño y potencial en un flujo continuo
  const [currentWizardStep, setCurrentWizardStep] = useState(0);
  
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Validar que instrument exista antes de acceder a sus propiedades
  const desempenoDimensions = instrument?.dimensionesDesempeno || [];
  const potencialDimensions = instrument?.dimensionesPotencial || [];
  
  const desempenoTotalItems = desempenoDimensions.reduce((sum, dim) => sum + dim.items.length, 0);
  const potencialTotalItems = potencialDimensions.reduce((sum, dim) => sum + dim.items.length, 0);
  
  const desempenoAnsweredItems = Object.keys(desempenoResponses).length;
  const potencialAnsweredItems = Object.keys(potencialResponses).length;
  
  const desempenoProgress = desempenoTotalItems > 0 ? (desempenoAnsweredItems / desempenoTotalItems) * 100 : 0;
  const potencialProgress = potencialTotalItems > 0 ? (potencialAnsweredItems / potencialTotalItems) * 100 : 0;
  
  // Usar useMemo para recalcular cuando cambien las respuestas
  const desempenoComplete = useMemo(() => 
    desempenoDimensions.length > 0 ? isEvaluationComplete(desempenoResponses, desempenoDimensions) : false,
    [desempenoResponses, desempenoDimensions]
  );
  
  const potencialComplete = useMemo(() => 
    potencialDimensions.length > 0 ? isEvaluationComplete(potencialResponses, potencialDimensions) : false,
    [potencialResponses, potencialDimensions]
  );
  
  const isComplete = desempenoComplete && potencialComplete;

  // Wizard steps: combinar dimensiones de desempeño y potencial en un flujo continuo
  const wizardSteps = useMemo(() => {
    const steps: Array<{
      id: string;
      label: string;
      completed: boolean;
      type: "desempeno" | "potencial";
      data?: any; // Dimension data
      section: "desempeno" | "potencial";
    }> = [];

    // Agregar dimensiones de desempeño
    desempenoDimensions.forEach((dim) => {
      const dimProgress = getDimensionProgress(desempenoResponses, dim);
      steps.push({
        id: `desempeno-${dim.id}`,
        label: dim.nombre,
        completed: dimProgress.answered === dimProgress.total,
        type: "desempeno",
        data: dim,
        section: "desempeno",
      });
    });

    // Agregar dimensiones de potencial
    potencialDimensions.forEach((dim) => {
      const dimProgress = getDimensionProgress(potencialResponses, dim);
      steps.push({
        id: `potencial-${dim.id}`,
        label: dim.nombre,
        completed: dimProgress.answered === dimProgress.total,
        type: "potencial",
        data: dim,
        section: "potencial",
      });
    });

    return steps;
  }, [desempenoDimensions, potencialDimensions, desempenoResponses, potencialResponses]);

  const totalWizardItems = desempenoTotalItems + potencialTotalItems;
  const totalWizardAnswered = desempenoAnsweredItems + potencialAnsweredItems;
  const totalWizardProgress = totalWizardItems > 0 
    ? Math.round((totalWizardAnswered / totalWizardItems) * 100) 
    : 0;

  const currentStepData = wizardSteps[currentWizardStep];
  const isLastWizardStep = currentWizardStep === wizardSteps.length - 1;

  // Validación del paso actual del wizard
  const canGoNextWizard = useMemo(() => {
    if (!currentStepData || !currentStepData.data) return false;
    
    if (currentStepData.type === "desempeno") {
      return currentStepData.data.items.every((item: any) => desempenoResponses[item.id] !== undefined);
    } else if (currentStepData.type === "potencial") {
      return currentStepData.data.items.every((item: any) => potencialResponses[item.id] !== undefined);
    }
    
    return false;
  }, [currentStepData, desempenoResponses, potencialResponses]);

  // Posicionar wizard en el primer paso incompleto cuando se cargan los datos
  useEffect(() => {
    if (wizardSteps.length > 0 && instrument) {
      const firstIncompleteIndex = wizardSteps.findIndex(step => !step.completed);
      if (firstIncompleteIndex !== -1 && firstIncompleteIndex !== currentWizardStep) {
        setCurrentWizardStep(firstIncompleteIndex);
      }
    }
  }, [instrument, wizardSteps.length]); // Solo cuando se carga el instrumento inicialmente

  useEffect(() => {
    if (!id || !user) {
      navigate("/evaluacion-equipo");
      return;
    }

    const loadData = async () => {
      try {
        // Obtener período activo
        let currentPeriodoId: string | null = null;
        const activePeriod = await getActivePeriod();
        if (activePeriod) {
          setPeriodoActivo(activePeriod);
          setPeriodoId(activePeriod.id);
          currentPeriodoId = activePeriod.id;
        } else {
          // Fallback: buscar período 2025-1 por nombre
          const { data: periodData } = await supabase
            .from("evaluation_periods")
            .select("*")
            .eq("nombre", "2025-1")
            .single();
          if (periodData) {
            const fallbackPeriod: EvaluationPeriod = {
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
            setPeriodoActivo(fallbackPeriod);
            setPeriodoId(periodData.id);
            currentPeriodoId = periodData.id;
          } else {
            toast.error("No se encontró un período de evaluación activo");
            navigate("/evaluacion-equipo");
            return;
          }
        }

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

        // Validar permisos de evaluación (usando función async que consulta BD)
        const validationResult = await validateEvaluationPermission(user.dpi, colaboradorFormatted.dpi);
        if (!validationResult.valid) {
          toast.error(validationResult.error || "No tiene permisos para evaluar a este colaborador");
          navigate("/evaluacion-equipo");
          return;
        }

        // Cargar instrumento según el nivel del colaborador
        if (colaboradorFormatted.nivel) {
          const userInstrument = await getInstrumentForUser(
            colaboradorFormatted.nivel,
            instrumentoOverride,
            colaboradorFormatted.cargo
          );
          if (userInstrument) {
            setInstrument(userInstrument);
          }
        }

        // Verificar si pertenece a una cuadrilla
        const enCuadrilla = await verificarCuadrilla(colaboradorFormatted.dpi);
        setPerteneceACuadrilla(enCuadrilla);

        if (enCuadrilla) {
          const grupos = await getGruposDelColaborador(colaboradorFormatted.dpi);
          setGruposColaborador(grupos);
          // Activar feedback grupal por defecto si pertenece a cuadrilla
          setGenerarFeedbackGrupal(true);
        }

        // Cargar autoevaluación del colaborador solo si el jefe ya completó su evaluación
        const jefeDraft = currentPeriodoId
          ? await getJefeEvaluationDraft(user.dpi, colaboradorFormatted.dpi, currentPeriodoId)
          : null;
        const jefeCompleto = jefeDraft?.estado === "enviado";
        setJefeAlreadyEvaluated(jefeCompleto);
        
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
            // Si está completada, mostrar autoevaluación
            if (currentPeriodoId) {
              const submittedAuto = await getSubmittedEvaluation(colaboradorFormatted.dpi, currentPeriodoId);
              const mockAuto = getMockColaboradorEvaluation(colaboradorFormatted.dpi);
              setAutoevaluacion(submittedAuto || mockAuto);
              setEvaluacionTab("auto");
            }
          } else {
            toast.info("Se ha cargado su borrador guardado");
            // Si hay borrador, empezar en evaluación (wizard)
            setEvaluacionTab("evaluacion");
          }
        } else {
          // Si no hay draft, empezar en evaluación (wizard)
          setEvaluacionTab("evaluacion");
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Error al cargar datos del colaborador");
      }
    };

    loadData();
  }, [id, user, navigate]);

  // Auto-save functionality mejorado con hook personalizado
  const performAutoSave = useCallback(async () => {
    if (!user || !colaborador || !periodoId) return;

    setAutoSaveStatus("saving");
    
    const draft: EvaluationDraft = {
      usuarioId: colaborador.dpi,
      periodoId: periodoId,
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

    await saveEvaluationDraft(draft);
    
    setAutoSaveStatus("saved");
    setHasUnsavedChanges(false);
    setTimeout(() => setAutoSaveStatus("idle"), 2000);
  }, [user, colaborador, periodoId, desempenoResponses, desempenoComments, potencialResponses, potencialComments, desempenoProgress, potencialProgress]);

  // Usar hook de auto-guardado mejorado
  // Guarda automáticamente 2 segundos después de la última edición
  // También guarda antes de cerrar la página y cada 30 segundos como respaldo
  useAutoSave(performAutoSave, hasUnsavedChanges, {
    debounceMs: 2000, // Guardar 2 segundos después de dejar de escribir
    periodicSaveMs: 30000, // Guardado periódico cada 30 segundos como respaldo
    saveBeforeUnload: true, // Guardar antes de cerrar la página
  });

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

  // Encontrar la primera pregunta sin responder en el paso actual
  const findFirstUnansweredQuestion = useCallback(() => {
    if (!currentStepData || !currentStepData.data) return null;
    
    const unansweredItem = currentStepData.data.items.find((item: any) => {
      if (currentStepData.type === "desempeno") {
        return desempenoResponses[item.id] === undefined;
      } else if (currentStepData.type === "potencial") {
        return potencialResponses[item.id] === undefined;
      }
      return false;
    });
    
    return unansweredItem;
  }, [currentStepData, desempenoResponses, potencialResponses]);

  // Wizard navigation handlers
  const handleWizardNext = () => {
    if (!canGoNextWizard) {
      const unansweredItem = findFirstUnansweredQuestion();
      if (unansweredItem) {
        // Hacer scroll a la primera pregunta sin responder
        const questionElement = document.getElementById(`likert-${unansweredItem.id}`);
        if (questionElement) {
          questionElement.scrollIntoView({ behavior: "smooth", block: "center" });
          // Resaltar brevemente la pregunta
          questionElement.classList.add("ring-2", "ring-destructive", "ring-offset-2");
          setTimeout(() => {
            questionElement.classList.remove("ring-2", "ring-destructive", "ring-offset-2");
          }, 2000);
        }
        
        const totalItems = currentStepData?.data?.items?.length || 0;
        const answeredCount = currentStepData?.type === "desempeno"
          ? currentStepData.data.items.filter((item: any) => desempenoResponses[item.id] !== undefined).length
          : currentStepData.data.items.filter((item: any) => potencialResponses[item.id] !== undefined).length;
        const missingCount = totalItems - answeredCount;
        
        toast.error(
          `Faltan ${missingCount} pregunta${missingCount > 1 ? 's' : ''} por responder en esta dimensión`,
          { duration: 4000 }
        );
      } else {
        toast.error("Por favor completa todas las respuestas antes de continuar");
      }
      return;
    }
    if (currentWizardStep < wizardSteps.length - 1) {
      const nextStep = currentWizardStep + 1;
      const nextStepData = wizardSteps[nextStep];
      
      // Detectar si está pasando de desempeño a potencial
      const isTransitioningToPotencial = currentStepData?.type === "desempeno" && 
                                         nextStepData?.type === "potencial";
      
      setCurrentWizardStep(nextStep);
      
      // Scroll suave al inicio
      window.scrollTo({ top: 0, behavior: "smooth" });
      
      // Mostrar mensaje de éxito cuando completa desempeño
      if (isTransitioningToPotencial && desempenoComplete) {
        setTimeout(() => {
          toast.success("¡Desempeño completado! Continúa con la evaluación de Potencial", {
            duration: 4000,
            description: "Has terminado todas las dimensiones de desempeño"
          });
        }, 300);
      }
    }
  };

  const handleWizardPrevious = () => {
    if (currentWizardStep > 0) {
      setCurrentWizardStep(currentWizardStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmitClick = () => {
    // Si estamos en el wizard, validar el paso actual primero
    if (evaluacionTab === "evaluacion" && !canGoNextWizard) {
      const unansweredItem = findFirstUnansweredQuestion();
      if (unansweredItem) {
        const questionElement = document.getElementById(`likert-${unansweredItem.id}`);
        if (questionElement) {
          questionElement.scrollIntoView({ behavior: "smooth", block: "center" });
          questionElement.classList.add("ring-2", "ring-destructive", "ring-offset-2");
          setTimeout(() => {
            questionElement.classList.remove("ring-2", "ring-destructive", "ring-offset-2");
          }, 2000);
        }
        
        const totalItems = currentStepData?.data?.items?.length || 0;
        const answeredCount = currentStepData?.type === "desempeno"
          ? currentStepData.data.items.filter((item: any) => desempenoResponses[item.id] !== undefined).length
          : currentStepData.data.items.filter((item: any) => potencialResponses[item.id] !== undefined).length;
        const missingCount = totalItems - answeredCount;
        
        toast.error(
          `Faltan ${missingCount} pregunta${missingCount > 1 ? 's' : ''} por responder en esta dimensión antes de enviar`,
          { duration: 5000 }
        );
      }
      return;
    }

    // Validar desempeño completo
    if (!desempenoComplete) {
      const incompleteDims = getIncompleteDimensions(desempenoResponses, desempenoDimensions);
      const dimNames = incompleteDims.map((d) => d.nombre).join(", ");
      
      // Encontrar la primera dimensión incompleta y navegar a ella
      const firstIncompleteDim = incompleteDims[0];
      if (firstIncompleteDim && wizardSteps.length > 0) {
        const stepIndex = wizardSteps.findIndex(step => 
          step.type === "desempeno" && step.data?.id === firstIncompleteDim.id
        );
        if (stepIndex !== -1) {
          setCurrentWizardStep(stepIndex);
          setEvaluacionTab("evaluacion");
          setTimeout(() => {
            const firstUnanswered = firstIncompleteDim.items.find((item: any) => 
              desempenoResponses[item.id] === undefined
            );
            if (firstUnanswered) {
              const questionElement = document.getElementById(`likert-${firstUnanswered.id}`);
              if (questionElement) {
                questionElement.scrollIntoView({ behavior: "smooth", block: "center" });
                questionElement.classList.add("ring-2", "ring-destructive", "ring-offset-2");
                setTimeout(() => {
                  questionElement.classList.remove("ring-2", "ring-destructive", "ring-offset-2");
                }, 2000);
              }
            }
          }, 300);
        }
      }
      
      toast.error(
        `Faltan ítems por responder en Desempeño: ${dimNames}`,
        { duration: 5000 }
      );
      return;
    }

    // Validar potencial completo
    if (!potencialComplete) {
      const incompleteDims = getIncompleteDimensions(potencialResponses, potencialDimensions);
      const dimNames = incompleteDims.map((d) => d.nombre).join(", ");
      
      // Encontrar la primera dimensión incompleta y navegar a ella
      const firstIncompleteDim = incompleteDims[0];
      if (firstIncompleteDim && wizardSteps.length > 0) {
        const stepIndex = wizardSteps.findIndex(step => 
          step.type === "potencial" && step.data?.id === firstIncompleteDim.id
        );
        if (stepIndex !== -1) {
          setCurrentWizardStep(stepIndex);
          setEvaluacionTab("evaluacion");
          setTimeout(() => {
            const firstUnanswered = firstIncompleteDim.items.find((item: any) => 
              potencialResponses[item.id] === undefined
            );
            if (firstUnanswered) {
              const questionElement = document.getElementById(`likert-${firstUnanswered.id}`);
              if (questionElement) {
                questionElement.scrollIntoView({ behavior: "smooth", block: "center" });
                questionElement.classList.add("ring-2", "ring-destructive", "ring-offset-2");
                setTimeout(() => {
                  questionElement.classList.remove("ring-2", "ring-destructive", "ring-offset-2");
                }, 2000);
              }
            }
          }, 300);
        }
      }
      
      toast.error(
        `Faltan ítems por responder en Potencial: ${dimNames}`,
        { duration: 5000 }
      );
      return;
    }

    setShowSubmitDialog(true);
  };

  const handleConfirmSubmit = async () => {
    if (!user || !colaborador || !periodoId) return;

    const draft: EvaluationDraft = {
      usuarioId: colaborador.dpi,
      periodoId: periodoId,
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
    
    // El trigger automático calculará el resultado final cuando se guarde la evaluación
    // y lo guardará en evaluation_results_by_evaluator
    // Solo esperamos un momento para que el trigger procese
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Verificar que el resultado se haya guardado en evaluation_results_by_evaluator
    const { data: resultByEvaluator } = await supabase
      .from("evaluation_results_by_evaluator")
      .select("id")
      .eq("colaborador_id", colaborador.dpi)
      .eq("periodo_id", periodoId)
      .eq("evaluador_id", user.dpi)
      .maybeSingle();
    
    if (resultByEvaluator) {
      toast.success("¡Evaluación enviada exitosamente! El resultado se ha guardado correctamente.");
    } else {
      // Verificar si hay autoevaluación pendiente
      const { data: autoeval } = await supabase
        .from("evaluations")
        .select("id")
        .eq("usuario_id", colaborador.dpi)
        .eq("periodo_id", periodoId)
        .eq("tipo", "auto")
        .eq("estado", "enviado")
        .maybeSingle();
      
      if (!autoeval) {
        toast.success("¡Evaluación enviada exitosamente! El resultado se calculará cuando el colaborador complete su autoevaluación.");
      } else {
        toast.warning("La evaluación se envió, pero el resultado aún no se ha calculado. Por favor, espere unos momentos.");
      }
    }
    
    navigate("/evaluacion-equipo");
  };
  
  // Nota: La función generateFinalResult ya no es necesaria porque el trigger automático
  // calcula el resultado final cuando se envía la evaluación del jefe.
  // El trigger handle_final_result_calculation se ejecuta automáticamente.
  
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

  if (!colaborador || !instrument) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Cargando evaluación...</CardTitle>
                <CardDescription>
                  {!colaborador ? "Cargando datos del colaborador..." : "Cargando instrumento de evaluación..."}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </main>
      </div>
    );
  }


  const formatPeriodRange = (period?: EvaluationPeriod | null) => {
    if (!period) return "Periodo no definido";

    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "long",
      year: "numeric",
    };

    const inicio = new Date(period.fechaInicio);
    const fin = new Date(period.fechaFin);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return "Fechas de periodo no disponibles";
    }

    const inicioStr = inicio.toLocaleDateString("es-ES", options);
    const finStr = fin.toLocaleDateString("es-ES", options);

    return `${inicioStr} al ${finStr}`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/evaluacion-equipo")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Volver al Equipo</span>
            <span className="sm:hidden">Volver</span>
          </Button>
          <div className="flex items-center gap-3 sm:gap-4">
            {!jefeAlreadyEvaluated && <AutoSaveIndicator status={autoSaveStatus} />}
            <div className="text-right text-xs sm:text-sm text-muted-foreground">
              <p>Periodo: {periodoActivo?.nombre ?? periodoId ?? "Sin periodo"}</p>
              <p>Colaborador: {colaborador.nivel}</p>
            </div>
          </div>
        </div>

        {/* Title and description */}
        <div className="mb-6 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
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
          <p className="text-base sm:text-xl text-muted-foreground">
            {colaborador.cargo} - {colaborador.area} - Nivel {colaborador.nivel}
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
            <p>
              <strong>Evaluador:</strong> {user?.nombre} {user?.apellidos}
            </p>
            <p>
              <strong>Periodo:</strong> {formatPeriodRange(periodoActivo)}
            </p>
          </div>
        </div>

        {/* Tabs principales - Solo Autoevaluación y Evaluación (wizard) */}
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
            <TabsTrigger value="evaluacion" className="flex-1">
              <FileEdit className="mr-2 h-4 w-4" />
              Evaluación
              {isComplete ? (
                <CheckCircle2 className="ml-2 h-4 w-4 text-success" />
              ) : (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {totalWizardProgress}%
                </Badge>
              )}
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

          {/* Tab: Evaluación del Jefe (Wizard estilo Typeform) */}
          <TabsContent value="evaluacion" className="space-y-6">
            {!jefeAlreadyEvaluated && wizardSteps.length > 0 && currentStepData ? (
              <>
                {/* Wizard Header */}
                <WizardHeader
                  steps={wizardSteps.map(step => ({
                    id: step.id,
                    label: step.label,
                    completed: step.completed,
                  }))}
                  currentStep={currentWizardStep}
                  totalProgress={totalWizardProgress}
                  answeredItems={totalWizardAnswered}
                  totalItems={totalWizardItems}
                />

                {/* Banner informativo cuando pasa de Desempeño a Potencial */}
                {currentStepData.type === "potencial" && 
                 currentWizardStep === desempenoDimensions.length && 
                 desempenoComplete && 
                 !jefeAlreadyEvaluated && (
                  <div className="mb-6 p-4 sm:p-6 bg-success/10 border-2 border-success/20 rounded-lg animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-success mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-success mb-1 text-base sm:text-lg">
                          ¡Evaluación de Desempeño Completada!
                        </h3>
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                          Has completado todas las dimensiones de <strong>Desempeño</strong>. 
                          Ahora continúa con la evaluación de <strong>Potencial</strong> para finalizar la evaluación completa.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Wizard Step Content */}
                <WizardStep
                  title={currentStepData.data.nombre}
                  description={currentStepData.data.descripcion}
                  weight={currentStepData.data.peso}
                  currentStep={currentWizardStep}
                  totalSteps={wizardSteps.length}
                  answered={
                    currentStepData.type === "desempeno"
                      ? getDimensionProgress(desempenoResponses, currentStepData.data).answered
                      : getDimensionProgress(potencialResponses, currentStepData.data).answered
                  }
                  total={
                    currentStepData.type === "desempeno"
                      ? getDimensionProgress(desempenoResponses, currentStepData.data).total
                      : getDimensionProgress(potencialResponses, currentStepData.data).total
                  }
                >
                  <div className="space-y-6">
                    {/* Badge de sección mejorado */}
                    <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                      <Badge 
                        variant={currentStepData.type === "desempeno" ? "default" : "secondary"}
                        className="text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2 font-semibold"
                      >
                        {currentStepData.type === "desempeno" ? "📊 Desempeño" : "🚀 Potencial"}
                      </Badge>
                      <div className="flex-1 text-xs sm:text-sm text-muted-foreground">
                        {currentStepData.type === "desempeno" 
                          ? `${desempenoDimensions.length} dimensión${desempenoDimensions.length > 1 ? 'es' : ''} de desempeño`
                          : `${potencialDimensions.length} dimensión${potencialDimensions.length > 1 ? 'es' : ''} de potencial`}
                      </div>
                    </div>

                    {/* Items de la dimensión */}
                    {currentStepData.data.items.map((item: any) => (
                      <MobileLikertScale
                        key={item.id}
                        itemId={item.id}
                        itemText={`${item.orden}. ${item.texto}`}
                        value={
                          currentStepData.type === "desempeno"
                            ? desempenoResponses[item.id]
                            : potencialResponses[item.id]
                        }
                        onChange={(value) => {
                          if (currentStepData.type === "desempeno") {
                            handleDesempenoResponseChange(item.id, value);
                          } else {
                            handlePotencialResponseChange(item.id, value);
                          }
                        }}
                        disabled={jefeAlreadyEvaluated}
                      />
                    ))}

                    {/* Comentarios */}
                    <div className="mt-8 space-y-3 pt-6 border-t-2">
                      <Label
                        htmlFor={`comment-${currentStepData.id}`}
                        className="text-base font-semibold"
                      >
                        Comentarios y observaciones
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {currentStepData.type === "desempeno"
                          ? "Agregue comentarios, ejemplos concretos o observaciones sobre el desempeño del colaborador en esta dimensión."
                          : "Agregue comentarios sobre el potencial del colaborador en esta dimensión."}
                      </p>
                      <Textarea
                        id={`comment-${currentStepData.id}`}
                        placeholder="Escriba sus comentarios aquí..."
                        value={
                          currentStepData.type === "desempeno"
                            ? desempenoComments[currentStepData.data.id] || ""
                            : potencialComments[currentStepData.data.id] || ""
                        }
                        onChange={(e) => {
                          if (currentStepData.type === "desempeno") {
                            handleDesempenoCommentChange(currentStepData.data.id, e.target.value);
                          } else {
                            handlePotencialCommentChange(currentStepData.data.id, e.target.value);
                          }
                        }}
                        rows={5}
                        maxLength={1000}
                        className="resize-none text-base"
                        disabled={jefeAlreadyEvaluated}
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {(
                          currentStepData.type === "desempeno"
                            ? desempenoComments[currentStepData.data.id]?.length || 0
                            : potencialComments[currentStepData.data.id]?.length || 0
                        )}/1000 caracteres
                      </p>
                    </div>
                  </div>
                </WizardStep>

                {/* Wizard Footer */}
                <WizardFooter
                  currentStep={currentWizardStep}
                  totalSteps={wizardSteps.length}
                  onPrevious={handleWizardPrevious}
                  onNext={handleWizardNext}
                  onSubmit={handleSubmitClick}
                  canGoNext={canGoNextWizard}
                  isLastStep={isLastWizardStep}
                />
              </>
            ) : !jefeAlreadyEvaluated && wizardSteps.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Cargando dimensiones de evaluación...
                </CardContent>
              </Card>
            ) : null}

            {jefeAlreadyEvaluated && (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Evaluación completada</h3>
                  <p className="text-muted-foreground mb-4">
                    Esta evaluación ya fue enviada y no puede ser modificada.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/evaluacion-equipo/${id}/comparativa`)}
                  >
                    Ver Comparativa
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Evaluación de Desempeño del Jefe - DEPRECADO, mantener por compatibilidad */}
          <TabsContent value="desempeno" className="space-y-6 hidden">
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
                    {!jefeAlreadyEvaluated && (
                      <div className="mt-3 p-3 bg-info/10 border border-info/20 rounded-lg">
                        <p className="text-sm text-info flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          <span>
                            <strong>Importante:</strong> Después de completar esta evaluación, deberá completar también la <strong>Evaluación de Potencial</strong> para poder enviar la evaluación completa.
                          </span>
                        </p>
                      </div>
                    )}
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

                <div className="mt-8 flex flex-col gap-3">
                  <div className="flex gap-2">
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

                  {/* Botón para continuar a Potencial cuando esté en la última dimensión */}
                  {currentDesempenoDimension === desempenoDimensions.length - 1 && !jefeAlreadyEvaluated && (
                    <div className="pt-4 border-t">
                      <Button
                        variant="default"
                        onClick={() => setEvaluacionTab("potencial")}
                        className="w-full sm:w-auto"
                        disabled={!desempenoComplete}
                      >
                        Continuar a Evaluación de Potencial
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      {!desempenoComplete && (
                        <p className="mt-2 text-xs text-muted-foreground text-center sm:text-left">
                          Complete todos los ítems de esta dimensión para continuar
                        </p>
                      )}
                      {desempenoComplete && (
                        <p className="mt-2 text-sm text-success text-center sm:text-left flex items-center justify-center sm:justify-start gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          Desempeño completado. Continúe con la evaluación de potencial.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {!desempenoComplete && !jefeAlreadyEvaluated && currentDesempenoDimension !== desempenoDimensions.length - 1 && (
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

          {/* Tab: Evaluación de Potencial del Jefe - DEPRECADO, mantener por compatibilidad */}
          <TabsContent value="potencial" className="space-y-6 hidden">
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

        {/* Botón de guardar manual (opcional, el auto-guardado ya funciona) */}
        {!jefeAlreadyEvaluated && evaluacionTab === "evaluacion" && (
          <div className="mt-4 flex justify-center sm:justify-end">
            <Button variant="outline" size="sm" onClick={handleSaveDraft}>
              <Save className="mr-2 h-3 w-3" />
              Guardar Borrador
            </Button>
          </div>
        )}
      </main>

      {/* Submit confirmation dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de enviar su evaluación?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Una vez enviada, no podrá modificarla a menos que RR.HH. reabra su
                evaluación.
              </p>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">
                  Desempeño: {desempenoAnsweredItems}/{desempenoTotalItems} ítems completados
                </p>
                <p className="font-semibold text-foreground">
                  Potencial: {potencialAnsweredItems}/{potencialTotalItems} ítems completados
                </p>
              </div>
              {perteneceACuadrilla && gruposColaborador.length > 0 && (
                <div className="mt-4 p-3 bg-info/10 border border-info/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Users2 className="h-4 w-4 text-info mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-info mb-1">
                        Opción de Feedback Grupal
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        Este colaborador pertenece a {gruposColaborador.length} cuadrilla{gruposColaborador.length > 1 ? 's' : ''}: {gruposColaborador.map((g: any) => g.nombre).join(', ')}
                      </p>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="feedback-grupal"
                          checked={generarFeedbackGrupal}
                          onCheckedChange={(checked) => setGenerarFeedbackGrupal(checked === true)}
                        />
                        <Label htmlFor="feedback-grupal" className="text-sm cursor-pointer">
                          Generar feedback grupal adicional (para toda la cuadrilla)
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        El feedback individual siempre se generará. El feedback grupal será adicional si marca esta opción.
                      </p>
                    </div>
                  </div>
                </div>
              )}
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