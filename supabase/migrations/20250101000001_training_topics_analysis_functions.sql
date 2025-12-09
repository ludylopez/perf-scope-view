-- Migración: Funciones SQL para análisis estadístico de tópicos de capacitación
-- Permite generar planes de capacitación por área y plan maestro municipal

-- ============================================================================
-- 1. FUNCIÓN: get_topicos_por_area
-- Obtiene tópicos de capacitación agrupados por área para un período
-- ============================================================================
CREATE OR REPLACE FUNCTION get_topicos_por_area(
  area_param VARCHAR(255),
  periodo_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'topico', topico,
      'categoria', categoria,
      'prioridad', prioridad,
      'fuente', fuente,
      'frecuencia', frecuencia,
      'colaboradores', colaboradores
    ) ORDER BY frecuencia DESC, prioridad DESC
  ) INTO resultados
  FROM (
    SELECT 
      topico,
      categoria,
      prioridad,
      fuente,
      COUNT(*) as frecuencia,
      jsonb_agg(
        jsonb_build_object(
          'colaborador_id', colaborador_id,
          'nivel', nivel,
          'descripcion', descripcion
        )
      ) as colaboradores
    FROM training_topics
    WHERE area = area_param
      AND periodo_id = periodo_id_param
    GROUP BY topico, categoria, prioridad, fuente
  ) subquery;

  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_topicos_por_area(VARCHAR, UUID) IS 
'Obtiene tópicos de capacitación agrupados por área, incluyendo frecuencia y lista de colaboradores que los necesitan';

-- ============================================================================
-- 2. FUNCIÓN: get_topicos_frecuentes
-- Obtiene los tópicos de capacitación más frecuentes en un período
-- ============================================================================
CREATE OR REPLACE FUNCTION get_topicos_frecuentes(
  periodo_id_param UUID,
  limite_param INT DEFAULT 20
)
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'topico', topico,
      'categoria', categoria,
      'frecuencia', frecuencia,
      'areas', areas,
      'prioridad_promedio', prioridad_promedio
    ) ORDER BY frecuencia DESC
  ) INTO resultados
  FROM (
    SELECT 
      topico,
      categoria,
      COUNT(*) as frecuencia,
      jsonb_agg(DISTINCT area) as areas,
      CASE 
        WHEN COUNT(*) FILTER (WHERE prioridad = 'alta') > COUNT(*) FILTER (WHERE prioridad = 'baja') THEN 'alta'
        WHEN COUNT(*) FILTER (WHERE prioridad = 'media') > COUNT(*) FILTER (WHERE prioridad = 'baja') THEN 'media'
        ELSE 'baja'
      END as prioridad_promedio
    FROM training_topics
    WHERE periodo_id = periodo_id_param
    GROUP BY topico, categoria
    ORDER BY frecuencia DESC
    LIMIT limite_param
  ) subquery;

  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_topicos_frecuentes(UUID, INT) IS 
'Obtiene los tópicos de capacitación más frecuentes en un período, con frecuencia y áreas donde aparecen';

-- ============================================================================
-- 3. FUNCIÓN: get_plan_capacitacion_area
-- Genera un plan de capacitación consolidado para un área específica
-- ============================================================================
CREATE OR REPLACE FUNCTION get_plan_capacitacion_area(
  area_param VARCHAR(255),
  periodo_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  SELECT jsonb_build_object(
    'area', area_param,
    'periodo_id', periodo_id_param,
    'total_colaboradores', COUNT(DISTINCT colaborador_id),
    'total_topicos', COUNT(DISTINCT topico),
    'topicos_prioritarios', jsonb_agg(
      DISTINCT jsonb_build_object(
        'topico', topico,
        'categoria', categoria,
        'frecuencia', frecuencia,
        'prioridad', prioridad
      )
    ) FILTER (WHERE prioridad = 'alta'),
    'topicos_por_categoria', (
      SELECT jsonb_object_agg(categoria, frecuencia)
      FROM (
        SELECT categoria, COUNT(*) as frecuencia
        FROM training_topics
        WHERE area = area_param AND periodo_id = periodo_id_param
        GROUP BY categoria
      ) cat_stats
    ),
    'topicos_detallados', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'topico', topico,
          'categoria', categoria,
          'prioridad', prioridad,
          'frecuencia', frecuencia,
          'colaboradores_afectados', colaboradores_afectados
        ) ORDER BY frecuencia DESC, prioridad DESC
      )
      FROM (
        SELECT 
          topico,
          categoria,
          prioridad,
          COUNT(*) as frecuencia,
          COUNT(DISTINCT colaborador_id) as colaboradores_afectados
        FROM training_topics
        WHERE area = area_param AND periodo_id = periodo_id_param
        GROUP BY topico, categoria, prioridad
      ) topicos_stats
    )
  ) INTO resultados
  FROM training_topics
  WHERE area = area_param
    AND periodo_id = periodo_id_param;

  RETURN COALESCE(resultados, jsonb_build_object('area', area_param, 'periodo_id', periodo_id_param, 'total_colaboradores', 0, 'total_topicos', 0));
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_plan_capacitacion_area(VARCHAR, UUID) IS 
'Genera un plan de capacitación consolidado para un área específica, incluyendo estadísticas y tópicos priorizados';

-- ============================================================================
-- 4. FUNCIÓN: get_plan_capacitacion_municipalidad
-- Genera el plan maestro de capacitación para toda la municipalidad
-- ============================================================================
CREATE OR REPLACE FUNCTION get_plan_capacitacion_municipalidad(
  periodo_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  SELECT jsonb_build_object(
    'periodo_id', periodo_id_param,
    'total_colaboradores', COUNT(DISTINCT colaborador_id),
    'total_topicos', COUNT(DISTINCT topico),
    'total_areas', COUNT(DISTINCT area),
    'topicos_mas_frecuentes', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'topico', topico,
          'categoria', categoria,
          'frecuencia', frecuencia,
          'areas', areas,
          'prioridad_promedio', prioridad_promedio
        )
      )
      FROM (
        SELECT 
          topico,
          categoria,
          COUNT(*) as frecuencia,
          jsonb_agg(DISTINCT area) as areas,
          CASE 
            WHEN COUNT(*) FILTER (WHERE prioridad = 'alta') > COUNT(*) FILTER (WHERE prioridad = 'baja') THEN 'alta'
            WHEN COUNT(*) FILTER (WHERE prioridad = 'media') > COUNT(*) FILTER (WHERE prioridad = 'baja') THEN 'media'
            ELSE 'baja'
          END as prioridad_promedio
        FROM training_topics
        WHERE periodo_id = periodo_id_param
        GROUP BY topico, categoria
        ORDER BY frecuencia DESC
        LIMIT 20
      ) top_freq
    ),
    'topicos_por_categoria', (
      SELECT jsonb_object_agg(categoria, jsonb_build_object(
        'total', frecuencia,
        'topicos', topicos_lista
      ))
      FROM (
        SELECT 
          categoria,
          COUNT(*) as frecuencia,
          jsonb_agg(DISTINCT topico) as topicos_lista
        FROM training_topics
        WHERE periodo_id = periodo_id_param
        GROUP BY categoria
      ) cat_stats
    ),
    'topicos_por_area', (
      SELECT jsonb_object_agg(area, jsonb_build_object(
        'total_topicos', total_topicos,
        'total_colaboradores', total_colaboradores,
        'topicos_prioritarios', topicos_prioritarios
      ))
      FROM (
        SELECT 
          area,
          COUNT(DISTINCT topico) as total_topicos,
          COUNT(DISTINCT colaborador_id) as total_colaboradores,
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'topico', topico,
              'categoria', categoria,
              'frecuencia', frecuencia
            )
          ) FILTER (WHERE prioridad = 'alta') as topicos_prioritarios
        FROM training_topics
        WHERE periodo_id = periodo_id_param
        GROUP BY area
      ) area_stats
    ),
    'distribucion_por_fuente', (
      SELECT jsonb_object_agg(fuente, frecuencia)
      FROM (
        SELECT fuente, COUNT(*) as frecuencia
        FROM training_topics
        WHERE periodo_id = periodo_id_param
        GROUP BY fuente
      ) fuente_stats
    )
  ) INTO resultados
  FROM training_topics
  WHERE periodo_id = periodo_id_param;

  RETURN COALESCE(resultados, jsonb_build_object(
    'periodo_id', periodo_id_param,
    'total_colaboradores', 0,
    'total_topicos', 0,
    'total_areas', 0
  ));
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_plan_capacitacion_municipalidad(UUID) IS 
'Genera el plan maestro de capacitación para toda la municipalidad, consolidando tópicos de todas las áreas';

