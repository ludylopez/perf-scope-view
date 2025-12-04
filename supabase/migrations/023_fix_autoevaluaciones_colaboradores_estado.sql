-- Script para identificar y corregir autoevaluaciones de colaboradores
-- que están completadas pero aparecen como "en progreso"

-- Primero, vamos a identificar las inconsistencias:
-- 1. Autoevaluaciones con fecha_envio pero estado = 'borrador'
-- 2. Autoevaluaciones con progreso = 100 pero estado = 'borrador'

-- Ver autoevaluaciones de colaboradores con fecha_envio pero estado = 'borrador'
SELECT 
  e.id,
  e.usuario_id,
  u.nombre || ' ' || u.apellidos as nombre_completo,
  u.rol,
  e.periodo_id,
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
WHERE e.tipo = 'auto'
  AND u.rol = 'colaborador'
  AND (
    (e.fecha_envio IS NOT NULL AND e.estado = 'borrador')
    OR (e.progreso = 100 AND e.estado = 'borrador')
  )
ORDER BY e.fecha_ultima_modificacion DESC;

-- Corregir: Actualizar estado a 'enviado' para autoevaluaciones que tienen fecha_envio pero estado = 'borrador'
UPDATE evaluations e
SET estado = 'enviado',
    updated_at = NOW()
WHERE e.tipo = 'auto'
  AND e.estado = 'borrador'
  AND e.fecha_envio IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM users u 
    WHERE u.dpi = e.usuario_id 
    AND u.rol = 'colaborador'
  );

-- Corregir: Actualizar estado a 'enviado' para autoevaluaciones con progreso = 100 pero estado = 'borrador'
-- (solo si no tienen fecha_envio, la agregamos también)
UPDATE evaluations e
SET estado = 'enviado',
    fecha_envio = COALESCE(e.fecha_envio, e.fecha_ultima_modificacion, NOW()),
    updated_at = NOW()
WHERE e.tipo = 'auto'
  AND e.estado = 'borrador'
  AND e.progreso = 100
  AND EXISTS (
    SELECT 1 FROM users u 
    WHERE u.dpi = e.usuario_id 
    AND u.rol = 'colaborador'
  );

-- Verificar el resultado después de la corrección
SELECT 
  COUNT(*) as total_autoevaluaciones_colaboradores,
  COUNT(*) FILTER (WHERE estado = 'enviado') as completadas,
  COUNT(*) FILTER (WHERE estado = 'borrador') as en_progreso,
  COUNT(*) FILTER (WHERE fecha_envio IS NOT NULL AND estado = 'borrador') as inconsistencias_restantes
FROM evaluations e
INNER JOIN users u ON e.usuario_id = u.dpi
WHERE e.tipo = 'auto'
  AND u.rol = 'colaborador';




