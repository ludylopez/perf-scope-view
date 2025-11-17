-- Migración 018: Actualizar Trigger para Múltiples Evaluadores
-- Esta migración actualiza el trigger handle_final_result_calculation()
-- para insertar resultados en evaluation_results_by_evaluator
-- manteniendo compatibilidad con final_evaluation_results

-- ============================================================
-- ACTUALIZAR TRIGGER handle_final_result_calculation
-- ============================================================

CREATE OR REPLACE FUNCTION handle_final_result_calculation()
RETURNS TRIGGER AS $$
DECLARE
  autoevaluacion_id UUID;
  periodo_id_val UUID;
  colaborador_id_val VARCHAR(20);
  evaluador_id_val VARCHAR(20);
  instrument_config JSONB;
  resultado JSONB;
  desempeno_final NUMERIC;
  desempeno_porcentaje INTEGER;
  potencial NUMERIC;
  potencial_porcentaje INTEGER;
  posicion_9box VARCHAR(20);
BEGIN
  -- Solo procesar cuando estado cambia a 'enviado' y tipo es 'jefe'
  IF NEW.estado = 'enviado' AND NEW.tipo = 'jefe' 
     AND (OLD.estado IS NULL OR OLD.estado != 'enviado') THEN
    
    -- Obtener datos necesarios
    periodo_id_val := NEW.periodo_id;
    colaborador_id_val := NEW.colaborador_id;
    evaluador_id_val := NEW.evaluador_id;
    
    -- Buscar autoevaluación del colaborador en el mismo período
    SELECT id INTO autoevaluacion_id
    FROM evaluations
    WHERE usuario_id = colaborador_id_val
      AND periodo_id = periodo_id_val
      AND tipo = 'auto'
      AND estado = 'enviado'
    ORDER BY fecha_envio DESC
    LIMIT 1;
    
    -- Si no hay autoevaluación, no podemos calcular resultado final
    IF autoevaluacion_id IS NULL THEN
      -- No lanzar error, solo retornar (el resultado se calculará cuando haya autoevaluación)
      RETURN NEW;
    END IF;
    
    -- Obtener configuración de instrumento
    instrument_config := get_instrument_config_from_user(colaborador_id_val);
    
    IF instrument_config IS NULL THEN
      RAISE EXCEPTION 'No se pudo obtener configuración de instrumento para el usuario %', colaborador_id_val;
    END IF;
    
    -- Calcular resultado completo
    resultado := calculate_complete_final_result(
      autoevaluacion_id,
      NEW.id,
      instrument_config
    );
    
    -- Extraer valores del resultado
    desempeno_final := (resultado->>'desempenoFinal')::NUMERIC;
    desempeno_porcentaje := (resultado->>'desempenoPorcentaje')::INTEGER;
    potencial := (resultado->>'potencial')::NUMERIC;
    potencial_porcentaje := (resultado->>'potencialPorcentaje')::INTEGER;
    posicion_9box := resultado->>'posicion9Box';
    
    -- ============================================================
    -- INSERTAR EN evaluation_results_by_evaluator (NUEVO SISTEMA)
    -- ============================================================
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
      colaborador_id_val,
      periodo_id_val,
      evaluador_id_val,
      autoevaluacion_id,
      NEW.id,
      resultado,
      jsonb_build_object(
        'desempenoAuto', resultado->>'desempenoAuto',
        'desempenoJefe', resultado->>'desempenoJefe',
        'desempenoFinal', resultado->>'desempenoFinal',
        'potencial', resultado->>'potencial'
      ),
      posicion_9box,
      desempeno_final,
      desempeno_porcentaje,
      potencial,
      potencial_porcentaje,
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
    
    -- ============================================================
    -- MANTENER COMPATIBILIDAD: Insertar/Actualizar final_evaluation_results
    -- Solo si es el primer evaluador o si no existe registro previo
    -- ============================================================
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
    )
    SELECT
      colaborador_id_val,
      periodo_id_val,
      autoevaluacion_id,
      NEW.id,
      resultado,
      jsonb_build_object(
        'desempenoAuto', resultado->>'desempenoAuto',
        'desempenoJefe', resultado->>'desempenoJefe',
        'desempenoFinal', resultado->>'desempenoFinal',
        'potencial', resultado->>'potencial'
      ),
      posicion_9box,
      desempeno_final,
      desempeno_porcentaje,
      potencial,
      potencial_porcentaje,
      NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM final_evaluation_results
      WHERE colaborador_id = colaborador_id_val
        AND periodo_id = periodo_id_val
    )
    ON CONFLICT (colaborador_id, periodo_id) DO UPDATE SET
      -- Solo actualizar si este es el primer evaluador o si queremos mantener el último
      -- Por ahora, mantenemos el comportamiento original (último evaluador)
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
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION handle_final_result_calculation() IS 'Maneja el cálculo automático de resultado final cuando se envía una evaluación del jefe. Inserta en evaluation_results_by_evaluator para soportar múltiples evaluadores y mantiene compatibilidad con final_evaluation_results.';

