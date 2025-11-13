import { EvaluationDraft } from "@/lib/storage";
import { Dimension, FinalScore } from "@/types/evaluation";
import { DevelopmentPlan } from "@/types/evaluation";
import { generateAIAnalysis } from "./openai";
import { scoreToPercentage } from "./calculations";

/**
 * Genera un plan de desarrollo personalizado usando IA (OpenAI)
 * NOTA: Esta función es legacy. El sistema actual usa edge functions directamente.
 */
export const generateDevelopmentPlan = async (
  colaboradorId: string,
  periodoId: string,
  autoevaluacion: EvaluationDraft,
  evaluacionJefe: EvaluationDraft,
  resultadoFinal: FinalScore,
  dimensions: Dimension[],
  potencialDimensions?: Dimension[],
  generarFeedbackGrupal: boolean = false
): Promise<DevelopmentPlan | null> => {
  try {
    // Construir contexto de la evaluación
    const contexto = buildEvaluationContext(
      autoevaluacion,
      evaluacionJefe,
      resultadoFinal,
      dimensions,
      potencialDimensions
    );

    // Generar prompts separados (system y user)
    const systemPrompt = `Eres un experto en Recursos Humanos y Desarrollo Organizacional del sector público guatemalteco, especializado en la gestión municipal. Tu tarea es generar un Plan de Desarrollo Individual CONCRETO, PRÁCTICO y PRIORIZADO para colaboradores de la Municipalidad de Esquipulas, Chiquimula.

Genera un Plan de Desarrollo COMPLETO y ESTRUCTURADO en formato JSON con la siguiente estructura:
{
  "competenciasDesarrollar": [
    {
      "competencia": "Nombre de la competencia",
      "nivelActual": número (1-5),
      "nivelObjetivo": número (1-5),
      "acciones": ["acción 1", "acción 2", "acción 3"],
      "plazo": "Descripción del plazo (ej: '3 meses', '6 meses')"
    }
  ],
  "recomendaciones": ["Recomendación general 1", "Recomendación general 2", ...]
}

⚠️ IMPORTANTE: NO incluyas feedbackIndividual ni feedbackGrupal en el JSON. Solo genera competenciasDesarrollar y recomendaciones.

Responde ÚNICAMENTE con el JSON, sin texto adicional antes o después.`;

    const userPrompt = buildDevelopmentPlanPrompt(contexto, generarFeedbackGrupal);

    // Llamar a OpenAI API usando la función centralizada que registra uso
    // La función generateAIAnalysis maneja internamente la verificación de API key
    const generatedText = await generateAIAnalysis(systemPrompt, userPrompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      maxTokens: 8000,
      responseFormat: "json_object"
    });

    // Parsear la respuesta de OpenAI
    const plan = parseOpenAIResponse(generatedText, colaboradorId, periodoId, evaluacionJefe.usuarioId || "");

    return plan;
  } catch (error) {
    console.error("Error generating development plan:", error);
    // Retornar un plan básico si falla la IA
    return generateBasicDevelopmentPlan(
      colaboradorId,
      periodoId,
      resultadoFinal,
      dimensions
    );
  }
};

/**
 * Construye el contexto de evaluación para el prompt
 */
const buildEvaluationContext = (
  autoevaluacion: EvaluationDraft,
  evaluacionJefe: EvaluationDraft,
  resultadoFinal: FinalScore,
  dimensions: Dimension[],
  potencialDimensions?: Dimension[]
): string => {
  let contexto = "CONTEXTO DE EVALUACIÓN:\n\n";
  
  contexto += `RESULTADO FINAL:\n`;
  contexto += `- Desempeño Autoevaluación: ${scoreToPercentage(resultadoFinal.desempenoAuto)}%\n`;
  contexto += `- Desempeño Evaluación Jefe: ${scoreToPercentage(resultadoFinal.desempenoJefe)}%\n`;
  contexto += `- Desempeño Final (ponderado): ${scoreToPercentage(resultadoFinal.desempenoFinal)}%\n`;
  if (resultadoFinal.potencial) {
    contexto += `- Potencial: ${scoreToPercentage(resultadoFinal.potencial)}%\n`;
  }
  if (resultadoFinal.posicion9Box) {
    contexto += `- Posición 9-Box: ${resultadoFinal.posicion9Box}\n`;
  }
  
  contexto += `\nCOMPARATIVO POR DIMENSIÓN:\n`;
  dimensions.forEach((dim, idx) => {
    const autoItems = dim.items.map(item => autoevaluacion.responses[item.id]).filter(v => v !== undefined);
    const jefeItems = dim.items.map(item => evaluacionJefe.responses[item.id]).filter(v => v !== undefined);
    
    const autoAvg = autoItems.length > 0 ? autoItems.reduce((sum, val) => sum + val, 0) / autoItems.length : 0;
    const jefeAvg = jefeItems.length > 0 ? jefeItems.reduce((sum, val) => sum + val, 0) / jefeItems.length : 0;
    const diferenciaAbsoluta = jefeAvg - autoAvg;
    const diferenciaPorcentaje = scoreToPercentage(jefeAvg) - scoreToPercentage(autoAvg);

    contexto += `${idx + 1}. ${dim.nombre}: Auto=${scoreToPercentage(autoAvg)}%, Jefe=${scoreToPercentage(jefeAvg)}%, Diferencia=${diferenciaPorcentaje > 0 ? '+' : ''}${diferenciaPorcentaje}%\n`;
    
    if (autoevaluacion.comments[dim.id]) {
      contexto += `   Comentarios colaborador: ${autoevaluacion.comments[dim.id].substring(0, 100)}...\n`;
    }
    if (evaluacionJefe.comments[dim.id]) {
      contexto += `   Comentarios jefe: ${evaluacionJefe.comments[dim.id].substring(0, 100)}...\n`;
    }
  });

  if (potencialDimensions && evaluacionJefe.evaluacionPotencial) {
    contexto += `\nEVALUACIÓN DE POTENCIAL:\n`;
    potencialDimensions.forEach((dim, idx) => {
      const items = dim.items.map(item => evaluacionJefe.evaluacionPotencial?.responses[item.id]).filter(v => v !== undefined);
      const avg = items.length > 0 ? items.reduce((sum: number, val: any) => sum + val, 0) / items.length : 0;
      contexto += `${idx + 1}. ${dim.nombre}: ${scoreToPercentage(avg)}%\n`;
    });
  }

  return contexto;
};

/**
 * Construye el user prompt con datos específicos de la evaluación
 */
const buildDevelopmentPlanPrompt = (contexto: string, generarFeedbackGrupal: boolean = false): string => {
  return `Datos específicos de la evaluación:

${contexto}

Genera un PLAN DE DESARROLLO PERSONALIZADO basado en estos datos. El plan debe incluir:
- 3-5 competencias clave para desarrollar basándote en las brechas encontradas
- Acciones concretas y realistas para cada competencia
- Recomendaciones generales

⚠️ IMPORTANTE: NO incluyas feedbackIndividual ni feedbackGrupal. Solo genera competenciasDesarrollar y recomendaciones.

Usa un lenguaje claro y profesional, sin jerga técnica. Considera el contexto del sector público guatemalteco. Todo el texto debe estar en español.`;
};

/**
 * Parsea la respuesta de OpenAI a un DevelopmentPlan
 */
const parseOpenAIResponse = (
  generatedText: string,
  colaboradorId: string,
  periodoId: string,
  evaluacionId: string
): DevelopmentPlan => {
  try {
    // Intentar extraer JSON del texto
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // El plan puede venir en formato nuevo (objetivos, acciones, dimensionesDebiles, recomendaciones)
    // o formato legacy (competenciasDesarrollar)
    const planEstructurado = parsed.objetivos || parsed.acciones || parsed.dimensionesDebiles
      ? {
          objetivos: parsed.objetivos || [],
          acciones: parsed.acciones || [],
          dimensionesDebiles: parsed.dimensionesDebiles || [],
        }
      : undefined;

    return {
      id: crypto.randomUUID(),
      evaluacionId,
      colaboradorId,
      periodoId,
      competenciasDesarrollar: parsed.competenciasDesarrollar || parsed.objetivos || [],
      planEstructurado: planEstructurado,
      recomendaciones: parsed.recomendaciones || [],
      feedbackIndividual: "", // No se genera aquí, se genera por separado
      feedbackGrupal: null, // No se genera aquí, se genera por separado
      editable: true,
      fechaCreacion: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error parsing OpenAI response:", error);
    throw error;
  }
};

/**
 * Genera un plan de desarrollo básico si falla la IA
 */
const generateBasicDevelopmentPlan = (
  colaboradorId: string,
  periodoId: string,
  resultadoFinal: FinalScore,
  dimensions: Dimension[]
): DevelopmentPlan => {
  const objetivos = dimensions.slice(0, 3).map((dim) => 
    `Mejorar competencia en ${dim.nombre}`
  );

  return {
    id: crypto.randomUUID(),
    evaluacionId: "",
    colaboradorId,
    periodoId,
    competenciasDesarrollar: objetivos,
    feedbackIndividual: `Su desempeño general es de ${scoreToPercentage(resultadoFinal.desempenoFinal)}%. Se recomienda continuar desarrollando las competencias identificadas para alcanzar un nivel superior.`,
    editable: true,
    fechaCreacion: new Date().toISOString(),
  };
};

