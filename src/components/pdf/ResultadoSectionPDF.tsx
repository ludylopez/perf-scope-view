import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';

interface ResultadoSectionPDFProps {
  performancePercentage: number;
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

export const ResultadoSectionPDF = ({ performancePercentage }: ResultadoSectionPDFProps) => {
  const interpretation = getScoreInterpretation(performancePercentage);
  const description = performancePercentage >= 75
    ? 'Estás cumpliendo satisfactoriamente con las expectativas del cargo.'
    : 'Hay áreas importantes que requieren atención y mejora.';

  return (
    <View style={pdfStyles.resultadoSection}>
      <Text style={pdfStyles.percentage}>{performancePercentage}%</Text>
      <Text style={[pdfStyles.interpretation, interpretation.color]}>
        Tu desempeño es {interpretation.label}
      </Text>
      <Text style={pdfStyles.description}>{description}</Text>
    </View>
  );
};

