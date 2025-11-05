import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Inicializar cliente de Supabase
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface GenerateDevelopmentPlanRequest {
  resultado_final_id: string;
}

interface DevelopmentPlanResponse {
  success: boolean;
  planId?: string;
  error?: string;
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
    const { resultado_final_id }: GenerateDevelopmentPlanRequest = await req.json();

    if (!resultado_final_id) {
      return new Response(
        JSON.stringify({ success: false, error: "resultado_final_id es requerido" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Obtener resultado final desde base de datos
    const { data: resultadoFinal, error: resultadoError } = await supabase
      .from("final_evaluation_results")
      .select(`
        *,
        colaborador:users!final_evaluation_results_colaborador_id_fkey(*),
        autoevaluacion:evaluations!final_evaluation_results_autoevaluacion_id_fkey(*),
        evaluacion_jefe:evaluations!final_evaluation_results_evaluacion_jefe_id_fkey(*)
      `)
      .eq("id", resultado_final_id)
      .single();

    if (resultadoError || !resultadoFinal) {
      return new Response(
        JSON.stringify({ success: false, error: "No se encontró el resultado final" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Obtener configuración de instrumento
    const instrumentId = resultadoFinal.colaborador?.nivel || "A1";
    const { data: instrumentConfig } = await supabase.rpc("get_instrument_config", {
      instrument_id: instrumentId,
    });

    if (!instrumentConfig) {
      return new Response(
        JSON.stringify({ success: false, error: "No se encontró configuración de instrumento" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Preparar contexto para la IA
    const contexto = {
      colaborador: {
        nombre: `${resultadoFinal.colaborador?.nombre} ${resultadoFinal.colaborador?.apellidos}`,
        cargo: resultadoFinal.colaborador?.cargo,
        nivel: resultadoFinal.colaborador?.nivel,
      },
      resultados: {
        desempenoAuto: resultadoFinal.resultado_final?.desempenoAuto,
        desempenoJefe: resultadoFinal.resultado_final?.desempenoJefe,
        desempenoFinal: resultadoFinal.desempeno_final,
        desempenoPorcentaje: resultadoFinal.desempeno_porcentaje,
        potencial: resultadoFinal.potencial,
        potencialPorcentaje: resultadoFinal.potencial_porcentaje,
        posicion9Box: resultadoFinal.posicion_9box,
      },
      autoevaluacion: {
        responses: resultadoFinal.autoevaluacion?.responses,
        comments: resultadoFinal.autoevaluacion?.comments,
      },
      evaluacionJefe: {
        responses: resultadoFinal.evaluacion_jefe?.responses,
        comments: resultadoFinal.evaluacion_jefe?.comments,
        evaluacionPotencial: resultadoFinal.evaluacion_jefe?.evaluacion_potencial,
      },
      instrumento: {
        dimensionesDesempeno: instrumentConfig.dimensionesDesempeno,
        dimensionesPotencial: instrumentConfig.dimensionesPotencial,
      },
    };

    // Llamar a Google Gemini API
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "GEMINI_API_KEY no configurada" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Eres un experto en recursos humanos y desarrollo organizacional. Genera un plan de desarrollo personalizado para el colaborador ${contexto.colaborador.nombre}, cargo: ${contexto.colaborador.cargo}, nivel: ${contexto.colaborador.nivel}.

RESULTADOS DE EVALUACIÓN:
- Desempeño (Autoevaluación): ${contexto.resultados.desempenoAuto} (${contexto.resultados.desempenoPorcentaje}%)
- Desempeño (Evaluación Jefe): ${contexto.resultados.desempenoJefe} (${contexto.resultados.desempenoPorcentaje}%)
- Desempeño Final: ${contexto.resultados.desempenoFinal} (${contexto.resultados.desempenoPorcentaje}%)
- Potencial: ${contexto.resultados.potencial || "N/A"} (${contexto.resultados.potencialPorcentaje || "N/A"}%)
- Posición 9-Box: ${contexto.resultados.posicion9Box}

Genera un plan de desarrollo estructurado en formato JSON con los siguientes campos:
{
  "competenciasDesarrollar": ["competencia1", "competencia2", ...],
  "feedbackIndividual": "Feedback personalizado y constructivo para el colaborador",
  "feedbackGrupal": "Feedback para compartir en contexto grupal si aplica",
  "recomendaciones": ["recomendación1", "recomendación2", ...]
}

El feedback debe ser claro, constructivo, específico y orientado a la acción. Usa español.`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return new Response(
        JSON.stringify({ success: false, error: `Error en Gemini API: ${errorText}` }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const geminiData = await geminiResponse.json();
    const planText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parsear respuesta de Gemini (extraer JSON)
    let planData;
    try {
      // Intentar extraer JSON del texto
      const jsonMatch = planText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        planData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No se encontró JSON en la respuesta");
      }
    } catch (parseError) {
      // Fallback: crear plan básico
      planData = {
        competenciasDesarrollar: ["Desarrollo profesional", "Liderazgo", "Comunicación"],
        feedbackIndividual: planText || "Plan de desarrollo generado automáticamente",
        feedbackGrupal: "",
        recomendaciones: ["Continuar con el desarrollo profesional", "Buscar oportunidades de crecimiento"],
      };
    }

    // Guardar plan en base de datos
    const { data: planInserted, error: planError } = await supabase
      .from("development_plans")
      .insert({
        evaluacion_id: resultadoFinal.evaluacion_jefe_id,
        colaborador_id: resultadoFinal.colaborador_id,
        periodo_id: resultadoFinal.periodo_id,
        competencias_desarrollar: planData.competenciasDesarrollar || [],
        feedback_individual: planData.feedbackIndividual || "",
        feedback_grupal: planData.feedbackGrupal || "",
        recomendaciones: planData.recomendaciones || [],
        editable: true,
        generado_por_ia: true,
      })
      .select("id")
      .single();

    if (planError) {
      return new Response(
        JSON.stringify({ success: false, error: `Error guardando plan: ${planError.message}` }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        planId: planInserted.id,
      } as DevelopmentPlanResponse),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

