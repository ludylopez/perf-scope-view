-- Migración: Corrección CRÍTICA de conteo de evaluaciones en dashboard
-- El dashboard estaba contando incorrectamente "total de jefes" en lugar de "total de evaluaciones esperadas"

-- Función corregida para obtener estadísticas del dashboard
CREATE OR REPLACE FUNCTION get_dashboard_stats(periodo_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
  total_usuarios INTEGER;
  total_jefes INTEGER;
  total_evaluaciones_esperadas INTEGER; -- NUEVO: total de asignaciones activas
  evaluaciones_completadas INTEGER;
  evaluaciones_en_progreso INTEGER;
  evaluaciones_pendientes INTEGER;
  reaperturas INTEGER; -- NUEVO: evaluaciones reaperturadas
  promedio_desempeno NUMERIC;
  promedio_potencial NUMERIC;
  distribucion_9box JSONB;
  evaluaciones_por_area JSONB;
  evaluaciones_por_nivel JSONB;
  tendencia_semanal JSONB;
BEGIN
  -- Total de usuarios activos
  SELECT COUNT(*) INTO total_usuarios
  FROM users
  WHERE estado = 'activo';

  -- Total de jefes activos
  SELECT COUNT(*) INTO total_jefes
  FROM users
  WHERE rol = 'jefe' AND estado = 'activo';

  -- CORREGIDO: Total de evaluaciones esperadas = total de asignaciones activas de colaboradores
  SELECT COUNT(DISTINCT colaborador_id) INTO total_evaluaciones_esperadas
  FROM user_assignments
  WHERE activo = true
    AND colaborador_id IN (
      SELECT dpi FROM users WHERE estado = 'activo' AND rol = 'colaborador'
    );

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

  -- NUEVO: Contar reaperturas (evaluaciones que fueron enviadas y luego reaperturadas)
  -- Esto requiere verificar si existe un log o flag de reapertura
  -- Por ahora, dejamos en 0 si no hay mecanismo de tracking
  reaperturas := 0;

  -- Si existe una tabla de logs o campo "reabierto", descomentar:
  -- SELECT COUNT(*) INTO reaperturas
  -- FROM evaluations
  -- WHERE periodo_id = periodo_id_param
  --   AND tipo = 'jefe'
  --   AND reabierto = true;

  -- CORREGIDO: Evaluaciones pendientes = total esperado - completadas - en progreso
  evaluaciones_pendientes := GREATEST(0, total_evaluaciones_esperadas - evaluaciones_completadas - evaluaciones_en_progreso);

  -- Promedio de desempeño (convertir a porcentaje si está en escala 1-5)
  SELECT AVG(
    CASE
      WHEN desempeno_final BETWEEN 0 AND 100 THEN desempeno_final
      WHEN desempeno_final BETWEEN 0 AND 5 THEN (desempeno_final / 5.0) * 100
      ELSE desempeno_final
    END
  ) INTO promedio_desempeno
  FROM final_evaluation_results
  WHERE periodo_id = periodo_id_param
    AND desempeno_final IS NOT NULL;

  -- Promedio de potencial (convertir a porcentaje si está en escala 1-5)
  SELECT AVG(
    CASE
      WHEN potencial BETWEEN 0 AND 100 THEN potencial
      WHEN potencial BETWEEN 0 AND 5 THEN (potencial / 5.0) * 100
      ELSE potencial
    END
  ) INTO promedio_potencial
  FROM final_evaluation_results
  WHERE periodo_id = periodo_id_param
    AND potencial IS NOT NULL;

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
      AND posicion_9box IS NOT NULL
    GROUP BY posicion_9box
  ) subq;

  -- Evaluaciones por área - CORREGIDO: Contar solo colaboradores con asignación activa
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
      COUNT(DISTINCT CASE
        WHEN e.estado = 'enviado' AND e.tipo = 'jefe' THEN ua.colaborador_id
      END) as completadas,
      COUNT(DISTINCT ua.colaborador_id) as total
    FROM user_assignments ua
    INNER JOIN users u ON u.dpi = ua.colaborador_id
    LEFT JOIN evaluations e ON e.colaborador_id = ua.colaborador_id
      AND e.periodo_id = periodo_id_param
      AND e.tipo = 'jefe'
    WHERE ua.activo = true
      AND u.estado = 'activo'
      AND u.rol = 'colaborador'
    GROUP BY u.area
    ORDER BY u.area
  ) area_stats;

  -- Evaluaciones por nivel - CORREGIDO: Contar solo colaboradores con asignación activa
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
      COUNT(DISTINCT CASE
        WHEN e.estado = 'enviado' AND e.tipo = 'jefe' THEN ua.colaborador_id
      END) as completadas,
      COUNT(DISTINCT ua.colaborador_id) as total
    FROM user_assignments ua
    INNER JOIN users u ON u.dpi = ua.colaborador_id
    LEFT JOIN evaluations e ON e.colaborador_id = ua.colaborador_id
      AND e.periodo_id = periodo_id_param
      AND e.tipo = 'jefe'
    WHERE ua.activo = true
      AND u.estado = 'activo'
      AND u.rol = 'colaborador'
    GROUP BY u.nivel
    ORDER BY u.nivel
  ) nivel_stats;

  -- Tendencia semanal REAL
  SELECT get_tendencia_semanal(periodo_id_param) INTO tendencia_semanal;

  -- Construir objeto JSONB con todas las estadísticas
  SELECT jsonb_build_object(
    'totalUsuarios', total_usuarios,
    'totalJefes', total_jefes,
    'evaluacionesCompletadas', evaluaciones_completadas,
    'evaluacionesPendientes', evaluaciones_pendientes,
    'evaluacionesEnProgreso', evaluaciones_en_progreso,
    'reaperturas', reaperturas,
    'porcentajeCompletitud', CASE
      WHEN total_evaluaciones_esperadas > 0 THEN
        ROUND((evaluaciones_completadas::NUMERIC / total_evaluaciones_esperadas::NUMERIC) * 100, 2)
      ELSE 0
    END,
    'promedioDesempeno', COALESCE(ROUND(promedio_desempeno, 2), 0),
    'promedioPotencial', COALESCE(ROUND(promedio_potencial, 2), 0),
    'distribucion9Box', COALESCE(distribucion_9box, '{}'::jsonb),
    'evaluacionesPorArea', COALESCE(evaluaciones_por_area, '[]'::jsonb),
    'evaluacionesPorNivel', COALESCE(evaluaciones_por_nivel, '[]'::jsonb),
    'tendenciaSemanal', COALESCE(tendencia_semanal, '[]'::jsonb)
  ) INTO stats;

  RETURN stats;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_dashboard_stats(UUID) IS
'Calcula estadísticas agregadas del dashboard de RRHH para un período específico.
CORREGIDO: Ahora cuenta correctamente las evaluaciones esperadas (asignaciones activas)
en lugar de solo contar el número de jefes.';
