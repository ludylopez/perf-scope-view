import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { PlanCapacitacionUnidad } from '@/types/trainingPlan';

interface TrainingPlanPDFProps {
  plan: PlanCapacitacionUnidad;
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

export const TrainingPlanPDF = ({ plan }: TrainingPlanPDFProps) => {
  const fechaGeneracion = new Date(plan.metadata.fechaGeneracion);
  const fechaFormateada = fechaGeneracion.toLocaleDateString('es-GT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Document>
      {/* PÁGINA 1: Header + Contexto + Resumen Ejecutivo */}
      <Page size="A4" style={trainingPlanStyles.page}>
        <View style={trainingPlanStyles.header}>
          <Text style={trainingPlanStyles.headerTitle}>📚 Plan de Capacitación Consolidado</Text>
          <Text style={trainingPlanStyles.headerSubtitle}>
            Análisis Estadístico de Necesidades de Capacitación
          </Text>
          <Text style={trainingPlanStyles.headerInfo}>
            Período: {plan.metadata.periodoNombre} | Generado: {fechaFormateada}
          </Text>
        </View>

        {/* Contexto */}
        <View style={trainingPlanStyles.section}>
          <Text style={trainingPlanStyles.sectionTitle}>📊 Contexto</Text>
          <View style={trainingPlanStyles.grid}>
            <View style={trainingPlanStyles.gridItem}>
              <Text style={trainingPlanStyles.cardTitle}>Total Colaboradores</Text>
              <Text style={trainingPlanStyles.cardContent}>{plan.contexto.totalColaboradores}</Text>
            </View>
            <View style={trainingPlanStyles.gridItem}>
              <Text style={trainingPlanStyles.cardTitle}>Evaluaciones Completadas</Text>
              <Text style={trainingPlanStyles.cardContent}>
                {plan.contexto.evaluacionesCompletadas}
              </Text>
            </View>
            <View style={trainingPlanStyles.gridItem}>
              <Text style={trainingPlanStyles.cardTitle}>Tasa de Completitud</Text>
              <Text style={trainingPlanStyles.cardContent}>
                {plan.contexto.tasaCompletitud.toFixed(1)}%
              </Text>
            </View>
            <View style={trainingPlanStyles.gridItem}>
              <Text style={trainingPlanStyles.cardTitle}>Promedio Unidad</Text>
              <Text style={trainingPlanStyles.cardContent}>
                {plan.contexto.promedioDesempenoUnidad.toFixed(1)}%
              </Text>
            </View>
            <View style={trainingPlanStyles.gridItem}>
              <Text style={trainingPlanStyles.cardTitle}>Promedio Organización</Text>
              <Text style={trainingPlanStyles.cardContent}>
                {plan.contexto.promedioDesempenoOrg.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Resumen Ejecutivo */}
        <View style={trainingPlanStyles.section}>
          <Text style={trainingPlanStyles.sectionTitle}>📋 Resumen Ejecutivo</Text>
          <View style={trainingPlanStyles.card}>
            <Text style={trainingPlanStyles.cardTitle}>Situación General</Text>
            <Text style={trainingPlanStyles.cardContent}>
              {plan.resumenEjecutivo.situacionGeneral}
            </Text>
          </View>
          {plan.resumenEjecutivo.dimensionMasCritica && (
            <View style={trainingPlanStyles.card}>
              <Text style={trainingPlanStyles.cardTitle}>Dimensión Más Crítica</Text>
              <Text style={trainingPlanStyles.cardContent}>
                {plan.resumenEjecutivo.dimensionMasCritica}
              </Text>
            </View>
          )}
          {plan.resumenEjecutivo.capacitacionesPrioritarias.length > 0 && (
            <View style={trainingPlanStyles.card}>
              <Text style={trainingPlanStyles.cardTitle}>Capacitaciones Prioritarias</Text>
              {plan.resumenEjecutivo.capacitacionesPrioritarias.map((cap, idx) => (
                <Text key={idx} style={trainingPlanStyles.listItem}>
                  • {cap}
                </Text>
              ))}
            </View>
          )}
          <View style={trainingPlanStyles.card}>
            <Text style={trainingPlanStyles.cardTitle}>Recomendación General</Text>
            <Text style={trainingPlanStyles.cardContent}>
              {plan.resumenEjecutivo.recomendacionGeneral}
            </Text>
          </View>
        </View>

        <Text
          style={trainingPlanStyles.footer}
          render={({ pageNumber, totalPages }) =>
            `${fechaFormateada} | Página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>

      {/* PÁGINA 2: Brechas por Dimensión */}
      {plan.brechasDimensiones.length > 0 && (
        <Page size="A4" style={trainingPlanStyles.page}>
          <Text style={trainingPlanStyles.sectionTitle}>🎯 Brechas por Dimensión</Text>
          <View style={trainingPlanStyles.table}>
            <View style={trainingPlanStyles.tableHeader}>
              <Text style={[trainingPlanStyles.tableCell, trainingPlanStyles.tableCellHeader, trainingPlanStyles.tableCellDimension]}>
                Dimensión
              </Text>
              <Text style={[trainingPlanStyles.tableCell, trainingPlanStyles.tableCellHeader, trainingPlanStyles.tableCellScore]}>
                Prom. Unidad
              </Text>
              <Text style={[trainingPlanStyles.tableCell, trainingPlanStyles.tableCellHeader, trainingPlanStyles.tableCellScore]}>
                Prom. Org
              </Text>
              <Text style={[trainingPlanStyles.tableCell, trainingPlanStyles.tableCellHeader, trainingPlanStyles.tableCellZScore]}>
                Z-Score
              </Text>
              <Text style={[trainingPlanStyles.tableCell, trainingPlanStyles.tableCellHeader, trainingPlanStyles.tableCellPrioridad]}>
                Prioridad
              </Text>
              <Text style={[trainingPlanStyles.tableCell, trainingPlanStyles.tableCellHeader, trainingPlanStyles.tableCellColaboradores]}>
                Colab. Débiles
              </Text>
              <Text style={[trainingPlanStyles.tableCell, trainingPlanStyles.tableCellHeader, trainingPlanStyles.tableCellPorcentaje]}>
                %
              </Text>
            </View>
            {plan.brechasDimensiones.map((brecha, idx) => (
              <View
                key={idx}
                style={[
                  trainingPlanStyles.tableRow,
                  idx % 2 === 1 && trainingPlanStyles.tableRowAlt,
                ]}
              >
                <Text style={[trainingPlanStyles.tableCell, trainingPlanStyles.tableCellDimension]}>
                  {brecha.dimensionNombre}
                </Text>
                <Text style={[trainingPlanStyles.tableCell, trainingPlanStyles.tableCellScore]}>
                  {brecha.promedioUnidad.toFixed(1)}%
                </Text>
                <Text style={[trainingPlanStyles.tableCell, trainingPlanStyles.tableCellScore]}>
                  {brecha.promedioOrg.toFixed(1)}%
                </Text>
                <Text style={[trainingPlanStyles.tableCell, trainingPlanStyles.tableCellZScore]}>
                  {brecha.zScore.toFixed(2)}
                </Text>
                <View style={[trainingPlanStyles.tableCell, trainingPlanStyles.tableCellPrioridad]}>
                  <Text style={[trainingPlanStyles.badge, getPrioridadBadgeStyle(brecha.prioridad)]}>
                    {getPrioridadText(brecha.prioridad)}
                  </Text>
                </View>
                <Text style={[trainingPlanStyles.tableCell, trainingPlanStyles.tableCellColaboradores]}>
                  {brecha.colaboradoresDebiles}
                </Text>
                <Text style={[trainingPlanStyles.tableCell, trainingPlanStyles.tableCellPorcentaje]}>
                  {brecha.porcentajeDebiles.toFixed(1)}%
                </Text>
              </View>
            ))}
          </View>

          <Text
            style={trainingPlanStyles.footer}
            render={({ pageNumber, totalPages }) =>
              `${fechaFormateada} | Página ${pageNumber} de ${totalPages}`
            }
            fixed
          />
        </Page>
      )}

      {/* PÁGINA 3: Capacitaciones Prioritarias */}
      {plan.capacitaciones.length > 0 && (
        <Page size="A4" style={trainingPlanStyles.page}>
          <Text style={trainingPlanStyles.sectionTitle}>🎓 Capacitaciones Prioritarias</Text>
          <View style={trainingPlanStyles.table}>
            <View style={trainingPlanStyles.tableHeader}>
              <Text style={[trainingPlanStyles.tableCell, trainingPlanStyles.tableCellHeader, { width: '30%' }]}>
                Tópico
              </Text>
              <Text style={[trainingPlanStyles.tableCell, trainingPlanStyles.tableCellHeader, { width: '15%' }]}>
                Categoría
              </Text>
              <Text style={[trainingPlanStyles.tableCell, trainingPlanStyles.tableCellHeader, { width: '12%', textAlign: 'center' }]}>
                Frecuencia
              </Text>
              <Text style={[trainingPlanStyles.tableCell, trainingPlanStyles.tableCellHeader, { width: '12%', textAlign: 'center' }]}>
                %
              </Text>
              <Text style={[trainingPlanStyles.tableCell, trainingPlanStyles.tableCellHeader, { width: '15%', textAlign: 'center' }]}>
                Prioridad
              </Text>
              <Text style={[trainingPlanStyles.tableCell, trainingPlanStyles.tableCellHeader, { width: '16%' }]}>
                Dimensiones
              </Text>
            </View>
            {plan.capacitaciones.map((cap, idx) => (
              <View
                key={idx}
                style={[
                  trainingPlanStyles.tableRow,
                  idx % 2 === 1 && trainingPlanStyles.tableRowAlt,
                ]}
              >
                <Text style={[trainingPlanStyles.tableCell, { width: '30%' }]}>
                  {cap.topico}
                </Text>
                <Text style={[trainingPlanStyles.tableCell, { width: '15%' }]}>
                  {cap.categoria}
                </Text>
                <Text style={[trainingPlanStyles.tableCell, { width: '12%', textAlign: 'center' }]}>
                  {cap.frecuenciaAbsoluta}
                </Text>
                <Text style={[trainingPlanStyles.tableCell, { width: '12%', textAlign: 'center' }]}>
                  {cap.frecuenciaPorcentual.toFixed(1)}%
                </Text>
                <View style={[trainingPlanStyles.tableCell, { width: '15%', textAlign: 'center' }]}>
                  <Text style={[trainingPlanStyles.badge, getPrioridadBadgeStyle(cap.prioridad)]}>
                    {getPrioridadText(cap.prioridad)}
                  </Text>
                </View>
                <Text style={[trainingPlanStyles.tableCell, { width: '16%', fontSize: 7 }]}>
                  {cap.dimensionesRelacionadas.join(', ')}
                </Text>
              </View>
            ))}
          </View>

          <Text
            style={trainingPlanStyles.footer}
            render={({ pageNumber, totalPages }) =>
              `${fechaFormateada} | Página ${pageNumber} de ${totalPages}`
            }
            fixed
          />
        </Page>
      )}

      {/* PÁGINA 4: Distribución 9-Box */}
      {plan.distribucion9Box.length > 0 && (
        <Page size="A4" style={trainingPlanStyles.page}>
          <Text style={trainingPlanStyles.sectionTitle}>📊 Distribución 9-Box</Text>
          <View style={trainingPlanStyles.nineBoxGrid}>
            {plan.distribucion9Box.map((item, idx) => (
              <View
                key={idx}
                style={[
                  trainingPlanStyles.nineBoxCard,
                  {
                    backgroundColor: idx % 2 === 0 ? '#f9fafb' : '#ffffff',
                    borderColor: '#d1d5db',
                  },
                ]}
              >
                <Text style={trainingPlanStyles.nineBoxCardTitle}>
                  {item.posicion} ({item.cantidad})
                </Text>
                <Text style={trainingPlanStyles.nineBoxCardContent}>
                  {item.porcentaje.toFixed(1)}% del total
                </Text>
                <Text style={[trainingPlanStyles.nineBoxCardContent, { marginTop: 4, fontSize: 7 }]}>
                  Factor Urgencia: {item.factorUrgencia.toFixed(2)}
                </Text>
                <Text style={[trainingPlanStyles.nineBoxCardContent, { marginTop: 4, fontSize: 7, fontStyle: 'italic' }]}>
                  {item.accionRecomendada}
                </Text>
              </View>
            ))}
          </View>

          <Text
            style={trainingPlanStyles.footer}
            render={({ pageNumber, totalPages }) =>
              `${fechaFormateada} | Página ${pageNumber} de ${totalPages}`
            }
            fixed
          />
        </Page>
      )}

      {/* PÁGINAS ADICIONALES: Plan Estructurado (si existe) */}
      {plan.planEstructurado && (
        <Page size="A4" style={trainingPlanStyles.page}>
          <Text style={trainingPlanStyles.sectionTitle}>✨ Plan Estructurado (Generado por IA)</Text>

          {plan.planEstructurado.objetivos && plan.planEstructurado.objetivos.length > 0 && (
            <View style={trainingPlanStyles.card}>
              <Text style={trainingPlanStyles.cardTitle}>Objetivos</Text>
              {plan.planEstructurado.objetivos.map((objetivo, idx) => (
                <Text key={idx} style={trainingPlanStyles.listItem}>
                  • {objetivo}
                </Text>
              ))}
            </View>
          )}

          {plan.planEstructurado.actividades && plan.planEstructurado.actividades.length > 0 && (
            <View style={trainingPlanStyles.card}>
              <Text style={trainingPlanStyles.cardTitle}>Actividades de Capacitación</Text>
              {plan.planEstructurado.actividades.map((actividad, idx) => (
                <View key={idx} style={{ marginBottom: 8, paddingLeft: 4 }}>
                  <Text style={[trainingPlanStyles.cardContent, { fontWeight: 'bold' }]}>
                    {idx + 1}. {actividad.topico}
                  </Text>
                  <Text style={[trainingPlanStyles.cardContent, { fontSize: 7.5, marginTop: 2 }]}>
                    Tipo: {actividad.tipo} | Duración: {actividad.duracion} | Modalidad:{' '}
                    {actividad.modalidad}
                  </Text>
                  <Text style={[trainingPlanStyles.cardContent, { fontSize: 7.5, marginTop: 2 }]}>
                    {actividad.descripcion}
                  </Text>
                  {actividad.responsable && (
                    <Text style={[trainingPlanStyles.cardContent, { fontSize: 7, marginTop: 2, fontStyle: 'italic' }]}>
                      Responsable: {actividad.responsable}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {plan.planEstructurado.metricasExito && plan.planEstructurado.metricasExito.length > 0 && (
            <View style={trainingPlanStyles.card}>
              <Text style={trainingPlanStyles.cardTitle}>Métricas de Éxito</Text>
              {plan.planEstructurado.metricasExito.map((metrica, idx) => (
                <View key={idx} style={{ marginBottom: 6, paddingLeft: 4 }}>
                  <Text style={[trainingPlanStyles.cardContent, { fontWeight: 'bold' }]}>
                    {metrica.nombre}
                  </Text>
                  <Text style={[trainingPlanStyles.cardContent, { fontSize: 7.5, marginTop: 2 }]}>
                    {metrica.metodoMedicion} | Plazo: {metrica.plazo}
                  </Text>
                  {metrica.valorObjetivo && (
                    <Text style={[trainingPlanStyles.cardContent, { fontSize: 7.5, marginTop: 2 }]}>
                      Objetivo: {metrica.valorObjetivo}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {plan.planEstructurado.estrategiaImplementacion && (
            <View style={trainingPlanStyles.card}>
              <Text style={trainingPlanStyles.cardTitle}>Estrategia de Implementación</Text>
              <Text style={trainingPlanStyles.cardContent}>
                {plan.planEstructurado.estrategiaImplementacion}
              </Text>
            </View>
          )}

          <Text
            style={trainingPlanStyles.footer}
            render={({ pageNumber, totalPages }) =>
              `${fechaFormateada} | Página ${pageNumber} de ${totalPages}`
            }
            fixed
          />
        </Page>
      )}
    </Document>
  );
};



