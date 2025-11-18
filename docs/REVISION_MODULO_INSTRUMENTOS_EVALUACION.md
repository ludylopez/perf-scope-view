# Revisión Completa: Módulo de Instrumentos de Evaluación

## 📋 Resumen Ejecutivo

Este documento describe el funcionamiento completo del módulo de instrumentos de evaluación, desde su programación hasta cómo lo ven los diferentes actores (colaboradores, jefes, administradores).

---

## 1. 🎯 Programación y Configuración de Instrumentos

### 1.1 Definición de Instrumentos

Los instrumentos se definen **programáticamente** en el código fuente:

**Ubicación:** `src/data/instruments.ts` y `src/lib/instruments.ts`

**Estructura de un Instrumento:**
```typescript
interface Instrument {
  id: string;                    // Ej: "A1_2025_V1"
  nivel: string;                 // Ej: "A1", "A3", "E1", etc.
  version: string;                // Ej: "2025_V1"
  tiempoEstimado: string;         // Ej: "45 minutos"
  dimensionesDesempeno: Dimension[];  // Dimensiones de desempeño
  dimensionesPotencial?: Dimension[]; // Dimensiones de potencial (opcional)
}
```

**Estado Actual:**
- ✅ **A1** (Alcalde Municipal) - Implementado
- ✅ **A3** (Administrativos I) - Implementado
- ⏳ **A2, S2, D1, D2, E1, E2, A4, OTE, O1, O2, OS** - Pendientes de implementar

### 1.2 Administración de Instrumentos

**Página:** `src/pages/AdminInstrumentos.tsx`

**Funcionalidades:**
- ✅ Visualización de todos los instrumentos disponibles
- ✅ Ver detalles completos de cada instrumento (dimensiones, ítems, pesos)
- ✅ Resumen estadístico (total de instrumentos, niveles cubiertos)
- ❌ **NO permite edición** - Los instrumentos se configuran programáticamente
- ❌ **NO permite creación** - Requiere desarrollo de código

**Acceso:** Solo `admin_rrhh` y `admin_general`

---

## 2. 🔄 Asignación de Instrumentos a Colaboradores

### 2.1 Asignación Automática por Nivel

**Lógica:** `src/lib/instruments.ts` → `getInstrumentForUser()`

**Flujo:**
1. El sistema busca el instrumento que coincida exactamente con el `nivel` del usuario
2. Si no hay coincidencia exacta, busca por prefijo (ej: "A*" para niveles A1, A2, A3)
3. Si no encuentra nada, usa **A1 como fallback**

**Ejemplo:**
```typescript
// Usuario con nivel "A3"
const instrument = await getInstrumentForUser("A3");
// Retorna: INSTRUMENT_A3

// Usuario con nivel "A1"
const instrument = await getInstrumentForUser("A1");
// Retorna: INSTRUMENT_A1
```

### 2.2 Override Manual

**Campo en BD:** `users.instrumento_id` (VARCHAR(50))

**Funcionalidad:**
- Permite asignar un instrumento específico a un usuario, **sobreescribiendo** la asignación automática
- Útil para casos especiales o pruebas

**Ejemplo:**
```sql
-- Asignar instrumento A1 a un usuario de nivel A3
UPDATE users 
SET instrumento_id = 'A1' 
WHERE dpi = '1234567890101';
```

**Prioridad:**
1. **Primero:** Override manual (`instrumento_id` en `users`)
2. **Segundo:** Asignación automática por nivel
3. **Tercero:** Fallback a A1

### 2.3 Mapeo de Niveles a Instrumentos

**Función:** `getRecommendedInstrumentId()` en `src/lib/instruments.ts`

**Mapeo:**
```
A1  → A1   (ALCALDE MUNICIPAL)
A2  → A2   (ASESORÍA PROFESIONAL)
S2  → S2   (SECRETARIO)
D1  → D1   (GERENTE - DIRECCIONES I)
D2  → D2   (DIRECCIONES II)
E1  → E1   (ENCARGADOS Y JEFES DE UNIDADES I)
E2  → E2   (ENCARGADOS Y JEFES DE UNIDADES II)
A3  → A3   (ADMINISTRATIVOS I)
A4  → A4   (ADMINISTRATIVOS II)
OTE → OTE  (OPERATIVOS - TÉCNICO ESPECIALIZADO)
O1  → O1   (OPERATIVOS I)
O2  → O2   (OPERATIVOS II)
OS  → OS   (OTROS SERVICIOS)
```

---

## 3. 👤 Vista del Colaborador (Empleado)

### 3.1 Autoevaluación

**Página:** `src/pages/Autoevaluacion.tsx`

**Flujo:**
1. El colaborador accede desde el Dashboard
2. El sistema carga automáticamente el instrumento según su nivel
3. El colaborador completa:
   - ✅ **Dimensiones de Desempeño** (todas obligatorias)
   - ✅ **Pregunta NPS** (Recomendación Institucional)
   - ✅ **Preguntas Abiertas** (Necesidades de Desarrollo - algunas obligatorias)
4. Guardado automático cada 2 segundos después de cambios
5. Guardado periódico cada 30 segundos como respaldo
6. Al enviar, se guarda en `evaluations` con `tipo = 'auto'`

**Secciones que VE el Colaborador:**
- ✅ Todas las dimensiones de desempeño del instrumento
- ✅ Todos los ítems de cada dimensión
- ✅ Campo de comentarios por dimensión (opcional)
- ✅ Pregunta NPS (obligatoria)
- ✅ Preguntas abiertas (algunas obligatorias)
- ✅ Progreso en tiempo real
- ✅ Instrucciones de evaluación

**Secciones que NO VE:**
- ❌ Dimensiones de potencial (solo las ve el jefe)
- ❌ Evaluación del jefe (hasta que se complete)
- ❌ Resultados finales (hasta que se cierre el período)

### 3.2 Vista de Resultados (Mi Autoevaluación)

**Página:** `src/pages/MiAutoevaluacion.tsx`

**Secciones que VE el Colaborador:**
- ✅ Su autoevaluación completa (solo lectura)
- ✅ Puntaje global de desempeño (%)
- ✅ Gráfico de radar comparando su evaluación vs promedio municipal
- ✅ Top 3 fortalezas identificadas
- ✅ Top 3 áreas de oportunidad
- ✅ Desglose por dimensión con porcentajes
- ✅ Fecha de envío

**Secciones que NO VE:**
- ❌ Evaluación del jefe (hasta que se complete)
- ❌ Comparativa jefe vs autoevaluación
- ❌ Resultados finales calculados
- ❌ Plan de desarrollo (hasta que se genere)

---

## 4. 👔 Vista del Jefe

### 4.1 Lista de Equipo

**Página:** `src/pages/EvaluacionEquipo.tsx`

**Funcionalidad:**
- Lista todos los colaboradores asignados al jefe (tabla `user_assignments`)
- Muestra estado de evaluación:
  - 🟡 **Pendiente:** No iniciada
  - 🔵 **En Progreso:** Borrador guardado
  - 🟢 **Completada:** Evaluación enviada

**Secciones que VE el Jefe:**
- ✅ Lista de colaboradores asignados
- ✅ Estado de evaluación de cada colaborador
- ✅ Progreso porcentual de cada evaluación
- ✅ Botón para evaluar o ver comparativa

### 4.2 Evaluación de Colaborador Individual

**Página:** `src/pages/EvaluacionColaborador.tsx`

**Estructura con Tabs:**

#### Tab 1: Autoevaluación del Colaborador (Solo Lectura)
**Disponible:** Solo después de que el jefe complete su evaluación

**Secciones que VE el Jefe:**
- ✅ Todas las respuestas de la autoevaluación del colaborador
- ✅ Comentarios del colaborador por dimensión
- ✅ Promedio por dimensión
- ✅ Comparación visual con su propia evaluación

**Secciones que NO VE:**
- ❌ Preguntas NPS del colaborador (no se muestran)
- ❌ Respuestas a preguntas abiertas del colaborador (no se muestran)

#### Tab 2: Evaluación de Desempeño (Editable)
**Secciones que VE y puede EDITAR el Jefe:**
- ✅ Todas las dimensiones de desempeño del instrumento
- ✅ Todos los ítems de cada dimensión (escala Likert 1-5)
- ✅ Campo de comentarios por dimensión (opcional, hasta 1000 caracteres)
- ✅ Progreso en tiempo real
- ✅ Navegación entre dimensiones

**Secciones que NO VE:**
- ❌ Dimensiones de potencial (están en otro tab)

#### Tab 3: Evaluación de Potencial (Editable)
**Secciones que VE y puede EDITAR el Jefe:**
- ✅ Todas las dimensiones de potencial del instrumento
- ✅ Todos los ítems de cada dimensión (escala Likert 1-5)
- ✅ Campo de comentarios por dimensión (opcional, hasta 1000 caracteres)
- ✅ Progreso en tiempo real
- ✅ Navegación entre dimensiones

**Funcionalidades Adicionales:**
- ✅ Guardado automático cada 2 segundos
- ✅ Guardado periódico cada 30 segundos
- ✅ Opción de feedback grupal (si el colaborador pertenece a cuadrilla)
- ✅ Validación: debe completar desempeño Y potencial para enviar

**Al Enviar:**
- Se guarda en `evaluations` con `tipo = 'jefe'`
- Se calcula automáticamente el resultado final (trigger en BD)
- Se genera plan de desarrollo (si aplica)

---

## 5. 🔐 Permisos y Restricciones por Rol

### 5.1 Colaborador (`rol = 'colaborador'`)

**Puede:**
- ✅ Ver y completar su autoevaluación
- ✅ Ver sus resultados después de enviar
- ✅ Ver su plan de desarrollo (cuando esté disponible)

**NO Puede:**
- ❌ Ver evaluaciones de otros colaboradores
- ❌ Ver evaluación del jefe antes de que se complete
- ❌ Ver resultados finales antes del cierre del período
- ❌ Editar evaluación después de enviar (solo RR.HH. puede reabrir)

### 5.2 Jefe (`rol = 'jefe'`)

**Puede:**
- ✅ Ver y completar su propia autoevaluación
- ✅ Ver lista de colaboradores asignados
- ✅ Evaluar desempeño y potencial de sus colaboradores
- ✅ Ver autoevaluación del colaborador (después de completar su evaluación)
- ✅ Ver comparativa jefe vs autoevaluación
- ✅ Ver resultados de su equipo
- ✅ Ver matriz 9-Box de su equipo

**NO Puede:**
- ❌ Ver evaluaciones de colaboradores de otros jefes
- ❌ Ver autoevaluación del colaborador antes de completar su evaluación
- ❌ Editar evaluación después de enviar (solo RR.HH. puede reabrir)
- ❌ Ver resultados finales antes del cierre del período

### 5.3 Admin RR.HH. (`rol = 'admin_rrhh'`)

**Puede:**
- ✅ Ver todos los instrumentos
- ✅ Ver todas las evaluaciones
- ✅ Reabrir evaluaciones enviadas
- ✅ Ver reportes y estadísticas
- ✅ Gestionar asignaciones
- ✅ Gestionar grupos/cuadrillas

### 5.4 Admin General (`rol = 'admin_general'`)

**Puede:**
- ✅ Todo lo que puede Admin RR.HH.
- ✅ Gestionar períodos de evaluación
- ✅ Ver configuración de instrumentos
- ✅ Acceso completo al sistema

---

## 6. 📊 Flujo Completo de Evaluación

### 6.1 Flujo del Colaborador

```
1. Dashboard
   ↓
2. "Comenzar Autoevaluación" o "Continuar Autoevaluación"
   ↓
3. Autoevaluacion.tsx
   - Completa dimensiones de desempeño
   - Responde NPS
   - Responde preguntas abiertas
   - Guarda automáticamente
   ↓
4. Envía evaluación
   ↓
5. MiAutoevaluacion.tsx
   - Ve sus resultados
   - Ve gráfico de radar
   - Ve fortalezas y áreas de oportunidad
   ↓
6. Espera evaluación del jefe
   ↓
7. (Después del cierre del período) Ve resultados finales
```

### 6.2 Flujo del Jefe

```
1. Dashboard
   ↓
2. "Evaluar Mi Equipo"
   ↓
3. EvaluacionEquipo.tsx
   - Ve lista de colaboradores
   - Ve estado de cada evaluación
   ↓
4. Click en colaborador
   ↓
5. EvaluacionColaborador.tsx
   - Tab "Desempeño": Evalúa desempeño
   - Tab "Potencial": Evalúa potencial
   - Guarda automáticamente
   ↓
6. Envía evaluación
   ↓
7. (Ahora puede ver) Tab "Autoevaluación del Colaborador"
   - Ve autoevaluación del colaborador
   - Puede comparar con su evaluación
   ↓
8. Puede ver comparativa completa
```

### 6.3 Flujo del Sistema (Backend)

```
1. Colaborador envía autoevaluación
   → Se guarda en evaluations (tipo='auto', estado='enviado')
   
2. Jefe envía evaluación
   → Se guarda en evaluations (tipo='jefe', estado='enviado')
   → Trigger automático calcula resultado final
   → Se guarda en final_evaluation_results
   → Se genera plan de desarrollo (si aplica)
   
3. Cierre del período
   → Se calculan resultados finales para todos
   → Se generan planes de desarrollo
   → Se notifica a colaboradores
```

---

## 7. 🗄️ Estructura de Base de Datos

### 7.1 Tabla `users`
```sql
- dpi (PK)
- nivel (VARCHAR) → Usado para asignación automática de instrumento
- instrumento_id (VARCHAR) → Override manual del instrumento
- jefe_inmediato_id (FK) → Relación jerárquica
- rol → Determina permisos
```

### 7.2 Tabla `evaluations`
```sql
- id (PK)
- usuario_id (FK) → Colaborador evaluado
- periodo_id (FK) → Período de evaluación
- tipo → 'auto' o 'jefe'
- evaluador_id (FK) → Solo para tipo 'jefe'
- colaborador_id (FK) → Solo para tipo 'jefe'
- responses (JSONB) → Respuestas a ítems
- comments (JSONB) → Comentarios por dimensión
- evaluacion_potencial (JSONB) → Solo para tipo 'jefe'
- estado → 'borrador' o 'enviado'
- progreso → 0-100
```

### 7.3 Tabla `user_assignments`
```sql
- colaborador_id (FK) → Colaborador
- jefe_id (FK) → Jefe asignado
- grupo_id (FK) → Cuadrilla (opcional)
- activo → BOOLEAN
```

---

## 8. ⚠️ Limitaciones y Consideraciones

### 8.1 Limitaciones Actuales

1. **Instrumentos Limitados:**
   - Solo A1 y A3 están completamente implementados
   - Los demás niveles usan fallback a A1

2. **Sin Edición de Instrumentos:**
   - Los instrumentos se configuran programáticamente
   - No hay interfaz para editar instrumentos existentes

3. **Asignación de Instrumentos:**
   - La asignación automática depende del campo `nivel`
   - Si un usuario no tiene nivel definido, usa A1 como fallback

4. **Visibilidad de Autoevaluación:**
   - El jefe solo puede ver la autoevaluación DESPUÉS de completar su evaluación
   - Esto puede ser una limitación si el jefe quiere ver primero

### 8.2 Mejoras Sugeridas

1. **Implementar todos los instrumentos** (A2, S2, D1, D2, E1, E2, A4, OTE, O1, O2, OS)

2. **Interfaz de edición de instrumentos** para administradores

3. **Permitir ver autoevaluación antes de completar evaluación del jefe** (opcional)

4. **Dashboard de progreso** para jefes con métricas agregadas

5. **Notificaciones** cuando un colaborador completa su autoevaluación

---

## 9. 📝 Resumen de Secciones por Actor

### Colaborador VE:
- ✅ Su autoevaluación (completa)
- ✅ Sus resultados (después de enviar)
- ✅ Gráfico de radar
- ✅ Fortalezas y áreas de oportunidad
- ❌ NO ve evaluación del jefe (hasta cierre del período)
- ❌ NO ve resultados finales (hasta cierre del período)

### Jefe VE:
- ✅ Su autoevaluación (completa)
- ✅ Lista de colaboradores asignados
- ✅ Evaluación de desempeño (editable)
- ✅ Evaluación de potencial (editable)
- ✅ Autoevaluación del colaborador (solo lectura, después de completar su evaluación)
- ✅ Comparativa jefe vs autoevaluación
- ✅ Resultados de su equipo
- ❌ NO ve evaluaciones de otros jefes
- ❌ NO ve autoevaluación antes de completar su evaluación

### Admin VE:
- ✅ Todo lo anterior
- ✅ Todas las evaluaciones del sistema
- ✅ Reportes y estadísticas
- ✅ Configuración de instrumentos
- ✅ Gestión de períodos

---

## 10. 🔍 Puntos Clave de Implementación

1. **Asignación de Instrumento:**
   - Se hace automáticamente al cargar la página de evaluación
   - Usa `getInstrumentForUser(nivel, overrideInstrumentId)`
   - El override manual tiene prioridad sobre la asignación automática

2. **Guardado Automático:**
   - Se usa el hook `useAutoSave`
   - Guarda cada 2 segundos después de cambios
   - Guarda cada 30 segundos como respaldo
   - Guarda antes de cerrar la página

3. **Validación:**
   - Todas las preguntas de desempeño son obligatorias
   - Todas las preguntas de potencial son obligatorias
   - NPS es obligatorio
   - Preguntas abiertas obligatorias deben completarse

4. **Cálculo de Resultados:**
   - Se hace automáticamente mediante triggers en PostgreSQL
   - Se calcula cuando el jefe envía su evaluación
   - Usa configuración específica por instrumento (`instrumentCalculations.ts`)

---

**Última actualización:** 2025-01-XX
**Versión del documento:** 1.0







