/**
 * Función para buscar autoevaluación de un usuario específico por nombre
 */

import { supabase } from "@/integrations/supabase/client";

export interface ResultadoBusqueda {
  usuario: {
    dpi: string;
    nombre: string;
    apellidos: string;
    cargo: string;
    area: string;
    nivel: string;
  } | null;
  autoevaluacion: {
    id: string;
    estado: string;
    progreso: number;
    fechaEnvio: string | null;
    fechaUltimaModificacion: string;
    periodoId: string;
    encontradaEn: "supabase" | "localStorage" | "ninguno";
  } | null;
  periodo: {
    id: string;
    nombre: string;
    estado: string;
  } | null;
}

/**
 * Busca la autoevaluación de un usuario por nombre
 */
export const buscarAutoevaluacionPorNombre = async (
  nombre: string,
  apellidos?: string
): Promise<ResultadoBusqueda> => {
  try {
    // 1. Buscar usuario por nombre
    let query = supabase
      .from("users")
      .select("dpi, nombre, apellidos, cargo, area, nivel")
      .ilike("nombre", `%${nombre}%`);

    if (apellidos) {
      query = query.ilike("apellidos", `%${apellidos}%`);
    }

    const { data: usuarios, error: usuariosError } = await query;

    if (usuariosError) {
      throw usuariosError;
    }

    if (!usuarios || usuarios.length === 0) {
      return {
        usuario: null,
        autoevaluacion: null,
        periodo: null,
      };
    }

    // Si hay múltiples resultados, usar el primero o buscar el más específico
    const usuario = usuarios.length === 1 
      ? usuarios[0]
      : apellidos 
        ? usuarios.find(u => 
            u.nombre.toLowerCase().includes(nombre.toLowerCase()) &&
            u.apellidos.toLowerCase().includes(apellidos.toLowerCase())
          ) || usuarios[0]
        : usuarios[0];

    // 2. Obtener período activo
    const { data: periodoData } = await supabase
      .from("evaluation_periods")
      .select("id, nombre, estado")
      .eq("estado", "en_curso")
      .single();

    const periodoId = periodoData?.id;

    if (!periodoId) {
      return {
        usuario: {
          dpi: usuario.dpi,
          nombre: usuario.nombre,
          apellidos: usuario.apellidos,
          cargo: usuario.cargo || "N/A",
          area: usuario.area || "N/A",
          nivel: usuario.nivel || "N/A",
        },
        autoevaluacion: null,
        periodo: null,
      };
    }

    // 3. Buscar autoevaluación en Supabase
    const { data: autoevaluacionData, error: autoevaluacionError } = await supabase
      .from("evaluations")
      .select("*")
      .eq("usuario_id", usuario.dpi)
      .eq("periodo_id", periodoId)
      .eq("tipo", "auto")
      .maybeSingle();

    let autoevaluacion = null;
    if (autoevaluacionData) {
      autoevaluacion = {
        id: autoevaluacionData.id,
        estado: autoevaluacionData.estado,
        progreso: autoevaluacionData.progreso || 0,
        fechaEnvio: autoevaluacionData.fecha_envio,
        fechaUltimaModificacion: autoevaluacionData.fecha_ultima_modificacion,
        periodoId: autoevaluacionData.periodo_id,
        encontradaEn: "supabase" as const,
      };
    } else {
      // 4. Verificar en localStorage como fallback
      const { getEvaluationDraft } = await import("./storage");
      const draft = await getEvaluationDraft(usuario.dpi, periodoId);
      
      if (draft) {
        autoevaluacion = {
          id: "localStorage",
          estado: draft.estado,
          progreso: draft.progreso,
          fechaEnvio: draft.fechaEnvio || null,
          fechaUltimaModificacion: draft.fechaUltimaModificacion,
          periodoId: draft.periodoId,
          encontradaEn: "localStorage" as const,
        };
      } else {
        autoevaluacion = {
          id: "no_encontrada",
          estado: "no_encontrada",
          progreso: 0,
          fechaEnvio: null,
          fechaUltimaModificacion: "",
          periodoId: periodoId,
          encontradaEn: "ninguno" as const,
        };
      }
    }

    return {
      usuario: {
        dpi: usuario.dpi,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        cargo: usuario.cargo || "N/A",
        area: usuario.area || "N/A",
        nivel: usuario.nivel || "N/A",
      },
      autoevaluacion,
      periodo: periodoData ? {
        id: periodoData.id,
        nombre: periodoData.nombre,
        estado: periodoData.estado,
      } : null,
    };
  } catch (error: any) {
    console.error("Error buscando autoevaluación:", error);
    throw error;
  }
};

// Exponer función en la consola del navegador
if (typeof window !== "undefined") {
  (window as any).buscarAutoevaluacion = buscarAutoevaluacionPorNombre;
  
  console.log(`
✅ Función de búsqueda de autoevaluación disponible en consola:

📋 Uso:
  // Buscar autoevaluación de Marilyn Duarte
  await buscarAutoevaluacion('Marilyn', 'Duarte')
  
  // O solo por nombre
  await buscarAutoevaluacion('Marilyn')
  `);
}

