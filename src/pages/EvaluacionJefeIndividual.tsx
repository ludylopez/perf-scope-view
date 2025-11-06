import { useState, useEffect, useCallback } from "react";
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
  FileEdit,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { getInstrumentForUser } from "@/lib/instruments";
import { getActivePeriod } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { useAutoSave } from "@/hooks/useAutoSave";
import { getEquipoStats } from "@/lib/jerarquias";

// Esta página es similar a EvaluacionColaborador pero para evaluar jefes subordinados
const EvaluacionJefeIndividual = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>(); // DPI del jefe subordinado
  const [instrument, setInstrument] = useState(INSTRUMENT_A1);
  const [periodoId, setPeriodoId] = useState<string>("");

  const [jefeEvaluado, setJefeEvaluado] = useState<any>(null);
  const [estadisticasEquipo, setEstadisticasEquipo] = useState<any>(null);
  const [jefeAlreadyEvaluated, setJefeAlreadyEvaluated] = useState(false);
  const [evaluacionTab, setEvaluacionTab] = useState<"desempeno" | "potencial">("desempeno");
  
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

  const desempenoDimensions = instrument.dimensionesDesempeno || [];
  const potencialDimensions = instrument.dimensionesPotencial || [];

  const desempenoTotalItems = desempenoDimensions.reduce((sum, dim) => sum + dim.items.length, 0);
  const desempenoAnsweredItems = Object.keys(desempenoResponses).length;
  const desempenoProgress = desempenoTotalItems > 0 ? (desempenoAnsweredItems / desempenoTotalItems) * 100 : 0;
  const desempenoComplete = isEvaluationComplete(desempenoResponses, desempenoDimensions);

  const potencialTotalItems = potencialDimensions.reduce((sum, dim) => sum + dim.items.length, 0);
  const potencialAnsweredItems = Object.keys(potencialResponses).length;
  const potencialProgress = potencialTotalItems > 0 ? (potencialAnsweredItems / potencialTotalItems) * 100 : 0;
  const potencialComplete = isEvaluationComplete(potencialResponses, potencialDimensions);

  useEffect(() => {
    if (!user || !id) {
      navigate("/evaluacion-jefes");
      return;
    }

    const loadData = async () => {
      try {
        // Obtener período activo
        let periodData = null;
        const activePeriod = await getActivePeriod();
        if (activePeriod) {
          setPeriodoId(activePeriod.id);
        } else {
          const { data } = await supabase
            .from("evaluation_periods")
            .select("id")
            .eq("nombre", "2025-1")
            .single();
          periodData = data;
          if (periodData) {
            setPeriodoId(periodData.id);
          }
        }

        // Cargar información del jefe a evaluar
        const { data: jefeData, error: jefeError } = await supabase
          .from("users")
          .select("*")
          .eq("dpi", id)
          .single();

        if (jefeError || !jefeData) {
          toast.error("No se encontró al jefe a evaluar");
          navigate("/evaluacion-jefes");
          return;
        }

        setJefeEvaluado(jefeData);

        // Cargar instrumento según nivel del jefe
        const inst = await getInstrumentForUser(jefeData.nivel);
        if (inst) {
          setInstrument(inst);
        }

        // Cargar estadísticas del equipo del jefe
        const activePeriodId = periodoId || periodData?.id;
        if (activePeriodId) {
          const stats = await getEquipoStats(id, activePeriodId);
          setEstadisticasEquipo(stats);
        }

        // Verificar si ya existe evaluación
        const exists = await hasJefeEvaluation(user.dpi, id, periodoId || periodData?.id);
        setJefeAlreadyEvaluated(exists);

        if (exists) {
          const draft = await getJefeEvaluationDraft(user.dpi, id, periodoId || periodData?.id);
          if (draft) {
            setDesempenoResponses(draft.responses || {});
            setDesempenoComments(draft.comments || {});
            if (draft.evaluacionPotencial) {
              setPotencialResponses(draft.evaluacionPotencial.responses || {});
              setPotencialComments(draft.evaluacionPotencial.comments || {});
            }
          }
        }
      } catch (error: any) {
        console.error("Error loading data:", error);
        toast.error("Error al cargar datos");
      }
    };

    loadData();
  }, [id, user, navigate, periodoId]);

  // Auto-save functionality
  const performAutoSave = useCallback(async () => {
    if (!user || !jefeEvaluado || !periodoId) return;

    setAutoSaveStatus("saving");
    
    const draft: EvaluationDraft = {
      usuarioId: jefeEvaluado.dpi,
      periodoId: periodoId,
      tipo: "jefe",
      responses: desempenoResponses,
      comments: desempenoComments,
      evaluadorId: user.dpi,
      colaboradorId: jefeEvaluado.dpi,
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
  }, [user, jefeEvaluado, periodoId, desempenoResponses, desempenoComments, potencialResponses, potencialComments, desempenoProgress, potencialProgress]);

  useAutoSave(performAutoSave, hasUnsavedChanges, {
    debounceMs: 2000,
    periodicSaveMs: 30000,
    saveBeforeUnload: true,
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

  const handleSaveDraft = async () => {
    await performAutoSave();
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
    if (!user || !jefeEvaluado || !periodoId) return;

    const draft: EvaluationDraft = {
      usuarioId: jefeEvaluado.dpi,
      periodoId: periodoId,
      tipo: "jefe",
      responses: desempenoResponses,
      comments: desempenoComments,
      evaluadorId: user.dpi,
      colaboradorId: jefeEvaluado.dpi,
      evaluacionPotencial: {
        responses: potencialResponses,
        comments: potencialComments,
      },
      estado: "enviado",
      progreso: 100,
      fechaUltimaModificacion: new Date().toISOString(),
    };

    await submitEvaluation(draft);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success("¡Evaluación del jefe subordinado enviada exitosamente!");
    navigate("/evaluacion-jefes");
  };

  if (!jefeEvaluado) {
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
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={() => navigate("/evaluacion-jefes")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Mis Jefes Subordinados
          </Button>
          <div className="flex items-center gap-4">
            {!jefeAlreadyEvaluated && <AutoSaveIndicator status={autoSaveStatus} />}
            <div className="text-right text-sm text-muted-foreground">
              <p>Periodo: 2025-1</p>
              <p>Jefe: {jefeEvaluado.nivel}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">
              Evaluación de {jefeEvaluado.nombre} {jefeEvaluado.apellidos}
            </h1>
            {jefeAlreadyEvaluated && (
              <Badge className="bg-success text-success-foreground">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Completada
              </Badge>
            )}
          </div>
          <p className="text-xl text-muted-foreground">
            {jefeEvaluado.cargo} - {jefeEvaluado.area} - Nivel {jefeEvaluado.nivel}
          </p>
          {estadisticasEquipo && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <p>
                <strong>Equipo:</strong> {estadisticasEquipo.totalColaboradores} colaboradores
              </p>
              <p>
                <strong>Promedio Equipo:</strong> {Math.round(estadisticasEquipo.promedioDesempeno)}%
              </p>
            </div>
          )}
        </div>

        <Tabs value={evaluacionTab} onValueChange={(v) => setEvaluacionTab(v as any)} className="mb-6">
          <TabsList className="w-full">
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

          {/* Tab: Evaluación de Desempeño */}
          <TabsContent value="desempeno" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Evaluación de Desempeño</CardTitle>
                    <CardDescription className="mt-2">
                      Evalúe el desempeño individual del jefe subordinado
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
                            <span>{dim.nombre.split(' ')[0]}</span>
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

                  {desempenoDimensions.map((dim, idx) => (
                    <TabsContent key={dim.id} value={idx.toString()} className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {dim.nombre} ({Math.round(dim.peso * 100)}%)
                        </h3>
                        <CardDescription className="mt-2">
                          {dim.descripcion}
                        </CardDescription>
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
                        <Textarea
                          id={`comment-desempeno-${dim.id}`}
                          placeholder="Escriba sus comentarios aquí..."
                          value={desempenoComments[dim.id] || ""}
                          onChange={(e) => handleDesempenoCommentChange(dim.id, e.target.value)}
                          rows={4}
                          maxLength={1000}
                          disabled={jefeAlreadyEvaluated}
                        />
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Evaluación de Potencial */}
          <TabsContent value="potencial" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Evaluación de Potencial</CardTitle>
                    <CardDescription className="mt-2">
                      Evalúe el potencial futuro del jefe subordinado
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
                          {dim.descripcion}
                        </CardDescription>
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
                        <Textarea
                          id={`comment-potencial-${dim.id}`}
                          placeholder="Escriba sus comentarios aquí..."
                          value={potencialComments[dim.id] || ""}
                          onChange={(e) => handlePotencialCommentChange(dim.id, e.target.value)}
                          rows={4}
                          maxLength={1000}
                          disabled={jefeAlreadyEvaluated}
                        />
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action buttons */}
        {!jefeAlreadyEvaluated && (
          <div className="flex justify-end gap-4 mt-6">
            <Button variant="outline" onClick={handleSaveDraft}>
              <Save className="mr-2 h-4 w-4" />
              Guardar Borrador
            </Button>
            <Button onClick={handleSubmitClick} disabled={!desempenoComplete || !potencialComplete}>
              <Send className="mr-2 h-4 w-4" />
              Enviar Evaluación
            </Button>
          </div>
        )}

        {/* Submit confirmation dialog */}
        <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Confirmar envío de evaluación?</AlertDialogTitle>
              <AlertDialogDescription>
                Una vez enviada, la evaluación no podrá ser modificada. ¿Desea continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmSubmit}>Enviar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default EvaluacionJefeIndividual;

