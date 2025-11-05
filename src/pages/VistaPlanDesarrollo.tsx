import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Edit, Save, Printer, X, Download } from "lucide-react";
import { toast } from "sonner";
import { DevelopmentPlan } from "@/types/evaluation";
import { exportPlanDesarrolloPDF } from "@/lib/exports";

const VistaPlanDesarrollo = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
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
    try {
      // Cargar desde localStorage (por ahora)
      const planKey = `development_plan_${id}_2025-1`;
      const stored = localStorage.getItem(planKey);
      
      if (stored) {
        const planData = JSON.parse(stored);
        setPlan(planData);
        setEditedPlan(planData);
      } else {
        // Intentar cargar desde Supabase
        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error } = await supabase
          .from("development_plans")
          .select("*")
          .eq("colaborador_id", id)
          .eq("periodo_id", "2025-1")
          .single();

        if (!error && data) {
          const planData: DevelopmentPlan = {
            id: data.id,
            evaluacionId: data.evaluacion_id,
            colaboradorId: data.colaborador_id,
            periodoId: data.periodo_id,
            competenciasDesarrollar: data.competencias_desarrollar,
            feedbackIndividual: data.feedback_individual || "",
            feedbackGrupal: data.feedback_grupal,
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
      // Guardar en localStorage
      const planKey = `development_plan_${editedPlan.colaboradorId}_${editedPlan.periodoId}`;
      localStorage.setItem(planKey, JSON.stringify({
        ...editedPlan,
        fechaModificacion: new Date().toISOString(),
        editadoPor: user?.dpi,
      }));

      // Guardar en Supabase
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from("development_plans")
        .update({
          competencias_desarrollar: editedPlan.competenciasDesarrollar,
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

  const handleUpdateCompetencia = (index: number, field: string, value: any) => {
    if (!editedPlan) return;
    const nuevasCompetencias = [...editedPlan.competenciasDesarrollar];
    nuevasCompetencias[index] = {
      ...nuevasCompetencias[index],
      [field]: value,
    };
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
        ...editedPlan.competenciasDesarrollar,
        {
          competencia: "",
          nivelActual: 3,
          nivelObjetivo: 4,
          acciones: [""],
          plazo: "6 meses",
        },
      ],
    });
  };

  const handleRemoveCompetencia = (index: number) => {
    if (!editedPlan) return;
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
              Periodo: {plan.periodoId} • Generado: {new Date(plan.fechaCreacion).toLocaleDateString("es-GT")}
              {plan.fechaModificacion && (
                <> • Última modificación: {new Date(plan.fechaModificacion).toLocaleDateString("es-GT")}</>
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Competencias a Desarrollar */}
        <Card className="mb-6 print:border-0 print:shadow-none">
          <CardHeader>
            <CardTitle>Competencias a Desarrollar</CardTitle>
            <CardDescription>
              Acciones concretas para el crecimiento profesional
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentPlan.competenciasDesarrollar.map((comp, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Competencia</Label>
                    {editing ? (
                      <Textarea
                        value={comp.competencia}
                        onChange={(e) => handleUpdateCompetencia(index, "competencia", e.target.value)}
                        rows={2}
                      />
                    ) : (
                      <p className="font-medium">{comp.competencia}</p>
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Nivel Actual</Label>
                      {editing ? (
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={comp.nivelActual}
                          onChange={(e) => handleUpdateCompetencia(index, "nivelActual", parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      ) : (
                        <Badge variant="outline">{comp.nivelActual}/5</Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Nivel Objetivo</Label>
                      {editing ? (
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={comp.nivelObjetivo}
                          onChange={(e) => handleUpdateCompetencia(index, "nivelObjetivo", parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      ) : (
                        <Badge>{comp.nivelObjetivo}/5</Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Plazo</Label>
                      {editing ? (
                        <input
                          type="text"
                          value={comp.plazo}
                          onChange={(e) => handleUpdateCompetencia(index, "plazo", e.target.value)}
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      ) : (
                        <p className="text-sm">{comp.plazo}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Acciones Concretas</Label>
                  {editing ? (
                    <div className="space-y-2">
                      {comp.acciones.map((accion, accIdx) => (
                        <div key={accIdx} className="flex gap-2">
                          <Textarea
                            value={accion}
                            onChange={(e) => {
                              const nuevasAcciones = [...comp.acciones];
                              nuevasAcciones[accIdx] = e.target.value;
                              handleUpdateCompetencia(index, "acciones", nuevasAcciones);
                            }}
                            rows={2}
                            placeholder="Acción específica..."
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const nuevasAcciones = comp.acciones.filter((_, i) => i !== accIdx);
                              handleUpdateCompetencia(index, "acciones", nuevasAcciones);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleUpdateCompetencia(index, "acciones", [...comp.acciones, ""]);
                        }}
                      >
                        + Agregar Acción
                      </Button>
                    </div>
                  ) : (
                    <ul className="list-disc list-inside space-y-1">
                      {comp.acciones.map((accion, accIdx) => (
                        <li key={accIdx}>{accion}</li>
                      ))}
                    </ul>
                  )}
                </div>
                {editing && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveCompetencia(index)}
                  >
                    Eliminar Competencia
                  </Button>
                )}
              </div>
            ))}
            {editing && (
              <Button variant="outline" onClick={handleAddCompetencia}>
                + Agregar Nueva Competencia
              </Button>
            )}
          </CardContent>
        </Card>

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

