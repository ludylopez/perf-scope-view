-- Script de diagnóstico para verificar cálculos de evaluación
-- Ejecutar manualmente para diagnosticar problemas de cálculo

-- Función de diagnóstico para un colaborador específico
CREATE OR REPLACE FUNCTION diagnosticar_calculo_evaluacion(
  p_colaborador_id VARCHAR(20),
  p_periodo_id UUID
)
RETURNS TABLE (
  tipo TEXT,
  valor_calculado NUMERIC,
  valor_guardado NUMERIC,
  porcentaje_calculado INTEGER,
  porcentaje_guardado INTEGER,
  diferencia NUMERIC,
  detalles JSONB
) AS $$
DECLARE
  v_autoevaluacion_id UUID;
  v_evaluacion_jefe_id UUID;
  v_autoevaluacion RECORD;
  v_evaluacion_jefe RECORD;
  v_instrument_config JSONB;
  v_resultado_calculado JSONB;
  v_resultado_guardado JSONB;
  v_desempeno_auto NUMERIC;
  v_desempeno_jefe NUMERIC;
  v_desempeno_final NUMERIC;
  v_potencial NUMERIC;
BEGIN
  -- Obtener IDs de evaluaciones
  SELECT id INTO v_autoevaluacion_id
  FROM evaluations
  WHERE usuario_id = p_colaborador_id
    AND periodo_id = p_periodo_id
    AND tipo = 'auto'
    AND estado = 'enviado'
  ORDER BY fecha_envio DESC
  LIMIT 1;

  SELECT id INTO v_evaluacion_jefe_id
  FROM evaluations
  WHERE colaborador_id = p_colaborador_id
    AND periodo_id = p_periodo_id
    AND tipo = 'jefe'
    AND estado = 'enviado'
  ORDER BY fecha_envio DESC
  LIMIT 1;

  IF v_autoevaluacion_id IS NULL OR v_evaluacion_jefe_id IS NULL THEN
    RAISE EXCEPTION 'No se encontraron evaluaciones completas para el colaborador % en el período %', p_colaborador_id, p_periodo_id;
  END IF;

  -- Obtener evaluaciones completas
  SELECT * INTO v_autoevaluacion FROM evaluations WHERE id = v_autoevaluacion_id;
  SELECT * INTO v_evaluacion_jefe FROM evaluations WHERE id = v_evaluacion_jefe_id;

  -- Obtener configuración de instrumento
  v_instrument_config := get_instrument_config_from_user(p_colaborador_id);

  IF v_instrument_config IS NULL THEN
    RAISE EXCEPTION 'No se pudo obtener configuración de instrumento para el usuario %', p_colaborador_id;
  END IF;

  -- Calcular resultado usando la función SQL
  v_resultado_calculado := calculate_complete_final_result(
    v_autoevaluacion_id,
    v_evaluacion_jefe_id,
    v_instrument_config
  );

  -- Obtener resultado guardado
  SELECT resultado_final INTO v_resultado_guardado
  FROM final_evaluation_results
  WHERE colaborador_id = p_colaborador_id
    AND periodo_id = p_periodo_id;

  -- Extraer valores calculados
  v_desempeno_auto := (v_resultado_calculado->>'desempenoAuto')::NUMERIC;
  v_desempeno_jefe := (v_resultado_calculado->>'desempenoJefe')::NUMERIC;
  v_desempeno_final := (v_resultado_calculado->>'desempenoFinal')::NUMERIC;
  v_potencial := (v_resultado_calculado->>'potencial')::NUMERIC;

  -- Retornar comparación
  RETURN QUERY SELECT
    'Desempeño Auto'::TEXT,
    v_desempeno_auto,
    (v_resultado_guardado->>'desempenoAuto')::NUMERIC,
    score_to_percentage(v_desempeno_auto),
    score_to_percentage((v_resultado_guardado->>'desempenoAuto')::NUMERIC),
    ABS(v_desempeno_auto - (v_resultado_guardado->>'desempenoAuto')::NUMERIC),
    jsonb_build_object(
      'autoevaluacion_id', v_autoevaluacion_id,
      'total_respuestas', jsonb_object_keys(v_autoevaluacion.responses)
    );

  RETURN QUERY SELECT
    'Desempeño Jefe'::TEXT,
    v_desempeno_jefe,
    (v_resultado_guardado->>'desempenoJefe')::NUMERIC,
    score_to_percentage(v_desempeno_jefe),
    score_to_percentage((v_resultado_guardado->>'desempenoJefe')::NUMERIC),
    ABS(v_desempeno_jefe - (v_resultado_guardado->>'desempenoJefe')::NUMERIC),
    jsonb_build_object(
      'evaluacion_jefe_id', v_evaluacion_jefe_id,
      'total_respuestas', jsonb_object_keys(v_evaluacion_jefe.responses)
    );

  RETURN QUERY SELECT
    'Desempeño Final'::TEXT,
    v_desempeno_final,
    (v_resultado_guardado->>'desempenoFinal')::NUMERIC,
    score_to_percentage(v_desempeno_final),
    score_to_percentage((v_resultado_guardado->>'desempenoFinal')::NUMERIC),
    ABS(v_desempeno_final - (v_resultado_guardado->>'desempenoFinal')::NUMERIC),
    jsonb_build_object(
      'peso_jefe', (v_instrument_config->'configuracion_calculo'->>'pesoJefe')::NUMERIC,
      'peso_auto', (v_instrument_config->'configuracion_calculo'->>'pesoAuto')::NUMERIC
    );

  IF v_potencial IS NOT NULL THEN
    RETURN QUERY SELECT
      'Potencial'::TEXT,
      v_potencial,
      (v_resultado_guardado->>'potencial')::NUMERIC,
      score_to_percentage(v_potencial),
      score_to_percentage((v_resultado_guardado->>'potencial')::NUMERIC),
      ABS(v_potencial - (v_resultado_guardado->>'potencial')::NUMERIC),
      jsonb_build_object(
        'total_respuestas_potencial', jsonb_object_keys(v_evaluacion_jefe.evaluacion_potencial->'responses')
      );
  END IF;

END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION diagnosticar_calculo_evaluacion(VARCHAR, UUID) IS 'Diagnostica diferencias entre valores calculados y guardados para un colaborador';

-- Función para recalcular resultado final para un colaborador
CREATE OR REPLACE FUNCTION recalcular_resultado_final(
  p_colaborador_id VARCHAR(20),
  p_periodo_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_autoevaluacion_id UUID;
  v_evaluacion_jefe_id UUID;
  v_instrument_config JSONB;
  v_resultado JSONB;
  v_evaluador_id VARCHAR(20);
BEGIN
  -- Obtener IDs de evaluaciones
  SELECT id INTO v_autoevaluacion_id
  FROM evaluations
  WHERE usuario_id = p_colaborador_id
    AND periodo_id = p_periodo_id
    AND tipo = 'auto'
    AND estado = 'enviado'
  ORDER BY fecha_envio DESC
  LIMIT 1;

  SELECT id, evaluador_id INTO v_evaluacion_jefe_id, v_evaluador_id
  FROM evaluations
  WHERE colaborador_id = p_colaborador_id
    AND periodo_id = p_periodo_id
    AND tipo = 'jefe'
    AND estado = 'enviado'
  ORDER BY fecha_envio DESC
  LIMIT 1;

  IF v_autoevaluacion_id IS NULL OR v_evaluacion_jefe_id IS NULL THEN
    RAISE EXCEPTION 'No se encontraron evaluaciones completas para el colaborador % en el período %', p_colaborador_id, p_periodo_id;
  END IF;

  -- Obtener configuración de instrumento
  v_instrument_config := get_instrument_config_from_user(p_colaborador_id);

  IF v_instrument_config IS NULL THEN
    RAISE EXCEPTION 'No se pudo obtener configuración de instrumento para el usuario %', p_colaborador_id;
  END IF;

  -- Calcular resultado
  v_resultado := calculate_complete_final_result(
    v_autoevaluacion_id,
    v_evaluacion_jefe_id,
    v_instrument_config
  );

  -- Actualizar final_evaluation_results
  INSERT INTO final_evaluation_results (
    colaborador_id,
    periodo_id,
    autoevaluacion_id,
    evaluacion_jefe_id,
    resultado_final,
    comparativo,
    posicion_9box,
    desempeno_final,
    desempeno_porcentaje,
    potencial,
    potencial_porcentaje,
    fecha_generacion
  ) VALUES (
    p_colaborador_id,
    p_periodo_id,
    v_autoevaluacion_id,
    v_evaluacion_jefe_id,
    v_resultado,
    jsonb_build_object(
      'desempenoAuto', v_resultado->>'desempenoAuto',
      'desempenoJefe', v_resultado->>'desempenoJefe',
      'desempenoFinal', v_resultado->>'desempenoFinal',
      'potencial', v_resultado->>'potencial'
    ),
    v_resultado->>'posicion9Box',
    (v_resultado->>'desempenoFinal')::NUMERIC,
    (v_resultado->>'desempenoPorcentaje')::INTEGER,
    (v_resultado->>'potencial')::NUMERIC,
    (v_resultado->>'potencialPorcentaje')::INTEGER,
    NOW()
  )
  ON CONFLICT (colaborador_id, periodo_id) DO UPDATE SET
    autoevaluacion_id = EXCLUDED.autoevaluacion_id,
    evaluacion_jefe_id = EXCLUDED.evaluacion_jefe_id,
    resultado_final = EXCLUDED.resultado_final,
    comparativo = EXCLUDED.comparativo,
    posicion_9box = EXCLUDED.posicion_9box,
    desempeno_final = EXCLUDED.desempeno_final,
    desempeno_porcentaje = EXCLUDED.desempeno_porcentaje,
    potencial = EXCLUDED.potencial,
    potencial_porcentaje = EXCLUDED.potencial_porcentaje,
    fecha_generacion = NOW();

  -- Actualizar evaluation_results_by_evaluator
  INSERT INTO evaluation_results_by_evaluator (
    colaborador_id,
    periodo_id,
    evaluador_id,
    autoevaluacion_id,
    evaluacion_jefe_id,
    resultado_final,
    comparativo,
    posicion_9box,
    desempeno_final,
    desempeno_porcentaje,
    potencial,
    potencial_porcentaje,
    fecha_generacion
  ) VALUES (
    p_colaborador_id,
    p_periodo_id,
    v_evaluador_id,
    v_autoevaluacion_id,
    v_evaluacion_jefe_id,
    v_resultado,
    jsonb_build_object(
      'desempenoAuto', v_resultado->>'desempenoAuto',
      'desempenoJefe', v_resultado->>'desempenoJefe',
      'desempenoFinal', v_resultado->>'desempenoFinal',
      'potencial', v_resultado->>'potencial'
    ),
    v_resultado->>'posicion9Box',
    (v_resultado->>'desempenoFinal')::NUMERIC,
    (v_resultado->>'desempenoPorcentaje')::INTEGER,
    (v_resultado->>'potencial')::NUMERIC,
    (v_resultado->>'potencialPorcentaje')::INTEGER,
    NOW()
  )
  ON CONFLICT (colaborador_id, periodo_id, evaluador_id) DO UPDATE SET
    autoevaluacion_id = EXCLUDED.autoevaluacion_id,
    evaluacion_jefe_id = EXCLUDED.evaluacion_jefe_id,
    resultado_final = EXCLUDED.resultado_final,
    comparativo = EXCLUDED.comparativo,
    posicion_9box = EXCLUDED.posicion_9box,
    desempeno_final = EXCLUDED.desempeno_final,
    desempeno_porcentaje = EXCLUDED.desempeno_porcentaje,
    potencial = EXCLUDED.potencial,
    potencial_porcentaje = EXCLUDED.potencial_porcentaje,
    fecha_generacion = NOW(),
    updated_at = NOW();

  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalcular_resultado_final(VARCHAR, UUID) IS 'Recalcula y actualiza el resultado final para un colaborador específico';



