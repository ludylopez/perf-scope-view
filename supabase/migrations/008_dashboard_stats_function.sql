-- Migración: Función SQL para estadísticas del Dashboard RRHH
-- OPTIMIZACIÓN: Calcula todas las estadísticas agregadas en el servidor
-- Esto reduce significativamente la carga de datos al cliente

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

  -- Total de jefes activos
  SELECT COUNT(*) INTO total_jefes
  FROM users
  WHERE rol = 'jefe' AND estado = 'activo';

  -- Evaluaciones completadas (jefe tipo 'enviado')
  SELECT COUNT(*) INTO evaluaciones_completadas
  FROM evaluations
  WHERE periodo_id = periodo_id_param
    AND tipo = 'jefe'
    AND estado = 'enviado';

  -- Evaluaciones en progreso (jefe tipo 'borrador')
  SELECT COUNT(*) INTO evaluaciones_en_progreso
  FROM evaluations
  WHERE periodo_id = periodo_id_param
    AND tipo = 'jefe'
    AND estado = 'borrador';

  -- Evaluaciones pendientes (total jefes - completadas - en progreso)
  evaluaciones_pendientes := total_jefes - evaluaciones_completadas - evaluaciones_en_progreso;

  -- Promedio de desempeño
  SELECT AVG(desempeno_porcentaje) INTO promedio_desempeno
  FROM final_evaluation_results
  WHERE periodo_id = periodo_id_param
    AND desempeno_porcentaje IS NOT NULL;

  -- Promedio de potencial
  SELECT AVG(potencial_porcentaje) INTO promedio_potencial
  FROM final_evaluation_results
  WHERE periodo_id = periodo_id_param
    AND potencial_porcentaje IS NOT NULL;

  -- Distribución 9-box
  SELECT jsonb_object_agg(
    COALESCE(posicion_9box, 'sin-calcular'),
    count
  ) INTO distribucion_9box
  FROM (
    SELECT 
      posicion_9box,
      COUNT(*) as count
    FROM final_evaluation_results
    WHERE periodo_id = periodo_id_param
    GROUP BY posicion_9box
  ) subq;

  -- Evaluaciones por área
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
      COUNT(DISTINCT e.colaborador_id) as total
    FROM users u
    LEFT JOIN evaluations e ON e.colaborador_id = u.dpi 
      AND e.periodo_id = periodo_id_param 
      AND e.tipo = 'jefe'
    WHERE u.estado = 'activo'
    GROUP BY u.area
    ORDER BY u.area
  ) area_stats;

  -- Evaluaciones por nivel
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
      COUNT(DISTINCT e.colaborador_id) as total
    FROM users u
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
      WHEN total_jefes > 0 THEN 
        ROUND((evaluaciones_completadas::NUMERIC / total_jefes::NUMERIC) * 100, 2)
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

-- Comentario de documentación
COMMENT ON FUNCTION get_dashboard_stats(UUID) IS 
'Calcula estadísticas agregadas del dashboard de RRHH para un período específico. 
Optimiza el rendimiento al calcular todo en el servidor en lugar de transferir todos los datos al cliente.';

