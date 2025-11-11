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
  npsScore?: number; // Net Promoter Score (0-10): Solo para autoevaluaciones
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

export interface DevelopmentPlan {
  id: string;
  evaluacionId: string;
  colaboradorId: string;
  periodoId: string;
  competenciasDesarrollar: Array<{
    competencia: string;
    nivelActual: number;
    nivelObjetivo: number;
    acciones: string[];
    plazo: string;
  }>;
  feedbackIndividual?: string;
  feedbackGrupal?: string;
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