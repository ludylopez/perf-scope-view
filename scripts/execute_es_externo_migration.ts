/**
 * Script para ejecutar la migración es_externo
 * Ejecutar con: npx tsx scripts/execute_es_externo_migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://oxadpbdlpvwyapuondei.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Leer el archivo de migración
const migrationPath = path.join(__dirname, '../supabase/migrations/042_add_es_externo_field.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

async function executeMigration() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurada');
    console.log('📋 Por favor ejecuta la migración manualmente en el SQL Editor de Supabase:');
    console.log('\n' + migrationSQL);
    process.exit(1);
  }

  // Crear cliente con service role key para tener permisos de administrador
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('🚀 Ejecutando migración es_externo...');
    
    // Dividir en queries individuales
    const queries = migrationSQL
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--'));

    for (const query of queries) {
      if (query.trim()) {
        console.log(`📝 Ejecutando: ${query.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: query + ';' 
        });
        
        if (error) {
          console.error('❌ Error:', error);
          throw error;
        }
      }
    }

    console.log('✅ Migración ejecutada exitosamente');
  } catch (error: any) {
    console.error('❌ Error ejecutando migración:', error);
    console.log('\n📋 Por favor ejecuta la migración manualmente en el SQL Editor de Supabase:');
    console.log('\n' + migrationSQL);
    process.exit(1);
  }
}

executeMigration();

