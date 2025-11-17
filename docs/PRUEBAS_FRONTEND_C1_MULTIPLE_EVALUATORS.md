# Guía de Pruebas Frontend - C1 y Múltiples Evaluadores

Este documento describe los casos de prueba para verificar que la funcionalidad de C1 (Concejo Municipal) y múltiples evaluadores funciona correctamente en el frontend.

## Prerequisitos

1. Base de datos con migraciones aplicadas (016-023)
2. Usuario C1 creado en la base de datos
3. Instrumento C1 configurado
4. Período de evaluación activo
5. Usuarios de prueba: C1, A1, D1

## Casos de Prueba

### 1. Autoevaluación C1

**Objetivo:** Verificar que un usuario C1 puede realizar su autoevaluación sin ver dimensiones de potencial.

**Pasos:**
1. Iniciar sesión como usuario C1
2. Navegar a "Autoevaluación"
3. Verificar que solo aparecen dimensiones de desempeño
4. Verificar que NO aparecen dimensiones de potencial
5. Completar la autoevaluación
6. Enviar la evaluación

**Resultado Esperado:**
- ✅ Solo se muestran 5 dimensiones de desempeño
- ✅ No aparece sección de "Evaluación de Potencial"
- ✅ La evaluación se guarda correctamente
- ✅ El resultado final solo incluye desempeño (sin potencial)

**Archivos Relacionados:**
- `src/pages/Autoevaluacion.tsx`
- `src/data/instruments.ts` (INSTRUMENT_C1)
- `src/lib/instrumentCalculations.ts` (configuración C1)

---

### 2. Evaluación de Directores por C1

**Objetivo:** Verificar que un usuario C1 puede evaluar a Directores (D1).

**Pasos:**
1. Iniciar sesión como usuario C1
2. Crear asignación activa entre C1 y un Director (D1) en AdminAsignaciones
3. Navegar a "Evaluación de Equipo"
4. Verificar que aparece el Director en la lista
5. Hacer clic en "Evaluar" para el Director
6. Completar la evaluación del Director
7. Enviar la evaluación

**Resultado Esperado:**
- ✅ El Director aparece en la lista de colaboradores a evaluar
- ✅ Se puede iniciar la evaluación sin errores
- ✅ La evaluación se guarda correctamente
- ✅ El resultado se calcula y guarda en `evaluation_results_by_evaluator`

**Archivos Relacionados:**
- `src/pages/EvaluacionEquipo.tsx`
- `src/pages/EvaluacionColaborador.tsx`
- `src/lib/validations.ts` (validateConcejoEvaluation)

---

### 3. Evaluación de Alcalde por C1

**Objetivo:** Verificar que un usuario C1 puede evaluar al Alcalde (A1).

**Pasos:**
1. Iniciar sesión como usuario C1
2. Crear asignación activa entre C1 y Alcalde (A1) en AdminAsignaciones
3. Navegar a "Evaluación de Equipo"
4. Verificar que aparece el Alcalde en la lista
5. Hacer clic en "Evaluar" para el Alcalde
6. Completar la evaluación del Alcalde
7. Enviar la evaluación

**Resultado Esperado:**
- ✅ El Alcalde aparece en la lista de colaboradores a evaluar
- ✅ Se puede iniciar la evaluación sin errores
- ✅ La evaluación se guarda correctamente

**Archivos Relacionados:**
- `src/pages/EvaluacionEquipo.tsx`
- `src/pages/EvaluacionColaborador.tsx`
- `src/lib/validations.ts` (validateConcejoEvaluation)

---

### 4. Validación de Permisos - C1 evaluando niveles no permitidos

**Objetivo:** Verificar que C1 NO puede evaluar niveles que no sean D1 o A1.

**Pasos:**
1. Iniciar sesión como usuario C1
2. Intentar crear asignación entre C1 y un usuario E1/E2/D2 en AdminAsignaciones
3. Verificar el mensaje de error

**Resultado Esperado:**
- ✅ Se muestra error: "El Concejo Municipal (C1) solo puede evaluar a Directores (D1) o Alcalde (A1)"
- ✅ La asignación NO se crea

**Archivos Relacionados:**
- `src/pages/AdminAsignaciones.tsx`
- `src/lib/validations.ts`

---

### 5. Evaluación de Directores por Alcalde (A1)

**Objetivo:** Verificar que el Alcalde puede evaluar a Directores (D1).

**Pasos:**
1. Iniciar sesión como usuario A1
2. Verificar que hay asignación activa entre A1 y D1
3. Navegar a "Evaluación de Equipo"
4. Verificar que aparecen los Directores en la lista
5. Completar evaluación de un Director
6. Enviar la evaluación

**Resultado Esperado:**
- ✅ Los Directores aparecen en la lista
- ✅ La evaluación se guarda correctamente

**Archivos Relacionados:**
- `src/pages/EvaluacionEquipo.tsx`
- `src/pages/EvaluacionColaborador.tsx`
- `src/lib/validations.ts` (validateAlcaldeEvaluation)

---

### 6. Validación de Permisos - A1 evaluando niveles no permitidos

**Objetivo:** Verificar que A1 NO puede evaluar niveles que no sean D1.

**Pasos:**
1. Iniciar sesión como usuario A1
2. Intentar crear asignación entre A1 y un usuario E1/E2/D2 en AdminAsignaciones
3. Verificar el mensaje de error

**Resultado Esperado:**
- ✅ Se muestra error: "El Alcalde (A1) solo puede evaluar a Directores (D1)"
- ✅ La asignación NO se crea

**Archivos Relacionados:**
- `src/pages/AdminAsignaciones.tsx`
- `src/lib/validations.ts`

---

### 7. Múltiples Evaluadores - Vista de Equipo

**Objetivo:** Verificar que se muestra información de múltiples evaluadores en EvaluacionEquipo.

**Pasos:**
1. Crear múltiples asignaciones activas para un mismo colaborador (ej: D1 evaluado por C1 y A1)
2. Iniciar sesión como C1 o A1
3. Navegar a "Evaluación de Equipo"
4. Verificar que el colaborador muestra badge con número de evaluadores

**Resultado Esperado:**
- ✅ Aparece badge con texto "X evaluadores" donde X > 1
- ✅ Aparece texto "(Evaluado por múltiples jefes)" en la descripción

**Archivos Relacionados:**
- `src/pages/EvaluacionEquipo.tsx`

---

### 8. Múltiples Evaluadores - Vista Comparativa

**Objetivo:** Verificar que la vista comparativa muestra resultados consolidados y por evaluador.

**Pasos:**
1. Tener un colaborador con múltiples evaluadores que hayan completado sus evaluaciones
2. Iniciar sesión como el colaborador o como RRHH
3. Navegar a "Vista Comparativa" del colaborador
4. Verificar la sección de "Resultado Final"

**Resultado Esperado:**
- ✅ Aparece sección "Evaluado por X evaluadores"
- ✅ Se muestran los resultados individuales de cada evaluador
- ✅ Se muestra el promedio consolidado
- ✅ Los resultados se calculan correctamente

**Archivos Relacionados:**
- `src/pages/VistaComparativa.tsx`
- `src/lib/finalResultSupabase.ts` (getConsolidatedResult, getResultsByEvaluator)

---

### 9. Múltiples Evaluadores - Dashboard RRHH

**Objetivo:** Verificar que el dashboard de RRHH muestra estadísticas de múltiples evaluadores.

**Pasos:**
1. Iniciar sesión como admin_rrhh
2. Navegar a "Dashboard RRHH"
3. Verificar la tarjeta "Múltiples Evaluadores"

**Resultado Esperado:**
- ✅ Aparece tarjeta con estadísticas de múltiples evaluadores
- ✅ Muestra número de colaboradores con múltiples evaluadores
- ✅ Muestra promedio de evaluadores por colaborador
- ✅ Muestra total de evaluaciones

**Archivos Relacionados:**
- `src/pages/DashboardRRHH.tsx`
- `supabase/migrations/020_update_dashboard_stats_multiple_evaluators.sql` (get_multiple_evaluators_stats)

---

### 10. Múltiples Evaluadores - Matriz 9-Box

**Objetivo:** Verificar que la matriz 9-Box muestra información de múltiples evaluadores.

**Pasos:**
1. Iniciar sesión como RRHH o jefe
2. Navegar a "Matriz 9-Box"
3. Verificar que los colaboradores con múltiples evaluadores muestran badge
4. Probar filtro "Número de Evaluadores"

**Resultado Esperado:**
- ✅ Los colaboradores con múltiples evaluadores muestran badge con número
- ✅ El filtro "Número de Evaluadores" funciona correctamente
- ✅ Los resultados consolidados se muestran correctamente

**Archivos Relacionados:**
- `src/pages/Matriz9Box.tsx`
- `src/components/ninebox/NineBoxFilters.tsx`

---

### 11. Múltiples Evaluadores - Admin Usuarios

**Objetivo:** Verificar que la tabla de usuarios muestra número de evaluadores.

**Pasos:**
1. Iniciar sesión como admin_rrhh
2. Navegar a "Admin Usuarios"
3. Verificar la columna "Evaluadores"

**Resultado Esperado:**
- ✅ Aparece columna "Evaluadores"
- ✅ Muestra badge con número de evaluadores activos
- ✅ Muestra "-" si no tiene evaluadores

**Archivos Relacionados:**
- `src/pages/AdminUsuarios.tsx`

---

### 12. Múltiples Evaluadores - Admin Asignaciones

**Objetivo:** Verificar que AdminAsignaciones muestra información de múltiples asignaciones.

**Pasos:**
1. Iniciar sesión como admin_rrhh
2. Navegar a "Admin Asignaciones"
3. Verificar la columna "Total Evaluadores"
4. Crear múltiples asignaciones para el mismo colaborador

**Resultado Esperado:**
- ✅ Aparece columna "Total Evaluadores"
- ✅ Muestra número correcto de evaluadores por colaborador
- ✅ Permite crear múltiples asignaciones para el mismo colaborador
- ✅ Muestra alerta informativa sobre múltiples asignaciones

**Archivos Relacionados:**
- `src/pages/AdminAsignaciones.tsx`

---

### 13. Exportación PDF con Múltiples Evaluadores

**Objetivo:** Verificar que los PDFs exportados incluyen información de múltiples evaluadores.

**Pasos:**
1. Tener un colaborador con múltiples evaluadores que hayan completado evaluaciones
2. Navegar a "Vista Comparativa" o "Vista Resultados Finales"
3. Exportar a PDF
4. Verificar el contenido del PDF

**Resultado Esperado:**
- ✅ El PDF incluye sección sobre múltiples evaluadores
- ✅ Muestra resultados individuales por evaluador
- ✅ Muestra promedio consolidado

**Archivos Relacionados:**
- `src/lib/exports.ts` (exportResultadoIndividualPDF, exportEvaluacionCompletaPDFReact)
- `src/components/pdf/EvaluacionPDF.tsx`

---

### 14. Exportación Excel con Múltiples Evaluadores

**Objetivo:** Verificar que las exportaciones Excel incluyen estadísticas de múltiples evaluadores.

**Pasos:**
1. Iniciar sesión como admin_rrhh
2. Navegar a "Dashboard RRHH"
3. Exportar a Excel
4. Verificar la hoja de estadísticas

**Resultado Esperado:**
- ✅ El Excel incluye estadísticas de múltiples evaluadores
- ✅ Muestra número de colaboradores con múltiples evaluadores
- ✅ Muestra promedio de evaluadores

**Archivos Relacionados:**
- `src/pages/DashboardRRHH.tsx` (exportToExcel)

---

### 15. Importación de Usuarios - C1

**Objetivo:** Verificar que la importación de usuarios reconoce "CONCEJO MUNICIPAL" como C1.

**Pasos:**
1. Preparar archivo Excel con usuarios que tengan nivel "CONCEJO MUNICIPAL" o "CONCEJO"
2. Iniciar sesión como admin_rrhh
3. Navegar a "Admin Usuarios"
4. Importar usuarios desde Excel
5. Verificar que los usuarios se importan con nivel C1

**Resultado Esperado:**
- ✅ Los usuarios con "CONCEJO MUNICIPAL" se importan como nivel C1
- ✅ Los usuarios con "CONCEJO" se importan como nivel C1

**Archivos Relacionados:**
- `src/lib/importUsers.ts` (mapearNivelAcodigo)

---

## Checklist de Verificación

- [ ] Autoevaluación C1 funciona sin potencial
- [ ] C1 puede evaluar a D1
- [ ] C1 puede evaluar a A1
- [ ] C1 NO puede evaluar otros niveles
- [ ] A1 puede evaluar a D1
- [ ] A1 NO puede evaluar otros niveles
- [ ] Vista de equipo muestra múltiples evaluadores
- [ ] Vista comparativa muestra resultados consolidados
- [ ] Dashboard RRHH muestra estadísticas de múltiples evaluadores
- [ ] Matriz 9-Box muestra múltiples evaluadores
- [ ] Admin Usuarios muestra número de evaluadores
- [ ] Admin Asignaciones permite múltiples asignaciones
- [ ] Exportación PDF incluye múltiples evaluadores
- [ ] Exportación Excel incluye estadísticas
- [ ] Importación reconoce C1

---

## Notas

- Las pruebas deben ejecutarse en un entorno de desarrollo o staging
- Se recomienda usar datos de prueba, no datos de producción
- Si alguna prueba falla, verificar los logs de la consola del navegador y los logs de Supabase

