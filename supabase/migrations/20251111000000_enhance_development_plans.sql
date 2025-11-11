-- Migración para mejorar la tabla development_plans con estructura completa para planes de desarrollo generados por IA

-- Agregar columnas para el plan estructurado
ALTER TABLE development_plans ADD COLUMN IF NOT EXISTS plan_estructurado JSONB;
ALTER TABLE development_plans ADD COLUMN IF NOT EXISTS generado_por_ia BOOLEAN DEFAULT false;
ALTER TABLE development_plans ADD COLUMN IF NOT EXISTS recomendaciones JSONB;

-- Comentarios para documentar la estructura esperada
COMMENT ON COLUMN development_plans.plan_estructurado IS 'Estructura del plan: {
  objetivos: string[],
  acciones: [{
    descripcion: string,
    responsable: string,
    fecha: string,
    recursos: string[],
    indicador: string,
    prioridad: "alta" | "media" | "baja"
  }],
  dimensionesDebiles: [{
    dimension: string,
    score: number,
    accionesEspecificas: string[]
  }]
}';

COMMENT ON COLUMN development_plans.generado_por_ia IS 'Indica si el plan fue generado por IA (Gemini) o manualmente';
COMMENT ON COLUMN development_plans.recomendaciones IS 'Array de recomendaciones generales de desarrollo';

-- Índice para búsquedas de planes generados por IA
CREATE INDEX IF NOT EXISTS idx_development_plans_generado_ia ON development_plans(generado_por_ia);
CREATE INDEX IF NOT EXISTS idx_development_plans_colaborador_periodo ON development_plans(colaborador_id, periodo_id);
