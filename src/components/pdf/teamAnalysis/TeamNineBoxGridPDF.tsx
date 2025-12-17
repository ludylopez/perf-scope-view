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

// Función helper para renderizar un cuadrante como View
const renderizarCuadrante = (
  cuadrante: CuadranteData,
  colaboradoresPorCuadrante: Record<string, TeamMember9Box[]>,
  esUltimo: boolean,
  mostrarDescripcion: boolean = true
) => {
  return (
    <View
      key={cuadrante.position}
      style={[
        teamAnalysisStyles.quadrantCard,
        {
          backgroundColor: cuadrante.colors.bg,
          borderColor: cuadrante.colors.border,
          borderLeftWidth: 4,
          borderLeftColor: cuadrante.colors.border,
          marginBottom: esUltimo ? 0 : 10,
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
          </Text>
        </View>
      </View>

      {/* Lista de colaboradores */}
      <View style={teamAnalysisStyles.quadrantMembers}>
        {cuadrante.colaboradores.map((colaborador, index) => (
          <View key={colaborador.dpi} style={teamAnalysisStyles.quadrantMemberItem}>
            <Text style={teamAnalysisStyles.quadrantMemberName}>
              {index + 1}. {colaborador.nombreCompleto || colaborador.nombre}
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
        ))}
      </View>

      {/* Descripción y acciones */}
      {mostrarDescripcion && (
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
};

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
      <Page size="LETTER" style={teamAnalysisStyles.page}>
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

  // Separar Estrellas y Pilares para agruparlos juntos
  const cuadranteEstrellas = cuadrantesConDatos.find(c => c.position === 'alto-alto');
  const cuadrantePilares = cuadrantesConDatos.find(c => c.position === 'alto-medio');
  const otrosCuadrantes = cuadrantesConDatos.filter(c => c.position !== 'alto-alto' && c.position !== 'alto-medio');
  
  // Ordenar otros cuadrantes por cantidad de colaboradores (de mayor a menor)
  otrosCuadrantes.sort((a, b) => b.count - a.count);
  
  // Crear lista ordenada: primero Estrellas y Pilares juntos, luego los demás
  const cuadrantesOrdenados: CuadranteData[] = [];
  if (cuadranteEstrellas) cuadrantesOrdenados.push(cuadranteEstrellas);
  if (cuadrantePilares) cuadrantesOrdenados.push(cuadrantePilares);
  cuadrantesOrdenados.push(...otrosCuadrantes);

  // Algoritmo de bin packing para agrupar cuadrantes en páginas
  const agruparCuadrantesEnPaginas = (cuadrantes: CuadranteData[], alturaDisponible: number): CuadranteData[][] => {
    const paginas: CuadranteData[][] = [];
    let paginaActual: CuadranteData[] = [];
    let alturaActual = 0;
    const alturaTitulo = 25; // Altura del título "DISTRIBUCIÓN 9-BOX"

    for (let index = 0; index < cuadrantes.length; index++) {
      const cuadrante = cuadrantes[index];
      const alturaNecesaria = cuadrante.alturaEstimada + (paginaActual.length === 0 ? alturaTitulo : 0);
      
      // Si es Estrellas o Pilares, ser más agresivo para agruparlos juntos
      const esEstrellasOPilares = cuadrante.position === 'alto-alto' || cuadrante.position === 'alto-medio';
      const espacioDisponible = esEstrellasOPilares && paginaActual.length > 0 && 
        (paginaActual[0]?.position === 'alto-alto' || paginaActual[0]?.position === 'alto-medio')
        ? alturaDisponible * 1.02 // Permitir un poco más de espacio si ya hay Estrellas o Pilares en la página
        : alturaDisponible;
      
      // Si el cuadrante cabe en la página actual
      if (alturaActual + alturaNecesaria <= espacioDisponible) {
        paginaActual.push(cuadrante);
        alturaActual += alturaNecesaria;
      } else {
        // Caso especial: Si es Pilares y la última página guardada tiene Estrellas, intentar agregarlo ahí
        if (cuadrante.position === 'alto-medio' && paginas.length > 0) {
          const ultimaPagina = paginas[paginas.length - 1];
          const tieneEstrellas = ultimaPagina.some(c => c.position === 'alto-alto');
          if (tieneEstrellas) {
            // Calcular altura total de la última página
            const alturaUltimaPagina = ultimaPagina.reduce((sum, c) => {
              return sum + c.alturaEstimada;
            }, alturaTitulo);
            
            // Si Pilares cabe en la última página, agregarlo ahí
            if (alturaUltimaPagina + cuadrante.alturaEstimada <= alturaDisponible) {
              ultimaPagina.push(cuadrante);
              // No agregar a paginaActual, ya se agregó a la última página guardada
              continue;
            }
          }
        }
        
        // Si la página actual tiene contenido, guardarla y empezar nueva
        if (paginaActual.length > 0) {
          paginas.push([...paginaActual]); // Crear copia del array para evitar referencias
          paginaActual = []; // Resetear paginaActual después de guardarla
          alturaActual = 0; // Resetear alturaActual también
        }
        // Si el cuadrante es muy grande para una página, dividirlo
        if (cuadrante.alturaEstimada > alturaDisponible) {
          // Dividir colaboradores del cuadrante
          // Para Estrellas, usar 25 colaboradores por página; para otros, calcular dinámicamente
          let MAX_COLABORADORES_POR_PAGINA: number;
          if (cuadrante.position === 'alto-alto') {
            // Estrellas: 25 colaboradores por página
            MAX_COLABORADORES_POR_PAGINA = 30;
          } else {
            // Otros cuadrantes: calcular dinámicamente
            const espacioParaOtros = 0;
            MAX_COLABORADORES_POR_PAGINA = Math.floor((alturaDisponible - ALTURA_HEADER_CUADRANTE - ALTURA_DESCRIPCION - alturaTitulo - espacioParaOtros) / ALTURA_POR_COLABORADOR);
          }
          const chunks = [];
          for (let i = 0; i < cuadrante.colaboradores.length; i += MAX_COLABORADORES_POR_PAGINA) {
            chunks.push(cuadrante.colaboradores.slice(i, i + MAX_COLABORADORES_POR_PAGINA));
          }
          
          // Procesar cada chunk intentando agruparlo con otros cuadrantes
          chunks.forEach((chunk, chunkIndex) => {
            const esUltimoChunk = chunkIndex === chunks.length - 1;
            const nuevoCuadrante: CuadranteData = {
              ...cuadrante,
              colaboradores: chunk,
              count: chunk.length,
              alturaEstimada: ALTURA_HEADER_CUADRANTE + (chunk.length * ALTURA_POR_COLABORADOR) + (esUltimoChunk ? ALTURA_DESCRIPCION : 0) + 20,
            };
            
            // Si es el primer chunk o la página actual está vacía, crear nueva página
            if (paginaActual.length === 0) {
              paginaActual = [nuevoCuadrante];
              alturaActual = nuevoCuadrante.alturaEstimada + alturaTitulo;
            } else {
              // Intentar agregar a la página actual
              const alturaNecesariaChunk = nuevoCuadrante.alturaEstimada;
              if (alturaActual + alturaNecesariaChunk <= alturaDisponible) {
                paginaActual.push(nuevoCuadrante);
                alturaActual += alturaNecesariaChunk;
              } else {
                // No cabe, guardar página actual y crear nueva
                paginas.push([...paginaActual]); // Crear copia del array
                paginaActual = [nuevoCuadrante];
                alturaActual = nuevoCuadrante.alturaEstimada + alturaTitulo;
              }
            }
          });
        } else {
          // Empezar nueva página con este cuadrante
          paginaActual = [cuadrante];
          alturaActual = alturaNecesaria;
        }
      }
    }

    // Agregar la última página si tiene contenido
    if (paginaActual.length > 0) {
      paginas.push(paginaActual);
    }

    return paginas;
  };

  // Agrupar cuadrantes en páginas (todas las páginas tienen el mismo espacio disponible)
  const paginasDeCuadrantes = agruparCuadrantesEnPaginas(cuadrantesOrdenados, ALTURA_DISPONIBLE_PAGINAS_NORMALES);

  // Generar páginas del PDF
  const paginasPDF: JSX.Element[] = [];

  paginasDeCuadrantes.forEach((cuadrantesEnPagina, paginaIndex) => {
    paginasPDF.push(
      <Page key={`pagina-${paginaIndex}`} size="LETTER" style={teamAnalysisStyles.page}>
        <View style={teamAnalysisStyles.nineBoxSection}>
          {/* Título solo en la primera página */}
          {paginaIndex === 0 && (
            <Text style={teamAnalysisStyles.nineBoxTitle}>DISTRIBUCIÓN 9-BOX</Text>
          )}

          {/* Renderizar cada cuadrante en esta página */}
          {cuadrantesEnPagina.map((cuadrante, cuadranteIndex) => {
            const esUltimoCuadranteEnPagina = cuadranteIndex === cuadrantesEnPagina.length - 1;
            const esUltimoCuadranteDelTipo = cuadrante.colaboradores.length === colaboradoresPorCuadrante[cuadrante.position]?.length;
            
            // Reducir espacio si Estrellas y Pilares están juntos
            const esEstrellasOPilares = cuadrante.position === 'alto-alto' || cuadrante.position === 'alto-medio';
            const siguienteEsEstrellasOPilares = cuadranteIndex < cuadrantesEnPagina.length - 1 && 
              (cuadrantesEnPagina[cuadranteIndex + 1]?.position === 'alto-alto' || 
               cuadrantesEnPagina[cuadranteIndex + 1]?.position === 'alto-medio');
            const marginBottom = esUltimoCuadranteEnPagina 
              ? 0 
              : (esEstrellasOPilares && siguienteEsEstrellasOPilares) 
                ? 5 // Menos espacio entre Estrellas y Pilares
                : 10;

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
                    marginBottom: marginBottom,
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
