-- Migración 019: Migrar Datos Existentes a evaluation_results_by_evaluator
-- Esta migración migra los datos existentes de final_evaluation_results
-- a la nueva tabla evaluation_results_by_evaluator

-- ============================================================
-- 1. CREAR TABLA DE RESPALDO
-- ============================================================

CREATE TABLE IF NOT EXISTS final_evaluation_results_backup AS
SELECT * FROM final_evaluation_results;

COMMENT ON TABLE final_evaluation_results_backup IS 'Respaldo de final_evaluation_results antes de migración a evaluation_results_by_evaluator';

-- ============================================================
-- 2. MIGRAR DATOS EXISTENTES
-- ============================================================

-- Migrar registros de final_evaluation_results a evaluation_results_by_evaluator
-- Identificando el evaluador_id desde la tabla evaluations
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
  fecha_generacion,
  created_at
)
SELECT DISTINCT ON (fer.colaborador_id, fer.periodo_id, e.evaluador_id)
  fer.colaborador_id,
  fer.periodo_id,
  e.evaluador_id,
  fer.autoevaluacion_id,
  fer.evaluacion_jefe_id,
  fer.resultado_final,
  fer.comparativo,
  fer.posicion_9box,
  fer.desempeno_final,
  fer.desempeno_porcentaje,
  fer.potencial,
  fer.potencial_porcentaje,
  fer.fecha_generacion,
  fer.created_at
FROM final_evaluation_results fer
INNER JOIN evaluations e ON e.id = fer.evaluacion_jefe_id
WHERE e.tipo = 'jefe'
  AND e.estado = 'enviado'
  AND e.evaluador_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM evaluation_results_by_evaluator erbe
    WHERE erbe.colaborador_id = fer.colaborador_id
      AND erbe.periodo_id = fer.periodo_id
      AND erbe.evaluador_id = e.evaluador_id
  )
ON CONFLICT (colaborador_id, periodo_id, evaluador_id) DO NOTHING;

-- ============================================================
-- 3. VALIDAR INTEGRIDAD DE DATOS MIGRADOS
-- ============================================================

DO $$
DECLARE
  v_total_original INTEGER;
  v_total_migrados INTEGER;
  v_registros_sin_evaluador INTEGER;
BEGIN
  -- Contar registros originales
  SELECT COUNT(*) INTO v_total_original
  FROM final_evaluation_results;
  
  -- Contar registros migrados (únicos por colaborador-periodo-evaluador)
  SELECT COUNT(*) INTO v_total_migrados
  FROM evaluation_results_by_evaluator;
  
  -- Contar registros que no pudieron migrarse (sin evaluador_id)
  SELECT COUNT(*) INTO v_registros_sin_evaluador
  FROM final_evaluation_results fer
  LEFT JOIN evaluations e ON e.id = fer.evaluacion_jefe_id
  WHERE e.evaluador_id IS NULL OR e.tipo != 'jefe';
  
  RAISE NOTICE 'Migración completada:';
  RAISE NOTICE '  - Registros originales: %', v_total_original;
  RAISE NOTICE '  - Registros migrados: %', v_total_migrados;
  RAISE NOTICE '  - Registros sin evaluador válido: %', v_registros_sin_evaluador;
  
  IF v_registros_sin_evaluador > 0 THEN
    RAISE WARNING 'Hay % registro(s) que no pudieron migrarse porque no tienen evaluador_id válido en evaluations', v_registros_sin_evaluador;
  END IF;
END $$;

-- ============================================================
-- 4. CREAR FUNCIÓN DE MIGRACIÓN MANUAL (por si se necesita)
-- ============================================================

CREATE OR REPLACE FUNCTION migrate_single_result_to_multiple_evaluators(
  p_colaborador_id VARCHAR(20),
  p_periodo_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_migrated_count INTEGER := 0;
BEGIN
  -- Migrar todos los resultados de este colaborador en este período
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
    fecha_generacion,
    created_at
  )
  SELECT DISTINCT ON (e.evaluador_id)
    fer.colaborador_id,
    fer.periodo_id,
    e.evaluador_id,
    fer.autoevaluacion_id,
    fer.evaluacion_jefe_id,
    fer.resultado_final,
    fer.comparativo,
    fer.posicion_9box,
    fer.desempeno_final,
    fer.desempeno_porcentaje,
    fer.potencial,
    fer.potencial_porcentaje,
    fer.fecha_generacion,
    fer.created_at
  FROM final_evaluation_results fer
  INNER JOIN evaluations e ON e.id = fer.evaluacion_jefe_id
  WHERE fer.colaborador_id = p_colaborador_id
    AND fer.periodo_id = p_periodo_id
    AND e.tipo = 'jefe'
    AND e.estado = 'enviado'
    AND e.evaluador_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM evaluation_results_by_evaluator erbe
      WHERE erbe.colaborador_id = fer.colaborador_id
        AND erbe.periodo_id = fer.periodo_id
        AND erbe.evaluador_id = e.evaluador_id
    )
  ON CONFLICT (colaborador_id, periodo_id, evaluador_id) DO NOTHING;
  
  GET DIAGNOSTICS v_migrated_count = ROW_COUNT;
  
  SELECT jsonb_build_object(
    'success', true,
    'migrated_count', v_migrated_count,
    'message', format('Migrados %s registro(s) para colaborador %s en período %s', v_migrated_count, p_colaborador_id, p_periodo_id)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION migrate_single_result_to_multiple_evaluators(VARCHAR, UUID) IS 'Migra manualmente los resultados de un colaborador específico en un período específico a evaluation_results_by_evaluator';

