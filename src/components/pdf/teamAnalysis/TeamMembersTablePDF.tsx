import { View, Text, Page } from '@react-pdf/renderer';
import { teamAnalysisStyles, NINE_BOX_COLORS, NINE_BOX_LABELS } from './teamAnalysisStyles';
import type { TeamMember9Box } from '@/types/teamAnalysis';

interface TeamMembersTablePDFProps {
  colaboradores: TeamMember9Box[];
  tipo: 'equipo' | 'unidad';
  fechaFormateada: string;
  empezarEnPrimeraPagina?: boolean;
}

// Valores fijos según lo solicitado por el usuario
const MAX_FILAS_PRIMERA = 13; // Primera página: 12 filas
const MAX_FILAS_SEGUNDA = 25; // Segunda página: 24 filas (reducido para acomodar nombres/cargos largos)

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
    <View style={[teamAnalysisStyles.membersSection, { marginBottom: 0, marginTop: 0 }]}>
      {mostrarTitulo && (
        <Text style={[teamAnalysisStyles.membersTitle, { marginBottom: 6 }]}>
          DETALLE DE COLABORADORES ({totalColaboradores})
        </Text>
      )}

      <View style={teamAnalysisStyles.membersTable}>
        {mostrarHeader && (
          <View style={teamAnalysisStyles.membersTableHeader} wrap={false}>
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
          const esUltimaFila = index === colaboradoresEnPagina.length - 1;
          return (
            <View
              key={colaborador.dpi}
              style={[
                teamAnalysisStyles.membersTableRow,
                indiceGlobal % 2 === 1 ? teamAnalysisStyles.membersTableRowAlt : {},
                esUltimaFila ? { borderBottomWidth: 0 } : {},
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
                  { fontSize: 7, lineHeight: 1.2 },
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

  // Primera página: exactamente 12 filas
  const colaboradoresPrimeraPagina = sortedColaboradores.slice(0, MAX_FILAS_PRIMERA);

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

// Componente para las páginas restantes - ENFOQUE SIMPLIFICADO
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
  let colaboradoresRestantes: TeamMember9Box[];
  let indiceInicio = 0;

  if (empezarEnPrimeraPagina) {
    // Primera página tiene 12 filas, el resto va a la segunda
    indiceInicio = Math.min(MAX_FILAS_PRIMERA, sortedColaboradores.length);
    colaboradoresRestantes = sortedColaboradores.slice(indiceInicio);
  } else {
    colaboradoresRestantes = sortedColaboradores;
  }

  if (colaboradoresRestantes.length === 0) {
    return null;
  }

  // Algoritmo inteligente para distribuir filas y evitar páginas con pocas filas
  const paginas: { filas: TeamMember9Box[]; mostrarTitulo: boolean }[] = [];
  
  if (colaboradoresRestantes.length === 0) {
    return null;
  }
  
  // Segunda página: tomar hasta 24 filas (o todas si son menos)
  const filasSegundaPagina = colaboradoresRestantes.slice(0, MAX_FILAS_SEGUNDA);
  
  paginas.push({
    filas: filasSegundaPagina,
    mostrarTitulo: true, // Mostrar título en la segunda página
  });
  
  // Si quedan más filas después de las 24, distribuir inteligentemente
  if (colaboradoresRestantes.length > MAX_FILAS_SEGUNDA) {
    const filasRestantes = colaboradoresRestantes.slice(MAX_FILAS_SEGUNDA);
    
    // Usar un valor conservador para páginas adicionales (26 filas)
    const FILAS_POR_PAGINA_ADICIONAL = 26;
    
    // Distribuir las filas restantes
    for (let i = 0; i < filasRestantes.length; i += FILAS_POR_PAGINA_ADICIONAL) {
      const filasEnPagina = filasRestantes.slice(i, i + FILAS_POR_PAGINA_ADICIONAL);
      paginas.push({
        filas: filasEnPagina,
        mostrarTitulo: false, // No mostrar título en páginas adicionales
      });
    }
    
    // Redistribución inteligente: si la última página tiene muy pocas filas (menos de 5),
    // intentar redistribuirlas en las páginas anteriores
    if (paginas.length > 1) {
      const ultimaPagina = paginas[paginas.length - 1];
      if (ultimaPagina.filas.length < 5 && paginas.length > 2) {
        // Mover las filas de la última página a la penúltima
        const penultimaPagina = paginas[paginas.length - 2];
        penultimaPagina.filas = [...penultimaPagina.filas, ...ultimaPagina.filas];
        paginas.pop(); // Eliminar la última página
      }
    }
  }

  // Generar páginas del PDF
  const paginasPDF: JSX.Element[] = [];

  paginas.forEach((pagina, paginaIndex) => {
    if (pagina.filas.length === 0) {
      return; // Saltar páginas vacías
    }

    paginasPDF.push(
      <Page key={`pagina-restante-${paginaIndex}`} size="LETTER" style={teamAnalysisStyles.page}>
        {renderizarContenidoTabla(
          pagina.filas,
          indiceInicio + paginas.slice(0, paginaIndex).reduce((acc, p) => acc + p.filas.length, 0),
          showJefeColumn,
          pagina.mostrarTitulo,
          true, // siempre mostrar header
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
  });

  return <>{paginasPDF}</>;
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
