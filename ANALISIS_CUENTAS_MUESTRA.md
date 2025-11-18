# Análisis de Cuentas de Muestra y Creación de Nuevas Cuentas Admin

## 📋 Plan de Análisis

### 1. Identificar Cuentas de Muestra/Prueba
- Buscar usuarios con roles `admin_rrhh` o `admin_general`
- Buscar usuarios con nombres/correos que indiquen prueba (test, demo, admin, etc.)
- Verificar fechas de creación recientes (posibles cuentas de prueba)

### 2. Verificar Dependencias Antes de Eliminar
Para cada cuenta de muestra identificada, verificar:
- **Asignaciones** (`user_assignments`): Como jefe o como colaborador
- **Evaluaciones** (`evaluations`): Como evaluador o evaluado
- **Grupos** (`groups`): Como jefe de grupo
- **Resultados finales** (`final_evaluation_results`): Si tiene resultados asociados
- **Planes de desarrollo** (`development_plans`): Si tiene planes asociados

### 3. Campos Requeridos para Crear Usuarios Admin

#### Campos OBLIGATORIOS:
- `dpi` (VARCHAR(20), PRIMARY KEY)
- `nombre` (VARCHAR(255))
- `apellidos` (VARCHAR(255))
- `fecha_nacimiento` (VARCHAR(10), formato DDMMAAAA - 8 dígitos)
- `nivel` (VARCHAR(10))
- `cargo` (VARCHAR(255))
- `area` (VARCHAR(255))
- `rol` (VARCHAR(50)) - 'admin_rrhh' o 'admin_general'
- `estado` (VARCHAR(20)) - 'activo'

#### Campos OPCIONALES pero recomendados:
- `correo` (VARCHAR(255)) - Para contacto
- `telefono` (VARCHAR(20))
- `password_hash` (VARCHAR(255)) - Hash SHA-256 de la contraseña

### 4. Proceso de Eliminación Segura

**IMPORTANTE:** No eliminar físicamente, sino:
1. Verificar todas las relaciones
2. Si tiene relaciones activas:
   - Desactivar asignaciones (`activo = false`)
   - Marcar usuario como inactivo (`estado = 'inactivo'`)
   - O eliminar solo si no tiene relaciones críticas
3. Si no tiene relaciones:
   - Eliminar físicamente de la base de datos

### 5. Proceso de Creación de Nuevas Cuentas

1. **Administrador General (admin_general)**
   - DPI: [Solicitar al usuario]
   - Nombre y apellidos: [Solicitar al usuario]
   - Fecha de nacimiento: [Solicitar al usuario]
   - Nivel: Puede ser cualquier nivel (sugerencia: A1 o D1)
   - Cargo: "Administrador General" o similar
   - Área: "Administración" o similar
   - Rol: `admin_general`
   - Contraseña: [Generar o solicitar]

2. **Administrador RRHH (admin_rrhh)**
   - DPI: [Solicitar al usuario]
   - Nombre y apellidos: [Solicitar al usuario]
   - Fecha de nacimiento: [Solicitar al usuario]
   - Nivel: Puede ser cualquier nivel (sugerencia: D1 o S2)
   - Cargo: "Encargado de Recursos Humanos" o similar
   - Área: "Recursos Humanos" o similar
   - Rol: `admin_rrhh`
   - Contraseña: [Generar o solicitar]

### 6. Generación de Password Hash

El sistema usa SHA-256 para hash de contraseñas.
Para generar el hash en JavaScript:
```javascript
const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};
```

### 7. Verificaciones Post-Creación

Después de crear las cuentas:
- Verificar que se crearon correctamente
- Probar login con las nuevas credenciales
- Verificar que tienen acceso a las páginas admin correspondientes
- Confirmar que pueden realizar operaciones administrativas

