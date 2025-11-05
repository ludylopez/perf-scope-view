import { Dimension } from "@/types/evaluation";
import { calculatePerformanceScore } from "@/lib/calculations";

/**
 * Calcula el potencial usando las dimensiones de potencial
 */
export const calculatePotencialScore = (
  potencialResponses: Record<string, number>,
  potencialDimensions: Dimension[]
): number => {
  return calculatePerformanceScore(potencialResponses, potencialDimensions);
};

/**
 * Calcula estadísticas grupales para un conjunto de colaboradores
 */
export interface GroupStats {
  totalMiembros: number;
  evaluacionesCompletadas: number;
  promedioDesempeno: number;
  promedioPotencial: number;
  distribucion9Box: Record<string, number>;
}

export const calculateGroupStats = (
  resultadosFinales: Array<{
    desempenoFinal: number;
    potencial?: number;
    posicion9Box?: string;
  }>
): GroupStats => {
  const totalMiembros = resultadosFinales.length;
  const evaluacionesCompletadas = resultadosFinales.length;
  
  const promedioDesempeno = totalMiembros > 0
    ? resultadosFinales.reduce((sum, r) => sum + r.desempenoFinal, 0) / totalMiembros
    : 0;
  
  const potenciales = resultadosFinales
    .map(r => r.potencial)
    .filter((p): p is number => p !== undefined);
  
  const promedioPotencial = potenciales.length > 0
    ? potenciales.reduce((sum, p) => sum + p, 0) / potenciales.length
    : 0;
  
  // Distribución 9-box
  const distribucion9Box: Record<string, number> = {
    "alto-alto": 0,
    "alto-medio": 0,
    "alto-bajo": 0,
    "medio-alto": 0,
    "medio-medio": 0,
    "medio-bajo": 0,
    "bajo-alto": 0,
    "bajo-medio": 0,
    "bajo-bajo": 0,
  };
  
  resultadosFinales.forEach(r => {
    if (r.posicion9Box) {
      distribucion9Box[r.posicion9Box] = (distribucion9Box[r.posicion9Box] || 0) + 1;
    }
  });
  
  return {
    totalMiembros,
    evaluacionesCompletadas,
    promedioDesempeno: Math.round(promedioDesempeno * 100) / 100,
    promedioPotencial: Math.round(promedioPotencial * 100) / 100,
    distribucion9Box,
  };
};

