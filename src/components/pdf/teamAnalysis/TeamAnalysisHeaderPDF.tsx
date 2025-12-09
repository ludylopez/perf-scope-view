import { View, Text, Image } from '@react-pdf/renderer';
import { teamAnalysisStyles } from './teamAnalysisStyles';
import logoMunicipalidad from '@/assets/logo-municipalidad.png';

interface TeamAnalysisHeaderPDFProps {
  jefe: {
    nombre: string;
    cargo: string;
    area: string;
  };
  periodo: {
    nombre: string;
  };
  tipo: 'equipo' | 'unidad';
  fechaGeneracion: Date;
  totalColaboradores: number;
}

export const TeamAnalysisHeaderPDF = ({
  jefe,
  periodo,
  tipo,
  fechaGeneracion,
  totalColaboradores,
}: TeamAnalysisHeaderPDFProps) => {
  const titulo = tipo === 'equipo'
    ? 'ANÁLISIS DE MI EQUIPO'
    : 'ANÁLISIS DE MI UNIDAD';

  const tipoLabel = tipo === 'equipo'
    ? 'Equipo Directo'
    : 'Unidad Completa (Cascada)';

  const fechaFormateada = fechaGeneracion.toLocaleDateString('es-GT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View>
      {/* Header principal */}
      <View style={teamAnalysisStyles.header}>
        <View style={teamAnalysisStyles.headerRow}>
          {/* Logo */}
          <Image src={logoMunicipalidad} style={teamAnalysisStyles.headerLogo} />

          {/* Título central */}
          <View style={teamAnalysisStyles.headerContent}>
            <Text style={teamAnalysisStyles.headerTitle}>{titulo}</Text>
            <Text style={teamAnalysisStyles.headerSubtitle}>
              Municipalidad de Esquipulas, Chiquimula
            </Text>
          </View>

          {/* Badge de tipo */}
          <View style={teamAnalysisStyles.headerBadge}>
            <Text style={teamAnalysisStyles.headerBadgeText}>{tipoLabel}</Text>
          </View>
        </View>
      </View>

      {/* Tabla de información */}
      <View style={teamAnalysisStyles.infoTable}>
        {/* Primera fila */}
        <View style={teamAnalysisStyles.infoRow}>
          <View style={[teamAnalysisStyles.infoCell, teamAnalysisStyles.infoCellBorder]}>
            <Text style={teamAnalysisStyles.infoLabel}>JEFE/GERENTE:</Text>
            <Text style={teamAnalysisStyles.infoValue}>{jefe.nombre}</Text>
          </View>
          <View style={teamAnalysisStyles.infoCell}>
            <Text style={teamAnalysisStyles.infoLabel}>CARGO:</Text>
            <Text style={teamAnalysisStyles.infoValue}>{jefe.cargo || 'No especificado'}</Text>
          </View>
        </View>

        {/* Segunda fila */}
        <View style={teamAnalysisStyles.infoRow}>
          <View style={[teamAnalysisStyles.infoCell, teamAnalysisStyles.infoCellBorder]}>
            <Text style={teamAnalysisStyles.infoLabel}>ÁREA/UNIDAD:</Text>
            <Text style={teamAnalysisStyles.infoValue}>{jefe.area || 'No especificada'}</Text>
          </View>
          <View style={teamAnalysisStyles.infoCell}>
            <Text style={teamAnalysisStyles.infoLabel}>PERÍODO:</Text>
            <Text style={teamAnalysisStyles.infoValue}>{periodo.nombre}</Text>
          </View>
        </View>

        {/* Tercera fila */}
        <View style={teamAnalysisStyles.infoRowLast}>
          <View style={[teamAnalysisStyles.infoCell, teamAnalysisStyles.infoCellBorder]}>
            <Text style={teamAnalysisStyles.infoLabel}>TOTAL COLABORADORES:</Text>
            <Text style={teamAnalysisStyles.infoValue}>{totalColaboradores}</Text>
          </View>
          <View style={teamAnalysisStyles.infoCell}>
            <Text style={teamAnalysisStyles.infoLabel}>FECHA GENERACIÓN:</Text>
            <Text style={teamAnalysisStyles.infoValue}>{fechaFormateada}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};
