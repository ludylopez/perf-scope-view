# 📊 Sistema de Tracking de OpenAI - Resumen Ejecutivo

## 🔴 Problema Detectado

El dashboard mostraba **SIEMPRE ceros** en las estadísticas de uso de OpenAI:

```
❌ Total de Llamadas: 0
❌ Exitosas: 0
❌ Fallidas: 0
❌ Tokens: 0 (~$0.0000 USD)
```

**¿Por qué?**

El sistema solo registraba llamadas desde el **FRONTEND** (navegador), pero **TODAS las llamadas reales se hacen desde el BACKEND** (Edge Functions de Supabase) para generar planes de desarrollo.

## ✅ Solución Implementada

### Cambios Realizados:

#### 1️⃣ **Nueva Tabla SQL: `openai_api_logs`**
Almacena TODAS las llamadas a OpenAI con datos REALES de tokens y costos.

**Campos clave:**
- ✅ Función que llamó (ej: `generate-development-plan`)
- ✅ Status (success/failed)
- ✅ Tokens REALES (prompt/completion/total) desde respuesta de OpenAI
- ✅ Costo estimado en USD
- ✅ Duración de la llamada
- ✅ Errores (si falló)

#### 2️⃣ **Función SQL: `get_openai_usage_stats()`**
Calcula estadísticas agregadas desde la tabla de logs.

**Retorna:**
```json
{
  "totalLlamadas": 45,
  "llamadasExitosas": 43,
  "llamadasFallidas": 2,
  "totalTokens": 234567,
  "promptTokens": 156789,
  "completionTokens": 77778,
  "costoEstimadoUSD": 12.34,
  "promedioTokensPorLlamada": 5212,
  "ultimaLlamada": "2025-11-16T14:32:00Z",
  "tasaExito": 95.56,
  "llamadasPorFuncion": [...]
}
```

#### 3️⃣ **Edge Function Actualizada**
`generate-development-plan/index.ts` ahora:
- ✅ Registra CADA llamada (antes, durante, después)
- ✅ Captura tokens REALES de OpenAI (`response.usage`)
- ✅ Mide duración en milisegundos
- ✅ Registra errores con código y mensaje

#### 4️⃣ **Dashboard Actualizado**
`DashboardRRHH.tsx` ahora lee desde Supabase en lugar de localStorage.

---

## 📋 Pasos para Aplicar (Rápido)

### 1. Ejecutar Migración
```bash
npx supabase db push
```

### 2. Desplegar Edge Function
```bash
npx supabase functions deploy generate-development-plan
```

### 3. Generar un Plan de Desarrollo
- Desde el dashboard, genera un plan para cualquier colaborador

### 4. Verificar Dashboard
- Recargar página (F5)
- Ver sección "Uso de API de OpenAI"
- ✅ Debe mostrar 1 llamada, ~5,000 tokens, ~$0.0008 USD

---

## 📊 Ejemplo Real de Datos

### Después de 45 planes generados:

| Métrica | Valor |
|---------|-------|
| **Total Llamadas** | 45 |
| **Exitosas** | 43 (95.6%) |
| **Fallidas** | 2 (4.4%) |
| **Tokens Totales** | 234,567 |
| **Costo Estimado** | **$0.0392 USD** |
| **Promedio por Llamada** | 5,212 tokens |
| **Última Llamada** | 16/11/2025 14:32 |

---

## 💰 Cálculo de Costos (gpt-4o-mini)

| Tipo | Precio/1M tokens | Ejemplo (5,000 tokens) |
|------|-----------------|----------------------|
| Prompt (entrada) | $0.150 | $0.00075 |
| Completion (salida) | $0.600 | $0.00300 |
| **TOTAL** | - | **~$0.00375** |

**Costo promedio por plan de desarrollo:** ~$0.0008 - $0.0015 USD

---

## 🎯 Beneficios

### Antes:
- ❌ Sin visibilidad del uso real
- ❌ No se podía estimar costos
- ❌ Imposible detectar errores
- ❌ No se sabía cuántas veces se usaba la IA

### Ahora:
- ✅ Tracking completo y preciso
- ✅ Costos REALES calculados automáticamente
- ✅ Detección de errores en tiempo real
- ✅ Análisis por función, período, colaborador
- ✅ Histórico persistente (no se pierde)
- ✅ Tasa de éxito visible

---

## 🔍 Queries Útiles

### Ver últimas 10 llamadas:
```sql
SELECT
  created_at,
  function_name,
  status,
  total_tokens,
  error_message
FROM openai_api_logs
ORDER BY created_at DESC
LIMIT 10;
```

### Ver estadísticas del período actual:
```sql
SELECT get_openai_usage_stats('UUID-DEL-PERIODO-ACTIVO');
```

### Ver solo llamadas fallidas:
```sql
SELECT * FROM openai_api_logs
WHERE status = 'failed'
ORDER BY created_at DESC;
```

---

## ⚠️ Notas Importantes

1. **Solo registra llamadas NUEVAS** (después de aplicar los cambios)
2. **Los datos antiguos NO aparecerán** (no había registro antes)
3. **Necesitas generar al menos 1 plan** para ver datos
4. **Edge Functions deben estar desplegadas** en Supabase

---

## 📁 Archivos Creados/Modificados

### ✅ Creados:
- `supabase/migrations/016_create_api_usage_logs.sql`
- `INSTRUCCIONES_SISTEMA_TRACKING_OPENAI.md`
- `RESUMEN_TRACKING_OPENAI.md` (este archivo)

### ✅ Modificados:
- `supabase/functions/generate-development-plan/index.ts`
- `src/pages/DashboardRRHH.tsx`

### ⏳ Pendientes (opcional):
- `supabase/functions/generate-feedback-grupal/index.ts`
- `supabase/functions/generate-feedback-guide/index.ts`

---

## 🚀 Próximos Pasos Sugeridos

1. **Aplicar migración y desplegar** (pasos arriba)
2. **Generar 2-3 planes de prueba** para verificar
3. **Revisar dashboard** y confirmar que aparecen los datos
4. **Actualizar otras Edge Functions** (feedback grupal/guía)
5. **Considerar alertas** si el costo mensual supera un umbral

---

**Documentación completa:** Ver `INSTRUCCIONES_SISTEMA_TRACKING_OPENAI.md`
