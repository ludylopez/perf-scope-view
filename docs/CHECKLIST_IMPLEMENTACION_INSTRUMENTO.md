# ✅ Checklist Completo: Implementación de Nuevo Instrumento

## 📋 Pre-Implementación: Análisis del Instrumento

Antes de comenzar, debo verificar:

### 1. **Información Básica del Instrumento**
- [ ] **Nivel del instrumento** (ej: A2, S2, D1, etc.)
- [ ] **ID del instrumento** (formato: `{NIVEL}_2025_V1`)
- [ ] **Versión** (ej: "2025.1")
- [ ] **Tiempo estimado** (ej: "20-25 minutos")
- [ ] **Nombre descriptivo** del nivel (ej: "ASESORÍA PROFESIONAL")

### 2. **Estructura de Dimensiones de Desempeño**
- [ ] **Número total de dimensiones** de desempeño
- [ ] Para cada dimensión:
  - [ ] **ID único** (formato: `dim{N}__{nivel}`)
  - [ ] **Nombre completo** de la dimensión
  - [ ] **Descripción** (opcional pero recomendado)
  - [ ] **Peso** (debe sumar 1.0 entre todas las dimensiones)
  - [ ] **Número de items** en la dimensión
  - [ ] Para cada item:
    - [ ] **ID único** (formato: `d{N}_i{M}_{nivel}`)
    - [ ] **Texto completo** del item
    - [ ] **Orden** (secuencial, sin saltos)

### 3. **Estructura de Dimensiones de Potencial** (si aplica)
- [ ] **¿Tiene dimensiones de potencial?** (Sí/No)
- [ ] Si sí:
  - [ ] **Número total de dimensiones** de potencial
  - [ ] Para cada dimensión:
    - [ ] **ID único** (formato: `pot_dim{N}_{nivel}`)
    - [ ] **Nombre completo** de la dimensión
    - [ ] **Descripción** (opcional)
    - [ ] **Peso** (debe sumar 1.0 entre todas las dimensiones de potencial)
    - [ ] **Número de items** en la dimensión
    - [ ] Para cada item:
      - [ ] **ID único** (formato: `pot_d{N}_i{M}_{nivel}`)
      - [ ] **Texto completo** del item
      - [ ] **Orden** (secuencial)

### 4. **Validaciones de Integridad**
- [ ] **Suma de pesos de desempeño = 1.0** (o muy cercano, con tolerancia de 0.001)
- [ ] **Suma de pesos de potencial = 1.0** (si aplica)
- [ ] **IDs únicos** (no duplicados dentro del instrumento)
- [ ] **Orden secuencial** de items (1, 2, 3... sin saltos)
- [ ] **Nombres de dimensiones** no duplicados (o preparar lógica para manejar duplicados)

### 5. **Configuración de Cálculo**
- [ ] **¿Requiere pesos especiales?** (ej: A1 usa 55/45 en lugar de 70/30)
  - [ ] Peso jefe: _____
  - [ ] Peso auto: _____
- [ ] **¿Requiere thresholds personalizados para 9-box?**
  - [ ] Desempeño: bajo: ___, medio: ___, alto: ___
  - [ ] Potencial: bajo: ___, medio: ___, alto: ___
- [ ] **¿Requiere lógica de cálculo especial?** (la mayoría usa la estándar)

---

## 🔧 Implementación: Pasos a Seguir

### Paso 1: Crear el Instrumento en `src/data/instruments.ts`

**Ubicación:** `src/data/instruments.ts`

**Acciones:**
1. [ ] Agregar `export const INSTRUMENT_{NIVEL}: Instrument = { ... }`
2. [ ] Estructurar todas las dimensiones de desempeño
3. [ ] Estructurar todas las dimensiones de potencial (si aplica)
4. [ ] Verificar que todos los IDs sigan el patrón correcto
5. [ ] Verificar que los pesos sumen 1.0
6. [ ] Verificar que los órdenes sean secuenciales

**Ejemplo de estructura:**
```typescript
export const INSTRUMENT_A2: Instrument = {
  id: "A2_2025_V1",
  nivel: "A2",
  version: "2025.1",
  tiempoEstimado: "20-25 minutos",
  dimensionesDesempeno: [
    {
      id: "dim1_a2",
      nombre: "NOMBRE DIMENSIÓN 1",
      descripcion: "Descripción opcional",
      peso: 0.20, // Debe sumar 1.0 con todas las demás
      items: [
        { id: "d1_i1_a2", texto: "Texto del item 1", orden: 1 },
        { id: "d1_i2_a2", texto: "Texto del item 2", orden: 2 },
        // ...
      ],
    },
    // ... más dimensiones
  ],
  dimensionesPotencial: [
    // Si aplica
  ],
};
```

**Validaciones críticas:**
- [ ] Todos los IDs son únicos
- [ ] Los pesos suman 1.0 (o muy cercano)
- [ ] Los órdenes son secuenciales (1, 2, 3...)
- [ ] No hay caracteres especiales problemáticos en los IDs

---

### Paso 2: Importar y Registrar en `src/lib/instruments.ts`

**Ubicación:** `src/lib/instruments.ts`

**Acciones:**
1. [ ] Agregar import: `import { INSTRUMENT_{NIVEL} } from "@/data/instruments";`
2. [ ] Agregar en el objeto `INSTRUMENTS`:
   ```typescript
   const INSTRUMENTS: Record<string, Instrument> = {
     A1: INSTRUMENT_A1,
     A3: INSTRUMENT_A3,
     O2: INSTRUMENT_O2,
     {NIVEL}: INSTRUMENT_{NIVEL}, // ← Agregar aquí
   };
   ```

**Verificaciones:**
- [ ] El import está correcto
- [ ] La clave en `INSTRUMENTS` coincide con el nivel
- [ ] No hay errores de TypeScript

---

### Paso 3: Configurar Cálculos en `src/lib/instrumentCalculations.ts`

**Ubicación:** `src/lib/instrumentCalculations.ts`

**⚠️ IMPORTANTE:** Aunque es técnicamente opcional, **se recomienda agregar la configuración** para mantener consistencia con otros instrumentos (A3, O2) y evitar warnings en consola.

**¿Cuándo requiere personalización?**
- Solo si el instrumento requiere:
  - Pesos diferentes a 70/30 (jefe/auto) - ej: A1 usa 55/45
  - Thresholds diferentes para 9-box
  - Lógica de cálculo especial

**Acciones:**
1. [ ] Agregar configuración en `INSTRUMENT_CALCULATION_CONFIGS`:
   ```typescript
   // Instrumento {NIVEL} - {Descripción del nivel}
   {NIVEL}: {
     instrumentId: "{NIVEL}",
     nivel: "{NIVEL}",
     calcularDesempeno: (responses, dimensions) => {
       // Cálculo estándar con pesos
       let totalScore = 0;
       for (const dimension of dimensions) {
         const itemResponses = dimension.items
           .map((item: any) => responses[item.id])
           .filter((v: any) => v !== undefined);
         if (itemResponses.length === 0) continue;

         const avg = itemResponses.reduce((sum: number, val: number) => sum + val, 0) / itemResponses.length;
         totalScore += avg * dimension.peso;
       }
       return Math.round(totalScore * 100) / 100;
     },
     calcularPotencial: (potencialResponses, potencialDimensions) => {
       let totalScore = 0;
       for (const dimension of potencialDimensions) {
         const itemResponses = dimension.items
           .map((item: any) => potencialResponses[item.id])
           .filter((v: any) => v !== undefined);
         if (itemResponses.length === 0) continue;

         const avg = itemResponses.reduce((sum: number, val: number) => sum + val, 0) / itemResponses.length;
         totalScore += avg * dimension.peso;
       }
       return Math.round(totalScore * 100) / 100;
     },
     calcularResultadoFinal: (desempenoAuto, desempenoJefe, potencial) => {
       // {NIVEL} usa pesos estándar: 30% autoevaluación + 70% jefe
       // O personalizados si aplica: ej. A1 usa 45% auto + 55% jefe
       const desempenoFinal = Math.round((desempenoJefe * 0.7 + desempenoAuto * 0.3) * 100) / 100;
       return { desempenoFinal, potencial };
     },
     pesoJefe: 0.7, // Pesos estándar (o personalizados)
     pesoAuto: 0.3,
     thresholds9Box: {
       desempeno: { bajo: 3, medio: 4, alto: 4.5 },
       potencial: { bajo: 3, medio: 4, alto: 4.5 },
     },
   },
   ```

**Verificaciones:**
- [ ] Los pesos suman 1.0 (pesoJefe + pesoAuto = 1.0)
- [ ] La lógica de cálculo es correcta
- [ ] Los thresholds son apropiados
- [ ] No hay errores de TypeScript

---

### Paso 4: (Opcional) Agregar Nombres Amigables en `src/pages/Dashboard.tsx`

**Ubicación:** `src/pages/Dashboard.tsx` - función `getDimensionFriendlyTitle()`

**¿Cuándo es necesario?**
- Solo si los nombres de dimensiones son muy largos o complejos
- Para mejorar la visualización en el gráfico radar

**Si NO requiere personalización:**
- [ ] ✅ **No hacer nada** - El sistema mostrará el nombre completo o truncado automáticamente

**Si SÍ requiere personalización:**
1. [ ] Agregar casos en `getDimensionFriendlyTitle()`:
   ```typescript
   if (nombre.includes("texto clave")) return "Nombre Corto";
   ```

**Nota:** El sistema ya maneja duplicados automáticamente, así que no es crítico.

---

### Paso 5: Actualizar Mapeo de Niveles (si aplica)

**Ubicación:** `src/lib/instruments.ts` - función `getRecommendedInstrumentId()`

**Acciones:**
1. [ ] Verificar que el mapeo ya incluya el nuevo nivel:
   ```typescript
   const nivelToInstrument: Record<string, string> = {
     // ...
     "{NIVEL}": "{NIVEL}", // ← Verificar que esté
   };
   ```

**Nota:** Este mapeo es principalmente informativo. El sistema funciona sin él.

---

### Paso 6: ⚠️ CRÍTICO - Crear Migración SQL para Base de Datos

**Ubicación:** `supabase/migrations/YYYYMMDDHHMMSS_add_instrument_{nivel}.sql`

**⚠️ ESTE PASO ES OBLIGATORIO** - Sin la migración SQL, el instrumento no funcionará correctamente en producción.

**Acciones:**
1. [ ] Crear archivo de migración con formato: `YYYYMMDDHHMMSS_add_instrument_{nivel}.sql`
2. [ ] Incluir `INSERT INTO instrument_configs` con:
   - `id`: '{NIVEL}'
   - `nivel`: '{NIVEL}'
   - `dimensiones_desempeno`: JSONB completo con todas las dimensiones
   - `dimensiones_potencial`: JSONB completo con todas las dimensiones de potencial (si aplica)
   - `configuracion_calculo`: JSONB con `{"pesoJefe": 0.7, "pesoAuto": 0.3}` (o personalizado)
   - `activo`: `true`
3. [ ] Incluir `ON CONFLICT (id) DO UPDATE SET` para permitir re-ejecución
4. [ ] Actualizar comentario de tabla si es necesario

**Ejemplo de estructura:**
```sql
-- Migración: Agregar Instrumento {NIVEL}
-- Fecha: YYYY-MM-DD
-- Descripción: Inserta la configuración del instrumento de evaluación para nivel {NIVEL}

INSERT INTO instrument_configs (
  id,
  nivel,
  dimensiones_desempeno,
  dimensiones_potencial,
  configuracion_calculo,
  activo
) VALUES (
  '{NIVEL}',
  '{NIVEL}',
  '[{...dimensiones...}]'::JSONB,
  '[{...dimensiones potencial...}]'::JSONB,
  '{"pesoJefe": 0.7, "pesoAuto": 0.3}'::JSONB,
  true
)
ON CONFLICT (id) DO UPDATE SET
  nivel = EXCLUDED.nivel,
  dimensiones_desempeno = EXCLUDED.dimensiones_desempeno,
  dimensiones_potencial = EXCLUDED.dimensiones_potencial,
  configuracion_calculo = EXCLUDED.configuracion_calculo,
  activo = EXCLUDED.activo,
  updated_at = NOW();
```

**Verificaciones:**
- [ ] El JSONB está correctamente formateado
- [ ] Todos los IDs coinciden con los del frontend
- [ ] Los pesos en `configuracion_calculo` coinciden con los del frontend
- [ ] El `ON CONFLICT` está incluido

---

### Paso 7: ⚠️ CRÍTICO - Ejecutar Migración en Base de Datos

**Método 1: Mediante MCP (Recomendado)**
1. [ ] Usar `mcp_supabase_apply_migration` con:
   - `project_id`: ID del proyecto Supabase
   - `name`: `add_instrument_{nivel}` (snake_case)
   - `query`: Contenido completo del archivo SQL

**Método 2: Mediante SQL Editor de Supabase**
1. [ ] Abrir SQL Editor en Supabase Dashboard
2. [ ] Copiar y pegar el contenido del archivo de migración
3. [ ] Ejecutar la consulta
4. [ ] Verificar que no haya errores

**Verificaciones post-ejecución:**
1. [ ] Verificar inserción en BD:
   ```sql
   SELECT id, nivel, activo, 
          jsonb_array_length(dimensiones_desempeno) as dim_desempeno,
          jsonb_array_length(dimensiones_potencial) as dim_potencial
   FROM instrument_configs 
   WHERE id = '{NIVEL}';
   ```
2. [ ] Verificar configuración de cálculo:
   ```sql
   SELECT configuracion_calculo->>'pesoJefe' as peso_jefe,
          configuracion_calculo->>'pesoAuto' as peso_auto
   FROM instrument_configs 
   WHERE id = '{NIVEL}';
   ```
3. [ ] Confirmar que `activo = true`

---

### Paso 8: Verificar Funcionalidad del Dashboard

**Ubicación:** `src/pages/Dashboard.tsx`

**⚠️ IMPORTANTE:** El Dashboard debe verificar que el jefe completó su evaluación antes de mostrar resultados.

**Verificaciones:**
1. [ ] El Dashboard NO muestra resultados si solo se completó la autoevaluación
2. [ ] El Dashboard muestra un mensaje informativo cuando la autoevaluación está enviada pero el jefe no completó
3. [ ] El Dashboard muestra resultados completos solo cuando `jefeCompleto === true`
4. [ ] El gráfico radar se muestra correctamente con todas las dimensiones
5. [ ] Los porcentajes se muestran correctamente (0-100)

**Nota:** Esta funcionalidad ya está implementada en el código base, pero debe verificarse para cada nuevo instrumento.

---

### Paso 9: Verificar Redondeo de Progreso

**Ubicación:** `src/pages/Autoevaluacion.tsx` y `src/pages/EvaluacionColaborador.tsx`

**⚠️ IMPORTANTE:** El campo `progreso` en la tabla `evaluations` es INTEGER, por lo que debe redondearse.

**Verificaciones:**
1. [ ] En `Autoevaluacion.tsx`, el cálculo de `progressPercentage` usa `Math.round()`:
   ```typescript
   const progressPercentage = totalItems > 0 ? Math.round((answeredItems / totalItems) * 100) : 0;
   ```
2. [ ] En `EvaluacionColaborador.tsx`, el cálculo de `progreso` usa `Math.round()`:
   ```typescript
   progreso: Math.round((desempenoProgress + potencialProgress) / 2),
   ```
3. [ ] No hay errores de "invalid input syntax for type integer" en consola

**Nota:** Esta funcionalidad ya está implementada, pero debe verificarse para evitar errores.

---

## 🧪 Testing y Validación

### Validaciones Automáticas del Sistema
El sistema ya incluye validaciones automáticas, pero debo verificar:

1. [ ] **Carga del instrumento**
   - [ ] El instrumento se carga correctamente para usuarios del nivel correspondiente
   - [ ] Los logs en consola muestran: `✅ Coincidencia exacta encontrada: {NIVEL}`

2. [ ] **Estructura de datos**
   - [ ] Todas las dimensiones se muestran correctamente
   - [ ] Todos los items se muestran correctamente
   - [ ] Los pesos se calculan correctamente

3. [ ] **Gráfico radar**
   - [ ] El gráfico se renderiza correctamente
   - [ ] Todas las dimensiones aparecen en el gráfico
   - [ ] Los valores se muestran como porcentajes (0-100)
   - [ ] No hay dimensiones duplicadas

4. [ ] **Cálculos**
   - [ ] Los promedios se calculan correctamente
   - [ ] Los porcentajes se calculan correctamente
   - [ ] La consolidación (70/30 o personalizada) funciona
   - [ ] El resultado final es correcto

5. [ ] **Evaluación completa**
   - [ ] Autoevaluación se puede completar
   - [ ] Evaluación de jefe se puede completar
   - [ ] Evaluación de potencial se puede completar (si aplica)
   - [ ] El progreso se calcula correctamente

6. [ ] **Dashboard**
   - [ ] Se muestran las fortalezas correctamente
   - [ ] Se muestran las oportunidades correctamente
   - [ ] El gráfico radar muestra los datos correctos

---

## 📝 Checklist Final Pre-Entrega

### Frontend
- [ ] ✅ Instrumento creado en `src/data/instruments.ts`
- [ ] ✅ Instrumento importado y registrado en `src/lib/instruments.ts`
- [ ] ✅ Configuración de cálculo agregada en `src/lib/instrumentCalculations.ts` (recomendado)
- [ ] ✅ (Si aplica) Nombres amigables agregados en `Dashboard.tsx`
- [ ] ✅ Validaciones de integridad pasadas (pesos, IDs, órdenes)

### Backend (Base de Datos)
- [ ] ✅ Migración SQL creada en `supabase/migrations/`
- [ ] ✅ Migración ejecutada en Supabase (mediante MCP o SQL Editor)
- [ ] ✅ Instrumento insertado y activo en tabla `instrument_configs`
- [ ] ✅ Configuración de cálculo verificada en BD
- [ ] ✅ Verificación SQL ejecutada exitosamente

### Funcionalidad
- [ ] ✅ Dashboard NO muestra resultados hasta que jefe complete
- [ ] ✅ Mensaje informativo se muestra cuando autoevaluación enviada pero jefe no completó
- [ ] ✅ Progreso se redondea correctamente (sin errores de decimales)
- [ ] ✅ Gráfico radar funciona correctamente
- [ ] ✅ Cálculos son correctos
- [ ] ✅ Autoevaluación se puede completar
- [ ] ✅ Evaluación de jefe se puede completar
- [ ] ✅ Evaluación de potencial se puede completar (si aplica)

### Testing y Validación
- [ ] ✅ Testing completo realizado
- [ ] ✅ No hay errores en consola
- [ ] ✅ No hay errores de TypeScript
- [ ] ✅ No hay errores de linting
- [ ] ✅ No hay errores de base de datos

---

## 🚨 Problemas Comunes y Soluciones

### Problema 1: Los pesos no suman 1.0
**Solución:** Ajustar los pesos para que sumen exactamente 1.0 (o muy cercano, con tolerancia de 0.001)

### Problema 2: IDs duplicados
**Solución:** Verificar que todos los IDs sean únicos. Usar el formato: `dim{N}_{nivel}` y `d{N}_i{M}_{nivel}`

### Problema 3: Gráfico radar no se muestra
**Solución:** 
- Verificar que no haya dimensiones con nombres duplicados
- Verificar que los porcentajes estén en rango 0-100
- Revisar logs en consola

### Problema 4: Cálculos incorrectos
**Solución:**
- Verificar que la configuración de cálculo esté correcta
- Verificar que los pesos sean correctos
- Revisar logs en consola para ver los valores intermedios

### Problema 5: El instrumento no se carga para usuarios del nivel
**Solución:**
- Verificar que el nivel en el instrumento coincida exactamente con `user.nivel`
- Verificar que esté registrado en `INSTRUMENTS`
- Verificar que la migración SQL se ejecutó correctamente
- Verificar que el instrumento esté activo en `instrument_configs`
- Revisar logs en consola

### Problema 6: Error "invalid input syntax for type integer" al auto-guardar
**Solución:**
- Verificar que `progressPercentage` use `Math.round()` en `Autoevaluacion.tsx`
- Verificar que `progreso` use `Math.round()` en `EvaluacionColaborador.tsx`
- El campo `progreso` en BD es INTEGER, no acepta decimales

### Problema 7: Dashboard muestra resultados antes de que jefe complete
**Solución:**
- Verificar que `loadResultadosData()` solo se llame si `jefeCompleto === true`
- Verificar que la condición de visualización incluya `resultadoData.jefeCompleto`
- Verificar que se muestre mensaje informativo cuando autoevaluación enviada pero jefe no completó

### Problema 8: Migración SQL falla o no se ejecuta
**Solución:**
- Verificar formato JSONB correcto (usar `'[...]'::JSONB`)
- Verificar que todos los IDs coincidan con el frontend
- Verificar que `ON CONFLICT` esté incluido para permitir re-ejecución
- Ejecutar verificación SQL post-migración para confirmar inserción

---

## 📚 Referencias

- **Estructura de tipos:** `src/types/evaluation.ts`
- **Instrumentos existentes:** `src/data/instruments.ts`
- **Registro de instrumentos:** `src/lib/instruments.ts`
- **Configuraciones de cálculo:** `src/lib/instrumentCalculations.ts`
- **Documentación de escalabilidad:** `docs/ESCALABILIDAD_INSTRUMENTOS.md`
- **Ejemplo de migración:** `supabase/migrations/20251116000000_add_instrument_e1.sql`
- **Verificación final:** `docs/VERIFICACION_FINAL_E1.md`

## 🔄 Pasos Adicionales Descubiertos Durante Implementación

Durante la implementación del instrumento E1, se identificaron pasos adicionales críticos que no estaban en el checklist original:

1. **Migración SQL obligatoria** - Sin ejecutar la migración en BD, el instrumento no funciona en producción
2. **Configuración en `instrumentCalculations.ts` recomendada** - Aunque opcional, evita warnings y mantiene consistencia
3. **Verificación de Dashboard** - Asegurar que no muestre resultados hasta que jefe complete
4. **Redondeo de progreso** - Crítico para evitar errores de tipo INTEGER en BD

Estos pasos ahora están incluidos en el checklist actualizado.

---

## ✅ Listo para Implementar

Una vez completado este checklist, estaré listo para implementar el nuevo instrumento de forma correcta y completa.

