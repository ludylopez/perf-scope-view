-- Migración: Corrección del cálculo de dimensiones
-- El problema era que instrument_configs tiene IDs como "d1_i1" pero
-- los responses reales usan IDs como "d1_i1_a1" (con sufijo del instrumento)
-- Esta función agrupa por prefijo de dimensión para calcular correctamente

-- ============================================================================
-- FUNCIÓN AUXILIAR CORREGIDA: calcular_dimensiones_colaborador
-- Agrupa responses por prefijo de dimensión (d1_, d2_, etc.)
-- ============================================================================
CREATE OR REPLACE FUNCTION calcular_dimensiones_colaborador(
  p_colaborador_dpi VARCHAR(20),
  p_periodo_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_autoevaluacion_id UUID;
  v_evaluacion_jefe_id UUID;
  v_auto_responses JSONB;
  v_jefe_responses JSONB;
  v_instrumento_id VARCHAR(50);
  v_dimensiones JSONB;
  v_resultado JSONB := '{}'::JSONB;
  v_dim_num INT;
  v_auto_sum NUMERIC;
  v_auto_count INT;
  v_jefe_sum NUMERIC;
  v_jefe_count INT;
  v_auto_avg NUMERIC;
  v_jefe_avg NUMERIC;
  v_final_avg NUMERIC;
  v_key TEXT;
  v_value NUMERIC;
  v_dim_id TEXT;
  v_dim_nombre TEXT;
  v_max_dim INT;
BEGIN
  -- Obtener IDs de evaluaciones
  SELECT fer.autoevaluacion_id, fer.evaluacion_jefe_id
  INTO v_autoevaluacion_id, v_evaluacion_jefe_id
  FROM final_evaluation_results fer
  WHERE fer.colaborador_id = p_colaborador_dpi
    AND fer.periodo_id = p_periodo_id;

  IF v_autoevaluacion_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Obtener responses de cada evaluación
  SELECT responses INTO v_auto_responses
  FROM evaluations WHERE id = v_autoevaluacion_id;

  SELECT responses INTO v_jefe_responses
  FROM evaluations WHERE id = v_evaluacion_jefe_id;

  IF v_auto_responses IS NULL AND v_jefe_responses IS NULL THEN
    RETURN NULL;
  END IF;

  -- Obtener instrumento del colaborador
  SELECT COALESCE(u.instrumento_id, u.nivel) INTO v_instrumento_id
  FROM users u WHERE u.dpi = p_colaborador_dpi;

  -- Obtener dimensiones del instrumento para determinar cuántas hay
  SELECT ic.dimensiones_desempeno INTO v_dimensiones
  FROM instrument_configs ic
  WHERE ic.id = v_instrumento_id AND ic.activo = true;

  IF v_dimensiones IS NULL THEN
    -- Intentar con instrumento por defecto
    SELECT ic.dimensiones_desempeno INTO v_dimensiones
    FROM instrument_configs ic
    WHERE ic.id = 'A1' AND ic.activo = true;
  END IF;

  -- Determinar número máximo de dimensiones
  IF v_dimensiones IS NOT NULL THEN
    -- Extraer el número máximo de dimensión desde los IDs (dim1, dim2, d1, d2, etc.)
    SELECT COALESCE(
      MAX(
        CASE 
          WHEN (dim.value->>'id') ~ '^dim([0-9]+)' THEN
            (regexp_match(dim.value->>'id', '^dim([0-9]+)'))[1]::int
          WHEN (dim.value->>'id') ~ '^d([0-9]+)_' THEN
            (regexp_match(dim.value->>'id', '^d([0-9]+)_'))[1]::int
          ELSE NULL
        END
      ),
      jsonb_array_length(v_dimensiones)
    ) INTO v_max_dim
    FROM jsonb_array_elements(v_dimensiones) as dim;
  ELSE
    -- Fallback: asumir 8 dimensiones (máximo conocido, C1 tiene 8)
    v_max_dim := 8;
  END IF;

  -- Iterar por cada dimensión
  FOR v_dim_num IN 1..v_max_dim LOOP
    v_auto_sum := 0;
    v_auto_count := 0;
    v_jefe_sum := 0;
    v_jefe_count := 0;

    -- Sumar valores de autoevaluación para esta dimensión
    -- Busca claves que empiecen con "d{num}_" (ej: d1_i1, d1_i2_a1, etc.)
    IF v_auto_responses IS NOT NULL THEN
      FOR v_key, v_value IN 
        SELECT key, value::numeric
        FROM jsonb_each_text(v_auto_responses)
        WHERE key ~ ('^d' || v_dim_num || '_i[0-9]')
          AND value ~ '^[0-9]+\.?[0-9]*$'
      LOOP
        v_auto_sum := v_auto_sum + v_value;
        v_auto_count := v_auto_count + 1;
      END LOOP;
    END IF;

    -- Sumar valores de evaluación del jefe para esta dimensión
    IF v_jefe_responses IS NOT NULL THEN
      FOR v_key, v_value IN 
        SELECT key, value::numeric
        FROM jsonb_each_text(v_jefe_responses)
        WHERE key ~ ('^d' || v_dim_num || '_i[0-9]')
          AND value ~ '^[0-9]+\.?[0-9]*$'
      LOOP
        v_jefe_sum := v_jefe_sum + v_value;
        v_jefe_count := v_jefe_count + 1;
      END LOOP;
    END IF;

    -- Calcular promedios
    IF v_auto_count > 0 THEN
      v_auto_avg := ROUND((v_auto_sum / v_auto_count)::NUMERIC, 2);
    ELSE
      v_auto_avg := NULL;
    END IF;

    IF v_jefe_count > 0 THEN
      v_jefe_avg := ROUND((v_jefe_sum / v_jefe_count)::NUMERIC, 2);
    ELSE
      v_jefe_avg := NULL;
    END IF;

    -- Calcular promedio final ponderado (70% jefe, 30% auto)
    IF v_auto_avg IS NOT NULL AND v_jefe_avg IS NOT NULL THEN
      v_final_avg := ROUND((v_jefe_avg * 0.7 + v_auto_avg * 0.3)::NUMERIC, 2);
    ELSIF v_jefe_avg IS NOT NULL THEN
      v_final_avg := v_jefe_avg;
    ELSIF v_auto_avg IS NOT NULL THEN
      v_final_avg := v_auto_avg;
    ELSE
      v_final_avg := NULL;
    END IF;

    -- Obtener ID y nombre de la dimensión desde instrument_configs
    IF v_dimensiones IS NOT NULL THEN
      SELECT 
        dim.value->>'id' as dim_id,
        dim.value->>'nombre' as dim_nombre
      INTO v_dim_id, v_dim_nombre
      FROM jsonb_array_elements(v_dimensiones) as dim
      WHERE (dim.value->>'id')::text ~ ('^dim' || v_dim_num || '|^d' || v_dim_num || '_')
      LIMIT 1;
    END IF;

    -- Si no se encontró, usar valores por defecto
    IF v_dim_id IS NULL THEN
      v_dim_id := 'dim' || v_dim_num;
      v_dim_nombre := 'Dimensión ' || v_dim_num;
    END IF;

    -- Agregar al resultado solo si hay datos
    -- Retornar como objeto JSONB con clave = dim_id para compatibilidad con jsonb_each
    IF v_final_avg IS NOT NULL THEN
      v_resultado := v_resultado || jsonb_build_object(
        v_dim_id,
        jsonb_build_object(
          'id', v_dim_id,
          'nombre', COALESCE(v_dim_nombre, 'Dimensión ' || v_dim_num),
          'promedioFinal', v_final_avg,
          'promedioAuto', COALESCE(v_auto_avg, 0),
          'promedioJefe', COALESCE(v_jefe_avg, 0)
        )
      );
    END IF;
    
    -- Resetear variables para la siguiente iteración
    v_dim_id := NULL;
    v_dim_nombre := NULL;
  END LOOP;

  -- Verificar si el objeto tiene elementos
  IF v_resultado = '{}'::JSONB THEN
    RETURN NULL;
  END IF;

  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

COMMENT ON FUNCTION calcular_dimensiones_colaborador(VARCHAR, UUID) IS
'Calcula promedios por dimensión usando regex para agrupar items (d1_, d2_, etc.)';
