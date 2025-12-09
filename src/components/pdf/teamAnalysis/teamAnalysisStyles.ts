import { StyleSheet } from '@react-pdf/renderer';

/**
 * Colores para cada posición del 9-Box
 */
export const NINE_BOX_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'alto-alto':   { bg: '#dcfce7', border: '#22c55e', text: '#166534' }, // Estrellas - Verde
  'medio-alto':  { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' }, // Alto Potencial - Azul
  'bajo-alto':   { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' }, // Enigmas - Amarillo
  'alto-medio':  { bg: '#f0fdf4', border: '#86efac', text: '#15803d' }, // Pilares - Verde claro
  'medio-medio': { bg: '#f8fafc', border: '#cbd5e1', text: '#475569' }, // Núcleo - Gris
  'bajo-medio':  { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' }, // Req. Atención - Rojo claro
  'alto-bajo':   { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' }, // Expertos - Azul claro
  'medio-bajo':  { bg: '#fafaf9', border: '#d6d3d1', text: '#57534e' }, // Confiables - Gris cálido
  'bajo-bajo':   { bg: '#fee2e2', border: '#ef4444', text: '#7f1d1d' }, // Bajo Rend. - Rojo
};

/**
 * Etiquetas para cada posición del 9-Box
 */
export const NINE_BOX_LABELS: Record<string, string> = {
  'alto-alto': 'Estrellas',
  'medio-alto': 'Alto Potencial',
  'bajo-alto': 'Enigmas',
  'alto-medio': 'Pilares',
  'medio-medio': 'Núcleo',
  'bajo-medio': 'Req. Atención',
  'alto-bajo': 'Expertos',
  'medio-bajo': 'Confiables',
  'bajo-bajo': 'Bajo Rend.',
};

/**
 * Iconos/emojis para cada posición del 9-Box
 * Usando emojis Unicode que funcionan mejor en PDFs modernos
 */
export const NINE_BOX_ICONS: Record<string, string> = {
  'alto-alto': '⭐',      // Estrellas
  'medio-alto': '🚀',     // Alto Potencial
  'bajo-alto': '❓',      // Enigmas
  'alto-medio': '💎',     // Pilares
  'medio-medio': '⚪',    // Núcleo
  'bajo-medio': '⚠️',     // Req. Atención
  'alto-bajo': '🎓',      // Expertos
  'medio-bajo': '✅',     // Confiables
  'bajo-bajo': '🔴',      // Bajo Rend.
};

/**
 * Estilos específicos para PDFs de análisis de equipo/unidad
 */
export const teamAnalysisStyles = StyleSheet.create({
  // Page base
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },

  // Header principal
  header: {
    backgroundColor: '#ffffff',
    padding: 15,
    marginBottom: 15,
    textAlign: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2563eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  headerLogo: {
    width: 65,
    height: 65,
    objectFit: 'contain',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#4b5563',
    fontWeight: '600',
  },
  headerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2563eb',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e40af',
  },
  headerBadgeText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },

  // Info del jefe/gerente
  infoTable: {
    marginBottom: 15,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  infoRowLast: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
  },
  infoCell: {
    flex: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCellBorder: {
    borderRightWidth: 1.5,
    borderRightColor: '#d1d5db',
  },
  infoLabel: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#4b5563',
    marginRight: 6,
    minWidth: 60,
  },
  infoValue: {
    fontSize: 8.5,
    color: '#1f2937',
    flex: 1,
    fontWeight: '600',
  },

  // Stats Cards
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  statsCard: {
    flex: 1,
    minWidth: '18%',
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statsCardPrimary: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    borderWidth: 2.5,
  },
  statsCardSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
    borderWidth: 2.5,
  },
  statsCardPurple: {
    backgroundColor: '#faf5ff',
    borderColor: '#a855f7',
    borderWidth: 2.5,
  },
  statsCardWarning: {
    backgroundColor: '#fefce8',
    borderColor: '#eab308',
    borderWidth: 2.5,
  },
  statsIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 7.5,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  statsValuePrimary: {
    color: '#2563eb',
    fontSize: 24,
  },
  statsValueSuccess: {
    color: '#16a34a',
    fontSize: 24,
  },
  statsValuePurple: {
    color: '#7c3aed',
    fontSize: 24,
  },
  statsSubtext: {
    fontSize: 6.5,
    color: '#6b7280',
    marginTop: 3,
    textAlign: 'center',
    fontWeight: '500',
  },
  statsComparison: {
    fontSize: 6.5,
    marginTop: 4,
    fontWeight: '600',
  },
  statsComparisonUp: {
    color: '#16a34a',
  },
  statsComparisonDown: {
    color: '#dc2626',
  },

  // 9-Box Grid
  nineBoxSection: {
    marginBottom: 20,
  },
  nineBoxTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 2.5,
    borderBottomColor: '#2563eb',
    letterSpacing: 0.5,
  },
  
  // Cuadrantes 9-Box con colaboradores
  quadrantCard: {
    marginBottom: 10,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
  },
  quadrantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  quadrantHeaderLeft: {
    flex: 1,
  },
  quadrantTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  quadrantCount: {
    fontSize: 8.5,
    fontWeight: '600',
  },
  quadrantMembers: {
    marginBottom: 8,
  },
  quadrantMemberItem: {
    marginBottom: 3,
    padding: 4,
    paddingLeft: 6,
    paddingRight: 6,
    backgroundColor: '#ffffff',
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quadrantMemberName: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 2,
    marginRight: 8,
  },
  quadrantMemberCargo: {
    fontSize: 7.5,
    color: '#6b7280',
    flex: 1.5,
    marginRight: 8,
  },
  quadrantMemberStats: {
    flexDirection: 'row',
    gap: 10,
    flex: 1.2,
    justifyContent: 'flex-end',
  },
  quadrantMemberStat: {
    fontSize: 7.5,
    color: '#4b5563',
    fontWeight: '500',
  },
  quadrantDescription: {
    marginTop: 5,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  quadrantDescriptionTitle: {
    fontSize: 8.5,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  quadrantDescriptionText: {
    fontSize: 7.5,
    color: '#4b5563',
    lineHeight: 1.3,
    marginBottom: 6,
  },
  quadrantActionsTitle: {
    fontSize: 8.5,
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 2,
  },
  quadrantActionItem: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingLeft: 3,
  },
  quadrantActionBullet: {
    fontSize: 7.5,
    marginRight: 5,
    fontWeight: 'bold',
  },
  quadrantActionText: {
    fontSize: 7.5,
    color: '#4b5563',
    lineHeight: 1.3,
    flex: 1,
  },
  nineBoxContainer: {
    alignItems: 'center',
    marginVertical: 15,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  nineBoxAxisLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#4b5563',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  nineBoxGrid: {
    width: 320,
    borderWidth: 2,
    borderColor: '#1e40af',
    borderRadius: 4,
    overflow: 'hidden',
  },
  nineBoxRow: {
    flexDirection: 'row',
  },
  nineBoxCell: {
    width: 106.67,
    height: 65,
    padding: 6,
    borderWidth: 1,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nineBoxCellIcon: {
    fontSize: 14,
    marginBottom: 3,
    fontWeight: 'bold',
  },
  nineBoxCellLabel: {
    fontSize: 7.5,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 3,
  },
  nineBoxCellCount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  nineBoxCellPercent: {
    fontSize: 7,
    color: '#4b5563',
    fontWeight: '600',
    marginTop: 2,
  },
  nineBoxAxisX: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 320,
    marginTop: 8,
    paddingHorizontal: 5,
  },
  nineBoxAxisXLabel: {
    fontSize: 8,
    color: '#4b5563',
    fontWeight: '600',
  },

  // Métricas clave del 9-Box
  nineBoxMetrics: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  nineBoxMetricsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  nineBoxMetricRow: {
    flexDirection: 'row',
    marginBottom: 5,
    alignItems: 'center',
    paddingVertical: 2,
  },
  nineBoxMetricBullet: {
    fontSize: 10,
    marginRight: 8,
    fontWeight: 'bold',
  },
  nineBoxMetricText: {
    fontSize: 8.5,
    color: '#4b5563',
    flex: 1,
    fontWeight: '500',
  },
  nineBoxMetricValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1e40af',
  },

  // Tabla de colaboradores
  membersSection: {
    marginBottom: 20,
  },
  membersTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 2.5,
    borderBottomColor: '#2563eb',
    letterSpacing: 0.5,
  },
  membersTable: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
  },
  membersTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e40af',
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a8a',
  },
  membersTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    minHeight: 20,
  },
  membersTableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  membersTableCell: {
    padding: 6,
    fontSize: 7.5,
    justifyContent: 'center',
  },
  membersTableCellHeader: {
    fontWeight: 'bold',
    fontSize: 8,
    color: '#ffffff',
  },
  membersTableCellNum: {
    width: '5%',
    textAlign: 'center',
  },
  membersTableCellName: {
    width: '25%',
  },
  membersTableCellCargo: {
    width: '20%',
  },
  membersTableCellJefe: {
    width: '20%',
  },
  membersTableCellDesempeno: {
    width: '12%',
    textAlign: 'center',
  },
  membersTableCellPotencial: {
    width: '10%',
    textAlign: 'center',
  },
  membersTableCell9Box: {
    width: '13%',
    textAlign: 'center',
  },
  // Sin columna Jefe (para equipo directo)
  membersTableCellNameWide: {
    width: '30%',
  },
  membersTableCellCargoWide: {
    width: '25%',
  },
  membersTableCellDesempenoWide: {
    width: '15%',
    textAlign: 'center',
  },
  membersTableCellPotencialWide: {
    width: '12%',
    textAlign: 'center',
  },
  membersTableCell9BoxWide: {
    width: '13%',
    textAlign: 'center',
  },
  // Badge para posición 9-box
  positionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 6.5,
    fontWeight: 'bold',
    textAlign: 'center',
    borderWidth: 1,
  },

  // Sección de análisis IA
  aiSection: {
    marginBottom: 20,
  },
  aiSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 2.5,
    borderBottomColor: '#2563eb',
    letterSpacing: 0.5,
  },
  aiResumen: {
    padding: 10,
    backgroundColor: '#f0f9ff',
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
    marginBottom: 12,
  },
  aiResumenTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0369a1',
    marginBottom: 4,
  },
  aiResumenText: {
    fontSize: 8,
    color: '#1f2937',
    lineHeight: 1.4,
  },
  aiSubsectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 8,
    marginBottom: 6,
  },

  // Fortalezas
  fortalezaCard: {
    padding: 8,
    backgroundColor: '#fefce8',
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#eab308',
    marginBottom: 8,
  },
  fortalezaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  fortalezaIcon: {
    fontSize: 10,
    marginRight: 5,
    color: '#ca8a04',
  },
  fortalezaTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#854d0e',
    flex: 1,
  },
  fortalezaDescription: {
    fontSize: 8,
    color: '#422006',
    marginBottom: 4,
    lineHeight: 1.3,
  },
  fortalezaDetail: {
    fontSize: 7,
    color: '#713f12',
    marginTop: 2,
  },
  fortalezaDetailLabel: {
    fontWeight: 'bold',
  },

  // Oportunidades de mejora
  oportunidadCard: {
    padding: 8,
    backgroundColor: '#fff7ed',
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#f97316',
    marginBottom: 8,
  },
  oportunidadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  oportunidadIcon: {
    fontSize: 10,
    marginRight: 5,
    color: '#ea580c',
  },
  oportunidadTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#9a3412',
    flex: 1,
  },
  oportunidadPrioridad: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 6,
    fontWeight: 'bold',
  },
  prioridadAlta: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  prioridadMedia: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  prioridadBaja: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  oportunidadDescription: {
    fontSize: 8,
    color: '#431407',
    marginBottom: 4,
    lineHeight: 1.3,
  },
  oportunidadCausas: {
    fontSize: 7,
    color: '#7c2d12',
    marginBottom: 4,
  },
  oportunidadRecomendaciones: {
    marginTop: 4,
  },
  oportunidadRecomendacionesTitle: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#7c2d12',
    marginBottom: 2,
  },
  oportunidadRecomendacionItem: {
    fontSize: 7,
    color: '#431407',
    paddingLeft: 8,
    marginBottom: 2,
  },

  // Tabla comparativa de jefes
  jefesSection: {
    marginBottom: 20,
  },
  jefesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 2.5,
    borderBottomColor: '#2563eb',
    letterSpacing: 0.5,
  },
  jefesTable: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
  },
  jefesTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e40af',
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a8a',
  },
  jefesTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    minHeight: 20,
  },
  jefesTableCell: {
    padding: 6,
    fontSize: 8,
    justifyContent: 'center',
  },
  jefesTableCellHeader: {
    fontWeight: 'bold',
    fontSize: 8.5,
    color: '#ffffff',
  },
  jefesTableCellName: {
    width: '30%',
  },
  jefesTableCellEquipo: {
    width: '12%',
    textAlign: 'center',
  },
  jefesTableCellDesempeno: {
    width: '15%',
    textAlign: 'center',
  },
  jefesTableCellPotencial: {
    width: '15%',
    textAlign: 'center',
  },
  jefesTableCellCompletitud: {
    width: '15%',
    textAlign: 'center',
  },
  jefesTableCell9Box: {
    width: '13%',
    textAlign: 'center',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 7.5,
    color: '#6b7280',
    borderTopWidth: 1.5,
    borderTopColor: '#d1d5db',
    paddingTop: 10,
    fontWeight: '500',
  },

  // Utilidades
  row: {
    flexDirection: 'row',
  },
  mb4: {
    marginBottom: 4,
  },
  mb8: {
    marginBottom: 8,
  },
  mt8: {
    marginTop: 8,
  },
  textCenter: {
    textAlign: 'center',
  },
  textBold: {
    fontWeight: 'bold',
  },
});
