// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES DE GRAFICOS AVANZADOS
// Exportaciones centralizadas para dashboards de análisis
// ═══════════════════════════════════════════════════════════════════════════════

// Cards de estadísticas
export { StatCard, StatCardGrid } from "./StatCard";

// Velocímetros/Gauges
export { GaugeChart, GaugeMini } from "./GaugeChart";

// Box Plots
export { BoxPlotChart, BoxPlotMini } from "./BoxPlotChart";

// Heatmaps de correlación
export { CorrelationHeatmap, CorrelationBadge } from "./CorrelationHeatmap";

// Radares multinivel
export { RadarMultiLevel, RadarComparativo, RadarDimensiones } from "./RadarMultiLevel";

// Lollipop charts (brechas)
export { LollipopChart, GapLollipop } from "./LollipopChart";

// Barras divergentes
export { DivergingBarChart, AutoVsJefeChart, GapBarChart } from "./DivergingBarChart";

// Treemaps
export { TreemapChart, OrganizationalTreemap, CapacitacionTreemap } from "./TreemapChart";

// Histogramas de distribución
export { DistributionHistogram, PerformanceDistributionChart } from "./DistributionHistogram";

// Scatter plots con correlación
export {
  ScatterPlotCorrelation,
  DesempenoPotencialScatter,
  EdadDesempenoScatter,
  AntiguedadDesempenoScatter,
} from "./ScatterPlotCorrelation";

// Bump charts (rankings)
export { BumpChart, RankingChangeChart, DireccionRankingChart } from "./BumpChart";

// Cards de interpretación
export {
  InterpretationCard,
  CorrelationInterpretation,
  DistributionInterpretation,
  EquityInterpretation,
  MetricWithTrend,
} from "./InterpretationCard";

// Tablas de estadísticas
export { StatsTable, StatsTableCompact, ComparisonTable } from "./StatsTable";
