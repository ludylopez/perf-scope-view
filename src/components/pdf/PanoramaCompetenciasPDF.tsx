import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';

interface Competencia {
  dimension: string;
  tuEvaluacion: number;
  promedioMunicipal?: number;
}

interface PanoramaCompetenciasPDFProps {
  competencias: Competencia[];
}

export const PanoramaCompetenciasPDF = ({ competencias }: PanoramaCompetenciasPDFProps) => {
  if (!competencias || competencias.length === 0) {
    return null;
  }

  return (
    <View>
      <Text style={pdfStyles.sectionTitle}>PANORAMA DE COMPETENCIAS</Text>
      <View style={pdfStyles.competenciasGrid}>
        {competencias.map((competencia, index) => (
          <View key={index} style={pdfStyles.competenciaItem}>
            <Text style={pdfStyles.competenciaName}>
              {index + 1}. {competencia.dimension}
            </Text>
            <Text style={pdfStyles.competenciaScore}>
              Puntaje: {competencia.tuEvaluacion.toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

