/**
 * Función para recalcular resultado final de un colaborador
 * Usa la función SQL recalcular_resultado_final
 */

import { supabase } from "@/integrations/supabase/client";

export const recalcularResultadoFinal = async (
  colaboradorId: string,
  periodoId: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc("recalcular_resultado_final", {
      p_colaborador_id: colaboradorId,
      p_periodo_id: periodoId,
    });

    if (error) {
      console.error("Error al recalcular resultado final:", error);
      return false;
    }

    console.log("✅ Resultado recalculado exitosamente:", data);
    return true;
  } catch (error) {
    console.error("Error en recalcularResultadoFinal:", error);
    return false;
  }
};

// Exponer en window para uso en consola
if (typeof window !== "undefined") {
  (window as any).recalcularResultadoFinal = recalcularResultadoFinal;
  console.log("✅ Función recalcularResultadoFinal disponible en consola");
  console.log("📋 Uso: await recalcularResultadoFinal('COLABORADOR_ID', 'PERIODO_ID')");
}





