import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSystemPromptForFeedbackGrupal } from "../shared/prompt-templates.ts";

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

    // 1. Obtener información del colaborador
    const { data: colaborador, error: errorColaborador } = await supabase
      .from("users")
      .select("*")
      .eq("dpi", colaborador_id)
      .single();

    if (errorColaborador || !colaborador) {
      return new Response(
        JSON.stringify({ success: false, error: "Colaborador no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Verificar que el colaborador pertenezca a grupos/cuadrillas
    const { data: gruposData } = await supabase
      .from("group_members")
      .select("grupo_id, groups!group_members_grupo_id_fkey(nombre, tipo)")
      .eq("colaborador_id", colaborador_id)
      .eq("activo", true);

    const grupos = gruposData?.map((g: any) => ({ nombre: g.groups?.nombre, tipo: g.groups?.tipo })) || [];

    if (!grupos || grupos.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "El colaborador no pertenece a ninguna cuadrilla o grupo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Obtener evaluaciones
    const { data: autoevaluacion } = await supabase
      .from("evaluations")
      .select("*")
      .eq("usuario_id", colaborador_id)
      .eq("periodo_id", periodo_id)
      .eq("tipo", "auto")
      .eq("estado", "enviado")
      .single();

    const { data: evaluacionJefe } = await supabase
      .from("evaluations")
      .select("*")
      .eq("colaborador_id", colaborador_id)
      .eq("periodo_id", periodo_id)
      .eq("tipo", "jefe")
      .eq("estado", "enviado")
      .single();

    if (!autoevaluacion || !evaluacionJefe) {
      return new Response(
        JSON.stringify({ success: false, error: "No se encontraron las evaluaciones completas" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Obtener resultado final
    const { data: resultadoFinal } = await supabase
      .from("final_evaluation_results")
      .select("resultado_final, comparativo")
      .eq("colaborador_id", colaborador_id)
      .eq("periodo_id", periodo_id)
      .single();

    if (!resultadoFinal) {
      return new Response(
        JSON.stringify({ success: false, error: "No se encontró el resultado final de la evaluación" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Obtener instrumento según el nivel del colaborador
    const instrumentId = colaborador.nivel || "A1";
    const { data: instrumentConfig } = await supabase.rpc("get_instrument_config", {
      instrument_id: instrumentId,
    });

    if (!instrumentConfig) {
      return new Response(
        JSON.stringify({ success: false, error: `No se encontró instrumento para nivel ${instrumentId}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Construir user prompt con datos específicos
    function buildUserPrompt(data: any): string {
      const { colaborador, autoevaluacion, evaluacionJefe, resultadoFinal, instrumento, grupos } = data;

      const autoResponses = autoevaluacion.responses || {};
      const jefeResponses = evaluacionJefe.responses || {};
      const autoComments = autoevaluacion.comments || {};
      const jefeComments = evaluacionJefe.comments || {};

      let detalleDesempeno = "";
      if (instrumento.dimensionesDesempeno && Array.isArray(instrumento.dimensionesDesempeno)) {
        instrumento.dimensionesDesempeno.forEach((dim: any) => {
          if (!dim.items || !Array.isArray(dim.items)) return;

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

          // Ordenar ítems por puntuación del jefe (de menor a mayor) para que los más críticos aparezcan primero
          const itemsConScore = dim.items.map((item: any) => {
            const scoreAuto = typeof autoResponses[item.id] === 'number' ? autoResponses[item.id] : 0;
            const scoreJefe = typeof jefeResponses[item.id] === 'number' ? jefeResponses[item.id] : 0;
            return { item, scoreAuto, scoreJefe };
          }).sort((a: any, b: any) => a.scoreJefe - b.scoreJefe); // Ordenar de menor a mayor

          itemsConScore.forEach(({ item, scoreAuto, scoreJefe }: any) => {
            const indicadorCritico = scoreJefe < 3.5 ? ' 🚨' : '';
            detalleDesempeno += `  - ${item.texto || 'Item sin texto'}${indicadorCritico}\n`;
            detalleDesempeno += `    Autoevaluación: ${scoreAuto}/5  |  Jefe: ${scoreJefe}/5`;
            if (Math.abs(scoreAuto - scoreJefe) > 0.5) {
              detalleDesempeno += `  ⚠️ (Discrepancia significativa)`;
            }
            detalleDesempeno += `\n`;
          });

          if (autoComments[dim.id]) {
            detalleDesempeno += `  📝 Comentario del colaborador: ${autoComments[dim.id]}\n`;
          }
          if (jefeComments[dim.id]) {
            detalleDesempeno += `  📝 Comentario del jefe: ${jefeComments[dim.id]}\n`;
          }
        });
      }

      return `INFORMACIÓN DEL COLABORADOR:
- Nombre: ${colaborador.nombre} ${colaborador.apellidos || ""}
- Cargo: ${colaborador.cargo || "No especificado"}
- Área: ${colaborador.area || "No especificada"}
- Nivel: ${colaborador.nivel || "No especificado"}
${grupos.length > 0 ? `- Pertenece a cuadrilla(s): ${grupos.map((g: any) => g.nombre).join(", ")}` : ""}

RESULTADO FINAL DE LA EVALUACIÓN:
- Desempeño Autoevaluación: ${resultadoFinal.resultado_final?.desempenoAuto?.toFixed(2) || "N/A"}/5.0
- Desempeño Evaluación Jefe: ${resultadoFinal.resultado_final?.desempenoJefe?.toFixed(2) || "N/A"}/5.0
- Desempeño Final: ${resultadoFinal.resultado_final?.desempenoFinal?.toFixed(2) || "N/A"}/5.0

DETALLE POR DIMENSIONES:
${detalleDesempeno}

Genera una GUÍA DE RETROALIMENTACIÓN GRUPAL y FEEDBACK GRUPAL para la cuadrilla ${grupos.map((g: any) => g.nombre).join(" y ")}.
El feedback debe enfocarse en el desempeño COLECTIVO del equipo, no en individuos específicos.`;
    }

    // 7. Construir prompts separados (system y user)
    const systemPrompt = getSystemPromptForFeedbackGrupal();
    const userPrompt = buildUserPrompt({
      colaborador,
      autoevaluacion,
      evaluacionJefe,
      resultadoFinal,
      instrumento: instrumentConfig,
      grupos,
    });

    // 8. Llamar a OpenAI
    let openaiResponse;
    try {
      console.log("Llamando a OpenAI API para generar guía y feedback grupal...");
      
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

    // 9. Preparar objeto de guía grupal (solo para jefe)
    const guia = {
      colaboradorId: colaborador_id,
      periodoId: periodo_id,
      tipo: "grupal",
      preparacion: guiaGenerada.preparacion || "",
      apertura: guiaGenerada.apertura || "",
      fortalezasGrupales: guiaGenerada.fortalezasGrupales || [],
      areasDesarrolloGrupales: guiaGenerada.areasDesarrolloGrupales || [],
      preguntasDialogo: guiaGenerada.preguntasDialogo || [],
      tipsConduccion: guiaGenerada.tipsConduccion || [],
      cierre: guiaGenerada.cierre || "",
      generadoPorIa: true,
      fechaGeneracion: new Date().toISOString(),
    };

    // 10. Guardar guía grupal en tabla feedback_guides (con tipo "grupal")
    const { data: guiaInsertada, error: errorGuia } = await supabase
      .from("feedback_guides")
      .insert({
        colaborador_id: colaborador_id,
        periodo_id: periodo_id,
        tipo: "grupal",
        preparacion: guia.preparacion,
        apertura: guia.apertura,
        fortalezas: guia.fortalezasGrupales,
        areas_desarrollo: guia.areasDesarrolloGrupales,
        preguntas_dialogo: guia.preguntasDialogo,
        tips_conduccion: guia.tipsConduccion,
        cierre: guia.cierre,
        generado_por_ia: true,
        fecha_generacion: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (errorGuia) {
      console.error("Error guardando guía grupal:", errorGuia);
      // Continuar aunque falle el guardado de la guía
    }

    // 11. Guardar feedbackGrupal en development_plans
    const feedbackGrupal = guiaGenerada.feedbackGrupal || "";
    if (feedbackGrupal) {
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
            feedback_grupal: feedbackGrupal,
            updated_at: new Date().toISOString(),
          })
          .eq("id", planExistente.id);

        if (errorUpdate) {
          console.error("Error actualizando feedback grupal:", errorUpdate);
        }
      } else {
        // Crear nuevo registro solo con feedback grupal (sin plan completo)
        const { error: errorInsert } = await supabase
          .from("development_plans")
          .insert({
            colaborador_id: colaborador_id,
            periodo_id: periodo_id,
            feedback_grupal: feedbackGrupal,
            generado_por_ia: true,
            editable: true,
          });

        if (errorInsert) {
          console.error("Error insertando feedback grupal:", errorInsert);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        guia: {
          ...guia,
          feedbackGrupal: feedbackGrupal
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error en generate-feedback-grupal:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

