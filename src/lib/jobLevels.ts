// Funciones para gestionar niveles de puesto (Job Levels)
import { supabase } from "@/integrations/supabase/client";
import {
  JobLevel,
  JobLevelWithCount,
  JobLevelInfo,
  CreateJobLevelParams,
  UpdateJobLevelParams,
  JobLevelResponse,
  JobLevelInfoResponse,
  JobLevelCategory,
} from "@/types/jobLevel";

// Verificar si Supabase está disponible
const isSupabaseAvailable = () => {
  try {
    return supabase !== null && typeof supabase !== 'undefined';
  } catch {
    return false;
  }
};

/**
 * Obtiene todos los niveles de puesto ordenados jerárquicamente
 */
export const getAllJobLevels = async (includeInactive: boolean = false): Promise<JobLevelWithCount[]> => {
  if (!isSupabaseAvailable()) return [];

  try {
    const { data, error } = await supabase.rpc('get_all_job_levels', {
      include_inactive: includeInactive,
    });

    if (error) {
      console.error('Error fetching job levels:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching job levels:', error);
    return [];
  }
};

/**
 * Obtiene solo los niveles activos para selects/dropdowns
 */
export const getActiveJobLevels = async (): Promise<JobLevel[]> => {
  if (!isSupabaseAvailable()) return [];

  try {
    const { data, error } = await supabase
      .from('job_levels')
      .select('*')
      .eq('is_active', true)
      .order('hierarchical_order', { ascending: true });

    if (error) {
      console.error('Error fetching active job levels:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching active job levels:', error);
    return [];
  }
};

/**
 * Obtiene información detallada de un nivel específico
 */
export const getJobLevelInfo = async (code: string): Promise<JobLevelInfoResponse> => {
  if (!isSupabaseAvailable()) {
    return { success: false, error: 'Supabase no disponible' };
  }

  try {
    const { data, error } = await supabase.rpc('get_job_level_info', {
      p_code: code,
    });

    if (error) {
      console.error('Error fetching job level info:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (error: any) {
    console.error('Error fetching job level info:', error);
    return { success: false, error: error.message || 'Error desconocido' };
  }
};

/**
 * Crea un nuevo nivel de puesto
 */
export const createJobLevel = async (params: CreateJobLevelParams): Promise<JobLevelResponse> => {
  if (!isSupabaseAvailable()) {
    return { success: false, error: 'Supabase no disponible' };
  }

  try {
    const { data, error } = await supabase.rpc('create_job_level', {
      p_code: params.code,
      p_name: params.name,
      p_hierarchical_order: params.hierarchical_order,
      p_category: params.category,
    });

    if (error) {
      console.error('Error creating job level:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (error: any) {
    console.error('Error creating job level:', error);
    return { success: false, error: error.message || 'Error desconocido' };
  }
};

/**
 * Actualiza un nivel de puesto existente
 */
export const updateJobLevel = async (params: UpdateJobLevelParams): Promise<JobLevelResponse> => {
  if (!isSupabaseAvailable()) {
    return { success: false, error: 'Supabase no disponible' };
  }

  try {
    const { data, error } = await supabase.rpc('update_job_level', {
      p_code: params.code,
      p_name: params.name,
      p_hierarchical_order: params.hierarchical_order,
      p_category: params.category,
      p_is_active: params.is_active,
    });

    if (error) {
      console.error('Error updating job level:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (error: any) {
    console.error('Error updating job level:', error);
    return { success: false, error: error.message || 'Error desconocido' };
  }
};

/**
 * Elimina un nivel de puesto
 */
export const deleteJobLevel = async (code: string): Promise<JobLevelResponse> => {
  if (!isSupabaseAvailable()) {
    return { success: false, error: 'Supabase no disponible' };
  }

  try {
    const { data, error } = await supabase.rpc('delete_job_level', {
      p_code: code,
    });

    if (error) {
      console.error('Error deleting job level:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (error: any) {
    console.error('Error deleting job level:', error);
    return { success: false, error: error.message || 'Error desconocido' };
  }
};

/**
 * Obtiene la categoría (administrativo/operativo) de un nivel de puesto
 */
export const getCategoryFromJobLevel = async (code: string): Promise<JobLevelCategory | null> => {
  if (!isSupabaseAvailable()) return null;

  try {
    const { data, error } = await supabase.rpc('get_category_from_job_level', {
      p_nivel: code,
    });

    if (error) {
      console.error('Error getting category from job level:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting category from job level:', error);
    return null;
  }
};

/**
 * Valida si un código de nivel es válido y está activo
 */
export const validateJobLevelCode = async (code: string): Promise<boolean> => {
  if (!isSupabaseAvailable()) return false;

  try {
    const { data, error } = await supabase
      .from('job_levels')
      .select('code')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    return !error && data !== null;
  } catch {
    return false;
  }
};
