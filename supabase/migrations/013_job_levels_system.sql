-- Migración 013: Sistema de Niveles de Puesto (Job Levels)
-- Esta migración crea el sistema completo de gestión de niveles de puesto
-- que reemplaza el uso directo de códigos de nivel por un catálogo normalizado

-- ============================================================
-- 1. CREAR TABLA job_levels
-- ============================================================

CREATE TABLE IF NOT EXISTS job_levels (
  code VARCHAR(10) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  hierarchical_order DECIMAL(3,1) NOT NULL UNIQUE,
  category VARCHAR(20) NOT NULL CHECK (category IN ('administrativo', 'operativo')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_hierarchical_order CHECK (hierarchical_order > 0)
);

COMMENT ON TABLE job_levels IS 'Catálogo de niveles de puesto con jerarquía organizacional';
COMMENT ON COLUMN job_levels.code IS 'Código único del nivel (A1, A2, S2, D1, etc.)';
COMMENT ON COLUMN job_levels.name IS 'Nombre descriptivo del nivel';
COMMENT ON COLUMN job_levels.hierarchical_order IS 'Orden jerárquico (1=más alto, menor valor = mayor jerarquía)';
COMMENT ON COLUMN job_levels.category IS 'Categoría para elegibilidad: administrativo o operativo';
COMMENT ON COLUMN job_levels.is_active IS 'Indica si el nivel está activo y puede ser asignado';

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_job_levels_order ON job_levels(hierarchical_order);
CREATE INDEX IF NOT EXISTS idx_job_levels_category ON job_levels(category);
CREATE INDEX IF NOT EXISTS idx_job_levels_active ON job_levels(is_active);

-- Trigger para updated_at
CREATE TRIGGER update_job_levels_updated_at BEFORE UPDATE ON job_levels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. INSERTAR NIVELES PREDEFINIDOS
-- ============================================================

INSERT INTO job_levels (code, name, hierarchical_order, category, is_active) VALUES
  ('A1', 'ALCALDE MUNICIPAL', 1.0, 'administrativo', true),
  ('A2', 'ASESORÍA PROFESIONAL', 1.1, 'administrativo', true),
  ('S2', 'SECRETARIO', 1.2, 'administrativo', true),
  ('D1', 'GERENTE - DIRECCIONES I', 2.0, 'administrativo', true),
  ('D2', 'DIRECCIONES II', 3.0, 'administrativo', true),
  ('E1', 'ENCARGADOS Y JEFES DE UNIDADES I', 4.0, 'administrativo', true),
  ('E2', 'ENCARGADOS Y JEFES DE UNIDADES II', 5.0, 'administrativo', true),
  ('A3', 'ADMINISTRATIVOS I', 6.0, 'administrativo', true),
  ('A4', 'ADMINISTRATIVOS II', 7.0, 'administrativo', true),
  ('OTE', 'OPERATIVOS - TÉCNICO ESPECIALIZADO', 8.0, 'operativo', true),
  ('O1', 'OPERATIVOS I', 9.0, 'operativo', true),
  ('O2', 'OPERATIVOS II', 10.0, 'operativo', true),
  ('OS', 'OTROS SERVICIOS', 11.0, 'operativo', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  hierarchical_order = EXCLUDED.hierarchical_order,
  category = EXCLUDED.category;

-- ============================================================
-- 3. ACTUALIZAR TABLA users PARA VINCULAR CON job_levels
-- ============================================================

-- Agregar foreign key del campo nivel a job_levels.code
-- Primero, asegurarse de que todos los niveles existentes en users sean válidos
-- Si existen niveles inválidos, se deben corregir manualmente antes de agregar la FK

-- Comentar la columna nivel para documentación
COMMENT ON COLUMN users.nivel IS 'Código del nivel de puesto (FK a job_levels.code)';

-- Agregar constraint de foreign key
-- Nota: Esta operación fallará si existen valores en users.nivel que no están en job_levels.code
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS fk_users_nivel_job_levels;

ALTER TABLE users
  ADD CONSTRAINT fk_users_nivel_job_levels
  FOREIGN KEY (nivel) REFERENCES job_levels(code)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

-- Crear trigger para sincronizar tipo_puesto desde job_levels
CREATE OR REPLACE FUNCTION sync_tipo_puesto_from_job_level()
RETURNS TRIGGER AS $$
BEGIN
  -- Cuando se actualiza o inserta un usuario con un nivel,
  -- sincronizar automáticamente el tipo_puesto desde job_levels
  IF NEW.nivel IS NOT NULL THEN
    UPDATE users u
    SET tipo_puesto = (
      SELECT jl.category
      FROM job_levels jl
      WHERE jl.code = NEW.nivel
    )
    WHERE u.dpi = NEW.dpi;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_tipo_puesto_from_job_level() IS 'Sincroniza automáticamente tipo_puesto desde job_levels cuando se asigna un nivel';

-- Aplicar trigger a inserts y updates
DROP TRIGGER IF EXISTS trigger_sync_tipo_puesto ON users;
CREATE TRIGGER trigger_sync_tipo_puesto
  AFTER INSERT OR UPDATE OF nivel ON users
  FOR EACH ROW
  WHEN (NEW.nivel IS NOT NULL)
  EXECUTE FUNCTION sync_tipo_puesto_from_job_level();

-- ============================================================
-- 4. FUNCIONES DE GESTIÓN DE NIVELES
-- ============================================================

-- Función para crear un nuevo nivel de puesto
CREATE OR REPLACE FUNCTION create_job_level(
  p_code VARCHAR(10),
  p_name VARCHAR(255),
  p_hierarchical_order DECIMAL(3,1),
  p_category VARCHAR(20)
)
RETURNS JSONB AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Validar categoría
  IF p_category NOT IN ('administrativo', 'operativo') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Categoría inválida. Debe ser "administrativo" o "operativo"'
    );
  END IF;

  -- Validar que el código no exista
  IF EXISTS (SELECT 1 FROM job_levels WHERE code = p_code) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ya existe un nivel con el código especificado'
    );
  END IF;

  -- Validar que el orden jerárquico no exista
  IF EXISTS (SELECT 1 FROM job_levels WHERE hierarchical_order = p_hierarchical_order) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ya existe un nivel con ese orden jerárquico'
    );
  END IF;

  -- Insertar nuevo nivel
  INSERT INTO job_levels (code, name, hierarchical_order, category)
  VALUES (p_code, p_name, p_hierarchical_order, p_category)
  RETURNING * INTO v_result;

  RETURN jsonb_build_object(
    'success', true,
    'data', row_to_json(v_result)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_job_level(VARCHAR, VARCHAR, DECIMAL, VARCHAR) IS 'Crea un nuevo nivel de puesto con validaciones';

-- Función para actualizar un nivel de puesto
CREATE OR REPLACE FUNCTION update_job_level(
  p_code VARCHAR(10),
  p_name VARCHAR(255),
  p_hierarchical_order DECIMAL(3,1),
  p_category VARCHAR(20),
  p_is_active BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Validar que el nivel exista
  IF NOT EXISTS (SELECT 1 FROM job_levels WHERE code = p_code) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No existe un nivel con el código especificado'
    );
  END IF;

  -- Validar categoría
  IF p_category NOT IN ('administrativo', 'operativo') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Categoría inválida. Debe ser "administrativo" o "operativo"'
    );
  END IF;

  -- Validar que el orden jerárquico no esté en uso por otro nivel
  IF EXISTS (
    SELECT 1 FROM job_levels
    WHERE hierarchical_order = p_hierarchical_order
    AND code != p_code
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El orden jerárquico ya está en uso por otro nivel'
    );
  END IF;

  -- Actualizar nivel
  UPDATE job_levels
  SET
    name = p_name,
    hierarchical_order = p_hierarchical_order,
    category = p_category,
    is_active = p_is_active
  WHERE code = p_code
  RETURNING * INTO v_result;

  -- Si se cambió la categoría, actualizar tipo_puesto de todos los usuarios con este nivel
  UPDATE users
  SET tipo_puesto = p_category
  WHERE nivel = p_code;

  RETURN jsonb_build_object(
    'success', true,
    'data', row_to_json(v_result)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_job_level(VARCHAR, VARCHAR, DECIMAL, VARCHAR, BOOLEAN) IS 'Actualiza un nivel de puesto existente';

-- Función para eliminar un nivel de puesto
CREATE OR REPLACE FUNCTION delete_job_level(p_code VARCHAR(10))
RETURNS JSONB AS $$
DECLARE
  v_users_count INTEGER;
BEGIN
  -- Validar que el nivel exista
  IF NOT EXISTS (SELECT 1 FROM job_levels WHERE code = p_code) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No existe un nivel con el código especificado'
    );
  END IF;

  -- Verificar si hay usuarios asignados a este nivel
  SELECT COUNT(*) INTO v_users_count
  FROM users
  WHERE nivel = p_code;

  IF v_users_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('No se puede eliminar el nivel. Hay %s usuario(s) asignado(s)', v_users_count)
    );
  END IF;

  -- Verificar si hay instrumentos configurados para este nivel
  IF EXISTS (SELECT 1 FROM instrument_configs WHERE nivel = p_code) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No se puede eliminar el nivel. Hay instrumentos de evaluación configurados para este nivel'
    );
  END IF;

  -- Eliminar nivel
  DELETE FROM job_levels WHERE code = p_code;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Nivel eliminado exitosamente'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION delete_job_level(VARCHAR) IS 'Elimina un nivel de puesto si no tiene usuarios o instrumentos asignados';

-- Función para obtener todos los niveles ordenados jerárquicamente
CREATE OR REPLACE FUNCTION get_all_job_levels(include_inactive BOOLEAN DEFAULT false)
RETURNS TABLE (
  code VARCHAR(10),
  name VARCHAR(255),
  hierarchical_order DECIMAL(3,1),
  category VARCHAR(20),
  is_active BOOLEAN,
  users_count BIGINT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    jl.code,
    jl.name,
    jl.hierarchical_order,
    jl.category,
    jl.is_active,
    COUNT(u.dpi) as users_count,
    jl.created_at,
    jl.updated_at
  FROM job_levels jl
  LEFT JOIN users u ON u.nivel = jl.code
  WHERE include_inactive OR jl.is_active = true
  GROUP BY jl.code, jl.name, jl.hierarchical_order, jl.category, jl.is_active, jl.created_at, jl.updated_at
  ORDER BY jl.hierarchical_order ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_all_job_levels(BOOLEAN) IS 'Obtiene todos los niveles de puesto ordenados jerárquicamente con conteo de usuarios';

-- Función para obtener información de un nivel específico
CREATE OR REPLACE FUNCTION get_job_level_info(p_code VARCHAR(10))
RETURNS JSONB AS $$
DECLARE
  v_level RECORD;
  v_users_count INTEGER;
  v_instruments_count INTEGER;
BEGIN
  -- Obtener información del nivel
  SELECT * INTO v_level
  FROM job_levels
  WHERE code = p_code;

  IF v_level IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Nivel no encontrado'
    );
  END IF;

  -- Contar usuarios
  SELECT COUNT(*) INTO v_users_count
  FROM users
  WHERE nivel = p_code;

  -- Contar instrumentos
  SELECT COUNT(*) INTO v_instruments_count
  FROM instrument_configs
  WHERE nivel = p_code;

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'code', v_level.code,
      'name', v_level.name,
      'hierarchical_order', v_level.hierarchical_order,
      'category', v_level.category,
      'is_active', v_level.is_active,
      'users_count', v_users_count,
      'instruments_count', v_instruments_count,
      'created_at', v_level.created_at,
      'updated_at', v_level.updated_at
    )
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_job_level_info(VARCHAR) IS 'Obtiene información detallada de un nivel específico';

-- ============================================================
-- 5. FUNCIÓN PARA OBTENER CATEGORÍA DESDE CÓDIGO DE NIVEL
-- ============================================================

-- Esta función reemplaza la lógica de inferTipoPuesto en el frontend
CREATE OR REPLACE FUNCTION get_category_from_job_level(p_nivel VARCHAR(10))
RETURNS VARCHAR(20) AS $$
DECLARE
  v_category VARCHAR(20);
BEGIN
  SELECT category INTO v_category
  FROM job_levels
  WHERE code = p_nivel AND is_active = true;

  RETURN v_category;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_category_from_job_level(VARCHAR) IS 'Obtiene la categoría (administrativo/operativo) de un nivel de puesto';

-- ============================================================
-- 6. POLÍTICAS RLS (Row Level Security)
-- ============================================================

-- Habilitar RLS en job_levels
ALTER TABLE job_levels ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden leer niveles activos
CREATE POLICY "Todos pueden leer niveles activos"
  ON job_levels FOR SELECT
  USING (is_active = true);

-- Política: Solo admins pueden ver niveles inactivos
CREATE POLICY "Solo admins pueden ver niveles inactivos"
  ON job_levels FOR SELECT
  USING (
    is_active = false AND
    EXISTS (
      SELECT 1 FROM users
      WHERE dpi = current_setting('request.jwt.claims', true)::json->>'dpi'
      AND rol IN ('admin_rrhh', 'admin_general')
    )
  );

-- Política: Solo admin_general y admin_rrhh pueden insertar
CREATE POLICY "Solo admins pueden insertar niveles"
  ON job_levels FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE dpi = current_setting('request.jwt.claims', true)::json->>'dpi'
      AND rol IN ('admin_rrhh', 'admin_general')
    )
  );

-- Política: Solo admin_general y admin_rrhh pueden actualizar
CREATE POLICY "Solo admins pueden actualizar niveles"
  ON job_levels FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE dpi = current_setting('request.jwt.claims', true)::json->>'dpi'
      AND rol IN ('admin_rrhh', 'admin_general')
    )
  );

-- Política: Solo admin_general puede eliminar
CREATE POLICY "Solo admin_general puede eliminar niveles"
  ON job_levels FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE dpi = current_setting('request.jwt.claims', true)::json->>'dpi'
      AND rol = 'admin_general'
    )
  );

-- ============================================================
-- 7. ACTUALIZAR DATOS EXISTENTES
-- ============================================================

-- Sincronizar tipo_puesto de usuarios existentes basado en su nivel actual
UPDATE users u
SET tipo_puesto = jl.category
FROM job_levels jl
WHERE u.nivel = jl.code
AND u.tipo_puesto IS NULL;

-- Verificar integridad: usuarios con niveles que no existen en job_levels
-- Esta consulta debería retornar 0 filas después de la migración
DO $$
DECLARE
  v_invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_invalid_count
  FROM users u
  WHERE u.nivel IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM job_levels jl WHERE jl.code = u.nivel);

  IF v_invalid_count > 0 THEN
    RAISE WARNING 'Hay % usuario(s) con niveles inválidos. Se debe corregir manualmente.', v_invalid_count;
  END IF;
END $$;
