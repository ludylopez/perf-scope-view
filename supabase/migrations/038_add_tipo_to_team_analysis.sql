-- Migración: Agregar campo 'tipo' a team_analysis para diferenciar análisis 'directo' vs 'cascada'
-- Esto permite que un jefe tenga dos análisis separados: uno para su equipo directo y otro para toda su unidad

-- Agregar columna tipo
ALTER TABLE team_analysis 
ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'directo' 
CHECK (tipo IN ('directo', 'cascada'));

-- Eliminar el constraint UNIQUE anterior que solo consideraba jefe_dpi y periodo_id
ALTER TABLE team_analysis 
DROP CONSTRAINT IF EXISTS team_analysis_jefe_dpi_periodo_id_key;

-- Crear nuevo constraint UNIQUE que incluye tipo
ALTER TABLE team_analysis 
ADD CONSTRAINT team_analysis_jefe_periodo_tipo_unique 
UNIQUE(jefe_dpi, periodo_id, tipo);

-- Crear índice para mejorar consultas por tipo
CREATE INDEX IF NOT EXISTS idx_team_analysis_tipo ON team_analysis(tipo);

-- Actualizar comentario de la tabla
COMMENT ON COLUMN team_analysis.tipo IS 'Tipo de análisis: directo (solo colaboradores directos) o cascada (toda la unidad incluyendo subordinados)';



