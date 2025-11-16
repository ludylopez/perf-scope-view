import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';

interface CompetenciaData {
  dimension: string;
  tuEvaluacion: number;
  promedioMunicipal?: number;
}

interface CompetenciasCardsPDFProps {
  competencias: CompetenciaData[];
  fortalezas: Array<{ dimension: string; tuEvaluacion: number }>;
  areasOportunidad: Array<{ dimension: string; tuEvaluacion: number }>;
}

const getDimensionFriendlyTitle = (dimension: string): string => {
  const nombre = dimension.toLowerCase();
  
  if (nombre.includes("relaciones interpersonales") || nombre.includes("trabajo en equipo")) {
    return "Relaciones Interpersonales y Trabajo en Equipo";
  }
  if (nombre.includes("orientación al servicio") || nombre.includes("atención al usuario")) {
    return "Orientación al Servicio y Atención al Usuario";
  }
  if (nombre.includes("competencias laborales") && (nombre.includes("técnica") || nombre.includes("específica"))) {
    return "Competencias Laborales (Técnicas y Específicas)";
  }
  if (nombre.includes("calidad del trabajo") || nombre.includes("calidad")) {
    return "Calidad del Trabajo";
  }
  if (nombre.includes("comportamiento organizacional") || nombre.includes("actitud laboral")) {
    return "Comportamiento Organizacional y Actitud Laboral";
  }
  if (nombre.includes("productividad") || nombre.includes("cumplimiento")) {
    return "Productividad y Cumplimiento de Objetivos";
  }
  
  return dimension;
};

const getDimensionDescription = (dimension: string): string => {
  const nombre = dimension.toLowerCase();
  
  if (nombre.includes("relaciones interpersonales") || nombre.includes("trabajo en equipo")) {
    return "Esta dimensión evalúa la capacidad de comunicarse efectivamente, colaborar con otros y mantener relaciones profesionales constructivas.";
  }
  if (nombre.includes("orientación al servicio") || nombre.includes("atención al usuario")) {
    return "Esta dimensión evalúa la actitud de servicio, calidad de atención y efectividad en la respuesta a usuarios internos y/o externos.";
  }
  if (nombre.includes("competencias laborales") && (nombre.includes("técnica") || nombre.includes("específica"))) {
    return "Esta dimensión evalúa el dominio de conocimientos, habilidades y técnicas específicas requeridas para el desempeño efectivo del puesto.";
  }
  if (nombre.includes("calidad del trabajo") || nombre.includes("calidad")) {
    return "Esta dimensión evalúa la precisión, presentación profesional, cumplimiento de estándares normativos y orientación a la mejora.";
  }
  if (nombre.includes("comportamiento organizacional") || nombre.includes("actitud laboral")) {
    return "Esta dimensión evalúa la conducta laboral, responsabilidad, valores éticos y adherencia a las normas institucionales.";
  }
  if (nombre.includes("productividad") || nombre.includes("cumplimiento")) {
    return "Esta dimensión evalúa la capacidad del colaborador para alcanzar los objetivos asignados, cumplir plazos y optimizar recursos.";
  }
  
  return "Evaluación de desempeño en esta dimensión.";
};

const isFortaleza = (dimension: string, fortalezas: Array<{ dimension: string }>): boolean => {
  return fortalezas.some(f => 
    f.dimension.toLowerCase().includes(dimension.toLowerCase()) ||
    dimension.toLowerCase().includes(f.dimension.toLowerCase())
  );
};

const isOportunidad = (dimension: string, areasOportunidad: Array<{ dimension: string }>): boolean => {
  return areasOportunidad.some(a => 
    a.dimension.toLowerCase().includes(dimension.toLowerCase()) ||
    dimension.toLowerCase().includes(a.dimension.toLowerCase())
  );
};

export const CompetenciasCardsPDF = ({ 
  competencias, 
  fortalezas, 
  areasOportunidad 
}: CompetenciasCardsPDFProps) => {
  if (!competencias || competencias.length === 0) {
    return null;
  }

  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={pdfStyles.sectionTitle}>📊 PANORAMA DE COMPETENCIAS</Text>
      <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
        {competencias.map((competencia, index) => {
          const esFortaleza = isFortaleza(competencia.dimension, fortalezas);
          const esOportunidad = isOportunidad(competencia.dimension, areasOportunidad);
          const esNeutro = !esFortaleza && !esOportunidad;
          
          const cardBgColor = esFortaleza ? '#f0fdf4' : esOportunidad ? '#fff7ed' : '#f8fafc';
          const cardBorderColor = esFortaleza ? '#22c55e' : esOportunidad ? '#f97316' : '#e5e7eb';
          const circleBgColor = esFortaleza ? '#22c55e' : esOportunidad ? '#f97316' : '#6b7280';
          const badgeBgColor = esFortaleza ? '#dcfce7' : esOportunidad ? '#ffedd5' : '#f3f4f6';
          const badgeTextColor = esFortaleza ? '#166534' : esOportunidad ? '#9a3412' : '#6b7280';
          const badgeText = esFortaleza ? 'FORTALEZA' : esOportunidad ? 'OPORTUNIDAD' : '';
          const barColor = esFortaleza ? '#22c55e' : esOportunidad ? '#f97316' : '#6b7280';
          
          const titulo = getDimensionFriendlyTitle(competencia.dimension);
          const descripcion = getDimensionDescription(competencia.dimension);
          const porcentaje = competencia.tuEvaluacion;
          const barWidth = Math.min((porcentaje / 100) * 100, 100);

          return (
            <View 
              key={index} 
              style={{
                width: '48%',
                backgroundColor: cardBgColor,
                border: `1.5px solid ${cardBorderColor}`,
                borderRadius: 8,
                padding: 10,
                marginBottom: 8,
                borderLeft: `4px solid ${cardBorderColor}`,
              }}
            >
              {/* Header con número y badge */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  {/* Círculo con número */}
                  <View style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: circleBgColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#ffffff' }}>
                      {index + 1}
                    </Text>
                  </View>
                  
                  {/* Badge */}
                  {badgeText && (
                    <View style={{
                      backgroundColor: badgeBgColor,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 3,
                      flexShrink: 0,
                    }}>
                      <Text style={{ fontSize: 7, fontWeight: 'bold', color: badgeTextColor }}>
                        {esFortaleza ? '✓ ' : esOportunidad ? '💡 ' : ''}{badgeText}
                      </Text>
                    </View>
                  )}
                </View>
                
                {/* Porcentaje grande */}
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: barColor, flexShrink: 0 }}>
                  {porcentaje.toFixed(0)}%
                </Text>
              </View>

              {/* Título */}
              <Text style={{
                fontSize: 8,
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: 4,
                lineHeight: 1.3,
              }}>
                {titulo.toUpperCase()}
              </Text>

              {/* Descripción */}
              <Text style={{
                fontSize: 7,
                color: '#6b7280',
                marginBottom: 6,
                lineHeight: 1.4,
              }}>
                {descripcion}
              </Text>

              {/* Barra de progreso */}
              <View style={{ marginTop: 6 }}>
                <View style={{
                  width: '100%',
                  height: 8,
                  backgroundColor: '#e5e7eb',
                  borderRadius: 4,
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  <View style={{
                    width: `${barWidth}%`,
                    height: '100%',
                    backgroundColor: barColor,
                    borderRadius: 4,
                  }} />
                </View>
                {competencia.promedioMunicipal && competencia.promedioMunicipal > 0 && (
                  <Text style={{ fontSize: 6.5, color: '#6b7280', marginTop: 3, textAlign: 'right' }}>
                    Promedio Municipal: {competencia.promedioMunicipal.toFixed(1)}%
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

