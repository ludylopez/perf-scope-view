-- Migración: Corregir función get_seguimiento_evaluaciones
-- Soluciona el error 400 Bad Request causado por DISTINCT y ORDER BY en jsonb_agg

CREATE OR REPLACE FUNCTION get_seguimiento_evaluaciones(periodo_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  resultados JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'jefeId', jefe.dpi,
      'jefeNombre', jefe.nombre || ' ' || jefe.apellidos,
      'jefeCargo', jefe.cargo,
      'jefeArea', jefe.area,
      'jefeNivel', jefe.nivel,
      'jefeCorreo', jefe.correo,
      'totalColaboradores', total_colaboradores,
      'evaluacionesCompletadas', evaluaciones_completadas,
      'evaluacionesEnProgreso', evaluaciones_en_progreso,
      'evaluacionesPendientes', evaluaciones_pendientes,
      'porcentajeCompletitud', CASE 
        WHEN total_colaboradores > 0 THEN 
          ROUND((evaluaciones_completadas::NUMERIC / total_colaboradores::NUMERIC) * 100, 2)
        ELSE 0
      END,
      'ultimaActividad', ultima_actividad,
      'diasSinActividad', dias_sin_actividad,
      'estadoGeneral', CASE
        WHEN evaluaciones_pendientes = total_colaboradores THEN 'pendiente'
        WHEN evaluaciones_completadas = total_colaboradores THEN 'completado'
        WHEN evaluaciones_en_progreso > 0 OR evaluaciones_completadas > 0 THEN 'en_progreso'
        ELSE 'pendiente'
      END,
      'colaboradoresDetalle', colaboradores_detalle
    )
    ORDER BY 
      CASE 
        WHEN evaluaciones_pendientes = total_colaboradores THEN 1
        WHEN evaluaciones_completadas = total_colaboradores THEN 3
        ELSE 2
      END,
      dias_sin_actividad DESC NULLS LAST,
      evaluaciones_pendientes DESC
  ) INTO resultados
  FROM (
    SELECT 
      jefe.dpi,
      jefe.nombre,
      jefe.apellidos,
      jefe.cargo,
      jefe.area,
      jefe.nivel,
      jefe.correo,
      COUNT(DISTINCT ua.colaborador_id) as total_colaboradores,
      COUNT(DISTINCT CASE WHEN e.estado = 'enviado' THEN e.colaborador_id END) as evaluaciones_completadas,
      COUNT(DISTINCT CASE WHEN e.estado = 'borrador' THEN e.colaborador_id END) as evaluaciones_en_progreso,
      COUNT(DISTINCT ua.colaborador_id) - 
        COUNT(DISTINCT CASE WHEN e.estado IN ('enviado', 'borrador') THEN e.colaborador_id END) as evaluaciones_pendientes,
      MAX(GREATEST(
        COALESCE(e.fecha_ultima_modificacion, e.updated_at),
        COALESCE(e.created_at, '1970-01-01'::timestamp)
      )) as ultima_actividad,
      EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MAX(GREATEST(
        COALESCE(e.fecha_ultima_modificacion, e.updated_at),
        COALESCE(e.created_at, '1970-01-01'::timestamp)
      ))))::INTEGER as dias_sin_actividad,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'colaboradorId', colab.dpi,
              'colaboradorNombre', colab.nombre || ' ' || colab.apellidos,
              'colaboradorCargo', colab.cargo,
              'colaboradorArea', colab.area,
              'estadoEvaluacion', COALESCE(e2.estado, 'pendiente'),
              'progreso', COALESCE(e2.progreso, 0),
              'fechaUltimaModificacion', COALESCE(e2.fecha_ultima_modificacion, e2.updated_at, e2.created_at),
              'diasSinActividad', CASE 
                WHEN e2.id IS NOT NULL THEN
                  EXTRACT(DAY FROM (CURRENT_TIMESTAMP - GREATEST(
                    COALESCE(e2.fecha_ultima_modificacion, e2.updated_at),
                    COALESCE(e2.created_at, '1970-01-01'::timestamp)
                  )))::INTEGER
                ELSE NULL
              END
            )
            ORDER BY 
              CASE COALESCE(e2.estado, 'pendiente')
                WHEN 'pendiente' THEN 1
                WHEN 'borrador' THEN 2
                WHEN 'enviado' THEN 3
                ELSE 4
              END
          )
          FROM user_assignments ua2
          INNER JOIN users colab ON colab.dpi = ua2.colaborador_id AND colab.estado = 'activo'
          LEFT JOIN evaluations e2 ON e2.evaluador_id = jefe.dpi 
            AND e2.colaborador_id = colab.dpi
            AND e2.periodo_id = periodo_id_param
            AND e2.tipo = 'jefe'
          WHERE ua2.jefe_id = jefe.dpi 
            AND ua2.activo = true
            AND colab.dpi IS NOT NULL
        ),
        '[]'::jsonb
      ) as colaboradores_detalle
    FROM users jefe
    INNER JOIN user_assignments ua ON ua.jefe_id = jefe.dpi AND ua.activo = true
    INNER JOIN users colab ON colab.dpi = ua.colaborador_id AND colab.estado = 'activo'
    LEFT JOIN evaluations e ON e.evaluador_id = jefe.dpi 
      AND e.colaborador_id = colab.dpi
      AND e.periodo_id = periodo_id_param
      AND e.tipo = 'jefe'
    WHERE jefe.estado = 'activo' 
      AND jefe.rol = 'jefe'
    GROUP BY jefe.dpi, jefe.nombre, jefe.apellidos, jefe.cargo, jefe.area, jefe.nivel, jefe.correo
    HAVING COUNT(DISTINCT ua.colaborador_id) > 0
  ) jefe_stats
  JOIN users jefe ON jefe.dpi = jefe_stats.dpi;
  
  RETURN COALESCE(resultados, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_seguimiento_evaluaciones(UUID) IS 'Obtiene el seguimiento de cumplimiento de evaluaciones por jefe, incluyendo estado, colaboradores pendientes y última actividad';

