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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Edit, Trash2, Users, FileText } from "lucide-react";
import { toast } from "sonner";
import { JobLevelWithCount, JobLevelCategory, CreateJobLevelParams, UpdateJobLevelParams } from "@/types/jobLevel";
import {
  getAllJobLevels,
  createJobLevel,
  updateJobLevel,
  deleteJobLevel,
} from "@/lib/jobLevels";

const AdminNiveles = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [levels, setLevels] = useState<JobLevelWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingLevel, setEditingLevel] = useState<JobLevelWithCount | null>(null);
  const [deletingLevel, setDeletingLevel] = useState<JobLevelWithCount | null>(null);
  const [formData, setFormData] = useState<CreateJobLevelParams & { is_active?: boolean }>({
    code: "",
    name: "",
    hierarchical_order: 1,
    category: "administrativo",
    is_active: true,
  });

  useEffect(() => {
    if (!user || (user.rol !== "admin_rrhh" && user.rol !== "admin_general")) {
      navigate("/dashboard");
      return;
    }
    loadLevels();
  }, [user, navigate]);

  const loadLevels = async () => {
    try {
      setLoading(true);
      const data = await getAllJobLevels(true); // Incluir inactivos
      setLevels(data);
    } catch (error: any) {
      console.error("Error loading job levels:", error);
      toast.error("Error al cargar niveles de puesto");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      hierarchical_order: 1,
      category: "administrativo",
      is_active: true,
    });
  };

  const handleCreate = async () => {
    if (!formData.code || !formData.name || !formData.hierarchical_order) {
      toast.error("Debe completar todos los campos requeridos");
      return;
    }

    // Validar código (solo letras y números)
    if (!/^[A-Z0-9]+$/.test(formData.code)) {
      toast.error("El código debe contener solo letras mayúsculas y números");
      return;
    }

    try {
      const params: CreateJobLevelParams = {
        code: formData.code.toUpperCase(),
        name: formData.name.toUpperCase(),
        hierarchical_order: formData.hierarchical_order,
        category: formData.category,
      };

      const result = await createJobLevel(params);

      if (result.success) {
        toast.success("Nivel de puesto creado exitosamente");
        resetForm();
        setShowCreateDialog(false);
        loadLevels();
      } else {
        toast.error(result.error || "Error al crear nivel de puesto");
      }
    } catch (error: any) {
      console.error("Error creating job level:", error);
      toast.error(error.message || "Error al crear nivel de puesto");
    }
  };

  const handleUpdate = async () => {
    if (!editingLevel || !formData.code || !formData.name || !formData.hierarchical_order) {
      toast.error("Debe completar todos los campos requeridos");
      return;
    }

    try {
      const params: UpdateJobLevelParams = {
        code: editingLevel.code, // El código no se cambia
        name: formData.name.toUpperCase(),
        hierarchical_order: formData.hierarchical_order,
        category: formData.category,
        is_active: formData.is_active ?? true,
      };

      const result = await updateJobLevel(params);

      if (result.success) {
        toast.success("Nivel de puesto actualizado exitosamente");
        setEditingLevel(null);
        resetForm();
        loadLevels();
      } else {
        toast.error(result.error || "Error al actualizar nivel de puesto");
      }
    } catch (error: any) {
      console.error("Error updating job level:", error);
      toast.error(error.message || "Error al actualizar nivel de puesto");
    }
  };

  const handleDelete = async () => {
    if (!deletingLevel) return;

    try {
      const result = await deleteJobLevel(deletingLevel.code);

      if (result.success) {
        toast.success(result.message || "Nivel de puesto eliminado exitosamente");
        setDeletingLevel(null);
        loadLevels();
      } else {
        toast.error(result.error || "Error al eliminar nivel de puesto");
      }
    } catch (error: any) {
      console.error("Error deleting job level:", error);
      toast.error(error.message || "Error al eliminar nivel de puesto");
    }
  };

  const openEditDialog = (level: JobLevelWithCount) => {
    setEditingLevel(level);
    setFormData({
      code: level.code,
      name: level.name,
      hierarchical_order: level.hierarchical_order,
      category: level.category,
      is_active: level.is_active,
    });
  };

  const closeDialog = () => {
    setShowCreateDialog(false);
    setEditingLevel(null);
    resetForm();
  };

  const getCategoryBadge = (category: JobLevelCategory) => {
    const variants: Record<JobLevelCategory, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      administrativo: { variant: "default", label: "Administrativo" },
      operativo: { variant: "secondary", label: "Operativo" },
    };

    const config = variants[category] || { variant: "outline" as const, label: category };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto py-8 px-4">
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/admin/usuarios")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Niveles de Puesto</h1>
              <p className="text-gray-600 mt-1">
                Gestiona los niveles de puesto de la organización
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Nivel
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Niveles de Puesto</CardTitle>
            <CardDescription>
              {levels.length} nivel{levels.length !== 1 ? "es" : ""} configurado{levels.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Usuarios</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {levels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500">
                      No hay niveles de puesto configurados
                    </TableCell>
                  </TableRow>
                ) : (
                  levels.map((level) => (
                    <TableRow key={level.code}>
                      <TableCell className="font-medium">{level.code}</TableCell>
                      <TableCell>{level.name}</TableCell>
                      <TableCell>{level.hierarchical_order}</TableCell>
                      <TableCell>{getCategoryBadge(level.category)}</TableCell>
                      <TableCell>
                        <Badge variant={level.is_active ? "default" : "outline"}>
                          {level.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span>{level.users_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(level)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingLevel(level)}
                            disabled={level.users_count > 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Dialog para Crear/Editar */}
      <Dialog open={showCreateDialog || editingLevel !== null} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingLevel ? "Editar Nivel de Puesto" : "Nuevo Nivel de Puesto"}
            </DialogTitle>
            <DialogDescription>
              {editingLevel
                ? "Modifica los datos del nivel de puesto"
                : "Completa la información del nuevo nivel de puesto"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                placeholder="Ej: A1, D1, O2"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                disabled={!!editingLevel}
                maxLength={10}
              />
              <p className="text-xs text-gray-500">
                Solo letras mayúsculas y números (máximo 10 caracteres)
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                placeholder="Ej: ALCALDE MUNICIPAL"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="hierarchical_order">Orden Jerárquico *</Label>
              <Input
                id="hierarchical_order"
                type="number"
                step="0.1"
                min="0.1"
                placeholder="Ej: 1.0, 1.1, 2.0"
                value={formData.hierarchical_order}
                onChange={(e) =>
                  setFormData({ ...formData, hierarchical_order: parseFloat(e.target.value) || 1 })
                }
              />
              <p className="text-xs text-gray-500">
                Menor valor = mayor jerarquía. Se permiten decimales (ej: 1.1, 1.2)
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Categoría *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value as JobLevelCategory })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                  <SelectItem value="operativo">Operativo</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Define la elegibilidad para evaluación (3 o 6 meses de antigüedad)
              </p>
            </div>

            {editingLevel && (
              <div className="grid gap-2">
                <Label htmlFor="is_active">Estado</Label>
                <Select
                  value={formData.is_active ? "active" : "inactive"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, is_active: value === "active" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button onClick={editingLevel ? handleUpdate : handleCreate}>
              {editingLevel ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Confirmar Eliminación */}
      <AlertDialog open={deletingLevel !== null} onOpenChange={() => setDeletingLevel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar nivel de puesto?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar el nivel <strong>{deletingLevel?.name}</strong> (
              {deletingLevel?.code})?
              <br />
              <br />
              Esta acción no se puede deshacer. Solo se pueden eliminar niveles que no tengan
              usuarios ni instrumentos de evaluación asignados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminNiveles;
