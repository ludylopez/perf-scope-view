import { View, Text } from '@react-pdf/renderer';
import { teamAnalysisStyles, NINE_BOX_COLORS, NINE_BOX_LABELS } from './teamAnalysisStyles';
import type { TeamMember9Box } from '@/types/teamAnalysis';

interface TeamMembersTablePDFProps {
  colaboradores: TeamMember9Box[];
  tipo: 'equipo' | 'unidad';
}

export const TeamMembersTablePDF = ({
  colaboradores,
  tipo,
}: TeamMembersTablePDFProps) => {
  // Función para obtener estilo del badge de posición 9-box
  const getPositionBadgeStyle = (position: string) => {
    const colors = NINE_BOX_COLORS[position] || { bg: '#f3f4f6', text: '#374151' };
    return {
      backgroundColor: colors.bg,
      color: colors.text,
    };
  };

  // Función para obtener la etiqueta de posición
  const getPositionLabel = (position: string) => {
    return NINE_BOX_LABELS[position] || position || 'Sin calcular';
  };

  // Ordenar colaboradores por desempeño (descendente)
  const sortedColaboradores = [...colaboradores].sort(
    (a, b) => (b.desempenoPorcentaje || 0) - (a.desempenoPorcentaje || 0)
  );

  // Determinar si mostrar columna de jefe (solo para unidad/cascada)
  const showJefeColumn = tipo === 'unidad';

  return (
    <View style={teamAnalysisStyles.membersSection}>
      <Text style={teamAnalysisStyles.membersTitle}>
        DETALLE DE COLABORADORES ({colaboradores.length})
      </Text>

      <View style={teamAnalysisStyles.membersTable}>
        {/* Header de la tabla */}
        <View style={teamAnalysisStyles.membersTableHeader}>
          <Text
            style={[
              teamAnalysisStyles.membersTableCell,
              teamAnalysisStyles.membersTableCellHeader,
              teamAnalysisStyles.membersTableCellNum,
            ]}
          >
            #
          </Text>
          <Text
            style={[
              teamAnalysisStyles.membersTableCell,
              teamAnalysisStyles.membersTableCellHeader,
              showJefeColumn
                ? teamAnalysisStyles.membersTableCellName
                : teamAnalysisStyles.membersTableCellNameWide,
            ]}
          >
            Nombre
          </Text>
          <Text
            style={[
              teamAnalysisStyles.membersTableCell,
              teamAnalysisStyles.membersTableCellHeader,
              showJefeColumn
                ? teamAnalysisStyles.membersTableCellCargo
                : teamAnalysisStyles.membersTableCellCargoWide,
            ]}
          >
            Cargo
          </Text>
          {showJefeColumn && (
            <Text
              style={[
                teamAnalysisStyles.membersTableCell,
                teamAnalysisStyles.membersTableCellHeader,
                teamAnalysisStyles.membersTableCellJefe,
              ]}
            >
              Jefe Directo
            </Text>
          )}
          <Text
            style={[
              teamAnalysisStyles.membersTableCell,
              teamAnalysisStyles.membersTableCellHeader,
              showJefeColumn
                ? teamAnalysisStyles.membersTableCellDesempeno
                : teamAnalysisStyles.membersTableCellDesempenoWide,
            ]}
          >
            Desempeño
          </Text>
          <Text
            style={[
              teamAnalysisStyles.membersTableCell,
              teamAnalysisStyles.membersTableCellHeader,
              showJefeColumn
                ? teamAnalysisStyles.membersTableCellPotencial
                : teamAnalysisStyles.membersTableCellPotencialWide,
            ]}
          >
            Potencial
          </Text>
          <Text
            style={[
              teamAnalysisStyles.membersTableCell,
              teamAnalysisStyles.membersTableCellHeader,
              showJefeColumn
                ? teamAnalysisStyles.membersTableCell9Box
                : teamAnalysisStyles.membersTableCell9BoxWide,
            ]}
          >
            9-Box
          </Text>
        </View>

        {/* Filas de colaboradores */}
        {sortedColaboradores.map((colaborador, index) => (
          <View
            key={colaborador.dpi}
            style={[
              teamAnalysisStyles.membersTableRow,
              index % 2 === 1 ? teamAnalysisStyles.membersTableRowAlt : {},
            ]}
            wrap={false}
          >
            <Text
              style={[
                teamAnalysisStyles.membersTableCell,
                teamAnalysisStyles.membersTableCellNum,
              ]}
            >
              {index + 1}
            </Text>
            <Text
              style={[
                teamAnalysisStyles.membersTableCell,
                showJefeColumn
                  ? teamAnalysisStyles.membersTableCellName
                  : teamAnalysisStyles.membersTableCellNameWide,
              ]}
            >
              {colaborador.nombre}
            </Text>
            <Text
              style={[
                teamAnalysisStyles.membersTableCell,
                showJefeColumn
                  ? teamAnalysisStyles.membersTableCellCargo
                  : teamAnalysisStyles.membersTableCellCargoWide,
              ]}
            >
              {colaborador.cargo || '-'}
            </Text>
            {showJefeColumn && (
              <Text
                style={[
                  teamAnalysisStyles.membersTableCell,
                  teamAnalysisStyles.membersTableCellJefe,
                ]}
              >
                {colaborador.jefeNombre || '-'}
              </Text>
            )}
            <Text
              style={[
                teamAnalysisStyles.membersTableCell,
                showJefeColumn
                  ? teamAnalysisStyles.membersTableCellDesempeno
                  : teamAnalysisStyles.membersTableCellDesempenoWide,
              ]}
            >
              {colaborador.desempenoPorcentaje !== undefined
                ? `${Math.round(colaborador.desempenoPorcentaje)}%`
                : '-'}
            </Text>
            <Text
              style={[
                teamAnalysisStyles.membersTableCell,
                showJefeColumn
                  ? teamAnalysisStyles.membersTableCellPotencial
                  : teamAnalysisStyles.membersTableCellPotencialWide,
              ]}
            >
              {colaborador.potencialPorcentaje !== undefined
                ? `${Math.round(colaborador.potencialPorcentaje)}%`
                : '-'}
            </Text>
            <View
              style={[
                teamAnalysisStyles.membersTableCell,
                showJefeColumn
                  ? teamAnalysisStyles.membersTableCell9Box
                  : teamAnalysisStyles.membersTableCell9BoxWide,
              ]}
            >
              <Text
                style={[
                  teamAnalysisStyles.positionBadge,
                  getPositionBadgeStyle(colaborador.posicion9Box),
                ]}
              >
                {getPositionLabel(colaborador.posicion9Box)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};
