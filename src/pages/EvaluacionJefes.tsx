import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, 
  Users, 
  FileEdit, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  BarChart3,
  Users2,
  Target
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getJefesSubordinados, getEquipoStats, getComparativaEquipos, getEvaluacionJefeComoColaborador } from "@/lib/jerarquias";
import { getActivePeriod } from "@/lib/supabase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { scoreToPercentage } from "@/lib/calculations";

const EvaluacionJefes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jefesSubordinados, setJefesSubordinados] = useState<any[]>([]);
  const [comparativaEquipos, setComparativaEquipos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodoId, setPeriodoId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"individual" | "equipos" | "comparativa">("individual");

  useEffect(() => {
    if (!user) {
      navigate("/dashboard");
      return;
    }

    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Obtener período activo
      const activePeriod = await getActivePeriod();
      if (activePeriod) {
        setPeriodoId(activePeriod.id);
      } else {
        const { data: periodData } = await supabase
          .from("evaluation_periods")
          .select("id")
          .eq("nombre", "2025-1")
          .single();
        if (periodData) {
          setPeriodoId(periodData.id);
        }
      }

      if (!periodoId && !periodData?.id) {
        toast.error("No se encontró un período de evaluación activo");
        return;
      }

      // Obtener período activo si no se había obtenido
      let activePeriodId = periodoId;
      if (!activePeriodId) {
        const activePeriod = await getActivePeriod();
        if (activePeriod) {
          activePeriodId = activePeriod.id;
          setPeriodoId(activePeriod.id);
        } else {
          const { data: periodData } = await supabase
            .from("evaluation_periods")
            .select("id")
            .eq("nombre", "2025-1")
            .single();
          if (periodData) {
            activePeriodId = periodData.id;
            setPeriodoId(periodData.id);
          }
        }
      }

      if (!activePeriodId) {
        toast.error("No se encontró un período de evaluación activo");
        setLoading(false);
        return;
      }

      // Cargar jefes subordinados
      const jefes = await getJefesSubordinados(user!.dpi);
      setJefesSubordinados(jefes);

      // Cargar estadísticas de equipos para cada jefe
      const equiposConStats = await Promise.all(
        jefes.map(async (jefe) => {
          const stats = await getEquipoStats(jefe.dpi, activePeriodId);
          const evaluacion = await getEvaluacionJefeComoColaborador(
            jefe.dpi,
            user!.dpi,
            activePeriodId
          );
          return {
            ...jefe,
            estadisticasEquipo: stats,
            evaluacionIndividual: evaluacion,
          };
        })
      );

      setJefesSubordinados(equiposConStats);

      // Cargar comparativa de equipos
      const comparativa = await getComparativaEquipos(user!.dpi, activePeriodId);
      setComparativaEquipos(comparativa);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (jefe: any) => {
    if (jefe.evaluacionIndividual?.existe && jefe.evaluacionIndividual?.estado === "enviado") {
      return (
        <Badge className="bg-success text-success-foreground">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Evaluado
        </Badge>
      );
    }
    if (jefe.evaluacionIndividual?.existe && jefe.evaluacionIndividual?.estado === "borrador") {
      return (
        <Badge variant="outline" className="text-primary border-primary">
          <Clock className="mr-1 h-3 w-3" />
          En Progreso
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-warning border-warning">
        <Clock className="mr-1 h-3 w-3" />
        Pendiente
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-muted-foreground">Cargando jefes subordinados...</p>
          </div>
        </main>
      </div>
    );
  }

  if (jefesSubordinados.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Dashboard
            </Button>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tiene jefes subordinados</h3>
              <p className="text-muted-foreground">
                No hay colaboradores que reporten directamente a usted para evaluar.
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
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Mis Jefes Subordinados</h1>
          <p className="text-muted-foreground">
            Evalúe el desempeño individual y gestión de equipos de sus jefes subordinados
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="individual">
              <FileEdit className="mr-2 h-4 w-4" />
              Evaluación Individual
            </TabsTrigger>
            <TabsTrigger value="equipos">
              <Users2 className="mr-2 h-4 w-4" />
              Vista de Equipos
            </TabsTrigger>
            <TabsTrigger value="comparativa">
              <BarChart3 className="mr-2 h-4 w-4" />
              Comparativa
            </TabsTrigger>
          </TabsList>

          {/* Tab: Evaluación Individual */}
          <TabsContent value="individual" className="space-y-4">
            {jefesSubordinados.map((jefe) => (
              <Card key={jefe.dpi}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{jefe.nombreCompleto}</CardTitle>
                      <CardDescription>
                        {jefe.cargo} • {jefe.area} • Nivel {jefe.nivel}
                      </CardDescription>
                    </div>
                    {getStatusBadge(jefe)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <p className="text-sm text-muted-foreground mb-1">Equipo</p>
                      <p className="text-2xl font-bold">{jefe.totalColaboradores}</p>
                      <p className="text-xs text-muted-foreground mt-1">colaboradores</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <p className="text-sm text-muted-foreground mb-1">Grupos</p>
                      <p className="text-2xl font-bold">{jefe.totalGrupos}</p>
                      <p className="text-xs text-muted-foreground mt-1">cuadrillas</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <p className="text-sm text-muted-foreground mb-1">Promedio Equipo</p>
                      <p className="text-2xl font-bold text-primary">
                        {jefe.estadisticasEquipo?.promedioDesempeno 
                          ? Math.round(jefe.estadisticasEquipo.promedioDesempeno)
                          : 'N/A'}
                        {jefe.estadisticasEquipo?.promedioDesempeno ? '%' : ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">desempeño</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <p className="text-sm text-muted-foreground mb-1">Evaluación Individual</p>
                      <p className="text-2xl font-bold text-success">
                        {jefe.evaluacionIndividual?.desempeno 
                          ? Math.round(jefe.evaluacionIndividual.desempeno)
                          : 'N/A'}
                        {jefe.evaluacionIndividual?.desempeno ? '%' : ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">desempeño</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {jefe.estadisticasEquipo && (
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Completitud del Equipo</span>
                            <span className="font-medium">
                              {jefe.estadisticasEquipo.evaluacionesCompletadas} / {jefe.estadisticasEquipo.totalColaboradores}
                            </span>
                          </div>
                          <Progress 
                            value={jefe.estadisticasEquipo.tasaCompletitud} 
                            className="h-2" 
                          />
                        </div>
                      )}
                    </div>
                    <Button
                      className="ml-4"
                      onClick={() => {
                        // Navegar a evaluación individual del jefe
                        navigate(`/evaluacion-jefe/${jefe.dpi}`);
                      }}
                    >
                      <FileEdit className="mr-2 h-4 w-4" />
                      {jefe.evaluacionIndividual?.existe ? "Ver/Editar Evaluación" : "Evaluar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Tab: Vista de Equipos */}
          <TabsContent value="equipos" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {jefesSubordinados.map((jefe) => (
                <Card key={jefe.dpi}>
                  <CardHeader>
                    <CardTitle className="text-lg">{jefe.nombreCompleto}</CardTitle>
                    <CardDescription>{jefe.cargo} • {jefe.area}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {jefe.estadisticasEquipo ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Desempeño Promedio</p>
                            <p className="text-2xl font-bold text-primary">
                              {Math.round(jefe.estadisticasEquipo.promedioDesempeno)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Potencial Promedio</p>
                            <p className="text-2xl font-bold text-info">
                              {Math.round(jefe.estadisticasEquipo.promedioPotencial)}%
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Índice de Desarrollo</p>
                          <Progress 
                            value={jefe.estadisticasEquipo.indiceDesarrollo} 
                            className="h-3"
                          />
                          <p className="text-xs text-muted-foreground mt-1 text-center">
                            {Math.round(jefe.estadisticasEquipo.indiceDesarrollo)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Completitud: {jefe.estadisticasEquipo.evaluacionesCompletadas} / {jefe.estadisticasEquipo.totalColaboradores}
                          </p>
                          <Progress 
                            value={jefe.estadisticasEquipo.tasaCompletitud} 
                            className="h-2"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Sin datos del equipo aún
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Gráfico comparativo de equipos */}
            {comparativaEquipos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Comparación de Promedios de Equipos</CardTitle>
                  <CardDescription>
                    Desempeño promedio de cada equipo dirigido por sus jefes subordinados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={comparativaEquipos
                      .filter((c: any) => c.estadisticasEquipo?.promedioDesempeno != null)
                      .map((c: any) => ({
                        equipo: c.jefeNombre.split(' ')[0] + ' ' + c.jefeNombre.split(' ')[1],
                        desempeno: Math.round(c.estadisticasEquipo?.promedioDesempeno || 0),
                        potencial: Math.round(c.estadisticasEquipo?.promedioPotencial || 0),
                        desarrollo: Math.round(c.estadisticasEquipo?.indiceDesarrollo || 0),
                      }))}>
                      <XAxis dataKey="equipo" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="desempeno" fill="#8884d8" name="Desempeño %" />
                      <Bar dataKey="potencial" fill="#82ca9d" name="Potencial %" />
                      <Bar dataKey="desarrollo" fill="#ffc658" name="Índice Desarrollo %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Comparativa */}
          <TabsContent value="comparativa" className="space-y-6">
            {comparativaEquipos.length > 0 ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Ranking de Equipos</CardTitle>
                    <CardDescription>
                      Comparación de desempeño promedio de equipos ordenados por mejor rendimiento
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Posición</TableHead>
                          <TableHead>Jefe</TableHead>
                          <TableHead>Área</TableHead>
                          <TableHead>Desempeño Promedio</TableHead>
                          <TableHead>Potencial Promedio</TableHead>
                          <TableHead>Índice Desarrollo</TableHead>
                          <TableHead>Total Equipo</TableHead>
                          <TableHead>Evaluación Individual</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparativaEquipos
                          .sort((a: any, b: any) => {
                            const aDesempeno = a.estadisticasEquipo?.promedioDesempeno || 0;
                            const bDesempeno = b.estadisticasEquipo?.promedioDesempeno || 0;
                            return bDesempeno - aDesempeno;
                          })
                          .map((comparativa: any, idx: number) => (
                            <TableRow key={comparativa.jefeDpi}>
                              <TableCell>
                                <Badge variant={idx === 0 ? "default" : "outline"}>
                                  #{idx + 1}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                {comparativa.jefeNombre}
                              </TableCell>
                              <TableCell>{comparativa.jefeArea}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">
                                    {Math.round(comparativa.estadisticasEquipo?.promedioDesempeno || 0)}%
                                  </span>
                                  <Progress 
                                    value={comparativa.estadisticasEquipo?.promedioDesempeno || 0} 
                                    className="w-20 h-2"
                                  />
                                </div>
                              </TableCell>
                              <TableCell>
                                {Math.round(comparativa.estadisticasEquipo?.promedioPotencial || 0)}%
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  (comparativa.estadisticasEquipo?.indiceDesarrollo || 0) >= 75 ? "default" :
                                  (comparativa.estadisticasEquipo?.indiceDesarrollo || 0) >= 65 ? "secondary" :
                                  "outline"
                                }>
                                  {Math.round(comparativa.estadisticasEquipo?.indiceDesarrollo || 0)}%
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {comparativa.estadisticasEquipo?.totalColaboradores || 0}
                              </TableCell>
                              <TableCell>
                                {comparativa.evaluacionIndividual?.existe ? (
                                  <Badge variant="outline" className="bg-success/10">
                                    {Math.round(comparativa.evaluacionIndividual?.desempeno || 0)}%
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Pendiente</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Gráfico de tendencias */}
                <Card>
                  <CardHeader>
                    <CardTitle>Comparación Visual de Equipos</CardTitle>
                    <CardDescription>
                      Desempeño vs Potencial de cada equipo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={comparativaEquipos
                        .filter((c: any) => c.estadisticasEquipo?.promedioDesempeno != null)
                        .map((c: any) => ({
                          equipo: c.jefeNombre.split(' ')[0],
                          desempeno: Math.round(c.estadisticasEquipo?.promedioDesempeno || 0),
                          potencial: Math.round(c.estadisticasEquipo?.promedioPotencial || 0),
                          individual: c.evaluacionIndividual?.existe 
                            ? Math.round(c.evaluacionIndividual?.desempeno || 0)
                            : null,
                        }))}>
                        <XAxis dataKey="equipo" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="desempeno" fill="#8884d8" name="Desempeño Equipo %" />
                        <Bar dataKey="potencial" fill="#82ca9d" name="Potencial Equipo %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No hay datos de comparativa disponibles aún
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default EvaluacionJefes;

