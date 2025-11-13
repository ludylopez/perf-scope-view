-- Reescritura de get_tiempo_promedio_por_area para evitar agregados anidados
CREATE OR REPLACE FUNCTION public.get_tiempo_promedio_por_area()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  resultado JSONB;
BEGIN
  WITH user_antiguedad AS (
    SELECT 
      dpi,
      area,
      calcular_antiguedad_meses(dpi) AS meses_antiguedad,
      fecha_ingreso
    FROM users
    WHERE estado = 'activo' AND rol IN ('colaborador', 'jefe')
  ),
  area_agregado AS (
    SELECT 
      area,
      COALESCE(AVG(meses_antiguedad) FILTER (WHERE fecha_ingreso IS NOT NULL), 0) AS promedio_meses,
      COUNT(*) AS total_colaboradores,
      COUNT(*) FILTER (WHERE fecha_ingreso IS NOT NULL) AS con_fecha
    FROM user_antiguedad
    GROUP BY area
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'area', area,
      'promedioMeses', promedio_meses,
      'totalColaboradores', total_colaboradores,
      'conFechaIngreso', con_fecha
    )
    ORDER BY area
  ) INTO resultado
  FROM area_agregado;

  RETURN COALESCE(resultado, '[]'::jsonb);
END;
$$;