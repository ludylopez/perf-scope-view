-- Reescritura de get_9box_por_antiguedad para evitar agregados anidados
CREATE OR REPLACE FUNCTION public.get_9box_por_antiguedad(periodo_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  resultado JSONB;
BEGIN
  WITH base AS (
    SELECT 
      u.dpi,
      CASE 
        WHEN calcular_antiguedad_meses(u.dpi) < 3 THEN '0-3 meses'
        WHEN calcular_antiguedad_meses(u.dpi) < 6 THEN '3-6 meses'
        WHEN calcular_antiguedad_meses(u.dpi) < 12 THEN '6-12 meses'
        WHEN calcular_antiguedad_meses(u.dpi) < 36 THEN '1-3 años'
        WHEN calcular_antiguedad_meses(u.dpi) < 60 THEN '3-5 años'
        ELSE '5+ años'
      END AS rango,
      CASE 
        WHEN calcular_antiguedad_meses(u.dpi) < 3 THEN 1
        WHEN calcular_antiguedad_meses(u.dpi) < 6 THEN 2
        WHEN calcular_antiguedad_meses(u.dpi) < 12 THEN 3
        WHEN calcular_antiguedad_meses(u.dpi) < 36 THEN 4
        WHEN calcular_antiguedad_meses(u.dpi) < 60 THEN 5
        ELSE 6
      END AS orden,
      COALESCE(fer.posicion_9box, 'sin-calcular') AS posicion_9box
    FROM users u
    LEFT JOIN final_evaluation_results fer 
      ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
    WHERE u.estado = 'activo' 
      AND u.rol IN ('colaborador', 'jefe')
      AND u.fecha_ingreso IS NOT NULL
  ), rangos AS (
    SELECT rango, orden, posicion_9box, COUNT(*) AS cnt
    FROM base
    GROUP BY rango, orden, posicion_9box
  ), rangos_json AS (
    SELECT rango, orden, jsonb_object_agg(posicion_9box, cnt) AS distribucion_9box
    FROM rangos
    GROUP BY rango, orden
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'rangoAntiguedad', rango,
      'distribucion9Box', distribucion_9box
    )
    ORDER BY orden
  ) INTO resultado
  FROM rangos_json;

  RETURN COALESCE(resultado, '[]'::jsonb);
END;
$$;