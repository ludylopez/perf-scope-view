# Sistema de Niveles de Puesto - Instrucciones de Implementación

## 📋 Resumen de Cambios

Se ha implementado un sistema completo de gestión de niveles de puesto que permite:

- Gestionar los 12 niveles organizacionales desde la interfaz de administración
- Asignación automática de tipo de puesto (administrativo/operativo) según el nivel
- Vinculación automática con instrumentos de evaluación
- Importación masiva de usuarios con nivel de puesto desde Excel

## 🎯 Niveles de Puesto Implementados

| Orden | Código | Nombre del Nivel | Categoría |
|-------|--------|------------------|-----------|
| 1.0 | A1 | ALCALDE MUNICIPAL | Administrativo |
| 1.1 | A2 | ASESORÍA PROFESIONAL | Administrativo |
| 1.2 | S2 | SECRETARIO | Administrativo |
| 2.0 | D1 | GERENTE - DIRECCIONES I | Administrativo |
| 3.0 | D2 | DIRECCIONES II | Administrativo |
| 4.0 | E1 | ENCARGADOS Y JEFES DE UNIDADES I | Administrativo |
| 5.0 | E2 | ENCARGADOS Y JEFES DE UNIDADES II | Administrativo |
| 6.0 | A3 | ADMINISTRATIVOS I | Administrativo |
| 7.0 | A4 | ADMINISTRATIVOS II | Administrativo |
| 8.0 | OTE | OPERATIVOS - TÉCNICO ESPECIALIZADO | Operativo |
| 9.0 | O1 | OPERATIVOS I | Operativo |
| 10.0 | O2 | OPERATIVOS II | Operativo |
| 11.0 | OS | OTROS SERVICIOS | Operativo |

## 🔧 Archivos Modificados/Creados

### Backend (SQL)
- ✅ `supabase/migrations/013_job_levels_system.sql` - Migración completa del sistema

### Frontend (TypeScript/React)
- ✅ `src/types/jobLevel.ts` - Tipos TypeScript para niveles
- ✅ `src/lib/jobLevels.ts` - Funciones de gestión de niveles
- ✅ `src/pages/AdminNiveles.tsx` - Interfaz de administración de niveles
- ✅ `src/App.tsx` - Ruta agregada: `/admin/niveles`
- ✅ `src/pages/AdminUsuarios.tsx` - Selector dinámico de niveles
- ✅ `src/lib/importUsers.ts` - Actualizado para soportar nuevos niveles
- ✅ `src/lib/instruments.ts` - Mapeo de niveles a instrumentos actualizado

## 📝 Pasos para Implementar

### 1. Ejecutar Migración SQL

**IMPORTANTE**: Esta migración debe ejecutarse ANTES de eliminar usuarios existentes.

1. Ir al [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleccionar el proyecto: `https://oxadpbdlpvwyapuondei.supabase.co`
3. Ir a **SQL Editor**
4. Crear una nueva query
5. Copiar el contenido completo de `supabase/migrations/013_job_levels_system.sql`
6. Ejecutar la query
7. Verificar que no haya errores

**Verificación**:
```sql
-- Verificar que la tabla se creó correctamente
SELECT * FROM job_levels ORDER BY hierarchical_order;

-- Debería retornar 13 filas con todos los niveles

-- Verificar las funciones
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE '%job_level%';
```

### 2. Verificar Integridad de Datos

Si tienes usuarios existentes con niveles antiguos:

```sql
-- Ver usuarios con niveles que no existen en job_levels
SELECT u.dpi, u.nombre, u.nivel
FROM users u
WHERE u.nivel IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM job_levels jl WHERE jl.code = u.nivel);

-- Si hay usuarios con niveles inválidos, actualizarlos manualmente
-- Por ejemplo, si un usuario tiene 'S1' y ahora es 'S2':
UPDATE users SET nivel = 'S2' WHERE nivel = 'S1';
```

### 3. Deploy del Frontend

El código del frontend ya está actualizado en el branch. Solo necesitas:

1. Verificar que los cambios están en el branch `claude/incomplete-request-011CUuDDk2WA8CWwFEgMaTqs`
2. Hacer merge o push según tu flujo de trabajo
3. El deploy debería ser automático si estás usando Lovable.dev

### 4. Probar el Sistema

#### Acceder a Gestión de Niveles
1. Ir a `/admin/usuarios`
2. Click en botón **"Niveles de Puesto"**
3. Verificar que aparecen los 12 niveles configurados
4. Probar crear/editar/eliminar niveles (solo admin_general y admin_rrhh)

#### Crear Usuario
1. Ir a `/admin/usuarios`
2. Click en **"Crear Usuario"**
3. Verificar que el selector de "Nivel de Puesto" muestra los 12 niveles
4. Crear un usuario de prueba
5. Verificar que el `tipo_puesto` se asignó automáticamente

#### Importar Usuarios
1. Preparar Excel con las columnas del ejemplo proporcionado
2. Ir a `/admin/usuarios`
3. Click en **"Importar Usuarios"**
4. Seleccionar archivo Excel
5. Verificar que los usuarios se importan con su nivel correcto
6. Verificar que `tipo_puesto` se asignó automáticamente

## 🔑 Características Clave

### Asignación Automática de Tipo de Puesto
El sistema incluye un **trigger SQL** que automáticamente asigna el `tipo_puesto` cuando se asigna o actualiza el `nivel` de un usuario:

```sql
-- Trigger: sync_tipo_puesto_from_job_level
-- Se ejecuta automáticamente al insertar/actualizar usuarios
```

Esto significa que:
- ✅ No necesitas especificar manualmente el tipo de puesto
- ✅ El tipo de puesto siempre estará sincronizado con el nivel
- ✅ Si cambias el nivel de un usuario, su tipo de puesto se actualiza automáticamente

### Validaciones
- ✅ No se pueden crear niveles con código duplicado
- ✅ No se pueden crear niveles con orden jerárquico duplicado
- ✅ No se pueden eliminar niveles que tengan usuarios asignados
- ✅ No se pueden eliminar niveles que tengan instrumentos configurados
- ✅ Solo admin_general y admin_rrhh pueden gestionar niveles

### Integración con Instrumentos
Cada nivel de puesto tendrá su propio instrumento de evaluación. El sistema ya está preparado para esto:

```typescript
// En src/lib/instruments.ts
const nivelToInstrument: Record<string, string> = {
  "A1": "A1",   // ALCALDE MUNICIPAL
  "A2": "A2",   // ASESORÍA PROFESIONAL
  // ... etc
};
```

Cuando se creen los 12 instrumentos, solo necesitas:
1. Agregarlos en `src/data/instruments.ts`
2. Registrarlos en el objeto `INSTRUMENTS` de `src/lib/instruments.ts`

## 🚨 Importante ANTES de Importar 400 Usuarios

1. ✅ **Ejecutar migración SQL** (paso 1)
2. ✅ **Verificar que job_levels tiene 13 niveles**
3. ✅ **Eliminar usuarios de prueba** existentes si es necesario
4. ✅ **Verificar formato del Excel** (columna "Nivel de puesto" debe contener códigos como O2, A1, etc.)
5. ✅ **Hacer backup** de la base de datos antes de importación masiva

## 📊 Formato del Excel para Importación

El Excel debe tener estas columnas:

| Columna | Ejemplo | Requerido |
|---------|---------|-----------|
| NOMBRE | Juana Cazanga Díaz | ✅ Sí |
| DPI | 1636 35625 2007 | ✅ Sí |
| FECHA DE NACIMIENTO | 24/06/1973 | ✅ Sí |
| FECHA DE INICIO LABORAL | 01/08/2022 | Opcional |
| Nivel de puesto | O2 | ✅ Sí |
| PUESTO | Conserje | ✅ Sí (se mapea a cargo) |
| DEPARTAMENTO O DEPENDENCIA | Conservación... | ✅ Sí (se mapea a area) |
| Sexo | Femenino | Opcional |

**NOTA IMPORTANTE**: La columna "Nivel de puesto" debe contener el **código** del nivel (A1, O2, D1, etc.), NO el nombre completo.

## 🔍 Solución de Problemas

### Error: "duplicate key value violates unique constraint"
- **Causa**: Ya existe la tabla job_levels o los datos
- **Solución**: Eliminar la tabla existente o usar `DROP TABLE IF EXISTS job_levels CASCADE;` antes de la migración

### Error: "foreign key constraint fails"
- **Causa**: Hay usuarios con niveles que no existen en job_levels
- **Solución**: Ejecutar el query de verificación del paso 2 y corregir niveles inválidos

### Los niveles no aparecen en el selector
- **Causa**: La migración no se ejecutó o falló
- **Solución**: Verificar en SQL Editor: `SELECT COUNT(*) FROM job_levels;` debe retornar 13

### El tipo_puesto no se asigna automáticamente
- **Causa**: El trigger no se creó correctamente
- **Solución**: Verificar que existe el trigger:
  ```sql
  SELECT * FROM information_schema.triggers WHERE trigger_name = 'trigger_sync_tipo_puesto';
  ```

## 📞 Soporte

Si encuentras algún problema:
1. Revisar los logs de Supabase en SQL Editor
2. Verificar que todas las migraciones anteriores se ejecutaron correctamente
3. Verificar que el usuario tiene permisos de admin_general o admin_rrhh

## ✅ Checklist Final

- [ ] Migración SQL ejecutada sin errores
- [ ] Tabla job_levels tiene 13 niveles
- [ ] Funciones SQL creadas correctamente
- [ ] Trigger sync_tipo_puesto funciona
- [ ] Página `/admin/niveles` es accesible
- [ ] Selector de niveles en AdminUsuarios funciona
- [ ] Importación de usuarios con nivel de puesto funciona
- [ ] Tipo de puesto se asigna automáticamente
- [ ] Listo para importar los 400 colaboradores

---

**Fecha de implementación**: 2025-11-09
**Branch**: `claude/incomplete-request-011CUuDDk2WA8CWwFEgMaTqs`
**Migración**: `013_job_levels_system.sql`
