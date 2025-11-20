import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, FileText, User, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const VistaDetalleJefe = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const periodoId = searchParams.get("periodo") || "";

  const [jefe, setJefe] = useState<any>(null);
  const [evaluaciones, setEvaluaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEsperadas, setTotalEsperadas] = useState(0);

  // Cargar total de asignaciones esperadas
  useEffect(() => {
    const loadTotalEsperadas = async () => {
      if (!id) return;

      const { count } = await supabase
        .from("user_assignments")
        .select("*", { count: "exact", head: true })
        .eq("jefe_id", id)
        .eq("activo", true);

      setTotalEsperadas(count || 0);
    };

    loadTotalEsperadas();
  }, [id]);

  useEffect(() => {
    if (!id) {
      navigate("/admin/dashboard");
      return;
    }

    // Verificar que el usuario tenga permisos (admin o rrhh)
    if (user?.rol !== "admin_general" && user?.rol !== "admin_rrhh") {
      toast.error("No tienes permisos para ver esta información");
      navigate("/admin/dashboard");
      return;
    }

    loadData();
  }, [id, periodoId, user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar información del jefe
      const { data: jefeData, error: jefeError } = await supabase
        .from("users")
        .select("*")
        .eq("dpi", id)
        .single();

      if (jefeError) throw jefeError;
      setJefe(jefeData);

      // Cargar todas las asignaciones activas del jefe
      const periodoFinal = periodoId || (await getActivePeriodId());
      
      if (periodoFinal && id) {
        // 1. Obtener todas las asignaciones activas del jefe
        const { data: asignacionesData, error: asignacionesError } = await supabase
          .from("user_assignments")
          .select(`
            colaborador_id,
            colaborador:users!user_assignments_colaborador_id_fkey(
              dpi,
              nombre,
              apellidos,
              cargo,
              area
            )
          `)
          .eq("jefe_id", id)
          .eq("activo", true);

        if (asignacionesError) throw asignacionesError;

        if (!asignacionesData || asignacionesData.length === 0) {
          setEvaluaciones([]);
          return;
        }

        // 2. Obtener todas las evaluaciones existentes del jefe para este período
        const colaboradoresIds = asignacionesData.map(a => a.colaborador_id).filter(Boolean);
        
        const { data: evaluacionesData, error: evalError } = await supabase
          .from("evaluations")
          .select("*")
          .eq("evaluador_id", id)
          .eq("periodo_id", periodoFinal)
          .eq("tipo", "jefe")
          .in("colaborador_id", colaboradoresIds);

        if (evalError) throw evalError;

        // 3. Crear mapa de evaluaciones por colaborador_id
        const evaluacionesMap = new Map();
        evaluacionesData?.forEach(evaluacion => {
          evaluacionesMap.set(evaluacion.colaborador_id, evaluacion);
        });

        // 4. Combinar asignaciones con evaluaciones (o crear entrada pendiente si no existe)
        const evaluacionesCompletas = asignacionesData.map(asignacion => {
          const colaborador = asignacion.colaborador;
          const evaluacion = evaluacionesMap.get(asignacion.colaborador_id);

          if (evaluacion) {
            // Ya existe evaluación
            return {
              ...evaluacion,
              colaborador: colaborador
            };
          } else {
            // Pendiente - no hay evaluación aún
            return {
              id: null,
              colaborador_id: asignacion.colaborador_id,
              evaluador_id: id,
              periodo_id: periodoFinal,
              tipo: "jefe",
              estado: "pendiente",
              progreso: 0,
              responses: {},
              comments: {},
              created_at: null,
              updated_at: null,
              colaborador: colaborador
            };
          }
        });

        // 5. Ordenar: pendientes primero, luego en progreso, luego completadas
        evaluacionesCompletas.sort((a, b) => {
          const order = { pendiente: 1, borrador: 2, enviado: 3 };
          const aOrder = order[a.estado as keyof typeof order] || 4;
          const bOrder = order[b.estado as keyof typeof order] || 4;
          
          if (aOrder !== bOrder) {
            return aOrder - bOrder;
          }
          
          // Si mismo estado, ordenar por fecha de actualización (más reciente primero)
          const aDate = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const bDate = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return bDate - aDate;
        });

        setEvaluaciones(evaluacionesCompletas);
      }
    } catch (error: any) {
      console.error("Error cargando datos:", error);
      toast.error("Error al cargar información del jefe");
    } finally {
      setLoading(false);
    }
  };

  const getActivePeriodId = async () => {
    const { data } = await supabase
      .from("evaluation_periods")
      .select("id")
      .eq("activo", true)
      .single();
    return data?.id || "";
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "enviado":
        return <Badge className="bg-success text-white"><CheckCircle2 className="h-3 w-3 mr-1" />Completada</Badge>;
      case "borrador":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En Progreso</Badge>;
      default:
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Pendiente</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto p-6">
          <div className="text-center py-12">Cargando...</div>
        </main>
      </div>
    );
  }

  if (!jefe) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Jefe no encontrado</p>
            <Button onClick={() => navigate("/admin/dashboard")} className="mt-4">
              Volver al Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const completadas = evaluaciones.filter(e => e.estado === "enviado").length;
  const enProgreso = evaluaciones.filter(e => e.estado === "borrador").length;
  const pendientes = Math.max(0, totalEsperadas - completadas - enProgreso);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información del Jefe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nombre</p>
                <p className="font-semibold">{jefe.nombre} {jefe.apellidos}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cargo</p>
                <p className="font-semibold">{jefe.cargo || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Área</p>
                <p className="font-semibold">{jefe.area || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nivel</p>
                <p className="font-semibold">{jefe.nivel || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Resumen de Evaluaciones</CardTitle>
            <CardDescription>
              Estado de las evaluaciones realizadas por este jefe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-success">{completadas}</p>
                <p className="text-sm text-muted-foreground">Completadas</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-warning">{enProgreso}</p>
                <p className="text-sm text-muted-foreground">En Progreso</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-destructive">{pendientes}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Evaluaciones por Colaborador
            </CardTitle>
            <CardDescription>
              Lista detallada de todas las evaluaciones: completadas, en progreso y pendientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {evaluaciones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Este jefe no tiene colaboradores asignados</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Última Actualización</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluaciones.map((evaluacion) => {
                    const colaborador = evaluacion.colaborador;
                    const progreso = evaluacion.progreso || 0;
                    const estaCompletada = evaluacion.estado === "enviado";
                    
                    return (
                      <TableRow 
                        key={evaluacion.id}
                        className={estaCompletada ? "bg-green-50/50 dark:bg-green-950/20" : ""}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {estaCompletada && (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            )}
                            {colaborador?.nombre} {colaborador?.apellidos}
                          </div>
                        </TableCell>
                        <TableCell>{colaborador?.cargo || "N/A"}</TableCell>
                        <TableCell>{colaborador?.area || "N/A"}</TableCell>
                        <TableCell>{getEstadoBadge(evaluacion.estado)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${progreso}%` }}
                              />
                            </div>
                            <span className="text-sm">{progreso}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {evaluacion.estado === "pendiente" 
                            ? "Sin iniciar"
                            : evaluacion.updated_at
                            ? new Date(evaluacion.updated_at).toLocaleDateString("es-ES", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default VistaDetalleJefe;

