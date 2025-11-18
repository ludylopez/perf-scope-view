-- Migración 027: Eliminar restricciones de nivel para evaluaciones del Concejo y Alcalde
-- Esta migración actualiza las funciones de validación y el trigger para permitir
-- que el Concejo (C1) y el Alcalde (A1) puedan evaluar a cualquier nivel de colaborador
-- siempre que exista una asignación activa entre ellos.
-- 
-- Cambio de reglas:
-- ANTES: C1 solo podía evaluar D1 o A1, A1 solo podía evaluar D1
-- AHORA: C1 y A1 pueden evaluar a cualquier nivel si existe asignación activa
-- (las asignaciones reflejan la estructura organizacional real)

-- ============================================================
-- 1. ACTUALIZAR FUNCIÓN validate_concejo_evaluation
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
  
  -- Verificar que el colaborador existe y está activo
  SELECT nivel INTO v_colaborador_nivel
  FROM users
  WHERE dpi = p_colaborador_id AND estado = 'activo';
  
  IF v_colaborador_nivel IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'El colaborador no existe o no está activo'
    );
  END IF;
  
  -- ELIMINADA: Restricción de nivel del colaborador
  -- El Concejo puede evaluar a cualquier nivel si existe asignación activa
  -- (las asignaciones reflejan la estructura organizacional real)
  
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
El Concejo puede evaluar a cualquier colaborador que tenga una asignación activa
(las asignaciones reflejan la estructura organizacional real, no restringimos por nivel).';

-- ============================================================
-- 2. ACTUALIZAR FUNCIÓN validate_alcalde_evaluation
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
  
  -- Verificar que el colaborador existe y está activo
  SELECT nivel INTO v_colaborador_nivel
  FROM users
  WHERE dpi = p_colaborador_id AND estado = 'activo';
  
  IF v_colaborador_nivel IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'El colaborador no existe o no está activo'
    );
  END IF;
  
  -- ELIMINADA: Restricción de nivel del colaborador
  -- El Alcalde puede evaluar a cualquier nivel si existe asignación activa
  -- (las asignaciones reflejan la estructura organizacional real)
  
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
    'message', format('Validación exitosa: Alcalde puede evaluar a %s (nivel %s)', 
      COALESCE((SELECT nombre || ' ' || apellidos FROM users WHERE dpi = p_colaborador_id), 'colaborador'),
      v_colaborador_nivel)
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION validate_alcalde_evaluation(VARCHAR, VARCHAR) IS 
'Valida que el Alcalde Municipal (A1) puede evaluar a un colaborador específico.
El Alcalde puede evaluar a cualquier colaborador que tenga una asignación activa
(las asignaciones reflejan la estructura organizacional real, no restringimos por nivel).';

-- ============================================================
-- 3. ACTUALIZAR TRIGGER validate_evaluation_permission_trigger
-- ============================================================

CREATE OR REPLACE FUNCTION validate_evaluation_permission_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_evaluador_nivel VARCHAR(10);
  v_colaborador_nivel VARCHAR(10);
  v_evaluador_estado VARCHAR(20);
  v_colaborador_estado VARCHAR(20);
  v_tiene_asignacion BOOLEAN;
BEGIN
  -- Solo validar cuando se inserta o actualiza una evaluación de tipo 'jefe'
  IF NEW.tipo != 'jefe' THEN
    RETURN NEW;
  END IF;

  -- Obtener nivel y estado del evaluador
  SELECT nivel, estado INTO v_evaluador_nivel, v_evaluador_estado
  FROM users
  WHERE dpi = NEW.evaluador_id;

  IF v_evaluador_nivel IS NULL THEN
    RAISE EXCEPTION 'El evaluador con DPI % no existe', NEW.evaluador_id;
  END IF;

  IF v_evaluador_estado != 'activo' THEN
    RAISE EXCEPTION 'El evaluador con DPI % no está activo', NEW.evaluador_id;
  END IF;

  -- Obtener nivel y estado del colaborador
  SELECT nivel, estado INTO v_colaborador_nivel, v_colaborador_estado
  FROM users
  WHERE dpi = NEW.colaborador_id;

  IF v_colaborador_nivel IS NULL THEN
    RAISE EXCEPTION 'El colaborador con DPI % no existe', NEW.colaborador_id;
  END IF;

  IF v_colaborador_estado != 'activo' THEN
    RAISE EXCEPTION 'El colaborador con DPI % no está activo', NEW.colaborador_id;
  END IF;

  -- ELIMINADAS: Restricciones de nivel del colaborador
  -- El Concejo (C1) y el Alcalde (A1) pueden evaluar a cualquier nivel
  -- si existe una asignación activa (las asignaciones reflejan la estructura real)

  -- Verificar que existe asignación activa
  SELECT EXISTS(
    SELECT 1 FROM user_assignments
    WHERE colaborador_id = NEW.colaborador_id
      AND jefe_id = NEW.evaluador_id
      AND activo = true
  ) INTO v_tiene_asignacion;

  IF NOT v_tiene_asignacion THEN
    RAISE EXCEPTION 'No existe una asignación activa entre el evaluador (DPI: %) y el colaborador (DPI: %)', NEW.evaluador_id, NEW.colaborador_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_evaluation_permission_trigger() IS 
'Valida permisos de evaluación antes de insertar o actualizar evaluaciones de tipo jefe.
El Concejo (C1) y el Alcalde (A1) pueden evaluar a cualquier nivel si existe asignación activa.
Las asignaciones reflejan la estructura organizacional real, no se restringen por nivel.';

