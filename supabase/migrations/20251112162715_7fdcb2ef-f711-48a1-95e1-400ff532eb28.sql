-- Migración FINAL: Solución definitiva para anidación de agregados en get_antiguedad_completa_stats
-- Calcular cada sección por separado como variables

CREATE OR REPLACE FUNCTION get_antiguedad_completa_stats(periodo_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  distribucion JSONB;
  distribucion_por_area JSONB;
  distribucion_por_nivel JSONB;
  correlacion JSONB;
  distribucion_9box JSONB;
  retencion JSONB;
  tiempo_area JSONB;
  stats_nivel JSONB;
BEGIN
  -- Calcular cada sección por separado
  distribucion := get_antiguedad_distribution();
  
  -- Distribución por área - pre-calcular antigüedad
  WITH user_antiguedad AS (
    SELECT 
      dpi, area, calcular_antiguedad_meses(dpi) as meses_antiguedad, fecha_ingreso
    FROM users WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe')
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'area', area, 'totalColaboradores', COUNT(*),
      'promedioAntiguedad', COALESCE(AVG(meses_antiguedad) FILTER (WHERE fecha_ingreso IS NOT NULL), 0),
      'rango0_3', COUNT(*) FILTER (WHERE meses_antiguedad >= 0 AND meses_antiguedad < 3),
      'rango3_6', COUNT(*) FILTER (WHERE meses_antiguedad >= 3 AND meses_antiguedad < 6),
      'rango6_12', COUNT(*) FILTER (WHERE meses_antiguedad >= 6 AND meses_antiguedad < 12),
      'rango1_3', COUNT(*) FILTER (WHERE meses_antiguedad >= 12 AND meses_antiguedad < 36),
      'rango3_5', COUNT(*) FILTER (WHERE meses_antiguedad >= 36 AND meses_antiguedad < 60),
      'rango5_plus', COUNT(*) FILTER (WHERE meses_antiguedad >= 60),
      'sinFecha', COUNT(*) FILTER (WHERE fecha_ingreso IS NULL),
      'tasaRetencion', CASE WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE meses_antiguedad >= 12)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2) ELSE 0 END
    ) ORDER BY area
  ) INTO distribucion_por_area FROM user_antiguedad GROUP BY area;
  
  -- Distribución por nivel
  WITH user_antiguedad AS (
    SELECT dpi, nivel, calcular_antiguedad_meses(dpi) as meses_antiguedad, fecha_ingreso
    FROM users WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe')
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'nivel', nivel, 'totalColaboradores', COUNT(*),
      'promedioAntiguedad', COALESCE(AVG(meses_antiguedad) FILTER (WHERE fecha_ingreso IS NOT NULL), 0),
      'rango0_3', COUNT(*) FILTER (WHERE meses_antiguedad >= 0 AND meses_antiguedad < 3),
      'rango3_6', COUNT(*) FILTER (WHERE meses_antiguedad >= 3 AND meses_antiguedad < 6),
      'rango6_12', COUNT(*) FILTER (WHERE meses_antiguedad >= 6 AND meses_antiguedad < 12),
      'rango1_3', COUNT(*) FILTER (WHERE meses_antiguedad >= 12 AND meses_antiguedad < 36),
      'rango3_5', COUNT(*) FILTER (WHERE meses_antiguedad >= 36 AND meses_antiguedad < 60),
      'rango5_plus', COUNT(*) FILTER (WHERE meses_antiguedad >= 60),
      'sinFecha', COUNT(*) FILTER (WHERE fecha_ingreso IS NULL)
    ) ORDER BY nivel
  ) INTO distribucion_por_nivel FROM user_antiguedad GROUP BY nivel;
  
  correlacion := get_antiguedad_vs_desempeno(periodo_id_param);
  distribucion_9box := get_9box_por_antiguedad(periodo_id_param);
  
  -- Retención
  WITH user_antiguedad AS (
    SELECT calcular_antiguedad_meses(dpi) as meses_antiguedad
    FROM users WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe') AND fecha_ingreso IS NOT NULL
  )
  SELECT jsonb_build_object(
    'tasaRetencionGeneral', CASE WHEN COUNT(*) > 0 THEN 
      ROUND((COUNT(*) FILTER (WHERE meses_antiguedad >= 12)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2) ELSE 0 END,
    'tasaRetencion3Anos', CASE WHEN COUNT(*) > 0 THEN 
      ROUND((COUNT(*) FILTER (WHERE meses_antiguedad >= 36)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2) ELSE 0 END,
    'colaboradoresNuevos', COUNT(*) FILTER (WHERE meses_antiguedad < 6),
    'colaboradoresEstables', COUNT(*) FILTER (WHERE meses_antiguedad >= 12),
    'colaboradoresVeteranos', COUNT(*) FILTER (WHERE meses_antiguedad >= 36)
  ) INTO retencion FROM user_antiguedad;
  
  tiempo_area := get_tiempo_promedio_por_area();
  stats_nivel := get_nivel_antiguedad_stats();
  
  -- Combinar todo
  RETURN jsonb_build_object(
    'distribucion', distribucion,
    'distribucionPorArea', COALESCE(distribucion_por_area, '[]'::jsonb),
    'distribucionPorNivel', COALESCE(distribucion_por_nivel, '[]'::jsonb),
    'correlacionDesempeno', correlacion,
    'distribucion9Box', distribucion_9box,
    'retencion', retencion,
    'tiempoPromedioPorArea', tiempo_area,
    'estadisticasPorNivel', stats_nivel
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_antiguedad_completa_stats(UUID) IS 'Estadísticas completas de antigüedad - SOLUCIÓN FINAL sin anidación';