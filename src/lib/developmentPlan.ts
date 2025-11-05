import { EvaluationDraft } from "@/lib/storage";
import { Dimension, FinalScore } from "@/types/evaluation";
import { DevelopmentPlan } from "@/types/evaluation";
import { getGeminiApiKey } from "./gemini";

/**
 * Genera un plan de desarrollo personalizado usando IA (Google Gemini)
 */
export const generateDevelopmentPlan = async (
  colaboradorId: string,
  periodoId: string,
  autoevaluacion: EvaluationDraft,
  evaluacionJefe: EvaluationDraft,
  resultadoFinal: FinalScore,
  dimensions: Dimension[],
  potencialDimensions?: Dimension[]
): Promise<DevelopmentPlan | null> => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    console.warn("No API key found for Gemini. Skipping AI generation.");
    return null;
  }

  try {
    // Construir contexto de la evaluación
    const contexto = buildEvaluationContext(
      autoevaluacion,
      evaluacionJefe,
      resultadoFinal,
      dimensions,
      potencialDimensions
    );

    // Generar prompt para Gemini
    const prompt = buildDevelopmentPlanPrompt(contexto);

    // Llamar a Gemini API usando la función centralizada que registra uso
    const { generateAIAnalysis } = await import("./gemini");
    const generatedText = await generateAIAnalysis(prompt);

    // Parsear la respuesta de Gemini
    const plan = parseGeminiResponse(generatedText, colaboradorId, periodoId, evaluacionJefe.usuarioId || "");

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
  contexto += `- Desempeño Autoevaluación: ${scoreToPercentage(resultadoFinal.desempenoAuto)}% (${resultadoFinal.desempenoAuto.toFixed(2)}/5.0)\n`;
  contexto += `- Desempeño Evaluación Jefe: ${scoreToPercentage(resultadoFinal.desempenoJefe)}% (${resultadoFinal.desempenoJefe.toFixed(2)}/5.0)\n`;
  contexto += `- Desempeño Final (ponderado): ${scoreToPercentage(resultadoFinal.desempenoFinal)}% (${resultadoFinal.desempenoFinal.toFixed(2)}/5.0)\n`;
  if (resultadoFinal.potencial) {
    contexto += `- Potencial: ${scoreToPercentage(resultadoFinal.potencial)}% (${resultadoFinal.potencial.toFixed(2)}/5.0)\n`;
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
    const diferencia = jefeAvg - autoAvg;
    
    contexto += `${idx + 1}. ${dim.nombre}: Auto=${scoreToPercentage(autoAvg)}% (${autoAvg.toFixed(2)}/5.0), Jefe=${scoreToPercentage(jefeAvg)}% (${jefeAvg.toFixed(2)}/5.0), Dif=${diferencia > 0 ? '+' : ''}${diferencia.toFixed(2)}\n`;
    
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
      contexto += `${idx + 1}. ${dim.nombre}: ${scoreToPercentage(avg)}% (${avg.toFixed(2)}/5.0)\n`;
    });
  }

  return contexto;
};

/**
 * Construye el prompt para Gemini
 */
const buildDevelopmentPlanPrompt = (contexto: string): string => {
  return `Eres un experto en desarrollo de talento y gestión de recursos humanos en el sector público guatemalteco.

${contexto}

Genera un PLAN DE DESARROLLO PERSONALIZADO en formato JSON con la siguiente estructura:

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
  "feedbackIndividual": "Texto completo de feedback personalizado para el colaborador, máximo 500 palabras, en español, sin tecnicismos ni palabras en inglés",
  "feedbackGrupal": "Texto opcional de feedback grupal si aplica, máximo 300 palabras"
}

INSTRUCCIONES:
1. Identifica 3-5 competencias clave para desarrollar basándote en las brechas encontradas
2. El feedback debe ser constructivo, específico y accionable
3. Usa un lenguaje claro y profesional, sin jerga técnica
4. Considera el contexto del sector público guatemalteco
5. Las acciones deben ser concretas y realistas
6. Todo el texto debe estar en español

Responde SOLO con el JSON, sin texto adicional.`;
};

/**
 * Parsea la respuesta de Gemini a un DevelopmentPlan
 */
const parseGeminiResponse = (
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

    return {
      id: crypto.randomUUID(),
      evaluacionId,
      colaboradorId,
      periodoId,
      competenciasDesarrollar: parsed.competenciasDesarrollar || [],
      feedbackIndividual: parsed.feedbackIndividual || "",
      feedbackGrupal: parsed.feedbackGrupal,
      editable: true,
      fechaCreacion: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error parsing Gemini response:", error);
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
  const competenciasDesarrollar = dimensions.slice(0, 3).map((dim, idx) => ({
    competencia: dim.nombre,
    nivelActual: Math.round(resultadoFinal.desempenoFinal * 10) / 10,
    nivelObjetivo: Math.min(5, Math.round(resultadoFinal.desempenoFinal * 10) / 10 + 0.5),
    acciones: [
      `Participar en capacitaciones específicas sobre ${dim.nombre.toLowerCase()}`,
      `Aplicar conocimientos en proyectos asignados`,
      `Buscar retroalimentación constante del jefe inmediato`,
    ],
    plazo: "6 meses",
  }));

  return {
    id: crypto.randomUUID(),
    evaluacionId: "",
    colaboradorId,
    periodoId,
    competenciasDesarrollar,
    feedbackIndividual: `Su desempeño general es de ${scoreToPercentage(resultadoFinal.desempenoFinal)}% (${resultadoFinal.desempenoFinal.toFixed(2)}/5.0). Se recomienda continuar desarrollando las competencias identificadas para alcanzar un nivel superior.`,
    editable: true,
    fechaCreacion: new Date().toISOString(),
  };
};

