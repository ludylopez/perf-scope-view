-- Migración 030: Función para verificar evaluaciones completas sin resultado calculado
-- 
-- Esta función identifica evaluaciones que están completas (autoevaluación + evaluación del jefe)
-- pero que no tienen resultado calculado en evaluation_results_by_evaluator
-- 
-- Útil para detectar casos donde:
-- 1. El jefe evaluó antes que el empleado se autoevaluara
-- 2. El trigger no se ejecutó correctamente
-- 3. Hubo algún error durante el cálculo

-- ============================================================
-- FUNCIÓN DE VERIFICACIÓN (SOLO LECTURA)
-- ============================================================

CREATE OR REPLACE FUNCTION verificar_evaluaciones_pendientes(
  p_periodo_id UUID DEFAULT NULL
)
RETURNS TABLE(
  colaborador_id VARCHAR(20),
  colaborador_nombre TEXT,
  evaluador_id VARCHAR(20),
  evaluador_nombre TEXT,
  periodo_id UUID,
  periodo_nombre TEXT,
  autoevaluacion_id UUID,
  autoevaluacion_fecha_envio TIMESTAMP WITH TIME ZONE,
  evaluacion_jefe_id UUID,
  evaluacion_jefe_fecha_envio TIMESTAMP WITH TIME ZONE,
  fecha_autoevaluacion_anterior BOOLEAN,
  dias_diferencia INTEGER,
  estado TEXT
) AS $$
DECLARE
  v_periodo_id UUID;
BEGIN
  -- Si no se especifica período, usar el más reciente
  IF p_periodo_id IS NULL THEN
    SELECT id INTO v_periodo_id
    FROM evaluation_periods
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    v_periodo_id := p_periodo_id;
  END IF;
  
  IF v_periodo_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró un período';
  END IF;
  
  -- Buscar todas las combinaciones de autoevaluación + evaluación del jefe
  -- que están enviadas pero no tienen resultado en evaluation_results_by_evaluator
  RETURN QUERY
  SELECT DISTINCT
    e_auto.usuario_id as colaborador_id,
    COALESCE(u_colab.nombre || ' ' || u_colab.apellidos, e_auto.usuario_id) as colaborador_nombre,
    e_jefe.evaluador_id,
    COALESCE(u_jefe.nombre || ' ' || u_jefe.apellidos, e_jefe.evaluador_id) as evaluador_nombre,
    e_auto.periodo_id,
    COALESCE(ep.nombre, ep.id::TEXT) as periodo_nombre,
    e_auto.id as autoevaluacion_id,
    e_auto.fecha_envio as autoevaluacion_fecha_envio,
    e_jefe.id as evaluacion_jefe_id,
    e_jefe.fecha_envio as evaluacion_jefe_fecha_envio,
    -- Verificar si la autoevaluación se envió ANTES que la evaluación del jefe
    (e_auto.fecha_envio < e_jefe.fecha_envio) as fecha_autoevaluacion_anterior,
    -- Calcular diferencia en días
    EXTRACT(DAY FROM (e_auto.fecha_envio - e_jefe.fecha_envio))::INTEGER as dias_diferencia,
    CASE 
      WHEN e_auto.fecha_envio < e_jefe.fecha_envio THEN 
        'Autoevaluación enviada antes que evaluación del jefe (caso normal)'
      WHEN e_auto.fecha_envio > e_jefe.fecha_envio THEN 
        'Autoevaluación enviada después que evaluación del jefe (caso problemático)'
      ELSE 
        'Fechas iguales'
    END as estado
  FROM evaluations e_auto
  INNER JOIN evaluations e_jefe ON 
    e_jefe.colaborador_id = e_auto.usuario_id
    AND e_jefe.periodo_id = e_auto.periodo_id
    AND e_jefe.tipo = 'jefe'
    AND e_jefe.estado = 'enviado'
  LEFT JOIN users u_colab ON u_colab.dpi = e_auto.usuario_id
  LEFT JOIN users u_jefe ON u_jefe.dpi = e_jefe.evaluador_id
  LEFT JOIN evaluation_periods ep ON ep.id = e_auto.periodo_id
  WHERE e_auto.tipo = 'auto'
    AND e_auto.estado = 'enviado'
    AND e_auto.periodo_id = v_periodo_id
    AND NOT EXISTS (
      SELECT 1 FROM evaluation_results_by_evaluator erbe
      WHERE erbe.colaborador_id = e_auto.usuario_id
        AND erbe.periodo_id = e_auto.periodo_id
        AND erbe.evaluador_id = e_jefe.evaluador_id
    )
  ORDER BY 
    -- Priorizar casos donde autoevaluación se envió después
    CASE WHEN e_auto.fecha_envio > e_jefe.fecha_envio THEN 0 ELSE 1 END,
    e_auto.fecha_envio DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION verificar_evaluaciones_pendientes(UUID) IS 
'Verifica evaluaciones completas que no tienen resultado calculado. 
Retorna información detallada incluyendo fechas para identificar casos problemáticos.';

-- ============================================================
-- FUNCIÓN RESUMEN (ESTADÍSTICAS)
-- ============================================================

CREATE OR REPLACE FUNCTION resumen_evaluaciones_pendientes(
  p_periodo_id UUID DEFAULT NULL
)
RETURNS TABLE(
  total_pendientes INTEGER,
  casos_problematicos INTEGER,
  casos_normales INTEGER,
  periodo_id UUID,
  periodo_nombre TEXT
) AS $$
DECLARE
  v_periodo_id UUID;
BEGIN
  -- Si no se especifica período, usar el más reciente
  IF p_periodo_id IS NULL THEN
    SELECT id INTO v_periodo_id
    FROM evaluation_periods
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    v_periodo_id := p_periodo_id;
  END IF;
  
  IF v_periodo_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró un período';
  END IF;
  
  RETURN QUERY
  WITH pendientes AS (
    SELECT 
      e_auto.usuario_id as colaborador_id,
      e_jefe.evaluador_id,
      e_auto.fecha_envio as fecha_auto,
      e_jefe.fecha_envio as fecha_jefe
    FROM evaluations e_auto
    INNER JOIN evaluations e_jefe ON 
      e_jefe.colaborador_id = e_auto.usuario_id
      AND e_jefe.periodo_id = e_auto.periodo_id
      AND e_jefe.tipo = 'jefe'
      AND e_jefe.estado = 'enviado'
    WHERE e_auto.tipo = 'auto'
      AND e_auto.estado = 'enviado'
      AND e_auto.periodo_id = v_periodo_id
      AND NOT EXISTS (
        SELECT 1 FROM evaluation_results_by_evaluator erbe
        WHERE erbe.colaborador_id = e_auto.usuario_id
          AND erbe.periodo_id = e_auto.periodo_id
          AND erbe.evaluador_id = e_jefe.evaluador_id
      )
  )
  SELECT 
    COUNT(*)::INTEGER as total_pendientes,
    COUNT(*) FILTER (WHERE fecha_auto > fecha_jefe)::INTEGER as casos_problematicos,
    COUNT(*) FILTER (WHERE fecha_auto <= fecha_jefe)::INTEGER as casos_normales,
    v_periodo_id as periodo_id,
    COALESCE(ep.nombre, ep.id::TEXT) as periodo_nombre
  FROM pendientes
  LEFT JOIN evaluation_periods ep ON ep.id = v_periodo_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION resumen_evaluaciones_pendientes(UUID) IS 
'Retorna un resumen estadístico de evaluaciones pendientes de cálculo.';
