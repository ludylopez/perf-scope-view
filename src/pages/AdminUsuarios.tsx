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

const formatDDMMAAAAToISO = (value: string): string => {
  if (!value) return "";

  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return "";

  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  return `${year}-${month}-${day}`;
};

const ensureFechaNacimientoDDMMAAAA = (value: string): string => {
  if (!value) {
    throw new Error("La fecha de nacimiento es requerida");
  }

  const normalized = normalizeFechaNacimientoDDMMAAAA(value);

  if (!normalized || normalized.length !== 8) {
    throw new Error(`Formato de fecha de nacimiento inválido: "${value}"`);
  }

  return normalized;
};

const normalizeFechaNacimientoDDMMAAAA = (value: string): string => {
  if (!value) return "";

  const trimmed = value.trim();

  if (/^\d{8}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-");
    return `${day}${month}${year}`;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 7) {
    return digits.padStart(8, "0");
  }

  if (digits.length >= 8) {
    return digits.slice(0, 8);
  }

  return "";
};

// Función para calcular edad desde fecha (formato YYYY-MM-DD o DDMMAAAA)
const calcularEdadDesdeFecha = (fecha: string): string | null => {
  if (!fecha) return null;
  
  try {
    let fechaNacimiento: Date;
    
    // Si está en formato YYYY-MM-DD (input date)
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      fechaNacimiento = new Date(fecha);
    } 
    // Si está en formato DDMMAAAA
    else if (/^\d{8}$/.test(fecha)) {
      const day = parseInt(fecha.substring(0, 2));
      const month = parseInt(fecha.substring(2, 4)) - 1; // Meses en JS son 0-11
      const year = parseInt(fecha.substring(4, 8));
      fechaNacimiento = new Date(year, month, day);
    } else {
      return null;
    }
    
    if (isNaN(fechaNacimiento.getTime())) {
      return null;
    }
    
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
    const mesDiff = hoy.getMonth() - fechaNacimiento.getMonth();
    
    if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
      edad--;
    }
    
    return edad >= 0 ? `${edad} años` : null;
  } catch (error) {
    return null;
  }
};

// Función para calcular antigüedad en meses desde fecha de ingreso (formato YYYY-MM-DD)
const calcularAntiguedadDesdeFecha = (fecha: string): string | null => {
  if (!fecha) return null;
  
  try {
    const fechaIngreso = new Date(fecha);
    
    if (isNaN(fechaIngreso.getTime())) {
      return null;
    }
    
    const hoy = new Date();
    let meses = (hoy.getFullYear() - fechaIngreso.getFullYear()) * 12;
    meses += hoy.getMonth() - fechaIngreso.getMonth();
    
    // Ajustar si el día de hoy es menor al día de ingreso
    if (hoy.getDate() < fechaIngreso.getDate()) {
      meses--;
    }
    
    if (meses < 0) {
      return null;
    }
    
    const años = Math.floor(meses / 12);
    const mesesRestantes = meses % 12;
    
    if (años > 0 && mesesRestantes > 0) {
      return `${años} año${años > 1 ? 's' : ''} ${mesesRestantes} mes${mesesRestantes > 1 ? 'es' : ''}`;
    } else if (años > 0) {
      return `${años} año${años > 1 ? 's' : ''}`;
    } else {
      return `${mesesRestantes} mes${mesesRestantes > 1 ? 'es' : ''}`;
    }
  } catch (error) {
    return null;
  }
};

const AdminUsuarios = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [jobLevels, setJobLevels] = useState<JobLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Estados para filtros
  const [filtroNivel, setFiltroNivel] = useState<string>("");
  const [filtroRol, setFiltroRol] = useState<string>("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [filtroTipoPuesto, setFiltroTipoPuesto] = useState<string>("");
  const [filtroArea, setFiltroArea] = useState<string>("");
  const [filtroDireccion, setFiltroDireccion] = useState<string>("");
  const [filtroDepartamento, setFiltroDepartamento] = useState<string>("");
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
    direccionUnidad: "",
    departamentoDependencia: "",
    renglon: "",
    profesion: "",
    jefeInmediato: "",
    rol: "colaborador" as User["rol"],
    estado: "activo" as "activo" | "inactivo",
    instrumentoId: "",
  });

  // Debounce para el término de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms de delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

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

      // Construir query base
      let countQuery = supabase.from("users").select("*", { count: "exact", head: true });
      let dataQuery = supabase.from("users").select("*");

      // Aplicar búsqueda global (busca en múltiples campos)
      if (debouncedSearchTerm) {
        const searchLower = `%${debouncedSearchTerm}%`;
        countQuery = countQuery.or(`dpi.ilike.${searchLower},nombre.ilike.${searchLower},apellidos.ilike.${searchLower},cargo.ilike.${searchLower},area.ilike.${searchLower}`);
        dataQuery = dataQuery.or(`dpi.ilike.${searchLower},nombre.ilike.${searchLower},apellidos.ilike.${searchLower},cargo.ilike.${searchLower},area.ilike.${searchLower}`);
      }

      // Aplicar filtros específicos
      if (filtroNivel) {
        countQuery = countQuery.eq("nivel", filtroNivel);
        dataQuery = dataQuery.eq("nivel", filtroNivel);
      }
      if (filtroRol) {
        countQuery = countQuery.eq("rol", filtroRol);
        dataQuery = dataQuery.eq("rol", filtroRol);
      }
      if (filtroEstado) {
        countQuery = countQuery.eq("estado", filtroEstado);
        dataQuery = dataQuery.eq("estado", filtroEstado);
      }
      if (filtroTipoPuesto) {
        countQuery = countQuery.eq("tipo_puesto", filtroTipoPuesto);
        dataQuery = dataQuery.eq("tipo_puesto", filtroTipoPuesto);
      }
      if (filtroArea) {
        const areaLower = `%${filtroArea}%`;
        countQuery = countQuery.ilike("area", areaLower);
        dataQuery = dataQuery.ilike("area", areaLower);
      }
      if (filtroDireccion) {
        const direccionLower = `%${filtroDireccion}%`;
        countQuery = countQuery.ilike("direccion_unidad", direccionLower);
        dataQuery = dataQuery.ilike("direccion_unidad", direccionLower);
      }
      if (filtroDepartamento) {
        const deptoLower = `%${filtroDepartamento}%`;
        countQuery = countQuery.ilike("departamento_dependencia", deptoLower);
        dataQuery = dataQuery.ilike("departamento_dependencia", deptoLower);
      }

      // Obtener total con filtros aplicados
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      setTotalCount(count || 0);

      // Aplicar paginación y ordenamiento
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      dataQuery = dataQuery.order("nombre", { ascending: true }).range(from, to);

      // Ejecutar query de datos
      const { data, error } = await dataQuery;
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
        direccionUnidad: item.direccion_unidad || "",
        departamentoDependencia: item.departamento_dependencia || "",
        renglon: item.renglon || "",
        profesion: item.profesion || "",
        jefeInmediato: item.jefe_inmediato_id,
        rol: item.rol,
        estado: item.estado,
        edad: item.edad || null,
        antiguedad: item.antiguedad || null,
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

  // Recargar cuando cambien filtros o búsqueda
  useEffect(() => {
    if (!user || (user.rol !== "admin_rrhh" && user.rol !== "admin_general")) {
      return;
    }
    // Resetear a página 1 cuando cambian filtros o búsqueda
    setCurrentPage(0);
  }, [debouncedSearchTerm, filtroNivel, filtroRol, filtroEstado, filtroTipoPuesto, filtroArea, filtroDireccion, filtroDepartamento, user]);

  useEffect(() => {
    if (!user || (user.rol !== "admin_rrhh" && user.rol !== "admin_general")) {
      navigate("/dashboard");
      return;
    }
    loadUsuarios(currentPage);
  }, [user, navigate, currentPage, debouncedSearchTerm, filtroNivel, filtroRol, filtroEstado, filtroTipoPuesto, filtroArea, filtroDireccion, filtroDepartamento]);

  const handleCreateUser = async () => {
    if (!newUser.dpi || !newUser.nombre || !newUser.apellidos || !newUser.fechaNacimiento || !newUser.nivel || !newUser.cargo || !newUser.area) {
      toast.error("Debe completar todos los campos requeridos");
      return;
    }

    try {
      let fechaNacFormato: string;
      try {
        fechaNacFormato = ensureFechaNacimientoDDMMAAAA(newUser.fechaNacimiento);
      } catch (error: any) {
        toast.error(error.message || "Fecha de nacimiento inválida");
        return;
      }

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
          direccion_unidad: newUser.direccionUnidad || null,
          departamento_dependencia: newUser.departamentoDependencia || null,
          renglon: newUser.renglon || null,
          profesion: newUser.profesion || null,
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
        direccionUnidad: "",
        departamentoDependencia: "",
        renglon: "",
        profesion: "",
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
      let fechaNacFormato: string;
      try {
        fechaNacFormato = ensureFechaNacimientoDDMMAAAA(editingUser.fechaNacimiento);
      } catch (error: any) {
        toast.error(error.message || "Fecha de nacimiento inválida");
        return;
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
          direccion_unidad: editingUser.direccionUnidad || null,
          departamento_dependencia: editingUser.departamentoDependencia || null,
          renglon: editingUser.renglon || null,
          profesion: editingUser.profesion || null,
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

  const handleEditClick = (usuario: any) => {
    setEditingUser(usuario);
  };

  const handleImportComplete = () => {
    // Recargar usuarios después de importación exitosa
    loadUsuarios(currentPage);
  };

  const limpiarFiltros = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setFiltroNivel("");
    setFiltroRol("");
    setFiltroEstado("");
    setFiltroTipoPuesto("");
    setFiltroArea("");
    setFiltroDireccion("");
    setFiltroDepartamento("");
  };

  const contarFiltrosActivos = () => {
    let count = 0;
    if (debouncedSearchTerm) count++;
    if (filtroNivel) count++;
    if (filtroRol) count++;
    if (filtroEstado) count++;
    if (filtroTipoPuesto) count++;
    if (filtroArea) count++;
    if (filtroDireccion) count++;
    if (filtroDepartamento) count++;
    return count;
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasNextPage = currentPage < totalPages - 1;
  const hasPrevPage = currentPage > 0;
  const filtrosActivos = contarFiltrosActivos();

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

        {/* Búsqueda y Filtros */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Barra de búsqueda principal */}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, DPI, cargo o área..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {filtrosActivos > 0 && (
                  <Button variant="outline" onClick={limpiarFiltros}>
                    <X className="mr-2 h-4 w-4" />
                    Limpiar Filtros ({filtrosActivos})
                  </Button>
                )}
              </div>

              {/* Filtros avanzados */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Nivel de Puesto</Label>
                  <Select value={filtroNivel || undefined} onValueChange={(value) => setFiltroNivel(value || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los niveles" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobLevels.map((level) => (
                        <SelectItem key={level.code} value={level.code}>
                          {level.code} - {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select value={filtroRol || undefined} onValueChange={(value) => setFiltroRol(value || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los roles" />
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
                  <Select value={filtroEstado || undefined} onValueChange={(value) => setFiltroEstado(value || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Puesto</Label>
                  <Select value={filtroTipoPuesto || undefined} onValueChange={(value) => setFiltroTipoPuesto(value || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                      <SelectItem value="operativo">Operativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Área</Label>
                  <Input
                    placeholder="Filtrar por área..."
                    value={filtroArea}
                    onChange={(e) => setFiltroArea(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Dirección/Unidad</Label>
                  <Input
                    placeholder="Filtrar por dirección..."
                    value={filtroDireccion}
                    onChange={(e) => setFiltroDireccion(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Input
                    placeholder="Filtrar por departamento..."
                    value={filtroDepartamento}
                    onChange={(e) => setFiltroDepartamento(e.target.value)}
                  />
                </div>
              </div>

              {/* Badges de filtros activos */}
              {filtrosActivos > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {debouncedSearchTerm && (
                    <Badge variant="secondary" className="gap-1">
                      Búsqueda: "{debouncedSearchTerm}"
                      <X className="h-3 w-3 cursor-pointer" onClick={() => {setSearchTerm(""); setDebouncedSearchTerm("");}} />
                    </Badge>
                  )}
                  {filtroNivel && (
                    <Badge variant="secondary" className="gap-1">
                      Nivel: {filtroNivel}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFiltroNivel("")} />
                    </Badge>
                  )}
                  {filtroRol && (
                    <Badge variant="secondary" className="gap-1">
                      Rol: {filtroRol}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFiltroRol("")} />
                    </Badge>
                  )}
                  {filtroEstado && (
                    <Badge variant="secondary" className="gap-1">
                      Estado: {filtroEstado}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFiltroEstado("")} />
                    </Badge>
                  )}
                  {filtroTipoPuesto && (
                    <Badge variant="secondary" className="gap-1">
                      Tipo: {filtroTipoPuesto}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFiltroTipoPuesto("")} />
                    </Badge>
                  )}
                  {filtroArea && (
                    <Badge variant="secondary" className="gap-1">
                      Área: {filtroArea}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFiltroArea("")} />
                    </Badge>
                  )}
                  {filtroDireccion && (
                    <Badge variant="secondary" className="gap-1">
                      Dirección: {filtroDireccion}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFiltroDireccion("")} />
                    </Badge>
                  )}
                  {filtroDepartamento && (
                    <Badge variant="secondary" className="gap-1">
                      Departamento: {filtroDepartamento}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFiltroDepartamento("")} />
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="mb-6 flex gap-4">
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
                    <Label>Edad (calculada)</Label>
                    <Input
                      type="text"
                      value={newUser.fechaNacimiento ? calcularEdadDesdeFecha(newUser.fechaNacimiento) || '' : ''}
                      readOnly
                      className="bg-muted"
                      placeholder="Se calculará automáticamente"
                    />
                    <p className="text-xs text-muted-foreground">Calculada automáticamente desde la fecha de nacimiento</p>
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
                    <Label>Antigüedad (calculada)</Label>
                    <Input
                      type="text"
                      value={newUser.fechaIngreso ? calcularAntiguedadDesdeFecha(newUser.fechaIngreso) || '' : ''}
                      readOnly
                      className="bg-muted"
                      placeholder="Se calculará automáticamente"
                    />
                    <p className="text-xs text-muted-foreground">Calculada automáticamente en meses desde la fecha de ingreso</p>
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
                    <Label>Dirección o Unidad</Label>
                    <Input
                      value={newUser.direccionUnidad}
                      onChange={(e) => setNewUser({ ...newUser, direccionUnidad: e.target.value })}
                      placeholder="Unidad organizacional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Departamento o Dependencia</Label>
                    <Input
                      value={newUser.departamentoDependencia}
                      onChange={(e) => setNewUser({ ...newUser, departamentoDependencia: e.target.value })}
                      placeholder="Departamento administrativo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Renglón</Label>
                    <Input
                      value={newUser.renglon}
                      onChange={(e) => setNewUser({ ...newUser, renglon: e.target.value })}
                      placeholder="011, 021, 022, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Profesión</Label>
                    <Input
                      value={newUser.profesion}
                      onChange={(e) => setNewUser({ ...newUser, profesion: e.target.value })}
                      placeholder="Profesión u oficio"
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
                    <Label>Instrumento de Evaluación</Label>
                    <Select
                      value={newUser.instrumentoId || "auto"}
                      onValueChange={(value) => setNewUser({ ...newUser, instrumentoId: value === "auto" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Por defecto: ${newUser.nivel || "Seleccionar nivel primero"}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Asignar automáticamente según nivel</SelectItem>
                        <SelectItem value="A1">A1 - ALCALDE MUNICIPAL</SelectItem>
                        <SelectItem value="A3">A3 - ADMINISTRATIVOS I</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Por defecto se asigna según el nivel. Use el override solo si es necesario.
                    </p>
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
              {filtrosActivos > 0
                ? `Mostrando ${usuarios.length} resultados de ${totalCount} usuarios con filtros aplicados`
                : `Mostrando página ${currentPage + 1} de ${totalPages} (${usuarios.length} de ${totalCount} usuarios)`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filtrosActivos === 0 && totalPages > 1 && (
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
                {usuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No se encontraron usuarios
                    </TableCell>
                  </TableRow>
                ) : (
                  usuarios.map((usuario) => (
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
                          onClick={() => handleEditClick(usuario)}
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
                      value={formatDDMMAAAAToISO(editingUser.fechaNacimiento)}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          fechaNacimiento: normalizeFechaNacimientoDDMMAAAA(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Edad (calculada)</Label>
                    <Input
                      type="text"
                      value={
                        (editingUser as any).edad 
                          ? `${(editingUser as any).edad} años` 
                          : editingUser.fechaNacimiento 
                            ? calcularEdadDesdeFecha(formatDDMMAAAAToISO(editingUser.fechaNacimiento)) || 'Calculando...' 
                            : 'No disponible'
                      }
                      readOnly
                      className="bg-muted font-semibold"
                      placeholder="Se calculará automáticamente"
                    />
                    <p className="text-xs text-muted-foreground">Calculada automáticamente desde la fecha de nacimiento</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Ingreso</Label>
                    <Input
                      type="date"
                      value={(editingUser as any).fechaIngreso || ""}
                      onChange={(e) => setEditingUser({ ...editingUser, fechaIngreso: e.target.value } as any)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Antigüedad (calculada)</Label>
                    <Input
                      type="text"
                      value={
                        (editingUser as any).antiguedad !== null && (editingUser as any).antiguedad !== undefined
                          ? (() => {
                              const meses = (editingUser as any).antiguedad;
                              const años = Math.floor(meses / 12);
                              const mesesRestantes = meses % 12;
                              if (años > 0 && mesesRestantes > 0) {
                                return `${años} año${años > 1 ? 's' : ''} ${mesesRestantes} mes${mesesRestantes > 1 ? 'es' : ''}`;
                              } else if (años > 0) {
                                return `${años} año${años > 1 ? 's' : ''}`;
                              } else {
                                return `${mesesRestantes} mes${mesesRestantes > 1 ? 'es' : ''}`;
                              }
                            })()
                          : (editingUser as any).fechaIngreso 
                            ? calcularAntiguedadDesdeFecha((editingUser as any).fechaIngreso) || 'Calculando...' 
                            : 'No disponible'
                      }
                      readOnly
                      className="bg-muted font-semibold"
                      placeholder="Se calculará automáticamente"
                    />
                    <p className="text-xs text-muted-foreground">Calculada automáticamente en meses desde la fecha de ingreso</p>
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
                    <Label>Dirección o Unidad</Label>
                    <Input
                      value={editingUser.direccionUnidad || ""}
                      onChange={(e) => setEditingUser({ ...editingUser, direccionUnidad: e.target.value })}
                      placeholder="Unidad organizacional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Departamento o Dependencia</Label>
                    <Input
                      value={editingUser.departamentoDependencia || ""}
                      onChange={(e) => setEditingUser({ ...editingUser, departamentoDependencia: e.target.value })}
                      placeholder="Departamento administrativo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Renglón</Label>
                    <Input
                      value={editingUser.renglon || ""}
                      onChange={(e) => setEditingUser({ ...editingUser, renglon: e.target.value })}
                      placeholder="011, 021, 022, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Profesión</Label>
                    <Input
                      value={editingUser.profesion || ""}
                      onChange={(e) => setEditingUser({ ...editingUser, profesion: e.target.value })}
                      placeholder="Profesión u oficio"
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
                    <Label>Instrumento de Evaluación</Label>
                    <Select
                      value={editingUser.instrumentoId || "auto"}
                      onValueChange={(value) => setEditingUser({ ...editingUser, instrumentoId: value === "auto" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Por defecto: ${editingUser.nivel}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Asignar automáticamente según nivel</SelectItem>
                        <SelectItem value="A1">A1 - ALCALDE MUNICIPAL</SelectItem>
                        <SelectItem value="A3">A3 - ADMINISTRATIVOS I</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Actual: {editingUser.instrumentoId || `${editingUser.nivel} (automático)`}
                    </p>
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

