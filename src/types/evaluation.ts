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
