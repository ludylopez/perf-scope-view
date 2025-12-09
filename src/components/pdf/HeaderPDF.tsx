import { View, Text, Image } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import logoMunicipalidad from '@/assets/logo-municipalidad.png';

interface HeaderPDFProps {
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
  };
  periodo: string;
  fechaGeneracion: Date;
  jefeCompleto: boolean;
  performancePercentage?: number;
  resultadoText?: string;
  resultadoDescription?: string;
}

export const HeaderPDF = ({ empleado, periodo, fechaGeneracion, jefeCompleto, performancePercentage, resultadoText, resultadoDescription }: HeaderPDFProps) => {
  const nombreCompleto = empleado?.apellidos 
    ? `${empleado?.nombre || 'N/A'} ${empleado.apellidos}` 
    : (empleado?.nombre || 'N/A');

  return (
    <>
      {/* Encabezado con título, logo y resultado */}
      <View style={pdfStyles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 3, gap: 8 }}>
          {/* Logo - A la izquierda */}
          <View style={{ width: 60, flexShrink: 0 }}>
            <Image 
              src={logoMunicipalidad}
              style={{ 
                width: 60, 
                height: 60, 
                objectFit: 'contain',
              }}
            />
          </View>
          
          {/* Título y subtítulo - Centrado */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
            <Text style={pdfStyles.headerText}>Evaluación de Desempeño</Text>
            <Text style={pdfStyles.headerSubtitle}>Municipalidad de Esquipulas, Chiquimula</Text>
          </View>

          {/* Porcentaje y resultado - A la derecha */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, flexShrink: 0 }}>
            {/* Círculo del porcentaje */}
            {performancePercentage !== undefined && (
              <View style={pdfStyles.headerPercentageContainer}>
                <Text style={pdfStyles.headerPercentage}>{Math.round(performancePercentage)}</Text>
                <Text style={pdfStyles.headerPercentageLabel}>%</Text>
              </View>
            )}
            
            {/* Sección de resultado */}
            {(resultadoText || resultadoDescription) && (
              <View style={pdfStyles.headerResultadoContainer}>
                {resultadoText && (
                  <Text style={pdfStyles.headerResultadoText}>{resultadoText}</Text>
                )}
                {resultadoDescription && (
                  <Text style={pdfStyles.headerResultadoDescription}>{resultadoDescription}</Text>
                )}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Tabla de información del empleado */}
      <View style={pdfStyles.infoCard}>
        <View style={[pdfStyles.table, { marginBottom: 5 }]}>
          {/* Fila 1: Empleado y DPI */}
          <View style={pdfStyles.tableRow}>
            <View style={[pdfStyles.tableCell, { width: '50%', borderRightWidth: 1, borderRightColor: '#e5e7eb', padding: 1, flexDirection: 'row' }]}>
              <Text style={pdfStyles.infoLabel}>EMPLEADO:</Text>
              <Text style={[pdfStyles.infoValue, { flex: 1, flexWrap: 'nowrap' }]}>{nombreCompleto || 'N/A'}</Text>
            </View>
            {empleado?.dpi ? (
              <View style={[pdfStyles.tableCell, { width: '50%', padding: 1, flexDirection: 'row' }]}>
                <Text style={pdfStyles.infoLabel}>DPI:</Text>
                <Text style={[pdfStyles.infoValue, { flex: 1, flexWrap: 'nowrap' }]}>{empleado.dpi || ''}</Text>
              </View>
            ) : (
              <View style={[pdfStyles.tableCell, { width: '50%', padding: 1 }]} />
            )}
          </View>

          {/* Fila 2: Cargo y Área */}
          <View style={pdfStyles.tableRow}>
            {empleado?.cargo ? (
              <View style={[pdfStyles.tableCell, { width: '50%', borderRightWidth: 1, borderRightColor: '#e5e7eb', padding: 1, flexDirection: 'row' }]}>
                <Text style={pdfStyles.infoLabel}>CARGO:</Text>
                <Text style={[pdfStyles.infoValue, { flex: 1, flexWrap: 'nowrap' }]}>{empleado.cargo || ''}</Text>
              </View>
            ) : (
              <View style={[pdfStyles.tableCell, { width: '50%', borderRightWidth: 1, borderRightColor: '#e5e7eb', padding: 1 }]} />
            )}
            {empleado?.area ? (
              <View style={[pdfStyles.tableCell, { width: '50%', padding: 1, flexDirection: 'row' }]}>
                <Text style={pdfStyles.infoLabel}>ÁREA:</Text>
                <Text style={[pdfStyles.infoValue, { flex: 1, flexWrap: 'nowrap' }]}>{empleado.area || ''}</Text>
              </View>
            ) : (
              <View style={[pdfStyles.tableCell, { width: '50%', padding: 1 }]} />
            )}
          </View>

          {/* Fila 3: Dirección/Unidad y Depto/Dependencia - Solo se muestra si al menos uno tiene datos */}
          {((empleado?.direccionUnidad && empleado.direccionUnidad.trim()) || (empleado?.departamentoDependencia && empleado.departamentoDependencia.trim())) && (
            <View style={pdfStyles.tableRow}>
              {(empleado?.direccionUnidad && empleado.direccionUnidad.trim()) ? (
                <View style={[pdfStyles.tableCell, { width: '50%', borderRightWidth: 1, borderRightColor: '#e5e7eb', padding: 1, flexDirection: 'row' }]}>
                  <Text style={pdfStyles.infoLabel}>DIRECCIÓN/UNIDAD:</Text>
                  <Text style={[pdfStyles.infoValue, { flex: 1, flexWrap: 'nowrap' }]}>{empleado.direccionUnidad.trim()}</Text>
                </View>
              ) : (
                <View style={[pdfStyles.tableCell, { width: '50%', borderRightWidth: 1, borderRightColor: '#e5e7eb', padding: 1 }]} />
              )}
              {(empleado?.departamentoDependencia && empleado.departamentoDependencia.trim()) ? (
                <View style={[pdfStyles.tableCell, { width: '50%', padding: 1, flexDirection: 'row' }]}>
                  <Text style={pdfStyles.infoLabel}>DEPTO/DEPENDENCIA:</Text>
                  <Text style={[pdfStyles.infoValue, { flex: 1, flexWrap: 'nowrap' }]}>{empleado.departamentoDependencia.trim()}</Text>
                </View>
              ) : (
                <View style={[pdfStyles.tableCell, { width: '50%', padding: 1 }]} />
              )}
            </View>
          )}

        </View>
      </View>
    </>
  );
};

