/**
 * Script para poblar la tabla dimension_explanations
 * Este script procesa todos los instrumentos y genera las explicaciones
 */

import * as instruments from "../src/data/instruments";

interface DimensionExplanation {
  dimension_id: string;
  dimension_nombre: string;
  nivel: string;
  descripcion_base: string;
  rango_minimo: number;
  rango_maximo: number;
  explicacion: string;
  incluye_comparacion: boolean;
}

function adaptDescriptionToResult(
  descripcionBase: string,
  porcentaje: number,
  dimensionNombre: string
): string {
  const nombreLower = dimensionNombre.toLowerCase();
  
  let contexto = "";
  if (nombreLower.includes("productividad") || nombreLower.includes("cumplimiento") || nombreLower.includes("objetivos") || nombreLower.includes("resultados")) {
    contexto = "productividad";
  } else if (nombreLower.includes("calidad")) {
    contexto = "calidad";
  } else if (nombreLower.includes("competencia") || nombreLower.includes("técnica") || nombreLower.includes("conocimiento") || nombreLower.includes("laborales") || nombreLower.includes("habilidades")) {
    contexto = "competencia";
  } else if (nombreLower.includes("comportamiento") || nombreLower.includes("actitud") || nombreLower.includes("organizacional") || nombreLower.includes("disciplina") || nombreLower.includes("ética")) {
    contexto = "comportamiento";
  } else if (nombreLower.includes("relaciones") || nombreLower.includes("equipo") || nombreLower.includes("comunicación") || nombreLower.includes("trabajo con otras")) {
    contexto = "relaciones";
  } else if (nombreLower.includes("servicio") || nombreLower.includes("atención") || nombreLower.includes("usuario") || nombreLower.includes("orientación")) {
    contexto = "servicio";
  } else if (nombreLower.includes("liderazgo") || nombreLower.includes("gestión") || nombreLower.includes("dirección") || nombreLower.includes("coordinación")) {
    contexto = "liderazgo";
  } else if (nombreLower.includes("seguridad")) {
    contexto = "seguridad";
  } else {
    contexto = "general";
  }

  let descripcionAdaptada = descripcionBase
    .replace(/^Evalúa\s+/i, "")
    .replace(/^Esta dimensión evalúa\s+/i, "")
    .replace(/^Esta dimensión mide\s+/i, "")
    .replace(/^Grado en que\s+/i, "")
    .replace(/^Nivel de\s+/i, "")
    .replace(/^Conjunto de\s+/i, "")
    .replace(/^Capacidad para\s+/i, "")
    .trim();

  if (porcentaje >= 85) {
    switch (contexto) {
      case "productividad":
        return `Con un ${porcentaje.toFixed(1)}%, demuestras alta efectividad en ${descripcionAdaptada.toLowerCase()}. Tu capacidad para cumplir objetivos y optimizar recursos es excepcional.`;
      case "calidad":
        return `Con un ${porcentaje.toFixed(1)}%, tu trabajo se caracteriza por la excelencia en ${descripcionAdaptada.toLowerCase()}. La precisión y cumplimiento de estándares son consistentes.`;
      case "competencia":
        return `Con un ${porcentaje.toFixed(1)}%, demuestras un dominio excepcional de ${descripcionAdaptada.toLowerCase()}. Tus habilidades técnicas son un diferenciador clave.`;
      case "comportamiento":
        return `Con un ${porcentaje.toFixed(1)}%, tus valores y actitud profesional son un pilar sólido. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} refleja tu compromiso con la cultura organizacional.`;
      case "relaciones":
        return `Con un ${porcentaje.toFixed(1)}%, destacas por tu capacidad en ${descripcionAdaptada.toLowerCase()}. Tu habilidad para colaborar y comunicarte efectivamente es reconocida.`;
      case "servicio":
        return `Con un ${porcentaje.toFixed(1)}%, demuestras un compromiso excepcional con ${descripcionAdaptada.toLowerCase()}. Tu enfoque en el usuario es ejemplar.`;
      case "liderazgo":
        return `Con un ${porcentaje.toFixed(1)}%, demuestras excelencia en ${descripcionAdaptada.toLowerCase()}. Tu capacidad para dirigir y coordinar equipos es destacada.`;
      case "seguridad":
        return `Con un ${porcentaje.toFixed(1)}%, demuestras un compromiso ejemplar con ${descripcionAdaptada.toLowerCase()}. Tu atención a la seguridad y prevención de riesgos es destacada.`;
      default:
        return `Con un ${porcentaje.toFixed(1)}%, esta es una de tus áreas más fuertes. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} refleja tu excelente desempeño.`;
    }
  } else if (porcentaje >= 75) {
    switch (contexto) {
      case "productividad":
        return `Con un ${porcentaje.toFixed(1)}%, cumples adecuadamente con ${descripcionAdaptada.toLowerCase()}. Hay oportunidad de optimizar aún más tu gestión del tiempo y recursos.`;
      case "calidad":
        return `Con un ${porcentaje.toFixed(1)}%, mantienes un nivel adecuado en ${descripcionAdaptada.toLowerCase()}. Continúa mejorando la precisión y presentación de tu trabajo.`;
      case "competencia":
        return `Con un ${porcentaje.toFixed(1)}%, muestras buenos conocimientos en ${descripcionAdaptada.toLowerCase()}. Hay espacio para fortalecer aún más tus competencias técnicas.`;
      case "comportamiento":
        return `Con un ${porcentaje.toFixed(1)}%, muestras una actitud positiva hacia el trabajo. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} puede fortalecerse aún más.`;
      case "relaciones":
        return `Con un ${porcentaje.toFixed(1)}%, mantienes buenas relaciones profesionales. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} puede mejorarse con mayor participación colaborativa.`;
      case "servicio":
        return `Con un ${porcentaje.toFixed(1)}%, muestras una actitud positiva hacia el servicio. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} puede fortalecerse para superar expectativas.`;
      case "liderazgo":
        return `Con un ${porcentaje.toFixed(1)}%, muestras buen desempeño en ${descripcionAdaptada.toLowerCase()}. Hay oportunidad de fortalecer tus habilidades de liderazgo.`;
      case "seguridad":
        return `Con un ${porcentaje.toFixed(1)}%, muestras buena atención a ${descripcionAdaptada.toLowerCase()}. Continúa mejorando el cumplimiento de normas de seguridad.`;
      default:
        return `Con un ${porcentaje.toFixed(1)}%, muestras un desempeño adecuado en ${descripcionAdaptada.toLowerCase()}. Hay espacio para crecer y fortalecer aún más esta competencia.`;
    }
  } else if (porcentaje >= 60) {
    switch (contexto) {
      case "productividad":
        return `Con un ${porcentaje.toFixed(1)}%, hay oportunidad de mejorar ${descripcionAdaptada.toLowerCase()}. Considera técnicas de gestión del tiempo y priorización de tareas.`;
      case "calidad":
        return `Con un ${porcentaje.toFixed(1)}%, es importante fortalecer ${descripcionAdaptada.toLowerCase()}. Considera revisar procesos y estándares para elevar la calidad.`;
      case "competencia":
        return `Con un ${porcentaje.toFixed(1)}%, hay oportunidad de fortalecer ${descripcionAdaptada.toLowerCase()}. Considera capacitación adicional para mejorar tu desempeño técnico.`;
      case "comportamiento":
        return `Con un ${porcentaje.toFixed(1)}%, es importante enfocarse en ${descripcionAdaptada.toLowerCase()}. Considera cómo puedes demostrar mejor los valores institucionales.`;
      case "relaciones":
        return `Con un ${porcentaje.toFixed(1)}%, hay oportunidad de mejorar ${descripcionAdaptada.toLowerCase()}. Considera participar más activamente en actividades de equipo.`;
      case "servicio":
        return `Con un ${porcentaje.toFixed(1)}%, es importante fortalecer ${descripcionAdaptada.toLowerCase()}. Considera cómo puedes anticipar mejor las necesidades de los usuarios.`;
      case "liderazgo":
        return `Con un ${porcentaje.toFixed(1)}%, hay oportunidad de desarrollar ${descripcionAdaptada.toLowerCase()}. Considera capacitación en liderazgo y gestión de equipos.`;
      case "seguridad":
        return `Con un ${porcentaje.toFixed(1)}%, es importante fortalecer ${descripcionAdaptada.toLowerCase()}. Considera revisar y aplicar más rigurosamente las normas de seguridad.`;
      default:
        return `Con un ${porcentaje.toFixed(1)}%, esta área requiere atención y desarrollo. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} necesita fortalecerse.`;
    }
  } else {
    switch (contexto) {
      case "productividad":
        return `Con un ${porcentaje.toFixed(1)}%, esta área requiere atención prioritaria. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} necesita un plan de desarrollo específico.`;
      case "calidad":
        return `Con un ${porcentaje.toFixed(1)}%, es fundamental mejorar ${descripcionAdaptada.toLowerCase()}. Se requiere atención inmediata para elevar los estándares de calidad.`;
      case "competencia":
        return `Con un ${porcentaje.toFixed(1)}%, esta área requiere atención prioritaria. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} necesita desarrollo urgente.`;
      case "comportamiento":
        return `Con un ${porcentaje.toFixed(1)}%, es fundamental alinear mejor ${descripcionAdaptada.toLowerCase()}. Se requiere atención para fortalecer tu compromiso institucional.`;
      case "relaciones":
        return `Con un ${porcentaje.toFixed(1)}%, esta área requiere desarrollo urgente. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} necesita atención prioritaria.`;
      case "servicio":
        return `Con un ${porcentaje.toFixed(1)}%, es fundamental fortalecer ${descripcionAdaptada.toLowerCase()}. Se requiere atención inmediata para mejorar el servicio.`;
      case "liderazgo":
        return `Con un ${porcentaje.toFixed(1)}%, esta área requiere desarrollo urgente. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} necesita un plan de desarrollo específico.`;
      case "seguridad":
        return `Con un ${porcentaje.toFixed(1)}%, es fundamental fortalecer ${descripcionAdaptada.toLowerCase()}. Se requiere atención inmediata para mejorar el cumplimiento de normas de seguridad.`;
      default:
        return `Con un ${porcentaje.toFixed(1)}%, esta área requiere atención prioritaria. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} necesita un plan de desarrollo específico.`;
    }
  }
}

function generateExplanationsForDimension(
  dimension: { id: string; nombre: string; descripcion?: string },
  nivel: string
): DimensionExplanation[] {
  if (!dimension.descripcion) {
    console.warn(`Dimensión ${dimension.id} sin descripción`);
    return [];
  }

  const explicaciones: DimensionExplanation[] = [];
  
  const rangos = [
    { min: 0, max: 59.99 },
    { min: 60, max: 74.99 },
    { min: 75, max: 84.99 },
    { min: 85, max: 100 }
  ];

  rangos.forEach(rango => {
    const porcentajeMedio = (rango.min + rango.max) / 2;
    const explicacion = adaptDescriptionToResult(
      dimension.descripcion!,
      porcentajeMedio,
      dimension.nombre
    );

    explicaciones.push({
      dimension_id: dimension.id,
      dimension_nombre: dimension.nombre,
      nivel,
      descripcion_base: dimension.descripcion,
      rango_minimo: rango.min,
      rango_maximo: rango.max,
      explicacion,
      incluye_comparacion: true
    });
  });

  return explicaciones;
}

export function generateAllExplanations(): DimensionExplanation[] {
  const allExplanations: DimensionExplanation[] = [];

  Object.values(instruments).forEach((instrument: any) => {
    if (!instrument.nivel || !instrument.dimensionesDesempeno) return;

    instrument.dimensionesDesempeno.forEach((dimension: any) => {
      const explicaciones = generateExplanationsForDimension(
        dimension,
        instrument.nivel
      );
      allExplanations.push(...explicaciones);
    });
  });

  return allExplanations;
}

