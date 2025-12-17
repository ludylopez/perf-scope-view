/**
 * Script para ejecutar la migración que agrega el campo es_externo
 * Esta migración debe ejecutarse manualmente en el SQL Editor de Supabase
 * debido a que las operaciones DDL requieren permisos de administrador
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const migrationSQL = `
-- Migración: Agregar campo es_externo para identificar evaluadores externos
-- Fecha: 2025-01-XX
-- Descripción: Agrega campo booleano para identificar usuarios externos que no deben autoevaluarse

-- 1. Agregar columna es_externo a la tabla users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS es_externo BOOLEAN DEFAULT false;

-- Comentario para documentación
COMMENT ON COLUMN users.es_externo IS 'Indica si el usuario es un evaluador externo (auditor externo, consultor, etc.) que no debe autoevaluarse. Los usuarios externos pueden evaluar a otros pero no deben autoevaluarse.';

-- 2. Crear índice para mejorar consultas que filtran por es_externo
CREATE INDEX IF NOT EXISTS idx_users_es_externo 
ON users(es_externo) 
WHERE es_externo = true;
`;

/**
 * Intenta ejecutar la migración usando RPC (si está disponible)
 * Si falla, muestra el SQL para ejecutar manualmente
 */
export async function executeEsExternoMigration(): Promise<void> {
  try {
    // Intentar ejecutar usando una función RPC si existe
    // Nota: Esto requiere que exista una función exec_sql en Supabase
    const { error } = await supabase.rpc('exec_sql', { 
      sql_query: migrationSQL 
    });
    
    if (error) {
      // Si RPC no está disponible, mostrar instrucciones
      console.warn("⚠️ RPC no disponible. Ejecuta la migración manualmente.");
      console.log("📋 SQL para ejecutar en Supabase SQL Editor:");
      console.log(migrationSQL);
      
      // Copiar al portapapeles si es posible
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(migrationSQL);
        toast.info("SQL copiado al portapapeles. Pégalo en el SQL Editor de Supabase.");
      }
      
      throw new Error("La migración debe ejecutarse manualmente en el SQL Editor de Supabase");
    }

    toast.success("✅ Migración ejecutada exitosamente");
    console.log("✅ Migración ejecutada exitosamente");
  } catch (error) {
    console.error("❌ Error ejecutando migración:", error);
    toast.error("Error ejecutando migración. Ejecuta el SQL manualmente en Supabase.");
    throw error;
  }
}

/**
 * Obtiene el SQL de la migración para ejecutar manualmente
 */
export function getEsExternoMigrationSQL(): string {
  return migrationSQL;
}

