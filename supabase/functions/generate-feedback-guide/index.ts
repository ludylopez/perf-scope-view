import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSystemPromptForFeedbackIndividual } from "../shared/prompt-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request): Promise<Response> => {
  // Manejar CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Solo permitir POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Verificar que el body no esté vacío
    const body = await req.text();
    if (!body || body.trim() === "") {
      return new Response(
        JSON.stringify({ success: false, error: "Request body is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { colaborador_id, periodo_id } = JSON.parse(body);

    if (!colaborador_id || !periodo_id) {
      return new Response(
        JSON.stringify({ success: false, error: "colaborador_id y periodo_id son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Crear cliente de Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "OPENAI_API_KEY no configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Obtener información del colaborador (SIN DPI)
    const { data: colaborador, error: errorColab } = await supabase
      .from("users")
      .select("nombre, apellidos, nivel, cargo, area, formacion_academica")
      .eq("dpi", colaborador_id)
      .single();

    if (errorColab || !colaborador) {
      console.error("Error obteniendo colaborador:", errorColab);
      return new Response(
        JSON.stringify({ success: false, error: `Colaborador no encontrado: ${errorColab?.message || "No encontrado"}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Obtener autoevaluación
    const { data: autoevaluacion, error: errorAuto } = await supabase
      .from("evaluations")
      .select("responses, comments, estado")
      .eq("usuario_id", colaborador_id)
      .eq("periodo_id", periodo_id)
      .eq("tipo", "auto")
      .eq("estado", "enviado")
      .single();

    // 3. Obtener evaluación del jefe
    const { data: evaluacionJefe, error: errorJefe } = await supabase
      .from("evaluations")
      .select("responses, comments, evaluacion_potencial, estado")
      .eq("colaborador_id", colaborador_id)
      .eq("periodo_id", periodo_id)
      .eq("tipo", "jefe")
      .eq("estado", "enviado")
      .single();

    if (errorAuto || !autoevaluacion || errorJefe || !evaluacionJefe) {
      console.error("Error obteniendo evaluaciones:", { errorAuto, errorJefe });
      return new Response(
        JSON.stringify({ success: false, error: "No se encontraron las evaluaciones completas" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Obtener resultado final
    const { data: resultadoFinal, error: errorResultado } = await supabase
      .from("final_evaluation_results")
      .select("resultado_final, comparativo")
      .eq("colaborador_id", colaborador_id)
      .eq("periodo_id", periodo_id)
      .single();

    if (errorResultado || !resultadoFinal) {
      console.error("Error obteniendo resultado final:", errorResultado);
      return new Response(
        JSON.stringify({ success: false, error: "No se encontró el resultado final de la evaluación" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Obtener instrumento según el nivel del colaborador
    const instrumentId = colaborador.nivel || "A1";
    const { data: instrumentConfig, error: errorInstrumento } = await supabase.rpc("get_instrument_config", {
      instrument_id: instrumentId,
    });

    if (errorInstrumento || !instrumentConfig) {
      console.error("Error obteniendo instrumento:", errorInstrumento);
      return new Response(
        JSON.stringify({ success: false, error: `No se encontró instrumento para nivel ${instrumentId}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Construir prompts separados (system y user)
    const systemPrompt = getSystemPromptForFeedbackIndividual();
    const userPrompt = buildUserPrompt({
      colaborador,
      autoevaluacion,
      evaluacionJefe,
      resultadoFinal,
      instrumento: instrumentConfig,
    });

    // 7. Llamar a OpenAI
    let openaiResponse;
    try {
      console.log("Llamando a OpenAI API para generar guía y feedback individual...");
      
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
            max_tokens: 6000,
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
          JSON.stringify({ success: false, error: `Error en OpenAI API: ${parsedError}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiResponse.json();
    const generatedText = openaiData.choices?.[0]?.message?.content || "";

    if (!generatedText) {
      return new Response(
        JSON.stringify({ success: false, error: "No se recibió respuesta de OpenAI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parsear respuesta JSON
    let guiaGenerada;
    try {
      if (typeof generatedText === 'string') {
        guiaGenerada = JSON.parse(generatedText);
      } else {
        guiaGenerada = generatedText;
      }
    } catch (e) {
      console.error("Error parseando JSON de OpenAI:", generatedText);
      // Intentar extraer JSON del texto
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        guiaGenerada = JSON.parse(jsonMatch[0]);
      } else {
        return new Response(
          JSON.stringify({ success: false, error: "Error al procesar respuesta de IA: formato inválido" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 8. Preparar objeto de guía (solo para jefe)
    const guia = {
      colaboradorId: colaborador_id,
      periodoId: periodo_id,
      preparacion: guiaGenerada.preparacion || "",
      apertura: guiaGenerada.apertura || "",
      fortalezas: guiaGenerada.fortalezas || [],
      areasDesarrollo: guiaGenerada.areasDesarrollo || [],
      preguntasDialogo: guiaGenerada.preguntasDialogo || [],
      tipsConduccion: guiaGenerada.tipsConduccion || [],
      cierre: guiaGenerada.cierre || "",
      generadoPorIa: true,
      fechaGeneracion: new Date().toISOString(),
    };

    // 9. Guardar guía en tabla feedback_guides (tipo "individual")
    const { data: guiaInsertada, error: errorGuia } = await supabase
      .from("feedback_guides")
      .insert({
        colaborador_id: colaborador_id,
        periodo_id: periodo_id,
        tipo: "individual",
        preparacion: guia.preparacion,
        apertura: guia.apertura,
        fortalezas: guia.fortalezas,
        areas_desarrollo: guia.areasDesarrollo,
        preguntas_dialogo: guia.preguntasDialogo,
        tips_conduccion: guia.tipsConduccion,
        cierre: guia.cierre,
        generado_por_ia: true,
        fecha_generacion: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (errorGuia) {
      console.error("Error guardando guía:", errorGuia);
      // Continuar aunque falle el guardado de la guía
    }

    // 10. Guardar feedbackIndividual en development_plans
    const feedbackIndividual = guiaGenerada.feedbackIndividual || "";
    if (feedbackIndividual) {
      // Buscar si ya existe un plan de desarrollo para este colaborador y período
      const { data: planExistente } = await supabase
        .from("development_plans")
        .select("id")
        .eq("colaborador_id", colaborador_id)
        .eq("periodo_id", periodo_id)
        .maybeSingle();

      if (planExistente) {
        // Actualizar plan existente
        const { error: errorUpdate } = await supabase
          .from("development_plans")
          .update({
            feedback_individual: feedbackIndividual,
            updated_at: new Date().toISOString(),
          })
          .eq("id", planExistente.id);

        if (errorUpdate) {
          console.error("Error actualizando feedback individual:", errorUpdate);
        }
      } else {
        // Crear nuevo registro solo con feedback (sin plan completo)
        const { error: errorInsert } = await supabase
          .from("development_plans")
          .insert({
            colaborador_id: colaborador_id,
            periodo_id: periodo_id,
            feedback_individual: feedbackIndividual,
            generado_por_ia: true,
            editable: true,
          });

        if (errorInsert) {
          console.error("Error insertando feedback individual:", errorInsert);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        guia,
        feedbackIndividual: feedbackIndividual 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error en generate-feedback-guide:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildUserPrompt(data: any): string {
  const { colaborador, autoevaluacion, evaluacionJefe, resultadoFinal, instrumento } = data;

  // Normalizar datos
  const autoResponses = autoevaluacion.responses || {};
  const jefeResponses = evaluacionJefe.responses || {};
  const resultado = resultadoFinal.resultado_final || {};
  const comparativo = resultadoFinal.comparativo || {};

  // Calcular dimensiones más fuertes y más débiles desde el comparativo
  let dimensionesConScore: any[] = [];
  
  if (comparativo.dimensiones && Array.isArray(comparativo.dimensiones)) {
    dimensionesConScore = comparativo.dimensiones.map((dim: any) => ({
      nombre: dim.nombre || dim.dimension || "Dimensión",
      scoreJefe: dim.evaluacionJefe || dim.scoreJefe || 0,
      scoreAuto: dim.autoevaluacion || dim.scoreAuto || 0,
    })).sort((a: any, b: any) => (b.scoreJefe || 0) - (a.scoreJefe || 0));
  } else if (instrumento.dimensionesDesempeno) {
    // Fallback: calcular desde el instrumento
    dimensionesConScore = instrumento.dimensionesDesempeno.map((dim: any) => {
      const items = dim.items || [];
      const scoresJefe = items.map((item: any) => jefeResponses[item.id] || 0);
      const scoresAuto = items.map((item: any) => autoResponses[item.id] || 0);
      const avgJefe = scoresJefe.length > 0 ? scoresJefe.reduce((a: number, b: number) => a + b, 0) / scoresJefe.length : 0;
      const avgAuto = scoresAuto.length > 0 ? scoresAuto.reduce((a: number, b: number) => a + b, 0) / scoresAuto.length : 0;
      return {
        nombre: dim.nombre || "Dimensión",
        scoreJefe: avgJefe,
        scoreAuto: avgAuto,
      };
    }).sort((a: any, b: any) => b.scoreJefe - a.scoreJefe);
  }

  const top3Fuertes = dimensionesConScore.slice(0, 3);
  const top3Debiles = dimensionesConScore.slice(-3).reverse();

  // Construir información detallada
  let detalleEvaluacion = "";
  if (instrumento.dimensionesDesempeno && Array.isArray(instrumento.dimensionesDesempeno)) {
    instrumento.dimensionesDesempeno.forEach((dim: any) => {
      detalleEvaluacion += `\n**${dim.nombre || "Dimensión"}**\n`;
      if (dim.items && Array.isArray(dim.items)) {
        dim.items.forEach((item: any) => {
          const scoreAuto = autoResponses[item.id] || 0;
          const scoreJefe = jefeResponses[item.id] || 0;
          detalleEvaluacion += `  - ${item.texto || "Item"}\n`;
          detalleEvaluacion += `    Auto: ${scoreAuto}/5  |  Jefe: ${scoreJefe}/5\n`;
        });
      }
    });
  }

  // Información de potencial
  let detallePotencial = "";
  const potencialResponses = evaluacionJefe.evaluacion_potencial?.responses || {};
  if (instrumento.dimensionesPotencial && Array.isArray(instrumento.dimensionesPotencial) && resultado.potencial) {
    detallePotencial = `\n📊 **POTENCIAL**: ${resultado.potencial.toFixed(2)}/5.0\n`;
    instrumento.dimensionesPotencial.forEach((dim: any) => {
      detallePotencial += `\n**${dim.nombre || "Dimensión"}**\n`;
      if (dim.items && Array.isArray(dim.items)) {
        dim.items.forEach((item: any) => {
          const score = potencialResponses[item.id] || 0;
          detallePotencial += `  - ${item.texto || "Item"}: ${score}/5\n`;
        });
      }
    });
  }

  // User prompt solo con datos específicos (sin instrucciones, esas van en system prompt)
  return `📋 **INFORMACIÓN DEL COLABORADOR:**
- Nombre: ${colaborador.nombre} ${colaborador.apellidos}
- Cargo: ${colaborador.cargo}
- Nivel: ${colaborador.nivel}
- Área: ${colaborador.area || "No especificada"}
- Formación académica: ${colaborador.formacion_academica || "No especificada"}

📊 **RESULTADOS DE LA EVALUACIÓN:**
- Desempeño Final: ${resultado.desempenoFinal?.toFixed(2) || "N/A"}/5.0
- Autoevaluación: ${resultado.desempenoAuto?.toFixed(2) || "N/A"}/5.0
- Evaluación del Jefe: ${resultado.desempenoJefe?.toFixed(2) || "N/A"}/5.0
${detallePotencial}

🌟 **TOP 3 DIMENSIONES MÁS FUERTES:**
${top3Fuertes.map((d, i) => `${i + 1}. ${d.nombre}: ${d.scoreJefe.toFixed(2)}/5.0`).join('\n')}

⚠️ **TOP 3 DIMENSIONES A MEJORAR:**
${top3Debiles.map((d, i) => `${i + 1}. ${d.nombre}: ${d.scoreJefe.toFixed(2)}/5.0`).join('\n')}

📝 **DETALLE COMPLETO DE LA EVALUACIÓN:**
${detalleEvaluacion}

Genera la guía y feedback individual basándote en estos datos específicos de la evaluación.`;
}
