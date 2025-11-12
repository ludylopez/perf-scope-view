import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const { colaborador_id, periodo_id } = await req.json();

    if (!colaborador_id || !periodo_id) {
      return new Response(
        JSON.stringify({ success: false, error: "colaborador_id y periodo_id son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Crear cliente de Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "GEMINI_API_KEY no configurada" }),
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

    // 6. Construir prompt para Gemini
    const prompt = buildPrompt({
      colaborador,
      autoevaluacion,
      evaluacionJefe,
      resultadoFinal,
      instrumento: instrumentConfig,
    });

    // 7. Llamar a Gemini con fallback de modelos
    let geminiResponse;
    let modelUsed = "gemini-2.5-flash";
    let lastError: string | null = null;
    
    const modelsToTry = ["gemini-2.5-flash", "gemini-pro"];
    
    for (const model of modelsToTry) {
      try {
        modelUsed = model;
        console.log(`Intentando con modelo: ${modelUsed}`);
        
        geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 6000,
                responseMimeType: "application/json",
              },
            }),
          }
        );
        
        if (geminiResponse.ok) {
          console.log(`✅ Modelo ${modelUsed} funcionó correctamente`);
          break;
        } else {
          const errorText = await geminiResponse.text();
          lastError = errorText;
          console.warn(`⚠️ Modelo ${modelUsed} falló:`, errorText.substring(0, 200));
          continue;
        }
      } catch (fetchError: any) {
        lastError = fetchError.message || String(fetchError);
        console.warn(`⚠️ Error en fetch con modelo ${modelUsed}:`, lastError);
        continue;
      }
    }

    if (!geminiResponse || !geminiResponse.ok) {
      const errorMessage = lastError || "Todos los modelos de Gemini fallaron";
      console.error("❌ Todos los modelos fallaron:", errorMessage);
      return new Response(
        JSON.stringify({ success: false, error: `Error en Gemini API: ${errorMessage.substring(0, 500)}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    let generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    // Si responseMimeType es application/json, el texto puede venir parseado
    if (!generatedText && geminiData.candidates?.[0]?.content?.parts?.[0]?.json) {
      generatedText = JSON.stringify(geminiData.candidates[0].content.parts[0].json);
    }

    if (!generatedText) {
      return new Response(
        JSON.stringify({ success: false, error: "No se recibió respuesta de Gemini" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parsear respuesta JSON
    let guiaGenerada;
    try {
      // Intentar parsear directamente
      if (typeof generatedText === 'string') {
        guiaGenerada = JSON.parse(generatedText);
      } else {
        guiaGenerada = generatedText;
      }
    } catch (e) {
      console.error("Error parseando JSON de Gemini:", generatedText);
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

    // 8. Preparar objeto de guía
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

    return new Response(
      JSON.stringify({ success: true, guia }),
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

function buildPrompt(data: any): string {
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
    })).sort((a, b) => (b.scoreJefe || 0) - (a.scoreJefe || 0));
  } else if (instrumento.dimensionesDesempeno) {
    // Fallback: calcular desde el instrumento
    dimensionesConScore = instrumento.dimensionesDesempeno.map((dim: any) => {
      const items = dim.items || [];
      const scoresJefe = items.map((item: any) => jefeResponses[item.id] || 0);
      const scoresAuto = items.map((item: any) => autoResponses[item.id] || 0);
      const avgJefe = scoresJefe.length > 0 ? scoresJefe.reduce((a, b) => a + b, 0) / scoresJefe.length : 0;
      const avgAuto = scoresAuto.length > 0 ? scoresAuto.reduce((a, b) => a + b, 0) / scoresAuto.length : 0;
      return {
        nombre: dim.nombre || "Dimensión",
        scoreJefe: avgJefe,
        scoreAuto: avgAuto,
      };
    }).sort((a, b) => b.scoreJefe - a.scoreJefe);
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

  return `Eres un experto en Recursos Humanos del sector público guatemalteco, especializado en retroalimentación efectiva del desempeño.

Tu tarea es generar una **Guía de Retroalimentación** para que un jefe municipal pueda conducir una reunión efectiva de análisis de desempeño con su colaborador.

📋 **INFORMACIÓN DEL COLABORADOR:**
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

🎯 **METODOLOGÍA A USAR: SBI (Situación-Comportamiento-Impacto)**
Para cada área de desarrollo, debes estructurar el feedback así:
1. **Situación**: Describe el contexto específico donde se observó el comportamiento
2. **Comportamiento**: Describe lo que la persona hizo o dejó de hacer (hechos observables, NO juicios)
3. **Impacto**: Explica el efecto que tuvo ese comportamiento en el trabajo, equipo o resultados
4. **Sugerencia**: Propón una mejora concreta y aplicable

📍 **CONTEXTO ESQUIPULAS:**
- Municipalidad con recursos limitados
- Personal con diferentes niveles de formación
- Cultura organizacional cercana y respetuosa
- Enfoque en servicio a la comunidad

⚠️ **IMPORTANTE:**
- USA SOLO ESPAÑOL, sin palabras técnicas en inglés
- Lenguaje claro, directo y respetuoso
- Enfócate en comportamientos observables, NO en la persona
- Sé constructivo y orientado al desarrollo
- Mantén TODO en UNA PÁGINA (conciso pero completo)
- NO uses jerga de Recursos Humanos ni tecnicismos
- Adapta el lenguaje al contexto municipal guatemalteco

📋 **ESTRUCTURA DE LA GUÍA:**

Genera un JSON con esta estructura EXACTA:

{
  "preparacion": "Breve texto (2-3 oraciones) sobre cómo prepararse para la reunión: revisar evaluación, reservar tiempo suficiente, elegir lugar privado",

  "apertura": "Texto (2-3 oraciones) para abrir la conversación de forma positiva y crear ambiente de confianza",

  "fortalezas": [
    {
      "dimension": "Nombre de la dimensión fuerte",
      "reconocimiento": "Mensaje de reconocimiento específico",
      "ejemplo": "Ejemplo concreto de un comportamiento observado",
      "impacto": "Impacto positivo que generó"
    }
  ],

  "areasDesarrollo": [
    {
      "dimension": "Nombre de la dimensión a mejorar",
      "situacion": "Contexto específico donde se observó el comportamiento",
      "comportamiento": "Descripción objetiva del comportamiento observado",
      "impacto": "Efecto negativo o consecuencia del comportamiento",
      "sugerencia": "Acción concreta y realista para mejorar"
    }
  ],

  "preguntasDialogo": [
    "Pregunta abierta 1 para fomentar reflexión",
    "Pregunta abierta 2 para fomentar compromiso",
    "Pregunta abierta 3 para explorar soluciones"
  ],

  "tipsConduccion": [
    "Tip práctico 1 para conducir la reunión",
    "Tip práctico 2",
    "Tip práctico 3"
  ],

  "cierre": "Texto (2-3 oraciones) para cerrar la reunión de forma positiva, confirmar compromisos y próximos pasos"
}

🎯 **CALIDAD ESPERADA:**
- Específico y concreto (basado en los datos reales de la evaluación)
- Constructivo y orientado al crecimiento
- Realista para el contexto municipal
- Respetuoso y motivador
- Accionable y práctico

Genera SOLO el JSON, sin texto adicional.`;
}
