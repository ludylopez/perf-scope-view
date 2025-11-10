-- Migración: Fix tipo_puesto trigger to use BEFORE INSERT
-- Problema: El trigger actual usa AFTER INSERT y hace UPDATE, lo cual falla
-- Solución: Usar BEFORE INSERT y setear NEW.tipo_puesto directamente

-- ============================================================
-- 1. ELIMINAR TRIGGER ACTUAL QUE USA AFTER INSERT
-- ============================================================

DROP TRIGGER IF EXISTS trigger_sync_tipo_puesto ON users;
DROP FUNCTION IF EXISTS sync_tipo_puesto_from_job_level();

-- ============================================================
-- 2. CREAR NUEVO TRIGGER CON BEFORE INSERT
-- ============================================================

CREATE OR REPLACE FUNCTION sync_tipo_puesto_from_job_level()
RETURNS TRIGGER AS $$
BEGIN
  -- Sincronizar automáticamente el tipo_puesto desde job_levels
  -- cuando se inserta o actualiza un usuario con un nivel
  IF NEW.nivel IS NOT NULL THEN
    -- Obtener la categoría desde job_levels y asignarla directamente
    SELECT jl.category INTO NEW.tipo_puesto
    FROM job_levels jl
    WHERE jl.code = NEW.nivel
    LIMIT 1;

    -- Si no se encontró el nivel, dejar tipo_puesto como está
    -- (esto no debería ocurrir si la FK está bien configurada)
    IF NEW.tipo_puesto IS NULL THEN
      RAISE NOTICE 'Nivel % no encontrado en job_levels para usuario %', NEW.nivel, NEW.dpi;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_tipo_puesto_from_job_level() IS 'Sincroniza automáticamente tipo_puesto desde job_levels usando BEFORE trigger';

-- Aplicar trigger a inserts y updates ANTES de la operación
CREATE TRIGGER trigger_sync_tipo_puesto
  BEFORE INSERT OR UPDATE OF nivel ON users
  FOR EACH ROW
  WHEN (NEW.nivel IS NOT NULL)
  EXECUTE FUNCTION sync_tipo_puesto_from_job_level();

-- ============================================================
-- 3. ACTUALIZAR USUARIOS EXISTENTES CON TIPO_PUESTO NULL
-- ============================================================

-- Sincronizar tipo_puesto de usuarios existentes que tengan nivel pero no tipo_puesto
UPDATE users u
SET tipo_puesto = jl.category
FROM job_levels jl
WHERE u.nivel = jl.code
  AND u.tipo_puesto IS NULL;

-- Verificar cuántos usuarios fueron actualizados
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_updated_count
  FROM users
  WHERE tipo_puesto IS NOT NULL AND nivel IS NOT NULL;

  RAISE NOTICE 'Usuarios con tipo_puesto sincronizado: %', v_updated_count;
END $$;
