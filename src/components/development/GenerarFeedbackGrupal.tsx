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
import { Textarea } from "@/components/ui/textarea";
import { Users, Loader2, Save, Edit3, MessageSquare, Lightbulb, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface GenerarFeedbackGrupalProps {
  colaboradorId: string;
  periodoId: string;
  colaboradorNombre: string;
}

interface GuiaGrupal {
  preparacion: string;
  apertura: string;
  fortalezasGrupales: Array<{
    dimension: string;
    descripcion: string;
    ejemplo: string;
  }>;
  areasDesarrolloGrupales: Array<{
    dimension: string;
    situacion: string;
    comportamiento: string;
    impacto: string;
    sugerencia: string;
  }>;
  preguntasDialogo: string[];
  tipsConduccion: string[];
  cierre: string;
  feedbackGrupal: string;
}

export const GenerarFeedbackGrupal = ({
  colaboradorId,
  periodoId,
  colaboradorNombre,
}: GenerarFeedbackGrupalProps) => {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [guia, setGuia] = useState<GuiaGrupal | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [tieneGrupos, setTieneGrupos] = useState(false);

  // Estados editables
  const [editedPreparacion, setEditedPreparacion] = useState("");
  const [editedApertura, setEditedApertura] = useState("");
  const [editedCierre, setEditedCierre] = useState("");
  const [editedFeedbackGrupal, setEditedFeedbackGrupal] = useState("");

  // Verificar si el colaborador tiene grupos
  useEffect(() => {
    const verificarGrupos = async () => {
      try {
        const { data: gruposData } = await supabase
          .from("group_members")
          .select("grupo_id, groups!group_members_grupo_id_fkey(nombre, tipo)")
          .eq("colaborador_id", colaboradorId)
          .eq("activo", true);

        setTieneGrupos(gruposData && gruposData.length > 0);
      } catch (error) {
        console.error("Error verificando grupos:", error);
        setTieneGrupos(false);
      }
    };

    verificarGrupos();
  }, [colaboradorId]);

  const generarGuiaGrupal = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://oxadpbdlpvwyapuondei.supabase.co";
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94YWRwYmRscHZ3eWFwdW9uZGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMjU5MzcsImV4cCI6MjA3NzkwMTkzN30.HjIoMaw20qx7DscE-XWCaz88EWa0Jv_aCDcMtv6eadw";
      
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-feedback-grupal`, {
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
        const errorMessage = responseData?.error || responseData?.message || `Error ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      if (responseData && !responseData.success) {
        throw new Error(responseData.error || "Error generando guía grupal");
      }

      if (responseData?.success && responseData.guia) {
        setGuia(responseData.guia);
        setEditedPreparacion(responseData.guia.preparacion || "");
        setEditedApertura(responseData.guia.apertura || "");
        setEditedCierre(responseData.guia.cierre || "");
        setEditedFeedbackGrupal(responseData.guia.feedbackGrupal || "");
        setShowModal(true);
        toast.success("Guía y feedback grupal generados exitosamente");
      } else {
        throw new Error(responseData?.error || "Error generando guía grupal: respuesta inválida");
      }
    } catch (error: any) {
      console.error("Error generating group guide:", error);
      const errorMessage = error?.message || error?.toString() || "Error desconocido al generar guía grupal";
      toast.error(`Error al generar guía grupal: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const guardarFeedbackGrupal = async () => {
    if (!editedFeedbackGrupal.trim()) {
      toast.error("El feedback grupal no puede estar vacío");
      return;
    }

    try {
      const { data: planExistente } = await supabase
        .from("development_plans")
        .select("id")
        .eq("colaborador_id", colaboradorId)
        .eq("periodo_id", periodoId)
        .maybeSingle();

      if (planExistente) {
        const { error: errorUpdate } = await supabase
          .from("development_plans")
          .update({
            feedback_grupal: editedFeedbackGrupal,
            updated_at: new Date().toISOString(),
          })
          .eq("id", planExistente.id);

        if (errorUpdate) {
          throw errorUpdate;
        }
      } else {
        const { error: errorInsert } = await supabase
          .from("development_plans")
          .insert({
            colaborador_id: colaboradorId,
            periodo_id: periodoId,
            feedback_grupal: editedFeedbackGrupal,
            generado_por_ia: true,
            editable: true,
          });

        if (errorInsert) {
          throw errorInsert;
        }
      }

      toast.success("Feedback grupal guardado exitosamente");
    } catch (error: any) {
      console.error("Error guardando feedback grupal:", error);
      toast.error(`Error al guardar feedback: ${error.message || "Error desconocido"}`);
    }
  };

  // No mostrar el botón si no tiene grupos
  if (!tieneGrupos) {
    return null;
  }

  return (
    <>
      <Button
        onClick={generarGuiaGrupal}
        disabled={loading}
        size="lg"
        variant="outline"
        className="gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generando guía grupal...
          </>
        ) : (
          <>
            <Users className="h-4 w-4" />
            Generar Guía y Feedback Grupal
          </>
        )}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Guía y Feedback Grupal - {colaboradorNombre}
            </DialogTitle>
            <DialogDescription>
              Guía generada con IA usando metodología SBI (Situación-Comportamiento-Impacto).
              La guía es solo para ti (jefe). El feedback grupal es para compartir con la cuadrilla.
              Puedes editar antes de guardar.
            </DialogDescription>
          </DialogHeader>

          {guia && (
            <div className="space-y-4">
              {/* Preparación */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-4 w-4" />
                    Preparación para la Reunión Grupal
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Solo para jefe - No compartir
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {editMode ? (
                    <Textarea
                      value={editedPreparacion}
                      onChange={(e) => setEditedPreparacion(e.target.value)}
                      rows={3}
                      className="text-sm"
                    />
                  ) : (
                    <p className="text-sm">{guia.preparacion}</p>
                  )}
                </CardContent>
              </Card>

              {/* Apertura */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="h-4 w-4" />
                    Apertura de la Conversación Grupal
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Solo para jefe - No compartir
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {editMode ? (
                    <Textarea
                      value={editedApertura}
                      onChange={(e) => setEditedApertura(e.target.value)}
                      rows={3}
                      className="text-sm"
                    />
                  ) : (
                    <p className="text-sm">{guia.apertura}</p>
                  )}
                </CardContent>
              </Card>

              {/* Fortalezas Grupales */}
              {guia.fortalezasGrupales && guia.fortalezasGrupales.length > 0 && (
                <Card className="border-success/50 bg-success/5">
                  <CardHeader>
                    <CardTitle className="text-base">⭐ Fortalezas del Equipo</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Solo para jefe - No compartir
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {guia.fortalezasGrupales.map((fortaleza, idx: number) => (
                        <div key={idx} className="border-l-4 border-success pl-3 text-sm">
                          <h4 className="font-semibold mb-1">{fortaleza.dimension}</h4>
                          <p className="mb-1"><span className="font-medium">Descripción:</span> {fortaleza.descripcion}</p>
                          <p><span className="font-medium">Ejemplo:</span> {fortaleza.ejemplo}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Áreas de Desarrollo Grupales con SBI */}
              {guia.areasDesarrolloGrupales && guia.areasDesarrolloGrupales.length > 0 && (
                <Card className="border-warning/50 bg-warning/5">
                  <CardHeader>
                    <CardTitle className="text-base">🎯 Áreas de Desarrollo del Equipo (Metodología SBI)</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Solo para jefe - No compartir
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {guia.areasDesarrolloGrupales.map((area, idx: number) => (
                        <div key={idx} className="border-l-4 border-warning pl-3 text-sm">
                          <h4 className="font-semibold mb-1">{area.dimension}</h4>
                          <p className="mb-1"><span className="font-medium">📍 Situación:</span> {area.situacion}</p>
                          <p className="mb-1"><span className="font-medium">🔍 Comportamiento:</span> {area.comportamiento}</p>
                          <p className="mb-1"><span className="font-medium">💡 Impacto:</span> {area.impacto}</p>
                          <p><span className="font-medium">✅ Sugerencia:</span> {area.sugerencia}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Preguntas para el Diálogo */}
              {guia.preguntasDialogo && guia.preguntasDialogo.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MessageSquare className="h-4 w-4" />
                      Preguntas para el Diálogo Grupal
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Solo para jefe - No compartir
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      {guia.preguntasDialogo.map((pregunta: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{pregunta}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Tips de Conducción */}
              {guia.tipsConduccion && guia.tipsConduccion.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Lightbulb className="h-4 w-4" />
                      Tips para Conducir la Reunión Grupal
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Solo para jefe - No compartir
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      {guia.tipsConduccion.map((tip: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-primary mt-0.5">→</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Cierre */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">🤝 Cierre de la Reunión Grupal</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Solo para jefe - No compartir
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {editMode ? (
                    <Textarea
                      value={editedCierre}
                      onChange={(e) => setEditedCierre(e.target.value)}
                      rows={3}
                      className="text-sm"
                    />
                  ) : (
                    <p className="text-sm">{guia.cierre}</p>
                  )}
                </CardContent>
              </Card>

              {/* Separador visual */}
              <div className="border-t-2 border-primary/20 my-4"></div>

              {/* Feedback Grupal - Para compartir con cuadrilla */}
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4 text-primary" />
                    Feedback Grupal
                  </CardTitle>
                  <CardDescription className="text-xs text-primary font-medium">
                    ✓ Para compartir con la cuadrilla
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {editMode ? (
                    <Textarea
                      value={editedFeedbackGrupal}
                      onChange={(e) => setEditedFeedbackGrupal(e.target.value)}
                      rows={8}
                      className="text-sm"
                      placeholder="Feedback narrativo para compartir con la cuadrilla..."
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{editedFeedbackGrupal || "No se generó feedback grupal"}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditMode(!editMode)}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              {editMode ? "Ver Guía" : "Editar"}
            </Button>
            {editedFeedbackGrupal && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(editedFeedbackGrupal);
                    toast.success("Feedback grupal copiado al portapapeles");
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Copiar Feedback
                </Button>
                <Button
                  variant="default"
                  onClick={guardarFeedbackGrupal}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Feedback
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

