# Configuración del MCP de Supabase

## 🔍 Problema Detectado

El archivo `.mcp.json` estaba configurado incorrectamente con `type: "http"`, pero el servidor MCP de Supabase requiere configuración como `command` con `npx`.

## ✅ Configuración Corregida

El archivo `.mcp.json` ahora tiene la configuración correcta:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=oxadpbdlpvwyapuondei"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}"
      }
    }
  }
}
```

## 📋 Pasos para Completar la Configuración

### 1. Generar Personal Access Token (PAT) en Supabase

1. Ve al [Dashboard de Supabase](https://supabase.com/dashboard)
2. Haz clic en tu perfil (esquina superior derecha)
3. Ve a **Settings** > **Access Tokens**
4. Haz clic en **Create New Token**
5. Dale un nombre descriptivo como "Cursor MCP Server"
6. **Copia el token inmediatamente** (no se mostrará de nuevo)

### 2. Configurar Variable de Entorno

#### En Windows (PowerShell):
```powershell
$env:SUPABASE_ACCESS_TOKEN="tu-token-aqui"
```

#### En Windows (CMD):
```cmd
set SUPABASE_ACCESS_TOKEN=tu-token-aqui
```

#### En Linux/Mac:
```bash
export SUPABASE_ACCESS_TOKEN="tu-token-aqui"
```

### 3. Configuración Permanente (Opcional)

Para que la variable persista entre sesiones, puedes:

#### Windows:
- Agregar la variable en **Configuración del Sistema** > **Variables de Entorno**
- O crear un archivo `.env` en la raíz del proyecto (si Cursor lo soporta)

#### Linux/Mac:
- Agregar al archivo `~/.bashrc` o `~/.zshrc`:
  ```bash
  export SUPABASE_ACCESS_TOKEN="tu-token-aqui"
  ```

### 4. Verificar la Configuración

1. Reinicia Cursor IDE completamente
2. Ve a **Settings** > **Features** > **MCP**
3. Verifica que el servidor "supabase" aparezca con estado "active" (verde)
4. Si hay errores, revisa la consola de Cursor para ver detalles

## 🔒 Seguridad

- ✅ El servidor está configurado en modo `--read-only` para prevenir modificaciones accidentales
- ✅ El `project-ref` está especificado para limitar el acceso a tu proyecto específico
- ⚠️ **NUNCA** subas tu `SUPABASE_ACCESS_TOKEN` a GitHub o repositorios públicos
- ⚠️ El archivo `.mcp.json` usa `${SUPABASE_ACCESS_TOKEN}` que referencia la variable de entorno

## 🛠️ Solución de Problemas

### Error: "Server not found"
- Verifica que la variable de entorno `SUPABASE_ACCESS_TOKEN` esté configurada
- Reinicia Cursor IDE completamente

### Error: "Command not found: npx"
- Asegúrate de tener Node.js instalado (versión 16 o superior)
- Verifica con: `node -v` y `npm -v`

### Error: "Invalid access token"
- Verifica que el token sea correcto
- Genera un nuevo token si es necesario

### El servidor no aparece en la lista de MCP
- Verifica la sintaxis del archivo `.mcp.json` (debe ser JSON válido)
- Asegúrate de que el archivo esté en la raíz del proyecto
- Reinicia Cursor IDE

## 📝 Notas

- El `project-ref` (`oxadpbdlpvwyapuondei`) se extrajo de tu URL de Supabase
- El modo `--read-only` previene modificaciones accidentales pero aún permite leer datos
- Si necesitas escribir datos, puedes remover `--read-only` pero ten cuidado

## 🔗 Referencias

- [Documentación oficial de Supabase MCP](https://supabase.com/docs/guides/mcp)
- [Guía de instalación paso a paso](https://www.youtube.com/watch?v=UrUw-ilChJg)

