-- ============================================================================
-- FIX: Mejorar validate_period_active para aceptar 'en_curso' y 'activo'
-- ============================================================================

-- Función mejorada para validar que un período esté activo y permita evaluación
CREATE OR REPLACE FUNCTION validate_period_active(
  periodo_id UUID,
  tipo_evaluacion VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  periodo RECORD;
  fecha_limite TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Obtener período
  SELECT * INTO periodo
  FROM evaluation_periods
  WHERE id = periodo_id;
  
  -- Verificar que el período existe
  IF periodo IS NULL THEN
    RAISE WARNING 'Período no encontrado: %', periodo_id;
    RETURN FALSE;
  END IF;
  
  -- Verificar que el período esté activo (aceptar tanto 'activo' como 'en_curso')
  IF periodo.estado NOT IN ('activo', 'en_curso') THEN
    RAISE WARNING 'Período no está activo. Estado actual: %', periodo.estado;
    RETURN FALSE;
  END IF;
  
  -- Determinar fecha límite según tipo de evaluación
  IF tipo_evaluacion = 'auto' THEN
    fecha_limite := periodo.fecha_cierre_autoevaluacion;
  ELSIF tipo_evaluacion = 'jefe' THEN
    fecha_limite := periodo.fecha_cierre_evaluacion_jefe;
  ELSE
    RAISE WARNING 'Tipo de evaluación inválido: %', tipo_evaluacion;
    RETURN FALSE;
  END IF;
  
  -- Verificar que la fecha límite esté configurada
  IF fecha_limite IS NULL THEN
    RAISE WARNING 'Fecha límite no configurada para tipo: %', tipo_evaluacion;
    RETURN FALSE;
  END IF;
  
  -- Verificar que no haya pasado la fecha límite
  IF NOW() > fecha_limite THEN
    RAISE WARNING 'Fecha límite expirada. Fecha límite: %, Fecha actual: %', fecha_limite, NOW();
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION validate_period_active(UUID, VARCHAR) IS 'Valida que un período esté activo (activo o en_curso) y permita evaluación según el tipo';

