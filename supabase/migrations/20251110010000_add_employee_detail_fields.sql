-- Migración: Agregar campos adicionales de información del colaborador
-- Agrega campos que estaban en el Excel original pero no se estaban importando

-- ============================================================
-- 1. AGREGAR NUEVAS COLUMNAS A LA TABLA USERS
-- ============================================================

-- Dirección o Unidad (ej: CONSERVACIÓN EDIFICIO(S) PÚBLICOS)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS direccion_unidad VARCHAR(255);

COMMENT ON COLUMN users.direccion_unidad IS 'Dirección o unidad organizacional donde trabaja el colaborador';

-- Departamento o Dependencia (área administrativa específica)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS departamento_dependencia VARCHAR(255);

COMMENT ON COLUMN users.departamento_dependencia IS 'Departamento o dependencia administrativa del colaborador';

-- Renglón presupuestario
ALTER TABLE users
ADD COLUMN IF NOT EXISTS renglon VARCHAR(50);

COMMENT ON COLUMN users.renglon IS 'Renglón presupuestario (011, 021, 022, 029, 031, etc.)';

-- Profesión u oficio
ALTER TABLE users
ADD COLUMN IF NOT EXISTS profesion VARCHAR(255);

COMMENT ON COLUMN users.profesion IS 'Profesión, oficio o especialidad del colaborador';

-- ============================================================
-- 2. CREAR ÍNDICES PARA BÚSQUEDAS Y FILTROS
-- ============================================================

-- Índice para búsquedas por dirección/unidad
CREATE INDEX IF NOT EXISTS idx_users_direccion_unidad
ON users(direccion_unidad)
WHERE direccion_unidad IS NOT NULL;

-- Índice para búsquedas por departamento
CREATE INDEX IF NOT EXISTS idx_users_departamento_dependencia
ON users(departamento_dependencia)
WHERE departamento_dependencia IS NOT NULL;

-- Índice para filtros por renglón
CREATE INDEX IF NOT EXISTS idx_users_renglon
ON users(renglon)
WHERE renglon IS NOT NULL;

-- ============================================================
-- 3. NOTAS SOBRE EL CAMPO 'AREA'
-- ============================================================

-- El campo 'area' existente se mantiene como campo genérico
-- Los nuevos campos permiten mayor granularidad:
--   - direccion_unidad: Unidad organizacional específica
--   - departamento_dependencia: Departamento administrativo
--   - area: Campo genérico/legado que puede seguir usándose

COMMENT ON COLUMN users.area IS 'Área genérica (campo legado). Se recomienda usar direccion_unidad o departamento_dependencia para mayor precisión';

-- ============================================================
-- 4. VERIFICACIÓN
-- ============================================================

-- Verificar que las columnas fueron agregadas correctamente
DO $$
DECLARE
  v_columns TEXT;
BEGIN
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
  INTO v_columns
  FROM information_schema.columns
  WHERE table_name = 'users'
    AND table_schema = 'public'
    AND column_name IN ('direccion_unidad', 'departamento_dependencia', 'renglon', 'profesion');

  RAISE NOTICE 'Columnas agregadas a users: %', v_columns;
END $$;
