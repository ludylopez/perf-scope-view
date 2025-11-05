# Configuración de Supabase

## 📋 Estado Actual

Tu proyecto ya tiene Supabase configurado con estas credenciales:
- **URL**: `https://oxadpbdlpvwyapuondei.supabase.co`
- **Anon Key**: Configurada en el código

## 🔧 Configuración Recomendada (Variables de Entorno)

Para mayor seguridad, se recomienda usar variables de entorno:

1. **Crea un archivo `.env`** en la raíz del proyecto:
```env
VITE_SUPABASE_URL=https://oxadpbdlpvwyapuondei.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94YWRwYmRscHZ3eWFwdW9uZGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMjU5MzcsImV4cCI6MjA3NzkwMTkzN30.HjIoMaw20qx7DscE-XWCaz88EWa0Jv_aCDcMtv6eadw
```

2. **El archivo `.env` ya está en `.gitignore`** para que no se suba a GitHub

## 🗄️ Aplicar el Esquema de Base de Datos

### Opción 1: Desde el Dashboard de Supabase (Recomendado)

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **SQL Editor**
3. Abre el archivo `supabase/migrations/001_initial_schema.sql`
4. Copia todo el contenido
5. Pégalo en el SQL Editor
6. Haz clic en **Run** o presiona `Ctrl+Enter`

### Opción 2: Usando la Página de Utilidades

1. Inicia sesión como administrador (admin_rrhh o admin_general)
2. Ve al Dashboard
3. Haz clic en **"Estado Base de Datos"**
4. Revisa el estado de las tablas
5. Si falta alguna tabla, copia el SQL de `supabase/migrations/001_initial_schema.sql` y ejecútalo

## ✅ Verificación

### Desde la Interfaz Web:
1. Ve a `/admin/supabase-utils` (como administrador)
2. Verifica el estado de conexión y tablas

### Desde la Consola del Navegador:
Abre la consola del navegador (F12) y ejecuta:
```javascript
// Ver estado completo
window.supabaseUtils.logStatus()

// Probar conexión
window.supabaseUtils.testConnection()

// Crear período 2025-1
window.supabaseUtils.createPeriod2025()
```

## 📝 Notas Importantes

1. **No puedo conectarme directamente** a tu cuenta de Supabase por seguridad
2. **El código YA está conectado** - solo necesitas aplicar el esquema SQL
3. **Las credenciales están hardcodeadas** como fallback si no hay variables de entorno
4. **Para producción**, usa variables de entorno

## 🚀 Próximos Pasos Después de Aplicar el Esquema

1. ✅ Crear período 2025-1 (puedes usar la página de utilidades)
2. ✅ Crear usuarios desde Admin → Usuarios
3. ✅ Asignar colaboradores a jefes desde Admin → Asignaciones
4. ✅ Crear grupos/cuadrillas desde Admin → Grupos

## 🔍 Troubleshooting

### Error: "relation does not exist"
- Significa que las tablas no están creadas
- Aplica el esquema SQL desde `supabase/migrations/001_initial_schema.sql`

### Error: "permission denied"
- Verifica que estés usando la clave correcta (anon key, no service role key)
- Verifica las políticas de seguridad (RLS) en Supabase

### Error de conexión
- Verifica que la URL y la clave sean correctas
- Verifica que tu proyecto Supabase esté activo

