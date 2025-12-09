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
  dimensionesPotencial: Dimension[]; // Puede ser array vacío para niveles sin potencial (ej: C1)
  configuracion_calculo?: {
    pesoAuto?: number;
    pesoJefe?: number;
  };
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

export interface DimensionPercentage {
  id: string;
  nombre: string;
  promedio: number;
  porcentaje: number;
}

export interface FinalScore {
  desempenoAuto: number;
  desempenoJefe: number;
  desempenoFinal: number;
  potencial?: number;
  posicion9Box?: string; // Formato: "alto-alto", "medio-bajo", etc. - Ver nineBoxMetadata.ts para detalles
  desempenoPorcentaje?: number; // Porcentaje de desempeño (0-100)
  potencialPorcentaje?: number; // Porcentaje de potencial (0-100)
  dimensiones?: DimensionPercentage[]; // Porcentajes por dimensión calculados en el backend (consolidados 70/30)
}

export interface AccionDesarrollo {
  descripcion: string;
  dimension?: string; // Dimensión principal que desarrolla esta acción
  tipoAprendizaje: "experiencia" | "social" | "formal";
  responsable: string;
  fecha: string;
  recursos?: string[]; // Opcional, puede no venir de la IA
  indicador: string;
  prioridad: "alta" | "media" | "baja";
}

export interface DimensionDebil {
  dimension: string;
  score: number;
  accionesEspecificas: string[];
}

export interface TopicoCapacitacion {
  topico: string;
  categoria: "Técnica" | "Soft Skills" | "Liderazgo" | "Herramientas" | "Normativa";
  prioridad: "alta" | "media" | "baja";
  fuente: "plan" | "comentario_jefe" | "comentario_colaborador" | "necesidad_expresada";
  dimension_relacionada?: string;
  descripcion?: string;
}

export interface PlanEstructurado {
  objetivos: string[];
  acciones: AccionDesarrollo[];
  dimensionesDebiles: DimensionDebil[];
  topicosCapacitacion?: TopicoCapacitacion[];
}

export interface DevelopmentPlan {
  id: string;
  evaluacion_id?: string;
  evaluacionId?: string;
  colaborador_id?: string;
  colaboradorId: string;
  periodo_id?: string;
  periodoId: string;
  competencias_desarrollar?: string[]; // Array simple de objetivos (snake_case de BD)
  competenciasDesarrollar?: string[]; // Array simple de objetivos (camelCase para código)
  feedback_individual?: string; // snake_case de BD
  feedbackIndividual?: string; // camelCase para código
  feedback_grupal?: string; // snake_case de BD
  feedbackGrupal?: string; // camelCase para código
  plan_estructurado?: PlanEstructurado; // snake_case de BD
  planEstructurado?: PlanEstructurado; // Nueva estructura completa del plan (camelCase)
  recomendaciones?: string[]; // Recomendaciones generales
  generado_por_ia?: boolean; // snake_case de BD
  generadoPorIa?: boolean; // Indica si fue generado por IA (camelCase)
  editable: boolean;
  editado_por?: string; // snake_case de BD
  editadoPor?: string; // camelCase para código
  fecha_creacion?: string; // snake_case de BD
  fechaCreacion?: string; // camelCase para código
  fecha_modificacion?: string; // snake_case de BD
  fechaModificacion?: string; // camelCase para código
  created_at?: string;
  updated_at?: string;
}

export interface PuntoFuerte {
  dimension: string;
  reconocimiento: string;
  ejemplo: string;
  impacto: string;
}

export interface AreaDesarrollo {
  dimension: string;
  situacion: string;
  comportamiento: string;
  impacto: string;
  sugerencia: string;
}

export interface GuiaRetroalimentacion {
  id?: string;
  colaboradorId: string;
  periodoId: string;
  preparacion: string;
  apertura: string;
  fortalezas: PuntoFuerte[];
  areasDesarrollo: AreaDesarrollo[];
  preguntasDialogo: string[];
  tipsConduccion: string[];
  cierre: string;
  generadoPorIa: boolean;
  fechaGeneracion: string;
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

// Tipos para sistema de múltiples evaluadores
export interface EvaluationResultByEvaluator {
  id: string;
  colaboradorId: string;
  periodoId: string;
  evaluadorId: string;
  evaluadorNombre?: string;
  autoevaluacionId: string;
  evaluacionJefeId: string;
  resultadoFinal: FinalScore;
  comparativo: {
    dimensiones?: Array<{
      dimensionId: string;
      nombre: string;
      autoevaluacion: number;
      evaluacionJefe: number;
      diferencia: number;
    }>;
    desempenoAuto?: number;
    desempenoJefe?: number;
    desempenoFinal?: number;
    potencial?: number;
  };
  posicion9Box?: string;
  desempenoFinal: number;
  desempenoPorcentaje: number;
  potencial?: number;
  potencialPorcentaje?: number;
  fechaGeneracion: string;
}

export interface ConsolidatedEvaluationResult {
  colaboradorId: string;
  periodoId: string;
  desempenoFinalPromedio: number;
  desempenoPorcentajePromedio: number;
  potencialPromedio?: number;
  potencialPorcentajePromedio?: number;
  posicion9BoxModa?: string;
  totalEvaluadores: number;
  resultadosPorEvaluador: Array<{
    evaluadorId: string;
    evaluadorNombre?: string;
    desempenoFinal: number;
    desempenoPorcentaje: number;
    potencial?: number;
    potencialPorcentaje?: number;
    posicion9Box?: string;
    fechaGeneracion?: string;
  }>;
  desempenoFinalMinimo?: number;
  desempenoFinalMaximo?: number;
  desempenoPorcentajeMinimo?: number;
  desempenoPorcentajeMaximo?: number;
}

export interface MultipleEvaluatorsInfo {
  colaboradorId: string;
  evaluadores: Array<{
    evaluadorId: string;
    evaluadorNombre: string;
    estadoEvaluacion?: 'pendiente' | 'borrador' | 'enviado';
  }>;
  totalEvaluadores: number;
}