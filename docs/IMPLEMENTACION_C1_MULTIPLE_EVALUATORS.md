# Implementación Técnica: C1 (Concejo Municipal) y Sistema de Múltiples Evaluadores

## Resumen Ejecutivo

Esta documentación describe la implementación técnica del nuevo nivel C1 (Concejo Municipal) y el sistema de múltiples evaluadores en la plataforma de evaluación de desempeño. La implementación permite que:

1. Los miembros del Concejo Municipal (C1) se autoevalúen solo en desempeño (sin potencial)
2. El Concejo evalúe a Directores (D1) y al Alcalde (A1)
3. El Alcalde (A1) evalúe a Directores (D1)
4. Los empleados de nivel directivo puedan ser evaluados por múltiples jefes simultáneamente
5. Los resultados de múltiples evaluadores se consoliden automáticamente

---

## Arquitectura de Base de Datos

### 1. Nuevo Nivel C1

**Migración:** `016_add_c1_level.sql`

```sql
INSERT INTO job_levels (code, name, hierarchical_order, category, is_active)
VALUES ('C1', 'CONCEJO MUNICIPAL', 0.9, 'administrativo', true);
```

**Características:**
- `hierarchical_order`: 0.9 (superior a A1 que es 1.0)
- `category`: 'administrativo'
- `is_active`: true

### 2. Tabla de Resultados por Evaluador

**Migración:** `017_multiple_evaluators_system.sql`

**Tabla:** `evaluation_results_by_evaluator`

```sql
CREATE TABLE evaluation_results_by_evaluator (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id VARCHAR(20) NOT NULL REFERENCES users(dpi),
  periodo_id UUID NOT NULL REFERENCES evaluation_periods(id),
  evaluador_id VARCHAR(20) NOT NULL REFERENCES users(dpi),
  autoevaluacion_id UUID NOT NULL REFERENCES evaluations(id),
  evaluacion_jefe_id UUID NOT NULL REFERENCES evaluations(id),
  resultado_final JSONB NOT NULL,
  comparativo JSONB NOT NULL,
  posicion_9box VARCHAR(20),
  desempeno_final NUMERIC(5,2),
  desempeno_porcentaje INTEGER,
  potencial NUMERIC(5,2),
  potencial_porcentaje INTEGER,
  fecha_generacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_colaborador_periodo_evaluador 
    UNIQUE(colaborador_id, periodo_id, evaluador_id)
);
```

**Propósito:** Almacena resultados individuales de cada evaluador para un colaborador en un período específico.

**Índices:**
- `idx_evaluation_results_by_evaluator_colaborador_periodo`
- `idx_evaluation_results_by_evaluator_evaluador`
- `idx_evaluation_results_by_evaluator_periodo`

### 3. Vista Consolidada

**Vista:** `final_evaluation_results_consolidated`

```sql
CREATE VIEW final_evaluation_results_consolidated AS
SELECT
  colaborador_id,
  periodo_id,
  AVG(desempeno_final) as desempeno_final_promedio,
  AVG(desempeno_porcentaje) as desempeno_porcentaje_promedio,
  AVG(potencial) as potencial_promedio,
  AVG(potencial_porcentaje) as potencial_porcentaje_promedio,
  MODE() WITHIN GROUP (ORDER BY posicion_9box) as posicion_9box_moda,
  COUNT(DISTINCT evaluador_id) as total_evaluadores,
  jsonb_agg(...) as resultados_por_evaluador,
  MIN(desempeno_final) as desempeno_final_minimo,
  MAX(desempeno_final) as desempeno_final_maximo,
  ...
FROM evaluation_results_by_evaluator
GROUP BY colaborador_id, periodo_id;
```

**Propósito:** Agrega resultados de múltiples evaluadores calculando promedios y estadísticas.

### 4. Función de Consolidación

**Función:** `get_consolidated_result(colaborador_id, periodo_id)`

Retorna un JSONB con:
- Promedios de desempeño y potencial
- Moda de posición 9-box
- Total de evaluadores
- Array de resultados por evaluador
- Valores mínimo y máximo

### 5. Funciones de Validación

**Migración:** `021_validation_functions.sql`

#### `validate_concejo_evaluation(concejo_id, colaborador_id)`

Valida que:
- El evaluador es nivel C1
- El colaborador es nivel D1 o A1
- Existe asignación activa

#### `validate_alcalde_evaluation(alcalde_id, colaborador_id)`

Valida que:
- El evaluador es nivel A1
- El colaborador es nivel D1
- Existe asignación activa

#### `validate_evaluation_permission(evaluador_id, colaborador_id)`

Función genérica que aplica validaciones específicas según el nivel del evaluador.

### 6. Trigger de Validación

**Migración:** `022_evaluation_permission_trigger.sql`

**Trigger:** `trigger_validate_evaluation_permission`

Se ejecuta **BEFORE INSERT OR UPDATE** en la tabla `evaluations` cuando `tipo = 'jefe'`.

**Función:** `validate_evaluation_permission_trigger()`

Valida:
- Existencia y estado activo de evaluador y colaborador
- Reglas específicas: C1 solo evalúa D1/A1, A1 solo evalúa D1
- Existencia de asignación activa

**Comportamiento:** Lanza excepción si la validación falla, impidiendo la inserción/actualización.

### 7. Trigger de Cálculo Automático

**Migración:** `018_update_final_result_trigger.sql`

**Trigger:** `handle_final_result_calculation()`

Se ejecuta **AFTER UPDATE** en la tabla `evaluations` cuando:
- `estado` cambia a 'enviado'
- `tipo = 'jefe'`

**Comportamiento:**
1. Busca la autoevaluación correspondiente
2. Obtiene configuración del instrumento
3. Calcula resultado final usando `calculate_complete_final_result()`
4. Inserta/actualiza en `evaluation_results_by_evaluator`
5. Mantiene compatibilidad actualizando `final_evaluation_results` (solo primer evaluador)

### 8. Trigger de Sincronización Legacy

**Migración:** `023_legacy_views.sql`

**Trigger:** `trigger_sync_final_evaluation_results`

Se ejecuta **AFTER INSERT OR UPDATE** en `evaluation_results_by_evaluator`.

**Función:** `sync_final_evaluation_results()`

**Propósito:** Mantiene `final_evaluation_results` sincronizado con `evaluation_results_by_evaluator` para compatibilidad con código legacy.

---

## Arquitectura Frontend

### 1. Tipos TypeScript

#### `src/types/jobLevel.ts`

```typescript
export const JOB_LEVEL_CODES = {
  C1: 'C1',
  A1: 'A1',
  // ...
} as const;

export const JOB_LEVEL_HIERARCHY: Record<JobLevelCode, number> = {
  C1: 0.9,
  A1: 1.0,
  // ...
};
```

#### `src/types/evaluation.ts`

```typescript
export interface EvaluationResultByEvaluator {
  id: string;
  colaboradorId: string;
  periodoId: string;
  evaluadorId: string;
  evaluadorNombre?: string;
  autoevaluacionId: string;
  evaluacionJefeId: string;
  resultadoFinal: FinalScore;
  comparativo: {...};
  posicion9Box?: string;
  desempenoFinal: number;
  desempenoPorcentaje: number;
  potencial?: number;
  potencialPorcentaje?: number;
  fechaGeneracion: string;
}

export interface ConsolidatedEvaluationResult {
  colaboradorId: string;
  periodoId: string;
  desempenoFinalPromedio: number;
  desempenoPorcentajePromedio: number;
  potencialPromedio?: number;
  potencialPorcentajePromedio?: number;
  posicion9BoxModa?: string;
  totalEvaluadores: number;
  resultadosPorEvaluador: Array<{...}>;
  desempenoFinalMinimo?: number;
  desempenoFinalMaximo?: number;
  // ...
}
```

### 2. Instrumento C1

**Archivo:** `src/data/instruments.ts`

```typescript
export const INSTRUMENT_C1: Instrument = {
  id: "C1_2025_V1",
  nivel: "C1",
  version: "2025.1",
  dimensionesDesempeno: [
    // 5 dimensiones con 21 items totales
  ],
  dimensionesPotencial: [], // VACÍO - C1 no tiene potencial
  configuracion_calculo: {
    pesoAuto: 1.0,  // 100% autoevaluación
    pesoJefe: 0.0,  // No aplica evaluación de jefe
  },
};
```

**Características:**
- Solo dimensiones de desempeño (5 dimensiones, 21 items)
- Sin dimensiones de potencial
- `pesoAuto: 1.0`, `pesoJefe: 0.0`

### 3. Configuración de Cálculo C1

**Archivo:** `src/lib/instrumentCalculations.ts`

```typescript
export const INSTRUMENT_CALCULATION_CONFIGS: Record<string, InstrumentCalculationConfig> = {
  C1: {
    calcularDesempeno: (responses, dimensions) => {
      // Calcula promedio ponderado de dimensiones
    },
    calcularPotencial: () => {
      return undefined; // C1 no tiene potencial
    },
    calcularResultadoFinal: (desempenoAuto, desempenoJefe, potencial) => {
      return { desempenoFinal: desempenoAuto, potencial: undefined };
    },
    pesoJefe: 0.0,
    pesoAuto: 1.0,
  },
};
```

### 4. Funciones de Supabase

**Archivo:** `src/lib/finalResultSupabase.ts`

#### `saveResultByEvaluator()`

Guarda resultado individual en `evaluation_results_by_evaluator`.

#### `getConsolidatedResult()`

Llama a RPC `get_consolidated_result()` y enriquece con nombres de evaluadores.

#### `getResultsByEvaluator()`

Obtiene todos los resultados individuales para un colaborador en un período.

#### `enrichResultsWithEvaluatorNames()`

Enriquece resultados consolidados con nombres de evaluadores desde la tabla `users`.

### 5. Validaciones Frontend

**Archivo:** `src/lib/validations.ts`

#### `validateConcejoEvaluation()`

Valida asíncronamente que C1 puede evaluar a un colaborador específico.

#### `validateAlcaldeEvaluation()`

Valida asíncronamente que A1 puede evaluar a un colaborador específico.

#### `validateEvaluationPermission()`

Función genérica que aplica validaciones según el nivel del evaluador.

#### `validateEvaluationPermissionSync()`

Versión síncrona que usa datos ya cargados (útil en formularios).

### 6. Componentes Modificados

#### `src/pages/Autoevaluacion.tsx`

- Validación específica para C1: verifica que no haya dimensiones de potencial
- Muestra solo dimensiones de desempeño para C1

#### `src/pages/EvaluacionEquipo.tsx`

- Carga información de múltiples evaluadores usando `loadMultipleEvaluatorsInfo()`
- Muestra badge con número de evaluadores si > 1
- Muestra texto "(Evaluado por múltiples jefes)"

#### `src/pages/EvaluacionColaborador.tsx`

- Valida permisos antes de permitir evaluación usando `validateEvaluationPermission()`
- Guarda resultado en `evaluation_results_by_evaluator` automáticamente (via trigger)

#### `src/pages/VistaComparativa.tsx`

- Carga resultado consolidado usando `getConsolidatedResult()`
- Carga resultados individuales usando `getResultsByEvaluator()`
- Muestra sección "Evaluado por X evaluadores" con detalles individuales

#### `src/pages/VistaResultadosFinales.tsx`

- Prioriza carga de resultado consolidado
- Fallback a `final_evaluation_results` (legacy) si no hay consolidado

#### `src/pages/DashboardRRHH.tsx`

- Llama a RPC `get_multiple_evaluators_stats()`
- Muestra tarjeta "Múltiples Evaluadores" con estadísticas

#### `src/pages/Dashboard.tsx`

- Usa `final_evaluation_results_consolidated` para calcular promedios municipales

#### `src/pages/Matriz9Box.tsx`

- Usa `final_evaluation_results_consolidated` para obtener datos
- Muestra badge con número de evaluadores en cada miembro
- Filtro "Número de Evaluadores" en `NineBoxFilters`

#### `src/pages/AdminUsuarios.tsx`

- Columna "Evaluadores" que muestra número de evaluadores activos
- Badge con icono de usuarios

#### `src/pages/AdminAsignaciones.tsx`

- Valida permisos usando `validateEvaluationPermission()` antes de crear asignación
- Valida reglas específicas: C1 solo evalúa D1/A1, A1 solo evalúa D1
- Columna "Total Evaluadores" que agrupa por colaborador
- Alerta informativa sobre múltiples asignaciones

### 7. Exportaciones

#### `src/lib/exports.ts`

**`exportResultadoIndividualPDF()`**
- Acepta `resultadoConsolidado` opcional
- Incluye sección sobre múltiples evaluadores si aplica

**`exportEvaluacionCompletaPDFReact()`**
- Acepta `resultadoConsolidado` en `resultadoData`
- Pasa a componente `EvaluacionPDF`

#### `src/components/pdf/EvaluacionPDF.tsx`

- Muestra sección "Evaluado por X evaluadores" si `resultadoConsolidado.totalEvaluadores > 1`
- Lista resultados individuales por evaluador

#### `src/pages/DashboardRRHH.tsx` (exportToExcel)

- Incluye hoja "Múltiples Evaluadores" con estadísticas

---

## Flujo de Datos

### 1. Autoevaluación C1

```
Usuario C1 → Autoevaluacion.tsx
  → Completa solo dimensiones de desempeño
  → Guarda en evaluations (tipo='auto')
  → Resultado final = 100% autoevaluación (sin potencial)
```

### 2. Evaluación de Colaborador por C1/A1

```
Evaluador (C1/A1) → EvaluacionColaborador.tsx
  → Valida permisos (validateEvaluationPermission)
  → Completa evaluación
  → Guarda en evaluations (tipo='jefe')
  → Trigger handle_final_result_calculation()
    → Calcula resultado final
    → Inserta en evaluation_results_by_evaluator
    → Actualiza final_evaluation_results (legacy)
```

### 3. Consolidación de Múltiples Evaluadores

```
Múltiples evaluadores completan evaluaciones
  → Cada uno guarda en evaluation_results_by_evaluator
  → Vista final_evaluation_results_consolidated calcula promedios
  → Frontend llama get_consolidated_result()
  → Muestra resultados consolidados y por evaluador
```

### 4. Visualización de Resultados

```
VistaComparativa.tsx / VistaResultadosFinales.tsx
  → getConsolidatedResult() → Resultado consolidado
  → getResultsByEvaluator() → Resultados individuales
  → Muestra promedios y detalles por evaluador
```

---

## Reglas de Negocio

### 1. Nivel C1 (Concejo Municipal)

- **Autoevaluación:** Solo desempeño (sin potencial)
- **Evaluación de otros:** Solo puede evaluar a D1 (Directores) y A1 (Alcalde)
- **Instrumento:** `INSTRUMENT_C1` con 5 dimensiones de desempeño, 0 dimensiones de potencial
- **Cálculo:** `pesoAuto: 1.0`, `pesoJefe: 0.0`

### 2. Nivel A1 (Alcalde)

- **Evaluación de otros:** Solo puede evaluar a D1 (Directores)
- **Validación:** Trigger y funciones frontend validan esta regla

### 3. Múltiples Evaluadores

- **Permitido:** Un colaborador puede tener múltiples asignaciones activas (`user_assignments`)
- **Consolidación:** Promedio aritmético de desempeño y potencial
- **9-Box:** Moda (valor más frecuente) de posiciones 9-box
- **Visualización:** Se muestran resultados consolidados y por evaluador

### 4. Validaciones

- **Backend:** Trigger `trigger_validate_evaluation_permission` valida antes de INSERT/UPDATE
- **Frontend:** Funciones `validateEvaluationPermission()` validan antes de mostrar formularios
- **Reglas específicas:**
  - C1 solo evalúa D1/A1
  - A1 solo evalúa D1
  - Debe existir asignación activa en `user_assignments`

---

## Migraciones de Base de Datos

### Orden de Aplicación

1. `016_add_c1_level.sql` - Agrega nivel C1
2. `017_multiple_evaluators_system.sql` - Crea tabla y vista consolidada
3. `018_update_final_result_trigger.sql` - Actualiza trigger de cálculo
4. `019_migrate_existing_results.sql` - Migra datos existentes
5. `020_update_dashboard_stats_multiple_evaluators.sql` - Actualiza estadísticas
6. `021_validation_functions.sql` - Crea funciones de validación
7. `022_evaluation_permission_trigger.sql` - Crea trigger de validación
8. `023_legacy_views.sql` - Crea vistas y triggers de compatibilidad

### Verificación Post-Migración

```sql
-- Verificar nivel C1
SELECT * FROM job_levels WHERE code = 'C1';

-- Verificar tabla
SELECT COUNT(*) FROM evaluation_results_by_evaluator;

-- Verificar funciones
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN (
  'validate_concejo_evaluation',
  'validate_alcalde_evaluation',
  'get_consolidated_result',
  'get_multiple_evaluators_stats'
);

-- Verificar triggers
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name IN (
  'trigger_validate_evaluation_permission',
  'trigger_sync_final_evaluation_results'
);
```

---

## Consideraciones de Rendimiento

### 1. Índices

La tabla `evaluation_results_by_evaluator` tiene índices en:
- `(colaborador_id, periodo_id)` - Para consultas por colaborador/período
- `evaluador_id` - Para consultas por evaluador
- `periodo_id` - Para consultas por período

### 2. Vista Consolidada

La vista `final_evaluation_results_consolidated` usa agregaciones que pueden ser costosas con muchos datos. Se recomienda:
- Monitorear rendimiento con datos reales
- Considerar materialización si es necesario

### 3. Funciones RPC

Las funciones `get_consolidated_result()` y `get_multiple_evaluators_stats()` están marcadas como `STABLE`, lo que permite optimizaciones del planificador de PostgreSQL.

---

## Compatibilidad hacia Atrás

### 1. Tabla Legacy

La tabla `final_evaluation_results` se mantiene para compatibilidad con código legacy. El trigger `sync_final_evaluation_results` la mantiene actualizada con el resultado del primer evaluador (más reciente).

### 2. Vista Legacy

La vista `final_evaluation_results_legacy` proporciona una interfaz compatible con código que espera la estructura antigua.

### 3. Migración de Datos

La migración `019_migrate_existing_results.sql` migra datos existentes de `final_evaluation_results` a `evaluation_results_by_evaluator`.

---

## Testing

### Pruebas de Base de Datos

Ver `docs/PRUEBAS_FRONTEND_C1_MULTIPLE_EVALUATORS.md` para casos de prueba detallados.

**Resumen:**
- ✅ Nivel C1 existe y está activo
- ✅ Tabla `evaluation_results_by_evaluator` funciona
- ✅ Vista consolidada calcula correctamente
- ✅ Funciones de validación funcionan
- ✅ Triggers rechazan evaluaciones inválidas
- ✅ Triggers permiten evaluaciones válidas

### Pruebas de Frontend

Ver `docs/PRUEBAS_FRONTEND_C1_MULTIPLE_EVALUATORS.md` para casos de prueba detallados.

**Resumen:**
- Autoevaluación C1 sin potencial
- Evaluaciones C1 → D1/A1
- Evaluaciones A1 → D1
- Validaciones de permisos
- Visualización de múltiples evaluadores
- Exportaciones PDF/Excel

---

## Troubleshooting

### Problema: Trigger rechaza evaluación válida

**Solución:** Verificar que existe asignación activa en `user_assignments` y que los niveles son correctos.

### Problema: Resultado consolidado no aparece

**Solución:** Verificar que hay al menos una evaluación de tipo 'jefe' con estado 'enviado' y que existe autoevaluación correspondiente.

### Problema: C1 ve dimensiones de potencial

**Solución:** Verificar que el instrumento asignado es `INSTRUMENT_C1` y que `dimensionesPotencial` está vacío.

### Problema: Error al importar usuarios C1

**Solución:** Verificar que `mapearNivelAcodigo()` en `src/lib/importUsers.ts` incluye mapeo para "CONCEJO MUNICIPAL" → "C1".

---

## Referencias

- Migraciones: `supabase/migrations/016_*.sql` a `023_*.sql`
- Tipos: `src/types/jobLevel.ts`, `src/types/evaluation.ts`
- Instrumento: `src/data/instruments.ts` (INSTRUMENT_C1)
- Validaciones: `src/lib/validations.ts`
- Supabase: `src/lib/finalResultSupabase.ts`
- Componentes: Ver lista completa en sección "Componentes Modificados"

---

## Changelog

- **2025-01-XX**: Implementación inicial de C1 y múltiples evaluadores
- **2025-01-XX**: Migraciones 016-023 aplicadas
- **2025-01-XX**: Frontend actualizado para soportar nuevas funcionalidades

