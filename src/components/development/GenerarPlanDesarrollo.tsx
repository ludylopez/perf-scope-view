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

    // El plan ya está guardado cuando se genera
    // Esta función solo cierra el modal y notifica
    toast.success("Plan de desarrollo generado y guardado exitosamente");
    setShowModal(false);
    if (onPlanGenerado) {
      onPlanGenerado(plan);
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
                      Plan de acción concreto con responsables, fechas e indicadores. El color del borde izquierdo indica la dimensión que desarrolla cada acción.
                    </CardDescription>
                    {/* Leyenda de dimensiones - Solo las usadas */}
                    {(() => {
                      const usedDimensions = plan.planEstructurado.acciones
                        .map((accion: AccionDesarrollo) => {
                          const dimension = accion.dimension && accion.dimension.trim()
                            ? accion.dimension.trim()
                            : plan.planEstructurado?.dimensionesDebiles && plan.planEstructurado.dimensionesDebiles.length > 0
                              ? (() => {
                                  const descripcionLower = accion.descripcion.toLowerCase();
                                  let bestMatch: { dimension: string; score: number } | null = null;
                                  plan.planEstructurado.dimensionesDebiles.forEach((dim: DimensionDebil) => {
                                    const dimLower = dim.dimension.toLowerCase();
                                    const palabrasDimension = dimLower.split(/\s+/);
                                    let score = 0;
                                    palabrasDimension.forEach((palabra) => {
                                      if (palabra.length > 3 && descripcionLower.includes(palabra)) {
                                        score += palabra.length;
                                      }
                                    });
                                    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
                                      bestMatch = { dimension: dim.dimension, score };
                                    }
                                  });
                                  return bestMatch && bestMatch.score > 5 ? bestMatch.dimension : null;
                                })()
                              : null;
                          return dimension;
                        })
                        .filter((dim): dim is string => dim !== null);
                      
                      const uniqueDimensions = Array.from(new Set(usedDimensions))
                        .map((dimName) => {
                          const dimLower = dimName.toLowerCase();
                          let color = '#6b7280';
                          if (dimLower.includes('productividad') || dimLower.includes('cumplimiento') || dimLower.includes('objetivos')) color = '#3b82f6';
                          else if (dimLower.includes('calidad')) color = '#10b981';
                          else if (dimLower.includes('competencia') || dimLower.includes('técnica') || dimLower.includes('laboral')) color = '#f59e0b';
                          else if (dimLower.includes('comportamiento') || dimLower.includes('actitud') || dimLower.includes('organizacional')) color = '#8b5cf6';
                          else if (dimLower.includes('relaciones') || dimLower.includes('equipo') || dimLower.includes('interpersonal')) color = '#ec4899';
                          else if (dimLower.includes('servicio') || dimLower.includes('atención') || dimLower.includes('usuario') || dimLower.includes('orientación')) color = '#06b6d4';
                          else if (dimLower.includes('liderazgo') || dimLower.includes('dirección') || dimLower.includes('coordinación')) color = '#6366f1';
                          else if (dimLower.includes('transparencia') || dimLower.includes('probidad') || dimLower.includes('ética')) color = '#14b8a6';
                          return { name: dimName, color };
                        })
                        .sort((a, b) => a.name.localeCompare(b.name));
                      
                      if (uniqueDimensions.length === 0) return null;
                      
                      return (
                        <div className="mt-4 p-3 bg-muted/50 rounded-md">
                          <p className="text-sm font-semibold mb-2">Leyenda de Dimensiones:</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {uniqueDimensions.map((dim, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded" style={{ backgroundColor: dim.color }}></div>
                                <span>{dim.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {plan.planEstructurado.acciones
                        .sort((a: AccionDesarrollo, b: AccionDesarrollo) => {
                          const prioridadOrder = { alta: 1, media: 2, baja: 3 };
                          return (prioridadOrder[a.prioridad] || 99) - (prioridadOrder[b.prioridad] || 99);
                        })
                        .map((accion: AccionDesarrollo, idx: number) => {
                          // Obtener dimensión de la acción (con fallback si no existe)
                          const dimension = accion.dimension && accion.dimension.trim()
                            ? accion.dimension.trim()
                            : plan.planEstructurado?.dimensionesDebiles && plan.planEstructurado.dimensionesDebiles.length > 0
                              ? (() => {
                                  const descripcionLower = accion.descripcion.toLowerCase();
                                  let bestMatch: { dimension: string; score: number } | null = null;
                                  plan.planEstructurado.dimensionesDebiles.forEach((dim: DimensionDebil) => {
                                    const dimLower = dim.dimension.toLowerCase();
                                    const palabrasDimension = dimLower.split(/\s+/);
                                    let score = 0;
                                    palabrasDimension.forEach((palabra) => {
                                      if (palabra.length > 3 && descripcionLower.includes(palabra)) {
                                        score += palabra.length;
                                      }
                                    });
                                    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
                                      bestMatch = { dimension: dim.dimension, score };
                                    }
                                  });
                                  return bestMatch && bestMatch.score > 5 ? bestMatch.dimension : null;
                                })()
                              : null;
                          const dimensionColor = dimension
                            ? (() => {
                                const dimLower = dimension.toLowerCase();
                                if (dimLower.includes('productividad') || dimLower.includes('cumplimiento') || dimLower.includes('objetivos')) return '#3b82f6';
                                if (dimLower.includes('calidad')) return '#10b981';
                                if (dimLower.includes('competencia') || dimLower.includes('técnica') || dimLower.includes('laboral')) return '#f59e0b';
                                if (dimLower.includes('comportamiento') || dimLower.includes('actitud') || dimLower.includes('organizacional')) return '#8b5cf6';
                                if (dimLower.includes('relaciones') || dimLower.includes('equipo') || dimLower.includes('interpersonal')) return '#ec4899';
                                if (dimLower.includes('servicio') || dimLower.includes('atención') || dimLower.includes('usuario') || dimLower.includes('orientación')) return '#06b6d4';
                                if (dimLower.includes('liderazgo') || dimLower.includes('dirección') || dimLower.includes('coordinación')) return '#6366f1';
                                if (dimLower.includes('transparencia') || dimLower.includes('probidad') || dimLower.includes('ética')) return '#14b8a6';
                                return '#6b7280';
                              })()
                            : null;
                          
                          return (
                            <div 
                              key={idx} 
                              className="border rounded-lg p-4 hover:bg-accent/5 transition-colors"
                              style={dimension ? { borderLeft: `4px solid ${dimensionColor}` } : {}}
                            >
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex-1">
                                <p className="font-medium">{accion.descripcion}</p>
                                {dimension && (
                                  <Badge variant="outline" className="mt-1 text-xs" style={{ borderColor: dimensionColor, color: dimensionColor }}>
                                    {dimension}
                                  </Badge>
                                )}
                              </div>
                              <Badge variant={getPrioridadColor(accion.prioridad)}>
                                {getPrioridadTexto(accion.prioridad)}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Tipo de aprendizaje:</span>{" "}
                                <Badge variant="outline" className="ml-1">
                                  {accion.tipoAprendizaje === "experiencia" ? "🔄 Experiencia" : accion.tipoAprendizaje === "social" ? "👥 Social" : "📚 Formal"}
                                </Badge>
                              </div>
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
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Secciones eliminadas: Dimensiones que Requieren Atención y Recomendaciones Generales */}
              {/* La información ahora se muestra en la tabla de acciones con indicador visual por dimensión */}
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
