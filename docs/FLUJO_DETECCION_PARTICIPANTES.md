# Flujo de Detección de Participantes en Planes de Capacitación

## Resumen

**NO**, la IA no detecta cuáles temas son para el equipo completo y cuáles para unos cuantos. Esa detección ya está hecha **ANTES** por el sistema. La IA solo usa esa información para determinar cómo describir los participantes en el plan final.

## Proceso Actual (Paso a Paso)

### 1. DETECCIÓN INICIAL (Sistema - TypeScript)
**Cuándo:** Cuando se generan los planes de desarrollo individuales

**Qué hace:**
- Cada colaborador tiene un plan de desarrollo individual generado por IA
- De ese plan se extraen tópicos de capacitación (`topicosCapacitacion`)
- Cada tópico se guarda en `training_topics` vinculado a un `colaborador_id` específico

**Ejemplo:**
```
Colaborador A (DPI: 123) → Plan Individual → Tópico: "Normativa y Seguridad"
Colaborador B (DPI: 456) → Plan Individual → Tópico: "Normativa y Seguridad"
Colaborador C (DPI: 789) → Plan Individual → Tópico: "Gestión de Proyectos"
```

**Resultado en BD (`training_topics`):**
```
| colaborador_id | topico                    | nivel | cargo      |
|----------------|---------------------------|-------|------------|
| 123            | Normativa y Seguridad     | A1    | Analista   |
| 456            | Normativa y Seguridad     | A2    | Coordinador|
| 789            | Gestión de Proyectos      | B1    | Supervisor |
```

### 2. CONSOLIDACIÓN (Sistema - TypeScript)
**Cuándo:** Cuando se genera el plan de capacitación de la unidad

**Qué hace (`getPlanCapacitacionUnidad` en `trainingPlanService.ts`):**
- Consulta todos los tópicos de `training_topics` para el equipo
- Agrupa tópicos similares (mismo nombre y categoría)
- Calcula frecuencia absoluta y porcentual
- Identifica qué niveles y cargos específicos tienen cada tópico

**Ejemplo de consolidación:**
```typescript
// Tópico: "Normativa y Seguridad"
{
  topico: "Normativa y Seguridad",
  frecuencia: 2,  // 2 colaboradores lo necesitan
  frecuenciaPorcentual: 66.7,  // 2 de 3 = 66.7%
  niveles: [
    { nivel: "A1", cantidad: 1, cargos: ["Analista"] },
    { nivel: "A2", cantidad: 1, cargos: ["Coordinador"] }
  ],
  categoriasPuesto: ["Administrativo"]
}
```

### 3. ENVÍO A LA IA
**Qué se envía:**
- Lista de tópicos consolidados con su información de frecuencia, niveles y cargos
- Instrucciones sobre cómo usar esta información

**Ejemplo de datos enviados:**
```json
{
  "todosLosTopicos": [
    {
      "topico": "Normativa y Seguridad",
      "frecuenciaAbsoluta": 2,
      "frecuenciaPorcentual": 66.7,
      "niveles": [
        { "nivel": "A1", "cantidad": 1, "cargos": ["Analista"] },
        { "nivel": "A2", "cantidad": 1, "cargos": ["Coordinador"] }
      ],
      "categoriasPuesto": ["Administrativo"]
    }
  ]
}
```

### 4. PROCESAMIENTO POR LA IA
**Qué hace la IA:**
1. **Agrupa tópicos similares** en temáticas consolidadas
   - Ejemplo: "Normativa y Seguridad" + "Seguridad Vial" → Temática: "Normativa y Seguridad"
   
2. **Determina cómo describir participantes** basándose en:
   - La frecuencia porcentual de los tópicos agrupados
   - Los niveles y cargos específicos proporcionados
   - Las instrucciones del prompt

**Problema potencial identificado:**
Cuando la IA agrupa múltiples tópicos en una temática consolidada, podría estar mezclando tópicos que tienen diferentes grupos de participantes. Por ejemplo:

```
Temática consolidada: "Normativa y Seguridad"
  - Tópico 1: "Normativa y Seguridad" (2 personas, 66.7%)
  - Tópico 2: "Seguridad Vial" (1 persona, 33.3%)
  
Total: 3 personas diferentes, pero si el equipo tiene 10 personas totales,
la frecuencia combinada sería 30%, no 100%.
```

Si la IA no maneja esto correctamente, podría decir "Todo el equipo" cuando en realidad solo 3 personas necesitan la temática.

## Mejora Necesaria

### Opción 1: Calcular frecuencia combinada al agrupar (Recomendado)

Cuando la IA agrupa tópicos en temáticas, debería:
1. Identificar el conjunto único de colaboradores que necesitan CUALQUIERA de los tópicos agrupados
2. Calcular la frecuencia combinada basándose en colaboradores únicos, no en suma de frecuencias
3. Combinar los niveles y cargos de todos los tópicos agrupados

**Implementación sugerida:**
- Agregar información de `colaboradoresIds` a cada tópico antes de enviar a la IA
- Instruir a la IA para que calcule la frecuencia combinada al agrupar
- O mejor: calcular esto en TypeScript antes de enviar a la IA

### Opción 2: Calcular frecuencia de temáticas en TypeScript

Antes de enviar a la IA, calcular:
- Qué colaboradores únicos necesitan cada posible agrupación de tópicos
- La frecuencia combinada real
- Los niveles y cargos combinados

Esto requeriría pre-agrupar los tópicos en TypeScript antes de enviar a la IA.

## Estado Actual

✅ **Lo que funciona bien:**
- La detección inicial de qué colaborador necesita qué tópico
- El cálculo de frecuencia por tópico individual
- La identificación de niveles y cargos por tópico

⚠️ **Lo que podría mejorar:**
- Cuando la IA agrupa tópicos en temáticas, la frecuencia combinada podría no ser precisa
- La IA podría necesitar más instrucciones sobre cómo calcular frecuencia combinada al agrupar

## Recomendación

**Opción A (Más simple):** Mejorar las instrucciones del prompt para que la IA calcule correctamente la frecuencia combinada al agrupar tópicos.

**Opción B (Más robusta):** Pre-calcular posibles agrupaciones en TypeScript y enviar información de frecuencia combinada a la IA.

**Opción C (Híbrida):** Enviar información de colaboradores únicos por tópico y instruir a la IA para que calcule la frecuencia combinada correctamente.



