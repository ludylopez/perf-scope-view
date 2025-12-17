import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, FileDown, Loader2, LayoutDashboard, Target, GraduationCap, Grid3X3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPlanCapacitacionUnidad, generateTrainingPlanWithAI } from "@/lib/trainingPlanService";
import { PlanCapacitacionUnidad } from "@/types/trainingPlan";
import { TrainingGapChart } from "./TrainingGapChart";
import { TrainingPriorityList } from "./TrainingPriorityList";
import { Training9BoxSummary } from "./Training9BoxSummary";
import { TrainingPlanStructured } from "./TrainingPlanStructured";
import { TrainingPlanPDF } from "../pdf/trainingPlan/TrainingPlanPDF";
import { PDFDownloadLink } from "@react-pdf/renderer";

interface TrainingPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  jefeDpi: string;
  periodoId: string;
  onPlanGenerated?: () => void;
}

export function TrainingPlanModal({
  isOpen,
  onClose,
  jefeDpi,
  periodoId,
  onPlanGenerated,
}: TrainingPlanModalProps) {
  const [plan, setPlan] = useState<PlanCapacitacionUnidad | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("resumen");

  useEffect(() => {
    if (isOpen && jefeDpi && periodoId) {
      loadPlan();
    }
  }, [isOpen, jefeDpi, periodoId]);

  const loadPlan = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { plan: data, error: planError } = await getPlanCapacitacionUnidad(jefeDpi, periodoId);
      
      if (planError) {
        setError(planError.message + (planError.details ? ` (${planError.details})` : ''));
        console.error('Error detallado:', planError);
      } else if (data) {
        setPlan(data);
        // Notificar que el plan se generó exitosamente
        if (onPlanGenerated) {
          onPlanGenerated();
        }
      } else {
        setError("No se pudo generar el plan de capacitación. Verifica que haya evaluaciones completadas.");
      }
    } catch (err: any) {
      console.error("Error cargando plan de capacitación:", err);
      setError(err.message || "Error al cargar el plan de capacitación");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateStructuredPlan = async () => {
    if (!plan) return;
    
    setIsGeneratingPlan(true);
    setError(null);
    try {
      const { plan: planEstructurado, error: planError } = await generateTrainingPlanWithAI(plan);
      
      if (planError) {
        // Mostrar error más amigable
        if (planError.code === 'FUNCTION_NOT_DEPLOYED') {
          setError(planError.message + ' Consulta el archivo INSTRUCCIONES_DESPLIEGUE_TRAINING_PLAN.md para más detalles.');
        } else if (planError.code === 'API_KEY_MISSING') {
          setError(planError.message);
        } else {
          setError(`Error generando plan estructurado: ${planError.message}`);
        }
        console.error('Error detallado:', planError);
      } else if (planEstructurado) {
        // Actualizar el plan con el plan estructurado
        setPlan({
          ...plan,
          planEstructurado
        });
        setActiveTab("plan-estructurado");
      }
    } catch (err: any) {
      console.error("Error generando plan estructurado:", err);
      let errorMsg = err.message || "Error al generar plan estructurado con IA";
      if (err.message?.includes('API key')) {
        errorMsg = 'API key de OpenAI no configurada. Por favor, configura la API key en el archivo .env o contacta al administrador del sistema.';
      }
      setError(errorMsg);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            Plan de Capacitación Consolidado
          </DialogTitle>
          <DialogDescription>
            Análisis estadístico de necesidades de capacitación de la unidad
            {plan?.metadata.periodoNombre && ` - ${plan.metadata.periodoNombre}`}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-4 py-8">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && plan && (
          <>
            {/* Botones de acción */}
            <div className="flex justify-between items-center mb-4 gap-2">
              <div>
                {!plan.planEstructurado && (
                  <Button
                    onClick={handleGenerateStructuredPlan}
                    disabled={isGeneratingPlan}
                    className="gap-2"
                    variant="default"
                  >
                    {isGeneratingPlan ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generando Plan con IA...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generar Plan Estructurado
                      </>
                    )}
                  </Button>
                )}
              </div>
              {plan.planEstructurado && (PDFDownloadLink as any)({
                document: <TrainingPlanPDF planEstructurado={plan.planEstructurado} />,
                fileName: `plan-capacitacion-${plan.metadata.periodoNombre.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`,
                className: "inline-block",
                children: ({ loading }: any) => (
                  <Button variant="outline" size="sm" disabled={loading} className="gap-2">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generando PDF...
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4" />
                        Exportar PDF
                      </>
                    )}
                  </Button>
                )
              })}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="resumen" className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Resumen</span>
                </TabsTrigger>
                <TabsTrigger value="brechas" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span className="hidden sm:inline">Brechas</span>
                </TabsTrigger>
                <TabsTrigger value="capacitaciones" className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  <span className="hidden sm:inline">Capacitaciones</span>
                </TabsTrigger>
                <TabsTrigger value="9box" className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  <span className="hidden sm:inline">9-Box</span>
                </TabsTrigger>
                {plan.planEstructurado && (
                  <TabsTrigger value="plan-estructurado" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden sm:inline">Plan IA</span>
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Tab: Resumen Ejecutivo */}
              <TabsContent value="resumen" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Contexto</h3>
                    <div className="space-y-1 text-sm">
                      <p><strong>Total Colaboradores:</strong> {plan.contexto.totalColaboradores}</p>
                      <p><strong>Evaluaciones Completadas:</strong> {plan.contexto.evaluacionesCompletadas}</p>
                      <p><strong>Tasa de Completitud:</strong> {plan.contexto.tasaCompletitud}%</p>
                      <p><strong>Promedio Unidad:</strong> {plan.contexto.promedioDesempenoUnidad}%</p>
                      <p><strong>Promedio Organización:</strong> {plan.contexto.promedioDesempenoOrg}%</p>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Resumen Ejecutivo</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Situación General:</strong></p>
                      <p className="text-muted-foreground">{plan.resumenEjecutivo.situacionGeneral}</p>
                      {plan.resumenEjecutivo.dimensionMasCritica && (
                        <p><strong>Dimensión Más Crítica:</strong> {plan.resumenEjecutivo.dimensionMasCritica}</p>
                      )}
                      {plan.resumenEjecutivo.capacitacionesPrioritarias.length > 0 && (
                        <div>
                          <p><strong>Capacitaciones Prioritarias:</strong></p>
                          <ul className="list-disc list-inside text-muted-foreground">
                            {plan.resumenEjecutivo.capacitacionesPrioritarias.map((cap, idx) => (
                              <li key={idx}>{cap}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <p><strong>Recomendación:</strong></p>
                      <p className="text-muted-foreground">{plan.resumenEjecutivo.recomendacionGeneral}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tab: Brechas por Dimensión */}
              <TabsContent value="brechas" className="mt-6">
                <TrainingGapChart brechas={plan.brechasDimensiones} />
              </TabsContent>

              {/* Tab: Capacitaciones */}
              <TabsContent value="capacitaciones" className="mt-6">
                <TrainingPriorityList capacitaciones={plan.capacitaciones} />
              </TabsContent>

              {/* Tab: Distribución 9-Box */}
              <TabsContent value="9box" className="mt-6">
                <Training9BoxSummary distribucion={plan.distribucion9Box} />
              </TabsContent>

              {/* Tab: Plan Estructurado (Generado por IA) */}
              {plan.planEstructurado && (
                <TabsContent value="plan-estructurado" className="mt-6">
                  <TrainingPlanStructured planEstructurado={plan.planEstructurado} />
                </TabsContent>
              )}
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

