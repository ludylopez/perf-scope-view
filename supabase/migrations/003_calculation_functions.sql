-- Migración 003: Funciones SQL para Cálculos de Evaluación
-- Esta migración crea funciones SQL para realizar todos los cálculos de evaluación en el backend

-- ============================================================================
-- 1. FUNCIONES DE CÁLCULO BÁSICAS
-- ============================================================================

-- Función para convertir score Likert (1-5) a porcentaje (0-100)
CREATE OR REPLACE FUNCTION score_to_percentage(score NUMERIC)
RETURNS INTEGER AS $$
BEGIN
  -- Validar rango
  IF score < 1 THEN
    RETURN 0;
  END IF;
  IF score > 5 THEN
    RETURN 100;
  END IF;
  
  -- Fórmula: ((score - 1) / 4) * 100
  -- 1 = 0%, 2 = 25%, 3 = 50%, 4 = 75%, 5 = 100%
  RETURN ROUND(((score - 1) / 4) * 100)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION score_to_percentage(NUMERIC) IS 'Convierte un score Likert (1-5) a porcentaje (0-100)';

-- Función para calcular promedio de una dimensión
CREATE OR REPLACE FUNCTION calculate_dimension_average(
  responses JSONB,
  dimension JSONB
)
RETURNS NUMERIC AS $$
DECLARE
  item_id TEXT;
  item_value NUMERIC;
  total_sum NUMERIC := 0;
  item_count INTEGER := 0;
  items_array JSONB;
BEGIN
  -- Validar inputs
  IF responses IS NULL OR dimension IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Obtener array de items de la dimensión
  items_array := dimension->'items';
  
  IF items_array IS NULL OR jsonb_array_length(items_array) = 0 THEN
    RETURN 0;
  END IF;
  
  -- Iterar sobre items y sumar valores
  FOR item_id IN SELECT jsonb_array_elements_text(
    (SELECT jsonb_agg(item->>'id') FROM jsonb_array_elements(items_array) AS item)
  )
  LOOP
    item_value := (responses->>item_id)::NUMERIC;
    
    -- Validar que el valor existe y está en rango válido (1-5)
    IF item_value IS NOT NULL AND item_value >= 1 AND item_value <= 5 THEN
      total_sum := total_sum + item_value;
      item_count := item_count + 1;
    END IF;
  END LOOP;
  
  -- Retornar promedio
  IF item_count = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND((total_sum / item_count)::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_dimension_average(JSONB, JSONB) IS 'Calcula el promedio de una dimensión basado en las respuestas';

-- Función para calcular score de una dimensión (promedio * peso)
CREATE OR REPLACE FUNCTION calculate_dimension_score(
  responses JSONB,
  dimension JSONB
)
RETURNS NUMERIC AS $$
DECLARE
  average NUMERIC;
  peso NUMERIC;
BEGIN
  -- Obtener peso de la dimensión
  peso := (dimension->>'peso')::NUMERIC;
  
  IF peso IS NULL THEN
    peso := 1.0;
  END IF;
  
  -- Calcular promedio
  average := calculate_dimension_average(responses, dimension);
  
  -- Retornar promedio * peso
  RETURN ROUND((average * peso)::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_dimension_score(JSONB, JSONB) IS 'Calcula el score ponderado de una dimensión (promedio * peso)';

-- Función para calcular score total de desempeño
CREATE OR REPLACE FUNCTION calculate_performance_score(
  responses JSONB,
  dimensions JSONB
)
RETURNS NUMERIC AS $$
DECLARE
  dimension JSONB;
  total_score NUMERIC := 0;
  dimension_score NUMERIC;
BEGIN
  -- Validar inputs
  IF responses IS NULL OR dimensions IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Iterar sobre cada dimensión
  FOR dimension IN SELECT * FROM jsonb_array_elements(dimensions)
  LOOP
    dimension_score := calculate_dimension_score(responses, dimension);
    total_score := total_score + dimension_score;
  END LOOP;
  
  RETURN ROUND(total_score::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_performance_score(JSONB, JSONB) IS 'Calcula el score total de desempeño sumando todas las dimensiones ponderadas';

-- Función para calcular score de potencial
CREATE OR REPLACE FUNCTION calculate_potential_score(
  potencial_responses JSONB,
  potencial_dimensions JSONB
)
RETURNS NUMERIC AS $$
BEGIN
  -- Similar a calculate_performance_score pero para potencial
  RETURN calculate_performance_score(potencial_responses, potencial_dimensions);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_potential_score(JSONB, JSONB) IS 'Calcula el score total de potencial sumando todas las dimensiones ponderadas';

-- Función para calcular resultado final ponderado
CREATE OR REPLACE FUNCTION calculate_final_weighted_score(
  desempeno_auto NUMERIC,
  desempeno_jefe NUMERIC,
  peso_jefe NUMERIC DEFAULT 0.7,
  peso_auto NUMERIC DEFAULT 0.3
)
RETURNS NUMERIC AS $$
DECLARE
  total_peso NUMERIC;
BEGIN
  -- Validar que pesos sumen aproximadamente 1.0 (con tolerancia)
  total_peso := peso_jefe + peso_auto;
  IF ABS(total_peso - 1.0) > 0.01 THEN
    RAISE EXCEPTION 'Los pesos deben sumar 1.0. Actual: %', total_peso;
  END IF;
  
  -- Calcular resultado final ponderado
  RETURN ROUND((desempeno_jefe * peso_jefe + desempeno_auto * peso_auto)::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_final_weighted_score(NUMERIC, NUMERIC, NUMERIC, NUMERIC) IS 'Calcula el resultado final ponderado: (desempeno_jefe * peso_jefe) + (desempeno_auto * peso_auto)';

-- Función para calcular posición 9-box
CREATE OR REPLACE FUNCTION calculate_nine_box_position(
  desempeno_final NUMERIC,
  potencial NUMERIC DEFAULT NULL
)
RETURNS VARCHAR(20) AS $$
DECLARE
  desempeno_porcentaje INTEGER;
  potencial_porcentaje INTEGER;
  desempeno_level VARCHAR(10);
  potencial_level VARCHAR(10);
BEGIN
  -- Convertir desempeño a porcentaje
  desempeno_porcentaje := score_to_percentage(desempeno_final);
  
  -- Si no hay potencial, clasificar solo por desempeño
  IF potencial IS NULL THEN
    IF desempeno_porcentaje > 75 THEN
      RETURN 'alto-medio'; -- Alto desempeño, potencial desconocido
    ELSIF desempeno_porcentaje >= 50 THEN
      RETURN 'medio-medio'; -- Medio desempeño, potencial desconocido
    ELSE
      RETURN 'bajo-medio'; -- Bajo desempeño, potencial desconocido
    END IF;
  END IF;
  
  -- Convertir potencial a porcentaje
  potencial_porcentaje := score_to_percentage(potencial);
  
  -- Clasificar desempeño: Bajo (< 50%), Medio (50-75%), Alto (> 75%)
  IF desempeno_porcentaje < 50 THEN
    desempeno_level := 'bajo';
  ELSIF desempeno_porcentaje <= 75 THEN
    desempeno_level := 'medio';
  ELSE
    desempeno_level := 'alto';
  END IF;
  
  -- Clasificar potencial: Bajo (< 50%), Medio (50-75%), Alto (> 75%)
  IF potencial_porcentaje < 50 THEN
    potencial_level := 'bajo';
  ELSIF potencial_porcentaje <= 75 THEN
    potencial_level := 'medio';
  ELSE
    potencial_level := 'alto';
  END IF;
  
  -- Retornar posición combinada
  RETURN desempeno_level || '-' || potencial_level;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_nine_box_position(NUMERIC, NUMERIC) IS 'Calcula la posición en la matriz 9-box basado en desempeño y potencial (usando porcentajes)';

-- ============================================================================
-- 2. FUNCIONES DE VALIDACIÓN
-- ============================================================================

-- Función para validar que una evaluación esté completa
CREATE OR REPLACE FUNCTION validate_evaluation_complete(
  responses JSONB,
  dimensions JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  dimension JSONB;
  items_array JSONB;
  item JSONB;
  item_id TEXT;
  item_value NUMERIC;
BEGIN
  -- Validar inputs
  IF responses IS NULL OR dimensions IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Iterar sobre cada dimensión
  FOR dimension IN SELECT * FROM jsonb_array_elements(dimensions)
  LOOP
    items_array := dimension->'items';
    
    IF items_array IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Iterar sobre cada item de la dimensión
    FOR item IN SELECT * FROM jsonb_array_elements(items_array)
    LOOP
      item_id := item->>'id';
      item_value := (responses->>item_id)::NUMERIC;
      
      -- Verificar que el valor existe y está en rango válido (1-5)
      IF item_value IS NULL OR item_value < 1 OR item_value > 5 THEN
        RETURN FALSE;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_evaluation_complete(JSONB, JSONB) IS 'Valida que una evaluación esté completa con todos los valores en rango válido (1-5)';

-- Función para validar que un período esté activo y permita evaluación
CREATE OR REPLACE FUNCTION validate_period_active(
  periodo_id UUID,
  tipo_evaluacion VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  periodo RECORD;
  fecha_limite TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Obtener período
  SELECT * INTO periodo
  FROM evaluation_periods
  WHERE id = periodo_id;
  
  -- Verificar que el período existe
  IF periodo IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar que el período esté activo
  IF periodo.estado != 'activo' THEN
    RETURN FALSE;
  END IF;
  
  -- Determinar fecha límite según tipo de evaluación
  IF tipo_evaluacion = 'auto' THEN
    fecha_limite := periodo.fecha_cierre_autoevaluacion;
  ELSIF tipo_evaluacion = 'jefe' THEN
    fecha_limite := periodo.fecha_cierre_evaluacion_jefe;
  ELSE
    RETURN FALSE;
  END IF;
  
  -- Verificar que no haya pasado la fecha límite
  IF fecha_limite IS NULL OR NOW() > fecha_limite THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION validate_period_active(UUID, VARCHAR) IS 'Valida que un período esté activo y permita evaluación según el tipo';

-- ============================================================================
-- 3. FUNCIÓN COMPLETA DE CÁLCULO DE RESULTADO FINAL
-- ============================================================================

-- Función para calcular resultado final completo
CREATE OR REPLACE FUNCTION calculate_complete_final_result(
  autoevaluacion_id UUID,
  evaluacion_jefe_id UUID,
  instrument_config JSONB
)
RETURNS JSONB AS $$
DECLARE
  autoevaluacion RECORD;
  evaluacion_jefe RECORD;
  dimensiones_desempeno JSONB;
  dimensiones_potencial JSONB;
  desempeno_auto NUMERIC;
  desempeno_jefe NUMERIC;
  potencial NUMERIC;
  desempeno_final NUMERIC;
  desempeno_porcentaje INTEGER;
  potencial_porcentaje INTEGER;
  posicion_9box VARCHAR(20);
  peso_jefe NUMERIC;
  peso_auto NUMERIC;
  resultado JSONB;
BEGIN
  -- Obtener evaluaciones desde base de datos
  SELECT * INTO autoevaluacion
  FROM evaluations
  WHERE id = autoevaluacion_id;
  
  SELECT * INTO evaluacion_jefe
  FROM evaluations
  WHERE id = evaluacion_jefe_id;
  
  -- Validar que las evaluaciones existen
  IF autoevaluacion IS NULL OR evaluacion_jefe IS NULL THEN
    RAISE EXCEPTION 'Evaluaciones no encontradas';
  END IF;
  
  -- Validar que las evaluaciones estén enviadas
  IF autoevaluacion.estado != 'enviado' OR evaluacion_jefe.estado != 'enviado' THEN
    RAISE EXCEPTION 'Las evaluaciones deben estar enviadas para calcular resultado final';
  END IF;
  
  -- Obtener dimensiones desde instrument_config
  dimensiones_desempeno := instrument_config->'dimensionesDesempeno';
  dimensiones_potencial := instrument_config->'dimensionesPotencial';
  
  IF dimensiones_desempeno IS NULL THEN
    RAISE EXCEPTION 'Configuración de instrumento inválida: falta dimensionesDesempeno';
  END IF;
  
  -- Obtener pesos desde configuración (por defecto 70/30)
  peso_jefe := COALESCE((instrument_config->'configuracion_calculo'->>'pesoJefe')::NUMERIC, 0.7);
  peso_auto := COALESCE((instrument_config->'configuracion_calculo'->>'pesoAuto')::NUMERIC, 0.3);
  
  -- Calcular desempeño auto
  desempeno_auto := calculate_performance_score(
    autoevaluacion.responses,
    dimensiones_desempeno
  );
  
  -- Calcular desempeño jefe
  desempeno_jefe := calculate_performance_score(
    evaluacion_jefe.responses,
    dimensiones_desempeno
  );
  
  -- Calcular potencial (solo del jefe)
  IF dimensiones_potencial IS NOT NULL AND evaluacion_jefe.evaluacion_potencial IS NOT NULL THEN
    potencial := calculate_potential_score(
      evaluacion_jefe.evaluacion_potencial->'responses',
      dimensiones_potencial
    );
  END IF;
  
  -- Calcular resultado final ponderado
  desempeno_final := calculate_final_weighted_score(
    desempeno_auto,
    desempeno_jefe,
    peso_jefe,
    peso_auto
  );
  
  -- Calcular porcentajes
  desempeno_porcentaje := score_to_percentage(desempeno_final);
  IF potencial IS NOT NULL THEN
    potencial_porcentaje := score_to_percentage(potencial);
  END IF;
  
  -- Calcular posición 9-box
  posicion_9box := calculate_nine_box_position(desempeno_final, potencial);
  
  -- Construir objeto resultado
  resultado := jsonb_build_object(
    'desempenoAuto', desempeno_auto,
    'desempenoJefe', desempeno_jefe,
    'desempenoFinal', desempeno_final,
    'desempenoPorcentaje', desempeno_porcentaje,
    'potencial', potencial,
    'potencialPorcentaje', potencial_porcentaje,
    'posicion9Box', posicion_9box
  );
  
  RETURN resultado;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_complete_final_result(UUID, UUID, JSONB) IS 'Calcula el resultado final completo incluyendo desempeño, potencial y posición 9-box';

