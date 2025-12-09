// Funciones JavaScript para manejo de jerarquías y detección de roles
import { supabase } from "@/integrations/supabase/client";

export interface JerarquiaInfo {
  tieneJefeSuperior: boolean;
  tieneColaboradores: boolean;
  tieneJefesSubordinados: boolean;
  esJefeIntermedio: boolean;
  esJefeSinJefe: boolean;
  totalColaboradores: number;
  totalJefesSubordinados: number;
}

/**
 * Obtiene información completa de la jerarquía del usuario
 */
export const getJerarquiaInfo = async (usuarioDpi: string): Promise<JerarquiaInfo> => {
  try {
    // Verificar si tiene jefe superior
    // Usar maybeSingle() en lugar de single() para evitar errores 406 cuando el usuario no existe
    const { data: usuario, error: usuarioError } = await supabase
      .from("users")
      .select("jefe_inmediato_id")
      .eq("dpi", usuarioDpi)
      .maybeSingle();

    if (usuarioError) {
      console.warn("⚠️ [jerarquias] Error al consultar usuario:", usuarioError);
    }

    const tieneJefeSuperior = usuario?.jefe_inmediato_id != null;

    // Verificar si tiene colaboradores directos
    // Buscar en user_assignments (asignaciones formales)
    const { count: totalColaboradoresAssignments } = await supabase
      .from("user_assignments")
      .select("*", { count: "exact", head: true })
      .eq("jefe_id", usuarioDpi)
      .eq("activo", true);

    // También buscar en users por jefe_inmediato_id (jerarquía directa)
    const { count: totalColaboradoresJerarquia } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("jefe_inmediato_id", usuarioDpi)
      .eq("estado", "activo");

    // Tiene colaboradores si tiene en cualquiera de las dos formas
    const totalColaboradores = (totalColaboradoresAssignments || 0) + (totalColaboradoresJerarquia || 0);
    const tieneColaboradores = totalColaboradores > 0;

    // Verificar si tiene jefes subordinados (que reportan a él)
    const { count: totalJefesSubordinados } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("jefe_inmediato_id", usuarioDpi)
      .eq("estado", "activo")
      .in("rol", ["jefe", "colaborador"]);

    const tieneJefesSubordinados = (totalJefesSubordinados || 0) > 0;

    // Verificar si es jefe intermedio (tiene jefe Y tiene colaboradores)
    const { data: esIntermedio } = await supabase
      .rpc("es_jefe_intermedio", { usuario_dpi: usuarioDpi });

    return {
      tieneJefeSuperior,
      tieneColaboradores,
      tieneJefesSubordinados,
      esJefeIntermedio: esIntermedio || false,
      esJefeSinJefe: !tieneJefeSuperior && tieneColaboradores,
      totalColaboradores: totalColaboradores,
      totalJefesSubordinados: totalJefesSubordinados || 0,
    };
  } catch (error) {
    console.error("Error obteniendo información de jerarquía:", error);
    return {
      tieneJefeSuperior: false,
      tieneColaboradores: false,
      tieneJefesSubordinados: false,
      esJefeIntermedio: false,
      esJefeSinJefe: false,
      totalColaboradores: 0,
      totalJefesSubordinados: 0,
    };
  }
};

/**
 * Obtiene lista de jefes subordinados directos
 */
export const getJefesSubordinados = async (jefeSuperiorDpi: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .rpc("get_jefes_subordinados", { jefe_superior_dpi: jefeSuperiorDpi });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error obteniendo jefes subordinados:", error);
    return [];
  }
};

/**
 * Obtiene estadísticas del equipo de un jefe
 */
export const getEquipoStats = async (jefeDpi: string, periodoId: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .rpc("get_equipo_stats", { 
        jefe_dpi: jefeDpi, 
        periodo_id_param: periodoId 
      });

    if (error) throw error;
    return data || {};
  } catch (error) {
    console.error("Error obteniendo estadísticas del equipo:", error);
    return {};
  }
};

/**
 * Obtiene promedio consolidado del equipo
 */
export const getPromedioEquipo = async (jefeDpi: string, periodoId: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .rpc("get_promedio_equipo", { 
        jefe_dpi: jefeDpi, 
        periodo_id_param: periodoId 
      });

    if (error) throw error;
    return data || {};
  } catch (error) {
    console.error("Error obteniendo promedio del equipo:", error);
    return {};
  }
};

/**
 * Obtiene comparativa entre equipos de jefes subordinados
 */
export const getComparativaEquipos = async (
  jefeSuperiorDpi: string, 
  periodoId: string
): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .rpc("get_comparativa_equipos", { 
        jefe_superior_dpi: jefeSuperiorDpi,
        periodo_id_param: periodoId 
      });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error obteniendo comparativa de equipos:", error);
    return [];
  }
};

/**
 * Obtiene evaluación de un jefe como colaborador
 */
export const getEvaluacionJefeComoColaborador = async (
  jefeDpi: string,
  jefeSuperiorDpi: string,
  periodoId: string
): Promise<any> => {
  try {
    const { data, error } = await supabase
      .rpc("get_evaluacion_jefe_como_colaborador", {
        jefe_dpi: jefeDpi,
        jefe_superior_dpi: jefeSuperiorDpi,
        periodo_id_param: periodoId
      });

    if (error) throw error;
    return data || {};
  } catch (error) {
    console.error("Error obteniendo evaluación del jefe:", error);
    return { existe: false };
  }
};

/**
 * Verifica si un colaborador pertenece a una cuadrilla/grupo
 */
export const perteneceACuadrilla = async (colaboradorDpi: string): Promise<boolean> => {
  try {
    const { count } = await supabase
      .from("group_members")
      .select("*", { count: "exact", head: true })
      .eq("colaborador_id", colaboradorDpi)
      .eq("activo", true);

    return (count || 0) > 0;
  } catch (error) {
    console.error("Error verificando pertenencia a cuadrilla:", error);
    return false;
  }
};

/**
 * Obtiene grupos/cuadrillas del colaborador
 */
export const getGruposDelColaborador = async (colaboradorDpi: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from("group_members")
      .select(`
        grupo_id,
        groups!group_members_grupo_id_fkey (
          id,
          nombre,
          descripcion,
          tipo,
          jefe_id
        )
      `)
      .eq("colaborador_id", colaboradorDpi)
      .eq("activo", true);

    if (error) throw error;
    return data?.map((item: any) => item.groups).filter(Boolean) || [];
  } catch (error) {
    console.error("Error obteniendo grupos del colaborador:", error);
    return [];
  }
};

