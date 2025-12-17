-- Migración 022: Agregar cálculo de NPS a get_dashboard_stats
-- La migración 020 eliminó el cálculo de NPS que estaba en la migración 015
-- Esta migración restaura el cálculo de NPS desde autoevaluaciones

CREATE OR REPLACE FUNCTION get_dashboard_stats(periodo_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
  total_usuarios INTEGER;
  total_jefes INTEGER;
  evaluaciones_completadas INTEGER;
  evaluaciones_en_progreso INTEGER;
  evaluaciones_pendientes INTEGER;
  promedio_desempeno NUMERIC;
  promedio_potencial NUMERIC;
  nps_promedio NUMERIC; -- NUEVO: Promedio de NPS
  nps_promoters INTEGER; -- NUEVO: Promoters (9-10)
  nps_passives INTEGER; -- NUEVO: Passives (7-8)
  nps_detractors INTEGER; -- NUEVO: Detractors (0-6)
  distribucion_9box JSONB;
  evaluaciones_por_area JSONB;
  evaluaciones_por_nivel JSONB;
BEGIN
  -- Total de usuarios activos
  SELECT COUNT(*) INTO total_usuarios
  FROM users
  WHERE estado = 'activo';

  -- Total de jefes activos (incluyendo C1 y admins que pueden evaluar)
  SELECT COUNT(*) INTO total_jefes
  FROM users
  WHERE rol IN ('jefe', 'admin_rrhh', 'admin_general') AND estado = 'activo';

  -- Evaluaciones completadas (contar evaluaciones únicas de colaborador-evaluador)
  SELECT COUNT(DISTINCT colaborador_id || '-' || evaluador_id) INTO evaluaciones_completadas
  FROM evaluations
  WHERE periodo_id = periodo_id_param
    AND tipo = 'jefe'
    AND estado = 'enviado'
    AND colaborador_id IS NOT NULL
    AND evaluador_id IS NOT NULL;

  -- Evaluaciones en progreso (contar evaluaciones únicas de colaborador-evaluador)
  SELECT COUNT(DISTINCT colaborador_id || '-' || evaluador_id) INTO evaluaciones_en_progreso
  FROM evaluations
  WHERE periodo_id = periodo_id_param
    AND tipo = 'jefe'
    AND estado = 'borrador'
    AND colaborador_id IS NOT NULL
    AND evaluador_id IS NOT NULL;

  -- Evaluaciones pendientes (estimado basado en asignaciones)
  SELECT COUNT(DISTINCT ua.colaborador_id || '-' || ua.jefe_id) INTO evaluaciones_pendientes
  FROM user_assignments ua
  WHERE ua.activo = true
    AND NOT EXISTS (
      SELECT 1 FROM evaluations e
      WHERE e.colaborador_id = ua.colaborador_id
        AND e.evaluador_id = ua.jefe_id
        AND e.periodo_id = periodo_id_param
        AND e.tipo = 'jefe'
        AND e.estado = 'enviado'
    );

  -- Promedio de desempeño (usando resultados consolidados, excluyendo administrativos)
  -- Retornar en escala 1-5 para que scoreToPercentage funcione correctamente
  SELECT ROUND(AVG(fer.desempeno_final_promedio), 2) INTO promedio_desempeno
  FROM final_evaluation_results_consolidated fer
  JOIN users u ON u.dpi = fer.colaborador_id
  WHERE fer.periodo_id = periodo_id_param
    AND fer.desempeno_final_promedio IS NOT NULL
    AND u.rol NOT IN ('admin_general', 'admin_rrhh');

  -- Promedio de potencial (usando resultados consolidados, excluyendo administrativos)
  -- Retornar en escala 1-5 para que scoreToPercentage funcione correctamente
  SELECT ROUND(AVG(fer.potencial_promedio), 2) INTO promedio_potencial
  FROM final_evaluation_results_consolidated fer
  JOIN users u ON u.dpi = fer.colaborador_id
  WHERE fer.periodo_id = periodo_id_param
    AND fer.potencial_promedio IS NOT NULL
    AND u.rol NOT IN ('admin_general', 'admin_rrhh');

  -- NUEVO: Calcular estadísticas NPS desde autoevaluaciones (excluyendo administrativos)
  SELECT
    ROUND(AVG(nps_score), 1),
    COUNT(*) FILTER (WHERE nps_score >= 9),
    COUNT(*) FILTER (WHERE nps_score >= 7 AND nps_score < 9),
    COUNT(*) FILTER (WHERE nps_score < 7)
  INTO
    nps_promedio,
    nps_promoters,
    nps_passives,
    nps_detractors
  FROM evaluations e
  JOIN users u ON u.dpi = e.usuario_id
  WHERE e.periodo_id = periodo_id_param
    AND e.tipo = 'auto'
    AND e.estado = 'enviado'
    AND e.nps_score IS NOT NULL
    AND u.rol NOT IN ('admin_general', 'admin_rrhh');

  -- Distribución 9-box (usando moda por colaborador)
  SELECT jsonb_object_agg(
    COALESCE(posicion_9box_moda, 'sin-calcular'),
    count
  ) INTO distribucion_9box
  FROM (
    SELECT 
      posicion_9box_moda,
      COUNT(*) as count
    FROM final_evaluation_results_consolidated
    WHERE periodo_id = periodo_id_param
    GROUP BY posicion_9box_moda
  ) subq;

  -- Evaluaciones por área (contar colaboradores únicos evaluados)
  SELECT jsonb_agg(
    jsonb_build_object(
      'area', area,
      'completadas', completadas,
      'total', total
    )
  ) INTO evaluaciones_por_area
  FROM (
    SELECT 
      u.area,
      COUNT(DISTINCT CASE WHEN e.estado = 'enviado' THEN e.colaborador_id END) as completadas,
      COUNT(DISTINCT ua.colaborador_id) as total
    FROM users u
    LEFT JOIN user_assignments ua ON ua.colaborador_id = u.dpi AND ua.activo = true
    LEFT JOIN evaluations e ON e.colaborador_id = u.dpi 
      AND e.periodo_id = periodo_id_param 
      AND e.tipo = 'jefe'
    WHERE u.estado = 'activo'
    GROUP BY u.area
    ORDER BY u.area
  ) area_stats;

  -- Evaluaciones por nivel (incluyendo C1)
  SELECT jsonb_agg(
    jsonb_build_object(
      'nivel', nivel,
      'completadas', completadas,
      'total', total
    )
  ) INTO evaluaciones_por_nivel
  FROM (
    SELECT 
      u.nivel,
      COUNT(DISTINCT CASE WHEN e.estado = 'enviado' THEN e.colaborador_id END) as completadas,
      COUNT(DISTINCT ua.colaborador_id) as total
    FROM users u
    LEFT JOIN user_assignments ua ON ua.colaborador_id = u.dpi AND ua.activo = true
    LEFT JOIN evaluations e ON e.colaborador_id = u.dpi 
      AND e.periodo_id = periodo_id_param 
      AND e.tipo = 'jefe'
    WHERE u.estado = 'activo'
    GROUP BY u.nivel
    ORDER BY u.nivel
  ) nivel_stats;

  -- Construir objeto JSONB con todas las estadísticas (INCLUYE NPS)
  SELECT jsonb_build_object(
    'totalUsuarios', total_usuarios,
    'totalJefes', total_jefes,
    'evaluacionesCompletadas', evaluaciones_completadas,
    'evaluacionesPendientes', GREATEST(evaluaciones_pendientes, 0),
    'evaluacionesEnProgreso', evaluaciones_en_progreso,
    'porcentajeCompletitud', CASE 
      WHEN evaluaciones_pendientes + evaluaciones_completadas > 0 THEN 
        ROUND((evaluaciones_completadas::NUMERIC / (evaluaciones_pendientes + evaluaciones_completadas)::NUMERIC) * 100, 2)
      ELSE 0 
    END,
    'promedioDesempeno', COALESCE(ROUND(promedio_desempeno, 2), 0),
    'promedioPotencial', COALESCE(ROUND(promedio_potencial, 2), 0),
    'npsPromedio', COALESCE(ROUND(nps_promedio, 2), NULL), -- NUEVO: NPS promedio
    'npsPromoters', COALESCE(nps_promoters, 0), -- NUEVO: Promoters
    'npsPassives', COALESCE(nps_passives, 0), -- NUEVO: Passives
    'npsDetractors', COALESCE(nps_detractors, 0), -- NUEVO: Detractors
    'distribucion9Box', COALESCE(distribucion_9box, '{}'::jsonb),
    'evaluacionesPorArea', COALESCE(evaluaciones_por_area, '[]'::jsonb),
    'evaluacionesPorNivel', COALESCE(evaluaciones_por_nivel, '[]'::jsonb)
  ) INTO stats;

  RETURN stats;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_dashboard_stats(UUID) IS 
'Calcula estadísticas agregadas del dashboard de RRHH para un período específico. 
Actualizado para soportar múltiples evaluadores por colaborador.
INCLUYE: NPS (Net Promoter Score) desde autoevaluaciones, promedios de desempeño/potencial,
distribución 9-box, y estadísticas de evaluaciones.
Optimiza el rendimiento al calcular todo en el servidor.';






