import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Target,
  Activity,
  Award,
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { getJerarquiaInfo, getComparativaEquipos, getEquipoStats } from "@/lib/jerarquias";
import { getActivePeriod } from "@/lib/supabase";

const DashboardConsolidado = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jerarquiaInfo, setJerarquiaInfo] = useState<any>(null);
  const [comparativaEquipos, setComparativaEquipos] = useState<any[]>([]);
  const [promedioOrganizacional, setPromedioOrganizacional] = useState<any>(null);
  const [periodoId, setPeriodoId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"resumen" | "equipos" | "jerarquia">("resumen");

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
      let periodData = null;
      const activePeriod = await getActivePeriod();
      if (activePeriod) {
        setPeriodoId(activePeriod.id);
      } else {
        const { data } = await supabase
          .from("evaluation_periods")
          .select("id")
          .eq("nombre", "2025-1")
          .single();
        periodData = data;
        if (periodData) {
          setPeriodoId(periodData.id);
        }
      }

      if (!periodoId && !periodData?.id) {
        toast.error("No se encontró un período de evaluación activo");
        setLoading(false);
        return;
      }

      const activePeriodId = periodoId || periodData?.id;

      // Cargar información de jerarquía
      const info = await getJerarquiaInfo(user!.dpi);
      setJerarquiaInfo(info);

      // Cargar comparativa de equipos si tiene jefes subordinados
      if (info?.tieneJefesSubordinados) {
        const comparativa = await getComparativaEquipos(user!.dpi, activePeriodId);
        setComparativaEquipos(comparativa);
      }

      // Cargar promedio organizacional
      const { data: promedioData } = await supabase
        .from("final_evaluation_results")
        .select("desempeno_porcentaje, potencial_porcentaje")
        .eq("periodo_id", activePeriodId);

      // Cargar NPS scores
      const { data: npsData } = await supabase
        .from("evaluations")
        .select("nps_score")
        .eq("periodo_id", activePeriodId)
        .eq("tipo", "auto")
        .not("nps_score", "is", null);

      if (promedioData && promedioData.length > 0) {
        const promedioDesempeno = promedioData.reduce((sum, r) => sum + (r.desempeno_porcentaje || 0), 0) / promedioData.length;
        const promedioPotencial = promedioData.reduce((sum, r) => sum + (r.potencial_porcentaje || 0), 0) / promedioData.length;
        
        // Calcular NPS
        let npsPromedio = 0;
        let npsPromoters = 0;
        let npsPassives = 0;
        let npsDetractors = 0;
        
        if (npsData && npsData.length > 0) {
          const scores = npsData.map(d => d.nps_score).filter(s => s !== null) as number[];
          npsPromedio = scores.reduce((sum, s) => sum + s, 0) / scores.length;
          npsPromoters = scores.filter(s => s >= 9).length;
          npsPassives = scores.filter(s => s >= 7 && s < 9).length;
          npsDetractors = scores.filter(s => s < 7).length;
        }
        
        setPromedioOrganizacional({
          desempeno: promedioDesempeno,
          potencial: promedioPotencial,
          total: promedioData.length,
          npsPromedio,
          npsPromoters,
          npsPassives,
          npsDetractors,
        });
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-muted-foreground">Cargando dashboard consolidado...</p>
          </div>
        </main>
      </div>
    );
  }

  // Solo mostrar si el usuario tiene jefes subordinados o colaboradores
  if (!jerarquiaInfo?.tieneColaboradores && !jerarquiaInfo?.tieneJefesSubordinados) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              Volver al Dashboard
            </Button>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Dashboard Consolidado no disponible</h3>
              <p className="text-muted-foreground">
                Este dashboard está disponible para jefes que tienen equipos o jefes subordinados.
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
            Volver al Dashboard
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard Consolidado</h1>
          <p className="text-muted-foreground">
            Vista consolidada de toda su jerarquía organizacional y equipos
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="resumen">
              <BarChart3 className="mr-2 h-4 w-4" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="equipos">
              <Users className="mr-2 h-4 w-4" />
              Equipos
            </TabsTrigger>
            <TabsTrigger value="jerarquia">
              <Activity className="mr-2 h-4 w-4" />
              Jerarquía
            </TabsTrigger>
          </TabsList>

          {/* Tab: Resumen */}
          <TabsContent value="resumen" className="space-y-6">
            {/* Métricas principales */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Colaboradores</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">
                    {jerarquiaInfo?.totalColaboradores || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Directos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Jefes Subordinados</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-info">
                    {jerarquiaInfo?.totalJefesSubordinados || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Reportan a usted</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Promedio Organizacional</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-success">
                    {promedioOrganizacional ? Math.round(promedioOrganizacional.desempeno) : 'N/A'}
                    {promedioOrganizacional ? '%' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {promedioOrganizacional ? `${promedioOrganizacional.total} evaluados` : 'Sin datos'}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    NPS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-success">
                    {promedioOrganizacional?.npsPromedio ? promedioOrganizacional.npsPromedio.toFixed(1) : 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {promedioOrganizacional?.npsPromoters !== undefined && (
                      <>
                        <span className="text-success">{promedioOrganizacional.npsPromoters}</span>
                        {' / '}
                        <span className="text-warning">{promedioOrganizacional.npsPassives}</span>
                        {' / '}
                        <span className="text-destructive">{promedioOrganizacional.npsDetractors}</span>
                      </>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Rol</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold text-accent">
                    {jerarquiaInfo?.esJefeIntermedio ? 'Jefe Intermedio' : 
                     jerarquiaInfo?.esJefeSinJefe ? 'Jefe Superior' : 
                     jerarquiaInfo?.tieneJefeSuperior ? 'Jefe' : 'Colaborador'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Posición actual</p>
                </CardContent>
              </Card>
            </div>

            {/* Comparativa con promedio organizacional */}
            {promedioOrganizacional && comparativaEquipos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Comparativa de Equipos vs Promedio Organizacional</CardTitle>
                  <CardDescription>
                    Desempeño promedio de cada equipo comparado con el promedio general
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={comparativaEquipos
                      .filter((c: any) => c.estadisticasEquipo?.promedioDesempeno != null)
                      .map((c: any) => ({
                        equipo: c.jefeNombre.split(' ')[0] + ' ' + (c.jefeNombre.split(' ')[1] || ''),
                        desempeno: Math.round(c.estadisticasEquipo?.promedioDesempeno || 0),
                        promedioOrg: Math.round(promedioOrganizacional.desempeno),
                        diferencia: Math.round((c.estadisticasEquipo?.promedioDesempeno || 0) - promedioOrganizacional.desempeno),
                      }))}>
                      <XAxis dataKey="equipo" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="desempeno" fill="#8884d8" name="Desempeño Equipo %" />
                      <Bar dataKey="promedioOrg" fill="#82ca9d" name="Promedio Organizacional %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Equipos */}
          <TabsContent value="equipos" className="space-y-6">
            {comparativaEquipos.length > 0 ? (
              <>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {comparativaEquipos.map((equipo: any) => (
                    <Card key={equipo.jefeDpi}>
                      <CardHeader>
                        <CardTitle className="text-lg">{equipo.jefeNombre}</CardTitle>
                        <CardDescription>{equipo.jefeCargo} • {equipo.jefeArea}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {equipo.estadisticasEquipo ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Desempeño Promedio</p>
                                <p className="text-2xl font-bold text-primary">
                                  {Math.round(equipo.estadisticasEquipo.promedioDesempeno)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Potencial Promedio</p>
                                <p className="text-2xl font-bold text-info">
                                  {Math.round(equipo.estadisticasEquipo.promedioPotencial)}%
                                </p>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Índice de Desarrollo</p>
                              <Progress 
                                value={equipo.estadisticasEquipo.indiceDesarrollo} 
                                className="h-3"
                              />
                              <p className="text-xs text-muted-foreground mt-1 text-center">
                                {Math.round(equipo.estadisticasEquipo.indiceDesarrollo)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">
                                Completitud: {equipo.estadisticasEquipo.evaluacionesCompletadas} / {equipo.estadisticasEquipo.totalColaboradores}
                              </p>
                              <Progress 
                                value={equipo.estadisticasEquipo.tasaCompletitud} 
                                className="h-2"
                              />
                            </div>
                            {equipo.evaluacionIndividual?.existe && (
                              <div className="pt-3 border-t">
                                <p className="text-sm text-muted-foreground">Evaluación Individual</p>
                                <Badge variant="outline" className="mt-1">
                                  {Math.round(equipo.evaluacionIndividual?.desempeno || 0)}%
                                </Badge>
                              </div>
                            )}
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
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No hay equipos de jefes subordinados disponibles aún
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Jerarquía */}
          <TabsContent value="jerarquia" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Estructura de Jerarquía</CardTitle>
                <CardDescription>
                  Posición actual en la organización y relaciones jerárquicas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Posición actual */}
                  <div className="p-4 rounded-lg border bg-primary/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-lg">{user?.nombre} {user?.apellidos}</p>
                        <p className="text-sm text-muted-foreground">{user?.cargo} • {user?.area}</p>
                      </div>
                      <Badge variant="default" className="text-lg px-4 py-2">
                        {jerarquiaInfo?.esJefeIntermedio ? 'Jefe Intermedio' : 
                         jerarquiaInfo?.esJefeSinJefe ? 'Jefe Superior' : 
                         jerarquiaInfo?.tieneJefeSuperior ? 'Jefe' : 'Colaborador'}
                      </Badge>
                    </div>
                  </div>

                  {/* Reporta a */}
                  {jerarquiaInfo?.tieneJefeSuperior && (
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Reporta a:</p>
                      <p className="text-sm">Su jefe superior (verificar en perfil)</p>
                    </div>
                  )}

                  {/* Equipo directo */}
                  {jerarquiaInfo?.tieneColaboradores && (
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Equipo Directo:
                      </p>
                      <p className="text-lg font-bold text-primary">
                        {jerarquiaInfo.totalColaboradores} colaborador{jerarquiaInfo.totalColaboradores !== 1 ? 'es' : ''}
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => navigate("/evaluacion-equipo")}
                      >
                        Ver Mi Equipo
                      </Button>
                    </div>
                  )}

                  {/* Jefes subordinados */}
                  {jerarquiaInfo?.tieneJefesSubordinados && (
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Jefes Subordinados:
                      </p>
                      <p className="text-lg font-bold text-info">
                        {jerarquiaInfo.totalJefesSubordinados} jefe{jerarquiaInfo.totalJefesSubordinados !== 1 ? 's' : ''} subordinado{jerarquiaInfo.totalJefesSubordinados !== 1 ? 's' : ''}
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => navigate("/evaluacion-jefes")}
                      >
                        Ver Mis Jefes Subordinados
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DashboardConsolidado;

