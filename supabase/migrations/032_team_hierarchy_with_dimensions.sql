-- Migración: Función para obtener jerarquía con resultados por dimensión
-- Permite visualizar el desempeño de cada colaborador desglosado por las 6 dimensiones de evaluación

-- ============================================================================
-- FUNCIÓN AUXILIAR: calcular_dimensiones_colaborador
-- Calcula los promedios por dimensión para un colaborador específico
-- Usa regex para agrupar items por prefijo de dimensión (d1_, d2_, etc.)
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
  v_resultado JSONB := '[]'::JSONB;
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
    IF v_final_avg IS NOT NULL THEN
      v_resultado := v_resultado || jsonb_build_array(
        jsonb_build_object(
          'id', v_dim_id,
          'nombre', COALESCE(v_dim_nombre, 'Dimensión ' || v_dim_num),
          'promedio', v_final_avg,
          'auto', COALESCE(v_auto_avg, 0),
          'jefe', COALESCE(v_jefe_avg, 0)
        )
      );
    END IF;
    
    -- Resetear variables para la siguiente iteración
    v_dim_id := NULL;
    v_dim_nombre := NULL;
  END LOOP;

  IF jsonb_array_length(v_resultado) = 0 THEN
    RETURN NULL;
  END IF;

  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql STABLE;


-- ============================================================================
-- FUNCIÓN: get_jerarquia_con_dimensiones
-- Obtiene la jerarquía completa en cascada con resultados desglosados por dimensión
-- ============================================================================
CREATE OR REPLACE FUNCTION get_jerarquia_con_dimensiones(
  usuario_dpi VARCHAR(20),
  periodo_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  WITH RECURSIVE jerarquia AS (
    -- Caso base: subordinados directos del usuario desde users.jefe_inmediato_id
    SELECT
      u.dpi,
      u.nombre || ' ' || u.apellidos as nombre_completo,
      u.nombre,
      u.apellidos,
      u.cargo,
      u.area,
      u.nivel,
      u.rol,
      u.jefe_inmediato_id,
      1 as nivel_jerarquico
    FROM users u
    WHERE u.jefe_inmediato_id = usuario_dpi
      AND u.estado = 'activo'

    UNION

    -- También buscar en user_assignments (asignaciones formales)
    SELECT
      u.dpi,
      u.nombre || ' ' || u.apellidos as nombre_completo,
      u.nombre,
      u.apellidos,
      u.cargo,
      u.area,
      u.nivel,
      u.rol,
      COALESCE(u.jefe_inmediato_id, ua.jefe_id) as jefe_inmediato_id,
      1 as nivel_jerarquico
    FROM user_assignments ua
    JOIN users u ON u.dpi = ua.colaborador_id
    WHERE ua.jefe_id = usuario_dpi
      AND ua.activo = true
      AND u.estado = 'activo'

    UNION ALL

    -- Caso recursivo: subordinados de subordinados
    SELECT
      u.dpi,
      u.nombre || ' ' || u.apellidos as nombre_completo,
      u.nombre,
      u.apellidos,
      u.cargo,
      u.area,
      u.nivel,
      u.rol,
      COALESCE(u.jefe_inmediato_id, (
        SELECT ua2.jefe_id FROM user_assignments ua2
        WHERE ua2.colaborador_id = u.dpi AND ua2.activo = true LIMIT 1
      )),
      j.nivel_jerarquico + 1
    FROM users u
    JOIN jerarquia j ON (
      u.jefe_inmediato_id = j.dpi
      OR EXISTS (
        SELECT 1 FROM user_assignments ua
        WHERE ua.colaborador_id = u.dpi
          AND ua.jefe_id = j.dpi
          AND ua.activo = true
      )
    )
    WHERE u.estado = 'activo'
      AND j.nivel_jerarquico < 10
  ),
  -- Eliminar duplicados
  jerarquia_unicos AS (
    SELECT DISTINCT ON (dpi)
      dpi,
      nombre_completo,
      nombre,
      apellidos,
      cargo,
      area,
      nivel,
      rol,
      jefe_inmediato_id,
      nivel_jerarquico
    FROM jerarquia
    ORDER BY dpi, nivel_jerarquico
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'dpi', j.dpi,
      'nombreCompleto', j.nombre_completo,
      'nombre', j.nombre,
      'apellidos', j.apellidos,
      'cargo', j.cargo,
      'area', j.area,
      'nivel', j.nivel,
      'rol', j.rol,
      'jefeDpi', j.jefe_inmediato_id,
      'nivelJerarquico', j.nivel_jerarquico,
      -- Resultados de evaluación globales
      'tieneEvaluacion', (fer.id IS NOT NULL),
      'desempenoPorcentaje', fer.desempeno_porcentaje,
      'potencialPorcentaje', fer.potencial_porcentaje,
      'posicion9Box', fer.posicion_9box,
      -- Dimensiones calculadas usando la función auxiliar
      'dimensiones', calcular_dimensiones_colaborador(j.dpi, periodo_id_param),
      -- Info adicional para jefes
      'totalColaboradoresDirectos', (
        SELECT COUNT(*)::int
        FROM user_assignments ua
        WHERE ua.jefe_id = j.dpi AND ua.activo = true
      ),
      'esJefe', EXISTS(
        SELECT 1 FROM user_assignments ua
        WHERE ua.jefe_id = j.dpi AND ua.activo = true
      ),
      'promedioEquipo', (
        SELECT ROUND(AVG(fer2.desempeno_porcentaje)::numeric, 2)
        FROM final_evaluation_results fer2
        JOIN user_assignments ua2 ON ua2.colaborador_id = fer2.colaborador_id
        WHERE ua2.jefe_id = j.dpi
          AND ua2.activo = true
          AND fer2.periodo_id = periodo_id_param
          AND fer2.desempeno_porcentaje IS NOT NULL
      )
    )
    ORDER BY j.nivel_jerarquico, j.nombre_completo
  ) INTO resultados
  FROM jerarquia_unicos j
  LEFT JOIN final_evaluation_results fer
    ON fer.colaborador_id = j.dpi
    AND fer.periodo_id = periodo_id_param;

  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_jerarquia_con_dimensiones(VARCHAR, UUID) IS
'Obtiene jerarquía completa en cascada con resultados desglosados por dimensión de evaluación';


-- ============================================================================
-- FUNCIÓN: get_jerarquia_directa_con_dimensiones
-- Obtiene colaboradores directos + sus subordinados (para poder expandir)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_jerarquia_directa_con_dimensiones(
  usuario_dpi VARCHAR(20),
  periodo_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  -- Obtener colaboradores directos Y los subordinados de cada uno (2 niveles)
  WITH colaboradores_directos AS (
    -- Nivel 1: Subordinados directos desde users.jefe_inmediato_id
    SELECT
      u.dpi,
      u.nombre || ' ' || u.apellidos as nombre_completo,
      u.nombre,
      u.apellidos,
      u.cargo,
      u.area,
      u.nivel,
      u.rol,
      u.jefe_inmediato_id,
      1 as nivel_jerarquico
    FROM users u
    WHERE u.jefe_inmediato_id = usuario_dpi
      AND u.estado = 'activo'

    UNION

    -- Nivel 1: Subordinados directos desde user_assignments
    SELECT
      u.dpi,
      u.nombre || ' ' || u.apellidos as nombre_completo,
      u.nombre,
      u.apellidos,
      u.cargo,
      u.area,
      u.nivel,
      u.rol,
      COALESCE(u.jefe_inmediato_id, ua.jefe_id) as jefe_inmediato_id,
      1 as nivel_jerarquico
    FROM user_assignments ua
    JOIN users u ON u.dpi = ua.colaborador_id
    WHERE ua.jefe_id = usuario_dpi
      AND ua.activo = true
      AND u.estado = 'activo'
  ),
  -- Nivel 2: Subordinados de los subordinados directos (para poder expandir)
  subordinados_nivel2 AS (
    SELECT
      u.dpi,
      u.nombre || ' ' || u.apellidos as nombre_completo,
      u.nombre,
      u.apellidos,
      u.cargo,
      u.area,
      u.nivel,
      u.rol,
      COALESCE(u.jefe_inmediato_id, ua.jefe_id) as jefe_inmediato_id,
      2 as nivel_jerarquico
    FROM user_assignments ua
    JOIN users u ON u.dpi = ua.colaborador_id
    WHERE ua.jefe_id IN (SELECT dpi FROM colaboradores_directos)
      AND ua.activo = true
      AND u.estado = 'activo'

    UNION

    SELECT
      u.dpi,
      u.nombre || ' ' || u.apellidos as nombre_completo,
      u.nombre,
      u.apellidos,
      u.cargo,
      u.area,
      u.nivel,
      u.rol,
      u.jefe_inmediato_id,
      2 as nivel_jerarquico
    FROM users u
    WHERE u.jefe_inmediato_id IN (SELECT dpi FROM colaboradores_directos)
      AND u.estado = 'activo'
  ),
  -- Unir ambos niveles
  todos_colaboradores AS (
    SELECT * FROM colaboradores_directos
    UNION
    SELECT * FROM subordinados_nivel2
  ),
  -- Eliminar duplicados
  colaboradores_unicos AS (
    SELECT DISTINCT ON (dpi)
      dpi,
      nombre_completo,
      nombre,
      apellidos,
      cargo,
      area,
      nivel,
      rol,
      jefe_inmediato_id,
      nivel_jerarquico
    FROM todos_colaboradores
    ORDER BY dpi, nivel_jerarquico
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'dpi', cd.dpi,
      'nombreCompleto', cd.nombre_completo,
      'nombre', cd.nombre,
      'apellidos', cd.apellidos,
      'cargo', cd.cargo,
      'area', cd.area,
      'nivel', cd.nivel,
      'rol', cd.rol,
      'jefeDpi', cd.jefe_inmediato_id,
      'nivelJerarquico', cd.nivel_jerarquico,
      -- Resultados de evaluación
      'tieneEvaluacion', (fer.id IS NOT NULL),
      'desempenoPorcentaje', fer.desempeno_porcentaje,
      'potencialPorcentaje', fer.potencial_porcentaje,
      'posicion9Box', fer.posicion_9box,
      -- Dimensiones calculadas
      'dimensiones', calcular_dimensiones_colaborador(cd.dpi, periodo_id_param),
      -- Info adicional para jefes
      'totalColaboradoresDirectos', (
        SELECT COUNT(*)::int
        FROM user_assignments ua
        WHERE ua.jefe_id = cd.dpi AND ua.activo = true
      ),
      'esJefe', EXISTS(
        SELECT 1 FROM user_assignments ua
        WHERE ua.jefe_id = cd.dpi AND ua.activo = true
      ),
      'promedioEquipo', (
        SELECT ROUND(AVG(fer2.desempeno_porcentaje)::numeric, 2)
        FROM final_evaluation_results fer2
        JOIN user_assignments ua2 ON ua2.colaborador_id = fer2.colaborador_id
        WHERE ua2.jefe_id = cd.dpi
          AND ua2.activo = true
          AND fer2.periodo_id = periodo_id_param
          AND fer2.desempeno_porcentaje IS NOT NULL
      )
    )
    ORDER BY cd.nivel_jerarquico, cd.nombre_completo
  ) INTO resultados
  FROM colaboradores_unicos cd
  LEFT JOIN final_evaluation_results fer
    ON fer.colaborador_id = cd.dpi
    AND fer.periodo_id = periodo_id_param;

  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_jerarquia_directa_con_dimensiones(VARCHAR, UUID) IS
'Obtiene colaboradores directos y sus subordinados inmediatos con resultados por dimensión';
