-- Migración: Crear tabla para explicaciones dinámicas de dimensiones
-- Fecha: 2025-11-25
-- Descripción: Tabla para almacenar explicaciones personalizadas por dimensión, nivel y rango de porcentaje

CREATE TABLE IF NOT EXISTS dimension_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_id VARCHAR(100) NOT NULL, -- ID de la dimensión (ej: dim1_a1, dim2_e1)
  dimension_nombre VARCHAR(255) NOT NULL, -- Nombre de la dimensión
  nivel VARCHAR(10) NOT NULL, -- Nivel del instrumento (A1, A3, E1, O1, D1, etc.)
  descripcion_base TEXT NOT NULL, -- Descripción original del instrumento
  rango_minimo DECIMAL(5,2) NOT NULL, -- Porcentaje mínimo del rango (ej: 0.00, 60.00, 75.00, 85.00)
  rango_maximo DECIMAL(5,2) NOT NULL, -- Porcentaje máximo del rango (ej: 59.99, 74.99, 84.99, 100.00)
  explicacion TEXT NOT NULL, -- Explicación adaptada para este rango
  incluye_comparacion BOOLEAN DEFAULT true, -- Si la explicación debe incluir comparación con promedio municipal
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices para búsquedas rápidas
  CONSTRAINT unique_dimension_nivel_rango UNIQUE (dimension_id, nivel, rango_minimo, rango_maximo)
);

-- Índices para optimizar consultas
CREATE INDEX idx_dimension_explanations_dimension_nivel ON dimension_explanations(dimension_id, nivel);
CREATE INDEX idx_dimension_explanations_nivel ON dimension_explanations(nivel);
CREATE INDEX idx_dimension_explanations_activo ON dimension_explanations(activo);

-- Comentarios para documentación
COMMENT ON TABLE dimension_explanations IS 'Almacena explicaciones dinámicas de resultados por dimensión, nivel y rango de porcentaje';
COMMENT ON COLUMN dimension_explanations.dimension_id IS 'ID único de la dimensión según el instrumento (ej: dim1_a1)';
COMMENT ON COLUMN dimension_explanations.dimension_nombre IS 'Nombre completo de la dimensión';
COMMENT ON COLUMN dimension_explanations.nivel IS 'Nivel del instrumento (A1, A3, E1, O1, D1, etc.)';
COMMENT ON COLUMN dimension_explanations.descripcion_base IS 'Descripción original de la dimensión del instrumento';
COMMENT ON COLUMN dimension_explanations.rango_minimo IS 'Porcentaje mínimo del rango de evaluación';
COMMENT ON COLUMN dimension_explanations.rango_maximo IS 'Porcentaje máximo del rango de evaluación';
COMMENT ON COLUMN dimension_explanations.explicacion IS 'Explicación adaptada del resultado en lenguaje de resultado';
COMMENT ON COLUMN dimension_explanations.incluye_comparacion IS 'Si la explicación debe incluir comparación con promedio municipal';

