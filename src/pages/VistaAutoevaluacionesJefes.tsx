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

interface JefeAutoevaluacion {
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

const VistaAutoevaluacionesJefes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const periodoId = searchParams.get("periodo") || "";
  const tabParam = searchParams.get("tab") || "todos";

  const [jefes, setJefes] = useState<JefeAutoevaluacion[]>([]);
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

      // Obtener todos los jefes activos
      const { data: jefesData, error: jefesError } = await supabase
        .from("users")
        .select("dpi, nombre, apellidos, cargo, area, nivel, correo")
        .eq("rol", "jefe")
        .eq("estado", "activo")
        .order("nombre", { ascending: true });

      if (jefesError) throw jefesError;

      if (!jefesData || jefesData.length === 0) {
        setJefes([]);
        return;
      }

      const jefesIds = jefesData.map(j => j.dpi);

      // Obtener todas las autoevaluaciones de estos jefes
      const { data: autoevaluacionesData, error: autoevaluacionesError } = await supabase
        .from("evaluations")
        .select("*")
        .eq("periodo_id", periodoFinal)
        .eq("tipo", "auto")
        .in("usuario_id", jefesIds);

      if (autoevaluacionesError) {
        console.error("Error cargando autoevaluaciones:", autoevaluacionesError);
      }

      // Crear mapa de autoevaluaciones por usuario_id
      const autoevaluacionesMap = new Map();
      autoevaluacionesData?.forEach((auto) => {
        autoevaluacionesMap.set(auto.usuario_id, auto);
      });

      // Combinar datos de jefes con sus autoevaluaciones
      const jefesConAutoevaluacion: JefeAutoevaluacion[] = jefesData.map((jefe) => {
        const autoevaluacion = autoevaluacionesMap.get(jefe.dpi);

        if (autoevaluacion) {
          if (autoevaluacion.estado === "enviado") {
            return {
              dpi: jefe.dpi,
              nombre: jefe.nombre,
              apellidos: jefe.apellidos,
              cargo: jefe.cargo || "N/A",
              area: jefe.area || "N/A",
              nivel: jefe.nivel || "N/A",
              correo: jefe.correo || "",
              estado: "completada",
              fechaEnvio: autoevaluacion.fecha_envio,
              fechaUltimaModificacion: autoevaluacion.fecha_ultima_modificacion,
              progreso: autoevaluacion.progreso || 100,
            };
          } else {
            return {
              dpi: jefe.dpi,
              nombre: jefe.nombre,
              apellidos: jefe.apellidos,
              cargo: jefe.cargo || "N/A",
              area: jefe.area || "N/A",
              nivel: jefe.nivel || "N/A",
              correo: jefe.correo || "",
              estado: "en_progreso",
              fechaUltimaModificacion: autoevaluacion.fecha_ultima_modificacion,
              progreso: autoevaluacion.progreso || 0,
            };
          }
        } else {
          return {
            dpi: jefe.dpi,
            nombre: jefe.nombre,
            apellidos: jefe.apellidos,
            cargo: jefe.cargo || "N/A",
            area: jefe.area || "N/A",
            nivel: jefe.nivel || "N/A",
            correo: jefe.correo || "",
            estado: "pendiente",
            progreso: 0,
          };
        }
      });

      // Ordenar: completadas primero, luego en progreso, luego pendientes
      jefesConAutoevaluacion.sort((a, b) => {
        const order = { completada: 1, en_progreso: 2, pendiente: 3 };
        return order[a.estado] - order[b.estado];
      });

      setJefes(jefesConAutoevaluacion);
    } catch (error: any) {
      console.error("Error cargando datos:", error);
      toast.error("Error al cargar información de autoevaluaciones de jefes");
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

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "completada":
        return (
          <Badge className="bg-success text-white">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completada
          </Badge>
        );
      case "en_progreso":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            En Progreso
          </Badge>
        );
      default:
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
    }
  };

  const completadas = jefes.filter(j => j.estado === "completada").length;
  const enProgreso = jefes.filter(j => j.estado === "en_progreso").length;
  const pendientes = jefes.filter(j => j.estado === "pendiente").length;
  const total = jefes.length;

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
              <User className="h-5 w-5" />
              Autoevaluaciones de Jefes
            </CardTitle>
            <CardDescription>
              Estado de las autoevaluaciones de todos los jefes en el período activo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-success">{completadas}</p>
                <p className="text-sm text-muted-foreground">Completadas</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {total > 0 ? Math.round((completadas / total) * 100) : 0}%
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-info">{enProgreso}</p>
                <p className="text-sm text-muted-foreground">En Progreso</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {total > 0 ? Math.round((enProgreso / total) * 100) : 0}%
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-warning">{pendientes}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {total > 0 ? Math.round((pendientes / total) * 100) : 0}%
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-primary">{total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
                <Progress 
                  value={total > 0 ? (completadas / total) * 100 : 0} 
                  className="mt-2 h-2" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Jefes</CardTitle>
            <CardDescription>
              Detalle del estado de autoevaluación de cada jefe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="todos">Todos ({total})</TabsTrigger>
                <TabsTrigger value="completadas">Completadas ({completadas})</TabsTrigger>
                <TabsTrigger value="en_progreso">En Progreso ({enProgreso})</TabsTrigger>
                <TabsTrigger value="pendientes">Pendientes ({pendientes})</TabsTrigger>
              </TabsList>

              <TabsContent value="todos" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jefe</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Nivel</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Progreso</TableHead>
                      <TableHead>Última Actualización</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jefes.map((jefe) => (
                      <TableRow
                        key={jefe.dpi}
                        className={jefe.estado === "completada" ? "bg-green-50/50 dark:bg-green-950/20" : ""}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {jefe.estado === "completada" && (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            )}
                            {jefe.nombre} {jefe.apellidos}
                          </div>
                        </TableCell>
                        <TableCell>{jefe.cargo}</TableCell>
                        <TableCell>{jefe.area}</TableCell>
                        <TableCell>{jefe.nivel}</TableCell>
                        <TableCell>{getEstadoBadge(jefe.estado)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  jefe.estado === "completada"
                                    ? "bg-success"
                                    : jefe.estado === "en_progreso"
                                    ? "bg-info"
                                    : "bg-warning"
                                }`}
                                style={{ width: `${jefe.progreso}%` }}
                              />
                            </div>
                            <span className="text-sm">{jefe.progreso}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {jefe.estado === "pendiente" ? (
                            "Sin iniciar"
                          ) : jefe.fechaEnvio ? (
                            new Date(jefe.fechaEnvio).toLocaleDateString("es-ES", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          ) : jefe.fechaUltimaModificacion ? (
                            new Date(jefe.fechaUltimaModificacion).toLocaleDateString("es-ES", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                        <TableCell>
                          {jefe.correo && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const estadoTexto = jefe.estado === "completada" 
                                  ? "completada" 
                                  : jefe.estado === "en_progreso"
                                  ? "en progreso"
                                  : "pendiente";
                                window.location.href = `mailto:${jefe.correo}?subject=Recordatorio: Autoevaluación ${estadoTexto}&body=Estimado/a ${jefe.nombre} ${jefe.apellidos},%0D%0A%0D%0ASu autoevaluación está ${estadoTexto}.%0D%0A%0D%0APor favor complete su autoevaluación si aún no lo ha hecho.`;
                                toast.info("Abriendo cliente de correo");
                              }}
                            >
                              <Mail className="h-4 w-4 mr-1" />
                              Enviar Recordatorio
                            </Button>
                          )}
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
                      <TableHead>Jefe</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Fecha de Envío</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jefes
                      .filter((j) => j.estado === "completada")
                      .map((jefe) => (
                        <TableRow
                          key={jefe.dpi}
                          className="bg-green-50/50 dark:bg-green-950/20"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-success" />
                              {jefe.nombre} {jefe.apellidos}
                            </div>
                          </TableCell>
                          <TableCell>{jefe.cargo}</TableCell>
                          <TableCell>{jefe.area}</TableCell>
                          <TableCell>
                            {jefe.fechaEnvio
                              ? new Date(jefe.fechaEnvio).toLocaleDateString("es-ES", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "N/A"}
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
                      <TableHead>Jefe</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Progreso</TableHead>
                      <TableHead>Última Actualización</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jefes
                      .filter((j) => j.estado === "en_progreso")
                      .map((jefe) => (
                        <TableRow key={jefe.dpi}>
                          <TableCell className="font-medium">
                            {jefe.nombre} {jefe.apellidos}
                          </TableCell>
                          <TableCell>{jefe.cargo}</TableCell>
                          <TableCell>{jefe.area}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-info transition-all"
                                  style={{ width: `${jefe.progreso}%` }}
                                />
                              </div>
                              <span className="text-sm">{jefe.progreso}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {jefe.fechaUltimaModificacion
                              ? new Date(jefe.fechaUltimaModificacion).toLocaleDateString("es-ES", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {jefe.correo && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  window.location.href = `mailto:${jefe.correo}?subject=Recordatorio: Complete su Autoevaluación&body=Estimado/a ${jefe.nombre} ${jefe.apellidos},%0D%0A%0D%0ASu autoevaluación está en progreso (${jefe.progreso}% completada).%0D%0A%0D%0APor favor complete su autoevaluación.`;
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
                      <TableHead>Jefe</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Nivel</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jefes
                      .filter((j) => j.estado === "pendiente")
                      .map((jefe) => (
                        <TableRow key={jefe.dpi}>
                          <TableCell className="font-medium">
                            {jefe.nombre} {jefe.apellidos}
                          </TableCell>
                          <TableCell>{jefe.cargo}</TableCell>
                          <TableCell>{jefe.area}</TableCell>
                          <TableCell>{jefe.nivel}</TableCell>
                          <TableCell>
                            {jefe.correo && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  window.location.href = `mailto:${jefe.correo}?subject=Recordatorio: Inicie su Autoevaluación&body=Estimado/a ${jefe.nombre} ${jefe.apellidos},%0D%0A%0D%0ANo ha iniciado su autoevaluación aún.%0D%0A%0D%0APor favor inicie y complete su autoevaluación.`;
                                  toast.info("Abriendo cliente de correo");
                                }}
                              >
                                <Mail className="h-4 w-4 mr-1" />
                                Enviar Recordatorio
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

export default VistaAutoevaluacionesJefes;

