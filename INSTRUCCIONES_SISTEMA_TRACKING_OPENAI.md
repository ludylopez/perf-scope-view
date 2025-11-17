# Sistema de Tracking de Uso de OpenAI API

## Problema Identificado

El dashboard mostraba **0 llamadas, 0 tokens** en las estadísticas de uso de OpenAI porque:

1. ✅ **Existía el código de tracking** (`src/lib/openai.ts`)
2. ❌ **Solo registraba llamadas desde el FRONTEND** (localStorage)
3. ❌ **NO registraba llamadas desde Edge Functions** (backend de Supabase)
4. ❌ **localStorage es volátil** - se pierde entre sesiones/dispositivos

La mayoría de llamadas a OpenAI se hacen desde **Edge Functions de Supabase** (backend):
- `generate-development-plan` - Genera planes de desarrollo
- `generate-feedback-grupal` - Genera retroalimentación grupal
- `generate-feedback-guide` - Genera guías de retroalimentación

Por eso nunca se mostraban datos.

## Solución Implementada

### 1. **Nueva Tabla en Supabase: `openai_api_logs`**

Almacena cada llamada a OpenAI con:
- Función que la ejecutó
- Modelo usado (gpt-4o-mini)
- Colaborador y período relacionados
- Status (success/failed/pending)
- **Tokens reales** consumidos (prompt + completion)
- Mensaje de error (si falló)
- Duración de la llamada en milisegundos

### 2. **Función SQL: `log_openai_api_call()`**

Permite a las Edge Functions registrar cada llamada desde Deno.

### 3. **Función SQL: `get_openai_usage_stats()`**

Calcula estadísticas agregadas:
- Total de llamadas (exitosas/fallidas)
- Total de tokens consumidos (prompt/completion/total)
- Costo estimado en USD
- Tasa de éxito
- Estadísticas por función
- Última llamada realizada

Permite filtrar por:
- Período específico
- Rango de fechas

### 4. **Edge Functions Actualizadas**

Modificado `generate-development-plan/index.ts` para:
- Registrar cada llamada (exitosa o fallida)
- Capturar tokens REALES de la respuesta de OpenAI (`usage.total_tokens`)
- Medir duración de la llamada
- Registrar errores con código y mensaje

### 5. **Dashboard RRHH Actualizado**

Ahora lee estadísticas desde Supabase (`get_openai_usage_stats`) en lugar de localStorage.

Mantiene fallback a localStorage para compatibilidad con llamadas desde frontend (si las hay).

---

## Pasos para Aplicar los Cambios

### Paso 1: Ejecutar Migración SQL

**Opción A: Supabase CLI (Recomendado)**
```bash
cd c:\xampp\htdocs\evaluacionrrhh\perf-scope-view
npx supabase db push
```

**Opción B: Supabase Dashboard**
1. Ir a https://supabase.com/dashboard
2. Seleccionar tu proyecto
3. Ir a **SQL Editor**
4. Copiar contenido de `supabase/migrations/016_create_api_usage_logs.sql`
5. Pegar y ejecutar (botón "Run")

### Paso 2: Desplegar Edge Functions Actualizadas

Las Edge Functions ya están modificadas localmente. Necesitas desplegarlas a Supabase:

```bash
cd c:\xampp\htdocs\evaluacionrrhh\perf-scope-view

# Desplegar la función actualizada
npx supabase functions deploy generate-development-plan

# Si tienes otras funciones que también usan OpenAI (pendiente de actualizar):
# npx supabase functions deploy generate-feedback-grupal
# npx supabase functions deploy generate-feedback-guide
```

### Paso 3: Verificar que funcione

1. **Generar un plan de desarrollo** desde el dashboard
2. **Recargar el Dashboard RRHH** (F5)
3. **Verificar la sección "Uso de API de OpenAI"**:
   - Debe mostrar "1" en "Total de Llamadas"
   - Debe mostrar "1" en "Exitosas" (si funcionó)
   - Debe mostrar número real de tokens (ej: 5,234)
   - Debe mostrar costo estimado (ej: $0.0008 USD)

---

## Datos Esperados Después del Cambio

### Antes (Incorrecto):
```
Total de Llamadas: 0
Exitosas: 0
Fallidas: 0
Tokens Estimados: 0 (~$0.0000 USD)
```

### Después (Correcto):
```
Total de Llamadas: 15
Exitosas: 14
Fallidas: 1
Tokens Estimados: 67,234 (~$0.0112 USD)
Última llamada: 16/11/2025 14:32
Tasa de éxito: 93.33%
```

---

## Estructura de Costos de OpenAI

El sistema calcula costos usando los precios oficiales de **gpt-4o-mini**:

| Tipo de Token | Precio por 1M tokens | Ejemplo (1,000 tokens) |
|--------------|---------------------|------------------------|
| **Prompt** (entrada) | $0.150 | $0.00015 |
| **Completion** (salida) | $0.600 | $0.00060 |

**Ejemplo de llamada típica:**
- Prompt tokens: 3,500
- Completion tokens: 1,800
- Total tokens: 5,300
- **Costo estimado:** $0.00053 + $0.00108 = **$0.00161 USD**

---

## Archivos Modificados

### Nuevos:
1. `supabase/migrations/016_create_api_usage_logs.sql` - Tabla y funciones SQL

### Modificados:
1. `supabase/functions/generate-development-plan/index.ts` - Tracking de llamadas
2. `src/pages/DashboardRRHH.tsx` - Lee stats desde Supabase

### Pendientes de Modificar (para futuro):
1. `supabase/functions/generate-feedback-grupal/index.ts`
2. `supabase/functions/generate-feedback-guide/index.ts`

---

## Características Adicionales

### Filtrado por Período

Puedes obtener estadísticas de un período específico:

```sql
SELECT get_openai_usage_stats('UUID-DEL-PERIODO');
```

### Filtrado por Rango de Fechas

```sql
SELECT get_openai_usage_stats(
  NULL, -- Sin filtro de período
  '2025-11-01'::timestamp, -- Fecha inicio
  '2025-11-30'::timestamp  -- Fecha fin
);
```

### Ver Logs Detallados

Para análisis más profundo:

```sql
-- Últimas 50 llamadas
SELECT
  created_at,
  function_name,
  status,
  total_tokens,
  error_message
FROM openai_api_logs
ORDER BY created_at DESC
LIMIT 50;

-- Llamadas fallidas
SELECT *
FROM openai_api_logs
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Consumo por colaborador
SELECT
  colaborador_id,
  COUNT(*) as llamadas,
  SUM(total_tokens) as tokens_totales,
  ROUND((SUM(prompt_tokens)::NUMERIC / 1000000.0 * 0.150) +
        (SUM(completion_tokens)::NUMERIC / 1000000.0 * 0.600), 4) as costo_usd
FROM openai_api_logs
WHERE status = 'success'
GROUP BY colaborador_id
ORDER BY tokens_totales DESC;
```

### Estadísticas por Función

El sistema automáticamente agrupa por función:

```json
{
  "llamadasPorFuncion": [
    {
      "funcion": "generate-development-plan",
      "llamadas": 45,
      "tokens": 234567,
      "exitosas": 43,
      "fallidas": 2
    },
    {
      "funcion": "generate-feedback-grupal",
      "llamadas": 12,
      "tokens": 45678,
      "exitosas": 12,
      "fallidas": 0
    }
  ]
}
```

---

## Troubleshooting

### Problema: Sigue mostrando 0 llamadas

**Verificar:**
1. ¿La migración se ejecutó correctamente?
   ```sql
   SELECT EXISTS (
     SELECT FROM pg_tables
     WHERE tablename = 'openai_api_logs'
   );
   ```
   Debe retornar `true`.

2. ¿La función SQL existe?
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'get_openai_usage_stats';
   ```
   Debe retornar la función.

3. ¿Las Edge Functions están desplegadas?
   - Verifica en Supabase Dashboard → Edge Functions
   - Debe aparecer `generate-development-plan` con fecha reciente

4. ¿Has generado algún plan de desarrollo DESPUÉS de aplicar los cambios?
   - Los logs antiguos no existen, solo registra llamadas nuevas

### Problema: Muestra "failed" en todas las llamadas

**Verificar:**
1. ¿La API key de OpenAI está configurada?
   ```bash
   # En Supabase Dashboard → Project Settings → Edge Functions → Secrets
   OPENAI_API_KEY = sk-...
   ```

2. ¿Hay créditos en la cuenta de OpenAI?
   - Verifica en https://platform.openai.com/usage

### Problema: Tokens parecen muy altos/bajos

**Normal:**
- Plan de desarrollo típico: 3,000 - 8,000 tokens
- Feedback grupal: 2,000 - 5,000 tokens

**Anormal:**
- > 15,000 tokens: Puede indicar prompts muy largos o respuestas excesivas
- < 500 tokens: Puede indicar errores o respuestas incompletas

---

## Próximos Pasos (Opcional)

### 1. Agregar Tracking a Otras Edge Functions

Aplicar el mismo patrón a:
- `generate-feedback-grupal`
- `generate-feedback-guide`

### 2. Dashboard de Análisis Avanzado

Crear página dedicada con:
- Gráficas de uso por día/semana/mes
- Comparativa de costos por período
- Top colaboradores con más uso
- Análisis de errores frecuentes

### 3. Alertas de Consumo

Configurar alertas cuando:
- Costo mensual supera X USD
- Tasa de fallos > 10%
- Llamadas individuales > 10,000 tokens

### 4. Optimización de Prompts

Analizar logs para:
- Identificar prompts que consumen muchos tokens
- Optimizar system prompts
- Reducir información redundante

---

## Soporte

Si tienes problemas:

1. **Revisa logs de Edge Functions:**
   - Supabase Dashboard → Edge Functions → Logs

2. **Revisa la tabla de logs:**
   ```sql
   SELECT * FROM openai_api_logs ORDER BY created_at DESC LIMIT 10;
   ```

3. **Verifica errores en el navegador:**
   - Consola del desarrollador (F12)
   - Network tab → Filtrar por "rpc"

4. **Contacta al equipo de desarrollo** con:
   - Screenshot del dashboard
   - Logs de la consola
   - Query de la tabla `openai_api_logs`
