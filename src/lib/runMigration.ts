/**
 * Script para ejecutar la migración de dimension_explanations
 * Puede ejecutarse desde el dashboard de Supabase o desde la aplicación
 */

import { supabase } from "@/integrations/supabase/client";

export async function runDimensionExplanationsMigration(): Promise<void> {
  console.log("🚀 Ejecutando migración de dimension_explanations...");

  const migrationSQL = `
    -- Crear tabla si no existe
    CREATE TABLE IF NOT EXISTS dimension_explanations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dimension_id VARCHAR(100) NOT NULL,
      dimension_nombre VARCHAR(255) NOT NULL,
      nivel VARCHAR(10) NOT NULL,
      descripcion_base TEXT NOT NULL,
      rango_minimo DECIMAL(5,2) NOT NULL,
      rango_maximo DECIMAL(5,2) NOT NULL,
      explicacion TEXT NOT NULL,
      incluye_comparacion BOOLEAN DEFAULT true,
      activo BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT unique_dimension_nivel_rango UNIQUE (dimension_id, nivel, rango_minimo, rango_maximo)
    );

    -- Crear índices si no existen
    CREATE INDEX IF NOT EXISTS idx_dimension_explanations_dimension_nivel ON dimension_explanations(dimension_id, nivel);
    CREATE INDEX IF NOT EXISTS idx_dimension_explanations_nivel ON dimension_explanations(nivel);
    CREATE INDEX IF NOT EXISTS idx_dimension_explanations_activo ON dimension_explanations(activo);

    -- Comentarios
    COMMENT ON TABLE dimension_explanations IS 'Almacena explicaciones dinámicas de resultados por dimensión, nivel y rango de porcentaje';
    COMMENT ON COLUMN dimension_explanations.dimension_id IS 'ID único de la dimensión según el instrumento (ej: dim1_a1)';
    COMMENT ON COLUMN dimension_explanations.dimension_nombre IS 'Nombre completo de la dimensión';
    COMMENT ON COLUMN dimension_explanations.nivel IS 'Nivel del instrumento (A1, A3, E1, O1, D1, etc.)';
    COMMENT ON COLUMN dimension_explanations.descripcion_base IS 'Descripción original de la dimensión del instrumento';
    COMMENT ON COLUMN dimension_explanations.rango_minimo IS 'Porcentaje mínimo del rango de evaluación';
    COMMENT ON COLUMN dimension_explanations.rango_maximo IS 'Porcentaje máximo del rango de evaluación';
    COMMENT ON COLUMN dimension_explanations.explicacion IS 'Explicación adaptada del resultado en lenguaje de resultado';
    COMMENT ON COLUMN dimension_explanations.incluye_comparacion IS 'Si la explicación debe incluir comparación con promedio municipal';
  `;

  try {
    // Ejecutar la migración usando RPC o función de Supabase
    // Nota: Esto requiere permisos de administrador en Supabase
    const { error } = await supabase.rpc('exec_sql', { sql_query: migrationSQL });
    
    if (error) {
      // Si RPC no está disponible, intentar ejecutar directamente
      console.warn("⚠️ RPC no disponible, intentando método alternativo...");
      throw error;
    }

    console.log("✅ Migración ejecutada exitosamente");
  } catch (error) {
    console.error("❌ Error ejecutando migración:", error);
    console.log("📋 Por favor ejecuta manualmente el SQL en el dashboard de Supabase:");
    console.log(migrationSQL);
    throw error;
  }
}

