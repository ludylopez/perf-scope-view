import { Instrument } from "@/types/evaluation";
import { INSTRUMENT_A1, INSTRUMENT_A3, INSTRUMENT_O2, INSTRUMENT_E1, INSTRUMENT_O1, INSTRUMENT_OTE, INSTRUMENT_D2, INSTRUMENT_A4, INSTRUMENT_S2, INSTRUMENT_E2, INSTRUMENT_D1 } from "@/data/instruments";
import { InstrumentCalculationConfig, getInstrumentCalculationConfig } from "./instrumentCalculations";

const INSTRUMENTS: Record<string, Instrument> = {
  A1: INSTRUMENT_A1,
  A3: INSTRUMENT_A3,
  O2: INSTRUMENT_O2,
  E1: INSTRUMENT_E1,
  E2: INSTRUMENT_E2,
  O1: INSTRUMENT_O1,
  OTE: INSTRUMENT_OTE,
  D2: INSTRUMENT_D2,
  D1: INSTRUMENT_D1,
  A4: INSTRUMENT_A4,
  S2: INSTRUMENT_S2,
  // Se pueden agregar más instrumentos aquí cuando estén disponibles
  // A2: INSTRUMENT_A2,
  // OS: INSTRUMENT_OS
};

/**
 * Mapea el cargo de un usuario D1 a un tipo de puesto específico
 * Retorna el tipo de puesto o null si no hay match
 */
export const getD1PuestoType = (cargo: string): string | null => {
  if (!cargo) return null;
  
  // Normalizar cargo: eliminar espacios extra y convertir a minúsculas
  const cargoNormalized = cargo.toLowerCase().trim().replace(/\s+/g, " ");
  
  // Mapeo de cargos a tipos de puesto D1 (ordenado por especificidad)
  // 1. Gerente Municipal (más específico primero)
  if (cargoNormalized.includes("gerente municipal") && !cargoNormalized.includes("sub")) {
    return "gerente";
  }
  
  // 2. Juez de Asuntos Municipales y de Tránsito
  if (cargoNormalized.includes("juez") && 
      (cargoNormalized.includes("asuntos municipales") || cargoNormalized.includes("tránsito") || cargoNormalized.includes("transito"))) {
    return "juez";
  }
  
  // 3. Directora de la Dirección de Recursos Humanos
  if ((cargoNormalized.includes("director") || cargoNormalized.includes("directora")) && 
      cargoNormalized.includes("recursos humanos")) {
    return "rrhh";
  }
  
  // 4. Directora de la Dirección Municipal de Planificación
  if ((cargoNormalized.includes("director") || cargoNormalized.includes("directora")) && 
      (cargoNormalized.includes("planificación") || cargoNormalized.includes("planificacion"))) {
    return "dmp";
  }
  
  // 5. Director Financiero de la Dirección de Administración Integrada Municipal
  if (cargoNormalized.includes("financiero") && 
      (cargoNormalized.includes("administración integrada") || cargoNormalized.includes("administracion integrada") || cargoNormalized.includes("dafim"))) {
    return "dafim";
  }
  
  // 6. Directora de la Oficina de la Dirección Municipal de la Mujer
  if ((cargoNormalized.includes("director") || cargoNormalized.includes("directora")) && 
      cargoNormalized.includes("mujer")) {
    return "dmm";
  }
  
  // Fallback: intentar matching por palabras clave más generales
  if (cargoNormalized.includes("rrhh") || cargoNormalized.includes("recursos humanos")) {
    return "rrhh";
  }
  if (cargoNormalized.includes("dmp") || cargoNormalized.includes("planificación") || cargoNormalized.includes("planificacion")) {
    return "dmp";
  }
  if (cargoNormalized.includes("dafim") || (cargoNormalized.includes("financiero") && cargoNormalized.includes("administración"))) {
    return "dafim";
  }
  if (cargoNormalized.includes("dmm") || cargoNormalized.includes("mujer")) {
    return "dmm";
  }
  
  return null;
};

/**
 * Filtra un instrumento según el cargo del usuario (solo para D1)
 * Para D1, filtra la dimensión 3 para mostrar solo items relevantes según el puesto
 */
export const filterInstrumentByCargo = (instrument: Instrument, cargo?: string): Instrument => {
  // Solo aplicar filtro para instrumento D1
  if (instrument.nivel !== "D1" || !cargo) {
    return instrument;
  }
  
  // Identificar el tipo de puesto
  const puestoType = getD1PuestoType(cargo);
  
  // Si no hay match, retornar instrumento sin cambios (mostrará solo items universales)
  if (!puestoType) {
    console.log(`[Instruments] ⚠️ No se encontró match para cargo D1: ${cargo}, mostrando solo items universales`);
    return instrument;
  }
  
  // Mapeo de tipo de puesto a IDs de items específicos
  // Los items específicos seguirán el patrón: d3_i4{X}_d1 y d3_i5{X}_d1 donde X es la letra (a, b, c, d, e, f)
  const itemIdMap: Record<string, string[]> = {
    gerente: ["d3_i4a_d1", "d3_i5a_d1"],
    juez: ["d3_i4b_d1", "d3_i5b_d1"],
    rrhh: ["d3_i4c_d1", "d3_i5c_d1"],
    dmp: ["d3_i4d_d1", "d3_i5d_d1"],
    dafim: ["d3_i4e_d1", "d3_i5e_d1"],
    dmm: ["d3_i4f_d1", "d3_i5f_d1"],
  };
  
  const specificItemIds = itemIdMap[puestoType];
  if (!specificItemIds) {
    return instrument;
  }
  
  // Crear una copia del instrumento para no modificar el original
  const filteredInstrument: Instrument = {
    ...instrument,
    dimensionesDesempeno: instrument.dimensionesDesempeno.map(dimension => {
      // Solo filtrar la dimensión 3 (COMPETENCIAS DIRECTIVAS)
      if (dimension.id === "dim3_d1") {
        // Items universales: d3_i1_d1, d3_i2_d1, d3_i3_d1
        // Items específicos: según el puesto (ej: d3_i4a_d1, d3_i5a_d1 para gerente)
        const universalItems = dimension.items.filter(item => 
          item.id === "d3_i1_d1" || 
          item.id === "d3_i2_d1" || 
          item.id === "d3_i3_d1"
        );
        
        const specificItems = dimension.items.filter(item => {
          // Verificar si el item está en la lista de items específicos del puesto
          return specificItemIds.includes(item.id);
        });
        
        return {
          ...dimension,
          items: [...universalItems, ...specificItems].sort((a, b) => a.orden - b.orden),
        };
      }
      
      return dimension;
    }),
  };
  
  console.log(`[Instruments] ✅ Instrumento D1 filtrado para puesto: ${puestoType} (cargo: ${cargo})`);
  return filteredInstrument;
};

/**
 * Obtiene el instrumento asignado a un usuario según su nivel
 * Si el usuario tiene un override manual, se usa ese
 * @param nivel - Nivel del usuario (ej: "D1", "A3")
 * @param overrideInstrumentId - ID del instrumento para override manual (opcional)
 * @param cargo - Cargo del usuario (opcional, necesario para D1 con items condicionales)
 */
export const getInstrumentForUser = async (
  nivel: string,
  overrideInstrumentId?: string,
  cargo?: string
): Promise<Instrument | null> => {
  console.log(`[Instruments] Obteniendo instrumento para nivel: ${nivel}, override: ${overrideInstrumentId}, cargo: ${cargo}`);
  
  let instrument: Instrument | null = null;
  
  // Si hay override manual, usar ese
  if (overrideInstrumentId) {
    // Permite override por clave (A3) o por ID completo (A3_2025_V1)
    if (INSTRUMENTS[overrideInstrumentId]) {
      console.log(`[Instruments] ✅ Usando override por clave: ${overrideInstrumentId}`);
      instrument = INSTRUMENTS[overrideInstrumentId];
    } else {
      const byFullId = Object.values(INSTRUMENTS).find(inst => inst.id === overrideInstrumentId);
      if (byFullId) {
        console.log(`[Instruments] ✅ Usando override por ID completo: ${overrideInstrumentId}`);
        instrument = byFullId;
      } else {
        console.log(`[Instruments] ⚠️ Override no encontrado: ${overrideInstrumentId}, usando asignación automática`);
      }
    }
  }
  
  // Si no hay instrumento aún, asignación automática por nivel
  if (!instrument) {
    // 1) Coincidencia exacta por nivel (A3 -> A3)
    const exactKey = Object.keys(INSTRUMENTS).find(key => INSTRUMENTS[key].nivel === nivel);
    if (exactKey) {
      console.log(`[Instruments] ✅ Coincidencia exacta encontrada: ${exactKey} para nivel ${nivel}`);
      instrument = INSTRUMENTS[exactKey];
    } else {
      // 2) Fallback: primer instrumento que comparta prefijo de nivel (e.g., "A*")
      const prefixKey = Object.keys(INSTRUMENTS).find(key => INSTRUMENTS[key].nivel.startsWith(nivel.charAt(0)));
      if (prefixKey) {
        console.log(`[Instruments] ⚠️ Usando fallback por prefijo: ${prefixKey} para nivel ${nivel}`);
        instrument = INSTRUMENTS[prefixKey];
      } else {
        // Fallback final: usar A1 por defecto
        console.log(`[Instruments] ⚠️ Sin coincidencias, usando fallback A1 para nivel ${nivel}`);
        instrument = INSTRUMENTS.A1 || null;
      }
    }
  }
  
  // Si el instrumento es D1 y hay cargo, aplicar filtro de items condicionales
  if (instrument && instrument.nivel === "D1" && cargo) {
    instrument = filterInstrumentByCargo(instrument, cargo);
  }
  
  return instrument;
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
