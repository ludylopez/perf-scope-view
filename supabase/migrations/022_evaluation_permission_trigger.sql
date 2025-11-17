-- Migración 022: Trigger de Validación de Permisos de Evaluación
-- Esta migración crea un trigger que valida permisos antes de insertar evaluaciones
-- Aplica las reglas específicas: C1 solo evalúa D1/A1, A1 solo evalúa D1

-- ============================================================
-- CREAR FUNCIÓN DE VALIDACIÓN
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

  -- Aplicar reglas específicas según el nivel del evaluador
  IF v_evaluador_nivel = 'C1' THEN
    -- Concejo solo puede evaluar D1 o A1
    IF v_colaborador_nivel NOT IN ('D1', 'A1') THEN
      RAISE EXCEPTION 'El Concejo Municipal (C1) solo puede evaluar a Directores (D1) o Alcalde (A1), pero el colaborador es nivel %', v_colaborador_nivel;
    END IF;
  ELSIF v_evaluador_nivel = 'A1' THEN
    -- Alcalde solo puede evaluar D1
    IF v_colaborador_nivel != 'D1' THEN
      RAISE EXCEPTION 'El Alcalde (A1) solo puede evaluar a Directores (D1), pero el colaborador es nivel %', v_colaborador_nivel;
    END IF;
  END IF;

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
Aplica reglas específicas: C1 solo evalúa D1/A1, A1 solo evalúa D1, y verifica asignaciones activas.';

-- ============================================================
-- CREAR TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS trigger_validate_evaluation_permission ON evaluations;

CREATE TRIGGER trigger_validate_evaluation_permission
  BEFORE INSERT OR UPDATE ON evaluations
  FOR EACH ROW
  WHEN (NEW.tipo = 'jefe')
  EXECUTE FUNCTION validate_evaluation_permission_trigger();

COMMENT ON TRIGGER trigger_validate_evaluation_permission ON evaluations IS 
'Trigger que valida permisos de evaluación antes de insertar o actualizar evaluaciones de tipo jefe.';

