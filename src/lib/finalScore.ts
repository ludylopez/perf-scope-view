import { Dimension, FinalScore } from "@/types/evaluation";
import { EvaluationDraft } from "@/lib/storage";
import { calculatePerformanceScore, scoreToPercentage } from "@/lib/calculations";
import { calculatePotencialScore } from "./groupStats";

/**
 * Calcula el resultado final ponderado: 70% jefe + 30% colaborador
 * Retorna tanto los scores (1-5) como los porcentajes (0-100%)
 */
export const calculateFinalScore = (
  autoevaluacion: EvaluationDraft,
  evaluacionJefe: EvaluationDraft,
  dimensions: Dimension[]
): FinalScore => {
  // Calcular desempeño de autoevaluación (score 1-5)
  const desempenoAuto = calculatePerformanceScore(autoevaluacion.responses, dimensions);
  
  // Calcular desempeño del jefe (score 1-5)
  const desempenoJefe = calculatePerformanceScore(evaluacionJefe.responses, dimensions);
  
  // Calcular resultado final ponderado (70% jefe + 30% colaborador) - score 1-5
  const desempenoFinal = Math.round((desempenoJefe * 0.7 + desempenoAuto * 0.3) * 100) / 100;
  
  // Calcular potencial (solo del jefe) - score 1-5
  let potencial: number | undefined;
  if (evaluacionJefe.evaluacionPotencial?.responses) {
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
 * Calcula la posición en la matriz 9-box basado en desempeño y potencial (usando porcentajes)
 * Retorna la posición como string (ej: "alto-alto", "medio-bajo", etc.)
 */
export const calculateNineBoxPosition = (
  desempenoFinal: number, // Score 1-5
  potencial?: number // Score 1-5
): string => {
  // Convertir scores a porcentajes para calcular 9-box
  const desempenoPorcentaje = scoreToPercentage(desempenoFinal);
  
  if (potencial === undefined) {
    // Si no hay potencial, solo clasificamos por desempeño (usando porcentajes)
    if (desempenoPorcentaje >= 87.5) return "alto-alto"; // >= 4.5
    if (desempenoPorcentaje >= 62.5) return "medio-alto"; // >= 3.5
    if (desempenoPorcentaje >= 37.5) return "medio-medio"; // >= 2.5
    return "bajo-medio";
  }
  
  const potencialPorcentaje = scoreToPercentage(potencial);
  
  // Clasificar desempeño usando porcentajes: bajo (< 50%), medio (50-75%), alto (> 75%)
  const desempenoLevel = desempenoPorcentaje < 50 ? "bajo" : desempenoPorcentaje <= 75 ? "medio" : "alto";
  
  // Clasificar potencial usando porcentajes: bajo (< 50%), medio (50-75%), alto (> 75%)
  const potencialLevel = potencialPorcentaje < 50 ? "bajo" : potencialPorcentaje <= 75 ? "medio" : "alto";
  
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
 * Retorna scores (1-5) para cálculos internos, pero 9-box se calcula con porcentajes
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
  
  // Calcular 9-box usando los scores (la función internamente los convierte a porcentajes)
  const posicion9Box = calculateNineBoxPosition(resultado.desempenoFinal, resultado.potencial);
  
  return {
    ...resultado,
    posicion9Box,
  };
};

