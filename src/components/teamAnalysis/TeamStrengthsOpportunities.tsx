import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TeamAIAnalysisResponse } from "@/types/teamAnalysis";

interface TeamStrengthsOpportunitiesProps {
  jefeDpi: string;
  periodoId: string;
}

export function TeamStrengthsOpportunities({
  jefeDpi,
  periodoId,
}: TeamStrengthsOpportunitiesProps) {
  const [analysis, setAnalysis] = useState<TeamAIAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [fechaGeneracion, setFechaGeneracion] = useState<string | null>(null);

  // Cargar análisis existente al montar el componente
  useEffect(() => {
    loadExistingAnalysis();
  }, [jefeDpi, periodoId]);

  // Debug: Log del estado del análisis
  useEffect(() => {
    console.log("🔍 [TeamStrengthsOpportunities] Estado actual:", {
      hasAnalysis: !!analysis,
      isLoading,
      isLoadingExisting,
      error,
      hasGenerated,
      jefeDpi,
      periodoId,
      analysisKeys: analysis ? Object.keys(analysis) : null,
    });
  }, [analysis, isLoading, isLoadingExisting, error, hasGenerated, jefeDpi, periodoId]);

  const loadExistingAnalysis = async () => {
    try {
      setIsLoadingExisting(true);
      console.log("🔍 [TeamStrengthsOpportunities] Cargando análisis existente...", { jefeDpi, periodoId });
      
      const { data, error: fetchError } = await supabase
        .from("team_analysis")
        .select("analysis, fecha_generacion")
        .eq("jefe_dpi", jefeDpi)
        .eq("periodo_id", periodoId)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 es "no rows returned", que es normal si no hay análisis
        console.error("❌ [TeamStrengthsOpportunities] Error cargando análisis existente:", fetchError);
      }

      console.log("📊 [TeamStrengthsOpportunities] Datos obtenidos:", { 
        hasData: !!data, 
        hasAnalysis: !!data?.analysis,
        fechaGeneracion: data?.fecha_generacion 
      });

      if (data?.analysis) {
        console.log("✅ [TeamStrengthsOpportunities] Análisis encontrado, estableciendo estado...");
        
        // Asegurar que el análisis se parsea correctamente
        let parsedAnalysis: TeamAIAnalysisResponse;
        if (typeof data.analysis === 'string') {
          parsedAnalysis = JSON.parse(data.analysis);
        } else {
          parsedAnalysis = data.analysis as TeamAIAnalysisResponse;
        }
        
        console.log("📋 [TeamStrengthsOpportunities] Análisis parseado:", {
          hasFortalezas: !!parsedAnalysis.fortalezas,
          numFortalezas: parsedAnalysis.fortalezas?.length || 0,
          hasOportunidades: !!parsedAnalysis.oportunidadesMejora,
          numOportunidades: parsedAnalysis.oportunidadesMejora?.length || 0,
          hasResumen: !!parsedAnalysis.resumenEjecutivo,
        });
        
        setAnalysis(parsedAnalysis);
        setHasGenerated(true);
        setFechaGeneracion(data.fecha_generacion);
        console.log("✅ [TeamStrengthsOpportunities] Estado actualizado exitosamente");
      } else {
        console.log("ℹ️ [TeamStrengthsOpportunities] No se encontró análisis existente");
      }
    } catch (err) {
      console.error("❌ [TeamStrengthsOpportunities] Error cargando análisis:", err);
    } finally {
      setIsLoadingExisting(false);
    }
  };

  const saveAnalysisToDatabase = async (analysisData: TeamAIAnalysisResponse) => {
    try {
      const { error: saveError } = await supabase
        .from("team_analysis")
        .upsert(
          {
            jefe_dpi: jefeDpi,
            periodo_id: periodoId,
            analysis: analysisData,
            fecha_generacion: new Date().toISOString(),
          },
          {
            onConflict: "jefe_dpi,periodo_id",
          }
        );

      if (saveError) {
        console.error("Error guardando análisis:", saveError);
        // No mostrar error al usuario, solo loguear
      } else {
        setFechaGeneracion(new Date().toISOString());
      }
    } catch (err) {
      console.error("Error guardando análisis en BD:", err);
    }
  };

  const generateAnalysis = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Llamar a la Edge Function
      const { data, error: functionError } = await supabase.functions.invoke(
        "generate-team-analysis",
        {
          body: {
            jefeDpi,
            periodoId,
          },
        }
      );

      if (functionError) {
        throw new Error(functionError.message || "Error al generar análisis");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Error desconocido al generar análisis");
      }

      setAnalysis(data.analysis);
      setHasGenerated(true);
      
      // Guardar en base de datos
      await saveAnalysisToDatabase(data.analysis);
      
      toast.success("Análisis generado exitosamente");
    } catch (err: any) {
      console.error("Error generando análisis:", err);
      setError(err.message || "Error al generar el análisis");
      toast.error("Error al generar el análisis");
    } finally {
      setIsLoading(false);
    }
  };

  // Debug: Log del render
  console.log("🎨 [TeamStrengthsOpportunities] Renderizando con estado:", {
    hasAnalysis: !!analysis,
    isLoading,
    isLoadingExisting,
    error,
    hasGenerated,
    shouldShowAnalysis: analysis && !isLoadingExisting,
    shouldShowLoading: isLoadingExisting,
    shouldShowEmpty: !analysis && !isLoading && !error && !isLoadingExisting && !hasGenerated,
  });

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Análisis de Fortalezas y Oportunidades del Equipo
            </CardTitle>
            <CardDescription>
              Análisis generado por IA basado en evaluaciones, comentarios y
              necesidades del equipo
            </CardDescription>
          </div>
          {!hasGenerated && (
            <Button
              onClick={generateAnalysis}
              disabled={isLoading}
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generar Análisis
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && !analysis && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button
                variant="outline"
                size="sm"
                className="ml-4"
                onClick={generateAnalysis}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {analysis && !isLoadingExisting && (
          <div className="space-y-6">
            {/* Resumen Ejecutivo */}
            {analysis.resumenEjecutivo && (
              <div className="p-4 rounded-lg border bg-primary/5">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Resumen Ejecutivo
                </h4>
                <p className="text-sm text-muted-foreground">
                  {analysis.resumenEjecutivo}
                </p>
              </div>
            )}

            {/* Tabla de 2 columnas */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Columna Izquierda: Fortalezas */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-700">
                    Fortalezas del Equipo
                  </h3>
                </div>
                {analysis.fortalezas && analysis.fortalezas.length > 0 ? (
                  <div className="space-y-4">
                    {analysis.fortalezas.map((fortaleza, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg border bg-green-50/50 border-green-200"
                      >
                        <h4 className="font-semibold text-green-900 mb-2">
                          {fortaleza.titulo}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {fortaleza.descripcion}
                        </p>
                        {fortaleza.evidencia && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Evidencia:
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {fortaleza.evidencia}
                            </p>
                          </div>
                        )}
                        {fortaleza.impacto && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Impacto:
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {fortaleza.impacto}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No se identificaron fortalezas específicas
                  </p>
                )}
              </div>

              {/* Columna Derecha: Oportunidades de Mejora */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <TrendingDown className="h-5 w-5 text-amber-600" />
                  <h3 className="text-lg font-semibold text-amber-700">
                    Oportunidades de Mejora
                  </h3>
                </div>
                {analysis.oportunidadesMejora &&
                analysis.oportunidadesMejora.length > 0 ? (
                  <div className="space-y-4">
                    {analysis.oportunidadesMejora.map((oportunidad, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg border bg-amber-50/50 border-amber-200"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-amber-900">
                            {oportunidad.titulo}
                          </h4>
                          <Badge
                            variant={
                              oportunidad.prioridad === "alta"
                                ? "destructive"
                                : oportunidad.prioridad === "media"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {oportunidad.prioridad.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {oportunidad.descripcion}
                        </p>
                        {oportunidad.causas && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Causas:
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {oportunidad.causas}
                            </p>
                          </div>
                        )}
                        {oportunidad.recomendaciones &&
                          oportunidad.recomendaciones.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Recomendaciones:
                              </p>
                              <ul className="text-xs text-muted-foreground space-y-1">
                                {oportunidad.recomendaciones.map(
                                  (rec, recIndex) => (
                                    <li key={recIndex} className="flex items-start gap-1">
                                      <span className="text-amber-600">•</span>
                                      <span>{rec}</span>
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No se identificaron oportunidades de mejora específicas
                  </p>
                )}
              </div>
            </div>

            {/* Botón para regenerar */}
            {hasGenerated && (
              <div className="flex justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateAnalysis}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Regenerando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerar Análisis
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {isLoadingExisting && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
            <p className="text-sm text-muted-foreground">
              Cargando análisis existente...
            </p>
          </div>
        )}

        {!analysis && !isLoading && !error && !isLoadingExisting && !hasGenerated && (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Haz clic en "Generar Análisis" para obtener un análisis completo
              de fortalezas y oportunidades de mejora de tu equipo
            </p>
          </div>
        )}

        {fechaGeneracion && analysis && (
          <div className="text-xs text-muted-foreground text-center pt-4 border-t">
            Análisis generado el: {new Date(fechaGeneracion).toLocaleString("es-GT", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

