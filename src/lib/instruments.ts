import { Instrument } from "@/types/evaluation";
import { INSTRUMENT_A1 } from "@/data/instruments";
import { InstrumentCalculationConfig, getInstrumentCalculationConfig } from "./instrumentCalculations";

const INSTRUMENTS: Record<string, Instrument> = {
  A1: INSTRUMENT_A1,
  // Se pueden agregar más instrumentos aquí cuando estén disponibles
  // A2: INSTRUMENT_A2,
  // S1: INSTRUMENT_S1,
  // E1: INSTRUMENT_E1,
  // E2: INSTRUMENT_E2,
  // etc.
};

/**
 * Obtiene el instrumento asignado a un usuario según su nivel
 * Si el usuario tiene un override manual, se usa ese
 */
export const getInstrumentForUser = async (
  nivel: string,
  overrideInstrumentId?: string
): Promise<Instrument | null> => {
  // Si hay override manual, usar ese
  if (overrideInstrumentId && INSTRUMENTS[overrideInstrumentId]) {
    return INSTRUMENTS[overrideInstrumentId];
  }
  
  // Asignación automática por nivel
  // Buscar instrumento que coincida con el nivel del usuario
  const instrumentKey = Object.keys(INSTRUMENTS).find(key => {
    const instrument = INSTRUMENTS[key];
    return instrument.nivel === nivel || instrument.nivel.startsWith(nivel.charAt(0));
  });
  
  if (instrumentKey && INSTRUMENTS[instrumentKey]) {
    return INSTRUMENTS[instrumentKey];
  }
  
  // Fallback: usar el primer instrumento disponible (A1 por defecto)
  return INSTRUMENTS.A1 || null;
};

/**
 * Obtiene todos los instrumentos disponibles
 */
export const getAllInstruments = (): Record<string, Instrument> => {
  return INSTRUMENTS;
};

/**
 * Obtiene instrumentos por nivel
 */
export const getInstrumentsByLevel = (nivel: string): Instrument[] => {
  return Object.values(INSTRUMENTS).filter(instrument => 
    instrument.nivel === nivel || instrument.nivel.startsWith(nivel.charAt(0))
  );
};

/**
 * Obtiene la configuración de cálculo para un instrumento específico
 */
export const getInstrumentConfig = (instrumentId: string): InstrumentCalculationConfig | null => {
  return getInstrumentCalculationConfig(instrumentId);
};

/**
 * Registra un nuevo instrumento en el sistema
 * Útil para cuando se agreguen los 11 instrumentos
 */
export const registerInstrument = (instrument: Instrument, config?: InstrumentCalculationConfig): void => {
  INSTRUMENTS[instrument.id] = instrument;
  // La configuración de cálculo se maneja en instrumentCalculations.ts
};

/**
 * Obtiene el ID del instrumento recomendado para un nivel
 */
export const getRecommendedInstrumentId = (nivel: string): string => {
  // Mapeo de niveles a instrumentos (se puede extender)
  const nivelToInstrument: Record<string, string> = {
    "A1": "A1",
    "A2": "A2",
    "S1": "S1",
    "S2": "S2",
    "E1": "E1",
    "E2": "E2",
    // Agregar más mapeos según sea necesario
  };
  
  return nivelToInstrument[nivel] || "A1";
};
