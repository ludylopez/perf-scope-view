import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
      {/* Encabezado con título */}
      <View style={pdfStyles.header}>
        <Text style={pdfStyles.headerText}>Evaluación de Desempeño</Text>
        <Text style={pdfStyles.headerSubtitle}>Municipalidad de Esquipulas, Chiquimula</Text>
      </View>

      {/* Tarjeta de información del empleado */}
      <View style={pdfStyles.infoCard}>
        <View style={pdfStyles.infoGrid}>
          {/* Columna izquierda */}
          <View style={pdfStyles.infoColumn}>
            <View style={pdfStyles.infoRow}>
              <Text style={pdfStyles.infoLabel}>EMPLEADO:</Text>
              <Text style={pdfStyles.infoValue}>{nombreCompleto || 'N/A'}</Text>
            </View>
            
            {empleado?.dpi && (
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>DPI:</Text>
                <Text style={pdfStyles.infoValue}>{empleado.dpi || ''}</Text>
              </View>
            )}
            
            {empleado?.cargo && (
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>CARGO:</Text>
                <Text style={pdfStyles.infoValue}>{empleado.cargo || ''}</Text>
              </View>
            )}
            
            {empleado?.area && (
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>ÁREA:</Text>
                <Text style={pdfStyles.infoValue}>{empleado.area || ''}</Text>
              </View>
            )}
          </View>

          {/* Columna derecha */}
          <View style={pdfStyles.infoColumn}>
            {empleado?.direccionUnidad && (
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>DIRECCIÓN/UNIDAD:</Text>
                <Text style={pdfStyles.infoValue}>{empleado.direccionUnidad || ''}</Text>
              </View>
            )}
            
            {empleado?.departamentoDependencia && (
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>DEPTO/DEPENDENCIA:</Text>
                <Text style={pdfStyles.infoValue}>{empleado.departamentoDependencia || ''}</Text>
              </View>
            )}
            
            {empleado?.profesion && (
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>PROFESIÓN:</Text>
                <Text style={pdfStyles.infoValue}>{empleado.profesion || ''}</Text>
              </View>
            )}
            
            {empleado?.nivel && (
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>NIVEL:</Text>
                <Text style={pdfStyles.infoValue}>{empleado.nivel || ''}</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={pdfStyles.infoGrid}>
          <View style={pdfStyles.infoRow}>
            <Text style={pdfStyles.infoLabel}>PERÍODO:</Text>
            <Text style={pdfStyles.infoValue}>{periodo || 'N/A'}</Text>
          </View>
          <View style={pdfStyles.infoRow}>
            <Text style={pdfStyles.infoLabel}>FECHA GENERACIÓN:</Text>
            <Text style={pdfStyles.infoValue}>
              {fechaGeneracion ? format(fechaGeneracion, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es }) : 'N/A'}
            </Text>
          </View>
        </View>
        
        <View style={pdfStyles.infoRow}>
          <Text style={pdfStyles.infoLabel}>ESTADO:</Text>
          <Text style={pdfStyles.infoEstado}>
            {empleado?.nivel === 'C1' 
              ? 'Resultado Final (Autoevaluación Concejo Municipal)' 
              : jefeCompleto 
                ? 'Resultado Consolidado' 
                : 'Autoevaluación Enviada'}
          </Text>
        </View>
      </View>
    </>
  );
};

