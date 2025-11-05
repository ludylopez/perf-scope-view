import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, TrendingUp, AlertCircle, CheckCircle2, Download } from "lucide-react";
import { getGroupsByJefe } from "@/lib/supabase";
import { GroupWithMembers } from "@/types/group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { exportToExcel, ExportData } from "@/lib/exports";
import { scoreToPercentage } from "@/lib/calculations";

interface GroupStats {
  grupoId: string;
  nombreGrupo: string;
  totalMiembros: number;
  evaluacionesCompletadas: number;
  promedioDesempeno: number;
  promedioPotencial: number;
  distribucion9Box: Record<string, number>;
  necesidadesCapacitacion: string[];
  necesidadesHerramientas: string[];
}

const EstadisticasGrupales = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [groupStats, setGroupStats] = useState<Record<string, GroupStats>>({});
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.rol !== "jefe") {
      navigate("/dashboard");
      return;
    }
    loadGroupStats();
  }, [user, navigate]);

  const loadGroupStats = async () => {
    try {
      setLoading(true);
      
      // Cargar grupos del jefe
      const grupos = await getGroupsByJefe(user?.dpi || "");
      setGroups(grupos);

      if (grupos.length === 0) {
        setLoading(false);
        return;
      }

      // Obtener período activo
      const { data: periodData } = await supabase
        .from("evaluation_periods")
        .select("id")
        .eq("estado", "en_curso")
        .single();
      
      const periodoId = periodData?.id || "2025-1";

      // Calcular estadísticas por grupo
      const stats: Record<string, GroupStats> = {};

      for (const grupo of grupos) {
        const miembrosIds = grupo.miembros.map(m => m.colaboradorId);
        
        // Obtener resultados finales de los miembros
        const { data: resultadosData } = await supabase
          .from("final_evaluation_results")
          .select("resultado_final")
          .in("colaborador_id", miembrosIds)
          .eq("periodo_id", periodoId);

        const resultados = resultadosData || [];
        const completadas = resultados.length;
        
        // Calcular promedios
        let totalDesempeno = 0;
        let totalPotencial = 0;
        const distribucion9Box: Record<string, number> = {};
        const necesidadesCapacitacion: string[] = [];
        const necesidadesHerramientas: string[] = [];

        resultados.forEach((r) => {
          const resultado = r.resultado_final as any;
          totalDesempeno += resultado.desempenoFinal || 0;
          totalPotencial += resultado.potencial || 0;
          
          if (resultado.posicion9Box) {
            distribucion9Box[resultado.posicion9Box] = (distribucion9Box[resultado.posicion9Box] || 0) + 1;
          }
        });

        // Obtener respuestas a preguntas abiertas de los miembros
        const { data: evaluacionesData } = await supabase
          .from("evaluations")
          .select(`
            id,
            open_question_responses(
              pregunta_id,
              respuesta,
              open_questions(pregunta, tipo)
            )
          `)
          .in("usuario_id", miembrosIds)
          .eq("periodo_id", periodoId)
          .eq("tipo", "auto");

        evaluacionesData?.forEach((evaluation) => {
          const responses = evaluation.open_question_responses as any[];
          responses?.forEach((resp) => {
            const pregunta = resp.open_questions;
            if (pregunta?.tipo === "capacitacion" && resp.respuesta) {
              necesidadesCapacitacion.push(resp.respuesta);
            }
            if (pregunta?.tipo === "herramienta" && resp.respuesta) {
              necesidadesHerramientas.push(resp.respuesta);
            }
          });
        });

        stats[grupo.id] = {
          grupoId: grupo.id,
          nombreGrupo: grupo.nombre,
          totalMiembros: grupo.miembros.length,
          evaluacionesCompletadas: completadas,
          promedioDesempeno: completadas > 0 ? totalDesempeno / completadas : 0,
          promedioPotencial: completadas > 0 ? totalPotencial / completadas : 0,
          distribucion9Box,
          necesidadesCapacitacion: [...new Set(necesidadesCapacitacion)],
          necesidadesHerramientas: [...new Set(necesidadesHerramientas)],
        };
      }

      setGroupStats(stats);
      if (grupos.length > 0) {
        setSelectedGroup(grupos[0].id);
      }
    } catch (error: any) {
      console.error("Error loading group stats:", error);
      toast.error("Error al cargar estadísticas grupales");
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00", "#ff00ff", "#00ffff", "#ff0000", "#0000ff"];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <p>Cargando estadísticas...</p>
        </main>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tiene grupos asignados</h3>
              <p className="text-muted-foreground">
                Las estadísticas grupales estarán disponibles cuando tenga grupos/cuadrillas asignados.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const currentStats = selectedGroup ? groupStats[selectedGroup] : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Estadísticas Grupales
              </h1>
              <p className="text-muted-foreground">
                Análisis del desempeño de sus grupos/cuadrillas - Periodo 2025-1
              </p>
            </div>
            {currentStats && (
              <Button
                variant="outline"
                onClick={() => {
                  const exportData: ExportData = {
                    title: `Estadísticas Grupales - ${currentStats.nombreGrupo}`,
                    subtitle: "Análisis de Desempeño del Grupo",
                    periodo: "2025-1",
                    fecha: format(new Date(), "dd/MM/yyyy HH:mm"),
                    summary: [
                      { label: "Total Miembros", value: currentStats.totalMiembros },
                      { label: "Evaluaciones Completadas", value: currentStats.evaluacionesCompletadas },
                      { label: "Porcentaje Completitud", value: `${Math.round((currentStats.evaluacionesCompletadas / currentStats.totalMiembros) * 100)}%` },
                      { label: "Promedio Desempeño", value: `${scoreToPercentage(currentStats.promedioDesempeno)}%` },
                      { label: "Promedio Potencial", value: `${scoreToPercentage(currentStats.promedioPotencial)}%` },
                    ],
                    tables: [
                      {
                        title: "Distribución 9-Box",
                        headers: ["Posición", "Cantidad"],
                        rows: Object.entries(currentStats.distribucion9Box)
                          .filter(([_, count]) => count > 0)
                          .map(([position, count]) => [
                            position.replace("-", " ").toUpperCase(),
                            count,
                          ]),
                      },
                      ...(currentStats.necesidadesCapacitacion.length > 0 ? [{
                        title: "Necesidades de Capacitación",
                        headers: ["Necesidad"],
                        rows: currentStats.necesidadesCapacitacion.map((n: string) => [n]),
                      }] : []),
                      ...(currentStats.necesidadesHerramientas.length > 0 ? [{
                        title: "Necesidades de Herramientas",
                        headers: ["Necesidad"],
                        rows: currentStats.necesidadesHerramientas.map((n: string) => [n]),
                      }] : []),
                    ],
                  };
                  exportToExcel(exportData, `estadisticas_grupales_${currentStats.nombreGrupo.replace(/\s+/g, "_")}_2025-1.xlsx`);
                  toast.success("Estadísticas exportadas a Excel");
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
            )}
          </div>
        </div>

        {/* Selector de Grupo */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Seleccionar Grupo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((grupo) => {
                const stats = groupStats[grupo.id];
                const porcentajeCompletitud = stats && stats.totalMiembros > 0
                  ? Math.round((stats.evaluacionesCompletadas / stats.totalMiembros) * 100)
                  : 0;

                return (
                  <Card
                    key={grupo.id}
                    className={`cursor-pointer transition-all ${
                      selectedGroup === grupo.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedGroup(grupo.id)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{grupo.nombre}</CardTitle>
                      <CardDescription>{grupo.tipo}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Miembros:</span>
                          <span className="font-medium">{grupo.miembros.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Completadas:</span>
                          <span className="font-medium">
                            {stats?.evaluacionesCompletadas || 0}/{grupo.miembros.length}
                          </span>
                        </div>
                        <Progress value={porcentajeCompletitud} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas del Grupo Seleccionado */}
        {currentStats && (
          <>
            {/* Resumen */}
            <div className="grid gap-6 mb-6 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Total Miembros</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{currentStats.totalMiembros}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Completadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-success">{currentStats.evaluacionesCompletadas}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((currentStats.evaluacionesCompletadas / currentStats.totalMiembros) * 100)}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Promedio Desempeño</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-info">
                    {scoreToPercentage(currentStats.promedioDesempeno)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ({currentStats.promedioDesempeno.toFixed(2)}/5.0)
                  </p>
                  <Progress value={scoreToPercentage(currentStats.promedioDesempeno)} className="mt-2 h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Promedio Potencial</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-accent">
                    {scoreToPercentage(currentStats.promedioPotencial)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ({currentStats.promedioPotencial.toFixed(2)}/5.0)
                  </p>
                  <Progress value={scoreToPercentage(currentStats.promedioPotencial)} className="mt-2 h-2" />
                </CardContent>
              </Card>
            </div>

            {/* Distribución 9-Box */}
            {Object.keys(currentStats.distribucion9Box).length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Distribución en Matriz 9-Box</CardTitle>
                  <CardDescription>
                    Clasificación del grupo según desempeño y potencial
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={Object.entries(currentStats.distribucion9Box).map(([name, value]) => ({
                          name: name.replace("-", " ").toUpperCase(),
                          value,
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.keys(currentStats.distribucion9Box).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Necesidades Identificadas */}
            <div className="grid gap-6 mb-6 md:grid-cols-2">
              {currentStats.necesidadesCapacitacion.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Necesidades de Capacitación
                    </CardTitle>
                    <CardDescription>
                      Identificadas por los miembros del grupo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {currentStats.necesidadesCapacitacion.map((necesidad, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{necesidad}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {currentStats.necesidadesHerramientas.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Necesidades de Herramientas
                    </CardTitle>
                    <CardDescription>
                      Recursos solicitados por el grupo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {currentStats.necesidadesHerramientas.map((necesidad, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{necesidad}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Feedback Grupal Sugerido */}
            <Card>
              <CardHeader>
                <CardTitle>Feedback Grupal Sugerido</CardTitle>
                <CardDescription>
                  Recomendaciones para feedback grupal basadas en el análisis del grupo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm">
                      <strong>Resumen del Desempeño:</strong> El grupo {currentStats.nombreGrupo} presenta un 
                      promedio de desempeño de {scoreToPercentage(currentStats.promedioDesempeno)}% ({currentStats.promedioDesempeno.toFixed(2)}/5.0) y un potencial 
                      promedio de {scoreToPercentage(currentStats.promedioPotencial)}% ({currentStats.promedioPotencial.toFixed(2)}/5.0). 
                      {currentStats.evaluacionesCompletadas === currentStats.totalMiembros 
                        ? " Todas las evaluaciones han sido completadas." 
                        : ` Faltan ${currentStats.totalMiembros - currentStats.evaluacionesCompletadas} evaluaciones por completar.`}
                    </p>
                  </div>
                  
                  {currentStats.necesidadesCapacitacion.length > 0 && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">Áreas de Capacitación Identificadas:</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {currentStats.necesidadesCapacitacion.slice(0, 3).map((n, i) => (
                          <li key={i}>{n}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {currentStats.necesidadesHerramientas.length > 0 && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">Recursos Necesarios:</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {currentStats.necesidadesHerramientas.slice(0, 3).map((n, i) => (
                          <li key={i}>{n}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default EstadisticasGrupales;

