# Cambios Implementados: Mejora de Especificidad en Planes de Capacitación

## Resumen

Se han implementado mejoras en el sistema de generación de planes de capacitación para que los planes sean más específicos y no indiquen "Todo el equipo completo" cuando en realidad solo algunos colaboradores necesitan la capacitación.

## Cambios Realizados

### 1. Modificación del System Prompt (`supabase/functions/generate-training-plan/index.ts`)

**Antes:**
```
- Idealmente aplica a "Todos" los niveles del equipo completo
```

**Después:**
```
DETERMINACIÓN DE PARTICIPANTES (CRÍTICO):
- Analiza la información de frecuencia, niveles y cargos proporcionada para CADA tópico
- Si frecuenciaPorcentual >= 80%: Puedes considerar "Todo el equipo completo" o ser más específico según los datos
- Si frecuenciaPorcentual < 80%: DEBES especificar participantes exactos usando niveles y cargos proporcionados
- Ejemplos de participantes específicos:
  * "Analistas de nivel A1 (3 personas)"
  * "Personal de nivel A1 y A2 con cargo Asistente (5 personas)"
  * "Personal de categoría Administrativo (8 personas)"
- NUNCA uses "Todo el equipo completo" si la frecuencia es menor al 80% a menos que los datos específicos indiquen que realmente aplica a todos
- El campo "participantes" debe reflejar exactamente quién necesita la capacitación basándote en los datos proporcionados
```

### 2. Mejora del User Prompt - Información Detallada por Tópico

Se agregó información detallada de participantes para cada tópico en el prompt:

**Nuevo formato para cada tópico:**
```
TÓPICO: [nombre]
- Categoría: [categoría]
- Frecuencia: [X] colaboradores ([Y]% del equipo)
- Niveles que lo necesitan:
  * Nivel A1: [cantidad] colaborador(es) (cargos: [lista de cargos])
  * Nivel A2: [cantidad] colaborador(es) (cargos: [lista de cargos])
- Categorías de puesto: [lista de categorías]
- INSTRUCCIÓN PARTICIPANTES: 
  * Si frecuencia >= 80%: "Este tópico aplica a la mayoría del equipo. Puedes usar 'Todo el equipo completo' o ser más específico..."
  * Si frecuencia < 80%: "Este tópico NO aplica a todo el equipo. DEBES especificar los participantes exactos usando los niveles y cargos mencionados arriba. NO uses 'Todo el equipo completo'."
```

### 3. Contexto Adicional al Inicio del Prompt

Se agregó información contextual sobre el equipo:

```
IMPORTANTE: El equipo tiene [X] colaboradores en total. Cuando determines los participantes para cada capacitación, usa la información de frecuencia, niveles y cargos proporcionada para cada tópico. Solo usa "Todo el equipo completo" si la frecuencia es >= 80% del total. Si la frecuencia es menor, especifica exactamente quién necesita la capacitación usando niveles y cargos.
```

### 4. Actualización de Instrucciones de Estructuración

**Antes:**
```
- Niveles aplicables: idealmente 'Todos' para todo el equipo
```

**Después:**
```
- Participantes: Usa la información de frecuencia, niveles y cargos proporcionada para cada tópico. Solo usa 'Todos' si realmente aplica a todo el equipo (frecuencia >= 80%)
```

## Información que Ya se Estaba Recopilando (Sin Cambios Necesarios)

El sistema ya estaba recopilando correctamente:

1. ✅ **Información de niveles y cargos por tópico**: Se obtiene de la tabla `training_topics` con join a `users`
2. ✅ **Frecuencia absoluta y porcentual**: Se calcula correctamente
3. ✅ **Categorías de puesto**: Se obtiene del campo `tipo_puesto` de `users`
4. ✅ **Envío de datos a la IA**: La función `prepararDatosParaIA` ya incluye `niveles` y `categoriasPuesto`

## Archivos Modificados

1. `supabase/functions/generate-training-plan/index.ts`
   - Líneas 86-93: Modificación del system prompt
   - Líneas 287-291: Agregado contexto sobre composición del equipo
   - Líneas 363-383: Mejora del formato de información por tópico
   - Línea 416: Actualización de instrucciones de estructuración

## Resultado Esperado

Con estos cambios, la IA ahora:

1. ✅ Recibe información detallada sobre qué colaboradores específicos necesitan cada tópico
2. ✅ Tiene instrucciones claras sobre cuándo usar "Todo el equipo completo" vs participantes específicos
3. ✅ Puede generar planes más precisos y accionables
4. ✅ Evita decir "Todos" cuando solo algunos colaboradores necesitan la capacitación

## Próximos Pasos (Opcional)

Si se desea mejorar aún más, se pueden considerar:

1. **Agregar información de composición del equipo**: Incluir distribución por niveles y cargos al inicio del prompt
2. **Agregar campo `participantesEspecificos` al JSON**: Para tener información más estructurada en la respuesta
3. **Consultas SQL adicionales**: Para obtener información más detallada si es necesario

## Notas Técnicas

- Los cambios son compatibles con el código existente
- No se requieren cambios en la base de datos
- La información de niveles y cargos ya estaba disponible, solo se mejoró cómo se presenta a la IA
- Los cambios no afectan otros componentes del sistema



