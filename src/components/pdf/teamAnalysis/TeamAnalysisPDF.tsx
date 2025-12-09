import { Document, Page, Text, View } from '@react-pdf/renderer';
import { teamAnalysisStyles } from './teamAnalysisStyles';
import { TeamAnalysisHeaderPDF } from './TeamAnalysisHeaderPDF';
import { TeamStatsSummaryPDF } from './TeamStatsSummaryPDF';
import { TeamNineBoxGridPDF } from './TeamNineBoxGridPDF';
import { TeamMembersTablePDF, TeamMembersTableFirstPageContent, TeamMembersTableRemainingPages } from './TeamMembersTablePDF';
import { TeamAIAnalysisPDF } from './TeamAIAnalysisPDF';
import { TeamJefesComparisonPDF } from './TeamJefesComparisonPDF';
import type {
  TeamAnalysisStats,
  TeamMember9Box,
  TeamAIAnalysisResponse,
  JefeParaFiltro,
} from '@/types/teamAnalysis';

interface TeamAnalysisPDFProps {
  tipo: 'equipo' | 'unidad';
  jefe: {
    nombre: string;
    cargo: string;
    area: string;
    dpi: string;
  };
  periodo: {
    id: string;
    nombre: string;
  };
  fechaGeneracion: Date;
  stats: TeamAnalysisStats;
  colaboradores: TeamMember9Box[];
  aiAnalysis?: TeamAIAnalysisResponse | null;
  jefesSubordinados?: JefeParaFiltro[];
}

export const TeamAnalysisPDF = ({
  tipo,
  jefe,
  periodo,
  fechaGeneracion,
  stats,
  colaboradores,
  aiAnalysis,
  jefesSubordinados,
}: TeamAnalysisPDFProps) => {
  const fechaFormateada = fechaGeneracion.toLocaleDateString('es-GT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Determinar si hay datos de análisis IA para mostrar
  const hasAIAnalysis = aiAnalysis && (
    aiAnalysis.resumenEjecutivo ||
    (aiAnalysis.fortalezas && aiAnalysis.fortalezas.length > 0) ||
    (aiAnalysis.oportunidadesMejora && aiAnalysis.oportunidadesMejora.length > 0)
  );

  // Determinar si hay jefes subordinados para mostrar (solo en unidad)
  const hasJefesSubordinados = tipo === 'unidad' && jefesSubordinados && jefesSubordinados.length > 0;

  return (
    <Document>
      {/* PÁGINA 1: Header + Estadísticas + Inicio del Listado de Colaboradores */}
      <Page size="A4" style={teamAnalysisStyles.page}>
        <TeamAnalysisHeaderPDF
          jefe={jefe}
          periodo={periodo}
          tipo={tipo}
          fechaGeneracion={fechaGeneracion}
          totalColaboradores={stats.totalPersonas}
        />

        <TeamStatsSummaryPDF stats={stats} />

        {/* Incluir inicio del listado de colaboradores si hay espacio */}
        <TeamMembersTableFirstPageContent
          colaboradores={colaboradores}
          tipo={tipo}
          fechaFormateada={fechaFormateada}
        />

        <Text
          style={teamAnalysisStyles.footer}
          render={({ pageNumber, totalPages }) =>
            `${fechaFormateada} | Página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>

      {/* PÁGINAS 2-N: Resto del Listado de Colaboradores */}
      <TeamMembersTableRemainingPages
        colaboradores={colaboradores}
        tipo={tipo}
        fechaFormateada={fechaFormateada}
        empezarEnPrimeraPagina={true}
      />

      {/* PÁGINAS: Análisis de IA (si existe) - Insights y recomendaciones */}
      {hasAIAnalysis && (
        <Page size="A4" style={teamAnalysisStyles.page}>
          <TeamAIAnalysisPDF analysis={aiAnalysis} />

          <Text
            style={teamAnalysisStyles.footer}
            render={({ pageNumber, totalPages }) =>
              `${fechaFormateada} | Página ${pageNumber} de ${totalPages}`
            }
            fixed
          />
        </Page>
      )}

      {/* PÁGINAS: Desglose por Jefe (solo para unidad/cascada) */}
      {hasJefesSubordinados && (
        <Page size="A4" style={teamAnalysisStyles.page}>
          <TeamJefesComparisonPDF
            jefes={jefesSubordinados!}
            colaboradores={colaboradores}
          />

          <Text
            style={teamAnalysisStyles.footer}
            render={({ pageNumber, totalPages }) =>
              `${fechaFormateada} | Página ${pageNumber} de ${totalPages}`
            }
            fixed
          />
        </Page>
      )}

      {/* PÁGINAS FINALES: Distribución 9-Box (Análisis estratégico con acciones) */}
      <TeamNineBoxGridPDF
        distribucion9Box={stats.distribucion9Box}
        totalPersonas={stats.totalPersonas}
        colaboradores={colaboradores}
        fechaFormateada={fechaFormateada}
      />
    </Document>
  );
};
