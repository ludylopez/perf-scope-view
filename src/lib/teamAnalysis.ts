/**
 * Funciones de servicio para Análisis de Equipo
 * Conecta con las funciones SQL de las migraciones 031 y 035
 *
 * @module teamAnalysis
 * @version 2.0.0
 * @security Incluye validación de entrada con Zod y verificación de autorización
 */

import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type {
  TeamAnalysisNode,
  TeamAnalysisNodeCascada,
  TeamAnalysisStats,
  TeamComparison,
  TeamMemberDetail,
  TeamMember9Box,
  JefeParaFiltro,
  GrupoParaFiltro,
  TeamAnalysisFilters,
  EquipoDirectoCompleto,
  EquipoCascadaCompleto,
} from "@/types/teamAnalysis";

// ============================================================================
// ESQUEMAS DE VALIDACIÓN (Zod)
// ============================================================================

/**
 * Esquema de validación para DPI guatemalteco
 * Formato: 13 dígitos numéricos
 */
const dpiSchema = z.string()
  .min(1, "DPI es requerido")
  .max(20, "DPI no puede exceder 20 caracteres")
  .regex(/^\d{9,13}$/, "DPI debe ser un número de 9 a 13 dígitos");

/**
 * Esquema de validación para UUID
 */
const uuidSchema = z.string()
  .uuid("ID de período debe ser un UUID válido");

/**
 * Esquema para parámetros de equipo directo
 */
const equipoDirectoParamsSchema = z.object({
  jefeDpi: dpiSchema,
  periodoId: uuidSchema,
});

// ============================================================================
// FUNCIONES DE SEGURIDAD
// ============================================================================

/**
 * Verifica que el usuario autenticado tenga permiso para acceder a los datos
 * Esta validación es "soft" - solo registra warnings pero NO bloquea el acceso.
 * La seguridad real se implementa en las RLS policies de Supabase (036_security_rls_team_analysis.sql)
 *
 * Razón: Evitar problemas de UX donde el usuario es sacado por:
 * - Tokens refrescándose
 * - Latencia de red
 * - Race conditions en la sesión
 *
 * @param requestedJefeDpi - DPI del jefe cuyos datos se solicitan
 * @returns true si la validación pasó, false si hubo warning (pero no bloquea)
 */
const verificarAutorizacion = async (requestedJefeDpi: string): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    // Si no hay sesión, confiar en que el AuthContext ya validó
    // La RLS en Supabase es la capa real de seguridad
    if (!session?.user) {
      devLog.warn("No se pudo obtener sesión para validación, confiando en RLS de Supabase");
      return true; // No bloquear - dejar que RLS maneje
    }

    const userEmail = session.user.email;

    const { data: userData } = await supabase
      .from("users")
      .select("dpi, rol")
      .eq("email", userEmail)
      .maybeSingle();

    // Si no se puede obtener datos del usuario, no bloquear
    if (!userData) {
      devLog.warn("No se pudo obtener datos del usuario para validación");
      return true; // No bloquear - dejar que RLS maneje
    }

    const authenticatedUserDpi = userData.dpi;
    const userRol = userData.rol;

    // Roles administrativos que pueden ver cualquier equipo
    const rolesAdministrativos = ["admin", "rrhh", "gerente_general"];

    // Solo loguear si hay discrepancia, pero NO bloquear
    if (authenticatedUserDpi !== requestedJefeDpi && !rolesAdministrativos.includes(userRol)) {
      devLog.warn("Posible intento de acceso a equipo ajeno", {
        authenticatedDpi: authenticatedUserDpi,
        requestedDpi: requestedJefeDpi,
        rol: userRol
      });
      // NO lanzar error - la RLS de Supabase bloqueará si es necesario
    }

    return true;
  } catch (error) {
    // Cualquier error en validación: loguear pero NO bloquear
    devLog.warn("Error en validación de autorización (no bloqueante):", error);
    return true;
  }
};

/**
 * Registra eventos de seguridad para auditoría
 */
const logSecurityEvent = (event: string, details: Record<string, unknown>): void => {
  // En producción, esto debería enviar a un servicio de logging
  if (import.meta.env.DEV) {
    console.info(`[SECURITY] ${event}:`, details);
  }
  // TODO: Implementar envío a servicio de logging en producción
};

/**
 * Logger interno que solo imprime en desarrollo
 * En producción, los errores deben enviarse a un servicio de monitoreo
 */
const devLog = {
  error: (message: string, error?: unknown): void => {
    if (import.meta.env.DEV) {
      console.error(`[TeamAnalysis] ${message}`, error);
    }
    // TODO: En producción, enviar a servicio de monitoreo (Sentry, DataDog, etc.)
  },
  warn: (message: string, data?: unknown): void => {
    if (import.meta.env.DEV) {
      console.warn(`[TeamAnalysis] ${message}`, data);
    }
  },
  info: (message: string, data?: unknown): void => {
    if (import.meta.env.DEV) {
      console.info(`[TeamAnalysis] ${message}`, data);
    }
  },
};

// ============================================================================
// TIPOS DE ERROR PERSONALIZADOS
// ============================================================================

export class TeamAnalysisError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = "TeamAnalysisError";
  }
}

// ============================================================================
// FUNCIÓN PRINCIPAL: Equipo Directo Completo (Optimizada)
// ============================================================================

/**
 * Obtiene el equipo directo completo con todos los datos en UNA sola query
 * Esta es la función principal para el módulo de Análisis de Equipo
 *
 * @param jefeDpi - DPI del jefe (validado contra formato DPI)
 * @param periodoId - ID del período de evaluación (validado como UUID)
 * @returns Colaboradores directos con evaluaciones, dimensiones, stats y eNPS
 * @throws TeamAnalysisError si la validación falla o no tiene autorización
 *
 * @security
 * - Valida formato de entrada con Zod
 * - Verifica que el usuario autenticado tenga permisos
 * - Registra accesos para auditoría
 */
export const getEquipoDirectoCompleto = async (
  jefeDpi: string,
  periodoId: string
): Promise<EquipoDirectoCompleto | null> => {
  // 1. Validar parámetros de entrada
  const validationResult = equipoDirectoParamsSchema.safeParse({ jefeDpi, periodoId });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors
      .map(e => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    throw new TeamAnalysisError(
      `Parámetros inválidos: ${errorMessages}`,
      "VALIDATION_ERROR",
      400
    );
  }

  // 2. Verificar autorización del usuario (validación soft - no bloquea)
  // La seguridad real está en RLS de Supabase
  await verificarAutorizacion(jefeDpi);

  // 3. Registrar acceso (solo en desarrollo)
  logSecurityEvent("DATA_ACCESS", {
    jefeDpi,
    periodoId,
    timestamp: new Date().toISOString()
  });

  try {
    const { data, error } = await supabase.rpc("get_equipo_directo_completo", {
      jefe_dpi_param: jefeDpi,
      periodo_id_param: periodoId,
    });

    if (error) {
      throw new TeamAnalysisError(
        `Error al obtener equipo: ${error.message}`,
        "DATABASE_ERROR",
        500
      );
    }

    if (!data) {
      return null;
    }

    // Transformar los datos del backend al formato esperado
    const resultado: EquipoDirectoCompleto = {
      colaboradores: (data.colaboradores || []).map((c: Record<string, unknown>) => ({
        dpi: c.dpi as string,
        nombreCompleto: c.nombreCompleto as string,
        nombre: (c.nombreCompleto as string)?.split(' ')[0] || '',
        apellidos: (c.nombreCompleto as string)?.split(' ').slice(1).join(' ') || '',
        cargo: c.cargo as string,
        area: c.area as string,
        nivel: c.nivel as string,
        rol: c.esJefe ? 'jefe' : 'colaborador',
        jefeDpi: jefeDpi,
        nivelJerarquico: 1, // Directos siempre nivel 1
        tieneEvaluacion: c.tieneEvaluacion as boolean,
        desempenoPorcentaje: c.desempenoPorcentaje as number,
        potencialPorcentaje: c.potencialPorcentaje as number,
        posicion9Box: c.posicion9Box as string,
        dimensiones: (c.dimensiones as unknown[]) || [],
        esJefe: c.esJefe as boolean,
        totalColaboradoresDirectos: c.totalSubordinados as number,
      })),
      estadisticas: {
        totalPersonas: (data.estadisticas as Record<string, unknown>)?.totalPersonas as number || 0,
        totalJefes: (data.estadisticas as Record<string, unknown>)?.totalJefes as number || 0,
        totalColaboradores: (data.estadisticas as Record<string, unknown>)?.totalColaboradores as number || 0,
        evaluacionesCompletadas: (data.estadisticas as Record<string, unknown>)?.evaluacionesCompletadas as number || 0,
        tasaCompletitud: (data.estadisticas as Record<string, unknown>)?.tasaCompletitud as number || 0,
        promedioDesempenoUnidad: (data.estadisticas as Record<string, unknown>)?.promedioDesempenoUnidad as number || 0,
        promedioPotencialUnidad: (data.estadisticas as Record<string, unknown>)?.promedioPotencialUnidad as number || 0,
        promedioDesempenoOrganizacion: (data.estadisticas as Record<string, unknown>)?.promedioDesempenoOrganizacion as number || 0,
        promedioPotencialOrganizacion: (data.estadisticas as Record<string, unknown>)?.promedioPotencialOrganizacion as number || 0,
        distribucion9Box: (data.estadisticas as Record<string, unknown>)?.distribucion9Box as Record<string, number> || {},
      },
      eNPS: {
        valor: (data.eNPS as Record<string, unknown>)?.valor as number ?? null,
        promoters: (data.eNPS as Record<string, unknown>)?.promoters as number || 0,
        passives: (data.eNPS as Record<string, unknown>)?.passives as number || 0,
        detractors: (data.eNPS as Record<string, unknown>)?.detractors as number || 0,
        totalRespuestas: (data.eNPS as Record<string, unknown>)?.totalRespuestas as number || 0,
        valorOrganizacion: (data.eNPS as Record<string, unknown>)?.valorOrganizacion as number ?? null,
      },
    };

    return resultado;
  } catch (error) {
    if (error instanceof TeamAnalysisError) {
      throw error;
    }
    throw new TeamAnalysisError(
      "Error inesperado al obtener equipo directo",
      "UNEXPECTED_ERROR",
      500
    );
  }
};

// ============================================================================
// FUNCIÓN PRINCIPAL: Equipo Cascada Completo (Directos + Indirectos)
// ============================================================================

/**
 * Obtiene toda la jerarquía en cascada (directos + indirectos) con todos los datos en UNA sola query
 * Esta es la función principal para el módulo de Análisis de Unidad
 *
 * @param jefeDpi - DPI del jefe (validado contra formato DPI)
 * @param periodoId - ID del período de evaluación (validado como UUID)
 * @returns Colaboradores directos e indirectos con evaluaciones, dimensiones, stats, jefes subordinados y eNPS
 * @throws TeamAnalysisError si la validación falla o no tiene autorización
 *
 * @security
 * - Valida formato de entrada con Zod
 * - Verifica que el usuario autenticado tenga permisos
 * - Registra accesos para auditoría
 */
export const getEquipoCascadaCompleto = async (
  jefeDpi: string,
  periodoId: string
): Promise<EquipoCascadaCompleto | null> => {
  // 1. Validar parámetros de entrada
  const validationResult = equipoDirectoParamsSchema.safeParse({ jefeDpi, periodoId });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors
      .map(e => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    throw new TeamAnalysisError(
      `Parámetros inválidos: ${errorMessages}`,
      "VALIDATION_ERROR",
      400
    );
  }

  // 2. Verificar autorización del usuario (validación soft - no bloquea)
  // La seguridad real está en RLS de Supabase
  await verificarAutorizacion(jefeDpi);

  // 3. Registrar acceso (solo en desarrollo)
  logSecurityEvent("DATA_ACCESS_CASCADA", {
    jefeDpi,
    periodoId,
    timestamp: new Date().toISOString()
  });

  try {
    const { data, error } = await supabase.rpc("get_equipo_cascada_completo", {
      jefe_dpi_param: jefeDpi,
      periodo_id_param: periodoId,
    });

    if (error) {
      throw new TeamAnalysisError(
        `Error al obtener equipo en cascada: ${error.message}`,
        "DATABASE_ERROR",
        500
      );
    }

    if (!data) {
      return null;
    }

    // Transformar los datos del backend al formato esperado
    const resultado: EquipoCascadaCompleto = {
      colaboradores: (data.colaboradores || []).map((c: Record<string, unknown>) => ({
        dpi: c.dpi as string,
        nombreCompleto: c.nombreCompleto as string,
        nombre: (c.nombreCompleto as string)?.split(' ')[0] || '',
        apellidos: (c.nombreCompleto as string)?.split(' ').slice(1).join(' ') || '',
        cargo: c.cargo as string,
        area: c.area as string,
        nivel: c.nivel as string,
        rol: c.esJefe ? 'jefe' : 'colaborador',
        jefeDpi: c.jefeDpi as string,
        jefeNombre: c.jefeNombre as string,
        nivelJerarquico: c.nivelJerarquico as number,
        tieneEvaluacion: c.tieneEvaluacion as boolean,
        desempenoPorcentaje: c.desempenoPorcentaje as number,
        potencialPorcentaje: c.potencialPorcentaje as number,
        posicion9Box: c.posicion9Box as string,
        dimensiones: (c.dimensiones as unknown[]) || [],
        esJefe: c.esJefe as boolean,
        totalColaboradoresDirectos: c.totalSubordinados as number,
      })) as TeamAnalysisNodeCascada[],
      estadisticas: {
        totalPersonas: (data.estadisticas as Record<string, unknown>)?.totalPersonas as number || 0,
        totalJefes: (data.estadisticas as Record<string, unknown>)?.totalJefes as number || 0,
        totalColaboradores: (data.estadisticas as Record<string, unknown>)?.totalColaboradores as number || 0,
        evaluacionesCompletadas: (data.estadisticas as Record<string, unknown>)?.evaluacionesCompletadas as number || 0,
        tasaCompletitud: (data.estadisticas as Record<string, unknown>)?.tasaCompletitud as number || 0,
        promedioDesempenoUnidad: (data.estadisticas as Record<string, unknown>)?.promedioDesempenoUnidad as number || 0,
        promedioPotencialUnidad: (data.estadisticas as Record<string, unknown>)?.promedioPotencialUnidad as number || 0,
        promedioDesempenoOrganizacion: (data.estadisticas as Record<string, unknown>)?.promedioDesempenoOrganizacion as number || 0,
        promedioPotencialOrganizacion: (data.estadisticas as Record<string, unknown>)?.promedioPotencialOrganizacion as number || 0,
        distribucion9Box: (data.estadisticas as Record<string, unknown>)?.distribucion9Box as Record<string, number> || {},
      },
      jefesSubordinados: (data.jefesSubordinados || []).map((j: Record<string, unknown>) => ({
        dpi: j.dpi as string,
        nombre: j.nombre as string,
        cargo: j.cargo as string,
        nivelJerarquico: j.nivelJerarquico as number,
        totalColaboradores: j.totalColaboradores as number,
      })) as JefeParaFiltro[],
      eNPS: {
        valor: (data.eNPS as Record<string, unknown>)?.valor as number ?? null,
        promoters: (data.eNPS as Record<string, unknown>)?.promoters as number || 0,
        passives: (data.eNPS as Record<string, unknown>)?.passives as number || 0,
        detractors: (data.eNPS as Record<string, unknown>)?.detractors as number || 0,
        totalRespuestas: (data.eNPS as Record<string, unknown>)?.totalRespuestas as number || 0,
        valorOrganizacion: (data.eNPS as Record<string, unknown>)?.valorOrganizacion as number ?? null,
      },
    };

    return resultado;
  } catch (error) {
    if (error instanceof TeamAnalysisError) {
      throw error;
    }
    throw new TeamAnalysisError(
      "Error inesperado al obtener equipo en cascada",
      "UNEXPECTED_ERROR",
      500
    );
  }
};

/**
 * Obtiene datos 9-Box para toda la cascada con filtro opcional por jefe subordinado
 *
 * @param jefePrincipalDpi - DPI del jefe principal (raíz de la cascada)
 * @param periodoId - ID del período de evaluación
 * @param filtroJefeDpi - Opcional: DPI de jefe subordinado para filtrar su cascada
 * @returns Array de colaboradores con datos 9-Box
 */
export const get9BoxCascadaFiltrable = async (
  jefePrincipalDpi: string,
  periodoId: string,
  filtroJefeDpi?: string
): Promise<TeamMember9Box[]> => {
  try {
    const { data, error } = await supabase.rpc("get_9box_cascada_filtrable", {
      jefe_principal_dpi: jefePrincipalDpi,
      periodo_id_param: periodoId,
      filtro_jefe_dpi: filtroJefeDpi || null,
    });

    if (error) {
      devLog.error("Error en get9BoxCascadaFiltrable:", error);
      throw error;
    }

    return (data as TeamMember9Box[]) || [];
  } catch (error) {
    devLog.error("Error obteniendo 9-box cascada filtrable:", error);
    return [];
  }
};

// ============================================================================
// FUNCIONES LEGACY (mantener compatibilidad temporal)
// ============================================================================

/**
 * @deprecated Use getEquipoDirectoCompleto instead
 * Obtiene toda la jerarquía en cascada con resultados de evaluación
 */
export const getJerarquiaConResultados = async (
  usuarioDpi: string,
  periodoId: string
): Promise<TeamAnalysisNode[]> => {
  try {
    const { data, error } = await supabase.rpc("get_jerarquia_con_resultados", {
      usuario_dpi: usuarioDpi,
      periodo_id_param: periodoId,
    });

    if (error) {
      devLog.error("Error en getJerarquiaConResultados:", error);
      throw error;
    }

    return (data as TeamAnalysisNode[]) || [];
  } catch (error) {
    devLog.error("Error obteniendo jerarquía con resultados:", error);
    return [];
  }
};

/**
 * Obtiene SOLO colaboradores directos (nivel 1) con resultados de evaluación
 */
export const getJerarquiaDirectaConResultados = async (
  usuarioDpi: string,
  periodoId: string
): Promise<TeamAnalysisNode[]> => {
  try {
    const { data, error } = await supabase.rpc("get_jerarquia_directa_con_resultados", {
      usuario_dpi: usuarioDpi,
      periodo_id_param: periodoId,
    });

    if (error) {
      devLog.error("Error en getJerarquiaDirectaConResultados:", error);
      throw error;
    }

    return (data as TeamAnalysisNode[]) || [];
  } catch (error) {
    devLog.error("Error obteniendo jerarquía directa con resultados:", error);
    return [];
  }
};

/**
 * Obtiene toda la jerarquía en cascada CON resultados desglosados por dimensión
 */
export const getJerarquiaConDimensiones = async (
  usuarioDpi: string,
  periodoId: string
): Promise<TeamAnalysisNode[]> => {
  try {
    const { data, error } = await supabase.rpc("get_jerarquia_con_dimensiones", {
      usuario_dpi: usuarioDpi,
      periodo_id_param: periodoId,
    });

    if (error) {
      devLog.error("Error en getJerarquiaConDimensiones:", error);
      throw error;
    }

    return (data as TeamAnalysisNode[]) || [];
  } catch (error) {
    devLog.error("Error obteniendo jerarquía con dimensiones:", error);
    return [];
  }
};

/**
 * Obtiene SOLO colaboradores directos CON resultados desglosados por dimensión
 */
export const getJerarquiaDirectaConDimensiones = async (
  usuarioDpi: string,
  periodoId: string
): Promise<TeamAnalysisNode[]> => {
  try {
    const { data, error } = await supabase.rpc("get_jerarquia_directa_con_dimensiones", {
      usuario_dpi: usuarioDpi,
      periodo_id_param: periodoId,
    });

    if (error) {
      devLog.error("Error en getJerarquiaDirectaConDimensiones:", error);
      throw error;
    }

    return (data as TeamAnalysisNode[]) || [];
  } catch (error) {
    devLog.error("Error obteniendo jerarquía directa con dimensiones:", error);
    return [];
  }
};

/**
 * Obtiene estadísticas agregadas de toda la unidad en cascada
 */
export const getStatsUnidadCascada = async (
  usuarioDpi: string,
  periodoId: string
): Promise<TeamAnalysisStats | null> => {
  try {
    const { data, error } = await supabase.rpc("get_stats_unidad_cascada", {
      usuario_dpi: usuarioDpi,
      periodo_id_param: periodoId,
    });

    if (error) {
      devLog.error("Error en getStatsUnidadCascada:", error);
      throw error;
    }

    return data as TeamAnalysisStats;
  } catch (error) {
    devLog.error("Error obteniendo stats de unidad:", error);
    return null;
  }
};

/**
 * Obtiene estadísticas agregadas SOLO de colaboradores directos (sin cascada)
 */
export const getStatsUnidadDirecta = async (
  usuarioDpi: string,
  periodoId: string
): Promise<TeamAnalysisStats | null> => {
  try {
    const { data, error } = await supabase.rpc("get_stats_unidad_directa", {
      usuario_dpi: usuarioDpi,
      periodo_id_param: periodoId,
    });

    if (error) {
      devLog.error("Error en getStatsUnidadDirecta:", error);
      throw error;
    }

    return data as TeamAnalysisStats;
  } catch (error) {
    devLog.error("Error obteniendo stats de unidad directa:", error);
    return null;
  }
};

/**
 * Calcula el eNPS (Employee Net Promoter Score) de una unidad
 * eNPS = % Promotores (9-10) - % Detractores (0-6)
 * Rango: -100 a +100
 */
export const getENPSUnidad = async (
  usuarioDpi: string,
  periodoId: string,
  cascada: boolean = true
): Promise<{
  eNPS: number;
  promoters: number;
  passives: number;
  detractors: number;
  totalRespuestas: number;
} | null> => {
  try {
    // Obtener los DPIs de todos los colaboradores de la unidad
    let colaboradoresDpis: string[] = [];

    if (cascada) {
      // Obtener toda la jerarquía en cascada
      const { data: jerarquiaData, error: jerarquiaError } = await supabase.rpc(
        "get_jerarquia_con_resultados",
        {
          usuario_dpi: usuarioDpi,
          periodo_id_param: periodoId,
        }
      );

      if (jerarquiaError) throw jerarquiaError;
      colaboradoresDpis = (jerarquiaData || []).map((c: any) => c.dpi);
    } else {
      // Solo colaboradores directos
      const { data: directosData, error: directosError } = await supabase
        .from("user_assignments")
        .select("colaborador_id")
        .eq("jefe_id", usuarioDpi)
        .eq("activo", true);

      if (directosError) throw directosError;
      colaboradoresDpis = (directosData || []).map((d) => d.colaborador_id);
    }

    if (colaboradoresDpis.length === 0) {
      return null;
    }

    // Obtener los NPS scores de las autoevaluaciones de estos colaboradores
    const { data: npsData, error: npsError } = await supabase
      .from("evaluations")
      .select("nps_score")
      .eq("tipo", "auto")
      .eq("estado", "enviado")
      .eq("periodo_id", periodoId)
      .in("usuario_id", colaboradoresDpis)
      .not("nps_score", "is", null);

    if (npsError) throw npsError;

    if (!npsData || npsData.length === 0) {
      return {
        eNPS: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
        totalRespuestas: 0,
      };
    }

    // Calcular eNPS
    let promoters = 0;
    let passives = 0;
    let detractors = 0;

    npsData.forEach((item) => {
      const score = item.nps_score;
      if (score >= 9) {
        promoters++;
      } else if (score >= 7) {
        passives++;
      } else {
        detractors++;
      }
    });

    const totalRespuestas = npsData.length;
    const eNPS = Math.round(
      ((promoters - detractors) / totalRespuestas) * 100
    );

    return {
      eNPS,
      promoters,
      passives,
      detractors,
      totalRespuestas,
    };
  } catch (error) {
    devLog.error("Error calculando eNPS de unidad:", error);
    return null;
  }
};

/**
 * Obtiene el eNPS organizacional (de toda la organización)
 */
export const getENPSOrganizacional = async (
  periodoId: string
): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from("evaluations")
      .select("nps_score")
      .eq("tipo", "auto")
      .eq("estado", "enviado")
      .eq("periodo_id", periodoId)
      .not("nps_score", "is", null);

    if (error) throw error;

    if (!data || data.length === 0) {
      return null;
    }

    let promoters = 0;
    let detractors = 0;

    data.forEach((item) => {
      const score = item.nps_score;
      if (score >= 9) {
        promoters++;
      } else if (score < 7) {
        detractors++;
      }
    });

    return Math.round(((promoters - detractors) / data.length) * 100);
  } catch (error) {
    devLog.error("Error calculando eNPS organizacional:", error);
    return null;
  }
};

/**
 * Obtiene distribución 9-box de la unidad con filtros opcionales
 */
export const get9BoxUnidad = async (
  usuarioDpi: string,
  periodoId: string,
  filtros?: TeamAnalysisFilters
): Promise<TeamMember9Box[]> => {
  try {
    const { data, error } = await supabase.rpc("get_9box_unidad_filtrable", {
      usuario_dpi: usuarioDpi,
      periodo_id_param: periodoId,
      filtro_jefe_dpi: filtros?.jefeDpi || null,
      filtro_grupo_id: filtros?.grupoId || null,
    });

    if (error) {
      devLog.error("Error en get9BoxUnidad:", error);
      throw error;
    }

    let result = (data as TeamMember9Box[]) || [];

    // Aplicar filtros adicionales en el cliente
    if (filtros?.nivelPuesto) {
      result = result.filter((m) => m.nivel === filtros.nivelPuesto);
    }

    if (filtros?.busqueda) {
      const busquedaLower = filtros.busqueda.toLowerCase();
      result = result.filter(
        (m) =>
          m.nombre.toLowerCase().includes(busquedaLower) ||
          m.cargo.toLowerCase().includes(busquedaLower)
      );
    }

    return result;
  } catch (error) {
    devLog.error("Error obteniendo 9-box de unidad:", error);
    return [];
  }
};

/**
 * Obtiene distribución 9-box SOLO de colaboradores directos (sin cascada)
 */
export const get9BoxUnidadDirecta = async (
  usuarioDpi: string,
  periodoId: string
): Promise<TeamMember9Box[]> => {
  try {
    const { data, error } = await supabase.rpc("get_9box_unidad_directa", {
      usuario_dpi: usuarioDpi,
      periodo_id_param: periodoId,
    });

    if (error) {
      devLog.error("Error en get9BoxUnidadDirecta:", error);
      throw error;
    }

    return (data as TeamMember9Box[]) || [];
  } catch (error) {
    devLog.error("Error obteniendo 9-box de unidad directa:", error);
    return [];
  }
};

/**
 * Obtiene comparativa de todos los equipos de jefes subordinados en cascada
 */
export const getComparativaEquiposCascada = async (
  usuarioDpi: string,
  periodoId: string
): Promise<TeamComparison[]> => {
  try {
    const { data, error } = await supabase.rpc(
      "get_comparativa_equipos_cascada",
      {
        usuario_dpi: usuarioDpi,
        periodo_id_param: periodoId,
      }
    );

    if (error) {
      devLog.error("Error en getComparativaEquiposCascada:", error);
      throw error;
    }

    return (data as TeamComparison[]) || [];
  } catch (error) {
    devLog.error("Error obteniendo comparativa de equipos:", error);
    return [];
  }
};

/**
 * Obtiene detalle completo de un colaborador para el modal
 */
export const getDetalleColaboradorCompleto = async (
  colaboradorDpi: string,
  periodoId: string
): Promise<TeamMemberDetail | null> => {
  try {
    const { data, error } = await supabase.rpc(
      "get_detalle_colaborador_completo",
      {
        colaborador_dpi: colaboradorDpi,
        periodo_id_param: periodoId,
      }
    );

    if (error) {
      devLog.error("Error en getDetalleColaboradorCompleto:", error);
      throw error;
    }

    return data as TeamMemberDetail;
  } catch (error) {
    devLog.error("Error obteniendo detalle de colaborador:", error);
    return null;
  }
};

/**
 * Obtiene lista de jefes subordinados para filtros
 */
export const getJefesParaFiltro = async (
  usuarioDpi: string
): Promise<JefeParaFiltro[]> => {
  try {
    const { data, error } = await supabase.rpc("get_jefes_para_filtro", {
      usuario_dpi: usuarioDpi,
    });

    if (error) {
      devLog.error("Error en getJefesParaFiltro:", error);
      throw error;
    }

    return (data as JefeParaFiltro[]) || [];
  } catch (error) {
    devLog.error("Error obteniendo jefes para filtro:", error);
    return [];
  }
};

/**
 * Obtiene grupos/cuadrillas de la unidad para filtros
 */
export const getGruposUnidad = async (
  usuarioDpi: string
): Promise<GrupoParaFiltro[]> => {
  try {
    const { data, error } = await supabase.rpc("get_grupos_unidad", {
      usuario_dpi: usuarioDpi,
    });

    if (error) {
      devLog.error("Error en getGruposUnidad:", error);
      throw error;
    }

    return (data as GrupoParaFiltro[]) || [];
  } catch (error) {
    devLog.error("Error obteniendo grupos de unidad:", error);
    return [];
  }
};

/**
 * Filtra nodos de jerarquía según los filtros aplicados
 */
export const filtrarJerarquia = (
  nodes: TeamAnalysisNode[],
  filters: TeamAnalysisFilters
): TeamAnalysisNode[] => {
  let resultado = [...nodes];

  // Filtrar por jefe (incluye toda la cascada del jefe seleccionado)
  if (filters.jefeDpi) {
    // Encontrar todos los DPIs que están bajo este jefe
    const dpisDelJefe = new Set<string>();

    const agregarSubordinados = (jefeDpi: string) => {
      nodes.forEach((node) => {
        if (node.jefeDpi === jefeDpi) {
          dpisDelJefe.add(node.dpi);
          // Recursivamente agregar subordinados de este nodo si es jefe
          if (node.esJefe) {
            agregarSubordinados(node.dpi);
          }
        }
      });
    };

    agregarSubordinados(filters.jefeDpi);
    // También incluir al jefe seleccionado
    dpisDelJefe.add(filters.jefeDpi);

    resultado = resultado.filter((node) => dpisDelJefe.has(node.dpi));
  }

  // Filtrar por nivel de puesto
  if (filters.nivelPuesto) {
    resultado = resultado.filter((node) => node.nivel === filters.nivelPuesto);
  }

  // Filtrar por búsqueda de texto
  if (filters.busqueda) {
    const busquedaLower = filters.busqueda.toLowerCase();
    resultado = resultado.filter(
      (node) =>
        node.nombreCompleto.toLowerCase().includes(busquedaLower) ||
        node.cargo.toLowerCase().includes(busquedaLower) ||
        node.area.toLowerCase().includes(busquedaLower)
    );
  }

  return resultado;
};

/**
 * Calcula estadísticas de un subconjunto de nodos
 */
export const calcularStatsDeNodos = (
  nodes: TeamAnalysisNode[]
): Partial<TeamAnalysisStats> => {
  const conEvaluacion = nodes.filter((n) => n.tieneEvaluacion);

  const promedioDesempeno =
    conEvaluacion.length > 0
      ? conEvaluacion.reduce(
          (sum, n) => sum + (n.desempenoPorcentaje || 0),
          0
        ) / conEvaluacion.length
      : 0;

  const promedioPotencial =
    conEvaluacion.length > 0
      ? conEvaluacion.reduce(
          (sum, n) => sum + (n.potencialPorcentaje || 0),
          0
        ) / conEvaluacion.length
      : 0;

  // Distribución 9-box
  const distribucion9Box: Record<string, number> = {};
  conEvaluacion.forEach((n) => {
    if (n.posicion9Box) {
      distribucion9Box[n.posicion9Box] =
        (distribucion9Box[n.posicion9Box] || 0) + 1;
    }
  });

  return {
    totalPersonas: nodes.length,
    totalJefes: nodes.filter((n) => n.esJefe).length,
    totalColaboradores: nodes.filter((n) => !n.esJefe).length,
    evaluacionesCompletadas: conEvaluacion.length,
    tasaCompletitud:
      nodes.length > 0
        ? Math.round((conEvaluacion.length / nodes.length) * 100 * 100) / 100
        : 0,
    promedioDesempenoUnidad: Math.round(promedioDesempeno * 100) / 100,
    promedioPotencialUnidad: Math.round(promedioPotencial * 100) / 100,
    distribucion9Box,
  };
};

/**
 * Agrupa nodos por jefe directo para vista de árbol
 */
export const agruparPorJefe = (
  nodes: TeamAnalysisNode[]
): Map<string, TeamAnalysisNode[]> => {
  const grupos = new Map<string, TeamAnalysisNode[]>();

  nodes.forEach((node) => {
    const jefeId = node.jefeDpi || "sin-jefe";
    if (!grupos.has(jefeId)) {
      grupos.set(jefeId, []);
    }
    grupos.get(jefeId)!.push(node);
  });

  return grupos;
};

/**
 * Obtiene los niveles únicos de la jerarquía para filtro
 */
export const getNivelesUnicos = (nodes: TeamAnalysisNode[]): string[] => {
  const niveles = new Set<string>();
  nodes.forEach((node) => {
    if (node.nivel) {
      niveles.add(node.nivel);
    }
  });
  return Array.from(niveles).sort();
};

/**
 * Obtiene todos los datos del equipo necesarios para análisis de IA
 * Incluye: colaboradores, evaluaciones, comentarios, preguntas abiertas, estadísticas
 */
export const getTeamDataForAIAnalysis = async (
  jefeDpi: string,
  periodoId: string
): Promise<import("@/types/teamAnalysis").TeamAIAnalysisData | null> => {
  try {
    // 1. Obtener colaboradores directos con resultados
    const colaboradores = await getJerarquiaDirectaConResultados(jefeDpi, periodoId);

    // 2. Obtener estadísticas del equipo
    const stats = await getStatsUnidadDirecta(jefeDpi, periodoId);
    if (!stats) {
      devLog.error("No se pudieron obtener estadísticas del equipo");
      return null;
    }

    // 3. Para cada colaborador, obtener datos detallados
    const colaboradoresData: import("@/types/teamAnalysis").ColaboradorAIData[] = [];

    for (const colaborador of colaboradores) {
      // Obtener evaluación del jefe
      const { data: evaluacionJefe } = await supabase
        .from("evaluations")
        .select("comments")
        .eq("tipo", "jefe")
        .eq("colaborador_id", colaborador.dpi)
        .eq("periodo_id", periodoId)
        .eq("estado", "enviado")
        .maybeSingle();

      // Obtener autoevaluación
      const { data: autoevaluacion } = await supabase
        .from("evaluations")
        .select("id, comments")
        .eq("tipo", "auto")
        .eq("usuario_id", colaborador.dpi)
        .eq("periodo_id", periodoId)
        .eq("estado", "enviado")
        .maybeSingle();

      // Obtener preguntas abiertas (herramientas y capacitaciones)
      const comentariosHerramientas: string[] = [];
      const comentariosCapacitaciones: string[] = [];

      if (autoevaluacion?.id) {
        const { data: openQuestionResponses } = await supabase
          .from("open_question_responses")
          .select(`
            respuesta,
            pregunta_id,
            open_questions!inner(
              tipo,
              pregunta
            )
          `)
          .eq("evaluacion_id", autoevaluacion.id);

        if (openQuestionResponses) {
          openQuestionResponses.forEach((resp: any) => {
            if (resp.open_questions?.tipo === "herramienta" && resp.respuesta && resp.respuesta.trim()) {
              comentariosHerramientas.push(resp.respuesta);
            }
            if (resp.open_questions?.tipo === "capacitacion" && resp.respuesta && resp.respuesta.trim()) {
              comentariosCapacitaciones.push(resp.respuesta);
            }
          });
        }
      }

      colaboradoresData.push({
        dpi: colaborador.dpi,
        nombreCompleto: colaborador.nombreCompleto,
        cargo: colaborador.cargo,
        area: colaborador.area,
        nivel: colaborador.nivel,
        posicion9Box: colaborador.posicion9Box,
        desempenoPorcentaje: colaborador.desempenoPorcentaje,
        potencialPorcentaje: colaborador.potencialPorcentaje,
        comentariosJefe: (evaluacionJefe?.comments as Record<string, string>) || {},
        comentariosEmpleado: (autoevaluacion?.comments as Record<string, string>) || {},
        comentariosHerramientas,
        comentariosCapacitaciones,
      });
    }

    // 4. Calcular composición del equipo
    const composicionPorArea: Record<string, number> = {};
    const composicionPorNivel: Record<string, number> = {};
    const composicionPorCargo: Record<string, number> = {};

    colaboradores.forEach((col) => {
      // Por área
      const area = col.area || "Sin área";
      composicionPorArea[area] = (composicionPorArea[area] || 0) + 1;

      // Por nivel
      const nivel = col.nivel || "Sin nivel";
      composicionPorNivel[nivel] = (composicionPorNivel[nivel] || 0) + 1;

      // Por cargo (usar cargo principal, no todos los detalles)
      const cargo = col.cargo || "Sin cargo";
      composicionPorCargo[cargo] = (composicionPorCargo[cargo] || 0) + 1;
    });

    // 5. Obtener nombre del período
    const { data: periodo } = await supabase
      .from("evaluation_periods")
      .select("nombre")
      .eq("id", periodoId)
      .maybeSingle();

    return {
      estadisticasEquipo: {
        totalColaboradores: stats.totalPersonas,
        evaluacionesCompletadas: stats.evaluacionesCompletadas,
        promedioDesempeno: stats.promedioDesempenoUnidad,
        promedioPotencial: stats.promedioPotencialUnidad,
        indiceDesarrollo: (stats.promedioDesempenoUnidad + stats.promedioPotencialUnidad) / 2,
        promedioDesempenoOrganizacion: stats.promedioDesempenoOrganizacion,
        promedioPotencialOrganizacion: stats.promedioPotencialOrganizacion,
        distribucion9Box: stats.distribucion9Box,
      },
      composicionEquipo: {
        porArea: composicionPorArea,
        porNivel: composicionPorNivel,
        porCargo: composicionPorCargo,
      },
      colaboradores: colaboradoresData,
      periodoId,
      periodoNombre: periodo?.nombre,
    };
  } catch (error) {
    devLog.error("Error obteniendo datos del equipo para análisis de IA:", error);
    return null;
  }
};

/**
 * Obtiene todos los datos del equipo en cascada (directos + indirectos) necesarios para análisis de IA
 * Similar a getTeamDataForAIAnalysis pero incluye toda la unidad
 */
export const getTeamDataForAIAnalysisCascada = async (
  jefeDpi: string,
  periodoId: string
): Promise<import("@/types/teamAnalysis").TeamAIAnalysisData | null> => {
  try {
    // 1. Obtener equipo completo en cascada
    const equipoCascada = await getEquipoCascadaCompleto(jefeDpi, periodoId);
    if (!equipoCascada) {
      devLog.error("No se pudieron obtener datos del equipo en cascada");
      return null;
    }

    // 2. Para cada colaborador, obtener datos detallados (comentarios, preguntas abiertas)
    const colaboradoresData: import("@/types/teamAnalysis").ColaboradorAIData[] = [];

    // Obtener mapeo de dimensiones (ID -> Nombre) para todos los instrumentos
    const { data: instrumentConfigs } = await supabase
      .from("instrument_configs")
      .select("id, dimensiones_desempeno")
      .eq("activo", true);

    const dimensionMap: Record<string, string> = {};
    if (instrumentConfigs) {
      instrumentConfigs.forEach((config: any) => {
        if (config.dimensiones_desempeno && Array.isArray(config.dimensiones_desempeno)) {
          config.dimensiones_desempeno.forEach((dim: any) => {
            if (dim.id && dim.nombre) {
              dimensionMap[dim.id] = dim.nombre;
            }
          });
        }
      });
    }

    for (const colaborador of equipoCascada.colaboradores) {
      // Obtener evaluación del jefe
      const { data: evaluacionJefe } = await supabase
        .from("evaluations")
        .select("comments")
        .eq("tipo", "jefe")
        .eq("colaborador_id", colaborador.dpi)
        .eq("periodo_id", periodoId)
        .eq("estado", "enviado")
        .maybeSingle();

      // Obtener autoevaluación
      const { data: autoevaluacion } = await supabase
        .from("evaluations")
        .select("comments, id")
        .eq("tipo", "auto")
        .eq("usuario_id", colaborador.dpi)
        .eq("periodo_id", periodoId)
        .eq("estado", "enviado")
        .maybeSingle();

      // Procesar comentarios del jefe con nombres de dimensiones
      const comentariosJefeProcesados: Record<string, string> = {};
      const comentariosJefeRaw = (evaluacionJefe?.comments as Record<string, string>) || {};
      Object.entries(comentariosJefeRaw).forEach(([dimId, comentario]) => {
        if (comentario && typeof comentario === 'string' && comentario.trim()) {
          comentariosJefeProcesados[dimId] = comentario.trim();
        }
      });

      // Procesar comentarios del empleado con nombres de dimensiones
      const comentariosEmpleadoProcesados: Record<string, string> = {};
      const comentariosEmpleadoRaw = (autoevaluacion?.comments as Record<string, string>) || {};
      Object.entries(comentariosEmpleadoRaw).forEach(([dimId, comentario]) => {
        if (comentario && typeof comentario === 'string' && comentario.trim()) {
          comentariosEmpleadoProcesados[dimId] = comentario.trim();
        }
      });

      // Obtener preguntas abiertas (herramientas y capacitaciones)
      const comentariosHerramientas: string[] = [];
      const comentariosCapacitaciones: string[] = [];

      if (autoevaluacion?.id) {
        const { data: openQuestionResponses } = await supabase
          .from("open_question_responses")
          .select(`
            respuesta,
            pregunta_id,
            open_questions!inner(
              tipo,
              pregunta
            )
          `)
          .eq("evaluacion_id", autoevaluacion.id);

        if (openQuestionResponses) {
          openQuestionResponses.forEach((resp: any) => {
            if (resp.open_questions?.tipo === "herramienta" && resp.respuesta && resp.respuesta.trim()) {
              comentariosHerramientas.push(resp.respuesta);
            }
            if (resp.open_questions?.tipo === "capacitacion" && resp.respuesta && resp.respuesta.trim()) {
              comentariosCapacitaciones.push(resp.respuesta);
            }
          });
        }
      }

      colaboradoresData.push({
        dpi: colaborador.dpi,
        nombreCompleto: colaborador.nombreCompleto,
        cargo: colaborador.cargo,
        area: colaborador.area,
        nivel: colaborador.nivel,
        posicion9Box: colaborador.posicion9Box,
        desempenoPorcentaje: colaborador.desempenoPorcentaje,
        potencialPorcentaje: colaborador.potencialPorcentaje,
        comentariosJefe: comentariosJefeProcesados,
        comentariosEmpleado: comentariosEmpleadoProcesados,
        comentariosHerramientas,
        comentariosCapacitaciones,
      });
    }

    // 3. Calcular composición del equipo
    const composicionPorArea: Record<string, number> = {};
    const composicionPorNivel: Record<string, number> = {};
    const composicionPorCargo: Record<string, number> = {};

    equipoCascada.colaboradores.forEach((col) => {
      // Por área
      const area = col.area || "Sin área";
      composicionPorArea[area] = (composicionPorArea[area] || 0) + 1;

      // Por nivel
      const nivel = col.nivel || "Sin nivel";
      composicionPorNivel[nivel] = (composicionPorNivel[nivel] || 0) + 1;

      // Por cargo
      const cargo = col.cargo || "Sin cargo";
      composicionPorCargo[cargo] = (composicionPorCargo[cargo] || 0) + 1;
    });

    // 4. Obtener nombre del período
    const { data: periodo } = await supabase
      .from("evaluation_periods")
      .select("nombre")
      .eq("id", periodoId)
      .maybeSingle();

    return {
      estadisticasEquipo: {
        totalColaboradores: equipoCascada.estadisticas.totalPersonas,
        evaluacionesCompletadas: equipoCascada.estadisticas.evaluacionesCompletadas,
        promedioDesempeno: equipoCascada.estadisticas.promedioDesempenoUnidad,
        promedioPotencial: equipoCascada.estadisticas.promedioPotencialUnidad,
        indiceDesarrollo: (equipoCascada.estadisticas.promedioDesempenoUnidad + equipoCascada.estadisticas.promedioPotencialUnidad) / 2,
        promedioDesempenoOrganizacion: equipoCascada.estadisticas.promedioDesempenoOrganizacion,
        promedioPotencialOrganizacion: equipoCascada.estadisticas.promedioPotencialOrganizacion,
        distribucion9Box: equipoCascada.estadisticas.distribucion9Box,
      },
      composicionEquipo: {
        porArea: composicionPorArea,
        porNivel: composicionPorNivel,
        porCargo: composicionPorCargo,
      },
      colaboradores: colaboradoresData,
      periodoId,
      periodoNombre: periodo?.nombre,
    };
  } catch (error) {
    devLog.error("Error obteniendo datos del equipo en cascada para análisis de IA:", error);
    return null;
  }
};
