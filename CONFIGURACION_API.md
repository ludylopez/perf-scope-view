# Configuración de API de OpenAI

## ¿Dónde agregar la API Key de OpenAI?

La API key de OpenAI debe configurarse mediante **variables de entorno** en un archivo `.env` en la raíz del proyecto.

## Pasos para configurar la API Key

### 1. Crear archivo `.env`

En la raíz del proyecto (mismo nivel que `package.json`), crea un archivo llamado `.env` con el siguiente contenido:

```env
VITE_OPENAI_API_KEY=tu_api_key_aqui
```

### 2. Obtener tu API Key de OpenAI

1. Ve a [OpenAI Platform](https://platform.openai.com/api-keys)
2. Inicia sesión con tu cuenta de OpenAI
3. Haz clic en "Create new secret key"
4. Copia la API key generada (solo se muestra una vez)
5. Pégalo en el archivo `.env` reemplazando `tu_api_key_aqui`

### 3. Formato del archivo `.env`

```env
# API Key de OpenAI
VITE_OPENAI_API_KEY=sk-TuClaveAqui1234567890

# También puedes agregar las variables de Supabase si las tienes
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### 4. Configurar en Supabase Edge Functions

Para las Edge Functions, también necesitas configurar la variable de entorno en Supabase:

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a "Project Settings" > "Edge Functions" > "Secrets"
3. Agrega una nueva variable secreta:
   - Nombre: `OPENAI_API_KEY`
   - Valor: Tu API key de OpenAI

### 5. Reiniciar el servidor de desarrollo

Después de crear o modificar el archivo `.env`, **debes reiniciar el servidor de desarrollo**:

```bash
# Detener el servidor (Ctrl+C)
# Luego iniciarlo de nuevo
npm run dev
```

## Importante

- ✅ El archivo `.env` está en `.gitignore` y **NO se subirá a GitHub** por seguridad
- ✅ La API key se usa globalmente para toda la plataforma
- ✅ Los administradores pueden ver el consumo de créditos en la página "Configuración Sistema"
- ✅ Con system instructions de OpenAI, el contexto estático no se cuenta en tokens de entrada, optimizando costos
- ❌ **NO** configures la API key desde la interfaz de usuario
- ❌ **NO** compartas tu API key públicamente

## Verificación

Para verificar que la API key está configurada correctamente:

1. Inicia sesión como administrador (Admin General o Admin RR.HH.)
2. Ve a "Configuración Sistema" desde el dashboard
3. Deberías ver que la API key está configurada (se mostrará un indicador verde)
4. Las estadísticas de uso de API se mostrarán ahí

## Fallback para desarrollo

Si no configuras la API key en el archivo `.env`, el sistema intentará obtenerla desde `localStorage` con la clave `openai_api_key_global`. Esto es solo para desarrollo local y **no debe usarse en producción**.

## Solución de problemas

### Error: "API key no configurada"
- Verifica que el archivo `.env` existe en la raíz del proyecto
- Verifica que la variable se llama exactamente `VITE_OPENAI_API_KEY`
- Verifica que también configuraste `OPENAI_API_KEY` en Supabase Edge Functions
- Reinicia el servidor de desarrollo después de crear/modificar `.env`

### Error: "Invalid API key"
- Verifica que copiaste la API key completa sin espacios
- Verifica que la API key no haya expirado en OpenAI Platform
- Asegúrate de tener créditos disponibles en tu cuenta de OpenAI
- Verifica que la API key tenga los permisos necesarios

### Error en Edge Functions
- Verifica que configuraste `OPENAI_API_KEY` en los secrets de Supabase
- Verifica que el nombre de la variable sea exactamente `OPENAI_API_KEY` (sin `VITE_`)

## Modelo utilizado

El sistema utiliza **GPT-4o-mini** de OpenAI, que es:
- Económico y eficiente
- Potente para tareas estructuradas
- Soporta `response_format: { type: "json_object" }` para respuestas JSON
- Optimizado con system instructions para reducir consumo de tokens

## Optimización de costos

El sistema está optimizado para reducir costos mediante:
- **System Instructions**: El contexto estático (Esquipulas, recursos, metodología) se envía como system prompt y no se cuenta en tokens de entrada en cada request
- **Separación de prompts**: Cada tipo de generación (plan, feedback individual, feedback grupal) tiene su propio system prompt optimizado
- **Respuestas JSON estructuradas**: Usa `response_format: { type: "json_object" }` para garantizar formato consistente
