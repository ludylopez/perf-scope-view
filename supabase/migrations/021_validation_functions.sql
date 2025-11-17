-- Migración 021: Funciones de Validación para Evaluaciones Específicas
-- Esta migración crea funciones para validar que las evaluaciones
-- cumplan con las reglas de negocio específicas (C1 evalúa D1/A1, A1 evalúa D1)

-- ============================================================
-- 1. FUNCIÓN validate_concejo_evaluation
-- ============================================================

CREATE OR REPLACE FUNCTION validate_concejo_evaluation(
  p_concejo_id VARCHAR(20),
  p_colaborador_id VARCHAR(20)
)
RETURNS JSONB AS $$
DECLARE
  v_evaluador_nivel VARCHAR(10);
  v_colaborador_nivel VARCHAR(10);
  v_tiene_asignacion BOOLEAN;
  v_result JSONB;
BEGIN
  -- Verificar que el evaluador existe y es del Concejo (C1)
  SELECT nivel INTO v_evaluador_nivel
  FROM users
  WHERE dpi = p_concejo_id AND estado = 'activo';
  
  IF v_evaluador_nivel IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'El evaluador no existe o no está activo'
    );
  END IF;
  
  IF v_evaluador_nivel != 'C1' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', format('El evaluador debe ser del Concejo Municipal (C1), pero es nivel %s', v_evaluador_nivel)
    );
  END IF;
  
  -- Verificar que el colaborador existe y es Director (D1) o Alcalde (A1)
  SELECT nivel INTO v_colaborador_nivel
  FROM users
  WHERE dpi = p_colaborador_id AND estado = 'activo';
  
  IF v_colaborador_nivel IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'El colaborador no existe o no está activo'
    );
  END IF;
  
  IF v_colaborador_nivel NOT IN ('D1', 'A1') THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', format('El Concejo solo puede evaluar a Directores (D1) o Alcalde (A1), pero el colaborador es nivel %s', v_colaborador_nivel)
    );
  END IF;
  
  -- Verificar que existe asignación activa
  SELECT EXISTS(
    SELECT 1 FROM user_assignments
    WHERE colaborador_id = p_colaborador_id
      AND jefe_id = p_concejo_id
      AND activo = true
  ) INTO v_tiene_asignacion;
  
  IF NOT v_tiene_asignacion THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'No existe una asignación activa entre el Concejo y el colaborador'
    );
  END IF;
  
  -- Todas las validaciones pasaron
  RETURN jsonb_build_object(
    'valid', true,
    'message', format('Validación exitosa: Concejo puede evaluar a %s (nivel %s)', 
      COALESCE((SELECT nombre || ' ' || apellidos FROM users WHERE dpi = p_colaborador_id), 'colaborador'),
      v_colaborador_nivel)
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION validate_concejo_evaluation(VARCHAR, VARCHAR) IS 
'Valida que un miembro del Concejo Municipal (C1) puede evaluar a un colaborador específico.
El Concejo solo puede evaluar a Directores (D1) o Alcalde (A1) y debe existir una asignación activa.';

-- ============================================================
-- 2. FUNCIÓN validate_alcalde_evaluation
-- ============================================================

CREATE OR REPLACE FUNCTION validate_alcalde_evaluation(
  p_alcalde_id VARCHAR(20),
  p_colaborador_id VARCHAR(20)
)
RETURNS JSONB AS $$
DECLARE
  v_evaluador_nivel VARCHAR(10);
  v_colaborador_nivel VARCHAR(10);
  v_tiene_asignacion BOOLEAN;
  v_result JSONB;
BEGIN
  -- Verificar que el evaluador existe y es Alcalde (A1)
  SELECT nivel INTO v_evaluador_nivel
  FROM users
  WHERE dpi = p_alcalde_id AND estado = 'activo';
  
  IF v_evaluador_nivel IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'El evaluador no existe o no está activo'
    );
  END IF;
  
  IF v_evaluador_nivel != 'A1' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', format('El evaluador debe ser Alcalde (A1), pero es nivel %s', v_evaluador_nivel)
    );
  END IF;
  
  -- Verificar que el colaborador existe y es Director (D1)
  SELECT nivel INTO v_colaborador_nivel
  FROM users
  WHERE dpi = p_colaborador_id AND estado = 'activo';
  
  IF v_colaborador_nivel IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'El colaborador no existe o no está activo'
    );
  END IF;
  
  IF v_colaborador_nivel != 'D1' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', format('El Alcalde solo puede evaluar a Directores (D1), pero el colaborador es nivel %s', v_colaborador_nivel)
    );
  END IF;
  
  -- Verificar que existe asignación activa
  SELECT EXISTS(
    SELECT 1 FROM user_assignments
    WHERE colaborador_id = p_colaborador_id
      AND jefe_id = p_alcalde_id
      AND activo = true
  ) INTO v_tiene_asignacion;
  
  IF NOT v_tiene_asignacion THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'No existe una asignación activa entre el Alcalde y el colaborador'
    );
  END IF;
  
  -- Todas las validaciones pasaron
  RETURN jsonb_build_object(
    'valid', true,
    'message', format('Validación exitosa: Alcalde puede evaluar a %s (Director)', 
      COALESCE((SELECT nombre || ' ' || apellidos FROM users WHERE dpi = p_colaborador_id), 'colaborador'))
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION validate_alcalde_evaluation(VARCHAR, VARCHAR) IS 
'Valida que el Alcalde Municipal (A1) puede evaluar a un colaborador específico.
El Alcalde solo puede evaluar a Directores (D1) y debe existir una asignación activa.';

-- ============================================================
-- 3. FUNCIÓN GENÉRICA validate_evaluation_permission
-- ============================================================

CREATE OR REPLACE FUNCTION validate_evaluation_permission(
  p_evaluador_id VARCHAR(20),
  p_colaborador_id VARCHAR(20)
)
RETURNS JSONB AS $$
DECLARE
  v_evaluador_nivel VARCHAR(10);
  v_colaborador_nivel VARCHAR(10);
  v_result JSONB;
BEGIN
  -- Obtener nivel del evaluador
  SELECT nivel INTO v_evaluador_nivel
  FROM users
  WHERE dpi = p_evaluador_id AND estado = 'activo';
  
  IF v_evaluador_nivel IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'El evaluador no existe o no está activo'
    );
  END IF;
  
  -- Obtener nivel del colaborador
  SELECT nivel INTO v_colaborador_nivel
  FROM users
  WHERE dpi = p_colaborador_id AND estado = 'activo';
  
  IF v_colaborador_nivel IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'El colaborador no existe o no está activo'
    );
  END IF;
  
  -- Aplicar reglas específicas según el nivel del evaluador
  IF v_evaluador_nivel = 'C1' THEN
    -- Concejo solo puede evaluar D1 o A1
    RETURN validate_concejo_evaluation(p_evaluador_id, p_colaborador_id);
  ELSIF v_evaluador_nivel = 'A1' THEN
    -- Alcalde solo puede evaluar D1
    RETURN validate_alcalde_evaluation(p_evaluador_id, p_colaborador_id);
  ELSE
    -- Para otros niveles, validar solo que exista asignación
    -- (reglas generales de jerarquía)
    IF EXISTS(
      SELECT 1 FROM user_assignments
      WHERE colaborador_id = p_colaborador_id
        AND jefe_id = p_evaluador_id
        AND activo = true
    ) THEN
      RETURN jsonb_build_object(
        'valid', true,
        'message', 'Validación exitosa: existe asignación activa'
      );
    ELSE
      RETURN jsonb_build_object(
        'valid', false,
        'error', 'No existe una asignación activa entre el evaluador y el colaborador'
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION validate_evaluation_permission(VARCHAR, VARCHAR) IS 
'Función genérica que valida permisos de evaluación según las reglas de negocio.
Aplica validaciones específicas para C1 (Concejo) y A1 (Alcalde), y validaciones generales para otros niveles.';

