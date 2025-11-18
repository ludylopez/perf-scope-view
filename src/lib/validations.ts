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
      .maybeSingle();

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
      .maybeSingle();

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
      .maybeSingle();

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
      .maybeSingle();

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
 * Valida si se puede crear una asignación entre un evaluador y un colaborador
 * Esta función NO requiere que la asignación ya exista (a diferencia de validateEvaluationPermission)
 * Se usa específicamente para crear nuevas asignaciones
 */
export const validateAssignmentCreation = async (
  evaluadorId: string,
  colaboradorId: string
): Promise<ValidationResult> => {
  try {
    // Obtener datos del evaluador
    const { data: evaluador, error: evaluadorError } = await supabase
      .from("users")
      .select("nivel, estado, rol, nombre, apellidos")
      .eq("dpi", evaluadorId)
      .maybeSingle();

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

    // Obtener datos del colaborador
    const { data: colaborador, error: colaboradorError } = await supabase
      .from("users")
      .select("nivel, estado, nombre, apellidos")
      .eq("dpi", colaboradorId)
      .maybeSingle();

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

    // Validar que no se esté asignando a sí mismo
    if (evaluadorId === colaboradorId) {
      return {
        valid: false,
        error: "Un usuario no puede ser evaluador de sí mismo",
      };
    }

    // Reglas específicas sobre QUIÉN puede evaluar a C1 y A1 (no sobre a QUIÉN pueden evaluar)
    // C1 (Concejo) solo puede ser evaluado por A1 (Alcalde)
    if (colaborador.nivel === "C1" && evaluador.nivel !== "A1") {
      return {
        valid: false,
        error: "El Concejo Municipal (C1) solo puede ser evaluado por el Alcalde Municipal (A1)",
      };
    }

    // A1 (Alcalde) solo puede ser evaluado por C1 (Concejo)
    if (colaborador.nivel === "A1" && evaluador.nivel !== "C1") {
      return {
        valid: false,
        error: "El Alcalde Municipal (A1) solo puede ser evaluado por miembros del Concejo Municipal (C1)",
      };
    }

    // Para todas las demás asignaciones, no hay restricciones de nivel
    // Las asignaciones reflejan la estructura organizacional real
    // Si se crea una asignación, entonces se puede evaluar, independientemente del nivel
    return {
      valid: true,
      message: "Asignación válida: ambos usuarios están activos y cumplen las reglas de jerarquía",
    };
  } catch (error) {
    console.error("Error in validateAssignmentCreation:", error);
    return {
      valid: false,
      error: "Error al validar la creación de asignación",
    };
  }
};

/**
 * Función genérica que valida permisos de evaluación según las reglas de negocio
 * Aplica validaciones específicas para C1 (Concejo) y A1 (Alcalde)
 * NOTA: Esta función valida cuando YA EXISTE una asignación (para evaluaciones)
 * Para crear asignaciones, usar validateAssignmentCreation en su lugar
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
      .maybeSingle();

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
