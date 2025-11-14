import { supabase } from "@/integrations/supabase/client";
import { FinalScore } from "@/types/evaluation";
import { EvaluationDraft } from "@/lib/storage";

/**
 * Llama a la función SQL del backend para calcular resultado final
 */
export const callCalculateFinalResult = async (
  autoevaluacionId: string,
  evaluacionJefeId: string,
  instrumentConfig: any
): Promise<FinalScore | null> => {
  console.log("🔧 [Backend] Iniciando cálculo desde backend:", {
    autoevaluacionId,
    evaluacionJefeId,
    instrumentId: instrumentConfig?.id || instrumentConfig?.nivel || "desconocido",
    tieneConfiguracion: !!instrumentConfig,
  });

  try {
    const { data, error } = await supabase.rpc("calculate_complete_final_result", {
      autoevaluacion_id: autoevaluacionId,
      evaluacion_jefe_id: evaluacionJefeId,
      instrument_config: instrumentConfig,
    });

    if (error) {
      console.error("❌ [Backend] Error en calculate_complete_final_result:", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        autoevaluacionId,
        evaluacionJefeId,
      });
      return null;
    }

    if (!data) {
      console.warn("⚠️ [Backend] calculate_complete_final_result retornó null/undefined");
      return null;
    }

    // Validar que los datos sean correctos
    if (typeof data.desempenoFinal !== 'number' || isNaN(data.desempenoFinal)) {
      console.error("❌ [Backend] Resultado inválido: desempenoFinal no es un número válido", data);
      return null;
    }

    // Convertir resultado JSONB a FinalScore
    const resultado: FinalScore = {
      desempenoAuto: data.desempenoAuto,
      desempenoJefe: data.desempenoJefe,
      desempenoFinal: data.desempenoFinal,
      potencial: data.potencial,
      posicion9Box: data.posicion9Box,
    };

    console.log("✅ [Backend] Cálculo exitoso:", {
      desempenoAuto: resultado.desempenoAuto,
      desempenoJefe: resultado.desempenoJefe,
      desempenoFinal: resultado.desempenoFinal,
      potencial: resultado.potencial,
      posicion9Box: resultado.posicion9Box,
    });

    return resultado;
  } catch (error) {
    console.error("❌ [Backend] Excepción en callCalculateFinalResult:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      autoevaluacionId,
      evaluacionJefeId,
    });
    return null;
  }
};

/**
 * Llama a la función SQL del backend para validar que una evaluación esté completa
 */
export const callValidateEvaluationComplete = async (
  evaluacionId: string,
  instrumentConfig: any
): Promise<boolean> => {
  try {
    // Primero obtener la evaluación
    const { data: evaluacion, error: fetchError } = await supabase
      .from("evaluations")
      .select("responses, evaluacion_potencial, tipo")
      .eq("id", evaluacionId)
      .single();

    if (fetchError || !evaluacion) {
      console.error("Error fetching evaluation:", fetchError);
      return false;
    }

    // Determinar dimensiones según tipo
    let dimensions: any;
    if (evaluacion.tipo === "auto") {
      dimensions = instrumentConfig.dimensionesDesempeno;
    } else {
      dimensions = instrumentConfig.dimensionesDesempeno;
    }

    // Llamar a función SQL de validación
    const { data, error } = await supabase.rpc("validate_evaluation_complete", {
      responses: evaluacion.responses,
      dimensions: dimensions,
    });

    if (error) {
      console.error("Error calling validate_evaluation_complete:", error);
      return false;
    }

    // Si es evaluación de jefe, también validar potencial si existe
    if (
      evaluacion.tipo === "jefe" &&
      evaluacion.evaluacion_potencial?.responses &&
      instrumentConfig.dimensionesPotencial
    ) {
      const { data: potencialValid, error: potencialError } = await supabase.rpc(
        "validate_evaluation_complete",
        {
          responses: evaluacion.evaluacion_potencial.responses,
          dimensions: instrumentConfig.dimensionesPotencial,
        }
      );

      if (potencialError || !potencialValid) {
        return false;
      }
    }

    return data === true;
  } catch (error) {
    console.error("Error in callValidateEvaluationComplete:", error);
    return false;
  }
};

/**
 * Llama a la función SQL del backend para validar que un período esté activo
 */
export const callValidatePeriodActive = async (
  periodoId: string,
  tipoEvaluacion: "auto" | "jefe"
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc("validate_period_active", {
      periodo_id: periodoId,
      tipo_evaluacion: tipoEvaluacion,
    });

    if (error) {
      console.error("Error calling validate_period_active:", error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error("Error in callValidatePeriodActive:", error);
    return false;
  }
};

/**
 * Obtiene la configuración de instrumento desde el backend
 */
export const getInstrumentConfigFromBackend = async (
  instrumentId: string
): Promise<any | null> => {
  try {
    const { data, error } = await supabase.rpc("get_instrument_config", {
      instrument_id: instrumentId,
    });

    if (error) {
      console.error("Error calling get_instrument_config:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getInstrumentConfigFromBackend:", error);
    return null;
  }
};

/**
 * Obtiene la configuración de instrumento para un usuario desde el backend
 */
export const getInstrumentConfigForUser = async (
  userDpi: string
): Promise<any | null> => {
  console.log("🔍 [Backend] Obteniendo configuración de instrumento para usuario:", userDpi);
  
  try {
    const { data, error } = await supabase.rpc("get_instrument_config_from_user", {
      user_dpi: userDpi,
    });

    if (error) {
      console.error("❌ [Backend] Error obteniendo configuración de instrumento:", {
        error: error.message,
        code: error.code,
        userDpi,
      });
      return null;
    }

    if (!data) {
      console.warn("⚠️ [Backend] No se encontró configuración de instrumento para:", userDpi);
      return null;
    }

    // Validar estructura básica
    if (!data.id && !data.nivel) {
      console.error("❌ [Backend] Configuración de instrumento inválida (falta id/nivel):", data);
      return null;
    }

    console.log("✅ [Backend] Configuración obtenida:", {
      instrumentId: data.id || data.nivel,
      nivel: data.nivel,
      tieneDimensionesDesempeno: !!data.dimensionesDesempeno,
      numDimensiones: Array.isArray(data.dimensionesDesempeno) ? data.dimensionesDesempeno.length : 0,
      configuracion_calculo: data.configuracion_calculo,
    });

    return data;
  } catch (error) {
    console.error("❌ [Backend] Excepción en getInstrumentConfigForUser:", {
      error: error instanceof Error ? error.message : String(error),
      userDpi,
    });
    return null;
  }
};

