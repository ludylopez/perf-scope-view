export interface Dimension {
  id: string;
  nombre: string;
  descripcion?: string;
  peso: number;
  items: EvaluationItem[];
}

export interface EvaluationItem {
  id: string;
  texto: string;
  orden: number;
}

export interface Instrument {
  id: string;
  nivel: string;
  version: string;
  tiempoEstimado?: string;
  dimensionesDesempeno: Dimension[];
  dimensionesPotencial: Dimension[];
}

export interface Response {
  itemId: string;
  valor: number;
  comentario?: string;
}

export interface DimensionResponse {
  dimensionId: string;
  respuestas: Response[];
  comentarios?: string;
  evidencias?: string[];
}

export interface EvaluationData {
  usuarioId: string;
  periodoId: string;
  tipo: "auto" | "jefe";
  dimensiones: DimensionResponse[];
  estado: "borrador" | "enviado";
  fechaEnvio?: string;
}

export interface Result {
  dimensionId: string;
  promedio: number;
  puntajePonderado: number;
}

export interface FinalScore {
  desempenoAuto: number;
  desempenoJefe: number;
  desempenoFinal: number;
  potencial?: number;
  posicion9Box?: string;
}

export interface AccionDesarrollo {
  descripcion: string;
  responsable: string;
  fecha: string;
  recursos: string[];
  indicador: string;
  prioridad: "alta" | "media" | "baja";
}

export interface DimensionDebil {
  dimension: string;
  score: number;
  accionesEspecificas: string[];
}

export interface PlanEstructurado {
  objetivos: string[];
  acciones: AccionDesarrollo[];
  dimensionesDebiles: DimensionDebil[];
}

export interface DevelopmentPlan {
  id: string;
  evaluacionId: string;
  colaboradorId: string;
  periodoId: string;
  competenciasDesarrollar: string[]; // Ahora es array simple de objetivos
  feedbackIndividual?: string;
  feedbackGrupal?: string;
  planEstructurado?: PlanEstructurado; // Nueva estructura completa del plan
  recomendaciones?: string[]; // Recomendaciones generales
  generadoPorIa?: boolean; // Indica si fue generado por IA
  editable: boolean;
  editadoPor?: string;
  fechaCreacion: string;
  fechaModificacion?: string;
}

export interface FinalEvaluationResult {
  id: string;
  colaboradorId: string;
  periodoId: string;
  autoevaluacionId: string;
  evaluacionJefeId: string;
  resultadoFinal: FinalScore;
  comparativo: {
    dimensiones: Array<{
      dimensionId: string;
      nombre: string;
      autoevaluacion: number;
      evaluacionJefe: number;
      diferencia: number;
    }>;
  };
  planDesarrolloId?: string;
  fechaGeneracion: string;
}