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
    return null;
  }

  return (
    <View>
      <Text style={pdfStyles.sectionTitle}>Fortalezas Identificadas</Text>
      {fortalezas.map((fortaleza, index) => (
        <View key={index} style={pdfStyles.fortalezaCard}>
          <Text style={pdfStyles.cardTitle}>
            {fortaleza.dimension}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
            <Text style={pdfStyles.cardValue}>
              Puntaje: {fortaleza.tuEvaluacion.toFixed(1)}%
            </Text>
            {fortaleza.promedioMunicipal !== undefined && fortaleza.promedioMunicipal > 0 && (
              <Text style={pdfStyles.cardValue}>
                Promedio Municipal: {fortaleza.promedioMunicipal.toFixed(1)}%
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

