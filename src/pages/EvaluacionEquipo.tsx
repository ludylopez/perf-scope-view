import { useState, useEffect, useMemo, memo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileEdit, CheckCircle2, Clock, Grid3x3, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { toast } from "sonner";
import { MultipleEvaluatorsInfo } from "@/types/evaluation";

// Componente memoizado para el badge de estado
const StatusBadge = memo(({ estado }: { estado: string }) => {
  if (estado === "completado") {
    return (
      <Badge className="bg-success text-success-foreground">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Completado
      </Badge>
    );
  }
  if (estado === "en_progreso") {
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
});
StatusBadge.displayName = "StatusBadge";

const EvaluacionEquipo = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamStatus, setTeamStatus] = useState<Record<string, { estado: string; progreso: number }>>({});
  const [multipleEvaluatorsInfo, setMultipleEvaluatorsInfo] = useState<Record<string, MultipleEvaluatorsInfo>>({});
  const [periodoId, setPeriodoId] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    loadPeriodoAndTeam();
  }, [user]);

  const loadPeriodoAndTeam = async () => {
    try {
      // Obtener período activo primero
      const activePeriod = await getActivePeriod();
      if (activePeriod) {
        setPeriodoId(activePeriod.id);
        await loadTeamMembers(activePeriod.id);
      } else {
        // Fallback: buscar período 2025-1 por nombre
        const { data: periodData } = await supabase
          .from("evaluation_periods")
          .select("id")
          .eq("nombre", "2025-1")
          .single();
        if (periodData) {
          setPeriodoId(periodData.id);
          await loadTeamMembers(periodData.id);
        } else {
          toast.error("No se encontró un período de evaluación activo");
        }
      }
    } catch (error: any) {
      console.error("Error loading period:", error);
      toast.error("Error al cargar período de evaluación");
    }
  };

  const loadTeamMembers = async (periodoIdParam: string) => {
    try {
      setLoading(true);
      
      console.log("🔍 [EvaluacionEquipo] Cargando colaboradores para jefe:", {
        jefe_dpi: user!.dpi,
        jefe_nombre: `${user!.nombre} ${user!.apellidos}`,
        jefe_nivel: user!.nivel
      });
      
      // Cargar colaboradores asignados desde Supabase
      // NOTA: Las asignaciones son permanentes, no están vinculadas a períodos específicos
      // Intentar primero con la relación de foreign key
      let { data: assignments, error: assignmentsError } = await supabase
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
        .eq("jefe_id", user!.dpi)
        .eq("activo", true);

      // Si falla la relación o no hay datos, intentar con consulta manual
      if (assignmentsError || !assignments || assignments.length === 0) {
        console.warn("⚠️ [EvaluacionEquipo] Relación FK falló o sin datos, intentando consulta manual...", assignmentsError);
        
        // Consulta alternativa: obtener IDs primero, luego usuarios
        const { data: assignmentIds, error: idsError } = await supabase
          .from("user_assignments")
          .select("colaborador_id")
          .eq("jefe_id", user!.dpi)
          .eq("activo", true);

        if (idsError) {
          console.error("❌ [EvaluacionEquipo] Error al obtener IDs de asignaciones:", idsError);
          throw idsError;
        }

        if (assignmentIds && assignmentIds.length > 0) {
          const colaboradoresIds = assignmentIds.map(a => a.colaborador_id);
          
          const { data: usuarios, error: usuariosError } = await supabase
            .from("users")
            .select("dpi, nombre, apellidos, cargo, nivel, area")
            .in("dpi", colaboradoresIds)
            .eq("estado", "activo");

          if (usuariosError) {
            console.error("❌ [EvaluacionEquipo] Error al obtener usuarios:", usuariosError);
            throw usuariosError;
          }

          // Formatear como si viniera de la relación
          assignments = assignmentIds.map(assignment => ({
            colaborador_id: assignment.colaborador_id,
            users: usuarios?.find(u => u.dpi === assignment.colaborador_id) || null
          })).filter(a => a.users !== null);

          assignmentsError = null;
          console.log("✅ [EvaluacionEquipo] Consulta manual exitosa:", {
            total: assignments.length,
            asignaciones: assignments
          });
        } else {
          console.warn("⚠️ [EvaluacionEquipo] No se encontraron asignaciones activas para este jefe");
        }
      }

      if (assignmentsError && !assignments) {
        console.error("❌ [EvaluacionEquipo] Error al cargar asignaciones:", assignmentsError);
        throw assignmentsError;
      }

      console.log("✅ [EvaluacionEquipo] Asignaciones encontradas:", {
        total: assignments?.length || 0,
        asignaciones: assignments
      });

      // Formatear datos de colaboradores
      const members = (assignments || [])
        .filter((assignment: any) => {
          // Filtrar asignaciones donde el colaborador existe
          if (!assignment.users) {
            console.warn("⚠️ [EvaluacionEquipo] Asignación sin usuario:", assignment);
            return false;
          }
          return true;
        })
        .map((assignment: any) => {
          const colaborador = assignment.users;
          return {
            id: colaborador.dpi,
            dpi: colaborador.dpi,
            nombre: `${colaborador.nombre} ${colaborador.apellidos}`,
            cargo: colaborador.cargo,
            nivel: colaborador.nivel,
            area: colaborador.area,
          };
        });

      console.log("✅ [EvaluacionEquipo] Colaboradores formateados:", {
        total: members.length,
        miembros: members
      });

      setTeamMembers(members);

      // OPTIMIZACIÓN: Cargar todos los estados de evaluaciones de una vez usando query batch
      if (members.length === 0) {
        setTeamStatus({});
        return;
      }

      const colaboradoresIds = members.map(m => m.dpi);
      
      // Obtener todas las evaluaciones del jefe para estos colaboradores en una sola query
      const { data: evaluacionesData, error: evaluacionesError } = await supabase
        .from("evaluations")
        .select("colaborador_id, estado, progreso")
        .eq("evaluador_id", user!.dpi)
        .eq("periodo_id", periodoIdParam)
        .eq("tipo", "jefe")
        .in("colaborador_id", colaboradoresIds);

      if (evaluacionesError) {
        console.error("Error loading evaluations:", evaluacionesError);
        // Continuar con estados por defecto
      }

      // Procesar estados en memoria
      const status: Record<string, { estado: string; progreso: number }> = {};
      
      members.forEach((colaborador) => {
        const evaluacion = evaluacionesData?.find(e => e.colaborador_id === colaborador.dpi);
        
        if (evaluacion) {
          if (evaluacion.estado === "enviado") {
            status[colaborador.id] = {
              estado: "completado",
              progreso: evaluacion.progreso || 100,
            };
          } else {
            status[colaborador.id] = {
              estado: "en_progreso",
              progreso: evaluacion.progreso || 0,
            };
          }
        } else {
          status[colaborador.id] = {
            estado: "pendiente",
            progreso: 0,
          };
        }
      });

      setTeamStatus(status);
      
      // Cargar información de múltiples evaluadores
      await loadMultipleEvaluatorsInfo(members, periodoIdParam);
    } catch (error: any) {
      console.error("Error loading team members:", error);
      toast.error("Error al cargar miembros del equipo");
      // Fallback a datos mock si hay error
      setTeamMembers([
        {
          id: "1",
          dpi: "4567890123104",
          nombre: "Roberto Hernández Silva",
          cargo: "Coordinador",
          nivel: "S2",
          area: "Tecnología",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadMultipleEvaluatorsInfo = async (members: any[], periodoIdParam: string) => {
    try {
      if (members.length === 0) {
        setMultipleEvaluatorsInfo({});
        return;
      }

      const colaboradoresIds = members.map(m => m.dpi);
      
      // Obtener todas las asignaciones activas para estos colaboradores
      const { data: allAssignments, error: assignmentsError } = await supabase
        .from("user_assignments")
        .select(`
          colaborador_id,
          jefe_id,
          users!user_assignments_jefe_id_fkey (
            dpi,
            nombre,
            apellidos
          )
        `)
        .in("colaborador_id", colaboradoresIds)
        .eq("activo", true);

      if (assignmentsError) {
        console.error("Error loading multiple evaluators info:", assignmentsError);
        return;
      }

      // Agrupar por colaborador
      const infoMap: Record<string, MultipleEvaluatorsInfo> = {};
      
      // Usar for...of para manejar await correctamente
      for (const colaborador of members) {
        const asignaciones = allAssignments?.filter(a => a.colaborador_id === colaborador.dpi) || [];
        
        if (asignaciones.length > 0) {
          // Obtener estados de evaluación para cada evaluador
          const evaluadores = asignaciones.map((asignacion: any) => {
            const jefe = asignacion.users;
            return {
              evaluadorId: jefe.dpi,
              evaluadorNombre: `${jefe.nombre} ${jefe.apellidos}`,
            };
          });

          // Verificar estados de evaluación (cambiar 'eval' por 'evaluador' para evitar palabra reservada)
          const evaluadoresConEstado = evaluadores.map(async (evaluador) => {
            const { data: evaluacion } = await supabase
              .from("evaluations")
              .select("estado")
              .eq("colaborador_id", colaborador.dpi)
              .eq("evaluador_id", evaluador.evaluadorId)
              .eq("periodo_id", periodoIdParam)
              .eq("tipo", "jefe")
              .maybeSingle();

            return {
              ...evaluador,
              estadoEvaluacion: evaluacion?.estado === "enviado" 
                ? "enviado" 
                : evaluacion?.estado === "borrador" 
                ? "borrador" 
                : "pendiente" as "pendiente" | "borrador" | "enviado",
            };
          });

          const evaluadoresCompletos = await Promise.all(evaluadoresConEstado);

          infoMap[colaborador.dpi] = {
            colaboradorId: colaborador.dpi,
            evaluadores: evaluadoresCompletos,
            totalEvaluadores: evaluadoresCompletos.length,
          };
        }
      }

      setMultipleEvaluatorsInfo(infoMap);
    } catch (error) {
      console.error("Error loading multiple evaluators info:", error);
    }
  };

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Mi Equipo</h1>
              <p className="text-muted-foreground">
                Evalúe el desempeño y potencial de sus colaboradores
              </p>
            </div>
            {teamMembers.length > 0 && (
              <Button 
                variant="outline"
                onClick={() => navigate("/matriz-9box")}
                className="flex items-center gap-2"
              >
                <Grid3x3 className="h-4 w-4" />
                Ver Matriz 9-Box
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Cargando equipo...</p>
              </CardContent>
            </Card>
          ) : teamMembers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No tiene colaboradores asignados para evaluar</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Contacte al administrador para asignar colaboradores a su cargo
                </p>
              </CardContent>
            </Card>
          ) : (
            teamMembers.map((colaborador) => {
              const status = teamStatus[colaborador.id] || { estado: "pendiente", progreso: 0 };
              return (
                <Card key={colaborador.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {colaborador.nombre}
                          {multipleEvaluatorsInfo[colaborador.dpi]?.totalEvaluadores > 1 && (
                            <Badge variant="outline" className="text-xs">
                              <Users className="mr-1 h-3 w-3" />
                              {multipleEvaluatorsInfo[colaborador.dpi].totalEvaluadores} evaluadores
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {colaborador.cargo} • {colaborador.area} • Nivel {colaborador.nivel}
                          {multipleEvaluatorsInfo[colaborador.dpi]?.totalEvaluadores > 1 && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (Evaluado por múltiples jefes)
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <StatusBadge estado={status.estado} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progreso</span>
                          <span className="font-medium">{status.progreso}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full bg-gradient-primary transition-all"
                            style={{ width: `${status.progreso}%` }}
                          />
                        </div>
                      </div>
                      <Button 
                        className="ml-4"
                        onClick={() => {
                          const jefeEvaluado = status.estado === "completado";
                          if (jefeEvaluado) {
                            navigate(`/evaluacion-equipo/${colaborador.id}/comparativa`);
                          } else {
                            navigate(`/evaluacion-equipo/${colaborador.id}`);
                          }
                        }}
                      >
                        <FileEdit className="mr-2 h-4 w-4" />
                        {status.estado === "completado" ? "Ver Comparativa" : "Evaluar"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};

export default EvaluacionEquipo;
