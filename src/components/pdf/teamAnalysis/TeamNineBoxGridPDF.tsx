import { View, Text, Page } from '@react-pdf/renderer';
import { teamAnalysisStyles, NINE_BOX_COLORS, NINE_BOX_LABELS } from './teamAnalysisStyles';
import { TeamAnalysisHeaderPDF } from './TeamAnalysisHeaderPDF';
import { TeamStatsSummaryPDF } from './TeamStatsSummaryPDF';
import type { TeamMember9Box, TeamAnalysisStats } from '@/types/teamAnalysis';

interface TeamNineBoxGridPDFProps {
  distribucion9Box: Record<string, number>;
  totalPersonas: number;
  colaboradores: TeamMember9Box[];
  fechaFormateada: string;
  jefe?: {
    nombre: string;
    cargo: string;
    area: string;
    dpi: string;
  };
  periodo?: {
    id: string;
    nombre: string;
  };
  tipo?: 'equipo' | 'unidad';
  fechaGeneracion?: Date;
  stats?: TeamAnalysisStats;
}

// Descripciones y acciones para cada cuadrante
const QUADRANT_DESCRIPTIONS: Record<string, { 
  significado: string; 
  acciones: string[];
}> = {
  'alto-alto': {
    significado: 'Colaboradores con alto desempeño y alto potencial. Son las estrellas del equipo.',
    acciones: [
      'Desarrollar planes de sucesión y liderazgo',
      'Asignar proyectos estratégicos y desafiantes',
      'Proporcionar oportunidades de crecimiento acelerado',
      'Considerar promociones y aumentos salariales'
    ]
  },
  'medio-alto': {
    significado: 'Colaboradores con desempeño medio pero alto potencial. Tienen gran capacidad de crecimiento.',
    acciones: [
      'Identificar y eliminar barreras de desempeño',
      'Proporcionar coaching y desarrollo específico',
      'Asignar mentores o proyectos especiales',
      'Establecer objetivos claros y medibles'
    ]
  },
  'bajo-alto': {
    significado: 'Colaboradores con bajo desempeño pero alto potencial. Son enigmas que requieren atención.',
    acciones: [
      'Investigar causas del bajo desempeño',
      'Proporcionar apoyo y recursos necesarios',
      'Revisar si el rol es el adecuado',
      'Desarrollar plan de acción inmediato'
    ]
  },
  'alto-medio': {
    significado: 'Colaboradores con alto desempeño y potencial medio. Son pilares confiables del equipo.',
    acciones: [
      'Mantener en roles actuales donde son efectivos',
      'Proporcionar reconocimiento y estabilidad',
      'Desarrollar habilidades complementarias',
      'Considerar roles de especialista o experto'
    ]
  },
  'medio-medio': {
    significado: 'Colaboradores con desempeño y potencial medio. Forman el núcleo del equipo.',
    acciones: [
      'Proporcionar desarrollo gradual y consistente',
      'Establecer objetivos alcanzables',
      'Ofrecer capacitación en áreas clave',
      'Mantener motivación y compromiso'
    ]
  },
  'bajo-medio': {
    significado: 'Colaboradores con bajo desempeño y potencial medio. Requieren atención inmediata.',
    acciones: [
      'Identificar problemas de desempeño específicos',
      'Proporcionar feedback frecuente y constructivo',
      'Desarrollar plan de mejora con plazos definidos',
      'Considerar reasignación de tareas o roles'
    ]
  },
  'alto-bajo': {
    significado: 'Colaboradores con alto desempeño pero bajo potencial. Son expertos en su área.',
    acciones: [
      'Valorar su experiencia y conocimiento',
      'Mantener en roles especializados',
      'Proporcionar reconocimiento por su expertise',
      'Considerar roles de consultoría o mentoría'
    ]
  },
  'medio-bajo': {
    significado: 'Colaboradores con desempeño medio y bajo potencial. Son confiables pero con crecimiento limitado.',
    acciones: [
      'Mantener en roles donde son efectivos',
      'Proporcionar estabilidad y claridad',
      'Desarrollar habilidades específicas del rol',
      'Reconocer su contribución consistente'
    ]
  },
  'bajo-bajo': {
    significado: 'Colaboradores con bajo desempeño y bajo potencial. Requieren intervención urgente.',
    acciones: [
      'Evaluar si el rol es el adecuado',
      'Desarrollar plan de mejora con seguimiento cercano',
      'Considerar reasignación o cambio de función',
      'Establecer expectativas claras y consecuencias'
    ]
  }
};

// Orden de la matriz 9-box (de arriba a abajo, de izquierda a derecha)
const NINE_BOX_POSITIONS = [
  ['bajo-alto', 'medio-alto', 'alto-alto'],     // Fila superior (alto potencial)
  ['bajo-medio', 'medio-medio', 'alto-medio'],  // Fila media
  ['bajo-bajo', 'medio-bajo', 'alto-bajo'],     // Fila inferior (bajo potencial)
];

// Constantes para cálculo de espacio
const ALTURA_HEADER = 120; // Altura aproximada del header
const ALTURA_STATS = 100; // Altura aproximada de las estadísticas
const ALTURA_FOOTER = 30; // Altura del footer
const ALTURA_PAGINA_A4 = 842; // Altura de página A4 en puntos (menos padding)
const ALTURA_DISPONIBLE_PRIMERA_PAGINA = ALTURA_PAGINA_A4 - ALTURA_HEADER - ALTURA_STATS - ALTURA_FOOTER - 60; // Espacio disponible en primera página
const ALTURA_DISPONIBLE_PAGINAS_NORMALES = ALTURA_PAGINA_A4 - ALTURA_FOOTER - 60; // Espacio disponible en páginas normales
const ALTURA_POR_COLABORADOR = 18; // Altura aproximada por colaborador
const ALTURA_HEADER_CUADRANTE = 35; // Altura del header del cuadrante
const ALTURA_DESCRIPCION = 120; // Altura aproximada de descripción y acciones

interface CuadranteData {
  position: string;
  colaboradores: TeamMember9Box[];
  count: number;
  colors: { bg: string; text: string; border: string };
  label: string;
  description: { significado: string; acciones: string[] };
  alturaEstimada: number;
}

export const TeamNineBoxGridPDF = ({
  distribucion9Box,
  totalPersonas,
  colaboradores,
  fechaFormateada,
  jefe,
  periodo,
  tipo,
  fechaGeneracion,
  stats,
}: TeamNineBoxGridPDFProps) => {
  // Agrupar colaboradores por posición 9-box
  const colaboradoresPorCuadrante: Record<string, TeamMember9Box[]> = {};
  
  colaboradores.forEach((colaborador) => {
    if (colaborador.posicion9Box) {
      if (!colaboradoresPorCuadrante[colaborador.posicion9Box]) {
        colaboradoresPorCuadrante[colaborador.posicion9Box] = [];
      }
      colaboradoresPorCuadrante[colaborador.posicion9Box].push(colaborador);
    }
  });

  // Filtrar solo cuadrantes con colaboradores y crear datos estructurados
  const cuadrantesConDatos: CuadranteData[] = NINE_BOX_POSITIONS.flat()
    .filter((position) => (colaboradoresPorCuadrante[position]?.length || 0) > 0)
    .map((position) => {
      const colaboradoresEnCuadrante = colaboradoresPorCuadrante[position] || [];
      const count = colaboradoresEnCuadrante.length;
      const colors = NINE_BOX_COLORS[position] || { bg: '#ffffff', text: '#000000', border: '#e5e7eb' };
      const label = NINE_BOX_LABELS[position] || position;
      const description = QUADRANT_DESCRIPTIONS[position] || { significado: '', acciones: [] };
      
      // Calcular altura estimada: header + colaboradores + descripción
      const alturaColaboradores = count * ALTURA_POR_COLABORADOR;
      const alturaEstimada = ALTURA_HEADER_CUADRANTE + alturaColaboradores + ALTURA_DESCRIPCION + 20; // +20 para márgenes
      
      return {
        position,
        colaboradores: colaboradoresEnCuadrante,
        count,
        colors,
        label,
        description,
        alturaEstimada,
      };
    });

  if (cuadrantesConDatos.length === 0) {
    return (
      <Page size="A4" style={teamAnalysisStyles.page}>
        {jefe && periodo && tipo && fechaGeneracion && stats && (
          <>
            <TeamAnalysisHeaderPDF
              jefe={jefe}
              periodo={periodo}
              tipo={tipo}
              fechaGeneracion={fechaGeneracion}
              totalColaboradores={stats.totalPersonas}
            />
            <TeamStatsSummaryPDF stats={stats} />
          </>
        )}
        <View style={teamAnalysisStyles.nineBoxSection}>
          <Text style={teamAnalysisStyles.nineBoxTitle}>DISTRIBUCIÓN 9-BOX</Text>
          <View style={{ padding: 20, textAlign: 'center' }}>
            <Text style={{ fontSize: 10, color: '#6b7280' }}>
              No hay colaboradores con datos de 9-Box disponibles.
            </Text>
          </View>
        </View>
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

  // Ordenar cuadrantes por cantidad de colaboradores (de mayor a menor) para optimizar empaquetado
  cuadrantesConDatos.sort((a, b) => b.count - a.count);

  // Algoritmo de bin packing para agrupar cuadrantes en páginas
  const agruparCuadrantesEnPaginas = (cuadrantes: CuadranteData[], alturaDisponible: number): CuadranteData[][] => {
    const paginas: CuadranteData[][] = [];
    let paginaActual: CuadranteData[] = [];
    let alturaActual = 0;
    const alturaTitulo = 25; // Altura del título "DISTRIBUCIÓN 9-BOX"

    cuadrantes.forEach((cuadrante) => {
      const alturaNecesaria = cuadrante.alturaEstimada + (paginaActual.length === 0 ? alturaTitulo : 0);
      
      // Si el cuadrante cabe en la página actual
      if (alturaActual + alturaNecesaria <= alturaDisponible) {
        paginaActual.push(cuadrante);
        alturaActual += alturaNecesaria;
      } else {
        // Si la página actual tiene contenido, guardarla y empezar nueva
        if (paginaActual.length > 0) {
          paginas.push(paginaActual);
        }
        // Si el cuadrante es muy grande para una página, dividirlo
        if (cuadrante.alturaEstimada > alturaDisponible) {
          // Dividir colaboradores del cuadrante
          const MAX_COLABORADORES_POR_PAGINA = Math.floor((alturaDisponible - ALTURA_HEADER_CUADRANTE - ALTURA_DESCRIPCION - alturaTitulo) / ALTURA_POR_COLABORADOR);
          const chunks = [];
          for (let i = 0; i < cuadrante.colaboradores.length; i += MAX_COLABORADORES_POR_PAGINA) {
            chunks.push(cuadrante.colaboradores.slice(i, i + MAX_COLABORADORES_POR_PAGINA));
          }
          
          // Crear un cuadrante por cada chunk
          chunks.forEach((chunk, index) => {
            const nuevoCuadrante: CuadranteData = {
              ...cuadrante,
              colaboradores: chunk,
              count: chunk.length,
              alturaEstimada: ALTURA_HEADER_CUADRANTE + (chunk.length * ALTURA_POR_COLABORADOR) + (index === chunks.length - 1 ? ALTURA_DESCRIPCION : 0) + 20,
            };
            paginas.push([nuevoCuadrante]);
          });
        } else {
          // Empezar nueva página con este cuadrante
          paginaActual = [cuadrante];
          alturaActual = alturaNecesaria;
        }
      }
    });

    // Agregar la última página si tiene contenido
    if (paginaActual.length > 0) {
      paginas.push(paginaActual);
    }

    return paginas;
  };

  // Agrupar cuadrantes en páginas
  const paginasDeCuadrantes: CuadranteData[][] = [];
  
  // Primera página: incluir header y stats
  if (jefe && periodo && tipo && fechaGeneracion && stats) {
    const cuadrantesPrimeraPagina = agruparCuadrantesEnPaginas(cuadrantesConDatos, ALTURA_DISPONIBLE_PRIMERA_PAGINA);
    if (cuadrantesPrimeraPagina.length > 0) {
      paginasDeCuadrantes.push(cuadrantesPrimeraPagina[0]);
      // Resto de páginas
      for (let i = 1; i < cuadrantesPrimeraPagina.length; i++) {
        paginasDeCuadrantes.push(cuadrantesPrimeraPagina[i]);
      }
    }
  } else {
    // Si no hay header/stats, agrupar normalmente
    const todasLasPaginas = agruparCuadrantesEnPaginas(cuadrantesConDatos, ALTURA_DISPONIBLE_PAGINAS_NORMALES);
    todasLasPaginas.forEach(pagina => paginasDeCuadrantes.push(pagina));
  }

  // Generar páginas del PDF
  const paginasPDF: JSX.Element[] = [];

  paginasDeCuadrantes.forEach((cuadrantesEnPagina, paginaIndex) => {
    const esPrimeraPagina = paginaIndex === 0 && jefe && periodo && tipo && fechaGeneracion && stats;

    paginasPDF.push(
      <Page key={`pagina-${paginaIndex}`} size="A4" style={teamAnalysisStyles.page}>
        {/* En la primera página del documento, incluir header y estadísticas */}
        {esPrimeraPagina && (
          <>
            <TeamAnalysisHeaderPDF
              jefe={jefe!}
              periodo={periodo!}
              tipo={tipo!}
              fechaGeneracion={fechaGeneracion!}
              totalColaboradores={stats!.totalPersonas}
            />
            <TeamStatsSummaryPDF stats={stats!} />
          </>
        )}

        <View style={teamAnalysisStyles.nineBoxSection}>
          {/* Título solo en la primera página o primera página de cada grupo */}
          {(esPrimeraPagina || paginaIndex === 0) && (
            <Text style={teamAnalysisStyles.nineBoxTitle}>DISTRIBUCIÓN 9-BOX</Text>
          )}

          {/* Renderizar cada cuadrante en esta página */}
          {cuadrantesEnPagina.map((cuadrante, cuadranteIndex) => {
            const esUltimoCuadranteEnPagina = cuadranteIndex === cuadrantesEnPagina.length - 1;
            const esUltimoCuadranteDelTipo = cuadrante.colaboradores.length === colaboradoresPorCuadrante[cuadrante.position]?.length;

            return (
              <View
                key={`${cuadrante.position}-${paginaIndex}-${cuadranteIndex}`}
                style={[
                  teamAnalysisStyles.quadrantCard,
                  {
                    backgroundColor: cuadrante.colors.bg,
                    borderColor: cuadrante.colors.border,
                    borderLeftWidth: 4,
                    borderLeftColor: cuadrante.colors.border,
                    marginBottom: cuadranteIndex < cuadrantesEnPagina.length - 1 ? 10 : 0,
                  },
                ]}
              >
                {/* Header del cuadrante */}
                <View style={teamAnalysisStyles.quadrantHeader}>
                  <View style={teamAnalysisStyles.quadrantHeaderLeft}>
                    <Text style={[teamAnalysisStyles.quadrantTitle, { color: cuadrante.colors.text }]}>
                      {cuadrante.label}
                    </Text>
                    <Text style={[teamAnalysisStyles.quadrantCount, { color: cuadrante.colors.text }]}>
                      {cuadrante.count} {cuadrante.count === 1 ? 'colaborador' : 'colaboradores'}
                      {!esUltimoCuadranteDelTipo && ` (continuación)`}
                    </Text>
                  </View>
                </View>

                {/* Lista de colaboradores */}
                <View style={teamAnalysisStyles.quadrantMembers}>
                  {cuadrante.colaboradores.map((colaborador, index) => {
                    // Calcular índice global si es parte de un cuadrante dividido
                    const indiceGlobal = colaboradoresPorCuadrante[cuadrante.position]?.indexOf(colaborador) ?? index;
                    return (
                      <View key={colaborador.dpi} style={teamAnalysisStyles.quadrantMemberItem}>
                        <Text style={teamAnalysisStyles.quadrantMemberName}>
                          {indiceGlobal + 1}. {colaborador.nombreCompleto || colaborador.nombre}
                        </Text>
                        {colaborador.cargo && (
                          <Text style={teamAnalysisStyles.quadrantMemberCargo}>
                            {colaborador.cargo}
                          </Text>
                        )}
                        <View style={teamAnalysisStyles.quadrantMemberStats}>
                          <Text style={teamAnalysisStyles.quadrantMemberStat}>
                            D: {Math.round(colaborador.desempenoPorcentaje || 0)}%
                          </Text>
                          {colaborador.potencialPorcentaje !== undefined && (
                            <Text style={teamAnalysisStyles.quadrantMemberStat}>
                              P: {Math.round(colaborador.potencialPorcentaje)}%
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Descripción y acciones solo en el último cuadrante del tipo en la última página donde aparece */}
                {esUltimoCuadranteEnPagina && esUltimoCuadranteDelTipo && (
                  <View style={teamAnalysisStyles.quadrantDescription}>
                    <Text style={[teamAnalysisStyles.quadrantDescriptionTitle, { color: cuadrante.colors.text }]}>
                      ¿Qué significa este cuadrante?
                    </Text>
                    <Text style={teamAnalysisStyles.quadrantDescriptionText}>
                      {cuadrante.description.significado}
                    </Text>

                    <Text style={[teamAnalysisStyles.quadrantActionsTitle, { color: cuadrante.colors.text }]}>
                      Acciones recomendadas:
                    </Text>
                    {cuadrante.description.acciones.map((accion, index) => (
                      <View key={index} style={teamAnalysisStyles.quadrantActionItem}>
                        <Text style={[teamAnalysisStyles.quadrantActionBullet, { color: cuadrante.colors.text }]}>
                          •
                        </Text>
                        <Text style={teamAnalysisStyles.quadrantActionText}>{accion}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Footer */}
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
