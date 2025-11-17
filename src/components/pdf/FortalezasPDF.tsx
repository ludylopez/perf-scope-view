import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';

interface Fortaleza {
  dimension: string;
  nombreCompleto?: string;
  tuEvaluacion: number;
  promedioMunicipal?: number;
}

interface FortalezasPDFProps {
  fortalezas: Fortaleza[];
}

export const FortalezasPDF = ({ fortalezas }: FortalezasPDFProps) => {
  if (!fortalezas || fortalezas.length === 0) {
    // Retornar View vacío en lugar de null para evitar problemas con React-PDF
    return <View />;
  }

  return (
    <View>
      <Text style={pdfStyles.sectionTitle}>✅ FORTALEZAS IDENTIFICADAS</Text>
      <View style={pdfStyles.fortalezasGrid}>
        {fortalezas.map((fortaleza, index) => (
          <View key={index} style={pdfStyles.fortalezaCard}>
            <Text style={pdfStyles.cardTitle}>
              {index + 1}. {fortaleza.dimension}
            </Text>
            <Text style={pdfStyles.cardValue}>
              Puntaje: {fortaleza.tuEvaluacion.toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

