import { Dimension, FinalScore } from "@/types/evaluation";
import { EvaluationDraft } from "@/lib/storage";
import { calculatePerformanceScore } from "@/lib/calculations";
import { calculatePotencialScore } from "./groupStats";

/**
 * Calcula el resultado final ponderado: 70% jefe + 30% colaborador
 */
export const calculateFinalScore = (
  autoevaluacion: EvaluationDraft,
  evaluacionJefe: EvaluationDraft,
  dimensions: Dimension[]
): FinalScore => {
  // Calcular desempeño de autoevaluación
  const desempenoAuto = calculatePerformanceScore(autoevaluacion.responses, dimensions);
  
  // Calcular desempeño del jefe
  const desempenoJefe = calculatePerformanceScore(evaluacionJefe.responses, dimensions);
  
  // Calcular resultado final ponderado (70% jefe + 30% colaborador)
  const desempenoFinal = Math.round((desempenoJefe * 0.7 + desempenoAuto * 0.3) * 100) / 100;
  
  // Calcular potencial (solo del jefe)
  let potencial: number | undefined;
  if (evaluacionJefe.evaluacionPotencial?.responses) {
    // Por ahora usamos un cálculo simple, se puede mejorar pasando dimensiones específicas
    const potencialResponses = evaluacionJefe.evaluacionPotencial.responses;
    const valores = Object.values(potencialResponses).filter(v => v !== undefined) as number[];
    if (valores.length > 0) {
      const promedio = valores.reduce((sum, val) => sum + val, 0) / valores.length;
      potencial = Math.round(promedio * 100) / 100;
    }
  }
  
  return {
    desempenoAuto,
    desempenoJefe,
    desempenoFinal,
    potencial,
  };
};

/**
 * Calcula la posición en la matriz 9-box basado en desempeño y potencial
 * Retorna la posición como string (ej: "alto-alto", "medio-bajo", etc.)
 */
export const calculateNineBoxPosition = (
  desempenoFinal: number,
  potencial?: number
): string => {
  if (potencial === undefined) {
    // Si no hay potencial, solo clasificamos por desempeño
    if (desempenoFinal >= 4.5) return "alto-alto";
    if (desempenoFinal >= 3.5) return "medio-alto";
    if (desempenoFinal >= 2.5) return "medio-medio";
    return "bajo-medio";
  }
  
  // Clasificar desempeño: bajo (< 3), medio (3-4), alto (> 4)
  const desempenoLevel = desempenoFinal < 3 ? "bajo" : desempenoFinal <= 4 ? "medio" : "alto";
  
  // Clasificar potencial: bajo (< 3), medio (3-4), alto (> 4)
  const potencialLevel = potencial < 3 ? "bajo" : potencial <= 4 ? "medio" : "alto";
  
  return `${desempenoLevel}-${potencialLevel}`;
};

/**
 * Obtiene la descripción de la posición 9-box en español
 */
export const getNineBoxDescription = (posicion: string): string => {
  const descriptions: Record<string, string> = {
    "alto-alto": "Alto Desempeño - Alto Potencial",
    "alto-medio": "Alto Desempeño - Medio Potencial",
    "alto-bajo": "Alto Desempeño - Bajo Potencial",
    "medio-alto": "Medio Desempeño - Alto Potencial",
    "medio-medio": "Medio Desempeño - Medio Potencial",
    "medio-bajo": "Medio Desempeño - Bajo Potencial",
    "bajo-alto": "Bajo Desempeño - Alto Potencial",
    "bajo-medio": "Bajo Desempeño - Medio Potencial",
    "bajo-bajo": "Bajo Desempeño - Bajo Potencial",
  };
  
  return descriptions[posicion] || posicion;
};

/**
 * Calcula el resultado final completo incluyendo 9-box
 */
export const calculateCompleteFinalScore = (
  autoevaluacion: EvaluationDraft,
  evaluacionJefe: EvaluationDraft,
  dimensions: Dimension[],
  potencialDimensions?: Dimension[]
): FinalScore => {
  const resultado = calculateFinalScore(autoevaluacion, evaluacionJefe, dimensions);
  
  // Si hay dimensiones de potencial, calcular correctamente
  if (potencialDimensions && evaluacionJefe.evaluacionPotencial?.responses) {
    resultado.potencial = calculatePotencialScore(
      evaluacionJefe.evaluacionPotencial.responses,
      potencialDimensions
    );
  }
  
  const posicion9Box = calculateNineBoxPosition(resultado.desempenoFinal, resultado.potencial);
  
  return {
    ...resultado,
    posicion9Box,
  };
};

