import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';

interface AccionDesarrollo {
  descripcion: string;
  responsable: string;
  fecha: string;
  recursos?: string[];
  indicador: string;
  prioridad: 'alta' | 'media' | 'baja';
}

interface DimensionDebil {
  dimension: string;
  score?: number;
  accionesEspecificas?: string[];
}

interface PlanEstructurado {
  objetivos?: string[];
  acciones?: AccionDesarrollo[];
  dimensionesDebiles?: DimensionDebil[];
}

interface PlanDesarrolloPDFProps {
  planDesarrollo?: {
    planEstructurado?: PlanEstructurado;
    recomendaciones?: string[];
  } | null;
}

const getPrioridadBadgeStyle = (prioridad: string) => {
  switch (prioridad) {
    case 'alta':
      return pdfStyles.badgeAlta;
    case 'media':
      return pdfStyles.badgeMedia;
    case 'baja':
      return pdfStyles.badgeBaja;
    default:
      return pdfStyles.badgeMedia;
  }
};

const getPrioridadText = (prioridad: string) => {
  switch (prioridad) {
    case 'alta':
      return 'Alta';
    case 'media':
      return 'Media';
    case 'baja':
      return 'Baja';
    default:
      return prioridad;
  }
};

export const PlanDesarrolloPDF = ({ planDesarrollo }: PlanDesarrolloPDFProps) => {
  if (!planDesarrollo || !planDesarrollo.planEstructurado) {
    // Retornar View vacío en lugar de null para evitar problemas con React-PDF
    return <View />;
  }

  const { planEstructurado, recomendaciones } = planDesarrollo;

  return (
    <View style={pdfStyles.planSection}>
      <Text style={pdfStyles.planTitle}>🎯 PLAN DE DESARROLLO PERSONALIZADO</Text>

            {/* Objetivos */}
            {planEstructurado.objetivos && planEstructurado.objetivos.length > 0 && (
              <View style={pdfStyles.objetivosSection}>
                <Text style={pdfStyles.planSubtitle}>🎯 OBJETIVOS DE DESARROLLO</Text>
          <View style={pdfStyles.objetivosList}>
            {planEstructurado.objetivos.map((objetivo, idx) => (
              <Text key={idx} style={pdfStyles.objetivoItem}>
                • {objetivo}
              </Text>
            ))}
          </View>
        </View>
      )}

            {/* Acciones en tabla */}
            {planEstructurado.acciones && planEstructurado.acciones.length > 0 && (
              <View>
                <Text style={pdfStyles.planSubtitle}>📋 PLAN DE ACCIÓN DETALLADO</Text>
          <Text style={pdfStyles.planSubtitleDescription}>
            Acciones concretas con responsables, fechas e indicadores
          </Text>
          
          {/* Encabezado de tabla */}
          <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellNumber]}>#</Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellAccion]}>Acción</Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellPrioridad]}>Prioridad</Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellResponsable]}>Responsable</Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellFecha]}>Fecha</Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellIndicador]}>Indicador</Text>
          </View>

          {/* Filas de acciones ordenadas por prioridad */}
          {[...planEstructurado.acciones]
            .sort((a, b) => {
              const prioridadOrder = { alta: 1, media: 2, baja: 3 };
              return (prioridadOrder[a.prioridad] || 99) - (prioridadOrder[b.prioridad] || 99);
            })
            .map((accion, idx) => (
              <View key={idx} style={pdfStyles.tableRow}>
                <Text style={[pdfStyles.tableCell, pdfStyles.tableCellNumber, { textAlign: 'center' }]}>
                  {idx + 1}
                </Text>
                <Text style={[pdfStyles.tableCell, pdfStyles.tableCellAccion]}>
                  {accion.descripcion}
                </Text>
                <View style={[pdfStyles.tableCell, pdfStyles.tableCellPrioridad]}>
                  <Text style={[pdfStyles.badge, getPrioridadBadgeStyle(accion.prioridad)]}>
                    {getPrioridadText(accion.prioridad)}
                  </Text>
                </View>
                <Text style={[pdfStyles.tableCell, pdfStyles.tableCellResponsable]}>
                  {accion.responsable}
                </Text>
                <Text style={[pdfStyles.tableCell, pdfStyles.tableCellFecha]}>
                  {accion.fecha}
                </Text>
                <Text style={[pdfStyles.tableCell, pdfStyles.tableCellIndicador]}>
                  {accion.indicador}
                </Text>
              </View>
            ))}
        </View>
      )}

      {/* Dimensiones Débiles */}
      {planEstructurado.dimensionesDebiles && planEstructurado.dimensionesDebiles.length > 0 && (
        <View>
          <Text style={pdfStyles.sectionTitle}>⚠️ DIMENSIONES QUE REQUIEREN ATENCIÓN</Text>
          {planEstructurado.dimensionesDebiles.map((dim, idx) => (
            <View key={idx} style={pdfStyles.dimensionDebilCard}>
              <View style={pdfStyles.dimensionDebilHeader}>
                <Text style={pdfStyles.dimensionDebilTitle}>{dim.dimension}</Text>
                {dim.score !== undefined && (
                  <Text style={pdfStyles.dimensionDebilScore}>
                    Score: {dim.score.toFixed(2)}/5.0 ({(dim.score / 5 * 100).toFixed(0)}%)
                  </Text>
                )}
              </View>
              {dim.accionesEspecificas && dim.accionesEspecificas.length > 0 && (
                <View>
                  {dim.accionesEspecificas.map((accion, i) => (
                    <Text key={i} style={pdfStyles.dimensionDebilActions}>
                      • {accion}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Recomendaciones */}
      {recomendaciones && recomendaciones.length > 0 && (
        <View>
          <Text style={pdfStyles.sectionTitle}>💬 RECOMENDACIONES GENERALES</Text>
          <View style={pdfStyles.recomendacionesList}>
            {recomendaciones.map((rec, idx) => (
              <Text key={idx} style={pdfStyles.recomendacionItem}>
                • {rec}
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

