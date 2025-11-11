import { saveEvaluationToSupabase, getEvaluationFromSupabase } from "./supabase";

export interface EvaluationDraft {
  usuarioId: string;
  periodoId: string;
  tipo: "auto" | "jefe";
  responses: Record<string, number>;
  comments: Record<string, string>;
  estado: "borrador" | "enviado";
  progreso: number;
  fechaUltimaModificacion: string;
  fechaEnvio?: string;
  // Solo para evaluaciones del jefe
  evaluadorId?: string; // DPI del jefe que evalúa
  colaboradorId?: string; // DPI del colaborador evaluado
  evaluacionPotencial?: {
    responses: Record<string, number>;
    comments: Record<string, string>;
  };
}

const STORAGE_KEY_PREFIX = "evaluation_";
const JEFE_EVALUATION_PREFIX = "jefe_evaluation_";

export const saveEvaluationDraft = async (draft: EvaluationDraft): Promise<void> => {
  draft.fechaUltimaModificacion = new Date().toISOString();
  
  // Intentar guardar en Supabase primero
  const supabaseId = await saveEvaluationToSupabase(draft);
  
  // Si Supabase no está disponible, usar localStorage como fallback
  if (!supabaseId) {
    const key = draft.tipo === "jefe" && draft.evaluadorId && draft.colaboradorId
      ? `${JEFE_EVALUATION_PREFIX}${draft.evaluadorId}_${draft.colaboradorId}_${draft.periodoId}`
      : `${STORAGE_KEY_PREFIX}${draft.usuarioId}_${draft.periodoId}`;
    localStorage.setItem(key, JSON.stringify(draft));
  }
};

export const getEvaluationDraft = async (
  usuarioId: string,
  periodoId: string
): Promise<EvaluationDraft | null> => {
  // Intentar obtener de Supabase primero
  const supabaseDraft = await getEvaluationFromSupabase(usuarioId, periodoId, "auto");
  if (supabaseDraft) return supabaseDraft;
  
  // Fallback a localStorage
  const key = `${STORAGE_KEY_PREFIX}${usuarioId}_${periodoId}`;
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as EvaluationDraft;
  } catch {
    return null;
  }
};

// Funciones específicas para evaluaciones del jefe
export const getJefeEvaluationDraft = async (
  evaluadorId: string,
  colaboradorId: string,
  periodoId: string
): Promise<EvaluationDraft | null> => {
  // Intentar obtener de Supabase primero
  const supabaseDraft = await getEvaluationFromSupabase(colaboradorId, periodoId, "jefe", evaluadorId, colaboradorId);
  if (supabaseDraft) return supabaseDraft;
  
  // Fallback a localStorage
  const key = `${JEFE_EVALUATION_PREFIX}${evaluadorId}_${colaboradorId}_${periodoId}`;
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as EvaluationDraft;
  } catch {
    return null;
  }
};

export const hasJefeEvaluation = async (
  evaluadorId: string,
  colaboradorId: string,
  periodoId: string
): Promise<boolean> => {
  const draft = await getJefeEvaluationDraft(evaluadorId, colaboradorId, periodoId);
  return draft?.estado === "enviado" || false;
};

export const submitEvaluation = async (draft: EvaluationDraft): Promise<void> => {
  draft.estado = "enviado";
  draft.fechaEnvio = new Date().toISOString();
  await saveEvaluationDraft(draft);
};

export const getSubmittedEvaluation = async (
  usuarioId: string,
  periodoId: string
): Promise<EvaluationDraft | null> => {
  const draft = await getEvaluationDraft(usuarioId, periodoId);
  return draft?.estado === "enviado" ? draft : null;
};

export const hasSubmittedEvaluation = async (
  usuarioId: string,
  periodoId: string
): Promise<boolean> => {
  const draft = await getEvaluationDraft(usuarioId, periodoId);
  return draft?.estado === "enviado" || false;
};

export const calculateProgress = (
  responses: Record<string, number>,
  totalItems: number
): number => {
  const answeredItems = Object.keys(responses).length;
  return Math.round((answeredItems / totalItems) * 100);
};

// Generar autoevaluación de prueba para Roberto Hernández Silva
export const getMockColaboradorEvaluation = (colaboradorId: string): EvaluationDraft | null => {
  if (colaboradorId !== "4567890123104") return null; // Solo para Roberto Hernández Silva
  
  // Generar respuestas realistas de prueba
  const responses: Record<string, number> = {
    // Dimensión 1: PRODUCTIVIDAD Y CUMPLIMIENTO DE OBJETIVOS
    "d1_i1": 4, // Logra metas POA
    "d1_i2": 4, // Ejecuta presupuesto
    "d1_i3": 5, // Implementa acuerdos
    "d1_i4": 3, // Avanza proyectos estratégicos
    "d1_i5": 4, // Administra recursos
    
    // Dimensión 2: CALIDAD DEL TRABAJO
    "d2_i1": 5, // Transparencia
    "d2_i2": 4, // Cumplimiento normativo
    "d2_i3": 4, // Informes completos
    "d2_i4": 3, // Gestión de riesgos
    
    // Dimensión 3: COMPETENCIAS TÉCNICAS
    "d3_i1": 4, // Dominio gestión pública
    "d3_i2": 4, // Planificación estratégica
    "d3_i3": 3, // Finanzas municipales
    "d3_i4": 4, // Liderazgo efectivo
    "d3_i5": 4, // Decisiones estratégicas
    "d3_i6": 4, // Visión estratégica
    "d3_i7": 4, // Manejo de crisis
    
    // Dimensión 4: CONDUCTA ÉTICA
    "d4_i1": 5, // Probidad e integridad
    "d4_i2": 4, // Orientación a resultados
    "d4_i3": 5, // Compromiso y dedicación
    
    // Dimensión 5: LIDERAZGO Y COORDINACIÓN
    "d5_i1": 4, // Dirige efectivamente
    "d5_i2": 4, // Coordinación eficiente
    "d5_i3": 5, // Comunicación clara
    "d5_i4": 4, // Resuelve conflictos
    
    // Dimensión 6: ENFOQUE CIUDADANO
    "d6_i1": 4, // Prioriza interés ciudadano
    "d6_i2": 4, // Atiende demandas
    "d6_i3": 5, // Representa institución
    "d6_i4": 4, // Comunicación pública
  };
  
  const comments: Record<string, string> = {
    "dim1": "Roberto ha demostrado excelente cumplimiento de metas del POA, destacando especialmente en la implementación oportuna de acuerdos municipales. Se recomienda fortalecer el seguimiento de proyectos estratégicos de largo plazo.",
    "dim2": "Mantiene altos estándares de transparencia y cumplimiento normativo. Los informes son oportunos y completos. Área de mejora: gestión proactiva de riesgos institucionales.",
    "dim3": "Sólido dominio técnico y capacidad de liderazgo. Excelente toma de decisiones bajo presión. Se sugiere profundizar conocimientos en finanzas municipales avanzadas.",
    "dim4": "Valores éticos y compromiso institucional ejemplares. Actúa con integridad en todas las situaciones.",
    "dim5": "Comunicación efectiva y coordinación fluida con el equipo. Habilidad destacada para mantener relaciones constructivas.",
    "dim6": "Orientación al ciudadano muy presente. Representación institucional sobresaliente. Buen manejo de comunicación pública."
  };
  
  // NOTA: Este es un mock para pruebas, usar UUID real en producción
  return {
    usuarioId: colaboradorId,
    periodoId: "00000000-0000-0000-0000-000000000000", // Mock UUID, no usar en producción
    tipo: "auto",
    responses,
    comments,
    estado: "enviado",
    progreso: 100,
    fechaUltimaModificacion: new Date("2025-01-15").toISOString(),
    fechaEnvio: new Date("2025-01-15").toISOString(),
  };
};
