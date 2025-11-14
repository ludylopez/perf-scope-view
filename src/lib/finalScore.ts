import { Dimension, FinalScore } from "@/types/evaluation";
import { EvaluationDraft } from "@/lib/storage";
import { calculatePerformanceScore, scoreToPercentage } from "@/lib/calculations";
import { calculatePotencialScore } from "./groupStats";
import { callCalculateFinalResult } from "./backendCalculations";
import { getInstrumentCalculationConfig } from "./instrumentCalculations";

/**
 * Calcula el resultado final ponderado
 * Intenta usar los pesos del instrumento si están disponibles, sino usa 70% jefe + 30% colaborador por defecto
 * Retorna tanto los scores (1-5) como los porcentajes (0-100%)
 */
export const calculateFinalScore = (
  autoevaluacion: EvaluationDraft,
  evaluacionJefe: EvaluationDraft,
  dimensions: Dimension[],
  instrumentId?: string
): FinalScore => {
  // Calcular desempeño de autoevaluación (score 1-5)
  const desempenoAuto = calculatePerformanceScore(autoevaluacion.responses, dimensions);
  
  // Calcular desempeño del jefe (score 1-5)
  const desempenoJefe = calculatePerformanceScore(evaluacionJefe.responses, dimensions);
  
  // Intentar obtener pesos del instrumento si está disponible
  let pesoJefe = 0.7; // Por defecto
  let pesoAuto = 0.3; // Por defecto
  
  if (instrumentId) {
    try {
      const instrumentConfig = getInstrumentCalculationConfig(instrumentId);
      if (instrumentConfig?.pesoJefe && instrumentConfig?.pesoAuto) {
        pesoJefe = instrumentConfig.pesoJefe;
        pesoAuto = instrumentConfig.pesoAuto;
        console.log(`📊 [FinalScore] Usando pesos del instrumento ${instrumentId}:`, { pesoJefe, pesoAuto });
      }
    } catch (error) {
      console.warn(`⚠️ [FinalScore] No se pudo obtener configuración del instrumento ${instrumentId}, usando pesos por defecto`);
    }
  }
  
  // Calcular resultado final ponderado - score 1-5
  const desempenoFinal = Math.round((desempenoJefe * pesoJefe + desempenoAuto * pesoAuto) * 100) / 100;
  
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
 * 
 * Metodología 9-Box estándar:
 * - Desempeño: Bajo (< 50%), Medio (50-75%), Alto (> 75%)
 * - Potencial: Bajo (< 50%), Medio (50-75%), Alto (> 75%)
 * 
 * Retorna la posición como string (ej: "alto-alto", "medio-bajo", etc.)
 */
export const calculateNineBoxPosition = (
  desempenoFinal: number, // Score 1-5
  potencial?: number // Score 1-5
): string => {
  // Convertir scores a porcentajes para calcular 9-box
  const desempenoPorcentaje = scoreToPercentage(desempenoFinal);
  
  if (potencial === undefined || potencial === null) {
    // Si no hay potencial, solo clasificamos por desempeño (usando porcentajes)
    // Esto es para casos donde solo se evaluó desempeño
    if (desempenoPorcentaje > 75) return "alto-medio"; // Alto desempeño, potencial desconocido
    if (desempenoPorcentaje >= 50) return "medio-medio"; // Medio desempeño, potencial desconocido
    return "bajo-medio"; // Bajo desempeño, potencial desconocido
  }
  
  const potencialPorcentaje = scoreToPercentage(potencial);
  
  // Clasificar desempeño usando porcentajes según metodología estándar:
  // Bajo: < 50%, Medio: 50-75%, Alto: > 75%
  const desempenoLevel = desempenoPorcentaje < 50 ? "bajo" : desempenoPorcentaje <= 75 ? "medio" : "alto";
  
  // Clasificar potencial usando porcentajes según metodología estándar:
  // Bajo: < 50%, Medio: 50-75%, Alto: > 75%
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
 * Intenta usar el backend primero, con fallback a cálculo local
 * Retorna scores (1-5) para cálculos internos, pero 9-box se calcula con porcentajes
 */
export const calculateCompleteFinalScore = async (
  autoevaluacion: EvaluationDraft,
  evaluacionJefe: EvaluationDraft,
  dimensions: Dimension[],
  potencialDimensions?: Dimension[],
  useBackend: boolean = true,
  autoevaluacionId?: string,
  evaluacionJefeId?: string,
  instrumentConfig?: any
): Promise<FinalScore> => {
  const logPrefix = "📊 [FinalScore]";
  
  // Validar inputs básicos
  if (!autoevaluacion || !evaluacionJefe || !dimensions || dimensions.length === 0) {
    console.error(`${logPrefix} ❌ Datos inválidos:`, {
      tieneAutoevaluacion: !!autoevaluacion,
      tieneEvaluacionJefe: !!evaluacionJefe,
      numDimensiones: dimensions?.length || 0,
    });
    throw new Error("Datos de evaluación incompletos");
  }

  // Intentar usar backend si tenemos los IDs y la configuración
  if (
    useBackend &&
    autoevaluacionId &&
    evaluacionJefeId &&
    instrumentConfig
  ) {
    console.log(`${logPrefix} Intentando cálculo desde backend...`, {
      autoevaluacionId,
      evaluacionJefeId,
      instrumentId: instrumentConfig?.id || instrumentConfig?.nivel || "desconocido",
      numDimensiones: dimensions.length,
      numPotencialDimensions: potencialDimensions?.length || 0,
    });

    try {
      const backendResult = await callCalculateFinalResult(
        autoevaluacionId,
        evaluacionJefeId,
        instrumentConfig
      );

      if (backendResult) {
        console.log(`${logPrefix} ✅ Resultado obtenido desde backend:`, {
          desempenoFinal: backendResult.desempenoFinal,
          posicion9Box: backendResult.posicion9Box,
        });
        return backendResult;
      } else {
        console.warn(`${logPrefix} ⚠️ Backend retornó null, usando cálculo local como fallback`);
      }
    } catch (error) {
      console.warn(`${logPrefix} ⚠️ Error al calcular en backend, usando cálculo local:`, {
        error: error instanceof Error ? error.message : String(error),
        autoevaluacionId,
        evaluacionJefeId,
      });
    }
  } else {
    const razonFallback = !useBackend 
      ? "useBackend=false" 
      : !autoevaluacionId 
        ? "falta autoevaluacionId" 
        : !evaluacionJefeId 
          ? "falta evaluacionJefeId" 
          : !instrumentConfig 
            ? "falta instrumentConfig" 
            : "desconocido";
    
    console.log(`${logPrefix} Usando cálculo local (${razonFallback})`, {
      useBackend,
      tieneAutoevaluacionId: !!autoevaluacionId,
      tieneEvaluacionJefeId: !!evaluacionJefeId,
      tieneInstrumentConfig: !!instrumentConfig,
    });
  }

  // Fallback a cálculo local
  console.log(`${logPrefix} Calculando localmente...`);
  
  // Intentar obtener el ID del instrumento desde la configuración si está disponible
  const instrumentId = instrumentConfig?.id || instrumentConfig?.nivel;
  
  const resultado = calculateFinalScore(
    autoevaluacion, 
    evaluacionJefe, 
    dimensions,
    instrumentId // Pasar ID del instrumento para usar pesos correctos
  );
  
  // Si hay dimensiones de potencial, calcular correctamente
  if (potencialDimensions && evaluacionJefe.evaluacionPotencial?.responses) {
    resultado.potencial = calculatePotencialScore(
      evaluacionJefe.evaluacionPotencial.responses,
      potencialDimensions
    );
  }
  
  // Calcular 9-box usando los scores (la función internamente los convierte a porcentajes)
  const posicion9Box = calculateNineBoxPosition(resultado.desempenoFinal, resultado.potencial);
  
  const resultadoFinal = {
    ...resultado,
    posicion9Box,
  };

  console.log(`${logPrefix} ✅ Resultado calculado localmente:`, {
    desempenoAuto: resultadoFinal.desempenoAuto,
    desempenoJefe: resultadoFinal.desempenoJefe,
    desempenoFinal: resultadoFinal.desempenoFinal,
    potencial: resultadoFinal.potencial,
    posicion9Box: resultadoFinal.posicion9Box,
  });
  
  return resultadoFinal;
};

