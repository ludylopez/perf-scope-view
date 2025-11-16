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
      <Text style={pdfStyles.sectionTitle}>ÁREAS DE OPORTUNIDAD</Text>
      <View style={pdfStyles.oportunidadesGrid}>
        {areasOportunidad.map((area, index) => (
          <View key={index} style={pdfStyles.oportunidadCard}>
            <Text style={pdfStyles.oportunidadTitle}>
              {index + 1}. {area.dimension}
            </Text>
            <Text style={pdfStyles.oportunidadValue}>
              Puntaje: {area.tuEvaluacion.toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

