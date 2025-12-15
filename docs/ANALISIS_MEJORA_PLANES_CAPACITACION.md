# Análisis: Mejora de Especificidad en Planes de Capacitación

## Problema Identificado

El sistema actualmente genera planes de capacitación que indican "Todo el equipo completo" o "Todos" cuando en realidad solo algunos colaboradores necesitan esa capacitación específica. Esto ocurre porque:

1. **Información disponible pero no utilizada**: El sistema ya recopila información detallada sobre qué colaboradores necesitan cada tópico (niveles, cargos, categorías de puesto), pero esta información no se está enviando correctamente a la IA.

2. **Prompt genérico**: El prompt actual dice "Idealmente aplica a 'Todos' los niveles del equipo completo" lo cual sesga la respuesta hacia "Todos".

3. **Falta de instrucciones específicas**: No hay instrucciones claras sobre cómo determinar participantes basándose en la frecuencia y datos demográficos.

## Información Disponible Actualmente

### Datos que YA se están recopilando:

1. **Por cada tópico de capacitación**:
   - `frecuenciaAbsoluta`: Número de colaboradores que necesitan el tópico
   - `frecuenciaPorcentual`: Porcentaje del equipo que lo necesita
   - `niveles`: Array con información de niveles (ej: `[{nivel: "A1", cantidad: 3, cargos: ["Analista", "Asistente"]}]`)
   - `categoriasPuesto`: Categorías de puesto que necesitan el tópico

2. **Información del equipo**:
   - Total de colaboradores en la unidad
   - Distribución por niveles
   - Distribución por cargos
   - Distribución por categorías de puesto

### Datos que se pueden obtener adicionalmente de Supabase:

1. **Información detallada de colaboradores** (tabla `users`):
   - `nivel`: Nivel jerárquico (A1, A2, B1, B2, C1, C2, etc.)
   - `cargo`: Cargo específico
   - `tipo_puesto`: Categoría del puesto (ej: "Administrativo", "Técnico", "Operativo")
   - `area`: Área organizacional
   - `departamento_dependencia`: Departamento específico
   - `direccion_unidad`: Dirección o unidad
   - `profesion`: Profesión u oficio

2. **Información de grupos/cuadrillas** (tabla `groups` y `group_members`):
   - Grupos a los que pertenece cada colaborador
   - Tipo de grupo (equipo, cuadrilla, proyecto)

3. **Información de desempeño** (tabla `final_evaluation_results`):
   - Posición 9-Box
   - Desempeño porcentual
   - Puede ayudar a identificar si ciertos niveles de desempeño necesitan más capacitación

## Mejoras Propuestas

### 1. Modificar el System Prompt

**Cambio necesario**: Eliminar o modificar la línea que dice "Idealmente aplica a 'Todos' los niveles del equipo completo" y reemplazarla con instrucciones específicas sobre cómo determinar participantes.

**Nueva instrucción propuesta**:
```
- DETERMINACIÓN DE PARTICIPANTES: 
  * Usa la información de frecuencia, niveles y cargos proporcionada para cada tópico
  * Si frecuenciaPorcentual >= 80%: Puedes usar "Todo el equipo completo"
  * Si frecuenciaPorcentual < 80%: Especifica los participantes exactos usando niveles y cargos
  * Ejemplos:
    - "Analistas de nivel A1 (3 personas)"
    - "Personal de nivel A1 y A2 con cargo 'Asistente Administrativo' (5 personas)"
    - "Todo el equipo completo (12 personas)" solo si realmente aplica a todos
```

### 2. Mejorar el User Prompt para incluir información de participantes

**Cambio necesario**: Modificar `buildUserPrompt` en `supabase/functions/generate-training-plan/index.ts` para incluir:

1. **Información de distribución del equipo**:
   - Total de colaboradores
   - Distribución por niveles
   - Distribución por cargos más comunes

2. **Para cada tópico, incluir**:
   - Frecuencia absoluta y porcentual
   - Niveles específicos que lo necesitan
   - Cargos específicos que lo necesitan
   - Categorías de puesto que lo necesitan

**Ejemplo de formato**:
```
TÓPICO: "Normativa y Seguridad"
- Frecuencia: 3 colaboradores (25% del equipo)
- Niveles que lo necesitan:
  * A1: 2 colaboradores (cargos: "Asistente", "Analista")
  * A2: 1 colaborador (cargo: "Coordinador")
- Categorías de puesto: ["Administrativo"]
- INSTRUCCIÓN: Este tópico NO aplica a todo el equipo. Solo debe incluir a los 3 colaboradores de niveles A1 y A2 mencionados.
```

### 3. Agregar campo `participantesEspecificos` al formato JSON

**Cambio necesario**: Modificar la estructura JSON esperada para incluir información más detallada de participantes:

```json
{
  "actividades": [
    {
      "topico": "Nombre del tópico",
      "participantesRecomendados": "Analistas de nivel A1 (3 personas)",
      "participantesEspecificos": {
        "descripcion": "Analistas de nivel A1",
        "cantidad": 3,
        "niveles": ["A1"],
        "cargos": ["Analista"],
        "categoriasPuesto": ["Administrativo"],
        "aplicaATodos": false,
        "porcentajeEquipo": 25
      }
    }
  ]
}
```

### 4. Agregar información del equipo completo al contexto

**Cambio necesario**: Incluir en el prompt información sobre la composición del equipo:

```
COMPOSICIÓN DEL EQUIPO:
- Total: 12 colaboradores
- Por niveles:
  * A1: 5 colaboradores (cargos: Analista, Asistente)
  * A2: 4 colaboradores (cargos: Coordinador, Supervisor)
  * B1: 3 colaboradores (cargos: Jefe de Departamento)
- Por categorías de puesto:
  * Administrativo: 8 colaboradores
  * Técnico: 4 colaboradores
```

## Implementación Recomendada

### Paso 1: Modificar `prepararDatosParaIA` en `src/lib/trainingPlanService.ts`

Asegurar que se incluya toda la información de niveles y cargos:

```typescript
function prepararDatosParaIA(plan: PlanCapacitacionUnidad): {
  todosLosTopicos: Array<{
    // ... campos existentes ...
    niveles?: Array<{ nivel: string; cantidad: number; cargos: string[] }>;
    categoriasPuesto?: string[];
    participantesInfo?: {
      frecuenciaAbsoluta: number;
      frecuenciaPorcentual: number;
      niveles: string[];
      cargos: string[];
      categoriasPuesto: string[];
    };
  }>;
  estadisticas: {
    // ... campos existentes ...
    composicionEquipo?: {
      total: number;
      porNivel: Array<{ nivel: string; cantidad: number; cargos: string[] }>;
      porCategoriaPuesto: Array<{ categoria: string; cantidad: number }>;
    };
  };
}
```

### Paso 2: Modificar `buildUserPrompt` en `supabase/functions/generate-training-plan/index.ts`

Agregar sección de información de participantes para cada tópico:

```typescript
// Para cada tópico, agregar:
prompt += `\nTÓPICO: ${topico.topico}\n`;
prompt += `- Frecuencia: ${topico.frecuenciaAbsoluta} colaboradores (${topico.frecuenciaPorcentual}% del equipo)\n`;
if (topico.niveles && topico.niveles.length > 0) {
  prompt += `- Niveles que lo necesitan:\n`;
  topico.niveles.forEach(n => {
    prompt += `  * ${n.nivel}: ${n.cantidad} colaboradores`;
    if (n.cargos && n.cargos.length > 0) {
      prompt += ` (cargos: ${n.cargos.join(", ")})`;
    }
    prompt += `\n`;
  });
}
if (topico.categoriasPuesto && topico.categoriasPuesto.length > 0) {
  prompt += `- Categorías de puesto: [${topico.categoriasPuesto.join(", ")}]\n`;
}
prompt += `- INSTRUCCIÓN: `;
if (topico.frecuenciaPorcentual >= 80) {
  prompt += `Este tópico aplica a la mayoría del equipo. Puedes usar "Todo el equipo completo" o especificar los niveles/cargos.\n`;
} else {
  prompt += `Este tópico NO aplica a todo el equipo. DEBES especificar los participantes exactos usando los niveles y cargos mencionados arriba. NO uses "Todo el equipo completo".\n`;
}
```

### Paso 3: Modificar el System Prompt

Reemplazar la línea problemática y agregar instrucciones específicas:

```typescript
// Eliminar o modificar:
// "- Idealmente aplica a 'Todos' los niveles del equipo completo"

// Agregar:
"- DETERMINACIÓN DE PARTICIPANTES (CRÍTICO):
  * Analiza la información de frecuencia, niveles y cargos proporcionada para CADA tópico
  * Si frecuenciaPorcentual >= 80%: Puedes considerar "Todo el equipo completo" o ser más específico
  * Si frecuenciaPorcentual < 80%: DEBES especificar participantes exactos usando niveles y cargos
  * Ejemplos de participantes específicos:
    - 'Analistas de nivel A1 (3 personas)'
    - 'Personal de nivel A1 y A2 con cargo Asistente (5 personas)'
    - 'Personal de categoría Administrativo (8 personas)'
  * NUNCA uses 'Todo el equipo completo' si la frecuencia es menor al 80%
  * El campo 'participantes' debe reflejar exactamente quién necesita la capacitación"
```

## Información Adicional Disponible en Supabase

### Tablas relevantes:

1. **`users`**: Información completa de colaboradores
   - Campos útiles: `nivel`, `cargo`, `tipo_puesto`, `area`, `departamento_dependencia`, `direccion_unidad`, `profesion`

2. **`training_topics`**: Tópicos de capacitación vinculados a colaboradores específicos
   - Campos útiles: `colaborador_id`, `nivel`, `categoria`, `prioridad`
   - Relación con `users` para obtener información detallada

3. **`group_members`** y `groups`: Información de grupos/cuadrillas
   - Útil para identificar si ciertos grupos necesitan capacitación específica

4. **`final_evaluation_results`**: Resultados de evaluación
   - Útil para identificar si colaboradores con bajo desempeño necesitan más capacitación

### Consultas SQL útiles que se pueden agregar:

```sql
-- Obtener distribución del equipo por nivel y cargo
SELECT 
  nivel,
  cargo,
  COUNT(*) as cantidad
FROM users
WHERE dpi IN (SELECT colaborador_id FROM ...)
GROUP BY nivel, cargo
ORDER BY nivel, cantidad DESC;

-- Obtener tópicos con información detallada de participantes
SELECT 
  tt.topico,
  tt.categoria,
  tt.prioridad,
  u.nivel,
  u.cargo,
  u.tipo_puesto,
  COUNT(*) OVER (PARTITION BY tt.topico) as frecuencia_total
FROM training_topics tt
JOIN users u ON tt.colaborador_id = u.dpi
WHERE tt.periodo_id = ...
GROUP BY tt.topico, tt.categoria, tt.prioridad, u.nivel, u.cargo, u.tipo_puesto;
```

## Resumen de Cambios Necesarios

1. ✅ **Modificar System Prompt**: Eliminar sesgo hacia "Todos" y agregar instrucciones específicas
2. ✅ **Mejorar User Prompt**: Incluir información detallada de participantes por tópico
3. ✅ **Asegurar datos completos**: Verificar que `niveles` y `categoriasPuesto` se envíen correctamente
4. ✅ **Agregar composición del equipo**: Incluir distribución del equipo en el contexto
5. ⚠️ **Opcional**: Agregar consultas SQL adicionales para obtener más información detallada si es necesario

## Impacto Esperado

- ✅ Los planes de capacitación serán más específicos y realistas
- ✅ Se evitará decir "Todos" cuando solo algunos colaboradores necesitan la capacitación
- ✅ Los planes serán más accionables y fáciles de implementar
- ✅ Mejor uso de recursos al identificar exactamente quién necesita qué capacitación



