import { View, Text, Image } from '@react-pdf/renderer';
import { pdfStyles } from './styles';

interface RadarChartPDFProps {
  radarImage?: string;
  jefeCompleto: boolean;
}

export const RadarChartPDF = ({ radarImage, jefeCompleto }: RadarChartPDFProps) => {
  if (!radarImage) {
    return null;
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

