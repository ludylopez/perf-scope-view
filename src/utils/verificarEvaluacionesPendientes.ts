/**
 * Utilidad para verificar evaluaciones completas sin resultado calculado
 * 
 * Detecta casos donde:
 * - El jefe evaluó antes que el empleado se autoevaluara
 * - El trigger no se ejecutó correctamente
 * - Hubo algún error durante el cálculo
 */

import { supabase } from "@/integrations/supabase/client";

export interface EvaluacionPendiente {
  colaborador_id: string;
  colaborador_nombre: string;
  evaluador_id: string;
  evaluador_nombre: string;
  periodo_id: string;
  periodo_nombre: string;
  autoevaluacion_id: string;
  autoevaluacion_fecha_envio: string;
  evaluacion_jefe_id: string;
  evaluacion_jefe_fecha_envio: string;
  fecha_autoevaluacion_anterior: boolean;
  dias_diferencia: number;
  estado: string;
}

export interface ResumenPendientes {
  total_pendientes: number;
  casos_problematicos: number;
  casos_normales: number;
  periodo_id: string;
  periodo_nombre: string;
}

/**
 * Verifica evaluaciones completas sin resultado calculado
 */
export const verificarEvaluacionesPendientes = async (
  periodoId?: string
): Promise<EvaluacionPendiente[]> => {
  try {
    const { data, error } = await supabase.rpc("verificar_evaluaciones_pendientes", {
      p_periodo_id: periodoId || null,
    });

    if (error) {
      console.error("❌ Error verificando evaluaciones pendientes:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error en verificarEvaluacionesPendientes:", error);
    throw error;
  }
};

/**
 * Obtiene un resumen estadístico de evaluaciones pendientes
 */
export const obtenerResumenPendientes = async (
  periodoId?: string
): Promise<ResumenPendientes | null> => {
  try {
    const { data, error } = await supabase.rpc("resumen_evaluaciones_pendientes", {
      p_periodo_id: periodoId || null,
    });

    if (error) {
      console.error("❌ Error obteniendo resumen:", error);
      throw error;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error("Error en obtenerResumenPendientes:", error);
    throw error;
  }
};

/**
 * Recalcula resultados pendientes usando la función del backend
 */
export const recalcularResultadosPendientes = async (
  periodoId?: string
): Promise<Array<{
  colaborador_id: string;
  evaluador_id: string;
  resultado_calculado: boolean;
  mensaje: string;
}>> => {
  try {
    const { data, error } = await supabase.rpc("recalculate_pending_results", {
      p_periodo_id: periodoId || null,
    });

    if (error) {
      console.error("❌ Error recalculando resultados:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error en recalcularResultadosPendientes:", error);
    throw error;
  }
};

/**
 * Función de diagnóstico completa que muestra información detallada
 */
export const diagnosticarEvaluacionesPendientes = async (
  periodoId?: string
): Promise<void> => {
  console.log("🔍 === DIAGNÓSTICO DE EVALUACIONES PENDIENTES ===");
  console.log("");

  try {
    // 1. Obtener resumen
    const resumen = await obtenerResumenPendientes(periodoId);
    if (resumen) {
      console.log("📊 RESUMEN:");
      console.log(`  Período: ${resumen.periodo_nombre} (${resumen.periodo_id})`);
      console.log(`  Total pendientes: ${resumen.total_pendientes}`);
      console.log(`  Casos problemáticos (autoevaluación después): ${resumen.casos_problematicos}`);
      console.log(`  Casos normales (autoevaluación antes): ${resumen.casos_normales}`);
      console.log("");
    }

    // 2. Obtener lista detallada
    const pendientes = await verificarEvaluacionesPendientes(periodoId);
    
    if (pendientes.length === 0) {
      console.log("✅ No hay evaluaciones pendientes. Todas las evaluaciones completas tienen resultado calculado.");
      return;
    }

    console.log(`📋 DETALLE DE ${pendientes.length} EVALUACIONES PENDIENTES:`);
    console.log("");

    // Agrupar por tipo de caso
    const problematicos = pendientes.filter((p) => !p.fecha_autoevaluacion_anterior);
    const normales = pendientes.filter((p) => p.fecha_autoevaluacion_anterior);

    if (problematicos.length > 0) {
      console.log(`⚠️ CASOS PROBLEMÁTICOS (${problematicos.length}): Autoevaluación enviada DESPUÉS que evaluación del jefe`);
      console.log("");
      problematicos.forEach((p, index) => {
        console.log(`  ${index + 1}. ${p.colaborador_nombre} (${p.colaborador_id})`);
        console.log(`     Evaluador: ${p.evaluador_nombre} (${p.evaluador_id})`);
        console.log(`     Fecha autoevaluación: ${new Date(p.autoevaluacion_fecha_envio).toLocaleString()}`);
        console.log(`     Fecha evaluación jefe: ${new Date(p.evaluacion_jefe_fecha_envio).toLocaleString()}`);
        console.log(`     Diferencia: ${Math.abs(p.dias_diferencia)} días`);
        console.log(`     Estado: ${p.estado}`);
        console.log("");
      });
    }

    if (normales.length > 0) {
      console.log(`ℹ️ CASOS NORMALES (${normales.length}): Autoevaluación enviada ANTES que evaluación del jefe`);
      console.log("");
      normales.forEach((p, index) => {
        console.log(`  ${index + 1}. ${p.colaborador_nombre} (${p.colaborador_id})`);
        console.log(`     Evaluador: ${p.evaluador_nombre} (${p.evaluador_id})`);
        console.log(`     Fecha autoevaluación: ${new Date(p.autoevaluacion_fecha_envio).toLocaleString()}`);
        console.log(`     Fecha evaluación jefe: ${new Date(p.evaluacion_jefe_fecha_envio).toLocaleString()}`);
        console.log(`     Diferencia: ${Math.abs(p.dias_diferencia)} días`);
        console.log("");
      });
    }

    console.log("💡 Para recalcular estos resultados, ejecuta:");
    console.log(`   await recalcularEvaluacionesPendientes('${periodoId || "null"}')`);
    console.log("");

  } catch (error) {
    console.error("❌ Error en diagnóstico:", error);
    throw error;
  }
};

// Exponer funciones en la consola del navegador
if (typeof window !== "undefined") {
  (window as any).verificarEvaluacionesPendientes = {
    verificar: verificarEvaluacionesPendientes,
    resumen: obtenerResumenPendientes,
    recalcular: recalcularResultadosPendientes,
    diagnosticar: diagnosticarEvaluacionesPendientes,
  };

  console.log(`
✅ Funciones de verificación de evaluaciones pendientes disponibles en consola:

📋 Uso:
  // Diagnosticar todas las evaluaciones pendientes
  await verificarEvaluacionesPendientes.diagnosticar()
  
  // Verificar evaluaciones pendientes (retorna lista)
  await verificarEvaluacionesPendientes.verificar()
  
  // Obtener resumen estadístico
  await verificarEvaluacionesPendientes.resumen()
  
  // Recalcular resultados pendientes
  await verificarEvaluacionesPendientes.recalcular()
  `);
}
