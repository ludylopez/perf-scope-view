-- Migración 005: Triggers Automáticos para Cálculo de Resultados
-- Esta migración crea triggers que calculan automáticamente los resultados finales cuando se completa una evaluación

-- ============================================================================
-- 1. FUNCIÓN AUXILIAR PARA OBTENER CONFIGURACIÓN DE INSTRUMENTO DESDE USUARIO
-- ============================================================================

-- Función para obtener configuración de instrumento desde usuario
CREATE OR REPLACE FUNCTION get_instrument_config_from_user(user_dpi VARCHAR)
RETURNS JSONB AS $$
DECLARE
  user_record RECORD;
  instrument_id VARCHAR(50);
  config JSONB;
BEGIN
  -- Obtener usuario
  SELECT * INTO user_record
  FROM users
  WHERE dpi = user_dpi;
  
  IF user_record IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Determinar instrument_id: primero override manual, luego por nivel
  IF user_record.instrumento_id IS NOT NULL AND user_record.instrumento_id != '' THEN
    instrument_id := user_record.instrumento_id;
  ELSE
    instrument_id := user_record.nivel;
  END IF;
  
  -- Obtener configuración
  config := get_instrument_config(instrument_id);
  
  -- Si no se encuentra, intentar con A1 como fallback
  IF config IS NULL THEN
    config := get_instrument_config('A1');
  END IF;
  
  RETURN config;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_instrument_config_from_user(VARCHAR) IS 'Obtiene la configuración de instrumento para un usuario basado en su nivel o override manual';

-- ============================================================================
-- 2. FUNCIÓN PARA MANEJAR CÁLCULO AUTOMÁTICO DE RESULTADO FINAL
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_final_result_calculation()
RETURNS TRIGGER AS $$
DECLARE
  autoevaluacion_id UUID;
  evaluacion_jefe_id UUID;
  periodo_id UUID;
  colaborador_id VARCHAR(20);
  instrument_config JSONB;
  resultado JSONB;
  desempeno_final NUMERIC;
  desempeno_porcentaje INTEGER;
  potencial NUMERIC;
  potencial_porcentaje INTEGER;
  posicion_9box VARCHAR(20);
BEGIN
  -- Solo procesar cuando estado cambia a 'enviado' y tipo es 'jefe'
  IF NEW.estado = 'enviado' AND NEW.tipo = 'jefe' AND (OLD.estado IS NULL OR OLD.estado != 'enviado') THEN
    
    -- Obtener datos necesarios
    periodo_id := NEW.periodo_id;
    colaborador_id := NEW.colaborador_id;
    evaluacion_jefe_id := NEW.id;
    
    -- Buscar autoevaluación del colaborador en el mismo período
    SELECT id INTO autoevaluacion_id
    FROM evaluations
    WHERE usuario_id = colaborador_id
      AND periodo_id = periodo_id
      AND tipo = 'auto'
      AND estado = 'enviado'
    ORDER BY fecha_envio DESC
    LIMIT 1;
    
    -- Si no hay autoevaluación, no podemos calcular resultado final
    IF autoevaluacion_id IS NULL THEN
      -- No lanzar error, solo registrar en logs (opcional)
      RETURN NEW;
    END IF;
    
    -- Obtener configuración de instrumento
    instrument_config := get_instrument_config_from_user(colaborador_id);
    
    IF instrument_config IS NULL THEN
      RAISE EXCEPTION 'No se pudo obtener configuración de instrumento para el usuario %', colaborador_id;
    END IF;
    
    -- Calcular resultado completo
    resultado := calculate_complete_final_result(
      autoevaluacion_id,
      NEW.id,
      instrument_config
    );
    
    -- Extraer valores del resultado
    desempeno_final := (resultado->>'desempenoFinal')::NUMERIC;
    desempeno_porcentaje := (resultado->>'desempenoPorcentaje')::INTEGER;
    potencial := (resultado->>'potencial')::NUMERIC;
    potencial_porcentaje := (resultado->>'potencialPorcentaje')::INTEGER;
    posicion_9box := resultado->>'posicion9Box';
    
    -- Insertar o actualizar resultado final
    INSERT INTO final_evaluation_results (
      colaborador_id,
      periodo_id,
      autoevaluacion_id,
      evaluacion_jefe_id,
      resultado_final,
      comparativo,
      posicion_9box,
      desempeno_final,
      desempeno_porcentaje,
      potencial,
      potencial_porcentaje,
      fecha_generacion
    ) VALUES (
      colaborador_id,
      periodo_id,
      autoevaluacion_id,
      NEW.id,
      resultado,
      jsonb_build_object(
        'desempenoAuto', resultado->>'desempenoAuto',
        'desempenoJefe', resultado->>'desempenoJefe',
        'desempenoFinal', resultado->>'desempenoFinal',
        'potencial', resultado->>'potencial'
      ),
      posicion_9box,
      desempeno_final,
      desempeno_porcentaje,
      potencial,
      potencial_porcentaje,
      NOW()
    )
    ON CONFLICT (colaborador_id, periodo_id) DO UPDATE SET
      autoevaluacion_id = EXCLUDED.autoevaluacion_id,
      evaluacion_jefe_id = EXCLUDED.evaluacion_jefe_id,
      resultado_final = EXCLUDED.resultado_final,
      comparativo = EXCLUDED.comparativo,
      posicion_9box = EXCLUDED.posicion_9box,
      desempeno_final = EXCLUDED.desempeno_final,
      desempeno_porcentaje = EXCLUDED.desempeno_porcentaje,
      potencial = EXCLUDED.potencial,
      potencial_porcentaje = EXCLUDED.potencial_porcentaje,
      fecha_generacion = NOW();
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION handle_final_result_calculation() IS 'Maneja el cálculo automático de resultado final cuando se envía una evaluación del jefe';

-- ============================================================================
-- 3. TRIGGER PARA CALCULAR RESULTADO FINAL AUTOMÁTICAMENTE
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_calculate_final_result ON evaluations;
CREATE TRIGGER trigger_calculate_final_result
  AFTER UPDATE ON evaluations
  FOR EACH ROW
  WHEN (NEW.estado = 'enviado' AND NEW.tipo = 'jefe' AND (OLD.estado IS NULL OR OLD.estado != 'enviado'))
  EXECUTE FUNCTION handle_final_result_calculation();

COMMENT ON TRIGGER trigger_calculate_final_result ON evaluations IS 
'Calcula automáticamente el resultado final cuando una evaluación del jefe se marca como enviada';

-- ============================================================================
-- 4. FUNCIÓN PARA VALIDAR COMPLETITUD ANTES DE ENVIAR
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_evaluation_before_submit()
RETURNS TRIGGER AS $$
DECLARE
  instrument_config JSONB;
  dimensions JSONB;
  is_complete BOOLEAN;
BEGIN
  -- Solo validar cuando estado cambia a 'enviado'
  IF NEW.estado = 'enviado' AND (OLD.estado IS NULL OR OLD.estado != 'enviado') THEN
    
    -- Obtener configuración de instrumento
    IF NEW.tipo = 'auto' THEN
      instrument_config := get_instrument_config_from_user(NEW.usuario_id);
    ELSIF NEW.tipo = 'jefe' THEN
      instrument_config := get_instrument_config_from_user(NEW.colaborador_id);
    END IF;
    
    IF instrument_config IS NULL THEN
      RAISE EXCEPTION 'No se pudo obtener configuración de instrumento para validar evaluación';
    END IF;
    
    -- Obtener dimensiones según tipo
    IF NEW.tipo = 'auto' THEN
      dimensions := instrument_config->'dimensionesDesempeno';
    ELSIF NEW.tipo = 'jefe' THEN
      dimensions := instrument_config->'dimensionesDesempeno';
      
      -- Validar también evaluación de potencial si existe
      IF NEW.evaluacion_potencial IS NOT NULL THEN
        IF NOT validate_evaluation_complete(
          NEW.evaluacion_potencial->'responses',
          instrument_config->'dimensionesPotencial'
        ) THEN
          RAISE EXCEPTION 'La evaluación de potencial no está completa';
        END IF;
      END IF;
    END IF;
    
    -- Validar completitud
    is_complete := validate_evaluation_complete(NEW.responses, dimensions);
    
    IF NOT is_complete THEN
      RAISE EXCEPTION 'La evaluación no está completa. Todos los items deben tener valores válidos (1-5)';
    END IF;
    
    -- Validar período activo
    IF NOT validate_period_active(NEW.periodo_id, NEW.tipo) THEN
      RAISE EXCEPTION 'El período de evaluación no está activo o ha expirado';
    END IF;
    
    -- Si todo está bien, establecer fecha_envio
    IF NEW.fecha_envio IS NULL THEN
      NEW.fecha_envio := NOW();
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_evaluation_before_submit() IS 'Valida que una evaluación esté completa antes de permitir enviarla';

-- ============================================================================
-- 5. TRIGGER PARA VALIDAR ANTES DE ENVIAR
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_validate_evaluation_before_submit ON evaluations;
CREATE TRIGGER trigger_validate_evaluation_before_submit
  BEFORE UPDATE ON evaluations
  FOR EACH ROW
  WHEN (NEW.estado = 'enviado' AND (OLD.estado IS NULL OR OLD.estado != 'enviado'))
  EXECUTE FUNCTION validate_evaluation_before_submit();

COMMENT ON TRIGGER trigger_validate_evaluation_before_submit ON evaluations IS 
'Valida que una evaluación esté completa y el período activo antes de permitir enviarla';

