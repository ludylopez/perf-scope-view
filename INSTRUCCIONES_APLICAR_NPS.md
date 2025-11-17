# Instrucciones para Aplicar Corrección de NPS en Dashboard

## Problema Identificado

El dashboard de monitoreo global mostraba "N/A" en la sección de NPS (Net Promoter Score) porque:

- ✅ El campo `nps_score` existe en la tabla `evaluations`
- ✅ El código TypeScript tiene un método fallback para calcular NPS
- ❌ La función SQL `get_dashboard_stats` NO incluía cálculo de NPS

Como la función SQL se ejecuta primero, retornaba datos sin campos NPS, por lo que el fallback TypeScript nunca se ejecutaba.

## Solución

Se creó la migración `015_add_nps_to_dashboard_stats.sql` que actualiza la función SQL para incluir:

```sql
-- Calcular estadísticas NPS desde autoevaluaciones
SELECT
  AVG(nps_score),
  COUNT(*) FILTER (WHERE nps_score >= 9),
  COUNT(*) FILTER (WHERE nps_score >= 7 AND nps_score < 9),
  COUNT(*) FILTER (WHERE nps_score < 7)
INTO
  nps_promedio,
  nps_promoters,
  nps_passives,
  nps_detractors
FROM evaluations
WHERE periodo_id = periodo_id_param
  AND tipo = 'auto'
  AND nps_score IS NOT NULL;
```

Retorna:
- `npsPromedio`: Promedio del NPS (0-10)
- `npsPromoters`: Cantidad de promotores (calificación 9-10)
- `npsPassives`: Cantidad de pasivos (calificación 7-8)
- `npsDetractors`: Cantidad de detractores (calificación 0-6)

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
4. Copiar el contenido del archivo `supabase/migrations/015_add_nps_to_dashboard_stats.sql`
5. Pegar en el editor SQL
6. Ejecutar (botón "Run")

### Opción 3: psql (Si tienes acceso directo)

```bash
# Obtener connection string de Supabase Dashboard
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" < supabase/migrations/015_add_nps_to_dashboard_stats.sql
```

## Verificación

Después de ejecutar la migración:

1. Recargar el Dashboard de Monitoreo Global (F5 o Ctrl+R)
2. Verificar que la sección NPS muestre:
   - **Promedio NPS:** Valor numérico (ej: 7.8) en lugar de "N/A"
   - **Promotores (9-10):** Cantidad de colaboradores con calificación 9-10
   - **Pasivos (7-8):** Cantidad de colaboradores con calificación 7-8
   - **Detractores (0-6):** Cantidad de colaboradores con calificación 0-6

### Datos Esperados

Si **NO hay autoevaluaciones con NPS:**
- NPS Promedio: "N/A" (esto es correcto, no hay datos)
- No se mostrarán las categorías de promotores/pasivos/detractores

Si **HAY autoevaluaciones con NPS:**
- NPS Promedio: Valor entre 0 y 10
- Promotores: Cantidad ≥ 0
- Pasivos: Cantidad ≥ 0
- Detractores: Cantidad ≥ 0

## Contexto Técnico

### ¿Qué es NPS?

Net Promoter Score (NPS) es una métrica de satisfacción del empleado basada en la pregunta:
**"¿Qué tan probable es que recomiendes la municipalidad como lugar de trabajo?"**

Escala: 0-10
- **Promotores (9-10):** Empleados muy satisfechos
- **Pasivos (7-8):** Empleados neutrales
- **Detractores (0-6):** Empleados insatisfechos

### ¿Dónde se captura el NPS?

El NPS se captura en la **autoevaluación** de cada colaborador (`evaluations.tipo = 'auto'`), almacenado en el campo `evaluations.nps_score`.

### Orden de Ejecución

Antes de esta corrección:
1. ✅ SQL `get_dashboard_stats()` → No retorna NPS
2. ❌ TypeScript fallback → Nunca se ejecuta porque SQL ya retornó datos

Después de esta corrección:
1. ✅ SQL `get_dashboard_stats()` → Retorna NPS calculado
2. ✅ Dashboard muestra NPS correctamente

## Migraciones Relacionadas

Esta migración trabaja junto con:
- `014_fix_dashboard_evaluation_counts.sql` - Corrección de conteo de evaluaciones
- `20251111164909_766a2fde-c3fd-49dc-a9cb-b9eab5c935eb.sql` - Agregó campo `nps_score` a tabla `evaluations`

## Soporte

Si después de ejecutar la migración el NPS sigue mostrando "N/A":

1. **Verificar que la migración se ejecutó sin errores**
   ```sql
   -- En SQL Editor de Supabase:
   SELECT proname, prosrc
   FROM pg_proc
   WHERE proname = 'get_dashboard_stats';
   ```
   Debe incluir referencias a `nps_score`, `nps_promedio`, `nps_promoters`, etc.

2. **Verificar que existen autoevaluaciones con NPS**
   ```sql
   SELECT COUNT(*), AVG(nps_score)
   FROM evaluations
   WHERE tipo = 'auto' AND nps_score IS NOT NULL;
   ```
   Si el COUNT es 0, significa que no hay autoevaluaciones con NPS capturado (esto es esperado si aún no se han llenado).

3. **Verificar la consola del navegador** para errores JavaScript

4. **Limpiar caché del navegador** y recargar (Ctrl+Shift+R)
