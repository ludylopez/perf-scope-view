import { Document, Page, View, Text } from '@react-pdf/renderer';
import { HeaderPDF } from './HeaderPDF';
import { ResultadoSectionPDF } from './ResultadoSectionPDF';
import { CompetenciasCardsPDF } from './CompetenciasCardsPDF';
import { PlanDesarrolloPDF } from './PlanDesarrolloPDF';
import { FirmasPDF } from './FirmasPDF';
import { pdfStyles } from './styles';
import { format } from 'date-fns';

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
    directoraRRHHNombre?: string;
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
        />

        {/* Resultado General */}
        <ResultadoSectionPDF 
          performancePercentage={resultadoData.performancePercentage}
        />

        {/* Información de múltiples evaluadores */}
        {resultadoData.resultadoConsolidado && resultadoData.resultadoConsolidado.totalEvaluadores && resultadoData.resultadoConsolidado.totalEvaluadores > 1 && (
          <View style={{ marginTop: 10, padding: 10, backgroundColor: '#EFF6FF', borderRadius: 5 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 5 }}>
              Evaluado por {resultadoData.resultadoConsolidado.totalEvaluadores} evaluadores
            </Text>
            <Text style={{ fontSize: 8, color: '#666' }}>
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
          render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>

      {/* PÁGINA 2 - Plan de Desarrollo, Dimensiones Débiles y Recomendaciones */}
      {planDesarrollo && (
        <Page size="A4" style={pdfStyles.page}>
          {/* Plan de Desarrollo - Objetivos y Acciones */}
          <View style={pdfStyles.planSection}>
            <Text style={pdfStyles.planTitle}>🎯 PLAN DE DESARROLLO PERSONALIZADO</Text>

            {/* Objetivos */}
            {objetivos.length > 0 && (
              <View style={pdfStyles.objetivosSection}>
                <Text style={pdfStyles.planSubtitle}>🎯 OBJETIVOS DE DESARROLLO</Text>
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
                        <Text style={pdfStyles.planSubtitle}>📋 PLAN DE ACCIÓN DETALLADO</Text>
                <Text style={pdfStyles.planSubtitleDescription}>
                  Acciones concretas con responsables, fechas e indicadores
                </Text>
                
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
                    return (
                      <View key={idx} style={pdfStyles.tableRow}>
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
                          {accion.fecha || ''}
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

                  {/* Dimensiones Débiles */}
                  {dimensionesDebiles.length > 0 && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={pdfStyles.sectionTitle}>⚠️ DIMENSIONES QUE REQUIEREN ATENCIÓN</Text>
              {dimensionesDebiles
                .filter((dim) => dim && dim.dimension && dim.dimension.trim() !== '')
                .map((dim, idx) => (
                  <View key={idx} style={pdfStyles.dimensionDebilCard}>
                    <View style={pdfStyles.dimensionDebilHeader}>
                      <Text style={pdfStyles.dimensionDebilTitle}>{dim.dimension}</Text>
                      {dim.score !== undefined && typeof dim.score === 'number' && !isNaN(dim.score) && (
                        <Text style={pdfStyles.dimensionDebilScore}>
                          Score: {dim.score.toFixed(2)}/5.0 ({(dim.score / 5 * 100).toFixed(0)}%)
                        </Text>
                      )}
                    </View>
                    {dim.accionesEspecificas && Array.isArray(dim.accionesEspecificas) && dim.accionesEspecificas.length > 0 && (
                      <View>
                        {dim.accionesEspecificas
                          .filter((accion): accion is string => typeof accion === 'string' && accion.trim() !== '')
                          .map((accion, i) => (
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
                  {recomendaciones.length > 0 && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={pdfStyles.sectionTitle}>💬 RECOMENDACIONES GENERALES</Text>
              <View style={pdfStyles.recomendacionesList}>
                {recomendaciones
                  .filter((rec) => rec && rec.trim() !== '')
                  .map((rec, idx) => (
                    <Text key={idx} style={pdfStyles.recomendacionItem}>
                      • {rec}
                    </Text>
                  ))}
              </View>
            </View>
          )}

          {/* Firmas */}
          <FirmasPDF 
            nombreEmpleado={nombreCompleto}
            nombreJefe={empleado.jefeNombre}
            nombreDirectoraRRHH={empleado.directoraRRHHNombre}
            esC1={empleado.nivel === 'C1'}
          />

          {/* Footer */}
          <Text
            style={pdfStyles.footer}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
            fixed
          />
        </Page>
      )}
    </Document>
  );
};

