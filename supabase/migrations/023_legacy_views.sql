-- Migración 023: Vistas Legacy para Compatibilidad Hacia Atrás
-- Esta migración crea vistas que mantienen compatibilidad con código existente
-- que consulta final_evaluation_results directamente

-- ============================================================
-- CREAR VISTA LEGACY final_evaluation_results
-- ============================================================

-- La vista legacy apunta a evaluation_results_by_evaluator
-- pero solo muestra el primer evaluador (comportamiento anterior)
-- Esto permite que el código existente siga funcionando mientras migramos

CREATE OR REPLACE VIEW final_evaluation_results_legacy AS
SELECT DISTINCT ON (erbe.colaborador_id, erbe.periodo_id)
  gen_random_uuid() as id,
  erbe.colaborador_id,
  erbe.periodo_id,
  erbe.autoevaluacion_id,
  erbe.evaluacion_jefe_id as evaluacion_jefe_id,
  erbe.resultado_final,
  erbe.comparativo,
  erbe.posicion_9box,
  erbe.desempeno_final,
  erbe.desempeno_porcentaje,
  erbe.potencial,
  erbe.potencial_porcentaje,
  erbe.fecha_generacion,
  erbe.created_at
FROM evaluation_results_by_evaluator erbe
ORDER BY erbe.colaborador_id, erbe.periodo_id, erbe.fecha_generacion DESC;

COMMENT ON VIEW final_evaluation_results_legacy IS 
'Vista legacy que muestra resultados de evaluación usando solo el primer evaluador.
DEPRECATED: Usar final_evaluation_results_consolidated o evaluation_results_by_evaluator en su lugar.';

-- ============================================================
-- ACTUALIZAR TABLA final_evaluation_results PARA COMPATIBILIDAD
-- ============================================================

-- Crear función que sincroniza final_evaluation_results con evaluation_results_by_evaluator
-- Esto mantiene la tabla legacy actualizada automáticamente

CREATE OR REPLACE FUNCTION sync_final_evaluation_results()
RETURNS TRIGGER AS $$
BEGIN
  -- Cuando se inserta o actualiza en evaluation_results_by_evaluator,
  -- actualizar o insertar en final_evaluation_results (solo primer evaluador)
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
  SELECT DISTINCT ON (colaborador_id, periodo_id)
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
  FROM evaluation_results_by_evaluator
  WHERE colaborador_id = NEW.colaborador_id
    AND periodo_id = NEW.periodo_id
  ORDER BY colaborador_id, periodo_id, fecha_generacion DESC
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
    fecha_generacion = EXCLUDED.fecha_generacion;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_final_evaluation_results() IS 
'Sincroniza final_evaluation_results con evaluation_results_by_evaluator para mantener compatibilidad.
Usa el primer evaluador (más reciente) para la tabla legacy.';

-- Crear trigger para sincronización automática
DROP TRIGGER IF EXISTS trigger_sync_final_evaluation_results ON evaluation_results_by_evaluator;

CREATE TRIGGER trigger_sync_final_evaluation_results
  AFTER INSERT OR UPDATE ON evaluation_results_by_evaluator
  FOR EACH ROW
  EXECUTE FUNCTION sync_final_evaluation_results();

COMMENT ON TRIGGER trigger_sync_final_evaluation_results ON evaluation_results_by_evaluator IS 
'Trigger que sincroniza automáticamente final_evaluation_results cuando se actualiza evaluation_results_by_evaluator.
Mantiene compatibilidad con código legacy.';

