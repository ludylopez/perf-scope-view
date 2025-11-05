-- Migración: Métricas de desarrollo y progresión + Dashboard ejecutivo
-- Agrega funciones para análisis de progresión histórica y KPIs estratégicos

-- 1. Función para obtener métricas de progresión de desempeño (comparación entre períodos)
CREATE OR REPLACE FUNCTION get_progresion_desempeno(periodo_actual_id UUID, periodo_anterior_id UUID)
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'colaboradorId', u.dpi,
      'nombreCompleto', u.nombre || ' ' || u.apellidos,
      'area', u.area,
      'nivel', u.nivel,
      'desempenoActual', fer_actual.desempeno_porcentaje,
      'desempenoAnterior', fer_anterior.desempeno_porcentaje,
      'diferencia', COALESCE(fer_actual.desempeno_porcentaje, 0) - COALESCE(fer_anterior.desempeno_porcentaje, 0),
      'potencialActual', fer_actual.potencial_porcentaje,
      'potencialAnterior', fer_anterior.potencial_porcentaje,
      'mejoraDesempeno', CASE 
        WHEN fer_anterior.desempeno_porcentaje IS NOT NULL AND fer_actual.desempeno_porcentaje IS NOT NULL THEN
          fer_actual.desempeno_porcentaje > fer_anterior.desempeno_porcentaje
        ELSE false
      END,
      'tasaMejora', CASE 
        WHEN fer_anterior.desempeno_porcentaje IS NOT NULL AND fer_anterior.desempeno_porcentaje > 0 THEN
          ROUND(((fer_actual.desempeno_porcentaje - fer_anterior.desempeno_porcentaje) / fer_anterior.desempeno_porcentaje) * 100, 2)
        ELSE NULL
      END
    )
    ORDER BY COALESCE(fer_actual.desempeno_porcentaje, 0) - COALESCE(fer_anterior.desempeno_porcentaje, 0) DESC
  ) INTO resultados
  FROM users u
  LEFT JOIN final_evaluation_results fer_actual ON fer_actual.colaborador_id = u.dpi 
    AND fer_actual.periodo_id = periodo_actual_id
  LEFT JOIN final_evaluation_results fer_anterior ON fer_anterior.colaborador_id = u.dpi 
    AND fer_anterior.periodo_id = periodo_anterior_id
  WHERE u.estado = 'activo' 
    AND u.rol IN ('colaborador', 'jefe')
    AND (fer_actual.desempeno_porcentaje IS NOT NULL OR fer_anterior.desempeno_porcentaje IS NOT NULL);
  
  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_progresion_desempeno(UUID, UUID) IS 'Compara desempeño entre dos períodos para identificar progresión';

-- 2. Función para obtener colaboradores con mejor progresión
CREATE OR REPLACE FUNCTION get_top_mejoras(periodo_actual_id UUID, periodo_anterior_id UUID, limite INTEGER DEFAULT 10)
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'colaboradorId', u.dpi,
      'nombreCompleto', u.nombre || ' ' || u.apellidos,
      'area', u.area,
      'nivel', u.nivel,
      'desempenoActual', fer_actual.desempeno_porcentaje,
      'desempenoAnterior', fer_anterior.desempeno_porcentaje,
      'mejora', fer_actual.desempeno_porcentaje - fer_anterior.desempeno_porcentaje,
      'tasaMejora', ROUND(((fer_actual.desempeno_porcentaje - fer_anterior.desempeno_porcentaje) / fer_anterior.desempeno_porcentaje) * 100, 2)
    )
  ) INTO resultados
  FROM (
    SELECT 
      u.dpi,
      u.nombre,
      u.apellidos,
      u.area,
      u.nivel,
      fer_actual.desempeno_porcentaje as desempeno_actual,
      fer_anterior.desempeno_porcentaje as desempeno_anterior
    FROM users u
    LEFT JOIN final_evaluation_results fer_actual ON fer_actual.colaborador_id = u.dpi 
      AND fer_actual.periodo_id = periodo_actual_id
    LEFT JOIN final_evaluation_results fer_anterior ON fer_anterior.colaborador_id = u.dpi 
      AND fer_anterior.periodo_id = periodo_anterior_id
    WHERE u.estado = 'activo' 
      AND u.rol IN ('colaborador', 'jefe')
      AND fer_actual.desempeno_porcentaje IS NOT NULL
      AND fer_anterior.desempeno_porcentaje IS NOT NULL
      AND fer_actual.desempeno_porcentaje > fer_anterior.desempeno_porcentaje
    ORDER BY (fer_actual.desempeno_porcentaje - fer_anterior.desempeno_porcentaje) DESC
    LIMIT limite
  ) top_mejoras
  JOIN users u ON u.dpi = top_mejoras.dpi;
  
  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_top_mejoras(UUID, UUID, INTEGER) IS 'Obtiene los colaboradores con mayor mejora en desempeño entre períodos';

-- 3. Función para obtener KPIs estratégicos del dashboard ejecutivo
CREATE OR REPLACE FUNCTION get_executive_kpis(periodo_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  kpis JSONB;
  total_activos INTEGER;
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
  -- Total activos
  SELECT COUNT(*) INTO total_activos
  FROM users
  WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe');
  
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
  
  -- Tasa de completitud
  SELECT COUNT(*) INTO total_activos
  FROM users
  WHERE estado = 'activo' AND rol = 'jefe';
  
  tasa_completitud := CASE 
    WHEN total_activos > 0 THEN ROUND((evaluaciones_completadas::NUMERIC / total_activos::NUMERIC) * 100, 2)
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

COMMENT ON FUNCTION get_executive_kpis(UUID) IS 'Obtiene KPIs estratégicos para el dashboard ejecutivo';

-- 4. Función para obtener métricas de desarrollo por área
CREATE OR REPLACE FUNCTION get_desarrollo_por_area(periodo_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'area', u.area,
      'totalColaboradores', COUNT(DISTINCT u.dpi),
      'evaluacionesCompletadas', COUNT(DISTINCT fer.colaborador_id) FILTER (WHERE fer.periodo_id = periodo_id_param),
      'promedioDesempeno', AVG(fer.desempeno_porcentaje) FILTER (WHERE fer.desempeno_porcentaje IS NOT NULL),
      'promedioPotencial', AVG(fer.potencial_porcentaje) FILTER (WHERE fer.potencial_porcentaje IS NOT NULL),
      'colaboradoresAltoPotencial', COUNT(*) FILTER (WHERE fer.posicion_9box IN ('alto-alto', 'alto-medio')),
      'colaboradoresRiesgo', COUNT(*) FILTER (WHERE fer.posicion_9box IN ('bajo-bajo', 'bajo-medio')),
      'colaboradoresConPlan', COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM development_plans dp 
        WHERE dp.colaborador_id = u.dpi 
        AND dp.periodo_id = periodo_id_param
      )),
      'indiceDesarrollo', AVG((fer.desempeno_porcentaje + fer.potencial_porcentaje) / 2) FILTER (
        WHERE fer.desempeno_porcentaje IS NOT NULL AND fer.potencial_porcentaje IS NOT NULL
      )
    )
    ORDER BY AVG((fer.desempeno_porcentaje + fer.potencial_porcentaje) / 2) DESC NULLS LAST
  ) INTO resultados
  FROM users u
  LEFT JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi 
    AND fer.periodo_id = periodo_id_param
  WHERE u.estado = 'activo' AND u.rol IN ('colaborador', 'jefe')
  GROUP BY u.area;
  
  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_desarrollo_por_area(UUID) IS 'Métricas de desarrollo y planes de desarrollo por área';

-- 5. Función consolidada para métricas de desarrollo y progresión
CREATE OR REPLACE FUNCTION get_desarrollo_metrics(periodo_actual_id UUID, periodo_anterior_id UUID)
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  SELECT jsonb_build_object(
    'progresionDesempeno', get_progresion_desempeno(periodo_actual_id, periodo_anterior_id),
    'topMejoras', get_top_mejoras(periodo_actual_id, periodo_anterior_id, 10),
    'desarrolloPorArea', get_desarrollo_por_area(periodo_actual_id),
    'resumenProgresion', (
      SELECT jsonb_build_object(
        'totalColaboradoresComparados', COUNT(*),
        'colaboradoresConMejora', COUNT(*) FILTER (WHERE mejora > 0),
        'colaboradoresSinCambio', COUNT(*) FILTER (WHERE mejora = 0),
        'colaboradoresConRetroceso', COUNT(*) FILTER (WHERE mejora < 0),
        'promedioMejora', AVG(mejora),
        'maximaMejora', MAX(mejora),
        'promedioTasaMejora', AVG(tasa_mejora)
      )
      FROM (
        SELECT 
          fer_actual.desempeno_porcentaje - fer_anterior.desempeno_porcentaje as mejora,
          CASE 
            WHEN fer_anterior.desempeno_porcentaje > 0 THEN
              ((fer_actual.desempeno_porcentaje - fer_anterior.desempeno_porcentaje) / fer_anterior.desempeno_porcentaje) * 100
            ELSE NULL
          END as tasa_mejora
        FROM users u
        JOIN final_evaluation_results fer_actual ON fer_actual.colaborador_id = u.dpi 
          AND fer_actual.periodo_id = periodo_actual_id
        JOIN final_evaluation_results fer_anterior ON fer_anterior.colaborador_id = u.dpi 
          AND fer_anterior.periodo_id = periodo_anterior_id
        WHERE u.estado = 'activo' 
          AND u.rol IN ('colaborador', 'jefe')
          AND fer_actual.desempeno_porcentaje IS NOT NULL
          AND fer_anterior.desempeno_porcentaje IS NOT NULL
      ) progresion
    )
  ) INTO resultados;
  
  RETURN COALESCE(resultados, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_desarrollo_metrics(UUID, UUID) IS 'Obtiene todas las métricas de desarrollo y progresión entre dos períodos';

