import { View, Text } from '@react-pdf/renderer';
import { teamAnalysisStyles } from './teamAnalysisStyles';
import type { TeamAnalysisStats } from '@/types/teamAnalysis';

interface TeamStatsSummaryPDFProps {
  stats: TeamAnalysisStats;
}

export const TeamStatsSummaryPDF = ({ stats }: TeamStatsSummaryPDFProps) => {
  // Calcular comparativas
  const desempenoDiff = stats.promedioDesempenoUnidad - stats.promedioDesempenoOrganizacion;
  const potencialDiff = stats.promedioPotencialUnidad - stats.promedioPotencialOrganizacion;
  const eNPSDiff = (stats.eNPS ?? 0) - (stats.eNPSOrganizacion ?? 0);

  // Formatear eNPS
  const formatENPS = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    return value > 0 ? `+${value}` : `${value}`;
  };

  return (
    <View style={teamAnalysisStyles.statsContainer}>
      {/* Total Personas */}
      <View style={teamAnalysisStyles.statsCard}>
        <Text style={teamAnalysisStyles.statsIcon}>👥</Text>
        <Text style={teamAnalysisStyles.statsLabel}>Total Personas</Text>
        <Text style={teamAnalysisStyles.statsValue}>{stats.totalPersonas}</Text>
        <Text style={teamAnalysisStyles.statsSubtext}>
          {stats.totalJefes} jefes | {stats.totalColaboradores} colaboradores
        </Text>
      </View>

      {/* Evaluaciones */}
      <View style={[teamAnalysisStyles.statsCard, teamAnalysisStyles.statsCardSuccess]}>
        <Text style={teamAnalysisStyles.statsIcon}>✅</Text>
        <Text style={teamAnalysisStyles.statsLabel}>Evaluaciones</Text>
        <Text style={[teamAnalysisStyles.statsValue, teamAnalysisStyles.statsValueSuccess]}>
          {stats.evaluacionesCompletadas}
        </Text>
        <Text style={teamAnalysisStyles.statsSubtext}>
          {Math.round(stats.tasaCompletitud)}% completitud
        </Text>
      </View>

      {/* Desempeño Promedio */}
      <View style={[teamAnalysisStyles.statsCard, teamAnalysisStyles.statsCardPrimary]}>
        <Text style={teamAnalysisStyles.statsIcon}>🎯</Text>
        <Text style={teamAnalysisStyles.statsLabel}>Desempeño Promedio</Text>
        <Text style={[teamAnalysisStyles.statsValue, teamAnalysisStyles.statsValuePrimary]}>
          {Math.round(stats.promedioDesempenoUnidad)}%
        </Text>
        {stats.promedioDesempenoOrganizacion > 0 && (
          <Text style={[
            teamAnalysisStyles.statsComparison,
            desempenoDiff >= 0 ? teamAnalysisStyles.statsComparisonUp : teamAnalysisStyles.statsComparisonDown
          ]}>
            {desempenoDiff >= 0 ? '↑' : '↓'} {Math.abs(Math.round(desempenoDiff))} pts vs org ({Math.round(stats.promedioDesempenoOrganizacion)}%)
          </Text>
        )}
      </View>

      {/* Potencial Promedio */}
      <View style={[teamAnalysisStyles.statsCard, teamAnalysisStyles.statsCardPurple]}>
        <Text style={teamAnalysisStyles.statsIcon}>📈</Text>
        <Text style={teamAnalysisStyles.statsLabel}>Potencial Promedio</Text>
        <Text style={[teamAnalysisStyles.statsValue, teamAnalysisStyles.statsValuePurple]}>
          {Math.round(stats.promedioPotencialUnidad)}%
        </Text>
        {stats.promedioPotencialOrganizacion > 0 && (
          <Text style={[
            teamAnalysisStyles.statsComparison,
            potencialDiff >= 0 ? teamAnalysisStyles.statsComparisonUp : teamAnalysisStyles.statsComparisonDown
          ]}>
            {potencialDiff >= 0 ? '↑' : '↓'} {Math.abs(Math.round(potencialDiff))} pts vs org ({Math.round(stats.promedioPotencialOrganizacion)}%)
          </Text>
        )}
      </View>

      {/* eNPS */}
      <View style={[teamAnalysisStyles.statsCard, teamAnalysisStyles.statsCardWarning]}>
        <Text style={teamAnalysisStyles.statsIcon}>👍</Text>
        <Text style={teamAnalysisStyles.statsLabel}>eNPS</Text>
        <Text style={teamAnalysisStyles.statsValue}>
          {formatENPS(stats.eNPS)}
        </Text>
        {stats.eNPSTotalRespuestas !== undefined && stats.eNPSTotalRespuestas > 0 && (
          <Text style={teamAnalysisStyles.statsSubtext}>
            P:{stats.eNPSPromoters || 0} N:{stats.eNPSPassives || 0} D:{stats.eNPSDetractors || 0}
          </Text>
        )}
        {stats.eNPS !== undefined && stats.eNPSOrganizacion !== undefined && (
          <Text style={[
            teamAnalysisStyles.statsComparison,
            eNPSDiff >= 0 ? teamAnalysisStyles.statsComparisonUp : teamAnalysisStyles.statsComparisonDown
          ]}>
            {eNPSDiff >= 0 ? '↑' : '↓'} {Math.abs(eNPSDiff)} pts vs org ({formatENPS(stats.eNPSOrganizacion)})
          </Text>
        )}
      </View>
    </View>
  );
};
