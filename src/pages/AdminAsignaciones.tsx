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
import { ArrowLeft, Upload, UserPlus, Users, X, CheckCircle2, AlertCircle } from "lucide-react";
import { updateUserRoleFromAssignments } from "@/lib/userRoleDetection";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AssignmentWithUsers } from "@/types/assignment";

const AdminAsignaciones = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<AssignmentWithUsers[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [manualAssignment, setManualAssignment] = useState({
    colaboradorId: "",
    jefeId: "",
    grupoId: "",
  });

  useEffect(() => {
    if (!user || (user.rol !== "admin_rrhh" && user.rol !== "admin_general")) {
      navigate("/dashboard");
      return;
    }
    loadAssignments();
  }, [user, navigate]);

  const loadAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from("user_assignments")
        .select(`
          *,
          colaborador:users!user_assignments_colaborador_id_fkey(dpi, nombre, apellidos, cargo, nivel, area),
          jefe:users!user_assignments_jefe_id_fkey(dpi, nombre, apellidos, cargo)
        `)
        .eq("activo", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((item: any) => ({
        id: item.id,
        colaboradorId: item.colaborador_id,
        jefeId: item.jefe_id,
        grupoId: item.grupo_id,
        activo: item.activo,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        colaborador: item.colaborador ? {
          nombre: item.colaborador.nombre,
          apellidos: item.colaborador.apellidos,
          cargo: item.colaborador.cargo,
          nivel: item.colaborador.nivel,
          area: item.colaborador.area,
        } : undefined,
        jefe: item.jefe ? {
          nombre: item.jefe.nombre,
          apellidos: item.jefe.apellidos,
          cargo: item.jefe.cargo,
        } : undefined,
      }));

      setAssignments(formattedData);
    } catch (error: any) {
      console.error("Error loading assignments:", error);
      toast.error("Error al cargar asignaciones");
    } finally {
      setLoading(false);
    }
  };

  const handleManualAssignment = async () => {
    if (!manualAssignment.colaboradorId || !manualAssignment.jefeId) {
      toast.error("Debe seleccionar colaborador y jefe");
      return;
    }

    try {
      const { error } = await supabase
        .from("user_assignments")
        .insert({
          colaborador_id: manualAssignment.colaboradorId,
          jefe_id: manualAssignment.jefeId,
          grupo_id: manualAssignment.grupoId || null,
          activo: true,
        });

      if (error) throw error;

      // Actualizar rol del jefe automáticamente
      await updateUserRoleFromAssignments(manualAssignment.jefeId);

      toast.success("Asignación creada exitosamente");
      setManualAssignment({ colaboradorId: "", jefeId: "", grupoId: "" });
      loadAssignments();
    } catch (error: any) {
      console.error("Error creating assignment:", error);
      toast.error(error.message || "Error al crear asignación");
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      toast.error("Debe seleccionar un archivo");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter(line => line.trim());
        
        // Esperamos formato CSV: colaborador_dpi,jefe_dpi,grupo_id (opcional)
        // Primera línea puede ser header, la omitimos si contiene "colaborador" o "jefe"
        const startIndex = lines[0]?.toLowerCase().includes("colaborador") || 
                          lines[0]?.toLowerCase().includes("jefe") ? 1 : 0;
        
        const assignments = lines.slice(startIndex).map(line => {
          const parts = line.split(",").map(s => s.trim());
          const colaboradorId = parts[0];
          const jefeId = parts[1];
          const grupoId = parts[2] || null;
          
          return {
            colaborador_id: colaboradorId,
            jefe_id: jefeId,
            grupo_id: grupoId,
            activo: true,
          };
        }).filter(a => a.colaborador_id && a.jefe_id && a.colaborador_id.length > 0 && a.jefe_id.length > 0);

        if (assignments.length === 0) {
          toast.error("No se encontraron asignaciones válidas en el archivo");
          return;
        }

        const { error } = await supabase
          .from("user_assignments")
          .insert(assignments);

        if (error) throw error;

        // Actualizar roles de jefes automáticamente
        const jefeIds = [...new Set(assignments.map(a => a.jefe_id))];
        for (const jefeId of jefeIds) {
          await updateUserRoleFromAssignments(jefeId);
        }

        toast.success(`${assignments.length} asignaciones creadas exitosamente`);
        setFile(null);
        setShowImportDialog(false);
        loadAssignments();
      } catch (error: any) {
        console.error("Error importing assignments:", error);
        toast.error(error.message || "Error al importar asignaciones");
      }
    };

    reader.readAsText(file);
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta asignación?")) return;

    try {
      const { error } = await supabase
        .from("user_assignments")
        .update({ activo: false })
        .eq("id", id);

      if (error) throw error;

      toast.success("Asignación eliminada");
      loadAssignments();
    } catch (error: any) {
      console.error("Error deleting assignment:", error);
      toast.error("Error al eliminar asignación");
    }
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
              Gestión de Asignaciones
            </h1>
            <p className="text-muted-foreground mt-2">
              Asignar colaboradores a jefes evaluadores
            </p>
          </div>
        </div>

        <div className="grid gap-6 mb-6">
          {/* Asignación Manual */}
          <Card>
            <CardHeader>
              <CardTitle>Asignación Manual</CardTitle>
              <CardDescription>
                Asigne un colaborador a un jefe evaluador de forma individual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Colaborador (DPI)</Label>
                  <Input
                    placeholder="Ingrese DPI del colaborador"
                    value={manualAssignment.colaboradorId}
                    onChange={(e) => setManualAssignment({ ...manualAssignment, colaboradorId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Jefe Evaluador (DPI)</Label>
                  <Input
                    placeholder="Ingrese DPI del jefe"
                    value={manualAssignment.jefeId}
                    onChange={(e) => setManualAssignment({ ...manualAssignment, jefeId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grupo (Opcional)</Label>
                  <Input
                    placeholder="ID del grupo"
                    value={manualAssignment.grupoId}
                    onChange={(e) => setManualAssignment({ ...manualAssignment, grupoId: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleManualAssignment}>
                <UserPlus className="mr-2 h-4 w-4" />
                Crear Asignación
              </Button>
            </CardContent>
          </Card>

          {/* Importación Masiva */}
          <Card>
            <CardHeader>
              <CardTitle>Importación Masiva</CardTitle>
              <CardDescription>
                Importe múltiples asignaciones desde un archivo CSV
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm font-medium mb-2">Formato CSV esperado:</p>
                <code className="text-xs bg-muted p-2 rounded block mb-2">
                  colaborador_dpi,jefe_dpi,grupo_id(opcional)
                </code>
                <p className="text-xs text-muted-foreground mb-4">
                  Ejemplo: 4567890123104,1234567890123,grupo-uuid-opcional
                </p>
                <p className="text-xs text-muted-foreground">
                  Puede incluir encabezado en la primera línea (se detectará automáticamente)
                </p>
                <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Upload className="mr-2 h-4 w-4" />
                      Seleccionar Archivo CSV
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Importar Asignaciones</DialogTitle>
                      <DialogDescription>
                        Seleccione un archivo CSV con las asignaciones a importar
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Archivo CSV</Label>
                        <Input
                          type="file"
                          accept=".csv"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                      </div>
                      {file && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          {file.name}
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleFileUpload} disabled={!file}>
                        Importar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Asignaciones */}
        <Card>
          <CardHeader>
            <CardTitle>Asignaciones Activas</CardTitle>
            <CardDescription>
              Total: {assignments.length} asignaciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Jefe Evaluador</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No hay asignaciones registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        {assignment.colaborador ? (
                          <div>
                            <p className="font-medium">
                              {assignment.colaborador.nombre} {assignment.colaborador.apellidos}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {assignment.colaborador.cargo} • {assignment.colaborador.nivel}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{assignment.colaboradorId}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {assignment.jefe ? (
                          <div>
                            <p className="font-medium">
                              {assignment.jefe.nombre} {assignment.jefe.apellidos}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {assignment.jefe.cargo}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{assignment.jefeId}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {assignment.grupoId ? (
                          <Badge variant="outline">{assignment.grupoId}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(assignment.createdAt).toLocaleDateString("es-GT")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAssignment(assignment.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminAsignaciones;

