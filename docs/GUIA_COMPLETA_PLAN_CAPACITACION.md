# Guía Completa: Sistema de Generación de Planes de Capacitación

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Flujo Completo de Datos](#flujo-completo-de-datos)
4. [Estructura de Datos](#estructura-de-datos)
5. [Prompts de IA](#prompts-de-ia)
6. [Procesamiento y Visualización](#procesamiento-y-visualización)
7. [Puntos de Extensión](#puntos-de-extensión)

---

## 🎯 Visión General

El sistema de generación de planes de capacitación es una funcionalidad que:

1. **Recopila** tópicos de capacitación de planes de desarrollo individuales
2. **Consolida** estos tópicos con información de colaboradores (niveles, cargos, categorías)
3. **Analiza** brechas de dimensiones y genera un resumen ejecutivo
4. **Envía** toda esta información a una IA (OpenAI GPT-4o-mini) para generar un plan estructurado
5. **Visualiza** el plan generado en formato profesional con múltiples vistas

### Objetivos del Sistema

- ✅ **Completitud**: Incluir TODOS los tópicos importantes (especialmente urgentes y de alta prioridad)
- ✅ **Ejecutabilidad**: Agrupar colaboradores con necesidades similares para crear capacitaciones grupales
- ✅ **Especificidad**: Determinar exactamente quién necesita qué capacitación (no usar "Todos" cuando no aplica)
- ✅ **Profesionalismo**: Generar planes que puedan ejecutarse en el contexto municipal guatemalteco

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  TrainingPlanContent.tsx / TrainingPlanModal.tsx                │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ 1. Solicita plan consolidado
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TRAINING PLAN SERVICE                         │
│              src/lib/trainingPlanService.ts                      │
│                                                                  │
│  • getPlanCapacitacionUnidad()                                  │
│    - Obtiene equipo en cascada                                   │
│    - Consulta training_topics                                    │
│    - Captura IDs de colaboradores por tópico (NUEVO)            │
│    - Calcula brechas de dimensiones                             │
│    - Genera resumen ejecutivo                                   │
│    - Consolida tópicos con información de participantes         │
│                                                                  │
│  • preAgruparTopicos() (NUEVO)                                  │
│    - Agrupa tópicos similares                                    │
│    - Calcula colaboradores únicos por temática                  │
│    - Genera descripción de participantes                        │
│                                                                  │
│  • generateTrainingPlanWithAI()                                  │
│    - Prepara datos para IA                                      │
│    - Pre-agrupa tópicos (NUEVO)                                 │
│    - Invoca Edge Function                                        │
│    - Valida respuesta (NUEVO)                                    │
│    - Parsea respuesta                                            │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ 2. Invoca Edge Function
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE EDGE FUNCTION                        │
│      supabase/functions/generate-training-plan/index.ts          │
│                                                                  │
│  • Recibe planData con temáticas pre-agrupadas (NUEVO)         │
│  • Construye system prompt (optimizado)                         │
│  • Construye user prompt con temáticas pre-agrupadas (NUEVO)   │
│  • Llama a OpenAI API                                           │
│  • Parsea respuesta JSON                                        │
│  • Retorna plan estructurado                                    │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ 3. Llama a OpenAI API
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OPENAI GPT-4o-mini                          │
│                                                                  │
│  • Recibe system prompt (instrucciones generales)                │
│  • Recibe user prompt (temáticas pre-agrupadas + tópicos)        │
│  • Genera plan de capacitación estructurado en JSON             │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ 4. Retorna plan estructurado
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VALIDACIÓN POST-GENERACIÓN (NUEVO)            │
│              src/lib/trainingPlanService.ts                      │
│                                                                  │
│  • validarPlanGenerado()                                        │
│    - Verifica completitud                                       │
│    - Verifica especificidad de participantes                    │
│    - Verifica consistencia con temáticas pre-agrupadas         │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ 5. Plan validado
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND - VISUALIZACIÓN                      │
│                                                                  │
│  • TrainingPlanStructured.tsx - Muestra plan completo             │
│  • TrainingPlanPDF.tsx - Genera PDF del plan                     │
│  • TrainingGapChart.tsx - Visualiza brechas                      │
│  • TrainingPriorityList.tsx - Lista tópicos priorizados          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo Completo de Datos

### Paso 1: Recopilación de Datos (TypeScript)

**Archivo**: `src/lib/trainingPlanService.ts` - Función `getPlanCapacitacionUnidad()`

**Qué hace:**
1. Obtiene el equipo completo en cascada (directos + indirectos)
2. Consulta `training_topics` con información de colaboradores (`users`)
3. Consulta comentarios del jefe (`evaluations.comments`)
4. Consulta solicitudes directas (`open_question_responses`)
5. Calcula brechas por dimensión
6. Genera resumen ejecutivo
7. Consolida tópicos con información de niveles y cargos

**Datos obtenidos de Supabase:**

```typescript
// Tópicos de capacitación
const { data: topicosTraining } = await supabase
  .from('training_topics')
  .select(`
    topico, 
    categoria, 
    dimension_relacionada, 
    fuente, 
    colaborador_id,
    users!inner(nivel, cargo, tipo_puesto, direccion_unidad, departamento_dependencia)
  `)
  .in('colaborador_id', colaboradoresIds)
  .eq('periodo_id', periodoId);

// Comentarios del jefe
const { data: evaluacionesJefe } = await supabase
  .from('evaluations')
  .select('colaborador_id, comments')
  .in('colaborador_id', colaboradoresIds)
  .eq('periodo_id', periodoId)
  .eq('tipo', 'jefe')
  .eq('estado', 'enviado');

// Solicitudes directas
const { data: solicitudes } = await supabase
  .from('open_question_responses')
  .select(`
    respuesta,
    evaluacion_id,
    open_questions!inner(tipo)
  `)
  .in('evaluacion_id', evaluacionesAutoIds)
  .in('open_questions.tipo', ['capacitacion', 'herramienta']);
```

**Procesamiento:**

```typescript
// Consolidación de tópicos
const topicosMap = new Map<string, {
  topico: string;
  categoria: string;
  frecuencia: number;
  dimensiones: Set<string>;
  fuentes: Set<string>;
  niveles: Map<string, { cantidad: number; cargos: Set<string> }>;
  categoriasPuesto: Set<string>;
}>();

// Por cada tópico, agrupa por nombre normalizado y categoría
topicosTraining?.forEach((tt: any) => {
  const topicoNorm = normalizarTopico(tt.topico);
  const key = `${topicoNorm}|${tt.categoria}`;
  
  // Agrupa tópicos similares y acumula información de participantes
  // Calcula frecuencia absoluta y porcentual
  // Identifica niveles y cargos específicos que necesitan cada tópico
});
```

**Resultado**: `PlanCapacitacionUnidad` con:
- Metadata (período, jefe, fecha)
- Contexto (total colaboradores, evaluaciones completadas, promedios)
- Brechas por dimensión
- Tópicos consolidados con información de participantes
- Resumen ejecutivo

### Paso 2: Preparación para IA

**Archivo**: `src/lib/trainingPlanService.ts` - Función `prepararDatosParaIA()`

**Qué hace:**
- Toma el `PlanCapacitacionUnidad` consolidado
- Extrae todos los tópicos con su información completa (incluyendo colaboradoresIds y colaboradoresInfo)
- Calcula estadísticas (total, urgentes, altos, categorías, dimensiones)
- NO procesa ni agrupa - solo prepara los datos para enviar a la IA

### Paso 2.5: Pre-agrupamiento Inteligente (NUEVO)

**Archivo**: `src/lib/trainingPlanService.ts` - Función `preAgruparTopicos()`

**Qué hace:**
- Analiza tópicos similares por similitud semántica, categorías, niveles/cargos compartidos
- Calcula colaboradores únicos por grupo (no suma frecuencias)
- Calcula frecuencia combinada real
- Genera descripción específica de participantes para cada temática
- Separa tópicos que no pueden agruparse naturalmente

**Resultado:**
- Temáticas pre-agrupadas con participantes calculados
- Tópicos individuales restantes para que la IA los procese

**Estructura enviada:**

```typescript
{
  todosLosTopicos: [
    {
      topico: "Normativa y Seguridad",
      categoria: "Normativa",
      prioridad: "urgente",
      frecuenciaAbsoluta: 3,
      frecuenciaPorcentual: 25.0,
      dimensionesRelacionadas: ["Cumplimiento Normativo"],
      fuentes: ["plan", "comentario_jefe"],
      scorePrioridad: 62.5,
      niveles: [
        { nivel: "A1", cantidad: 2, cargos: ["Analista", "Asistente"] },
        { nivel: "A2", cantidad: 1, cargos: ["Coordinador"] }
      ],
      categoriasPuesto: ["Administrativo"]
    },
    // ... más tópicos
  ],
  estadisticas: {
    totalTopicos: 15,
    topicosUrgentes: 5,
    topicosAltos: 7,
    categorias: ["Técnica", "Soft Skills", "Normativa"],
    dimensionesUnicas: ["Cumplimiento Normativo", "Liderazgo", ...]
  }
}
```

### Paso 3: Invocación de Edge Function

**Archivo**: `src/lib/trainingPlanService.ts` - Función `generateTrainingPlanWithAI()`

**Qué hace:**
- Pre-agrupa tópicos similares usando `preAgruparTopicos()`
- Prepara el payload completo con metadata, contexto, brechas, temáticas pre-agrupadas, tópicos individuales y resumen ejecutivo
- Invoca la Edge Function de Supabase: `generate-training-plan`
- Maneja errores y retorna el plan estructurado

**Payload enviado:**

```typescript
{
  planData: {
    metadata: {
      periodoId: "uuid",
      periodoNombre: "2025-1",
      fechaGeneracion: "2025-12-14T...",
      jefeDpi: "1842954320805"
    },
    contexto: {
      totalColaboradores: 12,
      evaluacionesCompletadas: 10,
      tasaCompletitud: 83.3,
      promedioDesempenoUnidad: 75.5,
      promedioDesempenoOrg: 78.2
    },
    brechasDimensiones: [
      {
        dimensionId: "dim-1",
        dimensionNombre: "Cumplimiento Normativo",
        promedioUnidad: 65.0,
        promedioOrg: 75.0,
        desviacionEstandarOrg: 10.5,
        zScore: -0.95,
        prioridad: "alta",
        colaboradoresDebiles: 5,
        porcentajeDebiles: 41.7
      }
    ],
    todosLosTopicos: [/* ... array de tópicos ... */],
    estadisticas: {/* ... estadísticas ... */},
    resumenEjecutivo: {
      situacionGeneral: "El equipo presenta...",
      dimensionMasCritica: "Cumplimiento Normativo",
      capacitacionesPrioritarias: ["Normativa y Seguridad", ...],
      recomendacionGeneral: "Se recomienda..."
    }
  }
}
```

### Paso 4: Edge Function - Construcción de Prompts

**Archivo**: `supabase/functions/generate-training-plan/index.ts`

#### 4.1 System Prompt

**Función**: `getSystemPrompt()`

**Contenido completo**: Ver sección [Prompts de IA - System Prompt](#system-prompt)

**Resumen de instrucciones clave:**
- Contexto: Municipalidad de Esquipulas, Chiquimula
- Enfoque: Plan organizacional de alto nivel, completo, estructurado, profesional y ejecutable
- Prioridades: Completitud primero, ejecutabilidad segundo
- Determinación de participantes: Usar frecuencia, niveles y cargos proporcionados
- Estructura JSON esperada: Formato profesional estructurado

#### 4.2 User Prompt

**Función**: `buildUserPrompt(planData)`

**Estructura del prompt:**

```
CONTEXTO DE LA UNIDAD:
- PERÍODO: [nombre]
- TOTAL COLABORADORES: [número]
- EVALUACIONES COMPLETADAS: [número] ([%])
- PROMEDIO DESEMPEÑO UNIDAD: [%]
- PROMEDIO DESEMPEÑO ORGANIZACIONAL: [%]

IMPORTANTE: [Instrucciones sobre participantes]

RESUMEN EJECUTIVO:
- Situación general
- Dimensión más crítica
- Recomendación general

BRECHAS POR DIMENSIÓN:
- [Dimensión]: Unidad [%] vs Org [%] (Z-Score: [valor], Prioridad: [prioridad])
  Colaboradores con debilidad: [número] ([%])

═══════════════════════════════════════════════════════════════
TODOS LOS TÓPICOS DE CAPACITACIÓN (BASE DE DATOS COMPLETA)
═══════════════════════════════════════════════════════════════

CONTEXTO ESTADÍSTICO:
- Total de tópicos: [número]
- Tópicos urgentes: [número]
- Tópicos de alta prioridad: [número]
- Categorías identificadas: [lista]
- Dimensiones relacionadas: [lista]

LISTADO COMPLETO DE TÓPICOS (ANALIZAR Y AGRUPAR TODOS):

URGENTE PRIORIDAD ([número] tópicos):
1. [Nombre del tópico]
   - Categoría: [categoría]
   - Frecuencia: [número] colaboradores ([%]% del equipo)
   - Niveles que lo necesitan:
     * Nivel A1: [número] colaborador(es) (cargos: [lista])
     * Nivel A2: [número] colaborador(es) (cargos: [lista])
   - Categorías de puesto: [lista]
   - INSTRUCCIÓN PARTICIPANTES: [Instrucción específica según frecuencia]
   - Score de prioridad: [valor]
   - Dimensiones: [lista]
   - Fuentes: [lista]

[Repite para ALTA, MEDIA, BAJA prioridad]

═══════════════════════════════════════════════════════════════
INSTRUCCIONES PARA GENERAR EL PLAN DE ALTO NIVEL
═══════════════════════════════════════════════════════════════

1. ANÁLISIS Y AGRUPAMIENTO INTELIGENTE
2. COMPLETITUD ABSOLUTA
3. ESTRUCTURACIÓN PROFESIONAL Y EJECUTABLE
4. FORMATO TABLA ESTRUCTURADA

OBJETIVO: [Resumen de objetivos]
```

### Paso 5: Llamada a OpenAI

**Configuración:**

```typescript
{
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ],
  temperature: 0.7,
  max_tokens: 8000,
  response_format: { type: "json_object" }
}
```

### Paso 6: Procesamiento de Respuesta

**Archivo**: `supabase/functions/generate-training-plan/index.ts`

**Qué hace:**
1. Parsea la respuesta JSON de OpenAI
2. Agrega `fechaGeneracion` automáticamente
3. Completa `informacionGeneral` si no viene en la respuesta
4. Valida que tenga `tematicas` o `actividades`
5. Asegura que cada temática tenga `nivelesAplicables` y `participantesRecomendados`

### Paso 7: Validación Post-Generación (NUEVO)

**Archivo**: `src/lib/trainingPlanService.ts` - Función `validarPlanGenerado()`

**Qué hace:**
1. **Completitud**: Verifica que todos los tópicos urgentes estén incluidos
2. **Especificidad de participantes**: 
   - Verifica que no se use "Todo el equipo" cuando frecuencia < 80%
   - Verifica que participantes sean específicos (niveles/cargos)
3. **Consistencia**: Verifica que participantes de temáticas pre-agrupadas no fueron cambiados
4. **Estructura**: Verifica que el plan tenga todas las secciones requeridas

**Resultado:**
- Reporte de errores y advertencias (no bloquea la generación, solo alerta)

**Estructura de respuesta:**

```typescript
{
  success: true,
  plan: {
    informacionGeneral: {
      areaDepartamento: "Nombre del área",
      responsable: "Gerencia de Recursos Humanos",
      totalColaboradores: 12,
      periodo: "Enero - Diciembre 2025",
      fechaElaboracion: "14 de diciembre de 2024"
    },
    justificacion: "Texto de 2-3 párrafos...",
    objetivoGeneral: "Objetivo general del plan...",
    objetivosEspecificos: ["Objetivo 1", "Objetivo 2", ...],
    deteccionNecesidades: ["Fuente 1", "Fuente 2", ...],
    programaCapacitacion: [
      {
        capacitacion: "Nombre de la capacitación",
        objetivo: "Objetivo específico",
        participantes: "Analistas de nivel A1 (5 personas)",
        modalidad: "presencial",
        duracion: "16 hrs",
        fecha: "Ene 15-31",
        instructor: "RRHH Interno",
        prioridad: "urgente",
        temas: ["Tema 1", "Tema 2"]
      }
    ],
    metodologia: "Texto descriptivo...",
    evaluacionSeguimiento: ["Mecanismo 1", ...],
    indicadoresExito: [
      { indicador: "Cumplimiento", meta: "90%" },
      ...
    ],
    tematicas: [
      {
        nombre: "Normativa y Seguridad",
        descripcion: "Descripción general",
        objetivo: "Objetivo específico",
        prioridad: "urgente",
        temas: ["Normativa Municipal", "Seguridad Vial"],
        actividades: [
          {
            topico: "Normativa Municipal",
            tipo: "curso",
            descripcion: "Descripción detallada",
            duracion: "4 horas",
            modalidad: "presencial",
            prioridad: "urgente",
            responsable: "RRHH",
            recursosNecesarios: ["Material de capacitación"]
          }
        ]
      }
    ],
    cronograma: [
      {
        actividad: "0",
        fechaInicio: "2025-02",
        fechaFin: "2025-03",
        estado: "planificado"
      }
    ],
    recursos: [
      {
        tipo: "humano",
        descripcion: "Instructor",
        cantidad: "1 persona",
        disponible: true
      }
    ],
    metricasExito: [
      {
        nombre: "Mejora en cumplimiento",
        tipo: "cuantitativa",
        valorObjetivo: "80%",
        metodoMedicion: "Evaluación de conocimientos",
        plazo: "3 meses"
      }
    ],
    estrategiaImplementacion: "Texto descriptivo...",
    fechaGeneracion: "2025-12-14T04:25:06.515Z"
  }
}
```

### Paso 8: Visualización en Frontend

**Archivos principales:**
- `src/components/trainingPlan/TrainingPlanContent.tsx` - Contenedor principal
- `src/components/trainingPlan/TrainingPlanStructured.tsx` - Visualización del plan estructurado
- `src/components/trainingPlan/TrainingPlanPDF.tsx` - Generación de PDF

**Vistas disponibles:**
1. **Resumen**: Brechas, distribución 9-Box, tópicos priorizados
2. **Plan Estructurado**: Plan completo generado por IA con todas las secciones
3. **Exportar PDF**: Descarga del plan en formato PDF profesional

---

## 📊 Estructura de Datos

### Tipos TypeScript

**Archivo**: `src/types/trainingPlan.ts`

#### PlanCapacitacionUnidad (Datos consolidados antes de IA)

```typescript
interface PlanCapacitacionUnidad {
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
  brechasDimensiones: BrechaDimension[];
  capacitaciones: TopicoCapacitacion[];
  distribucion9Box: Distribucion9Box[];
  resumenEjecutivo: {
    situacionGeneral: string;
    dimensionMasCritica: string | null;
    capacitacionesPrioritarias: string[];
    recomendacionGeneral: string;
  };
  planEstructurado?: PlanCapacitacionEstructurado; // Agregado después de generar con IA
}
```

#### TopicoCapacitacion (Tópico consolidado)

```typescript
interface TopicoCapacitacion {
  topico: string;
  categoria: 'Técnica' | 'Soft Skills' | 'Liderazgo' | 'Herramientas' | 'Normativa' | 'Otro';
  frecuenciaAbsoluta: number; // Cuántos colaboradores lo necesitan
  frecuenciaPorcentual: number; // Porcentaje del equipo
  scorePrioridad: number; // Score calculado para priorización
  prioridad: 'urgente' | 'alta' | 'media' | 'baja';
  dimensionesRelacionadas: string[];
  fuentes: ('plan' | 'comentario_jefe' | 'solicitud_colaborador')[];
  niveles?: Array<{
    nivel: string; // "A1", "A2", etc.
    cantidad: number;
    cargos: string[];
  }>;
  categoriasPuesto?: string[]; // ["Administrativo", "Técnico", etc.]
}
```

#### PlanCapacitacionEstructurado (Respuesta de la IA)

```typescript
interface PlanCapacitacionEstructurado {
  // Estructura profesional nueva
  informacionGeneral?: {
    areaDepartamento: string;
    responsable: string;
    totalColaboradores: number;
    periodo: string;
    fechaElaboracion: string;
  };
  justificacion?: string;
  objetivoGeneral?: string;
  objetivosEspecificos?: string[];
  deteccionNecesidades?: string[];
  programaCapacitacion?: Array<{
    capacitacion: string;
    objetivo: string;
    participantes: string; // "Analistas (4)", "Todo el equipo (12)"
    modalidad: 'presencial' | 'virtual' | 'mixta' | 'autoaprendizaje';
    duracion: string;
    fecha: string;
    instructor: string;
    prioridad: 'urgente' | 'alta' | 'media' | 'baja';
    temas: string[];
  }>;
  metodologia?: string;
  evaluacionSeguimiento?: string[];
  indicadoresExito?: Array<{
    indicador: string;
    meta: string;
  }>;
  
  // Estructura legacy (mantener para compatibilidad)
  tematicas?: Array<{
    nombre: string;
    descripcion: string;
    objetivo: string;
    prioridad: 'urgente' | 'alta' | 'media' | 'baja';
    nivelesAplicables: string[];
    temas: string[];
    actividades: Array<{
      topico: string;
      tipo: 'curso' | 'taller' | 'workshop' | 'mentoria';
      descripcion: string;
      duracion: string;
      modalidad: 'presencial' | 'virtual' | 'hibrida';
      prioridad: 'urgente' | 'alta' | 'media' | 'baja';
      responsable: string;
      recursosNecesarios: string[];
    }>;
    participantesRecomendados?: string;
  }>;
  cronograma?: Array<{
    actividad: string;
    fechaInicio: string;
    fechaFin: string;
    estado: 'planificado' | 'en_proceso' | 'completado' | 'cancelado';
  }>;
  recursos?: Array<{
    tipo: 'humano' | 'material' | 'presupuesto' | 'infraestructura' | 'tecnologico';
    descripcion: string;
    cantidad?: string;
    disponible: boolean;
  }>;
  metricasExito?: Array<{
    nombre: string;
    tipo: 'cuantitativa' | 'cualitativa';
    valorObjetivo?: string;
    metodoMedicion: string;
    plazo: string;
  }>;
  estrategiaImplementacion?: string;
  fechaGeneracion: string; // ISO string
}
```

---

## 🤖 Prompts de IA

### System Prompt

**Ubicación**: `supabase/functions/generate-training-plan/index.ts` - Función `getSystemPrompt()`

**Contenido completo**:

```typescript
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
```

**Secciones principales:**

1. **Contexto**: Municipalidad de Esquipulas, Chiquimula, Guatemala
2. **Enfoque del Plan**: Completo, estructurado, profesional, ejecutable
3. **Agrupamiento Inteligente**: Balance entre completitud y ejecutabilidad
4. **Determinación de Participantes**: Reglas específicas basadas en frecuencia
5. **Estructura de Respuesta**: Formato JSON completo esperado
6. **Instrucciones Críticas**: 10 puntos detallados para generar el plan

**Puntos clave del System Prompt:**

```typescript
// Prioridades
PRIORIDAD #1: COMPLETITUD - Incluye TODOS los tópicos importantes
PRIORIDAD #2: EJECUTABILIDAD - Agrupa inteligentemente cuando sea posible

// Determinación de participantes
- Si frecuenciaPorcentual >= 80%: Puedes considerar "Todo el equipo completo"
- Si frecuenciaPorcentual < 80%: DEBES especificar participantes exactos
- Ejemplos: "Analistas de nivel A1 (3 personas)", "Personal de nivel A1 y A2 con cargo Asistente (5 personas)"

// Agrupamiento
- NO hay límite rígido de temáticas
- Si un tópico importante no puede agruparse, inclúyelo como temática separada
- MEJOR tener más temáticas completas que menos temáticas incompletas
```

### User Prompt

**Ubicación**: `supabase/functions/generate-training-plan/index.ts` - Función `buildUserPrompt()`

**Estructura del User Prompt:**

1. **Contexto de la Unidad**: Período, total colaboradores, evaluaciones, promedios
2. **Resumen Ejecutivo**: Situación general, dimensión crítica, recomendación
3. **Brechas por Dimensión**: Análisis estadístico de brechas
4. **Todos los Tópicos**: Lista completa con información detallada de participantes
5. **Instrucciones para Generar**: Requisitos críticos y objetivos

**Ejemplo de sección de tópicos en el User Prompt:**

```
URGENTE PRIORIDAD (3 tópicos):

1. Normativa y Seguridad
   - Categoría: Normativa
   - Frecuencia: 3 colaboradores (25.0% del equipo)
   - Niveles que lo necesitan:
     * Nivel A1: 2 colaborador(es) (cargos: Analista, Asistente)
     * Nivel A2: 1 colaborador(es) (cargo: Coordinador)
   - Categorías de puesto: Administrativo
   - INSTRUCCIÓN PARTICIPANTES: Este tópico NO aplica a todo el equipo (solo 25.0%). 
     DEBES especificar los participantes exactos usando los niveles y cargos mencionados 
     arriba. NO uses "Todo el equipo completo".
   - Score de prioridad: 62.50
   - Dimensiones: Cumplimiento Normativo
   - Fuentes: plan, comentario_jefe
```

---

## 🎨 Procesamiento y Visualización

### Componente Principal

**Archivo**: `src/components/trainingPlan/TrainingPlanContent.tsx`

**Funciones principales:**

```typescript
// Carga el plan consolidado (sin IA)
const loadPlan = async () => {
  const { plan, error } = await getPlanCapacitacionUnidad(jefeDpi, periodoId);
  setPlan(plan);
};

// Genera el plan estructurado con IA
const handleGenerateStructuredPlan = async () => {
  const { plan: planEstructurado, error } = await generateTrainingPlanWithAI(plan);
  setPlan({ ...plan, planEstructurado });
};
```

### Visualización del Plan Estructurado

**Archivo**: `src/components/trainingPlan/TrainingPlanStructured.tsx`

**Secciones visualizadas:**

1. **Información General**: Área, responsable, período, fecha
2. **Justificación**: Texto explicativo del plan
3. **Objetivos**: General y específicos
4. **Detección de Necesidades**: Fuentes de identificación
5. **Programa de Capacitación**: Tabla con todas las capacitaciones
6. **Metodología**: Descripción de modalidades
7. **Evaluación y Seguimiento**: Mecanismos de evaluación
8. **Indicadores de Éxito**: Métricas y metas
9. **Temáticas**: Temáticas consolidadas con actividades
10. **Cronograma**: Timeline de implementación
11. **Recursos**: Recursos necesarios
12. **Métricas de Éxito**: Cómo medir el éxito
13. **Estrategia de Implementación**: Texto descriptivo

### Generación de PDF

**Archivo**: `src/components/pdf/trainingPlan/TrainingPlanPDF.tsx`

**Funcionalidad:**
- Genera un PDF profesional del plan completo
- Incluye todas las secciones del plan estructurado
- Formato ejecutivo listo para imprimir o compartir

---

## 🔧 Puntos de Extensión

### 1. Mejoras en Agrupamiento de Tópicos

**Ubicación**: `src/lib/trainingPlanService.ts` - Función `getPlanCapacitacionUnidad()`

**Oportunidades:**
- Pre-agrupar tópicos similares antes de enviar a la IA
- Calcular frecuencia combinada de colaboradores únicos por temática
- Identificar sinergias entre tópicos para mejor agrupamiento

**Ejemplo de mejora:**

```typescript
// Calcular colaboradores únicos por temática potencial
function calcularColaboradoresUnicosPorTematica(topicos: TopicoCapacitacion[]): Map<string, Set<string>> {
  const tematicasMap = new Map<string, Set<string>>();
  
  // Agrupar tópicos similares y calcular colaboradores únicos
  // Retornar mapa de temática -> conjunto de colaboradores únicos
  
  return tematicasMap;
}
```

### 2. Mejoras en Determinación de Participantes

**Ubicación**: `supabase/functions/generate-training-plan/index.ts` - Función `buildUserPrompt()`

**Oportunidades:**
- Incluir información de grupos/cuadrillas para agrupamiento
- Considerar disponibilidad de colaboradores
- Agregar información de desempeño para priorizar participantes

**Ejemplo de mejora:**

```typescript
// Agregar información de grupos al prompt
if (planData.grupos && planData.grupos.length > 0) {
  prompt += "GRUPOS/CUADRILLAS:\n";
  planData.grupos.forEach(grupo => {
    prompt += `- ${grupo.nombre} (${grupo.tipo}): ${grupo.colaboradores.length} miembros\n`;
  });
}
```

### 3. Validación de Respuesta de IA

**Ubicación**: `supabase/functions/generate-training-plan/index.ts` - Después de parsear respuesta

**Oportunidades:**
- Validar que todos los tópicos urgentes estén incluidos
- Verificar que los participantes sean específicos (no "Todos" cuando no aplica)
- Validar estructura completa del JSON

**Ejemplo de mejora:**

```typescript
function validarPlanGenerado(plan: any, topicosOriginales: any[]): ValidationResult {
  const errores: string[] = [];
  
  // Validar completitud
  const topicosUrgentes = topicosOriginales.filter(t => t.prioridad === 'urgente');
  const topicosIncluidos = new Set(plan.tematicas?.flatMap((t: any) => t.temas) || []);
  
  topicosUrgentes.forEach(topico => {
    if (!topicosIncluidos.has(topico.topico)) {
      errores.push(`Tópico urgente "${topico.topico}" no incluido en el plan`);
    }
  });
  
  // Validar especificidad de participantes
  plan.programaCapacitacion?.forEach((cap: any) => {
    if (cap.participantes === "Todo el equipo completo" && /* frecuencia < 80% */) {
      errores.push(`Capacitación "${cap.capacitacion}" usa "Todos" pero frecuencia es menor al 80%`);
    }
  });
  
  return { valido: errores.length === 0, errores };
}
```

### 4. Caching de Planes Generados

**Ubicación**: Nueva funcionalidad

**Oportunidades:**
- Guardar planes generados en base de datos
- Permitir regeneración solo si hay cambios en los datos
- Historial de versiones del plan

**Ejemplo de implementación:**

```typescript
// Guardar plan en base de datos
async function guardarPlanGenerado(
  jefeDpi: string,
  periodoId: string,
  plan: PlanCapacitacionEstructurado
): Promise<void> {
  await supabase
    .from('training_plans_generated')
    .upsert({
      jefe_dpi: jefeDpi,
      periodo_id: periodoId,
      plan_data: plan,
      fecha_generacion: new Date().toISOString(),
      version: 1
    });
}
```

### 5. Mejoras en Prompts

**Ubicación**: `supabase/functions/generate-training-plan/index.ts`

**Oportunidades:**
- Hacer prompts más específicos según el contexto del equipo
- Agregar ejemplos de buenas prácticas en el prompt
- Incluir información histórica de capacitaciones anteriores

### 6. Análisis de Efectividad

**Ubicación**: Nueva funcionalidad

**Oportunidades:**
- Comparar planes generados con planes ejecutados
- Medir efectividad de las capacitaciones
- Ajustar prompts basándose en resultados históricos

---

## 📝 Notas Importantes para Desarrolladores

### Manejo de Errores

1. **Validar datos antes de enviar a IA**: Asegurar que todos los arrays estén inicializados
2. **Manejar respuestas incompletas de IA**: Completar campos faltantes con valores por defecto
3. **Logging detallado**: Registrar todos los pasos para debugging

### Performance

1. **Caching**: Considerar cachear planes consolidados (sin IA) ya que no cambian frecuentemente
2. **Límites de tokens**: El user prompt puede ser muy largo con muchos tópicos - considerar paginación o resumen
3. **Timeouts**: La llamada a OpenAI puede tardar - configurar timeouts apropiados

### Testing

1. **Datos de prueba**: Crear datos de prueba con diferentes escenarios (muchos tópicos, pocos tópicos, diferentes niveles)
2. **Validación de prompts**: Verificar que los prompts generen respuestas válidas
3. **Validación de estructura**: Asegurar que la respuesta siempre tenga la estructura esperada

### Seguridad

1. **Validación de entrada**: Validar que `jefeDpi` y `periodoId` sean válidos
2. **RLS de Supabase**: Asegurar que las consultas respeten las políticas de seguridad
3. **API Keys**: Nunca exponer API keys en el frontend

---

## 🔗 Archivos Clave

### Backend / Edge Functions
- `supabase/functions/generate-training-plan/index.ts` - Edge Function principal
- `supabase/migrations/20250101000000_create_training_topics_table.sql` - Tabla de tópicos

### Frontend / Services
- `src/lib/trainingPlanService.ts` - Servicio principal de planes de capacitación
- `src/types/trainingPlan.ts` - Tipos TypeScript

### Frontend / Components
- `src/components/trainingPlan/TrainingPlanContent.tsx` - Contenedor principal
- `src/components/trainingPlan/TrainingPlanStructured.tsx` - Visualización del plan
- `src/components/trainingPlan/TrainingPlanModal.tsx` - Modal del plan
- `src/components/pdf/trainingPlan/TrainingPlanPDF.tsx` - Generación de PDF

### Base de Datos
- `training_topics` - Tópicos de capacitación por colaborador
- `evaluations` - Evaluaciones con comentarios
- `open_question_responses` - Solicitudes directas de capacitación
- `users` - Información de colaboradores (niveles, cargos, categorías)

---

## 📚 Referencias Adicionales

- [Análisis de Mejora de Planes](./ANALISIS_MEJORA_PLANES_CAPACITACION.md)
- [Balance Completitud vs Ejecutabilidad](./BALANCE_COMPLETITUD_EJECUTABILIDAD.md)
- [Flujo de Detección de Participantes](./FLUJO_DETECCION_PARTICIPANTES.md)
- [Mejora de Agrupamiento Ejecutable](./MEJORA_AGRUPAMIENTO_EJECUTABLE.md)

---

**Última actualización**: Diciembre 2024
**Versión del sistema**: 1.0
**Modelo de IA utilizado**: GPT-4o-mini

