import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { colaborador_id, periodo_id } = await req.json();

    if (!colaborador_id || !periodo_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Faltan parámetros requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Crear cliente de Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Obtener información del colaborador (SIN DPI)
    const { data: colaborador, error: errorColab } = await supabase
      .from("usuarios")
      .select("nombre, apellido, email, nivel, puesto, formacion_academica, pertenece_cuadrilla")
      .eq("dpi", colaborador_id)
      .single();

    if (errorColab || !colaborador) {
      throw new Error("Colaborador no encontrado");
    }

    // 2. Obtener autoevaluación
    const { data: autoevaluacion, error: errorAuto } = await supabase
      .from("evaluaciones")
      .select("responses, estado")
      .eq("usuario_id", colaborador_id)
      .eq("periodo_id", periodo_id)
      .eq("tipo", "auto")
      .single();

    // 3. Obtener evaluación del jefe
    const { data: evaluacionJefe, error: errorJefe } = await supabase
      .from("evaluaciones")
      .select("responses, estado")
      .eq("usuario_id", colaborador_id)
      .eq("periodo_id", periodo_id)
      .eq("tipo", "jefe")
      .single();

    if (errorAuto || !autoevaluacion || errorJefe || !evaluacionJefe) {
      throw new Error("No se encontraron las evaluaciones completas");
    }

    // 4. Obtener resultado final
    const { data: resultadoFinal, error: errorResultado } = await supabase
      .from("final_evaluation_results")
      .select("resultado_final, comparativo")
      .eq("colaborador_id", colaborador_id)
      .eq("periodo_id", periodo_id)
      .single();

    if (errorResultado || !resultadoFinal) {
      throw new Error("No se encontró el resultado final de la evaluación");
    }

    // 5. Obtener instrumento según el nivel del colaborador
    const nivel = colaborador.nivel;
    const { data: instrumentoData, error: errorInstrumento } = await supabase
      .from("instrumentos")
      .select("*")
      .eq("nivel", nivel)
      .single();

    if (errorInstrumento || !instrumentoData) {
      throw new Error(`No se encontró instrumento para nivel ${nivel}`);
    }

    const instrumento = instrumentoData.estructura;

    // 6. Construir prompt para Gemini
    const prompt = buildPrompt({
      colaborador,
      autoevaluacion,
      evaluacionJefe,
      resultadoFinal,
      instrumento,
    });

    // 7. Llamar a Gemini
    console.log("Llamando a Gemini API...");
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`,
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

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Error en Gemini API: ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error("No se recibió respuesta de Gemini");
    }

    // Parsear respuesta JSON
    let guiaGenerada;
    try {
      guiaGenerada = JSON.parse(generatedText);
    } catch (e) {
      console.error("Error parseando JSON de Gemini:", generatedText);
      throw new Error("Error al procesar respuesta de IA");
    }

    // 8. Preparar objeto de guía
    const guia = {
      colaboradorId: colaborador_id,
      periodoId: periodo_id,
      preparacion: guiaGenerada.preparacion,
      apertura: guiaGenerada.apertura,
      fortalezas: guiaGenerada.fortalezas,
      areasDesarrollo: guiaGenerada.areasDesarrollo,
      preguntasDialogo: guiaGenerada.preguntasDialogo,
      tipsConduccion: guiaGenerada.tipsConduccion,
      cierre: guiaGenerada.cierre,
      generadoPorIa: true,
      fechaGeneracion: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify({ success: true, guia }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error en generate-feedback-guide:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildPrompt(data: any): string {
  const { colaborador, autoevaluacion, evaluacionJefe, resultadoFinal, instrumento } = data;

  // Calcular dimensiones más fuertes y más débiles
  const dimensionesConScore = resultadoFinal.comparativo.dimensiones
    .map((dim: any) => ({
      nombre: dim.nombre,
      scoreJefe: dim.evaluacionJefe,
      scoreAuto: dim.autoevaluacion,
    }))
    .sort((a, b) => b.scoreJefe - a.scoreJefe);

  const top3Fuertes = dimensionesConScore.slice(0, 3);
  const top3Debiles = dimensionesConScore.slice(-3).reverse();

  // Construir información detallada
  let detalleEvaluacion = "";
  instrumento.dimensionesDesempeno.forEach((dim: any) => {
    detalleEvaluacion += `\n**${dim.nombre}**\n`;
    dim.items.forEach((item: any) => {
      const scoreAuto = autoevaluacion.responses[item.id] || 0;
      const scoreJefe = evaluacionJefe.responses[item.id] || 0;
      detalleEvaluacion += `  - ${item.texto}\n`;
      detalleEvaluacion += `    Auto: ${scoreAuto}/5  |  Jefe: ${scoreJefe}/5\n`;
    });
  });

  // Información de potencial
  let detallePotencial = "";
  if (instrumento.dimensionesPotencial && resultadoFinal.resultado_final.potencial) {
    detallePotencial = `\n📊 **POTENCIAL**: ${resultadoFinal.resultado_final.potencial}%\n`;
    instrumento.dimensionesPotencial.forEach((dim: any) => {
      detallePotencial += `\n**${dim.nombre}**\n`;
      dim.items.forEach((item: any) => {
        const score = evaluacionJefe.responses[item.id] || 0;
        detallePotencial += `  - ${item.texto}: ${score}/5\n`;
      });
    });
  }

  return `Eres un experto en Recursos Humanos del sector público guatemalteco, especializado en retroalimentación efectiva del desempeño.

Tu tarea es generar una **Guía de Retroalimentación** para que un jefe municipal pueda conducir una reunión efectiva de análisis de desempeño con su colaborador.

📋 **INFORMACIÓN DEL COLABORADOR:**
- Nombre: ${colaborador.nombre} ${colaborador.apellido}
- Puesto: ${colaborador.puesto}
- Nivel: ${colaborador.nivel}
- Formación académica: ${colaborador.formacion_academica || "No especificada"}
- Pertenece a cuadrilla: ${colaborador.pertenece_cuadrilla ? "Sí" : "No"}

📊 **RESULTADOS DE LA EVALUACIÓN:**
- Desempeño Final: ${resultadoFinal.resultado_final.desempenoFinal}%
- Autoevaluación: ${resultadoFinal.resultado_final.desempenoAuto}%
- Evaluación del Jefe: ${resultadoFinal.resultado_final.desempenoJefe}%
${detallePotencial}

🌟 **TOP 3 DIMENSIONES MÁS FUERTES:**
${top3Fuertes.map((d, i) => `${i + 1}. ${d.nombre}: ${d.scoreJefe}%`).join('\n')}

⚠️ **TOP 3 DIMENSIONES A MEJORAR:**
${top3Debiles.map((d, i) => `${i + 1}. ${d.nombre}: ${d.scoreJefe}%`).join('\n')}

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
    // Incluir las 2-3 dimensiones más fuertes
  ],

  "areasDesarrollo": [
    {
      "dimension": "Nombre de la dimensión a mejorar",
      "situacion": "Contexto específico donde se observó el comportamiento",
      "comportamiento": "Descripción objetiva del comportamiento observado",
      "impacto": "Efecto negativo o consecuencia del comportamiento",
      "sugerencia": "Acción concreta y realista para mejorar"
    }
    // Incluir las 2-3 dimensiones más débiles
  ],

  "preguntasDialogo": [
    "Pregunta abierta 1 para fomentar reflexión",
    "Pregunta abierta 2 para fomentar compromiso",
    "Pregunta abierta 3 para explorar soluciones"
    // 4-5 preguntas en total
  ],

  "tipsConduccion": [
    "Tip práctico 1 para conducir la reunión",
    "Tip práctico 2",
    "Tip práctico 3"
    // 5-6 tips breves
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
