/**
 * Funciones helper para llamar a las funciones estadísticas del backend
 * Estas funciones eliminan la necesidad de calcular en el frontend
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Calcula el promedio municipal por dimensión para un nivel específico
 * @param nivel Nivel del colaborador (ej: 'E2', 'A1')
 * @param periodoId ID del período de evaluación
 * @returns JSONB con estructura {dim_id: {id, nombre, porcentaje, totalColaboradores}}
 */
export const getMunicipalAverageByDimension = async (
  nivel: string,
  periodoId: string
): Promise<Record<string, { id: string; nombre: string; porcentaje: number; totalColaboradores: number }>> => {
  try {
    const { data, error } = await supabase.rpc('calculate_municipal_average_by_dimension', {
      nivel_param: nivel,
      periodo_id_param: periodoId
    });

    if (error) {
      console.error('Error calculando promedio municipal:', error);
      return {};
    }

    // Convertir JSONB a objeto TypeScript
    const result: Record<string, { id: string; nombre: string; porcentaje: number; totalColaboradores: number }> = {};
    
    if (data) {
      Object.entries(data).forEach(([dimId, dimData]: [string, any]) => {
        result[dimId] = {
          id: dimData.id || dimId,
          nombre: dimData.nombre || '',
          porcentaje: dimData.porcentaje || 0,
          totalColaboradores: dimData.totalColaboradores || 0
        };
      });
    }

    return result;
  } catch (error) {
    console.error('Error en getMunicipalAverageByDimension:', error);
    return {};
  }
};

/**
 * Calcula promedios organizacionales (desempeño, potencial, NPS)
 * @param periodoId ID del período de evaluación
 * @returns Objeto con promedios organizacionales
 */
export const getOrganizationalAverages = async (
  periodoId: string
): Promise<{
  desempeno: number;
  potencial: number;
  total: number;
  npsPromedio: number;
  npsPromoters: number;
  npsPassives: number;
  npsDetractors: number;
  totalNps: number;
}> => {
  try {
    const { data, error } = await supabase.rpc('calculate_organizational_averages', {
      periodo_id_param: periodoId
    });

    if (error) {
      console.error('Error calculando promedios organizacionales:', error);
      return {
        desempeno: 0,
        potencial: 0,
        total: 0,
        npsPromedio: 0,
        npsPromoters: 0,
        npsPassives: 0,
        npsDetractors: 0,
        totalNps: 0
      };
    }

    return data || {
      desempeno: 0,
      potencial: 0,
      total: 0,
      npsPromedio: 0,
      npsPromoters: 0,
      npsPassives: 0,
      npsDetractors: 0,
      totalNps: 0
    };
  } catch (error) {
    console.error('Error en getOrganizationalAverages:', error);
    return {
      desempeno: 0,
      potencial: 0,
      total: 0,
      npsPromedio: 0,
      npsPromoters: 0,
      npsPassives: 0,
      npsDetractors: 0,
      totalNps: 0
    };
  }
};

/**
 * Obtiene resultado completo del colaborador incluyendo promedios municipales
 * @param colaboradorId DPI del colaborador
 * @param periodoId ID del período de evaluación
 * @returns Resultado completo con dimensiones y promedios municipales
 */
export const getCompleteColaboradorResult = async (
  colaboradorId: string,
  periodoId: string
): Promise<{
  desempenoAuto: number;
  desempenoJefe: number;
  desempenoFinal: number;
  potencial?: number;
  posicion9Box?: string;
  desempenoPorcentaje?: number;
  potencialPorcentaje?: number;
  dimensiones?: Array<{ id: string; nombre: string; promedio: number; porcentaje: number }>;
  promedioMunicipal?: Record<string, { id: string; nombre: string; porcentaje: number; totalColaboradores: number }>;
} | null> => {
  try {
    const { data, error } = await supabase.rpc('get_complete_colaborador_result', {
      colaborador_id_param: colaboradorId,
      periodo_id_param: periodoId
    });

    if (error) {
      console.error('Error obteniendo resultado completo:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error en getCompleteColaboradorResult:', error);
    return null;
  }
};


