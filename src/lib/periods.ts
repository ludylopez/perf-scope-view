import { EvaluationPeriod, PeriodStatus } from "@/types/period";
import { getActivePeriod, getPeriodStatus as getSupabasePeriodStatus } from "./supabase";

// Período por defecto mientras migramos a Supabase
const DEFAULT_PERIOD_ID = "2025-1";

/**
 * Obtiene el período activo actual
 */
export const getCurrentPeriod = async (): Promise<EvaluationPeriod | null> => {
  const period = await getActivePeriod();
  if (period) return period;
  
  // Fallback: período por defecto
  return {
    id: DEFAULT_PERIOD_ID,
    nombre: "Periodo 2025-1",
    fechaInicio: new Date("2025-01-01").toISOString(),
    fechaFin: new Date("2025-03-31").toISOString(),
    fechaCierreAutoevaluacion: new Date("2025-02-15").toISOString(),
    fechaCierreEvaluacionJefe: new Date("2025-03-15").toISOString(),
    estado: "en_curso",
    createdAt: new Date("2025-01-01").toISOString(),
    updatedAt: new Date("2025-01-01").toISOString(),
  };
};

/**
 * Obtiene el estado del período (si está activo, si se puede enviar autoevaluación, etc.)
 */
export const getPeriodStatus = async (periodId: string): Promise<PeriodStatus> => {
  const status = await getSupabasePeriodStatus(periodId);
  
  // Si Supabase no está disponible, asumir que está activo
  if (!status.period) {
    return {
      isActive: true,
      canSubmitAuto: true,
      canSubmitJefe: true,
    };
  }
  
  return status;
};

/**
 * Valida si se puede enviar autoevaluación en este momento
 */
export const canSubmitAutoEvaluation = async (periodId: string): Promise<boolean> => {
  const status = await getPeriodStatus(periodId);
  return status.canSubmitAuto;
};

/**
 * Valida si se puede enviar evaluación del jefe en este momento
 */
export const canSubmitJefeEvaluation = async (periodId: string): Promise<boolean> => {
  const status = await getPeriodStatus(periodId);
  return status.canSubmitJefe;
};

