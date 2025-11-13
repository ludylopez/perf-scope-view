-- Fix get_tendencia_semanal JSON extraction for 'completadas' and robust interval math
CREATE OR REPLACE FUNCTION public.get_tendencia_semanal(periodo_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  fecha_inicio_periodo DATE;
  fecha_fin_periodo DATE;
  fecha_actual DATE;
  dias_totales INTEGER;
  dias_por_semana NUMERIC;
  semanas JSONB;
BEGIN
  -- Obtener fechas del período (convertir TIMESTAMP a DATE)
  SELECT DATE(ep.fecha_inicio), DATE(ep.fecha_fin)
    INTO fecha_inicio_periodo, fecha_fin_periodo
  FROM evaluation_periods ep
  WHERE ep.id = periodo_id_param;
  
  -- Si no hay fechas en el período, usar fechas basadas en evaluaciones
  IF fecha_inicio_periodo IS NULL OR fecha_fin_periodo IS NULL THEN
    SELECT 
      DATE(MIN(e.created_at)),
      DATE(MAX(COALESCE(e.updated_at, e.created_at)))
    INTO fecha_inicio_periodo, fecha_fin_periodo
    FROM evaluations e
    WHERE e.periodo_id = periodo_id_param;
    
    -- Si aún no hay datos, usar fecha actual como referencia
    IF fecha_inicio_periodo IS NULL THEN
      fecha_inicio_periodo := CURRENT_DATE - INTERVAL '30 days';
      fecha_fin_periodo := CURRENT_DATE;
    END IF;
  END IF;
  
  fecha_actual := CURRENT_DATE;
  dias_totales := GREATEST(1, fecha_actual - fecha_inicio_periodo);
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
              -- Usar INTERVAL con días enteros calculados
              WHEN COALESCE(e.fecha_envio::date, DATE(e.updated_at)) <= fecha_inicio_periodo + (((dias_por_semana * 1)::int || ' days')::INTERVAL) THEN 1
              WHEN COALESCE(e.fecha_envio::date, DATE(e.updated_at)) <= fecha_inicio_periodo + (((dias_por_semana * 2)::int || ' days')::INTERVAL) THEN 2
              WHEN COALESCE(e.fecha_envio::date, DATE(e.updated_at)) <= fecha_inicio_periodo + (((dias_por_semana * 3)::int || ' days')::INTERVAL) THEN 3
              WHEN COALESCE(e.fecha_envio::date, DATE(e.updated_at)) <= fecha_inicio_periodo + (((dias_por_semana * 4)::int || ' days')::INTERVAL) THEN 4
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
      'completadas', COALESCE((
        SELECT (elem->>'completadas')::INTEGER 
        FROM jsonb_array_elements(semanas) AS elem 
        WHERE elem->>'semana' = sb.semana_label 
        LIMIT 1
      ), 0)
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
$function$;