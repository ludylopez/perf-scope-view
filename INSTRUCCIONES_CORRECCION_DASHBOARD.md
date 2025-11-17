# Instrucciones para Corregir el Dashboard de RRHH

## Problema Identificado

El dashboard de RRHH mostraba datos incorrectos porque estaba contando:
- **ANTES:** Número de jefes activos (ejemplo: 10 jefes)
- **AHORA:** Número de evaluaciones esperadas (ejemplo: 300+ colaboradores con asignación activa)

### Errores Específicos:
1. **Evaluaciones Pendientes:** Calculaba `total_jefes - completadas - en_progreso` ❌
   - Debería ser: `total_asignaciones_activas - completadas - en_progreso` ✅

2. **Porcentaje de Completitud:** Dividía entre número de jefes en lugar de evaluaciones esperadas ❌

3. **Evaluaciones por Área/Nivel:** No consideraba las asignaciones activas ❌

## Solución

Se creó una nueva migración SQL que corrige estos cálculos:
`supabase/migrations/014_fix_dashboard_evaluation_counts.sql`

## Pasos para Aplicar la Corrección

### Opción 1: Supabase CLI (Recomendado)

```bash
cd c:\xampp\htdocs\evaluacionrrhh\perf-scope-view

# Ejecutar la migración
npx supabase db push

# O si tienes supabase CLI instalado globalmente:
supabase db push
```

### Opción 2: Supabase Dashboard (Manual)

1. Ir a https://supabase.com/dashboard
2. Seleccionar tu proyecto
3. Ir a **SQL Editor**
4. Copiar el contenido del archivo `supabase/migrations/014_fix_dashboard_evaluation_counts.sql`
5. Pegar en el editor SQL
6. Ejecutar (botón "Run")

### Opción 3: psql (Si tienes acceso directo)

```bash
# Obtener connection string de Supabase Dashboard
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" < supabase/migrations/014_fix_dashboard_evaluation_counts.sql
```

## Verificación

Después de ejecutar la migración, verifica que el dashboard muestre:

✅ **Total Usuarios:** ~300+ (todos los usuarios activos)
✅ **Evaluaciones Completadas:** Número real de evaluaciones enviadas
✅ **Pendientes:** Total de asignaciones activas - completadas - en progreso
✅ **En Progreso:** Número de borradores guardados
✅ **Reaperturas:** 0 (por ahora, hasta implementar el tracking)

## Cambios Adicionales

### Archivo TypeScript Actualizado:
- `src/pages/DashboardRRHH.tsx`: Agregado campo `reaperturas` a la interfaz

### Lógica Corregida:

**ANTES:**
```sql
-- ❌ INCORRECTO
total_jefes := 10;
evaluaciones_pendientes := 10 - 5 - 2 = 3
```

**AHORA:**
```sql
-- ✅ CORRECTO
total_evaluaciones_esperadas := 300; -- Asignaciones activas
evaluaciones_pendientes := 300 - 45 - 15 = 240
```

## Datos Esperados Después de la Corrección

Con base en tu comentario "más de 300 empleados":

| Métrica | Antes (Incorrecto) | Después (Correcto) |
|---------|-------------------|-------------------|
| Total Usuarios | 124 | 300+ |
| Evaluaciones Completadas | 45 | 45 (correcto) |
| Pendientes | 79 | ~240 |
| En Progreso | - | ~15 |
| % Completitud | 36% (sobre jefes) | ~15% (sobre asignaciones) |

## Notas Importantes

1. **Reaperturas:** Por ahora está en 0. Si necesitas trackear reaperturas, necesitarás:
   - Agregar campo `reabierto` a la tabla `evaluations`
   - O crear tabla `evaluation_history` para logs

2. **Asignaciones Activas:** La función ahora cuenta correctamente desde `user_assignments` con `activo = true`

3. **Fallback:** Si la función SQL falla, el código TypeScript tiene un método fallback que también fue actualizado

## Soporte

Si después de ejecutar la migración sigues viendo datos incorrectos:
1. Verifica que la migración se ejecutó sin errores
2. Recarga el dashboard (F5 o Ctrl+R)
3. Revisa la consola del navegador para errores
4. Verifica que tienes asignaciones activas en `user_assignments`
