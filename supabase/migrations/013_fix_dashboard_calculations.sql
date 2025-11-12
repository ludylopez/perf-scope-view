-- Migración: Corrección de cálculos del Dashboard RRHH
-- Corrige datos hardcodeados y errores en los cálculos

-- 1. Función para obtener tendencia semanal REAL basada en fechas de envío
CREATE OR REPLACE FUNCTION get_tendencia_semanal(periodo_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
  fecha_inicio DATE;
  fecha_fin DATE;
  fecha_actual DATE;
  dias_totales INTEGER;
  dias_por_semana NUMERIC;
  semanas JSONB;
BEGIN
  -- Obtener fechas del período (convertir TIMESTAMP a DATE)
  SELECT DATE(fecha_inicio), DATE(fecha_fin) INTO fecha_inicio, fecha_fin
  FROM evaluation_periods
  WHERE id = periodo_id_param;
  
  -- Si no hay fechas en el período, usar fechas basadas en evaluaciones
  IF fecha_inicio IS NULL OR fecha_fin IS NULL THEN
    SELECT 
      DATE(MIN(created_at)),
      DATE(MAX(COALESCE(updated_at, created_at)))
    INTO fecha_inicio, fecha_fin
    FROM evaluations
    WHERE periodo_id = periodo_id_param;
    
    -- Si aún no hay datos, usar fecha actual como referencia
    IF fecha_inicio IS NULL THEN
      fecha_inicio := CURRENT_DATE - INTERVAL '30 days';
      fecha_fin := CURRENT_DATE;
    END IF;
  END IF;
  
  fecha_actual := CURRENT_DATE;
  dias_totales := GREATEST(1, fecha_actual - fecha_inicio);
  dias_por_semana := dias_totales / 4.0;
  
  -- Calcular evaluaciones completadas por semana basándose en fecha_envio o updated_at
  SELECT jsonb_agg(
    jsonb_build_object(
      'semana', semana_label,
      'completadas', completadas
    )
    ORDER BY semana_num
  ) INTO semanas
  FROM (
    SELECT 
      CASE 
        WHEN semana_num = 1 THEN 'Sem 1'
        WHEN semana_num = 2 THEN 'Sem 2'
        WHEN semana_num = 3 THEN 'Sem 3'
        WHEN semana_num = 4 THEN 'Sem 4'
        ELSE 'Actual'
      END as semana_label,
      semana_num,
      COUNT(*) as completadas
    FROM (
      SELECT 
        e.id,
        COALESCE(e.fecha_envio::date, DATE(e.updated_at)) as fecha_completada,
        CASE 
          WHEN COALESCE(e.fecha_envio::date, DATE(e.updated_at)) IS NOT NULL THEN
            CASE 
              WHEN COALESCE(e.fecha_envio::date, DATE(e.updated_at)) <= fecha_inicio + (dias_por_semana * 1) THEN 1
              WHEN COALESCE(e.fecha_envio::date, DATE(e.updated_at)) <= fecha_inicio + (dias_por_semana * 2) THEN 2
              WHEN COALESCE(e.fecha_envio::date, DATE(e.updated_at)) <= fecha_inicio + (dias_por_semana * 3) THEN 3
              WHEN COALESCE(e.fecha_envio::date, DATE(e.updated_at)) <= fecha_inicio + (dias_por_semana * 4) THEN 4
              ELSE 5
            END
          ELSE 5
        END as semana_num
      FROM evaluations e
      WHERE e.periodo_id = periodo_id_param
        AND e.tipo = 'jefe'
        AND e.estado = 'enviado'
    ) evaluaciones_semanas
    GROUP BY semana_num
  ) semanas_agrupadas;
  
  -- Asegurar que siempre haya 5 semanas con valores (incluso si son 0)
  WITH semanas_base AS (
    SELECT unnest(ARRAY[1, 2, 3, 4, 5]) as semana_num,
           unnest(ARRAY['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Actual']) as semana_label
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'semana', sb.semana_label,
      'completadas', COALESCE((SELECT completadas FROM jsonb_array_elements(semanas) elem 
                               WHERE (elem->>'semana')::text = sb.semana_label 
                               LIMIT 1)::text::INTEGER, 0)
    )
    ORDER BY sb.semana_num
  ) INTO semanas
  FROM semanas_base sb;
  
  RETURN COALESCE(semanas, jsonb_build_array(
    jsonb_build_object('semana', 'Sem 1', 'completadas', 0),
    jsonb_build_object('semana', 'Sem 2', 'completadas', 0),
    jsonb_build_object('semana', 'Sem 3', 'completadas', 0),
    jsonb_build_object('semana', 'Sem 4', 'completadas', 0),
    jsonb_build_object('semana', 'Actual', 'completadas', 0)
  ));
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_tendencia_semanal(UUID) IS 'Obtiene la tendencia semanal REAL de evaluaciones completadas basada en fechas de envío';

-- 2. Actualizar get_dashboard_stats para incluir tendencia semanal real
CREATE OR REPLACE FUNCTION get_dashboard_stats(periodo_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
  total_usuarios INTEGER;
  total_jefes INTEGER;
  evaluaciones_completadas INTEGER;
  evaluaciones_en_progreso INTEGER;
  evaluaciones_pendientes INTEGER;
  promedio_desempeno NUMERIC;
  promedio_potencial NUMERIC;
  distribucion_9box JSONB;
  evaluaciones_por_area JSONB;
  evaluaciones_por_nivel JSONB;
  tendencia_semanal JSONB;
BEGIN
  -- Total de usuarios activos
  SELECT COUNT(*) INTO total_usuarios
  FROM users
  WHERE estado = 'activo';

  -- Total de jefes activos
  SELECT COUNT(*) INTO total_jefes
  FROM users
  WHERE rol = 'jefe' AND estado = 'activo';

  -- Evaluaciones completadas (jefe tipo 'enviado')
  SELECT COUNT(*) INTO evaluaciones_completadas
  FROM evaluations
  WHERE periodo_id = periodo_id_param
    AND tipo = 'jefe'
    AND estado = 'enviado';

  -- Evaluaciones en progreso (jefe tipo 'borrador')
  SELECT COUNT(*) INTO evaluaciones_en_progreso
  FROM evaluations
  WHERE periodo_id = periodo_id_param
    AND tipo = 'jefe'
    AND estado = 'borrador';

  -- Evaluaciones pendientes (total jefes - completadas - en progreso)
  evaluaciones_pendientes := total_jefes - evaluaciones_completadas - evaluaciones_en_progreso;

  -- Promedio de desempeño
  SELECT AVG(desempeno_porcentaje) INTO promedio_desempeno
  FROM final_evaluation_results
  WHERE periodo_id = periodo_id_param
    AND desempeno_porcentaje IS NOT NULL;

  -- Promedio de potencial
  SELECT AVG(potencial_porcentaje) INTO promedio_potencial
  FROM final_evaluation_results
  WHERE periodo_id = periodo_id_param
    AND potencial_porcentaje IS NOT NULL;

  -- Distribución 9-box
  SELECT jsonb_object_agg(
    COALESCE(posicion_9box, 'sin-calcular'),
    count
  ) INTO distribucion_9box
  FROM (
    SELECT 
      posicion_9box,
      COUNT(*) as count
    FROM final_evaluation_results
    WHERE periodo_id = periodo_id_param
    GROUP BY posicion_9box
  ) subq;

  -- Evaluaciones por área - CORREGIDO: Solo contar colaboradores con evaluaciones asignadas
  SELECT jsonb_agg(
    jsonb_build_object(
      'area', area,
      'completadas', completadas,
      'total', total
    )
  ) INTO evaluaciones_por_area
  FROM (
    SELECT 
      u.area,
      COUNT(DISTINCT CASE WHEN e.estado = 'enviado' THEN e.colaborador_id END) as completadas,
      COUNT(DISTINCT e.colaborador_id) FILTER (WHERE e.id IS NOT NULL) as total
    FROM evaluations e
    INNER JOIN users u ON u.dpi = e.colaborador_id
    WHERE e.periodo_id = periodo_id_param 
      AND e.tipo = 'jefe'
      AND u.estado = 'activo'
    GROUP BY u.area
    ORDER BY u.area
  ) area_stats;

  -- Evaluaciones por nivel - CORREGIDO: Solo contar colaboradores con evaluaciones asignadas
  SELECT jsonb_agg(
    jsonb_build_object(
      'nivel', nivel,
      'completadas', completadas,
      'total', total
    )
  ) INTO evaluaciones_por_nivel
  FROM (
    SELECT 
      u.nivel,
      COUNT(DISTINCT CASE WHEN e.estado = 'enviado' THEN e.colaborador_id END) as completadas,
      COUNT(DISTINCT e.colaborador_id) FILTER (WHERE e.id IS NOT NULL) as total
    FROM evaluations e
    INNER JOIN users u ON u.dpi = e.colaborador_id
    WHERE e.periodo_id = periodo_id_param 
      AND e.tipo = 'jefe'
      AND u.estado = 'activo'
    GROUP BY u.nivel
    ORDER BY u.nivel
  ) nivel_stats;

  -- Tendencia semanal REAL
  SELECT get_tendencia_semanal(periodo_id_param) INTO tendencia_semanal;

  -- Construir objeto JSONB con todas las estadísticas
  SELECT jsonb_build_object(
    'totalUsuarios', total_usuarios,
    'totalJefes', total_jefes,
    'evaluacionesCompletadas', evaluaciones_completadas,
    'evaluacionesPendientes', GREATEST(evaluaciones_pendientes, 0),
    'evaluacionesEnProgreso', evaluaciones_en_progreso,
    'porcentajeCompletitud', CASE 
      WHEN total_jefes > 0 THEN 
        ROUND((evaluaciones_completadas::NUMERIC / total_jefes::NUMERIC) * 100, 2)
      ELSE 0 
    END,
    'promedioDesempeno', COALESCE(ROUND(promedio_desempeno, 2), 0),
    'promedioPotencial', COALESCE(ROUND(promedio_potencial, 2), 0),
    'distribucion9Box', COALESCE(distribucion_9box, '{}'::jsonb),
    'evaluacionesPorArea', COALESCE(evaluaciones_por_area, '[]'::jsonb),
    'evaluacionesPorNivel', COALESCE(evaluaciones_por_nivel, '[]'::jsonb),
    'tendenciaSemanal', COALESCE(tendencia_semanal, '[]'::jsonb)
  ) INTO stats;

  RETURN stats;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_dashboard_stats(UUID) IS 
'Calcula estadísticas agregadas del dashboard de RRHH para un período específico. 
Incluye tendencia semanal real basada en fechas de envío. 
Optimiza el rendimiento al calcular todo en el servidor.';

-- 3. CORREGIR ERROR CRÍTICO en get_executive_kpis - variable total_activos se sobrescribe
CREATE OR REPLACE FUNCTION get_executive_kpis(periodo_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  kpis JSONB;
  total_activos INTEGER;
  total_jefes INTEGER;
  evaluaciones_completadas INTEGER;
  total_elegibles INTEGER;
  promedio_desempeno NUMERIC;
  promedio_potencial NUMERIC;
  tasa_completitud NUMERIC;
  indice_desarrollo NUMERIC;
  tasa_estabilidad NUMERIC;
  colaboradores_alto_potencial INTEGER;
  colaboradores_riesgo INTEGER;
BEGIN
  -- Total activos (colaboradores + jefes)
  SELECT COUNT(*) INTO total_activos
  FROM users
  WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe');
  
  -- Total jefes activos (para cálculo de completitud)
  SELECT COUNT(*) INTO total_jefes
  FROM users
  WHERE estado = 'activo' AND rol = 'jefe';
  
  -- Evaluaciones completadas
  SELECT COUNT(*) INTO evaluaciones_completadas
  FROM evaluations
  WHERE periodo_id = periodo_id_param
    AND tipo = 'jefe'
    AND estado = 'enviado';
  
  -- Total elegibles
  SELECT COUNT(*) INTO total_elegibles
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
  
  -- Promedio de desempeño
  SELECT AVG(desempeno_porcentaje) INTO promedio_desempeno
  FROM final_evaluation_results
  WHERE periodo_id = periodo_id_param
    AND desempeno_porcentaje IS NOT NULL;
  
  -- Promedio de potencial
  SELECT AVG(potencial_porcentaje) INTO promedio_potencial
  FROM final_evaluation_results
  WHERE periodo_id = periodo_id_param
    AND potencial_porcentaje IS NOT NULL;
  
  -- Tasa de completitud (CORREGIDO: usar total_jefes en lugar de sobrescribir total_activos)
  tasa_completitud := CASE 
    WHEN total_jefes > 0 THEN ROUND((evaluaciones_completadas::NUMERIC / total_jefes::NUMERIC) * 100, 2)
    ELSE 0
  END;
  
  -- Índice de Desarrollo del Talento (promedio de potencial + desempeño / 2)
  indice_desarrollo := COALESCE((promedio_desempeno + promedio_potencial) / 2, 0);
  
  -- Tasa de Estabilidad (colaboradores con ≥12 meses)
  SELECT 
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE calcular_antiguedad_meses(dpi) >= 12)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0
    END INTO tasa_estabilidad
  FROM users
  WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe') AND fecha_ingreso IS NOT NULL;
  
  -- Colaboradores con Alto Potencial (alto-alto, alto-medio en 9-box)
  SELECT COUNT(*) INTO colaboradores_alto_potencial
  FROM final_evaluation_results
  WHERE periodo_id = periodo_id_param
    AND posicion_9box IN ('alto-alto', 'alto-medio');
  
  -- Colaboradores en Riesgo (bajo-bajo, bajo-medio en 9-box)
  SELECT COUNT(*) INTO colaboradores_riesgo
  FROM final_evaluation_results
  WHERE periodo_id = periodo_id_param
    AND posicion_9box IN ('bajo-bajo', 'bajo-medio');
  
  -- Construir objeto JSONB con KPIs
  SELECT jsonb_build_object(
    'indiceCompletitud', tasa_completitud,
    'indiceDesempenoOrganizacional', COALESCE(ROUND(promedio_desempeno, 2), 0),
    'indiceDesarrolloTalento', COALESCE(ROUND(indice_desarrollo, 2), 0),
    'indiceEstabilidadEquipo', tasa_estabilidad,
    'totalActivos', total_activos,
    'evaluacionesCompletadas', evaluaciones_completadas,
    'totalElegibles', total_elegibles,
    'porcentajeElegibles', CASE 
      WHEN total_activos > 0 THEN ROUND((total_elegibles::NUMERIC / total_activos::NUMERIC) * 100, 2)
      ELSE 0
    END,
    'promedioDesempeno', COALESCE(ROUND(promedio_desempeno, 2), 0),
    'promedioPotencial', COALESCE(ROUND(promedio_potencial, 2), 0),
    'colaboradoresAltoPotencial', colaboradores_alto_potencial,
    'colaboradoresRiesgo', colaboradores_riesgo,
    'tasaAltoPotencial', CASE 
      WHEN evaluaciones_completadas > 0 THEN 
        ROUND((colaboradores_alto_potencial::NUMERIC / evaluaciones_completadas::NUMERIC) * 100, 2)
      ELSE 0
    END,
    'tasaRiesgo', CASE 
      WHEN evaluaciones_completadas > 0 THEN 
        ROUND((colaboradores_riesgo::NUMERIC / evaluaciones_completadas::NUMERIC) * 100, 2)
      ELSE 0
    END,
    'scorecards', jsonb_build_object(
      'completitud', CASE 
        WHEN tasa_completitud >= 90 THEN 'excelente'
        WHEN tasa_completitud >= 70 THEN 'bueno'
        WHEN tasa_completitud >= 50 THEN 'regular'
        ELSE 'bajo'
      END,
      'desempeno', CASE 
        WHEN promedio_desempeno >= 80 THEN 'excelente'
        WHEN promedio_desempeno >= 70 THEN 'bueno'
        WHEN promedio_desempeno >= 60 THEN 'regular'
        ELSE 'bajo'
      END,
      'desarrollo', CASE 
        WHEN indice_desarrollo >= 75 THEN 'excelente'
        WHEN indice_desarrollo >= 65 THEN 'bueno'
        WHEN indice_desarrollo >= 55 THEN 'regular'
        ELSE 'bajo'
      END,
      'estabilidad', CASE 
        WHEN tasa_estabilidad >= 70 THEN 'excelente'
        WHEN tasa_estabilidad >= 50 THEN 'bueno'
        WHEN tasa_estabilidad >= 30 THEN 'regular'
        ELSE 'bajo'
      END
    )
  ) INTO kpis;
  
  RETURN kpis;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_executive_kpis(UUID) IS 'Obtiene KPIs estratégicos para el dashboard ejecutivo. CORREGIDO: variable total_activos ya no se sobrescribe incorrectamente.';

