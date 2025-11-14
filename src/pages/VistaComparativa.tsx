import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, Minus, Users2, User, Target, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell } from "recharts";
import { getSubmittedEvaluation, getJefeEvaluationDraft, getMockColaboradorEvaluation } from "@/lib/storage";
import { Instrument } from "@/types/evaluation";
import { getInstrumentForUser } from "@/lib/instruments";
import { getNineBoxDescription, calculateCompleteFinalScore } from "@/lib/finalScore";
import { scoreToPercentage } from "@/lib/calculations";
import { perteneceACuadrilla, getGruposDelColaborador, getEquipoStats } from "@/lib/jerarquias";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { getFinalResultFromSupabase } from "@/lib/finalResultSupabase";
import { GenerarPlanDesarrollo } from "@/components/development/GenerarPlanDesarrollo";
import { GenerarGuiaRetroalimentacion } from "@/components/development/GuiaRetroalimentacion";
import { GenerarFeedbackGrupal } from "@/components/development/GenerarFeedbackGrupal";
import { EditarPlanDesarrollo } from "@/components/development/EditarPlanDesarrollo";
import { PerformanceRadarAnalysis } from "@/components/evaluation/PerformanceRadarAnalysis";
import { Edit } from "lucide-react";

const MOCK_COLABORADORES: Record<string, any> = {
  "1": {
    id: "1",
    dpi: "4567890123104",
    nombre: "Roberto Hernández Silva",
    cargo: "Coordinador",
    nivel: "S2",
    area: "Tecnología",
  },
};

const VistaComparativa = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [instrument, setInstrument] = useState<Instrument | null>(null);

  const [colaborador, setColaborador] = useState<any>(null);
  const [autoevaluacion, setAutoevaluacion] = useState<any>(null);
  const [evaluacionJefe, setEvaluacionJefe] = useState<any>(null);
  const [resultadoFinal, setResultadoFinal] = useState<any>(null);
  const [comparativo, setComparativo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vistaModo, setVistaModo] = useState<"individual" | "grupal">("individual");
  const [perteneceCuadrilla, setPerteneceCuadrilla] = useState(false);
  const [gruposColaborador, setGruposColaborador] = useState<any[]>([]);
  const [planDesarrollo, setPlanDesarrollo] = useState<any>(null);
  const [guiaFeedback, setGuiaFeedback] = useState<any>(null);
  const [mostrarGuiaFeedback, setMostrarGuiaFeedback] = useState(false);
  const [promedioGrupo, setPromedioGrupo] = useState<number | null>(null);
  const [periodoId, setPeriodoId] = useState<string>("");
  const [mostrarEditarPlan, setMostrarEditarPlan] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("resumen");

  useEffect(() => {
    if (!id || !user) {
      navigate("/evaluacion-equipo");
      return;
    }

    const loadData = async () => {
      try {
        // Obtener período activo
        const activePeriod = await getActivePeriod();
        let currentPeriodoId = "2025-1";
        if (activePeriod) {
          currentPeriodoId = activePeriod.id;
        } else {
          const { data: periodData } = await supabase
            .from("evaluation_periods")
            .select("id")
            .eq("nombre", "2025-1")
            .single();
          if (periodData) {
            currentPeriodoId = periodData.id;
          }
        }
        setPeriodoId(currentPeriodoId);

        // Cargar colaborador desde Supabase
        const { data: colaboradorData, error: colaboradorError } = await supabase
          .from("users")
          .select("*")
          .eq("dpi", id)
          .single();

        let colaboradorFormatted: any;
        
        if (colaboradorError || !colaboradorData) {
          // Fallback a datos mock
          const mockColaborador = MOCK_COLABORADORES[id];
          if (!mockColaborador) {
            toast.error("Colaborador no encontrado");
            navigate("/evaluacion-equipo");
            return;
          }
          colaboradorFormatted = mockColaborador;
        } else {
          colaboradorFormatted = {
            id: colaboradorData.dpi,
            dpi: colaboradorData.dpi,
            nombre: `${colaboradorData.nombre} ${colaboradorData.apellidos}`,
            cargo: colaboradorData.cargo,
            nivel: colaboradorData.nivel,
            area: colaboradorData.area,
          };
        }

        setColaborador(colaboradorFormatted);

        // Cargar instrumento según el nivel del colaborador
        const userInstrument = await getInstrumentForUser(colaboradorFormatted.nivel);
        if (!userInstrument) {
          toast.error("No se encontró un instrumento de evaluación para el nivel del colaborador");
          navigate("/evaluacion-equipo");
          return;
        }
        setInstrument(userInstrument);

        // Verificar si pertenece a una cuadrilla
        const enCuadrilla = await perteneceACuadrilla(colaboradorFormatted.dpi);
        setPerteneceCuadrilla(enCuadrilla);

        if (enCuadrilla) {
          const grupos = await getGruposDelColaborador(colaboradorFormatted.dpi);
          setGruposColaborador(grupos);
          
          // Obtener promedio del grupo si hay grupos
          if (grupos.length > 0 && user) {
            // Obtener estadísticas del equipo del jefe que incluye este colaborador
            const { data: assignment } = await supabase
              .from("user_assignments")
              .select("jefe_id")
              .eq("colaborador_id", colaboradorFormatted.dpi)
              .eq("activo", true)
              .single();
            
            if (assignment) {
              const stats = await getEquipoStats(assignment.jefe_id, currentPeriodoId);
              setPromedioGrupo(stats?.promedioDesempeno || null);
            }
          }
        }

        // Cargar plan de desarrollo completo
        console.log('🔍 Buscando plan de desarrollo para:', {
          colaborador_id: colaboradorFormatted.dpi,
          periodo_id: currentPeriodoId
        });
        
        // Primero intentar buscar con el periodo_id exacto
        // Obtener todos los planes y tomar el más reciente (puede haber múltiples)
        let { data: plansArray, error: planError } = await supabase
          .from("development_plans")
          .select("*")
          .eq("colaborador_id", colaboradorFormatted.dpi)
          .eq("periodo_id", currentPeriodoId)
          .order("created_at", { ascending: false });

        let planData = null;
        
        if (planError) {
          console.error('❌ Error al cargar plan de desarrollo:', planError);
        } else if (plansArray && plansArray.length > 0) {
          // Tomar el más reciente (ya está ordenado por created_at DESC)
          planData = plansArray[0];
          console.log(`✅ Se encontraron ${plansArray.length} planes, usando el más reciente:`, planData.id);
        } else {
          console.log('⚠️ No se encontró plan con periodo_id exacto, buscando planes recientes del colaborador...');
          // Si no se encuentra, intentar buscar cualquier plan del colaborador (por si el periodo_id cambió)
          const { data: plansDataAll } = await supabase
            .from("development_plans")
            .select("*")
            .eq("colaborador_id", colaboradorFormatted.dpi)
            .order("created_at", { ascending: false })
            .limit(1);
          
          if (plansDataAll && plansDataAll.length > 0) {
            planData = plansDataAll[0];
            console.log('✅ Se encontró un plan reciente del colaborador (puede ser de otro período):', planData.id);
          }
        }

        if (planData) {
          console.log('✅ Plan de desarrollo encontrado:', planData);
          // El plan se guarda en competencias_desarrollar como JSONB con estructura:
          // { objetivos: [], acciones: [], dimensionesDebiles: [], recomendaciones: [] }
          const competencias = planData.competencias_desarrollar || {};
          
          console.log('🔍 Plan raw desde BD:', { 
            id: planData.id, 
            competencias_desarrollar: competencias,
            tipo: typeof competencias 
          });
          
          // Extraer estructura del plan desde competencias_desarrollar
          let planEstructurado = null;
          let recomendaciones = [];
          
          if (typeof competencias === 'object' && competencias !== null) {
            // Verificar si tiene la estructura completa
            if (competencias.acciones && Array.isArray(competencias.acciones)) {
              planEstructurado = {
                objetivos: Array.isArray(competencias.objetivos) ? competencias.objetivos : [],
                acciones: competencias.acciones,
                dimensionesDebiles: Array.isArray(competencias.dimensionesDebiles) ? competencias.dimensionesDebiles : [],
              };
              recomendaciones = Array.isArray(competencias.recomendaciones) ? competencias.recomendaciones : [];
            }
            // Si tiene objetivos pero no acciones, crear estructura básica
            else if (Array.isArray(competencias.objetivos) && competencias.objetivos.length > 0) {
              planEstructurado = {
                objetivos: competencias.objetivos,
                acciones: [],
                dimensionesDebiles: Array.isArray(competencias.dimensionesDebiles) ? competencias.dimensionesDebiles : [],
              };
              recomendaciones = Array.isArray(competencias.recomendaciones) ? competencias.recomendaciones : [];
            }
          }

          const planCargado = {
            id: planData.id,
            feedbackIndividual: planData.feedback_individual || "",
            feedbackGrupal: planData.feedback_grupal || null,
            planEstructurado: planEstructurado,
            recomendaciones: recomendaciones,
          };
          
          console.log('📋 Plan procesado en VistaComparativa:', planCargado);
          setPlanDesarrollo(planCargado);
        } else {
          console.log('⚠️ No se encontró plan de desarrollo para este colaborador');
          setPlanDesarrollo(null);
        }

        // Cargar guía de feedback individual si existe
        try {
          const { data: guiaData, error: guiaError } = await supabase
            .from("feedback_guides")
            .select("*")
            .eq("colaborador_id", colaboradorFormatted.dpi)
            .eq("periodo_id", currentPeriodoId)
            .eq("tipo", "individual")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (guiaError) {
            console.error('Error al cargar guía de feedback:', guiaError);
          } else if (guiaData) {
            console.log('✅ Guía de feedback encontrada:', guiaData.id);
            setGuiaFeedback({
              id: guiaData.id,
              preparacion: guiaData.preparacion || "",
              apertura: guiaData.apertura || "",
              fortalezas: guiaData.fortalezas || [],
              areasDesarrollo: guiaData.areas_desarrollo || [],
              preguntasDialogo: guiaData.preguntas_dialogo || [],
              tipsConduccion: guiaData.tips_conduccion || [],
              cierre: guiaData.cierre || "",
              fechaGeneracion: guiaData.fecha_generacion,
            });
          } else {
            console.log('⚠️ No se encontró guía de feedback para este colaborador');
            setGuiaFeedback(null);
          }
        } catch (error) {
          console.error('Error cargando guía de feedback:', error);
          setGuiaFeedback(null);
        }

        // Cargar ambas evaluaciones
        const auto = await getSubmittedEvaluation(colaboradorFormatted.dpi, currentPeriodoId) ||
                    getMockColaboradorEvaluation(colaboradorFormatted.dpi);
        const jefe = await getJefeEvaluationDraft(user.dpi, colaboradorFormatted.dpi, currentPeriodoId);

        if (!auto || !jefe || jefe.estado !== "enviado") {
          toast.error("Ambas evaluaciones deben estar completas para ver la comparación");
          navigate("/evaluacion-equipo");
          return;
        }

        setAutoevaluacion(auto);
        setEvaluacionJefe(jefe);

        // Intentar cargar resultado final desde Supabase primero (calculado por trigger)
        let resultado = await getFinalResultFromSupabase(colaboradorFormatted.dpi, currentPeriodoId);
        
        // Si no existe en Supabase, calcularlo localmente
        if (!resultado) {
          console.log('📊 Resultado final no encontrado en Supabase, calculando localmente...');
          // IMPORTANTE: calculateCompleteFinalScore es async, necesitamos await
          resultado = await calculateCompleteFinalScore(
            auto,
            jefe,
            userInstrument.dimensionesDesempeno,
            userInstrument.dimensionesPotencial
          );
        } else {
          console.log('✅ Resultado final cargado desde Supabase:', resultado);
        }
        
        setResultadoFinal(resultado);

        // Calcular comparativo por dimensión
        const comparativoData = userInstrument.dimensionesDesempeno.map((dim) => {
          const autoItems = dim.items.map(item => auto.responses[item.id]).filter(v => v !== undefined);
          const jefeItems = dim.items.map(item => jefe.responses[item.id]).filter(v => v !== undefined);
          
          const autoAvg = autoItems.length > 0 
            ? autoItems.reduce((sum, val) => sum + val, 0) / autoItems.length 
            : 0;
          const jefeAvg = jefeItems.length > 0 
            ? jefeItems.reduce((sum, val) => sum + val, 0) / jefeItems.length 
            : 0;
          const diferencia = jefeAvg - autoAvg;
          
          return {
            dimensionId: dim.id,
            nombre: dim.nombre,
            autoevaluacion: autoAvg,
            evaluacionJefe: jefeAvg,
            diferencia,
          };
        });
        setComparativo(comparativoData);

        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Error al cargar datos");
        setLoading(false);
      }
    };

    loadData();
  }, [id, user, navigate]);

  if (loading || !colaborador || !resultadoFinal || !instrument) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <p>Cargando...</p>
        </main>
      </div>
    );
  }

  // Preparar datos para gráficos - convertir a porcentajes
  const radarData = instrument.dimensionesDesempeno.map((dim) => {
    const autoItems = dim.items.map(item => autoevaluacion.responses[item.id]).filter(v => v !== undefined);
    const jefeItems = dim.items.map(item => evaluacionJefe.responses[item.id]).filter(v => v !== undefined);
    
    const autoAvg = autoItems.length > 0 ? autoItems.reduce((sum, val) => sum + val, 0) / autoItems.length : 0;
    const jefeAvg = jefeItems.length > 0 ? jefeItems.reduce((sum, val) => sum + val, 0) / jefeItems.length : 0;
    
    return {
      dimension: dim.nombre.substring(0, 20),
      autoevaluacion: scoreToPercentage(autoAvg),
      evaluacionJefe: scoreToPercentage(jefeAvg),
    };
  });

  const barData = comparativo.map((item) => ({
    dimension: item.nombre.substring(0, 15),
    autoevaluacion: scoreToPercentage(item.autoevaluacion),
    evaluacionJefe: scoreToPercentage(item.evaluacionJefe),
    diferencia: scoreToPercentage(item.evaluacionJefe) - scoreToPercentage(item.autoevaluacion),
  }));

  const COLORS = {
    auto: "#8884d8",
    jefe: "#82ca9d",
    positivo: "#10b981",
    negativo: "#ef4444",
    neutro: "#6b7280",
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => navigate("/evaluacion-equipo")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Equipo
            </Button>
            <h1 className="text-3xl font-bold text-foreground mt-4">
              Vista Comparativa - {colaborador.nombre}
            </h1>
            <p className="text-muted-foreground mt-2">
              Comparación entre autoevaluación y evaluación del jefe
            </p>
          </div>
        </div>

        {/* Tabs principales para organizar el contenido */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="resumen" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="analisis" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Análisis
            </TabsTrigger>
            <TabsTrigger value="plan" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Plan de Desarrollo
            </TabsTrigger>
            <TabsTrigger value="retroalimentacion" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Retroalimentación
            </TabsTrigger>
          </TabsList>

          {/* Tab: Resumen */}
          <TabsContent value="resumen" className="space-y-6 mt-6">
            {/* Resultado Final */}
            <Card>
              <CardHeader>
                <CardTitle>Resultado Final</CardTitle>
                <CardDescription>
                  Resultado ponderado: 70% evaluación jefe + 30% autoevaluación
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center p-4 rounded-lg border bg-primary/5">
                    <p className="text-sm text-muted-foreground mb-1">Autoevaluación</p>
                    <p className="text-3xl font-bold text-primary">
                      {scoreToPercentage(resultadoFinal.desempenoAuto)}%
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg border bg-accent/5">
                    <p className="text-sm text-muted-foreground mb-1">Evaluación Jefe</p>
                    <p className="text-3xl font-bold text-accent">
                      {scoreToPercentage(resultadoFinal.desempenoJefe)}%
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg border bg-primary/10">
                    <p className="text-sm text-muted-foreground mb-1">Desempeño Final</p>
                    <p className="text-3xl font-bold text-primary">
                      {scoreToPercentage(resultadoFinal.desempenoFinal)}%
                    </p>
                  </div>
                  {resultadoFinal.potencial && (
                    <div className="text-center p-4 rounded-lg border bg-success/5">
                      <p className="text-sm text-muted-foreground mb-1">Potencial</p>
                      <p className="text-3xl font-bold text-success">
                        {scoreToPercentage(resultadoFinal.potencial)}%
                      </p>
                    </div>
                  )}
                </div>
                
                {resultadoFinal.posicion9Box && (
                  <div className="mt-6 p-4 rounded-lg bg-muted/30 border">
                    <p className="text-sm font-medium mb-2">Posición en Matriz 9-Box</p>
                    <Badge className="text-lg px-4 py-2">
                      {getNineBoxDescription(resultadoFinal.posicion9Box)}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Acciones Rápidas */}
            {colaborador && periodoId && (
              <Card>
                <CardHeader>
                  <CardTitle>Acciones Rápidas</CardTitle>
                  <CardDescription>
                    Genera planes y guías de retroalimentación con IA
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {!planDesarrollo ? (
                      <GenerarPlanDesarrollo
                        colaboradorId={colaborador.dpi}
                        periodoId={periodoId}
                        colaboradorNombre={colaborador.nombre}
                        planExistente={null}
                        onPlanGenerado={async (plan) => {
                          try {
                            const { data: planData, error: planError } = await supabase
                              .from("development_plans")
                              .select("*")
                              .eq("id", plan.id)
                              .single();
                            
                            if (!planError && planData) {
                              const competencias = planData.competencias_desarrollar || {};
                              
                              let planEstructurado = null;
                              let recomendaciones = [];
                              
                              if (typeof competencias === 'object' && competencias !== null) {
                                if (competencias.acciones && Array.isArray(competencias.acciones)) {
                                  planEstructurado = {
                                    objetivos: Array.isArray(competencias.objetivos) ? competencias.objetivos : [],
                                    acciones: competencias.acciones,
                                    dimensionesDebiles: Array.isArray(competencias.dimensionesDebiles) ? competencias.dimensionesDebiles : [],
                                  };
                                  recomendaciones = Array.isArray(competencias.recomendaciones) ? competencias.recomendaciones : [];
                                } else if (Array.isArray(competencias.objetivos) && competencias.objetivos.length > 0) {
                                  planEstructurado = {
                                    objetivos: competencias.objetivos,
                                    acciones: [],
                                    dimensionesDebiles: Array.isArray(competencias.dimensionesDebiles) ? competencias.dimensionesDebiles : [],
                                  };
                                  recomendaciones = Array.isArray(competencias.recomendaciones) ? competencias.recomendaciones : [];
                                }
                              }

                              setPlanDesarrollo({
                                id: planData.id,
                                feedbackIndividual: planData.feedback_individual || "",
                                feedbackGrupal: planData.feedback_grupal || null,
                                planEstructurado: planEstructurado,
                                recomendaciones: recomendaciones,
                              });
                              setActiveTab("plan"); // Cambiar a la tab del plan
                              toast.success("Plan de desarrollo generado. Revisa la pestaña 'Plan de Desarrollo'");
                            }
                          } catch (error) {
                            console.error("Error recargando plan:", error);
                          }
                        }}
                      />
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => {
                            setMostrarEditarPlan(true);
                            setActiveTab("plan");
                          }}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Editar Plan
                        </Button>
                        <GenerarPlanDesarrollo
                          colaboradorId={colaborador.dpi}
                          periodoId={periodoId}
                          colaboradorNombre={colaborador.nombre}
                          planExistente={planDesarrollo}
                          onPlanGenerado={async (planNuevo) => {
                            if (planDesarrollo?.id && planDesarrollo.id !== planNuevo.id) {
                              try {
                                await supabase
                                  .from("development_plans")
                                  .delete()
                                  .eq("id", planDesarrollo.id);
                              } catch (error) {
                                console.error("Error al eliminar plan anterior:", error);
                              }
                            }
                            try {
                              const { data: planData, error: planError } = await supabase
                                .from("development_plans")
                                .select("*")
                                .eq("id", planNuevo.id)
                                .single();
                              
                              if (!planError && planData) {
                                const competencias = planData.competencias_desarrollar || {};
                                
                                let planEstructurado = null;
                                let recomendaciones = [];
                                
                                if (typeof competencias === 'object' && competencias !== null) {
                                  if (competencias.acciones && Array.isArray(competencias.acciones)) {
                                    planEstructurado = {
                                      objetivos: Array.isArray(competencias.objetivos) ? competencias.objetivos : [],
                                      acciones: competencias.acciones,
                                      dimensionesDebiles: Array.isArray(competencias.dimensionesDebiles) ? competencias.dimensionesDebiles : [],
                                    };
                                    recomendaciones = Array.isArray(competencias.recomendaciones) ? competencias.recomendaciones : [];
                                  }
                                }

                                setPlanDesarrollo({
                                  id: planData.id,
                                  feedbackIndividual: planData.feedback_individual || "",
                                  feedbackGrupal: planData.feedback_grupal || null,
                                  planEstructurado: planEstructurado,
                                  recomendaciones: recomendaciones,
                                });
                                setActiveTab("plan");
                                toast.success("Plan regenerado. Revisa la pestaña 'Plan de Desarrollo'");
                              }
                            } catch (error) {
                              console.error("Error recargando plan:", error);
                            }
                          }}
                        />
                      </>
                    )}
                    <GenerarGuiaRetroalimentacion
                      colaboradorId={colaborador.dpi}
                      periodoId={periodoId}
                      colaboradorNombre={colaborador.nombre}
                      onGuiaGenerada={async () => {
                        try {
                          const { data: guiaData, error: guiaError } = await supabase
                            .from("feedback_guides")
                            .select("*")
                            .eq("colaborador_id", colaborador.dpi)
                            .eq("periodo_id", periodoId)
                            .eq("tipo", "individual")
                            .order("created_at", { ascending: false })
                            .limit(1)
                            .maybeSingle();

                          if (!guiaError && guiaData) {
                            setGuiaFeedback({
                              id: guiaData.id,
                              preparacion: guiaData.preparacion || "",
                              apertura: guiaData.apertura || "",
                              fortalezas: guiaData.fortalezas || [],
                              areasDesarrollo: guiaData.areas_desarrollo || [],
                              preguntasDialogo: guiaData.preguntas_dialogo || [],
                              tipsConduccion: guiaData.tips_conduccion || [],
                              cierre: guiaData.cierre || "",
                              fechaGeneracion: guiaData.fecha_generacion,
                            });
                            setActiveTab("retroalimentacion");
                            toast.success("Guía generada. Revisa la pestaña 'Retroalimentación'");
                          }
                        } catch (error) {
                          console.error("Error recargando guía:", error);
                        }
                      }}
                    />
                    {perteneceCuadrilla && (
                      <GenerarFeedbackGrupal
                        colaboradorId={colaborador.dpi}
                        periodoId={periodoId}
                        colaboradorNombre={colaborador.nombre}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Toggle Individual/Grupal */}
            {perteneceCuadrilla && gruposColaborador.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users2 className="h-5 w-5 text-info" />
                      <div>
                        <p className="font-medium">Vista de Comparación</p>
                        <p className="text-sm text-muted-foreground">
                          Este colaborador pertenece a {gruposColaborador.length} cuadrilla{gruposColaborador.length > 1 ? 's' : ''}: {gruposColaborador.map(g => g.nombre).join(', ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 border rounded-lg p-1">
                      <Button
                        variant={vistaModo === "individual" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setVistaModo("individual")}
                      >
                        <User className="mr-2 h-4 w-4" />
                        Individual
                      </Button>
                      <Button
                        variant={vistaModo === "grupal" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setVistaModo("grupal")}
                      >
                        <Users2 className="mr-2 h-4 w-4" />
                        Grupal
                      </Button>
                    </div>
                  </div>
                  {promedioGrupo !== null && (
                    <div className="mt-4 p-3 bg-info/10 border border-info/20 rounded-lg">
                      <p className="text-sm">
                        <strong>Promedio del Equipo:</strong> {Math.round(promedioGrupo)}% 
                        <span className="text-muted-foreground ml-2">
                          (Comparar con el desempeño individual del colaborador: {scoreToPercentage(resultadoFinal.desempenoFinal)}%)
                        </span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Análisis */}
          <TabsContent value="analisis" className="space-y-6 mt-6">
              {!planDesarrollo ? (
                <>
                  <GenerarPlanDesarrollo
                    colaboradorId={colaborador.dpi}
                    periodoId={periodoId}
                    colaboradorNombre={colaborador.nombre}
                    planExistente={null}
                    onPlanGenerado={async (plan) => {
                      // Recargar el plan desde la BD para asegurar que tenemos la estructura correcta
                      try {
                        const { data: planData, error: planError } = await supabase
                          .from("development_plans")
                          .select("*")
                          .eq("id", plan.id)
                          .single();
                        
                        if (!planError && planData) {
                          const competencias = planData.competencias_desarrollar || {};
                          
                          let planEstructurado = null;
                          let recomendaciones = [];
                          
                          if (typeof competencias === 'object' && competencias !== null) {
                            if (competencias.acciones && Array.isArray(competencias.acciones)) {
                              planEstructurado = {
                                objetivos: Array.isArray(competencias.objetivos) ? competencias.objetivos : [],
                                acciones: competencias.acciones,
                                dimensionesDebiles: Array.isArray(competencias.dimensionesDebiles) ? competencias.dimensionesDebiles : [],
                              };
                              recomendaciones = Array.isArray(competencias.recomendaciones) ? competencias.recomendaciones : [];
                            } else if (Array.isArray(competencias.objetivos) && competencias.objetivos.length > 0) {
                              planEstructurado = {
                                objetivos: competencias.objetivos,
                                acciones: [],
                                dimensionesDebiles: Array.isArray(competencias.dimensionesDebiles) ? competencias.dimensionesDebiles : [],
                              };
                              recomendaciones = Array.isArray(competencias.recomendaciones) ? competencias.recomendaciones : [];
                            }
                          }

                          setPlanDesarrollo({
                            id: planData.id,
                            feedbackIndividual: planData.feedback_individual || "",
                            feedbackGrupal: planData.feedback_grupal || null,
                            planEstructurado: planEstructurado,
                            recomendaciones: recomendaciones,
                          });
                          toast.success("Plan de desarrollo guardado");
                        } else {
                          // Fallback al plan recibido
                          setPlanDesarrollo({
                            id: plan.id,
                            feedbackIndividual: plan.feedbackIndividual,
                            feedbackGrupal: plan.feedbackGrupal,
                            planEstructurado: plan.planEstructurado,
                            recomendaciones: plan.recomendaciones,
                          });
                          toast.success("Plan de desarrollo guardado");
                        }
                      } catch (error) {
                        console.error("Error recargando plan:", error);
                        // Fallback al plan recibido
                        setPlanDesarrollo({
                          id: plan.id,
                          feedbackIndividual: plan.feedbackIndividual,
                          feedbackGrupal: plan.feedbackGrupal,
                          planEstructurado: plan.planEstructurado,
                          recomendaciones: plan.recomendaciones,
                        });
                        toast.success("Plan de desarrollo guardado");
                      }
                    }}
                  />
                  <GenerarGuiaRetroalimentacion
                    colaboradorId={colaborador.dpi}
                    periodoId={periodoId}
                    colaboradorNombre={colaborador.nombre}
                    onGuiaGenerada={async () => {
                      // Recargar la guía desde la BD
                      try {
                        const { data: guiaData, error: guiaError } = await supabase
                          .from("feedback_guides")
                          .select("*")
                          .eq("colaborador_id", colaborador.dpi)
                          .eq("periodo_id", periodoId)
                          .eq("tipo", "individual")
                          .order("created_at", { ascending: false })
                          .limit(1)
                          .maybeSingle();

                        if (!guiaError && guiaData) {
                          setGuiaFeedback({
                            id: guiaData.id,
                            preparacion: guiaData.preparacion || "",
                            apertura: guiaData.apertura || "",
                            fortalezas: guiaData.fortalezas || [],
                            areasDesarrollo: guiaData.areas_desarrollo || [],
                            preguntasDialogo: guiaData.preguntas_dialogo || [],
                            tipsConduccion: guiaData.tips_conduccion || [],
                            cierre: guiaData.cierre || "",
                            fechaGeneracion: guiaData.fecha_generacion,
                          });
                          setMostrarGuiaFeedback(true); // Mostrar automáticamente la guía
                        }
                      } catch (error) {
                        console.error("Error recargando guía:", error);
                      }
                    }}
                  />
                  <GenerarFeedbackGrupal
                    colaboradorId={colaborador.dpi}
                    periodoId={periodoId}
                    colaboradorNombre={colaborador.nombre}
                  />
                </>
              ) : (
                <>
                  <Button
                    variant="default"
                    size="lg"
                    onClick={() => setMostrarEditarPlan(true)}
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Editar Plan de Desarrollo
                  </Button>
                  <GenerarPlanDesarrollo
                    colaboradorId={colaborador.dpi}
                    periodoId={periodoId}
                    colaboradorNombre={colaborador.nombre}
                    planExistente={planDesarrollo}
                    onPlanGenerado={async (planNuevo) => {
                      // Eliminar el plan anterior si existe
                      if (planDesarrollo?.id && planDesarrollo.id !== planNuevo.id) {
                        try {
                          await supabase
                            .from("development_plans")
                            .delete()
                            .eq("id", planDesarrollo.id);
                        } catch (error) {
                          console.error("Error al eliminar plan anterior:", error);
                        }
                      }
                      // Recargar el plan desde la BD para asegurar que tenemos la estructura correcta
                      try {
                        const { data: planData, error: planError } = await supabase
                          .from("development_plans")
                          .select("*")
                          .eq("id", planNuevo.id)
                          .single();
                        
                        if (!planError && planData) {
                          const competencias = planData.competencias_desarrollar || {};
                          
                          let planEstructurado = null;
                          let recomendaciones = [];
                          
                          if (typeof competencias === 'object' && competencias !== null) {
                            if (competencias.acciones && Array.isArray(competencias.acciones)) {
                              planEstructurado = {
                                objetivos: Array.isArray(competencias.objetivos) ? competencias.objetivos : [],
                                acciones: competencias.acciones,
                                dimensionesDebiles: Array.isArray(competencias.dimensionesDebiles) ? competencias.dimensionesDebiles : [],
                              };
                              recomendaciones = Array.isArray(competencias.recomendaciones) ? competencias.recomendaciones : [];
                            } else if (Array.isArray(competencias.objetivos) && competencias.objetivos.length > 0) {
                              planEstructurado = {
                                objetivos: competencias.objetivos,
                                acciones: [],
                                dimensionesDebiles: Array.isArray(competencias.dimensionesDebiles) ? competencias.dimensionesDebiles : [],
                              };
                              recomendaciones = Array.isArray(competencias.recomendaciones) ? competencias.recomendaciones : [];
                            }
                          }

                          setPlanDesarrollo({
                            id: planData.id,
                            feedbackIndividual: planData.feedback_individual || "",
                            feedbackGrupal: planData.feedback_grupal || null,
                            planEstructurado: planEstructurado,
                            recomendaciones: recomendaciones,
                          });
                          toast.success("Plan de desarrollo regenerado exitosamente");
                        } else {
                          // Fallback al plan recibido
                          setPlanDesarrollo({
                            id: planNuevo.id,
                            feedbackIndividual: planNuevo.feedbackIndividual,
                            feedbackGrupal: planNuevo.feedbackGrupal,
                            planEstructurado: planNuevo.planEstructurado,
                            recomendaciones: planNuevo.recomendaciones,
                          });
                          toast.success("Plan de desarrollo regenerado exitosamente");
                        }
                      } catch (error) {
                        console.error("Error recargando plan:", error);
                        // Fallback al plan recibido
                        setPlanDesarrollo({
                          id: planNuevo.id,
                          feedbackIndividual: planNuevo.feedbackIndividual,
                          feedbackGrupal: planNuevo.feedbackGrupal,
                          planEstructurado: planNuevo.planEstructurado,
                          recomendaciones: planNuevo.recomendaciones,
                        });
                        toast.success("Plan de desarrollo regenerado exitosamente");
                      }
                    }}
                  />
                  <GenerarGuiaRetroalimentacion
                    colaboradorId={colaborador.dpi}
                    periodoId={periodoId}
                    colaboradorNombre={colaborador.nombre}
                    onGuiaGenerada={async () => {
                      // Recargar la guía desde la BD
                      try {
                        const { data: guiaData, error: guiaError } = await supabase
                          .from("feedback_guides")
                          .select("*")
                          .eq("colaborador_id", colaborador.dpi)
                          .eq("periodo_id", periodoId)
                          .eq("tipo", "individual")
                          .order("created_at", { ascending: false })
                          .limit(1)
                          .maybeSingle();

                        if (!guiaError && guiaData) {
                          setGuiaFeedback({
                            id: guiaData.id,
                            preparacion: guiaData.preparacion || "",
                            apertura: guiaData.apertura || "",
                            fortalezas: guiaData.fortalezas || [],
                            areasDesarrollo: guiaData.areas_desarrollo || [],
                            preguntasDialogo: guiaData.preguntas_dialogo || [],
                            tipsConduccion: guiaData.tips_conduccion || [],
                            cierre: guiaData.cierre || "",
                            fechaGeneracion: guiaData.fecha_generacion,
                          });
                          setMostrarGuiaFeedback(true); // Mostrar automáticamente la guía
                        }
                      } catch (error) {
                        console.error("Error recargando guía:", error);
                      }
                    }}
                  />
                  <GenerarFeedbackGrupal
                    colaboradorId={colaborador.dpi}
                    periodoId={periodoId}
                    colaboradorNombre={colaborador.nombre}
                  />
                </>
              )}
            </div>
            {planDesarrollo && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  ✅ Plan de desarrollo cargado. Desplázate hacia abajo para ver los detalles.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Modal de Edición del Plan */}
        {mostrarEditarPlan && planDesarrollo && (
          <EditarPlanDesarrollo
            plan={{
              id: planDesarrollo.id,
              colaboradorId: colaborador.dpi,
              periodoId: periodoId,
              feedbackIndividual: planDesarrollo.feedbackIndividual || "",
              feedbackGrupal: planDesarrollo.feedbackGrupal || null,
              planEstructurado: planDesarrollo.planEstructurado,
              recomendaciones: planDesarrollo.recomendaciones || [],
              editable: true,
            }}
            colaboradorNombre={colaborador.nombre}
            onPlanGuardado={(planActualizado) => {
              setPlanDesarrollo({
                id: planActualizado.id,
                feedbackIndividual: planActualizado.feedbackIndividual,
                feedbackGrupal: planActualizado.feedbackGrupal,
                planEstructurado: planActualizado.planEstructurado,
                recomendaciones: planActualizado.recomendaciones,
              });
              setMostrarEditarPlan(false);
            }}
            onClose={() => setMostrarEditarPlan(false)}
          />
        )}

        {/* Toggle Individual/Grupal */}
        {perteneceCuadrilla && gruposColaborador.length > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users2 className="h-5 w-5 text-info" />
                  <div>
                    <p className="font-medium">Vista de Comparación</p>
                    <p className="text-sm text-muted-foreground">
                      Este colaborador pertenece a {gruposColaborador.length} cuadrilla{gruposColaborador.length > 1 ? 's' : ''}: {gruposColaborador.map(g => g.nombre).join(', ')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 border rounded-lg p-1">
                  <Button
                    variant={vistaModo === "individual" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setVistaModo("individual")}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Individual
                  </Button>
                  <Button
                    variant={vistaModo === "grupal" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setVistaModo("grupal")}
                  >
                    <Users2 className="mr-2 h-4 w-4" />
                    Grupal
                  </Button>
                </div>
              </div>
              {promedioGrupo !== null && (
                <div className="mt-4 p-3 bg-info/10 border border-info/20 rounded-lg">
                  <p className="text-sm">
                    <strong>Promedio del Equipo:</strong> {Math.round(promedioGrupo)}% 
                    <span className="text-muted-foreground ml-2">
                      (Comparar con el desempeño individual del colaborador: {scoreToPercentage(resultadoFinal.desempenoFinal)}%)
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Gráficos Comparativos */}
        <div className="mb-6">
          {/* Nueva vista integrada de radar con análisis */}
          <PerformanceRadarAnalysis
            radarData={radarData.map(d => ({
              dimension: d.dimension,
              tuResultado: d.evaluacionJefe,
              promedioMunicipal: d.autoevaluacion,
            }))}
            dimensionAnalysis={comparativo.map(dim => {
              const porcentaje = scoreToPercentage(dim.evaluacionJefe);
              // Consideramos fortaleza si está por encima del 80% o si la diferencia con autoevaluación es positiva y alta
              const isFortaleza = porcentaje >= 80 || (dim.diferencia > 0.3 && porcentaje >= 75);
              return {
                nombre: dim.nombre,
                descripcion: instrument.dimensionesDesempeno.find(d => d.id === dim.dimensionId)?.descripcion,
                porcentaje: porcentaje,
                isFortaleza: isFortaleza,
                promedioMunicipal: scoreToPercentage(dim.autoevaluacion),
              };
            })}
            title="Panorama de Competencias"
            description="Vista integral del desempeño por dimensión comparado con la autoevaluación"
          />
        </div>

        {/* Gráficos adicionales en vista grupal */}
        {vistaModo === "grupal" && perteneceCuadrilla && promedioGrupo !== null && (
          <div className="grid gap-6 mb-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Comparativo Individual vs Promedio Grupal</CardTitle>
                <CardDescription>
                  Comparación del colaborador vs promedio de su cuadrilla
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData.map(d => ({ ...d, promedioGrupo: promedioGrupo }))}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="dimension" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="Autoevaluación"
                      dataKey="autoevaluacion"
                      stroke={COLORS.auto}
                      fill={COLORS.auto}
                      fillOpacity={0.6}
                    />
                    <Radar
                      name="Evaluación Jefe"
                      dataKey="evaluacionJefe"
                      stroke={COLORS.jefe}
                      fill={COLORS.jefe}
                      fillOpacity={0.6}
                    />
                    <Radar
                      name="Promedio Grupo"
                      dataKey="promedioGrupo"
                      stroke="#ffc658"
                      fill="#ffc658"
                      fillOpacity={0.4}
                    />
                    <Tooltip />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comparativo de Promedios</CardTitle>
                <CardDescription>
                  Barras comparativas con promedio grupal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData.map(d => ({ ...d, promedioGrupo: promedioGrupo }))}>
                    <XAxis dataKey="dimension" angle={-45} textAnchor="end" height={80} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="autoevaluacion" fill={COLORS.auto} name="Autoevaluación (%)" />
                    <Bar dataKey="evaluacionJefe" fill={COLORS.jefe} name="Evaluación Jefe (%)" />
                    <Bar dataKey="promedioGrupo" fill="#ffc658" name="Promedio Grupo (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Plan de Desarrollo - Acciones y Objetivos */}
        {planDesarrollo && planDesarrollo.planEstructurado && (
          <div className="space-y-6 mb-6">
            {/* Objetivos */}
            {planDesarrollo.planEstructurado.objetivos && Array.isArray(planDesarrollo.planEstructurado.objetivos) && planDesarrollo.planEstructurado.objetivos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Objetivos de Desarrollo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {planDesarrollo.planEstructurado.objetivos.map((obj: string, idx: number) => (
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
            {planDesarrollo.planEstructurado.acciones && Array.isArray(planDesarrollo.planEstructurado.acciones) && planDesarrollo.planEstructurado.acciones.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Plan de Acción Detallado</CardTitle>
                  <CardDescription>
                    Acciones concretas con responsables, fechas e indicadores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {planDesarrollo.planEstructurado.acciones
                      .sort((a: any, b: any) => {
                        const prioridadOrder = { alta: 1, media: 2, baja: 3 };
                        return (prioridadOrder[a.prioridad] || 99) - (prioridadOrder[b.prioridad] || 99);
                      })
                      .map((accion: any, idx: number) => (
                        <div key={idx} className="border rounded-lg p-4 hover:bg-accent/5 transition-colors">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <p className="font-medium flex-1">{accion.descripcion}</p>
                            <Badge variant={accion.prioridad === "alta" ? "destructive" : accion.prioridad === "media" ? "default" : "secondary"}>
                              {accion.prioridad === "alta" ? "🔴 Alta" : accion.prioridad === "media" ? "🟡 Media" : "🟢 Baja"}
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
            {planDesarrollo.planEstructurado.dimensionesDebiles && Array.isArray(planDesarrollo.planEstructurado.dimensionesDebiles) && planDesarrollo.planEstructurado.dimensionesDebiles.length > 0 && (
              <Card className="border-warning">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-warning" />
                    Dimensiones que Requieren Atención
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {planDesarrollo.planEstructurado.dimensionesDebiles.map((dim: any, idx: number) => (
                      <div key={idx} className="border-l-4 border-warning pl-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{dim.dimension}</h4>
                          <Badge variant="outline">
                            Score: {dim.score?.toFixed(2) || "N/A"}/5.0 ({dim.score ? ((dim.score / 5) * 100).toFixed(0) : "N/A"}%)
                          </Badge>
                        </div>
                        <ul className="space-y-1 text-sm">
                          {dim.accionesEspecificas && Array.isArray(dim.accionesEspecificas) && dim.accionesEspecificas.map((accion: string, i: number) => (
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

            {/* Recomendaciones */}
            {planDesarrollo.recomendaciones && Array.isArray(planDesarrollo.recomendaciones) && planDesarrollo.recomendaciones.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recomendaciones Generales</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {planDesarrollo.recomendaciones.map((rec: string, idx: number) => (
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

        {/* Guía de Retroalimentación (Solo para el Jefe) */}
        {guiaFeedback && (
          <Card className="mb-6 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Guía de Retroalimentación
                  </CardTitle>
                  <CardDescription>
                    Guía estructurada para conducir la conversación de retroalimentación (solo visible para el jefe)
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarGuiaFeedback(!mostrarGuiaFeedback)}
                >
                  {mostrarGuiaFeedback ? "Ocultar" : "Ver Guía"}
                </Button>
              </div>
            </CardHeader>
            {mostrarGuiaFeedback && (
              <CardContent className="space-y-6">
                {/* Preparación */}
                {guiaFeedback.preparacion && (
                  <div>
                    <h4 className="font-semibold mb-2 text-primary">📋 Preparación</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">
                      {guiaFeedback.preparacion}
                    </p>
                  </div>
                )}

                {/* Apertura */}
                {guiaFeedback.apertura && (
                  <div>
                    <h4 className="font-semibold mb-2 text-primary">👋 Apertura</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">
                      {guiaFeedback.apertura}
                    </p>
                  </div>
                )}

                {/* Fortalezas */}
                {guiaFeedback.fortalezas && Array.isArray(guiaFeedback.fortalezas) && guiaFeedback.fortalezas.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 text-primary">🌟 Fortalezas</h4>
                    <div className="space-y-3">
                      {guiaFeedback.fortalezas.map((fortaleza: any, idx: number) => (
                        <div key={idx} className="border-l-4 border-success pl-4 py-2 bg-success/5 rounded-r-lg">
                          <h5 className="font-medium text-sm mb-1">{fortaleza.dimension || "Fortaleza"}</h5>
                          <p className="text-sm text-muted-foreground mb-2">{fortaleza.descripcion}</p>
                          {fortaleza.ejemplo && (
                            <p className="text-xs text-muted-foreground italic">Ejemplo: {fortaleza.ejemplo}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Áreas de Desarrollo */}
                {guiaFeedback.areasDesarrollo && Array.isArray(guiaFeedback.areasDesarrollo) && guiaFeedback.areasDesarrollo.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 text-primary">⚠️ Áreas de Desarrollo</h4>
                    <div className="space-y-3">
                      {guiaFeedback.areasDesarrollo.map((area: any, idx: number) => (
                        <div key={idx} className="border-l-4 border-warning pl-4 py-2 bg-warning/5 rounded-r-lg">
                          <h5 className="font-medium text-sm mb-2">{area.dimension || "Área de desarrollo"}</h5>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {area.situacion && (
                              <p><strong>Situación:</strong> {area.situacion}</p>
                            )}
                            {area.comportamiento && (
                              <p><strong>Comportamiento:</strong> {area.comportamiento}</p>
                            )}
                            {area.impacto && (
                              <p><strong>Impacto:</strong> {area.impacto}</p>
                            )}
                            {area.sugerencia && (
                              <p className="text-primary"><strong>Sugerencia:</strong> {area.sugerencia}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preguntas de Diálogo */}
                {guiaFeedback.preguntasDialogo && Array.isArray(guiaFeedback.preguntasDialogo) && guiaFeedback.preguntasDialogo.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 text-primary">💬 Preguntas para el Diálogo</h4>
                    <ul className="space-y-2">
                      {guiaFeedback.preguntasDialogo.map((pregunta: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{pregunta}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tips de Conducción */}
                {guiaFeedback.tipsConduccion && Array.isArray(guiaFeedback.tipsConduccion) && guiaFeedback.tipsConduccion.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 text-primary">💡 Tips para Conducir la Conversación</h4>
                    <ul className="space-y-2">
                      {guiaFeedback.tipsConduccion.map((tip: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                          <span className="text-primary mt-0.5">→</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Cierre */}
                {guiaFeedback.cierre && (
                  <div>
                    <h4 className="font-semibold mb-2 text-primary">🎯 Cierre</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">
                      {guiaFeedback.cierre}
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )}

        {/* Feedback Individual y Grupal */}
        {planDesarrollo && (
          <div className="space-y-6 mb-6">
            {planDesarrollo.feedbackIndividual && (
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Feedback Individual
                  </CardTitle>
                  <CardDescription>
                    Retroalimentación personalizada para el colaborador
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-6 bg-muted/30 rounded-lg border min-h-[200px] max-h-[600px] overflow-y-auto">
                    <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                      {planDesarrollo.feedbackIndividual}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {planDesarrollo.feedbackGrupal && (
              <Card className="border-info/20 bg-info/5 w-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users2 className="h-5 w-5 text-info" />
                    Feedback Grupal
                  </CardTitle>
                  <CardDescription>
                    Retroalimentación para toda la cuadrilla
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-6 bg-background rounded-lg border border-info/20 min-h-[200px] max-h-[600px] overflow-y-auto">
                    <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                      {planDesarrollo.feedbackGrupal}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Tabla Comparativa Detallada */}
        <Card>
          <CardHeader>
            <CardTitle>
              {vistaModo === "grupal" && perteneceCuadrilla
                ? "Análisis Individual vs Promedio Grupal"
                : "Análisis Detallado por Dimensión"}
            </CardTitle>
            <CardDescription>
              {vistaModo === "grupal" && perteneceCuadrilla
                ? "Comparación del desempeño individual con el promedio de la cuadrilla"
                : "Comparación punto por punto con diferencias identificadas"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {comparativo.map((item, idx) => {
                const diferenciaPorcentaje = scoreToPercentage(item.evaluacionJefe) - scoreToPercentage(item.autoevaluacion);
                const isAligned = Math.abs(diferenciaPorcentaje) < 10; // 10% de diferencia es considerado alineado
                const jefeHigher = diferenciaPorcentaje > 10;
                const autoHigher = diferenciaPorcentaje < -10;

                return (
                  <div key={item.dimensionId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">{item.nombre}</h3>
                      {isAligned ? (
                        <Badge variant="outline" className="text-success border-success">
                          <Minus className="mr-1 h-3 w-3" />
                          Alineado
                        </Badge>
                      ) : jefeHigher ? (
                        <Badge variant="outline" className="text-accent border-accent">
                          <TrendingUp className="mr-1 h-3 w-3" />
                          Jefe más alto
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-warning border-warning">
                          <TrendingDown className="mr-1 h-3 w-3" />
                          Colaborador más alto
                        </Badge>
                      )}
                    </div>
                    
                    <div className={`grid gap-4 mb-3 ${
                      vistaModo === "grupal" && perteneceCuadrilla && promedioGrupo !== null
                        ? "md:grid-cols-4"
                        : "md:grid-cols-3"
                    }`}>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Autoevaluación</p>
                        <div className="flex items-center gap-2">
                          <Progress value={scoreToPercentage(item.autoevaluacion)} className="flex-1" />
                          <span className="font-medium w-16 text-right">
                            {scoreToPercentage(item.autoevaluacion)}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Evaluación Jefe</p>
                        <div className="flex items-center gap-2">
                          <Progress value={scoreToPercentage(item.evaluacionJefe)} className="flex-1" />
                          <span className="font-medium w-16 text-right">
                            {scoreToPercentage(item.evaluacionJefe)}%
                          </span>
                        </div>
                      </div>
                      {vistaModo === "grupal" && perteneceCuadrilla && promedioGrupo !== null && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Promedio Cuadrilla</p>
                          <div className="flex items-center gap-2">
                            <Progress value={promedioGrupo} className="flex-1" />
                            <span className="font-medium w-16 text-right text-info">
                              {Math.round(promedioGrupo)}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Promedio del grupo</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Diferencia</p>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium w-16 text-right ${
                            Math.abs(item.diferencia) < 0.3 ? "text-muted-foreground" :
                            item.diferencia > 0 ? "text-accent" : "text-warning"
                          }`}>
                            {item.diferencia > 0 ? "+" : ""}{scoreToPercentage(item.evaluacionJefe) - scoreToPercentage(item.autoevaluacion)}%
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({item.diferencia > 0 ? "+" : ""}{item.diferencia.toFixed(2)})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Comentarios */}
                    <div className="grid gap-3 md:grid-cols-2 mt-4 pt-4 border-t">
                      {autoevaluacion.comments[item.dimensionId] && (
                        <div className="text-sm">
                          <p className="font-medium text-muted-foreground mb-1">
                            Comentarios del Colaborador:
                          </p>
                          <p className="text-sm">{autoevaluacion.comments[item.dimensionId]}</p>
                        </div>
                      )}
                      {evaluacionJefe.comments[item.dimensionId] && (
                        <div className="text-sm">
                          <p className="font-medium text-muted-foreground mb-1">
                            Comentarios del Jefe:
                          </p>
                          <p className="text-sm">{evaluacionJefe.comments[item.dimensionId]}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default VistaComparativa;
