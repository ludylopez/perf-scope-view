-- Migración: Corregir anidación de funciones agregadas en get_antiguedad_completa_stats
-- Error: aggregate function calls cannot be nested

CREATE OR REPLACE FUNCTION get_antiguedad_completa_stats(periodo_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    -- Distribución general
    'distribucion', get_antiguedad_distribution(),
    
    -- Distribución por área con CTE para evitar anidación
    'distribucionPorArea', (
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
          'totalColaboradores', COUNT(*),
          'promedioAntiguedad', COALESCE(AVG(meses_antiguedad) FILTER (WHERE fecha_ingreso IS NOT NULL), 0),
          'rango0_3', COUNT(*) FILTER (WHERE meses_antiguedad >= 0 AND meses_antiguedad < 3),
          'rango3_6', COUNT(*) FILTER (WHERE meses_antiguedad >= 3 AND meses_antiguedad < 6),
          'rango6_12', COUNT(*) FILTER (WHERE meses_antiguedad >= 6 AND meses_antiguedad < 12),
          'rango1_3', COUNT(*) FILTER (WHERE meses_antiguedad >= 12 AND meses_antiguedad < 36),
          'rango3_5', COUNT(*) FILTER (WHERE meses_antiguedad >= 36 AND meses_antiguedad < 60),
          'rango5_plus', COUNT(*) FILTER (WHERE meses_antiguedad >= 60),
          'sinFecha', COUNT(*) FILTER (WHERE fecha_ingreso IS NULL),
          'tasaRetencion', CASE 
            WHEN COUNT(*) > 0 THEN 
              ROUND((COUNT(*) FILTER (WHERE meses_antiguedad >= 12)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
            ELSE 0
          END
        )
        ORDER BY area
      )
      FROM user_antiguedad
      GROUP BY area
    ),
    
    -- Distribución por nivel con CTE
    'distribucionPorNivel', (
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
          'totalColaboradores', COUNT(*),
          'promedioAntiguedad', COALESCE(AVG(meses_antiguedad) FILTER (WHERE fecha_ingreso IS NOT NULL), 0),
          'rango0_3', COUNT(*) FILTER (WHERE meses_antiguedad >= 0 AND meses_antiguedad < 3),
          'rango3_6', COUNT(*) FILTER (WHERE meses_antiguedad >= 3 AND meses_antiguedad < 6),
          'rango6_12', COUNT(*) FILTER (WHERE meses_antiguedad >= 6 AND meses_antiguedad < 12),
          'rango1_3', COUNT(*) FILTER (WHERE meses_antiguedad >= 12 AND meses_antiguedad < 36),
          'rango3_5', COUNT(*) FILTER (WHERE meses_antiguedad >= 36 AND meses_antiguedad < 60),
          'rango5_plus', COUNT(*) FILTER (WHERE meses_antiguedad >= 60),
          'sinFecha', COUNT(*) FILTER (WHERE fecha_ingreso IS NULL)
        )
        ORDER BY nivel
      )
      FROM user_antiguedad
      GROUP BY nivel
    ),
    
    -- Correlación antigüedad vs desempeño
    'correlacionDesempeno', get_antiguedad_vs_desempeno(periodo_id_param),
    
    -- Distribución 9-box por antigüedad
    'distribucion9Box', get_9box_por_antiguedad(periodo_id_param),
    
    -- Estadísticas de retención con CTE
    'retencion', (
      WITH user_antiguedad AS (
        SELECT 
          dpi,
          calcular_antiguedad_meses(dpi) as meses_antiguedad
        FROM users
        WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe') AND fecha_ingreso IS NOT NULL
      )
      SELECT jsonb_build_object(
        'tasaRetencionGeneral', CASE 
          WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(*) FILTER (WHERE meses_antiguedad >= 12)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
          ELSE 0
        END,
        'tasaRetencion3Anos', CASE 
          WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(*) FILTER (WHERE meses_antiguedad >= 36)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
          ELSE 0
        END,
        'colaboradoresNuevos', COUNT(*) FILTER (WHERE meses_antiguedad < 6),
        'colaboradoresEstables', COUNT(*) FILTER (WHERE meses_antiguedad >= 12),
        'colaboradoresVeteranos', COUNT(*) FILTER (WHERE meses_antiguedad >= 36)
      )
      FROM user_antiguedad
    ),
    
    -- Tiempo promedio por área
    'tiempoPromedioPorArea', get_tiempo_promedio_por_area(),
    
    -- Estadísticas por nivel
    'estadisticasPorNivel', get_nivel_antiguedad_stats()
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_antiguedad_completa_stats(UUID) IS 'Estadísticas completas de antigüedad usando CTEs para evitar anidación de agregados - CORREGIDA';