import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';

interface AreaOportunidad {
  dimension: string;
  nombreCompleto?: string;
  tuEvaluacion: number;
  promedioMunicipal?: number;
}

interface AreasOportunidadPDFProps {
  areasOportunidad: AreaOportunidad[];
}

export const AreasOportunidadPDF = ({ areasOportunidad }: AreasOportunidadPDFProps) => {
  if (!areasOportunidad || areasOportunidad.length === 0) {
    return null;
  }

  return (
    <View>
      <Text style={pdfStyles.sectionTitle}>Áreas de Oportunidad</Text>
      {areasOportunidad.map((area, index) => (
        <View key={index} style={pdfStyles.oportunidadCard}>
          <Text style={pdfStyles.cardTitle}>
            {index + 1}. {area.dimension}
          </Text>
          <View style={pdfStyles.cardValuesRow}>
            <Text style={pdfStyles.cardValue}>
              Puntaje: <Text style={pdfStyles.cardPercentage}>{area.tuEvaluacion.toFixed(1)}%</Text>
            </Text>
            {area.promedioMunicipal !== undefined && area.promedioMunicipal > 0 && (
              <Text style={pdfStyles.cardValue}>
                Promedio Municipal: {area.promedioMunicipal.toFixed(1)}%
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

