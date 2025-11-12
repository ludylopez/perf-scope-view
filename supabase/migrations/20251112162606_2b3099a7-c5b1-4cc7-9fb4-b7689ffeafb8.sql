-- Migración: Corregir anidación de agregados en funciones de antigüedad y género

-- 1. Corregir get_tiempo_promedio_por_area
CREATE OR REPLACE FUNCTION get_tiempo_promedio_por_area()
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  WITH user_antiguedad AS (
    SELECT 
      dpi,
      area,
      calcular_antiguedad_meses(dpi) as meses_antiguedad,
      fecha_ingreso
    FROM users
    WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe')
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'area', area,
      'promedioMeses', COALESCE(AVG(meses_antiguedad) FILTER (WHERE fecha_ingreso IS NOT NULL), 0),
      'totalColaboradores', COUNT(*),
      'conFechaIngreso', COUNT(*) FILTER (WHERE fecha_ingreso IS NOT NULL)
    )
    ORDER BY area
  ) INTO resultados
  FROM user_antiguedad
  GROUP BY area;
  
  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_tiempo_promedio_por_area() IS 'Tiempo promedio de antigüedad por área - CORREGIDA anidación';

-- 2. Corregir get_nivel_antiguedad_stats
CREATE OR REPLACE FUNCTION get_nivel_antiguedad_stats()
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  WITH user_antiguedad AS (
    SELECT 
      dpi,
      nivel,
      calcular_antiguedad_meses(dpi) as meses_antiguedad,
      fecha_ingreso
    FROM users
    WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe')
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'nivel', nivel,
      'promedioAntiguedad', AVG(meses_antiguedad) FILTER (WHERE fecha_ingreso IS NOT NULL),
      'totalColaboradores', COUNT(*),
      'conFechaIngreso', COUNT(*) FILTER (WHERE fecha_ingreso IS NOT NULL),
      'distribucionAntiguedad', jsonb_build_object(
        'rango0_3', COUNT(*) FILTER (WHERE meses_antiguedad >= 0 AND meses_antiguedad < 3),
        'rango3_6', COUNT(*) FILTER (WHERE meses_antiguedad >= 3 AND meses_antiguedad < 6),
        'rango6_12', COUNT(*) FILTER (WHERE meses_antiguedad >= 6 AND meses_antiguedad < 12),
        'rango1_3', COUNT(*) FILTER (WHERE meses_antiguedad >= 12 AND meses_antiguedad < 36),
        'rango3_plus', COUNT(*) FILTER (WHERE meses_antiguedad >= 36)
      )
    )
    ORDER BY nivel
  ) INTO resultados
  FROM user_antiguedad
  GROUP BY nivel;
  
  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_nivel_antiguedad_stats() IS 'Estadísticas de antigüedad por nivel - CORREGIDA anidación';