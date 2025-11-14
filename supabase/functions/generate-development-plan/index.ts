import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSystemPromptForDevelopmentPlan } from "../shared/prompt-templates.ts";

// Inicializar cliente de Supabase
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
 * Construye el user prompt con datos específicos (sin contexto estático)
 */
function buildUserPrompt(data: any): string {
  const { colaborador, autoevaluacion, evaluacionJefe, resultadoFinal, instrumento, grupos } = data;

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

  // Construir detalle de evaluación ítem por ítem
  let detalleDesempeno = "";
  instrumento.dimensionesDesempeno.forEach((dim: any) => {
    if (!dim.items || !Array.isArray(dim.items)) {
      console.warn("Dimensión sin items válidos:", dim);
      return;
    }

    const dimScoreAuto = dim.items.map((item: any) => {
      const value = autoResponses[item.id];
      return typeof value === 'number' ? value : 0;
    });
    const dimScoreJefe = dim.items.map((item: any) => {
      const value = jefeResponses[item.id];
      return typeof value === 'number' ? value : 0;
    });
    
    const avgAuto = dimScoreAuto.length > 0 
      ? dimScoreAuto.reduce((a: number, b: number) => a + b, 0) / dimScoreAuto.length 
      : 0;
    const avgJefe = dimScoreJefe.length > 0 
      ? dimScoreJefe.reduce((a: number, b: number) => a + b, 0) / dimScoreJefe.length 
      : 0;

    detalleDesempeno += `\n### ${dim.nombre || 'Dimensión sin nombre'} (Peso: ${((dim.peso || 0) * 100).toFixed(1)}%)\n`;
    detalleDesempeno += `Score Autoevaluación: ${avgAuto.toFixed(2)}/5.0 (${((avgAuto / 5) * 100).toFixed(1)}%)\n`;
    detalleDesempeno += `Score Evaluación Jefe: ${avgJefe.toFixed(2)}/5.0 (${((avgJefe / 5) * 100).toFixed(1)}%)\n`;

    dim.items.forEach((item: any) => {
      const scoreAuto = typeof autoResponses[item.id] === 'number' ? autoResponses[item.id] : 0;
      const scoreJefe = typeof jefeResponses[item.id] === 'number' ? jefeResponses[item.id] : 0;
      detalleDesempeno += `  - ${item.texto || 'Item sin texto'}\n`;
      detalleDesempeno += `    Autoevaluación: ${scoreAuto}/5  |  Jefe: ${scoreJefe}/5\n`;
    });

    if (autoComments[dim.id]) {
      detalleDesempeno += `  📝 Comentario del colaborador: ${autoComments[dim.id]}\n`;
    }
    if (jefeComments[dim.id]) {
      detalleDesempeno += `  📝 Comentario del jefe: ${jefeComments[dim.id]}\n`;
    }
  });

  // Construir detalle de potencial
  let detallePotencial = "";
  const potencialResponses = evaluacionJefe.evaluacion_potencial?.responses || {};
  const potencialComments = evaluacionJefe.evaluacion_potencial?.comments || {};
  
  if (instrumento.dimensionesPotencial && Array.isArray(instrumento.dimensionesPotencial) && Object.keys(potencialResponses).length > 0) {
    instrumento.dimensionesPotencial.forEach((dim: any) => {
      if (!dim.items || !Array.isArray(dim.items)) {
        console.warn("Dimensión de potencial sin items válidos:", dim);
        return;
      }

      const dimScore = dim.items.map((item: any) => {
        const value = potencialResponses[item.id];
        return typeof value === 'number' ? value : 0;
      });
      const avg = dimScore.length > 0 
        ? dimScore.reduce((a: number, b: number) => a + b, 0) / dimScore.length 
        : 0;

      detallePotencial += `\n### ${dim.nombre || 'Dimensión sin nombre'} (Peso: ${((dim.peso || 0) * 100).toFixed(1)}%)\n`;
      detallePotencial += `Score: ${avg.toFixed(2)}/5.0 (${((avg / 5) * 100).toFixed(1)}%)\n`;

      dim.items.forEach((item: any) => {
        const score = typeof potencialResponses[item.id] === 'number' ? potencialResponses[item.id] : 0;
        detallePotencial += `  - ${item.texto || 'Item sin texto'}\n`;
        detallePotencial += `    Evaluación: ${score}/5\n`;
      });

      if (potencialComments[dim.id]) {
        detallePotencial += `  📝 Comentario: ${potencialComments[dim.id]}\n`;
      }
    });
  }

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
      return { nombre: dim.nombre || 'Dimensión sin nombre', score: avg, peso: dim.peso || 0 };
    })
    .sort((a: any, b: any) => a.score - b.score); // Ordenar de menor a mayor

  const top3Debiles = dimensionesConScore.slice(0, 3);

  // Obtener fecha actual para usar como referencia
  const fechaActual = new Date();
  const añoActual = fechaActual.getFullYear();
  const mesActual = fechaActual.getMonth() + 1; // getMonth() devuelve 0-11
  const diaActual = fechaActual.getDate();
  const fechaActualFormato = `${añoActual}-${String(mesActual).padStart(2, '0')}-${String(diaActual).padStart(2, '0')}`;
  const mesActualTexto = fechaActual.toLocaleDateString('es-GT', { month: 'long', year: 'numeric' });

  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 INFORMACIÓN DEL COLABORADOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Nombre: ${colaborador.nombre} ${colaborador.apellidos}
💼 Cargo: ${colaborador.cargo}
📊 Nivel: ${colaborador.nivel}
🏢 Área: ${colaborador.area || "No especificada"}
📅 Fecha de ingreso: ${colaborador.fecha_ingreso ? new Date(colaborador.fecha_ingreso).toLocaleDateString('es-GT') : "No registrada"}
🎓 Profesión: ${colaborador.profesion || "No registrada"}
${grupos.length > 0 ? `👥 Pertenece a cuadrilla(s): ${grupos.map((g: any) => g.nombre).join(", ")}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 INFORMACIÓN TEMPORAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📆 FECHA ACTUAL: ${fechaActualFormato} (${mesActualTexto})
⚠️ IMPORTANTE: Todas las fechas del plan deben ser POSTERIORES a esta fecha. 
   - Usa fechas del año ${añoActual} o ${añoActual + 1}
   - NO uses fechas del 2024 o anteriores
   - Las acciones deben tener fechas realistas considerando que hoy es ${fechaActualFormato}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RESULTADOS DE EVALUACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 DESEMPEÑO:
  - Autoevaluación: ${resultadoFinal.desempenoAuto?.toFixed(2)}/5.0 (${((resultadoFinal.desempenoAuto / 5) * 100).toFixed(1)}%)
  - Evaluación Jefe: ${resultadoFinal.desempenoJefe?.toFixed(2)}/5.0 (${((resultadoFinal.desempenoJefe / 5) * 100).toFixed(1)}%)
  - 🏆 Desempeño Final: ${resultadoFinal.desempenoFinal?.toFixed(2)}/5.0 (${((resultadoFinal.desempenoFinal / 5) * 100).toFixed(1)}%)

⭐ POTENCIAL: ${resultadoFinal.potencial ? `${resultadoFinal.potencial.toFixed(2)}/5.0 (${((resultadoFinal.potencial / 5) * 100).toFixed(1)}%)` : "No evaluado"}

📍 Posición 9-Box: ${resultadoFinal.posicion9Box}

🎯 TOP 3 DIMENSIONES QUE REQUIEREN MAYOR ATENCIÓN (según evaluación del jefe):
${top3Debiles.map((d: any, i: number) => `${i + 1}. ${d.nombre}: ${d.score.toFixed(2)}/5.0 (${((d.score / 5) * 100).toFixed(1)}%)`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 EVALUACIÓN DETALLADA POR DIMENSIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${detalleDesempeno}

${detallePotencial ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ EVALUACIÓN DE POTENCIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${detallePotencial}` : ''}

Genera el Plan de Desarrollo basándote en estos datos específicos de la evaluación. 
⚠️ RECUERDA: Usa fechas del ${añoActual} o ${añoActual + 1}, NO uses fechas del 2024 o anteriores.`;
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

    // Obtener evaluaciones completas
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

    // Calcular resultado final
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

    console.log("Calculando desempeño con:", {
      autoResponses: autoevaluacion.responses,
      jefeResponses: evaluacionJefe.responses,
      dimensionsCount: instrumentConfig.dimensionesDesempeno?.length,
    });

    const desempenoAuto = calcularPromedioDesempeno(autoevaluacion.responses, instrumentConfig.dimensionesDesempeno);
    const desempenoJefe = calcularPromedioDesempeno(evaluacionJefe.responses, instrumentConfig.dimensionesDesempeno);

    // Aplicar pesos según instrumento (A1 tiene pesos especiales 45/55)
    const pesoAuto = instrumentId === "A1" ? 0.45 : 0.30;
    const pesoJefe = instrumentId === "A1" ? 0.55 : 0.70;
    const desempenoFinal = desempenoJefe * pesoJefe + desempenoAuto * pesoAuto;

    // Normalizar evaluacion_potencial (puede venir como evaluacionPotencial o evaluacion_potencial)
    const evaluacionPotencial = evaluacionJefe.evaluacion_potencial || evaluacionJefe.evaluacionPotencial || null;
    const potencial = calcularPromedioPotencial(
      evaluacionPotencial?.responses,
      instrumentConfig.dimensionesPotencial
    );

    // Calcular posición 9-box
    let posicion9Box = "medio-medio";
    if (potencial !== null) {
      const dLevel = desempenoFinal < 3 ? "bajo" : desempenoFinal <= 4 ? "medio" : "alto";
      const pLevel = potencial < 3 ? "bajo" : potencial <= 4 ? "medio" : "alto";
      posicion9Box = `${dLevel}-${pLevel}`;
    }

    const resultadoFinal = {
      desempenoAuto,
      desempenoJefe,
      desempenoFinal,
      potencial,
      posicion9Box,
    };

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
    const systemPrompt = getSystemPromptForDevelopmentPlan();
    let userPrompt: string;
    try {
      userPrompt = buildUserPrompt({
        colaborador, // Incluye todos los campos EXCEPTO que el DPI no se usa en el prompt
        autoevaluacion: autoevaluacionNormalizada,
        evaluacionJefe: evaluacionJefeNormalizada,
        resultadoFinal,
        instrumento: instrumentConfig,
        grupos,
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
      
      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error("Error en OpenAI API:", errorText);
        let parsedError = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          parsedError = errorJson.error?.message || errorJson.message || errorText;
        } catch {
          parsedError = errorText.substring(0, 500);
        }
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
    // Esto incluye: objetivos, acciones (con responsable, fecha, recursos, indicador, prioridad),
    // dimensionesDebiles, y recomendaciones
    // NOTA: NO guardamos feedback_individual ni feedback_grupal aquí (se generan por separado)
    const planCompleto = {
      objetivos: planData.objetivos || [],
      acciones: planData.acciones || [],
      dimensionesDebiles: planData.dimensionesDebiles || [],
      recomendaciones: planData.recomendaciones || [],
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
