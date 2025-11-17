// Tipos para el sistema de niveles de puesto (Job Levels)

export type JobLevelCategory = 'administrativo' | 'operativo';

export interface JobLevel {
  code: string;
  name: string;
  hierarchical_order: number;
  category: JobLevelCategory;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobLevelWithCount extends JobLevel {
  users_count: number;
}

export interface JobLevelInfo {
  code: string;
  name: string;
  hierarchical_order: number;
  category: JobLevelCategory;
  is_active: boolean;
  users_count: number;
  instruments_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateJobLevelParams {
  code: string;
  name: string;
  hierarchical_order: number;
  category: JobLevelCategory;
}

export interface UpdateJobLevelParams {
  code: string;
  name: string;
  hierarchical_order: number;
  category: JobLevelCategory;
  is_active: boolean;
}

export interface JobLevelResponse {
  success: boolean;
  data?: JobLevel;
  error?: string;
  message?: string;
}

export interface JobLevelInfoResponse {
  success: boolean;
  data?: JobLevelInfo;
  error?: string;
}

// Constantes para los niveles predefinidos
export const JOB_LEVEL_CODES = {
  C1: 'C1',
  A1: 'A1',
  A2: 'A2',
  S2: 'S2',
  D1: 'D1',
  D2: 'D2',
  E1: 'E1',
  E2: 'E2',
  A3: 'A3',
  A4: 'A4',
  OTE: 'OTE',
  O1: 'O1',
  O2: 'O2',
  OS: 'OS',
} as const;

export type JobLevelCode = typeof JOB_LEVEL_CODES[keyof typeof JOB_LEVEL_CODES];

// Nombres de los niveles
export const JOB_LEVEL_NAMES: Record<JobLevelCode, string> = {
  C1: 'CONCEJO MUNICIPAL',
  A1: 'ALCALDE MUNICIPAL',
  A2: 'ASESORÍA PROFESIONAL',
  S2: 'SECRETARIO',
  D1: 'GERENTE - DIRECCIONES I',
  D2: 'DIRECCIONES II',
  E1: 'ENCARGADOS Y JEFES DE UNIDADES I',
  E2: 'ENCARGADOS Y JEFES DE UNIDADES II',
  A3: 'ADMINISTRATIVOS I',
  A4: 'ADMINISTRATIVOS II',
  OTE: 'OPERATIVOS - TÉCNICO ESPECIALIZADO',
  O1: 'OPERATIVOS I',
  O2: 'OPERATIVOS II',
  OS: 'OTROS SERVICIOS',
};

// Categorías por nivel
export const JOB_LEVEL_CATEGORIES: Record<JobLevelCode, JobLevelCategory> = {
  C1: 'administrativo',
  A1: 'administrativo',
  A2: 'administrativo',
  S2: 'administrativo',
  D1: 'administrativo',
  D2: 'administrativo',
  E1: 'administrativo',
  E2: 'administrativo',
  A3: 'administrativo',
  A4: 'administrativo',
  OTE: 'operativo',
  O1: 'operativo',
  O2: 'operativo',
  OS: 'operativo',
};

// Orden jerárquico por nivel
export const JOB_LEVEL_HIERARCHY: Record<JobLevelCode, number> = {
  C1: 0.9,
  A1: 1.0,
  A2: 1.1,
  S2: 1.2,
  D1: 2.0,
  D2: 3.0,
  E1: 4.0,
  E2: 5.0,
  A3: 6.0,
  A4: 7.0,
  OTE: 8.0,
  O1: 9.0,
  O2: 10.0,
  OS: 11.0,
};
