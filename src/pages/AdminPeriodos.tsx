import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Edit, X, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EvaluationPeriod } from "@/types/period";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const AdminPeriodos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [periods, setPeriods] = useState<EvaluationPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<EvaluationPeriod | null>(null);
  const [newPeriod, setNewPeriod] = useState({
    nombre: "",
    fechaInicio: "",
    fechaFin: "",
    fechaCierreAutoevaluacion: "",
    fechaCierreEvaluacionJefe: "",
    descripcion: "",
    estado: "planificado" as "planificado" | "en_curso" | "cerrado" | "finalizado",
  });

  useEffect(() => {
    if (!user || (user.rol !== "admin_rrhh" && user.rol !== "admin_general")) {
      navigate("/dashboard");
      return;
    }
    loadPeriods();
  }, [user, navigate]);

  const loadPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from("evaluation_periods")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((item: any) => ({
        id: item.id,
        nombre: item.nombre,
        fechaInicio: item.fecha_inicio,
        fechaFin: item.fecha_fin,
        fechaCierreAutoevaluacion: item.fecha_cierre_autoevaluacion,
        fechaCierreEvaluacionJefe: item.fecha_cierre_evaluacion_jefe,
        estado: item.estado,
        descripcion: item.descripcion,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));

      setPeriods(formattedData);
    } catch (error: any) {
      console.error("Error loading periods:", error);
      toast.error("Error al cargar períodos");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePeriod = async () => {
    if (!newPeriod.nombre || !newPeriod.fechaInicio || !newPeriod.fechaFin) {
      toast.error("Debe completar todos los campos requeridos");
      return;
    }

    try {
      const { error } = await supabase
        .from("evaluation_periods")
        .insert({
          nombre: newPeriod.nombre,
          fecha_inicio: newPeriod.fechaInicio,
          fecha_fin: newPeriod.fechaFin,
          fecha_cierre_autoevaluacion: newPeriod.fechaCierreAutoevaluacion || newPeriod.fechaFin,
          fecha_cierre_evaluacion_jefe: newPeriod.fechaCierreEvaluacionJefe || newPeriod.fechaFin,
          estado: newPeriod.estado,
          descripcion: newPeriod.descripcion || null,
        });

      if (error) throw error;

      toast.success("Período creado exitosamente");
      setNewPeriod({
        nombre: "",
        fechaInicio: "",
        fechaFin: "",
        fechaCierreAutoevaluacion: "",
        fechaCierreEvaluacionJefe: "",
        descripcion: "",
        estado: "planificado",
      });
      setShowCreateDialog(false);
      loadPeriods();
    } catch (error: any) {
      console.error("Error creating period:", error);
      toast.error(error.message || "Error al crear período");
    }
  };

  const handleUpdatePeriod = async () => {
    if (!editingPeriod) return;

    try {
      const { error } = await supabase
        .from("evaluation_periods")
        .update({
          nombre: editingPeriod.nombre,
          fecha_inicio: editingPeriod.fechaInicio,
          fecha_fin: editingPeriod.fechaFin,
          fecha_cierre_autoevaluacion: editingPeriod.fechaCierreAutoevaluacion,
          fecha_cierre_evaluacion_jefe: editingPeriod.fechaCierreEvaluacionJefe,
          estado: editingPeriod.estado,
          descripcion: editingPeriod.descripcion || null,
        })
        .eq("id", editingPeriod.id);

      if (error) throw error;

      toast.success("Período actualizado exitosamente");
      setEditingPeriod(null);
      loadPeriods();
    } catch (error: any) {
      console.error("Error updating period:", error);
      toast.error(error.message || "Error al actualizar período");
    }
  };

  const handleDeletePeriod = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este período?")) return;

    try {
      const { error } = await supabase
        .from("evaluation_periods")
        .update({ estado: "cerrado" })
        .eq("id", id);

      if (error) throw error;

      toast.success("Período cerrado");
      loadPeriods();
    } catch (error: any) {
      console.error("Error deleting period:", error);
      toast.error("Error al cerrar período");
    }
  };

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { variant: any; label: string }> = {
      planificado: { variant: "outline", label: "Planificado" },
      en_curso: { variant: "default", label: "En Curso" },
      cerrado: { variant: "secondary", label: "Cerrado" },
      finalizado: { variant: "default", label: "Finalizado" },
    };
    const badge = badges[estado] || badges.planificado;
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <p>Cargando...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-foreground mt-4">
              Gestión de Períodos de Evaluación
            </h1>
            <p className="text-muted-foreground mt-2">
              Crear y gestionar períodos de evaluación para el año 2025
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Crear Período
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Período</DialogTitle>
                <DialogDescription>
                  Configure las fechas y estados del período de evaluación
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre del Período</Label>
                  <Input
                    placeholder="Ej: 2025-1 (Enero - Marzo)"
                    value={newPeriod.nombre}
                    onChange={(e) => setNewPeriod({ ...newPeriod, nombre: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Fecha de Inicio</Label>
                    <Input
                      type="datetime-local"
                      value={newPeriod.fechaInicio}
                      onChange={(e) => setNewPeriod({ ...newPeriod, fechaInicio: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Fin</Label>
                    <Input
                      type="datetime-local"
                      value={newPeriod.fechaFin}
                      onChange={(e) => setNewPeriod({ ...newPeriod, fechaFin: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cierre Autoevaluación</Label>
                    <Input
                      type="datetime-local"
                      value={newPeriod.fechaCierreAutoevaluacion}
                      onChange={(e) => setNewPeriod({ ...newPeriod, fechaCierreAutoevaluacion: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cierre Evaluación Jefe</Label>
                    <Input
                      type="datetime-local"
                      value={newPeriod.fechaCierreEvaluacionJefe}
                      onChange={(e) => setNewPeriod({ ...newPeriod, fechaCierreEvaluacionJefe: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={newPeriod.estado}
                    onValueChange={(value: any) => setNewPeriod({ ...newPeriod, estado: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planificado">Planificado</SelectItem>
                      <SelectItem value="en_curso">En Curso</SelectItem>
                      <SelectItem value="cerrado">Cerrado</SelectItem>
                      <SelectItem value="finalizado">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input
                    placeholder="Descripción opcional del período"
                    value={newPeriod.descripcion}
                    onChange={(e) => setNewPeriod({ ...newPeriod, descripcion: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreatePeriod}>Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de Períodos */}
        <Card>
          <CardHeader>
            <CardTitle>Períodos Registrados</CardTitle>
            <CardDescription>
              Total: {periods.length} períodos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Fecha Inicio</TableHead>
                  <TableHead>Fecha Fin</TableHead>
                  <TableHead>Cierre Auto</TableHead>
                  <TableHead>Cierre Jefe</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No hay períodos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  periods.map((period) => (
                    <TableRow key={period.id}>
                      <TableCell className="font-medium">{period.nombre}</TableCell>
                      <TableCell>
                        {format(new Date(period.fechaInicio), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(period.fechaFin), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(period.fechaCierreAutoevaluacion), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(period.fechaCierreEvaluacionJefe), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>{getEstadoBadge(period.estado)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingPeriod(period)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {period.estado !== "finalizado" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePeriod(period.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog para editar período */}
        {editingPeriod && (
          <Dialog open={!!editingPeriod} onOpenChange={(open) => !open && setEditingPeriod(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Editar Período</DialogTitle>
                <DialogDescription>
                  Modifique las fechas y estado del período
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre del Período</Label>
                  <Input
                    value={editingPeriod.nombre}
                    onChange={(e) => setEditingPeriod({ ...editingPeriod, nombre: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Fecha de Inicio</Label>
                    <Input
                      type="datetime-local"
                      value={editingPeriod.fechaInicio.slice(0, 16)}
                      onChange={(e) => setEditingPeriod({ ...editingPeriod, fechaInicio: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Fin</Label>
                    <Input
                      type="datetime-local"
                      value={editingPeriod.fechaFin.slice(0, 16)}
                      onChange={(e) => setEditingPeriod({ ...editingPeriod, fechaFin: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cierre Autoevaluación</Label>
                    <Input
                      type="datetime-local"
                      value={editingPeriod.fechaCierreAutoevaluacion.slice(0, 16)}
                      onChange={(e) => setEditingPeriod({ ...editingPeriod, fechaCierreAutoevaluacion: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cierre Evaluación Jefe</Label>
                    <Input
                      type="datetime-local"
                      value={editingPeriod.fechaCierreEvaluacionJefe.slice(0, 16)}
                      onChange={(e) => setEditingPeriod({ ...editingPeriod, fechaCierreEvaluacionJefe: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={editingPeriod.estado}
                    onValueChange={(value: any) => setEditingPeriod({ ...editingPeriod, estado: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planificado">Planificado</SelectItem>
                      <SelectItem value="en_curso">En Curso</SelectItem>
                      <SelectItem value="cerrado">Cerrado</SelectItem>
                      <SelectItem value="finalizado">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input
                    value={editingPeriod.descripcion || ""}
                    onChange={(e) => setEditingPeriod({ ...editingPeriod, descripcion: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingPeriod(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdatePeriod}>Guardar Cambios</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
};

export default AdminPeriodos;

