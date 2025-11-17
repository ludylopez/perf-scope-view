# Guía de Usuario: Concejo Municipal (C1) y Múltiples Evaluadores

## Introducción

Esta guía explica cómo usar las nuevas funcionalidades de la plataforma de evaluación de desempeño:

1. **Autoevaluación del Concejo Municipal (C1)**: Los miembros del Concejo se autoevalúan solo en desempeño (sin evaluación de potencial).
2. **Evaluación de Directores y Alcalde**: El Concejo evalúa a Directores (D1) y al Alcalde (A1).
3. **Múltiples Evaluadores**: Los empleados de nivel directivo pueden ser evaluados por varios jefes simultáneamente.

---

## Para Miembros del Concejo Municipal (C1)

### 1. Realizar Autoevaluación

**Paso 1:** Iniciar sesión en la plataforma con sus credenciales de C1.

**Paso 2:** Navegar a la sección **"Autoevaluación"** desde el menú principal.

**Paso 3:** Verá **5 dimensiones de desempeño**:
- CUMPLIMIENTO DE FUNCIONES CONSTITUCIONALES Y LEGALES
- GESTIÓN Y COORDINACIÓN INSTITUCIONAL
- REPRESENTACIÓN Y VINCULACIÓN CIUDADANA
- COMPETENCIAS TÉCNICAS Y CONOCIMIENTO NORMATIVO
- ÉTICA Y TRANSPARENCIA

**Nota:** Los miembros del Concejo **NO** verán una sección de "Evaluación de Potencial" porque esta evaluación no aplica para su nivel.

**Paso 4:** Complete cada dimensión respondiendo a los ítems según su desempeño:
- **5**: Excelente
- **4**: Muy bueno
- **3**: Bueno
- **2**: Regular
- **1**: Necesita mejorar

**Paso 5:** Revise sus respuestas y haga clic en **"Enviar Evaluación"**.

**Resultado:** Su autoevaluación se guardará y el resultado final será 100% basado en su autoevaluación (sin evaluación de jefe).

---

### 2. Evaluar a Directores (D1)

**Paso 1:** Asegúrese de que existe una asignación activa entre usted (C1) y el Director que desea evaluar. Si no existe, contacte al administrador de RRHH.

**Paso 2:** Navegar a **"Evaluación de Equipo"** desde el menú principal.

**Paso 3:** En la lista de colaboradores, encontrará los Directores (D1) asignados a usted.

**Paso 4:** Hacer clic en **"Evaluar"** junto al nombre del Director.

**Paso 5:** Complete la evaluación del Director:
- Responda a las dimensiones de desempeño
- Complete la evaluación de potencial (si aplica)
- Agregue comentarios si lo desea

**Paso 6:** Revise y haga clic en **"Enviar Evaluación"**.

**Nota:** El Concejo **SOLO** puede evaluar a Directores (D1) y al Alcalde (A1). Si intenta evaluar a otros niveles, verá un mensaje de error.

---

### 3. Evaluar al Alcalde (A1)

**Paso 1:** Asegúrese de que existe una asignación activa entre usted (C1) y el Alcalde. Si no existe, contacte al administrador de RRHH.

**Paso 2:** Navegar a **"Evaluación de Equipo"**.

**Paso 3:** En la lista de colaboradores, encontrará el Alcalde (A1) si está asignado a usted.

**Paso 4:** Hacer clic en **"Evaluar"** junto al nombre del Alcalde.

**Paso 5:** Complete la evaluación del Alcalde y envíe.

---

## Para el Alcalde (A1)

### Evaluar a Directores (D1)

**Paso 1:** Navegar a **"Evaluación de Equipo"**.

**Paso 2:** En la lista de colaboradores, encontrará los Directores (D1) asignados a usted.

**Paso 3:** Hacer clic en **"Evaluar"** junto al nombre del Director.

**Paso 4:** Complete la evaluación y envíe.

**Nota:** El Alcalde **SOLO** puede evaluar a Directores (D1). Si intenta evaluar a otros niveles, verá un mensaje de error.

---

## Para Administradores de RRHH

### 1. Crear Usuarios C1

**Paso 1:** Navegar a **"Admin Usuarios"**.

**Paso 2:** Hacer clic en **"Importar Usuarios"** o **"Crear Usuario"**.

**Paso 3:** Al crear/importar, asegúrese de que el nivel sea **"C1"** o **"CONCEJO MUNICIPAL"**.

**Nota:** La plataforma reconocerá automáticamente "CONCEJO MUNICIPAL" o "CONCEJO" como nivel C1 durante la importación.

---

### 2. Crear Asignaciones para C1

**Paso 1:** Navegar a **"Admin Asignaciones"**.

**Paso 2:** Para crear asignación manual:
- Seleccionar **Colaborador**: Director (D1) o Alcalde (A1)
- Seleccionar **Jefe Evaluador**: Miembro del Concejo (C1)
- Hacer clic en **"Crear Asignación"**

**Reglas importantes:**
- C1 **SOLO** puede ser asignado para evaluar a D1 o A1
- A1 **SOLO** puede ser asignado para evaluar a D1
- Si intenta crear una asignación inválida, verá un mensaje de error

**Paso 3:** Para importar múltiples asignaciones desde Excel:
- Preparar archivo Excel con columnas: `colaborador_id`, `jefe_id`
- Hacer clic en **"Importar desde Excel"**
- Seleccionar archivo y seguir las instrucciones

---

### 3. Crear Múltiples Asignaciones (Múltiples Evaluadores)

**Escenario:** Un Director (D1) puede ser evaluado tanto por el Concejo (C1) como por el Alcalde (A1).

**Paso 1:** Navegar a **"Admin Asignaciones"**.

**Paso 2:** Crear primera asignación:
- Colaborador: Director (D1)
- Jefe: Concejo (C1)
- Crear asignación

**Paso 3:** Crear segunda asignación:
- Colaborador: Mismo Director (D1)
- Jefe: Alcalde (A1)
- Crear asignación

**Resultado:** El Director ahora tiene 2 evaluadores asignados. Ambos pueden completar su evaluación independientemente, y los resultados se consolidarán automáticamente.

**Nota:** La plataforma permite múltiples asignaciones activas para el mismo colaborador. Esto es especialmente útil para niveles directivos.

---

### 4. Ver Estadísticas de Múltiples Evaluadores

**Paso 1:** Navegar a **"Dashboard RRHH"**.

**Paso 2:** Buscar la tarjeta **"Múltiples Evaluadores"**.

**Información mostrada:**
- Número de colaboradores con múltiples evaluadores
- Promedio de evaluadores por colaborador
- Total de evaluaciones realizadas

---

### 5. Ver Colaboradores con Múltiples Evaluadores

**En Admin Usuarios:**
- La columna **"Evaluadores"** muestra un badge con el número de evaluadores activos para cada usuario.

**En Evaluación de Equipo:**
- Los colaboradores con múltiples evaluadores muestran un badge con el texto **"X evaluadores"** donde X > 1.
- También aparece el texto **"(Evaluado por múltiples jefes)"** en la descripción.

**En Matriz 9-Box:**
- Los colaboradores con múltiples evaluadores muestran un badge con el número de evaluadores.
- Puede filtrar por "Múltiples evaluadores" usando el filtro avanzado.

---

## Para Todos los Usuarios

### Ver Resultados con Múltiples Evaluadores

**Paso 1:** Navegar a **"Vista Comparativa"** o **"Vista Resultados Finales"** de un colaborador.

**Paso 2:** Si el colaborador tiene múltiples evaluadores, verá:

**Sección "Evaluado por X evaluadores":**
- Muestra el número total de evaluadores
- Lista los resultados individuales de cada evaluador:
  - Nombre del evaluador
  - Desempeño final (%)
  - Potencial (%)
  - Posición 9-Box

**Resultado Consolidado:**
- **Desempeño Final**: Promedio de todos los evaluadores
- **Potencial**: Promedio de todos los evaluadores
- **Posición 9-Box**: Moda (valor más frecuente) de todas las evaluaciones

**Nota:** Los resultados consolidados se calculan automáticamente promediando las evaluaciones de todos los evaluadores.

---

## Preguntas Frecuentes (FAQ)

### ¿Por qué C1 no tiene evaluación de potencial?

El Concejo Municipal se autoevalúa solo en desempeño porque su función es principalmente de supervisión y control político. La evaluación de potencial no aplica para este nivel según las políticas institucionales.

### ¿Puede un Director tener más de 2 evaluadores?

Sí. Un colaborador puede tener tantos evaluadores como asignaciones activas tenga. La plataforma consolidará automáticamente todos los resultados.

### ¿Qué pasa si un evaluador completa su evaluación y otro no?

El resultado consolidado se calculará solo con las evaluaciones completadas. Cuando el segundo evaluador complete su evaluación, el resultado consolidado se actualizará automáticamente.

### ¿Cómo se calcula el resultado consolidado?

- **Desempeño Final**: Promedio aritmético de todos los evaluadores
- **Potencial**: Promedio aritmético de todos los evaluadores
- **Posición 9-Box**: Moda (valor que aparece más veces)

### ¿Puedo ver los resultados individuales de cada evaluador?

Sí. En la "Vista Comparativa" o "Vista Resultados Finales", hay una sección que muestra los resultados individuales de cada evaluador junto con el resultado consolidado.

### ¿Qué pasa si intento evaluar a alguien que no debo?

La plataforma validará automáticamente los permisos:
- Si es C1 intentando evaluar a alguien que no sea D1 o A1, verá un error
- Si es A1 intentando evaluar a alguien que no sea D1, verá un error
- La evaluación no se guardará si no tiene permisos

### ¿Cómo exporto resultados con múltiples evaluadores?

Al exportar a PDF o Excel desde "Vista Comparativa" o "Dashboard RRHH", los resultados incluirán:
- Información sobre múltiples evaluadores (si aplica)
- Resultados individuales por evaluador
- Resultado consolidado

---

## Contacto y Soporte

Si tiene preguntas o necesita ayuda:

1. **Consultar documentación técnica**: `docs/IMPLEMENTACION_C1_MULTIPLE_EVALUATORS.md`
2. **Consultar guía de pruebas**: `docs/PRUEBAS_FRONTEND_C1_MULTIPLE_EVALUATORS.md`
3. **Contactar al administrador de RRHH** para:
   - Crear asignaciones
   - Resolver problemas de permisos
   - Configurar usuarios C1

---

## Glosario

- **C1**: Concejo Municipal - Nivel más alto de la jerarquía organizacional
- **A1**: Alcalde Municipal - Segundo nivel más alto
- **D1**: Directores - Nivel directivo que puede ser evaluado por C1 y A1
- **Múltiples Evaluadores**: Sistema que permite que un colaborador sea evaluado por varios jefes simultáneamente
- **Resultado Consolidado**: Promedio de resultados de múltiples evaluadores
- **Asignación Activa**: Relación entre colaborador y jefe evaluador que está activa en el sistema

---

## Changelog

- **2025-01-XX**: Implementación inicial de C1 y múltiples evaluadores
- **2025-01-XX**: Guía de usuario creada

