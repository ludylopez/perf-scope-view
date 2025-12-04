import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';

interface FirmasPDFProps {
  nombreEmpleado: string;
  nombreJefe?: string;
  nombreDirectoraRRHH?: string;
  esC1?: boolean; // Indica si es miembro del Concejo Municipal
}

export const FirmasPDF = ({ nombreEmpleado, nombreJefe, nombreDirectoraRRHH, esC1 = false }: FirmasPDFProps) => {
  // Validar que los nombres sean strings válidos
  const nombreEmpleadoValido = nombreEmpleado && typeof nombreEmpleado === 'string' && nombreEmpleado.trim() !== '' ? nombreEmpleado : 'Empleado';
  const nombreJefeValido = nombreJefe && typeof nombreJefe === 'string' && nombreJefe.trim() !== '' ? nombreJefe : 'Jefe Inmediato';
  const nombreDirectoraValido = nombreDirectoraRRHH && typeof nombreDirectoraRRHH === 'string' && nombreDirectoraRRHH.trim() !== '' ? nombreDirectoraRRHH : 'Directora de Recursos Humanos';
  
  return (
    <View style={pdfStyles.firmasSection}>
      {/* Firma del Evaluado */}
      <View style={pdfStyles.firmaBox}>
        <View style={pdfStyles.firmaLinea} />
        <Text style={pdfStyles.firmaLabel}>Firma del Evaluado</Text>
        <Text style={pdfStyles.firmaNombre}>{nombreEmpleadoValido}</Text>
      </View>

      {/* Para C1 (Concejo Municipal), no mostrar firma del evaluador ya que solo se autoevalúan */}
      {/* Para otros niveles, mostrar firma del evaluador (jefe) */}
      {!esC1 && (
        <View style={pdfStyles.firmaBox}>
          <View style={pdfStyles.firmaLinea} />
          <Text style={pdfStyles.firmaLabel}>Firma del Evaluador</Text>
          <Text style={pdfStyles.firmaNombre}>{nombreJefeValido}</Text>
        </View>
      )}
      
      {/* Firma de RRHH siempre se muestra (tanto para C1 como para otros niveles) */}
      <View style={pdfStyles.firmaBox}>
        <View style={pdfStyles.firmaLinea} />
        <Text style={pdfStyles.firmaLabel}>Firma de la Directora de RRHH</Text>
        <Text style={pdfStyles.firmaNombre}>{nombreDirectoraValido}</Text>
      </View>
    </View>
  );
};

