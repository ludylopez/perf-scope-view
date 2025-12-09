import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';

interface FirmasPDFProps {
  nombreEmpleado: string;
  cargoEmpleado?: string;
  nombreJefe?: string;
  cargoJefe?: string;
  nombreDirectoraRRHH?: string;
  cargoDirectoraRRHH?: string;
  esC1?: boolean; // Indica si es miembro del Concejo Municipal
}

export const FirmasPDF = ({ 
  nombreEmpleado, 
  cargoEmpleado,
  nombreJefe, 
  cargoJefe,
  nombreDirectoraRRHH, 
  cargoDirectoraRRHH,
  esC1 = false 
}: FirmasPDFProps) => {
  // Validar que los nombres sean strings válidos
  const nombreEmpleadoValido = nombreEmpleado && typeof nombreEmpleado === 'string' && nombreEmpleado.trim() !== '' ? nombreEmpleado : 'Empleado';
  const cargoEmpleadoValido = cargoEmpleado && typeof cargoEmpleado === 'string' && cargoEmpleado.trim() !== '' ? cargoEmpleado : undefined;
  
  const nombreJefeValido = nombreJefe && typeof nombreJefe === 'string' && nombreJefe.trim() !== '' ? nombreJefe : 'Jefe Inmediato';
  const cargoJefeValido = cargoJefe && typeof cargoJefe === 'string' && cargoJefe.trim() !== '' ? cargoJefe : 'Jefe Inmediato';
  
  const nombreDirectoraValido = nombreDirectoraRRHH && typeof nombreDirectoraRRHH === 'string' && nombreDirectoraRRHH.trim() !== '' ? nombreDirectoraRRHH : 'Directora de Recursos Humanos';
  const cargoDirectoraValido = cargoDirectoraRRHH && typeof cargoDirectoraRRHH === 'string' && cargoDirectoraRRHH.trim() !== '' ? cargoDirectoraRRHH : 'Directora de Recursos Humanos';
  
  return (
    <View style={pdfStyles.firmasSection}>
      {/* Firma del Evaluado */}
      <View style={pdfStyles.firmaBox}>
        <View style={pdfStyles.firmaLinea} />
        <Text style={pdfStyles.firmaLabel}>Firma del Evaluado</Text>
        <Text style={pdfStyles.firmaNombre}>{nombreEmpleadoValido}</Text>
        {cargoEmpleadoValido && (
          <Text style={pdfStyles.firmaCargo}>{cargoEmpleadoValido}</Text>
        )}
      </View>

      {/* Para C1 (Concejo Municipal), no mostrar firma del evaluador ya que solo se autoevalúan */}
      {/* Para otros niveles, mostrar firma del evaluador (jefe) */}
      {!esC1 && (
        <View style={pdfStyles.firmaBox}>
          <View style={pdfStyles.firmaLinea} />
          <Text style={pdfStyles.firmaLabel}>Firma del Evaluador</Text>
          <Text style={pdfStyles.firmaNombre}>{nombreJefeValido}</Text>
          <Text style={pdfStyles.firmaCargo}>{cargoJefeValido}</Text>
        </View>
      )}
      
      {/* Firma de RRHH siempre se muestra (tanto para C1 como para otros niveles) */}
      <View style={pdfStyles.firmaBox}>
        <View style={pdfStyles.firmaLinea} />
        <Text style={pdfStyles.firmaLabel}>Firma de la Directora de RRHH</Text>
        <Text style={pdfStyles.firmaNombre}>{nombreDirectoraValido}</Text>
        <Text style={pdfStyles.firmaCargo}>{cargoDirectoraValido}</Text>
      </View>
    </View>
  );
};

