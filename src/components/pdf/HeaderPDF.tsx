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
}

export const HeaderPDF = ({ empleado, periodo, fechaGeneracion, jefeCompleto }: HeaderPDFProps) => {
  const nombreCompleto = empleado?.apellidos 
    ? `${empleado?.nombre || 'N/A'} ${empleado.apellidos}` 
    : (empleado?.nombre || 'N/A');

  return (
    <>
      {/* Encabezado con título y logo */}
      <View style={pdfStyles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          {/* Logo */}
          <Image 
            src={logoMunicipalidad}
            style={{ width: 40, height: 40, marginRight: 10 }}
          />
          {/* Título y subtítulo */}
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={pdfStyles.headerText}>Evaluación de Desempeño</Text>
            <Text style={pdfStyles.headerSubtitle}>Municipalidad de Esquipulas, Chiquimula</Text>
          </View>
        </View>
      </View>

      {/* Tabla de información del empleado */}
      <View style={pdfStyles.infoCard}>
        <View style={[pdfStyles.table, { marginBottom: 8 }]}>
          {/* Fila 1: Empleado y DPI */}
          <View style={pdfStyles.tableRow}>
            <View style={[pdfStyles.tableCell, { width: '50%', borderRightWidth: 1, borderRightColor: '#e5e7eb', padding: 4 }]}>
              <Text style={pdfStyles.infoLabel}>EMPLEADO:</Text>
              <Text style={pdfStyles.infoValue}>{nombreCompleto || 'N/A'}</Text>
            </View>
            {empleado?.dpi ? (
              <View style={[pdfStyles.tableCell, { width: '50%', padding: 4 }]}>
                <Text style={pdfStyles.infoLabel}>DPI:</Text>
                <Text style={pdfStyles.infoValue}>{empleado.dpi || ''}</Text>
              </View>
            ) : (
              <View style={[pdfStyles.tableCell, { width: '50%', padding: 4 }]} />
            )}
          </View>

          {/* Fila 2: Cargo y Área */}
          <View style={pdfStyles.tableRow}>
            {empleado?.cargo ? (
              <View style={[pdfStyles.tableCell, { width: '50%', borderRightWidth: 1, borderRightColor: '#e5e7eb', padding: 4 }]}>
                <Text style={pdfStyles.infoLabel}>CARGO:</Text>
                <Text style={pdfStyles.infoValue}>{empleado.cargo || ''}</Text>
              </View>
            ) : (
              <View style={[pdfStyles.tableCell, { width: '50%', borderRightWidth: 1, borderRightColor: '#e5e7eb', padding: 4 }]} />
            )}
            {empleado?.area ? (
              <View style={[pdfStyles.tableCell, { width: '50%', padding: 4 }]}>
                <Text style={pdfStyles.infoLabel}>ÁREA:</Text>
                <Text style={pdfStyles.infoValue}>{empleado.area || ''}</Text>
              </View>
            ) : (
              <View style={[pdfStyles.tableCell, { width: '50%', padding: 4 }]} />
            )}
          </View>

          {/* Fila 3: Dirección/Unidad y Depto/Dependencia */}
          {(empleado?.direccionUnidad || empleado?.departamentoDependencia) && (
            <View style={pdfStyles.tableRow}>
              {empleado?.direccionUnidad ? (
                <View style={[pdfStyles.tableCell, { width: '50%', borderRightWidth: 1, borderRightColor: '#e5e7eb', padding: 4 }]}>
                  <Text style={pdfStyles.infoLabel}>DIRECCIÓN/UNIDAD:</Text>
                  <Text style={pdfStyles.infoValue}>{empleado.direccionUnidad || ''}</Text>
                </View>
              ) : (
                <View style={[pdfStyles.tableCell, { width: '50%', borderRightWidth: 1, borderRightColor: '#e5e7eb', padding: 4 }]} />
              )}
              {empleado?.departamentoDependencia ? (
                <View style={[pdfStyles.tableCell, { width: '50%', padding: 4 }]}>
                  <Text style={pdfStyles.infoLabel}>DEPTO/DEPENDENCIA:</Text>
                  <Text style={pdfStyles.infoValue}>{empleado.departamentoDependencia || ''}</Text>
                </View>
              ) : (
                <View style={[pdfStyles.tableCell, { width: '50%', padding: 4 }]} />
              )}
            </View>
          )}

          {/* Fila 4: Profesión y Nivel */}
          {(empleado?.profesion || empleado?.nivel) && (
            <View style={pdfStyles.tableRow}>
              {empleado?.profesion ? (
                <View style={[pdfStyles.tableCell, { width: '50%', borderRightWidth: 1, borderRightColor: '#e5e7eb', padding: 4 }]}>
                  <Text style={pdfStyles.infoLabel}>PROFESIÓN:</Text>
                  <Text style={pdfStyles.infoValue}>{empleado.profesion || ''}</Text>
                </View>
              ) : (
                <View style={[pdfStyles.tableCell, { width: '50%', borderRightWidth: 1, borderRightColor: '#e5e7eb', padding: 4 }]} />
              )}
              {empleado?.nivel ? (
                <View style={[pdfStyles.tableCell, { width: '50%', padding: 4 }]}>
                  <Text style={pdfStyles.infoLabel}>NIVEL:</Text>
                  <Text style={pdfStyles.infoValue}>{empleado.nivel || ''}</Text>
                </View>
              ) : (
                <View style={[pdfStyles.tableCell, { width: '50%', padding: 4 }]} />
              )}
            </View>
          )}

          {/* Fila 5: Período y Fecha Generación */}
          <View style={pdfStyles.tableRow}>
            <View style={[pdfStyles.tableCell, { width: '50%', borderRightWidth: 1, borderRightColor: '#e5e7eb', padding: 4 }]}>
              <Text style={pdfStyles.infoLabel}>PERÍODO:</Text>
              <Text style={pdfStyles.infoValue}>{periodo || 'N/A'}</Text>
            </View>
            <View style={[pdfStyles.tableCell, { width: '50%', padding: 4 }]}>
              <Text style={pdfStyles.infoLabel}>FECHA GENERACIÓN:</Text>
              <Text style={pdfStyles.infoValue}>
                {fechaGeneracion ? new Date(fechaGeneracion).toLocaleDateString('es-ES', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'N/A'}
              </Text>
            </View>
          </View>

          {/* Fila 6: Estado */}
          <View style={pdfStyles.tableRow}>
            <View style={[pdfStyles.tableCell, { padding: 4 }]}>
              <Text style={pdfStyles.infoLabel}>ESTADO:</Text>
              <Text style={pdfStyles.infoEstado}>
                {empleado?.nivel === 'C1' 
                  ? 'Resultado Final (Autoevaluación Concejo Municipal)' 
                  : jefeCompleto 
                    ? 'Resultado Consolidado' 
                    : 'Autoevaluación Enviada'}
              </Text>
            </View>
            <View style={[pdfStyles.tableCell, { width: '50%', padding: 4 }]} />
          </View>
        </View>
      </View>
    </>
  );
};

