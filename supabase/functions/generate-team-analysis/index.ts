import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  getSystemPromptForTeamStrengthsAndOpportunities,
  getSystemPromptForTeamStrengthsAndOpportunitiesCascada 
} from "../shared/prompt-templates.ts";

// Inicializar cliente de Supabase
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GenerateTeamAnalysisRequest {
  jefeDpi: string;
  periodoId: string;
  tipo?: "directo" | "cascada"; // Tipo de análisis: directo (solo colaboradores directos) o cascada (toda la unidad)
}

interface TeamAnalysisResponse {
  success: boolean;
  analysis?: any;
  error?: string;
}

/**
 * Construye el user prompt con datos del equipo
 */
function buildUserPrompt(teamData: any, jefeInfo: any, tipo: "directo" | "cascada" = "directo"): string {
  const {
    estadisticasEquipo,
    composicionEquipo,
    colaboradores,
    periodoNombre,
  } = teamData;

  // Construir información del jefe para el contexto
  const jefeNombre = jefeInfo 
    ? `${jefeInfo.nombre} ${jefeInfo.apellidos || ""}`.trim()
    : "Jefe del equipo";
  const jefeCargo = jefeInfo?.cargo || "Jefe";
  const jefeArea = jefeInfo?.area || "Área no especificada";
  const jefeNivel = jefeInfo?.nivel || "";

  // Determinar el nombre de la unidad/departamento/dependencia
  const nombreUnidad = jefeArea || jefeCargo || "unidad";

  const tituloAnalisis = tipo === "cascada" 
    ? `ANÁLISIS DE TODA LA UNIDAD - ${nombreUnidad.toUpperCase()}`
    : `ANÁLISIS DE EQUIPO - ${nombreUnidad.toUpperCase()}`;
  
  const contextoAnalisis = tipo === "cascada"
    ? "Este análisis incluye TODOS los colaboradores de la unidad: colaboradores directos Y todos los colaboradores de los jefes subordinados (análisis en cascada)."
    : "Este análisis incluye SOLO los colaboradores directos del jefe.";

  let prompt = `${tituloAnalisis}

${contextoAnalisis}

JEFE DEL EQUIPO: ${jefeNombre}
CARGO: ${jefeCargo}${jefeNivel ? ` (Nivel ${jefeNivel})` : ""}
ÁREA/DEPENDENCIA: ${jefeArea}

PERÍODO: ${periodoNombre || "Período actual"}

═══════════════════════════════════════════════════════════════
ESTADÍSTICAS DEL EQUIPO
═══════════════════════════════════════════════════════════════

Total de Colaboradores: ${estadisticasEquipo.totalColaboradores}
Evaluaciones Completadas: ${estadisticasEquipo.evaluacionesCompletadas}
Tasa de Completitud: ${Math.round((estadisticasEquipo.evaluacionesCompletadas / estadisticasEquipo.totalColaboradores) * 100)}%

Promedio de Desempeño del Equipo: ${Math.round(estadisticasEquipo.promedioDesempeno)}%
Promedio de Potencial del Equipo: ${Math.round(estadisticasEquipo.promedioPotencial)}%
Índice de Desarrollo: ${Math.round(estadisticasEquipo.indiceDesarrollo)}%

Comparativa Organizacional:
- Desempeño: Equipo ${Math.round(estadisticasEquipo.promedioDesempeno)}% vs Organización ${Math.round(estadisticasEquipo.promedioDesempenoOrganizacion)}%
- Potencial: Equipo ${Math.round(estadisticasEquipo.promedioPotencial)}% vs Organización ${Math.round(estadisticasEquipo.promedioPotencialOrganizacion)}%

Distribución 9-Box del Equipo:
${Object.entries(estadisticasEquipo.distribucion9Box)
  .map(([posicion, count]) => `  - ${posicion}: ${count} persona(s)`)
  .join("\n")}

═══════════════════════════════════════════════════════════════
COMPOSICIÓN DEL EQUIPO
═══════════════════════════════════════════════════════════════

Distribución por Área/Dependencia:
${Object.entries(composicionEquipo.porArea)
  .map(([area, count]) => `  - ${area}: ${count} persona(s)`)
  .join("\n")}

Distribución por Nivel:
${Object.entries(composicionEquipo.porNivel)
  .map(([nivel, count]) => `  - ${nivel}: ${count} persona(s)`)
  .join("\n")}

Distribución por Cargo (principales):
${Object.entries(composicionEquipo.porCargo)
  .slice(0, 10)
  .map(([cargo, count]) => `  - ${cargo}: ${count} persona(s)`)
  .join("\n")}

═══════════════════════════════════════════════════════════════
INFORMACIÓN POR COLABORADOR
═══════════════════════════════════════════════════════════════

`;

  colaboradores.forEach((col: any, index: number) => {
    prompt += `COLABORADOR ${index + 1}: ${col.nombreCompleto}
  Cargo: ${col.cargo}
  Área: ${col.area}
  Nivel: ${col.nivel}
  Posición 9-Box: ${col.posicion9Box || "Sin calcular"}
  Desempeño: ${col.desempenoPorcentaje ? Math.round(col.desempenoPorcentaje) + "%" : "Sin evaluación"}
  Potencial: ${col.potencialPorcentaje ? Math.round(col.potencialPorcentaje) + "%" : "Sin evaluación"}

`;

    // Comentarios del jefe (con nombres de dimensiones)
    const comentariosJefe = Object.entries(col.comentariosJefe || {})
      .map(([dimId, data]: [string, any]) => {
        const nombreDimension = data.nombre || dimId;
        const comentario = typeof data === 'string' ? data : data.comentario;
        return `    - ${nombreDimension} (${dimId}): ${comentario}`;
      })
      .join("\n");

    if (comentariosJefe) {
      prompt += `  Comentarios del Jefe (${Object.keys(col.comentariosJefe || {}).length} comentario(s)):\n${comentariosJefe}\n\n`;
    } else {
      prompt += `  Comentarios del Jefe: No hay comentarios registrados\n\n`;
    }

    // Comentarios del empleado (con nombres de dimensiones)
    const comentariosEmpleado = Object.entries(col.comentariosEmpleado || {})
      .map(([dimId, data]: [string, any]) => {
        const nombreDimension = data.nombre || dimId;
        const comentario = typeof data === 'string' ? data : data.comentario;
        return `    - ${nombreDimension} (${dimId}): ${comentario}`;
      })
      .join("\n");

    if (comentariosEmpleado) {
      prompt += `  Comentarios del Empleado (${Object.keys(col.comentariosEmpleado || {}).length} comentario(s)):\n${comentariosEmpleado}\n\n`;
    } else {
      prompt += `  Comentarios del Empleado: No hay comentarios registrados\n\n`;
    }

    // Necesidades de herramientas
    if (col.comentariosHerramientas && col.comentariosHerramientas.length > 0) {
      prompt += `  Necesidades de Herramientas:\n${col.comentariosHerramientas
        .map((h: string) => `    - ${h}`)
        .join("\n")}\n\n`;
    }

    // Necesidades de capacitación
    if (
      col.comentariosCapacitaciones &&
      col.comentariosCapacitaciones.length > 0
    ) {
      prompt += `  Necesidades de Capacitación:\n${col.comentariosCapacitaciones
        .map((c: string) => `    - ${c}`)
        .join("\n")}\n\n`;
    }

    prompt += "\n";
  });

  prompt += `═══════════════════════════════════════════════════════════════
INSTRUCCIONES PARA EL ANÁLISIS
═══════════════════════════════════════════════════════════════

Basándote en la información proporcionada, genera un análisis completo de:
1. FORTALEZAS ${tipo === "cascada" ? "de TODA LA UNIDAD" : `del ${nombreUnidad}`} (4-7 fortalezas principales - OBLIGATORIO: mínimo 4)
2. OPORTUNIDADES DE MEJORA (4-7 áreas prioritarias - OBLIGATORIO: mínimo 4)
3. RESUMEN EJECUTIVO ESPECÍFICO ${tipo === "cascada" ? "de TODA LA UNIDAD" : `del ${nombreUnidad}`}

⚠️ IMPORTANTE PARA EL RESUMEN EJECUTIVO:
${tipo === "cascada" 
  ? `- El resumen DEBE ser específico a TODA LA UNIDAD del ${nombreUnidad} dirigida por ${jefeNombre} (${jefeCargo})
- Incluye NO SOLO los colaboradores directos, sino TAMBIÉN todos los colaboradores de los jefes subordinados
- Usa términos como "toda la unidad del ${nombreUnidad}", "todos los equipos bajo su dirección", "la unidad organizacional completa"
- Menciona características específicas de TODA LA UNIDAD, incluyendo la diversidad de áreas, niveles jerárquicos y equipos que la componen
- El resumen debe reflejar la complejidad y diversidad de TODA LA UNIDAD, no solo el equipo directo`
  : `- El resumen DEBE ser específico al ${nombreUnidad} dirigido por ${jefeNombre} (${jefeCargo})
- NO uses términos genéricos como "la Municipalidad de Esquipulas" a menos que sea absolutamente necesario
- En su lugar, usa "este ${nombreUnidad}", "el ${nombreUnidad}", "la unidad de ${nombreUnidad}"
- Menciona características específicas del ${nombreUnidad} basadas en los datos proporcionados
- El resumen debe reflejar el contexto y realidad PARTICULAR de este ${nombreUnidad}, no generalidades`}

Considera:
- Los promedios del equipo vs organización
- La distribución 9-Box (identifica patrones)
- Los comentarios del jefe y empleados (busca temas recurrentes)
- Las necesidades de herramientas y capacitación expresadas
- La composición del equipo (áreas, niveles, cargos)
- El contexto específico del ${nombreUnidad} (${jefeArea})

Sé específico y usa los datos proporcionados como evidencia.`;

  return prompt;
}

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
    const { jefeDpi, periodoId, tipo = "directo" }: GenerateTeamAnalysisRequest =
      await req.json();

    if (!jefeDpi || !periodoId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "jefeDpi y periodoId son requeridos",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validar tipo
    if (tipo !== "directo" && tipo !== "cascada") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "tipo debe ser 'directo' o 'cascada'",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`📊 Generando análisis ${tipo} para jefe ${jefeDpi}, período ${periodoId}`);

    // 1. Obtener datos del equipo según el tipo
    let colaboradoresData: any[] = [];
    let statsData: any = null;

    if (tipo === "cascada") {
      // Análisis cascada: obtener toda la unidad
      const { data: equipoCascada, error: errorCascada } = await supabase.rpc(
        "get_equipo_cascada_completo",
        {
          jefe_dpi_param: jefeDpi,
          periodo_id_param: periodoId,
        }
      );

      if (errorCascada) {
        console.error("Error obteniendo equipo en cascada:", errorCascada);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Error obteniendo datos del equipo en cascada",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (equipoCascada) {
        colaboradoresData = equipoCascada.colaboradores || [];
        statsData = equipoCascada.estadisticas || null;
      }
    } else {
      // Análisis directo: solo colaboradores directos
      const { data: colaboradoresDirectos, error: errorColaboradores } =
        await supabase.rpc("get_jerarquia_directa_con_resultados", {
          usuario_dpi: jefeDpi,
          periodo_id_param: periodoId,
        });

      if (errorColaboradores) {
        console.error("Error obteniendo colaboradores:", errorColaboradores);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Error obteniendo datos del equipo",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      colaboradoresData = colaboradoresDirectos || [];

      // Obtener estadísticas del equipo directo
      const { data: statsDirecto, error: errorStats } = await supabase.rpc(
        "get_stats_unidad_directa",
        {
          usuario_dpi: jefeDpi,
          periodo_id_param: periodoId,
        }
      );

      if (errorStats) {
        console.error("Error obteniendo estadísticas:", errorStats);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Error obteniendo estadísticas del equipo",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      statsData = statsDirecto;
    }

    // Obtener información del jefe (área, cargo, dependencia)
    const { data: jefeInfo, error: errorJefe } = await supabase
      .from("users")
      .select("nombre, apellidos, cargo, area, nivel")
      .eq("dpi", jefeDpi)
      .maybeSingle();

    if (errorJefe) {
      console.error("Error obteniendo información del jefe:", errorJefe);
    }

    // Obtener período
    const { data: periodo } = await supabase
      .from("evaluation_periods")
      .select("nombre")
      .eq("id", periodoId)
      .maybeSingle();

    // Obtener mapeo de dimensiones (ID -> Nombre) para todos los instrumentos
    const { data: instrumentConfigs } = await supabase
      .from("instrument_configs")
      .select("id, dimensiones_desempeno")
      .eq("activo", true);

    // Construir mapeo global de dimensiones
    const dimensionMap: Record<string, string> = {};
    if (instrumentConfigs) {
      instrumentConfigs.forEach((config: any) => {
        if (config.dimensiones_desempeno && Array.isArray(config.dimensiones_desempeno)) {
          config.dimensiones_desempeno.forEach((dim: any) => {
            if (dim.id && dim.nombre) {
              dimensionMap[dim.id] = dim.nombre;
            }
          });
        }
      });
    }

    // Construir datos del equipo
    const colaboradores: any[] = [];
    const comentariosDetalle: any[] = []; // Para logs detallados

    for (const col of colaboradoresData || []) {
      // Obtener evaluación del jefe
      const { data: evaluacionJefe } = await supabase
        .from("evaluations")
        .select("id, comments")
        .eq("tipo", "jefe")
        .eq("colaborador_id", col.dpi)
        .eq("periodo_id", periodoId)
        .eq("estado", "enviado")
        .maybeSingle();

      // Obtener autoevaluación
      const { data: autoevaluacion } = await supabase
        .from("evaluations")
        .select("id, comments")
        .eq("tipo", "auto")
        .eq("usuario_id", col.dpi)
        .eq("periodo_id", periodoId)
        .eq("estado", "enviado")
        .maybeSingle();

      // Procesar comentarios del jefe con nombres de dimensiones
      const comentariosJefeProcesados: Record<string, { nombre: string; comentario: string }> = {};
      const comentariosJefeRaw = (evaluacionJefe?.comments as Record<string, string>) || {};
      
      Object.entries(comentariosJefeRaw).forEach(([dimId, comentario]) => {
        if (comentario && typeof comentario === 'string' && comentario.trim()) {
          const nombreDimension = dimensionMap[dimId] || dimId;
          comentariosJefeProcesados[dimId] = {
            nombre: nombreDimension,
            comentario: comentario.trim()
          };
        }
      });

      // Procesar comentarios del empleado con nombres de dimensiones
      const comentariosEmpleadoProcesados: Record<string, { nombre: string; comentario: string }> = {};
      const comentariosEmpleadoRaw = (autoevaluacion?.comments as Record<string, string>) || {};
      
      Object.entries(comentariosEmpleadoRaw).forEach(([dimId, comentario]) => {
        if (comentario && typeof comentario === 'string' && comentario.trim()) {
          const nombreDimension = dimensionMap[dimId] || dimId;
          comentariosEmpleadoProcesados[dimId] = {
            nombre: nombreDimension,
            comentario: comentario.trim()
          };
        }
      });

      // Log detallado de comentarios
      comentariosDetalle.push({
        colaborador: col.nombreCompleto || `${col.nombre} ${col.apellidos}`,
        totalComentariosJefe: Object.keys(comentariosJefeProcesados).length,
        totalComentariosEmpleado: Object.keys(comentariosEmpleadoProcesados).length,
        comentariosJefe: Object.entries(comentariosJefeProcesados).map(([dimId, data]) => ({
          dimensionId: dimId,
          dimensionNombre: data.nombre,
          tieneComentario: true
        })),
        comentariosEmpleado: Object.entries(comentariosEmpleadoProcesados).map(([dimId, data]) => ({
          dimensionId: dimId,
          dimensionNombre: data.nombre,
          tieneComentario: true
        }))
      });

      // Obtener preguntas abiertas
      const comentariosHerramientas: string[] = [];
      const comentariosCapacitaciones: string[] = [];

      if (autoevaluacion?.id) {
        const { data: openResponses } = await supabase
          .from("open_question_responses")
          .select(
            `
            respuesta,
            pregunta_id,
            open_questions!inner(
              tipo,
              pregunta
            )
          `
          )
          .eq("evaluacion_id", autoevaluacion.id);

        if (openResponses) {
          openResponses.forEach((resp: any) => {
            if (resp.open_questions?.tipo === "herramienta" && resp.respuesta) {
              comentariosHerramientas.push(resp.respuesta);
            }
            if (
              resp.open_questions?.tipo === "capacitacion" &&
              resp.respuesta
            ) {
              comentariosCapacitaciones.push(resp.respuesta);
            }
          });
        }
      }

      colaboradores.push({
        dpi: col.dpi,
        nombreCompleto: col.nombreCompleto || `${col.nombre} ${col.apellidos}`,
        cargo: col.cargo,
        area: col.area,
        nivel: col.nivel,
        posicion9Box: col.posicion9Box,
        desempenoPorcentaje: col.desempenoPorcentaje,
        potencialPorcentaje: col.potencialPorcentaje,
        comentariosJefe: comentariosJefeProcesados,
        comentariosEmpleado: comentariosEmpleadoProcesados,
        comentariosHerramientas,
        comentariosCapacitaciones,
      });
    }

    // Calcular composición
    const composicionPorArea: Record<string, number> = {};
    const composicionPorNivel: Record<string, number> = {};
    const composicionPorCargo: Record<string, number> = {};

    colaboradoresData?.forEach((col: any) => {
      const area = col.area || "Sin área";
      composicionPorArea[area] = (composicionPorArea[area] || 0) + 1;

      const nivel = col.nivel || "Sin nivel";
      composicionPorNivel[nivel] = (composicionPorNivel[nivel] || 0) + 1;

      const cargo = col.cargo || "Sin cargo";
      composicionPorCargo[cargo] = (composicionPorCargo[cargo] || 0) + 1;
    });

    const teamData = {
      estadisticasEquipo: {
        totalColaboradores: statsData?.totalPersonas || 0,
        evaluacionesCompletadas: statsData?.evaluacionesCompletadas || 0,
        promedioDesempeno: statsData?.promedioDesempenoUnidad || 0,
        promedioPotencial: statsData?.promedioPotencialUnidad || 0,
        indiceDesarrollo:
          ((statsData?.promedioDesempenoUnidad || 0) +
            (statsData?.promedioPotencialUnidad || 0)) /
          2,
        promedioDesempenoOrganizacion:
          statsData?.promedioDesempenoOrganizacion || 0,
        promedioPotencialOrganizacion:
          statsData?.promedioPotencialOrganizacion || 0,
        distribucion9Box: statsData?.distribucion9Box || {},
      },
      composicionEquipo: {
        porArea: composicionPorArea,
        porNivel: composicionPorNivel,
        porCargo: composicionPorCargo,
      },
      colaboradores,
      periodoId,
      periodoNombre: periodo?.nombre,
    };

    // 2. Construir prompts según el tipo
    const systemPrompt = tipo === "cascada"
      ? getSystemPromptForTeamStrengthsAndOpportunitiesCascada(jefeInfo)
      : getSystemPromptForTeamStrengthsAndOpportunities(jefeInfo);
    const userPrompt = buildUserPrompt(teamData, jefeInfo, tipo);

    // Log detallado para verificar datos enviados
    console.log("📊 Datos enviados a IA:", {
      totalColaboradores: colaboradores.length,
      totalComentariosJefe: comentariosDetalle.reduce((sum, c) => sum + c.totalComentariosJefe, 0),
      totalComentariosEmpleado: comentariosDetalle.reduce((sum, c) => sum + c.totalComentariosEmpleado, 0),
      colaboradoresEnviados: colaboradores.map((c: any) => ({
        nombre: c.nombreCompleto,
        cargo: c.cargo,
        area: c.area,
        tieneComentariosJefe: Object.keys(c.comentariosJefe || {}).length > 0,
        numComentariosJefe: Object.keys(c.comentariosJefe || {}).length,
        tieneComentariosEmpleado: Object.keys(c.comentariosEmpleado || {}).length > 0,
        numComentariosEmpleado: Object.keys(c.comentariosEmpleado || {}).length,
        tieneHerramientas: (c.comentariosHerramientas || []).length > 0,
        numHerramientas: (c.comentariosHerramientas || []).length,
        tieneCapacitaciones: (c.comentariosCapacitaciones || []).length > 0,
        numCapacitaciones: (c.comentariosCapacitaciones || []).length,
      })),
      detalleComentarios: comentariosDetalle,
      jefeInfo: {
        nombre: jefeInfo?.nombre,
        cargo: jefeInfo?.cargo,
        area: jefeInfo?.area,
      },
    });

    // 3. Llamar a OpenAI
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "OPENAI_API_KEY no configurada",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Llamando a OpenAI API para generar análisis del equipo...");

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 4000,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      console.error("Error de OpenAI:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Error de OpenAI: ${error.error?.message || "Error desconocido"}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const analysisText = openaiData.choices?.[0]?.message?.content;

    if (!analysisText) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No se recibió respuesta de OpenAI",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Parsear respuesta JSON
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error("Error parseando respuesta de OpenAI:", parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error parseando respuesta de la IA",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error en generate-team-analysis:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Error interno del servidor",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

