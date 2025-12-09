import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import { getDimensionFromAction, getDimensionColor, getUsedDimensions, formatDateForPDF } from '@/lib/dimensionUtils';

interface AccionDesarrollo {
  descripcion: string;
  dimension?: string; // Dimensión principal que desarrolla esta acción
  tipoAprendizaje?: "experiencia" | "social" | "formal";
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

// NOTA: Las funciones getDimensionFromAction, getDimensionColor y getUsedDimensions
// están centralizadas en @/lib/dimensionUtils para evitar duplicación de código
// y mantener una única fuente de verdad para la lógica de dimensiones.

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
            Acciones concretas con responsables, fechas e indicadores. El color del borde izquierdo indica la dimensión que desarrolla cada acción.
          </Text>
          
          {/* Leyenda de dimensiones - Solo las usadas */}
          {(() => {
            const usedDimensions = getUsedDimensions(
              planEstructurado.acciones,
              planEstructurado.dimensionesDebiles
            );
            
            if (usedDimensions.length === 0) return null;
            
            return (
              <View style={pdfStyles.dimensionLegend}>
                <Text style={pdfStyles.dimensionLegendTitle}>Leyenda de Dimensiones:</Text>
                <View style={pdfStyles.dimensionLegendGrid}>
                  {usedDimensions.map((dim, idx) => (
                    <View key={idx} style={pdfStyles.dimensionLegendItem}>
                      <View style={[pdfStyles.dimensionLegendColor, { backgroundColor: dim.color }]} />
                      <Text style={pdfStyles.dimensionLegendText}>{dim.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}
          
          {/* Encabezado de tabla */}
          <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellNumber]}>#</Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellAccion]}>Acción</Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellPrioridad]}>Tipo</Text>
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
            .map((accion, idx) => {
              // Obtener dimensión de la acción (con fallback si no existe)
              const dimension = getDimensionFromAction(accion, planEstructurado.dimensionesDebiles);
              const dimensionColor = getDimensionColor(dimension || undefined);
              
              return (
                <View 
                  key={idx} 
                  style={[
                    pdfStyles.tableRow,
                    { borderLeftWidth: dimension ? 4 : 0, borderLeftColor: dimensionColor }
                  ]}
                >
                  <Text style={[pdfStyles.tableCell, pdfStyles.tableCellNumber, { textAlign: 'center' }]}>
                    {idx + 1}
                  </Text>
                  <Text style={[pdfStyles.tableCell, pdfStyles.tableCellAccion]}>
                    {accion.descripcion}
                  </Text>
                  <Text style={[pdfStyles.tableCell, pdfStyles.tableCellPrioridad, { fontSize: 9 }]}>
                    {accion.tipoAprendizaje === "experiencia" ? "🔄 Exp." : accion.tipoAprendizaje === "social" ? "👥 Social" : accion.tipoAprendizaje === "formal" ? "📚 Formal" : ""}
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
                    {formatDateForPDF(accion.fecha)}
                  </Text>
                  <Text style={[pdfStyles.tableCell, pdfStyles.tableCellIndicador]}>
                    {accion.indicador}
                  </Text>
                </View>
              );
            })}
        </View>
      )}

      {/* Secciones eliminadas: Dimensiones Débiles y Recomendaciones */}
      {/* La información ahora se muestra en la tabla de acciones con indicador visual por dimensión */}
    </View>
  );
};

