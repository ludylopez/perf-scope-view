# Análisis de Roles de Usuario

## 📊 Estado Actual

### Roles Definidos en TypeScript (`src/types/auth.ts`)
```typescript
type UserRole = "colaborador" | "jefe" | "admin_rrhh" | "admin_general"
```

### Roles en la Base de Datos
| Rol | Cantidad | Niveles | Descripción |
|-----|----------|---------|-------------|
| `colaborador` | 392 | A3, A4, D1, D2, E1, E2, O1, O2, OTE, S2 | Colaboradores regulares |
| `supervisor` | 9 | A1, C1 | **⚠️ NO definido en TypeScript** |
| `jefe` | 2 | D1, D2 | Jefes con colaboradores |
| `admin_rrhh` | 1 | C1 | Administrador de RRHH |

## ⚠️ Problema Detectado

El rol `"supervisor"` se está usando para:
- **A1 (Alcalde Municipal)**: 1 usuario
- **C1 (Concejo Municipal)**: 8 usuarios

Pero este rol **NO está definido** en el tipo TypeScript, lo que puede causar:
- Errores de tipo en TypeScript
- Comportamiento inesperado en el código
- Problemas de autenticación/autorización

## 🔍 Uso Actual en el Código

El código actualmente **NO usa el rol** para determinar permisos de A1 y C1, sino que usa el **nivel**:
- `user?.nivel === 'C1'` → Concejo Municipal
- `user?.nivel === 'A1'` → Alcalde Municipal

### Ejemplos en el código:
```typescript
// Dashboard.tsx
{(isColaborador || user?.nivel === 'C1' || user?.nivel === 'A1') && (
  // Mostrar autoevaluación
)}

// Validaciones
if (evaluador.nivel === "C1") {
  return await validateConcejoEvaluation(...);
} else if (evaluador.nivel === "A1") {
  return await validateAlcaldeEvaluation(...);
}
```

## 💡 Recomendación

### Opción 1: Eliminar rol "supervisor" y usar "jefe" (RECOMENDADO)
**Ventajas:**
- ✅ Simplifica el sistema (menos roles)
- ✅ A1 y C1 técnicamente SÍ son jefes (tienen colaboradores)
- ✅ No requiere cambios en TypeScript
- ✅ El código ya maneja casos especiales por nivel

**Acción:**
```sql
-- Cambiar todos los "supervisor" a "jefe"
UPDATE users 
SET rol = 'jefe' 
WHERE rol = 'supervisor';
```

### Opción 2: Agregar "supervisor" al tipo TypeScript
**Ventajas:**
- ✅ Mantiene la distinción semántica
- ✅ Más explícito sobre el tipo de usuario

**Desventajas:**
- ❌ Agrega complejidad innecesaria
- ❌ Requiere cambios en múltiples archivos
- ❌ El código ya funciona con niveles

## 🎯 Roles Realmente Necesarios

Según la lógica del sistema:

1. **`colaborador`**: Usuarios que solo se autoevalúan
   - Niveles: A3, A4, E1, E2, O1, O2, OTE, S2 (algunos)

2. **`jefe`**: Usuarios que evalúan a otros
   - Niveles: D1, D2, A1, C1
   - Tienen colaboradores asignados en `user_assignments`

3. **`admin_rrhh`**: Administrador de Recursos Humanos
   - Acceso a reportes, asignaciones, configuración

4. **`admin_general`**: Administrador del sistema
   - Acceso completo

## ✅ Conclusión

**El rol "supervisor" es redundante** porque:
- A1 y C1 ya se identifican por su nivel
- El código no usa el rol para estos casos especiales
- Técnicamente son jefes (tienen colaboradores)

**Recomendación:** Cambiar `supervisor` → `jefe` en la base de datos.


