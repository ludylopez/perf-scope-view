-- Migración: Agregar campos calculados edad y antigüedad
-- Fecha: 2025-11-25
-- Descripción: Agrega campos calculados automáticamente para edad (años) y antigüedad (meses)

-- 1. Agregar columnas a la tabla users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS edad INTEGER,
ADD COLUMN IF NOT EXISTS antiguedad INTEGER;

-- Comentarios para documentación
COMMENT ON COLUMN users.edad IS 'Edad del colaborador en años, calculada automáticamente desde fecha_nacimiento';
COMMENT ON COLUMN users.antiguedad IS 'Antigüedad del colaborador en meses, calculada automáticamente desde fecha_ingreso';

-- 2. Función para calcular edad desde fecha_nacimiento (formato DDMMAAAA)
CREATE OR REPLACE FUNCTION calcular_edad(fecha_nacimiento_str VARCHAR(10))
RETURNS INTEGER AS $$
DECLARE
  fecha_nacimiento DATE;
  edad_calculada INTEGER;
BEGIN
  -- Si fecha_nacimiento es NULL o vacío, retornar NULL
  IF fecha_nacimiento_str IS NULL OR fecha_nacimiento_str = '' THEN
    RETURN NULL;
  END IF;

  -- Convertir formato DDMMAAAA a DATE
  -- Extraer día, mes y año
  DECLARE
    dia INTEGER;
    mes INTEGER;
    anio INTEGER;
  BEGIN
    dia := CAST(SUBSTRING(fecha_nacimiento_str, 1, 2) AS INTEGER);
    mes := CAST(SUBSTRING(fecha_nacimiento_str, 3, 2) AS INTEGER);
    anio := CAST(SUBSTRING(fecha_nacimiento_str, 5, 4) AS INTEGER);
    
    -- Validar que sea una fecha válida
    IF dia < 1 OR dia > 31 OR mes < 1 OR mes > 12 OR anio < 1900 OR anio > EXTRACT(YEAR FROM CURRENT_DATE) THEN
      RETURN NULL;
    END IF;
    
    fecha_nacimiento := MAKE_DATE(anio, mes, dia);
  EXCEPTION
    WHEN OTHERS THEN
      RETURN NULL;
  END;

  -- Calcular edad en años
  edad_calculada := EXTRACT(YEAR FROM age(CURRENT_DATE, fecha_nacimiento));
  
  RETURN edad_calculada;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calcular_edad(VARCHAR) IS 'Calcula la edad en años desde fecha_nacimiento en formato DDMMAAAA';

-- 3. Función para calcular antigüedad en meses desde fecha_ingreso
CREATE OR REPLACE FUNCTION calcular_antiguedad_meses_calculado(fecha_ingreso DATE)
RETURNS INTEGER AS $$
DECLARE
  meses_antiguedad INTEGER;
BEGIN
  -- Si fecha_ingreso es NULL, retornar NULL
  IF fecha_ingreso IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Calcular diferencia en meses
  meses_antiguedad := EXTRACT(YEAR FROM age(CURRENT_DATE, fecha_ingreso)) * 12 
                      + EXTRACT(MONTH FROM age(CURRENT_DATE, fecha_ingreso));
  
  RETURN meses_antiguedad;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calcular_antiguedad_meses_calculado(DATE) IS 'Calcula la antigüedad en meses desde fecha_ingreso';

-- 4. Función trigger para calcular edad y antigüedad automáticamente
CREATE OR REPLACE FUNCTION calcular_campos_edad_antiguedad()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular edad desde fecha_nacimiento
  IF NEW.fecha_nacimiento IS NOT NULL AND NEW.fecha_nacimiento != '' THEN
    NEW.edad := calcular_edad(NEW.fecha_nacimiento);
  ELSE
    NEW.edad := NULL;
  END IF;

  -- Calcular antigüedad desde fecha_ingreso
  IF NEW.fecha_ingreso IS NOT NULL THEN
    NEW.antiguedad := calcular_antiguedad_meses_calculado(NEW.fecha_ingreso);
  ELSE
    NEW.antiguedad := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_campos_edad_antiguedad() IS 'Trigger function para calcular automáticamente edad y antigüedad al insertar o actualizar usuarios';

-- 5. Crear trigger antes de insertar o actualizar
DROP TRIGGER IF EXISTS trg_calcular_edad_antiguedad ON public.users;
CREATE TRIGGER trg_calcular_edad_antiguedad
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION calcular_campos_edad_antiguedad();

-- 6. Actualizar registros existentes con los valores calculados
UPDATE users
SET 
  edad = calcular_edad(fecha_nacimiento),
  antiguedad = calcular_antiguedad_meses_calculado(fecha_ingreso)
WHERE fecha_nacimiento IS NOT NULL OR fecha_ingreso IS NOT NULL;

-- 7. Crear índices para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_users_edad ON users(edad);
CREATE INDEX IF NOT EXISTS idx_users_antiguedad ON users(antiguedad);

