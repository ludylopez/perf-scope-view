import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BarChart3, FileText, TrendingUp, Download } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { getSubmittedEvaluation } from "@/lib/storage";
import { getNineBoxDescription } from "@/lib/finalScore";
import { toast } from "sonner";
import { scoreToPercentage } from "@/lib/calculations";
import { PerformanceRadarAnalysis } from "@/components/evaluation/PerformanceRadarAnalysis";
import { getInstrumentForUser } from "@/lib/instruments";
import { supabase } from "@/integrations/supabase/client";
import { getConsolidatedResult, getResultsByEvaluator } from "@/lib/finalResultSupabase";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { EvaluacionPDF } from "@/components/pdf/EvaluacionPDF";

const VistaResultadosFinales = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { activePeriodId, activePeriod } = usePeriod();
  const [resultadoFinal, setResultadoFinal] = useState<any>(null);
  const [resultadoConsolidado, setResultadoConsolidado] = useState<any>(null);
  const [planDesarrollo, setPlanDesarrollo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoevaluacion, setAutoevaluacion] = useState<any>(null);
  const [evaluacionJefe, setEvaluacionJefe] = useState<any>(null);
  const [instrument, setInstrument] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadResultados();
  }, [user, navigate]);

  const loadResultados = async () => {
    if (!activePeriodId) {
      toast.error("No hay período activo");
      return;
    }

    try {
      // Cargar instrumento del usuario
      const userInstrument = await getInstrumentForUser(user?.nivel || "");
      setInstrument(userInstrument);

      // Cargar resultado final desde localStorage
      const resultadoKey = `final_result_${user?.dpi}_${activePeriodId}`;
      const stored = localStorage.getItem(resultadoKey);
      
      if (stored) {
        const resultadoData = JSON.parse(stored);
        setResultadoFinal(resultadoData.resultadoFinal);
      } else {
        // Intentar cargar resultado consolidado desde Supabase
        const consolidado = await getConsolidatedResult(user?.dpi || "", activePeriodId);
        
        if (consolidado && Object.keys(consolidado).length > 0) {
          // Convertir resultado consolidado al formato esperado
          setResultadoFinal({
            desempenoAuto: resultadoFinal?.desempenoAuto || 0,
            desempenoJefe: consolidado.desempenoFinalPromedio || 0,
            desempenoFinal: consolidado.desempenoFinalPromedio || 0,
            potencial: consolidado.potencialPromedio,
            posicion9Box: consolidado.posicion9BoxModa,
          });
        } else {
          // Fallback: intentar cargar desde final_evaluation_results (legacy)
          const { data, error } = await supabase
            .from("final_evaluation_results")
            .select("*")
            .eq("colaborador_id", user?.dpi)
            .eq("periodo_id", activePeriodId)
            .maybeSingle();

          if (!error && data) {
            setResultadoFinal(data.resultado_final);
          } else {
            toast.error("No se encontraron resultados finales");
            navigate("/dashboard");
            return;
          }
        }
      }

      // Cargar autoevaluación
      const { data: autoData } = await supabase
        .from("evaluations")
        .select("*")
        .eq("usuario_id", user?.dpi)
        .eq("colaborador_id", user?.dpi)
        .eq("periodo_id", activePeriodId)
        .eq("tipo", "autoevaluacion")
        .eq("estado", "enviado")
        .maybeSingle();

      if (autoData) {
        setAutoevaluacion(autoData);
      }

      // Cargar evaluación del jefe
      const { data: jefeData } = await supabase
        .from("evaluations")
        .select("*")
        .eq("colaborador_id", user?.dpi)
        .eq("periodo_id", activePeriodId)
        .eq("tipo", "evaluacion_jefe")
        .eq("estado", "enviado")
        .maybeSingle();

      if (jefeData) {
        setEvaluacionJefe(jefeData);
      }

      // Cargar plan de desarrollo
      const planKey = `development_plan_${user?.dpi}_${activePeriodId}`;
      const planStored = localStorage.getItem(planKey);
      if (planStored) {
        setPlanDesarrollo(JSON.parse(planStored));
      } else {
        const { data } = await supabase
          .from("development_plans")
          .select("*")
          .eq("colaborador_id", user?.dpi)
          .eq("periodo_id", activePeriodId)
          .single();
        
        if (data) {
          setPlanDesarrollo({
            id: data.id,
            competenciasDesarrollar: data.competencias_desarrollar,
            feedbackIndividual: data.feedback_individual,
            feedbackGrupal: data.feedback_grupal,
          });
        }
      }
    } catch (error) {
      console.error("Error loading resultados:", error);
      toast.error("Error al cargar resultados");
    } finally {
      setLoading(false);
    }
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

  if (!resultadoFinal) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Los resultados finales estarán disponibles cuando su jefe complete la evaluación y el período cierre.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-foreground mt-4">
              Mis Resultados Finales - Periodo {activePeriod?.nombre || 'N/A'}
            </h1>
            <p className="text-muted-foreground mt-2">
              Resultado de su evaluación 180° y plan de desarrollo
            </p>
          </div>
        </div>

        {/* Resumen de Resultados */}
        <div className="grid gap-6 mb-6 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Desempeño Final</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                {resultadoFinal.desempenoFinal ? scoreToPercentage(resultadoFinal.desempenoFinal) : "N/A"}%
              </p>
              <Progress value={resultadoFinal.desempenoFinal ? scoreToPercentage(resultadoFinal.desempenoFinal) : 0} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Autoevaluación</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-accent">
                {resultadoFinal.desempenoAuto ? scoreToPercentage(resultadoFinal.desempenoAuto) : "N/A"}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Evaluación Jefe</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-info">
                {resultadoFinal.desempenoJefe ? scoreToPercentage(resultadoFinal.desempenoJefe) : "N/A"}%
              </p>
            </CardContent>
          </Card>

          {resultadoFinal.potencial && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Potencial</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-success">
                  {scoreToPercentage(resultadoFinal.potencial)}%
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Posición 9-Box */}
        {resultadoFinal.posicion9Box && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Posición en Matriz 9-Box</CardTitle>
              <CardDescription>
                Clasificación basada en desempeño y potencial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-8">
                <Badge className="text-lg px-6 py-3">
                  {getNineBoxDescription(resultadoFinal.posicion9Box)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vista de Radar con Análisis de Dimensiones */}
        {instrument && autoevaluacion && evaluacionJefe && (
          <div className="mb-6">
            <PerformanceRadarAnalysis
              radarData={instrument.dimensionesDesempeno.map((dim: any) => {
                const autoItems = dim.items.map((item: any) => autoevaluacion.responses[item.id]).filter((v: any) => v !== undefined);
                const jefeItems = dim.items.map((item: any) => evaluacionJefe.responses[item.id]).filter((v: any) => v !== undefined);
                
                const autoAvg = autoItems.length > 0 ? autoItems.reduce((sum: number, val: number) => sum + val, 0) / autoItems.length : 0;
                const jefeAvg = jefeItems.length > 0 ? jefeItems.reduce((sum: number, val: number) => sum + val, 0) / jefeItems.length : 0;
                
                return {
                  dimension: dim.nombre.substring(0, 20),
                  tuResultado: scoreToPercentage(jefeAvg),
                  promedioMunicipal: scoreToPercentage(autoAvg),
                };
              })}
              dimensionAnalysis={instrument.dimensionesDesempeno.map((dim: any) => {
                const autoItems = dim.items.map((item: any) => autoevaluacion.responses[item.id]).filter((v: any) => v !== undefined);
                const jefeItems = dim.items.map((item: any) => evaluacionJefe.responses[item.id]).filter((v: any) => v !== undefined);
                
                const autoAvg = autoItems.length > 0 ? autoItems.reduce((sum: number, val: number) => sum + val, 0) / autoItems.length : 0;
                const jefeAvg = jefeItems.length > 0 ? jefeItems.reduce((sum: number, val: number) => sum + val, 0) / jefeItems.length : 0;
                
                const porcentaje = scoreToPercentage(jefeAvg);
                const diferencia = jefeAvg - autoAvg;
                const isFortaleza = porcentaje >= 80 || (diferencia > 0.3 && porcentaje >= 75);
                
                return {
                  nombre: dim.nombre,
                  descripcion: dim.descripcion,
                  porcentaje: porcentaje,
                  isFortaleza: isFortaleza,
                  promedioMunicipal: scoreToPercentage(autoAvg),
                };
              })}
              title="Panorama de Competencias"
              description="Vista integral de tu desempeño por dimensión comparado con tu autoevaluación"
            />
          </div>
        )}

        {/* Plan de Desarrollo */}
        {planDesarrollo && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Plan de Desarrollo Personalizado</CardTitle>
              <CardDescription>
                Acciones específicas para su crecimiento profesional
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {planDesarrollo.competenciasDesarrollar?.map((comp: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">{comp.competencia}</h3>
                    <div className="grid gap-2 md:grid-cols-3 mb-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Nivel Actual</p>
                        <Badge variant="outline">{comp.nivelActual}/5</Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Nivel Objetivo</p>
                        <Badge>{comp.nivelObjetivo}/5</Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Plazo</p>
                        <p className="text-sm">{comp.plazo}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Acciones:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {comp.acciones.map((accion: string, accIdx: number) => (
                          <li key={accIdx}>{accion}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
              
              {planDesarrollo.feedbackIndividual && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold mb-2">Feedback Individual</h3>
                  <p className="text-sm whitespace-pre-wrap">{planDesarrollo.feedbackIndividual}</p>
                </div>
              )}

              <div className="mt-4">
                <Button 
                  variant="outline"
                  onClick={() => navigate(`/plan-desarrollo/${user?.dpi}`)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Ver Plan Completo e Imprimible
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Acciones */}
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Volver al Dashboard
          </Button>
          {planDesarrollo && (
            <Button onClick={() => navigate(`/plan-desarrollo/${user?.dpi}`)}>
              Ver Plan de Desarrollo Completo
            </Button>
          )}
          {resultadoFinal && instrument && autoevaluacion && evaluacionJefe && (
            <Button variant="outline" asChild>
              <PDFDownloadLink
                document={
                  <EvaluacionPDF
                    empleado={{
                      nombre: user?.nombre || "",
                      apellidos: user?.apellidos || "",
                      dpi: user?.dpi || "",
                      cargo: user?.cargo || "",
                      area: user?.area || "",
                      nivel: user?.nivel || "",
                      direccionUnidad: user?.direccionUnidad || "",
                      departamentoDependencia: user?.departamentoDependencia || "",
                      profesion: user?.profesion || "",
                      correo: user?.correo || "",
                      telefono: user?.telefono || "",
                      jefeNombre: user?.jefeInmediato || "N/A",
                      directoraRRHHNombre: "Brenda Carolina Lopez Perez",
                    }}
                    periodo={activePeriod?.nombre || "N/A"}
                    fechaGeneracion={new Date()}
                    resultadoData={{
                      performancePercentage: resultadoFinal.desempenoFinal ? scoreToPercentage(resultadoFinal.desempenoFinal) : 0,
                      jefeCompleto: !!evaluacionJefe,
                      fortalezas: instrument.dimensionesDesempeno
                        .map((dim: any) => {
                          const autoItems = dim.items.map((item: any) => autoevaluacion.responses[item.id]).filter((v: any) => v !== undefined);
                          const jefeItems = dim.items.map((item: any) => evaluacionJefe.responses[item.id]).filter((v: any) => v !== undefined);
                          
                          const autoAvg = autoItems.length > 0 ? autoItems.reduce((sum: number, val: number) => sum + val, 0) / autoItems.length : 0;
                          const jefeAvg = jefeItems.length > 0 ? jefeItems.reduce((sum: number, val: number) => sum + val, 0) / jefeItems.length : 0;
                          
                          return {
                            dimension: dim.nombre,
                            nombreCompleto: dim.nombre,
                            tuEvaluacion: jefeAvg,
                            promedioMunicipal: autoAvg,
                          };
                        })
                        .sort((a: any, b: any) => b.tuEvaluacion - a.tuEvaluacion)
                        .slice(0, 3),
                      areasOportunidad: instrument.dimensionesDesempeno
                        .map((dim: any) => {
                          const autoItems = dim.items.map((item: any) => autoevaluacion.responses[item.id]).filter((v: any) => v !== undefined);
                          const jefeItems = dim.items.map((item: any) => evaluacionJefe.responses[item.id]).filter((v: any) => v !== undefined);
                          
                          const autoAvg = autoItems.length > 0 ? autoItems.reduce((sum: number, val: number) => sum + val, 0) / autoItems.length : 0;
                          const jefeAvg = jefeItems.length > 0 ? jefeItems.reduce((sum: number, val: number) => sum + val, 0) / jefeItems.length : 0;
                          
                          return {
                            dimension: dim.nombre,
                            nombreCompleto: dim.nombre,
                            tuEvaluacion: jefeAvg,
                            promedioMunicipal: autoAvg,
                          };
                        })
                        .sort((a: any, b: any) => a.tuEvaluacion - b.tuEvaluacion)
                        .slice(0, 3),
                      radarData: instrument.dimensionesDesempeno.map((dim: any) => {
                        const autoItems = dim.items.map((item: any) => autoevaluacion.responses[item.id]).filter((v: any) => v !== undefined);
                        const jefeItems = dim.items.map((item: any) => evaluacionJefe.responses[item.id]).filter((v: any) => v !== undefined);
                        
                        const autoAvg = autoItems.length > 0 ? autoItems.reduce((sum: number, val: number) => sum + val, 0) / autoItems.length : 0;
                        const jefeAvg = jefeItems.length > 0 ? jefeItems.reduce((sum: number, val: number) => sum + val, 0) / jefeItems.length : 0;
                        
                        return {
                          dimension: dim.nombre.substring(0, 20),
                          tuEvaluacion: jefeAvg,
                          promedioMunicipal: autoAvg,
                        };
                      }),
                      resultadoConsolidado: resultadoConsolidado,
                    }}
                    planDesarrollo={planDesarrollo ? {
                      planEstructurado: planDesarrollo.planEstructurado || (typeof planDesarrollo.competenciasDesarrollar === 'object' && planDesarrollo.competenciasDesarrollar?.acciones ? planDesarrollo.competenciasDesarrollar : null),
                      recomendaciones: planDesarrollo.recomendaciones || [],
                    } : null}
                  />
                }
                fileName={`evaluacion_${(user?.nombre || 'evaluacion').replace(/\s+/g, '_')}_${(activePeriod?.nombre || 'periodo').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`}
                style={{ textDecoration: 'none' }}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </PDFDownloadLink>
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default VistaResultadosFinales;

