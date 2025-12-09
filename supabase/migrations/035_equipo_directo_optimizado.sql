-- ============================================================================
-- MIGRACIÓN: Función optimizada para obtener equipo directo completo
-- Fecha: 2025-01
-- Propósito: Una sola query que retorna colaboradores directos con todos sus datos
-- ============================================================================

-- ============================================================================
-- 1. FUNCIÓN: get_equipo_directo_completo
-- Obtiene colaboradores directos con evaluaciones, dimensiones y estadísticas
-- en UNA SOLA QUERY optimizada
-- ============================================================================
CREATE OR REPLACE FUNCTION get_equipo_directo_completo(
  jefe_dpi_param VARCHAR(20),
  periodo_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  resultado JSONB;
BEGIN
  WITH
  -- Obtener colaboradores directos (prioridad: user_assignments, fallback: jefe_inmediato_id)
  colaboradores_directos AS (
    SELECT DISTINCT u.dpi
    FROM users u
    WHERE u.estado = 'activo'
      AND (
        -- Prioridad 1: user_assignments activo
        EXISTS (
          SELECT 1 FROM user_assignments ua
          WHERE ua.jefe_id = jefe_dpi_param
            AND ua.colaborador_id = u.dpi
            AND ua.activo = true
        )
        OR (
          -- Prioridad 2: jefe_inmediato_id (solo si no hay assignment)
          u.jefe_inmediato_id = jefe_dpi_param
          AND NOT EXISTS (
            SELECT 1 FROM user_assignments ua2
            WHERE ua2.colaborador_id = u.dpi
              AND ua2.activo = true
          )
        )
      )
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
    FROM colaboradores_directos cd
    JOIN users u ON u.dpi = cd.dpi
    LEFT JOIN final_evaluation_results fer
      ON fer.colaborador_id = u.dpi
      AND fer.periodo_id = periodo_id_param
  ),

  -- Calcular dimensiones para cada colaborador
  colaboradores_con_dimensiones AS (
    SELECT
      c.*,
      -- Calcular dimensiones usando la función existente o inline
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

  -- eNPS de la unidad
  enps_unidad AS (
    SELECT
      COUNT(*) FILTER (WHERE e.nps_score >= 9) AS promoters,
      COUNT(*) FILTER (WHERE e.nps_score >= 7 AND e.nps_score < 9) AS passives,
      COUNT(*) FILTER (WHERE e.nps_score < 7) AS detractors,
      COUNT(*) FILTER (WHERE e.nps_score IS NOT NULL) AS total_respuestas
    FROM colaboradores_directos cd
    JOIN evaluations e ON e.usuario_id = cd.dpi
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
          'esJefe', c.es_jefe,
          'totalSubordinados', c.total_subordinados,
          'tieneEvaluacion', c.tiene_evaluacion,
          'desempenoPorcentaje', c.desempeno_porcentaje,
          'potencialPorcentaje', c.potencial_porcentaje,
          'posicion9Box', c.posicion_9box,
          'dimensiones', COALESCE(c.dimensiones, '[]'::jsonb)
        )
        ORDER BY c.nombre_completo
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
COMMENT ON FUNCTION get_equipo_directo_completo(VARCHAR, UUID) IS
'Obtiene el equipo directo de un jefe con todos los datos necesarios en una sola query:
- Lista de colaboradores con evaluaciones y dimensiones
- Estadísticas agregadas del equipo
- eNPS del equipo y organizacional
Optimizada para el módulo de Análisis de Equipo.';

-- ============================================================================
-- 2. ÍNDICES para optimizar la consulta
-- ============================================================================

-- Índice para búsqueda de colaboradores por jefe en user_assignments
CREATE INDEX IF NOT EXISTS idx_user_assignments_jefe_activo
ON user_assignments(jefe_id, activo)
WHERE activo = true;

-- Índice para búsqueda de colaboradores por jefe_inmediato_id
CREATE INDEX IF NOT EXISTS idx_users_jefe_inmediato_activo
ON users(jefe_inmediato_id)
WHERE estado = 'activo';

-- Índice compuesto para final_evaluation_results
CREATE INDEX IF NOT EXISTS idx_fer_colaborador_periodo
ON final_evaluation_results(colaborador_id, periodo_id);

-- Índice para evaluations NPS
CREATE INDEX IF NOT EXISTS idx_evaluations_nps
ON evaluations(usuario_id, periodo_id, tipo, estado)
WHERE tipo = 'auto' AND estado = 'enviado' AND nps_score IS NOT NULL;
