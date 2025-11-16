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

const getResultExplanation = (dimension: string, percentage: number, promedioMunicipal?: number): string => {
  const nombre = dimension.toLowerCase();
  const diferencia = promedioMunicipal ? percentage - promedioMunicipal : 0;
  
  // Explicaciones para competencias técnicas
  if (nombre.includes("técnica") || nombre.includes("competencia") || nombre.includes("conocimiento") || nombre.includes("laborales")) {
    if (percentage >= 85) {
      return `Con un ${percentage.toFixed(1)}%, demuestras un dominio excepcional de las habilidades técnicas requeridas para tu puesto. ${diferencia > 0 ? `Estás por encima del promedio municipal (${promedioMunicipal?.toFixed(1)}%), lo que indica que tus competencias técnicas son un diferenciador clave.` : diferencia < 0 ? `Aunque estás ligeramente por debajo del promedio municipal (${promedioMunicipal?.toFixed(1)}%), mantienes un nivel sólido.` : 'Estás alineado con el promedio municipal, manteniendo un nivel consistente.'}`;
    } else if (percentage >= 75) {
      return `Con un ${percentage.toFixed(1)}%, muestras buenos conocimientos técnicos en tu área de trabajo. ${diferencia > 0 ? `Superas el promedio municipal (${promedioMunicipal?.toFixed(1)}%), lo que refleja tu compromiso con la excelencia técnica.` : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioMunicipal?.toFixed(1)}%), con oportunidad de fortalecer aún más tus competencias.` : 'Estás alineado con el estándar esperado para tu nivel.'}`;
    } else if (percentage >= 60) {
      return `Con un ${percentage.toFixed(1)}%, hay oportunidad de fortalecer tus conocimientos técnicos. ${diferencia > 0 ? `A pesar de estar por encima del promedio municipal (${promedioMunicipal?.toFixed(1)}%), aún puedes mejorar.` : diferencia < 0 ? `Estás por debajo del promedio municipal (${promedioMunicipal?.toFixed(1)}%), lo que indica un área importante de desarrollo.` : 'Considera capacitación adicional para mejorar tu desempeño técnico.'}`;
    } else {
      return `Con un ${percentage.toFixed(1)}%, esta área requiere atención prioritaria. ${diferencia > 0 ? `Aunque superas el promedio municipal (${promedioMunicipal?.toFixed(1)}%), el nivel general necesita mejora.` : diferencia < 0 ? `Estás significativamente por debajo del promedio municipal (${promedioMunicipal?.toFixed(1)}%), lo que requiere un plan de desarrollo específico.` : 'Es fundamental desarrollar estas competencias para mejorar tu desempeño general.'}`;
    }
  }
  
  // Explicaciones para comportamiento organizacional
  if (nombre.includes("comportamiento") || nombre.includes("actitud") || nombre.includes("valor") || nombre.includes("organizacional")) {
    if (percentage >= 80) {
      return `Con un ${percentage.toFixed(1)}%, tus valores y actitud profesional son un pilar sólido de tu desempeño. ${diferencia > 0 ? `Superas el promedio municipal (${promedioMunicipal?.toFixed(1)}%), demostrando un compromiso ejemplar con la cultura organizacional.` : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioMunicipal?.toFixed(1)}%), manteniendo un buen nivel.` : 'Reflejas los valores institucionales de manera consistente.'}`;
    } else if (percentage >= 70) {
      return `Con un ${percentage.toFixed(1)}%, muestras una actitud positiva hacia el trabajo. ${diferencia > 0 ? `Estás por encima del promedio municipal (${promedioMunicipal?.toFixed(1)}%), lo que indica buena alineación con los valores.` : diferencia < 0 ? `Estás ligeramente por debajo del promedio municipal (${promedioMunicipal?.toFixed(1)}%), con oportunidad de fortalecer tu compromiso.` : 'Mantén este nivel y busca oportunidades para demostrar aún más los valores institucionales.'}`;
    } else {
      return `Con un ${percentage.toFixed(1)}%, es importante enfocarse en alinear mejor con la cultura y valores organizacionales. ${diferencia > 0 ? `Aunque superas el promedio municipal (${promedioMunicipal?.toFixed(1)}%), hay espacio para mejorar.` : diferencia < 0 ? `Estás por debajo del promedio municipal (${promedioMunicipal?.toFixed(1)}%), lo que requiere atención para fortalecer tu compromiso institucional.` : 'Considera cómo puedes demostrar mejor los valores y normas de la institución.'}`;
    }
  }
  
  // Explicaciones para relaciones interpersonales
  if (nombre.includes("relaciones interpersonales") || nombre.includes("trabajo en equipo") || nombre.includes("comunicación")) {
    if (percentage >= 85) {
      return `Con un ${percentage.toFixed(1)}%, destacas por tu capacidad de comunicación y colaboración efectiva. ${diferencia > 0 ? `Superas significativamente el promedio municipal (${promedioMunicipal?.toFixed(1)}%), siendo un referente en trabajo en equipo.` : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioMunicipal?.toFixed(1)}%), manteniendo excelentes relaciones.` : 'Tus habilidades interpersonales son una fortaleza reconocida.'}`;
    } else if (percentage >= 75) {
      return `Con un ${percentage.toFixed(1)}%, mantienes buenas relaciones profesionales con tus compañeros. ${diferencia > 0 ? `Estás por encima del promedio municipal (${promedioMunicipal?.toFixed(1)}%), lo que facilita el trabajo colaborativo.` : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioMunicipal?.toFixed(1)}%), con oportunidad de fortalecer la comunicación.` : 'Continúa fomentando un ambiente de trabajo colaborativo.'}`;
    } else {
      return `Con un ${percentage.toFixed(1)}%, hay oportunidad de mejorar tus habilidades de comunicación y trabajo en equipo. ${diferencia > 0 ? `Aunque superas el promedio municipal (${promedioMunicipal?.toFixed(1)}%), puedes desarrollar más estas competencias.` : diferencia < 0 ? `Estás por debajo del promedio municipal (${promedioMunicipal?.toFixed(1)}%), lo que requiere atención para mejorar la colaboración.` : 'Considera participar más activamente en actividades de equipo y mejorar la comunicación.'}`;
    }
  }
  
  // Explicaciones para orientación al servicio
  if (nombre.includes("servicio") || nombre.includes("atención") || nombre.includes("orientación") || nombre.includes("usuario")) {
    if (percentage >= 80) {
      return `Con un ${percentage.toFixed(1)}%, demuestras un compromiso excepcional con la atención al usuario. ${diferencia > 0 ? `Superas el promedio municipal (${promedioMunicipal?.toFixed(1)}%), siendo un ejemplo de servicio de calidad.` : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioMunicipal?.toFixed(1)}%), manteniendo un buen nivel de servicio.` : 'Tu enfoque en el usuario es reconocido y valorado.'}`;
    } else if (percentage >= 70) {
      return `Con un ${percentage.toFixed(1)}%, muestras una actitud positiva hacia el servicio. ${diferencia > 0 ? `Estás por encima del promedio municipal (${promedioMunicipal?.toFixed(1)}%), lo que indica buen compromiso con los usuarios.` : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioMunicipal?.toFixed(1)}%), con oportunidad de mejorar la calidad del servicio.` : 'Mantén este nivel y busca formas de superar las expectativas de los usuarios.'}`;
    } else {
      return `Con un ${percentage.toFixed(1)}%, es importante fortalecer tu enfoque en las necesidades de los usuarios. ${diferencia > 0 ? `Aunque superas el promedio municipal (${promedioMunicipal?.toFixed(1)}%), puedes mejorar aún más.` : diferencia < 0 ? `Estás por debajo del promedio municipal (${promedioMunicipal?.toFixed(1)}%), lo que requiere atención para mejorar el servicio.` : 'Considera cómo puedes anticipar y responder mejor a las necesidades de los usuarios.'}`;
    }
  }
  
  // Explicaciones para productividad
  if (nombre.includes("productividad") || nombre.includes("cumplimiento") || nombre.includes("objetivos")) {
    if (percentage >= 80) {
      return `Con un ${percentage.toFixed(1)}%, demuestras alta efectividad en el cumplimiento de objetivos y plazos. ${diferencia > 0 ? `Superas el promedio municipal (${promedioMunicipal?.toFixed(1)}%), siendo un referente en productividad.` : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioMunicipal?.toFixed(1)}%), manteniendo un buen ritmo de trabajo.` : 'Tu capacidad para cumplir objetivos es consistente y confiable.'}`;
    } else if (percentage >= 70) {
      return `Con un ${percentage.toFixed(1)}%, cumples adecuadamente con tus responsabilidades. ${diferencia > 0 ? `Estás por encima del promedio municipal (${promedioMunicipal?.toFixed(1)}%), lo que indica buena gestión del tiempo.` : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioMunicipal?.toFixed(1)}%), con oportunidad de optimizar tu productividad.` : 'Continúa mejorando la eficiencia en el cumplimiento de plazos.'}`;
    } else {
      return `Con un ${percentage.toFixed(1)}%, hay oportunidad de mejorar la gestión del tiempo y cumplimiento de objetivos. ${diferencia > 0 ? `Aunque superas el promedio municipal (${promedioMunicipal?.toFixed(1)}%), puedes optimizar más.` : diferencia < 0 ? `Estás por debajo del promedio municipal (${promedioMunicipal?.toFixed(1)}%), lo que requiere atención para mejorar la productividad.` : 'Considera técnicas de gestión del tiempo y priorización de tareas.'}`;
    }
  }
  
  // Explicaciones para calidad
  if (nombre.includes("calidad")) {
    if (percentage >= 80) {
      return `Con un ${percentage.toFixed(1)}%, tu trabajo se caracteriza por la precisión y el cumplimiento de estándares. ${diferencia > 0 ? `Superas el promedio municipal (${promedioMunicipal?.toFixed(1)}%), siendo un ejemplo de excelencia.` : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioMunicipal?.toFixed(1)}%), manteniendo altos estándares.` : 'La calidad de tu trabajo es reconocida y consistente.'}`;
    } else if (percentage >= 70) {
      return `Con un ${percentage.toFixed(1)}%, mantienes un nivel adecuado de calidad en tus entregables. ${diferencia > 0 ? `Estás por encima del promedio municipal (${promedioMunicipal?.toFixed(1)}%), lo que indica atención al detalle.` : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioMunicipal?.toFixed(1)}%), con oportunidad de elevar los estándares.` : 'Continúa mejorando la precisión y presentación de tu trabajo.'}`;
    } else {
      return `Con un ${percentage.toFixed(1)}%, es importante fortalecer la precisión y cumplimiento de estándares. ${diferencia > 0 ? `Aunque superas el promedio municipal (${promedioMunicipal?.toFixed(1)}%), puedes mejorar más.` : diferencia < 0 ? `Estás por debajo del promedio municipal (${promedioMunicipal?.toFixed(1)}%), lo que requiere atención para mejorar la calidad.` : 'Considera revisar procesos y estándares para elevar la calidad de tu trabajo.'}`;
    }
  }
  
  // Explicación genérica
  if (percentage >= 80) {
    return `Con un ${percentage.toFixed(1)}%, esta es una de tus áreas más fuertes. ${diferencia > 0 ? `Superas el promedio municipal (${promedioMunicipal?.toFixed(1)}%), lo que indica excelente desempeño.` : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioMunicipal?.toFixed(1)}%), manteniendo un nivel sólido.` : 'Continúa desarrollando esta competencia para mantener tu excelencia.'}`;
  } else if (percentage >= 70) {
    return `Con un ${percentage.toFixed(1)}%, muestras un desempeño adecuado en esta dimensión. ${diferencia > 0 ? `Estás por encima del promedio municipal (${promedioMunicipal?.toFixed(1)}%), lo que es positivo.` : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioMunicipal?.toFixed(1)}%), con oportunidad de mejorar.` : 'Hay espacio para crecer y fortalecer aún más esta competencia.'}`;
  } else {
    return `Con un ${percentage.toFixed(1)}%, esta área requiere atención y desarrollo. ${diferencia > 0 ? `Aunque superas el promedio municipal (${promedioMunicipal?.toFixed(1)}%), puedes mejorar más.` : diferencia < 0 ? `Estás por debajo del promedio municipal (${promedioMunicipal?.toFixed(1)}%), lo que indica un área importante de crecimiento.` : 'Considera un plan de desarrollo específico para fortalecer esta competencia.'}`;
  }
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
    <View style={{ marginBottom: 6 }}>
      <Text style={pdfStyles.sectionTitle}>📊 PANORAMA DE COMPETENCIAS</Text>
      <View style={{ marginTop: 4, flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between' }}>
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
                borderRadius: 6,
                padding: 8,
                marginBottom: 6,
                borderLeft: `4px solid ${cardBorderColor}`,
              }}
            >
              {/* Header con número y badge */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                  {/* Círculo con número */}
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: circleBgColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#ffffff' }}>
                      {index + 1}
                    </Text>
                  </View>
                  
                  {/* Badge */}
                  {badgeText && (
                    <View style={{
                      backgroundColor: badgeBgColor,
                      paddingHorizontal: 4,
                      paddingVertical: 1,
                      borderRadius: 2,
                      flexShrink: 0,
                    }}>
                      <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: badgeTextColor }}>
                        {esFortaleza ? '✓ ' : esOportunidad ? '💡 ' : ''}{badgeText}
                      </Text>
                    </View>
                  )}
                </View>
                
                {/* Porcentaje grande */}
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: barColor, flexShrink: 0 }}>
                  {porcentaje.toFixed(0)}%
                </Text>
              </View>

              {/* Título */}
              <Text style={{
                fontSize: 7.5,
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: 3,
                lineHeight: 1.2,
              }}>
                {titulo.toUpperCase()}
              </Text>

              {/* Descripción */}
              <Text style={{
                fontSize: 6.5,
                color: '#6b7280',
                marginBottom: 4,
                lineHeight: 1.3,
              }}>
                {descripcion}
              </Text>

              {/* Explicación del resultado */}
              <View style={{
                backgroundColor: '#f9fafb',
                padding: 5,
                borderRadius: 3,
                marginBottom: 4,
                borderLeft: `2px solid ${barColor}`,
              }}>
                <Text style={{
                  fontSize: 6,
                  color: '#374151',
                  lineHeight: 1.35,
                }}>
                  {getResultExplanation(competencia.dimension, porcentaje, competencia.promedioMunicipal)}
                </Text>
              </View>

              {/* Barra de progreso */}
              <View style={{ marginTop: 4 }}>
                <View style={{
                  width: '100%',
                  height: 6,
                  backgroundColor: '#e5e7eb',
                  borderRadius: 3,
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  <View style={{
                    width: `${barWidth}%`,
                    height: '100%',
                    backgroundColor: barColor,
                    borderRadius: 3,
                  }} />
                </View>
                {competencia.promedioMunicipal && competencia.promedioMunicipal > 0 && (
                  <Text style={{ fontSize: 6, color: '#6b7280', marginTop: 2, textAlign: 'right' }}>
                    Promedio: {competencia.promedioMunicipal.toFixed(1)}%
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

