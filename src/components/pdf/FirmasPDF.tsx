import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';

interface FirmasPDFProps {
  nombreEmpleado: string;
}

export const FirmasPDF = ({ nombreEmpleado }: FirmasPDFProps) => {
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
        <Text style={pdfStyles.firmaLabel}>Jefe Inmediato</Text>
      </View>
    </View>
  );
};

