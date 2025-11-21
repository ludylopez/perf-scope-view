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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, User, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface ColaboradorAutoevaluacion {
  dpi: string;
  nombre: string;
  apellidos: string;
  cargo: string;
  area: string;
  nivel: string;
  correo: string;
  estado: "completada" | "en_progreso" | "pendiente";
  fechaEnvio?: string;
  fechaUltimaModificacion?: string;
  progreso: number;
}

const VistaAutoevaluacionesColaboradores = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const periodoId = searchParams.get("periodo") || "";
  const tabParam = searchParams.get("tab") || "todos";

  const [colaboradores, setColaboradores] = useState<ColaboradorAutoevaluacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePeriodId, setActivePeriodId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>(tabParam);

  useEffect(() => {
    if (!user || (user.rol !== "admin_rrhh" && user.rol !== "admin_general")) {
      navigate("/dashboard");
      return;
    }

    loadData();
    // Actualizar tab activo cuando cambia el parámetro de URL
    setActiveTab(tabParam);
  }, [user, navigate, periodoId, tabParam]);

  const getActivePeriodId = async (): Promise<string> => {
    const { data } = await supabase
      .from("evaluation_periods")
      .select("id")
      .eq("estado", "en_curso")
      .single();
    return data?.id || "";
  };

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

      // Obtener todos los colaboradores activos
      const { data: colaboradoresData, error: colaboradoresError } = await supabase
        .from("users")
        .select("dpi, nombre, apellidos, cargo, area, nivel, correo")
        .eq("rol", "colaborador")
        .eq("estado", "activo")
        .order("nombre", { ascending: true });

      if (colaboradoresError) throw colaboradoresError;

      if (!colaboradoresData || colaboradoresData.length === 0) {
        setColaboradores([]);
        return;
      }

      const colaboradoresIds = colaboradoresData.map(c => c.dpi);

      // Obtener todas las autoevaluaciones de estos colaboradores
      const { data: autoevaluacionesData, error: autoevaluacionesError } = await supabase
        .from("evaluations")
        .select("*")
        .eq("periodo_id", periodoFinal)
        .eq("tipo", "auto")
        .in("usuario_id", colaboradoresIds);

      if (autoevaluacionesError) {
        console.error("Error cargando autoevaluaciones:", autoevaluacionesError);
      }

      // Crear mapa de autoevaluaciones por usuario_id
      const autoevaluacionesMap = new Map();
      autoevaluacionesData?.forEach((auto) => {
        autoevaluacionesMap.set(auto.usuario_id, auto);
      });

      // Combinar datos de colaboradores con sus autoevaluaciones
      const colaboradoresConEstado: ColaboradorAutoevaluacion[] = colaboradoresData.map((colaborador) => {
        const autoevaluacion = autoevaluacionesMap.get(colaborador.dpi);

        if (!autoevaluacion) {
          return {
            dpi: colaborador.dpi,
            nombre: colaborador.nombre,
            apellidos: colaborador.apellidos,
            cargo: colaborador.cargo,
            area: colaborador.area,
            nivel: colaborador.nivel,
            correo: colaborador.correo || "",
            estado: "pendiente",
            progreso: 0,
          };
        }

        const estado = autoevaluacion.estado === "enviado" 
          ? "completada" 
          : autoevaluacion.estado === "borrador" 
          ? "en_progreso" 
          : "pendiente";

        return {
          dpi: colaborador.dpi,
          nombre: colaborador.nombre,
          apellidos: colaborador.apellidos,
          cargo: colaborador.cargo,
          area: colaborador.area,
          nivel: colaborador.nivel,
          correo: colaborador.correo || "",
          estado,
          fechaEnvio: autoevaluacion.fecha_envio,
          fechaUltimaModificacion: autoevaluacion.fecha_ultima_modificacion,
          progreso: autoevaluacion.progreso || 0,
        };
      });

      setColaboradores(colaboradoresConEstado);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  // Ordenar colaboradores: completadas primero (más recientes primero), luego en progreso, luego pendientes
  const colaboradoresOrdenados = [...colaboradores].sort((a, b) => {
    // Primero por estado: completadas > en_progreso > pendiente
    const estadoOrder = { completada: 1, en_progreso: 2, pendiente: 3 };
    const estadoDiff = estadoOrder[a.estado] - estadoOrder[b.estado];
    
    if (estadoDiff !== 0) return estadoDiff;
    
    // Si tienen el mismo estado, ordenar por fecha (más recientes primero)
    if (a.estado === "completada" && b.estado === "completada") {
      const fechaA = a.fechaEnvio ? new Date(a.fechaEnvio).getTime() : 0;
      const fechaB = b.fechaEnvio ? new Date(b.fechaEnvio).getTime() : 0;
      return fechaB - fechaA; // Descendente (más reciente primero)
    }
    
    if (a.estado === "en_progreso" && b.estado === "en_progreso") {
      const fechaA = a.fechaUltimaModificacion ? new Date(a.fechaUltimaModificacion).getTime() : 0;
      const fechaB = b.fechaUltimaModificacion ? new Date(b.fechaUltimaModificacion).getTime() : 0;
      return fechaB - fechaA; // Descendente (más reciente primero)
    }
    
    return 0;
  });

  const completadas = colaboradoresOrdenados.filter(c => c.estado === "completada");
  const enProgreso = colaboradoresOrdenados.filter(c => c.estado === "en_progreso");
  const pendientes = colaboradoresOrdenados.filter(c => c.estado === "pendiente");
  const total = colaboradores.length;

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "completada":
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Completada</Badge>;
      case "en_progreso":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En Progreso</Badge>;
      case "pendiente":
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Pendiente</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
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
              <User className="h-5 w-5 text-primary" />
              Autoevaluaciones de Colaboradores
            </CardTitle>
            <CardDescription>
              Detalle del estado de autoevaluación de cada colaborador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-2xl font-bold text-primary">{total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-2xl font-bold text-success">{completadas.length}</p>
                <p className="text-sm text-muted-foreground">Completadas</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-2xl font-bold text-info">{enProgreso.length}</p>
                <p className="text-sm text-muted-foreground">En Progreso</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-2xl font-bold text-warning">{pendientes.length}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="todos">Todos ({total})</TabsTrigger>
                <TabsTrigger value="completadas">Completadas ({completadas.length})</TabsTrigger>
                <TabsTrigger value="en_progreso">En Progreso ({enProgreso.length})</TabsTrigger>
                <TabsTrigger value="pendientes">Pendientes ({pendientes.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="todos" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Nivel</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Progreso</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {colaboradoresOrdenados.map((colaborador) => (
                      <TableRow
                        key={colaborador.dpi}
                        className={colaborador.estado === "completada" ? "bg-green-50/50 dark:bg-green-950/20" : ""}
                      >
                        <TableCell className="font-medium">
                          {colaborador.nombre} {colaborador.apellidos}
                        </TableCell>
                        <TableCell>{colaborador.cargo}</TableCell>
                        <TableCell>{colaborador.area}</TableCell>
                        <TableCell>{colaborador.nivel}</TableCell>
                        <TableCell>{getEstadoBadge(colaborador.estado)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  colaborador.estado === "completada" ? "bg-success" : "bg-info"
                                }`}
                                style={{ width: `${colaborador.progreso}%` }}
                              />
                            </div>
                            <span className="text-sm">{colaborador.progreso}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {colaborador.fechaEnvio
                            ? new Date(colaborador.fechaEnvio).toLocaleDateString("es-ES", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : colaborador.fechaUltimaModificacion
                            ? new Date(colaborador.fechaUltimaModificacion).toLocaleDateString("es-ES", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="completadas" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Nivel</TableHead>
                      <TableHead>Fecha de Envío</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completadas
                      .sort((a, b) => {
                        // Ordenar por fecha de envío descendente (más recientes primero)
                        const fechaA = a.fechaEnvio ? new Date(a.fechaEnvio).getTime() : 0;
                        const fechaB = b.fechaEnvio ? new Date(b.fechaEnvio).getTime() : 0;
                        return fechaB - fechaA;
                      })
                      .map((colaborador) => (
                      <TableRow
                        key={colaborador.dpi}
                        className="bg-green-50/50 dark:bg-green-950/20"
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            {colaborador.nombre} {colaborador.apellidos}
                          </div>
                        </TableCell>
                        <TableCell>{colaborador.cargo}</TableCell>
                        <TableCell>{colaborador.area}</TableCell>
                        <TableCell>{colaborador.nivel}</TableCell>
                        <TableCell>
                          {colaborador.fechaEnvio
                            ? new Date(colaborador.fechaEnvio).toLocaleDateString("es-ES", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="en_progreso" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Progreso</TableHead>
                      <TableHead>Última Actualización</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enProgreso
                      .sort((a, b) => {
                        // Ordenar por última actualización descendente (más recientes primero)
                        const fechaA = a.fechaUltimaModificacion ? new Date(a.fechaUltimaModificacion).getTime() : 0;
                        const fechaB = b.fechaUltimaModificacion ? new Date(b.fechaUltimaModificacion).getTime() : 0;
                        return fechaB - fechaA;
                      })
                      .map((colaborador) => (
                      <TableRow key={colaborador.dpi}>
                        <TableCell className="font-medium">
                          {colaborador.nombre} {colaborador.apellidos}
                        </TableCell>
                        <TableCell>{colaborador.cargo}</TableCell>
                        <TableCell>{colaborador.area}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-info transition-all"
                                style={{ width: `${colaborador.progreso}%` }}
                              />
                            </div>
                            <span className="text-sm">{colaborador.progreso}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {colaborador.fechaUltimaModificacion
                            ? new Date(colaborador.fechaUltimaModificacion).toLocaleDateString("es-ES", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {colaborador.correo && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                window.location.href = `mailto:${colaborador.correo}?subject=Recordatorio: Complete su Autoevaluación&body=Estimado/a ${colaborador.nombre} ${colaborador.apellidos},%0D%0A%0D%0ASu autoevaluación está en progreso (${colaborador.progreso}% completada).%0D%0A%0D%0APor favor complete su autoevaluación.`;
                                toast.info("Abriendo cliente de correo");
                              }}
                            >
                              <Mail className="h-4 w-4 mr-1" />
                              Recordatorio
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="pendientes" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Nivel</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendientes.map((colaborador) => (
                      <TableRow key={colaborador.dpi}>
                        <TableCell className="font-medium">
                          {colaborador.nombre} {colaborador.apellidos}
                        </TableCell>
                        <TableCell>{colaborador.cargo}</TableCell>
                        <TableCell>{colaborador.area}</TableCell>
                        <TableCell>{colaborador.nivel}</TableCell>
                        <TableCell>
                          {colaborador.correo && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                window.location.href = `mailto:${colaborador.correo}?subject=Recordatorio: Inicie su Autoevaluación&body=Estimado/a ${colaborador.nombre} ${colaborador.apellidos},%0D%0A%0D%0ANo ha iniciado su autoevaluación aún.%0D%0A%0D%0APor favor complete su autoevaluación.`;
                                toast.info("Abriendo cliente de correo");
                              }}
                            >
                              <Mail className="h-4 w-4 mr-1" />
                              Recordatorio
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default VistaAutoevaluacionesColaboradores;

