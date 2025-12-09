import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LikertScale } from "./LikertScale";
import { Instrument } from "@/types/evaluation";
import { User, FileText, Target, TrendingUp, Star, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface VerFormulariosEvaluacionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaboradorNombre: string;
  instrument: Instrument | null;
  autoevaluacion: any | null;
  evaluacionJefe: any | null;
}

export const VerFormulariosEvaluacion = ({
  open,
  onOpenChange,
  colaboradorNombre,
  instrument,
  autoevaluacion,
  evaluacionJefe,
}: VerFormulariosEvaluacionProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("auto");
  const [npsScore, setNpsScore] = useState<number | undefined>(undefined);
  const [openQuestions, setOpenQuestions] = useState<Array<{
    pregunta: string;
    tipo: string;
    respuesta: string;
  }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !autoevaluacion) return;

    const loadAdditionalData = async () => {
      setLoading(true);
      try {
        // Obtener el ID de la evaluación de autoevaluación
        // El autoevaluacion puede venir con diferentes estructuras, intentamos ambas
        const usuarioId = autoevaluacion.usuarioId || autoevaluacion.usuario_id || (autoevaluacion as any).dpi;
        const periodoId = autoevaluacion.periodoId || autoevaluacion.periodo_id;
        
        if (!usuarioId || !periodoId) {
          console.warn("No se pudo obtener usuarioId o periodoId de autoevaluacion");
          setLoading(false);
          return;
        }

        const { data: evalData } = await supabase
          .from("evaluations")
          .select("id, nps_score")
          .eq("usuario_id", usuarioId)
          .eq("periodo_id", periodoId)
          .eq("tipo", "auto")
          .eq("estado", "enviado")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (evalData) {
          // Cargar NPS
          if (evalData.nps_score !== null && evalData.nps_score !== undefined) {
            setNpsScore(evalData.nps_score);
          }

          // Cargar preguntas abiertas
          const { data: openResponsesData } = await supabase
            .from("open_question_responses")
            .select(`
              respuesta,
              open_questions (
                pregunta,
                tipo
              )
            `)
            .eq("evaluacion_id", evalData.id)
            .order("created_at", { ascending: true });

          if (openResponsesData && openResponsesData.length > 0) {
            const questionsData = openResponsesData.map((item: any) => ({
              pregunta: item.open_questions?.pregunta || "",
              tipo: item.open_questions?.tipo || "otro",
              respuesta: item.respuesta || "",
            }));
            setOpenQuestions(questionsData);
          }
        }
      } catch (error) {
        console.error("Error cargando datos adicionales:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAdditionalData();
  }, [open, autoevaluacion]);

  if (!instrument) {
    return null;
  }

  const desempenoDimensions = instrument.dimensionesDesempeno || [];
  const potencialDimensions = instrument.dimensionesPotencial || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Formularios de Evaluación - {colaboradorNombre}
          </DialogTitle>
          <DialogDescription>
            Visualización completa de la autoevaluación del colaborador y la evaluación del jefe
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="auto" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Autoevaluación
            </TabsTrigger>
            <TabsTrigger value="desempeno" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Desempeño (Jefe)
            </TabsTrigger>
            <TabsTrigger value="potencial" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Potencial (Jefe)
            </TabsTrigger>
          </TabsList>

          {/* Tab: Autoevaluación */}
          <TabsContent value="auto" className="space-y-6 mt-6">
            {autoevaluacion ? (
              <Card>
                <CardHeader>
                  <CardTitle>Autoevaluación del Colaborador</CardTitle>
                  <CardDescription>
                    Respuestas completas de la autoevaluación realizada por el colaborador
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {desempenoDimensions.map((dim) => {
                      const dimResponses = dim.items
                        .map((item) => autoevaluacion.responses[item.id])
                        .filter((v) => v !== undefined);
                      const avg =
                        dimResponses.length > 0
                          ? dimResponses.reduce((sum, val) => sum + val, 0) / dimResponses.length
                          : 0;

                      return (
                        <div
                          key={dim.id}
                          className="p-4 rounded-lg border border-border bg-muted/30"
                        >
                          <div className="mb-4">
                            <h3 className="font-semibold text-lg">{dim.nombre}</h3>
                            {dim.descripcion && (
                              <p className="text-sm text-muted-foreground mt-1">{dim.descripcion}</p>
                            )}
                            <div className="mt-2 text-sm">
                              <strong>Promedio:</strong> {avg.toFixed(2)}/5.0 (
                              {((avg / 5) * 100).toFixed(0)}%)
                            </div>
                          </div>
                          <div className="space-y-3">
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
                          {/* Solo RRHH puede ver comentarios del colaborador */}
                          {(user?.rol === 'admin_rrhh' || user?.rol === 'admin_general') && autoevaluacion.comments && autoevaluacion.comments[dim.id] && autoevaluacion.comments[dim.id].trim() && (
                            <div className="mt-4 p-3 bg-background rounded border">
                              <Label className="text-xs text-muted-foreground">
                                Comentarios del colaborador:
                              </Label>
                              <p className="text-sm mt-1 whitespace-pre-wrap">
                                {autoevaluacion.comments[dim.id]}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* NPS Score */}
                    {npsScore !== undefined && npsScore !== null && (
                      <Card className="mt-6 border-primary/20">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-primary" />
                            Recomendación Institucional (NPS)
                          </CardTitle>
                          <CardDescription>
                            Calificación de recomendación del colaborador a la institución
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-4xl font-bold text-primary">{npsScore}</span>
                              <span className="text-muted-foreground">/ 10</span>
                            </div>
                            <div className="flex-1">
                              <div className="h-4 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${(npsScore / 10) * 100}%` }}
                                />
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {npsScore >= 9
                                ? "Promotor"
                                : npsScore >= 7
                                ? "Neutro"
                                : "Detractor"}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Preguntas Abiertas */}
                    {openQuestions.length > 0 && (
                      <Card className="mt-6 border-primary/20">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-primary" />
                            Necesidades de Desarrollo y Recursos
                          </CardTitle>
                          <CardDescription>
                            Respuestas del colaborador sobre capacitaciones y herramientas necesarias
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            {openQuestions.map((question, idx) => (
                              <div key={idx} className="space-y-2">
                                <Label className="text-base font-medium">
                                  {question.pregunta}
                                  {question.tipo === "capacitacion" && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      (Capacitación)
                                    </span>
                                  )}
                                  {question.tipo === "herramienta" && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      (Herramienta)
                                    </span>
                                  )}
                                </Label>
                                <Textarea
                                  value={question.respuesta}
                                  disabled
                                  rows={4}
                                  className="resize-none bg-muted"
                                />
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No hay autoevaluación disponible para este colaborador.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Evaluación de Desempeño del Jefe */}
          <TabsContent value="desempeno" className="space-y-6 mt-6">
            {evaluacionJefe ? (
              <Card>
                <CardHeader>
                  <CardTitle>Evaluación de Desempeño del Jefe</CardTitle>
                  <CardDescription>
                    Respuestas completas de la evaluación de desempeño realizada por el jefe
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {desempenoDimensions.map((dim) => {
                      const dimResponses = dim.items
                        .map((item) => evaluacionJefe.responses[item.id])
                        .filter((v) => v !== undefined);
                      const avg =
                        dimResponses.length > 0
                          ? dimResponses.reduce((sum, val) => sum + val, 0) / dimResponses.length
                          : 0;

                      return (
                        <div
                          key={dim.id}
                          className="p-4 rounded-lg border border-border bg-muted/30"
                        >
                          <div className="mb-4">
                            <h3 className="font-semibold text-lg">
                              {dim.nombre} ({Math.round(dim.peso * 100)}%)
                            </h3>
                            {dim.descripcion && (
                              <p className="text-sm text-muted-foreground mt-1">{dim.descripcion}</p>
                            )}
                            <div className="mt-2 text-sm">
                              <strong>Promedio:</strong> {avg.toFixed(2)}/5.0 (
                              {((avg / 5) * 100).toFixed(0)}%)
                            </div>
                          </div>
                          <div className="space-y-3">
                            {dim.items.map((item) => (
                              <LikertScale
                                key={item.id}
                                itemId={item.id}
                                itemText={`${item.orden}. ${item.texto}`}
                                value={evaluacionJefe.responses[item.id]}
                                onChange={() => {}}
                                disabled={true}
                              />
                            ))}
                          </div>
                          {evaluacionJefe.comments && evaluacionJefe.comments[dim.id] && evaluacionJefe.comments[dim.id].trim() && (
                            <div className="mt-4 p-3 bg-background rounded border">
                              <Label className="text-xs text-muted-foreground">
                                Comentarios del jefe:
                              </Label>
                              <p className="text-sm mt-1 whitespace-pre-wrap">
                                {evaluacionJefe.comments[dim.id]}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No hay evaluación de desempeño disponible.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Evaluación de Potencial del Jefe */}
          <TabsContent value="potencial" className="space-y-6 mt-6">
            {evaluacionJefe && potencialDimensions.length > 0 && evaluacionJefe.evaluacionPotencial ? (
              <Card>
                <CardHeader>
                  <CardTitle>Evaluación de Potencial del Jefe</CardTitle>
                  <CardDescription>
                    Respuestas completas de la evaluación de potencial realizada por el jefe
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {potencialDimensions.map((dim) => {
                      // Las respuestas de potencial están en evaluacionPotencial.responses
                      const potencialResponses = evaluacionJefe.evaluacionPotencial?.responses || {};
                      const dimResponses = dim.items
                        .map((item) => potencialResponses[item.id])
                        .filter((v) => v !== undefined);
                      const avg =
                        dimResponses.length > 0
                          ? dimResponses.reduce((sum, val) => sum + val, 0) / dimResponses.length
                          : 0;

                      return (
                        <div
                          key={dim.id}
                          className="p-4 rounded-lg border border-border bg-muted/30"
                        >
                          <div className="mb-4">
                            <h3 className="font-semibold text-lg">
                              {dim.nombre} ({Math.round(dim.peso * 100)}%)
                            </h3>
                            {dim.descripcion && (
                              <p className="text-sm text-muted-foreground mt-1">{dim.descripcion}</p>
                            )}
                            <div className="mt-2 text-sm">
                              <strong>Promedio:</strong> {avg.toFixed(2)}/5.0 (
                              {((avg / 5) * 100).toFixed(0)}%)
                            </div>
                          </div>
                          <div className="space-y-3">
                            {dim.items.map((item) => (
                              <LikertScale
                                key={item.id}
                                itemId={item.id}
                                itemText={`${item.orden}. ${item.texto}`}
                                value={potencialResponses[item.id]}
                                onChange={() => {}}
                                disabled={true}
                              />
                            ))}
                          </div>
                          {evaluacionJefe.evaluacionPotencial?.comments && evaluacionJefe.evaluacionPotencial.comments[dim.id] && evaluacionJefe.evaluacionPotencial.comments[dim.id].trim() && (
                            <div className="mt-4 p-3 bg-background rounded border">
                              <Label className="text-xs text-muted-foreground">
                                Comentarios del jefe:
                              </Label>
                              <p className="text-sm mt-1 whitespace-pre-wrap">
                                {evaluacionJefe.evaluacionPotencial.comments[dim.id]}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {potencialDimensions.length === 0
                    ? "Este instrumento no incluye evaluación de potencial."
                    : "No hay evaluación de potencial disponible."}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

