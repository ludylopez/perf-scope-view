-- Migración: Corregir rol "supervisor" a "jefe"
-- Fecha: 2025-11-17
-- Descripción: El rol "supervisor" no está definido en TypeScript y es redundante.
--              A1 (Alcalde) y C1 (Concejo) técnicamente son jefes que evalúan a otros.

-- Cambiar todos los usuarios con rol "supervisor" a "jefe"
UPDATE users 
SET rol = 'jefe',
    updated_at = NOW()
WHERE rol = 'supervisor';

-- Verificar el cambio
SELECT 
  rol,
  COUNT(*) as cantidad,
  STRING_AGG(DISTINCT nivel, ', ') as niveles
FROM users
WHERE estado = 'activo'
GROUP BY rol
ORDER BY cantidad DESC;

-- Comentario: Los usuarios A1 y C1 ahora tienen rol "jefe" pero el código
-- los identifica por su nivel (nivel = 'A1' o nivel = 'C1') para aplicar
-- reglas especiales de evaluación.


