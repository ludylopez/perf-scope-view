import { StyleSheet } from '@react-pdf/renderer';

export const pdfStyles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  
  // Header
  header: {
    backgroundColor: '#1e40af',
    color: '#ffffff',
    padding: 25,
    marginBottom: 0,
    textAlign: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#e0e7ff',
    marginTop: 5,
    fontWeight: 'normal',
  },
  
  // Info Card
  infoCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 25,
    borderBottom: '2px solid #e5e7eb',
  },
  infoCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 0,
  },
  infoColumn: {
    width: '50%',
    paddingRight: 15,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#6b7280',
    width: '40%',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 10,
    color: '#1f2937',
    width: '60%',
    lineHeight: 1.4,
  },
  
  // Resultado Section
  resultadoSection: {
    marginBottom: 30,
    padding: 25,
    backgroundColor: '#f8fafc',
    borderLeft: '4px solid #3b82f6',
    marginLeft: 30,
    marginRight: 30,
  },
  resultadoSectionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultadoLeft: {
    flex: 1,
  },
  resultadoRight: {
    width: 120,
    alignItems: 'center',
  },
  percentageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3b82f6',
    marginBottom: 10,
  },
  percentage: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  percentageLabel: {
    fontSize: 9,
    color: '#ffffff',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  interpretation: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
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
    fontSize: 11,
    color: '#4b5563',
    lineHeight: 1.6,
    marginTop: 8,
  },
  resultadoTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  
  // Radar Chart
  radarSection: {
    marginBottom: 25,
    marginLeft: 30,
    marginRight: 30,
  },
  radarTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1f2937',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingBottom: 8,
    borderBottom: '2px solid #e5e7eb',
  },
  radarDescription: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 15,
    marginTop: 5,
    lineHeight: 1.5,
  },
  radarImage: {
    width: '100%',
    height: 200,
    marginVertical: 10,
    objectFit: 'contain',
  },
  
  // Fortalezas y Oportunidades
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 25,
    marginLeft: 30,
    marginRight: 30,
    color: '#1f2937',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingBottom: 8,
    borderBottom: '2px solid #e5e7eb',
  },
  fortalezaCard: {
    backgroundColor: '#fffbeb',
    padding: 15,
    marginBottom: 12,
    marginLeft: 30,
    marginRight: 30,
    borderLeft: '4px solid #f59e0b',
    borderTop: '1px solid #fde68a',
    borderRight: '1px solid #fde68a',
    borderBottom: '1px solid #fde68a',
  },
  oportunidadCard: {
    backgroundColor: '#fff7ed',
    padding: 15,
    marginBottom: 12,
    marginLeft: 30,
    marginRight: 30,
    borderLeft: '4px solid #f97316',
    borderTop: '1px solid #fed7aa',
    borderRight: '1px solid #fed7aa',
    borderBottom: '1px solid #fed7aa',
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1f2937',
    lineHeight: 1.4,
  },
  cardValue: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 4,
  },
  cardPercentage: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  cardValuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  
  // Plan de Desarrollo
  planSection: {
    marginTop: 25,
    marginBottom: 20,
    marginLeft: 30,
    marginRight: 30,
  },
  planTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1f2937',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingBottom: 8,
    borderBottom: '2px solid #e5e7eb',
  },
  planSubtitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 18,
    marginBottom: 10,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  
  // Tabla
  table: {
    display: 'flex',
    flexDirection: 'column',
    marginTop: 10,
    marginBottom: 15,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e5e7eb',
    padding: 8,
    minHeight: 30,
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableCell: {
    fontSize: 8,
    padding: 4,
  },
  tableCellNumber: {
    width: '8%',
    textAlign: 'center',
  },
  tableCellAccion: {
    width: '35%',
  },
  tableCellPrioridad: {
    width: '12%',
  },
  tableCellResponsable: {
    width: '15%',
  },
  tableCellFecha: {
    width: '15%',
  },
  tableCellIndicador: {
    width: '15%',
  },
  
  // Badges
  badge: {
    padding: '4px 8px',
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
  },
  badgeAlta: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  },
  badgeMedia: {
    backgroundColor: '#fef3c7',
    color: '#d97706',
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
  objetivosList: {
    marginTop: 10,
    marginBottom: 15,
  },
  objetivoItem: {
    fontSize: 10,
    marginBottom: 8,
    paddingLeft: 15,
  },
  recomendacionesList: {
    marginTop: 10,
  },
  recomendacionItem: {
    fontSize: 10,
    marginBottom: 6,
    paddingLeft: 15,
    color: '#374151',
  },
  
  // Dimensiones Débiles
  dimensionDebilCard: {
    backgroundColor: '#fff7ed',
    padding: 10,
    marginBottom: 12,
    borderRadius: 5,
    borderLeft: '4px solid #f97316',
  },
  dimensionDebilTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  dimensionDebilScore: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 8,
  },
  dimensionDebilActions: {
    marginLeft: 10,
  },
});

