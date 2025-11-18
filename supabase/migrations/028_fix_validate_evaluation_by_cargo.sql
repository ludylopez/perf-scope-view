-- Migración 028: Corregir validación de evaluación para items condicionales por cargo
-- Esta migración corrige el trigger de validación para que solo valide items relevantes según el cargo del usuario
-- Especialmente importante para D1 que tiene items condicionales (a, b, c, d, e, f) según el tipo de dirección

-- ============================================================================
-- 1. FUNCIÓN PARA FILTRAR DIMENSIONES SEGÚN CARGO (similar a filterInstrumentByCargo del frontend)
-- ============================================================================

CREATE OR REPLACE FUNCTION filter_dimensions_by_cargo(
  dimensions JSONB,
  cargo VARCHAR,
  nivel VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  filtered_dimensions JSONB := '[]'::JSONB;
  dimension JSONB;
  filtered_dimension JSONB;
  items_array JSONB;
  item JSONB;
  filtered_items JSONB := '[]'::JSONB;
  puesto_type VARCHAR;
  specific_item_ids TEXT[];
BEGIN
  -- Solo aplicar filtro para nivel D1
  IF nivel != 'D1' OR cargo IS NULL THEN
    RETURN dimensions;
  END IF;
  
  -- Identificar tipo de puesto basado en cargo (similar a getD1PuestoType del frontend)
  IF cargo ILIKE '%gerente%' OR cargo ILIKE '%director general%' OR cargo ILIKE '%coordinador general%' THEN
    puesto_type := 'gerente';
  ELSIF cargo ILIKE '%juez%' OR cargo ILIKE '%magistrado%' THEN
    puesto_type := 'juez';
  ELSIF cargo ILIKE '%recursos humanos%' OR cargo ILIKE '%rrhh%' OR cargo ILIKE '%talento humano%' THEN
    puesto_type := 'rrhh';
  ELSIF cargo ILIKE '%planificación%' OR cargo ILIKE '%dmp%' OR cargo ILIKE '%segeplan%' THEN
    puesto_type := 'dmp';
  ELSIF cargo ILIKE '%financiero%' OR cargo ILIKE '%dafim%' OR cargo ILIKE '%administración financiera%' OR cargo ILIKE '%contabilidad%' THEN
    puesto_type := 'dafim';
  ELSIF cargo ILIKE '%mujer%' OR cargo ILIKE '%dmm%' OR cargo ILIKE '%género%' THEN
    puesto_type := 'dmm';
  ELSE
    -- Si no hay match, retornar dimensiones sin cambios (solo items universales)
    RETURN dimensions;
  END IF;
  
  -- Mapeo de tipo de puesto a IDs de items específicos
  specific_item_ids := CASE puesto_type
    WHEN 'gerente' THEN ARRAY['d3_i4a_d1', 'd3_i5a_d1']
    WHEN 'juez' THEN ARRAY['d3_i4b_d1', 'd3_i5b_d1']
    WHEN 'rrhh' THEN ARRAY['d3_i4c_d1', 'd3_i5c_d1']
    WHEN 'dmp' THEN ARRAY['d3_i4d_d1', 'd3_i5d_d1']
    WHEN 'dafim' THEN ARRAY['d3_i4e_d1', 'd3_i5e_d1']
    WHEN 'dmm' THEN ARRAY['d3_i4f_d1', 'd3_i5f_d1']
    ELSE ARRAY[]::TEXT[]
  END;
  
  -- Filtrar cada dimensión
  FOR dimension IN SELECT * FROM jsonb_array_elements(dimensions)
  LOOP
    -- Solo filtrar la dimensión 3 (COMPETENCIAS DIRECTIVAS)
    IF dimension->>'id' = 'dim3_d1' THEN
      items_array := dimension->'items';
      filtered_items := '[]'::JSONB;
      
      -- Agregar items universales (d3_i1_d1, d3_i2_d1, d3_i3_d1)
      FOR item IN SELECT * FROM jsonb_array_elements(items_array)
      LOOP
        IF item->>'id' IN ('d3_i1_d1', 'd3_i2_d1', 'd3_i3_d1') THEN
          filtered_items := filtered_items || jsonb_build_array(item);
        ELSIF item->>'id' = ANY(specific_item_ids) THEN
          -- Agregar items específicos del puesto
          filtered_items := filtered_items || jsonb_build_array(item);
        END IF;
      END LOOP;
      
      -- Crear dimensión filtrada
      filtered_dimension := jsonb_set(
        dimension,
        '{items}',
        filtered_items
      );
      
      filtered_dimensions := filtered_dimensions || jsonb_build_array(filtered_dimension);
    ELSE
      -- Para otras dimensiones, mantener todos los items
      filtered_dimensions := filtered_dimensions || jsonb_build_array(dimension);
    END IF;
  END LOOP;
  
  RETURN filtered_dimensions;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION filter_dimensions_by_cargo(JSONB, VARCHAR, VARCHAR) IS 
'Filtra las dimensiones de un instrumento según el cargo del usuario. Para D1, filtra la dimensión 3 para mostrar solo items relevantes según el puesto (similar a filterInstrumentByCargo del frontend)';

-- ============================================================================
-- 2. MODIFICAR FUNCIÓN DE VALIDACIÓN PARA USAR FILTRO POR CARGO
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_evaluation_before_submit()
RETURNS TRIGGER AS $$
DECLARE
  instrument_config JSONB;
  dimensions JSONB;
  filtered_dimensions JSONB;
  is_complete BOOLEAN;
  user_record RECORD;
  user_cargo VARCHAR;
  user_nivel VARCHAR;
BEGIN
  -- Solo validar cuando estado cambia a 'enviado'
  IF NEW.estado = 'enviado' AND (OLD.estado IS NULL OR OLD.estado != 'enviado') THEN
    
    -- Obtener información del usuario para filtrar por cargo
    IF NEW.tipo = 'auto' THEN
      SELECT cargo, nivel INTO user_cargo, user_nivel
      FROM users
      WHERE dpi = NEW.usuario_id;
    ELSIF NEW.tipo = 'jefe' THEN
      SELECT cargo, nivel INTO user_cargo, user_nivel
      FROM users
      WHERE dpi = NEW.colaborador_id;
    END IF;
    
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
        -- Filtrar dimensiones de potencial por cargo si es necesario
        filtered_dimensions := filter_dimensions_by_cargo(
          instrument_config->'dimensionesPotencial',
          user_cargo,
          user_nivel
        );
        
        IF NOT validate_evaluation_complete(
          NEW.evaluacion_potencial->'responses',
          filtered_dimensions
        ) THEN
          RAISE EXCEPTION 'La evaluación de potencial no está completa';
        END IF;
      END IF;
    END IF;
    
    -- Filtrar dimensiones por cargo antes de validar
    filtered_dimensions := filter_dimensions_by_cargo(
      dimensions,
      user_cargo,
      user_nivel
    );
    
    -- Validar completitud con dimensiones filtradas
    is_complete := validate_evaluation_complete(NEW.responses, filtered_dimensions);
    
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

COMMENT ON FUNCTION validate_evaluation_before_submit() IS 
'Valida que una evaluación esté completa antes de permitir enviarla. Filtra items condicionales según el cargo del usuario (especialmente para D1)';

