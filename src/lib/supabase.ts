import { supabase } from "@/integrations/supabase/client";
import { EvaluationDraft } from "@/lib/storage";
import { EvaluationPeriod, PeriodStatus } from "@/types/period";
import { UserAssignment, AssignmentWithUsers } from "@/types/assignment";
import { Group, GroupWithMembers, GroupMember } from "@/types/group";
import { OpenQuestion, OpenQuestionResponse } from "@/types/openQuestions";
import { isValidUUID } from "@/lib/utils";

// Verificar si Supabase está disponible
const isSupabaseAvailable = () => {
  try {
    return supabase !== null && typeof supabase !== 'undefined';
  } catch {
    return false;
  }
};

// PERÍODOS DE EVALUACIÓN
export const getActivePeriod = async (): Promise<EvaluationPeriod | null> => {
  if (!isSupabaseAvailable()) return null;
  
  try {
    // Buscar período activo (puede ser 'en_curso' o 'activo')
    const { data, error } = await supabase
      .from('evaluation_periods')
      .select('*')
      .or('estado.eq.en_curso,estado.eq.activo')
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error || !data) return null;
    
    return {
      id: data.id,
      nombre: data.nombre,
      fechaInicio: data.fecha_inicio,
      fechaFin: data.fecha_fin,
      fechaCierreAutoevaluacion: data.fecha_cierre_autoevaluacion,
      fechaCierreEvaluacionJefe: data.fecha_cierre_evaluacion_jefe,
      estado: data.estado as any,
      descripcion: data.descripcion,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
};

export const getPeriodStatus = async (periodId: string): Promise<PeriodStatus> => {
  if (!isSupabaseAvailable()) {
    return { isActive: true, canSubmitAuto: true, canSubmitJefe: true };
  }
  
  try {
    const { data, error } = await supabase
      .from('evaluation_periods')
      .select('*')
      .eq('id', periodId)
      .maybeSingle();
    
    if (error || !data) {
      return { isActive: false, canSubmitAuto: false, canSubmitJefe: false };
    }
    
    const now = new Date();
    const fechaInicio = new Date(data.fecha_inicio);
    const fechaFin = new Date(data.fecha_fin);
    const fechaCierreAuto = new Date(data.fecha_cierre_autoevaluacion);
    const fechaCierreJefe = new Date(data.fecha_cierre_evaluacion_jefe);
    
    const isActive = data.estado === 'en_curso' && now >= fechaInicio && now <= fechaFin;
    const canSubmitAuto = isActive && now <= fechaCierreAuto;
    const canSubmitJefe = isActive && now <= fechaCierreJefe;
    
    return {
      isActive,
      canSubmitAuto,
      canSubmitJefe,
      period: {
        id: data.id,
        nombre: data.nombre,
        fechaInicio: data.fecha_inicio,
        fechaFin: data.fecha_fin,
        fechaCierreAutoevaluacion: data.fecha_cierre_autoevaluacion,
        fechaCierreEvaluacionJefe: data.fecha_cierre_evaluacion_jefe,
        estado: data.estado as any,
        descripcion: data.descripcion,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch {
    return { isActive: false, canSubmitAuto: false, canSubmitJefe: false };
  }
};

// ELEGIBILIDAD DE EVALUACIÓN
export interface EligibilityResult {
  elegible: boolean;
  motivo?: string;
  meses_antiguedad?: number;
  meses_requeridos?: number;
  tipo_puesto?: string;
  fecha_ingreso?: string;
}

/**
 * Verifica si un colaborador es elegible para evaluación según su antigüedad
 * Administrativos: mínimo 3 meses
 * Operativos: mínimo 6 meses
 */
export const verificarElegibilidad = async (usuarioDpi: string): Promise<EligibilityResult> => {
  if (!isSupabaseAvailable()) {
    return { elegible: true }; // Fallback: permitir si no hay conexión
  }

  try {
    const { data, error } = await supabase.rpc('verificar_elegibilidad_evaluacion', {
      usuario_dpi: usuarioDpi
    });

    if (error) {
      console.error('Error verificando elegibilidad:', error);
      return { elegible: true }; // Fallback: permitir si hay error
    }

    return data as EligibilityResult;
  } catch {
    return { elegible: true }; // Fallback: permitir si hay error
  }
};

/**
 * Calcula la antigüedad en meses de un colaborador
 */
export const calcularAntiguedadMeses = async (usuarioDpi: string): Promise<number | null> => {
  if (!isSupabaseAvailable()) return null;

  try {
    const { data, error } = await supabase.rpc('calcular_antiguedad_meses', {
      usuario_dpi: usuarioDpi
    });

    if (error) {
      console.error('Error calculando antigüedad:', error);
      return null;
    }

    return data as number;
  } catch {
    return null;
  }
};
export const getUserAssignments = async (jefeId: string): Promise<AssignmentWithUsers[]> => {
  if (!isSupabaseAvailable()) return [];
  
  try {
    const { data, error } = await supabase
      .from('user_assignments')
      .select(`
        *,
        colaborador:users!user_assignments_colaborador_id_fkey(dpi, nombre, apellidos, cargo, nivel, area),
        jefe:users!user_assignments_jefe_id_fkey(dpi, nombre, apellidos, cargo)
      `)
      .eq('jefe_id', jefeId)
      .eq('activo', true);
    
    if (error || !data) return [];
    
    return data.map((item: any) => ({
      id: item.id,
      colaboradorId: item.colaborador_id,
      jefeId: item.jefe_id,
      grupoId: item.grupo_id,
      activo: item.activo,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      colaborador: item.colaborador ? {
        nombre: item.colaborador.nombre,
        apellidos: item.colaborador.apellidos,
        cargo: item.colaborador.cargo,
        nivel: item.colaborador.nivel,
        area: item.colaborador.area,
      } : undefined,
      jefe: item.jefe ? {
        nombre: item.jefe.nombre,
        apellidos: item.jefe.apellidos,
        cargo: item.jefe.cargo,
      } : undefined,
    }));
  } catch {
    return [];
  }
};

export const getColaboradorJefe = async (colaboradorId: string): Promise<string | null> => {
  if (!isSupabaseAvailable()) return null;
  
  try {
    const { data, error } = await supabase
      .from('user_assignments')
      .select('jefe_id')
      .eq('colaborador_id', colaboradorId)
      .eq('activo', true)
      .maybeSingle();
    
    if (error || !data) return null;
    return data.jefe_id;
  } catch {
    return null;
  }
};

// GRUPOS
export const getGroupsByJefe = async (jefeId: string): Promise<GroupWithMembers[]> => {
  if (!isSupabaseAvailable()) return [];
  
  try {
    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        miembros:group_members(
          colaborador_id,
          colaborador:users!group_members_colaborador_id_fkey(dpi, nombre, apellidos, cargo, nivel)
        )
      `)
      .eq('jefe_id', jefeId)
      .eq('activo', true);
    
    if (error || !data) return [];
    
    return data.map((item: any) => ({
      id: item.id,
      nombre: item.nombre,
      descripcion: item.descripcion,
      jefeId: item.jefe_id,
      tipo: item.tipo as any,
      activo: item.activo,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      miembros: item.miembros?.map((m: any) => ({
        colaboradorId: m.colaborador_id,
        nombre: m.colaborador?.nombre || '',
        apellidos: m.colaborador?.apellidos || '',
        cargo: m.colaborador?.cargo || '',
        nivel: m.colaborador?.nivel || '',
      })) || [],
    }));
  } catch {
    return [];
  }
};

// PREGUNTAS ABIERTAS
export const getOpenQuestions = async (): Promise<OpenQuestion[]> => {
  if (!isSupabaseAvailable()) return [];
  
  try {
    const { data, error } = await supabase
      .from('open_questions')
      .select('*')
      .eq('activa', true)
      .order('orden');
    
    if (error || !data) return [];
    
    return data.map((item: any) => ({
      id: item.id,
      pregunta: item.pregunta,
      tipo: item.tipo as any,
      orden: item.orden,
      obligatoria: item.obligatoria,
    }));
  } catch {
    return [];
  }
};

export const saveOpenQuestionResponses = async (
  evaluacionId: string,
  responses: Record<string, string>
): Promise<boolean> => {
  if (!isSupabaseAvailable()) return false;
  
  try {
    const responsesArray = Object.entries(responses).map(([preguntaId, respuesta]) => ({
      evaluacion_id: evaluacionId,
      pregunta_id: preguntaId,
      respuesta,
    }));
    
    const { error } = await supabase
      .from('open_question_responses')
      .upsert(responsesArray, { onConflict: 'evaluacion_id,pregunta_id' });
    
    return !error;
  } catch {
    return false;
  }
};

// GUARDAR EVALUACIÓN EN SUPABASE
export const saveEvaluationToSupabase = async (draft: EvaluationDraft): Promise<string | null> => {
  if (!isSupabaseAvailable()) return null;
  
  // Validar que periodoId sea un UUID válido
  if (!isValidUUID(draft.periodoId)) {
    console.warn('⚠️ periodoId inválido en saveEvaluationToSupabase:', draft.periodoId);
    return null;
  }
  
  try {
    const evaluationData: any = {
      usuario_id: draft.usuarioId,
      periodo_id: draft.periodoId,
      tipo: draft.tipo,
      responses: draft.responses,
      comments: draft.comments,
      estado: draft.estado,
      progreso: draft.progreso,
      fecha_ultima_modificacion: draft.fechaUltimaModificacion,
    };

    // Incluir NPS si está presente en el borrador
    if ((draft as any).npsScore !== undefined) {
      evaluationData.nps_score = (draft as any).npsScore;
    }

    if (draft.tipo === 'jefe' && draft.evaluadorId && draft.colaboradorId) {
      evaluationData.evaluador_id = draft.evaluadorId;
      evaluationData.colaborador_id = draft.colaboradorId;
      if (draft.evaluacionPotencial) {
        evaluationData.evaluacion_potencial = draft.evaluacionPotencial;
      }
    }
    
    if (draft.fechaEnvio) {
      evaluationData.fecha_envio = draft.fechaEnvio;
    }
    
    // Buscar si ya existe
    // Para evaluaciones de tipo 'jefe', también necesitamos filtrar por evaluador_id y colaborador_id
    let query = supabase
      .from('evaluations')
      .select('id')
      .eq('usuario_id', draft.usuarioId)
      .eq('periodo_id', draft.periodoId)
      .eq('tipo', draft.tipo);
    
    if (draft.tipo === 'jefe' && draft.evaluadorId) {
      query = query.eq('evaluador_id', draft.evaluadorId);
      if (draft.colaboradorId) {
        query = query.eq('colaborador_id', draft.colaboradorId);
      }
    }
    
    const { data: existing, error: existingError } = await query.maybeSingle();
    
    if (existingError) {
      console.error('[Supabase] ❌ Error buscando evaluación existente', {
        message: existingError.message,
        details: existingError.details,
        hint: existingError.hint,
        code: existingError.code,
        filtros: {
          usuario_id: draft.usuarioId,
          periodo_id: draft.periodoId,
          tipo: draft.tipo,
          evaluador_id: draft.evaluadorId,
          colaborador_id: draft.colaboradorId,
        },
      });
      return null;
    }
    
    if (existing) {
      // Validar constraint de la base de datos: si estado es 'enviado', fecha_envio debe estar presente
      if (evaluationData.estado === 'enviado' && !evaluationData.fecha_envio) {
        console.error('[Supabase] ❌ Error: estado "enviado" requiere fecha_envio según constraint de BD', {
          evaluationId: existing.id,
          payload: evaluationData,
        });
        return null;
      }
      
      // Hacer el update sin select para evitar problemas
      // Si no hay error, asumimos que el update fue exitoso
      // El ID ya lo tenemos en existing.id, no necesitamos leerlo de vuelta
      const { error: updateError } = await supabase
        .from('evaluations')
        .update(evaluationData)
        .eq('id', existing.id);
      
      if (updateError) {
        console.error('[Supabase] ❌ Error actualizando evaluación', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code,
          payload: evaluationData,
          evaluationId: existing.id,
        });
        return null;
      }
      
      // Si no hubo error, el update fue exitoso
      // Retornamos el ID que ya tenemos (no necesitamos leerlo de vuelta)
      return existing.id;
    } else {
      const { data, error } = await supabase
        .from('evaluations')
        .insert(evaluationData)
        .select('id')
        .single();
      
      if (error) {
        console.error('[Supabase] ❌ Error insertando evaluación', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          payload: evaluationData,
        });
        return null;
      }
      return data.id;
    }
  } catch {
    return null;
  }
};

// OBTENER EVALUACIÓN DE SUPABASE
export const getEvaluationFromSupabase = async (
  usuarioId: string,
  periodoId: string,
  tipo: "auto" | "jefe",
  evaluadorId?: string,
  colaboradorId?: string
): Promise<EvaluationDraft | null> => {
  if (!isSupabaseAvailable()) return null;
  
  // Validar que periodoId sea un UUID válido
  if (!isValidUUID(periodoId)) {
    console.warn('⚠️ periodoId inválido en getEvaluationFromSupabase:', periodoId);
    return null;
  }
  
  try {
    let query = supabase
      .from('evaluations')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('periodo_id', periodoId)
      .eq('tipo', tipo);
    
    if (tipo === 'jefe' && evaluadorId && colaboradorId) {
      query = query.eq('evaluador_id', evaluadorId).eq('colaborador_id', colaboradorId);
    }
    
    const { data, error } = await query.maybeSingle();
    
    if (error || !data) return null;
    
    return {
      usuarioId: data.usuario_id,
      periodoId: data.periodo_id,
      tipo: data.tipo as any,
      responses: data.responses || {},
      comments: data.comments || {},
      estado: data.estado as any,
      progreso: data.progreso || 0,
      fechaUltimaModificacion: data.fecha_ultima_modificacion,
      fechaEnvio: data.fecha_envio,
      evaluadorId: data.evaluador_id,
      colaboradorId: data.colaborador_id,
      evaluacionPotencial: data.evaluacion_potencial ? {
        responses: data.evaluacion_potencial.responses || {},
        comments: data.evaluacion_potencial.comments || {},
      } : undefined,
      // Incluir NPS si está presente
      npsScore: data.nps_score !== null && data.nps_score !== undefined ? data.nps_score : undefined,
    };
  } catch {
    return null;
  }
};

// OBTENER ID DE EVALUACIÓN DESDE SUPABASE
export const getEvaluationIdFromSupabase = async (
  usuarioId: string,
  periodoId: string,
  tipo: "auto" | "jefe",
  evaluadorId?: string,
  colaboradorId?: string
): Promise<string | null> => {
  if (!isSupabaseAvailable()) return null;
  
  // Validar que periodoId sea un UUID válido
  if (!isValidUUID(periodoId)) {
    console.warn('⚠️ periodoId inválido en getEvaluationIdFromSupabase:', periodoId);
    return null;
  }
  
  try {
    let query = supabase
      .from('evaluations')
      .select('id')
      .eq('usuario_id', usuarioId)
      .eq('periodo_id', periodoId)
      .eq('tipo', tipo);
    
    if (tipo === 'jefe' && evaluadorId && colaboradorId) {
      query = query.eq('evaluador_id', evaluadorId).eq('colaborador_id', colaboradorId);
    }
    
    const { data, error } = await query.maybeSingle();
    
    if (error || !data) return null;
    
    return data.id;
  } catch {
    return null;
  }
};