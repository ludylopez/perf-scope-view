# Solución de Raíz: Trigger Robusto para Cálculo de Evaluaciones

## 🎯 Problema Identificado

Se encontraron **16 evaluaciones completas** sin resultado calculado. Todas eran casos donde el empleado se autoevaluó **después** de que el jefe lo evaluó. El trigger debería ejecutarse cuando se envía la autoevaluación, pero no lo hizo.

## 🔍 Causa Raíz

El trigger `handle_final_result_calculation()` existe y debería manejar ambos casos:
1. ✅ Cuando se envía evaluación del jefe (si ya hay autoevaluación)
2. ✅ Cuando se envía autoevaluación (si ya hay evaluación del jefe)

**Sin embargo**, si el trigger falla silenciosamente (por ejemplo, por un error en `calculate_and_save_result`), no hay:
- ❌ Manejo de errores robusto
- ❌ Logging de errores
- ❌ Sistema de recuperación automática
- ❌ Monitoreo de casos pendientes

## ✅ Solución Implementada

### 1. **Tabla de Logs** (`evaluation_calculation_logs`)
- Registra todos los intentos de cálculo
- Guarda errores con detalles completos
- Permite monitoreo y debugging

### 2. **Función Mejorada** (`calculate_and_save_result`)
- Manejo robusto de errores con try/catch
- Logging automático de éxitos y errores
- Retorna boolean para indicar éxito/fallo
- No falla silenciosamente

### 3. **Trigger Mejorado** (`handle_final_result_calculation`)
- Manejo de errores que no bloquea la actualización
- Logging automático de todos los eventos
- Continúa procesando aunque falle un caso individual

### 4. **Función de Recálculo Automático** (`auto_recalculate_pending_results`)
- Verifica y recalcula resultados pendientes automáticamente
- Límite de intentos para evitar loops infinitos
- Logging de todos los intentos

### 5. **Función de Monitoreo** (`get_evaluation_calculation_stats`)
- Estadísticas en tiempo real
- Contadores de pendientes, éxitos y errores
- Útil para dashboards y alertas

## 🚀 Uso

### Verificar Estado Actual

```sql
-- Ver estadísticas
SELECT * FROM get_evaluation_calculation_stats();

-- Ver evaluaciones pendientes
SELECT * FROM verificar_evaluaciones_pendientes();

-- Ver logs recientes
SELECT * FROM evaluation_calculation_logs 
ORDER BY created_at DESC 
LIMIT 20;
```

### Recálculo Automático

```sql
-- Recalcular hasta 50 resultados pendientes
SELECT * FROM auto_recalculate_pending_results(NULL, 50);
```

### Monitoreo de Errores

```sql
-- Ver errores recientes
SELECT * FROM evaluation_calculation_logs 
WHERE tipo_evento = 'calculation_error'
ORDER BY created_at DESC;

-- Ver errores por colaborador
SELECT 
  colaborador_id,
  COUNT(*) as total_errores,
  MAX(created_at) as ultimo_error
FROM evaluation_calculation_logs
WHERE tipo_evento = 'calculation_error'
GROUP BY colaborador_id
ORDER BY total_errores DESC;
```

## 🔄 Sistema de Recuperación Automática

### Opción 1: Job Periódico (Recomendado)

Crear un job que se ejecute cada hora para verificar y recalcular:

```sql
-- Ejecutar cada hora (requiere pg_cron extension)
SELECT cron.schedule(
  'recalculate-pending-evaluations',
  '0 * * * *', -- Cada hora
  $$SELECT * FROM auto_recalculate_pending_results(NULL, 20)$$
);
```

### Opción 2: Verificación Manual Periódica

Ejecutar manualmente cuando sea necesario:

```sql
-- Verificar y recalcular
SELECT * FROM auto_recalculate_pending_results();
```

### Opción 3: Desde la Aplicación

Agregar un endpoint o función que ejecute la verificación periódicamente:

```typescript
// Ejecutar cada hora desde el backend
setInterval(async () => {
  const { data } = await supabase.rpc('auto_recalculate_pending_results', {
    p_periodo_id: null,
    p_max_intentos: 20
  });
  console.log('Recálculo automático:', data);
}, 3600000); // Cada hora
```

## 📊 Monitoreo y Alertas

### Dashboard de Monitoreo

```sql
-- Vista completa del estado
SELECT 
  ep.nombre as periodo,
  stats.total_pendientes,
  stats.total_exitosos,
  stats.total_errores,
  stats.errores_recientes,
  stats.ultimo_calculo
FROM evaluation_periods ep
CROSS JOIN LATERAL get_evaluation_calculation_stats(ep.id) stats
ORDER BY ep.created_at DESC;
```

### Alertas

Crear alertas cuando:
- `total_pendientes > 0` por más de 1 hora
- `errores_recientes > 5` en las últimas 24 horas
- `ultimo_calculo` es NULL o muy antiguo

## 🔧 Mantenimiento

### Limpiar Logs Antiguos

```sql
-- Eliminar logs de más de 30 días
DELETE FROM evaluation_calculation_logs
WHERE created_at < NOW() - INTERVAL '30 days'
AND tipo_evento != 'calculation_error'; -- Mantener errores por más tiempo
```

### Verificar Integridad

```sql
-- Verificar que no haya evaluaciones completas sin resultado
SELECT COUNT(*) as pendientes
FROM evaluations e_auto
INNER JOIN evaluations e_jefe ON 
  e_jefe.colaborador_id = e_auto.usuario_id
  AND e_jefe.periodo_id = e_auto.periodo_id
  AND e_jefe.tipo = 'jefe'
  AND e_jefe.estado = 'enviado'
WHERE e_auto.tipo = 'auto'
  AND e_auto.estado = 'enviado'
  AND NOT EXISTS (
    SELECT 1 FROM evaluation_results_by_evaluator erbe
    WHERE erbe.colaborador_id = e_auto.usuario_id
      AND erbe.periodo_id = e_auto.periodo_id
      AND erbe.evaluador_id = e_jefe.evaluador_id
  );
```

## 📝 Archivos de la Solución

- `supabase/migrations/031_solucion_raiz_trigger_robusto.sql` - Migración completa
- `supabase/migrations/030_verificar_evaluaciones_pendientes.sql` - Funciones de verificación
- `supabase/migrations/029_fix_trigger_autoevaluacion_and_recalculate.sql` - Trigger original mejorado

## ✅ Beneficios

1. **Prevención**: El trigger mejorado maneja errores sin fallar silenciosamente
2. **Detección**: Sistema de logs permite identificar problemas rápidamente
3. **Recuperación**: Función automática recalcula resultados pendientes
4. **Monitoreo**: Estadísticas en tiempo real para seguimiento
5. **Mantenibilidad**: Logs detallados facilitan debugging

## 🎯 Próximos Pasos

1. ✅ Aplicar migración 031
2. ✅ Configurar job periódico (opcional pero recomendado)
3. ✅ Crear dashboard de monitoreo (opcional)
4. ✅ Establecer alertas (opcional)
