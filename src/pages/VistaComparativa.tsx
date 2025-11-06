import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, Minus, Users2, User } from "lucide-react";
import { toast } from "sonner";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell } from "recharts";
import { getSubmittedEvaluation, getJefeEvaluationDraft, getMockColaboradorEvaluation } from "@/lib/storage";
import { INSTRUMENT_A1 } from "@/data/instruments";
import { getNineBoxDescription, calculateCompleteFinalScore } from "@/lib/finalScore";
import { scoreToPercentage } from "@/lib/calculations";
import { perteneceACuadrilla, getGruposDelColaborador, getEquipoStats } from "@/lib/jerarquias";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";

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
  const instrument = INSTRUMENT_A1;

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
  const [promedioGrupo, setPromedioGrupo] = useState<number | null>(null);

  useEffect(() => {
    if (!id || !user) {
      navigate("/evaluacion-equipo");
      return;
    }

    const loadData = async () => {
      try {
        // Obtener período activo
        const activePeriod = await getActivePeriod();
        let periodoId = "2025-1";
        if (activePeriod) {
          periodoId = activePeriod.id;
        } else {
          const { data: periodData } = await supabase
            .from("evaluation_periods")
            .select("id")
            .eq("nombre", "2025-1")
            .single();
          if (periodData) {
            periodoId = periodData.id;
          }
        }

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
              const stats = await getEquipoStats(assignment.jefe_id, periodoId);
              setPromedioGrupo(stats?.promedioDesempeno || null);
            }
          }
        }

        // Cargar plan de desarrollo para verificar si hay feedback grupal
        const { data: planData } = await supabase
          .from("development_plans")
          .select("*")
          .eq("colaborador_id", colaboradorFormatted.dpi)
          .eq("periodo_id", periodoId)
          .maybeSingle();

        if (planData) {
          setPlanDesarrollo({
            feedbackIndividual: planData.feedback_individual,
            feedbackGrupal: planData.feedback_grupal,
          });
        }

        // Cargar ambas evaluaciones
        const auto = await getSubmittedEvaluation(colaboradorFormatted.dpi, periodoId) || 
                    getMockColaboradorEvaluation(colaboradorFormatted.dpi);
        const jefe = await getJefeEvaluationDraft(user.dpi, colaboradorFormatted.dpi, periodoId);

        if (!auto || !jefe || jefe.estado !== "enviado") {
          toast.error("Ambas evaluaciones deben estar completas para ver la comparación");
          navigate("/evaluacion-equipo");
          return;
        }

        setAutoevaluacion(auto);
        setEvaluacionJefe(jefe);

        // Calcular resultado final y comparativo
        const resultado = calculateCompleteFinalScore(
          auto,
          jefe,
          instrument.dimensionesDesempeno,
          instrument.dimensionesPotencial
        );
        setResultadoFinal(resultado);

        // Calcular comparativo por dimensión
        const comparativoData = instrument.dimensionesDesempeno.map((dim) => {
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

  if (loading || !colaborador || !resultadoFinal) {
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

        {/* Resultado Final */}
        <div className="grid gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Resultado Final</CardTitle>
              <CardDescription>
                Resultado ponderado: 70% evaluación jefe + 30% autoevaluación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Autoevaluación</p>
                  <p className="text-3xl font-bold text-primary">
                    {scoreToPercentage(resultadoFinal.desempenoAuto)}%
                  </p>
                  <p className="text-xs text-muted-foreground">({resultadoFinal.desempenoAuto.toFixed(2)}/5.0)</p>
                </div>
                <div className="text-center p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Evaluación Jefe</p>
                  <p className="text-3xl font-bold text-accent">
                    {scoreToPercentage(resultadoFinal.desempenoJefe)}%
                  </p>
                  <p className="text-xs text-muted-foreground">({resultadoFinal.desempenoJefe.toFixed(2)}/5.0)</p>
                </div>
                <div className="text-center p-4 rounded-lg border bg-primary/5">
                  <p className="text-sm text-muted-foreground mb-1">Desempeño Final</p>
                  <p className="text-3xl font-bold text-primary">
                    {scoreToPercentage(resultadoFinal.desempenoFinal)}%
                  </p>
                  <p className="text-xs text-muted-foreground">({resultadoFinal.desempenoFinal.toFixed(2)}/5.0)</p>
                </div>
                {resultadoFinal.potencial && (
                  <div className="text-center p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">Potencial</p>
                    <p className="text-3xl font-bold text-success">
                      {scoreToPercentage(resultadoFinal.potencial)}%
                    </p>
                    <p className="text-xs text-muted-foreground">({resultadoFinal.potencial.toFixed(2)}/5.0)</p>
                  </div>
                )}
              </div>
              
              {resultadoFinal.posicion9Box && (
                <div className="mt-4 p-4 rounded-lg bg-muted/30">
                  <p className="text-sm font-medium mb-2">Posición en Matriz 9-Box</p>
                  <Badge className="text-lg px-4 py-2">
                    {getNineBoxDescription(resultadoFinal.posicion9Box)}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
        <div className="grid gap-6 mb-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {vistaModo === "grupal" && perteneceCuadrilla 
                  ? "Comparativo Individual vs Promedio Grupal"
                  : "Comparativo por Dimensión"}
              </CardTitle>
              <CardDescription>
                {vistaModo === "grupal" && perteneceCuadrilla
                  ? "Comparación del colaborador individual vs promedio de su cuadrilla"
                  : "Radar comparativo autoevaluación vs evaluación jefe"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={vistaModo === "grupal" && promedioGrupo !== null
                  ? radarData.map(d => ({ ...d, promedioGrupo: promedioGrupo }))
                  : radarData}>
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
                  {vistaModo === "grupal" && promedioGrupo !== null && (
                    <Radar
                      name="Promedio Grupo"
                      dataKey="promedioGrupo"
                      stroke="#ffc658"
                      fill="#ffc658"
                      fillOpacity={0.4}
                    />
                  )}
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
                Barras comparativas por dimensión
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={vistaModo === "grupal" && promedioGrupo !== null
                  ? barData.map(d => ({ ...d, promedioGrupo: promedioGrupo }))
                  : barData}>
                  <XAxis dataKey="dimension" angle={-45} textAnchor="end" height={80} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="autoevaluacion" fill={COLORS.auto} name="Autoevaluación (%)" />
                  <Bar dataKey="evaluacionJefe" fill={COLORS.jefe} name="Evaluación Jefe (%)" />
                  {vistaModo === "grupal" && promedioGrupo !== null && (
                    <Bar dataKey="promedioGrupo" fill="#ffc658" name="Promedio Grupo (%)" />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Feedback Individual y Grupal */}
        {planDesarrollo && (
          <div className="grid gap-6 mb-6 md:grid-cols-2">
            {planDesarrollo.feedbackIndividual && (
              <Card>
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
                  <div className="p-4 bg-background rounded-lg border">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {planDesarrollo.feedbackIndividual}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {planDesarrollo.feedbackGrupal && (
              <Card className="border-info/20 bg-info/5">
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
                  <div className="p-4 bg-background rounded-lg border border-info/20">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
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
                        <p className="text-xs text-muted-foreground mt-1">({item.autoevaluacion.toFixed(2)}/5.0)</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Evaluación Jefe</p>
                        <div className="flex items-center gap-2">
                          <Progress value={scoreToPercentage(item.evaluacionJefe)} className="flex-1" />
                          <span className="font-medium w-16 text-right">
                            {scoreToPercentage(item.evaluacionJefe)}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">({item.evaluacionJefe.toFixed(2)}/5.0)</p>
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
