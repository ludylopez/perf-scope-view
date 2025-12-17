-- Migración: Tabla para almacenar análisis de fortalezas y oportunidades del equipo
-- Permite guardar y recuperar análisis generados por IA para evitar regenerarlos

-- Tabla de análisis de equipo
CREATE TABLE IF NOT EXISTS team_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jefe_dpi VARCHAR(20) NOT NULL REFERENCES users(dpi),
  periodo_id UUID NOT NULL REFERENCES evaluation_periods(id),
  analysis JSONB NOT NULL,
  fecha_generacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(jefe_dpi, periodo_id)
);

-- Índices para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_team_analysis_jefe_periodo ON team_analysis(jefe_dpi, periodo_id);
CREATE INDEX IF NOT EXISTS idx_team_analysis_periodo ON team_analysis(periodo_id);
CREATE INDEX IF NOT EXISTS idx_team_analysis_fecha_generacion ON team_analysis(fecha_generacion DESC);

-- Comentarios
COMMENT ON TABLE team_analysis IS 'Almacena análisis de fortalezas y oportunidades del equipo generados por IA';
COMMENT ON COLUMN team_analysis.jefe_dpi IS 'DPI del jefe que generó el análisis';
COMMENT ON COLUMN team_analysis.periodo_id IS 'ID del período de evaluación';
COMMENT ON COLUMN team_analysis.analysis IS 'Análisis completo en formato JSON con fortalezas y oportunidades';
COMMENT ON COLUMN team_analysis.fecha_generacion IS 'Fecha y hora en que se generó el análisis';

-- Trigger para actualizar updated_at
CREATE TRIGGER update_team_analysis_updated_at BEFORE UPDATE ON team_analysis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();






