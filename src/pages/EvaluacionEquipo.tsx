import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileEdit, CheckCircle2, Clock, Grid3x3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getJefeEvaluationDraft, hasJefeEvaluation } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const EvaluacionEquipo = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamStatus, setTeamStatus] = useState<Record<string, { estado: string; progreso: number }>>({});

  useEffect(() => {
    if (!user) return;
    loadTeamMembers();
  }, [user]);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      
      // Cargar colaboradores asignados desde Supabase
      const { data: assignments, error: assignmentsError } = await supabase
        .from("user_assignments")
        .select(`
          colaborador_id,
          periodo_id,
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
        .eq("periodo_id", "2025-1");

      if (assignmentsError) throw assignmentsError;

      // Formatear datos de colaboradores
      const members = (assignments || []).map((assignment: any) => {
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

      setTeamMembers(members);

      // Cargar estado de evaluaciones
      const status: Record<string, { estado: string; progreso: number }> = {};
      
      for (const colaborador of members) {
        const evaluado = await hasJefeEvaluation(user.dpi, colaborador.dpi, "2025-1");
        if (evaluado) {
          const draft = await getJefeEvaluationDraft(user.dpi, colaborador.dpi, "2025-1");
          status[colaborador.id] = {
            estado: "completado",
            progreso: draft?.progreso || 100,
          };
        } else {
          const draft = await getJefeEvaluationDraft(user.dpi, colaborador.dpi, "2025-1");
          if (draft) {
            status[colaborador.id] = {
              estado: "en_progreso",
              progreso: draft.progreso,
            };
          } else {
            status[colaborador.id] = {
              estado: "pendiente",
              progreso: 0,
            };
          }
        }
      }

      setTeamStatus(status);
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

  const getStatusBadge = (estado: string) => {
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
                        <CardTitle>{colaborador.nombre}</CardTitle>
                        <CardDescription>
                          {colaborador.cargo} • {colaborador.area} • Nivel {colaborador.nivel}
                        </CardDescription>
                      </div>
                      {getStatusBadge(status.estado)}
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
