import { View, Text, Page } from '@react-pdf/renderer';
import { teamAnalysisStyles } from './teamAnalysisStyles';
import type { PlanCapacitacionEstructurado } from '@/types/trainingPlan';

interface TeamTrainingPlanPDFProps {
  plan: PlanCapacitacionEstructurado;
  directorNombre: string;
  totalColaboradores: number;
  fechaFormateada: string;
}

/**
 * Componente para renderizar una temática individual
 * 
 * TAMAÑOS DE FUENTE:
 * - Título temática: 14pt (bold)
 * - Descripción temática: 10pt
 * - Duración total: 8pt
 * - Badge participantes: 8pt (bold)
 * - Tabla header: 7pt (bold)
 * - Tabla actividad (título): 7.5pt (bold)
 * - Tabla actividad (descripción): 6.5pt
 * - Tabla tipo/horas/modalidad: 7pt
 * - Competencias: 6pt
 */
const TematicaCard = ({ 
  tematica
}: { 
  tematica: any;
}) => {
  const actividades = tematica.actividades || [];
  const duracionTotal = actividades.reduce((acc, actividad) => {
    const horasMatch = actividad.duracion?.match(/(\d+)\s*hora/i);
    return acc + (horasMatch ? parseInt(horasMatch[1]) : 0);
  }, 0);

  return (
    <View style={{ 
      marginBottom: 2, 
      padding: 12, 
      backgroundColor: '#f9fafb', 
      borderRadius: 6, 
      borderLeftWidth: 4, 
      borderLeftColor: '#3b82f6',
    }} wrap={false}>
      {/* Badge de participantes arriba del título */}
      {tematica.participantesRecomendados && (
        <View style={{ 
          marginBottom: 8, 
          padding: 6, 
          backgroundColor: '#dbeafe', 
          borderRadius: 4, 
          borderWidth: 1, 
          borderColor: '#93c5fd' 
        }}>
          <Text style={{ fontSize: 8, color: '#1e40af', fontWeight: 'bold' }}>
            {tematica.participantesRecomendados}
          </Text>
        </View>
      )}

      {/* Título y descripción */}
      <View style={{ marginBottom: 5 }}>
        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 }}>
          {tematica.nombre}
        </Text>
        {tematica.descripcion && (
          <Text style={{ fontSize: 10, color: '#4b5563', lineHeight: 1.4 }}>
            {tematica.descripcion}
          </Text>
        )}
        {duracionTotal > 0 && (
          <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 4 }}>
            Duración total: {duracionTotal} horas
          </Text>
        )}
      </View>

      {/* Tabla de Actividades */}
      {actividades.length > 0 && (
        <View style={{ marginTop: 5, borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 8, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', backgroundColor: '#1e40af', padding: 6, borderBottomWidth: 2, borderBottomColor: '#1e3a8a' }}>
            <Text style={{ width: '55%', fontSize: 8, fontWeight: 'bold', color: '#ffffff' }}>ACTIVIDAD</Text>
            <Text style={{ width: '15%', fontSize: 8, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' }}>TIPO</Text>
            <Text style={{ width: '15%', fontSize: 8, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' }}>HORAS</Text>
            <Text style={{ width: '15%', fontSize: 8, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' }}>MODALIDAD</Text>
          </View>
          {actividades.map((actividad: any, aIdx: number) => {
            const horasMatch = actividad.duracion?.match(/(\d+)\s*hora/i);
            const horas = horasMatch ? horasMatch[1] : actividad.duracion || "N/A";

            return (
              <View key={aIdx} style={{ 
                flexDirection: 'row', 
                padding: 6, 
                backgroundColor: aIdx % 2 === 1 ? '#f9fafb' : '#ffffff', 
                borderBottomWidth: 0.5, 
                borderBottomColor: '#e5e7eb' 
              }}>
                <View style={{ width: '55%' }}>
                  <Text style={{ fontSize: 7.5, fontWeight: 'bold', color: '#1f2937' }}>
                    {actividad.topico}
                  </Text>
                  {actividad.descripcion && (
                    <Text style={{ fontSize: 6.5, color: '#6b7280', marginTop: 2 }}>
                      {actividad.descripcion}
                    </Text>
                  )}
                </View>
                <Text style={{ width: '15%', fontSize: 7.5, color: '#4b5563', textAlign: 'center' }}>
                  {actividad.tipo?.replace('_', ' ') || 'Curso'}
                </Text>
                <Text style={{ width: '15%', fontSize: 7.5, color: '#4b5563', textAlign: 'center' }}>
                  {horas} {typeof horas === 'string' && horas.includes('hora') ? '' : 'hrs'}
                </Text>
                <Text style={{ width: '15%', fontSize: 7.5, color: '#4b5563', textAlign: 'center', textTransform: 'capitalize' }}>
                  {actividad.modalidad || 'Presencial'}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

export const TeamTrainingPlanPDF = ({
  plan,
  directorNombre,
  totalColaboradores,
  fechaFormateada,
}: TeamTrainingPlanPDFProps) => {
  const tematicas = plan.tematicas || [];
  const periodo = plan.informacionGeneral?.periodo || 'Enero - Diciembre 2026';

  // Calcular total de horas
  const totalHoras = tematicas.reduce((acc, tematica) => {
    return acc + (tematica.actividades?.reduce((hAcc, actividad) => {
      const horasMatch = actividad.duracion?.match(/(\d+)\s*hora/i);
      return hAcc + (horasMatch ? parseInt(horasMatch[1]) : 0);
    }, 0) || 0);
  }, 0);

  // Estrategia conservadora: Primera página máximo 2 temáticas, siguientes máximo 3, última página hasta 4
  // Esto evita cortes y espacios en blanco excesivos
  const MAX_TEMATICAS_PRIMERA = 2;
  const MAX_TEMATICAS_NORMAL = 3;
  const MAX_TEMATICAS_ULTIMA = 4;

  // Algoritmo de agrupación simple y conservador
  const agruparTematicas = (): typeof tematicas[] => {
    const grupos: typeof tematicas[] = [];
    
    // Primera página: máximo 2 temáticas
    if (tematicas.length > 0) {
      const primeraPagina = tematicas.slice(0, MAX_TEMATICAS_PRIMERA);
      grupos.push(primeraPagina);
    }
    
    // Páginas siguientes: máximo 3 temáticas cada una, excepto la última que puede tener hasta 4
    let indice = MAX_TEMATICAS_PRIMERA;
    while (indice < tematicas.length) {
      // Calcular cuántas temáticas quedan
      const tematicasRestantes = tematicas.length - indice;
      
      // Si quedan 4 o menos, ponerlas todas en la última página
      if (tematicasRestantes <= MAX_TEMATICAS_ULTIMA) {
        const ultimaPagina = tematicas.slice(indice);
        if (ultimaPagina.length > 0) {
          grupos.push(ultimaPagina);
        }
        break;
      }
      
      // Páginas intermedias: máximo 3 temáticas
      const grupo = tematicas.slice(indice, indice + MAX_TEMATICAS_NORMAL);
      if (grupo.length > 0) {
        grupos.push(grupo);
      }
      indice += MAX_TEMATICAS_NORMAL;
    }
    
    return grupos;
  };

  const gruposTematicas = agruparTematicas();

  // Renderizar cada grupo en una página
  const paginas = gruposTematicas.map((grupo, grupoIndex) => {
    const esPrimeraPagina = grupoIndex === 0;

    return (
      <Page key={grupoIndex} size="LETTER" style={teamAnalysisStyles.page}>
        {/* Título de sección - solo en la primera página */}
        {esPrimeraPagina && (
          <>
            <Text style={teamAnalysisStyles.sectionTitle}>
              PLAN DE CAPACITACIÓN ANUAL
            </Text>

            {/* Información del Departamento - solo en la primera página */}
            <View style={[teamAnalysisStyles.infoGrid, { marginBottom: 15 }]}>
              <View style={[teamAnalysisStyles.infoItem, { padding: 10 }]}>
                <Text style={[teamAnalysisStyles.infoLabel, { marginBottom: 4 }]}>DIRECTOR</Text>
                <Text style={teamAnalysisStyles.infoValue}>{directorNombre}</Text>
              </View>
              <View style={[teamAnalysisStyles.infoItem, { padding: 10 }]}>
                <Text style={[teamAnalysisStyles.infoLabel, { marginBottom: 4 }]}>TOTAL COLABORADORES</Text>
                <Text style={teamAnalysisStyles.infoValue}>{totalColaboradores} personas</Text>
              </View>
              <View style={[teamAnalysisStyles.infoItem, { padding: 10 }]}>
                <Text style={[teamAnalysisStyles.infoLabel, { marginBottom: 4 }]}>PERÍODO</Text>
                <Text style={teamAnalysisStyles.infoValue}>{periodo}</Text>
              </View>
              <View style={[teamAnalysisStyles.infoItem, { padding: 10 }]}>
                <Text style={[teamAnalysisStyles.infoLabel, { marginBottom: 4 }]}>HORAS DE CAPACITACIÓN</Text>
                <Text style={teamAnalysisStyles.infoValue}>{totalHoras} horas</Text>
              </View>
            </View>

            {/* Título del Programa - solo en la primera página */}
            <Text style={[teamAnalysisStyles.subsectionTitle, { marginBottom: 5, marginTop: 5 }]}>
              PROGRAMA DE CAPACITACIÓN
            </Text>
          </>
        )}

        {/* Mostrar las temáticas del grupo actual */}
        {grupo.map((tematica, index) => (
          <TematicaCard key={`${grupoIndex}-${index}`} tematica={tematica} />
        ))}

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

  return <>{paginas}</>;
};
