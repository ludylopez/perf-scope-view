export interface UserAssignment {
  id: string;
  colaboradorId: string; // DPI del colaborador
  jefeId: string; // DPI del jefe evaluador
  grupoId?: string; // ID del grupo/cuadrilla si aplica
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentWithUsers extends UserAssignment {
  colaborador?: {
    nombre: string;
    apellidos: string;
    cargo: string;
    nivel: string;
    area: string;
  };
  jefe?: {
    nombre: string;
    apellidos: string;
    cargo: string;
  };
}

