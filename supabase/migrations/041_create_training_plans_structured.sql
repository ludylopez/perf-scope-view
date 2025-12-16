-- Crear tabla para guardar planes de capacitación estructurados generados por IA
CREATE TABLE IF NOT EXISTS training_plans_structured (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jefe_dpi TEXT NOT NULL,
  periodo_id UUID NOT NULL REFERENCES evaluation_periods(id) ON DELETE CASCADE,
  plan_data JSONB NOT NULL, -- PlanCapacitacionEstructurado completo
  fecha_generacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  generado_por_ia BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(jefe_dpi, periodo_id)
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_training_plans_structured_jefe_periodo 
  ON training_plans_structured(jefe_dpi, periodo_id);

CREATE INDEX IF NOT EXISTS idx_training_plans_structured_fecha_generacion 
  ON training_plans_structured(fecha_generacion DESC);

-- Trigger para actualizar fecha_modificacion
CREATE OR REPLACE FUNCTION update_training_plan_modified()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_modificacion = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_training_plan_modified
  BEFORE UPDATE ON training_plans_structured
  FOR EACH ROW
  EXECUTE FUNCTION update_training_plan_modified();

-- RLS: Solo el jefe puede ver su plan
ALTER TABLE training_plans_structured ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jefes pueden ver sus propios planes"
  ON training_plans_structured
  FOR SELECT
  USING (jefe_dpi = auth.jwt() ->> 'dpi'::text);

CREATE POLICY "Jefes pueden insertar sus propios planes"
  ON training_plans_structured
  FOR INSERT
  WITH CHECK (jefe_dpi = auth.jwt() ->> 'dpi'::text);

CREATE POLICY "Jefes pueden actualizar sus propios planes"
  ON training_plans_structured
  FOR UPDATE
  USING (jefe_dpi = auth.jwt() ->> 'dpi'::text);

-- Comentarios
COMMENT ON TABLE training_plans_structured IS 'Planes de capacitación estructurados generados por IA para unidades organizacionales';
COMMENT ON COLUMN training_plans_structured.plan_data IS 'Datos completos del plan estructurado en formato JSONB';
COMMENT ON COLUMN training_plans_structured.version IS 'Versión del plan (se incrementa al regenerar)';


