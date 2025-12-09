-- ============================================================================
-- MIGRACIÓN: Función optimizada para obtener equipo en cascada completo
-- Fecha: 2025-01
-- Propósito: Una sola query que retorna toda la jerarquía (directos + indirectos)
--            con evaluaciones, dimensiones y estadísticas consolidadas
-- ============================================================================

-- ============================================================================
-- 1. FUNCIÓN: get_equipo_cascada_completo
-- Similar a get_equipo_directo_completo pero incluye subordinados de subordinados
-- ============================================================================
CREATE OR REPLACE FUNCTION get_equipo_cascada_completo(
  jefe_dpi_param VARCHAR(20),
  periodo_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  resultado JSONB;
BEGIN
  WITH RECURSIVE
  -- Obtener toda la jerarquía en cascada
  jerarquia_cascada AS (
    -- Caso base: subordinados directos (nivel 1)
    -- Desde user_assignments (prioridad)
    SELECT DISTINCT
      u.dpi,
      jefe_dpi_param AS jefe_dpi,
      1 AS nivel_jerarquico
    FROM user_assignments ua
    JOIN users u ON u.dpi = ua.colaborador_id
    WHERE ua.jefe_id = jefe_dpi_param
      AND ua.activo = true
      AND u.estado = 'activo'

    UNION

    -- Desde jefe_inmediato_id (fallback si no hay assignment)
    SELECT DISTINCT
      u.dpi,
      jefe_dpi_param AS jefe_dpi,
      1 AS nivel_jerarquico
    FROM users u
    WHERE u.jefe_inmediato_id = jefe_dpi_param
      AND u.estado = 'activo'
      AND NOT EXISTS (
        SELECT 1 FROM user_assignments ua2
        WHERE ua2.colaborador_id = u.dpi
          AND ua2.activo = true
      )

    UNION ALL

    -- Caso recursivo: subordinados de subordinados (niveles 2+)
    SELECT DISTINCT
      u.dpi,
      jc.dpi AS jefe_dpi,
      jc.nivel_jerarquico + 1 AS nivel_jerarquico
    FROM jerarquia_cascada jc
    JOIN users u ON (
      -- Buscar por user_assignments primero
      EXISTS (
        SELECT 1 FROM user_assignments ua
        WHERE ua.jefe_id = jc.dpi
          AND ua.colaborador_id = u.dpi
          AND ua.activo = true
      )
      OR (
        -- Fallback a jefe_inmediato_id
        u.jefe_inmediato_id = jc.dpi
        AND NOT EXISTS (
          SELECT 1 FROM user_assignments ua2
          WHERE ua2.colaborador_id = u.dpi
            AND ua2.activo = true
        )
      )
    )
    WHERE u.estado = 'activo'
      AND jc.nivel_jerarquico < 10  -- Límite de recursión
  ),

  -- Eliminar duplicados y quedarse con el nivel más cercano al jefe principal
  -- (menor nivel_jerarquico = más cercano al jefe)
  jerarquia_unicos AS (
    SELECT DISTINCT ON (dpi)
      dpi,
      jefe_dpi,
      nivel_jerarquico
    FROM jerarquia_cascada
    ORDER BY dpi, nivel_jerarquico ASC
  ),

  -- Datos completos de colaboradores con evaluación
  colaboradores_con_eval AS (
    SELECT
      u.dpi,
      u.nombre || ' ' || u.apellidos AS nombre_completo,
      u.cargo,
      u.area,
      u.nivel,
      u.rol,
      u.instrumento_id,
      jc.jefe_dpi,
      jc.nivel_jerarquico,
      -- Nombre del jefe directo
      (
        SELECT jefe.nombre || ' ' || jefe.apellidos
        FROM users jefe
        WHERE jefe.dpi = jc.jefe_dpi
      ) AS jefe_nombre,
      -- Verificar si es jefe (tiene subordinados)
      EXISTS (
        SELECT 1 FROM user_assignments ua
        WHERE ua.jefe_id = u.dpi AND ua.activo = true
        UNION
        SELECT 1 FROM users u2
        WHERE u2.jefe_inmediato_id = u.dpi AND u2.estado = 'activo'
      ) AS es_jefe,
      -- Contar subordinados directos
      (
        SELECT COUNT(DISTINCT sub.dpi)
        FROM users sub
        WHERE sub.estado = 'activo'
          AND (
            EXISTS (SELECT 1 FROM user_assignments ua WHERE ua.jefe_id = u.dpi AND ua.colaborador_id = sub.dpi AND ua.activo = true)
            OR (sub.jefe_inmediato_id = u.dpi AND NOT EXISTS (SELECT 1 FROM user_assignments ua2 WHERE ua2.colaborador_id = sub.dpi AND ua2.activo = true))
          )
      ) AS total_subordinados,
      -- Resultados de evaluación
      fer.desempeno_porcentaje,
      fer.potencial_porcentaje,
      fer.posicion_9box,
      fer.id IS NOT NULL AS tiene_evaluacion,
      -- IDs de evaluaciones para obtener dimensiones
      fer.autoevaluacion_id,
      fer.evaluacion_jefe_id
    FROM jerarquia_unicos jc
    JOIN users u ON u.dpi = jc.dpi
    LEFT JOIN final_evaluation_results fer
      ON fer.colaborador_id = u.dpi
      AND fer.periodo_id = periodo_id_param
  ),

  -- Calcular dimensiones para cada colaborador
  colaboradores_con_dimensiones AS (
    SELECT
      c.*,
      -- Calcular dimensiones usando la función existente
      CASE
        WHEN c.tiene_evaluacion AND c.evaluacion_jefe_id IS NOT NULL THEN
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', dim.key,
                'nombre', dim.value->>'nombre',
                'promedioAuto', COALESCE((dim.value->>'promedioAuto')::numeric, 0),
                'promedioJefe', COALESCE((dim.value->>'promedioJefe')::numeric, 0),
                'promedioFinal', COALESCE((dim.value->>'promedioFinal')::numeric, 0)
              )
            )
            FROM jsonb_each(
              calcular_dimensiones_colaborador(c.dpi, periodo_id_param)
            ) AS dim(key, value)
            WHERE dim.key LIKE 'dim%'
          )
        ELSE NULL
      END AS dimensiones
    FROM colaboradores_con_eval c
  ),

  -- Estadísticas agregadas
  estadisticas AS (
    SELECT
      COUNT(*) AS total_personas,
      COUNT(*) FILTER (WHERE tiene_evaluacion) AS evaluaciones_completadas,
      ROUND(
        (COUNT(*) FILTER (WHERE tiene_evaluacion)::numeric / NULLIF(COUNT(*), 0)) * 100,
        1
      ) AS tasa_completitud,
      ROUND(AVG(desempeno_porcentaje) FILTER (WHERE tiene_evaluacion), 1) AS promedio_desempeno,
      ROUND(AVG(potencial_porcentaje) FILTER (WHERE tiene_evaluacion), 1) AS promedio_potencial,
      COUNT(*) FILTER (WHERE es_jefe) AS total_jefes
    FROM colaboradores_con_dimensiones
  ),

  -- Distribución 9-Box
  distribucion_9box AS (
    SELECT
      jsonb_object_agg(
        COALESCE(posicion_9box, 'sin-calcular'),
        cantidad
      ) AS distribucion
    FROM (
      SELECT
        posicion_9box,
        COUNT(*) AS cantidad
      FROM colaboradores_con_dimensiones
      WHERE tiene_evaluacion
      GROUP BY posicion_9box
    ) sub
  ),

  -- Promedios organizacionales para comparativa
  promedios_org AS (
    SELECT
      ROUND(AVG(desempeno_porcentaje), 1) AS promedio_desempeno_org,
      ROUND(AVG(potencial_porcentaje), 1) AS promedio_potencial_org,
      COUNT(*) AS total_evaluados_org
    FROM final_evaluation_results
    WHERE periodo_id = periodo_id_param
  ),

  -- Lista de jefes subordinados (para filtros en frontend)
  jefes_subordinados AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'dpi', c.dpi,
        'nombre', c.nombre_completo,
        'cargo', c.cargo,
        'nivelJerarquico', c.nivel_jerarquico,
        'totalColaboradores', c.total_subordinados
      )
      ORDER BY c.nivel_jerarquico, c.nombre_completo
    ) AS jefes
    FROM colaboradores_con_dimensiones c
    WHERE c.es_jefe = true
  ),

  -- eNPS de la unidad (cascada)
  enps_unidad AS (
    SELECT
      COUNT(*) FILTER (WHERE e.nps_score >= 9) AS promoters,
      COUNT(*) FILTER (WHERE e.nps_score >= 7 AND e.nps_score < 9) AS passives,
      COUNT(*) FILTER (WHERE e.nps_score < 7) AS detractors,
      COUNT(*) FILTER (WHERE e.nps_score IS NOT NULL) AS total_respuestas
    FROM jerarquia_unicos jc
    JOIN evaluations e ON e.usuario_id = jc.dpi
    WHERE e.tipo = 'auto'
      AND e.estado = 'enviado'
      AND e.periodo_id = periodo_id_param
      AND e.nps_score IS NOT NULL
  ),

  -- eNPS organizacional
  enps_org AS (
    SELECT
      COUNT(*) FILTER (WHERE nps_score >= 9) AS promoters_org,
      COUNT(*) FILTER (WHERE nps_score < 7) AS detractors_org,
      COUNT(*) FILTER (WHERE nps_score IS NOT NULL) AS total_org
    FROM evaluations
    WHERE tipo = 'auto'
      AND estado = 'enviado'
      AND periodo_id = periodo_id_param
      AND nps_score IS NOT NULL
  )

  -- Construir resultado final
  SELECT jsonb_build_object(
    'colaboradores', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'dpi', c.dpi,
          'nombreCompleto', c.nombre_completo,
          'cargo', c.cargo,
          'area', c.area,
          'nivel', c.nivel,
          'rol', c.rol,
          'instrumentoId', c.instrumento_id,
          'jefeDpi', c.jefe_dpi,
          'jefeNombre', c.jefe_nombre,
          'nivelJerarquico', c.nivel_jerarquico,
          'esJefe', c.es_jefe,
          'totalSubordinados', c.total_subordinados,
          'tieneEvaluacion', c.tiene_evaluacion,
          'desempenoPorcentaje', c.desempeno_porcentaje,
          'potencialPorcentaje', c.potencial_porcentaje,
          'posicion9Box', c.posicion_9box,
          'dimensiones', COALESCE(c.dimensiones, '[]'::jsonb)
        )
        ORDER BY c.nivel_jerarquico, c.nombre_completo
      ) FROM colaboradores_con_dimensiones c),
      '[]'::jsonb
    ),
    'estadisticas', jsonb_build_object(
      'totalPersonas', COALESCE(e.total_personas, 0),
      'totalJefes', COALESCE(e.total_jefes, 0),
      'totalColaboradores', COALESCE(e.total_personas, 0) - COALESCE(e.total_jefes, 0),
      'evaluacionesCompletadas', COALESCE(e.evaluaciones_completadas, 0),
      'tasaCompletitud', COALESCE(e.tasa_completitud, 0),
      'promedioDesempenoUnidad', COALESCE(e.promedio_desempeno, 0),
      'promedioPotencialUnidad', COALESCE(e.promedio_potencial, 0),
      'promedioDesempenoOrganizacion', COALESCE(po.promedio_desempeno_org, 0),
      'promedioPotencialOrganizacion', COALESCE(po.promedio_potencial_org, 0),
      'distribucion9Box', COALESCE(d.distribucion, '{}'::jsonb)
    ),
    'jefesSubordinados', COALESCE(js.jefes, '[]'::jsonb),
    'eNPS', jsonb_build_object(
      'valor', CASE
        WHEN eu.total_respuestas > 0 THEN
          ROUND(((eu.promoters - eu.detractors)::numeric / eu.total_respuestas) * 100)
        ELSE NULL
      END,
      'promoters', COALESCE(eu.promoters, 0),
      'passives', COALESCE(eu.passives, 0),
      'detractors', COALESCE(eu.detractors, 0),
      'totalRespuestas', COALESCE(eu.total_respuestas, 0),
      'valorOrganizacion', CASE
        WHEN eo.total_org > 0 THEN
          ROUND(((eo.promoters_org - eo.detractors_org)::numeric / eo.total_org) * 100)
        ELSE NULL
      END
    )
  ) INTO resultado
  FROM estadisticas e
  CROSS JOIN distribucion_9box d
  CROSS JOIN promedios_org po
  CROSS JOIN jefes_subordinados js
  CROSS JOIN enps_unidad eu
  CROSS JOIN enps_org eo;

  RETURN COALESCE(resultado, jsonb_build_object(
    'colaboradores', '[]'::jsonb,
    'estadisticas', jsonb_build_object(
      'totalPersonas', 0,
      'totalJefes', 0,
      'totalColaboradores', 0,
      'evaluacionesCompletadas', 0,
      'tasaCompletitud', 0,
      'promedioDesempenoUnidad', 0,
      'promedioPotencialUnidad', 0,
      'promedioDesempenoOrganizacion', 0,
      'promedioPotencialOrganizacion', 0,
      'distribucion9Box', '{}'::jsonb
    ),
    'jefesSubordinados', '[]'::jsonb,
    'eNPS', jsonb_build_object(
      'valor', NULL,
      'promoters', 0,
      'passives', 0,
      'detractors', 0,
      'totalRespuestas', 0,
      'valorOrganizacion', NULL
    )
  ));
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

-- Comentario descriptivo
COMMENT ON FUNCTION get_equipo_cascada_completo(VARCHAR, UUID) IS
'Obtiene toda la jerarquía en cascada de un jefe con todos los datos necesarios en una sola query:
- Lista de colaboradores directos e indirectos con evaluaciones y dimensiones
- Estadísticas agregadas de toda la unidad
- Lista de jefes subordinados para filtros
- eNPS del equipo y organizacional
Incluye nivelJerarquico (1=directo, 2+=indirecto) y jefeDpi/jefeNombre para cada colaborador.
Optimizada para el módulo de Análisis de Unidad.';

-- ============================================================================
-- 2. FUNCIÓN: get_9box_cascada_filtrable
-- Datos 9-Box para toda la cascada con filtro opcional por jefe subordinado
-- ============================================================================
CREATE OR REPLACE FUNCTION get_9box_cascada_filtrable(
  jefe_principal_dpi VARCHAR(20),
  periodo_id_param UUID,
  filtro_jefe_dpi VARCHAR(20) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
  jefe_base VARCHAR(20);
BEGIN
  -- Si hay filtro de jefe subordinado, usamos ese como base de la cascada
  jefe_base := COALESCE(filtro_jefe_dpi, jefe_principal_dpi);

  WITH RECURSIVE jerarquia AS (
    -- Caso base: subordinados directos del jefe base
    SELECT DISTINCT u.dpi, jefe_base AS jefe_dpi, 1 AS nivel_rec
    FROM user_assignments ua
    JOIN users u ON u.dpi = ua.colaborador_id
    WHERE ua.jefe_id = jefe_base
      AND ua.activo = true
      AND u.estado = 'activo'

    UNION

    SELECT DISTINCT u.dpi, jefe_base AS jefe_dpi, 1 AS nivel_rec
    FROM users u
    WHERE u.jefe_inmediato_id = jefe_base
      AND u.estado = 'activo'
      AND NOT EXISTS (
        SELECT 1 FROM user_assignments ua2
        WHERE ua2.colaborador_id = u.dpi AND ua2.activo = true
      )

    UNION ALL

    -- Caso recursivo
    SELECT DISTINCT u.dpi, j.dpi AS jefe_dpi, j.nivel_rec + 1
    FROM jerarquia j
    JOIN users u ON (
      EXISTS (SELECT 1 FROM user_assignments ua WHERE ua.jefe_id = j.dpi AND ua.colaborador_id = u.dpi AND ua.activo = true)
      OR (u.jefe_inmediato_id = j.dpi AND NOT EXISTS (SELECT 1 FROM user_assignments ua2 WHERE ua2.colaborador_id = u.dpi AND ua2.activo = true))
    )
    WHERE u.estado = 'activo'
      AND j.nivel_rec < 10
  ),
  jerarquia_unicos AS (
    SELECT DISTINCT ON (dpi) dpi, jefe_dpi, nivel_rec
    FROM jerarquia
    ORDER BY dpi, nivel_rec
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'dpi', u.dpi,
      'nombre', u.nombre || ' ' || u.apellidos,
      'cargo', u.cargo,
      'area', u.area,
      'nivel', u.nivel,
      'nivelJerarquico', j.nivel_rec,
      'desempenoFinal', fer.desempeno_porcentaje,
      'potencial', fer.potencial_porcentaje,
      'posicion9Box', fer.posicion_9box,
      'desempenoPorcentaje', fer.desempeno_porcentaje,
      'potencialPorcentaje', fer.potencial_porcentaje,
      'jefeDpi', j.jefe_dpi,
      'jefeNombre', (
        SELECT jefe.nombre || ' ' || jefe.apellidos
        FROM users jefe WHERE jefe.dpi = j.jefe_dpi
      )
    )
    ORDER BY u.nombre, u.apellidos
  ) INTO resultados
  FROM users u
  JOIN jerarquia_unicos j ON j.dpi = u.dpi
  JOIN final_evaluation_results fer
    ON fer.colaborador_id = u.dpi
    AND fer.periodo_id = periodo_id_param
  WHERE fer.posicion_9box IS NOT NULL;

  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

COMMENT ON FUNCTION get_9box_cascada_filtrable(VARCHAR, UUID, VARCHAR) IS
'Obtiene datos de 9-box para toda la cascada con filtro opcional por jefe subordinado.
Si se especifica filtro_jefe_dpi, solo muestra la cascada de ese jefe.';

-- ============================================================================
-- 3. ÍNDICES adicionales para optimizar consultas de cascada
-- ============================================================================

-- Índice para búsqueda recursiva por jefe_inmediato_id
CREATE INDEX IF NOT EXISTS idx_users_jefe_inmediato_estado
ON users(jefe_inmediato_id, estado)
WHERE estado = 'activo';

-- Índice compuesto para user_assignments en cascada
CREATE INDEX IF NOT EXISTS idx_user_assignments_cascada
ON user_assignments(jefe_id, colaborador_id, activo)
WHERE activo = true;
