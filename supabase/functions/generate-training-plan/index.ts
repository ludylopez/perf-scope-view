import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  return `Eres un EXPERTO CONSULTOR en Diseño de Planes de Capacitación Organizacional del sector público guatemalteco, especializado en la gestión municipal. Tu tarea es generar un PLAN DE CAPACITACIÓN ESTRUCTURADO, COMPLETO, PROFESIONAL y ACCIONABLE en formato TABLA para una unidad organizacional de la Municipalidad de Esquipulas, Chiquimula.

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

AGRUPMIENTO INTELIGENTE PARA EJECUTABILIDAD (BALANCEADO CON COMPLETITUD):
- PRIORIDAD #1: COMPLETITUD - Incluye TODOS los tópicos importantes, especialmente urgentes y de alta prioridad
- PRIORIDAD #2: EJECUTABILIDAD - Agrupa inteligentemente cuando sea posible para crear capacitaciones grupales
- PRIORIZA agrupar tópicos que comparten niveles y cargos similares para crear grupos ejecutables
- Si un tópico tiene pocos participantes (< 3), INTENTA agruparlo con tópicos similares que compartan niveles/cargos
- PERO: Si un tópico importante no puede agruparse naturalmente, inclúyelo como temática separada antes que dejarlo fuera
- NO hay límite rígido de temáticas - el objetivo es completitud primero, agrupamiento segundo
- Si es necesario tener más temáticas para incluir todos los tópicos importantes, hazlo

DETERMINACIÓN DE PARTICIPANTES (CRÍTICO):
- Analiza la información de frecuencia, niveles y cargos proporcionada para CADA tópico
- Si frecuenciaPorcentual >= 80%: Puedes considerar "Todo el equipo completo" o ser más específico según los datos
- Si frecuenciaPorcentual < 80%: DEBES especificar participantes exactos usando niveles y cargos proporcionados
- Ejemplos de participantes específicos:
  * "Analistas de nivel A1 (3 personas)"
  * "Personal de nivel A1 y A2 con cargo Asistente (5 personas)"
  * "Personal de categoría Administrativo (8 personas)"
  * "Coordinadores y Supervisores (4 personas)"
- NUNCA uses "Todo el equipo completo" si la frecuencia es menor al 80% a menos que los datos específicos indiquen que realmente aplica a todos
- El campo "participantes" debe reflejar exactamente quién necesita la capacitación basándote en los datos proporcionados

ESTRUCTURA DE RESPUESTA (JSON) - FORMATO PLAN PROFESIONAL ESTRUCTURADO:
{
  "informacionGeneral": {
    "areaDepartamento": "Nombre del área o departamento",
    "responsable": "Nombre del responsable del área",
    "totalColaboradores": 12,
    "periodo": "Enero - Diciembre 2025",
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

3. OBJETIVOS:
   - Objetivo General: Una oración clara que englobe todo el plan
   - Objetivos Específicos: 4-6 objetivos medibles y alcanzables
   - Deben estar alineados con los tópicos identificados

4. DETECCIÓN DE NECESIDADES:
   - Lista 4-6 fuentes de identificación de necesidades
   - Incluye evaluación de desempeño, encuestas, entrevistas, análisis de brechas, normativas

5. PROGRAMA DE CAPACITACIÓN (TABLA PRINCIPAL):
   - Genera una tabla con TODAS las capacitaciones identificadas
   - Agrupa tópicos similares en capacitaciones consolidadas
   - Cada capacitación debe tener: nombre, objetivo, participantes, modalidad, duración, fecha, instructor
   - Las fechas deben distribuirse a lo largo del año (Enero-Diciembre)
   - Para instructor, usa "RRHH Interno" o "Solicitar capacitación a RRHH" para recursos internos
   - INCLUYE TODOS los tópicos urgentes y de alta prioridad
   - El campo "temas" debe listar los tópicos específicos incluidos en cada capacitación

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
  prompt += `Cuando determines los participantes para cada capacitación, usa la información de frecuencia, niveles y cargos proporcionada para cada tópico. `;
  prompt += `Solo usa "Todo el equipo completo" si la frecuencia es >= 80% del total. `;
  prompt += `Si la frecuencia es menor, especifica exactamente quién necesita la capacitación usando niveles y cargos.\n\n`;


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

  // TODOS LOS TÓPICOS INDIVIDUALES - La IA debe agruparlos inteligentemente
  const topicosParaProcesar = Array.isArray(planData.todosLosTopicos) && planData.todosLosTopicos.length > 0
    ? planData.todosLosTopicos
    : [];
  
  if (topicosParaProcesar.length > 0) {
    prompt += "═══════════════════════════════════════════════════════════════\n";
    prompt += "TODOS LOS TÓPICOS DE CAPACITACIÓN (BASE DE DATOS COMPLETA)\n";
    prompt += "═══════════════════════════════════════════════════════════════\n\n";
    
    prompt += `IMPORTANTE: Se te están enviando ${topicosParaProcesar.length} tópicos individuales de capacitación.\n`;
    prompt += `TU TAREA es analizar TODOS estos tópicos y agruparlos estratégicamente en temáticas consolidadas.\n`;
    prompt += `NO DEJES NINGÚN TÓPICO FUERA del plan, especialmente los urgentes y de alta prioridad.\n\n`;
    
    if (planData.estadisticas) {
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
      prompt += "\n";
    }
    
    prompt += "LISTADO COMPLETO DE TÓPICOS (ANALIZAR Y AGRUPAR TODOS):\n\n";
    
    // Agrupar por prioridad para mejor visualización
    const porPrioridad: Record<string, any[]> = {
      urgente: [],
      alta: [],
      media: [],
      baja: [],
    };
    
    // Procesar tópicos (ya validados arriba) - validar cada tópico antes de procesarlo
    if (Array.isArray(topicosParaProcesar)) {
      topicosParaProcesar.forEach((t: any) => {
        if (!t || typeof t !== 'object') return; // Saltar elementos inválidos
        const prioridad = (t.prioridad || 'media').toLowerCase();
        if (porPrioridad[prioridad]) {
          porPrioridad[prioridad].push(t);
        }
      });
    }
    
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
          
          // Instrucción específica sobre participantes
          const frecuenciaPorcentual = typeof topico.frecuenciaPorcentual === 'number' ? topico.frecuenciaPorcentual : 0;
          prompt += `   - INSTRUCCIÓN PARTICIPANTES: `;
          if (frecuenciaPorcentual >= 80) {
            prompt += `Este tópico aplica a la mayoría del equipo (${frecuenciaPorcentual}%). Puedes usar "Todo el equipo completo" o ser más específico según los niveles/cargos mencionados.\n`;
          } else {
            prompt += `Este tópico NO aplica a todo el equipo (solo ${frecuenciaPorcentual}%). DEBES especificar los participantes exactos usando los niveles y cargos mencionados arriba. NO uses "Todo el equipo completo".\n`;
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
  } else {
    prompt += "⚠️ ADVERTENCIA: No se encontraron tópicos de capacitación para procesar.\n\n";
  }

  prompt += "═══════════════════════════════════════════════════════════════\n";
  prompt += "INSTRUCCIONES PARA GENERAR EL PLAN DE ALTO NIVEL\n";
  prompt += "═══════════════════════════════════════════════════════════════\n\n";
  
  prompt += "CRÍTICO: Debes generar un PLAN ESTRUCTURADO EN FORMATO TABLA, COMPLETO y PROFESIONAL.\n\n";
  
  prompt += "REQUISITOS CRÍTICOS:\n\n";
  
  prompt += "1. ANÁLISIS Y AGRUPAMIENTO INTELIGENTE (COMPLETITUD PRIMERO, EJECUTABILIDAD SEGUNDO):\n";
  prompt += "   - PRIORIDAD ABSOLUTA: Analiza TODOS los tópicos del listado (no dejes ninguno fuera, especialmente urgentes y de alta prioridad)\n";
  prompt += "   - Identifica relaciones semánticas, sinergias y patrones entre tópicos\n";
  prompt += "   - Agrupa estratégicamente en temáticas consolidadas de ALTO NIVEL (idealmente 5-10, pero puede ser más si es necesario para completitud)\n";
  prompt += "   - Cada temática debe agrupar tópicos relacionados por significado, no solo por categoría\n";
  prompt += "   - OBJETIVO DUAL:\n";
  prompt += "     a) COMPLETITUD: Incluir TODOS los tópicos importantes (especialmente urgentes y de alta prioridad)\n";
  prompt += "     b) EJECUTABILIDAD: Agrupar cuando sea posible para crear capacitaciones grupales ejecutables\n";
  prompt += "   - PRIORIZA agrupar tópicos que comparten niveles/cargos similares para facilitar la ejecución grupal\n";
  prompt += "   - PERO: Si un tópico importante no puede agruparse naturalmente, créale una temática específica antes que dejarlo fuera\n";
  prompt += "   - El campo 'temas' de cada temática DEBE listar los nombres exactos de los tópicos del input que agrupaste\n";
  prompt += "   - IMPORTANTE: Al agrupar tópicos, calcula la frecuencia combinada basándote en colaboradores ÚNICOS, no sumes frecuencias\n";
  prompt += "     Ejemplo: Si 'Normativa' tiene 2 personas y 'Seguridad Vial' tiene 1 persona, y son las mismas 2 personas,\n";
  prompt += "     la frecuencia combinada es 2 (no 3). Si son personas diferentes, la frecuencia combinada es 3.\n\n";
  
  prompt += "2. COMPLETITUD ABSOLUTA (CRÍTICO - NO COMPROMETAS ESTO):\n";
  prompt += "   - INCLUYE TODOS los tópicos urgentes (100% - NO DEJES NINGUNO FUERA)\n";
  prompt += "   - INCLUYE TODOS los tópicos de alta prioridad (100% - NO DEJES NINGUNO FUERA)\n";
  prompt += "   - INCLUYE la mayoría de tópicos de media prioridad (mínimo 80%, idealmente todos)\n";
  prompt += "   - Si un tópico importante no encaja perfectamente en una temática existente, créale una temática específica antes que dejarlo fuera\n";
  prompt += "   - NO limites el número de temáticas si eso significa dejar fuera tópicos importantes\n";
  prompt += "   - El plan debe ser COMPLETO, no parcial ni resumido\n";
  prompt += "   - MEJOR tener más temáticas completas que menos temáticas incompletas\n\n";
  
  prompt += "3. ESTRUCTURACIÓN PROFESIONAL Y EJECUTABLE:\n";
  prompt += "   - Temáticas estratégicas y de alto nivel (ej: 'Liderazgo y Gestión', 'Competencias Técnicas', etc.)\n";
  prompt += "   - Cada temática con objetivo específico y medible\n";
  prompt += "   - 2-5 actividades concretas por temática priorizada\n";
  prompt += "   - PARTICIPANTES (BALANCE ENTRE EJECUTABILIDAD Y COMPLETITUD):\n";
  prompt += "     * Al agrupar tópicos en una temática, identifica el conjunto ÚNICO de colaboradores que necesitan CUALQUIERA de los tópicos agrupados\n";
  prompt += "     * Calcula la frecuencia combinada basándote en colaboradores únicos, no en suma de frecuencias individuales\n";
  prompt += "     * Usa la información de niveles y cargos de TODOS los tópicos agrupados para describir los participantes\n";
  prompt += "     * Ejemplos de descripción de participantes:\n";
  prompt += "       - 'Analistas y Asistentes de nivel A1 (5 personas)' - cuando agrupas tópicos que comparten niveles/cargos\n";
  prompt += "       - 'Personal de nivel A1 y A2 con cargo Administrativo (8 personas)' - cuando agrupas por categoría de puesto\n";
  prompt += "       - 'Todo el equipo completo (12 personas)' - SOLO si la frecuencia combinada es >= 80% del equipo total\n";
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
  // Manejar CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
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
        const año = fechaActual.getFullYear();
        const mesActual = meses[fechaActual.getMonth()];
        const diaActual = fechaActual.getDate();
        
        planEstructurado.informacionGeneral = {
          areaDepartamento: planData.metadata?.periodoNombre || "Unidad Organizacional",
          responsable: "Gerencia de Recursos Humanos",
          totalColaboradores: planData.contexto?.totalColaboradores || 0,
          periodo: `Enero - Diciembre ${año}`,
          fechaElaboracion: `${diaActual} de ${mesActual} de ${año}`
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
      if (planEstructurado.tematicas) {
        planEstructurado.tematicas = planEstructurado.tematicas.map((tematica: any) => ({
          ...tematica,
          nivelesAplicables: tematica.nivelesAplicables || ["Todos"],
          participantesRecomendados: tematica.participantesRecomendados || "Todo el equipo completo",
        }));
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

