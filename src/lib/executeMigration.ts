/**
 * Script para ejecutar la migración de dimension_explanations directamente
 */

import { supabase } from "@/integrations/supabase/client";

export async function executeDimensionExplanationsMigration(): Promise<void> {
  console.log("🚀 Ejecutando migración de dimension_explanations...");

  const migrationSQL = `
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

    CREATE INDEX IF NOT EXISTS idx_dimension_explanations_dimension_nivel ON dimension_explanations(dimension_id, nivel);
    CREATE INDEX IF NOT EXISTS idx_dimension_explanations_nivel ON dimension_explanations(nivel);
    CREATE INDEX IF NOT EXISTS idx_dimension_explanations_activo ON dimension_explanations(activo);
  `;

  try {
    // Dividir en múltiples queries ya que Supabase puede tener límites
    const queries = migrationSQL.split(';').filter(q => q.trim().length > 0);
    
    for (const query of queries) {
      if (query.trim()) {
        const { error } = await supabase.rpc('exec_sql', { 
          sql: query.trim() + ';' 
        });
        
        if (error) {
          // Intentar método alternativo usando función directa
          console.warn("⚠️ RPC no disponible, intentando método alternativo...");
          // Ejecutar directamente usando fetch a la API de Supabase
          const response = await fetch(`${supabase.supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabase.supabaseKey || '',
              'Authorization': `Bearer ${supabase.supabaseKey || ''}`
            },
            body: JSON.stringify({ sql: query.trim() + ';' })
          });
          
          if (!response.ok) {
            throw new Error(`Error ejecutando query: ${response.statusText}`);
          }
        }
      }
    }

    console.log("✅ Migración ejecutada exitosamente");
  } catch (error) {
    console.error("❌ Error ejecutando migración:", error);
    throw error;
  }
}

