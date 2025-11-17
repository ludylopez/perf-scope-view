-- Migración 017: Sistema de Múltiples Evaluadores
-- Esta migración crea la infraestructura para permitir que un colaborador
-- pueda ser evaluado por múltiples jefes simultáneamente

-- ============================================================
-- 1. CREAR TABLA evaluation_results_by_evaluator
-- ============================================================

CREATE TABLE IF NOT EXISTS evaluation_results_by_evaluator (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id VARCHAR(20) NOT NULL REFERENCES users(dpi) ON DELETE CASCADE,
  periodo_id UUID NOT NULL REFERENCES evaluation_periods(id) ON DELETE CASCADE,
  evaluador_id VARCHAR(20) NOT NULL REFERENCES users(dpi) ON DELETE CASCADE,
  autoevaluacion_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  evaluacion_jefe_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  resultado_final JSONB NOT NULL DEFAULT '{}',
  comparativo JSONB NOT NULL DEFAULT '{}',
  posicion_9box VARCHAR(20),
  desempeno_final NUMERIC(5,2),
  desempeno_porcentaje INTEGER,
  potencial NUMERIC(5,2),
  potencial_porcentaje INTEGER,
  fecha_generacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_colaborador_periodo_evaluador UNIQUE(colaborador_id, periodo_id, evaluador_id)
);

-- Comentarios descriptivos
COMMENT ON TABLE evaluation_results_by_evaluator IS 'Almacena resultados de evaluación por cada evaluador. Permite que un colaborador tenga múltiples evaluadores en el mismo período.';
COMMENT ON COLUMN evaluation_results_by_evaluator.colaborador_id IS 'DPI del colaborador evaluado';
COMMENT ON COLUMN evaluation_results_by_evaluator.periodo_id IS 'ID del período de evaluación';
COMMENT ON COLUMN evaluation_results_by_evaluator.evaluador_id IS 'DPI del evaluador (jefe)';
COMMENT ON COLUMN evaluation_results_by_evaluator.autoevaluacion_id IS 'ID de la autoevaluación del colaborador';
COMMENT ON COLUMN evaluation_results_by_evaluator.evaluacion_jefe_id IS 'ID de la evaluación del jefe para este colaborador';
COMMENT ON COLUMN evaluation_results_by_evaluator.resultado_final IS 'Resultado final completo en formato JSONB';
COMMENT ON COLUMN evaluation_results_by_evaluator.comparativo IS 'Datos comparativos entre autoevaluación y evaluación del jefe';
COMMENT ON COLUMN evaluation_results_by_evaluator.posicion_9box IS 'Posición en matriz 9-box (ej: alto-alto, medio-bajo)';
COMMENT ON COLUMN evaluation_results_by_evaluator.desempeno_final IS 'Desempeño final calculado (score 1-5)';
COMMENT ON COLUMN evaluation_results_by_evaluator.desempeno_porcentaje IS 'Desempeño final en porcentaje (0-100)';
COMMENT ON COLUMN evaluation_results_by_evaluator.potencial IS 'Potencial calculado (score 1-5), NULL si no aplica';
COMMENT ON COLUMN evaluation_results_by_evaluator.potencial_porcentaje IS 'Potencial en porcentaje (0-100), NULL si no aplica';

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_eval_results_by_eval_colaborador 
  ON evaluation_results_by_evaluator(colaborador_id, periodo_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_by_eval_evaluador 
  ON evaluation_results_by_evaluator(evaluador_id, periodo_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_by_eval_periodo 
  ON evaluation_results_by_evaluator(periodo_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_by_eval_autoeval 
  ON evaluation_results_by_evaluator(autoevaluacion_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_by_eval_jefe 
  ON evaluation_results_by_evaluator(evaluacion_jefe_id);

-- Trigger para updated_at
CREATE TRIGGER update_evaluation_results_by_evaluator_updated_at 
  BEFORE UPDATE ON evaluation_results_by_evaluator
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. CREAR VISTA CONSOLIDADA
-- ============================================================

CREATE OR REPLACE VIEW final_evaluation_results_consolidated AS
SELECT 
  colaborador_id,
  periodo_id,
  -- Promedio de desempeño de todos los evaluadores
  AVG(desempeno_final) as desempeno_final_promedio,
  AVG(desempeno_porcentaje) as desempeno_porcentaje_promedio,
  AVG(potencial) as potencial_promedio,
  AVG(potencial_porcentaje) as potencial_porcentaje_promedio,
  -- Moda de posición 9-box (más común)
  MODE() WITHIN GROUP (ORDER BY posicion_9box) as posicion_9box_moda,
  -- Contar evaluadores
  COUNT(DISTINCT evaluador_id) as total_evaluadores,
  -- JSONB con todos los resultados individuales
  jsonb_agg(
    jsonb_build_object(
      'evaluador_id', evaluador_id,
      'desempeno_final', desempeno_final,
      'desempeno_porcentaje', desempeno_porcentaje,
      'potencial', potencial,
      'potencial_porcentaje', potencial_porcentaje,
      'posicion_9box', posicion_9box,
      'fecha_generacion', fecha_generacion
    )
    ORDER BY fecha_generacion DESC
  ) as resultados_por_evaluador,
  -- Mínimo y máximo para análisis de rango
  MIN(desempeno_final) as desempeno_final_minimo,
  MAX(desempeno_final) as desempeno_final_maximo,
  MIN(desempeno_porcentaje) as desempeno_porcentaje_minimo,
  MAX(desempeno_porcentaje) as desempeno_porcentaje_maximo
FROM evaluation_results_by_evaluator
GROUP BY colaborador_id, periodo_id;

COMMENT ON VIEW final_evaluation_results_consolidated IS 'Vista consolidada que agrega resultados de múltiples evaluadores por colaborador y período. Calcula promedios y estadísticas agregadas.';

-- ============================================================
-- 3. CREAR FUNCIÓN get_consolidated_result
-- ============================================================

CREATE OR REPLACE FUNCTION get_consolidated_result(
  p_colaborador_id VARCHAR(20),
  p_periodo_id UUID
)
RETURNS JSONB AS $$
DECLARE
  resultado JSONB;
BEGIN
  SELECT jsonb_build_object(
    'colaborador_id', colaborador_id,
    'periodo_id', periodo_id,
    'desempeno_final_promedio', desempeno_final_promedio,
    'desempeno_porcentaje_promedio', desempeno_porcentaje_promedio,
    'potencial_promedio', potencial_promedio,
    'potencial_porcentaje_promedio', potencial_porcentaje_promedio,
    'posicion_9box_moda', posicion_9box_moda,
    'total_evaluadores', total_evaluadores,
    'resultados_por_evaluador', resultados_por_evaluador,
    'desempeno_final_minimo', desempeno_final_minimo,
    'desempeno_final_maximo', desempeno_final_maximo,
    'desempeno_porcentaje_minimo', desempeno_porcentaje_minimo,
    'desempeno_porcentaje_maximo', desempeno_porcentaje_maximo
  ) INTO resultado
  FROM final_evaluation_results_consolidated
  WHERE colaborador_id = p_colaborador_id
    AND periodo_id = p_periodo_id;
  
  RETURN COALESCE(resultado, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_consolidated_result(VARCHAR, UUID) IS 'Obtiene el resultado consolidado de evaluación para un colaborador en un período específico, incluyendo promedio de múltiples evaluadores.';

-- ============================================================
-- 4. AGREGAR CAMPOS ESCALARES A final_evaluation_results (si no existen)
-- ============================================================

-- Verificar si los campos ya existen antes de agregarlos
DO $$
BEGIN
  -- Agregar campos escalares si no existen (para compatibilidad)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'final_evaluation_results' 
    AND column_name = 'posicion_9box'
  ) THEN
    ALTER TABLE final_evaluation_results 
    ADD COLUMN posicion_9box VARCHAR(20),
    ADD COLUMN desempeno_final NUMERIC(5,2),
    ADD COLUMN desempeno_porcentaje INTEGER,
    ADD COLUMN potencial NUMERIC(5,2),
    ADD COLUMN potencial_porcentaje INTEGER;
    
    RAISE NOTICE 'Campos escalares agregados a final_evaluation_results para compatibilidad';
  END IF;
END $$;

