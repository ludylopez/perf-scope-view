# Diseño de Sistema de Jerarquías y Asignaciones - Evaluación 360°

## 📋 Estado Actual del Sistema

### ✅ Lo que YA está implementado:

1. **Asignación Colaborador → Jefe**
   - Tabla `user_assignments` con relación colaborador-jefe
   - Un colaborador puede tener un jefe asignado
   - Un jefe puede tener múltiples colaboradores

2. **Grupos/Cuadrillas**
   - Tabla `groups` para cuadrillas operativas
   - Tabla `group_members` para miembros de grupos
   - Un colaborador puede pertenecer a un grupo
   - Un jefe puede tener múltiples grupos

3. **Autoevaluación de Colaboradores**
   - Página `Autoevaluacion.tsx` para colaboradores
   - Tipo de evaluación: `'auto'`
   - Guardado en tabla `evaluations`

4. **Evaluación de Jefe a Colaboradores**
   - Página `EvaluacionColaborador.tsx`
   - Tipo de evaluación: `'jefe'`
   - Evalúa desempeño + potencial

5. **Asignación de Instrumentos**
   - Automática por nivel (A1, A2, S1, S2, E1, E2, O1, O2)
   - Override manual disponible (`instrumento_id` en `users`)

6. **Vista de Equipo para Jefe**
   - `EvaluacionEquipo.tsx` lista colaboradores asignados
   - Muestra estado de evaluación (pendiente/en progreso/completado)

---

## ❌ Lo que FALTA implementar:

### 1. **Jerarquía Completa (Jefe → Jefe → Jefe...)**
   - **Problema**: Actualmente solo hay `jefe_inmediato_id` en `users`, pero no hay lógica para:
     - Detectar si un jefe tiene jefe
     - Evaluar a jefes como colaboradores
     - Ver jerarquía completa

### 2. **Autoevaluación de Jefes**
   - **Problema**: Los jefes también deberían autoevaluarse, pero actualmente solo pueden evaluar a otros
   - **Necesidad**: Permitir que jefes se autoevaluen igual que colaboradores

### 3. **Vista del Jefe Superior**
   - **Problema**: Si un jefe tiene jefe, ¿qué debería ver el jefe superior?
     - ¿Promedio del equipo del jefe subordinado?
     - ¿Vista individual de cada jefe subordinado?
     - ¿Ambas opciones?

### 4. **Feedback Grupal vs Individual**
   - **Problema**: Actualmente no hay diferenciación clara entre:
     - Feedback individual (jefe → colaborador individual)
     - Feedback grupal (jefe → cuadrilla completa)

### 5. **Vista Consolidada de Equipo**
   - **Problema**: Un jefe superior necesita ver:
     - Rendimiento individual de sus jefes subordinados
     - Promedio del equipo de cada jefe subordinado
     - Comparación entre equipos

---

## 🎯 Diseño Propuesto: Sistema de Jerarquías Multi-Nivel

### **Escenario 1: Jerarquía Simple**
```
Gerente General (Sin jefe)
  └── Jefe de Área (jefe_inmediato_id = Gerente General)
      ├── Colaborador 1 (asignado a Jefe de Área)
      ├── Colaborador 2 (asignado a Jefe de Área)
      └── Cuadrilla A (grupo con múltiples miembros)
```

### **Escenario 2: Jerarquía Completa (Multi-Nivel)**
```
Director General (Sin jefe)
  └── Gerente de Operaciones (jefe_inmediato_id = Director General)
      ├── Jefe de Cuadrilla 1 (jefe_inmediato_id = Gerente de Operaciones)
      │   ├── Operario 1 (asignado a Jefe de Cuadrilla 1)
      │   ├── Operario 2 (asignado a Jefe de Cuadrilla 1)
      │   └── Operario 3 (asignado a Jefe de Cuadrilla 1)
      └── Jefe de Cuadrilla 2 (jefe_inmediato_id = Gerente de Operaciones)
          ├── Operario 4 (asignado a Jefe de Cuadrilla 2)
          └── Operario 5 (asignado a Jefe de Cuadrilla 2)
```

---

## 📊 Flujo de Evaluación Propuesto

### **1. Autoevaluación (Todos los usuarios)**
- ✅ Colaboradores → Ya implementado
- ⚠️ **Jefes** → **FALTA**: Permitir que jefes también se autoevaluen

### **2. Evaluación de Jefe a Colaboradores Directos**
- ✅ Ya implementado
- Jefe evalúa desempeño + potencial de cada colaborador individual
- Puede dar feedback individual o grupal (si tiene cuadrilla)

### **3. Evaluación de Jefe Superior a Jefes Subordinados**
- ⚠️ **FALTA**: El jefe superior debería evaluar:
  - **Desempeño del jefe subordinado** (como individuo)
  - **Gestión del equipo** (promedio del equipo del jefe subordinado)
  - **Comparación con pares** (otros jefes del mismo nivel)

### **4. Vista Consolidada para Jefe Superior**
- ⚠️ **FALTA**: Dashboard que muestre:
  - **Vista Individual**: Cada jefe subordinado con su evaluación individual
  - **Vista de Equipo**: Promedio del equipo de cada jefe subordinado
  - **Vista Comparativa**: Comparación entre equipos/jefes

---

## 🛠️ Implementación Propuesta

### **Fase 1: Habilizar Autoevaluación para Jefes**

**Cambios necesarios:**
1. Modificar `Dashboard.tsx` para que jefes también vean opción de autoevaluación
2. Verificar que `Autoevaluacion.tsx` funcione para jefes (probablemente ya funciona)
3. Agregar validación: jefes pueden autoevaluarse igual que colaboradores

### **Fase 2: Vista del Jefe Superior**

**Nueva página: `EvaluacionJefes.tsx`**
- Lista de jefes subordinados directos
- Para cada jefe muestra:
  - **Su evaluación individual** (como jefe subordinado)
  - **Promedio de su equipo** (desempeño promedio de sus colaboradores)
  - **Estado de evaluaciones** (completadas/pendientes)

**Vista con Tabs:**
- **Tab "Individual"**: Lista de jefes subordinados con evaluación individual
- **Tab "Equipos"**: Vista de equipos con promedio
- **Tab "Comparativa"**: Comparación entre equipos

### **Fase 3: Feedback Grupal vs Individual**

**Modificar `EvaluacionColaborador.tsx`:**
- Si el colaborador pertenece a una cuadrilla:
  - Mostrar opción de "Feedback Grupal"
  - Generar plan de desarrollo grupal
  - Guardar feedback grupal en `development_plans.feedback_grupal`

**Modificar `VistaComparativa.tsx`:**
- Si hay feedback grupal, mostrarlo
- Toggle entre vista individual y grupal

### **Fase 4: Dashboard Jerárquico**

**Nueva página: `DashboardJerarquico.tsx`**
- Vista completa de la jerarquía
- Para cada nivel muestra:
  - Evaluaciones completadas
  - Promedios de equipos
  - Comparativas entre niveles

---

## 🤔 Preguntas de Diseño a Resolver:

### **Pregunta 1: ¿Jefe Superior ve promedio o individual?**

**Respuesta Propuesta: AMBOS**
- **Vista Individual**: Para evaluar al jefe como individuo (su desempeño personal)
- **Vista de Equipo**: Para evaluar su gestión (promedio de su equipo)
- **Tabs separados** para alternar entre vistas

### **Pregunta 2: ¿Cómo se calcula el promedio del equipo?**

**Respuesta Propuesta:**
- Promedio de desempeño de todos los colaboradores directos del jefe
- Solo contar colaboradores con evaluación completada
- Mostrar tanto promedio general como por dimensiones

### **Pregunta 3: ¿El jefe superior evalúa al jefe subordinado o a su equipo?**

**Respuesta Propuesta: AMBOS**
- **Evaluación del Jefe**: Evaluación individual del jefe subordinado (como persona)
- **Evaluación del Equipo**: Promedio del equipo del jefe subordinado (como gestor)
- **Ambas evaluaciones** se combinan para la evaluación final del jefe subordinado

### **Pregunta 4: ¿Feedback grupal reemplaza feedback individual?**

**Respuesta Propuesta: NO**
- **Feedback Individual**: Siempre disponible para cada colaborador
- **Feedback Grupal**: Adicional, cuando hay cuadrilla
- Ambos se generan y guardan por separado

### **Pregunta 5: ¿Cómo se detecta si un jefe tiene jefe?**

**Respuesta Propuesta:**
- Usar campo `jefe_inmediato_id` en tabla `users`
- Si `jefe_inmediato_id IS NOT NULL` → El usuario tiene jefe
- Si tiene `jefe_inmediato_id` Y tiene colaboradores asignados → Es jefe intermedio

---

## 📝 Estructura de Datos Propuesta

### **Tabla `users` (ya existe, pero necesita usar `jefe_inmediato_id`):**
```sql
-- Campo ya existe:
jefe_inmediato_id VARCHAR(20) REFERENCES users(dpi)
```

### **Nueva Vista o Función SQL: `get_jerarquia_completa(usuario_dpi)`:**
```sql
-- Retorna toda la jerarquía hacia arriba y hacia abajo
-- Hacia arriba: Todos los jefes superiores
-- Hacia abajo: Todos los colaboradores directos e indirectos
```

### **Nueva Función SQL: `get_equipo_stats(jefe_dpi, periodo_id)`:**
```sql
-- Retorna estadísticas del equipo del jefe:
-- - Promedio de desempeño del equipo
-- - Promedio por dimensiones
-- - Cantidad de evaluaciones completadas
-- - Distribución 9-box del equipo
```

---

## 🎨 Interfaz Propuesta

### **Para Jefe con Equipo:**
1. **"Mi Equipo"** (ya existe)
   - Lista de colaboradores directos
   - Feedback individual o grupal según corresponda

2. **"Mi Autoevaluación"** (nuevo para jefes)
   - Igual que para colaboradores
   - Permitir que jefes se autoevaluen

### **Para Jefe Superior (que tiene jefes subordinados):**
1. **"Mis Jefes Subordinados"** (nuevo)
   - Lista de jefes que reportan a él
   - Evaluar cada jefe individualmente
   - Ver promedio de su equipo

2. **"Vista de Equipos"** (nuevo)
   - Comparación entre equipos
   - Gráficos comparativos
   - Ranking de equipos

---

## ✅ Plan de Implementación Recomendado

### **Paso 1: Validar y Mejorar Lo Existente**
- ✅ Verificar que `jefe_inmediato_id` se use correctamente
- ✅ Verificar que jefes puedan autoevaluarse (probablemente ya funciona)
- ✅ Verificar que grupos/cuadrillas funcionen correctamente

### **Paso 2: Implementar Vista del Jefe Superior**
- Nueva página: `EvaluacionJefes.tsx`
- Función SQL: `get_equipo_stats()`
- Dashboard comparativo

### **Paso 3: Mejorar Feedback Grupal**
- Modificar generación de planes de desarrollo
- Separar feedback individual vs grupal
- Vista toggle entre individual/grupal

### **Paso 4: Dashboard Jerárquico Completo**
- Vista de toda la jerarquía
- Métricas consolidadas
- Comparativas multi-nivel

---

## 🎯 Recomendación Final

**El sistema está 70% implementado.** Lo que falta es principalmente:

1. **Vista del jefe superior** para evaluar jefes subordinados
2. **Validación de autoevaluación** para jefes (probablemente ya funciona, solo falta UI)
3. **Dashboard comparativo** de equipos
4. **Feedback grupal mejorado** (existe estructura, falta mejorar UX)

**¿Procedemos con la implementación de lo faltante?**

