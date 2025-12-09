-- Migración: Funciones SQL para Análisis de Equipo en Cascada
-- Permite a directores/gerentes ver el rendimiento completo de toda su unidad organizacional

-- ============================================================================
-- 1. FUNCIÓN: get_jerarquia_con_resultados
-- Obtiene toda la jerarquía hacia abajo con resultados de evaluación
-- ============================================================================
CREATE OR REPLACE FUNCTION get_jerarquia_con_resultados(
  usuario_dpi VARCHAR(20),
  periodo_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  WITH RECURSIVE jerarquia AS (
    -- Caso base: subordinados directos del usuario
    -- Buscar en users.jefe_inmediato_id (jerarquía directa)
    SELECT
      u.dpi,
      u.nombre || ' ' || u.apellidos as nombre_completo,
      u.nombre,
      u.apellidos,
      u.cargo,
      u.area,
      u.nivel,
      u.rol,
      u.jefe_inmediato_id,
      1 as nivel_jerarquico,
      u.dpi::text as ruta
    FROM users u
    WHERE u.jefe_inmediato_id = usuario_dpi
      AND u.estado = 'activo'

    UNION

    -- También buscar en user_assignments (asignaciones formales)
    SELECT
      u.dpi,
      u.nombre || ' ' || u.apellidos as nombre_completo,
      u.nombre,
      u.apellidos,
      u.cargo,
      u.area,
      u.nivel,
      u.rol,
      COALESCE(u.jefe_inmediato_id, ua.jefe_id) as jefe_inmediato_id,
      1 as nivel_jerarquico,
      u.dpi::text as ruta
    FROM user_assignments ua
    JOIN users u ON u.dpi = ua.colaborador_id
    WHERE ua.jefe_id = usuario_dpi
      AND ua.activo = true
      AND u.estado = 'activo'

    UNION ALL

    -- Caso recursivo: subordinados de subordinados
    SELECT
      u.dpi,
      u.nombre || ' ' || u.apellidos as nombre_completo,
      u.nombre,
      u.apellidos,
      u.cargo,
      u.area,
      u.nivel,
      u.rol,
      u.jefe_inmediato_id,
      j.nivel_jerarquico + 1,
      j.ruta || '->' || u.dpi::text
    FROM users u
    JOIN jerarquia j ON u.jefe_inmediato_id = j.dpi
    WHERE u.estado = 'activo'
      AND j.nivel_jerarquico < 10  -- Límite de recursión
  ),
  -- Eliminar duplicados (si un colaborador está en ambas fuentes)
  jerarquia_unicos AS (
    SELECT DISTINCT ON (dpi)
      dpi,
      nombre_completo,
      nombre,
      apellidos,
      cargo,
      area,
      nivel,
      rol,
      jefe_inmediato_id,
      nivel_jerarquico,
      ruta
    FROM jerarquia
    ORDER BY dpi, nivel_jerarquico
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'dpi', j.dpi,
      'nombreCompleto', j.nombre_completo,
      'nombre', j.nombre,
      'apellidos', j.apellidos,
      'cargo', j.cargo,
      'area', j.area,
      'nivel', j.nivel,
      'rol', j.rol,
      'jefeDpi', j.jefe_inmediato_id,
      'nivelJerarquico', j.nivel_jerarquico,
      -- Resultados de evaluación
      'tieneEvaluacion', (fer.id IS NOT NULL),
      'desempenoPorcentaje', fer.desempeno_porcentaje,
      'potencialPorcentaje', fer.potencial_porcentaje,
      'posicion9Box', fer.posicion_9box,
      -- Info adicional para jefes
      'totalColaboradoresDirectos', (
        SELECT COUNT(*)::int
        FROM user_assignments ua
        WHERE ua.jefe_id = j.dpi AND ua.activo = true
      ),
      'esJefe', EXISTS(
        SELECT 1 FROM user_assignments ua
        WHERE ua.jefe_id = j.dpi AND ua.activo = true
      ),
      'promedioEquipo', (
        SELECT ROUND(AVG(fer2.desempeno_porcentaje)::numeric, 2)
        FROM final_evaluation_results fer2
        JOIN user_assignments ua2 ON ua2.colaborador_id = fer2.colaborador_id
        WHERE ua2.jefe_id = j.dpi
          AND ua2.activo = true
          AND fer2.periodo_id = periodo_id_param
          AND fer2.desempeno_porcentaje IS NOT NULL
      )
    )
    ORDER BY j.nivel_jerarquico, j.nombre_completo
  ) INTO resultados
  FROM jerarquia_unicos j
  LEFT JOIN final_evaluation_results fer
    ON fer.colaborador_id = j.dpi
    AND fer.periodo_id = periodo_id_param;

  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_jerarquia_con_resultados(VARCHAR, UUID) IS
'Obtiene toda la jerarquía hacia abajo del usuario con resultados de evaluación del período especificado';


-- ============================================================================
-- 2. FUNCIÓN: get_stats_unidad_cascada
-- Estadísticas agregadas de toda la unidad en cascada
-- OPTIMIZADA: Una sola CTE recursiva para todas las estadísticas
-- ============================================================================
CREATE OR REPLACE FUNCTION get_stats_unidad_cascada(
  usuario_dpi VARCHAR(20),
  periodo_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  -- Una sola CTE recursiva con límite y todas las estadísticas calculadas en una pasada
  WITH RECURSIVE jerarquia AS (
    -- Caso base: subordinados directos desde users.jefe_inmediato_id
    SELECT u.dpi, 1 as nivel_rec
    FROM users u
    WHERE u.jefe_inmediato_id = usuario_dpi
      AND u.estado = 'activo'

    UNION

    -- También incluir colaboradores desde user_assignments
    SELECT u.dpi, 1 as nivel_rec
    FROM user_assignments ua
    JOIN users u ON u.dpi = ua.colaborador_id
    WHERE ua.jefe_id = usuario_dpi
      AND ua.activo = true
      AND u.estado = 'activo'

    UNION ALL
    -- Caso recursivo con límite de profundidad
    SELECT u.dpi, j.nivel_rec + 1
    FROM users u
    JOIN jerarquia j ON u.jefe_inmediato_id = j.dpi
    WHERE u.estado = 'activo'
      AND j.nivel_rec < 10  -- Límite de recursión
  ),
  -- Materializar la jerarquía eliminando duplicados
  jerarquia_mat AS (
    SELECT DISTINCT dpi FROM jerarquia
  ),
  -- Calcular conteos base
  conteos AS (
    SELECT
      COUNT(*)::int as total_personas,
      COUNT(*) FILTER (WHERE EXISTS(
        SELECT 1 FROM user_assignments ua WHERE ua.jefe_id = jm.dpi AND ua.activo = true
      ))::int as total_jefes
    FROM jerarquia_mat jm
  ),
  -- Resultados de evaluación
  eval_stats AS (
    SELECT
      COUNT(fer.id)::int as evaluaciones_completadas,
      ROUND(AVG(fer.desempeno_porcentaje)::numeric, 2) as promedio_desempeno,
      ROUND(AVG(fer.potencial_porcentaje)::numeric, 2) as promedio_potencial
    FROM jerarquia_mat jm
    LEFT JOIN final_evaluation_results fer
      ON fer.colaborador_id = jm.dpi
      AND fer.periodo_id = periodo_id_param
  ),
  -- Distribución 9-box
  dist_9box AS (
    SELECT COALESCE(
      jsonb_object_agg(posicion, cnt),
      '{}'::jsonb
    ) as distribucion
    FROM (
      SELECT
        COALESCE(fer.posicion_9box, 'sin-calcular') as posicion,
        COUNT(*)::int as cnt
      FROM jerarquia_mat jm
      LEFT JOIN final_evaluation_results fer
        ON fer.colaborador_id = jm.dpi
        AND fer.periodo_id = periodo_id_param
      GROUP BY COALESCE(fer.posicion_9box, 'sin-calcular')
    ) subq
  ),
  -- Promedios organizacionales (toda la municipalidad)
  org_stats AS (
    SELECT
      ROUND(AVG(fer.desempeno_porcentaje)::numeric, 2) as promedio_desempeno_org,
      ROUND(AVG(fer.potencial_porcentaje)::numeric, 2) as promedio_potencial_org
    FROM final_evaluation_results fer
    WHERE fer.periodo_id = periodo_id_param
      AND fer.desempeno_porcentaje IS NOT NULL
  )
  SELECT jsonb_build_object(
    'totalPersonas', COALESCE(c.total_personas, 0),
    'totalJefes', COALESCE(c.total_jefes, 0),
    'totalColaboradores', COALESCE(c.total_personas - c.total_jefes, 0),
    'evaluacionesCompletadas', COALESCE(e.evaluaciones_completadas, 0),
    'tasaCompletitud', CASE
      WHEN c.total_personas > 0 THEN
        ROUND((e.evaluaciones_completadas::NUMERIC / c.total_personas::NUMERIC) * 100, 2)
      ELSE 0
    END,
    'promedioDesempenoUnidad', COALESCE(e.promedio_desempeno, 0),
    'promedioPotencialUnidad', COALESCE(e.promedio_potencial, 0),
    'promedioDesempenoOrganizacion', COALESCE(o.promedio_desempeno_org, 0),
    'promedioPotencialOrganizacion', COALESCE(o.promedio_potencial_org, 0),
    'distribucion9Box', COALESCE(d.distribucion, '{}'::jsonb)
  ) INTO stats
  FROM conteos c
  CROSS JOIN eval_stats e
  CROSS JOIN dist_9box d
  CROSS JOIN org_stats o;

  RETURN COALESCE(stats, jsonb_build_object(
    'totalPersonas', 0,
    'totalJefes', 0,
    'totalColaboradores', 0,
    'evaluacionesCompletadas', 0,
    'tasaCompletitud', 0,
    'promedioDesempenoUnidad', 0,
    'promedioPotencialUnidad', 0,
    'promedioDesempenoOrganizacion', 0,
    'promedioPotencialOrganizacion', 0,
    'distribucion9Box', '{}'::jsonb
  ));
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_stats_unidad_cascada(VARCHAR, UUID) IS
'Obtiene estadísticas agregadas de toda la unidad en cascada para un período, incluyendo promedios organizacionales (optimizada con una sola CTE)';


-- ============================================================================
-- 3. FUNCIÓN: get_9box_unidad_filtrable
-- Distribución 9-box con filtros opcionales (cascada de jefe o grupo)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_9box_unidad_filtrable(
  usuario_dpi VARCHAR(20),
  periodo_id_param UUID,
  filtro_jefe_dpi VARCHAR(20) DEFAULT NULL,
  filtro_grupo_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
  jefe_base VARCHAR(20);
BEGIN
  -- Si hay filtro de jefe, usamos ese como base, sino usamos el usuario original
  jefe_base := COALESCE(filtro_jefe_dpi, usuario_dpi);

  WITH RECURSIVE jerarquia AS (
    -- Caso base: subordinados directos del jefe base desde users.jefe_inmediato_id
    SELECT u.dpi, 1 as nivel_rec
    FROM users u
    WHERE u.jefe_inmediato_id = jefe_base
      AND u.estado = 'activo'
    
    UNION
    
    -- También incluir colaboradores desde user_assignments
    SELECT u.dpi, 1 as nivel_rec
    FROM user_assignments ua
    JOIN users u ON u.dpi = ua.colaborador_id
    WHERE ua.jefe_id = jefe_base
      AND ua.activo = true
      AND u.estado = 'activo'
    
    UNION ALL
    -- Caso recursivo con límite de profundidad
    SELECT u.dpi, j.nivel_rec + 1
    FROM users u
    JOIN jerarquia j ON u.jefe_inmediato_id = j.dpi
    WHERE u.estado = 'activo'
      AND j.nivel_rec < 10  -- Límite de recursión
  ),
  -- Eliminar duplicados
  jerarquia_unicos AS (
    SELECT DISTINCT dpi FROM jerarquia
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'dpi', u.dpi,
      'nombre', u.nombre || ' ' || u.apellidos,
      'cargo', u.cargo,
      'area', u.area,
      'nivel', u.nivel,
      'desempenoFinal', fer.desempeno_porcentaje,
      'potencial', fer.potencial_porcentaje,
      'posicion9Box', fer.posicion_9box,
      'desempenoPorcentaje', fer.desempeno_porcentaje,
      'potencialPorcentaje', fer.potencial_porcentaje,
      'jefeDpi', COALESCE(u.jefe_inmediato_id, (
        SELECT ua2.jefe_id 
        FROM user_assignments ua2 
        WHERE ua2.colaborador_id = u.dpi AND ua2.activo = true 
        LIMIT 1
      )),
      'jefeNombre', (
        SELECT jefe.nombre || ' ' || jefe.apellidos
        FROM users jefe
        WHERE jefe.dpi = COALESCE(u.jefe_inmediato_id, (
          SELECT ua2.jefe_id 
          FROM user_assignments ua2 
          WHERE ua2.colaborador_id = u.dpi AND ua2.activo = true 
          LIMIT 1
        ))
      )
    )
    ORDER BY u.nombre, u.apellidos
  ) INTO resultados
  FROM users u
  JOIN jerarquia_unicos j ON j.dpi = u.dpi
  LEFT JOIN final_evaluation_results fer
    ON fer.colaborador_id = u.dpi
    AND fer.periodo_id = periodo_id_param
  WHERE fer.posicion_9box IS NOT NULL
    -- Filtro opcional por grupo
    AND (filtro_grupo_id IS NULL OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.colaborador_id = u.dpi
        AND gm.grupo_id = filtro_grupo_id
        AND gm.activo = true
    ));

  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_9box_unidad_filtrable(VARCHAR, UUID, VARCHAR, UUID) IS
'Obtiene datos de 9-box de la unidad en cascada con filtros opcionales por jefe o grupo';


-- ============================================================================
-- 4. FUNCIÓN: get_comparativa_equipos_cascada
-- Comparativa de TODOS los equipos de jefes subordinados (en cascada)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_comparativa_equipos_cascada(
  usuario_dpi VARCHAR(20),
  periodo_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  WITH RECURSIVE jerarquia_jefes AS (
    -- Caso base: jefes directos subordinados desde users.jefe_inmediato_id
    SELECT
      u.dpi,
      u.nombre || ' ' || u.apellidos as nombre_completo,
      u.cargo,
      u.area,
      u.nivel,
      1 as nivel_jerarquico
    FROM users u
    WHERE u.jefe_inmediato_id = usuario_dpi
      AND u.estado = 'activo'
      AND EXISTS (
        SELECT 1 FROM user_assignments ua
        WHERE ua.jefe_id = u.dpi AND ua.activo = true
      )

    UNION

    -- También incluir jefes desde user_assignments
    SELECT
      u.dpi,
      u.nombre || ' ' || u.apellidos as nombre_completo,
      u.cargo,
      u.area,
      u.nivel,
      1 as nivel_jerarquico
    FROM user_assignments ua
    JOIN users u ON u.dpi = ua.colaborador_id
    WHERE ua.jefe_id = usuario_dpi
      AND ua.activo = true
      AND u.estado = 'activo'
      AND EXISTS (
        SELECT 1 FROM user_assignments ua2
        WHERE ua2.jefe_id = u.dpi AND ua2.activo = true
      )

    UNION ALL

    -- Caso recursivo: jefes de jefes
    SELECT
      u.dpi,
      u.nombre || ' ' || u.apellidos as nombre_completo,
      u.cargo,
      u.area,
      u.nivel,
      j.nivel_jerarquico + 1
    FROM users u
    JOIN jerarquia_jefes j ON u.jefe_inmediato_id = j.dpi
    WHERE u.estado = 'activo'
      AND EXISTS (
        SELECT 1 FROM user_assignments ua
        WHERE ua.jefe_id = u.dpi AND ua.activo = true
      )
      AND j.nivel_jerarquico < 10
  ),
  -- Eliminar duplicados
  jerarquia_jefes_unicos AS (
    SELECT DISTINCT ON (dpi)
      dpi,
      nombre_completo,
      cargo,
      area,
      nivel,
      nivel_jerarquico
    FROM jerarquia_jefes
    ORDER BY dpi, nivel_jerarquico
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'jefeDpi', jj.dpi,
      'jefeNombre', jj.nombre_completo,
      'jefeCargo', jj.cargo,
      'jefeArea', jj.area,
      'jefeNivel', jj.nivel,
      'nivelJerarquico', jj.nivel_jerarquico,
      -- Estadísticas del equipo directo de este jefe
      'totalEquipo', (
        SELECT COUNT(*)::int
        FROM user_assignments ua
        WHERE ua.jefe_id = jj.dpi AND ua.activo = true
      ),
      'evaluacionesCompletadas', (
        SELECT COUNT(*)::int
        FROM final_evaluation_results fer
        JOIN user_assignments ua ON ua.colaborador_id = fer.colaborador_id
        WHERE ua.jefe_id = jj.dpi
          AND ua.activo = true
          AND fer.periodo_id = periodo_id_param
      ),
      'promedioDesempeno', (
        SELECT ROUND(AVG(fer.desempeno_porcentaje)::numeric, 2)
        FROM final_evaluation_results fer
        JOIN user_assignments ua ON ua.colaborador_id = fer.colaborador_id
        WHERE ua.jefe_id = jj.dpi
          AND ua.activo = true
          AND fer.periodo_id = periodo_id_param
          AND fer.desempeno_porcentaje IS NOT NULL
      ),
      'promedioPotencial', (
        SELECT ROUND(AVG(fer.potencial_porcentaje)::numeric, 2)
        FROM final_evaluation_results fer
        JOIN user_assignments ua ON ua.colaborador_id = fer.colaborador_id
        WHERE ua.jefe_id = jj.dpi
          AND ua.activo = true
          AND fer.periodo_id = periodo_id_param
          AND fer.potencial_porcentaje IS NOT NULL
      ),
      'tasaCompletitud', (
        SELECT CASE
          WHEN COUNT(ua.id) > 0 THEN
            ROUND((COUNT(fer.id)::NUMERIC / COUNT(ua.id)::NUMERIC) * 100, 2)
          ELSE 0
        END
        FROM user_assignments ua
        LEFT JOIN final_evaluation_results fer
          ON fer.colaborador_id = ua.colaborador_id
          AND fer.periodo_id = periodo_id_param
        WHERE ua.jefe_id = jj.dpi AND ua.activo = true
      ),
      'distribucion9Box', (
        SELECT jsonb_object_agg(
          COALESCE(fer.posicion_9box, 'sin-calcular'),
          cnt
        )
        FROM (
          SELECT fer.posicion_9box, COUNT(*)::int as cnt
          FROM final_evaluation_results fer
          JOIN user_assignments ua ON ua.colaborador_id = fer.colaborador_id
          WHERE ua.jefe_id = jj.dpi
            AND ua.activo = true
            AND fer.periodo_id = periodo_id_param
          GROUP BY fer.posicion_9box
        ) fer
      ),
      -- Evaluación del jefe como colaborador (si existe)
      'evaluacionJefe', (
        SELECT jsonb_build_object(
          'existe', true,
          'desempeno', fer.desempeno_porcentaje,
          'potencial', fer.potencial_porcentaje,
          'posicion9Box', fer.posicion_9box
        )
        FROM final_evaluation_results fer
        WHERE fer.colaborador_id = jj.dpi
          AND fer.periodo_id = periodo_id_param
      )
    )
    ORDER BY jj.nivel_jerarquico,
      (SELECT AVG(fer.desempeno_porcentaje)
       FROM final_evaluation_results fer
       JOIN user_assignments ua ON ua.colaborador_id = fer.colaborador_id
       WHERE ua.jefe_id = jj.dpi
         AND ua.activo = true
         AND fer.periodo_id = periodo_id_param) DESC NULLS LAST
  ) INTO resultados
  FROM jerarquia_jefes_unicos jj;

  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_comparativa_equipos_cascada(VARCHAR, UUID) IS
'Obtiene comparativa de todos los equipos de jefes subordinados en cascada';


-- ============================================================================
-- 5. FUNCIÓN: get_detalle_colaborador_completo
-- Información completa de un colaborador para el modal de detalle
-- ============================================================================
CREATE OR REPLACE FUNCTION get_detalle_colaborador_completo(
  colaborador_dpi VARCHAR(20),
  periodo_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  resultado JSONB;
  info_usuario JSONB;
  resultados_evaluacion JSONB;
  promedio_unidad NUMERIC;
BEGIN
  -- Info básica del usuario
  SELECT jsonb_build_object(
    'dpi', u.dpi,
    'nombre', u.nombre,
    'apellidos', u.apellidos,
    'nombreCompleto', u.nombre || ' ' || u.apellidos,
    'cargo', u.cargo,
    'area', u.area,
    'nivel', u.nivel,
    'rol', u.rol,
    'jefeDirecto', (
      SELECT jsonb_build_object(
        'dpi', jefe.dpi,
        'nombre', jefe.nombre || ' ' || jefe.apellidos
      )
      FROM users jefe
      WHERE jefe.dpi = u.jefe_inmediato_id
    ),
    'esJefe', EXISTS(
      SELECT 1 FROM user_assignments ua
      WHERE ua.jefe_id = u.dpi AND ua.activo = true
    ),
    'totalEquipo', (
      SELECT COUNT(*)::int
      FROM user_assignments ua
      WHERE ua.jefe_id = u.dpi AND ua.activo = true
    )
  ) INTO info_usuario
  FROM users u
  WHERE u.dpi = colaborador_dpi;

  -- Resultados de evaluación
  SELECT jsonb_build_object(
    'tieneEvaluacion', (fer.id IS NOT NULL),
    'desempenoPorcentaje', fer.desempeno_porcentaje,
    'potencialPorcentaje', fer.potencial_porcentaje,
    'posicion9Box', fer.posicion_9box,
    'desempenoFinal', fer.desempeno_final,
    'potencial', fer.potencial,
    'resultadoFinal', fer.resultado_final,
    'comparativo', fer.comparativo
  ) INTO resultados_evaluacion
  FROM final_evaluation_results fer
  WHERE fer.colaborador_id = colaborador_dpi
    AND fer.periodo_id = periodo_id_param;

  -- Promedio de la unidad/organización para comparar
  SELECT ROUND(AVG(desempeno_porcentaje)::numeric, 2) INTO promedio_unidad
  FROM final_evaluation_results
  WHERE periodo_id = periodo_id_param
    AND desempeno_porcentaje IS NOT NULL;

  -- Si es jefe, calcular promedio de su equipo
  IF (info_usuario->>'esJefe')::boolean THEN
    resultados_evaluacion := resultados_evaluacion || jsonb_build_object(
      'promedioEquipo', (
        SELECT ROUND(AVG(fer.desempeno_porcentaje)::numeric, 2)
        FROM final_evaluation_results fer
        JOIN user_assignments ua ON ua.colaborador_id = fer.colaborador_id
        WHERE ua.jefe_id = colaborador_dpi
          AND ua.activo = true
          AND fer.periodo_id = periodo_id_param
          AND fer.desempeno_porcentaje IS NOT NULL
      )
    );
  END IF;

  -- Construir resultado final
  SELECT jsonb_build_object(
    'usuario', info_usuario,
    'evaluacion', COALESCE(resultados_evaluacion, jsonb_build_object('tieneEvaluacion', false)),
    'promedioUnidad', COALESCE(promedio_unidad, 0)
  ) INTO resultado;

  RETURN resultado;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_detalle_colaborador_completo(VARCHAR, UUID) IS
'Obtiene información completa de un colaborador para el modal de detalle';


-- ============================================================================
-- 6. FUNCIÓN AUXILIAR: get_jefes_para_filtro
-- Obtiene lista de jefes subordinados para usar en filtros de dropdown
-- ============================================================================
CREATE OR REPLACE FUNCTION get_jefes_para_filtro(usuario_dpi VARCHAR(20))
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  WITH RECURSIVE jerarquia_jefes AS (
    -- Caso base: jefes directos desde users.jefe_inmediato_id
    SELECT
      u.dpi,
      u.nombre || ' ' || u.apellidos as nombre_completo,
      u.cargo,
      1 as nivel_jerarquico
    FROM users u
    WHERE u.jefe_inmediato_id = usuario_dpi
      AND u.estado = 'activo'
      AND EXISTS (
        SELECT 1 FROM user_assignments ua
        WHERE ua.jefe_id = u.dpi AND ua.activo = true
      )
    
    UNION
    
    -- También incluir jefes desde user_assignments
    SELECT
      u.dpi,
      u.nombre || ' ' || u.apellidos as nombre_completo,
      u.cargo,
      1 as nivel_jerarquico
    FROM user_assignments ua
    JOIN users u ON u.dpi = ua.colaborador_id
    WHERE ua.jefe_id = usuario_dpi
      AND ua.activo = true
      AND u.estado = 'activo'
      AND EXISTS (
        SELECT 1 FROM user_assignments ua2
        WHERE ua2.jefe_id = u.dpi AND ua2.activo = true
      )
    
    UNION ALL
    
    -- Caso recursivo: jefes de jefes
    SELECT
      u.dpi,
      u.nombre || ' ' || u.apellidos as nombre_completo,
      u.cargo,
      j.nivel_jerarquico + 1
    FROM users u
    JOIN jerarquia_jefes j ON u.jefe_inmediato_id = j.dpi
    WHERE u.estado = 'activo'
      AND EXISTS (
        SELECT 1 FROM user_assignments ua
        WHERE ua.jefe_id = u.dpi AND ua.activo = true
      )
      AND j.nivel_jerarquico < 10
  ),
  -- Eliminar duplicados
  jerarquia_jefes_unicos AS (
    SELECT DISTINCT ON (dpi)
      dpi,
      nombre_completo,
      cargo,
      nivel_jerarquico
    FROM jerarquia_jefes
    ORDER BY dpi, nivel_jerarquico
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'dpi', dpi,
      'nombre', nombre_completo,
      'cargo', cargo,
      'nivelJerarquico', nivel_jerarquico
    )
    ORDER BY nivel_jerarquico, nombre_completo
  ) INTO resultados
  FROM jerarquia_jefes_unicos;

  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_jefes_para_filtro(VARCHAR) IS
'Obtiene lista de jefes subordinados en cascada para usar en filtros de dropdown';


-- ============================================================================
-- 7. FUNCIÓN AUXILIAR: get_grupos_unidad
-- Obtiene grupos/cuadrillas de la unidad en cascada
-- ============================================================================
CREATE OR REPLACE FUNCTION get_grupos_unidad(usuario_dpi VARCHAR(20))
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  WITH RECURSIVE jerarquia AS (
    -- Caso base: subordinados directos desde users.jefe_inmediato_id
    SELECT u.dpi, 1 as nivel_rec
    FROM users u
    WHERE u.jefe_inmediato_id = usuario_dpi AND u.estado = 'activo'
    
    UNION
    
    -- También incluir colaboradores desde user_assignments
    SELECT u.dpi, 1 as nivel_rec
    FROM user_assignments ua
    JOIN users u ON u.dpi = ua.colaborador_id
    WHERE ua.jefe_id = usuario_dpi
      AND ua.activo = true
      AND u.estado = 'activo'
    
    UNION ALL
    
    -- Caso recursivo con límite de profundidad
    SELECT u.dpi, j.nivel_rec + 1
    FROM users u
    JOIN jerarquia j ON u.jefe_inmediato_id = j.dpi
    WHERE u.estado = 'activo'
      AND j.nivel_rec < 10  -- Límite de recursión
  ),
  -- Eliminar duplicados
  jerarquia_unicos AS (
    SELECT DISTINCT dpi FROM jerarquia
  ),
  -- Obtener grupos únicos con sus datos
  grupos_filtrados AS (
    SELECT DISTINCT
      g.id,
      g.nombre,
      g.tipo,
      g.jefe_id
    FROM groups g
    WHERE g.activo = true
      AND (
        g.jefe_id = usuario_dpi
        OR g.jefe_id IN (SELECT dpi FROM jerarquia_unicos)
        OR EXISTS (
          SELECT 1 FROM group_members gm
          WHERE gm.grupo_id = g.id
            AND gm.colaborador_id IN (SELECT dpi FROM jerarquia_unicos)
            AND gm.activo = true
        )
      )
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', gf.id,
      'nombre', gf.nombre,
      'tipo', gf.tipo,
      'jefeNombre', (
        SELECT jefe.nombre || ' ' || jefe.apellidos
        FROM users jefe
        WHERE jefe.dpi = gf.jefe_id
      ),
      'totalMiembros', (
        SELECT COUNT(*)::int
        FROM group_members gm
        WHERE gm.grupo_id = gf.id AND gm.activo = true
      )
    )
    ORDER BY gf.nombre
  ) INTO resultados
  FROM grupos_filtrados gf;

  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_grupos_unidad(VARCHAR) IS
'Obtiene todos los grupos/cuadrillas relacionados con la unidad en cascada';


-- ============================================================================
-- 8. FUNCIÓN: get_jerarquia_directa_con_resultados
-- Obtiene SOLO colaboradores directos (nivel 1) con resultados de evaluación
-- Útil para jefes que solo quieren ver su equipo directo
-- ============================================================================
CREATE OR REPLACE FUNCTION get_jerarquia_directa_con_resultados(
  usuario_dpi VARCHAR(20),
  periodo_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  -- Obtener solo colaboradores directos (sin recursión)
  WITH colaboradores_directos AS (
    -- Desde users.jefe_inmediato_id
    SELECT
      u.dpi,
      u.nombre || ' ' || u.apellidos as nombre_completo,
      u.nombre,
      u.apellidos,
      u.cargo,
      u.area,
      u.nivel,
      u.rol,
      u.jefe_inmediato_id,
      1 as nivel_jerarquico
    FROM users u
    WHERE u.jefe_inmediato_id = usuario_dpi
      AND u.estado = 'activo'

    UNION

    -- Desde user_assignments
    SELECT
      u.dpi,
      u.nombre || ' ' || u.apellidos as nombre_completo,
      u.nombre,
      u.apellidos,
      u.cargo,
      u.area,
      u.nivel,
      u.rol,
      COALESCE(u.jefe_inmediato_id, ua.jefe_id) as jefe_inmediato_id,
      1 as nivel_jerarquico
    FROM user_assignments ua
    JOIN users u ON u.dpi = ua.colaborador_id
    WHERE ua.jefe_id = usuario_dpi
      AND ua.activo = true
      AND u.estado = 'activo'
  ),
  -- Eliminar duplicados
  colaboradores_unicos AS (
    SELECT DISTINCT ON (dpi)
      dpi,
      nombre_completo,
      nombre,
      apellidos,
      cargo,
      area,
      nivel,
      rol,
      jefe_inmediato_id,
      nivel_jerarquico
    FROM colaboradores_directos
    ORDER BY dpi
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'dpi', cd.dpi,
      'nombreCompleto', cd.nombre_completo,
      'nombre', cd.nombre,
      'apellidos', cd.apellidos,
      'cargo', cd.cargo,
      'area', cd.area,
      'nivel', cd.nivel,
      'rol', cd.rol,
      'jefeDpi', cd.jefe_inmediato_id,
      'nivelJerarquico', cd.nivel_jerarquico,
      -- Resultados de evaluación
      'tieneEvaluacion', (fer.id IS NOT NULL),
      'desempenoPorcentaje', fer.desempeno_porcentaje,
      'potencialPorcentaje', fer.potencial_porcentaje,
      'posicion9Box', fer.posicion_9box,
      -- Info adicional para jefes
      'totalColaboradoresDirectos', (
        SELECT COUNT(*)::int
        FROM user_assignments ua
        WHERE ua.jefe_id = cd.dpi AND ua.activo = true
      ),
      'esJefe', EXISTS(
        SELECT 1 FROM user_assignments ua
        WHERE ua.jefe_id = cd.dpi AND ua.activo = true
      ),
      'promedioEquipo', (
        SELECT ROUND(AVG(fer2.desempeno_porcentaje)::numeric, 2)
        FROM final_evaluation_results fer2
        JOIN user_assignments ua2 ON ua2.colaborador_id = fer2.colaborador_id
        WHERE ua2.jefe_id = cd.dpi
          AND ua2.activo = true
          AND fer2.periodo_id = periodo_id_param
          AND fer2.desempeno_porcentaje IS NOT NULL
      )
    )
    ORDER BY cd.nombre_completo
  ) INTO resultados
  FROM colaboradores_unicos cd
  LEFT JOIN final_evaluation_results fer
    ON fer.colaborador_id = cd.dpi
    AND fer.periodo_id = periodo_id_param;

  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_jerarquia_directa_con_resultados(VARCHAR, UUID) IS
'Obtiene SOLO colaboradores directos (nivel 1) del usuario con resultados de evaluación del período especificado';


-- ============================================================================
-- 9. FUNCIÓN: get_stats_unidad_directa
-- Estadísticas agregadas SOLO de colaboradores directos (sin cascada)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_stats_unidad_directa(
  usuario_dpi VARCHAR(20),
  periodo_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  -- Obtener solo colaboradores directos
  WITH colaboradores_directos AS (
    SELECT u.dpi
    FROM users u
    WHERE u.jefe_inmediato_id = usuario_dpi
      AND u.estado = 'activo'
    
    UNION
    
    SELECT u.dpi
    FROM user_assignments ua
    JOIN users u ON u.dpi = ua.colaborador_id
    WHERE ua.jefe_id = usuario_dpi
      AND ua.activo = true
      AND u.estado = 'activo'
  ),
  colaboradores_unicos AS (
    SELECT DISTINCT dpi FROM colaboradores_directos
  ),
  -- Calcular conteos base
  conteos AS (
    SELECT
      COUNT(*)::int as total_personas,
      COUNT(*) FILTER (WHERE EXISTS(
        SELECT 1 FROM user_assignments ua WHERE ua.jefe_id = cu.dpi AND ua.activo = true
      ))::int as total_jefes
    FROM colaboradores_unicos cu
  ),
  -- Resultados de evaluación
  eval_stats AS (
    SELECT
      COUNT(fer.id)::int as evaluaciones_completadas,
      ROUND(AVG(fer.desempeno_porcentaje)::numeric, 2) as promedio_desempeno,
      ROUND(AVG(fer.potencial_porcentaje)::numeric, 2) as promedio_potencial
    FROM colaboradores_unicos cu
    LEFT JOIN final_evaluation_results fer
      ON fer.colaborador_id = cu.dpi
      AND fer.periodo_id = periodo_id_param
  ),
  -- Distribución 9-box
  dist_9box AS (
    SELECT COALESCE(
      jsonb_object_agg(posicion, cnt),
      '{}'::jsonb
    ) as distribucion
    FROM (
      SELECT
        COALESCE(fer.posicion_9box, 'sin-calcular') as posicion,
        COUNT(*)::int as cnt
      FROM colaboradores_unicos cu
      LEFT JOIN final_evaluation_results fer
        ON fer.colaborador_id = cu.dpi
        AND fer.periodo_id = periodo_id_param
      GROUP BY COALESCE(fer.posicion_9box, 'sin-calcular')
    ) subq
  ),
  -- Promedios organizacionales (toda la municipalidad)
  org_stats AS (
    SELECT
      ROUND(AVG(fer.desempeno_porcentaje)::numeric, 2) as promedio_desempeno_org,
      ROUND(AVG(fer.potencial_porcentaje)::numeric, 2) as promedio_potencial_org
    FROM final_evaluation_results fer
    WHERE fer.periodo_id = periodo_id_param
      AND fer.desempeno_porcentaje IS NOT NULL
  )
  SELECT jsonb_build_object(
    'totalPersonas', COALESCE(c.total_personas, 0),
    'totalJefes', COALESCE(c.total_jefes, 0),
    'totalColaboradores', COALESCE(c.total_personas - c.total_jefes, 0),
    'evaluacionesCompletadas', COALESCE(e.evaluaciones_completadas, 0),
    'tasaCompletitud', CASE
      WHEN c.total_personas > 0 THEN
        ROUND((e.evaluaciones_completadas::NUMERIC / c.total_personas::NUMERIC) * 100, 2)
      ELSE 0
    END,
    'promedioDesempenoUnidad', COALESCE(e.promedio_desempeno, 0),
    'promedioPotencialUnidad', COALESCE(e.promedio_potencial, 0),
    'promedioDesempenoOrganizacion', COALESCE(o.promedio_desempeno_org, 0),
    'promedioPotencialOrganizacion', COALESCE(o.promedio_potencial_org, 0),
    'distribucion9Box', COALESCE(d.distribucion, '{}'::jsonb)
  ) INTO stats
  FROM conteos c
  CROSS JOIN eval_stats e
  CROSS JOIN dist_9box d
  CROSS JOIN org_stats o;

  RETURN COALESCE(stats, jsonb_build_object(
    'totalPersonas', 0,
    'totalJefes', 0,
    'totalColaboradores', 0,
    'evaluacionesCompletadas', 0,
    'tasaCompletitud', 0,
    'promedioDesempenoUnidad', 0,
    'promedioPotencialUnidad', 0,
    'promedioDesempenoOrganizacion', 0,
    'promedioPotencialOrganizacion', 0,
    'distribucion9Box', '{}'::jsonb
  ));
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_stats_unidad_directa(VARCHAR, UUID) IS
'Obtiene estadísticas agregadas SOLO de colaboradores directos (sin cascada) para un período, incluyendo promedios organizacionales';


-- ============================================================================
-- 10. FUNCIÓN: get_9box_unidad_directa
-- Distribución 9-box SOLO de colaboradores directos (sin cascada)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_9box_unidad_directa(
  usuario_dpi VARCHAR(20),
  periodo_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  -- Obtener solo colaboradores directos
  WITH colaboradores_directos AS (
    SELECT u.dpi
    FROM users u
    WHERE u.jefe_inmediato_id = usuario_dpi
      AND u.estado = 'activo'
    
    UNION
    
    SELECT u.dpi
    FROM user_assignments ua
    JOIN users u ON u.dpi = ua.colaborador_id
    WHERE ua.jefe_id = usuario_dpi
      AND ua.activo = true
      AND u.estado = 'activo'
  ),
  colaboradores_unicos AS (
    SELECT DISTINCT dpi FROM colaboradores_directos
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'dpi', u.dpi,
      'nombre', u.nombre || ' ' || u.apellidos,
      'cargo', u.cargo,
      'area', u.area,
      'nivel', u.nivel,
      'desempenoFinal', fer.desempeno_porcentaje,
      'potencial', fer.potencial_porcentaje,
      'posicion9Box', fer.posicion_9box,
      'desempenoPorcentaje', fer.desempeno_porcentaje,
      'potencialPorcentaje', fer.potencial_porcentaje,
      'jefeDpi', COALESCE(u.jefe_inmediato_id, (
        SELECT ua2.jefe_id 
        FROM user_assignments ua2 
        WHERE ua2.colaborador_id = u.dpi AND ua2.activo = true 
        LIMIT 1
      )),
      'jefeNombre', (
        SELECT jefe.nombre || ' ' || jefe.apellidos
        FROM users jefe
        WHERE jefe.dpi = COALESCE(u.jefe_inmediato_id, (
          SELECT ua2.jefe_id 
          FROM user_assignments ua2 
          WHERE ua2.colaborador_id = u.dpi AND ua2.activo = true 
          LIMIT 1
        ))
      )
    )
    ORDER BY u.nombre, u.apellidos
  ) INTO resultados
  FROM users u
  JOIN colaboradores_unicos cu ON cu.dpi = u.dpi
  LEFT JOIN final_evaluation_results fer
    ON fer.colaborador_id = u.dpi
    AND fer.periodo_id = periodo_id_param
  WHERE fer.posicion_9box IS NOT NULL;

  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_9box_unidad_directa(VARCHAR, UUID) IS
'Obtiene datos de 9-box SOLO de colaboradores directos (sin cascada)';
