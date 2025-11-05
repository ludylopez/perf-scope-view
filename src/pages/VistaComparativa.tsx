import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell } from "recharts";
import { getSubmittedEvaluation, getJefeEvaluationDraft, getMockColaboradorEvaluation } from "@/lib/storage";
import { INSTRUMENT_A1 } from "@/data/instruments";
import { getNineBoxDescription, calculateCompleteFinalScore } from "@/lib/finalScore";

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

  useEffect(() => {
    if (!id || !user) {
      navigate("/evaluacion-equipo");
      return;
    }

    const loadData = async () => {
      const colaboradorData = MOCK_COLABORADORES[id];
      if (!colaboradorData) {
        navigate("/evaluacion-equipo");
        return;
      }

      setColaborador(colaboradorData);

      // Cargar ambas evaluaciones
      const auto = await getSubmittedEvaluation(colaboradorData.dpi, "2025-1") || 
                  getMockColaboradorEvaluation(colaboradorData.dpi);
      const jefe = await getJefeEvaluationDraft(user.dpi, colaboradorData.dpi, "2025-1");

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

  // Preparar datos para gráficos
  const radarData = instrument.dimensionesDesempeno.map((dim) => {
    const autoItems = dim.items.map(item => autoevaluacion.responses[item.id]).filter(v => v !== undefined);
    const jefeItems = dim.items.map(item => evaluacionJefe.responses[item.id]).filter(v => v !== undefined);
    
    const autoAvg = autoItems.length > 0 ? autoItems.reduce((sum, val) => sum + val, 0) / autoItems.length : 0;
    const jefeAvg = jefeItems.length > 0 ? jefeItems.reduce((sum, val) => sum + val, 0) / jefeItems.length : 0;
    
    return {
      dimension: dim.nombre.substring(0, 20),
      autoevaluacion: autoAvg,
      evaluacionJefe: jefeAvg,
    };
  });

  const barData = comparativo.map((item) => ({
    dimension: item.nombre.substring(0, 15),
    autoevaluacion: item.autoevaluacion,
    evaluacionJefe: item.evaluacionJefe,
    diferencia: item.diferencia,
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
                    {resultadoFinal.desempenoAuto.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">/5.0</p>
                </div>
                <div className="text-center p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Evaluación Jefe</p>
                  <p className="text-3xl font-bold text-accent">
                    {resultadoFinal.desempenoJefe.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">/5.0</p>
                </div>
                <div className="text-center p-4 rounded-lg border bg-primary/5">
                  <p className="text-sm text-muted-foreground mb-1">Desempeño Final</p>
                  <p className="text-3xl font-bold text-primary">
                    {resultadoFinal.desempenoFinal.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">/5.0</p>
                </div>
                {resultadoFinal.potencial && (
                  <div className="text-center p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">Potencial</p>
                    <p className="text-3xl font-bold text-success">
                      {resultadoFinal.potencial.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">/5.0</p>
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

        {/* Gráficos Comparativos */}
        <div className="grid gap-6 mb-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Comparativo por Dimensión</CardTitle>
              <CardDescription>
                Radar comparativo autoevaluación vs evaluación jefe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" />
                  <PolarRadiusAxis angle={90} domain={[0, 5]} />
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
                <BarChart data={barData}>
                  <XAxis dataKey="dimension" angle={-45} textAnchor="end" height={80} />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="autoevaluacion" fill={COLORS.auto} name="Autoevaluación" />
                  <Bar dataKey="evaluacionJefe" fill={COLORS.jefe} name="Evaluación Jefe" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabla Comparativa Detallada */}
        <Card>
          <CardHeader>
            <CardTitle>Análisis Detallado por Dimensión</CardTitle>
            <CardDescription>
              Comparación punto por punto con diferencias identificadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {comparativo.map((item, idx) => {
                const diferenciaPorcentaje = (item.diferencia / item.autoevaluacion) * 100;
                const isAligned = Math.abs(item.diferencia) < 0.3;
                const jefeHigher = item.diferencia > 0.3;
                const autoHigher = item.diferencia < -0.3;

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
                    
                    <div className="grid gap-4 md:grid-cols-3 mb-3">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Autoevaluación</p>
                        <div className="flex items-center gap-2">
                          <Progress value={(item.autoevaluacion / 5) * 100} className="flex-1" />
                          <span className="font-medium w-12 text-right">
                            {item.autoevaluacion.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Evaluación Jefe</p>
                        <div className="flex items-center gap-2">
                          <Progress value={(item.evaluacionJefe / 5) * 100} className="flex-1" />
                          <span className="font-medium w-12 text-right">
                            {item.evaluacionJefe.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Diferencia</p>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium w-12 text-right ${
                            Math.abs(item.diferencia) < 0.3 ? "text-muted-foreground" :
                            item.diferencia > 0 ? "text-accent" : "text-warning"
                          }`}>
                            {item.diferencia > 0 ? "+" : ""}{item.diferencia.toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({Math.abs(diferenciaPorcentaje).toFixed(1)}%)
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

