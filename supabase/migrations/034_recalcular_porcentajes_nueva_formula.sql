-- Migración 034: Recalcular porcentajes con nueva fórmula proporcional
-- Fecha: 2025-01-XX
-- Descripción: Recalcula todos los porcentajes y posiciones 9-box usando la nueva fórmula (score/5)*100
--              y los nuevos umbrales (< 60%, 60-80%, >= 80%)

-- ============================================================================
-- 1. CREAR BACKUPS ANTES DE MIGRACIÓN
-- ============================================================================

-- Backup de final_evaluation_results
CREATE TABLE IF NOT EXISTS final_evaluation_results_backup_20250127 AS 
SELECT * FROM final_evaluation_results;

-- Backup de evaluation_results_by_evaluator
CREATE TABLE IF NOT EXISTS evaluation_results_by_evaluator_backup_20250127 AS 
SELECT * FROM evaluation_results_by_evaluator;

COMMENT ON TABLE final_evaluation_results_backup_20250127 IS 'Backup de final_evaluation_results antes de migración de porcentajes (2025-01-27)';
COMMENT ON TABLE evaluation_results_by_evaluator_backup_20250127 IS 'Backup de evaluation_results_by_evaluator antes de migración de porcentajes (2025-01-27)';

-- ============================================================================
-- 2. RECALCULAR final_evaluation_results
-- ============================================================================

UPDATE final_evaluation_results
SET 
  -- Recalcular desempeño_porcentaje con nueva fórmula: (score / 5) * 100
  desempeno_porcentaje = CASE 
    WHEN desempeno_final IS NOT NULL THEN ROUND((desempeno_final / 5) * 100)::INTEGER
    ELSE NULL
  END,
  
  -- Recalcular potencial_porcentaje con nueva fórmula
  potencial_porcentaje = CASE 
    WHEN potencial IS NOT NULL THEN ROUND((potencial / 5) * 100)::INTEGER
    ELSE NULL
  END,
  
  -- Recalcular posicion_9box con nuevos umbrales
  posicion_9box = calculate_nine_box_position(desempeno_final, potencial),
  
  -- Actualizar resultado_final JSONB con nuevos porcentajes
  resultado_final = jsonb_set(
    jsonb_set(
      COALESCE(resultado_final, '{}'::jsonb),
      '{desempenoPorcentaje}',
      to_jsonb(
        CASE 
          WHEN desempeno_final IS NOT NULL THEN ROUND((desempeno_final / 5) * 100)::INTEGER
          ELSE NULL
        END
      )
    ),
    '{potencialPorcentaje}',
    CASE 
      WHEN potencial IS NOT NULL THEN to_jsonb(ROUND((potencial / 5) * 100)::INTEGER)
      ELSE 'null'::jsonb
    END
  )
WHERE desempeno_final IS NOT NULL;

-- ============================================================================
-- 3. RECALCULAR evaluation_results_by_evaluator
-- ============================================================================

UPDATE evaluation_results_by_evaluator
SET 
  -- Recalcular desempeño_porcentaje con nueva fórmula: (score / 5) * 100
  desempeno_porcentaje = CASE 
    WHEN desempeno_final IS NOT NULL THEN ROUND((desempeno_final / 5) * 100)::INTEGER
    ELSE NULL
  END,
  
  -- Recalcular potencial_porcentaje con nueva fórmula
  potencial_porcentaje = CASE 
    WHEN potencial IS NOT NULL THEN ROUND((potencial / 5) * 100)::INTEGER
    ELSE NULL
  END,
  
  -- Recalcular posicion_9box con nuevos umbrales
  posicion_9box = calculate_nine_box_position(desempeno_final, potencial),
  
  -- Actualizar resultado_final JSONB con nuevos porcentajes
  resultado_final = jsonb_set(
    jsonb_set(
      COALESCE(resultado_final, '{}'::jsonb),
      '{desempenoPorcentaje}',
      to_jsonb(
        CASE 
          WHEN desempeno_final IS NOT NULL THEN ROUND((desempeno_final / 5) * 100)::INTEGER
          ELSE NULL
        END
      )
    ),
    '{potencialPorcentaje}',
    CASE 
      WHEN potencial IS NOT NULL THEN to_jsonb(ROUND((potencial / 5) * 100)::INTEGER)
      ELSE 'null'::jsonb
    END
  ),
  
  -- Actualizar fecha de modificación
  updated_at = NOW()
WHERE desempeno_final IS NOT NULL;

-- ============================================================================
-- 4. VALIDACIÓN POST-MIGRACIÓN
-- ============================================================================

-- Verificar caso específico E2 (Eswin Giovanni Torres López)
-- Colaborador ID: 1766286060101, Período: a41e0f9b-00bf-40b2-895c-72569fc6139a
DO $$
DECLARE
  v_resultado RECORD;
BEGIN
  SELECT 
    colaborador_id,
    desempeno_final,
    desempeno_porcentaje,
    potencial,
    potencial_porcentaje,
    posicion_9box
  INTO v_resultado
  FROM final_evaluation_results
  WHERE colaborador_id = '1766286060101'
    AND periodo_id = 'a41e0f9b-00bf-40b2-895c-72569fc6139a';
  
  IF v_resultado IS NOT NULL THEN
    RAISE NOTICE '✅ Validación E2 (Eswin): Desempeño Final: %, Porcentaje: %, Potencial: %, Potencial %%: %, 9-Box: %',
      v_resultado.desempeno_final,
      v_resultado.desempeno_porcentaje,
      v_resultado.potencial,
      v_resultado.potencial_porcentaje,
      v_resultado.posicion_9box;
    
    -- Validar valores esperados
    IF v_resultado.desempeno_final = 2.32 AND v_resultado.desempeno_porcentaje = 46 THEN
      RAISE NOTICE '✅ Porcentaje de desempeño correcto (esperado: 46% para score 2.32)';
    ELSE
      RAISE WARNING '⚠️ Porcentaje de desempeño no coincide con valores esperados';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ No se encontró registro para validación E2';
  END IF;
END $$;

-- Verificar que todos los porcentajes estén en rango válido (20-100%)
DO $$
DECLARE
  v_invalidos_final INTEGER;
  v_invalidos_evaluator INTEGER;
BEGIN
  -- Contar registros inválidos en final_evaluation_results
  SELECT COUNT(*) INTO v_invalidos_final
  FROM final_evaluation_results
  WHERE desempeno_porcentaje IS NOT NULL 
    AND (desempeno_porcentaje < 20 OR desempeno_porcentaje > 100);
  
  -- Contar registros inválidos en evaluation_results_by_evaluator
  SELECT COUNT(*) INTO v_invalidos_evaluator
  FROM evaluation_results_by_evaluator
  WHERE desempeno_porcentaje IS NOT NULL 
    AND (desempeno_porcentaje < 20 OR desempeno_porcentaje > 100);
  
  IF v_invalidos_final > 0 OR v_invalidos_evaluator > 0 THEN
    RAISE WARNING '⚠️ Se encontraron % registros inválidos en final_evaluation_results y % en evaluation_results_by_evaluator',
      v_invalidos_final, v_invalidos_evaluator;
  ELSE
    RAISE NOTICE '✅ Todos los porcentajes están en rango válido (20-100%%)';
  END IF;
END $$;

-- Contar total de registros actualizados
DO $$
DECLARE
  v_count_final INTEGER;
  v_count_evaluator INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count_final
  FROM final_evaluation_results
  WHERE desempeno_final IS NOT NULL;
  
  SELECT COUNT(*) INTO v_count_evaluator
  FROM evaluation_results_by_evaluator
  WHERE desempeno_final IS NOT NULL;
  
  RAISE NOTICE '✅ Migración completada: % registros en final_evaluation_results, % registros en evaluation_results_by_evaluator',
    v_count_final, v_count_evaluator;
END $$;

COMMENT ON TABLE final_evaluation_results_backup_20250127 IS 'Backup creado antes de migración de porcentajes. Para rollback, restaurar desde esta tabla.';





