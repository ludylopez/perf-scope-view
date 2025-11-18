-- Migración: Optimización de Índices para Evaluaciones
-- Esta migración crea índices compuestos para mejorar el rendimiento de las consultas
-- de evaluaciones, especialmente en la vista "Mi Equipo" con múltiples colaboradores

-- ============================================================
-- 1. ÍNDICE COMPUESTO PARA CONSULTAS DE EVALUACIONES POR JEFE
-- ============================================================
-- Optimiza consultas que filtran por evaluador_id, periodo_id, tipo y colaborador_id
-- Uso: loadTeamMembers() y loadMultipleEvaluatorsInfo()

CREATE INDEX IF NOT EXISTS idx_evaluations_evaluador_periodo_tipo_colaborador 
ON evaluations(evaluador_id, periodo_id, tipo, colaborador_id);

COMMENT ON INDEX idx_evaluations_evaluador_periodo_tipo_colaborador IS 
'Índice compuesto para optimizar consultas de evaluaciones por jefe. Mejora rendimiento en vista "Mi Equipo" con múltiples colaboradores.';

-- ============================================================
-- 2. ÍNDICE COMPUESTO PARA CONSULTAS BATCH DE MÚLTIPLES EVALUADORES
-- ============================================================
-- Optimiza consultas que buscan evaluaciones por múltiples colaboradores y evaluadores
-- Uso: loadMultipleEvaluatorsInfo() - batch query optimizada

CREATE INDEX IF NOT EXISTS idx_evaluations_colaborador_evaluador_periodo_tipo 
ON evaluations(colaborador_id, evaluador_id, periodo_id, tipo);

COMMENT ON INDEX idx_evaluations_colaborador_evaluador_periodo_tipo IS 
'Índice compuesto para optimizar consultas batch de evaluaciones. Elimina problema N+1 en loadMultipleEvaluatorsInfo().';

-- ============================================================
-- 3. ÍNDICE ADICIONAL PARA CONSULTAS POR COLABORADOR Y PERÍODO
-- ============================================================
-- Optimiza consultas que buscan todas las evaluaciones de un colaborador en un período
-- Uso: Vista comparativa, resultados finales

CREATE INDEX IF NOT EXISTS idx_evaluations_colaborador_periodo_tipo 
ON evaluations(colaborador_id, periodo_id, tipo);

COMMENT ON INDEX idx_evaluations_colaborador_periodo_tipo IS 
'Índice para optimizar consultas de evaluaciones por colaborador y período. Usado en vistas de resultados.';

-- ============================================================
-- VERIFICACIÓN DE ÍNDICES CREADOS
-- ============================================================
-- Los índices se crean con IF NOT EXISTS, por lo que son seguros de ejecutar múltiples veces
-- Para verificar que se crearon correctamente, ejecutar:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'evaluations';

