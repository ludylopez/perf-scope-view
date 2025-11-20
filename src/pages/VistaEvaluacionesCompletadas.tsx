import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { ArrowLeft, CheckCircle2, User, Mail, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface EvaluacionCompletada {
  id: string;
  tipo: "jefe"; // Solo evaluaciones de jefes
  usuarioId: string;
  colaboradorId?: string;
  evaluadorId?: string;
  usuario: {
    dpi: string;
    nombre: string;
    apellidos: string;
    cargo: string;
    area: string;
    nivel: string;
  };
  evaluador?: {
    dpi: string;
    nombre: string;
    apellidos: string;
    cargo: string;
  };
  fechaEnvio: string;
  fechaUltimaModificacion: string;
  progreso: number;
}

const VistaEvaluacionesCompletadas = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const periodoId = searchParams.get("periodo") || "";

  const [evaluaciones, setEvaluaciones] = useState<EvaluacionCompletada[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePeriodId, setActivePeriodId] = useState<string>("");

  useEffect(() => {
    if (!user || (user.rol !== "admin_rrhh" && user.rol !== "admin_general")) {
      navigate("/dashboard");
      return;
    }

    loadData();
  }, [user, navigate, periodoId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Obtener período activo
      const periodoFinal = periodoId || await getActivePeriodId();
      setActivePeriodId(periodoFinal);

      if (!periodoFinal) {
        toast.error("No hay período activo");
        return;
      }

      // Obtener solo evaluaciones de jefes completadas (enviadas) - NO autoevaluaciones
      const { data: evaluacionesData, error: evaluacionesError } = await supabase
        .from("evaluations")
        .select("*")
        .eq("periodo_id", periodoFinal)
        .eq("estado", "enviado")
        .eq("tipo", "jefe") // Solo evaluaciones de jefes
        .order("fecha_envio", { ascending: false });

      if (evaluacionesError) {
        throw evaluacionesError;
      }

      if (!evaluacionesData || evaluacionesData.length === 0) {
        setEvaluaciones([]);
        return;
      }

      // Obtener IDs únicos de usuarios y evaluadores
      const usuarioIds = new Set<string>();
      const evaluadorIds = new Set<string>();

      evaluacionesData.forEach((evaluacion) => {
        // Todas son evaluaciones de jefes, así que siempre tenemos colaborador_id y evaluador_id
        if (evaluacion.colaborador_id) {
          usuarioIds.add(evaluacion.colaborador_id);
        }
        if (evaluacion.evaluador_id) {
          evaluadorIds.add(evaluacion.evaluador_id);
        }
      });

      // Cargar información de usuarios
      const { data: usuariosData } = await supabase
        .from("users")
        .select("dpi, nombre, apellidos, cargo, area, nivel")
        .in("dpi", Array.from(usuarioIds));

      const usuariosMap = new Map();
      usuariosData?.forEach((u) => {
        usuariosMap.set(u.dpi, u);
      });

      // Cargar información de evaluadores (jefes)
      let evaluadoresMap = new Map();
      if (evaluadorIds.size > 0) {
        const { data: evaluadoresData } = await supabase
          .from("users")
          .select("dpi, nombre, apellidos, cargo")
          .in("dpi", Array.from(evaluadorIds));

        evaluadoresData?.forEach((e) => {
          evaluadoresMap.set(e.dpi, e);
        });
      }

      // Combinar datos
      const evaluacionesCompletas: EvaluacionCompletada[] = evaluacionesData.map((evaluacion) => {
        const usuario = usuariosMap.get(evaluacion.usuario_id);
        const evaluador = evaluacion.evaluador_id ? evaluadoresMap.get(evaluacion.evaluador_id) : null;
        const colaborador = evaluacion.colaborador_id ? usuariosMap.get(evaluacion.colaborador_id) : null;

        return {
          id: evaluacion.id,
          tipo: evaluacion.tipo,
          usuarioId: evaluacion.usuario_id,
          colaboradorId: evaluacion.colaborador_id,
          evaluadorId: evaluacion.evaluador_id,
          usuario: colaborador || usuario || {
            dpi: evaluacion.usuario_id,
            nombre: "N/A",
            apellidos: "",
            cargo: "N/A",
            area: "N/A",
            nivel: "N/A",
          },
          evaluador: evaluador || undefined,
          fechaEnvio: evaluacion.fecha_envio || evaluacion.fecha_ultima_modificacion,
          fechaUltimaModificacion: evaluacion.fecha_ultima_modificacion,
          progreso: evaluacion.progreso || 100,
        };
      });

      setEvaluaciones(evaluacionesCompletas);
    } catch (error: any) {
      console.error("Error cargando datos:", error);
      toast.error("Error al cargar evaluaciones completadas");
    } finally {
      setLoading(false);
    }
  };

  const getActivePeriodId = async () => {
    const { data } = await supabase
      .from("evaluation_periods")
      .select("id")
      .eq("estado", "en_curso")
      .single();
    return data?.id || "";
  };

  // Todas las evaluaciones son de tipo "jefe" ahora
  const evaluacionesJefe = evaluaciones;

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
              <CheckCircle2 className="h-5 w-5 text-success" />
              Evaluaciones Completadas
            </CardTitle>
            <CardDescription>
              Evaluaciones de jefes que han sido enviadas y completadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-card p-4 text-center">
              <p className="text-3xl font-bold text-success">{evaluacionesJefe.length}</p>
              <p className="text-sm text-muted-foreground">Total Evaluaciones de Jefes Completadas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Evaluaciones de Jefes Completadas</CardTitle>
            <CardDescription>
              Detalle de todas las evaluaciones de jefes enviadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador Evaluado</TableHead>
                  <TableHead>Evaluador (Jefe)</TableHead>
                  <TableHead>Cargo Colaborador</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Fecha de Envío</TableHead>
                  <TableHead>Progreso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluacionesJefe.map((evaluacion) => (
                  <TableRow
                    key={evaluacion.id}
                    className="bg-green-50/50 dark:bg-green-950/20"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        {evaluacion.usuario.nombre} {evaluacion.usuario.apellidos}
                      </div>
                    </TableCell>
                    <TableCell>
                      {evaluacion.evaluador
                        ? `${evaluacion.evaluador.nombre} ${evaluacion.evaluador.apellidos}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>{evaluacion.usuario.cargo}</TableCell>
                    <TableCell>{evaluacion.usuario.area}</TableCell>
                    <TableCell>
                      {new Date(evaluacion.fechaEnvio).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-success transition-all"
                            style={{ width: `${evaluacion.progreso}%` }}
                          />
                        </div>
                        <span className="text-sm">{evaluacion.progreso}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default VistaEvaluacionesCompletadas;

