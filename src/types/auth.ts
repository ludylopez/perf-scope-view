export type UserRole = "colaborador" | "jefe" | "admin_rrhh" | "admin_general";

export interface User {
  dpi: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento: string;
  correo?: string;
  telefono?: string;
  nivel: string;
  cargo: string;
  area: string;
  direccionUnidad?: string;
  departamentoDependencia?: string;
  renglon?: string;
  profesion?: string;
  jefeInmediato?: string;
  instrumentoId?: string; // Override manual de instrumento
  rol: UserRole;
  estado: "activo" | "inactivo";
  primerIngreso: boolean;
}

export interface AuthContextType {
  user: User | null;
  login: (dpi: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading?: boolean;
}
