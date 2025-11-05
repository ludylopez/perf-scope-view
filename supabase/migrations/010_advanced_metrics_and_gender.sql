-- Migración: Agregar campo sexo/género y funciones para métricas avanzadas del dashboard
-- Permite análisis de género y métricas de antigüedad/desempeño

-- 1. Agregar campo sexo/género a la tabla users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS genero VARCHAR(20) CHECK (genero IN ('masculino', 'femenino', 'otro', 'prefiero_no_decir'));

COMMENT ON COLUMN users.genero IS 'Género del colaborador para análisis estadísticos';

-- Índice para mejorar consultas por género
CREATE INDEX IF NOT EXISTS idx_users_genero ON users(genero);

-- 2. Función para obtener estadísticas de elegibilidad
CREATE OR REPLACE FUNCTION get_eligibility_stats()
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
  total_activos INTEGER;
  elegibles INTEGER;
  no_elegibles INTEGER;
  sin_fecha_ingreso INTEGER;
  sin_tipo_puesto INTEGER;
  antiguedad_insuficiente INTEGER;
  elegibles_administrativos INTEGER;
  elegibles_operativos INTEGER;
BEGIN
  -- Total activos
  SELECT COUNT(*) INTO total_activos
  FROM users
  WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe');
  
  -- Elegibles (con fecha_ingreso, tipo_puesto y antigüedad suficiente)
  SELECT COUNT(*) INTO elegibles
  FROM users u
  WHERE u.estado = 'activo' 
    AND u.rol IN ('colaborador', 'jefe')
    AND u.fecha_ingreso IS NOT NULL
    AND u.tipo_puesto IS NOT NULL
    AND calcular_antiguedad_meses(u.dpi) >= CASE 
      WHEN u.tipo_puesto = 'administrativo' THEN 3
      WHEN u.tipo_puesto = 'operativo' THEN 6
      ELSE 999
    END;
  
  -- Sin fecha de ingreso
  SELECT COUNT(*) INTO sin_fecha_ingreso
  FROM users
  WHERE estado = 'activo' 
    AND rol IN ('colaborador', 'jefe')
    AND fecha_ingreso IS NULL;
  
  -- Sin tipo de puesto
  SELECT COUNT(*) INTO sin_tipo_puesto
  FROM users
  WHERE estado = 'activo' 
    AND rol IN ('colaborador', 'jefe')
    AND tipo_puesto IS NULL;
  
  -- Antigüedad insuficiente
  SELECT COUNT(*) INTO antiguedad_insuficiente
  FROM users u
  WHERE u.estado = 'activo' 
    AND u.rol IN ('colaborador', 'jefe')
    AND u.fecha_ingreso IS NOT NULL
    AND u.tipo_puesto IS NOT NULL
    AND calcular_antiguedad_meses(u.dpi) < CASE 
      WHEN u.tipo_puesto = 'administrativo' THEN 3
      WHEN u.tipo_puesto = 'operativo' THEN 6
      ELSE 999
    END;
  
  -- Elegibles administrativos
  SELECT COUNT(*) INTO elegibles_administrativos
  FROM users u
  WHERE u.estado = 'activo' 
    AND u.rol IN ('colaborador', 'jefe')
    AND u.tipo_puesto = 'administrativo'
    AND u.fecha_ingreso IS NOT NULL
    AND calcular_antiguedad_meses(u.dpi) >= 3;
  
  -- Elegibles operativos
  SELECT COUNT(*) INTO elegibles_operativos
  FROM users u
  WHERE u.estado = 'activo' 
    AND u.rol IN ('colaborador', 'jefe')
    AND u.tipo_puesto = 'operativo'
    AND u.fecha_ingreso IS NOT NULL
    AND calcular_antiguedad_meses(u.dpi) >= 6;
  
  no_elegibles := sin_fecha_ingreso + sin_tipo_puesto + antiguedad_insuficiente;
  
  SELECT jsonb_build_object(
    'totalActivos', total_activos,
    'elegibles', elegibles,
    'noElegibles', no_elegibles,
    'sinFechaIngreso', sin_fecha_ingreso,
    'sinTipoPuesto', sin_tipo_puesto,
    'antiguedadInsuficiente', antiguedad_insuficiente,
    'elegiblesAdministrativos', elegibles_administrativos,
    'elegiblesOperativos', elegibles_operativos,
    'porcentajeElegibles', CASE 
      WHEN total_activos > 0 THEN ROUND((elegibles::NUMERIC / total_activos::NUMERIC) * 100, 2)
      ELSE 0
    END
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_eligibility_stats() IS 'Obtiene estadísticas de elegibilidad para evaluación';

-- 3. Función para obtener distribución de antigüedad
CREATE OR REPLACE FUNCTION get_antiguedad_distribution()
RETURNS JSONB AS $$
DECLARE
  distribucion JSONB;
BEGIN
  SELECT jsonb_build_object(
    'rango0_3', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 0 AND calcular_antiguedad_meses(dpi) < 3),
    'rango3_6', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 3 AND calcular_antiguedad_meses(dpi) < 6),
    'rango6_12', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 6 AND calcular_antiguedad_meses(dpi) < 12),
    'rango1_3', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 12 AND calcular_antiguedad_meses(dpi) < 36),
    'rango3_5', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 36 AND calcular_antiguedad_meses(dpi) < 60),
    'rango5_plus', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 60),
    'sinFecha', COUNT(*) FILTER (WHERE fecha_ingreso IS NULL),
    'promedioMeses', COALESCE(AVG(calcular_antiguedad_meses(dpi)) FILTER (WHERE fecha_ingreso IS NOT NULL), 0)
  ) INTO distribucion
  FROM users
  WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe');
  
  RETURN distribucion;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_antiguedad_distribution() IS 'Distribución de colaboradores por rangos de antigüedad';

-- 4. Función para obtener tiempo promedio por área
CREATE OR REPLACE FUNCTION get_tiempo_promedio_por_area()
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'area', area,
      'promedioMeses', COALESCE(AVG(calcular_antiguedad_meses(dpi)) FILTER (WHERE fecha_ingreso IS NOT NULL), 0),
      'totalColaboradores', COUNT(*),
      'conFechaIngreso', COUNT(*) FILTER (WHERE fecha_ingreso IS NOT NULL)
    )
    ORDER BY area
  ) INTO resultados
  FROM users
  WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe')
  GROUP BY area;
  
  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_tiempo_promedio_por_area() IS 'Tiempo promedio de antigüedad por área';

-- 5. Función para obtener correlación antigüedad vs desempeño
CREATE OR REPLACE FUNCTION get_antiguedad_vs_desempeno(periodo_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'rangoAntiguedad', rango_antiguedad,
      'promedioDesempeno', promedio_desempeno,
      'promedioPotencial', promedio_potencial,
      'totalColaboradores', total_colaboradores,
      'promedioAntiguedadMeses', promedio_antiguedad_meses
    )
    ORDER BY orden
  ) INTO resultados
  FROM (
    SELECT 
      CASE 
        WHEN calcular_antiguedad_meses(u.dpi) < 3 THEN '0-3 meses'
        WHEN calcular_antiguedad_meses(u.dpi) < 6 THEN '3-6 meses'
        WHEN calcular_antiguedad_meses(u.dpi) < 12 THEN '6-12 meses'
        WHEN calcular_antiguedad_meses(u.dpi) < 36 THEN '1-3 años'
        WHEN calcular_antiguedad_meses(u.dpi) < 60 THEN '3-5 años'
        ELSE '5+ años'
      END as rango_antiguedad,
      CASE 
        WHEN calcular_antiguedad_meses(u.dpi) < 3 THEN 1
        WHEN calcular_antiguedad_meses(u.dpi) < 6 THEN 2
        WHEN calcular_antiguedad_meses(u.dpi) < 12 THEN 3
        WHEN calcular_antiguedad_meses(u.dpi) < 36 THEN 4
        WHEN calcular_antiguedad_meses(u.dpi) < 60 THEN 5
        ELSE 6
      END as orden,
      AVG(fer.desempeno_porcentaje) as promedio_desempeno,
      AVG(fer.potencial_porcentaje) as promedio_potencial,
      COUNT(*) as total_colaboradores,
      AVG(calcular_antiguedad_meses(u.dpi)) as promedio_antiguedad_meses
    FROM users u
    LEFT JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi 
      AND fer.periodo_id = periodo_id_param
    WHERE u.estado = 'activo' 
      AND u.rol IN ('colaborador', 'jefe')
      AND u.fecha_ingreso IS NOT NULL
      AND fer.desempeno_porcentaje IS NOT NULL
    GROUP BY 
      CASE 
        WHEN calcular_antiguedad_meses(u.dpi) < 3 THEN '0-3 meses'
        WHEN calcular_antiguedad_meses(u.dpi) < 6 THEN '3-6 meses'
        WHEN calcular_antiguedad_meses(u.dpi) < 12 THEN '6-12 meses'
        WHEN calcular_antiguedad_meses(u.dpi) < 36 THEN '1-3 años'
        WHEN calcular_antiguedad_meses(u.dpi) < 60 THEN '3-5 años'
        ELSE '5+ años'
      END,
      CASE 
        WHEN calcular_antiguedad_meses(u.dpi) < 3 THEN 1
        WHEN calcular_antiguedad_meses(u.dpi) < 6 THEN 2
        WHEN calcular_antiguedad_meses(u.dpi) < 12 THEN 3
        WHEN calcular_antiguedad_meses(u.dpi) < 36 THEN 4
        WHEN calcular_antiguedad_meses(u.dpi) < 60 THEN 5
        ELSE 6
      END
  ) rangos;
  
  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_antiguedad_vs_desempeno(UUID) IS 'Correlación entre antigüedad y desempeño por rangos';

-- 6. Función para obtener distribución 9-box por antigüedad
CREATE OR REPLACE FUNCTION get_9box_por_antiguedad(periodo_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'rangoAntiguedad', rango_antiguedad,
      'distribucion9Box', distribucion_9box
    )
    ORDER BY orden
  ) INTO resultados
  FROM (
    SELECT 
      CASE 
        WHEN calcular_antiguedad_meses(u.dpi) < 3 THEN '0-3 meses'
        WHEN calcular_antiguedad_meses(u.dpi) < 6 THEN '3-6 meses'
        WHEN calcular_antiguedad_meses(u.dpi) < 12 THEN '6-12 meses'
        WHEN calcular_antiguedad_meses(u.dpi) < 36 THEN '1-3 años'
        WHEN calcular_antiguedad_meses(u.dpi) < 60 THEN '3-5 años'
        ELSE '5+ años'
      END as rango_antiguedad,
      CASE 
        WHEN calcular_antiguedad_meses(u.dpi) < 3 THEN 1
        WHEN calcular_antiguedad_meses(u.dpi) < 6 THEN 2
        WHEN calcular_antiguedad_meses(u.dpi) < 12 THEN 3
        WHEN calcular_antiguedad_meses(u.dpi) < 36 THEN 4
        WHEN calcular_antiguedad_meses(u.dpi) < 60 THEN 5
        ELSE 6
      END as orden,
      jsonb_object_agg(
        COALESCE(fer.posicion_9box, 'sin-calcular'),
        COUNT(*)
      ) as distribucion_9box
    FROM users u
    LEFT JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi 
      AND fer.periodo_id = periodo_id_param
    WHERE u.estado = 'activo' 
      AND u.rol IN ('colaborador', 'jefe')
      AND u.fecha_ingreso IS NOT NULL
    GROUP BY 
      CASE 
        WHEN calcular_antiguedad_meses(u.dpi) < 3 THEN '0-3 meses'
        WHEN calcular_antiguedad_meses(u.dpi) < 6 THEN '3-6 meses'
        WHEN calcular_antiguedad_meses(u.dpi) < 12 THEN '6-12 meses'
        WHEN calcular_antiguedad_meses(u.dpi) < 36 THEN '1-3 años'
        WHEN calcular_antiguedad_meses(u.dpi) < 60 THEN '3-5 años'
        ELSE '5+ años'
      END,
      CASE 
        WHEN calcular_antiguedad_meses(u.dpi) < 3 THEN 1
        WHEN calcular_antiguedad_meses(u.dpi) < 6 THEN 2
        WHEN calcular_antiguedad_meses(u.dpi) < 12 THEN 3
        WHEN calcular_antiguedad_meses(u.dpi) < 36 THEN 4
        WHEN calcular_antiguedad_meses(u.dpi) < 60 THEN 5
        ELSE 6
      END
  ) rangos;
  
  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_9box_por_antiguedad(UUID) IS 'Distribución 9-box por rangos de antigüedad';

-- 7. Función para obtener estadísticas por género
CREATE OR REPLACE FUNCTION get_genero_stats(periodo_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'genero', COALESCE(genero, 'no_especificado'),
      'totalColaboradores', COUNT(*),
      'evaluacionesCompletadas', COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM evaluations e 
        WHERE e.colaborador_id = u.dpi 
        AND e.periodo_id = periodo_id_param 
        AND e.tipo = 'jefe' 
        AND e.estado = 'enviado'
      )),
      'promedioDesempeno', AVG(fer.desempeno_porcentaje) FILTER (WHERE fer.desempeno_porcentaje IS NOT NULL),
      'promedioPotencial', AVG(fer.potencial_porcentaje) FILTER (WHERE fer.potencial_porcentaje IS NOT NULL),
      'promedioAntiguedad', AVG(calcular_antiguedad_meses(u.dpi)) FILTER (WHERE fecha_ingreso IS NOT NULL),
      'distribucion9Box', jsonb_object_agg(
        COALESCE(fer.posicion_9box, 'sin-calcular'),
        COUNT(*)
      )
    )
  ) INTO resultados
  FROM users u
  LEFT JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi 
    AND fer.periodo_id = periodo_id_param
  WHERE u.estado = 'activo' AND u.rol IN ('colaborador', 'jefe')
  GROUP BY u.genero;
  
  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_genero_stats(UUID) IS 'Estadísticas de desempeño y distribución por género';

-- 8. Función para obtener estadísticas por nivel y antigüedad
CREATE OR REPLACE FUNCTION get_nivel_antiguedad_stats()
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'nivel', nivel,
      'promedioAntiguedad', AVG(calcular_antiguedad_meses(dpi)) FILTER (WHERE fecha_ingreso IS NOT NULL),
      'totalColaboradores', COUNT(*),
      'conFechaIngreso', COUNT(*) FILTER (WHERE fecha_ingreso IS NOT NULL),
      'distribucionAntiguedad', jsonb_build_object(
        'rango0_3', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 0 AND calcular_antiguedad_meses(dpi) < 3),
        'rango3_6', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 3 AND calcular_antiguedad_meses(dpi) < 6),
        'rango6_12', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 6 AND calcular_antiguedad_meses(dpi) < 12),
        'rango1_3', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 12 AND calcular_antiguedad_meses(dpi) < 36),
        'rango3_plus', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 36)
      )
    )
    ORDER BY nivel
  ) INTO resultados
  FROM users
  WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe')
  GROUP BY nivel;
  
  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_nivel_antiguedad_stats() IS 'Estadísticas de antigüedad por nivel organizacional';

-- 9. Función para obtener estadísticas de rotación por área
CREATE OR REPLACE FUNCTION get_rotacion_stats()
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'area', area,
      'totalColaboradores', COUNT(*),
      'promedioAntiguedad', AVG(calcular_antiguedad_meses(dpi)) FILTER (WHERE fecha_ingreso IS NOT NULL),
      'colaboradoresNuevos', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) < 6),
      'colaboradoresEstables', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 12),
      'colaboradoresVeteranos', COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 36),
      'tasaEstabilidad', CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 12)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
        ELSE 0
      END
    )
    ORDER BY area
  ) INTO resultados
  FROM users
  WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe')
  GROUP BY area;
  
  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_rotacion_stats() IS 'Estadísticas de rotación y estabilidad por área';

-- 10. Función completa de métricas avanzadas para dashboard
CREATE OR REPLACE FUNCTION get_advanced_dashboard_stats(periodo_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'elegibilidad', get_eligibility_stats(),
    'antiguedadDistribution', get_antiguedad_distribution(),
    'tiempoPromedioPorArea', get_tiempo_promedio_por_area(),
    'antiguedadVsDesempeno', get_antiguedad_vs_desempeno(periodo_id_param),
    'nueveBoxPorAntiguedad', get_9box_por_antiguedad(periodo_id_param),
    'generoStats', get_genero_stats(periodo_id_param),
    'nivelAntiguedadStats', get_nivel_antiguedad_stats(),
    'rotacionStats', get_rotacion_stats()
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_advanced_dashboard_stats(UUID) IS 'Obtiene todas las métricas avanzadas del dashboard en una sola llamada';

