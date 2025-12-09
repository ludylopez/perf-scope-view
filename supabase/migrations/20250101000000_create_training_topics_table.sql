-- Migración: Tabla para almacenar tópicos de capacitación detectados en planes de desarrollo
-- Permite análisis estadístico y generación de planes de capacitación por área y municipalidad

-- Crear tabla training_topics
CREATE TABLE IF NOT EXISTS training_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id VARCHAR(20) NOT NULL REFERENCES users(dpi) ON DELETE CASCADE,
  periodo_id UUID NOT NULL REFERENCES evaluation_periods(id) ON DELETE CASCADE,
  development_plan_id UUID REFERENCES development_plans(id) ON DELETE CASCADE,
  topico VARCHAR(255) NOT NULL,
  area VARCHAR(255) NOT NULL,
  nivel VARCHAR(10) NOT NULL,
  fuente VARCHAR(50) NOT NULL CHECK (fuente IN ('plan', 'comentario_jefe', 'comentario_colaborador', 'necesidad_expresada')),
  dimension_relacionada VARCHAR(255),
  accion_relacionada_id VARCHAR(255), -- Referencia a la acción del plan (índice en el array)
  prioridad VARCHAR(10) NOT NULL CHECK (prioridad IN ('alta', 'media', 'baja')),
  categoria VARCHAR(100) NOT NULL,
  descripcion TEXT,
  fecha_deteccion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentarios para documentación
COMMENT ON TABLE training_topics IS 'Almacena tópicos de capacitación detectados desde planes de desarrollo, comentarios y necesidades expresadas';
COMMENT ON COLUMN training_topics.topico IS 'Nombre del tópico de capacitación (ej: "Ciberseguridad", "Gestión de proyectos")';
COMMENT ON COLUMN training_topics.fuente IS 'Origen del tópico: plan (del plan de desarrollo), comentario_jefe, comentario_colaborador, necesidad_expresada';
COMMENT ON COLUMN training_topics.dimension_relacionada IS 'Dimensión de evaluación relacionada (si el tópico viene del plan)';
COMMENT ON COLUMN training_topics.accion_relacionada_id IS 'Referencia a la acción del plan que generó este tópico (índice o identificador)';
COMMENT ON COLUMN training_topics.categoria IS 'Tipo de capacitación: Técnica, Soft Skills, Liderazgo, Herramientas, etc.';

-- Índices para mejorar rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_training_topics_colaborador_periodo ON training_topics(colaborador_id, periodo_id);
CREATE INDEX IF NOT EXISTS idx_training_topics_area ON training_topics(area);
CREATE INDEX IF NOT EXISTS idx_training_topics_topico ON training_topics(topico);
CREATE INDEX IF NOT EXISTS idx_training_topics_fuente ON training_topics(fuente);
CREATE INDEX IF NOT EXISTS idx_training_topics_prioridad ON training_topics(prioridad);
CREATE INDEX IF NOT EXISTS idx_training_topics_categoria ON training_topics(categoria);
CREATE INDEX IF NOT EXISTS idx_training_topics_development_plan ON training_topics(development_plan_id);
CREATE INDEX IF NOT EXISTS idx_training_topics_periodo ON training_topics(periodo_id);

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_training_topics_updated_at 
  BEFORE UPDATE ON training_topics
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

