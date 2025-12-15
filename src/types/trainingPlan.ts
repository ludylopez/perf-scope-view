/**
 * Tipos para el Plan de Capacitación Consolidado por Unidad
 * Basado en análisis estadístico de datos reales de evaluaciones
 */

export interface BrechaDimension {
  dimensionId: string;
  dimensionNombre: string;
  promedioUnidad: number;
  promedioOrg: number;
  desviacionEstandarOrg: number;
  zScore: number;
  prioridad: 'critica' | 'alta' | 'media' | 'baja';
  colaboradoresDebiles: number;
  porcentajeDebiles: number;
}

export interface TopicoCapacitacion {
  topico: string;
  categoria: 'Técnica' | 'Soft Skills' | 'Liderazgo' | 'Herramientas' | 'Normativa' | 'Otro';
  frecuenciaAbsoluta: number;
  frecuenciaPorcentual: number;
  scorePrioridad: number;
  prioridad: 'urgente' | 'alta' | 'media' | 'baja';
  dimensionesRelacionadas: string[];
  fuentes: ('plan' | 'comentario_jefe' | 'solicitud_colaborador')[];
}

export interface Distribucion9Box {
  posicion: string;
  cantidad: number;
  porcentaje: number;
  factorUrgencia: number;
  accionRecomendada: string;
}

export interface PlanCapacitacionUnidadMetadata {
  periodoId: string;
  periodoNombre: string;
  fechaGeneracion: string;
  jefeDpi: string;
}

export interface PlanCapacitacionUnidadContexto {
  totalColaboradores: number;
  evaluacionesCompletadas: number;
  tasaCompletitud: number;
  promedioDesempenoUnidad: number;
  promedioDesempenoOrg: number;
}

export interface PlanCapacitacionUnidadResumenEjecutivo {
  situacionGeneral: string;
  dimensionMasCritica: string | null;
  capacitacionesPrioritarias: string[];
  recomendacionGeneral: string;
}

export interface PlanCapacitacionUnidad {
  metadata: PlanCapacitacionUnidadMetadata;
  contexto: PlanCapacitacionUnidadContexto;
  brechasDimensiones: BrechaDimension[];
  capacitaciones: TopicoCapacitacion[];
  distribucion9Box: Distribucion9Box[];
  resumenEjecutivo: PlanCapacitacionUnidadResumenEjecutivo;
  planEstructurado?: PlanCapacitacionEstructurado; // Plan generado por IA
}

// ============================================================================
// TIPOS PARA PLAN DE CAPACITACIÓN ESTRUCTURADO (GENERADO POR IA)
// ============================================================================

export interface ActividadCapacitacion {
  topico: string; // Del tópico priorizado
  tipo: 'curso' | 'taller' | 'workshop' | 'mentoria' | 'autoaprendizaje' | 'practica_guiada';
  descripcion: string; // Qué se hará específicamente
  duracion: string; // "4 horas", "2 días", "1 mes"
  modalidad: 'presencial' | 'virtual' | 'hibrida' | 'autoaprendizaje';
  prioridad: 'urgente' | 'alta' | 'media' | 'baja';
  participantes?: string[]; // DPI o nombres de colaboradores específicos (opcional)
  dimensionRelacionada?: string;
  responsable?: string; // Quién coordina
  recursosNecesarios?: string[]; // Recursos materiales, humanos, etc.
}

export interface CronogramaActividad {
  actividad: string; // Referencia a la actividad (índice o ID)
  fechaInicio: string; // "YYYY-MM-DD" o "YYYY-MM"
  fechaFin: string; // "YYYY-MM-DD" o "YYYY-MM"
  estado?: 'planificado' | 'en_proceso' | 'completado' | 'cancelado';
}

export interface RecursoNecesario {
  tipo: 'humano' | 'material' | 'presupuesto' | 'infraestructura' | 'tecnologico';
  descripcion: string;
  cantidad?: string; // "2 personas", "Q5,000", "1 sala"
  disponible: boolean; // Si ya está disponible o necesita adquirirse
  observaciones?: string;
}

export interface MetricaExito {
  nombre: string; // "Mejora en productividad", "Reducción de errores"
  tipo: 'cuantitativa' | 'cualitativa';
  valorObjetivo?: string; // "80%", "Reducción del 20%"
  metodoMedicion: string; // Cómo se medirá
  plazo: string; // "3 meses", "6 meses"
}

// Temática agrupada de capacitación
export interface TematicaCapacitacion {
  nombre: string; // Nombre de la temática (ej: "Liderazgo y Gestión de Equipos")
  descripcion: string; // Descripción general de la temática
  objetivo: string; // Objetivo específico de esta temática
  prioridad: 'urgente' | 'alta' | 'media' | 'baja';
  nivelesAplicables: string[]; // Niveles a los que aplica (ej: ["Todos", "Nivel 1-3", "Jefes"])
  temas: string[]; // Temas específicos incluidos en esta temática
  actividades: ActividadCapacitacion[]; // Actividades concretas para esta temática
  dimensionesRelacionadas: string[]; // Dimensiones que desarrolla
  participantesRecomendados?: string; // Descripción de participantes (ej: "Todo el equipo", "Jefes y supervisores")
}

export interface InformacionGeneral {
  areaDepartamento: string;
  responsable: string;
  totalColaboradores: number;
  periodo: string;
  fechaElaboracion: string;
}

export interface CapacitacionPrograma {
  capacitacion: string;
  objetivo: string;
  participantes: string;
  modalidad: 'presencial' | 'virtual' | 'mixta' | 'autoaprendizaje';
  duracion: string;
  fecha: string;
  instructor: string;
  prioridad: 'urgente' | 'alta' | 'media' | 'baja';
  temas: string[];
}

export interface IndicadorExito {
  indicador: string;
  meta: string;
}

export interface PlanCapacitacionEstructurado {
  // Nueva estructura profesional
  informacionGeneral?: InformacionGeneral;
  justificacion?: string;
  objetivoGeneral?: string;
  objetivosEspecificos?: string[];
  deteccionNecesidades?: string[];
  programaCapacitacion?: CapacitacionPrograma[];
  metodologia?: string;
  evaluacionSeguimiento?: string[];
  indicadoresExito?: IndicadorExito[];
  
  // Estructura legacy (mantener para compatibilidad)
  objetivos?: string[]; // Objetivos generales del plan (3-5 objetivos)
  tematicas?: TematicaCapacitacion[]; // Temáticas agrupadas de capacitación
  actividades?: ActividadCapacitacion[]; // Actividades individuales (legacy, mantener para compatibilidad)
  cronograma?: CronogramaActividad[]; // Timeline de implementación
  recursos?: RecursoNecesario[]; // Recursos necesarios
  metricasExito?: MetricaExito[]; // Cómo medir el éxito
  estrategiaImplementacion?: string; // Estrategia general (texto descriptivo)
  fechaGeneracion: string; // ISO string
}


