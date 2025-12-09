import { Document, Page, View, Text } from '@react-pdf/renderer';
import { HeaderPDF } from './HeaderPDF';
import { ResultadoSectionPDF } from './ResultadoSectionPDF';
import { CompetenciasCardsPDF } from './CompetenciasCardsPDF';
import { PlanDesarrolloPDF } from './PlanDesarrolloPDF';
import { FirmasPDF } from './FirmasPDF';
import { pdfStyles } from './styles';
import { getDimensionFromAction, getDimensionColor, getUsedDimensions, formatDateForPDF } from '@/lib/dimensionUtils';

interface EvaluacionPDFProps {
  empleado: {
    nombre: string;
    apellidos?: string;
    dpi?: string;
    cargo?: string;
    area?: string;
    nivel?: string;
    direccionUnidad?: string;
    departamentoDependencia?: string;
    profesion?: string;
    correo?: string;
    telefono?: string;
    jefeNombre?: string;
    jefeCargo?: string;
    directoraRRHHNombre?: string;
    directoraRRHHCargo?: string;
  };
  periodo: string;
  fechaGeneracion: Date;
  resultadoData: {
    performancePercentage: number;
    jefeCompleto: boolean;
    fortalezas: Array<{
      dimension: string;
      nombreCompleto?: string;
      tuEvaluacion: number;
      promedioMunicipal?: number;
    }>;
    areasOportunidad: Array<{
      dimension: string;
      nombreCompleto?: string;
      tuEvaluacion: number;
      promedioMunicipal?: number;
    }>;
    radarData: Array<{
      dimension: string;
      tuEvaluacion: number;
      promedioMunicipal?: number;
    }>;
    resultadoConsolidado?: {
      totalEvaluadores?: number;
      resultadosPorEvaluador?: Array<{
        evaluadorNombre?: string;
        desempenoFinal?: number;
        potencial?: number;
        posicion9Box?: string;
      }>;
    };
  };
  planDesarrollo?: {
    planEstructurado?: {
      objetivos?: string[];
      acciones?: Array<{
        descripcion: string;
        responsable: string;
        fecha: string;
        recursos?: string[];
        indicador: string;
        prioridad: 'alta' | 'media' | 'baja';
      }>;
      dimensionesDebiles?: Array<{
        dimension: string;
        score?: number;
        accionesEspecificas?: string[];
      }>;
    };
    recomendaciones?: string[];
  } | null;
}

export const EvaluacionPDF = ({
  empleado,
  periodo,
  fechaGeneracion,
  resultadoData,
  planDesarrollo,
}: EvaluacionPDFProps) => {
  const nombreCompleto = empleado.apellidos 
    ? `${empleado.nombre} ${empleado.apellidos}` 
    : empleado.nombre;

  // Separar plan de desarrollo en partes y filtrar valores inválidos
  const objetivos = (planDesarrollo?.planEstructurado?.objetivos || []).filter((o): o is string => 
    typeof o === 'string' && o.trim() !== ''
  );
  const acciones = (planDesarrollo?.planEstructurado?.acciones || []).filter((a): a is NonNullable<typeof a> => 
    a && 
    typeof a.descripcion === 'string' && a.descripcion.trim() !== '' &&
    typeof a.responsable === 'string' && a.responsable.trim() !== '' &&
    typeof a.fecha === 'string' && a.fecha.trim() !== '' &&
    typeof a.indicador === 'string' && a.indicador.trim() !== '' &&
    typeof a.prioridad === 'string'
  );
  const dimensionesDebiles = (planDesarrollo?.planEstructurado?.dimensionesDebiles || []).filter((d): d is NonNullable<typeof d> => 
    d && 
    typeof d.dimension === 'string' && d.dimension.trim() !== ''
  );
  const recomendaciones = (planDesarrollo?.recomendaciones || []).filter((r): r is string => 
    typeof r === 'string' && r.trim() !== ''
  );

  // Calcular texto del resultado para el header
  const percentage = typeof resultadoData.performancePercentage === 'number' && !isNaN(resultadoData.performancePercentage) 
    ? resultadoData.performancePercentage 
    : 0;
  
  let resultadoLabel = 'Regular';
  if (percentage >= 90) {
    resultadoLabel = 'Excelente';
  } else if (percentage >= 75) {
    resultadoLabel = 'Bueno';
  } else if (percentage >= 60) {
    resultadoLabel = 'Regular';
  } else {
    resultadoLabel = 'Necesita mejorar';
  }
  
  const resultadoText = `Tu desempeño es ${resultadoLabel}`;
  const resultadoDescription = percentage >= 75
    ? 'Estás cumpliendo satisfactoriamente con las expectativas del cargo.'
    : 'Hay áreas importantes que requieren atención y mejora.';

  return (
    <Document>
      {/* PÁGINA 1 */}
      <Page size="A4" style={pdfStyles.page}>
        {/* Header con información del empleado */}
        <HeaderPDF
          empleado={empleado}
          periodo={periodo}
          fechaGeneracion={fechaGeneracion}
          jefeCompleto={resultadoData.jefeCompleto}
          performancePercentage={resultadoData.performancePercentage}
          resultadoText={resultadoText}
          resultadoDescription={resultadoDescription}
        />

        {/* Información de múltiples evaluadores */}
        {resultadoData.resultadoConsolidado && resultadoData.resultadoConsolidado.totalEvaluadores && resultadoData.resultadoConsolidado.totalEvaluadores > 1 && (
          <View style={{ marginTop: 10, padding: 10, backgroundColor: '#EFF6FF', borderRadius: 5 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 5 }}>
              Evaluado por {resultadoData.resultadoConsolidado.totalEvaluadores || 0} evaluadores
            </Text>
            <Text style={{ fontSize: 8, color: '#666666' }}>
              Los resultados mostrados son el promedio consolidado de todas las evaluaciones.
            </Text>
          </View>
        )}

        {/* Panorama de Competencias - Cards */}
        <CompetenciasCardsPDF 
          competencias={resultadoData.radarData}
          fortalezas={resultadoData.fortalezas}
          areasOportunidad={resultadoData.areasOportunidad}
          nivel={empleado.nivel}
        />

        {/* Footer */}
        <Text
          style={pdfStyles.footer}
          render={({ pageNumber, totalPages }) => {
            const fechaFormateada = fechaGeneracion 
              ? new Date(fechaGeneracion).toLocaleDateString('es-ES', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : '';
            return `${fechaFormateada ? `${fechaFormateada} | ` : ''}Página ${pageNumber} de ${totalPages}`;
          }}
          fixed
        />
      </Page>

      {/* PÁGINA 2 - Plan de Desarrollo, Dimensiones Débiles y Recomendaciones */}
      {planDesarrollo && (
        <Page size="A4" style={pdfStyles.page}>
          {/* Plan de Desarrollo - Objetivos y Acciones */}
          <View style={pdfStyles.planSection}>
            <Text style={pdfStyles.planTitle}>PLAN DE DESARROLLO PERSONALIZADO</Text>

            {/* Objetivos */}
            {objetivos.length > 0 && (
              <View style={pdfStyles.objetivosSection}>
                <Text style={pdfStyles.planSubtitle}>OBJETIVOS DE DESARROLLO</Text>
                <View style={pdfStyles.objetivosList}>
                  {objetivos
                    .filter((objetivo) => objetivo && objetivo.trim() !== '')
                    .map((objetivo, idx) => (
                      <Text key={idx} style={pdfStyles.objetivoItem}>
                        • {objetivo}
                      </Text>
                    ))}
                </View>
              </View>
            )}

                    {/* Acciones en tabla */}
            {acciones.length > 0 && (
              <View>
                <Text style={pdfStyles.planSubtitle}>PLAN DE ACCIÓN DETALLADO</Text>
                <Text style={pdfStyles.planSubtitleDescription}>
                  Acciones concretas con responsables, fechas e indicadores. El color del borde izquierdo indica la dimensión que desarrolla cada acción.
                </Text>
                
                {/* Leyenda de dimensiones - Solo las usadas */}
                {(() => {
                  const usedDimensions = getUsedDimensions(acciones, dimensionesDebiles);
                  
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
                
                <View style={pdfStyles.table}>
                  {/* Encabezado de tabla */}
                  <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
                    <Text style={[pdfStyles.tableCell, pdfStyles.tableCellNumber]}>#</Text>
                    <Text style={[pdfStyles.tableCell, pdfStyles.tableCellAccion]}>Acción</Text>
                    <Text style={[pdfStyles.tableCell, pdfStyles.tableCellPrioridad]}>Prioridad</Text>
                    <Text style={[pdfStyles.tableCell, pdfStyles.tableCellResponsable]}>Responsable</Text>
                    <Text style={[pdfStyles.tableCell, pdfStyles.tableCellFecha]}>Fecha</Text>
                    <Text style={[pdfStyles.tableCell, pdfStyles.tableCellIndicador]}>Indicador</Text>
                  </View>

                  {/* Filas de acciones */}
                  {acciones
                    .filter((accion) => 
                      accion && 
                      accion.descripcion && 
                      accion.responsable && 
                      accion.fecha && 
                      accion.indicador
                    )
                    .map((accion, idx) => {
                    const getPrioridadBadgeStyle = (p: string) => {
                      switch (p) {
                        case 'alta': return pdfStyles.badgeAlta;
                        case 'media': return pdfStyles.badgeMedia;
                        case 'baja': return pdfStyles.badgeBaja;
                        default: return pdfStyles.badgeMedia;
                      }
                    };
                    const getPrioridadText = (p: string) => {
                      switch (p) {
                        case 'alta': return 'Alta';
                        case 'media': return 'Media';
                        case 'baja': return 'Baja';
                        default: return p || 'Media';
                      }
                    };
                    
                    // Obtener dimensión de la acción usando función centralizada
                    const dimension = getDimensionFromAction(accion, dimensionesDebiles);
                    const dimensionColor = getDimensionColor(dimension || undefined);
                    
                    return (
                      <View 
                        key={idx} 
                        style={[
                          pdfStyles.tableRow,
                          { borderLeftWidth: dimension ? 4 : 0, borderLeftColor: dimensionColor }
                        ]}
                      >
                        <Text style={[pdfStyles.tableCell, pdfStyles.tableCellNumber]}>
                          {idx + 1}
                        </Text>
                        <Text style={[pdfStyles.tableCell, pdfStyles.tableCellAccion]}>
                          {accion.descripcion || ''}
                        </Text>
                        <View style={[pdfStyles.tableCell, pdfStyles.tableCellPrioridad]}>
                          <Text style={[pdfStyles.badge, getPrioridadBadgeStyle(accion.prioridad || 'media')]}>
                            {getPrioridadText(accion.prioridad || 'media')}
                          </Text>
                        </View>
                        <Text style={[pdfStyles.tableCell, pdfStyles.tableCellResponsable]}>
                          {accion.responsable || ''}
                        </Text>
                        <Text style={[pdfStyles.tableCell, pdfStyles.tableCellFecha]}>
                          {formatDateForPDF(accion.fecha || '')}
                        </Text>
                        <Text style={[pdfStyles.tableCell, pdfStyles.tableCellIndicador]}>
                          {accion.indicador || ''}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

                  {/* Secciones eliminadas: Dimensiones Débiles y Recomendaciones */}
          {/* La información ahora se muestra en la tabla de acciones con indicador visual por dimensión */}

          {/* Espacio adicional antes de las firmas */}
          <View style={{ marginTop: 10, marginBottom: 10 }} />

          {/* Firmas */}
          <FirmasPDF 
            nombreEmpleado={nombreCompleto}
            cargoEmpleado={empleado.cargo}
            nombreJefe={empleado.jefeNombre}
            cargoJefe={empleado.jefeCargo}
            nombreDirectoraRRHH={empleado.directoraRRHHNombre}
            cargoDirectoraRRHH={empleado.directoraRRHHCargo}
            esC1={empleado.nivel === 'C1'}
          />

          {/* Footer */}
          <Text
            style={pdfStyles.footer}
            render={({ pageNumber, totalPages }) => {
              const fechaFormateada = fechaGeneracion 
                ? new Date(fechaGeneracion).toLocaleDateString('es-ES', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : '';
              return `${fechaFormateada ? `${fechaFormateada} | ` : ''}Página ${pageNumber} de ${totalPages}`;
            }}
            fixed
          />
        </Page>
      )}
    </Document>
  );
};

