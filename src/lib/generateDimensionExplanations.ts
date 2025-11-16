/**
 * Script para generar explicaciones dinámicas de dimensiones basadas en los instrumentos
 * 
 * Este script extrae las descripciones de cada dimensión de los instrumentos
 * y genera explicaciones adaptadas por rango de porcentaje, guardándolas en la BD
 */

import { supabase } from "@/integrations/supabase/client";
import * as instruments from "@/data/instruments";

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

/**
 * Adapta una descripción de dimensión a lenguaje de resultado según el porcentaje
 */
function adaptDescriptionToResult(
  descripcionBase: string,
  porcentaje: number,
  dimensionNombre: string
): string {
  const nombreLower = dimensionNombre.toLowerCase();
  
  // Determinar el tono y enfoque según el tipo de dimensión
  let contexto = "";
  if (nombreLower.includes("productividad") || nombreLower.includes("cumplimiento") || nombreLower.includes("objetivos")) {
    contexto = "productividad";
  } else if (nombreLower.includes("calidad")) {
    contexto = "calidad";
  } else if (nombreLower.includes("competencia") || nombreLower.includes("técnica") || nombreLower.includes("conocimiento")) {
    contexto = "competencia";
  } else if (nombreLower.includes("comportamiento") || nombreLower.includes("actitud") || nombreLower.includes("organizacional")) {
    contexto = "comportamiento";
  } else if (nombreLower.includes("relaciones") || nombreLower.includes("equipo") || nombreLower.includes("comunicación")) {
    contexto = "relaciones";
  } else if (nombreLower.includes("servicio") || nombreLower.includes("atención") || nombreLower.includes("usuario")) {
    contexto = "servicio";
  } else {
    contexto = "general";
  }

  // Adaptar la descripción base eliminando "Evalúa" y convirtiéndola en lenguaje de resultado
  let descripcionAdaptada = descripcionBase
    .replace(/^Evalúa\s+/i, "")
    .replace(/^Esta dimensión evalúa\s+/i, "")
    .replace(/^Grado en que\s+/i, "")
    .replace(/^Nivel de\s+/i, "")
    .replace(/^Conjunto de\s+/i, "")
    .replace(/^Capacidad para\s+/i, "")
    .trim();

  // Generar explicación según rango
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
      default:
        return `Con un ${porcentaje.toFixed(1)}%, esta área requiere atención prioritaria. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} necesita un plan de desarrollo específico.`;
    }
  }
}

/**
 * Genera explicaciones para una dimensión en todos los rangos
 */
function generateExplanationsForDimension(
  dimension: { id: string; nombre: string; descripcion?: string },
  nivel: string
): DimensionExplanation[] {
  if (!dimension.descripcion) {
    console.warn(`Dimensión ${dimension.id} sin descripción`);
    return [];
  }

  const explicaciones: DimensionExplanation[] = [];
  
  // Rangos: <60, 60-74, 75-84, >=85
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

/**
 * Procesa todos los instrumentos y genera explicaciones
 */
export async function generateAllDimensionExplanations(): Promise<void> {
  console.log("🚀 Iniciando generación de explicaciones de dimensiones...");

  const allExplanations: DimensionExplanation[] = [];

  // Procesar cada instrumento
  Object.values(instruments).forEach((instrument: any) => {
    if (!instrument.nivel || !instrument.dimensionesDesempeno) return;

    console.log(`📊 Procesando instrumento ${instrument.nivel}...`);

    instrument.dimensionesDesempeno.forEach((dimension: any) => {
      const explicaciones = generateExplanationsForDimension(
        dimension,
        instrument.nivel
      );
      allExplanations.push(...explicaciones);
    });
  });

  console.log(`✅ Generadas ${allExplanations.length} explicaciones`);

  // Insertar en la base de datos
  try {
    // Primero eliminar explicaciones existentes para regenerar
    const { error: deleteError } = await supabase
      .from("dimension_explanations")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (deleteError) {
      console.warn("⚠️ Error al eliminar explicaciones existentes:", deleteError);
    }

    // Insertar nuevas explicaciones en lotes
    const batchSize = 50;
    for (let i = 0; i < allExplanations.length; i += batchSize) {
      const batch = allExplanations.slice(i, i + batchSize);
      const { error } = await supabase
        .from("dimension_explanations")
        .insert(batch);

      if (error) {
        console.error(`❌ Error insertando lote ${i / batchSize + 1}:`, error);
      } else {
        console.log(`✅ Insertado lote ${i / batchSize + 1} (${batch.length} explicaciones)`);
      }
    }

    console.log("🎉 Proceso completado exitosamente");
  } catch (error) {
    console.error("❌ Error en el proceso:", error);
    throw error;
  }
}

/**
 * Obtiene la explicación para una dimensión específica según nivel y porcentaje
 */
export async function getDimensionExplanation(
  dimensionId: string,
  nivel: string,
  porcentaje: number,
  promedioMunicipal?: number
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("dimension_explanations")
      .select("explicacion, incluye_comparacion")
      .eq("dimension_id", dimensionId)
      .eq("nivel", nivel)
      .eq("activo", true)
      .lte("rango_minimo", porcentaje)
      .gte("rango_maximo", porcentaje)
      .single();

    if (error || !data) {
      console.warn(`No se encontró explicación para ${dimensionId} nivel ${nivel} con ${porcentaje}%`);
      return null;
    }

    let explicacion = data.explicacion;

    // Agregar comparación con promedio municipal si está disponible
    if (data.incluye_comparacion && promedioMunicipal !== undefined && promedioMunicipal > 0) {
      const diferencia = porcentaje - promedioMunicipal;
      if (diferencia > 0) {
        explicacion += ` Estás por encima del promedio municipal (${promedioMunicipal.toFixed(1)}%), lo que indica un desempeño destacado.`;
      } else if (diferencia < 0) {
        explicacion += ` Estás por debajo del promedio municipal (${promedioMunicipal.toFixed(1)}%), lo que indica un área de desarrollo.`;
      } else {
        explicacion += ` Estás alineado con el promedio municipal (${promedioMunicipal.toFixed(1)}%), manteniendo un nivel consistente.`;
      }
    }

    return explicacion;
  } catch (error) {
    console.error("Error obteniendo explicación:", error);
    return null;
  }
}

