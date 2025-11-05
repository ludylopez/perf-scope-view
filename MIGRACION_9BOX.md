# Migración: Campos 9-Box en Resultados Finales

## Descripción

Esta migración agrega campos específicos a la tabla `final_evaluation_results` para optimizar las consultas de la matriz 9-box y mejorar el rendimiento del sistema.

## Campos Agregados

1. **posicion_9box** (VARCHAR(20)): Posición en la matriz 9-box (alto-alto, alto-medio, etc.)
2. **desempeno_final** (NUMERIC(5,2)): Score final de desempeño (1-5)
3. **desempeno_porcentaje** (INTEGER): Porcentaje de desempeño (0-100)
4. **potencial** (NUMERIC(5,2)): Score de potencial (1-5)
5. **potencial_porcentaje** (INTEGER): Porcentaje de potencial (0-100)

## Índices Creados

1. **idx_final_results_posicion_9box**: Índice en `posicion_9box` para consultas rápidas por posición
2. **idx_final_results_jefe_periodo**: Índice compuesto en `colaborador_id` y `periodo_id` para consultas por jefe y período

## Cómo Aplicar la Migración

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. Accede a tu proyecto en Supabase Dashboard
2. Ve a **SQL Editor**
3. Copia y pega el contenido completo del archivo `supabase/migrations/002_add_9box_fields.sql`
4. Ejecuta la migración
5. Verifica que los campos se agregaron correctamente

### Opción 2: Desde la línea de comandos

Si tienes Supabase CLI instalado:

```bash
supabase migration up
```

## Verificación

Después de aplicar la migración, verifica que los campos se agregaron correctamente ejecutando:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'final_evaluation_results'
ORDER BY ordinal_position;
```

Deberías ver los nuevos campos:
- posicion_9box
- desempeno_final
- desempeno_porcentaje
- potencial
- potencial_porcentaje

## Beneficios

- **Rendimiento mejorado**: Las consultas de la matriz 9-box serán más rápidas al tener campos indexados
- **Consultas simplificadas**: No es necesario calcular porcentajes cada vez
- **Análisis más eficiente**: Los datos están estructurados para análisis directo

## Notas Importantes

- Esta migración es **segura** y no afecta datos existentes
- Los campos son opcionales (NULL permitido) para mantener compatibilidad
- Los datos existentes en `resultado_final` (JSONB) se mantienen intactos
- Los nuevos campos se poblarán automáticamente cuando se generen nuevos resultados finales

