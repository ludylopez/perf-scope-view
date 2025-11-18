-- Migración: Agregar soporte para contraseñas personalizadas
-- Fecha: 2025-11-26
-- Descripción: Agrega columna password_hash para permitir contraseñas personalizadas
--               manteniendo compatibilidad con fecha_nacimiento como fallback

-- Agregar columna password_hash a la tabla users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NULL;

-- Comentario para documentación
COMMENT ON COLUMN users.password_hash IS 'Hash de contraseña personalizada. Si es NULL, se usa fecha_nacimiento como contraseña por defecto';

-- Índice para búsquedas (aunque no es necesario para login, puede ser útil)
CREATE INDEX IF NOT EXISTS idx_users_password_hash 
ON users(password_hash) 
WHERE password_hash IS NOT NULL;

