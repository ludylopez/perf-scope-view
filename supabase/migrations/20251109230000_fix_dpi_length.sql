-- Migración para asegurar que el campo DPI tenga el tamaño correcto
-- Los DPI guatemaltecos tienen 13 dígitos, necesitamos al menos VARCHAR(15)

-- Verificar y actualizar el tamaño del campo DPI si es necesario
ALTER TABLE users ALTER COLUMN dpi TYPE VARCHAR(20);

-- Comentario descriptivo
COMMENT ON COLUMN users.dpi IS 'Documento Personal de Identificación (DPI) - 13 dígitos sin espacios';
