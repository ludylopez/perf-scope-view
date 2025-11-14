import { Instrument } from "@/types/evaluation";
import { INSTRUMENT_A1, INSTRUMENT_A3, INSTRUMENT_O2, INSTRUMENT_E1 } from "@/data/instruments";
import { InstrumentCalculationConfig, getInstrumentCalculationConfig } from "./instrumentCalculations";

const INSTRUMENTS: Record<string, Instrument> = {
  A1: INSTRUMENT_A1,
  A3: INSTRUMENT_A3,
  O2: INSTRUMENT_O2,
  E1: INSTRUMENT_E1,
  // Se pueden agregar más instrumentos aquí cuando estén disponibles
  // A2: INSTRUMENT_A2,
  // S2: INSTRUMENT_S2,
  // D1: INSTRUMENT_D1,
  // D2: INSTRUMENT_D2,
  // E2: INSTRUMENT_E2,
  // A4: INSTRUMENT_A4,
  // OTE: INSTRUMENT_OTE,
  // O1: INSTRUMENT_O1,
  // OS: INSTRUMENT_OS
};

/**
 * Obtiene el instrumento asignado a un usuario según su nivel
 * Si el usuario tiene un override manual, se usa ese
 */
export const getInstrumentForUser = async (
  nivel: string,
  overrideInstrumentId?: string
): Promise<Instrument | null> => {
  console.log(`[Instruments] Obteniendo instrumento para nivel: ${nivel}, override: ${overrideInstrumentId}`);
  
  // Si hay override manual, usar ese
  if (overrideInstrumentId) {
    // Permite override por clave (A3) o por ID completo (A3_2025_V1)
    if (INSTRUMENTS[overrideInstrumentId]) {
      console.log(`[Instruments] ✅ Usando override por clave: ${overrideInstrumentId}`);
      return INSTRUMENTS[overrideInstrumentId];
    }
    const byFullId = Object.values(INSTRUMENTS).find(inst => inst.id === overrideInstrumentId);
    if (byFullId) {
      console.log(`[Instruments] ✅ Usando override por ID completo: ${overrideInstrumentId}`);
      return byFullId;
    }
    console.log(`[Instruments] ⚠️ Override no encontrado: ${overrideInstrumentId}, usando asignación automática`);
  }
  
  // Asignación automática por nivel
  // 1) Coincidencia exacta por nivel (A3 -> A3)
  const exactKey = Object.keys(INSTRUMENTS).find(key => INSTRUMENTS[key].nivel === nivel);
  if (exactKey) {
    console.log(`[Instruments] ✅ Coincidencia exacta encontrada: ${exactKey} para nivel ${nivel}`);
    return INSTRUMENTS[exactKey];
  }
  
  // 2) Fallback: primer instrumento que comparta prefijo de nivel (e.g., "A*")
  const prefixKey = Object.keys(INSTRUMENTS).find(key => INSTRUMENTS[key].nivel.startsWith(nivel.charAt(0)));
  if (prefixKey) {
    console.log(`[Instruments] ⚠️ Usando fallback por prefijo: ${prefixKey} para nivel ${nivel}`);
    return INSTRUMENTS[prefixKey];
  }
  
  // Fallback final: usar A1 por defecto
  console.log(`[Instruments] ⚠️ Sin coincidencias, usando fallback A1 para nivel ${nivel}`);
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
 * Cada nivel de puesto tiene su propio instrumento diseñado a medida
 */
export const getRecommendedInstrumentId = (nivel: string): string => {
  // Mapeo de niveles a instrumentos (1:1)
  const nivelToInstrument: Record<string, string> = {
    "A1": "A1",   // ALCALDE MUNICIPAL
    "A2": "A2",   // ASESORÍA PROFESIONAL
    "S2": "S2",   // SECRETARIO
    "D1": "D1",   // GERENTE - DIRECCIONES I
    "D2": "D2",   // DIRECCIONES II
    "E1": "E1",   // ENCARGADOS Y JEFES DE UNIDADES I
    "E2": "E2",   // ENCARGADOS Y JEFES DE UNIDADES II
    "A3": "A3",   // ADMINISTRATIVOS I
    "A4": "A4",   // ADMINISTRATIVOS II
    "OTE": "OTE", // OPERATIVOS - TÉCNICO ESPECIALIZADO
    "O1": "O1",   // OPERATIVOS I
    "O2": "O2",   // OPERATIVOS II
    "OS": "OS",   // OTROS SERVICIOS
  };

  // Si el nivel existe, retornar el instrumento correspondiente
  // Si no existe, usar A1 como fallback
  return nivelToInstrument[nivel] || "A1";
};
