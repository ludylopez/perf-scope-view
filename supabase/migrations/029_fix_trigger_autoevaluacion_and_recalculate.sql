-- Migración 029: Corregir trigger para ejecutarse también cuando se envía autoevaluación
-- y crear función para recalcular resultados pendientes
-- 
-- Problema: Si el jefe envía su evaluación antes que la autoevaluación, el trigger no se ejecuta
-- cuando se envía la autoevaluación después, dejando resultados sin calcular.
--
-- Solución:
-- 1. Modificar el trigger para que también se ejecute cuando se envía la autoevaluación
--    si ya existe una evaluación del jefe enviada
-- 2. Crear función para recalcular resultados pendientes manualmente

-- ============================================================
-- 1. ACTUALIZAR TRIGGER handle_final_result_calculation
-- ============================================================

CREATE OR REPLACE FUNCTION handle_final_result_calculation()
RETURNS TRIGGER AS $$
DECLARE
  autoevaluacion_id UUID;
  evaluacion_jefe_id UUID;
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
  -- CASO 1: Se envía evaluación del jefe
  IF NEW.estado = 'enviado' AND NEW.tipo = 'jefe' 
     AND (OLD.estado IS NULL OR OLD.estado != 'enviado') THEN
    
    -- Obtener datos necesarios
    periodo_id_val := NEW.periodo_id;
    colaborador_id_val := NEW.colaborador_id;
    evaluador_id_val := NEW.evaluador_id;
    evaluacion_jefe_id := NEW.id;
    
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
    
    -- Calcular y guardar resultado
    PERFORM calculate_and_save_result(
      autoevaluacion_id,
      evaluacion_jefe_id,
      colaborador_id_val,
      periodo_id_val,
      evaluador_id_val
    );
    
  -- CASO 2: Se envía autoevaluación y ya existe evaluación del jefe enviada
  ELSIF NEW.estado = 'enviado' AND NEW.tipo = 'auto'
     AND (OLD.estado IS NULL OR OLD.estado != 'enviado') THEN
    
    -- Obtener datos necesarios
    periodo_id_val := NEW.periodo_id;
    colaborador_id_val := NEW.usuario_id;
    autoevaluacion_id := NEW.id;
    
    -- Buscar TODAS las evaluaciones del jefe enviadas para este colaborador en el mismo período
    FOR evaluacion_jefe_id, evaluador_id_val IN
      SELECT id, evaluador_id
      FROM evaluations
      WHERE colaborador_id = colaborador_id_val
        AND periodo_id = periodo_id_val
        AND tipo = 'jefe'
        AND estado = 'enviado'
    LOOP
      -- Calcular y guardar resultado para cada jefe que haya evaluado
      PERFORM calculate_and_save_result(
        autoevaluacion_id,
        evaluacion_jefe_id,
        colaborador_id_val,
        periodo_id_val,
        evaluador_id_val
      );
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. CREAR FUNCIÓN AUXILIAR calculate_and_save_result
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_and_save_result(
  p_autoevaluacion_id UUID,
  p_evaluacion_jefe_id UUID,
  p_colaborador_id VARCHAR(20),
  p_periodo_id UUID,
  p_evaluador_id VARCHAR(20)
)
RETURNS VOID AS $$
DECLARE
  instrument_config JSONB;
  resultado JSONB;
  desempeno_final NUMERIC;
  desempeno_porcentaje INTEGER;
  potencial NUMERIC;
  potencial_porcentaje INTEGER;
  posicion_9box VARCHAR(20);
BEGIN
  -- Obtener configuración de instrumento
  instrument_config := get_instrument_config_from_user(p_colaborador_id);
  
  IF instrument_config IS NULL THEN
    RAISE EXCEPTION 'No se pudo obtener configuración de instrumento para el usuario %', p_colaborador_id;
  END IF;
  
  -- Calcular resultado completo
  resultado := calculate_complete_final_result(
    p_autoevaluacion_id,
    p_evaluacion_jefe_id,
    instrument_config
  );
  
  -- Extraer valores del resultado
  desempeno_final := (resultado->>'desempenoFinal')::NUMERIC;
  desempeno_porcentaje := (resultado->>'desempenoPorcentaje')::INTEGER;
  potencial := (resultado->>'potencial')::NUMERIC;
  potencial_porcentaje := (resultado->>'potencialPorcentaje')::INTEGER;
  posicion_9box := resultado->>'posicion9Box';
  
  -- ============================================================
  -- INSERTAR EN evaluation_results_by_evaluator
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
    p_colaborador_id,
    p_periodo_id,
    p_evaluador_id,
    p_autoevaluacion_id,
    p_evaluacion_jefe_id,
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
    p_colaborador_id,
    p_periodo_id,
    p_autoevaluacion_id,
    p_evaluacion_jefe_id,
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
    WHERE colaborador_id = p_colaborador_id
      AND periodo_id = p_periodo_id
  )
  ON CONFLICT (colaborador_id, periodo_id) DO UPDATE SET
    -- Solo actualizar si este es el primer evaluador o si queremos mantener el último
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
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_and_save_result(UUID, UUID, VARCHAR, UUID, VARCHAR) IS 
'Función auxiliar que calcula y guarda el resultado final para un par autoevaluación-evaluación del jefe.';

-- ============================================================
-- 3. CREAR FUNCIÓN PARA RECALCULAR RESULTADOS PENDIENTES
-- ============================================================

CREATE OR REPLACE FUNCTION recalculate_pending_results(
  p_periodo_id UUID DEFAULT NULL
)
RETURNS TABLE(
  colaborador_id VARCHAR(20),
  evaluador_id VARCHAR(20),
  resultado_calculado BOOLEAN,
  mensaje TEXT
) AS $$
DECLARE
  v_periodo_id UUID;
  rec RECORD;
BEGIN
  -- Si no se especifica período, usar el más reciente
  IF p_periodo_id IS NULL THEN
    SELECT id INTO v_periodo_id
    FROM evaluation_periods
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    v_periodo_id := p_periodo_id;
  END IF;
  
  IF v_periodo_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró un período';
  END IF;
  
  -- Buscar todas las combinaciones de autoevaluación + evaluación del jefe
  -- que están enviadas pero no tienen resultado en evaluation_results_by_evaluator
  FOR rec IN
    SELECT DISTINCT
      e_auto.usuario_id as colaborador_id,
      e_jefe.evaluador_id,
      e_auto.id as autoevaluacion_id,
      e_jefe.id as evaluacion_jefe_id,
      e_auto.periodo_id
    FROM evaluations e_auto
    INNER JOIN evaluations e_jefe ON 
      e_jefe.colaborador_id = e_auto.usuario_id
      AND e_jefe.periodo_id = e_auto.periodo_id
      AND e_jefe.tipo = 'jefe'
      AND e_jefe.estado = 'enviado'
    WHERE e_auto.tipo = 'auto'
      AND e_auto.estado = 'enviado'
      AND e_auto.periodo_id = v_periodo_id
      AND NOT EXISTS (
        SELECT 1 FROM evaluation_results_by_evaluator erbe
        WHERE erbe.colaborador_id = e_auto.usuario_id
          AND erbe.periodo_id = e_auto.periodo_id
          AND erbe.evaluador_id = e_jefe.evaluador_id
      )
  LOOP
    BEGIN
      -- Calcular y guardar resultado
      PERFORM calculate_and_save_result(
        rec.autoevaluacion_id,
        rec.evaluacion_jefe_id,
        rec.colaborador_id,
        rec.periodo_id,
        rec.evaluador_id
      );
      
      -- Retornar éxito
      colaborador_id := rec.colaborador_id;
      evaluador_id := rec.evaluador_id;
      resultado_calculado := TRUE;
      mensaje := 'Resultado calculado exitosamente';
      RETURN NEXT;
      
    EXCEPTION WHEN OTHERS THEN
      -- Retornar error
      colaborador_id := rec.colaborador_id;
      evaluador_id := rec.evaluador_id;
      resultado_calculado := FALSE;
      mensaje := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_pending_results(UUID) IS 
'Recalcula resultados pendientes para evaluaciones que están enviadas pero no tienen resultado calculado. 
Útil para casos donde el trigger no se ejecutó correctamente (ej: jefe envió antes que autoevaluación).';

-- ============================================================
-- 4. EJECUTAR RECÁLCULO PARA RESULTADOS PENDIENTES
-- ============================================================

-- Recalcular resultados pendientes para el período activo
SELECT * FROM recalculate_pending_results();

