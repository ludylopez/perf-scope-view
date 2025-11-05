# Documentación de Funciones SQL del Backend

Esta documentación describe todas las funciones SQL creadas para el sistema de evaluación de desempeño.

## Índice

1. [Funciones de Cálculo Básicas](#funciones-de-cálculo-básicas)
2. [Funciones de Validación](#funciones-de-validación)
3. [Funciones de Configuración](#funciones-de-configuración)
4. [Funciones de Cálculo Completo](#funciones-de-cálculo-completo)

---

## Funciones de Cálculo Básicas

### `score_to_percentage(score NUMERIC)`

Convierte un score Likert (1-5) a porcentaje (0-100%).

**Parámetros:**
- `score` (NUMERIC): Score en escala Likert (1-5)

**Retorna:**
- `INTEGER`: Porcentaje (0-100)

**Fórmula:**
```
porcentaje = ((score - 1) / 4) * 100
```

**Ejemplos:**
```sql
SELECT score_to_percentage(1);  -- Retorna: 0
SELECT score_to_percentage(3);  -- Retorna: 50
SELECT score_to_percentage(5);  -- Retorna: 100
```

---

### `calculate_dimension_average(responses JSONB, dimension JSONB)`

Calcula el promedio de una dimensión basado en las respuestas.

**Parámetros:**
- `responses` (JSONB): Objeto con respuestas por item (ej: `{"d1_i1": 4, "d1_i2": 5}`)
- `dimension` (JSONB): Objeto con la definición de la dimensión incluyendo items

**Retorna:**
- `NUMERIC`: Promedio de la dimensión (redondeado a 2 decimales)

**Ejemplo:**
```sql
SELECT calculate_dimension_average(
  '{"d1_i1": 4, "d1_i2": 5}'::JSONB,
  '{"id": "dim1", "items": [{"id": "d1_i1"}, {"id": "d1_i2"}]}'::JSONB
);
-- Retorna: 4.5
```

---

### `calculate_dimension_score(responses JSONB, dimension JSONB)`

Calcula el score ponderado de una dimensión (promedio * peso).

**Parámetros:**
- `responses` (JSONB): Objeto con respuestas por item
- `dimension` (JSONB): Objeto con la definición de la dimensión (debe incluir `peso`)

**Retorna:**
- `NUMERIC`: Score ponderado (redondeado a 2 decimales)

**Ejemplo:**
```sql
SELECT calculate_dimension_score(
  '{"d1_i1": 4, "d1_i2": 5}'::JSONB,
  '{"id": "dim1", "peso": 0.30, "items": [{"id": "d1_i1"}, {"id": "d1_i2"}]}'::JSONB
);
-- Retorna: 1.35 (4.5 * 0.30)
```

---

### `calculate_performance_score(responses JSONB, dimensions JSONB)`

Calcula el score total de desempeño sumando todas las dimensiones ponderadas.

**Parámetros:**
- `responses` (JSONB): Objeto con todas las respuestas
- `dimensions` (JSONB): Array de dimensiones con sus pesos y items

**Retorna:**
- `NUMERIC`: Score total de desempeño (1-5, redondeado a 2 decimales)

**Ejemplo:**
```sql
SELECT calculate_performance_score(
  '{"d1_i1": 4, "d1_i2": 5, "d2_i1": 3}'::JSONB,
  '[
    {"id": "dim1", "peso": 0.30, "items": [{"id": "d1_i1"}, {"id": "d1_i2"}]},
    {"id": "dim2", "peso": 0.20, "items": [{"id": "d2_i1"}]}
  ]'::JSONB
);
```

---

### `calculate_potential_score(potencial_responses JSONB, potencial_dimensions JSONB)`

Calcula el score total de potencial. Similar a `calculate_performance_score` pero para dimensiones de potencial.

**Parámetros:**
- `potencial_responses` (JSONB): Objeto con respuestas de potencial
- `potencial_dimensions` (JSONB): Array de dimensiones de potencial

**Retorna:**
- `NUMERIC`: Score total de potencial (1-5, redondeado a 2 decimales)

---

### `calculate_final_weighted_score(desempeno_auto NUMERIC, desempeno_jefe NUMERIC, peso_jefe NUMERIC DEFAULT 0.7, peso_auto NUMERIC DEFAULT 0.3)`

Calcula el resultado final ponderado combinando autoevaluación y evaluación del jefe.

**Parámetros:**
- `desempeno_auto` (NUMERIC): Score de desempeño de autoevaluación (1-5)
- `desempeno_jefe` (NUMERIC): Score de desempeño del jefe (1-5)
- `peso_jefe` (NUMERIC): Peso del jefe (default: 0.7)
- `peso_auto` (NUMERIC): Peso de autoevaluación (default: 0.3)

**Retorna:**
- `NUMERIC`: Score final ponderado (redondeado a 2 decimales)

**Validación:**
- Los pesos deben sumar 1.0 (con tolerancia de 0.01)

**Ejemplo:**
```sql
SELECT calculate_final_weighted_score(3.0, 4.0, 0.7, 0.3);
-- Retorna: 3.7 ((4.0 * 0.7) + (3.0 * 0.3))
```

---

### `calculate_nine_box_position(desempeno_final NUMERIC, potencial NUMERIC DEFAULT NULL)`

Calcula la posición en la matriz 9-box basado en desempeño y potencial (usando porcentajes).

**Parámetros:**
- `desempeno_final` (NUMERIC): Score final de desempeño (1-5)
- `potencial` (NUMERIC, opcional): Score de potencial (1-5)

**Retorna:**
- `VARCHAR(20)`: Posición en formato "desempeño-potencial" (ej: "alto-alto", "medio-bajo")

**Clasificación:**
- **Desempeño/Potencial:**
  - Bajo: < 50%
  - Medio: 50-75%
  - Alto: > 75%

**Ejemplo:**
```sql
SELECT calculate_nine_box_position(4.5, 3.5);
-- Retorna: "alto-medio"
```

---

## Funciones de Validación

### `validate_evaluation_complete(responses JSONB, dimensions JSONB)`

Valida que una evaluación esté completa con todos los valores en rango válido (1-5).

**Parámetros:**
- `responses` (JSONB): Objeto con respuestas
- `dimensions` (JSONB): Array de dimensiones con sus items

**Retorna:**
- `BOOLEAN`: `true` si está completa y válida, `false` en caso contrario

**Validaciones:**
- Todos los items de todas las dimensiones deben tener valores
- Todos los valores deben estar en rango 1-5

**Ejemplo:**
```sql
SELECT validate_evaluation_complete(
  '{"d1_i1": 4, "d1_i2": 5}'::JSONB,
  '[{"id": "dim1", "items": [{"id": "d1_i1"}, {"id": "d1_i2"}]}]'::JSONB
);
-- Retorna: true
```

---

### `validate_period_active(periodo_id UUID, tipo_evaluacion VARCHAR)`

Valida que un período esté activo y permita evaluación según el tipo.

**Parámetros:**
- `periodo_id` (UUID): ID del período de evaluación
- `tipo_evaluacion` (VARCHAR): Tipo de evaluación ('auto' o 'jefe')

**Retorna:**
- `BOOLEAN`: `true` si el período está activo y permite evaluación, `false` en caso contrario

**Validaciones:**
- El período debe existir
- El período debe estar en estado 'activo'
- La fecha actual no debe haber pasado la fecha límite según el tipo

**Ejemplo:**
```sql
SELECT validate_period_active(
  '123e4567-e89b-12d3-a456-426614174000'::UUID,
  'auto'
);
```

---

## Funciones de Configuración

### `get_instrument_config(instrument_id VARCHAR)`

Obtiene la configuración completa de un instrumento por su ID.

**Parámetros:**
- `instrument_id` (VARCHAR): ID del instrumento (ej: 'A1', 'A2', 'S1')

**Retorna:**
- `JSONB`: Configuración completa del instrumento o `NULL` si no existe

**Estructura de retorno:**
```json
{
  "id": "A1",
  "nivel": "A1",
  "dimensionesDesempeno": [...],
  "dimensionesPotencial": [...],
  "configuracion_calculo": {...}
}
```

**Ejemplo:**
```sql
SELECT get_instrument_config('A1');
```

---

### `get_instrument_config_from_user(user_dpi VARCHAR)`

Obtiene la configuración de instrumento para un usuario basado en su nivel o override manual.

**Parámetros:**
- `user_dpi` (VARCHAR): DPI del usuario

**Retorna:**
- `JSONB`: Configuración del instrumento o `NULL` si no se encuentra

**Lógica:**
1. Busca usuario por DPI
2. Si tiene `instrumento_id` override, usa ese
3. Si no, usa el `nivel` del usuario
4. Si no se encuentra, intenta con 'A1' como fallback

**Ejemplo:**
```sql
SELECT get_instrument_config_from_user('1234567890101');
```

---

## Funciones de Cálculo Completo

### `calculate_complete_final_result(autoevaluacion_id UUID, evaluacion_jefe_id UUID, instrument_config JSONB)`

Calcula el resultado final completo incluyendo desempeño, potencial y posición 9-box.

**Parámetros:**
- `autoevaluacion_id` (UUID): ID de la evaluación de autoevaluación
- `evaluacion_jefe_id` (UUID): ID de la evaluación del jefe
- `instrument_config` (JSONB): Configuración completa del instrumento

**Retorna:**
- `JSONB`: Objeto con todos los resultados calculados

**Estructura de retorno:**
```json
{
  "desempenoAuto": 3.5,
  "desempenoJefe": 4.2,
  "desempenoFinal": 3.99,
  "desempenoPorcentaje": 75,
  "potencial": 3.8,
  "potencialPorcentaje": 70,
  "posicion9Box": "alto-medio"
}
```

**Validaciones:**
- Ambas evaluaciones deben existir
- Ambas evaluaciones deben estar en estado 'enviado'
- La configuración del instrumento debe ser válida

**Ejemplo:**
```sql
SELECT calculate_complete_final_result(
  '123e4567-e89b-12d3-a456-426614174000'::UUID,
  '223e4567-e89b-12d3-a456-426614174000'::UUID,
  get_instrument_config('A1')
);
```

---

## Triggers Automáticos

### `trigger_calculate_final_result`

**Tabla:** `evaluations`  
**Tipo:** AFTER UPDATE  
**Condición:** Cuando `estado` cambia a 'enviado' y `tipo` es 'jefe'

**Función:** Calcula automáticamente el resultado final cuando se envía una evaluación del jefe.

**Comportamiento:**
1. Busca la autoevaluación del colaborador en el mismo período
2. Obtiene la configuración del instrumento del colaborador
3. Calcula el resultado completo usando `calculate_complete_final_result`
4. Inserta o actualiza el registro en `final_evaluation_results`

---

### `trigger_validate_evaluation_before_submit`

**Tabla:** `evaluations`  
**Tipo:** BEFORE UPDATE  
**Condición:** Cuando `estado` cambia a 'enviado'

**Función:** Valida que una evaluación esté completa antes de permitir enviarla.

**Validaciones:**
- La evaluación debe estar completa (`validate_evaluation_complete`)
- Si es evaluación de jefe y tiene potencial, también valida potencial
- El período debe estar activo (`validate_period_active`)
- Establece `fecha_envio` automáticamente si es NULL

---

## Notas de Implementación

### Uso de Porcentajes

Todas las funciones de cálculo trabajan con scores Likert (1-5) internamente, pero la matriz 9-box se calcula usando porcentajes. La conversión se hace automáticamente usando `score_to_percentage`.

### Manejo de Errores

Las funciones lanzan excepciones (`RAISE EXCEPTION`) cuando:
- Los parámetros son inválidos
- Los datos requeridos no existen
- Las validaciones fallan

Es importante manejar estas excepciones en el código cliente.

### Performance

Todas las funciones de cálculo básicas están marcadas como `IMMUTABLE` cuando es posible, lo que permite optimizaciones del planificador de PostgreSQL.

Las funciones que acceden a tablas están marcadas como `STABLE` o `VOLATILE` según corresponda.

---

## Pruebas

Para ejecutar las pruebas de todas las funciones, ejecuta:

```sql
\i supabase/migrations/007_test_calculations.sql
```

Las pruebas utilizan `DO` blocks con `ASSERT` para validar el comportamiento esperado.

