-- Reescritura de get_genero_stats para evitar agregados anidados
CREATE OR REPLACE FUNCTION public.get_genero_stats(periodo_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  resultado JSONB;
BEGIN
  WITH base AS (
    SELECT 
      u.genero,
      u.dpi,
      u.fecha_ingreso,
      calcular_antiguedad_meses(u.dpi) AS meses,
      fer.desempeno_porcentaje,
      fer.potencial_porcentaje,
      COALESCE(fer.posicion_9box, 'sin-calcular') AS posicion
    FROM users u
    LEFT JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi 
      AND fer.periodo_id = periodo_id_param
    WHERE u.estado = 'activo' AND u.rol IN ('colaborador', 'jefe')
  ), agg AS (
    SELECT 
      genero,
      COUNT(*) AS total_colaboradores,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM evaluations e 
          WHERE e.colaborador_id = base.dpi 
            AND e.periodo_id = periodo_id_param 
            AND e.tipo = 'jefe' 
            AND e.estado = 'enviado'
        )
      ) AS evaluaciones_completadas,
      AVG(desempeno_porcentaje) FILTER (WHERE desempeno_porcentaje IS NOT NULL) AS promedio_desempeno,
      AVG(potencial_porcentaje) FILTER (WHERE potencial_porcentaje IS NOT NULL) AS promedio_potencial,
      AVG(meses) FILTER (WHERE fecha_ingreso IS NOT NULL) AS promedio_antiguedad
    FROM base
    GROUP BY genero
  ), dist AS (
    SELECT genero, jsonb_object_agg(posicion, cnt) AS distribucion_9box
    FROM (
      SELECT genero, posicion, COUNT(*) AS cnt
      FROM base
      GROUP BY genero, posicion
    ) s
    GROUP BY genero
  ), final AS (
    SELECT 
      a.genero,
      a.total_colaboradores,
      a.evaluaciones_completadas,
      a.promedio_desempeno,
      a.promedio_potencial,
      a.promedio_antiguedad,
      COALESCE(d.distribucion_9box, '{}'::jsonb) AS distribucion_9box
    FROM agg a
    LEFT JOIN dist d USING (genero)
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'genero', COALESCE(genero, 'no_especificado'),
      'totalColaboradores', total_colaboradores,
      'evaluacionesCompletadas', evaluaciones_completadas,
      'promedioDesempeno', ROUND(COALESCE(promedio_desempeno, 0), 2),
      'promedioPotencial', ROUND(COALESCE(promedio_potencial, 0), 2),
      'promedioAntiguedad', ROUND(COALESCE(promedio_antiguedad, 0), 2),
      'distribucion9Box', distribucion_9box
    )
  ) INTO resultado
  FROM final;

  RETURN COALESCE(resultado, '[]'::jsonb);
END;
$$;