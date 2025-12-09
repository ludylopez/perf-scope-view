/**
 * Tipos para la funcionalidad de Análisis de Equipo
 * Permite a jefes ver el rendimiento de su equipo directo (los que evaluó)
 */

/**
 * Resultado por dimensión de evaluación
 */
export interface DimensionResult {
  id: string;           // dim1, dim2, etc.
  nombre: string;       // Nombre completo de la dimensión
  promedio: number;     // Promedio ponderado final (70% jefe, 30% auto)
  auto?: number;        // Promedio autoevaluación
  jefe?: number;        // Promedio evaluación del jefe
}

/**
 * Nodo de la jerarquía con resultados de evaluación
 */
export interface TeamAnalysisNode {
  dpi: string;
  nombreCompleto: string;
  nombre: string;
  apellidos: string;
  cargo: string;
  area: string;
  nivel: string;
  rol: 'jefe' | 'colaborador';
  jefeDpi?: string;
  nivelJerarquico: number;

  // Resultados de evaluación
  tieneEvaluacion: boolean;
  desempenoPorcentaje?: number;
  potencialPorcentaje?: number;
  posicion9Box?: string;

  // Resultados por dimensión
  dimensiones?: DimensionResult[];

  // Info adicional para jefes
  esJefe: boolean;
  totalColaboradoresDirectos?: number;
  promedioEquipo?: number;
  promedioEquipoPorDimension?: Record<string, number>;
}

/**
 * Respuesta de la función get_equipo_directo_completo
 * Contiene toda la información del equipo directo en una sola estructura
 */
export interface EquipoDirectoCompleto {
  colaboradores: TeamAnalysisNode[];
  estadisticas: TeamAnalysisStats;
  eNPS: {
    valor: number | null;
    promoters: number;
    passives: number;
    detractors: number;
    totalRespuestas: number;
    valorOrganizacion: number | null;
  };
}

/**
 * Respuesta de la función get_equipo_cascada_completo
 * Contiene toda la jerarquía en cascada (directos + indirectos)
 */
export interface EquipoCascadaCompleto {
  colaboradores: TeamAnalysisNodeCascada[];
  estadisticas: TeamAnalysisStats;
  jefesSubordinados: JefeParaFiltro[];
  eNPS: {
    valor: number | null;
    promoters: number;
    passives: number;
    detractors: number;
    totalRespuestas: number;
    valorOrganizacion: number | null;
  };
}

/**
 * Nodo de la jerarquía extendido para cascada
 * Incluye información del jefe directo de cada colaborador
 */
export interface TeamAnalysisNodeCascada extends TeamAnalysisNode {
  jefeNombre?: string;  // Nombre del jefe directo de este colaborador
}

/**
 * Estadísticas agregadas del equipo directo
 */
export interface TeamAnalysisStats {
  totalPersonas: number;
  totalJefes: number;
  totalColaboradores: number;
  evaluacionesCompletadas: number;
  tasaCompletitud: number;
  promedioDesempenoUnidad: number;
  promedioPotencialUnidad: number;
  // Promedios organizacionales para comparativa
  promedioDesempenoOrganizacion: number;
  promedioPotencialOrganizacion: number;
  distribucion9Box: Record<string, number>;
  // eNPS (Employee Net Promoter Score) de la unidad
  eNPS?: number;
  eNPSPromoters?: number;
  eNPSPassives?: number;
  eNPSDetractors?: number;
  eNPSTotalRespuestas?: number;
  // eNPS organizacional para comparativa
  eNPSOrganizacion?: number;
}

/**
 * Comparativa de equipos de jefes subordinados
 */
export interface TeamComparison {
  jefeDpi: string;
  jefeNombre: string;
  jefeCargo: string;
  jefeArea: string;
  jefeNivel: string;
  nivelJerarquico: number;
  totalEquipo: number;
  evaluacionesCompletadas: number;
  promedioDesempeno: number | null;
  promedioPotencial: number | null;
  tasaCompletitud: number;
  distribucion9Box: Record<string, number> | null;
  // Evaluación del jefe como colaborador
  evaluacionJefe?: {
    existe: boolean;
    desempeno?: number;
    potencial?: number;
    posicion9Box?: string;
  };
}

/**
 * Filtros disponibles para análisis de equipo
 */
export interface TeamAnalysisFilters {
  jefeDpi?: string;        // Filtra cascada completa de este jefe
  grupoId?: string;        // Filtra por grupo/cuadrilla
  nivelPuesto?: string;    // Filtra por nivel (O1, O2, etc.)
  busqueda?: string;       // Búsqueda por nombre
}

/**
 * Jefe disponible para filtro
 */
export interface JefeParaFiltro {
  dpi: string;
  nombre: string;
  cargo: string;
  nivelJerarquico: number;
}

/**
 * Grupo disponible para filtro
 */
export interface GrupoParaFiltro {
  id: string;
  nombre: string;
  tipo: string;
  jefeNombre: string;
  totalMiembros: number;
}

/**
 * Dimensión con resultados comparativos
 */
export interface DimensionComparativa {
  id: string;
  nombre: string;
  valorAuto: number;
  valorJefe: number;
  valorFinal: number;
  diferencia: number;  // jefe - auto
}

/**
 * Detalle completo de colaborador para modal
 */
export interface TeamMemberDetail {
  usuario: {
    dpi: string;
    nombre: string;
    apellidos: string;
    nombreCompleto: string;
    cargo: string;
    area: string;
    nivel: string;
    rol: string;
    jefeDirecto?: {
      dpi: string;
      nombre: string;
    };
    esJefe: boolean;
    totalEquipo: number;
  };
  evaluacion: {
    tieneEvaluacion: boolean;
    desempenoPorcentaje?: number;
    potencialPorcentaje?: number;
    posicion9Box?: string;
    desempenoFinal?: number;
    potencial?: number;
    resultadoFinal?: {
      desempenoAuto?: number;
      desempenoJefe?: number;
      desempenoFinal?: number;
      potencial?: number;
      posicion9Box?: string;
    };
    comparativo?: {
      dimensiones?: Array<{
        dimensionId: string;
        nombre: string;
        autoevaluacion: number;
        evaluacionJefe: number;
        diferencia: number;
      }>;
    };
    promedioEquipo?: number;
  };
  promedioUnidad: number;
}

/**
 * Miembro para vista 9-box
 */
export interface TeamMember9Box {
  dpi: string;
  nombre: string;
  nombreCompleto?: string; // Opcional para compatibilidad con ambos casos
  cargo: string;
  area: string;
  nivel: string;
  desempenoFinal: number;
  potencial?: number;
  posicion9Box: string;
  desempenoPorcentaje: number;
  potencialPorcentaje?: number;
  jefeDpi?: string;
  jefeNombre?: string;
}

/**
 * Props para el componente principal TeamAnalysisTab
 */
export interface TeamAnalysisTabProps {
  usuarioDpi: string;
  periodoId: string;
}

/**
 * Props para componentes que reciben nodos de jerarquía
 */
export interface TeamHierarchyProps {
  nodes: TeamAnalysisNode[];
  onNodeClick?: (node: TeamAnalysisNode) => void;
}

/**
 * Props para el modal de detalle
 */
export interface TeamMemberDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  colaboradorDpi: string;
  periodoId: string;
}

/**
 * Props para filtros
 */
export interface TeamFiltersProps {
  jefes: JefeParaFiltro[];
  grupos: GrupoParaFiltro[];
  filters: TeamAnalysisFilters;
  onFiltersChange: (filters: TeamAnalysisFilters) => void;
  showNivelFilter?: boolean;
}

/**
 * Props para comparativas
 */
export interface TeamComparativeChartsProps {
  comparativas: TeamComparison[];
  promedioUnidad: number;
}

/**
 * Props para vista 9-box
 */
export interface TeamNineBoxViewProps {
  data: TeamMember9Box[];
  jefes: JefeParaFiltro[];
  grupos: GrupoParaFiltro[];
  onMemberClick?: (member: TeamMember9Box) => void;
}

/**
 * Estado del componente TeamAnalysisTab
 */
export interface TeamAnalysisState {
  isLoading: boolean;
  error: string | null;
  activeTab: string;
  jerarquia: TeamAnalysisNode[];
  stats: TeamAnalysisStats | null;
  comparativas: TeamComparison[];
  nineBoxData: TeamMember9Box[];
  jefesParaFiltro: JefeParaFiltro[];
  gruposParaFiltro: GrupoParaFiltro[];
  filters: TeamAnalysisFilters;
  selectedMember: TeamAnalysisNode | null;
  isDetailModalOpen: boolean;
}

/**
 * Datos de colaborador para análisis de IA
 */
export interface ColaboradorAIData {
  dpi: string;
  nombreCompleto: string;
  cargo: string;
  area: string;
  nivel: string;
  posicion9Box?: string;
  desempenoPorcentaje?: number;
  potencialPorcentaje?: number;
  comentariosJefe: Record<string, string>; // dimensionId -> comentario
  comentariosEmpleado: Record<string, string>; // dimensionId -> comentario
  comentariosHerramientas: string[];
  comentariosCapacitaciones: string[];
}

/**
 * Datos completos del equipo para análisis de IA
 */
export interface TeamAIAnalysisData {
  estadisticasEquipo: {
    totalColaboradores: number;
    evaluacionesCompletadas: number;
    promedioDesempeno: number;
    promedioPotencial: number;
    indiceDesarrollo: number;
    promedioDesempenoOrganizacion: number;
    promedioPotencialOrganizacion: number;
    distribucion9Box: Record<string, number>;
  };
  composicionEquipo: {
    porArea: Record<string, number>;
    porNivel: Record<string, number>;
    porCargo: Record<string, number>;
  };
  colaboradores: ColaboradorAIData[];
  periodoId: string;
  periodoNombre?: string;
}

/**
 * Respuesta de IA para análisis de fortalezas y oportunidades
 */
export interface TeamAIAnalysisResponse {
  fortalezas: Array<{
    titulo: string;
    descripcion: string;
    evidencia: string;
    impacto: string;
  }>;
  oportunidadesMejora: Array<{
    titulo: string;
    descripcion: string;
    causas: string;
    recomendaciones: string[];
    prioridad: "alta" | "media" | "baja";
  }>;
  resumenEjecutivo: string;
}