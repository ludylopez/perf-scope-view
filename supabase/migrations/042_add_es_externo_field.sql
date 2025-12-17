-- Migración: Agregar campo es_externo para identificar evaluadores externos
-- Fecha: 2025-01-XX
-- Descripción: Agrega campo booleano para identificar usuarios externos que no deben autoevaluarse

-- 1. Agregar columna es_externo a la tabla users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS es_externo BOOLEAN DEFAULT false;

-- Comentario para documentación
COMMENT ON COLUMN users.es_externo IS 'Indica si el usuario es un evaluador externo (auditor externo, consultor, etc.) que no debe autoevaluarse. Los usuarios externos pueden evaluar a otros pero no deben autoevaluarse.';

-- 2. Crear índice para mejorar consultas que filtran por es_externo
CREATE INDEX IF NOT EXISTS idx_users_es_externo 
ON users(es_externo) 
WHERE es_externo = true;

-- 3. Marcar al usuario específico como externo (Bernal Josué Martínez)
-- NOTA: Ejecutar manualmente después de verificar el DPI correcto del usuario
-- UPDATE users SET es_externo = true 
-- WHERE nombre ILIKE '%Bernal%' 
--   AND apellidos ILIKE '%Martínez%'
--   AND nombre ILIKE '%Josué%';

-- 4. Verificación: Ver usuarios marcados como externos
-- SELECT dpi, nombre, apellidos, cargo, area, es_externo 
-- FROM users 
-- WHERE es_externo = true;

