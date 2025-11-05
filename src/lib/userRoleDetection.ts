/**
 * Función para detectar y actualizar automáticamente el rol de jefe
 * Se ejecuta cuando se crea o actualiza una asignación
 */
export const updateUserRoleFromAssignments = async (jefeId: string): Promise<void> => {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    
    // Verificar si el usuario tiene asignaciones activas como jefe
    const { data, error } = await supabase
      .from("user_assignments")
      .select("id")
      .eq("jefe_id", jefeId)
      .eq("activo", true)
      .limit(1);
    
    if (error) throw error;
    
    // Si tiene asignaciones, actualizar rol a 'jefe' (a menos que sea admin)
    if (data && data.length > 0) {
      const { error: updateError } = await supabase
        .from("users")
        .update({ rol: "jefe" })
        .eq("dpi", jefeId)
        .neq("rol", "admin_rrhh")
        .neq("rol", "admin_general");
      
      if (updateError) throw updateError;
    }
  } catch (error) {
    console.error("Error updating user role:", error);
    // No lanzar error para no bloquear la creación de asignaciones
  }
};

/**
 * Verifica si un usuario debe tener rol de jefe basado en asignaciones
 */
export const shouldBeJefe = async (userId: string): Promise<boolean> => {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    
    const { data, error } = await supabase
      .from("user_assignments")
      .select("id")
      .eq("jefe_id", userId)
      .eq("activo", true)
      .limit(1);
    
    if (error) throw error;
    
    return (data && data.length > 0) || false;
  } catch (error) {
    console.error("Error checking jefe status:", error);
    return false;
  }
};

/**
 * Actualiza todos los roles de jefe basado en asignaciones actuales
 * Útil para migraciones o correcciones masivas
 */
export const updateAllJefeRoles = async (): Promise<void> => {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    
    // Obtener todos los usuarios que tienen asignaciones como jefe
    const { data: jefes, error } = await supabase
      .from("user_assignments")
      .select("jefe_id")
      .eq("activo", true);
    
    if (error) throw error;
    
    // Obtener DPI únicos de jefes
    const jefeIds = [...new Set((jefes || []).map((a: any) => a.jefe_id))];
    
    // Actualizar cada jefe
    for (const jefeId of jefeIds) {
      await updateUserRoleFromAssignments(jefeId);
    }
  } catch (error) {
    console.error("Error updating all jefe roles:", error);
    throw error;
  }
};

