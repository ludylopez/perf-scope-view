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
import { Textarea } from "@/components/ui/textarea";
import { FileText, Loader2, Download, Edit3, MessageSquare, Lightbulb, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GuiaRetroalimentacion, PuntoFuerte, AreaDesarrollo } from "@/types/evaluation";

interface GuiaRetroalimentacionProps {
  colaboradorId: string;
  periodoId: string;
  colaboradorNombre: string;
}

export const GenerarGuiaRetroalimentacion = ({
  colaboradorId,
  periodoId,
  colaboradorNombre,
}: GuiaRetroalimentacionProps) => {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [guia, setGuia] = useState<GuiaRetroalimentacion | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Estados editables
  const [editedPreparacion, setEditedPreparacion] = useState("");
  const [editedApertura, setEditedApertura] = useState("");
  const [editedCierre, setEditedCierre] = useState("");

  const generarGuia = async () => {
    setLoading(true);
    try {
      // Usar fetch directamente para poder capturar el body del error
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://oxadpbdlpvwyapuondei.supabase.co";
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94YWRwYmRscHZ3eWFwdW9uZGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMjU5MzcsImV4cCI6MjA3NzkwMTkzN30.HjIoMaw20qx7DscE-XWCaz88EWa0Jv_aCDcMtv6eadw";
      
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-feedback-guide`, {
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
        throw new Error(responseData.error || "Error generando guía");
      }

      if (responseData?.success && responseData.guia) {
        setGuia(responseData.guia);
        setEditedPreparacion(responseData.guia.preparacion || "");
        setEditedApertura(responseData.guia.apertura || "");
        setEditedCierre(responseData.guia.cierre || "");
        setShowModal(true);
        toast.success("Guía de retroalimentación generada exitosamente");
      } else {
        throw new Error(responseData?.error || "Error generando guía: respuesta inválida");
      }
    } catch (error: any) {
      console.error("Error generating guide:", error);
      const errorMessage = error?.message || error?.toString() || "Error desconocido al generar guía";
      console.error("Error details:", {
        message: errorMessage,
        error: error,
        stack: error?.stack,
      });
      toast.error(`Error al generar guía: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const descargarPDF = () => {
    if (!guia) return;

    // Construir contenido HTML para PDF
    const contenidoHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Guía de Retroalimentación - ${colaboradorNombre}</title>
        <style>
          @page {
            size: letter;
            margin: 1.5cm;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 10pt;
            line-height: 1.4;
            color: #333;
          }
          h1 {
            font-size: 16pt;
            color: #1a56db;
            margin-bottom: 0.3cm;
            border-bottom: 2px solid #1a56db;
            padding-bottom: 0.2cm;
          }
          h2 {
            font-size: 12pt;
            color: #1a56db;
            margin-top: 0.4cm;
            margin-bottom: 0.2cm;
          }
          h3 {
            font-size: 10pt;
            color: #444;
            margin-top: 0.3cm;
            margin-bottom: 0.15cm;
          }
          .seccion {
            margin-bottom: 0.4cm;
          }
          .item {
            margin-left: 0.5cm;
            margin-bottom: 0.3cm;
          }
          .label {
            font-weight: bold;
            color: #555;
          }
          ul {
            margin: 0.2cm 0;
            padding-left: 0.8cm;
          }
          li {
            margin-bottom: 0.15cm;
          }
          .footer {
            margin-top: 0.5cm;
            padding-top: 0.3cm;
            border-top: 1px solid #ccc;
            font-size: 9pt;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <h1>📋 Guía de Retroalimentación del Desempeño</h1>
        <p><strong>Colaborador:</strong> ${colaboradorNombre}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-GT')}</p>

        <div class="seccion">
          <h2>🎯 Preparación para la Reunión</h2>
          <p>${editMode ? editedPreparacion : guia.preparacion}</p>
        </div>

        <div class="seccion">
          <h2>👋 Apertura de la Conversación</h2>
          <p>${editMode ? editedApertura : guia.apertura}</p>
        </div>

        <div class="seccion">
          <h2>⭐ Puntos Fuertes (Reconocimiento)</h2>
          ${guia.fortalezas.map((f: PuntoFuerte, idx: number) => `
            <div class="item">
              <h3>${idx + 1}. ${f.dimension}</h3>
              <p><span class="label">Reconocimiento:</span> ${f.reconocimiento}</p>
              <p><span class="label">Ejemplo concreto:</span> ${f.ejemplo}</p>
              <p><span class="label">Impacto positivo:</span> ${f.impacto}</p>
            </div>
          `).join('')}
        </div>

        <div class="seccion">
          <h2>🎯 Áreas de Desarrollo (Metodología SBI)</h2>
          ${guia.areasDesarrollo.map((area: AreaDesarrollo, idx: number) => `
            <div class="item">
              <h3>${idx + 1}. ${area.dimension}</h3>
              <p><span class="label">📍 Situación:</span> ${area.situacion}</p>
              <p><span class="label">🔍 Comportamiento observado:</span> ${area.comportamiento}</p>
              <p><span class="label">💡 Impacto:</span> ${area.impacto}</p>
              <p><span class="label">✅ Sugerencia:</span> ${area.sugerencia}</p>
            </div>
          `).join('')}
        </div>

        <div class="seccion">
          <h2>💬 Preguntas para el Diálogo</h2>
          <ul>
            ${guia.preguntasDialogo.map((p: string) => `<li>${p}</li>`).join('')}
          </ul>
        </div>

        <div class="seccion">
          <h2>💡 Tips para Conducir la Reunión</h2>
          <ul>
            ${guia.tipsConduccion.map((t: string) => `<li>${t}</li>`).join('')}
          </ul>
        </div>

        <div class="seccion">
          <h2>🤝 Cierre de la Reunión</h2>
          <p>${editMode ? editedCierre : guia.cierre}</p>
        </div>

        <div class="footer">
          Generado con IA | Municipalidad de Esquipulas | Sistema de Gestión del Desempeño
        </div>
      </body>
      </html>
    `;

    // Crear blob y descargar
    const blob = new Blob([contenidoHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Guia-Retroalimentacion-${colaboradorNombre.replace(/\s/g, '-')}-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Guía descargada. Ábrela en tu navegador y usa Ctrl+P para imprimir a PDF");
  };

  return (
    <>
      <Button
        onClick={generarGuia}
        disabled={loading}
        size="lg"
        variant="outline"
        className="gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generando guía...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4" />
            Generar Guía de Retroalimentación
          </>
        )}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Guía de Retroalimentación - {colaboradorNombre}
            </DialogTitle>
            <DialogDescription>
              Guía generada con IA usando metodología SBI (Situación-Comportamiento-Impacto).
              Puedes editar antes de descargar.
            </DialogDescription>
          </DialogHeader>

          {guia && (
            <div className="space-y-4">
              {/* Preparación */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-4 w-4" />
                    Preparación para la Reunión
                  </CardTitle>
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
                    Apertura de la Conversación
                  </CardTitle>
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

              {/* Puntos Fuertes */}
              {guia.fortalezas && guia.fortalezas.length > 0 && (
                <Card className="border-success/50 bg-success/5">
                  <CardHeader>
                    <CardTitle className="text-base">⭐ Puntos Fuertes (Reconocimiento)</CardTitle>
                    <CardDescription className="text-xs">
                      Comienza reconociendo los logros y fortalezas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {guia.fortalezas.map((fortaleza: PuntoFuerte, idx: number) => (
                        <div key={idx} className="border-l-4 border-success pl-3 text-sm">
                          <h4 className="font-semibold mb-1">{fortaleza.dimension}</h4>
                          <p className="mb-1"><span className="font-medium">Reconocimiento:</span> {fortaleza.reconocimiento}</p>
                          <p className="mb-1"><span className="font-medium">Ejemplo:</span> {fortaleza.ejemplo}</p>
                          <p><span className="font-medium">Impacto:</span> {fortaleza.impacto}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Áreas de Desarrollo con SBI */}
              {guia.areasDesarrollo && guia.areasDesarrollo.length > 0 && (
                <Card className="border-warning/50 bg-warning/5">
                  <CardHeader>
                    <CardTitle className="text-base">🎯 Áreas de Desarrollo (Metodología SBI)</CardTitle>
                    <CardDescription className="text-xs">
                      Situación → Comportamiento → Impacto → Sugerencia
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {guia.areasDesarrollo.map((area: AreaDesarrollo, idx: number) => (
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
                      Preguntas para el Diálogo
                    </CardTitle>
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
                      Tips para Conducir la Reunión
                    </CardTitle>
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
                  <CardTitle className="text-base">🤝 Cierre de la Reunión</CardTitle>
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
            <Button onClick={descargarPDF} variant="default">
              <Download className="h-4 w-4 mr-2" />
              Descargar para PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
