import { View, Text, Page, Fragment } from '@react-pdf/renderer';
import { teamAnalysisStyles, NINE_BOX_COLORS, NINE_BOX_LABELS } from './teamAnalysisStyles';
import type { TeamMember9Box } from '@/types/teamAnalysis';

interface TeamMembersTablePDFProps {
  colaboradores: TeamMember9Box[];
  tipo: 'equipo' | 'unidad';
  fechaFormateada: string;
  empezarEnPrimeraPagina?: boolean; // Si true, incluye contenido en la primera página (después de header y stats)
}

// Constantes para paginación
const ALTURA_PAGINA_A4 = 842;
const ALTURA_FOOTER = 30;
const ALTURA_HEADER = 120; // Altura aproximada del header
const ALTURA_STATS = 100; // Altura aproximada de las estadísticas
const ALTURA_HEADER_TABLA = 25;
const ALTURA_FILA = 20;
const ALTURA_DISPONIBLE_PRIMERA_PAGINA = ALTURA_PAGINA_A4 - ALTURA_HEADER - ALTURA_STATS - ALTURA_FOOTER - 60; // Espacio disponible en primera página
const ALTURA_DISPONIBLE_PAGINAS_NORMALES = ALTURA_PAGINA_A4 - ALTURA_FOOTER - 60; // Espacio disponible en páginas normales
const MAX_FILAS_PRIMERA_PAGINA = Math.floor((ALTURA_DISPONIBLE_PRIMERA_PAGINA - ALTURA_HEADER_TABLA) / ALTURA_FILA);
const MAX_FILAS_POR_PAGINA = Math.floor((ALTURA_DISPONIBLE_PAGINAS_NORMALES - ALTURA_HEADER_TABLA) / ALTURA_FILA);

// Función helper para renderizar el contenido de la tabla (sin Page)
const renderizarContenidoTabla = (
  colaboradoresEnPagina: TeamMember9Box[],
  inicio: number,
  showJefeColumn: boolean,
  mostrarTitulo: boolean,
  mostrarHeader: boolean,
  getPositionBadgeStyle: (position: string) => { backgroundColor: string; color: string },
  getPositionLabel: (position: string) => string,
  totalColaboradores: number
) => {
  return (
    <View style={teamAnalysisStyles.membersSection}>
      {mostrarTitulo && (
        <Text style={teamAnalysisStyles.membersTitle}>
          DETALLE DE COLABORADORES ({totalColaboradores})
        </Text>
      )}

      <View style={teamAnalysisStyles.membersTable}>
        {mostrarHeader && (
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
        )}

        {colaboradoresEnPagina.map((colaborador, index) => {
          const indiceGlobal = inicio + index;
          return (
            <View
              key={colaborador.dpi}
              style={[
                teamAnalysisStyles.membersTableRow,
                indiceGlobal % 2 === 1 ? teamAnalysisStyles.membersTableRowAlt : {},
              ]}
              wrap={false}
            >
              <Text
                style={[
                  teamAnalysisStyles.membersTableCell,
                  teamAnalysisStyles.membersTableCellNum,
                ]}
              >
                {indiceGlobal + 1}
              </Text>
              <Text
                style={[
                  teamAnalysisStyles.membersTableCell,
                  showJefeColumn
                    ? teamAnalysisStyles.membersTableCellName
                    : teamAnalysisStyles.membersTableCellNameWide,
                ]}
              >
                {colaborador.nombreCompleto || colaborador.nombre}
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
          );
        })}
      </View>
    </View>
  );
};

// Componente para el contenido de la primera página (sin Page wrapper)
export const TeamMembersTableFirstPageContent = ({
  colaboradores,
  tipo,
  fechaFormateada,
}: {
  colaboradores: TeamMember9Box[];
  tipo: 'equipo' | 'unidad';
  fechaFormateada: string;
}) => {
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

  // Calcular cuántos colaboradores caben en la primera página
  const maxFilasPrimera = Math.max(0, MAX_FILAS_PRIMERA_PAGINA);
  const colaboradoresPrimeraPagina = sortedColaboradores.slice(0, maxFilasPrimera);

  if (colaboradoresPrimeraPagina.length === 0) {
    return null;
  }

  return renderizarContenidoTabla(
    colaboradoresPrimeraPagina,
    0,
    showJefeColumn,
    true, // mostrar título
    true, // mostrar header
    getPositionBadgeStyle,
    getPositionLabel,
    colaboradores.length
  );
};

// Componente para las páginas restantes
export const TeamMembersTableRemainingPages = ({
  colaboradores,
  tipo,
  fechaFormateada,
  empezarEnPrimeraPagina,
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

  // Calcular desde dónde empezar
  let inicioRestantes = 0;
  if (empezarEnPrimeraPagina) {
    const maxFilasPrimera = Math.max(0, MAX_FILAS_PRIMERA_PAGINA);
    inicioRestantes = maxFilasPrimera;
  }

  // Obtener colaboradores restantes
  const colaboradoresRestantes = sortedColaboradores.slice(inicioRestantes);
  const totalPaginasRestantes = Math.ceil(colaboradoresRestantes.length / MAX_FILAS_POR_PAGINA);

  if (colaboradoresRestantes.length === 0) {
    return null;
  }

  const paginas: JSX.Element[] = [];

  for (let paginaIndex = 0; paginaIndex < totalPaginasRestantes; paginaIndex++) {
    const inicio = paginaIndex * MAX_FILAS_POR_PAGINA;
    const fin = Math.min(inicio + MAX_FILAS_POR_PAGINA, colaboradoresRestantes.length);
    const colaboradoresEnPagina = colaboradoresRestantes.slice(inicio, fin);

    paginas.push(
      <Page key={`pagina-${paginaIndex}`} size="A4" style={teamAnalysisStyles.page}>
        {renderizarContenidoTabla(
          colaboradoresEnPagina,
          inicioRestantes + inicio,
          showJefeColumn,
          paginaIndex === 0, // mostrar título solo en la primera página restante
          paginaIndex === 0, // mostrar header solo en la primera página restante
          getPositionBadgeStyle,
          getPositionLabel,
          colaboradores.length
        )}

        <Text
          style={teamAnalysisStyles.footer}
          render={({ pageNumber, totalPages }) =>
            `${fechaFormateada} | Página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>
    );
  }

  return <>{paginas}</>;
};

// Componente principal (para compatibilidad hacia atrás)
export const TeamMembersTablePDF = ({
  colaboradores,
  tipo,
  fechaFormateada,
  empezarEnPrimeraPagina = false,
}: TeamMembersTablePDFProps) => {
  if (empezarEnPrimeraPagina) {
    // Si debe empezar en primera página, retornar solo las páginas restantes
    return (
      <TeamMembersTableRemainingPages
        colaboradores={colaboradores}
        tipo={tipo}
        fechaFormateada={fechaFormateada}
        empezarEnPrimeraPagina={true}
      />
    );
  }

  // Si no empieza en primera página, generar todas las páginas normalmente
  return (
    <TeamMembersTableRemainingPages
      colaboradores={colaboradores}
      tipo={tipo}
      fechaFormateada={fechaFormateada}
      empezarEnPrimeraPagina={false}
    />
  );
};
