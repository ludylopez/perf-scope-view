import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Grid3x3, Users, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { calculateCompleteFinalScore, getNineBoxDescription } from "@/lib/finalScore";
import { getInstrumentForUser } from "@/lib/instruments";
import { scoreToPercentage } from "@/lib/calculations";
import { getFinalResultFromSupabase } from "@/lib/finalResultSupabase";
import { hasJefeEvaluation, getJefeEvaluationDraft, getSubmittedEvaluation } from "@/lib/storage";

interface TeamMember9Box {
  dpi: string;
  nombre: string;
  cargo: string;
  area: string;
  nivel: string;
  desempenoFinal: number;
  potencial?: number;
  posicion9Box: string;
  desempenoPorcentaje: number;
  potencialPorcentaje?: number;
}

interface NineBoxData {
  "alto-alto": TeamMember9Box[];
  "alto-medio": TeamMember9Box[];
  "alto-bajo": TeamMember9Box[];
  "medio-alto": TeamMember9Box[];
  "medio-medio": TeamMember9Box[];
  "medio-bajo": TeamMember9Box[];
  "bajo-alto": TeamMember9Box[];
  "bajo-medio": TeamMember9Box[];
  "bajo-bajo": TeamMember9Box[];
}

const Matriz9Box = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember9Box[]>([]);
  const [nineBoxData, setNineBoxData] = useState<NineBoxData>({
    "alto-alto": [],
    "alto-medio": [],
    "alto-bajo": [],
    "medio-alto": [],
    "medio-medio": [],
    "medio-bajo": [],
    "bajo-alto": [],
    "bajo-medio": [],
    "bajo-bajo": [],
  });

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadTeamNineBox();
  }, [user, navigate]);

  const loadTeamNineBox = async () => {
    try {
      setLoading(true);
      
      // Obtener período activo
      const activePeriod = await getActivePeriod();
      if (!activePeriod) {
        toast.error("No se encontró un período de evaluación activo");
        return;
      }
      const periodoId = activePeriod.id;
      
      // Cargar colaboradores asignados desde Supabase
      // NOTA: Las asignaciones son permanentes, no están vinculadas a períodos específicos
      const { data: assignments, error: assignmentsError } = await supabase
        .from("user_assignments")
        .select(`
          colaborador_id,
          users!user_assignments_colaborador_id_fkey (
            dpi,
            nombre,
            apellidos,
            cargo,
            nivel,
            area
          )
        `)
        .eq("jefe_id", user.dpi)
        .eq("activo", true);

      if (assignmentsError) throw assignmentsError;

      const members: TeamMember9Box[] = [];

      // Para cada colaborador, calcular su posición 9-box
      for (const assignment of assignments || []) {
        const colaborador = Array.isArray(assignment.users) ? assignment.users[0] : assignment.users;
        if (!colaborador) continue;
        
        const colaboradorDpi = colaborador.dpi;

        // Verificar si el jefe completó la evaluación
        const jefeEvaluado = await hasJefeEvaluation(user.dpi, colaboradorDpi, periodoId);
        
        if (!jefeEvaluado) {
          // Si no está evaluado, no se incluye en la matriz
          continue;
        }

        // Primero intentar cargar desde Supabase (más eficiente)
        let resultadoFinal = await getFinalResultFromSupabase(colaboradorDpi, periodoId);

        // Si no está en Supabase, calcular sobre la marcha
        if (!resultadoFinal) {
          // Cargar evaluaciones
          const evaluacionJefe = await getJefeEvaluationDraft(user.dpi, colaboradorDpi, periodoId);
          const autoevaluacion = await getSubmittedEvaluation(colaboradorDpi, periodoId);

          if (!evaluacionJefe || evaluacionJefe.estado !== "enviado" || !autoevaluacion) {
            continue;
          }

          // Obtener instrumento del colaborador
          const instrument = await getInstrumentForUser(colaborador.nivel);
          if (!instrument) continue;

          // Calcular resultado final
          resultadoFinal = await calculateCompleteFinalScore(
            autoevaluacion,
            evaluacionJefe,
            instrument.dimensionesDesempeno,
            instrument.dimensionesPotencial
          );

          if (!resultadoFinal.posicion9Box) continue;
        }

        members.push({
          dpi: colaboradorDpi,
          nombre: `${colaborador.nombre} ${colaborador.apellidos}`,
          cargo: colaborador.cargo,
          area: colaborador.area,
          nivel: colaborador.nivel,
          desempenoFinal: resultadoFinal.desempenoFinal,
          potencial: resultadoFinal.potencial,
          posicion9Box: resultadoFinal.posicion9Box || "medio-medio",
          desempenoPorcentaje: scoreToPercentage(resultadoFinal.desempenoFinal),
          potencialPorcentaje: resultadoFinal.potencial 
            ? scoreToPercentage(resultadoFinal.potencial) 
            : undefined,
        });
      }

      setTeamMembers(members);

      // Organizar por posición 9-box
      const organized: NineBoxData = {
        "alto-alto": [],
        "alto-medio": [],
        "alto-bajo": [],
        "medio-alto": [],
        "medio-medio": [],
        "medio-bajo": [],
        "bajo-alto": [],
        "bajo-medio": [],
        "bajo-bajo": [],
      };

      members.forEach(member => {
        if (member.posicion9Box && organized[member.posicion9Box as keyof NineBoxData]) {
          organized[member.posicion9Box as keyof NineBoxData].push(member);
        }
      });

      setNineBoxData(organized);
    } catch (error: any) {
      console.error("Error loading 9-box matrix:", error);
      toast.error("Error al cargar matriz 9-box");
    } finally {
      setLoading(false);
    }
  };

  const getBoxColor = (position: string): string => {
    const colors: Record<string, string> = {
      "alto-alto": "bg-green-100 border-green-500 dark:bg-green-900/20 dark:border-green-500",
      "alto-medio": "bg-green-50 border-green-400 dark:bg-green-900/10 dark:border-green-400",
      "alto-bajo": "bg-yellow-50 border-yellow-400 dark:bg-yellow-900/10 dark:border-yellow-400",
      "medio-alto": "bg-blue-50 border-blue-400 dark:bg-blue-900/10 dark:border-blue-400",
      "medio-medio": "bg-gray-50 border-gray-300 dark:bg-gray-800 dark:border-gray-600",
      "medio-bajo": "bg-orange-50 border-orange-400 dark:bg-orange-900/10 dark:border-orange-400",
      "bajo-alto": "bg-purple-50 border-purple-400 dark:bg-purple-900/10 dark:border-purple-400",
      "bajo-medio": "bg-red-50 border-red-400 dark:bg-red-900/10 dark:border-red-400",
      "bajo-bajo": "bg-red-100 border-red-500 dark:bg-red-900/20 dark:border-red-500",
    };
    return colors[position] || "bg-gray-50 border-gray-300";
  };

  const getBoxDescription = (position: string): string => {
    const descriptions: Record<string, string> = {
      "alto-alto": "Alto Desempeño - Alto Potencial",
      "alto-medio": "Alto Desempeño - Medio Potencial",
      "alto-bajo": "Alto Desempeño - Bajo Potencial",
      "medio-alto": "Medio Desempeño - Alto Potencial",
      "medio-medio": "Medio Desempeño - Medio Potencial",
      "medio-bajo": "Medio Desempeño - Bajo Potencial",
      "bajo-alto": "Bajo Desempeño - Alto Potencial",
      "bajo-medio": "Bajo Desempeño - Medio Potencial",
      "bajo-bajo": "Bajo Desempeño - Bajo Potencial",
    };
    return descriptions[position] || position;
  };

  const positions: Array<{ key: keyof NineBoxData; label: string; desempeno: string; potencial: string }> = [
    { key: "alto-alto", label: "Alto-Alto", desempeno: "Alto", potencial: "Alto" },
    { key: "alto-medio", label: "Alto-Medio", desempeno: "Alto", potencial: "Medio" },
    { key: "alto-bajo", label: "Alto-Bajo", desempeno: "Alto", potencial: "Bajo" },
    { key: "medio-alto", label: "Medio-Alto", desempeno: "Medio", potencial: "Alto" },
    { key: "medio-medio", label: "Medio-Medio", desempeno: "Medio", potencial: "Medio" },
    { key: "medio-bajo", label: "Medio-Bajo", desempeno: "Medio", potencial: "Bajo" },
    { key: "bajo-alto", label: "Bajo-Alto", desempeno: "Bajo", potencial: "Alto" },
    { key: "bajo-medio", label: "Bajo-Medio", desempeno: "Bajo", potencial: "Medio" },
    { key: "bajo-bajo", label: "Bajo-Bajo", desempeno: "Bajo", potencial: "Bajo" },
  ];

  const totalEvaluados = teamMembers.length;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/evaluacion-equipo")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Equipo
          </Button>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Grid3x3 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Matriz 9-Box</h1>
          </div>
          <p className="text-muted-foreground">
            Distribución de su equipo según desempeño y potencial evaluados
          </p>
        </div>

        {/* Resumen */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">Total de Colaboradores</p>
                <p className="text-2xl font-bold text-primary">{totalEvaluados}</p>
              </div>
              <div className="p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">Alto Potencial</p>
                <p className="text-2xl font-bold text-success">
                  {nineBoxData["alto-alto"].length + 
                   nineBoxData["medio-alto"].length + 
                   nineBoxData["bajo-alto"].length}
                </p>
              </div>
              <div className="p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">Alto Desempeño</p>
                <p className="text-2xl font-bold text-accent">
                  {nineBoxData["alto-alto"].length + 
                   nineBoxData["alto-medio"].length + 
                   nineBoxData["alto-bajo"].length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Cargando matriz 9-box...</p>
            </CardContent>
          </Card>
        ) : totalEvaluados === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay colaboradores evaluados aún</p>
              <p className="text-sm text-muted-foreground mt-2">
                Complete las evaluaciones de sus colaboradores para ver la matriz 9-box
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Matriz 9-Box */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Matriz 9-Box del Equipo</CardTitle>
                <CardDescription>
                  Los colaboradores están ubicados según su desempeño final (70% jefe + 30% colaborador) y potencial
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Leyenda de ejes */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Eje Y:</span>
                      <span>Potencial</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Eje X:</span>
                      <span>Desempeño</span>
                    </div>
                  </div>

                  {/* Grid 3x3 */}
                  <div className="grid grid-cols-3 gap-4">
                    {positions.map((pos) => {
                      const members = nineBoxData[pos.key];
                      return (
                        <div
                          key={pos.key}
                          className={`min-h-[200px] p-4 rounded-lg border-2 ${getBoxColor(pos.key)}`}
                        >
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline" className="text-xs">
                                {pos.label}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {members.length}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground font-medium">
                              {getBoxDescription(pos.key)}
                            </p>
                          </div>
                          
                          <div className="space-y-2 max-h-[150px] overflow-y-auto">
                            {members.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-4">
                                Sin colaboradores
                              </p>
                            ) : (
                              members.map((member) => (
                                <div
                                  key={member.dpi}
                                  className="p-2 rounded bg-background/50 hover:bg-background/80 transition-colors cursor-pointer"
                                  onClick={() => navigate(`/evaluacion-equipo/${member.dpi}/comparativa`)}
                                >
                                  <p className="text-xs font-medium truncate">{member.nombre}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-muted-foreground">
                                      D: {member.desempenoPorcentaje}%
                                    </span>
                                    {member.potencialPorcentaje !== undefined && (
                                      <>
                                        <span className="text-xs">•</span>
                                        <span className="text-xs text-muted-foreground">
                                          P: {member.potencialPorcentaje}%
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Etiquetas de ejes */}
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div className="text-center">
                      <p className="text-xs font-medium text-muted-foreground">Alto</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-muted-foreground">Medio</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-muted-foreground">Bajo</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista detallada por posición */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución Detallada</CardTitle>
                <CardDescription>
                  Lista completa de colaboradores organizados por posición 9-box
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {positions.map((pos) => {
                    const members = nineBoxData[pos.key];
                    if (members.length === 0) return null;

                    return (
                      <div key={pos.key} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-sm">
                            {getBoxDescription(pos.key)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            ({members.length} colaborador{members.length !== 1 ? "es" : ""})
                          </span>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                          {members.map((member) => (
                            <Card
                              key={member.dpi}
                              className="cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => navigate(`/evaluacion-equipo/${member.dpi}/comparativa`)}
                            >
                              <CardContent className="p-4">
                                <p className="font-medium text-sm mb-1">{member.nombre}</p>
                                <p className="text-xs text-muted-foreground mb-2">
                                  {member.cargo} • {member.area}
                                </p>
                                <div className="flex items-center gap-4 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">Desempeño: </span>
                                    <span className="font-medium">
                                      {member.desempenoPorcentaje}% ({member.desempenoFinal.toFixed(2)}/5.0)
                                    </span>
                                  </div>
                                  {member.potencialPorcentaje !== undefined && (
                                    <div>
                                      <span className="text-muted-foreground">Potencial: </span>
                                      <span className="font-medium">
                                        {member.potencialPorcentaje}% ({member.potencial?.toFixed(2)}/5.0)
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default Matriz9Box;

