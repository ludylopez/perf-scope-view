-- Migración: Función para calcular resultados consolidados de elegibilidad y evaluaciones
-- Fecha: 2025-01-XX
-- Descripción: Calcula población total, sujetos a evaluación, no sujetos y evaluaciones esperadas

CREATE OR REPLACE FUNCTION get_resultados_consolidados(periodo_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  resultado JSONB;
  
  -- Población total
  total_usuarios INTEGER;
  usuarios_activos INTEGER;
  usuarios_inactivos INTEGER;
  
  -- Sujetos a evaluación (cumplen criterios)
  sujetos_evaluacion INTEGER;
  no_sujetos_evaluacion INTEGER;
  
  -- Desglose de no sujetos
  inactivos INTEGER;
  sin_fecha_ingreso INTEGER;
  sin_tipo_puesto INTEGER;
  antiguedad_insuficiente INTEGER;
  
  -- Desglose por tipo de puesto
  sujetos_administrativos INTEGER;
  sujetos_operativos INTEGER;
  sujetos_c1 INTEGER;
  sujetos_a1 INTEGER;
  
  -- Evaluaciones esperadas
  autoevaluaciones_esperadas INTEGER;
  evaluaciones_jefe_esperadas INTEGER;
  
  -- Estado actual de evaluaciones
  autoevaluaciones_completadas INTEGER;
  autoevaluaciones_en_progreso INTEGER;
  autoevaluaciones_pendientes INTEGER;
  
  evaluaciones_jefe_completadas INTEGER;
  evaluaciones_jefe_en_progreso INTEGER;
  evaluaciones_jefe_pendientes INTEGER;
  
  -- Autoevaluaciones de jefes (excluyendo externos)
  autoevaluaciones_jefes_esperadas INTEGER;
  autoevaluaciones_jefes_completadas INTEGER;
  autoevaluaciones_jefes_en_progreso INTEGER;
  autoevaluaciones_jefes_pendientes INTEGER;
  
  -- Autoevaluaciones de colaboradores
  autoevaluaciones_colaboradores_esperadas INTEGER;
  autoevaluaciones_colaboradores_completadas INTEGER;
  autoevaluaciones_colaboradores_en_progreso INTEGER;
  autoevaluaciones_colaboradores_pendientes INTEGER;
  
  -- Métricas de resultados (solo evaluaciones completadas, excluyendo administrativos)
  promedio_desempeno NUMERIC;
  promedio_potencial NUMERIC;
  nps_promedio NUMERIC;
  nps_promoters INTEGER;
  nps_passives INTEGER;
  nps_detractors INTEGER;
BEGIN
  -- 1. POBLACIÓN TOTAL (excluyendo usuarios administrativos de monitoreo)
  -- Excluir admin_general y admin_rrhh que son usuarios de monitoreo del sistema
  SELECT COUNT(*) INTO total_usuarios 
  FROM users 
  WHERE rol NOT IN ('admin_general', 'admin_rrhh');
  
  SELECT COUNT(*) INTO usuarios_activos 
  FROM users 
  WHERE estado = 'activo' 
    AND rol NOT IN ('admin_general', 'admin_rrhh');
  
  SELECT COUNT(*) INTO usuarios_inactivos 
  FROM users 
  WHERE estado = 'inactivo' 
    AND rol NOT IN ('admin_general', 'admin_rrhh');
  
  -- 2. SUJETOS A EVALUACIÓN (cumplen criterios de elegibilidad)
  -- Criterios: activo + fecha_ingreso + tipo_puesto + antigüedad suficiente
  -- Excluir usuarios administrativos de monitoreo
  SELECT COUNT(*) INTO sujetos_evaluacion
  FROM users u
  WHERE u.estado = 'activo'
    AND u.rol NOT IN ('admin_general', 'admin_rrhh')
    AND u.fecha_ingreso IS NOT NULL
    AND u.tipo_puesto IS NOT NULL
    AND calcular_antiguedad_meses(u.dpi) >= CASE
      WHEN u.tipo_puesto = 'administrativo' THEN 3
      WHEN u.tipo_puesto = 'operativo' THEN 6
      ELSE 0
    END;
  
  -- 3. NO SUJETOS A EVALUACIÓN
  no_sujetos_evaluacion := total_usuarios - sujetos_evaluacion;
  
  -- Desglose de no sujetos (excluyendo usuarios administrativos)
  SELECT COUNT(*) INTO inactivos 
  FROM users 
  WHERE estado = 'inactivo' 
    AND rol NOT IN ('admin_general', 'admin_rrhh');
  
  SELECT COUNT(*) INTO sin_fecha_ingreso
  FROM users
  WHERE estado = 'activo' 
    AND fecha_ingreso IS NULL
    AND rol NOT IN ('admin_general', 'admin_rrhh');
  
  SELECT COUNT(*) INTO sin_tipo_puesto
  FROM users
  WHERE estado = 'activo' 
    AND tipo_puesto IS NULL
    AND rol NOT IN ('admin_general', 'admin_rrhh');
  
  SELECT COUNT(*) INTO antiguedad_insuficiente
  FROM users u
  WHERE u.estado = 'activo'
    AND u.rol NOT IN ('admin_general', 'admin_rrhh')
    AND u.fecha_ingreso IS NOT NULL
    AND u.tipo_puesto IS NOT NULL
    AND calcular_antiguedad_meses(u.dpi) < CASE
      WHEN u.tipo_puesto = 'administrativo' THEN 3
      WHEN u.tipo_puesto = 'operativo' THEN 6
      ELSE 999
    END;
  
  -- 4. DESGLOSE POR TIPO DE PUESTO (sujetos a evaluación, excluyendo administrativos)
  SELECT COUNT(*) INTO sujetos_administrativos
  FROM users u
  WHERE u.estado = 'activo'
    AND u.rol NOT IN ('admin_general', 'admin_rrhh')
    AND u.fecha_ingreso IS NOT NULL
    AND u.tipo_puesto = 'administrativo'
    AND calcular_antiguedad_meses(u.dpi) >= 3;
  
  SELECT COUNT(*) INTO sujetos_operativos
  FROM users u
  WHERE u.estado = 'activo'
    AND u.rol NOT IN ('admin_general', 'admin_rrhh')
    AND u.fecha_ingreso IS NOT NULL
    AND u.tipo_puesto = 'operativo'
    AND calcular_antiguedad_meses(u.dpi) >= 6;
  
  -- C1 y A1 (asumiendo que son administrativos y aplican 3 meses)
  SELECT COUNT(*) INTO sujetos_c1
  FROM users u
  WHERE u.estado = 'activo'
    AND u.rol NOT IN ('admin_general', 'admin_rrhh')
    AND u.nivel = 'C1'
    AND u.fecha_ingreso IS NOT NULL
    AND u.tipo_puesto IS NOT NULL
    AND calcular_antiguedad_meses(u.dpi) >= 3;
  
  SELECT COUNT(*) INTO sujetos_a1
  FROM users u
  WHERE u.estado = 'activo'
    AND u.rol NOT IN ('admin_general', 'admin_rrhh')
    AND u.nivel = 'A1'
    AND u.fecha_ingreso IS NOT NULL
    AND u.tipo_puesto IS NOT NULL
    AND calcular_antiguedad_meses(u.dpi) >= 3;
  
  -- 5. EVALUACIONES ESPERADAS
  
  -- Autoevaluaciones esperadas: Todos los sujetos a evaluación (excepto jefes externos)
  SELECT COUNT(*) INTO autoevaluaciones_esperadas
  FROM users u
  WHERE u.estado = 'activo'
    AND u.fecha_ingreso IS NOT NULL
    AND u.tipo_puesto IS NOT NULL
    AND calcular_antiguedad_meses(u.dpi) >= CASE
      WHEN u.tipo_puesto = 'administrativo' THEN 3
      WHEN u.tipo_puesto = 'operativo' THEN 6
      ELSE 0
    END
    AND (u.es_externo IS NULL OR u.es_externo = false);
  
  -- Evaluaciones de jefe esperadas: Basadas en asignaciones activas
  SELECT COUNT(DISTINCT ua.colaborador_id || '-' || ua.jefe_id) INTO evaluaciones_jefe_esperadas
  FROM user_assignments ua
  JOIN users colab ON colab.dpi = ua.colaborador_id
  JOIN users jefe ON jefe.dpi = ua.jefe_id
  WHERE ua.activo = true
    AND colab.estado = 'activo'
    AND jefe.estado = 'activo'
    AND colab.fecha_ingreso IS NOT NULL
    AND colab.tipo_puesto IS NOT NULL
    AND calcular_antiguedad_meses(colab.dpi) >= CASE
      WHEN colab.tipo_puesto = 'administrativo' THEN 3
      WHEN colab.tipo_puesto = 'operativo' THEN 6
      ELSE 0
    END;
  
  -- 6. ESTADO ACTUAL DE EVALUACIONES (del período activo)
  
  -- Autoevaluaciones completadas (excluyendo administrativos)
  SELECT COUNT(*) INTO autoevaluaciones_completadas
  FROM evaluations e
  JOIN users u ON u.dpi = e.usuario_id
  WHERE e.periodo_id = periodo_id_param
    AND e.tipo = 'auto'
    AND e.estado = 'enviado'
    AND u.rol NOT IN ('admin_general', 'admin_rrhh')
    AND (u.es_externo IS NULL OR u.es_externo = false);
  
  -- Autoevaluaciones en progreso (excluyendo administrativos)
  SELECT COUNT(*) INTO autoevaluaciones_en_progreso
  FROM evaluations e
  JOIN users u ON u.dpi = e.usuario_id
  WHERE e.periodo_id = periodo_id_param
    AND e.tipo = 'auto'
    AND e.estado = 'borrador'
    AND u.rol NOT IN ('admin_general', 'admin_rrhh')
    AND (u.es_externo IS NULL OR u.es_externo = false);
  
  -- Autoevaluaciones pendientes
  autoevaluaciones_pendientes := GREATEST(0, autoevaluaciones_esperadas - autoevaluaciones_completadas - autoevaluaciones_en_progreso);
  
  -- Evaluaciones de jefe completadas
  SELECT COUNT(DISTINCT colaborador_id || '-' || evaluador_id) INTO evaluaciones_jefe_completadas
  FROM evaluations
  WHERE periodo_id = periodo_id_param
    AND tipo = 'jefe'
    AND estado = 'enviado'
    AND colaborador_id IS NOT NULL
    AND evaluador_id IS NOT NULL;
  
  -- Evaluaciones de jefe en progreso
  SELECT COUNT(DISTINCT colaborador_id || '-' || evaluador_id) INTO evaluaciones_jefe_en_progreso
  FROM evaluations
  WHERE periodo_id = periodo_id_param
    AND tipo = 'jefe'
    AND estado = 'borrador'
    AND colaborador_id IS NOT NULL
    AND evaluador_id IS NOT NULL;
  
  -- Evaluaciones de jefe pendientes
  evaluaciones_jefe_pendientes := GREATEST(0, evaluaciones_jefe_esperadas - evaluaciones_jefe_completadas - evaluaciones_jefe_en_progreso);
  
  -- 7. AUTOEVALUACIONES DE JEFES (excluyendo externos y administrativos)
  SELECT COUNT(*) INTO autoevaluaciones_jefes_esperadas
  FROM users u
  WHERE u.estado = 'activo'
    AND u.rol = 'jefe'
    AND u.fecha_ingreso IS NOT NULL
    AND u.tipo_puesto IS NOT NULL
    AND calcular_antiguedad_meses(u.dpi) >= CASE
      WHEN u.tipo_puesto = 'administrativo' THEN 3
      WHEN u.tipo_puesto = 'operativo' THEN 6
      ELSE 0
    END
    AND (u.es_externo IS NULL OR u.es_externo = false);
  
  SELECT COUNT(*) INTO autoevaluaciones_jefes_completadas
  FROM evaluations e
  JOIN users u ON u.dpi = e.usuario_id
  WHERE e.periodo_id = periodo_id_param
    AND e.tipo = 'auto'
    AND e.estado = 'enviado'
    AND u.rol = 'jefe'
    AND u.rol NOT IN ('admin_general', 'admin_rrhh')
    AND (u.es_externo IS NULL OR u.es_externo = false);
  
  SELECT COUNT(*) INTO autoevaluaciones_jefes_en_progreso
  FROM evaluations e
  JOIN users u ON u.dpi = e.usuario_id
  WHERE e.periodo_id = periodo_id_param
    AND e.tipo = 'auto'
    AND e.estado = 'borrador'
    AND u.rol = 'jefe'
    AND u.rol NOT IN ('admin_general', 'admin_rrhh')
    AND (u.es_externo IS NULL OR u.es_externo = false);
  
  autoevaluaciones_jefes_pendientes := GREATEST(0, autoevaluaciones_jefes_esperadas - autoevaluaciones_jefes_completadas - autoevaluaciones_jefes_en_progreso);
  
  -- 8. AUTOEVALUACIONES DE COLABORADORES
  -- Usar el dato real: TODOS los colaboradores activos (sin filtrar por elegibilidad)
  -- porque en la práctica todos se evalúan independientemente de su antigüedad
  SELECT COUNT(*) INTO autoevaluaciones_colaboradores_esperadas
  FROM users u
  WHERE u.estado = 'activo'
    AND u.rol = 'colaborador';
  
  SELECT COUNT(*) INTO autoevaluaciones_colaboradores_completadas
  FROM evaluations e
  JOIN users u ON u.dpi = e.usuario_id
  WHERE e.periodo_id = periodo_id_param
    AND e.tipo = 'auto'
    AND e.estado = 'enviado'
    AND u.rol = 'colaborador';
  
  SELECT COUNT(*) INTO autoevaluaciones_colaboradores_en_progreso
  FROM evaluations e
  JOIN users u ON u.dpi = e.usuario_id
  WHERE e.periodo_id = periodo_id_param
    AND e.tipo = 'auto'
    AND e.estado = 'borrador'
    AND u.rol = 'colaborador';
  
  autoevaluaciones_colaboradores_pendientes := GREATEST(0, autoevaluaciones_colaboradores_esperadas - autoevaluaciones_colaboradores_completadas - autoevaluaciones_colaboradores_en_progreso);
  
  -- 9. MÉTRICAS DE RESULTADOS (solo evaluaciones completadas, excluyendo administrativos)
  
  -- Promedio de desempeño: solo evaluaciones completadas, excluyendo administrativos
  SELECT ROUND(AVG(fer.desempeno_porcentaje_promedio), 1) INTO promedio_desempeno
  FROM final_evaluation_results_consolidated fer
  JOIN users u ON u.dpi = fer.colaborador_id
  WHERE fer.periodo_id = periodo_id_param
    AND fer.desempeno_porcentaje_promedio IS NOT NULL
    AND u.rol NOT IN ('admin_general', 'admin_rrhh');
  
  -- Promedio de potencial: solo evaluaciones completadas, excluyendo administrativos
  SELECT ROUND(AVG(fer.potencial_porcentaje_promedio), 1) INTO promedio_potencial
  FROM final_evaluation_results_consolidated fer
  JOIN users u ON u.dpi = fer.colaborador_id
  WHERE fer.periodo_id = periodo_id_param
    AND fer.potencial_porcentaje_promedio IS NOT NULL
    AND u.rol NOT IN ('admin_general', 'admin_rrhh');
  
  -- NPS: solo autoevaluaciones completadas, excluyendo administrativos
  SELECT
    ROUND(AVG(nps_score), 1),
    COUNT(*) FILTER (WHERE nps_score >= 9),
    COUNT(*) FILTER (WHERE nps_score >= 7 AND nps_score < 9),
    COUNT(*) FILTER (WHERE nps_score < 7)
  INTO
    nps_promedio,
    nps_promoters,
    nps_passives,
    nps_detractors
  FROM evaluations e
  JOIN users u ON u.dpi = e.usuario_id
  WHERE e.periodo_id = periodo_id_param
    AND e.tipo = 'auto'
    AND e.estado = 'enviado'
    AND e.nps_score IS NOT NULL
    AND u.rol NOT IN ('admin_general', 'admin_rrhh');
  
  -- 10. CONSTRUIR RESULTADO JSONB
  SELECT jsonb_build_object(
    -- Población total
    'poblacionTotal', jsonb_build_object(
      'totalUsuarios', total_usuarios,
      'usuariosActivos', usuarios_activos,
      'usuariosInactivos', usuarios_inactivos
    ),
    
    -- Sujetos a evaluación
    'sujetosEvaluacion', jsonb_build_object(
      'total', sujetos_evaluacion,
      'administrativos', sujetos_administrativos,
      'operativos', sujetos_operativos,
      'concejoC1', sujetos_c1,
      'alcaldeA1', sujetos_a1
    ),
    
    -- No sujetos a evaluación
    'noSujetosEvaluacion', jsonb_build_object(
      'total', no_sujetos_evaluacion,
      'inactivos', inactivos,
      'sinFechaIngreso', sin_fecha_ingreso,
      'sinTipoPuesto', sin_tipo_puesto,
      'antiguedadInsuficiente', antiguedad_insuficiente
    ),
    
    -- Evaluaciones esperadas
    'evaluacionesEsperadas', jsonb_build_object(
      'autoevaluaciones', autoevaluaciones_esperadas,
      'evaluacionesJefe', evaluaciones_jefe_esperadas,
      'total', autoevaluaciones_esperadas + evaluaciones_jefe_esperadas
    ),
    
    -- Estado de autoevaluaciones
    'autoevaluaciones', jsonb_build_object(
      'esperadas', autoevaluaciones_esperadas,
      'completadas', autoevaluaciones_completadas,
      'enProgreso', autoevaluaciones_en_progreso,
      'pendientes', autoevaluaciones_pendientes,
      'porcentajeCompletitud', CASE
        WHEN autoevaluaciones_esperadas > 0 THEN
          ROUND((autoevaluaciones_completadas::NUMERIC / autoevaluaciones_esperadas::NUMERIC) * 100, 2)
        ELSE 0
      END
    ),
    
    -- Estado de evaluaciones de jefe
    'evaluacionesJefe', jsonb_build_object(
      'esperadas', evaluaciones_jefe_esperadas,
      'completadas', evaluaciones_jefe_completadas,
      'enProgreso', evaluaciones_jefe_en_progreso,
      'pendientes', evaluaciones_jefe_pendientes,
      'porcentajeCompletitud', CASE
        WHEN evaluaciones_jefe_esperadas > 0 THEN
          ROUND((evaluaciones_jefe_completadas::NUMERIC / evaluaciones_jefe_esperadas::NUMERIC) * 100, 2)
        ELSE 0
      END
    ),
    
    -- Autoevaluaciones de jefes
    'autoevaluacionesJefes', jsonb_build_object(
      'esperadas', autoevaluaciones_jefes_esperadas,
      'completadas', autoevaluaciones_jefes_completadas,
      'enProgreso', autoevaluaciones_jefes_en_progreso,
      'pendientes', autoevaluaciones_jefes_pendientes,
      'porcentajeCompletitud', CASE
        WHEN autoevaluaciones_jefes_esperadas > 0 THEN
          ROUND((autoevaluaciones_jefes_completadas::NUMERIC / autoevaluaciones_jefes_esperadas::NUMERIC) * 100, 2)
        ELSE 0
      END
    ),
    
    -- Autoevaluaciones de colaboradores
    'autoevaluacionesColaboradores', jsonb_build_object(
      'esperadas', autoevaluaciones_colaboradores_esperadas,
      'completadas', autoevaluaciones_colaboradores_completadas,
      'enProgreso', autoevaluaciones_colaboradores_en_progreso,
      'pendientes', autoevaluaciones_colaboradores_pendientes,
      'porcentajeCompletitud', CASE
        WHEN autoevaluaciones_colaboradores_esperadas > 0 THEN
          ROUND((autoevaluaciones_colaboradores_completadas::NUMERIC / autoevaluaciones_colaboradores_esperadas::NUMERIC) * 100, 2)
        ELSE 0
      END
    ),
    
    -- Métricas de resultados (solo evaluaciones completadas, excluyendo administrativos)
    'metricasResultados', jsonb_build_object(
      'promedioDesempeno', COALESCE(promedio_desempeno, 0),
      'promedioPotencial', COALESCE(promedio_potencial, 0),
      'nps', jsonb_build_object(
        'promedio', COALESCE(nps_promedio, 0),
        'promoters', COALESCE(nps_promoters, 0),
        'passives', COALESCE(nps_passives, 0),
        'detractors', COALESCE(nps_detractors, 0),
        'totalRespuestas', COALESCE(nps_promoters + nps_passives + nps_detractors, 0)
      )
    )
  ) INTO resultado;
  
  RETURN resultado;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_resultados_consolidados(UUID) IS 
'Calcula resultados consolidados de elegibilidad y evaluaciones esperadas vs completadas.
Incluye población total, sujetos/no sujetos a evaluación, estado de todas las evaluaciones,
y métricas de resultados (desempeño, potencial, NPS) calculadas solo con evaluaciones completadas
y excluyendo usuarios administrativos de monitoreo (admin_general, admin_rrhh).';
