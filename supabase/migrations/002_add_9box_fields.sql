-- Migración: Agregar campo posicion_9box a final_evaluation_results
-- Esta migración agrega un campo específico para la posición 9-box y mejora la estructura
-- para facilitar consultas y análisis de la matriz 9-box

-- Agregar campo posicion_9box a la tabla final_evaluation_results
ALTER TABLE final_evaluation_results 
ADD COLUMN IF NOT EXISTS posicion_9box VARCHAR(20);

-- Agregar campos individuales para desempeño y potencial para facilitar consultas
ALTER TABLE final_evaluation_results 
ADD COLUMN IF NOT EXISTS desempeno_final NUMERIC(5,2);

ALTER TABLE final_evaluation_results 
ADD COLUMN IF NOT EXISTS desempeno_porcentaje INTEGER;

ALTER TABLE final_evaluation_results 
ADD COLUMN IF NOT EXISTS potencial NUMERIC(5,2);

ALTER TABLE final_evaluation_results 
ADD COLUMN IF NOT EXISTS potencial_porcentaje INTEGER;

-- Crear índice para mejorar consultas por posición 9-box
CREATE INDEX IF NOT EXISTS idx_final_results_posicion_9box 
ON final_evaluation_results(posicion_9box);

-- Crear índice compuesto para consultas por jefe y período (útil para matriz 9-box)
CREATE INDEX IF NOT EXISTS idx_final_results_jefe_periodo 
ON final_evaluation_results(colaborador_id, periodo_id);

-- Comentarios de documentación
COMMENT ON COLUMN final_evaluation_results.posicion_9box IS 'Posición en la matriz 9-box (alto-alto, alto-medio, etc.)';
COMMENT ON COLUMN final_evaluation_results.desempeno_final IS 'Score final de desempeño (1-5)';
COMMENT ON COLUMN final_evaluation_results.desempeno_porcentaje IS 'Porcentaje de desempeño (0-100)';
COMMENT ON COLUMN final_evaluation_results.potencial IS 'Score de potencial (1-5)';
COMMENT ON COLUMN final_evaluation_results.potencial_porcentaje IS 'Porcentaje de potencial (0-100)';

