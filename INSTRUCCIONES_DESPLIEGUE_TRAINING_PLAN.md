# Instrucciones para Desplegar Edge Function: generate-training-plan

## Problema Actual

El error "Failed to send a request to the Edge Function" indica que la Edge Function `generate-training-plan` no está desplegada en Supabase.

## Solución: Desplegar la Edge Function

### Opción 1: Desde Supabase Dashboard (Recomendado - Más Fácil)

1. **Ve a tu proyecto en Supabase Dashboard:**
   - https://app.supabase.com
   - Selecciona tu proyecto

2. **Navega a Edge Functions:**
   - En el menú lateral, busca **"Edge Functions"**
   - O ve directamente a: **Project Settings > Edge Functions**

3. **Crear nueva función:**
   - Haz clic en **"Create a new function"** o **"New Function"**
   - Nombre de la función: `generate-training-plan` (exactamente así, con guiones)

4. **Copiar el código:**
   - Abre el archivo: `perf-scope-view/supabase/functions/generate-training-plan/index.ts`
   - Copia TODO el contenido del archivo

5. **Pegar y desplegar:**
   - Pega el código en el editor de Supabase
   - Haz clic en **"Deploy"** o **"Save"**

6. **Verificar:**
   - La función debería aparecer en la lista de Edge Functions
   - Estado: "Active" o "Deployed"

### Opción 2: Desde CLI (Si tienes Supabase CLI configurado)

```bash
# 1. Navegar al directorio del proyecto
cd perf-scope-view

# 2. Hacer login (si no lo has hecho)
npx supabase login

# 3. Desplegar la función
npx supabase functions deploy generate-training-plan
```

## Verificar que la API Key esté configurada

La Edge Function necesita la API key de OpenAI configurada en Supabase:

1. **Ve a Project Settings > Edge Functions > Secrets**
2. **Verifica que existe el secret:**
   - Nombre: `OPENAI_API_KEY`
   - Si no existe, agrégalo con tu API key de OpenAI

## Probar la Función

Después de desplegar:

1. Recarga la página de la aplicación
2. Intenta generar el plan de capacitación nuevamente
3. Debería funcionar correctamente

## Nota Importante

Si la función `generate-team-analysis` ya funciona, significa que:
- ✅ La API key de OpenAI ya está configurada
- ✅ Solo necesitas desplegar la nueva función `generate-training-plan`

## Estructura de Archivos

La Edge Function está en:
```
perf-scope-view/
  supabase/
    functions/
      generate-training-plan/
        index.ts          ← Código de la función
        deno.json         ← Configuración de Deno
```

## Troubleshooting

### Error: "Function not found"
- Verifica que el nombre de la función sea exactamente `generate-training-plan`
- Verifica que esté desplegada (debe aparecer en la lista de Edge Functions)

### Error: "OPENAI_API_KEY no configurada"
- Ve a Project Settings > Edge Functions > Secrets
- Agrega el secret `OPENAI_API_KEY` con tu API key de OpenAI

### Error: "Failed to send a request"
- Verifica que la función esté desplegada
- Verifica que tengas conexión a internet
- Revisa los logs de la Edge Function en Supabase Dashboard

