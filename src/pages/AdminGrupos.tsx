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
import { ArrowLeft, Users, UserPlus, X, Plus, Edit } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GroupWithMembers } from "@/types/group";

const AdminGrupos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGroup, setNewGroup] = useState({
    nombre: "",
    descripcion: "",
    tipo: "equipo" as "cuadrilla" | "equipo" | "departamento" | "otro",
    jefeId: "",
  });
  const [selectedGroup, setSelectedGroup] = useState<GroupWithMembers | null>(null);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [newMemberId, setNewMemberId] = useState("");

  useEffect(() => {
    if (!user || (user.rol !== "admin_rrhh" && user.rol !== "admin_general")) {
      navigate("/dashboard");
      return;
    }
    loadGroups();
  }, [user, navigate]);

  const loadGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("groups")
        .select(`
          *,
          miembros:group_members(
            colaborador_id,
            colaborador:users!group_members_colaborador_id_fkey(dpi, nombre, apellidos, cargo, nivel)
          )
        `)
        .eq("activo", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((item: any) => ({
        id: item.id,
        nombre: item.nombre,
        descripcion: item.descripcion,
        jefeId: item.jefe_id,
        tipo: item.tipo,
        activo: item.activo,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        miembros: item.miembros?.map((m: any) => ({
          colaboradorId: m.colaborador_id,
          nombre: m.colaborador?.nombre || "",
          apellidos: m.colaborador?.apellidos || "",
          cargo: m.colaborador?.cargo || "",
          nivel: m.colaborador?.nivel || "",
        })) || [],
      }));

      setGroups(formattedData);
    } catch (error: any) {
      console.error("Error loading groups:", error);
      toast.error("Error al cargar grupos");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroup.nombre || !newGroup.jefeId) {
      toast.error("Debe completar nombre y jefe responsable");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("groups")
        .insert({
          nombre: newGroup.nombre,
          descripcion: newGroup.descripcion || null,
          jefe_id: newGroup.jefeId,
          tipo: newGroup.tipo,
          activo: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Grupo creado exitosamente");
      setNewGroup({ nombre: "", descripcion: "", tipo: "equipo", jefeId: "" });
      setShowCreateDialog(false);
      loadGroups();
    } catch (error: any) {
      console.error("Error creating group:", error);
      toast.error(error.message || "Error al crear grupo");
    }
  };

  const handleAddMember = async (groupId: string) => {
    if (!newMemberId) {
      toast.error("Debe ingresar el DPI del colaborador");
      return;
    }

    try {
      const { error } = await supabase
        .from("group_members")
        .insert({
          grupo_id: groupId,
          colaborador_id: newMemberId,
          activo: true,
        });

      if (error) throw error;

      toast.success("Miembro agregado exitosamente");
      setNewMemberId("");
      loadGroups();
    } catch (error: any) {
      console.error("Error adding member:", error);
      toast.error(error.message || "Error al agregar miembro");
    }
  };

  const handleRemoveMember = async (groupId: string, colaboradorId: string) => {
    if (!confirm("¿Está seguro de eliminar este miembro del grupo?")) return;

    try {
      const { error } = await supabase
        .from("group_members")
        .update({ activo: false })
        .eq("grupo_id", groupId)
        .eq("colaborador_id", colaboradorId);

      if (error) throw error;

      toast.success("Miembro eliminado");
      loadGroups();
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast.error("Error al eliminar miembro");
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este grupo?")) return;

    try {
      const { error } = await supabase
        .from("groups")
        .update({ activo: false })
        .eq("id", id);

      if (error) throw error;

      toast.success("Grupo eliminado");
      loadGroups();
    } catch (error: any) {
      console.error("Error deleting group:", error);
      toast.error("Error al eliminar grupo");
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
              Gestión de Grupos y Cuadrillas
            </h1>
            <p className="text-muted-foreground mt-2">
              Organice colaboradores en grupos para evaluación grupal
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Crear Grupo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Grupo</DialogTitle>
                <DialogDescription>
                  Cree un grupo o cuadrilla para organizar colaboradores
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre del Grupo</Label>
                  <Input
                    placeholder="Ej: Cuadrilla de Mantenimiento"
                    value={newGroup.nombre}
                    onChange={(e) => setNewGroup({ ...newGroup, nombre: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input
                    placeholder="Descripción opcional"
                    value={newGroup.descripcion}
                    onChange={(e) => setNewGroup({ ...newGroup, descripcion: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={newGroup.tipo}
                    onValueChange={(value: any) => setNewGroup({ ...newGroup, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cuadrilla">Cuadrilla</SelectItem>
                      <SelectItem value="equipo">Equipo</SelectItem>
                      <SelectItem value="departamento">Departamento</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Jefe Responsable (DPI)</Label>
                  <Input
                    placeholder="Ingrese DPI del jefe"
                    value={newGroup.jefeId}
                    onChange={(e) => setNewGroup({ ...newGroup, jefeId: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateGroup}>Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de Grupos */}
        <div className="grid gap-6">
          {groups.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay grupos registrados</p>
              </CardContent>
            </Card>
          ) : (
            groups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {group.nombre}
                        <Badge variant="outline">{group.tipo}</Badge>
                      </CardTitle>
                      {group.descripcion && (
                        <CardDescription className="mt-1">{group.descripcion}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedGroup(group);
                          setShowMembersDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Gestionar Miembros
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteGroup(group.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <p>Total de miembros: {group.miembros.length}</p>
                    <p>Jefe responsable: {group.jefeId}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Dialog para gestionar miembros */}
        <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Gestionar Miembros - {selectedGroup?.nombre}</DialogTitle>
              <DialogDescription>
                Agregue o elimine miembros del grupo
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="DPI del colaborador"
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value)}
                />
                <Button
                  onClick={() => selectedGroup && handleAddMember(selectedGroup.id)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Nivel</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedGroup?.miembros.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No hay miembros en este grupo
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedGroup?.miembros.map((miembro) => (
                      <TableRow key={miembro.colaboradorId}>
                        <TableCell>
                          {miembro.nombre} {miembro.apellidos}
                        </TableCell>
                        <TableCell>{miembro.cargo}</TableCell>
                        <TableCell>{miembro.nivel}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleRemoveMember(selectedGroup!.id, miembro.colaboradorId)
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowMembersDialog(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminGrupos;

