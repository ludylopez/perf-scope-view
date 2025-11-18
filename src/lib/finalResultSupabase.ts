import { supabase } from "@/integrations/supabase/client";
import { FinalScore, EvaluationResultByEvaluator, ConsolidatedEvaluationResult } from "@/types/evaluation";
import { scoreToPercentage } from "@/lib/calculations";

/**
 * Guarda el resultado final de evaluación en Supabase
 */
export const saveFinalResultToSupabase = async (
  colaboradorId: string,
  periodoId: string,
  autoevaluacionId: string | null,
  evaluacionJefeId: string | null,
  resultadoFinal: FinalScore,
  comparativo?: any
): Promise<string | null> => {
  try {
    // Si no tenemos los IDs, no podemos guardar
    if (!autoevaluacionId || !evaluacionJefeId) {
      console.warn("No se pueden guardar resultados finales sin IDs de evaluaciones");
      return null;
    }

    const desempenoPorcentaje = scoreToPercentage(resultadoFinal.desempenoFinal);
    const potencialPorcentaje = resultadoFinal.potencial 
      ? scoreToPercentage(resultadoFinal.potencial)
      : null;

    const resultadoData = {
      colaborador_id: colaboradorId,
      periodo_id: periodoId,
      autoevaluacion_id: autoevaluacionId,
      evaluacion_jefe_id: evaluacionJefeId,
      resultado_final: {
        desempenoAuto: resultadoFinal.desempenoAuto,
        desempenoJefe: resultadoFinal.desempenoJefe,
        desempenoFinal: resultadoFinal.desempenoFinal,
        potencial: resultadoFinal.potencial,
        posicion9Box: resultadoFinal.posicion9Box,
      },
      comparativo: comparativo || {},
      // Campos individuales para facilitar consultas
      posicion_9box: resultadoFinal.posicion9Box || null,
      desempeno_final: resultadoFinal.desempenoFinal,
      desempeno_porcentaje: desempenoPorcentaje,
      potencial: resultadoFinal.potencial || null,
      potencial_porcentaje: potencialPorcentaje,
    };

    // Verificar si ya existe
    const { data: existing } = await supabase
      .from("final_evaluation_results")
      .select("id")
      .eq("colaborador_id", colaboradorId)
      .eq("periodo_id", periodoId)
      .maybeSingle();

    if (existing) {
      // Actualizar registro existente
      const { data, error } = await supabase
        .from("final_evaluation_results")
        .update(resultadoData)
        .eq("id", existing.id)
        .select("id")
        .single();

      if (error) {
        console.error("Error updating final result:", error);
        return null;
      }
      return data.id;
    } else {
      // Crear nuevo registro
      const { data, error } = await supabase
        .from("final_evaluation_results")
        .insert(resultadoData)
        .select("id")
        .single();

      if (error) {
        console.error("Error saving final result:", error);
        return null;
      }
      return data.id;
    }
  } catch (error) {
    console.error("Error in saveFinalResultToSupabase:", error);
    return null;
  }
};

/**
 * Obtiene el resultado final de evaluación desde Supabase
 */
export const getFinalResultFromSupabase = async (
  colaboradorId: string,
  periodoId: string
): Promise<FinalScore | null> => {
  try {
    const { data, error } = await supabase
      .from("final_evaluation_results")
      .select("*")
      .eq("colaborador_id", colaboradorId)
      .eq("periodo_id", periodoId)
      .single();

    if (error || !data) return null;

    // Si el resultado_final tiene los datos completos, usarlos
    if (data.resultado_final) {
      return data.resultado_final as FinalScore;
    }

    // Si no, construir desde los campos individuales
    // Convertir strings a números si es necesario
    const desempenoFinal = typeof data.desempeno_final === 'string' 
      ? parseFloat(data.desempeno_final) 
      : (data.desempeno_final || data.resultado_final?.desempenoFinal || 0);
    
    const potencial = typeof data.potencial === 'string'
      ? parseFloat(data.potencial)
      : (data.potencial || data.resultado_final?.potencial || null);
    
    return {
      desempenoAuto: data.resultado_final?.desempenoAuto,
      desempenoJefe: data.resultado_final?.desempenoJefe,
      desempenoFinal: desempenoFinal,
      potencial: potencial,
      posicion9Box: data.posicion_9box || data.resultado_final?.posicion9Box,
    };
  } catch (error) {
    console.error("Error in getFinalResultFromSupabase:", error);
    return null;
  }
};

/**
 * Obtiene todos los resultados finales de un jefe para la matriz 9-box
 */
export const getFinalResultsByJefe = async (
  jefeId: string,
  periodoId: string
): Promise<Array<{
  colaboradorId: string;
  nombre: string;
  cargo: string;
  area: string;
  nivel: string;
  resultadoFinal: FinalScore;
}>> => {
  try {
    // Obtener asignaciones del jefe
    const { data: assignments, error: assignmentsError } = await supabase
      .from("user_assignments")
      .select(`
        colaborador_id,
        users!user_assignments_colaborador_id_fkey (
          dpi,
          nombre,
          apellidos,
          cargo,
          nivel,
          area
        )
      `)
      .eq("jefe_id", jefeId)
      .eq("periodo_id", periodoId);

    if (assignmentsError || !assignments) return [];

    // Para cada colaborador, obtener su resultado final
    const results = [];
    for (const assignment of assignments) {
      // users es un objeto, no un array
      const colaborador = Array.isArray(assignment.users) ? assignment.users[0] : assignment.users;
      if (!colaborador) continue;
      
      const resultado = await getFinalResultFromSupabase(colaborador.dpi, periodoId);

      if (resultado) {
        results.push({
          colaboradorId: colaborador.dpi,
          nombre: `${colaborador.nombre} ${colaborador.apellidos}`,
          cargo: colaborador.cargo,
          area: colaborador.area,
          nivel: colaborador.nivel,
          resultadoFinal: resultado,
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Error in getFinalResultsByJefe:", error);
    return [];
  }
};

/**
 * Guarda el resultado de evaluación por evaluador en evaluation_results_by_evaluator
 */
export const saveResultByEvaluator = async (
  colaboradorId: string,
  periodoId: string,
  evaluadorId: string,
  autoevaluacionId: string,
  evaluacionJefeId: string,
  resultadoFinal: FinalScore,
  comparativo?: any
): Promise<string | null> => {
  try {
    const desempenoPorcentaje = scoreToPercentage(resultadoFinal.desempenoFinal);
    const potencialPorcentaje = resultadoFinal.potencial 
      ? scoreToPercentage(resultadoFinal.potencial)
      : null;

    const resultadoData = {
      colaborador_id: colaboradorId,
      periodo_id: periodoId,
      evaluador_id: evaluadorId,
      autoevaluacion_id: autoevaluacionId,
      evaluacion_jefe_id: evaluacionJefeId,
      resultado_final: {
        desempenoAuto: resultadoFinal.desempenoAuto,
        desempenoJefe: resultadoFinal.desempenoJefe,
        desempenoFinal: resultadoFinal.desempenoFinal,
        potencial: resultadoFinal.potencial,
        posicion9Box: resultadoFinal.posicion9Box,
      },
      comparativo: comparativo || {},
      posicion_9box: resultadoFinal.posicion9Box || null,
      desempeno_final: resultadoFinal.desempenoFinal,
      desempeno_porcentaje: desempenoPorcentaje,
      potencial: resultadoFinal.potencial || null,
      potencial_porcentaje: potencialPorcentaje,
    };

    // Upsert (insertar o actualizar) usando ON CONFLICT
    const { data, error } = await supabase
      .from("evaluation_results_by_evaluator")
      .upsert(resultadoData, {
        onConflict: "colaborador_id,periodo_id,evaluador_id",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error saving result by evaluator:", error);
      return null;
    }
    return data.id;
  } catch (error) {
    console.error("Error in saveResultByEvaluator:", error);
    return null;
  }
};

/**
 * Obtiene el resultado consolidado de evaluación para un colaborador
 * Usa la función RPC get_consolidated_result
 */
export const getConsolidatedResult = async (
  colaboradorId: string,
  periodoId: string
): Promise<ConsolidatedEvaluationResult | null> => {
  try {
    const { data, error } = await supabase
      .rpc("get_consolidated_result", {
        p_colaborador_id: colaboradorId,
        p_periodo_id: periodoId,
      });

    if (error || !data || Object.keys(data).length === 0) {
      return null;
    }

    // Enriquecer con nombres de evaluadores
    const enrichedData = await enrichResultsWithEvaluatorNames(data);
    return enrichedData;
  } catch (error) {
    console.error("Error in getConsolidatedResult:", error);
    return null;
  }
};

/**
 * Obtiene todos los resultados individuales por evaluador para un colaborador
 */
export const getResultsByEvaluator = async (
  colaboradorId: string,
  periodoId: string
): Promise<EvaluationResultByEvaluator[]> => {
  try {
    const { data, error } = await supabase
      .from("evaluation_results_by_evaluator")
      .select(`
        *,
        evaluador:users!evaluation_results_by_evaluator_evaluador_id_fkey (
          dpi,
          nombre,
          apellidos
        )
      `)
      .eq("colaborador_id", colaboradorId)
      .eq("periodo_id", periodoId);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      colaboradorId: row.colaborador_id,
      periodoId: row.periodo_id,
      evaluadorId: row.evaluador_id,
      evaluadorNombre: row.evaluador 
        ? `${row.evaluador.nombre} ${row.evaluador.apellidos}`
        : undefined,
      autoevaluacionId: row.autoevaluacion_id,
      evaluacionJefeId: row.evaluacion_jefe_id,
      resultadoFinal: row.resultado_final as FinalScore,
      comparativo: row.comparativo || {},
      posicion9Box: row.posicion_9box,
      desempenoFinal: row.desempeno_final,
      desempenoPorcentaje: row.desempeno_porcentaje,
      potencial: row.potencial,
      potencialPorcentaje: row.potencial_porcentaje,
      fechaGeneracion: row.fecha_generacion,
    }));
  } catch (error) {
    console.error("Error in getResultsByEvaluator:", error);
    return [];
  }
};

/**
 * Enriquece los resultados consolidados con nombres de evaluadores
 */
export const enrichResultsWithEvaluatorNames = async (
  consolidatedResult: any
): Promise<ConsolidatedEvaluationResult> => {
  if (!consolidatedResult.resultados_por_evaluador || !Array.isArray(consolidatedResult.resultados_por_evaluador)) {
    return consolidatedResult as ConsolidatedEvaluationResult;
  }

  // Obtener nombres de evaluadores
  const evaluadorIds = consolidatedResult.resultados_por_evaluador.map(
    (r: any) => r.evaluador_id
  );

  const { data: evaluadores } = await supabase
    .from("users")
    .select("dpi, nombre, apellidos")
    .in("dpi", evaluadorIds);

  const evaluadoresMap = new Map(
    evaluadores?.map((e: any) => [
      e.dpi,
      `${e.nombre} ${e.apellidos}`,
    ]) || []
  );

  // Enriquecer resultados con nombres
  const resultadosEnriquecidos = consolidatedResult.resultados_por_evaluador.map(
    (r: any) => ({
      ...r,
      evaluadorNombre: evaluadoresMap.get(r.evaluador_id),
    })
  );

  return {
    ...consolidatedResult,
    resultadosPorEvaluador: resultadosEnriquecidos,
  } as ConsolidatedEvaluationResult;
};

