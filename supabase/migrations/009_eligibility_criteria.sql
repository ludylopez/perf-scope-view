-- Migración para agregar criterios de elegibilidad de evaluación
-- Administrativos: mínimo 3 meses de antigüedad
-- Operativos: mínimo 6 meses de antigüedad

-- 1. Agregar campos a la tabla users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS fecha_ingreso DATE,
ADD COLUMN IF NOT EXISTS tipo_puesto VARCHAR(20) CHECK (tipo_puesto IN ('administrativo', 'operativo'));

-- Comentarios para documentación
COMMENT ON COLUMN users.fecha_ingreso IS 'Fecha de ingreso del colaborador a la organización';
COMMENT ON COLUMN users.tipo_puesto IS 'Tipo de puesto: administrativo o operativo';

-- 2. Función para calcular antigüedad en meses
CREATE OR REPLACE FUNCTION calcular_antiguedad_meses(usuario_dpi VARCHAR(20))
RETURNS INTEGER AS $$
DECLARE
  fecha_ingreso DATE;
  meses_antiguedad INTEGER;
BEGIN
  -- Obtener fecha de ingreso
  SELECT u.fecha_ingreso INTO fecha_ingreso
  FROM users u
  WHERE u.dpi = usuario_dpi;
  
  -- Si no tiene fecha de ingreso, retornar NULL
  IF fecha_ingreso IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Calcular diferencia en meses
  meses_antiguedad := EXTRACT(YEAR FROM age(CURRENT_DATE, fecha_ingreso)) * 12 
                      + EXTRACT(MONTH FROM age(CURRENT_DATE, fecha_ingreso));
  
  RETURN meses_antiguedad;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calcular_antiguedad_meses(VARCHAR) IS 'Calcula la antigüedad en meses de un colaborador desde su fecha de ingreso';

-- 3. Función para verificar elegibilidad de evaluación
CREATE OR REPLACE FUNCTION verificar_elegibilidad_evaluacion(usuario_dpi VARCHAR(20))
RETURNS JSONB AS $$
DECLARE
  usuario_record RECORD;
  meses_antiguedad INTEGER;
  es_elegible BOOLEAN;
  motivo_no_elegible TEXT;
  meses_requeridos INTEGER;
BEGIN
  -- Obtener información del usuario
  SELECT u.dpi, u.fecha_ingreso, u.tipo_puesto, u.estado
  INTO usuario_record
  FROM users u
  WHERE u.dpi = usuario_dpi;
  
  -- Si el usuario no existe o no está activo
  IF usuario_record IS NULL THEN
    RETURN jsonb_build_object(
      'elegible', false,
      'motivo', 'Usuario no encontrado o inactivo'
    );
  END IF;
  
  IF usuario_record.estado != 'activo' THEN
    RETURN jsonb_build_object(
      'elegible', false,
      'motivo', 'Usuario inactivo'
    );
  END IF;
  
  -- Si no tiene fecha de ingreso, no es elegible
  IF usuario_record.fecha_ingreso IS NULL THEN
    RETURN jsonb_build_object(
      'elegible', false,
      'motivo', 'Fecha de ingreso no registrada',
      'tipo_puesto', usuario_record.tipo_puesto
    );
  END IF;
  
  -- Si no tiene tipo de puesto, no es elegible
  IF usuario_record.tipo_puesto IS NULL THEN
    RETURN jsonb_build_object(
      'elegible', false,
      'motivo', 'Tipo de puesto no registrado',
      'fecha_ingreso', usuario_record.fecha_ingreso
    );
  END IF;
  
  -- Calcular antigüedad
  meses_antiguedad := calcular_antiguedad_meses(usuario_dpi);
  
  -- Determinar meses requeridos según tipo de puesto
  IF usuario_record.tipo_puesto = 'administrativo' THEN
    meses_requeridos := 3;
  ELSIF usuario_record.tipo_puesto = 'operativo' THEN
    meses_requeridos := 6;
  ELSE
    RETURN jsonb_build_object(
      'elegible', false,
      'motivo', 'Tipo de puesto no válido',
      'tipo_puesto', usuario_record.tipo_puesto
    );
  END IF;
  
  -- Verificar elegibilidad
  es_elegible := meses_antiguedad >= meses_requeridos;
  
  IF es_elegible THEN
    RETURN jsonb_build_object(
      'elegible', true,
      'meses_antiguedad', meses_antiguedad,
      'meses_requeridos', meses_requeridos,
      'tipo_puesto', usuario_record.tipo_puesto,
      'fecha_ingreso', usuario_record.fecha_ingreso
    );
  ELSE
    motivo_no_elegible := format(
      'Requiere %s meses de antigüedad. Actual: %s meses',
      meses_requeridos,
      meses_antiguedad
    );
    
    RETURN jsonb_build_object(
      'elegible', false,
      'motivo', motivo_no_elegible,
      'meses_antiguedad', meses_antiguedad,
      'meses_requeridos', meses_requeridos,
      'tipo_puesto', usuario_record.tipo_puesto,
      'fecha_ingreso', usuario_record.fecha_ingreso
    );
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION verificar_elegibilidad_evaluacion(VARCHAR) IS 'Verifica si un colaborador es elegible para evaluación según su antigüedad y tipo de puesto';

-- 4. Índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_users_fecha_ingreso ON users(fecha_ingreso);
CREATE INDEX IF NOT EXISTS idx_users_tipo_puesto ON users(tipo_puesto);

