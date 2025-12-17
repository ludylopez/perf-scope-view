import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { PlanCapacitacionEstructurado } from '@/types/trainingPlan';

interface TrainingPlanPDFProps {
  planEstructurado: PlanCapacitacionEstructurado;
  directorNombre?: string;
  totalColaboradores?: number;
}

const trainingPlanStyles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 15,
    marginBottom: 15,
    textAlign: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#4b5563',
    fontWeight: '600',
  },
  headerInfo: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 2.5,
    borderBottomColor: '#2563eb',
  },
  card: {
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 6,
  },
  cardContent: {
    fontSize: 8,
    color: '#4b5563',
    lineHeight: 1.4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  gridItem: {
    width: '48%',
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  table: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e40af',
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a8a',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    minHeight: 20,
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    padding: 6,
    fontSize: 7.5,
  },
  tableCellHeader: {
    fontWeight: 'bold',
    fontSize: 8,
    color: '#ffffff',
  },
  tableCellDimension: {
    width: '25%',
  },
  tableCellScore: {
    width: '12%',
    textAlign: 'center',
  },
  tableCellZScore: {
    width: '12%',
    textAlign: 'center',
  },
  tableCellPrioridad: {
    width: '15%',
    textAlign: 'center',
  },
  tableCellColaboradores: {
    width: '18%',
    textAlign: 'center',
  },
  tableCellPorcentaje: {
    width: '18%',
    textAlign: 'center',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 6.5,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  badgeCritica: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  badgeAlta: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  badgeMedia: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  badgeBaja: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
  },
  badgeUrgente: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  listItem: {
    fontSize: 8,
    marginBottom: 4,
    paddingLeft: 8,
    color: '#4b5563',
  },
  nineBoxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  nineBoxCard: {
    width: '31%',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  nineBoxCardTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  nineBoxCardContent: {
    fontSize: 7.5,
    color: '#4b5563',
    lineHeight: 1.3,
  },
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
  },
});

const getPrioridadBadgeStyle = (prioridad: string) => {
  switch (prioridad) {
    case 'critica':
    case 'urgente':
      return trainingPlanStyles.badgeCritica;
    case 'alta':
      return trainingPlanStyles.badgeAlta;
    case 'media':
      return trainingPlanStyles.badgeMedia;
    case 'baja':
      return trainingPlanStyles.badgeBaja;
    default:
      return trainingPlanStyles.badgeMedia;
  }
};

const getPrioridadText = (prioridad: string) => {
  const map: Record<string, string> = {
    critica: 'Crítica',
    urgente: 'Urgente',
    alta: 'Alta',
    media: 'Media',
    baja: 'Baja',
  };
  return map[prioridad] || prioridad;
};

export const TrainingPlanPDF = ({ planEstructurado, directorNombre, totalColaboradores }: TrainingPlanPDFProps) => {
  const fechaActual = new Date();
  const fechaFormateada = fechaActual.toLocaleDateString('es-GT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const areaDepartamento = planEstructurado.informacionGeneral?.areaDepartamento || "Unidad Organizacional";
  const periodo = planEstructurado.informacionGeneral?.periodo || "Enero - Diciembre 2026";
  const responsable = planEstructurado.informacionGeneral?.responsable || "Gerencia de Recursos Humanos";
  const totalColab = planEstructurado.informacionGeneral?.totalColaboradores || totalColaboradores || 0;
  const tematicas = planEstructurado.tematicas || [];

  // Calcular total de horas
  const totalHoras = tematicas.reduce((acc, tematica) => {
    return acc + (tematica.actividades?.reduce((hAcc, actividad) => {
      const horasMatch = actividad.duracion?.match(/(\d+)\s*hora/i);
      return hAcc + (horasMatch ? parseInt(horasMatch[1]) : 0);
    }, 0) || 0);
  }, 0);

  return (
    <Document>
      {/* PÁGINA 1: Header + Información del Departamento + Programa */}
      <Page size="A4" style={trainingPlanStyles.page}>
        {/* Header centrado - igual que la vista */}
        <View style={{ marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', textAlign: 'center' }}>
          <Text style={{ fontSize: 9, color: '#6b7280', marginBottom: 4 }}>
            MUNICIPALIDAD DE ESQUIPULAS
          </Text>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 }}>
            {areaDepartamento}
          </Text>
          <Text style={{ fontSize: 12, color: '#4b5563', marginBottom: 4 }}>
            Plan de Capacitación Anual
          </Text>
          <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 4 }}>
            Período: {periodo}
          </Text>
        </View>

        {/* Información del Departamento - igual que la vista */}
        <View style={{ marginBottom: 25, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#1f2937', marginBottom: 10, textTransform: 'uppercase' }}>
            INFORMACIÓN DEL DEPARTAMENTO
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <View style={{ width: '48%', marginBottom: 8, padding: 10, backgroundColor: '#ffffff', borderRadius: 4, borderWidth: 1, borderColor: '#e5e7eb' }}>
              <Text style={{ fontSize: 8, color: '#6b7280', marginBottom: 4 }}>DIRECTOR</Text>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#1f2937' }}>{directorNombre || "N/A"}</Text>
            </View>
            <View style={{ width: '48%', marginBottom: 8, padding: 10, backgroundColor: '#ffffff', borderRadius: 4, borderWidth: 1, borderColor: '#e5e7eb' }}>
              <Text style={{ fontSize: 8, color: '#6b7280', marginBottom: 4 }}>TOTAL COLABORADORES</Text>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#1f2937' }}>{totalColab} personas</Text>
            </View>
            <View style={{ width: '48%', marginBottom: 8, padding: 10, backgroundColor: '#ffffff', borderRadius: 4, borderWidth: 1, borderColor: '#e5e7eb' }}>
              <Text style={{ fontSize: 8, color: '#6b7280', marginBottom: 4 }}>HORAS DE CAPACITACIÓN</Text>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#1f2937' }}>{totalHoras} horas</Text>
            </View>
            <View style={{ width: '48%', marginBottom: 8, padding: 10, backgroundColor: '#ffffff', borderRadius: 4, borderWidth: 1, borderColor: '#e5e7eb' }}>
              <Text style={{ fontSize: 8, color: '#6b7280', marginBottom: 4 }}>COORDINACIÓN</Text>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#1f2937' }}>{responsable}</Text>
            </View>
          </View>
        </View>

        {/* Programa de Capacitación - igual que la vista compacta */}
        <View>
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#1f2937', marginBottom: 15, textTransform: 'uppercase' }}>
            PROGRAMA DE CAPACITACIÓN
          </Text>
          
          {tematicas.map((tematica, tIdx) => {
            const actividades = tematica.actividades || [];
            const duracionTotal = actividades.reduce((acc, actividad) => {
              const horasMatch = actividad.duracion?.match(/(\d+)\s*hora/i);
              return acc + (horasMatch ? parseInt(horasMatch[1]) : 0);
            }, 0);

            return (
              <View key={tIdx} style={{ marginBottom: 20, padding: 12, backgroundColor: '#f9fafb', borderRadius: 6, borderLeftWidth: 4, borderLeftColor: '#3b82f6' }}>
                {/* Participantes arriba del título - igual que la vista */}
                {tematica.participantesRecomendados && (
                  <View style={{ marginBottom: 10, padding: 6, backgroundColor: '#dbeafe', borderRadius: 4, borderWidth: 1, borderColor: '#93c5fd' }}>
                    <Text style={{ fontSize: 8, color: '#1e40af', fontWeight: 'bold' }}>
                      👥 {tematica.participantesRecomendados}
                    </Text>
                  </View>
                )}
                
                {/* Título y descripción - igual que la vista */}
                <View style={{ marginBottom: 5 }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 }}>
                    {tematica.nombre}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#4b5563', lineHeight: 1.4 }}>
                    {tematica.descripcion}
                  </Text>
                  <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 4 }}>
                    ⏱️ Duración total: {duracionTotal} horas
                  </Text>
                </View>

                {/* Tabla de Actividades - igual que la vista */}
                {actividades.length > 0 && (
                  <View style={{ marginTop: 5, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 4 }}>
                    <View style={{ flexDirection: 'row', backgroundColor: '#1e40af', padding: 6 }}>
                      <Text style={{ width: '35%', fontSize: 7, fontWeight: 'bold', color: '#ffffff' }}>ACTIVIDAD</Text>
                      <Text style={{ width: '15%', fontSize: 7, fontWeight: 'bold', color: '#ffffff' }}>TIPO</Text>
                      <Text style={{ width: '12%', fontSize: 7, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' }}>HORAS</Text>
                      <Text style={{ width: '18%', fontSize: 7, fontWeight: 'bold', color: '#ffffff' }}>MODALIDAD</Text>
                      <Text style={{ width: '20%', fontSize: 7, fontWeight: 'bold', color: '#ffffff' }}>COMPETENCIAS</Text>
                    </View>
                    {actividades.map((actividad, aIdx) => {
                      const horasMatch = actividad.duracion?.match(/(\d+)\s*hora/i);
                      const horas = horasMatch ? horasMatch[1] : actividad.duracion || "N/A";
                      const competencias = actividad.dimensionRelacionada 
                        ? [actividad.dimensionRelacionada]
                        : tematica.dimensionesRelacionadas || [];

                      return (
                        <View key={aIdx} style={{ flexDirection: 'row', padding: 6, backgroundColor: aIdx % 2 === 1 ? '#f9fafb' : '#ffffff', borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' }}>
                          <View style={{ width: '35%' }}>
                            <Text style={{ fontSize: 7.5, fontWeight: 'bold', color: '#1f2937' }}>
                              {actividad.topico}
                            </Text>
                            {actividad.descripcion && (
                              <Text style={{ fontSize: 6.5, color: '#6b7280', marginTop: 2 }}>
                                {actividad.descripcion}
                              </Text>
                            )}
                          </View>
                          <Text style={{ width: '15%', fontSize: 7, color: '#4b5563' }}>
                            {actividad.tipo?.replace('_', ' ') || 'Curso'}
                          </Text>
                          <Text style={{ width: '12%', fontSize: 7, color: '#4b5563', textAlign: 'center' }}>
                            {horas} hrs
                          </Text>
                          <Text style={{ width: '18%', fontSize: 7, color: '#4b5563', textTransform: 'capitalize' }}>
                            {actividad.modalidad || 'Presencial'}
                          </Text>
                          <View style={{ width: '20%' }}>
                            {competencias.slice(0, 2).map((comp, cIdx) => (
                              <Text key={cIdx} style={{ fontSize: 6, color: '#1e40af' }}>
                                {comp}
                              </Text>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <Text
          style={trainingPlanStyles.footer}
          render={({ pageNumber, totalPages }) =>
            `${fechaFormateada} | Página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};



