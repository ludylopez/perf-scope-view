-- DIAGNÓSTICO: Identificar autoevaluaciones de colaboradores con inconsistencias
-- Este script solo muestra las inconsistencias, NO las corrige

-- Ver autoevaluaciones de colaboradores con fecha_envio pero estado = 'borrador'
SELECT 
  e.id,
  e.usuario_id,
  u.nombre || ' ' || u.apellidos as nombre_completo,
  u.rol,
  u.cargo,
  u.area,
  ep.nombre as periodo,
  e.estado,
  e.progreso,
  e.fecha_envio,
  e.fecha_ultima_modificacion,
  CASE 
    WHEN e.fecha_envio IS NOT NULL AND e.estado = 'borrador' THEN 'Tiene fecha_envio pero estado borrador'
    WHEN e.progreso = 100 AND e.estado = 'borrador' THEN 'Progreso 100% pero estado borrador'
    ELSE 'OK'
  END as inconsistencia
FROM evaluations e
INNER JOIN users u ON e.usuario_id = u.dpi
LEFT JOIN evaluation_periods ep ON e.periodo_id = ep.id
WHERE e.tipo = 'auto'
  AND u.rol = 'colaborador'
  AND (
    (e.fecha_envio IS NOT NULL AND e.estado = 'borrador')
    OR (e.progreso = 100 AND e.estado = 'borrador')
  )
ORDER BY e.fecha_ultima_modificacion DESC;




