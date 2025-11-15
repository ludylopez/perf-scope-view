import { StyleSheet } from '@react-pdf/renderer';

export const pdfStyles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#000000',
  },
  
  // Header
  header: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    padding: 20,
    marginBottom: 20,
    textAlign: 'center',
    borderRadius: 5,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  
  // Info Card
  infoCard: {
    backgroundColor: '#f9fafb',
    padding: 15,
    marginBottom: 20,
    borderRadius: 5,
    border: '1px solid #e5e7eb',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#3b82f6',
    width: '30%',
  },
  infoValue: {
    fontSize: 10,
    color: '#000000',
    width: '70%',
  },
  
  // Resultado Section
  resultadoSection: {
    marginBottom: 30,
    textAlign: 'center',
    padding: 20,
  },
  percentage: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 10,
  },
  interpretation: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  interpretationExcellent: {
    color: '#22c55e',
  },
  interpretationGood: {
    color: '#3b82f6',
  },
  interpretationRegular: {
    color: '#eab308',
  },
  interpretationNeedsImprovement: {
    color: '#f97316',
  },
  description: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 5,
  },
  
  // Radar Chart
  radarSection: {
    marginBottom: 25,
  },
  radarTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  radarDescription: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 15,
  },
  radarImage: {
    width: '100%',
    height: 200,
    marginVertical: 10,
    objectFit: 'contain',
  },
  
  // Fortalezas y Oportunidades
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 20,
  },
  fortalezaCard: {
    backgroundColor: '#fef3c7',
    padding: 12,
    marginBottom: 10,
    borderRadius: 5,
    border: '1px solid #fbbf24',
  },
  oportunidadCard: {
    backgroundColor: '#fff7ed',
    padding: 12,
    marginBottom: 10,
    borderRadius: 5,
    border: '1px solid #fb923c',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000000',
  },
  cardValue: {
    fontSize: 10,
    color: '#6b7280',
  },
  cardPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  
  // Plan de Desarrollo
  planSection: {
    marginTop: 25,
    marginBottom: 20,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  planSubtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
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
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTop: '1px solid #e5e7eb',
    paddingTop: 8,
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

