import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Save, RotateCcw, AlertCircle, Target, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DevelopmentPlan, AccionDesarrollo, DimensionDebil } from "@/types/evaluation";

interface GenerarPlanDesarrolloProps {
  colaboradorId: string;
  periodoId: string;
  colaboradorNombre: string;
  onPlanGenerado?: (plan: DevelopmentPlan) => void;
}

export const GenerarPlanDesarrollo = ({
  colaboradorId,
  periodoId,
  colaboradorNombre,
  onPlanGenerado,
}: GenerarPlanDesarrolloProps) => {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [plan, setPlan] = useState<DevelopmentPlan | null>(null);
  const [editedFeedback, setEditedFeedback] = useState("");
  const [editedFeedbackGrupal, setEditedFeedbackGrupal] = useState("");

  const generarPlan = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-development-plan', {
        body: {
          colaborador_id: colaboradorId,
          periodo_id: periodoId,
        },
      });

      if (error) {
        console.error("Error from Supabase function:", error);
        // Intentar extraer el mensaje de error del response
        const errorMessage = error.message || error.toString() || "Error desconocido";
        throw new Error(errorMessage);
      }

      if (data && !data.success) {
        console.error("Error from function response:", data);
        throw new Error(data.error || "Error generando plan");
      }

      if (data?.success && data.plan) {
        setPlan(data.plan);
        setEditedFeedback(data.plan.feedback_individual || "");
        setEditedFeedbackGrupal(data.plan.feedback_grupal || "");
        setShowModal(true);
        toast.success("Plan de desarrollo generado exitosamente");
      } else {
        throw new Error(data?.error || "Error generando plan: respuesta inválida");
      }
    } catch (error: any) {
      console.error("Error generating plan:", error);
      const errorMessage = error?.message || error?.toString() || "Error desconocido al generar plan";
      console.error("Error details:", {
        message: errorMessage,
        error: error,
        data: error?.response?.data,
      });
      toast.error(`Error al generar plan: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const guardarPlan = async () => {
    if (!plan) return;

    try {
      const { error } = await supabase
        .from('development_plans')
        .update({
          feedback_individual: editedFeedback,
          feedback_grupal: editedFeedbackGrupal,
        })
        .eq('id', plan.id);

      if (error) throw error;

      toast.success("Plan guardado exitosamente");
      setShowModal(false);
      if (onPlanGenerado) {
        onPlanGenerado({ ...plan, feedbackIndividual: editedFeedback, feedbackGrupal: editedFeedbackGrupal });
      }
    } catch (error: any) {
      toast.error(`Error al guardar: ${error.message}`);
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case "alta": return "destructive";
      case "media": return "default";
      case "baja": return "secondary";
      default: return "outline";
    }
  };

  const getPrioridadTexto = (prioridad: string) => {
    switch (prioridad) {
      case "alta": return "🔴 Alta";
      case "media": return "🟡 Media";
      case "baja": return "🟢 Baja";
      default: return prioridad;
    }
  };

  return (
    <>
      <Button
        onClick={generarPlan}
        disabled={loading}
        size="lg"
        className="gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generando plan con IA...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generar Plan de Desarrollo con IA
          </>
        )}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Plan de Desarrollo - {colaboradorNombre}
            </DialogTitle>
            <DialogDescription>
              Plan generado automáticamente con IA. Puedes editar el feedback antes de guardar.
            </DialogDescription>
          </DialogHeader>

          {plan && (
            <div className="space-y-6">
              {/* Objetivos */}
              {plan.competencias_desarrollar && plan.competencias_desarrollar.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="h-5 w-5" />
                      Objetivos de Desarrollo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {plan.competencias_desarrollar.map((obj: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Acciones Priorizadas */}
              {plan.plan_estructurado?.acciones && plan.plan_estructurado.acciones.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Acciones Priorizadas</CardTitle>
                    <CardDescription>
                      Plan de acción concreto con responsables, fechas e indicadores
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {plan.plan_estructurado.acciones
                        .sort((a: AccionDesarrollo, b: AccionDesarrollo) => {
                          const prioridadOrder = { alta: 1, media: 2, baja: 3 };
                          return (prioridadOrder[a.prioridad] || 99) - (prioridadOrder[b.prioridad] || 99);
                        })
                        .map((accion: AccionDesarrollo, idx: number) => (
                          <div key={idx} className="border rounded-lg p-4 hover:bg-accent/5 transition-colors">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <p className="font-medium flex-1">{accion.descripcion}</p>
                              <Badge variant={getPrioridadColor(accion.prioridad)}>
                                {getPrioridadTexto(accion.prioridad)}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Responsable:</span>{" "}
                                <span className="font-medium">{accion.responsable}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Fecha:</span>{" "}
                                <span className="font-medium">{accion.fecha}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Indicador:</span>{" "}
                                <span className="font-medium">{accion.indicador}</span>
                              </div>
                              {accion.recursos && accion.recursos.length > 0 && (
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">Recursos:</span>{" "}
                                  <span>{accion.recursos.join(", ")}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Dimensiones que Requieren Atención */}
              {plan.plan_estructurado?.dimensionesDebiles && plan.plan_estructurado.dimensionesDebiles.length > 0 && (
                <Card className="border-warning">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <AlertCircle className="h-5 w-5 text-warning" />
                      Dimensiones que Requieren Atención
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {plan.plan_estructurado.dimensionesDebiles.map((dim: DimensionDebil, idx: number) => (
                        <div key={idx} className="border-l-4 border-warning pl-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{dim.dimension}</h4>
                            <Badge variant="outline">
                              Score: {dim.score.toFixed(2)}/5.0 ({((dim.score / 5) * 100).toFixed(0)}%)
                            </Badge>
                          </div>
                          <ul className="space-y-1 text-sm">
                            {dim.accionesEspecificas.map((accion: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-warning mt-1">•</span>
                                <span>{accion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Feedback Individual (Editable) */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Feedback Individual</CardTitle>
                  <CardDescription>
                    Retroalimentación personalizada para el colaborador (editable)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={editedFeedback}
                    onChange={(e) => setEditedFeedback(e.target.value)}
                    rows={8}
                    className="w-full"
                  />
                </CardContent>
              </Card>

              {/* Feedback Grupal (Editable) */}
              {plan.feedback_grupal && (
                <Card className="border-info/50 bg-info/5">
                  <CardHeader>
                    <CardTitle className="text-lg">Feedback Grupal</CardTitle>
                    <CardDescription>
                      Retroalimentación para toda la cuadrilla (editable)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={editedFeedbackGrupal}
                      onChange={(e) => setEditedFeedbackGrupal(e.target.value)}
                      rows={6}
                      className="w-full"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Recomendaciones */}
              {plan.recomendaciones && plan.recomendaciones.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recomendaciones Generales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {plan.recomendaciones.map((rec: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-primary mt-1">→</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setShowModal(false);
              generarPlan();
            }}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Regenerar
            </Button>
            <Button onClick={guardarPlan}>
              <Save className="h-4 w-4 mr-2" />
              Guardar Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
