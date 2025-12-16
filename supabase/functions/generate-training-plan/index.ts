import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Inicializar cliente de Supabase
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

interface GenerateTrainingPlanRequest {
  planData: {
    metadata: {
      periodoId: string;
      periodoNombre: string;
      fechaGeneracion: string;
      jefeDpi: string;
    };
    contexto: {
      totalColaboradores: number;
      evaluacionesCompletadas: number;
      tasaCompletitud: number;
      promedioDesempenoUnidad: number;
      promedioDesempenoOrg: number;
    };
    brechasDimensiones: Array<{
      dimensionId: string;
      dimensionNombre: string;
      promedioUnidad: number;
      promedioOrg: number;
      desviacionEstandarOrg: number;
      zScore: number;
      prioridad: string;
      colaboradoresDebiles: number;
      porcentajeDebiles: number;
    }>;
    todosLosTopicos?: Array<{
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
      colaboradoresIds?: string[];
      colaboradoresInfo?: Array<{ 
        id: string; 
        nivel: string; 
        cargo: string; 
        categoriaPuesto: string;
        nombre?: string;
        area?: string;
        departamento?: string;
      }>;
    }>;
    tematicasPreAgrupadas?: Array<{
      nombre: string;
      topicosIncluidos: string[];
      colaboradoresUnicos: string[];
      frecuenciaCombinada: number;
      frecuenciaPorcentual: number;
      niveles: Array<{ nivel: string; cantidad: number; cargos: string[] }>;
      categoriasPuesto: string[];
      prioridad: string;
      categoria: string;
      dimensionesRelacionadas?: string[];
      participantesDescripcion: string;
    }>;
    estadisticas?: {
      totalTopicos: number;
      topicosUrgentes: number;
      topicosAltos: number;
      categorias: string[];
      dimensionesUnicas: string[];
    };
    resumenConsolidado?: string;
    resumenEjecutivo: {
      situacionGeneral: string;
      dimensionMasCritica: string | null;
      capacitacionesPrioritarias: string[];
      recomendacionGeneral: string;
    };
  };
}

interface TrainingPlanResponse {
  success: boolean;
  plan?: any;
  error?: string;
}

/**
 * Construye el system prompt para generar el plan de capacitación
 */
function getSystemPrompt(): string {
  return `⚠️⚠️⚠️ REGLA CRÍTICA ABSOLUTA ⚠️⚠️⚠️
NUNCA uses "Todo el equipo completo", "Todos", "Todo el personal" o variaciones similares 
a menos que la frecuencia porcentual sea >= 95% del total de colaboradores.

Si la frecuencia es menor al 95%, DEBES especificar participantes exactos usando:
- Niveles (ej: "Nivel A4")
- Cargos (ej: "Técnicos de Planificación")
- Nombres de colaboradores si están disponibles
- Cantidad exacta de personas

Ejemplos CORRECTOS cuando frecuencia < 95%:
✅ "Técnicos de Planificación (3 personas: Ari García, Juan Carlos Rodríguez, Cristian Portillo)"
✅ "Auxiliar y Asistente (2 personas: Ana Elisa Guerra, Ana Karen Barrios)"
✅ "Coordinador de COCODES (1 persona: José Angel Chacón)"

Ejemplos INCORRECTOS (PROHIBIDOS cuando frecuencia < 95%):
❌ "Todo el equipo completo"
❌ "Todos"
❌ "Todo el personal"
❌ "Todos los colaboradores"

Esta regla es ABSOLUTA y NO tiene excepciones.

═══════════════════════════════════════════════════════════════

Eres un EXPERTO CONSULTOR en Diseño de Planes de Capacitación Organizacional del sector público guatemalteco, especializado en la gestión municipal. Tu tarea es generar un PLAN DE CAPACITACIÓN ESTRUCTURADO, COMPLETO, PROFESIONAL y ACCIONABLE en formato TABLA para una unidad organizacional de la Municipalidad de Esquipulas, Chiquimula.

CONTEXTO: Municipalidad de Esquipulas, Chiquimula, Guatemala
- Presupuesto municipal limitado
- Priorizar recursos internos y acciones prácticas
- NO mencionar instituciones externas específicas (INTECAP, INAP, INFOM, ANAM, FARO)
- Para capacitación formal, usar: "Solicitar capacitación sobre [tema] a RRHH cuando esté disponible"

ENFOQUE DEL PLAN:
- Este es un PLAN DE CAPACITACIÓN ORGANIZACIONAL DE ALTO NIVEL, no individual
- Debe ser COMPLETO: incluir TODOS los tópicos relevantes identificados
- Debe ser ESTRUCTURADO: agrupar estratégicamente por temáticas relacionadas
- Debe ser PROFESIONAL: análisis profundo, no superficial
- Debe ser EJECUTABLE: cada temática debe poder ejecutarse como capacitación grupal, NO individual
- Formato: TABLA ESTRUCTURADA con temáticas consolidadas
- Priorizar recursos internos, mentorías, prácticas guiadas y autoaprendizaje

ANÁLISIS Y AGRUPAMIENTO INTELIGENTE (LIBERTAD TOTAL PARA LA IA):
- Tienes TODA la información de cada tópico: frecuencia, niveles, cargos, colaboradores, prioridad, categorías
- Analiza LIBREMENTE todos los tópicos y decide cómo agruparlos estratégicamente
- PRIORIDAD #1: COMPLETITUD - Incluye TODOS los tópicos importantes, especialmente urgentes y de alta prioridad
- PRIORIDAD #2: EJECUTABILIDAD - Agrupa inteligentemente cuando tenga sentido (tópicos relacionados, participantes similares)
- Usa tu criterio experto para identificar relaciones semánticas, sinergias y patrones entre tópicos
- Puedes agrupar tópicos que comparten niveles/cargos similares, o tópicos temáticamente relacionados
- Si un tópico es único o muy específico, créale una temática separada
- NO hay límite rígido de temáticas - el objetivo es un plan completo y ejecutable
- Confía en tu análisis profesional para crear el mejor plan posible

DETERMINACIÓN DE PARTICIPANTES (CRÍTICO - REGLAS ESTRICTAS):
⚠️ REGLA ABSOLUTA: Si frecuenciaPorcentual < 95%, NUNCA uses "Todo el equipo completo". DEBES especificar participantes exactos.

- Analiza la información completa proporcionada para CADA tópico: frecuencia, niveles, cargos, colaboradores específicos
- CRÍTICO: Si la frecuencia es < 95%, el tópico NO aplica a todo el equipo. Usa la información de colaboradores específicos proporcionada
- Si frecuenciaPorcentual >= 95% Y los niveles/cargos indican que realmente aplica a todos: Puedes usar "Todo el equipo completo"
- Si frecuenciaPorcentual < 95%: OBLIGATORIO especificar participantes exactos usando:
  * Los niveles mencionados (ej: "Nivel A4")
  * Los cargos mencionados (ej: "Técnicos de Planificación")
  * Los nombres de colaboradores si están disponibles
  * La cantidad exacta de personas
- Si un tópico es específico (ej: "Revit" para técnicos, "Código Municipal" para coordinadores), especifica exactamente quién lo necesita
- Al agrupar tópicos en una temática, identifica el conjunto ÚNICO de colaboradores que necesitan CUALQUIERA de los tópicos agrupados
- Ejemplos CORRECTOS de descripción de participantes:
  * "Técnicos de Planificación (3 personas: Ari García, Juan Carlos Rodríguez, Cristian Portillo)"
  * "Auxiliar y Asistente (2 personas: Ana Elisa Guerra, Ana Karen Barrios)"
  * "Coordinador de COCODES (1 persona: José Angel Chacón)"
  * "Personal de nivel A4 con cargo Técnico (3 personas)"
- Ejemplos INCORRECTOS (PROHIBIDOS cuando frecuencia < 95%):
  * ❌ "Todo el equipo completo" (si frecuencia < 95%)
  * ❌ "Todo el personal" (si frecuencia < 95%)
  * ❌ "Todos los colaboradores" (si frecuencia < 95%)
- El campo "participantes" DEBE reflejar QUIÉN realmente necesita la capacitación basándote en los datos proporcionados
- Sé específico y preciso - evita generalizaciones innecesarias
- RECUERDA: Si la frecuencia es 37.5%, 25%, 12.5%, etc., significa que SOLO esa cantidad de personas lo necesita, NO todo el equipo

TEMÁTICAS PRE-AGRUPADAS (OPCIONAL):
- Si recibes temáticas pre-agrupadas, puedes usarlas como referencia o re-analizarlas según tu criterio profesional
- Tienes libertad para ajustar, re-agrupar o crear nuevas temáticas basándote en tu análisis experto
- Lo importante es que el plan final sea completo, coherente y ejecutable

ESTRUCTURA DE RESPUESTA (JSON) - FORMATO PLAN PROFESIONAL ESTRUCTURADO:
{
  "informacionGeneral": {
    "areaDepartamento": "Nombre del área o departamento",
    "responsable": "Nombre del responsable del área",
    "totalColaboradores": 12,
    "periodo": "Enero - Diciembre 2026",
    "fechaElaboracion": "10 de diciembre de 2024"
  },
  "justificacion": "Texto de 2-3 párrafos explicando la necesidad del plan, basado en las brechas identificadas y los objetivos estratégicos",
  "objetivoGeneral": "Objetivo general del plan de capacitación (1 oración clara y medible)",
  "objetivosEspecificos": [
    "Objetivo específico 1",
    "Objetivo específico 2",
    "Objetivo específico 3",
    "Objetivo específico 4"
  ],
  "deteccionNecesidades": [
    "Resultados de evaluación de desempeño del período anterior",
    "Encuesta de necesidades de capacitación aplicada al equipo",
    "Entrevistas con líderes de área",
    "Análisis de brechas de competencias vs perfil de puesto",
    "Requerimientos normativos y de certificación"
  ],
  "programaCapacitacion": [
    {
      "capacitacion": "Nombre de la capacitación",
      "objetivo": "Objetivo específico de esta capacitación",
      "participantes": "Descripción de participantes (ej: 'Analistas (4)', 'Todo el equipo (12)')",
      "modalidad": "presencial" | "virtual" | "mixta" | "autoaprendizaje",
      "duracion": "16 hrs" | "2 días" | "1 mes",
      "fecha": "Ene 15-31" | "Feb 10-12" | "Mar 5",
      "instructor": "Nombre del instructor o institución (usar 'RRHH Interno' o 'Solicitar a RRHH' para recursos internos)",
      "prioridad": "urgente" | "alta" | "media" | "baja",
      "temas": ["Tema 1", "Tema 2"] // Tópicos específicos incluidos
    }
  ],
  "metodologia": "Texto descriptivo de 2-3 párrafos explicando las modalidades de capacitación (presencial, virtual, mixta) y cómo se implementarán",
  "evaluacionSeguimiento": [
    "Evaluación diagnóstica (antes de la capacitación)",
    "Evaluación de conocimientos (al finalizar cada curso)",
    "Evaluación de satisfacción del participante",
    "Evaluación de transferencia al puesto (30 días después)",
    "Medición de indicadores de impacto"
  ],
  "indicadoresExito": [
    {
      "indicador": "Cumplimiento del programa",
      "meta": "90% de cursos impartidos según calendario"
    },
    {
      "indicador": "Asistencia",
      "meta": "95% de asistencia por curso"
    },
    {
      "indicador": "Aprobación",
      "meta": "85% de participantes aprobados"
    },
    {
      "indicador": "Satisfacción",
      "meta": "Calificación promedio ≥ 4.0 / 5.0"
    },
    {
      "indicador": "Aplicación en el puesto",
      "meta": "80% de transferencia de conocimientos"
    }
  ],
  "tematicas": [
    {
      "nombre": "Nombre de la temática consolidada",
      "descripcion": "Descripción general",
      "objetivo": "Objetivo específico",
      "prioridad": "urgente" | "alta" | "media" | "baja",
      "temas": ["Tema 1", "Tema 2"],
      "actividades": [
        {
          "topico": "Nombre del tópico",
          "tipo": "curso" | "taller" | "workshop" | "mentoria",
          "descripcion": "Descripción detallada",
          "duracion": "4 horas",
          "modalidad": "presencial" | "virtual" | "hibrida",
          "prioridad": "urgente" | "alta" | "media" | "baja",
      "responsable": "Quién coordina",
          "recursosNecesarios": ["Recurso 1"]
        }
      ]
    }
  ],
  "cronograma": [
    {
      "actividad": "0",
      "fechaInicio": "2025-02",
      "fechaFin": "2025-03",
      "estado": "planificado"
    }
    // IMPORTANTE: El cronograma debe incluir TODAS las capacitaciones del programaCapacitacion
    // Distribuye las fechas a lo largo del año (Enero-Diciembre)
    // NO omitas esta sección - es obligatoria
  ],
  "recursos": [
    {
      "tipo": "humano" | "material" | "presupuesto" | "infraestructura" | "tecnologico",
      "descripcion": "Descripción",
      "cantidad": "2 personas" | "Q5,000",
      "disponible": true | false
    }
  ],
  "metricasExito": [
    {
      "nombre": "Nombre de la métrica",
      "tipo": "cuantitativa" | "cualitativa",
      "valorObjetivo": "80%",
      "metodoMedicion": "Cómo se medirá",
      "plazo": "3 meses"
    }
  ],
  "estrategiaImplementacion": "Texto descriptivo de 3-5 oraciones"
}

INSTRUCCIONES CRÍTICAS PARA GENERAR UN PLAN PROFESIONAL:

1. INFORMACIÓN GENERAL:
   - Usa los datos del contexto proporcionado (área, colaboradores, período)
   - El responsable debe ser el jefe de la unidad o "Gerencia de Recursos Humanos"
   - La fecha de elaboración debe ser la fecha actual

2. JUSTIFICACIÓN:
   - Basada en las brechas identificadas y el resumen ejecutivo
   - Menciona la evaluación de desempeño y necesidades detectadas
   - Conecta con los objetivos estratégicos organizacionales

3. OBJETIVOS (OBLIGATORIO - NO OMITIR):
   - Objetivo General: Una oración clara que englobe todo el plan (OBLIGATORIO)
   - Objetivos Específicos: 4-6 objetivos medibles y alcanzables (OBLIGATORIO - mínimo 4)
   - Deben estar alineados con los tópicos identificados
   - NO omitas esta sección - es crítica para el plan

4. DETECCIÓN DE NECESIDADES:
   - Lista 4-6 fuentes de identificación de necesidades
   - Incluye evaluación de desempeño, encuestas, entrevistas, análisis de brechas, normativas

5. PROGRAMA DE CAPACITACIÓN (TABLA PRINCIPAL - CRÍTICO):
   - Genera una tabla con TODAS las capacitaciones identificadas (NO solo 2-3, debe incluir todas las necesarias)
   - Agrupa tópicos similares en capacitaciones consolidadas cuando sea posible
   - Cada capacitación debe tener: nombre, objetivo, participantes (ESPECÍFICOS), modalidad, duración, fecha, instructor
   - Las fechas deben distribuirse a lo largo del año (Enero-Diciembre) - NO todas en el mismo mes
   - Para instructor, usa "RRHH Interno" o "Solicitar capacitación a RRHH" para recursos internos
   - INCLUYE TODOS los tópicos urgentes y de alta prioridad (100% de completitud)
   - INCLUYE la mayoría de tópicos de media prioridad (mínimo 80%)
   - El campo "temas" debe listar los tópicos específicos incluidos en cada capacitación
   - El campo "participantes" DEBE ser específico (niveles/cargos) a menos que realmente sea >= 95% del equipo
   - NO generes solo 2-3 capacitaciones - el plan debe ser completo y cubrir todo el año

6. METODOLOGÍA:
   - Describe las modalidades: presencial, virtual, mixta
   - Explica cómo se implementarán (sala de capacitación, plataformas, etc.)

7. EVALUACIÓN Y SEGUIMIENTO:
   - Lista 4-5 mecanismos de evaluación
   - Incluye evaluación diagnóstica, de conocimientos, satisfacción, transferencia, impacto

8. INDICADORES DE ÉXITO:
   - Define 5-6 indicadores con metas específicas y medibles
   - Incluye: cumplimiento, asistencia, aprobación, satisfacción, aplicación

9. COMPLETITUD:
   - El programaCapacitacion debe incluir TODOS los tópicos relevantes
   - No omitas tópicos importantes
   - Agrupa inteligentemente pero asegura que nada quede fuera

10. FORMATO PROFESIONAL:
    - El plan debe leerse como un documento ejecutivo formal
    - Estructura clara y profesional
    - Información completa y accionable

Responde ÚNICAMENTE con el JSON, sin texto adicional.`;
}

/**
 * Construye el user prompt con datos específicos del plan
 */
function buildUserPrompt(planData: GenerateTrainingPlanRequest["planData"]): string {
  let prompt = "CONTEXTO DE LA UNIDAD:\n\n";
  
  // Validar y usar valores por defecto si es necesario
  const metadata = planData.metadata || {};
  const contexto = planData.contexto || {};
  
  prompt += `PERÍODO: ${metadata.periodoNombre || 'No especificado'}\n`;
  prompt += `TOTAL COLABORADORES EN LA UNIDAD: ${contexto.totalColaboradores || 0}\n`;
  prompt += `EVALUACIONES COMPLETADAS: ${contexto.evaluacionesCompletadas || 0} (${contexto.tasaCompletitud || 0}%)\n`;
  prompt += `PROMEDIO DESEMPEÑO UNIDAD: ${contexto.promedioDesempenoUnidad || 0}%\n`;
  prompt += `PROMEDIO DESEMPEÑO ORGANIZACIONAL: ${contexto.promedioDesempenoOrg || 0}%\n\n`;
  
  prompt += `IMPORTANTE: El equipo tiene ${contexto.totalColaboradores || 0} colaboradores en total. `;
  prompt += `Esta unidad organizacional puede tener DIFERENTES ÁREAS y DEPARTAMENTOS con necesidades distintas. `;
  prompt += `Analiza la información completa de cada tópico (frecuencia, niveles, cargos, colaboradores específicos, áreas) para determinar quién realmente necesita cada capacitación. `;
  prompt += `Sé específico y preciso - usa "Todo el equipo completo" solo cuando realmente aplica a casi todos (>= 95%). `;
  prompt += `Si la frecuencia es menor, especifica exactamente quién necesita la capacitación usando niveles, cargos y áreas mencionadas en los datos.\n\n`;
  
  // Agregar información sobre estructura organizacional si está disponible
  // Esto se puede calcular desde los tópicos agrupando por área
  const areasUnicas = new Set<string>();
  const departamentosUnicos = new Set<string>();
  if (Array.isArray(planData.todosLosTopicos)) {
    planData.todosLosTopicos.forEach((topico: any) => {
      if (Array.isArray(topico.colaboradoresInfo)) {
        topico.colaboradoresInfo.forEach((colab: any) => {
          if (colab.area) areasUnicas.add(colab.area);
          if (colab.departamento) departamentosUnicos.add(colab.departamento);
        });
      }
    });
  }
  
  if (areasUnicas.size > 0 || departamentosUnicos.size > 0) {
    prompt += `ESTRUCTURA ORGANIZACIONAL DE LA UNIDAD:\n`;
    if (areasUnicas.size > 0) {
      prompt += `- Áreas identificadas: ${Array.from(areasUnicas).join(", ")}\n`;
    }
    if (departamentosUnicos.size > 0) {
      prompt += `- Departamentos identificados: ${Array.from(departamentosUnicos).join(", ")}\n`;
    }
    prompt += `IMPORTANTE: Considera que diferentes áreas/departamentos pueden tener necesidades diferentes. `;
    prompt += `No asumas que todos necesitan las mismas capacitaciones. Analiza los colaboradores específicos por área.\n\n`;
  }


  // RESUMEN EJECUTIVO (prioritario)
  prompt += "RESUMEN EJECUTIVO:\n";
  if (planData.resumenEjecutivo) {
    prompt += `${planData.resumenEjecutivo.situacionGeneral || 'Situación general no especificada'}\n`;
  if (planData.resumenEjecutivo.dimensionMasCritica) {
    prompt += `Dimensión más crítica: ${planData.resumenEjecutivo.dimensionMasCritica}\n`;
  }
    prompt += `Recomendación: ${planData.resumenEjecutivo.recomendacionGeneral || 'Recomendación no especificada'}\n\n`;
  } else {
    prompt += "Resumen ejecutivo no disponible.\n\n";
  }

  // BRECHAS POR DIMENSIÓN
  if (Array.isArray(planData.brechasDimensiones) && planData.brechasDimensiones.length > 0) {
    prompt += "BRECHAS POR DIMENSIÓN:\n";
    planData.brechasDimensiones.forEach(b => {
      if (!b || typeof b !== 'object') return; // Saltar elementos inválidos
      const dimensionNombre = b.dimensionNombre || 'Sin nombre';
      const promedioUnidad = typeof b.promedioUnidad === 'number' ? b.promedioUnidad : 0;
      const promedioOrg = typeof b.promedioOrg === 'number' ? b.promedioOrg : 0;
      const zScore = typeof b.zScore === 'number' ? b.zScore.toFixed(2) : '0.00';
      const prioridad = b.prioridad || 'media';
      const colaboradoresDebiles = typeof b.colaboradoresDebiles === 'number' ? b.colaboradoresDebiles : 0;
      const porcentajeDebiles = typeof b.porcentajeDebiles === 'number' ? b.porcentajeDebiles : 0;
      
      prompt += `- ${dimensionNombre}: Unidad ${promedioUnidad}% vs Org ${promedioOrg}% (Z-Score: ${zScore}, Prioridad: ${prioridad})\n`;
      prompt += `  Colaboradores con debilidad: ${colaboradoresDebiles} (${porcentajeDebiles}%)\n`;
    });
    prompt += "\n";
  }

  // TEMÁTICAS PRE-AGRUPADAS (con participantes ya calculados)
  const tematicasPreAgrupadas = Array.isArray(planData.tematicasPreAgrupadas) && planData.tematicasPreAgrupadas.length > 0
    ? planData.tematicasPreAgrupadas
    : [];
  
  if (tematicasPreAgrupadas.length > 0) {
    prompt += "═══════════════════════════════════════════════════════════════\n";
    prompt += "TEMÁTICAS PRE-AGRUPADAS (REFERENCIA OPCIONAL)\n";
    prompt += "═══════════════════════════════════════════════════════════════\n\n";
    
    prompt += `NOTA: Se te están enviando ${tematicasPreAgrupadas.length} temáticas que fueron pre-agrupadas como referencia.\n`;
    prompt += `Puedes usarlas como guía o re-analizarlas según tu criterio profesional.\n`;
    prompt += `Tienes libertad para ajustar, re-agrupar o crear nuevas temáticas basándote en tu análisis experto.\n\n`;
    
    tematicasPreAgrupadas.forEach((tematica, idx) => {
      if (!tematica || typeof tematica !== 'object') return;
      prompt += `${idx + 1}. ${tematica.nombre || 'Sin nombre'}\n`;
      prompt += `   - Tópicos incluidos: ${Array.isArray(tematica.topicosIncluidos) ? tematica.topicosIncluidos.join(", ") : 'N/A'}\n`;
      prompt += `   - Participantes sugeridos: ${tematica.participantesDescripcion || 'N/A'} (puedes ajustar según tu análisis)\n`;
      prompt += `   - Frecuencia: ${tematica.frecuenciaCombinada || 0} colaboradores (${tematica.frecuenciaPorcentual || 0}% del equipo)\n`;
      prompt += `   - Prioridad: ${tematica.prioridad || 'media'}\n`;
      prompt += `   - Categoría: ${tematica.categoria || 'Sin categoría'}\n`;
      if (Array.isArray(tematica.niveles) && tematica.niveles.length > 0) {
        prompt += `   - Niveles: `;
        const nivelesStr = tematica.niveles.map(n => `${n.nivel} (${n.cantidad})`).join(", ");
        prompt += `${nivelesStr}\n`;
      }
      if (Array.isArray(tematica.dimensionesRelacionadas) && tematica.dimensionesRelacionadas.length > 0) {
        prompt += `   - Dimensiones: ${tematica.dimensionesRelacionadas.join(", ")}\n`;
      }
      prompt += "\n";
    });
    
    prompt += "\n";
  }

  // TÓPICOS INDIVIDUALES - Agrupar por área para mejor presentación
  const topicosParaProcesar = Array.isArray(planData.todosLosTopicos) && planData.todosLosTopicos.length > 0
    ? planData.todosLosTopicos
    : [];
  
  if (topicosParaProcesar.length > 0) {
    // Agrupar tópicos por área para mejor organización
    const topicosPorArea = new Map<string, any[]>();
    topicosParaProcesar.forEach((topico: any) => {
      // Obtener áreas de los colaboradores de este tópico
      const areasDelTopico = new Set<string>();
      if (Array.isArray(topico.colaboradoresInfo)) {
        topico.colaboradoresInfo.forEach((colab: any) => {
          if (colab.area) areasDelTopico.add(colab.area);
          if (colab.departamento) areasDelTopico.add(colab.departamento);
        });
      }
      
      // Si tiene áreas específicas, agrupar por la primera área
      // Si no tiene áreas o tiene múltiples, poner en "General"
      const areaPrincipal = areasDelTopico.size > 0 
        ? Array.from(areasDelTopico)[0] 
        : 'General';
      
      if (!topicosPorArea.has(areaPrincipal)) {
        topicosPorArea.set(areaPrincipal, []);
      }
      topicosPorArea.get(areaPrincipal)!.push(topico);
    });
    
    prompt += "═══════════════════════════════════════════════════════════════\n";
    prompt += "TÓPICOS DE CAPACITACIÓN (ORGANIZADOS POR ÁREA)\n";
    prompt += "═══════════════════════════════════════════════════════════════\n\n";
    
    prompt += `IMPORTANTE: Se te están enviando ${topicosParaProcesar.length} tópicos de capacitación con TODA su información.\n`;
    prompt += `Los tópicos están organizados por área para ayudarte a entender la estructura organizacional.\n`;
    prompt += `TU TAREA es analizar LIBREMENTE todos estos tópicos y crear un plan completo y profesional:\n`;
    prompt += `  - Analiza las relaciones, sinergias y patrones entre tópicos\n`;
    prompt += `  - Considera que diferentes áreas pueden tener necesidades diferentes\n`;
    prompt += `  - Agrupa estratégicamente cuando tenga sentido o créalos individuales si son únicos\n`;
    prompt += `  - Determina los participantes basándote en la información de frecuencia, niveles, cargos Y ÁREAS\n`;
    prompt += `  - NO DEJES NINGÚN TÓPICO FUERA del plan, especialmente los urgentes y de alta prioridad\n`;
    prompt += `  - Usa tu criterio profesional para crear el mejor plan posible\n\n`;
    
    if (planData.estadisticas) {
      // Calcular estadísticas por categoría
      const topicosPorCategoria = new Map<string, { total: number; urgentes: number; altos: number }>();
      topicosParaProcesar.forEach((t: any) => {
        if (!t || !t.topico) return;
        const categoria = t.categoria || 'Sin categoría';
        if (!topicosPorCategoria.has(categoria)) {
          topicosPorCategoria.set(categoria, { total: 0, urgentes: 0, altos: 0 });
        }
        const stats = topicosPorCategoria.get(categoria)!;
        stats.total++;
        if (t.prioridad === 'urgente') stats.urgentes++;
        if (t.prioridad === 'alta') stats.altos++;
      });
      
      prompt += `CONTEXTO ESTADÍSTICO:\n`;
      prompt += `- Total de tópicos: ${planData.estadisticas.totalTopicos || 0}\n`;
      prompt += `- Tópicos urgentes: ${planData.estadisticas.topicosUrgentes || 0}\n`;
      prompt += `- Tópicos de alta prioridad: ${planData.estadisticas.topicosAltos || 0}\n`;
      if (Array.isArray(planData.estadisticas.categorias) && planData.estadisticas.categorias.length > 0) {
        prompt += `- Categorías identificadas: ${planData.estadisticas.categorias.join(", ")}\n`;
      }
      if (Array.isArray(planData.estadisticas.dimensionesUnicas) && planData.estadisticas.dimensionesUnicas.length > 0) {
        prompt += `- Dimensiones relacionadas: ${planData.estadisticas.dimensionesUnicas.join(", ")}\n`;
      }
      
      // Agregar estadísticas por categoría
      if (topicosPorCategoria.size > 0) {
        prompt += `\nESTADÍSTICAS POR CATEGORÍA (IMPORTANTE - DEBES INCLUIR TÓPICOS DE TODAS LAS CATEGORÍAS):\n`;
        topicosPorCategoria.forEach((stats, categoria) => {
          prompt += `- ${categoria}: ${stats.total} tópicos (${stats.urgentes} urgentes, ${stats.altos} alta prioridad)\n`;
        });
        prompt += `⚠️ CRÍTICO: El plan debe incluir tópicos de TODAS estas categorías. NO omitas categorías completas.\n`;
        prompt += `Si hay tópicos técnicos, normativos o específicos urgentes/alta prioridad, DEBEN aparecer en el plan.\n`;
      }
      
      prompt += "\n";
    }
    
    // Presentar tópicos agrupados por área
    topicosPorArea.forEach((topicosArea, area) => {
      prompt += `\n═══════════════════════════════════════════════════════════════\n`;
      prompt += `ÁREA: ${area} (${topicosArea.length} tópico${topicosArea.length > 1 ? 's' : ''})\n`;
      prompt += `═══════════════════════════════════════════════════════════════\n\n`;
      
      // Agrupar por prioridad dentro de cada área
      const porPrioridad: Record<string, any[]> = {
        urgente: [],
        alta: [],
        media: [],
        baja: [],
      };
      
      topicosArea.forEach((t: any) => {
        if (!t || typeof t !== 'object') return;
        const prioridad = (t.prioridad || 'media').toLowerCase();
        if (porPrioridad[prioridad]) {
          porPrioridad[prioridad].push(t);
        }
      });
      
      ['urgente', 'alta', 'media', 'baja'].forEach(prioridad => {
        if (Array.isArray(porPrioridad[prioridad]) && porPrioridad[prioridad].length > 0) {
        prompt += `\n${prioridad.toUpperCase()} PRIORIDAD (${porPrioridad[prioridad].length} tópicos):\n`;
        porPrioridad[prioridad].forEach((topico, idx) => {
          if (!topico || typeof topico !== 'object') return; // Saltar elementos inválidos
          prompt += `${idx + 1}. ${topico.topico || 'Sin nombre'}\n`;
          prompt += `   - Categoría: ${topico.categoria || 'Sin categoría'}\n`;
          prompt += `   - Frecuencia: ${topico.frecuenciaAbsoluta || 0} colaboradores (${topico.frecuenciaPorcentual || 0}% del equipo)\n`;
          
          // Información detallada de participantes
          if (Array.isArray(topico.niveles) && topico.niveles.length > 0) {
            prompt += `   - Niveles que lo necesitan:\n`;
            topico.niveles.forEach((nivel: any) => {
              if (nivel && typeof nivel === 'object') {
                prompt += `     * Nivel ${nivel.nivel}: ${nivel.cantidad || 0} colaborador(es)`;
                if (Array.isArray(nivel.cargos) && nivel.cargos.length > 0) {
                  prompt += ` (cargos: ${nivel.cargos.join(", ")})`;
                }
                prompt += `\n`;
              }
            });
          }
          
          if (Array.isArray(topico.categoriasPuesto) && topico.categoriasPuesto.length > 0) {
            prompt += `   - Categorías de puesto: ${topico.categoriasPuesto.join(", ")}\n`;
          }
          
          // Información detallada de colaboradores específicos (NUEVO)
          if (Array.isArray(topico.colaboradoresInfo) && topico.colaboradoresInfo.length > 0) {
            prompt += `   - Colaboradores específicos que necesitan este tópico:\n`;
            
            // Agrupar por área/departamento para mejor visualización
            const porArea = new Map<string, Array<{ nombre?: string; nivel: string; cargo: string; area?: string; departamento?: string }>>();
            topico.colaboradoresInfo.forEach((colab: any) => {
              const area = colab.area || colab.departamento || 'Sin área específica';
              if (!porArea.has(area)) {
                porArea.set(area, []);
              }
              porArea.get(area)!.push(colab);
            });
            
            porArea.forEach((colaboradores, area) => {
              prompt += `     * Área/Departamento: ${area} (${colaboradores.length} persona${colaboradores.length > 1 ? 's' : ''}):\n`;
              colaboradores.forEach((colab: any) => {
                const nombre = colab.nombre || `ID: ${colab.id}`;
                prompt += `       - ${nombre} (${colab.nivel}, ${colab.cargo})\n`;
              });
            });
          }
          
          // Instrucción específica sobre participantes (REFORZADA)
          const frecuenciaPorcentual = typeof topico.frecuenciaPorcentual === 'number' ? topico.frecuenciaPorcentual : 0;
          prompt += `   - ⚠️ INSTRUCCIÓN PARTICIPANTES (CRÍTICO): `;
          if (frecuenciaPorcentual >= 95) {
            prompt += `Este tópico aplica a casi todo el equipo (${frecuenciaPorcentual}%). Puedes usar "Todo el equipo completo" o ser más específico según los niveles/cargos mencionados.\n`;
          } else {
            prompt += `❌❌❌ ESTE TÓPICO NO APLICA A TODO EL EQUIPO (solo ${frecuenciaPorcentual}%). `;
            prompt += `DEBES especificar los participantes EXACTOS usando los niveles, cargos y nombres mencionados arriba. `;
            prompt += `NUNCA uses "Todo el equipo completo" para este tópico. `;
            prompt += `Ejemplo correcto: "Técnicos de Planificación (3 personas: [nombres])" o "Auxiliar y Asistente (2 personas: [nombres])".\n`;
          }
          
          if (typeof topico.scorePrioridad === 'number') {
            prompt += `   - Score de prioridad: ${topico.scorePrioridad.toFixed(2)}\n`;
          }
          if (Array.isArray(topico.dimensionesRelacionadas) && topico.dimensionesRelacionadas.length > 0) {
            prompt += `   - Dimensiones: ${topico.dimensionesRelacionadas.join(", ")}\n`;
          }
          if (Array.isArray(topico.fuentes) && topico.fuentes.length > 0) {
            prompt += `   - Fuentes: ${topico.fuentes.join(", ")}\n`;
          }
          prompt += "\n";
        });
      }
      });
      
      prompt += "\n";
    });
    
    prompt += "\n";
  } else {
    prompt += "⚠️ ADVERTENCIA: No se encontraron tópicos de capacitación para procesar.\n\n";
  }

  prompt += "═══════════════════════════════════════════════════════════════\n";
  prompt += "INSTRUCCIONES PARA GENERAR EL PLAN DE ALTO NIVEL\n";
  prompt += "═══════════════════════════════════════════════════════════════\n\n";
  
  prompt += "CRÍTICO: Debes generar un PLAN ESTRUCTURADO EN FORMATO TABLA, COMPLETO y PROFESIONAL.\n\n";
  
  prompt += "⚠️ ERRORES COMUNES A EVITAR (CRÍTICO):\n";
  prompt += "   - ❌ NO generar solo 2-3 capacitaciones - esto es INADECUADO para un plan anual completo\n";
  prompt += "   - ❌❌❌ CRÍTICO: NO usar 'Todo el equipo completo' cuando la frecuencia es < 95%. Si la frecuencia es 37.5%, 25%, 12.5%, etc., DEBES especificar los participantes exactos usando los niveles, cargos y nombres proporcionados\n";
  prompt += "   - ❌ NO usar 'Todo el equipo completo' para capacitaciones técnicas específicas (ej: Revit para técnicos, Código Municipal para coordinadores)\n";
  prompt += "   - ❌ NO omitir objetivos (objetivoGeneral y objetivosEspecificos son OBLIGATORIOS)\n";
  prompt += "   - ❌ NO omitir cronograma (debe incluir todas las capacitaciones distribuidas en los 12 meses)\n";
  prompt += "   - ❌ NO generar planes incompletos - debe cubrir todos los tópicos urgentes y de alta prioridad\n";
  prompt += "   - ❌ NO ignorar que una unidad puede tener diferentes áreas con necesidades diferentes\n";
  prompt += "   - ❌ NO ignorar las instrucciones específicas de participantes que se proporcionan para cada tópico\n\n";
  
  prompt += "✅ REQUISITOS MÍNIMOS DE CALIDAD:\n";
  prompt += "   - Para 20-30 personas: MÍNIMO 8-12 temáticas con 15-25 actividades distribuidas en el año\n";
  prompt += "   - Cada temática debe tener 2-5 actividades específicas\n";
  prompt += "   - Las capacitaciones deben distribuirse a lo largo de los 12 meses (no todas en el mismo mes)\n";
  prompt += "   - ⚠️ CRÍTICO: Los participantes deben ser ESPECÍFICOS (niveles, cargos, áreas, nombres) a menos que realmente sea >= 95% del equipo\n";
  prompt += "   - Si la frecuencia es < 95%, OBLIGATORIO usar la información de colaboradores específicos proporcionada para cada tópico\n";
  prompt += "   - NO uses 'Todo el equipo completo' como default - solo úsalo cuando realmente aplica a casi todos (>= 95%)\n\n";
  
  prompt += "REQUISITOS CRÍTICOS:\n\n";
  
  prompt += "1. ANÁLISIS Y AGRUPAMIENTO INTELIGENTE (LIBERTAD TOTAL):\n";
  prompt += "   - Tienes TODA la información de cada tópico: frecuencia, niveles, cargos, colaboradores, prioridad, categorías\n";
  prompt += "   - Analiza LIBREMENTE todos los tópicos y decide cómo agruparlos estratégicamente\n";
  prompt += "   - Identifica relaciones semánticas, sinergias y patrones entre tópicos\n";
  prompt += "   - Agrupa cuando tenga sentido (tópicos relacionados, participantes similares) o créalos individuales si son únicos\n";
  prompt += "   - Al agrupar tópicos, calcula la frecuencia combinada basándote en colaboradores ÚNICOS, no sumes frecuencias\n";
  prompt += "   - Usa tu criterio profesional para crear el mejor plan posible\n\n";
  
  prompt += "2. COMPLETITUD Y MEJORAMIENTO DE LA UNIDAD (OBJETIVO PRINCIPAL):\n";
  prompt += "   - ⚠️⚠️⚠️ ESTE PLAN ES PARA MEJORAMIENTO DE LA UNIDAD - si omites tópicos importantes, el plan falla en su objetivo\n";
  prompt += "   - Analiza TODOS los tópicos proporcionados y determina cómo incluirlos TODOS en el plan\n";
  prompt += "   - OBLIGATORIO incluir:\n";
  prompt += "     * TODOS los tópicos urgentes (100% - sin excepciones)\n";
  prompt += "     * TODOS los tópicos de alta prioridad (100% - sin excepciones)\n";
  prompt += "     * La mayoría de tópicos de media prioridad (mínimo 80%)\n";
  prompt += "   - ⚠️⚠️⚠️ BALANCE DE CATEGORÍAS (CRÍTICO):\n";
  prompt += "     * Los tópicos técnicos, normativos y específicos son TAN IMPORTANTES como las habilidades blandas\n";
  prompt += "     * Técnicos: Revit, Excel avanzado, herramientas específicas, software, estación total, etc.\n";
  prompt += "     * Normativos: Código Municipal, Ley de Tránsito, normativas sectoriales, procedimientos, etc.\n";
  prompt += "     * Específicos: manejo de sonido, piano, estación total, etc.\n";
  prompt += "     * Herramientas: Excel, software de diseño, sistemas de gestión, etc.\n";
  prompt += "     * Soft Skills: comunicación, trabajo en equipo, atención al cliente, etc.\n";
  prompt += "     * NO priorices solo habilidades blandas - un plan completo debe cubrir TODAS las áreas de competencia\n";
  prompt += "     * Si hay tópicos técnicos urgentes/alta prioridad, DEBEN aparecer en el plan\n";
  prompt += "     * Si hay tópicos normativos urgentes/alta prioridad, DEBEN aparecer en el plan\n";
  prompt += "     * Si hay tópicos específicos urgentes/alta prioridad, DEBEN aparecer en el plan\n";
  prompt += "   - ⚠️⚠️⚠️ REGLA CRÍTICA DE AGRUPAMIENTO - EVITA DUPLICACIÓN:\n";
  prompt += "     * ANTES de crear una nueva temática, REVISA si ya existe una temática con:\n";
  prompt += "       - Participantes compartidos (mismo colaborador o cargo)\n";
  prompt += "       - Tópicos relacionados o similares\n";
  prompt += "     * Si encuentras solapamiento, AGRUPA en la temática existente en lugar de crear una nueva\n";
  prompt += "     * NUNCA dupliques un tópico en múltiples temáticas - cada tópico debe aparecer SOLO UNA VEZ\n";
  prompt += "     * Si un colaborador necesita múltiples tópicos relacionados, inclúyelos TODOS en la misma temática\n";
  prompt += "     * Ejemplo CORRECTO: Si 'Encargado de Transporte' necesita 'Ley de Tránsito', 'Seguridad Vial' y 'Normativa Municipal', créalos TODOS en UNA sola temática\n";
  prompt += "     * Ejemplo INCORRECTO: Crear 'Normativa Municipal y Ley de Tránsito' para Transporte, y luego 'Seguridad Vial y Ley de Tránsito' para el mismo Transporte (duplica 'Ley de Tránsito')\n";
  prompt += "   - Si un tópico es urgente/alta prioridad pero muy específico (1-2 participantes), créale una temática específica\n";
  prompt += "     Ejemplo: Si 'piano' es urgente para 1 persona, créale una temática 'Capacitación en Piano' para esa persona\n";
  prompt += "   - El agrupamiento inteligente es para:\n";
  prompt += "     * Facilitar la ejecución (mismo grupo, misma fecha)\n";
  prompt += "     * Evitar duplicación (mismo tópico, mismo colaborador)\n";
  prompt += "     * NO para ocultar o filtrar tópicos importantes\n";
  prompt += "   - Para un equipo de 20-30 personas, genera 8-20 temáticas que cubran TODOS los tópicos importantes\n";
  prompt += "   - El plan debe ser COMPLETO (todos los tópicos importantes) Y EJECUTABLE (agrupado inteligentemente)\n";
  prompt += "   - Considera que diferentes áreas dentro de la unidad tienen necesidades diferentes - agrupa por área cuando sea relevante\n";
  prompt += "   - ⚠️ NO generes solo 2-3 capacitaciones - esto es INADECUADO para un plan anual completo\n";
  prompt += "   - ⚠️ El programaCapacitacion debe tener MÚLTIPLES entradas distribuidas a lo largo de los 12 meses del año\n";
  prompt += "   - ⚠️ Considera que una unidad organizacional tiene DIFERENTES ÁREAS y ROLES - no todos necesitan las mismas capacitaciones\n";
  prompt += "   - ⚠️ Si hay directores de diferentes áreas, NO uses 'Todo el equipo completo' para capacitaciones técnicas específicas\n\n";
  
  prompt += "3. ESTRUCTURACIÓN PROFESIONAL Y EJECUTABLE:\n";
  prompt += "   - Temáticas estratégicas y de alto nivel (ej: 'Liderazgo y Gestión', 'Competencias Técnicas', etc.)\n";
  prompt += "   - Cada temática con objetivo específico y medible\n";
  prompt += "   - 2-5 actividades concretas por temática priorizada\n";
  prompt += "   - DISTRIBUYE las capacitaciones a lo largo de los 12 meses del año (no todas en el mismo mes)\n";
  prompt += "   - ⚠️⚠️⚠️ VALIDACIÓN FINAL ANTES DE CREAR CADA TEMÁTICA:\n";
  prompt += "     * ANTES de crear una nueva temática, verifica:\n";
  prompt += "       1. ¿Ya existe una temática con participantes similares o compartidos?\n";
  prompt += "       2. ¿Los tópicos que quieres incluir son relacionados a tópicos ya incluidos en otra temática?\n";
  prompt += "       3. ¿Hay solapamiento significativo de participantes (mismo colaborador o cargo)?\n";
  prompt += "     * Si la respuesta es SÍ a cualquiera de estas preguntas, AGRUPA en la temática existente\n";
  prompt += "     * NO crees temáticas separadas para el mismo colaborador con tópicos relacionados\n";
  prompt += "     * Ejemplo: Si 'Encargado de Transporte' necesita 'Ley de Tránsito', 'Seguridad Vial' y 'Normativa Municipal', créalos TODOS en UNA temática\n";
  prompt += "     * Ejemplo INCORRECTO: Crear 'Normativa Municipal y Ley de Tránsito' para Transporte, y luego 'Seguridad Vial y Ley de Tránsito' para el mismo Transporte\n";
  prompt += "   - Considera que diferentes áreas dentro de la unidad pueden tener necesidades diferentes\n";
  prompt += "   - Si hay capacitaciones técnicas específicas (ej: manejo de sonido, herramientas específicas), solo inclúyelas para quienes realmente las necesitan\n";
  prompt += "   - PARTICIPANTES (OBLIGATORIO - NUNCA DEJES VACÍO):\n";
  prompt += "     * ⚠️ CRÍTICO: CADA temática DEBE tener el campo 'participantesRecomendados' especificado - NUNCA lo dejes vacío\n";
  prompt += "     * Al agrupar tópicos en una temática, identifica el conjunto ÚNICO de colaboradores que necesitan CUALQUIERA de los tópicos agrupados\n";
  prompt += "     * Calcula la frecuencia combinada basándote en colaboradores únicos, no en suma de frecuencias individuales\n";
  prompt += "     * Usa la información de niveles, cargos Y NOMBRES de TODOS los tópicos agrupados para describir los participantes\n";
  prompt += "     * ⚠️ IMPORTANTE: Si un colaborador aparece en múltiples tópicos relacionados, inclúyelos TODOS en la misma temática\n";
  prompt += "     * Ejemplos CORRECTOS de descripción de participantes:\n";
  prompt += "       - 'Analistas y Asistentes de nivel A1 (5 personas: [nombres])' - cuando agrupas tópicos que comparten niveles/cargos\n";
  prompt += "       - 'Personal de nivel A1 y A2 con cargo Administrativo (8 personas)' - cuando agrupas por categoría de puesto\n";
  prompt += "       - 'Técnico de Sonido (1 persona: [nombre])' - para tópicos muy específicos con 1-2 participantes\n";
  prompt += "       - 'Encargado de Transporte, Piloto (2 personas: [nombres])' - cuando agrupas tópicos relacionados para estos cargos\n";
  prompt += "       - 'Todo el equipo completo (12 personas)' - SOLO si la frecuencia combinada es >= 95% del equipo total\n";
  prompt += "     * Ejemplos INCORRECTOS (PROHIBIDOS):\n";
  prompt += "       - ❌ Dejar el campo vacío\n";
  prompt += "       - ❌ Usar 'Todos' cuando frecuencia < 95%\n";
  prompt += "       - ❌ Usar descripciones genéricas sin especificar quién\n";
  prompt += "       - ❌ Crear múltiples temáticas con el mismo colaborador y tópicos relacionados\n";
  prompt += "       - ❌ Duplicar un tópico en múltiples temáticas (ej: 'Ley de Tránsito' en dos temáticas diferentes)\n";
  prompt += "     * PREFIERE agrupar tópicos con pocos participantes (< 3) con tópicos relacionados que compartan niveles/cargos similares\n";
  prompt += "     * PERO: Si un tópico importante no puede agruparse naturalmente, inclúyelo como temática separada (aunque tenga 1-2 participantes) antes que dejarlo fuera\n";
  prompt += "     * La completitud es más importante que tener grupos perfectamente grandes - mejor incluir todos los tópicos importantes\n";
  prompt += "   - Cronograma realista de 6-12 meses\n";
  prompt += "   - Métricas de éxito verificables\n\n";
  
  prompt += "4. FORMATO TABLA ESTRUCTURADA:\n";
  prompt += "   - El plan debe leerse como una tabla profesional y ejecutable\n";
  prompt += "   - Temáticas claramente definidas con todos sus componentes\n";
  prompt += "   - Fácil de seguir, implementar y monitorear\n\n";
  
  prompt += "OBJETIVO: Generar un PLAN DE CAPACITACIÓN COMPLETO que incluya TODOS los tópicos relevantes (especialmente urgentes y de alta prioridad) agrupados inteligentemente en temáticas estratégicas de alto nivel.\n";
  prompt += "PRIORIDAD #1: COMPLETITUD - No dejes fuera ningún tópico importante, especialmente urgentes y de alta prioridad.\n";
  prompt += "PRIORIDAD #2: EJECUTABILIDAD - Cuando sea posible, agrupa colaboradores con necesidades similares para facilitar la ejecución práctica.\n";
  prompt += "Si es necesario tener más temáticas para incluir todos los tópicos importantes, hazlo. Mejor tener un plan completo con más temáticas que un plan incompleto con menos temáticas.\n";

  return prompt;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Manejar CORS preflight - DEBE ser lo primero y responder inmediatamente
  if (req.method === "OPTIONS") {
    console.log("📡 OPTIONS request recibida - respondiendo con CORS headers");
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  try {
    // 1. Validar método HTTP
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Método no permitido" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Parsear request body
    let planData: GenerateTrainingPlanRequest["planData"];
    try {
      const body = await req.json();
      planData = body.planData;
    } catch (parseError) {
      return new Response(
        JSON.stringify({ success: false, error: "Error parseando JSON del request" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!planData) {
      return new Response(
        JSON.stringify({ success: false, error: "planData es requerido" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validar estructura de datos
    if (!planData.metadata || !planData.contexto || !planData.resumenEjecutivo) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "planData debe incluir metadata, contexto y resumenEjecutivo" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validar y normalizar todosLosTopicos (debe venir siempre)
    if (!planData.todosLosTopicos || !Array.isArray(planData.todosLosTopicos)) {
      console.warn("todosLosTopicos no es un array válido, inicializando como array vacío");
      planData.todosLosTopicos = [];
    }

    // Validar brechasDimensiones
    if (!planData.brechasDimensiones || !Array.isArray(planData.brechasDimensiones)) {
      console.warn("brechasDimensiones no es un array válido, inicializando como array vacío");
      planData.brechasDimensiones = [];
    }

    // Validar estadisticas (generar si no existen)
    if (!planData.estadisticas || typeof planData.estadisticas !== 'object') {
      console.log("Generando estadísticas por defecto");
      const todosLosTopicosArray = Array.isArray(planData.todosLosTopicos) ? planData.todosLosTopicos : [];
      planData.estadisticas = {
        totalTopicos: todosLosTopicosArray.length,
        topicosUrgentes: todosLosTopicosArray.filter((t: any) => t && t.prioridad === 'urgente').length,
        topicosAltos: todosLosTopicosArray.filter((t: any) => t && t.prioridad === 'alta').length,
        categorias: [...new Set(todosLosTopicosArray.map((t: any) => t?.categoria).filter(Boolean))],
        dimensionesUnicas: [...new Set(todosLosTopicosArray.flatMap((t: any) => {
          if (t && Array.isArray(t.dimensionesRelacionadas)) {
            return t.dimensionesRelacionadas;
          }
          return [];
        }))],
      };
    }

    // Validar que estadisticas tenga las propiedades necesarias
    if (!Array.isArray(planData.estadisticas.categorias)) {
      planData.estadisticas.categorias = [];
    }
    if (!Array.isArray(planData.estadisticas.dimensionesUnicas)) {
      planData.estadisticas.dimensionesUnicas = [];
    }

    // 3. Obtener API key de OpenAI desde variables de entorno
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "OPENAI_API_KEY no configurada en Supabase",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validación final antes de continuar
    if (!Array.isArray(planData.todosLosTopicos)) {
      planData.todosLosTopicos = [];
    }
    if (!Array.isArray(planData.brechasDimensiones)) {
      planData.brechasDimensiones = [];
    }
    if (!planData.estadisticas || typeof planData.estadisticas !== 'object') {
      const todosLosTopicosArray = Array.isArray(planData.todosLosTopicos) ? planData.todosLosTopicos : [];
      planData.estadisticas = {
        totalTopicos: todosLosTopicosArray.length,
        topicosUrgentes: todosLosTopicosArray.filter((t: any) => t && t.prioridad === 'urgente').length,
        topicosAltos: todosLosTopicosArray.filter((t: any) => t && t.prioridad === 'alta').length,
        categorias: [...new Set(todosLosTopicosArray.map((t: any) => t?.categoria).filter(Boolean))],
        dimensionesUnicas: [...new Set(todosLosTopicosArray.flatMap((t: any) => {
          if (t && Array.isArray(t.dimensionesRelacionadas)) {
            return t.dimensionesRelacionadas;
          }
          return [];
        }))],
      };
    }
    if (!Array.isArray(planData.estadisticas.categorias)) {
      planData.estadisticas.categorias = [];
    }
    if (!Array.isArray(planData.estadisticas.dimensionesUnicas)) {
      planData.estadisticas.dimensionesUnicas = [];
    }

    console.log("Llamando a OpenAI API para generar plan de capacitación...");
    console.log(`Datos validados: ${planData.todosLosTopicos?.length || 0} tópicos, ${planData.brechasDimensiones?.length || 0} brechas`);

    // 4. Construir prompts
    let systemPrompt: string;
    let userPrompt: string;
    
    try {
      systemPrompt = getSystemPrompt();
      userPrompt = buildUserPrompt(planData);
      console.log(`Prompts construidos: system=${systemPrompt.length} chars, user=${userPrompt.length} chars`);
    } catch (promptError: any) {
      console.error("Error construyendo prompts:", promptError);
      console.error("Stack trace:", promptError.stack);
      console.error("planData en error:", JSON.stringify({
        todosLosTopicos: planData.todosLosTopicos?.length,
        brechasDimensiones: planData.brechasDimensiones?.length,
        tieneEstadisticas: !!planData.estadisticas,
      }));
      return new Response(
        JSON.stringify({
          success: false,
          error: `Error construyendo prompts: ${promptError.message || "Error desconocido"}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Llamar a OpenAI
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
          max_tokens: 8000,
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
    const planText = openaiData.choices?.[0]?.message?.content;

    if (!planText) {
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

    // 6. Parsear respuesta JSON
    let planEstructurado;
    try {
      planEstructurado = JSON.parse(planText);
      // Agregar fecha de generación
      planEstructurado.fechaGeneracion = new Date().toISOString();
      
      // Completar información general si no viene en la respuesta
      if (!planEstructurado.informacionGeneral) {
        const fechaActual = new Date();
        const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const año = 2026; // Año fijo para el plan de capacitación
        const mesActual = meses[fechaActual.getMonth()];
        const diaActual = fechaActual.getDate();
        const añoActual = fechaActual.getFullYear();
        
        planEstructurado.informacionGeneral = {
          areaDepartamento: planData.metadata?.periodoNombre || "Unidad Organizacional",
          responsable: "Gerencia de Recursos Humanos",
          totalColaboradores: planData.contexto?.totalColaboradores || 0,
          periodo: `Enero - Diciembre ${año}`,
          fechaElaboracion: `${diaActual} de ${mesActual} de ${añoActual}`
        };
      }
      
      // Validar que tenga temáticas (nuevo formato) o actividades (formato legacy)
      if (!planEstructurado.tematicas && !planEstructurado.actividades) {
        console.warn("La respuesta no incluye 'tematicas' ni 'actividades', intentando adaptar...");
        // Si viene con formato antiguo, mantener compatibilidad
        if (planEstructurado.actividades) {
          console.log("Usando formato legacy con actividades individuales");
        }
      }
      
      // Si tiene temáticas, asegurar que cada temática tenga nivelesAplicables
      // PERO NO hardcodear "Todo el equipo completo" - debe venir de la IA o de temáticas pre-agrupadas
      // ADEMÁS: Validar y corregir participantes incorrectos automáticamente
      // Y: Agregar participantes si están vacíos
      if (planEstructurado.tematicas) {
        planEstructurado.tematicas = planEstructurado.tematicas.map((tematica: any) => {
          // Validar y corregir participantes incorrectos O agregar si están vacíos
          const participantesActual = tematica.participantesRecomendados || "";
          const participantesLower = participantesActual.toLowerCase();
          const esTodoElEquipo = participantesLower.includes("todo el equipo") || 
                                participantesLower.includes("todos") ||
                                participantesLower.includes("todo el personal") ||
                                participantesLower.includes("todos los colaboradores");
          const estaVacio = !participantesActual || participantesActual.trim().length === 0;
          
          // Si está vacío O es "Todo el equipo" incorrecto, buscar y construir participantes
          if (estaVacio || esTodoElEquipo) {
            // Buscar en los tópicos individuales para calcular frecuencia real
            const topicosRelacionados = planData.todosLosTopicos?.filter((t: any) => {
              if (!t || !t.topico) return false;
              return tematica.temas?.some((tema: string) => {
                const topicoLower = (t.topico || "").toLowerCase();
                const temaLower = (tema || "").toLowerCase();
                return topicoLower.includes(temaLower) || temaLower.includes(topicoLower);
              });
            }) || [];
            
            if (topicosRelacionados.length > 0) {
              // Calcular frecuencia máxima de los tópicos relacionados
              const maxFrecuencia = Math.max(...topicosRelacionados.map((t: any) => {
                return typeof t.frecuenciaPorcentual === 'number' ? t.frecuenciaPorcentual : 0;
              }));
              
              if (maxFrecuencia < 95 || estaVacio) {
                // Construir descripción específica basada en los tópicos
                const colaboradoresUnicos = new Set<string>();
                const nivelesSet = new Set<string>();
                const cargosSet = new Set<string>();
                const nombresSet = new Set<string>();
                
                topicosRelacionados.forEach((t: any) => {
                  if (Array.isArray(t.colaboradoresInfo)) {
                    t.colaboradoresInfo.forEach((colab: any) => {
                      if (colab.id) colaboradoresUnicos.add(colab.id);
                      if (colab.nombre) nombresSet.add(colab.nombre);
                      if (colab.nivel) nivelesSet.add(colab.nivel);
                      if (colab.cargo) cargosSet.add(colab.cargo);
                    });
                  }
                });
                
                const totalUnicos = colaboradoresUnicos.size > 0 ? colaboradoresUnicos.size : nombresSet.size;
                const niveles = Array.from(nivelesSet);
                const cargos = Array.from(cargosSet);
                const nombres = Array.from(nombresSet);
                
                // Construir descripción específica
                let descripcion = "";
                if (cargos.length > 0 && totalUnicos > 0) {
                  if (nombres.length > 0 && nombres.length <= 5) {
                    descripcion = `${cargos.join(", ")} (${totalUnicos} persona${totalUnicos > 1 ? 's' : ''}: ${nombres.slice(0, 5).join(", ")})`;
                  } else {
                    descripcion = `${cargos.join(", ")} (${totalUnicos} persona${totalUnicos > 1 ? 's' : ''})`;
                  }
                } else if (niveles.length > 0 && totalUnicos > 0) {
                  descripcion = `Personal de nivel ${niveles.join(", ")} (${totalUnicos} persona${totalUnicos > 1 ? 's' : ''})`;
                } else if (totalUnicos > 0) {
                  descripcion = `${totalUnicos} persona${totalUnicos > 1 ? 's' : ''}`;
                } else {
                  // Si no hay información, usar la frecuencia porcentual
                  descripcion = `Personal específico (${maxFrecuencia.toFixed(1)}% del equipo)`;
                }
                
                if (estaVacio) {
                  console.log(`⚠️ AGREGANDO PARTICIPANTES: Temática "${tematica.nombre}" no tenía participantes. Agregando: "${descripcion}"`);
                } else {
                  console.log(`⚠️ CORRECCIÓN AUTOMÁTICA: Temática "${tematica.nombre}" tenía "Todo el equipo completo" pero frecuencia es ${maxFrecuencia.toFixed(1)}%. Corrigiendo a: "${descripcion}"`);
                }
                tematica.participantesRecomendados = descripcion;
              }
            } else if (estaVacio) {
              // Si no se encontraron tópicos relacionados pero está vacío, usar un mensaje genérico
              console.log(`⚠️ ADVERTENCIA: Temática "${tematica.nombre}" no tiene participantes y no se encontraron tópicos relacionados para calcularlos`);
              tematica.participantesRecomendados = "Participantes a determinar según necesidades específicas";
            }
          } else if (estaVacio) {
            // Si está vacío pero no es "Todo el equipo", intentar buscar tópicos relacionados
            const topicosRelacionados = planData.todosLosTopicos?.filter((t: any) => {
              if (!t || !t.topico) return false;
              return tematica.temas?.some((tema: string) => {
                const topicoLower = (t.topico || "").toLowerCase();
                const temaLower = (tema || "").toLowerCase();
                return topicoLower.includes(temaLower) || temaLower.includes(topicoLower);
              });
            }) || [];
            
            if (topicosRelacionados.length > 0) {
              const colaboradoresUnicos = new Set<string>();
              const nivelesSet = new Set<string>();
              const cargosSet = new Set<string>();
              const nombresSet = new Set<string>();
              
              topicosRelacionados.forEach((t: any) => {
                if (Array.isArray(t.colaboradoresInfo)) {
                  t.colaboradoresInfo.forEach((colab: any) => {
                    if (colab.id) colaboradoresUnicos.add(colab.id);
                    if (colab.nombre) nombresSet.add(colab.nombre);
                    if (colab.nivel) nivelesSet.add(colab.nivel);
                    if (colab.cargo) cargosSet.add(colab.cargo);
                  });
                }
              });
              
              const totalUnicos = colaboradoresUnicos.size > 0 ? colaboradoresUnicos.size : nombresSet.size;
              const niveles = Array.from(nivelesSet);
              const cargos = Array.from(cargosSet);
              const nombres = Array.from(nombresSet);
              
              let descripcion = "";
              if (cargos.length > 0 && totalUnicos > 0) {
                if (nombres.length > 0 && nombres.length <= 5) {
                  descripcion = `${cargos.join(", ")} (${totalUnicos} persona${totalUnicos > 1 ? 's' : ''}: ${nombres.slice(0, 5).join(", ")})`;
                } else {
                  descripcion = `${cargos.join(", ")} (${totalUnicos} persona${totalUnicos > 1 ? 's' : ''})`;
                }
              } else if (niveles.length > 0 && totalUnicos > 0) {
                descripcion = `Personal de nivel ${niveles.join(", ")} (${totalUnicos} persona${totalUnicos > 1 ? 's' : ''})`;
              } else if (totalUnicos > 0) {
                descripcion = `${totalUnicos} persona${totalUnicos > 1 ? 's' : ''}`;
              }
              
              if (descripcion) {
                console.log(`⚠️ AGREGANDO PARTICIPANTES: Temática "${tematica.nombre}" no tenía participantes. Agregando: "${descripcion}"`);
                tematica.participantesRecomendados = descripcion;
              }
            }
          }
          
          return {
            ...tematica,
            nivelesAplicables: tematica.nivelesAplicables || [],
            participantesRecomendados: tematica.participantesRecomendados,
          };
        });
      }
      
      // Validar que tenga programaCapacitacion o tematicas
      if (!planEstructurado.programaCapacitacion || planEstructurado.programaCapacitacion.length === 0) {
        if (!planEstructurado.tematicas || planEstructurado.tematicas.length === 0) {
          console.warn("⚠️ El plan generado no tiene programaCapacitacion ni tematicas");
        }
      }
      
      // Validar que tenga objetivos
      if (!planEstructurado.objetivoGeneral && (!planEstructurado.objetivosEspecificos || planEstructurado.objetivosEspecificos.length === 0)) {
        console.warn("⚠️ El plan generado no tiene objetivos definidos");
      }
      
      // Validar que tenga cronograma
      if (!planEstructurado.cronograma || planEstructurado.cronograma.length === 0) {
        console.warn("⚠️ El plan generado no tiene cronograma");
      }
    } catch (parseError) {
      console.error("Error parseando respuesta de OpenAI:", parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error parseando respuesta de OpenAI",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 7. Retornar plan estructurado
    return new Response(
      JSON.stringify({
        success: true,
        plan: planEstructurado,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error en generate-training-plan:", error);
    console.error("Stack trace:", error.stack);
    
    // Mensaje de error más descriptivo
    let errorMessage = "Error desconocido al generar plan de capacitación";
    if (error.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    // Detectar errores específicos
    if (errorMessage.includes('forEach') || errorMessage.includes('undefined')) {
      errorMessage = "Error procesando datos: faltan tópicos de capacitación. Verifica que haya datos en training_topics.";
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: Deno.env.get("DENO_ENV") === 'development' ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

