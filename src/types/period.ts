export interface EvaluationPeriod {
  id: string;
  nombre: string;
  fechaInicio: string; // ISO date string
  fechaFin: string; // ISO date string
  fechaCierreAutoevaluacion: string; // ISO date string
  fechaCierreEvaluacionJefe: string; // ISO date string
  estado: "planificado" | "en_curso" | "cerrado" | "finalizado";
  descripcion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PeriodStatus {
  isActive: boolean;
  canSubmitAuto: boolean;
  canSubmitJefe: boolean;
  period?: EvaluationPeriod;
}

