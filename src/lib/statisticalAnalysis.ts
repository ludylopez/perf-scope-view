import { supabase } from "@/integrations/supabase/client";
import { calculatePerformanceScore } from "./calculations";
import { getInstrumentForUser } from "./instruments";
import { Dimension } from "@/types/evaluation";

export interface GeneralStats {
  tipo: 'auto' | 'jefe';
  cantidad: number;
  promedio: number;
  desviacionEstandar: number;
  mediana: number;
  minimo: number;
  maximo: number;
  porcentajeAlto: number; // >= 4
  porcentajeBajo: number; // < 3
}

export interface IndividualAnalysis {
  colaboradorId: string;
  colaboradorNombre: string;
  scoreAuto: number;
  scoreJefe: number;
  diferencia: number; // Auto - Jefe
  scoreActual50_50: number;
  scoreSimulado70_30: number;
  impactoCambio: number; // scoreSimulado - scoreActual
  nivel?: string;
  area?: string;
  categoria?: 'administrativo' | 'operativo';
}

export interface ImpactSummary {
  suben: { cantidad: number; porcentaje: number; promedioPuntos: number };
  bajan: { cantidad: number; porcentaje: number; promedioPuntos: number };
  sinCambio: { cantidad: number; porcentaje: number };
  maximaBaja: number;
  maximaSubida: number;
}

export interface DifferenceCategory {
  categoria: string;
  cantidad: number;
  porcentaje: number;
  interpretacion: string;
}

export interface EvaluationWithScore {
  id: string;
  usuario_id: string;
  colaborador_id?: string;
  tipo: 'auto' | 'jefe';
  responses: Record<string, number>;
  score: number;
  nivel?: string;
}

/**
 * Obtiene todas las evaluaciones del período con sus scores calculados
 */
export async function getEvaluationsForPeriod(periodoId: string): Promise<EvaluationWithScore[]> {
  try {
    // Obtener todas las evaluaciones enviadas del período
    const { data: evaluations, error } = await supabase
      .from('evaluations')
      .select(`
        id,
        usuario_id,
        colaborador_id,
        tipo,
        responses,
        periodo_id
      `)
      .eq('periodo_id', periodoId)
      .eq('estado', 'enviado');

    if (error) {
      console.error('Error obteniendo evaluaciones:', error);
      return [];
    }

    if (!evaluations || evaluations.length === 0) {
      return [];
    }

    // Obtener información de usuarios para determinar niveles
    const userIds = new Set<string>();
    evaluations.forEach(evaluation => {
      if (evaluation.usuario_id) userIds.add(evaluation.usuario_id);
      if (evaluation.colaborador_id) userIds.add(evaluation.colaborador_id);
    });

    const { data: users } = await supabase
      .from('users')
      .select('dpi, nivel, area, tipo_puesto')
      .in('dpi', Array.from(userIds));

    const usersMap = new Map(
      users?.map(u => [u.dpi, { nivel: u.nivel, area: u.area, tipo_puesto: u.tipo_puesto }]) || []
    );

    // Calcular score para cada evaluación
    const evaluationsWithScore: EvaluationWithScore[] = [];

    for (const evaluation of evaluations) {
      const userId = evaluation.tipo === 'auto' ? evaluation.usuario_id : evaluation.colaborador_id;
      const userInfo = usersMap.get(userId || '');
      
      if (!userInfo?.nivel) continue;

      // Obtener instrumento para el nivel
      const instrument = await getInstrumentForUser(userInfo.nivel);
      if (!instrument) continue;

      // Calcular score
      const responses = evaluation.responses as Record<string, number>;
      const score = calculatePerformanceScore(responses, instrument.dimensionesDesempeno);

      evaluationsWithScore.push({
        id: evaluation.id,
        usuario_id: evaluation.usuario_id,
        colaborador_id: evaluation.colaborador_id || undefined,
        tipo: evaluation.tipo as 'auto' | 'jefe',
        responses,
        score,
        nivel: userInfo.nivel,
      });
    }

    return evaluationsWithScore;
  } catch (error) {
    console.error('Error en getEvaluationsForPeriod:', error);
    return [];
  }
}

/**
 * Calcula estadísticas generales por tipo de evaluación
 */
export function calculateGeneralStats(evaluations: EvaluationWithScore[]): GeneralStats[] {
  const autoEvaluations = evaluations.filter(e => e.tipo === 'auto');
  const jefeEvaluations = evaluations.filter(e => e.tipo === 'jefe');

  const stats: GeneralStats[] = [];

  for (const tipo of ['auto', 'jefe'] as const) {
    const evals = tipo === 'auto' ? autoEvaluations : jefeEvaluations;
    const scores = evals.map(e => e.score);

    if (scores.length === 0) {
      stats.push({
        tipo,
        cantidad: 0,
        promedio: 0,
        desviacionEstandar: 0,
        mediana: 0,
        minimo: 0,
        maximo: 0,
        porcentajeAlto: 0,
        porcentajeBajo: 0,
      });
      continue;
    }

    const promedio = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - promedio, 2), 0) / scores.length;
    const desviacionEstandar = Math.sqrt(variance);
    
    const sorted = [...scores].sort((a, b) => a - b);
    const mediana = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    const minimo = Math.min(...scores);
    const maximo = Math.max(...scores);
    const porcentajeAlto = (scores.filter(s => s >= 4).length / scores.length) * 100;
    const porcentajeBajo = (scores.filter(s => s < 3).length / scores.length) * 100;

    stats.push({
      tipo,
      cantidad: scores.length,
      promedio: Math.round(promedio * 100) / 100,
      desviacionEstandar: Math.round(desviacionEstandar * 100) / 100,
      mediana: Math.round(mediana * 100) / 100,
      minimo: Math.round(minimo * 100) / 100,
      maximo: Math.round(maximo * 100) / 100,
      porcentajeAlto: Math.round(porcentajeAlto * 100) / 100,
      porcentajeBajo: Math.round(porcentajeBajo * 100) / 100,
    });
  }

  return stats;
}

/**
 * Calcula análisis de diferencias por colaborador
 */
export async function calculateIndividualDifferences(
  evaluations: EvaluationWithScore[]
): Promise<IndividualAnalysis[]> {
  const autoMap = new Map<string, EvaluationWithScore>();
  const jefeMap = new Map<string, EvaluationWithScore[]>();

  // Agrupar autoevaluaciones por usuario_id
  evaluations
    .filter(e => e.tipo === 'auto')
    .forEach(evaluation => {
      autoMap.set(evaluation.usuario_id, evaluation);
    });

  // Agrupar evaluaciones jefe por colaborador_id
  evaluations
    .filter(e => e.tipo === 'jefe')
    .forEach(evaluation => {
      if (evaluation.colaborador_id) {
        if (!jefeMap.has(evaluation.colaborador_id)) {
          jefeMap.set(evaluation.colaborador_id, []);
        }
        jefeMap.get(evaluation.colaborador_id)!.push(evaluation);
      }
    });

  // Obtener información de usuarios
  const userIds = new Set<string>();
  autoMap.forEach((_, id) => userIds.add(id));
  jefeMap.forEach((_, id) => userIds.add(id));

  const { data: users } = await supabase
    .from('users')
    .select('dpi, nombre, apellidos, nivel, area, tipo_puesto')
    .in('dpi', Array.from(userIds));

  const usersMap = new Map(
    users?.map(u => [
      u.dpi,
      {
        nombre: `${u.nombre} ${u.apellidos}`,
        nivel: u.nivel,
        area: u.area,
        tipo_puesto: u.tipo_puesto,
      },
    ]) || []
  );

  // Obtener categorías de job_levels
  const { data: jobLevels } = await supabase
    .from('job_levels')
    .select('code, category');

  const categoryMap = new Map(
    jobLevels?.map(jl => [jl.code, jl.category as 'administrativo' | 'operativo']) || []
  );

  const individualData: IndividualAnalysis[] = [];

  // Emparejar auto y jefe
  for (const [colaboradorId, autoEval] of autoMap.entries()) {
    const jefeEvals = jefeMap.get(colaboradorId) || [];
    
    // Si hay múltiples evaluadores, usar promedio
    const scoreJefe = jefeEvals.length > 0
      ? jefeEvals.reduce((sum, e) => sum + e.score, 0) / jefeEvals.length
      : null;

    if (scoreJefe === null) continue; // Solo incluir si hay evaluación jefe

    const scoreAuto = autoEval.score;
    const diferencia = scoreAuto - scoreJefe;
    const scoreActual50_50 = (scoreAuto + scoreJefe) / 2;
    const scoreSimulado70_30 = (scoreAuto * 0.30) + (scoreJefe * 0.70);
    const impactoCambio = scoreSimulado70_30 - scoreActual50_50;

    const userInfo = usersMap.get(colaboradorId);
    const nivel = userInfo?.nivel || autoEval.nivel;
    const categoria = nivel ? categoryMap.get(nivel) : undefined;

    individualData.push({
      colaboradorId,
      colaboradorNombre: userInfo?.nombre || colaboradorId,
      scoreAuto: Math.round(scoreAuto * 100) / 100,
      scoreJefe: Math.round(scoreJefe * 100) / 100,
      diferencia: Math.round(diferencia * 100) / 100,
      scoreActual50_50: Math.round(scoreActual50_50 * 100) / 100,
      scoreSimulado70_30: Math.round(scoreSimulado70_30 * 100) / 100,
      impactoCambio: Math.round(impactoCambio * 100) / 100,
      nivel,
      area: userInfo?.area,
      categoria,
    });
  }

  return individualData;
}

/**
 * Calcula resumen del impacto del cambio de ponderación
 */
export function calculateImpactChange(individualData: IndividualAnalysis[]): ImpactSummary {
  const suben = individualData.filter(d => d.impactoCambio > 0.1);
  const bajan = individualData.filter(d => d.impactoCambio < -0.1);
  const sinCambio = individualData.filter(
    d => d.impactoCambio >= -0.1 && d.impactoCambio <= 0.1
  );

  const promedioSubida = suben.length > 0
    ? suben.reduce((sum, d) => sum + d.impactoCambio, 0) / suben.length
    : 0;

  const promedioBaja = bajan.length > 0
    ? bajan.reduce((sum, d) => sum + Math.abs(d.impactoCambio), 0) / bajan.length
    : 0;

  const maximaSubida = suben.length > 0
    ? Math.max(...suben.map(d => d.impactoCambio))
    : 0;

  const maximaBaja = bajan.length > 0
    ? Math.max(...bajan.map(d => Math.abs(d.impactoCambio)))
    : 0;

  const total = individualData.length;

  return {
    suben: {
      cantidad: suben.length,
      porcentaje: total > 0 ? Math.round((suben.length / total) * 100 * 100) / 100 : 0,
      promedioPuntos: Math.round(promedioSubida * 100) / 100,
    },
    bajan: {
      cantidad: bajan.length,
      porcentaje: total > 0 ? Math.round((bajan.length / total) * 100 * 100) / 100 : 0,
      promedioPuntos: Math.round(promedioBaja * 100) / 100,
    },
    sinCambio: {
      cantidad: sinCambio.length,
      porcentaje: total > 0 ? Math.round((sinCambio.length / total) * 100 * 100) / 100 : 0,
    },
    maximaBaja: Math.round(maximaBaja * 100) / 100,
    maximaSubida: Math.round(maximaSubida * 100) / 100,
  };
}

/**
 * Categoriza las diferencias entre autoevaluación y evaluación jefe
 */
export function categorizeDifferences(individualData: IndividualAnalysis[]): DifferenceCategory[] {
  const categorias = [
    {
      categoria: 'sobrevaloracion_mucha',
      interpretacion: 'Se sobrevaloran mucho',
      filter: (d: IndividualAnalysis) => d.diferencia > 1,
    },
    {
      categoria: 'sobrevaloracion_moderada',
      interpretacion: 'Se sobrevaloran moderadamente',
      filter: (d: IndividualAnalysis) => d.diferencia > 0.5 && d.diferencia <= 1,
    },
    {
      categoria: 'alineadas',
      interpretacion: 'Evaluaciones alineadas',
      filter: (d: IndividualAnalysis) => Math.abs(d.diferencia) <= 0.5,
    },
    {
      categoria: 'subestimacion_moderada',
      interpretacion: 'Se subestiman moderadamente',
      filter: (d: IndividualAnalysis) => d.diferencia < -0.5 && d.diferencia >= -1,
    },
    {
      categoria: 'subestimacion_mucha',
      interpretacion: 'Se subestiman mucho',
      filter: (d: IndividualAnalysis) => d.diferencia < -1,
    },
  ];

  const total = individualData.length;
  const result: DifferenceCategory[] = categorias.map(cat => {
    const cantidad = individualData.filter(cat.filter).length;
    return {
      categoria: cat.categoria,
      cantidad,
      porcentaje: total > 0 ? Math.round((cantidad / total) * 100 * 100) / 100 : 0,
      interpretacion: cat.interpretacion,
    };
  });

  return result;
}

/**
 * Análisis segmentado por grupo
 */
export function calculateByGroup(
  individualData: IndividualAnalysis[],
  groupBy: 'categoria' | 'area' | 'nivel'
): Record<string, IndividualAnalysis[]> {
  const grouped: Record<string, IndividualAnalysis[]> = {};

  individualData.forEach(data => {
    let key: string;
    
    if (groupBy === 'categoria') {
      key = data.categoria || 'sin_categoria';
    } else if (groupBy === 'area') {
      key = data.area || 'sin_area';
    } else {
      key = data.nivel || 'sin_nivel';
    }

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(data);
  });

  return grouped;
}

