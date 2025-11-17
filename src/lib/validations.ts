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
 * El Concejo solo puede evaluar a Directores (D1) o Alcalde (A1)
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

    if (colaborador.nivel !== "D1" && colaborador.nivel !== "A1") {
      return {
        valid: false,
        error: `El Concejo solo puede evaluar a Directores (D1) o Alcalde (A1), pero el colaborador es nivel ${colaborador.nivel}`,
      };
    }

    // Verificar que existe asignación activa
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
 * El Alcalde solo puede evaluar a Directores (D1)
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

    if (colaborador.nivel !== "D1") {
      return {
        valid: false,
        error: `El Alcalde solo puede evaluar a Directores (D1), pero el colaborador es nivel ${colaborador.nivel}`,
      };
    }

    // Verificar que existe asignación activa
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

    return {
      valid: true,
      message: `Validación exitosa: Alcalde puede evaluar a ${colaborador.nombre} ${colaborador.apellidos} (Director)`,
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

  // Regla 4: Un usuario no puede evaluar a otro de un nivel jerárquico superior, a menos que sea C1 evaluando A1.
  if (
    !isSelfEvaluation &&
    evaluatorUser.nivel !== 'C1' as JobLevelCode && // C1 puede evaluar A1
    (evaluatorUser.hierarchical_order !== undefined && evaluatedUser.hierarchical_order !== undefined) &&
    evaluatorUser.hierarchical_order < evaluatedUser.hierarchical_order // Evaluador tiene mayor jerarquía (menor número)
  ) {
    return { isValid: false, message: "No puedes evaluar a un colaborador de un nivel jerárquico superior." };
  }

  // Regla 5: Un usuario no puede evaluar a otro de un nivel jerárquico igual, a menos que sea C1 evaluando A1
  if (
    !isSelfEvaluation &&
    evaluatorUser.nivel !== 'C1' as JobLevelCode && // C1 puede evaluar A1
    (evaluatorUser.hierarchical_order !== undefined && evaluatedUser.hierarchical_order !== undefined) &&
    evaluatorUser.hierarchical_order === evaluatedUser.hierarchical_order
  ) {
    return { isValid: false, message: "No puedes evaluar a un colaborador de tu mismo nivel jerárquico." };
  }

  return { isValid: true, message: "Permiso de evaluación válido." };
};
