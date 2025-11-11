import { EvaluationDraft } from "@/lib/storage";
import { Dimension, FinalScore } from "@/types/evaluation";
import { DevelopmentPlan } from "@/types/evaluation";
import { generateAIAnalysis } from "./gemini";
import { scoreToPercentage } from "./calculations";

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

    // Generar prompt para Gemini
    const prompt = buildDevelopmentPlanPrompt(contexto, generarFeedbackGrupal);

    // Llamar a Gemini API usando la función centralizada que registra uso
    // La función generateAIAnalysis maneja internamente la verificación de API key
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
 * Construye el prompt para Gemini
 */
const buildDevelopmentPlanPrompt = (contexto: string, generarFeedbackGrupal: boolean = false): string => {
  const instruccionesFeedbackGrupal = generarFeedbackGrupal 
    ? `\n7. Si el colaborador pertenece a una cuadrilla, genera un feedback grupal adicional que:
   - Se enfoque en el desempeño colectivo del equipo
   - Identifique fortalezas y áreas de mejora a nivel grupal
   - Proponga acciones de desarrollo para toda la cuadrilla
   - Sea apropiado para ser compartido en una sesión grupal de feedback`
    : "";

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
  "feedbackGrupal": "${generarFeedbackGrupal ? "Texto de feedback grupal para toda la cuadrilla, máximo 300 palabras, enfocado en el desempeño colectivo" : null}"
}

INSTRUCCIONES:
1. Identifica 3-5 competencias clave para desarrollar basándote en las brechas encontradas
2. El feedback individual debe ser constructivo, específico y accionable
3. Usa un lenguaje claro y profesional, sin jerga técnica
4. Considera el contexto del sector público guatemalteco
5. Las acciones deben ser concretas y realistas
6. Todo el texto debe estar en español${instruccionesFeedbackGrupal}

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

