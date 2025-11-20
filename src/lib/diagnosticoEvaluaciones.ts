/**
 * Funciones de diagnóstico para verificar dónde están las evaluaciones completadas
 * Estas funciones se exponen en la consola del navegador para facilitar el diagnóstico
 */

import { supabase } from "@/integrations/supabase/client";
import { getEvaluationDraft, getJefeEvaluationDraft } from "./storage";

export interface DiagnosticoEvaluacion {
  usuarioId: string;
  periodoId: string;
  tipo: "auto" | "jefe";
  encontradaEn: "supabase" | "localStorage" | "ambos" | "ninguno";
  estado?: "borrador" | "enviado";
  fechaEnvio?: string;
  fechaUltimaModificacion?: string;
  progreso?: number;
  evaluadorId?: string;
  colaboradorId?: string;
}

/**
 * Diagnostica todas las evaluaciones de un usuario en un período
 */
export const diagnosticarEvaluacionesUsuario = async (
  usuarioId: string,
  periodoId: string
): Promise<{
  autoevaluacion: DiagnosticoEvaluacion | null;
  evaluacionesJefe: DiagnosticoEvaluacion[];
  resumen: {
    totalEnSupabase: number;
    totalEnLocalStorage: number;
    totalCompletadas: number;
    totalBorradores: number;
  };
}> => {
  const resultado = {
    autoevaluacion: null as DiagnosticoEvaluacion | null,
    evaluacionesJefe: [] as DiagnosticoEvaluacion[],
    resumen: {
      totalEnSupabase: 0,
      totalEnLocalStorage: 0,
      totalCompletadas: 0,
      totalBorradores: 0,
    },
  };

  try {
    // 1. Verificar autoevaluación en Supabase
    const { data: autoSupabase, error: autoError } = await supabase
      .from("evaluations")
      .select("*")
      .eq("usuario_id", usuarioId)
      .eq("periodo_id", periodoId)
      .eq("tipo", "auto")
      .maybeSingle();

    // 2. Verificar autoevaluación en localStorage
    const autoLocalStorage = await getEvaluationDraft(usuarioId, periodoId);

    // 3. Consolidar información de autoevaluación
    if (autoSupabase || autoLocalStorage) {
      const encontradaEn =
        autoSupabase && autoLocalStorage
          ? "ambos"
          : autoSupabase
          ? "supabase"
          : "localStorage";

      resultado.autoevaluacion = {
        usuarioId,
        periodoId,
        tipo: "auto",
        encontradaEn,
        estado: autoSupabase?.estado || autoLocalStorage?.estado,
        fechaEnvio: autoSupabase?.fecha_envio || autoLocalStorage?.fechaEnvio,
        fechaUltimaModificacion:
          autoSupabase?.fecha_ultima_modificacion ||
          autoLocalStorage?.fechaUltimaModificacion,
        progreso: autoSupabase?.progreso || autoLocalStorage?.progreso,
      };

      if (autoSupabase) resultado.resumen.totalEnSupabase++;
      if (autoLocalStorage) resultado.resumen.totalEnLocalStorage++;
      if (resultado.autoevaluacion.estado === "enviado")
        resultado.resumen.totalCompletadas++;
      if (resultado.autoevaluacion.estado === "borrador")
        resultado.resumen.totalBorradores++;
    }

    // 4. Verificar evaluaciones del jefe en Supabase
    const { data: jefesSupabase, error: jefesError } = await supabase
      .from("evaluations")
      .select("*")
      .eq("colaborador_id", usuarioId)
      .eq("periodo_id", periodoId)
      .eq("tipo", "jefe");

    // 5. Obtener jefes asignados para verificar en localStorage
    const { data: asignaciones } = await supabase
      .from("user_assignments")
      .select("jefe_id")
      .eq("colaborador_id", usuarioId)
      .eq("activo", true);

    const jefesAsignados = asignaciones?.map((a) => a.jefe_id) || [];

    // 6. Verificar evaluaciones del jefe en localStorage
    const jefesLocalStorage = await Promise.all(
      jefesAsignados.map((jefeId) =>
        getJefeEvaluationDraft(jefeId, usuarioId, periodoId)
      )
    );

    // 7. Consolidar información de evaluaciones del jefe
    const jefesMap = new Map<string, any>();
    jefesSupabase?.forEach((evaluacion) => {
      const key = `${evaluacion.evaluador_id}_${evaluacion.colaborador_id}`;
      jefesMap.set(key, { supabase: evaluacion, localStorage: null });
    });

    jefesLocalStorage.forEach((evaluacion, index) => {
      if (evaluacion) {
        const jefeId = jefesAsignados[index];
        const key = `${jefeId}_${usuarioId}`;
        if (jefesMap.has(key)) {
          jefesMap.get(key).localStorage = evaluacion;
        } else {
          jefesMap.set(key, { supabase: null, localStorage: evaluacion });
        }
      }
    });

    jefesMap.forEach((data, key) => {
      const [evaluadorId] = key.split("_");
      const encontradaEn =
        data.supabase && data.localStorage
          ? "ambos"
          : data.supabase
          ? "supabase"
          : "localStorage";

      const evaluacion = data.supabase || data.localStorage;

      resultado.evaluacionesJefe.push({
        usuarioId,
        periodoId,
        tipo: "jefe",
        encontradaEn,
        estado: evaluacion?.estado,
        fechaEnvio: evaluacion?.fecha_envio || evaluacion?.fechaEnvio,
        fechaUltimaModificacion:
          evaluacion?.fecha_ultima_modificacion ||
          evaluacion?.fechaUltimaModificacion,
        progreso: evaluacion?.progreso,
        evaluadorId: evaluacion?.evaluador_id || evaluadorId,
        colaboradorId: evaluacion?.colaborador_id || usuarioId,
      });

      if (data.supabase) resultado.resumen.totalEnSupabase++;
      if (data.localStorage) resultado.resumen.totalEnLocalStorage++;
      if (evaluacion?.estado === "enviado")
        resultado.resumen.totalCompletadas++;
      if (evaluacion?.estado === "borrador")
        resultado.resumen.totalBorradores++;
    });

    return resultado;
  } catch (error) {
    console.error("Error en diagnóstico:", error);
    throw error;
  }
};

/**
 * Lista todas las evaluaciones completadas en Supabase para un período
 */
export const listarEvaluacionesCompletadas = async (
  periodoId: string
): Promise<{
  autoevaluaciones: any[];
  evaluacionesJefe: any[];
  total: number;
}> => {
  try {
    // Obtener todas las autoevaluaciones completadas
    const { data: autoevaluaciones, error: autoError } = await supabase
      .from("evaluations")
      .select("*")
      .eq("periodo_id", periodoId)
      .eq("tipo", "auto")
      .eq("estado", "enviado");

    if (autoError) {
      console.error("Error obteniendo autoevaluaciones:", autoError);
    }

    // Obtener todas las evaluaciones del jefe completadas
    const { data: evaluacionesJefe, error: jefeError } = await supabase
      .from("evaluations")
      .select("*")
      .eq("periodo_id", periodoId)
      .eq("tipo", "jefe")
      .eq("estado", "enviado");

    if (jefeError) {
      console.error("Error obteniendo evaluaciones del jefe:", jefeError);
    }

    return {
      autoevaluaciones: autoevaluaciones || [],
      evaluacionesJefe: evaluacionesJefe || [],
      total: (autoevaluaciones?.length || 0) + (evaluacionesJefe?.length || 0),
    };
  } catch (error) {
    console.error("Error listando evaluaciones:", error);
    throw error;
  }
};

/**
 * Verifica evaluaciones en localStorage
 */
export const verificarLocalStorage = (): {
  evaluaciones: Array<{
    key: string;
    tipo: "auto" | "jefe";
    usuarioId: string;
    periodoId: string;
    estado: string;
    fechaUltimaModificacion: string;
  }>;
  total: number;
} => {
  const evaluaciones: any[] = [];
  const STORAGE_KEY_PREFIX = "evaluation_";
  const JEFE_EVALUATION_PREFIX = "jefe_evaluation_";

  // Buscar todas las claves de evaluaciones en localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    if (
      key.startsWith(STORAGE_KEY_PREFIX) ||
      key.startsWith(JEFE_EVALUATION_PREFIX)
    ) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || "{}");
        evaluaciones.push({
          key,
          tipo: key.startsWith(JEFE_EVALUATION_PREFIX) ? "jefe" : "auto",
          usuarioId: data.usuarioId || "N/A",
          periodoId: data.periodoId || "N/A",
          estado: data.estado || "N/A",
          fechaUltimaModificacion:
            data.fechaUltimaModificacion || "N/A",
        });
      } catch (error) {
        console.error(`Error parseando ${key}:`, error);
      }
    }
  }

  return {
    evaluaciones,
    total: evaluaciones.length,
  };
};

/**
 * Migra evaluaciones de localStorage a Supabase (si no existen ya)
 */
export const migrarEvaluacionesLocalStorage = async (
  usuarioId?: string
): Promise<{
  migradas: number;
  errores: number;
  detalles: Array<{ key: string; resultado: string }>;
}> => {
  const resultado = {
    migradas: 0,
    errores: 0,
    detalles: [] as Array<{ key: string; resultado: string }>,
  };

  const localStorageData = verificarLocalStorage();

  for (const evalData of localStorageData.evaluaciones) {
    // Si se especificó un usuarioId, solo migrar las de ese usuario
    if (usuarioId && evalData.usuarioId !== usuarioId) continue;

    try {
      const rawData = localStorage.getItem(evalData.key);
      if (!rawData) continue;

      const draft = JSON.parse(rawData);

      // Verificar si ya existe en Supabase
      let existe = false;
      if (draft.tipo === "auto") {
        const { data } = await supabase
          .from("evaluations")
          .select("id")
          .eq("usuario_id", draft.usuarioId)
          .eq("periodo_id", draft.periodoId)
          .eq("tipo", "auto")
          .maybeSingle();
        existe = !!data;
      } else if (draft.tipo === "jefe" && draft.evaluadorId && draft.colaboradorId) {
        const { data } = await supabase
          .from("evaluations")
          .select("id")
          .eq("evaluador_id", draft.evaluadorId)
          .eq("colaborador_id", draft.colaboradorId)
          .eq("periodo_id", draft.periodoId)
          .eq("tipo", "jefe")
          .maybeSingle();
        existe = !!data;
      }

      if (existe) {
        resultado.detalles.push({
          key: evalData.key,
          resultado: "Ya existe en Supabase, omitida",
        });
        continue;
      }

      // Migrar a Supabase
      const evaluationData: any = {
        usuario_id: draft.usuarioId,
        periodo_id: draft.periodoId,
        tipo: draft.tipo,
        responses: draft.responses || {},
        comments: draft.comments || {},
        estado: draft.estado || "borrador",
        progreso: draft.progreso || 0,
        fecha_ultima_modificacion: draft.fechaUltimaModificacion || new Date().toISOString(),
      };

      if (draft.tipo === "jefe" && draft.evaluadorId && draft.colaboradorId) {
        evaluationData.evaluador_id = draft.evaluadorId;
        evaluationData.colaborador_id = draft.colaboradorId;
        if (draft.evaluacionPotencial) {
          evaluationData.evaluacion_potencial = draft.evaluacionPotencial;
        }
      }

      if (draft.fechaEnvio) {
        evaluationData.fecha_envio = draft.fechaEnvio;
      }

      if (draft.npsScore !== undefined) {
        evaluationData.nps_score = draft.npsScore;
      }

      const { error } = await supabase
        .from("evaluations")
        .insert(evaluationData);

      if (error) {
        resultado.errores++;
        resultado.detalles.push({
          key: evalData.key,
          resultado: `Error: ${error.message}`,
        });
      } else {
        resultado.migradas++;
        resultado.detalles.push({
          key: evalData.key,
          resultado: "Migrada exitosamente",
        });
      }
    } catch (error: any) {
      resultado.errores++;
      resultado.detalles.push({
        key: evalData.key,
        resultado: `Error: ${error.message}`,
      });
    }
  }

  return resultado;
};

// Exponer funciones en la consola del navegador
if (typeof window !== "undefined") {
  (window as any).diagnosticarEvaluaciones = {
    usuario: diagnosticarEvaluacionesUsuario,
    listarCompletadas: listarEvaluacionesCompletadas,
    verificarLocalStorage,
    migrarLocalStorage: migrarEvaluacionesLocalStorage,
  };

  console.log(`
✅ Funciones de diagnóstico de evaluaciones disponibles en consola:

📋 Uso:
  // Diagnosticar evaluaciones de un usuario
  await diagnosticarEvaluaciones.usuario('DPI_USUARIO', 'PERIODO_ID')
  
  // Listar todas las evaluaciones completadas de un período
  await diagnosticarEvaluaciones.listarCompletadas('PERIODO_ID')
  
  // Verificar evaluaciones en localStorage
  diagnosticarEvaluaciones.verificarLocalStorage()
  
  // Migrar evaluaciones de localStorage a Supabase
  await diagnosticarEvaluaciones.migrarLocalStorage('DPI_USUARIO_OPCIONAL')
  `);
}

