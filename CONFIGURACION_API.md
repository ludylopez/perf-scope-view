# Configuración de API de Google Gemini

## ¿Dónde agregar la API Key de Gemini?

La API key de Google Gemini debe configurarse mediante **variables de entorno** en un archivo `.env` en la raíz del proyecto.

## Pasos para configurar la API Key

### 1. Crear archivo `.env`

En la raíz del proyecto (mismo nivel que `package.json`), crea un archivo llamado `.env` con el siguiente contenido:

```env
VITE_GEMINI_API_KEY=tu_api_key_aqui
```

### 2. Obtener tu API Key de Google Gemini

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en "Create API Key"
4. Copia la API key generada
5. Pégalo en el archivo `.env` reemplazando `tu_api_key_aqui`

### 3. Formato del archivo `.env`

```env
# API Key de Google Gemini
VITE_GEMINI_API_KEY=AIzaSyTuClaveAqui1234567890

# También puedes agregar las variables de Supabase si las tienes
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### 4. Reiniciar el servidor de desarrollo

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
- ❌ **NO** configures la API key desde la interfaz de usuario
- ❌ **NO** compartas tu API key públicamente

## Verificación

Para verificar que la API key está configurada correctamente:

1. Inicia sesión como administrador (Admin General o Admin RR.HH.)
2. Ve a "Configuración Sistema" desde el dashboard
3. Deberías ver que la API key está configurada (se mostrará un indicador verde)
4. Las estadísticas de uso de API se mostrarán ahí

## Fallback para desarrollo

Si no configuras la API key en el archivo `.env`, el sistema intentará obtenerla desde `localStorage` con la clave `gemini_api_key_global`. Esto es solo para desarrollo local y **no debe usarse en producción**.

## Solución de problemas

### Error: "API key no configurada"
- Verifica que el archivo `.env` existe en la raíz del proyecto
- Verifica que la variable se llama exactamente `VITE_GEMINI_API_KEY`
- Reinicia el servidor de desarrollo después de crear/modificar `.env`

### Error: "Invalid API key"
- Verifica que copiaste la API key completa sin espacios
- Verifica que la API key no haya expirado en Google AI Studio
- Asegúrate de tener cuota disponible en tu cuenta de Google

