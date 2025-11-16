import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';

interface FirmasPDFProps {
  nombreEmpleado: string;
  nombreJefe?: string;
  nombreDirectoraRRHH?: string;
}

export const FirmasPDF = ({ nombreEmpleado, nombreJefe, nombreDirectoraRRHH }: FirmasPDFProps) => {
  return (
    <View style={pdfStyles.firmasSection}>
      <View style={pdfStyles.firmaBox}>
        <View style={pdfStyles.firmaLinea} />
        <Text style={pdfStyles.firmaLabel}>Firma del Evaluado</Text>
        <Text style={pdfStyles.firmaLabel}>{nombreEmpleado}</Text>
      </View>
      <View style={pdfStyles.firmaBox}>
        <View style={pdfStyles.firmaLinea} />
        <Text style={pdfStyles.firmaLabel}>Firma del Evaluador</Text>
        <Text style={pdfStyles.firmaLabel}>{nombreJefe || 'Jefe Inmediato'}</Text>
      </View>
      <View style={pdfStyles.firmaBox}>
        <View style={pdfStyles.firmaLinea} />
        <Text style={pdfStyles.firmaLabel}>Firma de la Directora de RRHH</Text>
        <Text style={pdfStyles.firmaLabel}>{nombreDirectoraRRHH || 'Directora de Recursos Humanos'}</Text>
      </View>
    </View>
  );
};

