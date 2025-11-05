import { Dimension } from "@/types/evaluation";

export const calculateDimensionAverage = (
  responses: Record<string, number>,
  dimension: Dimension
): number => {
  if (!responses || typeof responses !== 'object') return 0;
  
  const itemResponses = dimension.items
    .map((item) => responses[item.id])
    .filter((value) => value !== undefined);

  if (itemResponses.length === 0) return 0;

  const sum = itemResponses.reduce((acc, val) => acc + val, 0);
  return sum / itemResponses.length;
};

export const calculateDimensionScore = (average: number, peso: number): number => {
  return average * peso;
};

export const calculatePerformanceScore = (
  responses: Record<string, number>,
  dimensions: Dimension[]
): number => {
  if (!responses || typeof responses !== 'object') return 0;
  
  let totalScore = 0;

  for (const dimension of dimensions) {
    const avg = calculateDimensionAverage(responses, dimension);
    totalScore += calculateDimensionScore(avg, dimension.peso);
  }

  return Math.round(totalScore * 100) / 100;
};

export const getIncompleteDimensions = (
  responses: Record<string, number>,
  dimensions: Dimension[]
): Dimension[] => {
  if (!responses || typeof responses !== 'object') return dimensions;
  
  return dimensions.filter((dim) =>
    dim.items.some((item) => responses[item.id] === undefined)
  );
};

export const isEvaluationComplete = (
  responses: Record<string, number>,
  dimensions: Dimension[]
): boolean => {
  if (!responses || typeof responses !== 'object') return false;
  
  return dimensions.every((dim) =>
    dim.items.every((item) => {
      const value = responses[item.id];
      // Verificar que el valor existe y está en el rango válido (1-5)
      return value !== undefined && value !== null && value >= 1 && value <= 5;
    })
  );
};

export const getDimensionProgress = (
  responses: Record<string, number>,
  dimension: Dimension
): { answered: number; total: number; percentage: number } => {
  if (!responses || typeof responses !== 'object') {
    return { answered: 0, total: dimension.items.length, percentage: 0 };
  }
  
  const total = dimension.items.length;
  const answered = dimension.items.filter(
    (item) => responses[item.id] !== undefined
  ).length;
  const percentage = Math.round((answered / total) * 100);

  return { answered, total, percentage };
};

// Convertir puntaje Likert (1-5) a porcentaje (0-100%)
export const scoreToPercentage = (score: number): number => {
  // Escala 1-5 → 0-100%
  // 1 = 0%, 2 = 25%, 3 = 50%, 4 = 75%, 5 = 100%
  return Math.round(((score - 1) / 4) * 100);
};

// Calcular porcentaje por dimensión
export const calculateDimensionPercentage = (
  responses: Record<string, number>,
  dimension: Dimension
): number => {
  const avg = calculateDimensionAverage(responses, dimension);
  return scoreToPercentage(avg);
};
