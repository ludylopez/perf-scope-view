import { View, Text, Image } from '@react-pdf/renderer';
import { pdfStyles } from './styles';

interface RadarChartPDFProps {
  radarImage?: string;
  jefeCompleto: boolean;
}

export const RadarChartPDF = ({ radarImage, jefeCompleto }: RadarChartPDFProps) => {
  if (!radarImage) {
    // Retornar View vacío en lugar de null para evitar problemas con React-PDF
    return <View />;
  }

  return (
    <View style={pdfStyles.radarSection}>
      <Text style={pdfStyles.radarTitle}>Panorama de Competencias</Text>
      <Text style={pdfStyles.radarDescription}>
        {jefeCompleto 
          ? 'Vista integral de tu desempeño por dimensión comparado con el promedio municipal'
          : 'Vista de tu autoevaluación por dimensión comparado con el promedio municipal'}
      </Text>
      <Image src={radarImage} style={pdfStyles.radarImage} />
    </View>
  );
};

