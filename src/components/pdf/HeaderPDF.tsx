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
  const nombreCompleto = empleado.apellidos 
    ? `${empleado.nombre} ${empleado.apellidos}` 
    : empleado.nombre;

  return (
    <>
      {/* Encabezado con título */}
      <View style={pdfStyles.header}>
        <Text style={pdfStyles.headerText}>Evaluación de Desempeño</Text>
        <Text style={pdfStyles.headerSubtitle}>Municipalidad de Esquipulas, Chiquimula</Text>
      </View>

      {/* Tarjeta de información del empleado */}
      <View style={pdfStyles.infoCard}>
        <Text style={pdfStyles.infoCardTitle}>Información del Colaborador</Text>
        
        <View style={pdfStyles.infoGrid}>
          {/* Columna izquierda */}
          <View style={pdfStyles.infoColumn}>
            <View style={pdfStyles.infoRow}>
              <Text style={pdfStyles.infoLabel}>Empleado</Text>
              <Text style={pdfStyles.infoValue}>{nombreCompleto}</Text>
            </View>
            
            {empleado.dpi && (
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>DPI</Text>
                <Text style={pdfStyles.infoValue}>{empleado.dpi}</Text>
              </View>
            )}
            
            {empleado.cargo && (
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>Cargo</Text>
                <Text style={pdfStyles.infoValue}>{empleado.cargo}</Text>
              </View>
            )}
            
            {empleado.area && (
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>Área</Text>
                <Text style={pdfStyles.infoValue}>{empleado.area}</Text>
              </View>
            )}
            
            {empleado.nivel && (
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>Nivel</Text>
                <Text style={pdfStyles.infoValue}>{empleado.nivel}</Text>
              </View>
            )}
          </View>

          {/* Columna derecha */}
          <View style={pdfStyles.infoColumn}>
            {empleado.direccionUnidad && (
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>Dirección/Unidad</Text>
                <Text style={pdfStyles.infoValue}>{empleado.direccionUnidad}</Text>
              </View>
            )}
            
            {empleado.departamentoDependencia && (
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>Depto/Dependencia</Text>
                <Text style={pdfStyles.infoValue}>{empleado.departamentoDependencia}</Text>
              </View>
            )}
            
            {empleado.profesion && (
              <View style={pdfStyles.infoRow}>
                <Text style={pdfStyles.infoLabel}>Profesión</Text>
                <Text style={pdfStyles.infoValue}>{empleado.profesion}</Text>
              </View>
            )}
            
            <View style={pdfStyles.infoRow}>
              <Text style={pdfStyles.infoLabel}>Período</Text>
              <Text style={pdfStyles.infoValue}>{periodo}</Text>
            </View>
            
            <View style={pdfStyles.infoRow}>
              <Text style={pdfStyles.infoLabel}>Fecha Generación</Text>
              <Text style={pdfStyles.infoValue}>
                {format(fechaGeneracion, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
              </Text>
            </View>
            
            <View style={pdfStyles.infoRow}>
              <Text style={pdfStyles.infoLabel}>Estado</Text>
              <Text style={[pdfStyles.infoValue, { color: jefeCompleto ? '#16a34a' : '#2563eb', fontWeight: 'bold' }]}>
                {jefeCompleto ? 'Resultado Consolidado' : 'Autoevaluación Enviada'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );
};

