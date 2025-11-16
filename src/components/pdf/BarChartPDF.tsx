import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';

interface CompetenciaData {
  dimension: string;
  tuEvaluacion: number;
  promedioMunicipal?: number;
}

interface BarChartPDFProps {
  competencias: CompetenciaData[];
}

export const BarChartPDF = ({ competencias }: BarChartPDFProps) => {
  if (!competencias || competencias.length === 0) {
    return null;
  }

  const maxValue = Math.max(
    ...competencias.map(c => Math.max(c.tuEvaluacion, c.promedioMunicipal || 0))
  );
  const chartHeight = 10; // Altura de cada barra en puntos
  const chartWidth = 250; // Ancho máximo del gráfico
  const barSpacing = 4; // Espacio entre barras

  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={pdfStyles.sectionTitle}>PANORAMA DE COMPETENCIAS</Text>
      <View style={{ marginTop: 8 }}>
        {competencias.map((competencia, index) => {
          const tuWidth = (competencia.tuEvaluacion / maxValue) * chartWidth;
          const promedioWidth = competencia.promedioMunicipal 
            ? (competencia.promedioMunicipal / maxValue) * chartWidth 
            : 0;

          return (
            <View key={index} style={{ marginBottom: 14 }}>
              {/* Nombre de la competencia */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#1f2937', width: '50%' }}>
                  {index + 1}. {competencia.dimension}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Text style={{ fontSize: 7.5, fontWeight: 'bold', color: '#2563eb' }}>
                    {competencia.tuEvaluacion.toFixed(1)}%
                  </Text>
                  {competencia.promedioMunicipal && competencia.promedioMunicipal > 0 && (
                    <Text style={{ fontSize: 7.5, color: '#22c55e' }}>
                      {competencia.promedioMunicipal.toFixed(1)}%
                    </Text>
                  )}
                </View>
              </View>

              {/* Barras horizontales lado a lado */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                {/* Barra del usuario */}
                <View style={{ flex: 1, position: 'relative', height: chartHeight }}>
                  <View
                    style={{
                      width: tuWidth,
                      height: chartHeight,
                      backgroundColor: '#2563eb',
                      borderRadius: 3,
                      border: '0.5px solid #1e40af',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      paddingRight: 3,
                    }}
                  >
                    <Text style={{ 
                      fontSize: 6.5,
                      color: '#ffffff',
                      fontWeight: 'bold'
                    }}>
                      Tú
                    </Text>
                  </View>
                </View>
                
                {/* Barra del promedio municipal */}
                {competencia.promedioMunicipal && competencia.promedioMunicipal > 0 && (
                  <View style={{ flex: 1, position: 'relative', height: chartHeight }}>
                    <View
                      style={{
                        width: promedioWidth,
                        height: chartHeight,
                        backgroundColor: '#22c55e',
                        borderRadius: 3,
                        border: '0.5px solid #16a34a',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        paddingRight: 3,
                      }}
                    >
                      <Text style={{ 
                        fontSize: 6.5,
                        color: '#ffffff',
                        fontWeight: 'bold'
                      }}>
                        Prom.
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Leyenda general al final */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'center', 
        gap: 15, 
        marginTop: 8,
        paddingTop: 8,
        borderTop: '1px solid #e5e7eb'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 12, height: 4, backgroundColor: '#2563eb', borderRadius: 1 }} />
          <Text style={{ fontSize: 7, color: '#6b7280' }}>Tu Resultado</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 12, height: 4, backgroundColor: '#22c55e', borderRadius: 1 }} />
          <Text style={{ fontSize: 7, color: '#6b7280' }}>Promedio Municipal</Text>
        </View>
      </View>
    </View>
  );
};

