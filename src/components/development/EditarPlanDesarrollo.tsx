import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, X, Plus, Trash2, Target, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DevelopmentPlan, AccionDesarrollo, DimensionDebil } from "@/types/evaluation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditarPlanDesarrolloProps {
  plan: DevelopmentPlan;
  colaboradorNombre: string;
  onPlanGuardado: (plan: DevelopmentPlan) => void;
  onClose: () => void;
}

export const EditarPlanDesarrollo = ({
  plan,
  colaboradorNombre,
  onPlanGuardado,
  onClose,
}: EditarPlanDesarrolloProps) => {
  const [loading, setLoading] = useState(false);
  const [editedPlan, setEditedPlan] = useState<DevelopmentPlan>(plan);
  const [editedObjetivos, setEditedObjetivos] = useState<string[]>(
    plan.planEstructurado?.objetivos || []
  );
  const [editedAcciones, setEditedAcciones] = useState<AccionDesarrollo[]>(
    plan.planEstructurado?.acciones || []
  );
  const [editedDimensionesDebiles, setEditedDimensionesDebiles] = useState<DimensionDebil[]>(
    plan.planEstructurado?.dimensionesDebiles || []
  );
  const [editedFeedback, setEditedFeedback] = useState(plan.feedbackIndividual || "");
  const [editedFeedbackGrupal, setEditedFeedbackGrupal] = useState(plan.feedbackGrupal || "");

  const agregarObjetivo = () => {
    setEditedObjetivos([...editedObjetivos, ""]);
  };

  const eliminarObjetivo = (index: number) => {
    setEditedObjetivos(editedObjetivos.filter((_, i) => i !== index));
  };

  const actualizarObjetivo = (index: number, valor: string) => {
    const nuevos = [...editedObjetivos];
    nuevos[index] = valor;
    setEditedObjetivos(nuevos);
  };

  const agregarAccion = () => {
    setEditedAcciones([
      ...editedAcciones,
      {
        descripcion: "",
        responsable: "",
        fecha: "",
        recursos: [],
        indicador: "",
        prioridad: "media",
      },
    ]);
  };

  const eliminarAccion = (index: number) => {
    setEditedAcciones(editedAcciones.filter((_, i) => i !== index));
  };

  const actualizarAccion = (index: number, campo: keyof AccionDesarrollo, valor: any) => {
    const nuevas = [...editedAcciones];
    nuevas[index] = { ...nuevas[index], [campo]: valor };
    setEditedAcciones(nuevas);
  };

  const agregarRecurso = (accionIndex: number, recurso: string) => {
    if (!recurso.trim()) return;
    const nuevas = [...editedAcciones];
    nuevas[accionIndex].recursos = [...(nuevas[accionIndex].recursos || []), recurso];
    setEditedAcciones(nuevas);
  };

  const eliminarRecurso = (accionIndex: number, recursoIndex: number) => {
    const nuevas = [...editedAcciones];
    nuevas[accionIndex].recursos = nuevas[accionIndex].recursos.filter(
      (_, i) => i !== recursoIndex
    );
    setEditedAcciones(nuevas);
  };

  const agregarAccionEspecifica = (dimIndex: number, accion: string) => {
    if (!accion.trim()) return;
    const nuevas = [...editedDimensionesDebiles];
    nuevas[dimIndex].accionesEspecificas = [
      ...(nuevas[dimIndex].accionesEspecificas || []),
      accion,
    ];
    setEditedDimensionesDebiles(nuevas);
  };

  const eliminarAccionEspecifica = (dimIndex: number, accionIndex: number) => {
    const nuevas = [...editedDimensionesDebiles];
    nuevas[dimIndex].accionesEspecificas = nuevas[dimIndex].accionesEspecificas.filter(
      (_, i) => i !== accionIndex
    );
    setEditedDimensionesDebiles(nuevas);
  };

  const guardarPlan = async () => {
    setLoading(true);
    try {
      // Construir el objeto competencias_desarrollar con la estructura completa
      const competenciasDesarrollar = {
        objetivos: editedObjetivos.filter((o) => o.trim() !== ""),
        acciones: editedAcciones.filter((a) => a.descripcion.trim() !== ""),
        dimensionesDebiles: editedDimensionesDebiles,
      };

      // Actualizar en Supabase
      const { error } = await supabase
        .from("development_plans")
        .update({
          competencias_desarrollar: competenciasDesarrollar,
          feedback_individual: editedFeedback,
          feedback_grupal: editedFeedbackGrupal || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", plan.id);

      if (error) throw error;

      // Construir el plan actualizado
      const planActualizado: DevelopmentPlan = {
        ...plan,
        planEstructurado: {
          objetivos: competenciasDesarrollar.objetivos,
          acciones: competenciasDesarrollar.acciones,
          dimensionesDebiles: competenciasDesarrollar.dimensionesDebiles,
        },
        feedbackIndividual: editedFeedback,
        feedbackGrupal: editedFeedbackGrupal || null,
      };

      toast.success("Plan de desarrollo actualizado exitosamente");
      onPlanGuardado(planActualizado);
      onClose();
    } catch (error: any) {
      console.error("Error al guardar plan:", error);
      toast.error(`Error al guardar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case "alta":
        return "destructive";
      case "media":
        return "default";
      case "baja":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Editar Plan de Desarrollo - {colaboradorNombre}
          </DialogTitle>
          <DialogDescription>
            Edita los objetivos, acciones y feedback del plan de desarrollo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Objetivos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5" />
                  Objetivos de Desarrollo
                </CardTitle>
                <Button variant="outline" size="sm" onClick={agregarObjetivo}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {editedObjetivos.map((obj, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Textarea
                      value={obj}
                      onChange={(e) => actualizarObjetivo(idx, e.target.value)}
                      rows={2}
                      className="flex-1"
                      placeholder="Escribe un objetivo de desarrollo..."
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => eliminarObjetivo(idx)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {editedObjetivos.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay objetivos. Haz clic en "Agregar" para crear uno.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Acciones */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Plan de Acción Detallado</CardTitle>
                  <CardDescription>
                    Acciones concretas con responsables, fechas e indicadores
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={agregarAccion}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Acción
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {editedAcciones.map((accion, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-4">
                        <div>
                          <Label>Descripción de la acción</Label>
                          <Textarea
                            value={accion.descripcion}
                            onChange={(e) =>
                              actualizarAccion(idx, "descripcion", e.target.value)
                            }
                            rows={2}
                            placeholder="Describe la acción a realizar..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Responsable</Label>
                            <Input
                              value={accion.responsable}
                              onChange={(e) =>
                                actualizarAccion(idx, "responsable", e.target.value)
                              }
                              placeholder="Nombre del responsable"
                            />
                          </div>
                          <div>
                            <Label>Fecha</Label>
                            <Input
                              value={accion.fecha}
                              onChange={(e) => actualizarAccion(idx, "fecha", e.target.value)}
                              placeholder="Ej: 2024-09 al 2024-10"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Indicador de éxito</Label>
                          <Textarea
                            value={accion.indicador}
                            onChange={(e) =>
                              actualizarAccion(idx, "indicador", e.target.value)
                            }
                            rows={2}
                            placeholder="Cómo se medirá el éxito de esta acción..."
                          />
                        </div>
                        <div>
                          <Label>Recursos</Label>
                          <div className="flex gap-2 mb-2">
                            <Input
                              placeholder="Agregar recurso..."
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  agregarRecurso(idx, e.currentTarget.value);
                                  e.currentTarget.value = "";
                                }
                              }}
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {accion.recursos?.map((recurso, recursoIdx) => (
                              <Badge key={recursoIdx} variant="secondary" className="gap-1">
                                {recurso}
                                <button
                                  onClick={() => eliminarRecurso(idx, recursoIdx)}
                                  className="ml-1 hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div>
                          <Label>Tipo de aprendizaje</Label>
                          <Select
                            value={accion.tipoAprendizaje || "experiencia"}
                            onValueChange={(value: "experiencia" | "social" | "formal") =>
                              actualizarAccion(idx, "tipoAprendizaje", value)
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="experiencia">🔄 Experiencia</SelectItem>
                              <SelectItem value="social">👥 Social</SelectItem>
                              <SelectItem value="formal">📚 Formal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Prioridad</Label>
                          <Select
                            value={accion.prioridad}
                            onValueChange={(value: "alta" | "media" | "baja") =>
                              actualizarAccion(idx, "prioridad", value)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="alta">Alta</SelectItem>
                              <SelectItem value="media">Media</SelectItem>
                              <SelectItem value="baja">Baja</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => eliminarAccion(idx)}
                          className="text-destructive mt-4"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {editedAcciones.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay acciones. Haz clic en "Agregar Acción" para crear una.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dimensiones Débiles */}
          {editedDimensionesDebiles.length > 0 && (
            <Card className="border-warning">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  Dimensiones que Requieren Atención
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {editedDimensionesDebiles.map((dim, dimIdx) => (
                    <div key={dimIdx} className="border-l-4 border-warning pl-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{dim.dimension}</h4>
                        <Badge variant="outline">
                          Score: {dim.score.toFixed(2)}/5.0 ({((dim.score / 5) * 100).toFixed(0)}%)
                        </Badge>
                      </div>
                      <div>
                        <Label>Acciones Específicas</Label>
                        <div className="space-y-2 mt-2">
                          {dim.accionesEspecificas.map((accion, accionIdx) => (
                            <div key={accionIdx} className="flex items-center gap-2">
                              <span className="text-warning">•</span>
                              <span className="flex-1">{accion}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => eliminarAccionEspecifica(dimIdx, accionIdx)}
                                className="text-destructive h-6 w-6"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          <Input
                            placeholder="Agregar acción específica..."
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                agregarAccionEspecifica(dimIdx, e.currentTarget.value);
                                e.currentTarget.value = "";
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feedback Individual */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Feedback Individual</CardTitle>
              <CardDescription>
                Retroalimentación personalizada para el colaborador
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={editedFeedback}
                onChange={(e) => setEditedFeedback(e.target.value)}
                rows={8}
                className="w-full"
                placeholder="Escribe el feedback individual..."
              />
            </CardContent>
          </Card>

          {/* Feedback Grupal */}
          {editedFeedbackGrupal && (
            <Card className="border-info/50 bg-info/5">
              <CardHeader>
                <CardTitle className="text-lg">Feedback Grupal</CardTitle>
                <CardDescription>
                  Retroalimentación para toda la cuadrilla
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={editedFeedbackGrupal}
                  onChange={(e) => setEditedFeedbackGrupal(e.target.value)}
                  rows={6}
                  className="w-full"
                  placeholder="Escribe el feedback grupal..."
                />
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={guardarPlan} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

