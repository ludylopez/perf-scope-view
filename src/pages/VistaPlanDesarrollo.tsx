import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Edit, Save, Printer, X, Download } from "lucide-react";
import { toast } from "sonner";
import { DevelopmentPlan } from "@/types/evaluation";
import { exportPlanDesarrolloPDF } from "@/lib/exports";

const VistaPlanDesarrollo = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { activePeriodId } = usePeriod();
  const [plan, setPlan] = useState<DevelopmentPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedPlan, setEditedPlan] = useState<DevelopmentPlan | null>(null);

  useEffect(() => {
    if (!id) {
      navigate("/dashboard");
      return;
    }
    loadPlan();
  }, [id, navigate]);

  const loadPlan = async () => {
    if (!activePeriodId) {
      toast.error("No hay período activo");
      setLoading(false);
      return;
    }

    try {
      // Intentar cargar desde Supabase primero
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("development_plans")
        .select("*")
        .eq("colaborador_id", id)
        .eq("periodo_id", activePeriodId)
        .single();

      if (!error && data) {
        // Si competencias_desarrollar es un objeto con la estructura completa, extraerla
        const competencias = data.competencias_desarrollar || {};
        const planEstructurado = typeof competencias === 'object' && competencias.acciones 
          ? {
              objetivos: competencias.objetivos || [],
              acciones: competencias.acciones || [],
              dimensionesDebiles: competencias.dimensionesDebiles || [],
            }
          : null;
        
        const recomendaciones = typeof competencias === 'object' && competencias.recomendaciones
          ? competencias.recomendaciones
          : Array.isArray(competencias) ? competencias : [];

        const planData: DevelopmentPlan = {
          id: data.id,
          evaluacionId: data.evaluacion_id,
          colaboradorId: data.colaborador_id,
          periodoId: data.periodo_id,
          competenciasDesarrollar: Array.isArray(competencias) ? competencias : [],
          feedbackIndividual: data.feedback_individual || "",
          feedbackGrupal: data.feedback_grupal,
          planEstructurado: planEstructurado || data.plan_estructurado,
          recomendaciones: recomendaciones || data.recomendaciones || [],
          editable: data.editable,
          editadoPor: data.editado_por,
          fechaCreacion: data.fecha_creacion,
          fechaModificacion: data.fecha_modificacion,
        };
        setPlan(planData);
        setEditedPlan(planData);
      } else {
        toast.error("No se encontró plan de desarrollo");
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error loading plan:", error);
      toast.error("Error al cargar plan de desarrollo");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editedPlan) return;

    try {
      // Guardar en Supabase
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from("development_plans")
        .update({
          competencias_desarrollar: editedPlan.competenciasDesarrollar || [],
          feedback_individual: editedPlan.feedbackIndividual,
          feedback_grupal: editedPlan.feedbackGrupal,
          fecha_modificacion: new Date().toISOString(),
          editado_por: user?.dpi,
        })
        .eq("id", editedPlan.id);

      if (error) throw error;

      toast.success("Plan de desarrollo guardado exitosamente");
      setPlan(editedPlan);
      setEditing(false);
      loadPlan();
    } catch (error: any) {
      console.error("Error saving plan:", error);
      toast.error("Error al guardar plan de desarrollo");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleUpdateCompetencia = (index: number, value: string) => {
    if (!editedPlan || !editedPlan.competenciasDesarrollar) return;
    const nuevasCompetencias = [...editedPlan.competenciasDesarrollar];
    nuevasCompetencias[index] = value;
    setEditedPlan({
      ...editedPlan,
      competenciasDesarrollar: nuevasCompetencias,
    });
  };

  const handleAddCompetencia = () => {
    if (!editedPlan) return;
    setEditedPlan({
      ...editedPlan,
      competenciasDesarrollar: [
        ...(editedPlan.competenciasDesarrollar || []),
        "",
      ],
    });
  };

  const handleRemoveCompetencia = (index: number) => {
    if (!editedPlan || !editedPlan.competenciasDesarrollar) return;
    const nuevasCompetencias = editedPlan.competenciasDesarrollar.filter((_, i) => i !== index);
    setEditedPlan({
      ...editedPlan,
      competenciasDesarrollar: nuevasCompetencias,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <p>Cargando...</p>
        </main>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <p>No se encontró el plan de desarrollo</p>
        </main>
      </div>
    );
  }

  const currentPlan = editing ? editedPlan : plan;
  if (!currentPlan) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 print:px-0">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div className="flex gap-2">
            {plan.editable && (
              <>
                {editing ? (
                  <>
                    <Button variant="outline" onClick={() => { setEditing(false); setEditedPlan(plan); }}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave}>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Cambios
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar Plan
                  </Button>
                )}
              </>
            )}
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                if (plan) {
                  exportPlanDesarrolloPDF(
                    `${user?.nombre} ${user?.apellidos}`,
                    plan.periodoId,
                    plan
                  );
                  toast.success("Plan de desarrollo exportado a PDF");
                }
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Encabezado del Plan */}
        <Card className="mb-6 print:border-0 print:shadow-none">
          <CardHeader>
            <CardTitle className="text-2xl">Plan de Desarrollo Personalizado</CardTitle>
            <CardDescription>
              Periodo: {plan.periodoId} • Generado: {plan.fechaCreacion && new Date(plan.fechaCreacion).toLocaleDateString("es-GT")}
              {plan.fechaModificacion && (
                <> • Última modificación: {new Date(plan.fechaModificacion).toLocaleDateString("es-GT")}</>
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Objetivos de Desarrollo */}
        {currentPlan.competenciasDesarrollar && currentPlan.competenciasDesarrollar.length > 0 && (
          <Card className="mb-6 print:border-0 print:shadow-none print:break-inside-avoid">
            <CardHeader>
              <CardTitle>Objetivos de Desarrollo</CardTitle>
              <CardDescription>
                Competencias y áreas identificadas para mejorar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentPlan.competenciasDesarrollar.map((objetivo, index) => (
                <div key={index} className="flex gap-2 items-start">
                  {editing ? (
                    <>
                      <Textarea
                        value={objetivo}
                        onChange={(e) => handleUpdateCompetencia(index, e.target.value)}
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCompetencia(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-primary mt-1">•</span>
                      <p>{objetivo}</p>
                    </>
                  )}
                </div>
              ))}
              {editing && (
                <Button variant="outline" onClick={handleAddCompetencia}>
                  + Agregar Objetivo
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Plan Estructurado con Acciones Detalladas */}
        {currentPlan.planEstructurado && currentPlan.planEstructurado.acciones && currentPlan.planEstructurado.acciones.length > 0 && (
          <Card className="mb-6 print:border-0 print:shadow-none print:break-inside-avoid">
            <CardHeader>
              <CardTitle>Plan de Acción Detallado</CardTitle>
              <CardDescription>
                Acciones concretas con responsables, fechas e indicadores
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentPlan.planEstructurado.acciones.map((accion, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <p className="font-medium flex-1">{accion.descripcion}</p>
                    <Badge variant={accion.prioridad === "alta" ? "destructive" : accion.prioridad === "media" ? "default" : "secondary"}>
                      {accion.prioridad === "alta" ? "🔴 Alta" : accion.prioridad === "media" ? "🟡 Media" : "🟢 Baja"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Responsable:</span> <span className="font-medium">{accion.responsable}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fecha:</span> <span className="font-medium">{accion.fecha}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Indicador:</span> <span className="font-medium">{accion.indicador}</span>
                    </div>
                    {accion.recursos && accion.recursos.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Recursos:</span> <span>{accion.recursos.join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Dimensiones que Requieren Atención */}
        {currentPlan.planEstructurado && currentPlan.planEstructurado.dimensionesDebiles && currentPlan.planEstructurado.dimensionesDebiles.length > 0 && (
          <Card className="mb-6 border-warning print:border-0 print:shadow-none">
            <CardHeader>
              <CardTitle>Dimensiones que Requieren Atención</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentPlan.planEstructurado.dimensionesDebiles.map((dim, idx) => (
                <div key={idx} className="border-l-4 border-warning pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{dim.dimension}</h4>
                    <Badge variant="outline">
                      Score: {dim.score.toFixed(2)}/5.0 ({((dim.score / 5) * 100).toFixed(0)}%)
                    </Badge>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {dim.accionesEspecificas.map((accion, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-warning mt-1">•</span>
                        <span>{accion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Feedback Individual */}
        {currentPlan.feedbackIndividual && (
          <Card className="mb-6 print:border-0 print:shadow-none">
            <CardHeader>
              <CardTitle>Feedback Individual</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  value={currentPlan.feedbackIndividual}
                  onChange={(e) => setEditedPlan({ ...currentPlan, feedbackIndividual: e.target.value })}
                  rows={8}
                />
              ) : (
                <p className="whitespace-pre-wrap">{currentPlan.feedbackIndividual}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Feedback Grupal */}
        {currentPlan.feedbackGrupal && (
          <Card className="mb-6 print:border-0 print:shadow-none">
            <CardHeader>
              <CardTitle>Feedback Grupal</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  value={currentPlan.feedbackGrupal || ""}
                  onChange={(e) => setEditedPlan({ ...currentPlan, feedbackGrupal: e.target.value })}
                  rows={6}
                />
              ) : (
                <p className="whitespace-pre-wrap">{currentPlan.feedbackGrupal}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recomendaciones */}
        {currentPlan.recomendaciones && currentPlan.recomendaciones.length > 0 && (
          <Card className="mb-6 print:border-0 print:shadow-none">
            <CardHeader>
              <CardTitle>Recomendaciones Generales</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {currentPlan.recomendaciones.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Espacio para Firmas */}
        <Card className="print:border-0 print:shadow-none print:mt-12">
          <CardContent className="py-8">
            <div className="grid gap-8 md:grid-cols-2 print:grid-cols-2">
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Firma del Colaborador</p>
                  <div className="h-16 border-b"></div>
                  <p className="text-xs text-muted-foreground mt-1">Nombre y Firma</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Firma del Jefe Evaluador</p>
                  <div className="h-16 border-b"></div>
                  <p className="text-xs text-muted-foreground mt-1">Nombre y Firma</p>
                </div>
              </div>
            </div>
            <div className="mt-6 text-xs text-muted-foreground text-center">
              Fecha de firma: _________________________
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default VistaPlanDesarrollo;
