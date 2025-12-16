/**
 * Funciones de diagnóstico para autoevaluaciones de colaboradores
 * con inconsistencias en el estado
 */

import { supabase } from "@/integrations/supabase/client";

export interface InconsistenciaAutoevaluacion {
  id: string;
  usuario_id: string;
  nombre_completo: string;
  rol: string;
  cargo: string;
  area: string;
  periodo_id: string;
  periodo_nombre: string;
  estado: string;
  progreso: number;
  fecha_envio: string | null;
  fecha_ultima_modificacion: string;
  inconsistencia: string;
}

/**
 * Diagnostica autoevaluaciones de colaboradores con inconsistencias
 */
export const diagnosticarAutoevaluacionesColaboradores = async (): Promise<InconsistenciaAutoevaluacion[]> => {
  try {
    // Obtener todas las autoevaluaciones de colaboradores
    const { data: autoevaluaciones, error: errorAutoevaluaciones } = await supabase
      .from("evaluations")
      .select(`
        id,
        usuario_id,
        periodo_id,
        estado,
        progreso,
        fecha_envio,
        fecha_ultima_modificacion,
        users!evaluations_usuario_id_fkey (
          dpi,
          nombre,
          apellidos,
          rol,
          cargo,
          area
        ),
        evaluation_periods!evaluations_periodo_id_fkey (
          id,
          nombre
        )
      `)
      .eq("tipo", "auto");

    if (errorAutoevaluaciones) {
      console.error("Error obteniendo autoevaluaciones:", errorAutoevaluaciones);
      return [];
    }

    // Filtrar solo colaboradores y encontrar inconsistencias
    const inconsistencias: InconsistenciaAutoevaluacion[] = [];

    for (const auto of autoevaluaciones || []) {
      const usuario = auto.users as any;
      if (!usuario || usuario.rol !== "colaborador") continue;

      const periodo = auto.evaluation_periods as any;
      
      // Detectar inconsistencias
      let tipoInconsistencia = "";
      if (auto.fecha_envio && auto.estado === "borrador") {
        tipoInconsistencia = "Tiene fecha_envio pero estado borrador";
      } else if (auto.progreso === 100 && auto.estado === "borrador") {
        tipoInconsistencia = "Progreso 100% pero estado borrador";
      }

      if (tipoInconsistencia) {
        inconsistencias.push({
          id: auto.id,
          usuario_id: auto.usuario_id,
          nombre_completo: `${usuario.nombre} ${usuario.apellidos}`,
          rol: usuario.rol,
          cargo: usuario.cargo || "",
          area: usuario.area || "",
          periodo_id: auto.periodo_id,
          periodo_nombre: periodo?.nombre || "Desconocido",
          estado: auto.estado,
          progreso: auto.progreso,
          fecha_envio: auto.fecha_envio,
          fecha_ultima_modificacion: auto.fecha_ultima_modificacion,
          inconsistencia: tipoInconsistencia,
        });
      }
    }

    return inconsistencias.sort((a, b) => 
      new Date(b.fecha_ultima_modificacion).getTime() - new Date(a.fecha_ultima_modificacion).getTime()
    );
  } catch (error) {
    console.error("Error en diagnóstico:", error);
    return [];
  }
};

/**
 * Corrige las inconsistencias encontradas
 */
export const corregirAutoevaluacionesColaboradores = async (
  ids: string[]
): Promise<{ corregidas: number; errores: number }> => {
  let corregidas = 0;
  let errores = 0;

  for (const id of ids) {
    try {
      // Obtener la evaluación
      const { data: evaluacion, error: errorGet } = await supabase
        .from("evaluations")
        .select("*")
        .eq("id", id)
        .single();

      if (errorGet || !evaluacion) {
        console.error(`Error obteniendo evaluación ${id}:`, errorGet);
        errores++;
        continue;
      }

      // Verificar que es autoevaluación de colaborador
      const { data: usuario } = await supabase
        .from("users")
        .select("rol")
        .eq("dpi", evaluacion.usuario_id)
        .single();

      if (!usuario || usuario.rol !== "colaborador") {
        console.warn(`Evaluación ${id} no es de colaborador, saltando...`);
        continue;
      }

      // Determinar qué corregir
      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      if (evaluacion.fecha_envio && evaluacion.estado === "borrador") {
        // Tiene fecha_envio pero estado borrador -> cambiar a enviado
        updates.estado = "enviado";
      } else if (evaluacion.progreso === 100 && evaluacion.estado === "borrador") {
        // Progreso 100% pero estado borrador -> cambiar a enviado y agregar fecha_envio si no existe
        updates.estado = "enviado";
        if (!evaluacion.fecha_envio) {
          updates.fecha_envio = evaluacion.fecha_ultima_modificacion || new Date().toISOString();
        }
      }

      // Actualizar
      const { error: errorUpdate } = await supabase
        .from("evaluations")
        .update(updates)
        .eq("id", id);

      if (errorUpdate) {
        console.error(`Error corrigiendo evaluación ${id}:`, errorUpdate);
        errores++;
      } else {
        corregidas++;
      }
    } catch (error) {
      console.error(`Error procesando evaluación ${id}:`, error);
      errores++;
    }
  }

  return { corregidas, errores };
};

// Exponer funciones en la consola del navegador
if (typeof window !== "undefined") {
  (window as any).diagnosticarAutoevaluacionesColaboradores = {
    diagnosticar: diagnosticarAutoevaluacionesColaboradores,
    corregir: corregirAutoevaluacionesColaboradores,
  };

  console.log(`
✅ Funciones de diagnóstico de autoevaluaciones de colaboradores disponibles en consola:

📋 Uso:
  // Diagnosticar inconsistencias
  const inconsistencias = await diagnosticarAutoevaluacionesColaboradores.diagnosticar()
  console.table(inconsistencias)
  
  // Corregir todas las inconsistencias encontradas
  const ids = inconsistencias.map(i => i.id)
  const resultado = await diagnosticarAutoevaluacionesColaboradores.corregir(ids)
  console.log('Corregidas:', resultado.corregidas, 'Errores:', resultado.errores)
  `);
}





