-- Migración: Funciones SQL para Sistema de Jerarquías Multi-Nivel
-- Permite evaluación completa de jefes superiores a jefes subordinados
-- Estadísticas de equipos y comparativas

-- 1. Función para obtener jefes subordinados directos
CREATE OR REPLACE FUNCTION get_jefes_subordinados(jefe_superior_dpi VARCHAR(20))
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'dpi', u.dpi,
      'nombreCompleto', u.nombre || ' ' || u.apellidos,
      'nombre', u.nombre,
      'apellidos', u.apellidos,
      'cargo', u.cargo,
      'area', u.area,
      'nivel', u.nivel,
      'rol', u.rol,
      'jefeInmediatoId', u.jefe_inmediato_id,
      'totalColaboradores', (
        SELECT COUNT(*) 
        FROM user_assignments ua 
        WHERE ua.jefe_id = u.dpi AND ua.activo = true
      ),
      'totalGrupos', (
        SELECT COUNT(*) 
        FROM groups g 
        WHERE g.jefe_id = u.dpi AND g.activo = true
      )
    )
    ORDER BY u.nombre, u.apellidos
  ) INTO resultados
  FROM users u
  WHERE u.jefe_inmediato_id = jefe_superior_dpi
    AND u.estado = 'activo'
    AND u.rol IN ('jefe', 'colaborador');
  
  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_jefes_subordinados(VARCHAR) IS 'Obtiene la lista de jefes subordinados directos de un jefe superior';

-- 2. Función para obtener estadísticas del equipo de un jefe
CREATE OR REPLACE FUNCTION get_equipo_stats(jefe_dpi VARCHAR(20), periodo_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
  total_colaboradores INTEGER;
  evaluaciones_completadas INTEGER;
  promedio_desempeno NUMERIC;
  promedio_potencial NUMERIC;
  promedio_por_dimension JSONB;
  distribucion_9box JSONB;
BEGIN
  -- Total de colaboradores asignados al jefe
  SELECT COUNT(*) INTO total_colaboradores
  FROM user_assignments
  WHERE jefe_id = jefe_dpi AND activo = true;
  
  -- Evaluaciones completadas del equipo
  SELECT COUNT(*) INTO evaluaciones_completadas
  FROM evaluations e
  JOIN user_assignments ua ON ua.colaborador_id = e.colaborador_id
  WHERE ua.jefe_id = jefe_dpi
    AND ua.activo = true
    AND e.periodo_id = periodo_id_param
    AND e.tipo = 'jefe'
    AND e.estado = 'enviado';
  
  -- Promedio de desempeño del equipo
  SELECT AVG(fer.desempeno_porcentaje) INTO promedio_desempeno
  FROM final_evaluation_results fer
  JOIN user_assignments ua ON ua.colaborador_id = fer.colaborador_id
  WHERE ua.jefe_id = jefe_dpi
    AND ua.activo = true
    AND fer.periodo_id = periodo_id_param
    AND fer.desempeno_porcentaje IS NOT NULL;
  
  -- Promedio de potencial del equipo
  SELECT AVG(fer.potencial_porcentaje) INTO promedio_potencial
  FROM final_evaluation_results fer
  JOIN user_assignments ua ON ua.colaborador_id = fer.colaborador_id
  WHERE ua.jefe_id = jefe_dpi
    AND ua.activo = true
    AND fer.periodo_id = periodo_id_param
    AND fer.potencial_porcentaje IS NOT NULL;
  
  -- Promedio por dimensiones (estructura simplificada)
  SELECT jsonb_build_object(
    'desempeno', COALESCE(ROUND(promedio_desempeno, 2), 0),
    'potencial', COALESCE(ROUND(promedio_potencial, 2), 0)
  ) INTO promedio_por_dimension;
  
  -- Distribución 9-box del equipo
  SELECT jsonb_object_agg(
    COALESCE(posicion_9box, 'sin-calcular'),
    count
  ) INTO distribucion_9box
  FROM (
    SELECT 
      fer.posicion_9box,
      COUNT(*) as count
    FROM final_evaluation_results fer
    JOIN user_assignments ua ON ua.colaborador_id = fer.colaborador_id
    WHERE ua.jefe_id = jefe_dpi
      AND ua.activo = true
      AND fer.periodo_id = periodo_id_param
    GROUP BY fer.posicion_9box
  ) subq;
  
  -- Construir objeto JSONB con todas las estadísticas
  SELECT jsonb_build_object(
    'jefeDpi', jefe_dpi,
    'totalColaboradores', total_colaboradores,
    'evaluacionesCompletadas', evaluaciones_completadas,
    'tasaCompletitud', CASE 
      WHEN total_colaboradores > 0 THEN 
        ROUND((evaluaciones_completadas::NUMERIC / total_colaboradores::NUMERIC) * 100, 2)
      ELSE 0
    END,
    'promedioDesempeno', COALESCE(ROUND(promedio_desempeno, 2), 0),
    'promedioPotencial', COALESCE(ROUND(promedio_potencial, 2), 0),
    'promedioPorDimension', promedio_por_dimension,
    'distribucion9Box', COALESCE(distribucion_9box, '{}'::jsonb),
    'indiceDesarrollo', COALESCE(ROUND((promedio_desempeno + promedio_potencial) / 2, 2), 0)
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_equipo_stats(VARCHAR, UUID) IS 'Obtiene estadísticas completas del equipo de un jefe para un período específico';

-- 3. Función para obtener promedio consolidado de equipo
CREATE OR REPLACE FUNCTION get_promedio_equipo(jefe_dpi VARCHAR(20), periodo_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  resultado JSONB;
BEGIN
  SELECT jsonb_build_object(
    'promedioDesempeno', AVG(fer.desempeno_porcentaje),
    'promedioPotencial', AVG(fer.potencial_porcentaje),
    'promedioFinal', AVG((fer.desempeno_porcentaje + fer.potencial_porcentaje) / 2),
    'totalEvaluados', COUNT(*),
    'promedioOrganizacional', (
      SELECT AVG(desempeno_porcentaje) 
      FROM final_evaluation_results 
      WHERE periodo_id = periodo_id_param AND desempeno_porcentaje IS NOT NULL
    ),
    'comparacionOrganizacional', (
      SELECT AVG(fer2.desempeno_porcentaje) - (
        SELECT AVG(desempeno_porcentaje) 
        FROM final_evaluation_results fer3
        WHERE fer3.periodo_id = periodo_id_param AND fer3.desempeno_porcentaje IS NOT NULL
      )
      FROM final_evaluation_results fer2
      JOIN user_assignments ua2 ON ua2.colaborador_id = fer2.colaborador_id
      WHERE ua2.jefe_id = jefe_dpi
        AND ua2.activo = true
        AND fer2.periodo_id = periodo_id_param
        AND fer2.desempeno_porcentaje IS NOT NULL
    )
  ) INTO resultado
  FROM final_evaluation_results fer
  JOIN user_assignments ua ON ua.colaborador_id = fer.colaborador_id
  WHERE ua.jefe_id = jefe_dpi
    AND ua.activo = true
    AND fer.periodo_id = periodo_id_param
    AND fer.desempeno_porcentaje IS NOT NULL;
  
  RETURN COALESCE(resultado, jsonb_build_object(
    'promedioDesempeno', 0,
    'promedioPotencial', 0,
    'promedioFinal', 0,
    'totalEvaluados', 0,
    'promedioOrganizacional', 0,
    'comparacionOrganizacional', 0
  ));
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_promedio_equipo(VARCHAR, UUID) IS 'Obtiene el promedio consolidado del equipo y lo compara con el promedio organizacional';

-- 4. Función para comparativa entre equipos de jefes subordinados
CREATE OR REPLACE FUNCTION get_comparativa_equipos(jefe_superior_dpi VARCHAR(20), periodo_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'jefeDpi', jefe_sub.dpi,
      'jefeNombre', jefe_sub.nombre || ' ' || jefe_sub.apellidos,
      'jefeCargo', jefe_sub.cargo,
      'jefeArea', jefe_sub.area,
      'estadisticasEquipo', get_equipo_stats(jefe_sub.dpi, periodo_id_param),
      'promedioEquipo', get_promedio_equipo(jefe_sub.dpi, periodo_id_param),
      'evaluacionIndividual', (
        SELECT jsonb_build_object(
          'existe', EXISTS(
            SELECT 1 FROM evaluations e
            WHERE e.colaborador_id = jefe_sub.dpi
              AND e.periodo_id = periodo_id_param
              AND e.tipo = 'jefe'
              AND e.evaluador_id = jefe_superior_dpi
              AND e.estado = 'enviado'
          ),
          'desempeno', (
            SELECT fer.desempeno_porcentaje
            FROM final_evaluation_results fer
            WHERE fer.colaborador_id = jefe_sub.dpi
              AND fer.periodo_id = periodo_id_param
            LIMIT 1
          ),
          'potencial', (
            SELECT fer.potencial_porcentaje
            FROM final_evaluation_results fer
            WHERE fer.colaborador_id = jefe_sub.dpi
              AND fer.periodo_id = periodo_id_param
            LIMIT 1
          )
        )
      )
    )
    ORDER BY (
      SELECT AVG(desempeno_porcentaje)
      FROM final_evaluation_results fer
      JOIN user_assignments ua ON ua.colaborador_id = fer.colaborador_id
      WHERE ua.jefe_id = jefe_sub.dpi
        AND ua.activo = true
        AND fer.periodo_id = periodo_id_param
    ) DESC NULLS LAST
  ) INTO resultados
  FROM users jefe_sub
  WHERE jefe_sub.jefe_inmediato_id = jefe_superior_dpi
    AND jefe_sub.estado = 'activo'
    AND jefe_sub.rol IN ('jefe', 'colaborador');
  
  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_comparativa_equipos(VARCHAR, UUID) IS 'Compara todos los equipos de jefes subordinados de un jefe superior';

-- 5. Función para identificar si usuario es jefe intermedio
CREATE OR REPLACE FUNCTION es_jefe_intermedio(usuario_dpi VARCHAR(20))
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users u
    WHERE u.dpi = usuario_dpi
      AND u.jefe_inmediato_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM user_assignments ua
        WHERE ua.jefe_id = usuario_dpi
          AND ua.activo = true
      )
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION es_jefe_intermedio(VARCHAR) IS 'Retorna true si el usuario tiene jefe Y tiene colaboradores asignados (jefe intermedio)';

-- 6. Función para obtener jerarquía completa hacia arriba
CREATE OR REPLACE FUNCTION get_jerarquia_arriba(usuario_dpi VARCHAR(20))
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
  current_dpi VARCHAR(20);
  nivel INTEGER := 0;
BEGIN
  current_dpi := usuario_dpi;
  resultados := '[]'::jsonb;
  
  -- Subir por la jerarquía hasta llegar al nivel superior
  WHILE current_dpi IS NOT NULL AND nivel < 10 LOOP
    SELECT jsonb_build_object(
      'nivel', nivel,
      'dpi', u.dpi,
      'nombreCompleto', u.nombre || ' ' || u.apellidos,
      'cargo', u.cargo,
      'area', u.area,
      'rol', u.rol
    ) INTO resultados;
    
    resultados := resultados || jsonb_build_array(
      jsonb_build_object(
        'nivel', nivel,
        'dpi', u.dpi,
        'nombreCompleto', u.nombre || ' ' || u.apellidos,
        'cargo', u.cargo,
        'area', u.area,
        'rol', u.rol
      )
    );
    
    SELECT jefe_inmediato_id INTO current_dpi
    FROM users
    WHERE dpi = current_dpi;
    
    nivel := nivel + 1;
  END LOOP;
  
  RETURN resultados;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_jerarquia_arriba(VARCHAR) IS 'Obtiene toda la jerarquía hacia arriba del usuario hasta el nivel superior';

-- 7. Función para obtener jerarquía completa hacia abajo
CREATE OR REPLACE FUNCTION get_jerarquia_abajo(usuario_dpi VARCHAR(20))
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  WITH RECURSIVE jerarquia AS (
    -- Caso base: colaboradores directos
    SELECT 
      u.dpi,
      u.nombre || ' ' || u.apellidos as nombre_completo,
      u.cargo,
      u.area,
      u.rol,
      1 as nivel,
      u.dpi::text as ruta
    FROM users u
    WHERE u.jefe_inmediato_id = usuario_dpi
      AND u.estado = 'activo'
    
    UNION ALL
    
    -- Caso recursivo: colaboradores de colaboradores
    SELECT 
      u.dpi,
      u.nombre || ' ' || u.apellidos as nombre_completo,
      u.cargo,
      u.area,
      u.rol,
      j.nivel + 1,
      j.ruta || '->' || u.dpi::text
    FROM users u
    JOIN jerarquia j ON u.jefe_inmediato_id = j.dpi
    WHERE u.estado = 'activo'
      AND j.nivel < 10  -- Límite de recursión
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'dpi', dpi,
      'nombreCompleto', nombre_completo,
      'cargo', cargo,
      'area', area,
      'rol', rol,
      'nivel', nivel
    )
    ORDER BY nivel, nombre_completo
  ) INTO resultados
  FROM jerarquia;
  
  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_jerarquia_abajo(VARCHAR) IS 'Obtiene toda la jerarquía hacia abajo del usuario (todos los colaboradores directos e indirectos)';

-- 8. Función para obtener evaluación del jefe como colaborador
CREATE OR REPLACE FUNCTION get_evaluacion_jefe_como_colaborador(
  jefe_dpi VARCHAR(20),
  jefe_superior_dpi VARCHAR(20),
  periodo_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  resultado JSONB;
BEGIN
  SELECT jsonb_build_object(
    'existe', TRUE,
    'evaluacionId', e.id,
    'estado', e.estado,
    'progreso', e.progreso,
    'desempeno', (
      SELECT fer.desempeno_porcentaje
      FROM final_evaluation_results fer
      WHERE fer.colaborador_id = jefe_dpi
        AND fer.periodo_id = periodo_id_param
      LIMIT 1
    ),
    'potencial', (
      SELECT fer.potencial_porcentaje
      FROM final_evaluation_results fer
      WHERE fer.colaborador_id = jefe_dpi
        AND fer.periodo_id = periodo_id_param
      LIMIT 1
    ),
    'posicion9Box', (
      SELECT fer.posicion_9box
      FROM final_evaluation_results fer
      WHERE fer.colaborador_id = jefe_dpi
        AND fer.periodo_id = periodo_id_param
      LIMIT 1
    ),
    'fechaEnvio', e.fecha_envio
  ) INTO resultado
  FROM evaluations e
  WHERE e.colaborador_id = jefe_dpi
    AND e.evaluador_id = jefe_superior_dpi
    AND e.periodo_id = periodo_id_param
    AND e.tipo = 'jefe'
  LIMIT 1;
  
  IF resultado IS NULL THEN
    RETURN jsonb_build_object('existe', FALSE);
  END IF;
  
  RETURN resultado;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_evaluacion_jefe_como_colaborador(VARCHAR, VARCHAR, UUID) IS 'Obtiene la evaluación de un jefe subordinado hecha por su jefe superior';

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_users_jefe_inmediato ON users(jefe_inmediato_id);
CREATE INDEX IF NOT EXISTS idx_users_rol_estado ON users(rol, estado);

