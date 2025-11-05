-- Migración 004: Constraints de Validación Adicionales
-- Esta migración agrega constraints adicionales para validar datos en la tabla evaluations

-- Constraint para validar que evaluador_id y colaborador_id estén presentes cuando tipo='jefe'
ALTER TABLE evaluations
DROP CONSTRAINT IF EXISTS check_jefe_evaluacion_fields;

ALTER TABLE evaluations
ADD CONSTRAINT check_jefe_evaluacion_fields 
CHECK (
  (tipo = 'auto' AND evaluador_id IS NULL AND colaborador_id IS NULL) OR
  (tipo = 'jefe' AND evaluador_id IS NOT NULL AND colaborador_id IS NOT NULL)
);

COMMENT ON CONSTRAINT check_jefe_evaluacion_fields ON evaluations IS 
'Valida que las evaluaciones de tipo jefe tengan evaluador_id y colaborador_id, y las auto no los tengan';

-- Función para validar estructura JSONB de responses
CREATE OR REPLACE FUNCTION validate_responses_structure(responses JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  key TEXT;
  value JSONB;
BEGIN
  -- Si es null, está bien (puede ser un borrador vacío)
  IF responses IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar que es un objeto JSON
  IF jsonb_typeof(responses) != 'object' THEN
    RETURN FALSE;
  END IF;
  
  -- Iterar sobre cada clave-valor
  FOR key, value IN SELECT * FROM jsonb_each(responses)
  LOOP
    -- Verificar que el valor es numérico
    IF jsonb_typeof(value) != 'number' THEN
      RETURN FALSE;
    END IF;
    
    -- Verificar que el valor está en rango 1-5
    IF (value::NUMERIC < 1 OR value::NUMERIC > 5) THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_responses_structure(JSONB) IS 'Valida que la estructura de responses sea correcta (objeto con valores numéricos entre 1-5)';

-- Constraint para validar estructura de responses JSONB
-- Nota: PostgreSQL no permite usar funciones en CHECK constraints directamente,
-- pero podemos usar un trigger para validar esto

-- Función trigger para validar responses antes de insertar/actualizar
CREATE OR REPLACE FUNCTION validate_evaluation_responses()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar estructura de responses
  IF NOT validate_responses_structure(NEW.responses) THEN
    RAISE EXCEPTION 'Estructura de responses inválida: debe ser un objeto JSON con valores numéricos entre 1-5';
  END IF;
  
  -- Validar estructura de evaluacion_potencial si existe
  IF NEW.evaluacion_potencial IS NOT NULL THEN
    IF NEW.evaluacion_potencial->'responses' IS NOT NULL THEN
      IF NOT validate_responses_structure(NEW.evaluacion_potencial->'responses') THEN
        RAISE EXCEPTION 'Estructura de evaluacion_potencial.responses inválida: debe ser un objeto JSON con valores numéricos entre 1-5';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_evaluation_responses() IS 'Función trigger para validar estructura de responses antes de insertar/actualizar';

-- Trigger para validar responses antes de insertar
DROP TRIGGER IF EXISTS trigger_validate_responses_insert ON evaluations;
CREATE TRIGGER trigger_validate_responses_insert
  BEFORE INSERT ON evaluations
  FOR EACH ROW
  EXECUTE FUNCTION validate_evaluation_responses();

-- Trigger para validar responses antes de actualizar
DROP TRIGGER IF EXISTS trigger_validate_responses_update ON evaluations;
CREATE TRIGGER trigger_validate_responses_update
  BEFORE UPDATE ON evaluations
  FOR EACH ROW
  EXECUTE FUNCTION validate_evaluation_responses();

-- Constraint para validar que progreso esté en rango 0-100
ALTER TABLE evaluations
DROP CONSTRAINT IF EXISTS check_progreso_range;

ALTER TABLE evaluations
ADD CONSTRAINT check_progreso_range 
CHECK (progreso >= 0 AND progreso <= 100);

COMMENT ON CONSTRAINT check_progreso_range ON evaluations IS 
'Valida que el progreso esté en el rango válido 0-100';

-- Constraint para validar que fecha_envio esté presente cuando estado='enviado'
ALTER TABLE evaluations
DROP CONSTRAINT IF EXISTS check_fecha_envio_when_enviado;

ALTER TABLE evaluations
ADD CONSTRAINT check_fecha_envio_when_enviado
CHECK (
  (estado = 'borrador' AND fecha_envio IS NULL) OR
  (estado = 'enviado' AND fecha_envio IS NOT NULL)
);

COMMENT ON CONSTRAINT check_fecha_envio_when_enviado ON evaluations IS 
'Valida que fecha_envio esté presente cuando estado es enviado y ausente cuando es borrador';

