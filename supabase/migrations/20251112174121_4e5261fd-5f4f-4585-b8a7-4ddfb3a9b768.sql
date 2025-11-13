-- Reescritura para evitar agregados anidados en funciones de Antigüedad
-- 1) get_antiguedad_completa_stats(periodo_id_param uuid)
CREATE OR REPLACE FUNCTION public.get_antiguedad_completa_stats(periodo_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
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
  -- Distribución simple (ya funciona)
  distribucion := get_antiguedad_distribution();

  -- Distribución por área (evitar agregados anidados)
  WITH user_antiguedad AS (
    SELECT dpi, area, calcular_antiguedad_meses(dpi) AS meses_antiguedad, fecha_ingreso
    FROM users 
    WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe')
  ), area_stats AS (
    SELECT 
      area,
      COUNT(*) AS total_colaboradores,
      AVG(meses_antiguedad) FILTER (WHERE fecha_ingreso IS NOT NULL) AS promedio_antiguedad,
      COUNT(*) FILTER (WHERE meses_antiguedad >= 0  AND meses_antiguedad < 3)  AS rango0_3,
      COUNT(*) FILTER (WHERE meses_antiguedad >= 3  AND meses_antiguedad < 6)  AS rango3_6,
      COUNT(*) FILTER (WHERE meses_antiguedad >= 6  AND meses_antiguedad < 12) AS rango6_12,
      COUNT(*) FILTER (WHERE meses_antiguedad >= 12 AND meses_antiguedad < 36) AS rango1_3,
      COUNT(*) FILTER (WHERE meses_antiguedad >= 36 AND meses_antiguedad < 60) AS rango3_5,
      COUNT(*) FILTER (WHERE meses_antiguedad >= 60) AS rango5_plus,
      COUNT(*) FILTER (WHERE fecha_ingreso IS NULL) AS sin_fecha,
      CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE meses_antiguedad >= 12)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
           ELSE 0 END AS tasa_retencion
    FROM user_antiguedad
    GROUP BY area
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'area', area,
      'totalColaboradores', total_colaboradores,
      'promedioAntiguedad', COALESCE(promedio_antiguedad, 0),
      'rango0_3', rango0_3,
      'rango3_6', rango3_6,
      'rango6_12', rango6_12,
      'rango1_3', rango1_3,
      'rango3_5', rango3_5,
      'rango5_plus', rango5_plus,
      'sinFecha', sin_fecha,
      'tasaRetencion', tasa_retencion
    )
    ORDER BY area
  ) INTO distribucion_por_area
  FROM area_stats;

  -- Distribución por nivel (evitar agregados anidados)
  WITH user_antiguedad AS (
    SELECT dpi, nivel, calcular_antiguedad_meses(dpi) AS meses_antiguedad, fecha_ingreso
    FROM users 
    WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe')
  ), nivel_stats AS (
    SELECT 
      nivel,
      COUNT(*) AS total_colaboradores,
      AVG(meses_antiguedad) FILTER (WHERE fecha_ingreso IS NOT NULL) AS promedio_antiguedad,
      COUNT(*) FILTER (WHERE meses_antiguedad >= 0  AND meses_antiguedad < 3)  AS rango0_3,
      COUNT(*) FILTER (WHERE meses_antiguedad >= 3  AND meses_antiguedad < 6)  AS rango3_6,
      COUNT(*) FILTER (WHERE meses_antiguedad >= 6  AND meses_antiguedad < 12) AS rango6_12,
      COUNT(*) FILTER (WHERE meses_antiguedad >= 12 AND meses_antiguedad < 36) AS rango1_3,
      COUNT(*) FILTER (WHERE meses_antiguedad >= 36 AND meses_antiguedad < 60) AS rango3_5,
      COUNT(*) FILTER (WHERE meses_antiguedad >= 60) AS rango5_plus,
      COUNT(*) FILTER (WHERE fecha_ingreso IS NULL) AS sin_fecha
    FROM user_antiguedad
    GROUP BY nivel
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'nivel', nivel,
      'totalColaboradores', total_colaboradores,
      'promedioAntiguedad', COALESCE(promedio_antiguedad, 0),
      'rango0_3', rango0_3,
      'rango3_6', rango3_6,
      'rango6_12', rango6_12,
      'rango1_3', rango1_3,
      'rango3_5', rango3_5,
      'rango5_plus', rango5_plus,
      'sinFecha', sin_fecha
    )
    ORDER BY nivel
  ) INTO distribucion_por_nivel
  FROM nivel_stats;

  -- Correlación y 9-box (ya existentes)
  correlacion := get_antiguedad_vs_desempeno(periodo_id_param);
  distribucion_9box := get_9box_por_antiguedad(periodo_id_param);

  -- Retención general (sin agregados anidados)
  WITH user_antiguedad AS (
    SELECT calcular_antiguedad_meses(dpi) AS meses_antiguedad
    FROM users 
    WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe') AND fecha_ingreso IS NOT NULL
  )
  SELECT jsonb_build_object(
    'tasaRetencionGeneral', CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE meses_antiguedad >= 12)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2) ELSE 0 END,
    'tasaRetencion3Anos', CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE meses_antiguedad >= 36)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2) ELSE 0 END,
    'colaboradoresNuevos', COUNT(*) FILTER (WHERE meses_antiguedad < 6),
    'colaboradoresEstables', COUNT(*) FILTER (WHERE meses_antiguedad >= 12),
    'colaboradoresVeteranos', COUNT(*) FILTER (WHERE meses_antiguedad >= 36)
  ) INTO retencion
  FROM user_antiguedad;

  -- Tiempo promedio por área y stats por nivel (funciones existentes)
  tiempo_area := get_tiempo_promedio_por_area();
  stats_nivel := get_nivel_antiguedad_stats();

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
$$;

-- 2) get_nivel_antiguedad_stats() reescrita para evitar agregados anidados
CREATE OR REPLACE FUNCTION public.get_nivel_antiguedad_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  resultados JSONB;
BEGIN
  WITH user_antiguedad AS (
    SELECT 
      dpi,
      nivel,
      calcular_antiguedad_meses(dpi) AS meses_antiguedad,
      fecha_ingreso
    FROM users
    WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe')
  ),
  nivel_agregado AS (
    SELECT 
      nivel,
      COUNT(*) AS total_colaboradores,
      COUNT(*) FILTER (WHERE fecha_ingreso IS NOT NULL) AS con_fecha_ingreso,
      AVG(meses_antiguedad) FILTER (WHERE fecha_ingreso IS NOT NULL) AS promedio_antiguedad,
      COUNT(*) FILTER (WHERE meses_antiguedad >= 0 AND meses_antiguedad < 3) AS rango0_3,
      COUNT(*) FILTER (WHERE meses_antiguedad >= 3 AND meses_antiguedad < 6) AS rango3_6,
      COUNT(*) FILTER (WHERE meses_antiguedad >= 6 AND meses_antiguedad < 12) AS rango6_12,
      COUNT(*) FILTER (WHERE meses_antiguedad >= 12 AND meses_antiguedad < 36) AS rango1_3,
      COUNT(*) FILTER (WHERE meses_antiguedad >= 36) AS rango3_plus
    FROM user_antiguedad
    GROUP BY nivel
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'nivel', nivel,
      'promedioAntiguedad', promedio_antiguedad,
      'totalColaboradores', total_colaboradores,
      'conFechaIngreso', con_fecha_ingreso,
      'distribucionAntiguedad', jsonb_build_object(
        'rango0_3', rango0_3,
        'rango3_6', rango3_6,
        'rango6_12', rango6_12,
        'rango1_3', rango1_3,
        'rango3_plus', rango3_plus
      )
    )
    ORDER BY nivel
  ) INTO resultados
  FROM nivel_agregado;

  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$;