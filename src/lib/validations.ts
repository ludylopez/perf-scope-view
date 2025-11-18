import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types/auth";
import { JobLevelCode } from "@/types/jobLevel";

/**
 * Resultado de validación de permisos
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  message?: string;
}

/**
 * Valida que un miembro del Concejo Municipal (C1) puede evaluar a un colaborador específico
 * El Concejo puede evaluar a cualquier colaborador que tenga una asignación activa
 * (las asignaciones reflejan la estructura organizacional real, no restringimos por nivel)
 */
export const validateConcejoEvaluation = async (
  concejoId: string,
  colaboradorId: string
): Promise<ValidationResult> => {
  try {
    // Obtener nivel del evaluador
    const { data: evaluador, error: evaluadorError } = await supabase
      .from("users")
      .select("nivel, estado")
      .eq("dpi", concejoId)
      .single();

    if (evaluadorError || !evaluador) {
      return {
        valid: false,
        error: "El evaluador no existe o no está activo",
      };
    }

    if (evaluador.estado !== "activo") {
      return {
        valid: false,
        error: "El evaluador no está activo",
      };
    }

    if (evaluador.nivel !== "C1") {
      return {
        valid: false,
        error: `El evaluador debe ser del Concejo Municipal (C1), pero es nivel ${evaluador.nivel}`,
      };
    }

    // Obtener nivel del colaborador
    const { data: colaborador, error: colaboradorError } = await supabase
      .from("users")
      .select("nivel, estado, nombre, apellidos")
      .eq("dpi", colaboradorId)
      .single();

    if (colaboradorError || !colaborador) {
      return {
        valid: false,
        error: "El colaborador no existe o no está activo",
      };
    }

    if (colaborador.estado !== "activo") {
      return {
        valid: false,
        error: "El colaborador no está activo",
      };
    }

    // Verificar que existe asignación activa
    // Si existe una asignación activa, el Concejo puede evaluar al colaborador
    // independientemente del nivel (ya que las asignaciones reflejan la estructura real)
    const { data: asignacion, error: asignacionError } = await supabase
      .from("user_assignments")
      .select("id")
      .eq("colaborador_id", colaboradorId)
      .eq("jefe_id", concejoId)
      .eq("activo", true)
      .maybeSingle();

    if (asignacionError || !asignacion) {
      return {
        valid: false,
        error: "No existe una asignación activa entre el Concejo y el colaborador",
      };
    }

    // Si existe asignación activa, el Concejo puede evaluar al colaborador
    // (no restringimos por nivel ya que las asignaciones reflejan la estructura organizacional real)

    return {
      valid: true,
      message: `Validación exitosa: Concejo puede evaluar a ${colaborador.nombre} ${colaborador.apellidos} (nivel ${colaborador.nivel})`,
    };
  } catch (error) {
    console.error("Error in validateConcejoEvaluation:", error);
    return {
      valid: false,
      error: "Error al validar permisos de evaluación",
    };
  }
};

/**
 * Valida que el Alcalde Municipal (A1) puede evaluar a un colaborador específico
 * El Alcalde puede evaluar a cualquier colaborador que tenga una asignación activa
 * (las asignaciones reflejan la estructura organizacional real, no restringimos por nivel)
 */
export const validateAlcaldeEvaluation = async (
  alcaldeId: string,
  colaboradorId: string
): Promise<ValidationResult> => {
  try {
    // Obtener nivel del evaluador
    const { data: evaluador, error: evaluadorError } = await supabase
      .from("users")
      .select("nivel, estado")
      .eq("dpi", alcaldeId)
      .single();

    if (evaluadorError || !evaluador) {
      return {
        valid: false,
        error: "El evaluador no existe o no está activo",
      };
    }

    if (evaluador.estado !== "activo") {
      return {
        valid: false,
        error: "El evaluador no está activo",
      };
    }

    if (evaluador.nivel !== "A1") {
      return {
        valid: false,
        error: `El evaluador debe ser Alcalde (A1), pero es nivel ${evaluador.nivel}`,
      };
    }

    // Obtener nivel del colaborador
    const { data: colaborador, error: colaboradorError } = await supabase
      .from("users")
      .select("nivel, estado, nombre, apellidos")
      .eq("dpi", colaboradorId)
      .single();

    if (colaboradorError || !colaborador) {
      return {
        valid: false,
        error: "El colaborador no existe o no está activo",
      };
    }

    if (colaborador.estado !== "activo") {
      return {
        valid: false,
        error: "El colaborador no está activo",
      };
    }

    // Verificar que existe asignación activa
    // Si existe una asignación activa, el Alcalde puede evaluar al colaborador
    // independientemente del nivel (ya que las asignaciones reflejan la estructura real)
    const { data: asignacion, error: asignacionError } = await supabase
      .from("user_assignments")
      .select("id")
      .eq("colaborador_id", colaboradorId)
      .eq("jefe_id", alcaldeId)
      .eq("activo", true)
      .maybeSingle();

    if (asignacionError || !asignacion) {
      return {
        valid: false,
        error: "No existe una asignación activa entre el Alcalde y el colaborador",
      };
    }

    // Si existe asignación activa, el Alcalde puede evaluar al colaborador
    // (no restringimos por nivel ya que las asignaciones reflejan la estructura organizacional real)

    return {
      valid: true,
      message: `Validación exitosa: Alcalde puede evaluar a ${colaborador.nombre} ${colaborador.apellidos} (nivel ${colaborador.nivel})`,
    };
  } catch (error) {
    console.error("Error in validateAlcaldeEvaluation:", error);
    return {
      valid: false,
      error: "Error al validar permisos de evaluación",
    };
  }
};

/**
 * Función genérica que valida permisos de evaluación según las reglas de negocio
 * Aplica validaciones específicas para C1 (Concejo) y A1 (Alcalde)
 */
export const validateEvaluationPermission = async (
  evaluadorId: string,
  colaboradorId: string
): Promise<ValidationResult> => {
  try {
    // Obtener nivel del evaluador
    const { data: evaluador, error: evaluadorError } = await supabase
      .from("users")
      .select("nivel, estado")
      .eq("dpi", evaluadorId)
      .single();

    if (evaluadorError || !evaluador) {
      return {
        valid: false,
        error: "El evaluador no existe o no está activo",
      };
    }

    if (evaluador.estado !== "activo") {
      return {
        valid: false,
        error: "El evaluador no está activo",
      };
    }

    // Aplicar reglas específicas según el nivel del evaluador
    if (evaluador.nivel === "C1") {
      return await validateConcejoEvaluation(evaluadorId, colaboradorId);
    } else if (evaluador.nivel === "A1") {
      return await validateAlcaldeEvaluation(evaluadorId, colaboradorId);
    } else {
      // Para otros niveles, validar solo que exista asignación activa
      const { data: asignacion, error: asignacionError } = await supabase
        .from("user_assignments")
        .select("id")
        .eq("colaborador_id", colaboradorId)
        .eq("jefe_id", evaluadorId)
        .eq("activo", true)
        .maybeSingle();

      if (asignacionError || !asignacion) {
        return {
          valid: false,
          error: "No existe una asignación activa entre el evaluador y el colaborador",
        };
      }

      return {
        valid: true,
        message: "Validación exitosa: existe asignación activa",
      };
    }
  } catch (error) {
    console.error("Error in validateEvaluationPermission:", error);
    return {
      valid: false,
      error: "Error al validar permisos de evaluación",
    };
  }
};

/**
 * Función síncrona que valida permisos de evaluación cuando los datos del usuario ya están disponibles
 * Útil para validaciones en formularios sin necesidad de hacer consultas adicionales a la BD
 */
export const validateEvaluationPermissionSync = (
  evaluatorUser: User,
  evaluatedUser: User,
  isSelfEvaluation: boolean = false
): { isValid: boolean; message: string } => {
  // Regla 1: C1 (Concejo Municipal) solo se autoevalúa en desempeño.
  if (evaluatedUser.nivel === 'C1' as JobLevelCode) {
    if (!isSelfEvaluation) {
      return { isValid: false, message: "El Concejo Municipal (C1) solo puede realizar autoevaluaciones." };
    }
  }

  // Regla 2: A1 (Alcalde Municipal) solo puede ser evaluado por C1 (Concejo Municipal).
  if (evaluatedUser.nivel === 'A1' as JobLevelCode && !isSelfEvaluation) {
    if (evaluatorUser.nivel !== 'C1' as JobLevelCode) {
      return { isValid: false, message: "El Alcalde Municipal (A1) solo puede ser evaluado por un miembro del Concejo Municipal (C1)." };
    }
  }

  // Regla 3: Un usuario no puede evaluarse a sí mismo si no es una autoevaluación explícita.
  if (evaluatorUser.dpi === evaluatedUser.dpi && !isSelfEvaluation) {
    return { isValid: false, message: "Un usuario no puede evaluarse a sí mismo como jefe." };
  }

  // Regla 4 y 5: Las validaciones de jerarquía se manejan mediante las funciones específicas
  // validateConcejoEvaluation y validateAlcaldeEvaluation, y mediante las asignaciones activas.
  // No necesitamos validar hierarchical_order aquí ya que no está disponible en el tipo User.

  return { isValid: true, message: "Permiso de evaluación válido." };
};
