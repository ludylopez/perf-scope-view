/**
 * Servicio para generar Plan de Capacitación Consolidado por Unidad
 * TODO EN TYPESCRIPT - Sin migraciones SQL
 */

import { supabase } from "@/integrations/supabase/client";
import { PlanCapacitacionUnidad, BrechaDimension, TopicoCapacitacion, Distribucion9Box, PlanCapacitacionEstructurado } from "@/types/trainingPlan";
import { getEquipoCascadaCompleto } from "./teamAnalysis";
import type { EquipoCascadaCompleto } from "@/types/teamAnalysis";

export interface TrainingPlanError {
  message: string;
  details?: string;
  code?: string;
}

/**
 * Normaliza un tópico (por ahora sin tabla de sinónimos, solo lowercase y trim)
 */
function normalizarTopico(topico: string): string {
  return topico.toLowerCase().trim();
}

/**
 * Calcula similitud entre dos tópicos usando palabras clave comunes
 */
function calcularSimilitud(topico1: string, topico2: string): number {
  const palabras1 = new Set(topico1.toLowerCase().split(/\s+/));
  const palabras2 = new Set(topico2.toLowerCase().split(/\s+/));
  
  const interseccion = new Set([...palabras1].filter(p => palabras2.has(p)));
  const union = new Set([...palabras1, ...palabras2]);
  
  if (union.size === 0) return 0;
  return interseccion.size / union.size;
}

/**
 * Agrupa tópicos similares por temática
 */
function agruparTopicosPorTematica(capacitaciones: TopicoCapacitacion[]): Array<{
  tematica: string;
  topicos: TopicoCapacitacion[];
  prioridadMaxima: 'urgente' | 'alta' | 'media' | 'baja';
  categoria: string;
  dimensiones: Set<string>;
  frecuenciaTotal: number;
}> {
  const grupos: Array<{
    tematica: string;
    topicos: TopicoCapacitacion[];
    prioridadMaxima: 'urgente' | 'alta' | 'media' | 'baja';
    categoria: string;
    dimensiones: Set<string>;
    frecuenciaTotal: number;
  }> = [];

  const umbralSimilitud = 0.3; // 30% de similitud para agrupar

  for (const cap of capacitaciones) {
    let asignado = false;

    // Buscar grupo existente con similitud
    for (const grupo of grupos) {
      // Agrupar por categoría primero
      if (grupo.categoria === cap.categoria) {
        // Verificar similitud con algún tópico del grupo
        const tieneSimilitud = grupo.topicos.some(t => 
          calcularSimilitud(t.topico, cap.topico) >= umbralSimilitud
        );

        if (tieneSimilitud) {
          grupo.topicos.push(cap);
          grupo.frecuenciaTotal += cap.frecuenciaAbsoluta;
          cap.dimensionesRelacionadas.forEach(d => grupo.dimensiones.add(d));
          
          // Actualizar prioridad máxima
          const ordenPrioridad = { urgente: 1, alta: 2, media: 3, baja: 4 };
          if (ordenPrioridad[cap.prioridad] < ordenPrioridad[grupo.prioridadMaxima]) {
            grupo.prioridadMaxima = cap.prioridad;
          }
          
          asignado = true;
          break;
        }
      }
    }

    // Si no se asignó, crear nuevo grupo
    if (!asignado) {
      const nombreTematica = cap.categoria === 'Liderazgo' ? 'Liderazgo y Gestión de Equipos' :
                             cap.categoria === 'Soft Skills' ? 'Habilidades Blandas y Comunicación' :
                             cap.categoria === 'Técnica' ? 'Competencias Técnicas' :
                             cap.categoria === 'Herramientas' ? 'Herramientas y Tecnología' :
                             cap.categoria === 'Normativa' ? 'Normativa y Procedimientos' :
                             'Desarrollo Profesional';

      grupos.push({
        tematica: nombreTematica,
        topicos: [cap],
        prioridadMaxima: cap.prioridad,
        categoria: cap.categoria,
        dimensiones: new Set(cap.dimensionesRelacionadas),
        frecuenciaTotal: cap.frecuenciaAbsoluta,
      });
    }
  }

  // Ordenar grupos por prioridad y frecuencia
  grupos.sort((a, b) => {
    const ordenPrioridad = { urgente: 1, alta: 2, media: 3, baja: 4 };
    const diffPrioridad = ordenPrioridad[a.prioridadMaxima] - ordenPrioridad[b.prioridadMaxima];
    if (diffPrioridad !== 0) return diffPrioridad;
    return b.frecuenciaTotal - a.frecuenciaTotal;
  });

  return grupos;
}

/**
 * Prepara los datos para enviar a la IA - SIN PROCESAMIENTO, solo pasar todos los tópicos
 * La IA hará el agrupamiento inteligente
 */
function prepararDatosParaIA(plan: PlanCapacitacionUnidad): {
  todosLosTopicos: Array<{
    topico: string;
    categoria: string;
    prioridad: string;
    frecuenciaAbsoluta: number;
    frecuenciaPorcentual: number;
    dimensionesRelacionadas: string[];
    fuentes: string[];
    scorePrioridad: number;
    niveles?: Array<{ nivel: string; cantidad: number; cargos: string[] }>;
    categoriasPuesto?: string[];
  }>;
  estadisticas: {
    totalTopicos: number;
    topicosUrgentes: number;
    topicosAltos: number;
    categorias: string[];
    dimensionesUnicas: string[];
    nivelesDisponibles?: Array<{ code: string; name: string; category: string }>;
  };
} {
  // Enviar TODOS los tópicos tal cual, sin procesamiento ni agrupación
  const todosLosTopicos = (Array.isArray(plan.capacitaciones) ? plan.capacitaciones : []).map((cap: any) => ({
    topico: cap.topico || '',
    categoria: cap.categoria || '',
    prioridad: cap.prioridad || 'media',
    frecuenciaAbsoluta: cap.frecuenciaAbsoluta || 0,
    frecuenciaPorcentual: cap.frecuenciaPorcentual || 0,
    dimensionesRelacionadas: Array.isArray(cap.dimensionesRelacionadas) ? cap.dimensionesRelacionadas : [],
    fuentes: Array.isArray(cap.fuentes) ? cap.fuentes : [],
    scorePrioridad: cap.scorePrioridad || 0,
    niveles: Array.isArray(cap.niveles) ? cap.niveles : [],
    categoriasPuesto: Array.isArray(cap.categoriasPuesto) ? cap.categoriasPuesto : [],
  }));

  // Solo estadísticas básicas para contexto
  const topicosUrgentes = todosLosTopicos.filter(t => t.prioridad === 'urgente').length;
  const topicosAltos = todosLosTopicos.filter(t => t.prioridad === 'alta').length;
  const categorias = [...new Set(todosLosTopicos.map(t => t.categoria).filter(Boolean))];
  const dimensionesUnicas = [...new Set(todosLosTopicos.flatMap(t => Array.isArray(t.dimensionesRelacionadas) ? t.dimensionesRelacionadas : []))];

  return {
    todosLosTopicos,
    estadisticas: {
      totalTopicos: todosLosTopicos.length,
      topicosUrgentes,
      topicosAltos,
      categorias,
      dimensionesUnicas,
    },
  };
}

/**
 * Calcula Z-Score: (valor - media) / desviacion_std
 */
function calcularZScore(valor: number, media: number, desviacionStd: number): number {
  if (desviacionStd === 0) return 0;
  return (valor - media) / desviacionStd;
}

/**
 * Calcula percentiles de un array de números
 */
function calcularPercentiles(valores: number[]): { p25: number; p50: number; p75: number } {
  const sorted = [...valores].sort((a, b) => a - b);
  const n = sorted.length;
  
  const getPercentile = (p: number) => {
    const index = (p / 100) * (n - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    if (lower === upper) return sorted[lower];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };
  
  return {
    p25: getPercentile(25),
    p50: getPercentile(50),
    p75: getPercentile(75),
  };
}

/**
 * Obtiene el plan de capacitación consolidado para una unidad jerárquica
 * TODO calculado en TypeScript - sin funciones SQL
 */
export async function getPlanCapacitacionUnidad(
  jefeDpi: string,
  periodoId: string
): Promise<{ plan: PlanCapacitacionUnidad | null; error: TrainingPlanError | null }> {
  try {
    console.log('🔍 Generando plan de capacitación en TypeScript:', { jefeDpi, periodoId });
    
    // 1. Obtener período
    const { data: periodo, error: periodoError } = await supabase
      .from('evaluation_periods')
      .select('id, nombre')
      .eq('id', periodoId)
      .single();
    
    if (periodoError || !periodo) {
      return {
        plan: null,
        error: { message: 'Período de evaluación no encontrado' }
      };
    }

    // 2. Obtener equipo en cascada
    const equipoCascada = await getEquipoCascadaCompleto(jefeDpi, periodoId);
    if (!equipoCascada || !equipoCascada.colaboradores || equipoCascada.colaboradores.length === 0) {
      return {
        plan: null,
        error: { message: 'No se encontraron colaboradores en la unidad' }
      };
    }

    const colaboradoresIds = equipoCascada.colaboradores.map(c => c.dpi);
    const totalColaboradores = colaboradoresIds.length;

    // 3. Obtener evaluaciones completadas
    const { data: evaluaciones, error: evalError } = await supabase
      .from('evaluations')
      .select('usuario_id, estado, tipo')
      .in('usuario_id', colaboradoresIds)
      .eq('periodo_id', periodoId)
      .eq('estado', 'enviado')
      .eq('tipo', 'auto');

    if (evalError) {
      console.error('Error obteniendo evaluaciones:', evalError);
    }

    const evaluacionesCompletadas = evaluaciones?.length || 0;
    const tasaCompletitud = totalColaboradores > 0 
      ? Math.round((evaluacionesCompletadas / totalColaboradores) * 100 * 10) / 10 
      : 0;

    // 4. Obtener resultados finales para promedios
    const { data: resultadosFinales } = await supabase
      .from('final_evaluation_results')
      .select('colaborador_id, desempeno_porcentaje, posicion_9box')
      .in('colaborador_id', colaboradoresIds)
      .eq('periodo_id', periodoId);

    const promedioDesempenoUnidad = resultadosFinales && resultadosFinales.length > 0
      ? Math.round((resultadosFinales.reduce((sum, r) => sum + (r.desempeno_porcentaje || 0), 0) / resultadosFinales.length) * 10) / 10
      : 0;

    // Promedio organizacional
    const { data: resultadosOrg } = await supabase
      .from('final_evaluation_results')
      .select('desempeno_porcentaje')
      .eq('periodo_id', periodoId);

    const promedioDesempenoOrg = resultadosOrg && resultadosOrg.length > 0
      ? Math.round((resultadosOrg.reduce((sum, r) => sum + (r.desempeno_porcentaje || 0), 0) / resultadosOrg.length) * 10) / 10
      : 0;

    // 5. Calcular brechas por dimensión (simplificado - necesitaríamos calcular dimensiones)
    // Por ahora, retornamos array vacío ya que calcular dimensiones requiere la función SQL
    // TODO: Implementar cálculo de dimensiones en TypeScript si es necesario
    const brechasDimensiones: BrechaDimension[] = [];

    // 6. Obtener tópicos de capacitación de training_topics con información de colaboradores
    const { data: topicosTraining } = await supabase
      .from('training_topics')
      .select(`
        topico, 
        categoria, 
        dimension_relacionada, 
        fuente, 
        colaborador_id,
        users!inner(nivel, cargo, tipo_puesto, direccion_unidad, departamento_dependencia)
      `)
      .in('colaborador_id', colaboradoresIds)
      .eq('periodo_id', periodoId);

    // 7. Obtener comentarios del jefe (evaluations.comments)
    const { data: evaluacionesJefe } = await supabase
      .from('evaluations')
      .select('colaborador_id, comments')
      .in('colaborador_id', colaboradoresIds)
      .eq('periodo_id', periodoId)
      .eq('tipo', 'jefe')
      .eq('estado', 'enviado')
      .not('comments', 'is', null);

    // 8. Obtener solicitudes directas (open_question_responses)
    const { data: evaluacionesAuto } = await supabase
      .from('evaluations')
      .select('id, usuario_id')
      .in('usuario_id', colaboradoresIds)
      .eq('periodo_id', periodoId)
      .eq('tipo', 'auto')
      .eq('estado', 'enviado');

    const evaluacionesAutoIds = evaluacionesAuto?.map(e => e.id) || [];

    const { data: solicitudes } = evaluacionesAutoIds.length > 0 ? await supabase
      .from('open_question_responses')
      .select(`
        respuesta,
        evaluacion_id,
        open_questions!inner(tipo)
      `)
      .in('evaluacion_id', evaluacionesAutoIds)
      .in('open_questions.tipo', ['capacitacion', 'herramienta']) : { data: null };

    // 9. Consolidar tópicos con información de niveles y cargos
    const topicosMap = new Map<string, {
      topico: string;
      categoria: string;
      frecuencia: number;
      dimensiones: Set<string>;
      fuentes: Set<string>;
      niveles: Map<string, { cantidad: number; cargos: Set<string> }>;
      categoriasPuesto: Set<string>;
    }>();

    // Tópicos de training_topics
    topicosTraining?.forEach((tt: any) => {
      const topicoNorm = normalizarTopico(tt.topico);
      const key = `${topicoNorm}|${tt.categoria}`;
      
      if (!topicosMap.has(key)) {
        topicosMap.set(key, {
          topico: topicoNorm,
          categoria: tt.categoria,
          frecuencia: 0,
          dimensiones: new Set(),
          fuentes: new Set(),
          niveles: new Map(),
          categoriasPuesto: new Set(),
        });
      }
      
      const entry = topicosMap.get(key)!;
      entry.frecuencia++;
      if (tt.dimension_relacionada) entry.dimensiones.add(tt.dimension_relacionada);
      entry.fuentes.add(tt.fuente || 'plan');
      
      // Agregar información de nivel y cargo
      if (tt.users) {
        const nivel = tt.users.nivel || 'Sin nivel';
        const cargo = tt.users.cargo || 'Sin cargo';
        const categoriaPuesto = tt.users.tipo_puesto || 'Sin categoría';
        
        if (categoriaPuesto !== 'Sin categoría') {
          entry.categoriasPuesto.add(categoriaPuesto);
        }
        
        if (!entry.niveles.has(nivel)) {
          entry.niveles.set(nivel, { cantidad: 0, cargos: new Set() });
        }
        
        const nivelInfo = entry.niveles.get(nivel)!;
        nivelInfo.cantidad++;
        if (cargo !== 'Sin cargo') {
          nivelInfo.cargos.add(cargo);
        }
      }
    });

    // Tópicos de solicitudes directas
    solicitudes?.forEach((sq: any) => {
      if (sq.respuesta && sq.respuesta.trim().length > 3) {
        const topicoNorm = normalizarTopico(sq.respuesta);
        const categoria = sq.open_questions?.tipo === 'capacitacion' ? 'Técnica' : 
                         sq.open_questions?.tipo === 'herramienta' ? 'Herramientas' : 'Otro';
        const key = `${topicoNorm}|${categoria}`;
        
        if (!topicosMap.has(key)) {
          topicosMap.set(key, {
            topico: topicoNorm,
            categoria,
            frecuencia: 0,
            dimensiones: new Set(),
            fuentes: new Set(),
            niveles: new Map(), // Inicializar niveles
            categoriasPuesto: new Set(), // Inicializar categoriasPuesto
          });
        }
        
        const entry = topicosMap.get(key)!;
        entry.frecuencia++;
        entry.fuentes.add('solicitud_colaborador');
        
        // Intentar obtener información del colaborador si está disponible
        // Nota: Las solicitudes directas no siempre tienen información de usuario asociada
        // Por ahora, si no hay información, se dejará vacío
      }
    });

    // 10. Convertir a array y calcular scores
    const topicosArray: Array<{
      topico: string;
      categoria: string;
      frecuencia: number;
      frecuenciaPorcentual: number;
      dimensiones: string[];
      fuentes: string[];
      scorePrioridad: number;
      niveles: Array<{ nivel: string; cantidad: number; cargos: string[] }>;
      categoriasPuesto: string[];
    }> = Array.from(topicosMap.values()).map(entry => {
      const frecuenciaPorcentual = Math.round((entry.frecuencia / totalColaboradores) * 100 * 10) / 10;
      // Score simplificado: frecuencia% * 0.5 + 50 * 0.5 (sin Z-Score por ahora)
      const scorePrioridad = (frecuenciaPorcentual * 0.5) + (50 * 0.5);
      
      // Convertir niveles a array (con validación)
      const nivelesArray = entry.niveles && entry.niveles instanceof Map
        ? Array.from(entry.niveles.entries()).map(([nivel, info]) => ({
            nivel,
            cantidad: info.cantidad,
            cargos: Array.from(info.cargos || []),
          })).sort((a, b) => b.cantidad - a.cantidad) // Ordenar por cantidad descendente
        : [];
      
      // Convertir categoriasPuesto a array (con validación)
      const categoriasPuestoArray = entry.categoriasPuesto && entry.categoriasPuesto instanceof Set
        ? Array.from(entry.categoriasPuesto)
        : [];
      
      return {
        topico: entry.topico,
        categoria: entry.categoria,
        frecuencia: entry.frecuencia,
        frecuenciaPorcentual,
        dimensiones: Array.from(entry.dimensiones || []),
        fuentes: Array.from(entry.fuentes || []),
        scorePrioridad: Math.round(scorePrioridad * 100) / 100,
        niveles: nivelesArray,
        categoriasPuesto: categoriasPuestoArray,
      };
    });

    // 11. Calcular percentiles y clasificar
    const scores = topicosArray.map(t => t.scorePrioridad);
    const percentiles = calcularPercentiles(scores);

    const capacitaciones: TopicoCapacitacion[] = topicosArray.map(t => ({
      topico: t.topico,
      categoria: t.categoria as any,
      frecuenciaAbsoluta: t.frecuencia,
      frecuenciaPorcentual: t.frecuenciaPorcentual,
      scorePrioridad: t.scorePrioridad,
      prioridad: t.scorePrioridad >= percentiles.p75 ? 'urgente' :
                t.scorePrioridad >= percentiles.p50 ? 'alta' :
                t.scorePrioridad >= percentiles.p25 ? 'media' : 'baja',
      dimensionesRelacionadas: t.dimensiones,
      fuentes: t.fuentes as any[],
      // Agregar información de niveles y cargos (extendiendo el tipo si es necesario)
      niveles: t.niveles,
      categoriasPuesto: t.categoriasPuesto,
    } as any)).sort((a, b) => {
      const order = { urgente: 1, alta: 2, media: 3, baja: 4 };
      return (order[a.prioridad] || 5) - (order[b.prioridad] || 5) || b.scorePrioridad - a.scorePrioridad;
    });

    // 12. Distribución 9-Box
    const distribucion9BoxMap = new Map<string, number>();
    resultadosFinales?.forEach(r => {
      if (r.posicion_9box) {
        distribucion9BoxMap.set(r.posicion_9box, (distribucion9BoxMap.get(r.posicion_9box) || 0) + 1);
      }
    });

    const distribucion9Box: Distribucion9Box[] = Array.from(distribucion9BoxMap.entries()).map(([posicion, cantidad]) => {
      const porcentaje = Math.round((cantidad / totalColaboradores) * 100 * 10) / 10;
      const factorUrgencia = posicion.startsWith('bajo-') ? 100 :
                            posicion.startsWith('medio-') ? 50 : 20;
      const accionRecomendada = posicion.startsWith('bajo-') ? 'Desarrollo urgente requerido' :
                               posicion.startsWith('medio-') ? 'Desarrollo gradual recomendado' :
                               posicion.startsWith('alto-') ? 'Mantenimiento y crecimiento' :
                               'Evaluación necesaria';
      
      return {
        posicion,
        cantidad,
        porcentaje,
        factorUrgencia,
        accionRecomendada,
      };
    }).sort((a, b) => b.factorUrgencia - a.factorUrgencia);

    // 13. Resumen ejecutivo
    const capacitacionesPrioritarias = capacitaciones
      .filter(c => c.prioridad === 'urgente' || c.prioridad === 'alta')
      .slice(0, 5)
      .map(c => c.topico);

    const dimensionMasCritica = brechasDimensiones.length > 0
      ? brechasDimensiones.sort((a, b) => a.zScore - b.zScore)[0]?.dimensionNombre || null
      : null;

    const situacionGeneral = brechasDimensiones.some(b => b.prioridad === 'critica')
      ? 'La unidad presenta brechas críticas que requieren atención inmediata'
      : brechasDimensiones.some(b => b.prioridad === 'alta')
      ? 'La unidad muestra áreas de mejora importantes'
      : 'La unidad se encuentra en un nivel adecuado con oportunidades de desarrollo';

    const recomendacionGeneral = capacitaciones.some(c => c.prioridad === 'urgente')
      ? 'Priorizar capacitaciones urgentes identificadas y abordar brechas críticas'
      : 'Continuar con desarrollo gradual y fortalecer áreas de oportunidad';

    // 14. Construir resultado
    const plan: PlanCapacitacionUnidad = {
      metadata: {
        periodoId,
        periodoNombre: periodo.nombre,
        fechaGeneracion: new Date().toISOString(),
        jefeDpi,
      },
      contexto: {
        totalColaboradores,
        evaluacionesCompletadas,
        tasaCompletitud,
        promedioDesempenoUnidad,
        promedioDesempenoOrg,
      },
      brechasDimensiones,
      capacitaciones,
      distribucion9Box,
      resumenEjecutivo: {
        situacionGeneral,
        dimensionMasCritica,
        capacitacionesPrioritarias,
        recomendacionGeneral,
      },
    };

    console.log('✅ Plan de capacitación generado exitosamente en TypeScript');
    return { plan, error: null };

  } catch (error: any) {
    console.error('❌ Excepción en getPlanCapacitacionUnidad:', error);
    return {
      plan: null,
      error: {
        message: error.message || 'Error inesperado al generar el plan de capacitación',
        details: error.stack
      }
    };
  }
}

/**
 * Genera un Plan de Capacitación Estructurado usando IA (OpenAI)
 * Usa Edge Function de Supabase para mantener consistencia y seguridad
 */
export async function generateTrainingPlanWithAI(
  planData: PlanCapacitacionUnidad
): Promise<{ plan: PlanCapacitacionEstructurado | null; error: TrainingPlanError | null }> {
  try {
    console.log('🤖 Generando plan de capacitación estructurado con IA (Edge Function)...');

    // Preparar datos para IA - SIN PROCESAMIENTO, solo pasar todos los tópicos
    const datosParaIA = prepararDatosParaIA(planData);
    
    // Validar que haya datos para procesar
    if (!datosParaIA.todosLosTopicos || datosParaIA.todosLosTopicos.length === 0) {
      return {
        plan: null,
        error: {
          message: 'No se encontraron tópicos de capacitación para generar el plan. Verifica que haya evaluaciones completadas con planes de desarrollo.',
          code: 'NO_TOPICS_FOUND'
        }
      };
    }
    
    console.log('📊 Enviando a IA (SIN procesamiento previo):', {
      totalTopicos: datosParaIA.todosLosTopicos.length,
      urgentes: datosParaIA.estadisticas.topicosUrgentes,
      altos: datosParaIA.estadisticas.topicosAltos,
      categorias: datosParaIA.estadisticas.categorias,
      dimensiones: datosParaIA.estadisticas.dimensionesUnicas.length,
    });

    // Intentar primero con supabase.functions.invoke
    try {
      // Asegurar que todos los arrays estén inicializados
      const planDataParaEnviar = {
        metadata: planData.metadata,
        contexto: planData.contexto,
        brechasDimensiones: Array.isArray(planData.brechasDimensiones) ? planData.brechasDimensiones : [],
        todosLosTopicos: Array.isArray(datosParaIA.todosLosTopicos) ? datosParaIA.todosLosTopicos : [],
        estadisticas: {
          ...datosParaIA.estadisticas,
          categorias: Array.isArray(datosParaIA.estadisticas.categorias) ? datosParaIA.estadisticas.categorias : [],
          dimensionesUnicas: Array.isArray(datosParaIA.estadisticas.dimensionesUnicas) ? datosParaIA.estadisticas.dimensionesUnicas : [],
        },
        resumenEjecutivo: planData.resumenEjecutivo,
      };

      const { data, error: functionError } = await supabase.functions.invoke(
        "generate-training-plan",
        {
          body: {
            planData: planDataParaEnviar,
          },
        }
      );

      if (functionError) {
        throw functionError;
      }

      if (!data?.success) {
        throw new Error(data?.error || "Error desconocido al generar plan de capacitación");
      }

      // Parsear respuesta
      const planEstructurado = parseTrainingPlanResponse(JSON.stringify(data.plan));

      console.log('✅ Plan de capacitación estructurado generado exitosamente');
      return { plan: planEstructurado, error: null };

    } catch (invokeError: any) {
      // Si falla la invocación, intentar con fetch directo (fallback)
      console.warn('⚠️ Invocación con supabase.functions.invoke falló, intentando con fetch directo:', invokeError);
      
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://oxadpbdlpvwyapuondei.supabase.co";
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94YWRwYmRscHZ3eWFwdW9uZGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMjU5MzcsImV4cCI6MjA3NzkwMTkzN30.HjIoMaw20qx7DscE-XWCaz88EWa0Jv_aCDcMtv6eadw";
      
      // Asegurar que todos los arrays estén inicializados (mismo que arriba)
      const planDataParaEnviar = {
        metadata: planData.metadata,
        contexto: planData.contexto,
        brechasDimensiones: Array.isArray(planData.brechasDimensiones) ? planData.brechasDimensiones : [],
        todosLosTopicos: Array.isArray(datosParaIA.todosLosTopicos) ? datosParaIA.todosLosTopicos : [],
        estadisticas: {
          ...datosParaIA.estadisticas,
          categorias: Array.isArray(datosParaIA.estadisticas.categorias) ? datosParaIA.estadisticas.categorias : [],
          dimensionesUnicas: Array.isArray(datosParaIA.estadisticas.dimensionesUnicas) ? datosParaIA.estadisticas.dimensionesUnicas : [],
        },
        resumenEjecutivo: planData.resumenEjecutivo,
      };

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-training-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          planData: planDataParaEnviar,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        console.error('❌ Error de Edge Function:', {
          status: response.status,
          error: errorData,
          errorText: errorText.substring(0, 500)
        });
        
        if (response.status === 404) {
          throw new Error('La Edge Function "generate-training-plan" no está desplegada en Supabase. Por favor, despliégala desde el Dashboard de Supabase o contacta al administrador.');
        }
        
        const errorMessage = errorData.error || errorData.message || `Error ${response.status}: ${errorText.substring(0, 200)}`;
        throw new Error(errorMessage);
      }

      const responseData = await response.json();

      if (!responseData?.success) {
        throw new Error(responseData?.error || "Error desconocido al generar plan de capacitación");
      }

      // Parsear respuesta
      const planEstructurado = parseTrainingPlanResponse(JSON.stringify(responseData.plan));

      console.log('✅ Plan de capacitación estructurado generado exitosamente (usando fetch directo)');
      return { plan: planEstructurado, error: null };
    }

  } catch (error: any) {
    console.error('❌ Error generando plan estructurado con IA:', error);
    
    // Mensaje de error más amigable
    let errorMessage = 'Error al generar plan de capacitación con IA';
    if (error.message?.includes('no está desplegada') || error.message?.includes('404')) {
      errorMessage = 'La Edge Function "generate-training-plan" no está desplegada en Supabase. Por favor, despliégala desde el Dashboard de Supabase (Edge Functions > Create function) o contacta al administrador.';
    } else if (error.message?.includes('API key') || error.message?.includes('OPENAI_API_KEY')) {
      errorMessage = 'API key de OpenAI no configurada en Supabase. Por favor, contacta al administrador del sistema.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      plan: null,
      error: {
        message: errorMessage,
        details: error.stack,
        code: error.message?.includes('no está desplegada') || error.message?.includes('404') ? 'FUNCTION_NOT_DEPLOYED' : 
              error.message?.includes('API key') || error.message?.includes('OPENAI_API_KEY') ? 'API_KEY_MISSING' : undefined
      }
    };
  }
}


/**
 * Parsea la respuesta de la Edge Function a un PlanCapacitacionEstructurado
 */
function parseTrainingPlanResponse(planData: any): PlanCapacitacionEstructurado {
  try {
    // Si ya viene como objeto, usarlo directamente
    const parsed = typeof planData === 'string' ? JSON.parse(planData) : planData;

    return {
      objetivos: parsed.objetivos || [],
      tematicas: parsed.tematicas || [], // Nuevo formato: temáticas agrupadas
      actividades: parsed.actividades || [], // Formato legacy: mantener para compatibilidad
      cronograma: parsed.cronograma || [],
      recursos: parsed.recursos || [],
      metricasExito: parsed.metricasExito || [],
      estrategiaImplementacion: parsed.estrategiaImplementacion || "Estrategia de implementación a definir.",
      fechaGeneracion: parsed.fechaGeneracion || new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error parsing training plan response:", error);
    throw error;
  }
}
