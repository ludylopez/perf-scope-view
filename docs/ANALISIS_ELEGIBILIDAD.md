# Análisis: Criterios de Elegibilidad para Evaluación 2025

## Información del Período

- **Período evaluado**: Enero a Octubre 2025
- **Fecha de evaluación**: Noviembre 2025
- **Período de evaluación**: "2025-1" (Enero-Octubre 2025)

## Criterios de Elegibilidad

### Administrativos
- **Mínimo de antigüedad**: 3 meses
- **Cálculo**: Desde `fecha_ingreso` hasta la fecha actual >= 3 meses

### Operativos
- **Mínimo de antigüedad**: 6 meses  
- **Cálculo**: Desde `fecha_ingreso` hasta la fecha actual >= 6 meses

## Cambios Implementados

### 1. Base de Datos (Migración 009)
- ✅ Agregado campo `fecha_ingreso` (DATE) a tabla `users`
- ✅ Agregado campo `tipo_puesto` (VARCHAR) con CHECK constraint ('administrativo', 'operativo')
- ✅ Función SQL `calcular_antiguedad_meses(usuario_dpi)`
- ✅ Función SQL `verificar_elegibilidad_evaluacion(usuario_dpi)`
- ✅ Índices para optimizar consultas

### 2. Frontend - Funciones (src/lib/supabase.ts)
- ✅ `verificarElegibilidad(usuarioDpi)` - Verifica elegibilidad
- ✅ `calcularAntiguedadMeses(usuarioDpi)` - Calcula antigüedad

### 3. Componentes Pendientes de Actualizar

#### AdminUsuarios.tsx
- [ ] Agregar campo `fecha_ingreso` en formulario de creación/edición
- [ ] Agregar campo `tipo_puesto` (select: administrativo/operativo)
- [ ] Mostrar antigüedad calculada en tabla de usuarios
- [ ] Mostrar badge de elegibilidad en tabla

#### Autoevaluacion.tsx
- [ ] Verificar elegibilidad antes de permitir acceso
- [ ] Mostrar mensaje informativo si no es elegible
- [ ] Bloquear acceso al formulario si no cumple criterios

#### Dashboard.tsx
- [ ] Verificar elegibilidad antes de mostrar botón de autoevaluación
- [ ] Mostrar mensaje informativo sobre elegibilidad

#### EvaluacionEquipo.tsx
- [ ] Filtrar colaboradores elegibles en la lista
- [ ] Mostrar indicador de elegibilidad para cada colaborador
- [ ] Permitir evaluación solo de colaboradores elegibles

#### EvaluacionColaborador.tsx
- [ ] Verificar elegibilidad del colaborador antes de permitir evaluación
- [ ] Mostrar mensaje si el colaborador no es elegible

#### DashboardRRHH.tsx
- [ ] Agregar estadísticas de elegibilidad
- [ ] Mostrar gráfico de elegibilidad vs no elegibles
- [ ] Filtrar reportes por elegibilidad

## Consideraciones Importantes

1. **Fecha de ingreso**: Debe ser en formato DATE (YYYY-MM-DD)
2. **Tipo de puesto**: Campo obligatorio para calcular elegibilidad
3. **Cálculo de meses**: Se calcula desde `fecha_ingreso` hasta la fecha actual
4. **Fallback**: Si no hay datos, el sistema permite acceso (por compatibilidad)
5. **Migración**: Debe ejecutarse antes de usar estas funciones

## Próximos Pasos

1. Ejecutar migración 009 en Supabase
2. Actualizar AdminUsuarios para capturar fecha_ingreso y tipo_puesto
3. Implementar verificaciones de elegibilidad en todos los componentes
4. Actualizar importación masiva de usuarios para incluir estos campos
5. Probar con datos reales

