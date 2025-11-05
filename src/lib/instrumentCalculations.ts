import { Instrument } from "@/types/evaluation";

/**
 * Configuración de cálculo para cada instrumento
 * Cada instrumento puede tener su propia lógica de cálculo
 */
export interface InstrumentCalculationConfig {
  instrumentId: string;
  nivel: string;
  
  // Método de cálculo del desempeño
  calcularDesempeno: (
    responses: Record<string, number>,
    dimensions: any[]
  ) => number;
  
  // Método de cálculo del potencial
  calcularPotencial: (
    potencialResponses: Record<string, number>,
    potencialDimensions: any[]
  ) => number;
  
  // Método de cálculo de resultado final (pesos personalizados)
  calcularResultadoFinal: (
    desempenoAuto: number,
    desempenoJefe: number,
    potencial?: number
  ) => {
    desempenoFinal: number;
    potencial?: number;
  };
  
  // Configuración de pesos para resultado final (por defecto 70/30)
  pesoJefe?: number;
  pesoAuto?: number;
  
  // Configuración de 9-box personalizada
  thresholds9Box?: {
    desempeno: { bajo: number; medio: number; alto: number };
    potencial: { bajo: number; medio: number; alto: number };
  };
}

/**
 * Configuraciones de cálculo por instrumento
 * Cada uno de los 11 instrumentos puede tener su configuración
 */
export const INSTRUMENT_CALCULATION_CONFIGS: Record<string, InstrumentCalculationConfig> = {
  // Instrumento A1 - Configuración por defecto
  A1: {
    instrumentId: "A1",
    nivel: "A1",
    calcularDesempeno: (responses, dimensions) => {
      // Cálculo estándar con pesos
      let totalScore = 0;
      for (const dimension of dimensions) {
        const itemResponses = dimension.items
          .map((item: any) => responses[item.id])
          .filter((v: any) => v !== undefined);
        if (itemResponses.length === 0) continue;
        
        const avg = itemResponses.reduce((sum: number, val: number) => sum + val, 0) / itemResponses.length;
        totalScore += avg * dimension.peso;
      }
      return Math.round(totalScore * 100) / 100;
    },
    calcularPotencial: (potencialResponses, potencialDimensions) => {
      let totalScore = 0;
      for (const dimension of potencialDimensions) {
        const itemResponses = dimension.items
          .map((item: any) => potencialResponses[item.id])
          .filter((v: any) => v !== undefined);
        if (itemResponses.length === 0) continue;
        
        const avg = itemResponses.reduce((sum: number, val: number) => sum + val, 0) / itemResponses.length;
        totalScore += avg * dimension.peso;
      }
      return Math.round(totalScore * 100) / 100;
    },
    calcularResultadoFinal: (desempenoAuto, desempenoJefe, potencial) => {
      const desempenoFinal = Math.round((desempenoJefe * 0.7 + desempenoAuto * 0.3) * 100) / 100;
      return { desempenoFinal, potencial };
    },
    pesoJefe: 0.7,
    pesoAuto: 0.3,
    thresholds9Box: {
      desempeno: { bajo: 3, medio: 4, alto: 4.5 },
      potencial: { bajo: 3, medio: 4, alto: 4.5 },
    },
  },
  
  // Se pueden agregar más instrumentos aquí
  // A2: { ... },
  // S1: { ... },
  // etc.
};

/**
 * Obtiene la configuración de cálculo para un instrumento
 */
export const getInstrumentCalculationConfig = (
  instrumentId: string
): InstrumentCalculationConfig => {
  return INSTRUMENT_CALCULATION_CONFIGS[instrumentId] || INSTRUMENT_CALCULATION_CONFIGS.A1;
};

/**
 * Calcula el resultado final usando la configuración específica del instrumento
 */
export const calculateFinalScoreWithInstrument = (
  instrumentId: string,
  autoevaluacion: any,
  evaluacionJefe: any,
  dimensions: any[],
  potencialDimensions?: any[]
) => {
  const config = getInstrumentCalculationConfig(instrumentId);
  
  const desempenoAuto = config.calcularDesempeno(autoevaluacion.responses, dimensions);
  const desempenoJefe = config.calcularDesempeno(evaluacionJefe.responses, dimensions);
  
  let potencial: number | undefined;
  if (potencialDimensions && evaluacionJefe.evaluacionPotencial?.responses) {
    potencial = config.calcularPotencial(
      evaluacionJefe.evaluacionPotencial.responses,
      potencialDimensions
    );
  }
  
  const resultado = config.calcularResultadoFinal(desempenoAuto, desempenoJefe, potencial);
  
  return {
    ...resultado,
    desempenoAuto,
    desempenoJefe,
  };
};

/**
 * Calcula la posición 9-box usando los thresholds específicos del instrumento
 */
export const calculateNineBoxWithInstrument = (
  instrumentId: string,
  desempenoFinal: number,
  potencial?: number
): string => {
  const config = getInstrumentCalculationConfig(instrumentId);
  const thresholds = config.thresholds9Box || {
    desempeno: { bajo: 3, medio: 4, alto: 4.5 },
    potencial: { bajo: 3, medio: 4, alto: 4.5 },
  };
  
  if (potencial === undefined) {
    if (desempenoFinal >= thresholds.desempeno.alto) return "alto-alto";
    if (desempenoFinal >= thresholds.desempeno.medio) return "medio-alto";
    if (desempenoFinal >= thresholds.desempeno.bajo) return "medio-medio";
    return "bajo-medio";
  }
  
  const desempenoLevel = 
    desempenoFinal < thresholds.desempeno.bajo ? "bajo" :
    desempenoFinal <= thresholds.desempeno.medio ? "medio" : "alto";
  
  const potencialLevel = 
    potencial < thresholds.potencial.bajo ? "bajo" :
    potencial <= thresholds.potencial.medio ? "medio" : "alto";
  
  return `${desempenoLevel}-${potencialLevel}`;
};

