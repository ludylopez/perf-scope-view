-- Migración 020: Actualizar Estadísticas para Múltiples Evaluadores
-- Esta migración actualiza get_dashboard_stats() para contar evaluaciones únicas
-- y crea get_multiple_evaluators_stats() para estadísticas de múltiples evaluadores

-- ============================================================
-- 1. ACTUALIZAR get_dashboard_stats()
-- ============================================================

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

  -- Promedio de desempeño (usando resultados consolidados)
  SELECT AVG(desempeno_final_promedio) INTO promedio_desempeno
  FROM final_evaluation_results_consolidated
  WHERE periodo_id = periodo_id_param
    AND desempeno_final_promedio IS NOT NULL;

  -- Promedio de potencial (usando resultados consolidados)
  SELECT AVG(potencial_promedio) INTO promedio_potencial
  FROM final_evaluation_results_consolidated
  WHERE periodo_id = periodo_id_param
    AND potencial_promedio IS NOT NULL;

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

  -- Construir objeto JSONB con todas las estadísticas
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
Optimiza el rendimiento al calcular todo en el servidor.';

-- ============================================================
-- 2. CREAR FUNCIÓN get_multiple_evaluators_stats()
-- ============================================================

CREATE OR REPLACE FUNCTION get_multiple_evaluators_stats(periodo_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
  colaboradores_con_multiples INTEGER;
  promedio_evaluadores NUMERIC;
  distribucion JSONB;
BEGIN
  -- Contar colaboradores con múltiples evaluadores
  SELECT COUNT(*) INTO colaboradores_con_multiples
  FROM (
    SELECT colaborador_id
    FROM evaluation_results_by_evaluator
    WHERE periodo_id = periodo_id_param
    GROUP BY colaborador_id
    HAVING COUNT(DISTINCT evaluador_id) > 1
  ) subq;

  -- Promedio de evaluadores por colaborador
  SELECT AVG(evaluadores_count) INTO promedio_evaluadores
  FROM (
    SELECT colaborador_id, COUNT(DISTINCT evaluador_id) as evaluadores_count
    FROM evaluation_results_by_evaluator
    WHERE periodo_id = periodo_id_param
    GROUP BY colaborador_id
  ) subq;

  -- Distribución de número de evaluadores
  SELECT jsonb_agg(
    jsonb_build_object(
      'evaluadores', evaluadores_count,
      'colaboradores', colaboradores_count
    )
    ORDER BY evaluadores_count
  ) INTO distribucion
  FROM (
    SELECT 
      COUNT(DISTINCT evaluador_id) as evaluadores_count,
      COUNT(DISTINCT colaborador_id) as colaboradores_count
    FROM evaluation_results_by_evaluator
    WHERE periodo_id = periodo_id_param
    GROUP BY colaborador_id
  ) subq
  GROUP BY evaluadores_count
  ORDER BY evaluadores_count;

  -- Construir objeto JSONB
  SELECT jsonb_build_object(
    'colaboradores_con_multiples', colaboradores_con_multiples,
    'promedio_evaluadores', COALESCE(ROUND(promedio_evaluadores, 2), 0),
    'distribucion', COALESCE(distribucion, '[]'::jsonb),
    'total_colaboradores_evaluados', (
      SELECT COUNT(DISTINCT colaborador_id)
      FROM evaluation_results_by_evaluator
      WHERE periodo_id = periodo_id_param
    ),
    'total_evaluaciones', (
      SELECT COUNT(*)
      FROM evaluation_results_by_evaluator
      WHERE periodo_id = periodo_id_param
    )
  ) INTO stats;

  RETURN stats;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_multiple_evaluators_stats(UUID) IS 
'Calcula estadísticas sobre colaboradores con múltiples evaluadores en un período específico.
Incluye: colaboradores con múltiples evaluadores, promedio de evaluadores por colaborador,
y distribución del número de evaluadores.';

