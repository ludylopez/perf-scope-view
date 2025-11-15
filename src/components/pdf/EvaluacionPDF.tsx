import { Document, Page, View, Text } from '@react-pdf/renderer';
import { HeaderPDF } from './HeaderPDF';
import { ResultadoSectionPDF } from './ResultadoSectionPDF';
import { RadarChartPDF } from './RadarChartPDF';
import { FortalezasPDF } from './FortalezasPDF';
import { AreasOportunidadPDF } from './AreasOportunidadPDF';
import { PlanDesarrolloPDF } from './PlanDesarrolloPDF';
import { pdfStyles } from './styles';
import { format } from 'date-fns';

interface EvaluacionPDFProps {
  empleado: {
    nombre: string;
    apellidos?: string;
    dpi?: string;
    cargo?: string;
    area?: string;
    nivel?: string;
    direccionUnidad?: string;
    departamentoDependencia?: string;
    profesion?: string;
    correo?: string;
    telefono?: string;
  };
  periodo: string;
  fechaGeneracion: Date;
  resultadoData: {
    performancePercentage: number;
    jefeCompleto: boolean;
    fortalezas: Array<{
      dimension: string;
      nombreCompleto?: string;
      tuEvaluacion: number;
      promedioMunicipal?: number;
    }>;
    areasOportunidad: Array<{
      dimension: string;
      nombreCompleto?: string;
      tuEvaluacion: number;
      promedioMunicipal?: number;
    }>;
    radarData: Array<{
      dimension: string;
      tuEvaluacion: number;
      promedioMunicipal?: number;
    }>;
  };
  planDesarrollo?: {
    planEstructurado?: {
      objetivos?: string[];
      acciones?: Array<{
        descripcion: string;
        responsable: string;
        fecha: string;
        recursos?: string[];
        indicador: string;
        prioridad: 'alta' | 'media' | 'baja';
      }>;
      dimensionesDebiles?: Array<{
        dimension: string;
        score?: number;
        accionesEspecificas?: string[];
      }>;
    };
    recomendaciones?: string[];
  } | null;
  radarImage?: string;
}

export const EvaluacionPDF = ({
  empleado,
  periodo,
  fechaGeneracion,
  resultadoData,
  planDesarrollo,
  radarImage,
}: EvaluacionPDFProps) => {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header con información del empleado */}
        <HeaderPDF
          empleado={empleado}
          periodo={periodo}
          fechaGeneracion={fechaGeneracion}
          jefeCompleto={resultadoData.jefeCompleto}
        />

        {/* Resultado General */}
        <ResultadoSectionPDF performancePercentage={resultadoData.performancePercentage} />

        {/* Gráfico Radar */}
        <RadarChartPDF radarImage={radarImage} jefeCompleto={resultadoData.jefeCompleto} />

        {/* Fortalezas */}
        <FortalezasPDF fortalezas={resultadoData.fortalezas} />

        {/* Áreas de Oportunidad */}
        <AreasOportunidadPDF areasOportunidad={resultadoData.areasOportunidad} />

        {/* Plan de Desarrollo */}
        <PlanDesarrolloPDF planDesarrollo={planDesarrollo} />

        {/* Footer */}
        <Text
          style={pdfStyles.footer}
          render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages} • Generado el ${format(fechaGeneracion, 'dd/MM/yyyy HH:mm')}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};

