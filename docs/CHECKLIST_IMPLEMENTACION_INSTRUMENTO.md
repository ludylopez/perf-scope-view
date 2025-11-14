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

### Paso 3: (Opcional) Configurar Cálculos Personalizados en `src/lib/instrumentCalculations.ts`

**Ubicación:** `src/lib/instrumentCalculations.ts`

**¿Cuándo es necesario?**
- Solo si el instrumento requiere:
  - Pesos diferentes a 70/30 (jefe/auto)
  - Thresholds diferentes para 9-box
  - Lógica de cálculo especial

**Si NO requiere personalización:**
- [ ] ✅ **No hacer nada** - El sistema usará A1 como fallback automáticamente

**Si SÍ requiere personalización:**
1. [ ] Agregar configuración en `INSTRUMENT_CALCULATION_CONFIGS`:
   ```typescript
   {NIVEL}: {
     instrumentId: "{NIVEL}",
     nivel: "{NIVEL}",
     calcularDesempeno: (responses, dimensions) => {
       // Lógica estándar o personalizada
     },
     calcularPotencial: (potencialResponses, potencialDimensions) => {
       // Lógica estándar o personalizada
     },
     calcularResultadoFinal: (desempenoAuto, desempenoJefe, potencial) => {
       // Pesos personalizados si aplica
     },
     pesoJefe: 0.7, // O el valor personalizado
     pesoAuto: 0.3, // O el valor personalizado
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

- [ ] ✅ Instrumento creado en `src/data/instruments.ts`
- [ ] ✅ Instrumento importado y registrado en `src/lib/instruments.ts`
- [ ] ✅ (Si aplica) Configuración de cálculo agregada en `src/lib/instrumentCalculations.ts`
- [ ] ✅ (Si aplica) Nombres amigables agregados en `Dashboard.tsx`
- [ ] ✅ Validaciones de integridad pasadas (pesos, IDs, órdenes)
- [ ] ✅ Testing completo realizado
- [ ] ✅ Gráfico radar funciona correctamente
- [ ] ✅ Cálculos son correctos
- [ ] ✅ No hay errores en consola
- [ ] ✅ No hay errores de TypeScript
- [ ] ✅ No hay errores de linting

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
- Revisar logs en consola

---

## 📚 Referencias

- **Estructura de tipos:** `src/types/evaluation.ts`
- **Instrumentos existentes:** `src/data/instruments.ts`
- **Registro de instrumentos:** `src/lib/instruments.ts`
- **Configuraciones de cálculo:** `src/lib/instrumentCalculations.ts`
- **Documentación de escalabilidad:** `docs/ESCALABILIDAD_INSTRUMENTOS.md`

---

## ✅ Listo para Implementar

Una vez completado este checklist, estaré listo para implementar el nuevo instrumento de forma correcta y completa.

