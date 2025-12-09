import { View, Text } from '@react-pdf/renderer';
import { teamAnalysisStyles } from './teamAnalysisStyles';
import type { TeamAIAnalysisResponse } from '@/types/teamAnalysis';

interface TeamAIAnalysisPDFProps {
  analysis: TeamAIAnalysisResponse | null | undefined;
}

export const TeamAIAnalysisPDF = ({ analysis }: TeamAIAnalysisPDFProps) => {
  if (!analysis) {
    return (
      <View style={teamAnalysisStyles.aiSection}>
        <Text style={teamAnalysisStyles.aiSectionTitle}>
          ANÁLISIS DEL EQUIPO
        </Text>
        <View style={teamAnalysisStyles.aiResumen}>
          <Text style={teamAnalysisStyles.aiResumenText}>
            El análisis de fortalezas y oportunidades de mejora aún no ha sido generado.
            Puede generarlo desde la vista de análisis de equipo.
          </Text>
        </View>
      </View>
    );
  }

  // Función para obtener estilo de prioridad
  const getPrioridadStyle = (prioridad: 'alta' | 'media' | 'baja') => {
    switch (prioridad) {
      case 'alta':
        return teamAnalysisStyles.prioridadAlta;
      case 'media':
        return teamAnalysisStyles.prioridadMedia;
      case 'baja':
        return teamAnalysisStyles.prioridadBaja;
      default:
        return teamAnalysisStyles.prioridadMedia;
    }
  };

  // Función para obtener texto de prioridad
  const getPrioridadText = (prioridad: 'alta' | 'media' | 'baja') => {
    switch (prioridad) {
      case 'alta':
        return 'ALTA';
      case 'media':
        return 'MEDIA';
      case 'baja':
        return 'BAJA';
      default:
        return prioridad.toUpperCase();
    }
  };

  return (
    <View style={teamAnalysisStyles.aiSection}>
      <Text style={teamAnalysisStyles.aiSectionTitle}>
        ANÁLISIS DEL EQUIPO (GENERADO POR IA)
      </Text>

      {/* Resumen Ejecutivo */}
      {analysis.resumenEjecutivo && (
        <View style={teamAnalysisStyles.aiResumen}>
          <Text style={teamAnalysisStyles.aiResumenTitle}>RESUMEN EJECUTIVO</Text>
          <Text style={teamAnalysisStyles.aiResumenText}>
            {analysis.resumenEjecutivo}
          </Text>
        </View>
      )}

      {/* Fortalezas */}
      {analysis.fortalezas && analysis.fortalezas.length > 0 && (
        <View>
          <Text style={teamAnalysisStyles.aiSubsectionTitle}>
            FORTALEZAS IDENTIFICADAS
          </Text>
          {analysis.fortalezas.map((fortaleza, index) => (
            <View key={index} style={teamAnalysisStyles.fortalezaCard} wrap={false}>
              <View style={teamAnalysisStyles.fortalezaHeader}>
                <Text style={teamAnalysisStyles.fortalezaIcon}>⭐</Text>
                <Text style={teamAnalysisStyles.fortalezaTitle}>
                  {fortaleza.titulo}
                </Text>
              </View>
              <Text style={teamAnalysisStyles.fortalezaDescription}>
                {fortaleza.descripcion}
              </Text>
              {fortaleza.evidencia && (
                <Text style={teamAnalysisStyles.fortalezaDetail}>
                  <Text style={teamAnalysisStyles.fortalezaDetailLabel}>
                    Evidencia:{' '}
                  </Text>
                  {fortaleza.evidencia}
                </Text>
              )}
              {fortaleza.impacto && (
                <Text style={teamAnalysisStyles.fortalezaDetail}>
                  <Text style={teamAnalysisStyles.fortalezaDetailLabel}>
                    Impacto:{' '}
                  </Text>
                  {fortaleza.impacto}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Oportunidades de Mejora */}
      {analysis.oportunidadesMejora && analysis.oportunidadesMejora.length > 0 && (
        <View>
          <Text style={teamAnalysisStyles.aiSubsectionTitle}>
            OPORTUNIDADES DE MEJORA
          </Text>
          {analysis.oportunidadesMejora.map((oportunidad, index) => (
            <View key={index} style={teamAnalysisStyles.oportunidadCard} wrap={false}>
              <View style={teamAnalysisStyles.oportunidadHeader}>
                <Text style={teamAnalysisStyles.oportunidadIcon}>!</Text>
                <Text style={teamAnalysisStyles.oportunidadTitle}>
                  {oportunidad.titulo}
                </Text>
                <Text
                  style={[
                    teamAnalysisStyles.oportunidadPrioridad,
                    getPrioridadStyle(oportunidad.prioridad),
                  ]}
                >
                  {getPrioridadText(oportunidad.prioridad)}
                </Text>
              </View>
              <Text style={teamAnalysisStyles.oportunidadDescription}>
                {oportunidad.descripcion}
              </Text>
              {oportunidad.causas && (
                <Text style={teamAnalysisStyles.oportunidadCausas}>
                  <Text style={{ fontWeight: 'bold' }}>Causas: </Text>
                  {oportunidad.causas}
                </Text>
              )}
              {oportunidad.recomendaciones && oportunidad.recomendaciones.length > 0 && (
                <View style={teamAnalysisStyles.oportunidadRecomendaciones}>
                  <Text style={teamAnalysisStyles.oportunidadRecomendacionesTitle}>
                    Recomendaciones:
                  </Text>
                  {oportunidad.recomendaciones.map((rec, recIndex) => (
                    <Text
                      key={recIndex}
                      style={teamAnalysisStyles.oportunidadRecomendacionItem}
                    >
                      • {rec}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
