/**
 * Script de diagnóstico para verificar cálculos de evaluación
 * Ejecutar en la consola del navegador: window.diagnosticoEvaluacion('1766286060101', 'a41e0f9b-00bf-40b2-895c-72569fc6139a')
 */

import { supabase } from "@/integrations/supabase/client";
import { calculatePerformanceScore } from "@/lib/calculations";
import { scoreToPercentage } from "@/lib/calculations";
import { getInstrumentForUser } from "@/lib/instruments";

export const diagnosticarEvaluacion = async (
  colaboradorId: string,
  periodoId: string
) => {
  console.log("=== DIAGNÓSTICO DE EVALUACIÓN ===");
  console.log(`Colaborador: ${colaboradorId}`);
  console.log(`Período: ${periodoId}`);
  console.log("");

  try {
    // 1. Obtener autoevaluación
    const { data: autoEval, error: autoError } = await supabase
      .from("evaluations")
      .select("*")
      .eq("usuario_id", colaboradorId)
      .eq("periodo_id", periodoId)
      .eq("tipo", "auto")
      .eq("estado", "enviado")
      .single();

    if (autoError || !autoEval) {
      console.error("❌ Error obteniendo autoevaluación:", autoError);
      return;
    }

    console.log("✅ AUTOEVALUACIÓN ENCONTRADA:");
    console.log("  ID:", autoEval.id);
    console.log("  Total respuestas:", Object.keys(autoEval.responses || {}).length);
    console.log("  Respuestas:", autoEval.responses);
    console.log("");

    // 2. Obtener evaluación del jefe
    const { data: jefeEval, error: jefeError } = await supabase
      .from("evaluations")
      .select("*")
      .eq("colaborador_id", colaboradorId)
      .eq("periodo_id", periodoId)
      .eq("tipo", "jefe")
      .eq("estado", "enviado")
      .maybeSingle();

    if (jefeError || !jefeEval) {
      console.error("❌ Error obteniendo evaluación del jefe:", jefeError);
      return;
    }

    console.log("✅ EVALUACIÓN JEFE ENCONTRADA:");
    console.log("  ID:", jefeEval.id);
    console.log("  Evaluador ID:", jefeEval.evaluador_id);
    console.log("  Total respuestas desempeño:", Object.keys(jefeEval.responses || {}).length);
    console.log("  Respuestas desempeño:", jefeEval.responses);
    console.log("  Total respuestas potencial:", Object.keys(jefeEval.evaluacion_potencial?.responses || {}).length);
    console.log("  Respuestas potencial:", jefeEval.evaluacion_potencial?.responses);
    console.log("");

    // 3. Obtener resultado final guardado
    const { data: resultadoFinal, error: resultadoError } = await supabase
      .from("final_evaluation_results")
      .select("*")
      .eq("colaborador_id", colaboradorId)
      .eq("periodo_id", periodoId)
      .single();

    if (resultadoError || !resultadoFinal) {
      console.warn("⚠️ No se encontró resultado final guardado:", resultadoError);
    } else {
      console.log("✅ RESULTADO FINAL GUARDADO:");
      console.log("  Desempeño Auto:", resultadoFinal.resultado_final?.desempenoAuto);
      console.log("  Desempeño Jefe:", resultadoFinal.resultado_final?.desempenoJefe);
      console.log("  Desempeño Final:", resultadoFinal.resultado_final?.desempenoFinal);
      console.log("  Potencial:", resultadoFinal.resultado_final?.potencial);
      console.log("  Resultado completo:", resultadoFinal.resultado_final);
      console.log("");
    }

    // 4. Obtener instrumento
    const { data: userData } = await supabase
      .from("users")
      .select("nivel")
      .eq("dpi", colaboradorId)
      .single();

    if (!userData) {
      console.error("❌ No se pudo obtener nivel del usuario");
      return;
    }

    const instrument = await getInstrumentForUser(userData.nivel);
    if (!instrument) {
      console.error("❌ No se pudo obtener instrumento");
      return;
    }

    console.log("✅ INSTRUMENTO:");
    console.log("  Nivel:", userData.nivel);
    console.log("  Dimensiones desempeño:", instrument.dimensionesDesempeno.length);
    console.log("");

    // 5. Calcular valores manualmente
    console.log("📊 CÁLCULOS MANUALES:");
    
    const desempenoAuto = calculatePerformanceScore(
      autoEval.responses || {},
      instrument.dimensionesDesempeno
    );
    const desempenoAutoPorcentaje = scoreToPercentage(desempenoAuto);
    
    const desempenoJefe = calculatePerformanceScore(
      jefeEval.responses || {},
      instrument.dimensionesDesempeno
    );
    const desempenoJefePorcentaje = scoreToPercentage(desempenoJefe);
    
    // Calcular desempeño final (70% jefe + 30% auto)
    const desempenoFinal = Math.round((desempenoJefe * 0.7 + desempenoAuto * 0.3) * 100) / 100;
    const desempenoFinalPorcentaje = scoreToPercentage(desempenoFinal);
    
    console.log("  Desempeño Auto calculado:", desempenoAuto, `(${desempenoAutoPorcentaje}%)`);
    console.log("  Desempeño Jefe calculado:", desempenoJefe, `(${desempenoJefePorcentaje}%)`);
    console.log("  Desempeño Final calculado:", desempenoFinal, `(${desempenoFinalPorcentaje}%)`);
    console.log("");

    // 6. Comparar valores
    if (resultadoFinal) {
      console.log("🔍 COMPARACIÓN:");
      const guardado = resultadoFinal.resultado_final;
      
      console.log("  Autoevaluación:");
      console.log("    Calculado:", desempenoAuto, `(${desempenoAutoPorcentaje}%)`);
      console.log("    Guardado:", guardado?.desempenoAuto, `(${scoreToPercentage(guardado?.desempenoAuto || 0)}%)`);
      console.log("    Diferencia:", Math.abs(desempenoAuto - (guardado?.desempenoAuto || 0)));
      
      console.log("  Evaluación Jefe:");
      console.log("    Calculado:", desempenoJefe, `(${desempenoJefePorcentaje}%)`);
      console.log("    Guardado:", guardado?.desempenoJefe, `(${scoreToPercentage(guardado?.desempenoJefe || 0)}%)`);
      console.log("    Diferencia:", Math.abs(desempenoJefe - (guardado?.desempenoJefe || 0)));
      
      console.log("  Desempeño Final:");
      console.log("    Calculado:", desempenoFinal, `(${desempenoFinalPorcentaje}%)`);
      console.log("    Guardado:", guardado?.desempenoFinal, `(${scoreToPercentage(guardado?.desempenoFinal || 0)}%)`);
      console.log("    Diferencia:", Math.abs(desempenoFinal - (guardado?.desempenoFinal || 0)));
      console.log("");
    }

    // 7. Análisis de respuestas del jefe
    console.log("📋 ANÁLISIS DE RESPUESTAS DEL JEFE:");
    const respuestasJefe = jefeEval.responses || {};
    const valores = Object.values(respuestasJefe) as number[];
    
    if (valores.length > 0) {
      const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
      const minimo = Math.min(...valores);
      const maximo = Math.max(...valores);
      
      console.log("  Total items:", valores.length);
      console.log("  Promedio simple:", promedio.toFixed(2));
      console.log("  Mínimo:", minimo);
      console.log("  Máximo:", maximo);
      console.log("  Distribución:");
      console.log("    1:", valores.filter(v => v === 1).length);
      console.log("    2:", valores.filter(v => v === 2).length);
      console.log("    3:", valores.filter(v => v === 3).length);
      console.log("    4:", valores.filter(v => v === 4).length);
      console.log("    5:", valores.filter(v => v === 5).length);
      console.log("");
    }

    // 8. Verificar por dimensión
    console.log("📊 ANÁLISIS POR DIMENSIÓN (JEFE):");
    instrument.dimensionesDesempeno.forEach((dim) => {
      const dimItems = dim.items.map(item => respuestasJefe[item.id]).filter(v => v !== undefined) as number[];
      if (dimItems.length > 0) {
        const avg = dimItems.reduce((a, b) => a + b, 0) / dimItems.length;
        const score = avg * dim.peso;
        console.log(`  ${dim.nombre} (peso ${dim.peso}):`);
        console.log(`    Items: ${dimItems.length}, Promedio: ${avg.toFixed(2)}, Score: ${score.toFixed(4)}`);
      }
    });

    return {
      autoEval,
      jefeEval,
      resultadoFinal,
      calculos: {
        desempenoAuto,
        desempenoJefe,
        desempenoFinal,
        desempenoAutoPorcentaje,
        desempenoJefePorcentaje,
        desempenoFinalPorcentaje,
      },
    };
  } catch (error) {
    console.error("❌ Error en diagnóstico:", error);
    throw error;
  }
};

// Exponer en window para uso en consola
if (typeof window !== "undefined") {
  (window as any).diagnosticoEvaluacion = diagnosticarEvaluacion;
  console.log("✅ Función diagnosticoEvaluacion disponible en consola");
  console.log("📋 Uso: await diagnosticoEvaluacion('COLABORADOR_ID', 'PERIODO_ID')");
}

