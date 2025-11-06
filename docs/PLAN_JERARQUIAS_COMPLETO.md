# Plan Detallado: Implementación Completa de Sistema de Jerarquías Multi-Nivel

## 🎯 Objetivo
Implementar un sistema completo de evaluación jerárquica que permita:
- Jefes evaluar colaboradores directos (individual y grupal)
- Jefes autoevaluarse
- Jefes superiores evaluar jefes subordinados
- Vista consolidada de equipos y promedios
- Comparativas entre equipos y niveles

---

## 📋 Fase 1: Funciones SQL Base (Backend)

### 1.1 Obtener jefes subordinados directos
**Función**: `get_jefes_subordinados(jefe_superior_dpi)`
- Retorna lista de usuarios que tienen `jefe_inmediato_id = jefe_superior_dpi`
- Incluye información básica y estado de evaluación

### 1.2 Estadísticas del equipo de un jefe
**Función**: `get_equipo_stats(jefe_dpi, periodo_id)`
- Promedio de desempeño del equipo
- Promedio por dimensiones
- Distribución 9-box del equipo
- Total de colaboradores evaluados vs total

### 1.3 Promedio consolidado de equipo
**Función**: `get_promedio_equipo(jefe_dpi, periodo_id)`
- Promedio general de desempeño
- Promedio de potencial
- Tasa de completitud
- Comparación con promedio organizacional

### 1.4 Comparativa entre equipos
**Función**: `get_comparativa_equipos(jefe_superior_dpi, periodo_id)`
- Compara todos los equipos de jefes subordinados
- Ranking de equipos
- Métricas comparativas

### 1.5 Identificar si usuario es jefe intermedio
**Función**: `es_jefe_intermedio(usuario_dpi)`
- Retorna true si tiene jefe Y tiene colaboradores asignados
- Útil para mostrar vistas específicas

---

## 📋 Fase 2: Componentes Frontend

### 2.1 Nueva página: EvaluacionJefes.tsx
**Ruta**: `/evaluacion-jefes`
**Funcionalidad**:
- Lista de jefes subordinados directos
- Para cada jefe muestra:
  - Información personal
  - Su evaluación individual (si ya fue evaluado)
  - Promedio de su equipo
  - Estado de evaluación
- Botón para evaluar cada jefe individualmente
- Vista consolidada de equipos

**Tabs**:
1. **Individual**: Lista de jefes con evaluación individual
2. **Equipos**: Vista de equipos con promedios
3. **Comparativa**: Gráficos comparativos

### 2.2 Mejorar Dashboard.tsx
**Cambios**:
- Verificar si jefe tiene jefe superior (mostrar opción de "Mis Jefes Subordinados")
- Mostrar autoevaluación para jefes igual que colaboradores
- Agregar navegación a nueva vista de jefes

### 2.3 Mejorar EvaluacionColaborador.tsx
**Cambios**:
- Detectar si colaborador pertenece a cuadrilla
- Opción de generar feedback grupal
- Guardar feedback individual y grupal por separado

### 2.4 Mejorar VistaComparativa.tsx
**Cambios**:
- Toggle entre vista individual y grupal
- Mostrar feedback grupal si existe
- Comparar resultados individuales vs promedio grupal

### 2.5 Nueva página: DashboardEquipos.tsx
**Ruta**: `/dashboard-equipos`
**Funcionalidad**:
- Vista consolidada de todos los equipos
- Comparación visual entre equipos
- Métricas agregadas
- Ranking de equipos

---

## 📋 Fase 3: Lógica de Negocio

### 3.1 Detección de jerarquía
- Función JavaScript para detectar nivel jerárquico
- Verificar si usuario tiene jefe superior
- Verificar si usuario tiene colaboradores directos
- Verificar si usuario tiene jefes subordinados

### 3.2 Asignación de evaluación
- Jefe evalúa colaboradores directos (YA EXISTE)
- Jefe superior evalúa jefes subordinados (NUEVO)
- Todos se autoevalúan (YA EXISTE, validar)

### 3.3 Cálculo de promedios
- Promedio simple de desempeño del equipo
- Promedio ponderado (si aplica)
- Promedio por dimensiones

---

## 📋 Fase 4: Migraciones de Base de Datos

### 4.1 Funciones SQL para jerarquías
- Crear todas las funciones SQL necesarias
- Índices para optimización
- Validaciones de integridad

### 4.2 Ajustes a tablas existentes (si necesario)
- Verificar que `jefe_inmediato_id` se use correctamente
- Asegurar que `user_assignments` capture todas las relaciones

---

## 📋 Fase 5: Validaciones y Edge Cases

### 5.1 Casos especiales
- Usuario sin jefe ni colaboradores (colaborador final)
- Usuario con jefe pero sin colaboradores (jefe sin equipo aún)
- Usuario con colaboradores pero sin jefe (director general)
- Usuario con jefe y colaboradores (jefe intermedio)

### 5.2 Validaciones
- No permitir auto-evaluación como jefe de sí mismo
- Verificar que evaluaciones sean del período correcto
- Validar que promedios se calculen solo con evaluaciones completadas

---

## 📋 Fase 6: UI/UX

### 6.1 Navegación mejorada
- Agregar rutas a App.tsx
- Menú contextual según rol y jerarquía
- Breadcrumbs para navegación jerárquica

### 6.2 Visualizaciones
- Gráficos comparativos entre equipos
- Heatmaps de desempeño por equipo
- Tablas interactivas con filtros

---

## 🚀 Orden de Ejecución

1. **Migraciones SQL** (Fase 4.1)
2. **Funciones JavaScript** (Fase 3.1, 3.2, 3.3)
3. **Página EvaluacionJefes** (Fase 2.1)
4. **Mejoras Dashboard** (Fase 2.2)
5. **Mejoras Feedback Grupal** (Fase 2.3, 2.4)
6. **Dashboard Equipos** (Fase 2.5)
7. **Navegación y Rutas** (Fase 6.1)
8. **Validaciones** (Fase 5)

---

## ✅ Criterios de Éxito

- ✅ Jefe puede ver y evaluar a sus jefes subordinados
- ✅ Jefe superior ve promedio de equipos de sus jefes
- ✅ Jefe superior puede comparar equipos
- ✅ Jefes pueden autoevaluarse correctamente
- ✅ Feedback grupal funciona para cuadrillas
- ✅ Vista individual y grupal funcionan correctamente
- ✅ Jerarquía completa funciona sin errores

