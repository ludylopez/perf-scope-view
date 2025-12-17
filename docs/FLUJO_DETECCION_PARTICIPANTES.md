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
- **NUEVO:** Captura IDs de colaboradores específicos por tópico
- **NUEVO:** Almacena información detallada de cada colaborador (nivel, cargo, categoría de puesto)
- Identifica qué niveles y cargos específicos tienen cada tópico

**Ejemplo de consolidación:**
```typescript
// Tópico: "Normativa y Seguridad"
{
  topico: "Normativa y Seguridad",
  frecuencia: 2,  // 2 colaboradores lo necesitan
  frecuenciaPorcentual: 66.7,  // 2 de 3 = 66.7%
  colaboradoresIds: ["123", "456"],  // NUEVO: IDs específicos
  colaboradoresInfo: [  // NUEVO: Información detallada
    { id: "123", nivel: "A1", cargo: "Analista", categoriaPuesto: "Administrativo" },
    { id: "456", nivel: "A2", cargo: "Coordinador", categoriaPuesto: "Administrativo" }
  ],
  niveles: [
    { nivel: "A1", cantidad: 1, cargos: ["Analista"] },
    { nivel: "A2", cantidad: 1, cargos: ["Coordinador"] }
  ],
  categoriasPuesto: ["Administrativo"]
}
```

### 3. PRE-AGRUPAMIENTO INTELIGENTE (NUEVO - Sistema - TypeScript)
**Cuándo:** Antes de enviar datos a la IA

**Qué hace (`preAgruparTopicos` en `trainingPlanService.ts`):**
- Analiza tópicos similares por:
  - Similitud semántica (nombres similares)
  - Categorías relacionadas
  - Niveles/cargos compartidos (al menos 50% overlap)
  - Prioridad similar
- **Calcula colaboradores únicos** por grupo (no suma frecuencias)
- **Calcula frecuencia combinada real** basándose en colaboradores únicos
- Genera descripción específica de participantes para cada temática pre-agrupada
- Separa tópicos que no pueden agruparse naturalmente

**Ejemplo de pre-agrupamiento:**
```typescript
// Tópicos individuales:
- "Normativa Municipal" (colaboradores: ["123", "456"])
- "Seguridad Vial" (colaboradores: ["123", "789"])

// Temática pre-agrupada resultante:
{
  nombre: "Normativa Municipal y Seguridad Vial",
  topicosIncluidos: ["Normativa Municipal", "Seguridad Vial"],
  colaboradoresUnicos: ["123", "456", "789"],  // 3 colaboradores únicos (no 4)
  frecuenciaCombinada: 3,
  frecuenciaPorcentual: 30.0,  // 3 de 10 = 30%
  participantesDescripcion: "Analistas de nivel A1 y Coordinadores de nivel A2 (3 personas)"
}
```

### 4. ENVÍO A LA IA
**Qué se envía:**
- **Temáticas pre-agrupadas** con participantes ya calculados (NO deben ser modificados por la IA)
- **Tópicos individuales restantes** para que la IA los agrupe o incluya individualmente
- Instrucciones claras sobre cómo usar esta información

**Ejemplo de datos enviados:**
```json
{
  "tematicasPreAgrupadas": [
    {
      "nombre": "Normativa Municipal y Seguridad Vial",
      "topicosIncluidos": ["Normativa Municipal", "Seguridad Vial"],
      "colaboradoresUnicos": ["123", "456", "789"],
      "frecuenciaCombinada": 3,
      "frecuenciaPorcentual": 30.0,
      "participantesDescripcion": "Analistas de nivel A1 y Coordinadores de nivel A2 (3 personas)"
    }
  ],
  "todosLosTopicos": [
    {
      "topico": "Gestión de Proyectos",
      "frecuenciaAbsoluta": 1,
      "frecuenciaPorcentual": 10.0,
      "colaboradoresIds": ["789"],
      "niveles": [
        { "nivel": "B1", "cantidad": 1, "cargos": ["Supervisor"] }
      ]
    }
  ]
}
```

### 5. PROCESAMIENTO POR LA IA
**Qué hace la IA:**
1. **Incluye temáticas pre-agrupadas** TAL CUAL (sin cambiar participantes)
2. **Agrupa tópicos individuales restantes** en temáticas consolidadas cuando sea posible
3. **Determina participantes** para tópicos individuales basándose en:
   - La frecuencia porcentual
   - Los niveles y cargos específicos proporcionados
   - Las instrucciones del prompt

### 6. VALIDACIÓN POST-GENERACIÓN (NUEVO - Sistema - TypeScript)
**Cuándo:** Después de recibir respuesta de la IA

**Qué hace (`validarPlanGenerado` en `trainingPlanService.ts`):**
- **Completitud**: Verifica que todos los tópicos urgentes estén incluidos
- **Especificidad de participantes**: 
  - Verifica que no se use "Todo el equipo" cuando frecuencia < 80%
  - Verifica que participantes sean específicos (niveles/cargos)
- **Consistencia**: Verifica que participantes de temáticas pre-agrupadas no fueron cambiados
- **Estructura**: Verifica que el plan tenga todas las secciones requeridas

## Estado Actual (Actualizado)

✅ **Lo que funciona bien:**
- La detección inicial de qué colaborador necesita qué tópico
- El cálculo de frecuencia por tópico individual
- La identificación de niveles y cargos por tópico
- **NUEVO:** Pre-agrupamiento inteligente con cálculo de colaboradores únicos
- **NUEVO:** Validación post-generación para verificar especificidad

✅ **Mejoras implementadas:**
- Pre-agrupamiento en TypeScript antes de enviar a la IA
- Cálculo preciso de colaboradores únicos por temática
- Validación automática de especificidad de participantes
- Optimización del prompt (reduce tamaño en ~30%)

## Beneficios de la Nueva Implementación

1. **Precisión**: Los colaboradores únicos se calculan correctamente antes de enviar a la IA
2. **Especificidad**: Los participantes son específicos, no genéricos ("todos")
3. **Optimización**: El prompt es más pequeño y eficiente
4. **Validación**: Se detectan problemas automáticamente después de la generación
5. **Consistencia**: Las temáticas pre-agrupadas mantienen sus participantes calculados





