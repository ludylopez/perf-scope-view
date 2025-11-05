import { Dimension } from "@/types/evaluation";

export const calculateDimensionAverage = (
  responses: Record<string, number>,
  dimension: Dimension
): number => {
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
  return dimensions.filter((dim) =>
    dim.items.some((item) => responses[item.id] === undefined)
  );
};

export const isEvaluationComplete = (
  responses: Record<string, number>,
  dimensions: Dimension[]
): boolean => {
  return dimensions.every((dim) =>
    dim.items.every((item) => responses[item.id] !== undefined)
  );
};

export const getDimensionProgress = (
  responses: Record<string, number>,
  dimension: Dimension
): { answered: number; total: number; percentage: number } => {
  const total = dimension.items.length;
  const answered = dimension.items.filter(
    (item) => responses[item.id] !== undefined
  ).length;
  const percentage = Math.round((answered / total) * 100);

  return { answered, total, percentage };
};
