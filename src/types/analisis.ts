// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS PARA DASHBOARDS DE ANALISIS ESTADISTICO
// ═══════════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────────
// ESTADISTICAS COMPLETAS
// ───────────────────────────────────────────────────────────────────────────────

export interface EstadisticasCompletas {
  promedio: number;
  mediana: number;
  desviacion: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  p10?: number;
  p25?: number;
  p50?: number;
  p75?: number;
  p90?: number;
  coeficienteVariacion?: number;
  asimetria?: number;
  curtosis?: number;
}

export interface EstadisticasBasicas {
  promedio: number;
  mediana: number;
  desviacion: number;
  min: number;
  max: number;
}

// ───────────────────────────────────────────────────────────────────────────────
// RESUMEN EJECUTIVO (Seccion 1)
// ───────────────────────────────────────────────────────────────────────────────

export interface ParticipacionNivel {
  nivel: string;
  nombre: string;
  total: number;
  evaluados: number;
  porcentaje: number;
}

export interface ResumenEjecutivo {
  totalColaboradores: number;
  totalEvaluados: number;
  tasaParticipacion: number;
  participacionPorNivel: ParticipacionNivel[];
  promedioDesempeno: number;
  promedioPotencial: number;
  distribucion9Box: Record<string, number>;
  hallazgosClave?: string[];
}

// ───────────────────────────────────────────────────────────────────────────────
// RESULTADOS GLOBALES (Seccion 3)
// ───────────────────────────────────────────────────────────────────────────────

export type CategoriaCalificacion =
  | 'excelente'
  | 'muy_bueno'
  | 'satisfactorio'
  | 'necesita_mejorar'
  | 'insatisfactorio';

export interface DistribucionCalificacion {
  categoria: CategoriaCalificacion;
  rango: string;
  cantidad: number;
  porcentaje: number;
  color: string;
}

export interface BrechaAutoJefe {
  promedioAuto: number;
  promedioJefe: number;
  diferencia: number;
  interpretacion: string;
}

export interface ComparativaDimension {
  dimension: string;
  dimensionId: string;
  promedioAuto: number;
  promedioJefe: number;
  brecha: number;
}

export interface ResultadosGlobales {
  promedioOrganizacional: number;
  mediana: number;
  desviacionEstandar: number;
  distribucionCalificaciones: DistribucionCalificacion[];
  brechaAutoJefe: BrechaAutoJefe;
  comparativaPorDimension: ComparativaDimension[];
}

// ───────────────────────────────────────────────────────────────────────────────
// ANALISIS POR DIMENSION (Seccion 4)
// ───────────────────────────────────────────────────────────────────────────────

export type ClasificacionDimension = 'fortaleza' | 'oportunidad' | 'critica';

export interface DimensionStats {
  id: string;
  nombre: string;
  promedioGlobal: number;
  mediana: number;
  desviacion: number;
  clasificacion: ClasificacionDimension;
  porNivel: Record<string, number>;
  porCategoria: Record<string, number>;
  ranking?: number;
}

export interface AnalisisDimensiones {
  dimensiones: DimensionStats[];
  ranking: DimensionStats[];
  fortalezas: DimensionStats[];
  oportunidades: DimensionStats[];
  criticas: DimensionStats[];
}

// ───────────────────────────────────────────────────────────────────────────────
// ANALISIS POR NIVEL (Seccion 5)
// ───────────────────────────────────────────────────────────────────────────────

export type CategoriaNivel = 'administrativo' | 'operativo';

export interface NivelStats {
  codigo: string;
  nombre: string;
  categoria: CategoriaNivel;
  orden: number;
  totalColaboradores: number;
  evaluados: number;
  tasaParticipacion: number;
  desempeno: EstadisticasCompletas;
  potencial: EstadisticasCompletas;
  distribucionCalificaciones: Record<string, number>;
  distribucion9Box: Record<string, number>;
  dimensionMasFuerte?: string;
  dimensionMasDebil?: string;
}

export interface AnalisisNiveles {
  niveles: NivelStats[];
  promedioGeneral: number;
  nivelMejorDesempeno: string;
  nivelMenorDesempeno: string;
}

// ───────────────────────────────────────────────────────────────────────────────
// ANALISIS POR DIRECCION (Seccion 6)
// ───────────────────────────────────────────────────────────────────────────────

export interface DireccionStats {
  nombre: string;
  totalColaboradores: number;
  evaluados: number;
  tasaParticipacion: number;
  desempenoPromedio: number;
  potencialPromedio: number;
  desviacion: number;
  ranking: number;
  cambioVsPromedio: number;
  distribucionNiveles?: Record<string, number>;
  distribucion9Box?: Record<string, number>;
  desempeno?: number; // Para compatibilidad con DireccionRankingChart
  desempenoStats?: EstadisticasCompletas; // Estadísticas completas para cálculos
  potencialStats?: EstadisticasCompletas; // Estadísticas de potencial
}

export interface AnalisisDirecciones {
  direcciones: DireccionStats[];
  promedioOrganizacional: number;
  mejoresDirecciones: DireccionStats[];
  direccionesConOportunidad: DireccionStats[];
}

// ───────────────────────────────────────────────────────────────────────────────
// ANALISIS DE CAPACITACION (Seccion 8)
// ───────────────────────────────────────────────────────────────────────────────

export type PrioridadCapacitacion = 'alta' | 'media' | 'baja';
export type CategoriaCapacitacion =
  | 'Tecnica'
  | 'Soft Skills'
  | 'Liderazgo'
  | 'Herramientas'
  | 'Normativa'
  | 'Gestion'
  | 'Comunicacion';

export interface BrechaCapacitacion {
  dimension: string;
  brechaPromedio: number;
  cantidadAfectados: number;
  prioridad: PrioridadCapacitacion;
}

export interface NecesidadCapacitacionNivel {
  nivel: string;
  topicos: string[];
  prioridad: PrioridadCapacitacion;
  cantidadColaboradores: number;
}

export interface NecesidadCapacitacionDireccion {
  direccion: string;
  topicos: string[];
  cantidadColaboradores: number;
}

export interface TopicoConsolidado {
  topico: string;
  frecuencia: number;
  porcentaje: number;
  prioridad: PrioridadCapacitacion;
  categoria: CategoriaCapacitacion;
}

export interface AnalisisCapacitacion {
  brechasPorDimension: BrechaCapacitacion[];
  necesidadesPorNivel: NecesidadCapacitacionNivel[];
  necesidadesPorDireccion: NecesidadCapacitacionDireccion[];
  topicosConsolidados: TopicoConsolidado[];
  totalColaboradoresConNecesidades: number;
}

// ───────────────────────────────────────────────────────────────────────────────
// ANALISIS DE PLANES DE DESARROLLO (Seccion 9)
// ───────────────────────────────────────────────────────────────────────────────

export interface AreaMejoraFrecuente {
  area: string;
  cantidad: number;
  porcentaje: number;
}

export interface CompetenciaDesarrollada {
  competencia: string;
  cantidad: number;
  porcentaje: number;
}

export interface AnalisisPlanesDesarrollo {
  totalGenerados: number;
  totalPendientes: number;
  cobertura: number;
  areasMejoraFrecuentes: AreaMejoraFrecuente[];
  competenciasMasDesarrolladas: CompetenciaDesarrollada[];
  distribucionPorNivel: Record<string, number>;
  distribucionPorDireccion: Record<string, number>;
}

// ───────────────────────────────────────────────────────────────────────────────
// ANALISIS DE CORRELACIONES
// ───────────────────────────────────────────────────────────────────────────────

export type FuerzaCorrelacion = 'muy_debil' | 'debil' | 'moderada' | 'fuerte' | 'muy_fuerte';
export type DireccionCorrelacion = 'positiva' | 'negativa' | 'nula';

export interface CorrelacionResult {
  variable1: string;
  variable2: string;
  coeficiente: number;
  pValue?: number;
  esSignificativo: boolean;
  fuerza: FuerzaCorrelacion;
  direccion: DireccionCorrelacion;
  interpretacion: string;
}

export interface MatrizCorrelacion {
  variables: string[];
  matriz: number[][];
  correlaciones: CorrelacionResult[];
}

// ───────────────────────────────────────────────────────────────────────────────
// ANALISIS POR SEGMENTOS (Renglon, Edad, Genero, Antiguedad, etc.)
// ───────────────────────────────────────────────────────────────────────────────

export interface SegmentoStats {
  segmento: string;
  nombre: string;
  cantidad: number;
  porcentaje: number;
  desempeno: EstadisticasCompletas;
  potencial: EstadisticasCompletas;
  distribucion9Box?: Record<string, number>;
}

export interface AnalisisRenglon {
  renglones: SegmentoStats[];
  comparativaGeneral: {
    mejorDesempeno: string;
    menorDesempeno: string;
    mayorDispersion: string;
  };
}

export interface RangoEdad {
  rango: string;
  label: string;
  edadMin: number;
  edadMax: number;
}

export interface AnalisisEdad {
  rangos: SegmentoStats[];
  correlacionEdadDesempeno: CorrelacionResult;
  rangoMejorDesempeno: string;
  rangoMenorDesempeno: string;
}

export interface AnalisisGenero {
  generos: SegmentoStats[];
  indiceEquidad: IndiceEquidad;
  brechaPorDimension: ComparativaDimension[];
}

export interface RangoAntiguedad {
  rango: string;
  label: string;
  mesesMin: number;
  mesesMax: number;
}

export interface AnalisisAntiguedad {
  rangos: SegmentoStats[];
  correlacionAntiguedadDesempeno: CorrelacionResult;
  rangoMejorDesempeno: string;
  curvaAprendizaje: string; // interpretacion
}

export interface AnalisisTipoPuesto {
  administrativo: SegmentoStats;
  operativo: SegmentoStats;
  indiceEquidad: IndiceEquidad;
  brechaPorDimension: ComparativaDimension[];
}

// ───────────────────────────────────────────────────────────────────────────────
// INDICES DE EQUIDAD
// ───────────────────────────────────────────────────────────────────────────────

export interface IndiceEquidad {
  variable: string;
  grupo1: {
    nombre: string;
    promedio: number;
    n: number;
  };
  grupo2: {
    nombre: string;
    promedio: number;
    n: number;
  };
  brechaAbsoluta: number;
  brechaRelativa: number;
  ratio: number;
  esEquitativo: boolean;
  interpretacion: string;
}

export interface AnalisisEquidad {
  equidadGenero: IndiceEquidad;
  equidadEdad: IndiceEquidad[];
  equidadAntiguedad: IndiceEquidad[];
  equidadTipoPuesto: IndiceEquidad;
  coeficienteGini: number;
  interpretacionGeneral: string;
}

// ───────────────────────────────────────────────────────────────────────────────
// DATOS PARA GRAFICOS
// ───────────────────────────────────────────────────────────────────────────────

// Box Plot
export interface BoxPlotData {
  segment: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers?: number[];
  mean?: number;
}

// Violin Plot
export interface ViolinPlotData {
  segment: string;
  values: number[];
  density?: Array<{ value: number; density: number }>;
}

// Radar Chart
export interface RadarChartData {
  dimension: string;
  [key: string]: string | number; // valores por nivel/grupo
}

// Heatmap
export interface HeatmapCell {
  x: string;
  y: string;
  value: number;
  color?: string;
}

// Sankey
export interface SankeyNode {
  id: string;
  name: string;
  color?: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

// Treemap
export interface TreemapNode {
  name: string;
  value: number;
  children?: TreemapNode[];
  color?: string;
}

// Bump Chart
export interface BumpChartData {
  name: string;
  rankings: Array<{
    period: string;
    rank: number;
    value?: number;
  }>;
}

// Lollipop
export interface LollipopData {
  label: string;
  value: number;
  baseline?: number;
  color?: string;
}

// Diverging Bar
export interface DivergingBarData {
  label: string;
  leftValue: number;
  rightValue: number;
  leftLabel?: string;
  rightLabel?: string;
}

// Gauge
export interface GaugeSegment {
  from: number;
  to: number;
  color: string;
  label: string;
}

export interface GaugeData {
  value: number;
  min: number;
  max: number;
  title: string;
  segments?: GaugeSegment[];
}

// Scatter Plot
export interface ScatterPoint {
  x: number;
  y: number;
  label?: string;
  group?: string;
  size?: number;
}

export interface ScatterPlotData {
  points: ScatterPoint[];
  trendLine?: {
    slope: number;
    intercept: number;
    r2: number;
  };
}

// ───────────────────────────────────────────────────────────────────────────────
// TIPOS PARA COMPONENTES DE UI
// ───────────────────────────────────────────────────────────────────────────────

export interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export interface InterpretacionStats {
  titulo: string;
  descripcion: string;
  hallazgos: string[];
  recomendaciones?: string[];
  nivel: 'positivo' | 'neutral' | 'atencion' | 'critico';
}

// ───────────────────────────────────────────────────────────────────────────────
// TIPOS PARA RESPUESTAS DE RPC
// ───────────────────────────────────────────────────────────────────────────────

export interface RPCResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface DatosCorrelacionRPC {
  colaboradores: Array<{
    id: string;
    desempeno: number;
    potencial: number;
    antiguedad: number;
    edad: number;
    genero: string;
    renglon: string;
    nivel: string;
    tipoPuesto: string;
    direccion: string;
  }>;
}

// ───────────────────────────────────────────────────────────────────────────────
// CONFIGURACION DE COLORES PARA GRAFICOS
// ───────────────────────────────────────────────────────────────────────────────

export const COLORES_CALIFICACION: Record<CategoriaCalificacion, string> = {
  excelente: '#22c55e',
  muy_bueno: '#84cc16',
  satisfactorio: '#eab308',
  necesita_mejorar: '#f97316',
  insatisfactorio: '#ef4444',
};

export const COLORES_9BOX: Record<string, string> = {
  'alto-alto': '#22c55e',
  'alto-medio': '#84cc16',
  'alto-bajo': '#eab308',
  'medio-alto': '#84cc16',
  'medio-medio': '#eab308',
  'medio-bajo': '#f97316',
  'bajo-alto': '#eab308',
  'bajo-medio': '#f97316',
  'bajo-bajo': '#ef4444',
};

export const COLORES_PRIORIDAD: Record<PrioridadCapacitacion, string> = {
  alta: '#ef4444',
  media: '#f97316',
  baja: '#eab308',
};

export const COLORES_CLASIFICACION: Record<ClasificacionDimension, string> = {
  fortaleza: '#22c55e',
  oportunidad: '#eab308',
  critica: '#ef4444',
};

// ───────────────────────────────────────────────────────────────────────────────
// RANGOS PREDEFINIDOS
// ───────────────────────────────────────────────────────────────────────────────

export const RANGOS_EDAD: RangoEdad[] = [
  { rango: '18-25', label: '18-25 años', edadMin: 18, edadMax: 25 },
  { rango: '26-35', label: '26-35 años', edadMin: 26, edadMax: 35 },
  { rango: '36-45', label: '36-45 años', edadMin: 36, edadMax: 45 },
  { rango: '46-55', label: '46-55 años', edadMin: 46, edadMax: 55 },
  { rango: '56-65', label: '56-65 años', edadMin: 56, edadMax: 65 },
  { rango: '65+', label: '65+ años', edadMin: 65, edadMax: 100 },
];

export const RANGOS_ANTIGUEDAD: RangoAntiguedad[] = [
  { rango: '0-6', label: '0-6 meses', mesesMin: 0, mesesMax: 6 },
  { rango: '6-12', label: '6-12 meses', mesesMin: 6, mesesMax: 12 },
  { rango: '1-2', label: '1-2 años', mesesMin: 12, mesesMax: 24 },
  { rango: '2-5', label: '2-5 años', mesesMin: 24, mesesMax: 60 },
  { rango: '5-10', label: '5-10 años', mesesMin: 60, mesesMax: 120 },
  { rango: '10+', label: '10+ años', mesesMin: 120, mesesMax: 600 },
];

export const CATEGORIAS_CALIFICACION: Array<{
  categoria: CategoriaCalificacion;
  rango: string;
  min: number;
  max: number;
}> = [
  { categoria: 'excelente', rango: '90-100', min: 90, max: 100 },
  { categoria: 'muy_bueno', rango: '80-89', min: 80, max: 89 },
  { categoria: 'satisfactorio', rango: '70-79', min: 70, max: 79 },
  { categoria: 'necesita_mejorar', rango: '60-69', min: 60, max: 69 },
  { categoria: 'insatisfactorio', rango: '<60', min: 0, max: 59 },
];
