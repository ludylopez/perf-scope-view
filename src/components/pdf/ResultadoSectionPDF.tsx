import { View, Text, Image } from '@react-pdf/renderer';
import { pdfStyles } from './styles';

interface ResultadoSectionPDFProps {
  performancePercentage: number;
  radarImage?: string;
}

const getScoreInterpretation = (percentage: number) => {
  if (percentage >= 90) {
    return { label: 'Excelente', color: pdfStyles.interpretationExcellent };
  }
  if (percentage >= 75) {
    return { label: 'Bueno', color: pdfStyles.interpretationGood };
  }
  if (percentage >= 60) {
    return { label: 'Regular', color: pdfStyles.interpretationRegular };
  }
  return { label: 'Necesita mejorar', color: pdfStyles.interpretationNeedsImprovement };
};

export const ResultadoSectionPDF = ({ performancePercentage, radarImage }: ResultadoSectionPDFProps) => {
  const interpretation = getScoreInterpretation(performancePercentage);
  const description = performancePercentage >= 75
    ? 'Estás cumpliendo satisfactoriamente con las expectativas del cargo.'
    : 'Hay áreas importantes que requieren atención y mejora.';

  return (
    <View style={pdfStyles.resultadoSection}>
      <View style={pdfStyles.percentageContainer}>
        <Text style={pdfStyles.percentage}>{performancePercentage}</Text>
        <Text style={pdfStyles.percentageLabel}>%</Text>
      </View>
      <View style={pdfStyles.resultadoCenter}>
        <Text style={[pdfStyles.interpretation, interpretation.color]}>
          RESULTADO GENERAL: Tu desempeño es {interpretation.label}
        </Text>
        <Text style={pdfStyles.description}>{description}</Text>
      </View>
      <View style={pdfStyles.resultadoRight}>
        {radarImage ? (
          <Image src={radarImage} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <Text style={pdfStyles.radarPlaceholder}>
            Gráfico Hexagonal{'\n'}de Competencias{'\n'}(Imagen)
          </Text>
        )}
      </View>
    </View>
  );
};

