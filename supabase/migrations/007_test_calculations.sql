-- Migración 007: Scripts de Prueba para Funciones SQL
-- Esta migración contiene queries de prueba para validar todas las funciones SQL creadas

-- ============================================================================
-- PRUEBAS DE FUNCIONES DE CÁLCULO BÁSICAS
-- ============================================================================

-- Prueba 1: score_to_percentage
-- Esperado: 1 = 0%, 2 = 25%, 3 = 50%, 4 = 75%, 5 = 100%
DO $$
BEGIN
  ASSERT score_to_percentage(1) = 0, 'score_to_percentage(1) debería retornar 0';
  ASSERT score_to_percentage(2) = 25, 'score_to_percentage(2) debería retornar 25';
  ASSERT score_to_percentage(3) = 50, 'score_to_percentage(3) debería retornar 50';
  ASSERT score_to_percentage(4) = 75, 'score_to_percentage(4) debería retornar 75';
  ASSERT score_to_percentage(5) = 100, 'score_to_percentage(5) debería retornar 100';
  RAISE NOTICE '✅ Prueba score_to_percentage: PASADA';
END $$;

-- Prueba 2: calculate_final_weighted_score
-- Esperado: (4 * 0.7) + (3 * 0.3) = 2.8 + 0.9 = 3.7
DO $$
DECLARE
  resultado NUMERIC;
BEGIN
  resultado := calculate_final_weighted_score(3.0, 4.0, 0.7, 0.3);
  ASSERT ABS(resultado - 3.7) < 0.01, 'calculate_final_weighted_score debería retornar 3.7';
  RAISE NOTICE '✅ Prueba calculate_final_weighted_score: PASADA (%)', resultado;
END $$;

-- Prueba 3: calculate_nine_box_position
-- Esperado: desempeño 4.5 (> 75%) = alto, potencial 3.5 (50-75%) = medio → "alto-medio"
DO $$
DECLARE
  posicion VARCHAR(20);
BEGIN
  posicion := calculate_nine_box_position(4.5, 3.5);
  ASSERT posicion = 'alto-medio', 'calculate_nine_box_position(4.5, 3.5) debería retornar alto-medio';
  RAISE NOTICE '✅ Prueba calculate_nine_box_position: PASADA (%)', posicion;
END $$;

-- Prueba 4: calculate_nine_box_position sin potencial
-- Esperado: desempeño 2.5 (< 50%) = bajo → "bajo-medio"
DO $$
DECLARE
  posicion VARCHAR(20);
BEGIN
  posicion := calculate_nine_box_position(2.5, NULL);
  ASSERT posicion = 'bajo-medio', 'calculate_nine_box_position(2.5, NULL) debería retornar bajo-medio';
  RAISE NOTICE '✅ Prueba calculate_nine_box_position sin potencial: PASADA (%)', posicion;
END $$;

-- ============================================================================
-- PRUEBAS DE FUNCIONES DE VALIDACIÓN
-- ============================================================================

-- Prueba 5: validate_evaluation_complete - evaluación completa
DO $$
DECLARE
  responses JSONB := '{"d1_i1": 4, "d1_i2": 5, "d2_i1": 3, "d2_i2": 4}'::JSONB;
  dimensions JSONB := '[
    {"id": "dim1", "items": [{"id": "d1_i1"}, {"id": "d1_i2"}]},
    {"id": "dim2", "items": [{"id": "d2_i1"}, {"id": "d2_i2"}]}
  ]'::JSONB;
  resultado BOOLEAN;
BEGIN
  resultado := validate_evaluation_complete(responses, dimensions);
  ASSERT resultado = true, 'validate_evaluation_complete debería retornar true para evaluación completa';
  RAISE NOTICE '✅ Prueba validate_evaluation_complete completa: PASADA';
END $$;

-- Prueba 6: validate_evaluation_complete - evaluación incompleta
DO $$
DECLARE
  responses JSONB := '{"d1_i1": 4, "d1_i2": 5}'::JSONB; -- Falta d2_i1 y d2_i2
  dimensions JSONB := '[
    {"id": "dim1", "items": [{"id": "d1_i1"}, {"id": "d1_i2"}]},
    {"id": "dim2", "items": [{"id": "d2_i1"}, {"id": "d2_i2"}]}
  ]'::JSONB;
  resultado BOOLEAN;
BEGIN
  resultado := validate_evaluation_complete(responses, dimensions);
  ASSERT resultado = false, 'validate_evaluation_complete debería retornar false para evaluación incompleta';
  RAISE NOTICE '✅ Prueba validate_evaluation_complete incompleta: PASADA';
END $$;

-- ============================================================================
-- PRUEBAS DE FUNCIONES DE CONFIGURACIÓN
-- ============================================================================

-- Prueba 7: get_instrument_config - debería retornar configuración A1
DO $$
DECLARE
  config JSONB;
BEGIN
  config := get_instrument_config('A1');
  ASSERT config IS NOT NULL, 'get_instrument_config debería retornar configuración para A1';
  ASSERT (config->>'id') = 'A1', 'La configuración debería tener id = A1';
  RAISE NOTICE '✅ Prueba get_instrument_config: PASADA';
END $$;

-- Prueba 8: get_instrument_config - instrumento inexistente
DO $$
DECLARE
  config JSONB;
BEGIN
  config := get_instrument_config('INEXISTENTE');
  ASSERT config IS NULL, 'get_instrument_config debería retornar NULL para instrumento inexistente';
  RAISE NOTICE '✅ Prueba get_instrument_config inexistente: PASADA';
END $$;

-- ============================================================================
-- RESUMEN DE PRUEBAS
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TODAS LAS PRUEBAS COMPLETADAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Funciones probadas:';
  RAISE NOTICE '  ✅ score_to_percentage';
  RAISE NOTICE '  ✅ calculate_final_weighted_score';
  RAISE NOTICE '  ✅ calculate_nine_box_position';
  RAISE NOTICE '  ✅ validate_evaluation_complete';
  RAISE NOTICE '  ✅ get_instrument_config';
  RAISE NOTICE '';
  RAISE NOTICE 'Para probar funciones que requieren datos reales, ejecuta:';
  RAISE NOTICE '  SELECT calculate_complete_final_result(...)';
  RAISE NOTICE '  SELECT validate_period_active(...)';
  RAISE NOTICE '';
END $$;

