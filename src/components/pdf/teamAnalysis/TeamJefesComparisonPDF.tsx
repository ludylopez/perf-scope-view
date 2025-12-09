import { View, Text } from '@react-pdf/renderer';
import { teamAnalysisStyles } from './teamAnalysisStyles';
import type { JefeParaFiltro, TeamMember9Box } from '@/types/teamAnalysis';

interface TeamJefesComparisonPDFProps {
  jefes: JefeParaFiltro[];
  colaboradores: TeamMember9Box[];
}

interface JefeStats {
  dpi: string;
  nombre: string;
  cargo: string;
  totalEquipo: number;
  promedioDesempeno: number;
  promedioPotencial: number;
  evaluacionesCompletadas: number;
  distribucion9Box: Record<string, number>;
}

export const TeamJefesComparisonPDF = ({
  jefes,
  colaboradores,
}: TeamJefesComparisonPDFProps) => {
  // Calcular estadísticas por jefe
  const calcularStatsPorJefe = (): JefeStats[] => {
    return jefes.map((jefe) => {
      // Filtrar colaboradores de este jefe
      const colaboradoresJefe = colaboradores.filter(
        (c) => c.jefeDpi === jefe.dpi
      );

      const totalEquipo = colaboradoresJefe.length;

      // Calcular promedios
      const colaboradoresConDesempeno = colaboradoresJefe.filter(
        (c) => c.desempenoPorcentaje !== undefined
      );
      const colaboradoresConPotencial = colaboradoresJefe.filter(
        (c) => c.potencialPorcentaje !== undefined
      );

      const promedioDesempeno =
        colaboradoresConDesempeno.length > 0
          ? colaboradoresConDesempeno.reduce(
              (sum, c) => sum + (c.desempenoPorcentaje || 0),
              0
            ) / colaboradoresConDesempeno.length
          : 0;

      const promedioPotencial =
        colaboradoresConPotencial.length > 0
          ? colaboradoresConPotencial.reduce(
              (sum, c) => sum + (c.potencialPorcentaje || 0),
              0
            ) / colaboradoresConPotencial.length
          : 0;

      // Calcular distribución 9-box
      const distribucion9Box: Record<string, number> = {};
      colaboradoresJefe.forEach((c) => {
        if (c.posicion9Box) {
          distribucion9Box[c.posicion9Box] =
            (distribucion9Box[c.posicion9Box] || 0) + 1;
        }
      });

      return {
        dpi: jefe.dpi,
        nombre: jefe.nombre,
        cargo: jefe.cargo,
        totalEquipo,
        promedioDesempeno,
        promedioPotencial,
        evaluacionesCompletadas: colaboradoresConDesempeno.length,
        distribucion9Box,
      };
    });
  };

  const jefesStats = calcularStatsPorJefe();

  // Ordenar por promedio de desempeño (descendente)
  const sortedJefes = [...jefesStats].sort(
    (a, b) => b.promedioDesempeno - a.promedioDesempeno
  );

  // Función para obtener resumen de 9-box
  const get9BoxSummary = (distribucion: Record<string, number>): string => {
    const estrellas = distribucion['alto-alto'] || 0;
    const pilares = distribucion['alto-medio'] || 0;
    const nucleo = distribucion['medio-medio'] || 0;
    const atencion =
      (distribucion['bajo-medio'] || 0) + (distribucion['bajo-bajo'] || 0);

    const parts: string[] = [];
    if (estrellas > 0) parts.push(`⭐${estrellas}`);
    if (pilares > 0) parts.push(`💎${pilares}`);
    if (nucleo > 0) parts.push(`⚪${nucleo}`);
    if (atencion > 0) parts.push(`⚠️${atencion}`);

    return parts.join(' ') || '-';
  };

  if (jefes.length === 0) {
    return null;
  }

  return (
    <View style={teamAnalysisStyles.jefesSection}>
      <Text style={teamAnalysisStyles.jefesTitle}>
        DESGLOSE POR JEFE SUBORDINADO ({jefes.length})
      </Text>

      <View style={teamAnalysisStyles.jefesTable}>
        {/* Header de la tabla */}
        <View style={teamAnalysisStyles.jefesTableHeader}>
          <Text
            style={[
              teamAnalysisStyles.jefesTableCell,
              teamAnalysisStyles.jefesTableCellHeader,
              teamAnalysisStyles.jefesTableCellName,
            ]}
          >
            Jefe
          </Text>
          <Text
            style={[
              teamAnalysisStyles.jefesTableCell,
              teamAnalysisStyles.jefesTableCellHeader,
              teamAnalysisStyles.jefesTableCellEquipo,
            ]}
          >
            Equipo
          </Text>
          <Text
            style={[
              teamAnalysisStyles.jefesTableCell,
              teamAnalysisStyles.jefesTableCellHeader,
              teamAnalysisStyles.jefesTableCellDesempeno,
            ]}
          >
            Desempeño
          </Text>
          <Text
            style={[
              teamAnalysisStyles.jefesTableCell,
              teamAnalysisStyles.jefesTableCellHeader,
              teamAnalysisStyles.jefesTableCellPotencial,
            ]}
          >
            Potencial
          </Text>
          <Text
            style={[
              teamAnalysisStyles.jefesTableCell,
              teamAnalysisStyles.jefesTableCellHeader,
              teamAnalysisStyles.jefesTableCellCompletitud,
            ]}
          >
            Completitud
          </Text>
          <Text
            style={[
              teamAnalysisStyles.jefesTableCell,
              teamAnalysisStyles.jefesTableCellHeader,
              teamAnalysisStyles.jefesTableCell9Box,
            ]}
          >
            9-Box
          </Text>
        </View>

        {/* Filas de jefes */}
        {sortedJefes.map((jefe, index) => {
          const completitud =
            jefe.totalEquipo > 0
              ? Math.round((jefe.evaluacionesCompletadas / jefe.totalEquipo) * 100)
              : 0;

          return (
            <View
              key={jefe.dpi}
              style={[
                teamAnalysisStyles.jefesTableRow,
                index % 2 === 1 ? { backgroundColor: '#fafafa' } : {},
              ]}
              wrap={false}
            >
              <View
                style={[
                  teamAnalysisStyles.jefesTableCell,
                  teamAnalysisStyles.jefesTableCellName,
                ]}
              >
                <Text style={{ fontWeight: 'bold', fontSize: 7.5 }}>
                  {jefe.nombre}
                </Text>
                <Text style={{ fontSize: 6, color: '#6b7280', marginTop: 1 }}>
                  {jefe.cargo}
                </Text>
              </View>
              <Text
                style={[
                  teamAnalysisStyles.jefesTableCell,
                  teamAnalysisStyles.jefesTableCellEquipo,
                ]}
              >
                {jefe.totalEquipo}
              </Text>
              <Text
                style={[
                  teamAnalysisStyles.jefesTableCell,
                  teamAnalysisStyles.jefesTableCellDesempeno,
                  { color: jefe.promedioDesempeno >= 75 ? '#16a34a' : '#dc2626' },
                ]}
              >
                {jefe.promedioDesempeno > 0
                  ? `${Math.round(jefe.promedioDesempeno)}%`
                  : '-'}
              </Text>
              <Text
                style={[
                  teamAnalysisStyles.jefesTableCell,
                  teamAnalysisStyles.jefesTableCellPotencial,
                  { color: '#7c3aed' },
                ]}
              >
                {jefe.promedioPotencial > 0
                  ? `${Math.round(jefe.promedioPotencial)}%`
                  : '-'}
              </Text>
              <Text
                style={[
                  teamAnalysisStyles.jefesTableCell,
                  teamAnalysisStyles.jefesTableCellCompletitud,
                  { color: completitud >= 80 ? '#16a34a' : completitud >= 50 ? '#ca8a04' : '#dc2626' },
                ]}
              >
                {completitud}%
              </Text>
              <Text
                style={[
                  teamAnalysisStyles.jefesTableCell,
                  teamAnalysisStyles.jefesTableCell9Box,
                  { fontSize: 6 },
                ]}
              >
                {get9BoxSummary(jefe.distribucion9Box)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Leyenda de símbolos 9-Box */}
      <View style={{ marginTop: 8, flexDirection: 'row', gap: 15 }}>
        <Text style={{ fontSize: 6, color: '#6b7280' }}>
          Leyenda 9-Box: ⭐ Estrellas | 💎 Pilares | ⚪ Núcleo | ⚠️ Requieren Atención
        </Text>
      </View>
    </View>
  );
};
