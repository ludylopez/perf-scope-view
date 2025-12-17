# Verificación de Evaluaciones Pendientes

## 📋 Descripción

Este módulo permite verificar y diagnosticar evaluaciones que están completas (tanto autoevaluación como evaluación del jefe están en estado 'enviado') pero que no tienen resultado calculado en la tabla `evaluation_results_by_evaluator`.

## 🔍 Casos Detectados

El sistema identifica principalmente casos donde:

1. **Caso Problemático**: El jefe evaluó ANTES que el empleado se autoevaluara
   - El trigger debería ejecutarse cuando se envía la autoevaluación, pero puede fallar
   - Requiere recálculo manual

2. **Caso Normal**: El empleado se autoevaluó ANTES que el jefe lo evaluara
   - El trigger debería ejecutarse cuando se envía la evaluación del jefe
   - Si no hay resultado, puede indicar un error en el trigger

3. **Errores en el Trigger**: El trigger no se ejecutó correctamente por alguna razón

## 🚀 Uso

### Desde la Consola del Navegador

Las funciones están disponibles automáticamente en la consola del navegador:

```javascript
// 1. Diagnosticar todas las evaluaciones pendientes (recomendado)
await verificarEvaluacionesPendientes.diagnosticar()

// 2. Verificar evaluaciones pendientes (retorna lista)
const pendientes = await verificarEvaluacionesPendientes.verificar()
console.table(pendientes)

// 3. Obtener solo el resumen estadístico
const resumen = await verificarEvaluacionesPendientes.resumen()
console.log(resumen)

// 4. Recalcular resultados pendientes
const resultados = await verificarEvaluacionesPendientes.recalcular()
console.table(resultados)
```

### Especificar un Período

```javascript
// Usar un período específico
const periodoId = 'a41e0f9b-00bf-40b2-895c-72569fc6139a'
await verificarEvaluacionesPendientes.diagnosticar(periodoId)
```

### Desde SQL (Supabase)

```sql
-- Verificar evaluaciones pendientes
SELECT * FROM verificar_evaluaciones_pendientes();

-- Con período específico
SELECT * FROM verificar_evaluaciones_pendientes('a41e0f9b-00bf-40b2-895c-72569fc6139a');

-- Obtener resumen
SELECT * FROM resumen_evaluaciones_pendientes();

-- Recalcular resultados pendientes
SELECT * FROM recalculate_pending_results();
```

### Desde Script TypeScript

```bash
# Verificar evaluaciones pendientes (período más reciente)
npx tsx scripts/verificarEvaluacionesPendientes.ts

# Con período específico
npx tsx scripts/verificarEvaluacionesPendientes.ts a41e0f9b-00bf-40b2-895c-72569fc6139a
```

## 📊 Estructura de Datos

### EvaluacionPendiente

```typescript
{
  colaborador_id: string;
  colaborador_nombre: string;
  evaluador_id: string;
  evaluador_nombre: string;
  periodo_id: string;
  periodo_nombre: string;
  autoevaluacion_id: string;
  autoevaluacion_fecha_envio: string;
  evaluacion_jefe_id: string;
  evaluacion_jefe_fecha_envio: string;
  fecha_autoevaluacion_anterior: boolean;
  dias_diferencia: number;
  estado: string;
}
```

### ResumenPendientes

```typescript
{
  total_pendientes: number;
  casos_problematicos: number;
  casos_normales: number;
  periodo_id: string;
  periodo_nombre: string;
}
```

## 🔧 Funciones Disponibles

### `verificarEvaluacionesPendientes(periodoId?: string)`

Retorna una lista detallada de todas las evaluaciones pendientes.

**Parámetros:**
- `periodoId` (opcional): ID del período. Si no se especifica, usa el más reciente.

**Retorna:** `Promise<EvaluacionPendiente[]>`

### `obtenerResumenPendientes(periodoId?: string)`

Retorna un resumen estadístico de evaluaciones pendientes.

**Parámetros:**
- `periodoId` (opcional): ID del período. Si no se especifica, usa el más reciente.

**Retorna:** `Promise<ResumenPendientes | null>`

### `recalcularResultadosPendientes(periodoId?: string)`

Recalcula y guarda los resultados pendientes.

**Parámetros:**
- `periodoId` (opcional): ID del período. Si no se especifica, usa el más reciente.

**Retorna:** `Promise<Array<{colaborador_id, evaluador_id, resultado_calculado, mensaje}>>`

### `diagnosticarEvaluacionesPendientes(periodoId?: string)`

Función de diagnóstico completa que muestra información detallada en la consola.

**Parámetros:**
- `periodoId` (opcional): ID del período. Si no se especifica, usa el más reciente.

**Retorna:** `Promise<void>`

## ⚠️ Notas Importantes

1. **El trigger debería manejar estos casos automáticamente**, pero si hay evaluaciones pendientes, puede indicar:
   - Un problema con el trigger
   - Un error durante el cálculo anterior
   - Evaluaciones que se completaron antes de que el trigger estuviera activo

2. **Recalcular resultados** puede tomar tiempo si hay muchas evaluaciones pendientes.

3. **Los casos problemáticos** (autoevaluación después de evaluación del jefe) son los más importantes de revisar, ya que indican que el trigger no se ejecutó correctamente cuando se envió la autoevaluación.

## 🔄 Flujo Normal Esperado

1. Empleado se autoevalúa → Estado: 'enviado'
2. Jefe evalúa al empleado → Estado: 'enviado'
3. **Trigger se ejecuta** → Calcula resultado y lo guarda en `evaluation_results_by_evaluator`

**Caso Problemático:**
1. Jefe evalúa al empleado → Estado: 'enviado'
2. Empleado se autoevalúa después → Estado: 'enviado'
3. **Trigger debería ejecutarse** cuando se envía la autoevaluación
4. Si no hay resultado, el trigger falló o no se ejecutó

## 📝 Archivos Relacionados

- `supabase/migrations/030_verificar_evaluaciones_pendientes.sql` - Funciones SQL
- `src/utils/verificarEvaluacionesPendientes.ts` - Utilidades TypeScript
- `scripts/verificarEvaluacionesPendientes.ts` - Script de línea de comandos
- `supabase/migrations/029_fix_trigger_autoevaluacion_and_recalculate.sql` - Trigger y función de recálculo
