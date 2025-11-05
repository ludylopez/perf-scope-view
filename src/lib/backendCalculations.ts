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
  try {
    const { data, error } = await supabase.rpc("calculate_complete_final_result", {
      autoevaluacion_id: autoevaluacionId,
      evaluacion_jefe_id: evaluacionJefeId,
      instrument_config: instrumentConfig,
    });

    if (error) {
      console.error("Error calling calculate_complete_final_result:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Convertir resultado JSONB a FinalScore
    return {
      desempenoAuto: data.desempenoAuto,
      desempenoJefe: data.desempenoJefe,
      desempenoFinal: data.desempenoFinal,
      potencial: data.potencial,
      posicion9Box: data.posicion9Box,
    };
  } catch (error) {
    console.error("Error in callCalculateFinalResult:", error);
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
  try {
    const { data, error } = await supabase.rpc("get_instrument_config_from_user", {
      user_dpi: userDpi,
    });

    if (error) {
      console.error("Error calling get_instrument_config_from_user:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getInstrumentConfigForUser:", error);
    return null;
  }
};

