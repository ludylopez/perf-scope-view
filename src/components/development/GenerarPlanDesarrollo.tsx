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
  planExistente?: DevelopmentPlan | null;
}

export const GenerarPlanDesarrollo = ({
  colaboradorId,
  periodoId,
  colaboradorNombre,
  onPlanGenerado,
  planExistente,
}: GenerarPlanDesarrolloProps) => {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [plan, setPlan] = useState<DevelopmentPlan | null>(null);
  const [editedFeedback, setEditedFeedback] = useState("");
  const [editedFeedbackGrupal, setEditedFeedbackGrupal] = useState("");

  const generarPlan = async () => {
    setLoading(true);
    try {
      // Usar fetch directamente para poder capturar el body del error
      const { data: { session } } = await supabase.auth.getSession();
      // Obtener URL y key desde las variables de entorno o el cliente
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://oxadpbdlpvwyapuondei.supabase.co";
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94YWRwYmRscHZ3eWFwdW9uZGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMjU5MzcsImV4cCI6MjA3NzkwMTkzN30.HjIoMaw20qx7DscE-XWCaz88EWa0Jv_aCDcMtv6eadw";
      
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-development-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          colaborador_id: colaboradorId,
          periodo_id: periodoId,
        }),
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        const text = await response.text();
        console.error("Error parseando respuesta:", parseError, "Response text:", text);
        throw new Error(`Error en la respuesta del servidor: ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        console.error("Error from function:", {
          status: response.status,
          statusText: response.statusText,
          body: responseData,
        });
        const errorMessage = responseData?.error || responseData?.message || `Error ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      if (responseData && !responseData.success) {
        console.error("Error from function response:", responseData);
        throw new Error(responseData.error || "Error generando plan");
      }

      if (responseData?.success && responseData.plan) {
        // Extraer la estructura del plan desde competencias_desarrollar
        const planData = responseData.plan;
        const competencias = planData.competencias_desarrollar || {};
        
        // Si competencias_desarrollar es un objeto con la estructura completa, extraerla
        const planEstructurado = typeof competencias === 'object' && competencias.acciones 
          ? {
              objetivos: competencias.objetivos || [],
              acciones: competencias.acciones || [],
              dimensionesDebiles: competencias.dimensionesDebiles || [],
            }
          : null;
        
        const objetivos = typeof competencias === 'object' && competencias.objetivos
          ? competencias.objetivos
          : Array.isArray(competencias) ? competencias : [];
        
        const recomendaciones = typeof competencias === 'object' && competencias.recomendaciones
          ? competencias.recomendaciones
          : [];

        // Construir el plan completo con la estructura correcta
        const planCompleto: DevelopmentPlan = {
          id: planData.id,
          evaluacionId: planData.evaluacion_id,
          colaboradorId: planData.colaborador_id,
          periodoId: planData.periodo_id,
          competenciasDesarrollar: objetivos,
          feedbackIndividual: planData.feedback_individual || "",
          feedbackGrupal: planData.feedback_grupal || null,
          planEstructurado: planEstructurado,
          recomendaciones: recomendaciones,
          editable: planData.editable,
          editadoPor: planData.editado_por,
          fechaCreacion: planData.fecha_creacion,
          fechaModificacion: planData.fecha_modificacion,
        };

        setPlan(planCompleto);
        setEditedFeedback(planCompleto.feedbackIndividual || "");
        setEditedFeedbackGrupal(planCompleto.feedbackGrupal || "");
        setShowModal(true);
        toast.success("Plan de desarrollo generado exitosamente");
      } else {
        throw new Error(responseData?.error || "Error generando plan: respuesta inválida");
      }
    } catch (error: any) {
      console.error("Error generating plan:", error);
      const errorMessage = error?.message || error?.toString() || "Error desconocido al generar plan";
      console.error("Error details:", {
        message: errorMessage,
        error: error,
        stack: error?.stack,
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
        variant={planExistente ? "outline" : "default"}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generando plan con IA...
          </>
        ) : planExistente ? (
          <>
            <Sparkles className="h-4 w-4" />
            Regenerar Plan de Desarrollo con IA
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
              {plan.planEstructurado?.objetivos && plan.planEstructurado.objetivos.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="h-5 w-5" />
                      Objetivos de Desarrollo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {plan.planEstructurado.objetivos.map((obj: string, idx: number) => (
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
              {plan.planEstructurado?.acciones && plan.planEstructurado.acciones.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Acciones Priorizadas</CardTitle>
                    <CardDescription>
                      Plan de acción concreto con responsables, fechas e indicadores
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {plan.planEstructurado.acciones
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
              {plan.planEstructurado?.dimensionesDebiles && plan.planEstructurado.dimensionesDebiles.length > 0 && (
                <Card className="border-warning">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <AlertCircle className="h-5 w-5 text-warning" />
                      Dimensiones que Requieren Atención
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {plan.planEstructurado.dimensionesDebiles.map((dim: DimensionDebil, idx: number) => (
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
