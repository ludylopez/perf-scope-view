import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import { getDimensionExplanation } from '@/lib/generateDimensionExplanations';

interface CompetenciaData {
  dimension: string;
  tuEvaluacion: number;
  promedioMunicipal?: number;
  dimensionId?: string; // ID de la dimensión del instrumento (ej: dim1_a1)
  descripcion?: string; // Descripción de la dimensión del instrumento
  explicacion?: string; // Explicación pre-cargada desde la base de datos
}

interface CompetenciasCardsPDFProps {
  competencias: CompetenciaData[];
  fortalezas: Array<{ dimension: string; tuEvaluacion: number }>;
  areasOportunidad: Array<{ dimension: string; tuEvaluacion: number }>;
  nivel?: string; // Nivel del instrumento (A1, A3, E1, O1, etc.)
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
  // Asegurar que promedioMunicipal sea número válido o 0
  const promedioValido = (promedioMunicipal !== undefined && typeof promedioMunicipal === 'number' && !isNaN(promedioMunicipal)) ? promedioMunicipal : 0;
  const diferencia = promedioValido > 0 ? percentage - promedioValido : 0;
  
  // Explicaciones para competencias técnicas
  if (nombre.includes("técnica") || nombre.includes("competencia") || nombre.includes("conocimiento") || nombre.includes("laborales")) {
    if (percentage >= 85) {
      const comparacion = promedioValido > 0 
        ? (diferencia > 0 ? `Estás por encima del promedio municipal (${promedioValido.toFixed(1)}%), lo que indica que tus competencias técnicas son un diferenciador clave.` 
          : diferencia < 0 ? `Aunque estás ligeramente por debajo del promedio municipal (${promedioValido.toFixed(1)}%), mantienes un nivel sólido.` 
          : 'Estás alineado con el promedio municipal, manteniendo un nivel consistente.')
        : 'Estás alineado con el promedio municipal, manteniendo un nivel consistente.';
      return `Con un ${percentage.toFixed(1)}%, demuestras un dominio excepcional de las habilidades técnicas requeridas para tu puesto. ${comparacion}`;
    } else if (percentage >= 75) {
      const comparacion = promedioValido > 0 
        ? (diferencia > 0 ? `Superas el promedio municipal (${promedioValido.toFixed(1)}%), lo que refleja tu compromiso con la excelencia técnica.` 
          : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioValido.toFixed(1)}%), con oportunidad de fortalecer aún más tus competencias.` 
          : 'Estás alineado con el estándar esperado para tu nivel.')
        : 'Estás alineado con el estándar esperado para tu nivel.';
      return `Con un ${percentage.toFixed(1)}%, muestras buenos conocimientos técnicos en tu área de trabajo. ${comparacion}`;
    } else if (percentage >= 60) {
      const comparacion = promedioValido > 0 
        ? (diferencia > 0 ? `A pesar de estar por encima del promedio municipal (${promedioValido.toFixed(1)}%), aún puedes mejorar.` 
          : diferencia < 0 ? `Estás por debajo del promedio municipal (${promedioValido.toFixed(1)}%), lo que indica un área importante de desarrollo.` 
          : 'Considera capacitación adicional para mejorar tu desempeño técnico.')
        : 'Considera capacitación adicional para mejorar tu desempeño técnico.';
      return `Con un ${percentage.toFixed(1)}%, hay oportunidad de fortalecer tus conocimientos técnicos. ${comparacion}`;
    } else {
      const comparacion = promedioValido > 0 
        ? (diferencia > 0 ? `Aunque superas el promedio municipal (${promedioValido.toFixed(1)}%), el nivel general necesita mejora.` 
          : diferencia < 0 ? `Estás significativamente por debajo del promedio municipal (${promedioValido.toFixed(1)}%), lo que requiere un plan de desarrollo específico.` 
          : 'Es fundamental desarrollar estas competencias para mejorar tu desempeño general.')
        : 'Es fundamental desarrollar estas competencias para mejorar tu desempeño general.';
      return `Con un ${percentage.toFixed(1)}%, esta área requiere atención prioritaria. ${comparacion}`;
    }
  }
  
  // Explicaciones para comportamiento organizacional
  if (nombre.includes("comportamiento") || nombre.includes("actitud") || nombre.includes("valor") || nombre.includes("organizacional")) {
    if (percentage >= 80) {
      const comparacion = promedioValido > 0 
        ? (diferencia > 0 ? `Superas el promedio municipal (${promedioValido.toFixed(1)}%), demostrando un compromiso ejemplar con la cultura organizacional.` 
          : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioValido.toFixed(1)}%), manteniendo un buen nivel.` 
          : 'Reflejas los valores institucionales de manera consistente.')
        : 'Reflejas los valores institucionales de manera consistente.';
      return `Con un ${percentage.toFixed(1)}%, tus valores y actitud profesional son un pilar sólido de tu desempeño. ${comparacion}`;
    } else if (percentage >= 70) {
      const comparacion = promedioValido > 0 
        ? (diferencia > 0 ? `Estás por encima del promedio municipal (${promedioValido.toFixed(1)}%), lo que indica buena alineación con los valores.` 
          : diferencia < 0 ? `Estás ligeramente por debajo del promedio municipal (${promedioValido.toFixed(1)}%), con oportunidad de fortalecer tu compromiso.` 
          : 'Mantén este nivel y busca oportunidades para demostrar aún más los valores institucionales.')
        : 'Mantén este nivel y busca oportunidades para demostrar aún más los valores institucionales.';
      return `Con un ${percentage.toFixed(1)}%, muestras una actitud positiva hacia el trabajo. ${comparacion}`;
    } else {
      const comparacion = promedioValido > 0 
        ? (diferencia > 0 ? `Aunque superas el promedio municipal (${promedioValido.toFixed(1)}%), hay espacio para mejorar.` 
          : diferencia < 0 ? `Estás por debajo del promedio municipal (${promedioValido.toFixed(1)}%), lo que requiere atención para fortalecer tu compromiso institucional.` 
          : 'Considera cómo puedes demostrar mejor los valores y normas de la institución.')
        : 'Considera cómo puedes demostrar mejor los valores y normas de la institución.';
      return `Con un ${percentage.toFixed(1)}%, es importante enfocarse en alinear mejor con la cultura y valores organizacionales. ${comparacion}`;
    }
  }
  
  // Explicaciones para relaciones interpersonales
  if (nombre.includes("relaciones interpersonales") || nombre.includes("trabajo en equipo") || nombre.includes("comunicación")) {
    if (percentage >= 85) {
      const comparacion = promedioValido > 0 
        ? (diferencia > 0 ? `Superas significativamente el promedio municipal (${promedioValido.toFixed(1)}%), siendo un referente en trabajo en equipo.` 
          : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioValido.toFixed(1)}%), manteniendo excelentes relaciones.` 
          : 'Tus habilidades interpersonales son una fortaleza reconocida.')
        : 'Tus habilidades interpersonales son una fortaleza reconocida.';
      return `Con un ${percentage.toFixed(1)}%, destacas por tu capacidad de comunicación y colaboración efectiva. ${comparacion}`;
    } else if (percentage >= 75) {
      const comparacion = promedioValido > 0 
        ? (diferencia > 0 ? `Estás por encima del promedio municipal (${promedioValido.toFixed(1)}%), lo que facilita el trabajo colaborativo.` 
          : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioValido.toFixed(1)}%), con oportunidad de fortalecer la comunicación.` 
          : 'Continúa fomentando un ambiente de trabajo colaborativo.')
        : 'Continúa fomentando un ambiente de trabajo colaborativo.';
      return `Con un ${percentage.toFixed(1)}%, mantienes buenas relaciones profesionales con tus compañeros. ${comparacion}`;
    } else {
      const comparacion = promedioValido > 0 
        ? (diferencia > 0 ? `Aunque superas el promedio municipal (${promedioValido.toFixed(1)}%), puedes desarrollar más estas competencias.` 
          : diferencia < 0 ? `Estás por debajo del promedio municipal (${promedioValido.toFixed(1)}%), lo que requiere atención para mejorar la colaboración.` 
          : 'Considera participar más activamente en actividades de equipo y mejorar la comunicación.')
        : 'Considera participar más activamente en actividades de equipo y mejorar la comunicación.';
      return `Con un ${percentage.toFixed(1)}%, hay oportunidad de mejorar tus habilidades de comunicación y trabajo en equipo. ${comparacion}`;
    }
  }
  
  // Explicaciones para orientación al servicio
  if (nombre.includes("servicio") || nombre.includes("atención") || nombre.includes("orientación") || nombre.includes("usuario")) {
    if (percentage >= 80) {
      const comparacion = promedioValido > 0 
        ? (diferencia > 0 ? `Superas el promedio municipal (${promedioValido.toFixed(1)}%), siendo un ejemplo de servicio de calidad.` 
          : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioValido.toFixed(1)}%), manteniendo un buen nivel de servicio.` 
          : 'Tu enfoque en el usuario es reconocido y valorado.')
        : 'Tu enfoque en el usuario es reconocido y valorado.';
      return `Con un ${percentage.toFixed(1)}%, demuestras un compromiso excepcional con la atención al usuario. ${comparacion}`;
    } else if (percentage >= 70) {
      const comparacion = promedioValido > 0 
        ? (diferencia > 0 ? `Estás por encima del promedio municipal (${promedioValido.toFixed(1)}%), lo que indica buen compromiso con los usuarios.` 
          : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioValido.toFixed(1)}%), con oportunidad de mejorar la calidad del servicio.` 
          : 'Mantén este nivel y busca formas de superar las expectativas de los usuarios.')
        : 'Mantén este nivel y busca formas de superar las expectativas de los usuarios.';
      return `Con un ${percentage.toFixed(1)}%, muestras una actitud positiva hacia el servicio. ${comparacion}`;
    } else {
      const comparacion = promedioValido > 0 
        ? (diferencia > 0 ? `Aunque superas el promedio municipal (${promedioValido.toFixed(1)}%), puedes mejorar aún más.` 
          : diferencia < 0 ? `Estás por debajo del promedio municipal (${promedioValido.toFixed(1)}%), lo que requiere atención para mejorar el servicio.` 
          : 'Considera cómo puedes anticipar y responder mejor a las necesidades de los usuarios.')
        : 'Considera cómo puedes anticipar y responder mejor a las necesidades de los usuarios.';
      return `Con un ${percentage.toFixed(1)}%, es importante fortalecer tu enfoque en las necesidades de los usuarios. ${comparacion}`;
    }
  }
  
  // Explicaciones para productividad
  if (nombre.includes("productividad") || nombre.includes("cumplimiento") || nombre.includes("objetivos")) {
    if (percentage >= 80) {
      const comparacion = promedioValido > 0 
        ? (diferencia > 0 ? `Superas el promedio municipal (${promedioValido.toFixed(1)}%), siendo un referente en productividad.` 
          : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioValido.toFixed(1)}%), manteniendo un buen ritmo de trabajo.` 
          : 'Tu capacidad para cumplir objetivos es consistente y confiable.')
        : 'Tu capacidad para cumplir objetivos es consistente y confiable.';
      return `Con un ${percentage.toFixed(1)}%, demuestras alta efectividad en el cumplimiento de objetivos y plazos. ${comparacion}`;
    } else if (percentage >= 70) {
      const comparacion = promedioValido > 0 
        ? (diferencia > 0 ? `Estás por encima del promedio municipal (${promedioValido.toFixed(1)}%), lo que indica buena gestión del tiempo.` 
          : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioValido.toFixed(1)}%), con oportunidad de optimizar tu productividad.` 
          : 'Continúa mejorando la eficiencia en el cumplimiento de plazos.')
        : 'Continúa mejorando la eficiencia en el cumplimiento de plazos.';
      return `Con un ${percentage.toFixed(1)}%, cumples adecuadamente con tus responsabilidades. ${comparacion}`;
    } else {
      const comparacion = promedioValido > 0 
        ? (diferencia > 0 ? `Aunque superas el promedio municipal (${promedioValido.toFixed(1)}%), puedes optimizar más.` 
          : diferencia < 0 ? `Estás por debajo del promedio municipal (${promedioValido.toFixed(1)}%), lo que requiere atención para mejorar la productividad.` 
          : 'Considera técnicas de gestión del tiempo y priorización de tareas.')
        : 'Considera técnicas de gestión del tiempo y priorización de tareas.';
      return `Con un ${percentage.toFixed(1)}%, hay oportunidad de mejorar la gestión del tiempo y cumplimiento de objetivos. ${comparacion}`;
    }
  }
  
  // Explicaciones para calidad
  if (nombre.includes("calidad")) {
    if (percentage >= 80) {
      const comparacion = promedioValido > 0 
        ? (diferencia > 0 ? `Superas el promedio municipal (${promedioValido.toFixed(1)}%), siendo un ejemplo de excelencia.` 
          : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioValido.toFixed(1)}%), manteniendo altos estándares.` 
          : 'La calidad de tu trabajo es reconocida y consistente.')
        : 'La calidad de tu trabajo es reconocida y consistente.';
      return `Con un ${percentage.toFixed(1)}%, tu trabajo se caracteriza por la precisión y el cumplimiento de estándares. ${comparacion}`;
    } else if (percentage >= 70) {
      const comparacion = promedioValido > 0 
        ? (diferencia > 0 ? `Estás por encima del promedio municipal (${promedioValido.toFixed(1)}%), lo que indica atención al detalle.` 
          : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioValido.toFixed(1)}%), con oportunidad de elevar los estándares.` 
          : 'Continúa mejorando la precisión y presentación de tu trabajo.')
        : 'Continúa mejorando la precisión y presentación de tu trabajo.';
      return `Con un ${percentage.toFixed(1)}%, mantienes un nivel adecuado de calidad en tus entregables. ${comparacion}`;
    } else {
      const comparacion = promedioValido > 0 
        ? (diferencia > 0 ? `Aunque superas el promedio municipal (${promedioValido.toFixed(1)}%), puedes mejorar más.` 
          : diferencia < 0 ? `Estás por debajo del promedio municipal (${promedioValido.toFixed(1)}%), lo que requiere atención para mejorar la calidad.` 
          : 'Considera revisar procesos y estándares para elevar la calidad de tu trabajo.')
        : 'Considera revisar procesos y estándares para elevar la calidad de tu trabajo.';
      return `Con un ${percentage.toFixed(1)}%, es importante fortalecer la precisión y cumplimiento de estándares. ${comparacion}`;
    }
  }
  
  // Explicación genérica
  if (percentage >= 80) {
    const comparacion = promedioValido > 0 
      ? (diferencia > 0 ? `Superas el promedio municipal (${promedioValido.toFixed(1)}%), lo que indica excelente desempeño.` 
        : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioValido.toFixed(1)}%), manteniendo un nivel sólido.` 
        : 'Continúa desarrollando esta competencia para mantener tu excelencia.')
      : 'Continúa desarrollando esta competencia para mantener tu excelencia.';
    return `Con un ${percentage.toFixed(1)}%, esta es una de tus áreas más fuertes. ${comparacion}`;
  } else if (percentage >= 70) {
    const comparacion = promedioValido > 0 
      ? (diferencia > 0 ? `Estás por encima del promedio municipal (${promedioValido.toFixed(1)}%), lo que es positivo.` 
        : diferencia < 0 ? `Estás cerca del promedio municipal (${promedioValido.toFixed(1)}%), con oportunidad de mejorar.` 
        : 'Hay espacio para crecer y fortalecer aún más esta competencia.')
      : 'Hay espacio para crecer y fortalecer aún más esta competencia.';
    return `Con un ${percentage.toFixed(1)}%, muestras un desempeño adecuado en esta dimensión. ${comparacion}`;
  } else {
    const comparacion = promedioValido > 0 
      ? (diferencia > 0 ? `Aunque superas el promedio municipal (${promedioValido.toFixed(1)}%), puedes mejorar más.` 
        : diferencia < 0 ? `Estás por debajo del promedio municipal (${promedioValido.toFixed(1)}%), lo que indica un área importante de crecimiento.` 
        : 'Considera un plan de desarrollo específico para fortalecer esta competencia.')
      : 'Considera un plan de desarrollo específico para fortalecer esta competencia.';
    return `Con un ${percentage.toFixed(1)}%, esta área requiere atención y desarrollo. ${comparacion}`;
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

// Función fallback que adapta la descripción del instrumento
const adaptDescriptionToResultFallback = (
  descripcionBase: string,
  porcentaje: number,
  dimensionNombre: string,
  promedioMunicipal?: number
): string => {
  // Adaptar descripción eliminando "Evalúa" y convirtiéndola en lenguaje de resultado
  let descripcionAdaptada = descripcionBase
    .replace(/^Evalúa\s+/i, "")
    .replace(/^Esta dimensión evalúa\s+/i, "")
    .replace(/^Grado en que\s+/i, "")
    .replace(/^Nivel de\s+/i, "")
    .trim();

  // Asegurar que promedioMunicipal sea número válido o 0
  const promedioValido = (promedioMunicipal !== undefined && typeof promedioMunicipal === 'number' && !isNaN(promedioMunicipal) && promedioMunicipal > 0) ? promedioMunicipal : 0;
  const diferencia = promedioValido > 0 ? porcentaje - promedioValido : 0;
  let comparacion = '';
  
  if (promedioValido > 0) {
    if (diferencia > 0) {
      comparacion = ` Estás por encima del promedio municipal (${promedioValido.toFixed(1)}%), lo que indica un desempeño destacado.`;
    } else if (diferencia < 0) {
      comparacion = ` Estás por debajo del promedio municipal (${promedioValido.toFixed(1)}%), lo que indica un área de desarrollo.`;
    } else {
      comparacion = ` Estás alineado con el promedio municipal (${promedioValido.toFixed(1)}%), manteniendo un nivel consistente.`;
    }
  }

  if (porcentaje >= 85) {
    return `Con un ${porcentaje.toFixed(1)}%, demuestras excelencia en ${descripcionAdaptada.toLowerCase()}. Tu desempeño es excepcional.${comparacion}`;
  } else if (porcentaje >= 75) {
    return `Con un ${porcentaje.toFixed(1)}%, muestras un buen desempeño en ${descripcionAdaptada.toLowerCase()}. Hay espacio para seguir mejorando.${comparacion}`;
  } else if (porcentaje >= 60) {
    return `Con un ${porcentaje.toFixed(1)}%, hay oportunidad de fortalecer ${descripcionAdaptada.toLowerCase()}. Considera un plan de desarrollo específico.${comparacion}`;
  } else {
    return `Con un ${porcentaje.toFixed(1)}%, esta área requiere atención prioritaria. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} necesita desarrollo urgente.${comparacion}`;
  }
};

// Componente para renderizar explicación (React-PDF no soporta async directamente)
const ExplanationBox = ({ competencia, nivel, barColor }: { 
  competencia: CompetenciaData; 
  nivel?: string;
  barColor: string;
}) => {
  // Usar explicación pre-cargada de la base de datos si está disponible
  let explicacion = '';
  
  // Validar que explicacion sea string válido (no null ni undefined)
  if (competencia.explicacion && typeof competencia.explicacion === 'string' && competencia.explicacion.trim() !== '') {
    // Usar explicación de la base de datos (ya incluye comparación si corresponde)
    explicacion = competencia.explicacion;
  } else if (competencia.descripcion && typeof competencia.descripcion === 'string' && competencia.descripcion.trim() !== '') {
    // Fallback: adaptar descripción del instrumento
    explicacion = adaptDescriptionToResultFallback(
      competencia.descripcion,
      competencia.tuEvaluacion,
      competencia.dimension,
      competencia.promedioMunicipal
    );
  } else {
    // Fallback genérico
    explicacion = getResultExplanation(
      competencia.dimension,
      competencia.tuEvaluacion,
      competencia.promedioMunicipal
    );
  }

  // Asegurar que siempre haya contenido - React-PDF no puede renderizar strings vacíos
  if (!explicacion || explicacion.trim() === '') {
    explicacion = `Evaluación de desempeño en esta dimensión con ${competencia.tuEvaluacion.toFixed(1)}%.`;
  }

  return (
    <View style={{
      backgroundColor: '#f9fafb',
      padding: 5,
      borderRadius: 3,
      marginBottom: 4,
      borderLeftWidth: 2,
      borderLeftColor: barColor || '#6b7280',
    }}>
      <Text style={{
        fontSize: 6,
        color: '#374151',
        lineHeight: 1.35,
      }}>
        {explicacion}
      </Text>
    </View>
  );
};

export const CompetenciasCardsPDF = ({ 
  competencias, 
  fortalezas, 
  areasOportunidad,
  nivel 
}: CompetenciasCardsPDFProps) => {
  if (!competencias || competencias.length === 0) {
    // Retornar View vacío en lugar de null para evitar problemas con React-PDF
    return <View />;
  }


  // Filtrar competencias inválidas antes de renderizar
  const competenciasValidas = competencias.filter((c, idx) => {
    if (!c || !c.dimension || typeof c.tuEvaluacion !== 'number') {
      console.warn(`⚠️ Competencia ${idx} tiene datos inválidos, será omitida:`, c);
      return false;
    }
    return true;
  });

  if (competenciasValidas.length === 0) {
    return <View />;
  }

  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={pdfStyles.sectionTitle}>📊 PANORAMA DE COMPETENCIAS</Text>
      <View style={{ marginTop: 4, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {competenciasValidas.map((competencia, index) => {

          const esFortaleza = isFortaleza(competencia.dimension, fortalezas);
          const esOportunidad = isOportunidad(competencia.dimension, areasOportunidad);
          const esNeutro = !esFortaleza && !esOportunidad;
          
          const cardBgColor = esFortaleza ? '#f0fdf4' : esOportunidad ? '#fff7ed' : '#f8fafc';
          const cardBorderColor = esFortaleza ? '#22c55e' : esOportunidad ? '#f97316' : '#e5e7eb';
          const circleBgColor = esFortaleza ? '#22c55e' : esOportunidad ? '#f97316' : '#6b7280';
          const badgeBgColor = esFortaleza ? '#dcfce7' : esOportunidad ? '#ffedd5' : '#f3f4f6';
          const badgeTextColor = esFortaleza ? '#166534' : esOportunidad ? '#9a3412' : '#6b7280';
          const badgeText = esFortaleza ? 'FORTALEZA' : esOportunidad ? 'OPORTUNIDAD' : null; // Usar null en lugar de '' para evitar problemas con React-PDF
          const barColor = esFortaleza ? '#22c55e' : esOportunidad ? '#f97316' : '#6b7280';
          
          const titulo = getDimensionFriendlyTitle(competencia.dimension) || `Dimensión ${index + 1}`;
          const descripcion = getDimensionDescription(competencia.dimension) || 'Evaluación de desempeño en esta dimensión.';
          const porcentaje = competencia.tuEvaluacion || 0;
          const barWidth = Math.min((porcentaje / 100) * 100, 100);

          // Construir el texto del badge de forma segura
          const badgeContent = badgeText 
            ? `${esFortaleza ? '✓ ' : esOportunidad ? '💡 ' : ''}${badgeText}`
            : null;

          return (
            <View 
              key={index} 
              style={{
                width: '48%',
                backgroundColor: cardBgColor,
                borderWidth: 1.5,
                borderColor: cardBorderColor || '#e5e7eb',
                borderRadius: 6,
                padding: 8,
                marginBottom: 6,
                borderLeftWidth: 4,
                borderLeftColor: cardBorderColor || '#e5e7eb',
              }}
            >
              {/* Header con número y badge */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
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
                  {badgeContent && (
                    <View style={{
                      backgroundColor: badgeBgColor,
                      paddingHorizontal: 4,
                      paddingVertical: 1,
                      borderRadius: 2,
                      flexShrink: 0,
                    }}>
                      <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: badgeTextColor }}>
                        {badgeContent}
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
              {titulo && titulo.trim() !== '' && (
                <Text style={{
                  fontSize: 7.5,
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: 3,
                  lineHeight: 1.2,
                }}>
                  {titulo.toUpperCase()}
                </Text>
              )}

              {/* Descripción */}
              {descripcion && descripcion.trim() !== '' && (
                <Text style={{
                  fontSize: 6.5,
                  color: '#6b7280',
                  marginBottom: 4,
                  lineHeight: 1.3,
                }}>
                  {descripcion}
                </Text>
              )}

              {/* Explicación del resultado - se renderizará dinámicamente */}
              <ExplanationBox 
                competencia={competencia}
                nivel={nivel}
                barColor={barColor}
              />

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

