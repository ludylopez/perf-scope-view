-- Migración: Mejora y expansión de estadísticas de Antigüedad y Equidad
-- Agrega métricas más completas y relevantes para análisis de RRHH

-- 1. Función mejorada para estadísticas completas de antigüedad
CREATE OR REPLACE FUNCTION get_antiguedad_completa_stats(periodo_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    -- Distribución general
    'distribucion', get_antiguedad_distribution(),
    
    -- Distribución por área
    'distribucionPorArea', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'area', area,
          'totalColaboradores', COUNT(*),
          'promedioAntiguedad', COALESCE(AVG(calcular_antiguedad_meses(dpi)) FILTER (WHERE fecha_ingreso IS NOT NULL), 0),
          'rango0_3', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 0 AND calcular_antiguedad_meses(dpi) < 3),
          'rango3_6', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 3 AND calcular_antiguedad_meses(dpi) < 6),
          'rango6_12', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 6 AND calcular_antiguedad_meses(dpi) < 12),
          'rango1_3', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 12 AND calcular_antiguedad_meses(dpi) < 36),
          'rango3_5', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 36 AND calcular_antiguedad_meses(dpi) < 60),
          'rango5_plus', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 60),
          'sinFecha', COUNT(*) FILTER (WHERE fecha_ingreso IS NULL),
          'tasaRetencion', CASE 
            WHEN COUNT(*) > 0 THEN 
              ROUND((COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 12)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
            ELSE 0
          END
        )
        ORDER BY area
      )
      FROM users
      WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe')
      GROUP BY area
    ),
    
    -- Distribución por nivel
    'distribucionPorNivel', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'nivel', nivel,
          'totalColaboradores', COUNT(*),
          'promedioAntiguedad', COALESCE(AVG(calcular_antiguedad_meses(dpi)) FILTER (WHERE fecha_ingreso IS NOT NULL), 0),
          'rango0_3', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 0 AND calcular_antiguedad_meses(dpi) < 3),
          'rango3_6', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 3 AND calcular_antiguedad_meses(dpi) < 6),
          'rango6_12', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 6 AND calcular_antiguedad_meses(dpi) < 12),
          'rango1_3', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 12 AND calcular_antiguedad_meses(dpi) < 36),
          'rango3_5', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 36 AND calcular_antiguedad_meses(dpi) < 60),
          'rango5_plus', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 60),
          'sinFecha', COUNT(*) FILTER (WHERE fecha_ingreso IS NULL)
        )
        ORDER BY nivel
      )
      FROM users
      WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe')
      GROUP BY nivel
    ),
    
    -- Correlación antigüedad vs desempeño
    'correlacionDesempeno', get_antiguedad_vs_desempeno(periodo_id_param),
    
    -- Distribución 9-box por antigüedad
    'distribucion9Box', get_9box_por_antiguedad(periodo_id_param),
    
    -- Estadísticas de retención
    'retencion', (
      SELECT jsonb_build_object(
        'tasaRetencionGeneral', CASE 
          WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 12)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
          ELSE 0
        END,
        'tasaRetencion3Anos', CASE 
          WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 36)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
          ELSE 0
        END,
        'colaboradoresNuevos', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) < 6),
        'colaboradoresEstables', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 12),
        'colaboradoresVeteranos', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 36)
      )
      FROM users
      WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe') AND fecha_ingreso IS NOT NULL
    ),
    
    -- Tiempo promedio por área
    'tiempoPromedioPorArea', get_tiempo_promedio_por_area(),
    
    -- Estadísticas por nivel
    'estadisticasPorNivel', get_nivel_antiguedad_stats()
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_antiguedad_completa_stats(UUID) IS 'Obtiene estadísticas completas de antigüedad con todas las métricas relevantes';

-- 2. Función mejorada para estadísticas completas de equidad (género)
CREATE OR REPLACE FUNCTION get_equidad_completa_stats(periodo_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
  total_activos INTEGER;
  total_masculino INTEGER;
  total_femenino INTEGER;
  total_otro INTEGER;
  total_no_especificado INTEGER;
BEGIN
  -- Totales por género
  SELECT 
    COUNT(*) FILTER (WHERE genero = 'masculino'),
    COUNT(*) FILTER (WHERE genero = 'femenino'),
    COUNT(*) FILTER (WHERE genero IN ('otro', 'prefiero_no_decir')),
    COUNT(*) FILTER (WHERE genero IS NULL)
  INTO total_masculino, total_femenino, total_otro, total_no_especificado
  FROM users
  WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe');
  
  total_activos := total_masculino + total_femenino + total_otro + total_no_especificado;
  
  SELECT jsonb_build_object(
    -- Estadísticas generales por género
    'estadisticasGenerales', get_genero_stats(periodo_id_param),
    
    -- Distribución por género en áreas
    'distribucionPorArea', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'area', area,
          'totalColaboradores', COUNT(*),
          'masculino', COUNT(*) FILTER (WHERE genero = 'masculino'),
          'femenino', COUNT(*) FILTER (WHERE genero = 'femenino'),
          'otro', COUNT(*) FILTER (WHERE genero IN ('otro', 'prefiero_no_decir')),
          'noEspecificado', COUNT(*) FILTER (WHERE genero IS NULL),
          'porcentajeMasculino', CASE 
            WHEN COUNT(*) > 0 THEN 
              ROUND((COUNT(*) FILTER (WHERE genero = 'masculino')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
            ELSE 0
          END,
          'porcentajeFemenino', CASE 
            WHEN COUNT(*) > 0 THEN 
              ROUND((COUNT(*) FILTER (WHERE genero = 'femenino')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
            ELSE 0
          END,
          'indiceParidad', CASE 
            WHEN COUNT(*) > 0 THEN 
              ROUND(LEAST(
                (COUNT(*) FILTER (WHERE genero = 'femenino')::NUMERIC / COUNT(*)::NUMERIC) * 100,
                (COUNT(*) FILTER (WHERE genero = 'masculino')::NUMERIC / COUNT(*)::NUMERIC) * 100
              ) * 2, 100)
            ELSE 0
          END
        )
        ORDER BY area
      )
      FROM users
      WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe')
      GROUP BY area
    ),
    
    -- Distribución por género en niveles
    'distribucionPorNivel', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'nivel', nivel,
          'totalColaboradores', COUNT(*),
          'masculino', COUNT(*) FILTER (WHERE genero = 'masculino'),
          'femenino', COUNT(*) FILTER (WHERE genero = 'femenino'),
          'otro', COUNT(*) FILTER (WHERE genero IN ('otro', 'prefiero_no_decir')),
          'noEspecificado', COUNT(*) FILTER (WHERE genero IS NULL),
          'porcentajeMasculino', CASE 
            WHEN COUNT(*) > 0 THEN 
              ROUND((COUNT(*) FILTER (WHERE genero = 'masculino')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
            ELSE 0
          END,
          'porcentajeFemenino', CASE 
            WHEN COUNT(*) > 0 THEN 
              ROUND((COUNT(*) FILTER (WHERE genero = 'femenino')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
            ELSE 0
          END
        )
        ORDER BY nivel
      )
      FROM users
      WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe')
      GROUP BY nivel
    ),
    
    -- Desempeño por género y área
    'desempenoPorGeneroArea', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'area', area,
          'genero', COALESCE(genero, 'no_especificado'),
          'promedioDesempeno', AVG(fer.desempeno_porcentaje) FILTER (WHERE fer.desempeno_porcentaje IS NOT NULL),
          'promedioPotencial', AVG(fer.potencial_porcentaje) FILTER (WHERE fer.potencial_porcentaje IS NOT NULL),
          'totalColaboradores', COUNT(DISTINCT u.dpi),
          'evaluacionesCompletadas', COUNT(DISTINCT fer.colaborador_id) FILTER (WHERE fer.periodo_id = periodo_id_param)
        )
        ORDER BY area, genero
      )
      FROM users u
      LEFT JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi 
        AND fer.periodo_id = periodo_id_param
      WHERE u.estado = 'activo' AND u.rol IN ('colaborador', 'jefe')
      GROUP BY area, genero
    ),
    
    -- Desempeño por género y nivel
    'desempenoPorGeneroNivel', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'nivel', nivel,
          'genero', COALESCE(genero, 'no_especificado'),
          'promedioDesempeno', AVG(fer.desempeno_porcentaje) FILTER (WHERE fer.desempeno_porcentaje IS NOT NULL),
          'promedioPotencial', AVG(fer.potencial_porcentaje) FILTER (WHERE fer.potencial_porcentaje IS NOT NULL),
          'totalColaboradores', COUNT(DISTINCT u.dpi),
          'evaluacionesCompletadas', COUNT(DISTINCT fer.colaborador_id) FILTER (WHERE fer.periodo_id = periodo_id_param)
        )
        ORDER BY nivel, genero
      )
      FROM users u
      LEFT JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi 
        AND fer.periodo_id = periodo_id_param
      WHERE u.estado = 'activo' AND u.rol IN ('colaborador', 'jefe')
      GROUP BY nivel, genero
    ),
    
    -- Liderazgo por género
    'liderazgoPorGenero', (
      SELECT jsonb_build_object(
        'totalJefes', COUNT(*),
        'jefesMasculino', COUNT(*) FILTER (WHERE genero = 'masculino'),
        'jefesFemenino', COUNT(*) FILTER (WHERE genero = 'femenino'),
        'jefesOtro', COUNT(*) FILTER (WHERE genero IN ('otro', 'prefiero_no_decir')),
        'jefesNoEspecificado', COUNT(*) FILTER (WHERE genero IS NULL),
        'porcentajeJefesMasculino', CASE 
          WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(*) FILTER (WHERE genero = 'masculino')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
          ELSE 0
        END,
        'porcentajeJefesFemenino', CASE 
          WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(*) FILTER (WHERE genero = 'femenino')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
          ELSE 0
        END,
        'indiceParidadLiderazgo', CASE 
          WHEN COUNT(*) > 0 THEN 
            ROUND(LEAST(
              (COUNT(*) FILTER (WHERE genero = 'femenino')::NUMERIC / COUNT(*)::NUMERIC) * 100,
              (COUNT(*) FILTER (WHERE genero = 'masculino')::NUMERIC / COUNT(*)::NUMERIC) * 100
            ) * 2, 100)
          ELSE 0
        END
      )
      FROM users
      WHERE estado = 'activo' AND rol = 'jefe'
    ),
    
    -- Índices de equidad
    'indicesEquidad', (
      SELECT jsonb_build_object(
        'indiceParidadGeneral', CASE 
          WHEN total_activos > 0 THEN 
            ROUND(LEAST(
              (total_femenino::NUMERIC / total_activos::NUMERIC) * 100,
              (total_masculino::NUMERIC / total_activos::NUMERIC) * 100
            ) * 2, 100)
          ELSE 0
        END,
        'distribucionGeneral', jsonb_build_object(
          'masculino', total_masculino,
          'femenino', total_femenino,
          'otro', total_otro,
          'noEspecificado', total_no_especificado,
          'porcentajeMasculino', CASE 
            WHEN total_activos > 0 THEN ROUND((total_masculino::NUMERIC / total_activos::NUMERIC) * 100, 2)
            ELSE 0
          END,
          'porcentajeFemenino', CASE 
            WHEN total_activos > 0 THEN ROUND((total_femenino::NUMERIC / total_activos::NUMERIC) * 100, 2)
            ELSE 0
          END
        )
      )
    ),
    
    -- Brechas de desempeño
    'brechasDesempeno', (
      WITH desempeno_genero AS (
        SELECT 
          genero,
          AVG(desempeno_porcentaje) as promedio_desempeno,
          AVG(potencial_porcentaje) as promedio_potencial
        FROM users u
        INNER JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi
        WHERE u.estado = 'activo' 
          AND u.rol IN ('colaborador', 'jefe')
          AND fer.periodo_id = periodo_id_param
          AND fer.desempeno_porcentaje IS NOT NULL
        GROUP BY genero
      )
      SELECT jsonb_build_object(
        'brechaDesempeno', COALESCE(
          (SELECT promedio_desempeno FROM desempeno_genero WHERE genero = 'masculino') - 
          (SELECT promedio_desempeno FROM desempeno_genero WHERE genero = 'femenino'),
          0
        ),
        'brechaPotencial', COALESCE(
          (SELECT promedio_potencial FROM desempeno_genero WHERE genero = 'masculino') - 
          (SELECT promedio_potencial FROM desempeno_genero WHERE genero = 'femenino'),
          0
        ),
        'promedioMasculino', COALESCE((SELECT promedio_desempeno FROM desempeno_genero WHERE genero = 'masculino'), 0),
        'promedioFemenino', COALESCE((SELECT promedio_desempeno FROM desempeno_genero WHERE genero = 'femenino'), 0)
      )
    )
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_equidad_completa_stats(UUID) IS 'Obtiene estadísticas completas de equidad de género con todas las métricas relevantes';

-- 3. Actualizar función get_advanced_dashboard_stats para incluir las nuevas funciones
CREATE OR REPLACE FUNCTION get_advanced_dashboard_stats(periodo_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'elegibilidad', get_eligibility_stats(),
    'antiguedadDistribution', get_antiguedad_distribution(),
    'antiguedadCompleta', get_antiguedad_completa_stats(periodo_id_param),
    'tiempoPromedioPorArea', get_tiempo_promedio_por_area(),
    'antiguedadVsDesempeno', get_antiguedad_vs_desempeno(periodo_id_param),
    'nueveBoxPorAntiguedad', get_9box_por_antiguedad(periodo_id_param),
    'generoStats', get_genero_stats(periodo_id_param),
    'equidadCompleta', get_equidad_completa_stats(periodo_id_param),
    'nivelAntiguedadStats', get_nivel_antiguedad_stats(),
    'rotacionStats', get_rotacion_stats()
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_advanced_dashboard_stats(UUID) IS 'Obtiene todas las métricas avanzadas del dashboard incluyendo estadísticas completas de antigüedad y equidad';

