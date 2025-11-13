-- Migración: Corregir anidación en get_equidad_completa_stats similar a get_antiguedad_completa_stats

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
    
    -- Distribución por género en áreas - sin cambios (ya es correcta)
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
    
    -- Distribución por género en niveles - sin cambios (ya es correcta)
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
    
    -- Liderazgo por género - sin cambios (ya es correcta)
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

COMMENT ON FUNCTION get_equidad_completa_stats(UUID) IS 'Estadísticas completas de equidad de género con correcciones de rendimiento';