export interface Group {
  id: string;
  nombre: string;
  descripcion?: string;
  jefeId: string; // DPI del jefe responsable
  tipo: "cuadrilla" | "equipo" | "departamento" | "otro";
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  grupoId: string;
  colaboradorId: string; // DPI del colaborador
  activo: boolean;
  createdAt: string;
}

export interface GroupWithMembers extends Group {
  miembros: Array<{
    colaboradorId: string;
    nombre: string;
    apellidos: string;
    cargo: string;
    nivel: string;
  }>;
}

export interface GroupPerformanceStats {
  grupoId: string;
  grupoNombre: string;
  totalMiembros: number;
  evaluacionesCompletadas: number;
  promedioDesempeno: number;
  promedioPotencial: number;
  distribucion9Box: Record<string, number>;
  fortalezasComunes: string[];
  areasMejoraComunes: string[];
}

