import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Obtiene el prompt del sistema desde la base de datos
 * Si no se encuentra en BD, usa un fallback básico
 */
async function getSystemPromptFromDB(supabase: any): Promise<string> {
  try {
    const { data: promptData, error } = await supabase
      .from("ai_prompts")
      .select("prompt_text")
      .eq("function_name", "generate-development-plan")
      .eq("activo", true)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (error || !promptData) {
      console.warn("No se encontró prompt en BD, usando fallback:", error?.message);
      // Fallback básico (mínimo necesario)
      return `Eres un experto en Recursos Humanos. Genera un Plan de Desarrollo Individual en formato JSON con: objetivos, acciones, dimensionesDebiles, recomendaciones, y topicosCapacitacion. Responde ÚNICAMENTE con JSON.`;
    }

    return promptData.prompt_text;
  } catch (error: any) {
    console.error("Error obteniendo prompt desde BD:", error);
    // Fallback en caso de error
    return `Eres un experto en Recursos Humanos. Genera un Plan de Desarrollo Individual en formato JSON con: objetivos, acciones, dimensionesDebiles, recomendaciones, y topicosCapacitacion. Responde ÚNICAMENTE con JSON.`;
  }
}

/**
 * Convierte un score de escala 0-5 a porcentaje 0-100
 * (misma lógica que scoreToPercentage en el frontend)
 */
function scoreToPercentage(score: number): number {
  if (score < 1) return 0;
  if (score > 5) return 100;
  return Math.round((score / 5) * 100);
}

interface GenerateDevelopmentPlanRequest {
  colaborador_id: string;
  periodo_id: string;
}

interface DevelopmentPlanResponse {
  success: boolean;
  planId?: string;
  plan?: any;
  error?: string;
}

/**
 * Guarda tópicos de capacitación en la base de datos
 */
async function saveTrainingTopics(
  topicos: any[],
  colaborador: any,
  periodo_id: string,
  development_plan_id: string,
  acciones: any[],
  supabase: any
): Promise<void> {
  if (!topicos || topicos.length === 0) {
    console.log("No hay tópicos de capacitación para guardar");
    return;
  }

  // Primero eliminar tópicos existentes para este plan (si se regenera)
  const { error: deleteError } = await supabase
    .from("training_topics")
    .delete()
    .eq("development_plan_id", development_plan_id);

  if (deleteError) {
    console.error("Error eliminando tópicos existentes:", deleteError);
    // Continuar de todas formas
  }

  // Preparar registros para insertar
  const topicosToInsert = topicos.map((topico: any, index: number) => {
    // Si el tópico viene del plan, buscar la acción relacionada y su dimensión
    let dimensionRelacionada = topico.dimension_relacionada || null;
    let accionRelacionadaId: string | null = null;

    if (topico.fuente === "plan" && acciones && acciones.length > 0) {
      // Buscar la acción que mejor coincida con el tópico
      // Por ahora usamos el índice como referencia, pero podríamos mejorar esto
      // Si el tópico tiene dimension_relacionada, buscar acción con esa dimensión
      if (dimensionRelacionada) {
        const accionRelacionada = acciones.find(
          (acc: any) => acc.dimension === dimensionRelacionada
        );
        if (accionRelacionada) {
          accionRelacionadaId = acciones.indexOf(accionRelacionada).toString();
        }
      }
    }

    return {
      colaborador_id: colaborador.dpi,
      periodo_id: periodo_id,
      development_plan_id: development_plan_id,
      topico: topico.topico || "",
      area: colaborador.area || "No especificada",
      nivel: colaborador.nivel || "A1",
      fuente: topico.fuente || "plan",
      dimension_relacionada: dimensionRelacionada,
      accion_relacionada_id: accionRelacionadaId,
      prioridad: topico.prioridad || "media",
      categoria: topico.categoria || "Técnica",
      descripcion: topico.descripcion || null,
      fecha_deteccion: new Date().toISOString(),
    };
  });

  // Insertar todos los tópicos
  const { error: insertError } = await supabase
    .from("training_topics")
    .insert(topicosToInsert);

  if (insertError) {
    console.error("Error guardando tópicos de capacitación:", insertError);
    // No lanzar error, solo loguear, para no fallar la generación del plan
  } else {
    console.log(`Guardados ${topicosToInsert.length} tópicos de capacitación`);
  }
}

/**
 * Construye el user prompt con datos específicos (sin contexto estático)
 */
function buildUserPrompt(data: any): string {
  const { colaborador, autoevaluacion, evaluacionJefe, resultadoFinal, instrumento, grupos, npsScore, necesidadesDesarrollo } = data;

  // Validar que los datos necesarios estén presentes
  if (!autoevaluacion || !evaluacionJefe || !instrumento || !resultadoFinal) {
    throw new Error("Datos incompletos para construir el prompt");
  }

  // Asegurar que responses existe y es un objeto
  const autoResponses = autoevaluacion.responses || {};
  const jefeResponses = evaluacionJefe.responses || {};
  const autoComments = autoevaluacion.comments || {};
  const jefeComments = evaluacionJefe.comments || {};

  // Validar que dimensionesDesempeno existe
  if (!instrumento.dimensionesDesempeno || !Array.isArray(instrumento.dimensionesDesempeno)) {
    throw new Error("Configuración de instrumento inválida: dimensionesDesempeno no encontrada");
  }

  // Consolidar comentarios del colaborador
  const comentariosColaborador: string[] = [];
  Object.keys(autoComments).forEach((dimId) => {
    if (autoComments[dimId]) {
      const dimNombre = instrumento.dimensionesDesempeno.find((d: any) => d.id === dimId)?.nombre || 'Dimensión';
      comentariosColaborador.push(`${dimNombre}: ${autoComments[dimId]}`);
    }
  });

  // Consolidar comentarios del jefe
  const comentariosJefe: string[] = [];
  Object.keys(jefeComments).forEach((dimId) => {
    if (jefeComments[dimId]) {
      const dimNombre = instrumento.dimensionesDesempeno.find((d: any) => d.id === dimId)?.nombre || 'Dimensión';
      comentariosJefe.push(`${dimNombre}: ${jefeComments[dimId]}`);
    }
  });

  // Identificar dimensiones más débiles (menores scores)
  const dimensionesConScore = instrumento.dimensionesDesempeno
    .filter((dim: any) => dim.items && Array.isArray(dim.items) && dim.items.length > 0)
    .map((dim: any) => {
      const dimScoreJefe = dim.items.map((item: any) => {
        const value = jefeResponses[item.id];
        return typeof value === 'number' ? value : 0;
      });
      const avg = dimScoreJefe.length > 0 
        ? dimScoreJefe.reduce((a: number, b: number) => a + b, 0) / dimScoreJefe.length 
        : 0;
      const porcentaje = scoreToPercentage(avg);
      return { nombre: dim.nombre || 'Dimensión sin nombre', score: avg, porcentaje, peso: dim.peso || 0 };
    })
    .sort((a: any, b: any) => a.score - b.score); // Ordenar de menor a mayor

  const top3Debiles = dimensionesConScore.slice(0, 3);

  // Identificar ítems individuales con puntuaciones más bajas (críticos)
  // Esto ayuda a la IA a ver exactamente dónde está fallando el colaborador dentro de cada dimensión
  let itemsCriticos: any[] = [];
  instrumento.dimensionesDesempeno.forEach((dim: any) => {
    if (!dim.items || !Array.isArray(dim.items)) return;
    
    dim.items.forEach((item: any) => {
      const scoreJefe = typeof jefeResponses[item.id] === 'number' ? jefeResponses[item.id] : 0;
      const scoreAuto = typeof autoResponses[item.id] === 'number' ? autoResponses[item.id] : 0;
      
      // Considerar críticos los ítems con score del jefe < 70% (equivalente a 3.5/5.0)
      const porcentajeJefe = scoreToPercentage(scoreJefe);
      if (porcentajeJefe < 70) {
        const porcentajeAuto = scoreToPercentage(scoreAuto);
        itemsCriticos.push({
          dimension: dim.nombre || 'Dimensión sin nombre',
          itemTexto: item.texto || 'Item sin texto',
          porcentajeJefe: porcentajeJefe,
          porcentajeAuto: porcentajeAuto,
          diferencia: porcentajeAuto - porcentajeJefe, // Diferencia en porcentaje
        });
      }
    });
  });

  // Ordenar por porcentaje del jefe (de menor a mayor) para priorizar los más críticos
  itemsCriticos.sort((a: any, b: any) => a.porcentajeJefe - b.porcentajeJefe);
  
  // Tomar los top 10 más críticos
  const topItemsCriticos = itemsCriticos.slice(0, 10);

  // Obtener fecha actual y calcular período del plan (6 meses)
  const fechaActual = new Date();
  const añoActual = fechaActual.getFullYear();
  const mesActual = fechaActual.getMonth() + 1;
  const diaActual = fechaActual.getDate();
  const fechaActualFormato = `${añoActual}-${String(mesActual).padStart(2, '0')}-${String(diaActual).padStart(2, '0')}`;
  
  // Calcular fecha final del plan (6 meses después)
  const fechaFinal = new Date(fechaActual);
  fechaFinal.setMonth(fechaFinal.getMonth() + 6);
  const añoFinal = fechaFinal.getFullYear();
  const mesFinal = fechaFinal.getMonth() + 1;
  const fechaFinalFormato = `${añoFinal}-${String(mesFinal).padStart(2, '0')}`;
  
  // Calcular antigüedad
  let antiguedad = "No registrada";
  if (colaborador.fecha_ingreso) {
    const fechaIngreso = new Date(colaborador.fecha_ingreso);
    const años = fechaActual.getFullYear() - fechaIngreso.getFullYear();
    const meses = fechaActual.getMonth() - fechaIngreso.getMonth();
    if (años > 0) {
      antiguedad = `${años} año${años > 1 ? 's' : ''}`;
      if (meses > 0) antiguedad += ` ${meses} mes${meses > 1 ? 'es' : ''}`;
    } else if (meses > 0) {
      antiguedad = `${meses} mes${meses > 1 ? 'es' : ''}`;
    } else {
      antiguedad = "Menos de 1 mes";
    }
  }

  return `COLABORADOR
Nombre: ${colaborador.nombre} ${colaborador.apellidos}
Cargo: ${colaborador.cargo}
Área: ${colaborador.area || "No especificada"}
Nivel: ${colaborador.nivel}
Antigüedad: ${antiguedad}
${colaborador.profesion ? `Profesión: ${colaborador.profesion}` : ''}

⚠️ IMPORTANTE: El CARGO "${colaborador.cargo}" define el tipo de trabajo que realiza este colaborador. Todas las acciones deben ser ESPECÍFICAS a este cargo y reflejar las responsabilidades reales del puesto. NO uses acciones genéricas que podrían aplicarse a cualquier puesto administrativo.

RESULTADOS
Desempeño Final: ${scoreToPercentage(resultadoFinal.desempenoFinal)}%
Evaluación Jefe: ${scoreToPercentage(resultadoFinal.desempenoJefe)}%
Autoevaluación: ${scoreToPercentage(resultadoFinal.desempenoAuto)}%
Potencial: ${resultadoFinal.potencial ? `${scoreToPercentage(resultadoFinal.potencial)}%` : "No evaluado"}
Posición 9-Box: ${resultadoFinal.posicion9Box}
${npsScore !== undefined && npsScore !== null ? `NPS (Net Promoter Score): ${npsScore}/10 ${npsScore >= 9 ? "(Promotor)" : npsScore >= 7 ? "(Neutro)" : "(Detractor)"}` : ""}

DIMENSIONES MÁS DÉBILES (máximo 3)
${top3Debiles.map((d: any, i: number) => `${i + 1}. ${d.nombre}: ${d.porcentaje}%`).join('\n')}

${topItemsCriticos.length > 0 ? `ÍTEMS CRÍTICOS (jefe calificó menos de 70%)
${topItemsCriticos.map((item: any, i: number) => {
  const indicadorDiscrepancia = Math.abs(item.diferencia) > 10 
    ? ` (Discrepancia: Auto=${item.porcentajeAuto}% vs Jefe=${item.porcentajeJefe}%)` 
    : '';
  return `${i + 1}. "${item.itemTexto}" [${item.dimension}]: Jefe=${item.porcentajeJefe}%${indicadorDiscrepancia}`;
}).join('\n')}

IMPORTANTE: Estos ítems específicos (texto literal entre comillas) son donde el colaborador tiene mayores dificultades. El plan debe incluir acciones concretas para mejorar estos puntos específicos mencionados literalmente.` : ''}

${comentariosColaborador.length > 0 ? `COMENTARIOS DEL COLABORADOR
${comentariosColaborador.join('\n')}` : ''}

${comentariosJefe.length > 0 ? `COMENTARIOS DEL JEFE
${comentariosJefe.join('\n')}` : ''}

${necesidadesDesarrollo && necesidadesDesarrollo.length > 0 ? `NECESIDADES DE DESARROLLO Y RECURSOS (expresadas por el colaborador)
${necesidadesDesarrollo.map((necesidad: any, i: number) => {
  const tipoTexto = necesidad.tipo === "capacitacion" ? "Capacitación" : necesidad.tipo === "herramienta" ? "Herramienta/Recurso" : "Otro";
  return `${i + 1}. [${tipoTexto}] ${necesidad.pregunta}
   Respuesta: ${necesidad.respuesta}`;
}).join('\n\n')}

IMPORTANTE: El colaborador ha expresado estas necesidades específicas. DEBES:
- Enfocar la mayoría de las acciones en las dimensiones débiles e ítems críticos identificados arriba
- AL MENOS UNA acción debe responder DIRECTAMENTE a estas necesidades expresadas (herramientas o capacitaciones), mostrando que se escucha su perspectiva
- Las demás acciones pueden integrar estas necesidades cuando sean relevantes a las dimensiones débiles
- Para herramientas: crear acciones de tipo "experiencia" que incluyan usar, probar o implementar las herramientas específicas mencionadas
- Para capacitaciones: mencionar los temas específicos que el colaborador pidió (no solo genéricos)
- Las acciones siempre deben reflejar el CARGO específico del colaborador para que sean relevantes a su puesto
- La acción que responde directamente a las necesidades debe ser específica al cargo y relevante.` : ''}

PARÁMETROS DEL PLAN
Fecha actual: ${fechaActualFormato}
Período del plan: 6 meses (hasta ${fechaFinalFormato})
Cantidad de acciones esperadas: 5-7 acciones respetando modelo 70-20-10 (mínimo 3-4 experiencia, 1-2 social, máximo 1 formal)
Todas las fechas deben ser posteriores a ${fechaActualFormato} y dentro del período del plan.`;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  // Inicializar cliente de Supabase dentro del handler
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ success: false, error: "Configuración de Supabase faltante" }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { colaborador_id, periodo_id }: GenerateDevelopmentPlanRequest = await req.json();

    if (!colaborador_id || !periodo_id) {
      return new Response(
        JSON.stringify({ success: false, error: "colaborador_id y periodo_id son requeridos" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Obtener información completa del colaborador (SIN incluir DPI en el payload a OpenAI)
    const { data: colaborador, error: colaboradorError } = await supabase
      .from("users")
      .select("*")
      .eq("dpi", colaborador_id)
      .single();

    if (colaboradorError || !colaborador) {
      console.error("Error obteniendo colaborador:", colaboradorError);
      return new Response(
        JSON.stringify({ success: false, error: `Colaborador no encontrado: ${colaboradorError?.message || "No encontrado"}` }),
        { status: 404, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Obtener resultado final calculado desde la BD (tiene los cálculos correctos)
    const { data: resultadoFinalBD, error: resultadoError } = await supabase
      .from("final_evaluation_results")
      .select("*")
      .eq("colaborador_id", colaborador_id)
      .eq("periodo_id", periodo_id)
      .maybeSingle();

    // Obtener evaluaciones completas (incluyendo nps_score)
    const { data: autoevaluacion, error: autoError } = await supabase
      .from("evaluations")
      .select("*")
      .eq("usuario_id", colaborador_id)
      .eq("periodo_id", periodo_id)
      .eq("tipo", "auto")
      .eq("estado", "enviado")
      .single();

    const { data: evaluacionJefe, error: jefeError } = await supabase
      .from("evaluations")
      .select("*")
      .eq("colaborador_id", colaborador_id)
      .eq("periodo_id", periodo_id)
      .eq("tipo", "jefe")
      .eq("estado", "enviado")
      .single();


    if (autoError || !autoevaluacion) {
      console.error("Error obteniendo autoevaluación:", autoError);
      return new Response(
        JSON.stringify({ success: false, error: `Autoevaluación no encontrada: ${autoError?.message || "No encontrada"}` }),
        { status: 404, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    if (jefeError || !evaluacionJefe) {
      console.error("Error obteniendo evaluación jefe:", jefeError);
      return new Response(
        JSON.stringify({ success: false, error: `Evaluación del jefe no encontrada: ${jefeError?.message || "No encontrada"}` }),
        { status: 404, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Obtener respuestas a preguntas abiertas (necesidades de capacitación y herramientas)
    const { data: preguntasAbiertas, error: preguntasError } = await supabase
      .from("open_question_responses")
      .select(`
        respuesta,
        open_questions (
          pregunta,
          tipo
        )
      `)
      .eq("evaluacion_id", autoevaluacion.id);

    // Normalizar preguntas abiertas
    const necesidadesDesarrollo: Array<{ tipo: string; pregunta: string; respuesta: string }> = [];
    if (preguntasAbiertas && !preguntasError) {
      preguntasAbiertas.forEach((item: any) => {
        if (item.open_questions && item.respuesta) {
          necesidadesDesarrollo.push({
            tipo: item.open_questions.tipo || "otro",
            pregunta: item.open_questions.pregunta || "",
            respuesta: item.respuesta,
          });
        }
      });
    }

    // Obtener instrumento
    const instrumentId = colaborador.nivel || colaborador.instrumento_id || "A1";
    console.log(`Buscando instrumento con ID: ${instrumentId}`);
    
    const { data: instrumentConfig, error: instrumentError } = await supabase.rpc("get_instrument_config", {
      instrument_id: instrumentId,
    });

    if (instrumentError) {
      console.error("Error obteniendo configuración de instrumento:", instrumentError);
      return new Response(
        JSON.stringify({ success: false, error: `Error obteniendo instrumento: ${instrumentError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    if (!instrumentConfig) {
      console.error(`No se encontró configuración para instrumento: ${instrumentId}`);
      return new Response(
        JSON.stringify({ success: false, error: `No se encontró configuración de instrumento para nivel: ${instrumentId}` }),
        { status: 404, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Verificar grupos/cuadrillas
    const { data: gruposData } = await supabase
      .from("group_members")
      .select("grupo_id, groups!group_members_grupo_id_fkey(nombre, tipo)")
      .eq("colaborador_id", colaborador_id)
      .eq("activo", true);

    const grupos = gruposData?.map((g: any) => ({ nombre: g.groups?.nombre, tipo: g.groups?.tipo })) || [];

    // Validar que instrumentConfig tenga la estructura esperada
    if (!instrumentConfig.dimensionesDesempeno || !Array.isArray(instrumentConfig.dimensionesDesempeno)) {
      console.error("instrumentConfig no tiene dimensionesDesempeno válidas:", instrumentConfig);
      return new Response(
        JSON.stringify({ success: false, error: "Configuración de instrumento inválida: falta dimensionesDesempeno" }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Usar resultado final de la BD si existe (tiene cálculos correctos), sino calcular
    let resultadoFinal;
    if (resultadoFinalBD && resultadoFinalBD.resultado_final) {
      // Usar datos calculados correctamente desde la BD
      const resultadoBD = resultadoFinalBD.resultado_final as any;
      resultadoFinal = {
        desempenoAuto: resultadoBD.desempenoAuto || 0,
        desempenoJefe: resultadoBD.desempenoJefe || 0,
        desempenoFinal: resultadoBD.desempenoFinal || 0,
        potencial: resultadoBD.potencial || null,
        posicion9Box: resultadoBD.posicion9Box || "medio-medio",
      };
      console.log(`✅ [DevelopmentPlan] Usando resultado final desde BD:`, resultadoFinal);
    } else {
      // Fallback: calcular si no existe en BD (caso edge)
      console.warn(`⚠️ [DevelopmentPlan] No se encontró resultado final en BD, calculando...`);
      
    const calcularPromedioDesempeno = (responses: any, dimensions: any) => {
      if (!responses || !dimensions || !Array.isArray(dimensions)) {
        console.error("Error en calcularPromedioDesempeno:", { responses, dimensions });
        return 0;
      }
      let total = 0;
      dimensions.forEach((dim: any) => {
        if (!dim.items || !Array.isArray(dim.items)) {
          console.warn("Dimensión sin items válidos:", dim);
          return;
        }
        const items = dim.items.map((item: any) => {
          const value = responses?.[item.id];
          return typeof value === 'number' ? value : 0;
        });
        if (items.length === 0) {
          console.warn("Dimensión sin items:", dim);
          return;
        }
        const avg = items.reduce((a: number, b: number) => a + b, 0) / items.length;
        total += avg * (dim.peso || 0);
      });
      return total;
    };

    const calcularPromedioPotencial = (responses: any, dimensions: any) => {
      if (!responses || !dimensions || !Array.isArray(dimensions)) return null;
      let total = 0;
      dimensions.forEach((dim: any) => {
        if (!dim.items || !Array.isArray(dim.items)) {
          console.warn("Dimensión de potencial sin items válidos:", dim);
          return;
        }
        const items = dim.items.map((item: any) => {
          const value = responses?.[item.id];
          return typeof value === 'number' ? value : 0;
        });
        if (items.length === 0) {
          console.warn("Dimensión de potencial sin items:", dim);
          return;
        }
        const avg = items.reduce((a: number, b: number) => a + b, 0) / items.length;
        total += avg * (dim.peso || 0);
      });
      return total;
    };

    const desempenoAuto = calcularPromedioDesempeno(autoevaluacion.responses, instrumentConfig.dimensionesDesempeno);
    const desempenoJefe = calcularPromedioDesempeno(evaluacionJefe.responses, instrumentConfig.dimensionesDesempeno);

      // Obtener pesos desde la configuración del instrumento
    const configCalculo = instrumentConfig.configuracion_calculo || {};
    const pesoAuto = configCalculo.pesoAuto || (instrumentId === "A1" ? 0.45 : 0.30);
    const pesoJefe = configCalculo.pesoJefe || (instrumentId === "A1" ? 0.55 : 0.70);
    const desempenoFinal = desempenoJefe * pesoJefe + desempenoAuto * pesoAuto;
    
    const evaluacionPotencial = evaluacionJefe.evaluacion_potencial || evaluacionJefe.evaluacionPotencial || null;
    const potencial = calcularPromedioPotencial(
      evaluacionPotencial?.responses,
      instrumentConfig.dimensionesPotencial
    );

    let posicion9Box = "medio-medio";
    if (potencial !== null) {
      const dLevel = desempenoFinal < 3 ? "bajo" : desempenoFinal <= 4 ? "medio" : "alto";
      const pLevel = potencial < 3 ? "bajo" : potencial <= 4 ? "medio" : "alto";
      posicion9Box = `${dLevel}-${pLevel}`;
    }

      resultadoFinal = {
      desempenoAuto,
      desempenoJefe,
      desempenoFinal,
      potencial,
      posicion9Box,
    };
    }

    // Normalizar formato de evaluaciones para asegurar compatibilidad
    const autoevaluacionNormalizada = {
      ...autoevaluacion,
      responses: autoevaluacion.responses || {},
      comments: autoevaluacion.comments || {},
    };

    const evaluacionJefeNormalizada = {
      ...evaluacionJefe,
      responses: evaluacionJefe.responses || {},
      comments: evaluacionJefe.comments || {},
      // Asegurar que evaluacion_potencial esté en el formato correcto
      evaluacion_potencial: evaluacionJefe.evaluacion_potencial || evaluacionJefe.evaluacionPotencial || null,
    };

    // Construir prompts separados (system y user)
    // Obtener prompt desde la base de datos (permite actualizaciones sin redeploy)
    const systemPrompt = await getSystemPromptFromDB(supabase);
    let userPrompt: string;
    try {
      userPrompt = buildUserPrompt({
        colaborador, // Incluye todos los campos EXCEPTO que el DPI no se usa en el prompt
        autoevaluacion: autoevaluacionNormalizada,
        evaluacionJefe: evaluacionJefeNormalizada,
        resultadoFinal,
        instrumento: instrumentConfig,
        grupos,
        npsScore: autoevaluacion.nps_score,
        necesidadesDesarrollo: necesidadesDesarrollo,
      });
    } catch (promptError: any) {
      console.error("Error construyendo prompt:", promptError);
      return new Response(
        JSON.stringify({ success: false, error: `Error construyendo prompt: ${promptError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Llamar a OpenAI
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "OPENAI_API_KEY no configurada" }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    let openaiResponse;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    const requestStartTime = Date.now();

    try {
      console.log("Llamando a OpenAI API...");

      openaiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: userPrompt
              }
            ],
            temperature: 0.7,
            max_tokens: 8000,
            response_format: { type: "json_object" },
          }),
        }
      );

      const requestDuration = Date.now() - requestStartTime;

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error("Error en OpenAI API:", errorText);
        let parsedError = errorText;
        let errorCode = `${openaiResponse.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          parsedError = errorJson.error?.message || errorJson.message || errorText;
          errorCode = errorJson.error?.code || errorCode;
        } catch {
          parsedError = errorText.substring(0, 500);
        }

        // Registrar llamada fallida
        await supabase.rpc("log_openai_api_call", {
          function_name_param: "generate-development-plan",
          model_used_param: "gpt-4o-mini",
          colaborador_id_param: colaborador_id,
          periodo_id_param: periodo_id,
          status_param: "failed",
          error_message_param: parsedError,
          error_code_param: errorCode,
          request_duration_ms_param: requestDuration,
        });

        return new Response(
          JSON.stringify({
            success: false,
            error: `Error en OpenAI API: ${parsedError}`
          }),
          { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
      }

      console.log("✅ OpenAI API respondió correctamente");
    } catch (fetchError: any) {
      console.error("Error en fetch a OpenAI:", fetchError);
      const requestDuration = Date.now() - requestStartTime;

      // Registrar llamada fallida
      await supabase.rpc("log_openai_api_call", {
        function_name_param: "generate-development-plan",
        model_used_param: "gpt-4o-mini",
        colaborador_id_param: colaborador_id,
        periodo_id_param: periodo_id,
        status_param: "failed",
        error_message_param: fetchError.message || String(fetchError),
        error_code_param: "FETCH_ERROR",
        request_duration_ms_param: requestDuration,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: `Error conectando con OpenAI: ${fetchError.message || String(fetchError)}`
        }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const openaiData = await openaiResponse.json();
    const planText = openaiData.choices?.[0]?.message?.content || "";

    // Extraer estadísticas de uso de tokens
    if (openaiData.usage) {
      promptTokens = openaiData.usage.prompt_tokens || 0;
      completionTokens = openaiData.usage.completion_tokens || 0;
      totalTokens = openaiData.usage.total_tokens || 0;
    }

    // Registrar llamada exitosa con tokens reales
    const requestDuration = Date.now() - requestStartTime;
    await supabase.rpc("log_openai_api_call", {
      function_name_param: "generate-development-plan",
      model_used_param: "gpt-4o-mini",
      colaborador_id_param: colaborador_id,
      periodo_id_param: periodo_id,
      status_param: "success",
      prompt_tokens_param: promptTokens,
      completion_tokens_param: completionTokens,
      total_tokens_param: totalTokens,
      request_duration_ms_param: requestDuration,
    });

    // Parsear respuesta de OpenAI (ya viene como JSON)
    let planData;
    try {
      if (typeof planText === 'string') {
        planData = JSON.parse(planText);
      } else {
        planData = planText;
      }
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      return new Response(
        JSON.stringify({ success: false, error: `Error parseando respuesta de IA: ${errorMessage}` }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Guardar plan en base de datos
    // Guardamos toda la estructura del plan en competencias_desarrollar como JSONB
    // Esto incluye: objetivos, acciones (con tipoAprendizaje, responsable, fecha, indicador, prioridad),
    // dimensionesDebiles, recomendaciones, y topicosCapacitacion
    // NOTA: NO guardamos feedback_individual ni feedback_grupal aquí (se generan por separado)
    const planCompleto = {
      objetivos: planData.objetivos || [],
      acciones: planData.acciones || [],
      dimensionesDebiles: planData.dimensionesDebiles || [],
      recomendaciones: planData.recomendaciones || [],
      topicosCapacitacion: planData.topicosCapacitacion || [],
    };

    // Primero verificar si ya existe un plan para este colaborador y período
    const { data: existingPlans, error: checkError } = await supabase
      .from("development_plans")
      .select("id")
      .eq("colaborador_id", colaborador_id)
      .eq("periodo_id", periodo_id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (checkError) {
      console.error("Error verificando planes existentes:", checkError);
      return new Response(
        JSON.stringify({ success: false, error: `Error verificando planes existentes: ${checkError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    let planInserted;
    
    if (existingPlans && existingPlans.length > 0) {
      // Si existe un plan, actualizarlo (UPSERT)
      console.log(`Actualizando plan existente: ${existingPlans[0].id}`);
      
      // Primero eliminar todos los planes antiguos para este colaborador y período
      const { error: deleteError } = await supabase
        .from("development_plans")
        .delete()
        .eq("colaborador_id", colaborador_id)
        .eq("periodo_id", periodo_id);

      if (deleteError) {
        console.error("Error eliminando planes antiguos:", deleteError);
        // Continuar de todas formas, intentar insertar el nuevo
      }

      // Insertar el nuevo plan
      const { data: newPlan, error: insertError } = await supabase
        .from("development_plans")
        .insert({
          evaluacion_id: evaluacionJefe.id,
          colaborador_id: colaborador_id,
          periodo_id: periodo_id,
          competencias_desarrollar: planCompleto,
          feedback_individual: null, // No se genera aquí, se genera por separado
          feedback_grupal: null, // No se genera aquí, se genera por separado
          generado_por_ia: true,
          editable: true,
        })
        .select("*")
        .single();

      if (insertError) {
        return new Response(
          JSON.stringify({ success: false, error: `Error guardando plan: ${insertError.message}` }),
          { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
      }

      planInserted = newPlan;
    } else {
      // Si no existe, crear uno nuevo
      console.log("Creando nuevo plan");
      const { data: newPlan, error: insertError } = await supabase
        .from("development_plans")
        .insert({
          evaluacion_id: evaluacionJefe.id,
          colaborador_id: colaborador_id,
          periodo_id: periodo_id,
          competencias_desarrollar: planCompleto,
          feedback_individual: null, // No se genera aquí, se genera por separado
          feedback_grupal: null, // No se genera aquí, se genera por separado
          generado_por_ia: true,
          editable: true,
        })
        .select("*")
        .single();

      if (insertError) {
        return new Response(
          JSON.stringify({ success: false, error: `Error guardando plan: ${insertError.message}` }),
          { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
      }

      planInserted = newPlan;
    }

    // Guardar tópicos de capacitación si existen
    const topicosCapacitacion = planData.topicosCapacitacion || [];
    if (topicosCapacitacion.length > 0) {
      try {
        await saveTrainingTopics(
          topicosCapacitacion,
          colaborador,
          periodo_id,
          planInserted.id,
          planData.acciones || [],
          supabase
        );
      } catch (topicsError: any) {
        console.error("Error guardando tópicos de capacitación:", topicsError);
        // No fallar la generación del plan si hay error guardando tópicos
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        planId: planInserted.id,
        plan: planInserted,
      } as DevelopmentPlanResponse),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    console.error("Error en generate-development-plan:", error);
    const errorMessage = error?.message || error?.toString() || "Error desconocido";
    const errorStack = error?.stack || "";
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Error interno: ${errorMessage}`,
        details: Deno.env.get("NODE_ENV") === "development" ? errorStack : undefined
      }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
