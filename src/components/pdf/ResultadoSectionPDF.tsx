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
  // Asegurar que performancePercentage sea un número válido
  const percentage = typeof performancePercentage === 'number' && !isNaN(performancePercentage) ? performancePercentage : 0;
  const interpretation = getScoreInterpretation(percentage);
  const description = percentage >= 75
    ? 'Estás cumpliendo satisfactoriamente con las expectativas del cargo.'
    : 'Hay áreas importantes que requieren atención y mejora.';

  return (
    <View style={pdfStyles.resultadoSection}>
      <View style={pdfStyles.resultadoCenter}>
        <Text style={[pdfStyles.interpretation, interpretation.color]}>
          Tu desempeño es {interpretation.label || 'Regular'}
        </Text>
        <Text style={pdfStyles.description}>{description || 'Sin descripción disponible.'}</Text>
      </View>
    </View>
  );
};

