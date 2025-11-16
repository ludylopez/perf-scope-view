import { StyleSheet } from '@react-pdf/renderer';

export const pdfStyles = StyleSheet.create({
  page: {
    padding: 25,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#000000',
    backgroundColor: '#ffffff',
  },
  
  // Header
  header: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    padding: 10,
    marginBottom: 8,
    textAlign: 'center',
    borderRadius: 6,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 3,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#e0e7ff',
    opacity: 0.9,
  },
  
  // Info Card
  infoCard: {
    backgroundColor: '#ffffff',
    padding: 0,
    marginBottom: 8,
  },
  infoCardTitle: {
    fontSize: 0,
    display: 'none',
  },
  infoGrid: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  infoColumn: {
    width: '50%',
    paddingRight: 15,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  infoLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#666666',
    width: '45%',
  },
  infoValue: {
    fontSize: 8,
    color: '#000000',
    width: '55%',
  },
  infoEstado: {
    fontSize: 8,
    color: '#059669',
    fontWeight: 'bold',
  },
  
  // Resultado Section
  resultadoSection: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderLeft: '4px solid #2563eb',
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultadoSectionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    width: '100%',
  },
  resultadoLeft: {
    flex: 1,
  },
  resultadoCenter: {
    flex: 1,
  },
  percentageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  percentage: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 1,
  },
  percentageLabel: {
    fontSize: 12,
    color: '#ffffff',
  },
  interpretation: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 3,
    color: '#1f2937',
  },
  interpretationExcellent: {
    color: '#16a34a',
  },
  interpretationGood: {
    color: '#2563eb',
  },
  interpretationRegular: {
    color: '#ca8a04',
  },
  interpretationNeedsImprovement: {
    color: '#ea580c',
  },
  description: {
    fontSize: 8,
    color: '#666666',
    lineHeight: 1.4,
  },
  resultadoTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 3,
  },
  radarPlaceholder: {
    fontSize: 8,
    color: '#0369a1',
    textAlign: 'center',
    lineHeight: 1.4,
  },
  
  // Radar Chart
  radarSection: {
    marginBottom: 8,
  },
  radarTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1f2937',
    paddingBottom: 2,
    borderBottom: '1px solid #e5e7eb',
  },
  radarDescription: {
    fontSize: 0,
    display: 'none',
  },
  radarImage: {
    width: '100%',
    height: 200,
    marginVertical: 10,
    objectFit: 'contain',
  },
  competenciasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  competenciaItem: {
    width: '32%',
    padding: 6,
    backgroundColor: '#f0fdf4',
    borderLeft: '3px solid #22c55e',
    borderRadius: 4,
  },
  competenciaName: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 2,
  },
  competenciaScore: {
    fontSize: 8,
    color: '#15803d',
  },
  
  // Fortalezas y Oportunidades
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 6,
    color: '#1f2937',
    paddingBottom: 2,
    borderBottom: '1px solid #e5e7eb',
  },
  fortalezasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  fortalezaCard: {
    width: '32%',
    padding: 6,
    backgroundColor: '#fef3c7',
    borderLeft: '3px solid #f59e0b',
    borderRadius: 4,
  },
  oportunidadesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  oportunidadCard: {
    width: '32%',
    padding: 6,
    backgroundColor: '#fef2f2',
    borderLeft: '3px solid #ef4444',
    borderRadius: 4,
  },
  cardTitle: {
    fontSize: 7.5,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#92400e',
  },
  oportunidadTitle: {
    fontSize: 7.5,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#7f1d1d',
  },
  cardValue: {
    fontSize: 8,
    color: '#b45309',
  },
  oportunidadValue: {
    fontSize: 8,
    color: '#991b1b',
  },
  cardPercentage: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#b45309',
  },
  cardValuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  
  // Plan de Desarrollo
  planSection: {
    marginTop: 10,
    marginBottom: 10,
  },
  planTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#1f2937',
    paddingBottom: 3,
    borderBottom: '1px solid #e5e7eb',
  },
  planSubtitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
    color: '#374151',
    paddingBottom: 3,
    borderBottom: '1px solid #e5e7eb',
  },
  planSubtitleDescription: {
    fontSize: 6.5,
    color: '#666666',
    marginBottom: 4,
  },
  
  // Tabla
  table: {
    display: 'flex',
    flexDirection: 'column',
    marginTop: 4,
    marginBottom: 10,
    border: '1px solid #e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e5e7eb',
    padding: 4,
    minHeight: 20,
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
    borderBottom: '1px solid #d1d5db',
  },
  tableCell: {
    fontSize: 6.5,
    padding: 3,
    verticalAlign: 'top',
  },
  tableCellNumber: {
    width: '5%',
    textAlign: 'center',
  },
  tableCellAccion: {
    width: '32%',
  },
  tableCellPrioridad: {
    width: '8%',
  },
  tableCellResponsable: {
    width: '15%',
  },
  tableCellFecha: {
    width: '15%',
  },
  tableCellIndicador: {
    width: '25%',
  },
  
  // Badges
  badge: {
    padding: '1px 4px',
    borderRadius: 2,
    fontSize: 6.5,
    fontWeight: 'bold',
  },
  badgeAlta: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  badgeMedia: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  badgeBaja: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
  },
  
  // Listas
  list: {
    marginLeft: 15,
    marginTop: 8,
  },
  listItem: {
    fontSize: 10,
    marginBottom: 5,
    paddingLeft: 5,
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTop: '1px solid #e5e7eb',
    paddingTop: 10,
    paddingBottom: 5,
  },
  
  // Objetivos y Recomendaciones
  objetivosSection: {
    marginBottom: 8,
  },
  objetivosList: {
    marginTop: 4,
    marginBottom: 8,
  },
  objetivoItem: {
    fontSize: 7.5,
    marginBottom: 3,
    paddingLeft: 8,
    color: '#374151',
  },
  recomendacionesList: {
    marginTop: 6,
  },
  recomendacionItem: {
    fontSize: 7.5,
    marginBottom: 3,
    paddingLeft: 8,
    color: '#374151',
  },
  
  // Dimensiones Débiles
  dimensionDebilCard: {
    backgroundColor: '#fff7ed',
    padding: 6,
    marginBottom: 4,
    borderRadius: 4,
    borderLeft: '3px solid #f97316',
  },
  dimensionDebilHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  dimensionDebilTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#7c2d12',
  },
  dimensionDebilScore: {
    fontSize: 7,
    color: '#9a3412',
  },
  dimensionDebilActions: {
    fontSize: 6.5,
    color: '#666666',
    paddingLeft: 6,
    marginTop: 1,
  },
  // Firmas
  firmasSection: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 12,
  },
  firmaBox: {
    flex: 1,
    textAlign: 'center',
  },
  firmaLinea: {
    borderTop: '1px solid #000000',
    marginBottom: 4,
  },
  firmaLabel: {
    fontSize: 7.5,
    color: '#666666',
  },
});

