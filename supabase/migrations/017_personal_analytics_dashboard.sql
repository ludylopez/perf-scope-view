-- Migración: Dashboard de Análisis de Personal para RRHH
-- Funciones SQL para obtener estadísticas demográficas y organizacionales

-- ============================================================
-- FUNCIÓN PRINCIPAL: get_personal_analytics
-- Retorna todas las estadísticas de personal en un solo objeto JSON
-- ============================================================

CREATE OR REPLACE FUNCTION get_personal_analytics()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  total_activos INTEGER;
  total_inactivos INTEGER;
  total_jefes INTEGER;
  total_colaboradores INTEGER;
  edad_promedio NUMERIC;
  antiguedad_promedio NUMERIC;

  -- Distribuciones
  por_genero JSONB;
  por_edad_rango JSONB;
  por_area JSONB;
  por_nivel JSONB;
  por_renglon JSONB;
  por_tipo_puesto JSONB;
  por_antiguedad_rango JSONB;
  por_profesion JSONB;
  top_cargos JSONB;

  -- Alertas
  proximos_jubilacion INTEGER;
  nuevos_ingresos INTEGER;
  veteranos INTEGER;
BEGIN
  -- ====================
  -- MÉTRICAS PRINCIPALES
  -- ====================

  -- Total de personal activo
  SELECT COUNT(*) INTO total_activos
  FROM users
  WHERE estado = 'activo';

  -- Total de personal inactivo
  SELECT COUNT(*) INTO total_inactivos
  FROM users
  WHERE estado = 'inactivo';

  -- Total de jefes
  SELECT COUNT(*) INTO total_jefes
  FROM users
  WHERE estado = 'activo' AND rol = 'jefe';

  -- Total de colaboradores
  SELECT COUNT(*) INTO total_colaboradores
  FROM users
  WHERE estado = 'activo' AND rol = 'colaborador';

  -- Edad promedio (calculada desde fecha_nacimiento)
  SELECT AVG(EXTRACT(YEAR FROM AGE(TO_DATE(fecha_nacimiento, 'DD/MM/YYYY'))))
  INTO edad_promedio
  FROM users
  WHERE estado = 'activo' AND fecha_nacimiento IS NOT NULL;

  -- Antigüedad promedio en años
  SELECT AVG(EXTRACT(YEAR FROM AGE(fecha_ingreso)))
  INTO antiguedad_promedio
  FROM users
  WHERE estado = 'activo' AND fecha_ingreso IS NOT NULL;

  -- ====================
  -- DISTRIBUCIÓN POR GÉNERO
  -- ====================

  SELECT jsonb_agg(
    jsonb_build_object(
      'genero', COALESCE(genero, 'no_especificado'),
      'cantidad', cantidad,
      'porcentaje', ROUND((cantidad::NUMERIC / total_activos::NUMERIC) * 100, 2)
    )
  ) INTO por_genero
  FROM (
    SELECT
      genero,
      COUNT(*) as cantidad
    FROM users
    WHERE estado = 'activo'
    GROUP BY genero
    ORDER BY COUNT(*) DESC
  ) g;

  -- ====================
  -- DISTRIBUCIÓN POR RANGO DE EDAD
  -- ====================

  SELECT jsonb_agg(
    jsonb_build_object(
      'rango', rango,
      'cantidad', cantidad,
      'porcentaje', ROUND((cantidad::NUMERIC / total_activos::NUMERIC) * 100, 2)
    )
    ORDER BY orden
  ) INTO por_edad_rango
  FROM (
    SELECT
      CASE
        WHEN edad < 25 THEN '18-24'
        WHEN edad >= 25 AND edad < 35 THEN '25-34'
        WHEN edad >= 35 AND edad < 45 THEN '35-44'
        WHEN edad >= 45 AND edad < 55 THEN '45-54'
        WHEN edad >= 55 AND edad < 65 THEN '55-64'
        ELSE '65+'
      END as rango,
      CASE
        WHEN edad < 25 THEN 1
        WHEN edad >= 25 AND edad < 35 THEN 2
        WHEN edad >= 35 AND edad < 45 THEN 3
        WHEN edad >= 45 AND edad < 55 THEN 4
        WHEN edad >= 55 AND edad < 65 THEN 5
        ELSE 6
      END as orden,
      COUNT(*) as cantidad
    FROM (
      SELECT EXTRACT(YEAR FROM AGE(TO_DATE(fecha_nacimiento, 'DD/MM/YYYY'))) as edad
      FROM users
      WHERE estado = 'activo' AND fecha_nacimiento IS NOT NULL
    ) edades
    GROUP BY rango, orden
  ) rangos;

  -- ====================
  -- DISTRIBUCIÓN POR ÁREA
  -- ====================

  SELECT jsonb_agg(
    jsonb_build_object(
      'area', area,
      'cantidad', cantidad,
      'porcentaje', ROUND((cantidad::NUMERIC / total_activos::NUMERIC) * 100, 2)
    )
    ORDER BY cantidad DESC
  ) INTO por_area
  FROM (
    SELECT
      COALESCE(area, 'Sin área') as area,
      COUNT(*) as cantidad
    FROM users
    WHERE estado = 'activo'
    GROUP BY area
    ORDER BY COUNT(*) DESC
    LIMIT 20
  ) areas;

  -- ====================
  -- DISTRIBUCIÓN POR NIVEL
  -- ====================

  SELECT jsonb_agg(
    jsonb_build_object(
      'nivel', nivel,
      'cantidad', cantidad,
      'porcentaje', ROUND((cantidad::NUMERIC / total_activos::NUMERIC) * 100, 2)
    )
    ORDER BY cantidad DESC
  ) INTO por_nivel
  FROM (
    SELECT
      nivel,
      COUNT(*) as cantidad
    FROM users
    WHERE estado = 'activo'
    GROUP BY nivel
    ORDER BY COUNT(*) DESC
  ) niveles;

  -- ====================
  -- DISTRIBUCIÓN POR RENGLÓN
  -- ====================

  SELECT jsonb_agg(
    jsonb_build_object(
      'renglon', renglon,
      'cantidad', cantidad,
      'porcentaje', ROUND((cantidad::NUMERIC / total_activos::NUMERIC) * 100, 2)
    )
    ORDER BY cantidad DESC
  ) INTO por_renglon
  FROM (
    SELECT
      COALESCE(renglon, 'Sin renglón') as renglon,
      COUNT(*) as cantidad
    FROM users
    WHERE estado = 'activo'
    GROUP BY renglon
    ORDER BY COUNT(*) DESC
  ) renglones;

  -- ====================
  -- DISTRIBUCIÓN POR TIPO DE PUESTO
  -- ====================

  SELECT jsonb_agg(
    jsonb_build_object(
      'tipo', tipo,
      'cantidad', cantidad,
      'porcentaje', ROUND((cantidad::NUMERIC / total_activos::NUMERIC) * 100, 2)
    )
  ) INTO por_tipo_puesto
  FROM (
    SELECT
      COALESCE(tipo_puesto, 'No especificado') as tipo,
      COUNT(*) as cantidad
    FROM users
    WHERE estado = 'activo'
    GROUP BY tipo_puesto
    ORDER BY COUNT(*) DESC
  ) tipos;

  -- ====================
  -- DISTRIBUCIÓN POR ANTIGÜEDAD
  -- ====================

  SELECT jsonb_agg(
    jsonb_build_object(
      'rango', rango,
      'cantidad', cantidad,
      'porcentaje', ROUND((cantidad::NUMERIC / total_activos::NUMERIC) * 100, 2)
    )
    ORDER BY orden
  ) INTO por_antiguedad_rango
  FROM (
    SELECT
      CASE
        WHEN antiguedad_anos < 1 THEN '0-1 año'
        WHEN antiguedad_anos >= 1 AND antiguedad_anos < 3 THEN '1-3 años'
        WHEN antiguedad_anos >= 3 AND antiguedad_anos < 5 THEN '3-5 años'
        WHEN antiguedad_anos >= 5 AND antiguedad_anos < 10 THEN '5-10 años'
        WHEN antiguedad_anos >= 10 AND antiguedad_anos < 15 THEN '10-15 años'
        WHEN antiguedad_anos >= 15 AND antiguedad_anos < 20 THEN '15-20 años'
        ELSE '20+ años'
      END as rango,
      CASE
        WHEN antiguedad_anos < 1 THEN 1
        WHEN antiguedad_anos >= 1 AND antiguedad_anos < 3 THEN 2
        WHEN antiguedad_anos >= 3 AND antiguedad_anos < 5 THEN 3
        WHEN antiguedad_anos >= 5 AND antiguedad_anos < 10 THEN 4
        WHEN antiguedad_anos >= 10 AND antiguedad_anos < 15 THEN 5
        WHEN antiguedad_anos >= 15 AND antiguedad_anos < 20 THEN 6
        ELSE 7
      END as orden,
      COUNT(*) as cantidad
    FROM (
      SELECT EXTRACT(YEAR FROM AGE(fecha_ingreso)) as antiguedad_anos
      FROM users
      WHERE estado = 'activo' AND fecha_ingreso IS NOT NULL
    ) antiguedades
    GROUP BY rango, orden
  ) rangos;

  -- ====================
  -- TOP 20 PROFESIONES
  -- ====================

  SELECT jsonb_agg(
    jsonb_build_object(
      'profesion', profesion,
      'cantidad', cantidad
    )
    ORDER BY cantidad DESC
  ) INTO por_profesion
  FROM (
    SELECT
      COALESCE(profesion, 'No especificada') as profesion,
      COUNT(*) as cantidad
    FROM users
    WHERE estado = 'activo'
    GROUP BY profesion
    ORDER BY COUNT(*) DESC
    LIMIT 20
  ) profesiones;

  -- ====================
  -- TOP 20 CARGOS
  -- ====================

  SELECT jsonb_agg(
    jsonb_build_object(
      'cargo', cargo,
      'cantidad', cantidad
    )
    ORDER BY cantidad DESC
  ) INTO top_cargos
  FROM (
    SELECT
      cargo,
      COUNT(*) as cantidad
    FROM users
    WHERE estado = 'activo'
    GROUP BY cargo
    ORDER BY COUNT(*) DESC
    LIMIT 20
  ) cargos;

  -- ====================
  -- ALERTAS Y MÉTRICAS ESPECIALES
  -- ====================

  -- Próximos a jubilación (60+ años)
  SELECT COUNT(*) INTO proximos_jubilacion
  FROM users
  WHERE estado = 'activo'
    AND fecha_nacimiento IS NOT NULL
    AND EXTRACT(YEAR FROM AGE(TO_DATE(fecha_nacimiento, 'DD/MM/YYYY'))) >= 60;

  -- Nuevos ingresos (menos de 1 año)
  SELECT COUNT(*) INTO nuevos_ingresos
  FROM users
  WHERE estado = 'activo'
    AND fecha_ingreso IS NOT NULL
    AND EXTRACT(YEAR FROM AGE(fecha_ingreso)) < 1;

  -- Veteranos (15+ años)
  SELECT COUNT(*) INTO veteranos
  FROM users
  WHERE estado = 'activo'
    AND fecha_ingreso IS NOT NULL
    AND EXTRACT(YEAR FROM AGE(fecha_ingreso)) >= 15;

  -- ====================
  -- CONSTRUIR OBJETO FINAL
  -- ====================

  SELECT jsonb_build_object(
    'resumen', jsonb_build_object(
      'totalActivos', total_activos,
      'totalInactivos', total_inactivos,
      'totalJefes', total_jefes,
      'totalColaboradores', total_colaboradores,
      'edadPromedio', ROUND(COALESCE(edad_promedio, 0), 1),
      'antiguedadPromedio', ROUND(COALESCE(antiguedad_promedio, 0), 1),
      'proximosJubilacion', proximos_jubilacion,
      'nuevosIngresos', nuevos_ingresos,
      'veteranos', veteranos,
      'ratioSupervisor', CASE
        WHEN total_jefes > 0 THEN ROUND(total_colaboradores::NUMERIC / total_jefes::NUMERIC, 1)
        ELSE 0
      END
    ),
    'distribucion', jsonb_build_object(
      'porGenero', COALESCE(por_genero, '[]'::jsonb),
      'porEdadRango', COALESCE(por_edad_rango, '[]'::jsonb),
      'porArea', COALESCE(por_area, '[]'::jsonb),
      'porNivel', COALESCE(por_nivel, '[]'::jsonb),
      'porRenglon', COALESCE(por_renglon, '[]'::jsonb),
      'porTipoPuesto', COALESCE(por_tipo_puesto, '[]'::jsonb),
      'porAntiguedadRango', COALESCE(por_antiguedad_rango, '[]'::jsonb),
      'topProfesiones', COALESCE(por_profesion, '[]'::jsonb),
      'topCargos', COALESCE(top_cargos, '[]'::jsonb)
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_personal_analytics() IS
'Retorna estadísticas completas de análisis de personal para el dashboard de RRHH.
Incluye: resumen ejecutivo, distribuciones demográficas, organizacionales y alertas.';
