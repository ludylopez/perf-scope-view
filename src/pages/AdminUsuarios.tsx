// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ArrowLeft, Plus, Edit, X, UserPlus, Users, Search, ChevronLeft, ChevronRight, Upload, FileSpreadsheet, Layers } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types/auth";
import { JobLevel } from "@/types/jobLevel";
import { getActiveJobLevels } from "@/lib/jobLevels";
import { ImportUsersDialog } from "@/components/ImportUsersDialog";

const PAGE_SIZE = 50; // OPTIMIZACIÓN: Paginación para manejar 400 usuarios

const AdminUsuarios = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [jobLevels, setJobLevels] = useState<JobLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [newUser, setNewUser] = useState({
    dpi: "",
    nombre: "",
    apellidos: "",
    fechaNacimiento: "",
    fechaIngreso: "",
    tipoPuesto: "" as "" | "administrativo" | "operativo",
    genero: "" as "" | "masculino" | "femenino" | "otro" | "prefiero_no_decir",
    correo: "",
    telefono: "",
    nivel: "",
    cargo: "",
    area: "",
    jefeInmediato: "",
    rol: "colaborador" as User["rol"],
    estado: "activo" as "activo" | "inactivo",
    instrumentoId: "",
  });

  useEffect(() => {
    if (!user || (user.rol !== "admin_rrhh" && user.rol !== "admin_general")) {
      navigate("/dashboard");
      return;
    }
    loadJobLevels();
    loadUsuarios();
  }, [user, navigate]);

  const loadJobLevels = async () => {
    try {
      const levels = await getActiveJobLevels();
      setJobLevels(levels);
    } catch (error) {
      console.error("Error loading job levels:", error);
      toast.error("Error al cargar niveles de puesto");
    }
  };

  const loadUsuarios = async (page: number = 0) => {
    try {
      setLoading(true);
      
      // OPTIMIZACIÓN: Obtener total de usuarios primero (solo count)
      const { count, error: countError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

      if (countError) throw countError;
      setTotalCount(count || 0);

      // OPTIMIZACIÓN: Cargar solo la página actual con paginación
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("nombre", { ascending: true })
        .range(from, to);

      if (error) throw error;

      const formattedData = (data || []).map((item: any) => ({
        dpi: item.dpi,
        nombre: item.nombre,
        apellidos: item.apellidos,
        fechaNacimiento: item.fecha_nacimiento,
        fechaIngreso: item.fecha_ingreso || "",
        tipoPuesto: item.tipo_puesto || "",
        genero: item.genero || "",
        correo: item.correo,
        telefono: item.telefono,
        nivel: item.nivel,
        cargo: item.cargo,
        area: item.area,
        jefeInmediato: item.jefe_inmediato_id,
        rol: item.rol,
        estado: item.estado,
        primerIngreso: item.primer_ingreso,
        instrumentoId: item.instrumento_id,
      }));

      setUsuarios(formattedData);
    } catch (error: any) {
      console.error("Error loading usuarios:", error);
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || (user.rol !== "admin_rrhh" && user.rol !== "admin_general")) {
      navigate("/dashboard");
      return;
    }
    loadUsuarios(currentPage);
  }, [user, navigate, currentPage]);

  const handleCreateUser = async () => {
    if (!newUser.dpi || !newUser.nombre || !newUser.apellidos || !newUser.fechaNacimiento || !newUser.nivel || !newUser.cargo || !newUser.area) {
      toast.error("Debe completar todos los campos requeridos");
      return;
    }

    try {
      // Convertir fecha de nacimiento a formato DDMMAAAA
      const fechaNac = new Date(newUser.fechaNacimiento);
      const fechaNacFormato = `${String(fechaNac.getDate()).padStart(2, '0')}${String(fechaNac.getMonth() + 1).padStart(2, '0')}${fechaNac.getFullYear()}`;

      const { error } = await supabase
        .from("users")
        .insert({
          dpi: newUser.dpi,
          nombre: newUser.nombre,
          apellidos: newUser.apellidos,
          fecha_nacimiento: fechaNacFormato,
          fecha_ingreso: newUser.fechaIngreso || null,
          tipo_puesto: newUser.tipoPuesto || null,
          genero: newUser.genero || null,
          correo: newUser.correo || null,
          telefono: newUser.telefono || null,
          nivel: newUser.nivel,
          cargo: newUser.cargo,
          area: newUser.area,
          jefe_inmediato_id: newUser.jefeInmediato || null,
          rol: newUser.rol,
          estado: newUser.estado,
          primer_ingreso: true,
          instrumento_id: newUser.instrumentoId || null,
        });

      if (error) throw error;

      toast.success("Usuario creado exitosamente");
      setNewUser({
        dpi: "",
        nombre: "",
        apellidos: "",
        fechaNacimiento: "",
        fechaIngreso: "",
        tipoPuesto: "",
        genero: "",
        correo: "",
        telefono: "",
        nivel: "",
        cargo: "",
        area: "",
        jefeInmediato: "",
        rol: "colaborador",
        estado: "activo",
        instrumentoId: "",
      });
      setShowCreateDialog(false);
      loadUsuarios(currentPage);
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Error al crear usuario");
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      // Convertir fecha de nacimiento a formato DDMMAAAA si está en formato date
      let fechaNacFormato = editingUser.fechaNacimiento;
      if (fechaNacFormato.includes('-')) {
        const fechaNac = new Date(fechaNacFormato);
        fechaNacFormato = `${String(fechaNac.getDate()).padStart(2, '0')}${String(fechaNac.getMonth() + 1).padStart(2, '0')}${fechaNac.getFullYear()}`;
      }

      const { error } = await supabase
        .from("users")
        .update({
          nombre: editingUser.nombre,
          apellidos: editingUser.apellidos,
          fecha_nacimiento: fechaNacFormato,
          fecha_ingreso: (editingUser as any).fechaIngreso || null,
          tipo_puesto: (editingUser as any).tipoPuesto || null,
          genero: (editingUser as any).genero || null,
          correo: editingUser.correo || null,
          telefono: editingUser.telefono || null,
          nivel: editingUser.nivel,
          cargo: editingUser.cargo,
          area: editingUser.area,
          jefe_inmediato_id: editingUser.jefeInmediato || null,
          rol: editingUser.rol,
          estado: editingUser.estado,
          instrumento_id: editingUser.instrumentoId || null,
        })
        .eq("dpi", editingUser.dpi);

      if (error) throw error;

      toast.success("Usuario actualizado exitosamente");
      setEditingUser(null);
      loadUsuarios(currentPage);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error.message || "Error al actualizar usuario");
    }
  };

  const handleImportComplete = () => {
    // Recargar usuarios después de importación exitosa
    loadUsuarios(currentPage);
  };

  // OPTIMIZACIÓN: Memoizar el filtrado para evitar recalcular en cada render
  const filteredUsuarios = useMemo(() => {
    if (!searchTerm) return usuarios;
    return usuarios.filter((u) =>
      `${u.nombre} ${u.apellidos} ${u.dpi} ${u.cargo} ${u.area}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [usuarios, searchTerm]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasNextPage = currentPage < totalPages - 1;
  const hasPrevPage = currentPage > 0;

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
              Gestión de Usuarios
            </h1>
            <p className="text-muted-foreground mt-2">
              Administrar usuarios del sistema de evaluación
            </p>
          </div>
        </div>

        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, DPI, cargo o área..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={() => navigate("/admin/niveles")}>
            <Layers className="mr-2 h-4 w-4" />
            Niveles de Puesto
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Crear Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                <DialogDescription>
                  Complete los datos del nuevo usuario
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>DPI *</Label>
                    <Input
                      value={newUser.dpi}
                      onChange={(e) => setNewUser({ ...newUser, dpi: e.target.value })}
                      placeholder="1234567890123"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Nacimiento *</Label>
                    <Input
                      type="date"
                      value={newUser.fechaNacimiento}
                      onChange={(e) => setNewUser({ ...newUser, fechaNacimiento: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Ingreso</Label>
                    <Input
                      type="date"
                      value={newUser.fechaIngreso}
                      onChange={(e) => setNewUser({ ...newUser, fechaIngreso: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Necesaria para determinar elegibilidad de evaluación</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Puesto</Label>
                    <Select
                      value={newUser.tipoPuesto}
                      onValueChange={(value: any) => setNewUser({ ...newUser, tipoPuesto: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="administrativo">Administrativo</SelectItem>
                        <SelectItem value="operativo">Operativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Administrativo: 3 meses mínimo | Operativo: 6 meses mínimo</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Género</Label>
                    <Select
                      value={newUser.genero}
                      onValueChange={(value: any) => setNewUser({ ...newUser, genero: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar género" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="femenino">Femenino</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                        <SelectItem value="prefiero_no_decir">Prefiero no decir</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Para análisis estadísticos</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input
                      value={newUser.nombre}
                      onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellidos *</Label>
                    <Input
                      value={newUser.apellidos}
                      onChange={(e) => setNewUser({ ...newUser, apellidos: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Correo</Label>
                    <Input
                      type="email"
                      value={newUser.correo}
                      onChange={(e) => setNewUser({ ...newUser, correo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                      value={newUser.telefono}
                      onChange={(e) => setNewUser({ ...newUser, telefono: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nivel de Puesto *</Label>
                    <Select
                      value={newUser.nivel}
                      onValueChange={(value) => setNewUser({ ...newUser, nivel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar nivel de puesto" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobLevels.map((level) => (
                          <SelectItem key={level.code} value={level.code}>
                            {level.code} - {level.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      El tipo de puesto se asignará automáticamente según el nivel
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo *</Label>
                    <Input
                      value={newUser.cargo}
                      onChange={(e) => setNewUser({ ...newUser, cargo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Área *</Label>
                    <Input
                      value={newUser.area}
                      onChange={(e) => setNewUser({ ...newUser, area: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Jefe Inmediato (DPI)</Label>
                    <Input
                      value={newUser.jefeInmediato}
                      onChange={(e) => setNewUser({ ...newUser, jefeInmediato: e.target.value })}
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rol</Label>
                    <Select
                      value={newUser.rol}
                      onValueChange={(value: any) => setNewUser({ ...newUser, rol: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="colaborador">Colaborador</SelectItem>
                        <SelectItem value="jefe">Jefe</SelectItem>
                        <SelectItem value="admin_rrhh">Admin RR.HH.</SelectItem>
                        <SelectItem value="admin_general">Admin General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select
                      value={newUser.estado}
                      onValueChange={(value: any) => setNewUser({ ...newUser, estado: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activo">Activo</SelectItem>
                        <SelectItem value="inactivo">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Instrumento Override</Label>
                    <Input
                      value={newUser.instrumentoId}
                      onChange={(e) => setNewUser({ ...newUser, instrumentoId: e.target.value })}
                      placeholder="ID del instrumento (opcional)"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateUser}>Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar Usuarios
          </Button>

          <ImportUsersDialog
            open={showImportDialog}
            onOpenChange={setShowImportDialog}
            onImportComplete={handleImportComplete}
          />
        </div>

        {/* Lista de Usuarios */}
        <Card>
          <CardHeader>
            <CardTitle>Usuarios Registrados</CardTitle>
            <CardDescription>
              {searchTerm 
                ? `Mostrando ${filteredUsuarios.length} resultados filtrados de ${totalCount} usuarios`
                : `Mostrando página ${currentPage + 1} de ${totalPages} (${filteredUsuarios.length} de ${totalCount} usuarios)`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!searchTerm && totalPages > 1 && (
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={!hasPrevPage}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {currentPage + 1} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={!hasNextPage}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DPI</TableHead>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No se encontraron usuarios
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsuarios.map((usuario) => (
                    <TableRow key={usuario.dpi}>
                      <TableCell className="font-mono text-sm">{usuario.dpi}</TableCell>
                      <TableCell>
                        {usuario.nombre} {usuario.apellidos}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{usuario.nivel}</Badge>
                      </TableCell>
                      <TableCell>{usuario.cargo}</TableCell>
                      <TableCell>{usuario.area}</TableCell>
                      <TableCell>
                        <Badge variant={
                          usuario.rol === "admin_general" ? "default" :
                          usuario.rol === "admin_rrhh" ? "default" :
                          usuario.rol === "jefe" ? "secondary" : "outline"
                        }>
                          {usuario.rol}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={usuario.estado === "activo" ? "default" : "secondary"}>
                          {usuario.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingUser(usuario)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog para editar usuario */}
        {editingUser && (
          <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Usuario</DialogTitle>
                <DialogDescription>
                  Modifique los datos del usuario
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>DPI (no editable)</Label>
                    <Input value={editingUser.dpi} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Nacimiento</Label>
                    <Input
                      type="date"
                      value={editingUser.fechaNacimiento}
                      onChange={(e) => setEditingUser({ ...editingUser, fechaNacimiento: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Ingreso</Label>
                    <Input
                      type="date"
                      value={(editingUser as any).fechaIngreso || ""}
                      onChange={(e) => setEditingUser({ ...editingUser, fechaIngreso: e.target.value } as any)}
                    />
                    <p className="text-xs text-muted-foreground">Para cálculo de elegibilidad</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Puesto</Label>
                    <Select
                      value={(editingUser as any).tipoPuesto || ""}
                      onValueChange={(value: any) => setEditingUser({ ...editingUser, tipoPuesto: value } as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="administrativo">Administrativo</SelectItem>
                        <SelectItem value="operativo">Operativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Administrativo: 3 meses mínimo | Operativo: 6 meses mínimo</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Género</Label>
                    <Select
                      value={(editingUser as any).genero || ""}
                      onValueChange={(value: any) => setEditingUser({ ...editingUser, genero: value } as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar género" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="femenino">Femenino</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                        <SelectItem value="prefiero_no_decir">Prefiero no decir</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Para análisis estadísticos</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input
                      value={editingUser.nombre}
                      onChange={(e) => setEditingUser({ ...editingUser, nombre: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellidos</Label>
                    <Input
                      value={editingUser.apellidos}
                      onChange={(e) => setEditingUser({ ...editingUser, apellidos: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Correo</Label>
                    <Input
                      type="email"
                      value={editingUser.correo || ""}
                      onChange={(e) => setEditingUser({ ...editingUser, correo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                      value={editingUser.telefono || ""}
                      onChange={(e) => setEditingUser({ ...editingUser, telefono: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nivel de Puesto</Label>
                    <Select
                      value={editingUser.nivel}
                      onValueChange={(value) => setEditingUser({ ...editingUser, nivel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {jobLevels.map((level) => (
                          <SelectItem key={level.code} value={level.code}>
                            {level.code} - {level.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      El tipo de puesto se actualizará automáticamente
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo</Label>
                    <Input
                      value={editingUser.cargo}
                      onChange={(e) => setEditingUser({ ...editingUser, cargo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Área</Label>
                    <Input
                      value={editingUser.area}
                      onChange={(e) => setEditingUser({ ...editingUser, area: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Jefe Inmediato (DPI)</Label>
                    <Input
                      value={editingUser.jefeInmediato || ""}
                      onChange={(e) => setEditingUser({ ...editingUser, jefeInmediato: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rol</Label>
                    <Select
                      value={editingUser.rol}
                      onValueChange={(value: any) => setEditingUser({ ...editingUser, rol: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="colaborador">Colaborador</SelectItem>
                        <SelectItem value="jefe">Jefe</SelectItem>
                        <SelectItem value="admin_rrhh">Admin RR.HH.</SelectItem>
                        <SelectItem value="admin_general">Admin General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select
                      value={editingUser.estado}
                      onValueChange={(value: any) => setEditingUser({ ...editingUser, estado: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activo">Activo</SelectItem>
                        <SelectItem value="inactivo">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Instrumento Override</Label>
                    <Input
                      value={editingUser.instrumentoId || ""}
                      onChange={(e) => setEditingUser({ ...editingUser, instrumentoId: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingUser(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateUser}>Guardar Cambios</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
};

export default AdminUsuarios;

