import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
 * Construye el prompt para Gemini con todo el contexto necesario
 */
function buildPrompt(data: any): string {
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

  return `Eres un experto en Recursos Humanos y Desarrollo Organizacional del sector público guatemalteco, especializado en la gestión municipal. Tu tarea es generar un Plan de Desarrollo Individual CONCRETO, PRÁCTICO y PRIORIZADO para un colaborador de la Municipalidad de Esquipulas, Chiquimula.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 INFORMACIÓN DEL COLABORADOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Nombre: ${colaborador.nombre} ${colaborador.apellidos}
💼 Cargo: ${colaborador.cargo}
📊 Nivel: ${colaborador.nivel}
🏢 Área: ${colaborador.area || "No especificada"}
📅 Fecha de ingreso: ${colaborador.fecha_ingreso ? new Date(colaborador.fecha_ingreso).toLocaleDateString('es-GT') : "No registrada"}
🎓 Formación académica: ${colaborador.formacion_academica || "No registrada"}
${grupos.length > 0 ? `👥 Pertenece a cuadrilla(s): ${grupos.map((g: any) => g.nombre).join(", ")}` : ""}

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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌎 CONTEXTO ESQUIPULAS - RECURSOS DISPONIBLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Ubicación: Municipio de Esquipulas, Chiquimula, Guatemala

💰 RESTRICCIONES PRESUPUESTARIAS:
- Presupuesto municipal limitado
- Priorizar recursos internos y alianzas institucionales
- Buscar opciones gratuitas o de bajo costo

🎓 RECURSOS EXTERNOS DE CAPACITACIÓN:
1. **FARO de Coosajo**
   - Capacitaciones técnicas especializadas
   - Asesorías para puestos clave
   - Formación en temas específicos según necesidad del puesto

2. **INTECAP (Instituto Técnico de Capacitación y Productividad)**
   - Modalidad virtual (accesible desde Esquipulas)
   - Modalidad presencial en Chiquimula (cabecera departamental)
   - Cursos técnicos, administrativos y de oficios

3. **Instituciones locales y departamentales**
   - Según el puesto, identificar instituciones afines que puedan proporcionar capacitación
   - Buscar alianzas con entidades gubernamentales relacionadas al área de trabajo
   - Coordinación con otras municipalidades para intercambio de experiencias

🔧 TIPOS DE ACOMPAÑAMIENTO APLICABLES:
1. **Capacitación externa**: FARO, INTECAP, instituciones especializadas
2. **Mentoría interna**: Acompañamiento con personal experimentado de la municipalidad
3. **Coaching de jefe inmediato**: Retroalimentación constante y guía directa
4. **Proyectos especiales**: Asignación a proyectos que desarrollen competencias específicas
5. **Responsabilidades progresivas**: Incremento gradual de complejidad de tareas
6. **Proyectos transversales**: Participación en iniciativas inter-áreas
7. **Rotación de funciones**: Exposición temporal a otras áreas relacionadas
8. **Shadowing**: Observación y acompañamiento en campo
9. **Autoaprendizaje dirigido**: Recursos bibliográficos, videos, cursos en línea específicos
10. **Círculos de aprendizaje**: Grupos de estudio entre pares de la municipalidad

⚠️ IMPORTANTE:
- Proponer SOLO acciones REALISTAS y APLICABLES al contexto municipal de Esquipulas
- NO sugerir capacitaciones internacionales, maestrías costosas o recursos inaccesibles
- Enfocarse en soluciones PRÁCTICAS que se puedan implementar con recursos locales
- Considerar la realidad del sector público guatemalteco
- Las acciones deben ser ESPECÍFICAS, no genéricas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 INSTRUCCIONES PARA GENERAR EL PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Genera un Plan de Desarrollo COMPLETO y ESTRUCTURADO en formato JSON con la siguiente estructura EXACTA:

{
  "objetivos": [
    "Objetivo 1 de desarrollo (específico, medible, alcanzable)",
    "Objetivo 2 de desarrollo",
    "Objetivo 3 de desarrollo"
  ],
  "acciones": [
    {
      "descripcion": "Descripción detallada y específica de la acción concreta a tomar",
      "responsable": "Jefe inmediato" | "Colaborador" | "RRHH" | "Gerencia Municipal" | "Otro específico",
      "fecha": "Fecha tentativa en formato YYYY-MM-DD o período como '2025-02 al 2025-04'",
      "recursos": ["Recurso 1 necesario", "Recurso 2", ...],
      "indicador": "Indicador simple y medible de cumplimiento (ej: 'Completar curso', 'Aplicar en 3 casos', 'Reducir errores en 30%')",
      "prioridad": "alta" | "media" | "baja"
    }
  ],
  "dimensionesDebiles": [
    {
      "dimension": "Nombre de la dimensión que requiere desarrollo",
      "score": score_actual_de_0_a_5,
      "accionesEspecificas": [
        "Acción específica 1 para mejorar esta dimensión",
        "Acción específica 2",
        ...
      ]
    }
  ],
  "feedbackIndividual": "Feedback personalizado, constructivo y motivador para el colaborador. Debe ser claro, específico y en tono profesional pero cercano. Máximo 600 palabras. Incluir reconocimiento de fortalezas y áreas de oportunidad con sugerencias concretas.",
  ${grupos.length > 0 ? `"feedbackGrupal": "Feedback para toda la cuadrilla ${grupos.map((g: any) => g.nombre).join(" y ")}. Enfocado en el desempeño colectivo del equipo, dinámicas de trabajo en grupo y acciones de desarrollo para toda la cuadrilla. Máximo 400 palabras.",` : '"feedbackGrupal": null,'}
  "recomendaciones": [
    "Recomendación general 1",
    "Recomendación general 2",
    ...
  ]
}

🎯 CRITERIOS CLAVE:
1. **PRIORIZACIÓN**: Las acciones de prioridad "alta" deben enfocarse en las 3 dimensiones más débiles
2. **ESPECIFICIDAD**: Cada acción debe ser CONCRETA y ACCIONABLE (no genérica)
3. **REALISMO**: Solo proponer lo que ES VIABLE en el contexto de Esquipulas
4. **FECHAS REALISTAS**: Considerar carga de trabajo y disponibilidad
5. **INDICADORES SIMPLES**: Que se puedan medir sin sistemas complejos
6. **BALANCE**: Incluir desarrollo técnico Y conductual según necesidad
7. **LENGUAJE**: Español profesional, sin tecnicismos innecesarios, sin palabras en inglés
8. **FEEDBACK CONSTRUCTIVO**: Reconocer fortalezas + identificar oportunidades + proponer caminos concretos

Responde ÚNICAMENTE con el JSON, sin texto adicional antes o después.`;
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

    // Obtener información completa del colaborador (SIN incluir DPI en el payload a Gemini)
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

    // Construir prompt para Gemini
    let prompt: string;
    try {
      prompt = buildPrompt({
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

    // Llamar a Gemini
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "GEMINI_API_KEY no configurada" }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Intentar con gemini-1.5-flash primero (más rápido y económico), luego fallback a gemini-1.5-pro
    let geminiResponse;
    let modelUsed = "gemini-1.5-flash";
    
    try {
      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8000,
            },
          }),
        }
      );
    } catch (fetchError) {
      console.error("Error en fetch a Gemini Flash:", fetchError);
      // Fallback a gemini-1.5-pro
      modelUsed = "gemini-1.5-pro";
      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8000,
            },
          }),
        }
      );
    }

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error(`Error en Gemini API (${modelUsed}):`, errorText);
      let errorMessage = `Error en Gemini API (${modelUsed})`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorText;
      } catch {
        errorMessage = errorText.substring(0, 500);
      }
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const geminiData = await geminiResponse.json();
    const planText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parsear respuesta de Gemini
    let planData;
    try {
      const jsonMatch = planText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        planData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No se encontró JSON en la respuesta");
      }
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      return new Response(
        JSON.stringify({ success: false, error: `Error parseando respuesta de IA: ${errorMessage}` }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Guardar plan en base de datos
    const { data: planInserted, error: planError } = await supabase
      .from("development_plans")
      .insert({
        evaluacion_id: evaluacionJefe.id,
        colaborador_id: colaborador_id,
        periodo_id: periodo_id,
        competencias_desarrollar: planData.objetivos || [],
        feedback_individual: planData.feedbackIndividual || "",
        feedback_grupal: planData.feedbackGrupal || null,
        plan_estructurado: {
          objetivos: planData.objetivos || [],
          acciones: planData.acciones || [],
          dimensionesDebiles: planData.dimensionesDebiles || [],
        },
        recomendaciones: planData.recomendaciones || [],
        generado_por_ia: true,
        editable: true,
      })
      .select("*")
      .single();

    if (planError) {
      return new Response(
        JSON.stringify({ success: false, error: `Error guardando plan: ${planError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
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
        details: process.env.NODE_ENV === "development" ? errorStack : undefined
      }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
