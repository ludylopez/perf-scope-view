/**
 * Script de migración para Supabase
 * 
 * Este script proporciona funciones útiles para gestionar la base de datos.
 * Puedes ejecutar estas funciones desde la consola del navegador o crear
 * una página de administración para ejecutarlas.
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Verifica la conexión con Supabase
 */
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from("users").select("count").limit(1);
    
    if (error) {
      console.error("Error de conexión:", error);
      toast.error(`Error de conexión: ${error.message}`);
      return false;
    }
    
    toast.success("Conexión con Supabase exitosa");
    return true;
  } catch (error: any) {
    console.error("Error:", error);
    toast.error(`Error: ${error.message}`);
    return false;
  }
};

/**
 * Aplica el esquema completo desde el archivo de migración
 * NOTA: Esta función solo funciona si ejecutas el SQL manualmente en Supabase
 * porque las operaciones DDL no están disponibles desde el cliente JavaScript
 */
export const getMigrationSQL = async (): Promise<string> => {
  try {
    const response = await fetch("/supabase/migrations/001_initial_schema.sql");
    const sql = await response.text();
    return sql;
  } catch (error) {
    console.error("Error al cargar SQL:", error);
    return "";
  }
};

/**
 * Verifica si las tablas principales existen
 */
export const checkTablesExist = async (): Promise<Record<string, boolean>> => {
  const tables = [
    "evaluation_periods",
    "users",
    "groups",
    "user_assignments",
    "evaluations",
    "open_questions",
    "open_question_responses",
    "final_evaluation_results",
    "development_plans",
  ];

  const results: Record<string, boolean> = {};

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select("*").limit(1);
      results[table] = !error;
    } catch {
      results[table] = false;
    }
  }

  return results;
};

/**
 * Crea el período 2025-1 si no existe
 */
export const createPeriod2025 = async () => {
  try {
    // Verificar si ya existe
    const { data: existing } = await supabase
      .from("evaluation_periods")
      .select("id")
      .eq("nombre", "2025-1")
      .single();

    if (existing) {
      toast.info("El período 2025-1 ya existe");
      return existing.id;
    }

    // Crear período 2025-1
    const fechaInicio = new Date("2025-01-01T00:00:00");
    const fechaFin = new Date("2025-03-31T23:59:59");
    const fechaCierreAuto = new Date("2025-03-15T23:59:59");
    const fechaCierreJefe = new Date("2025-03-31T23:59:59");

    const { data, error } = await supabase
      .from("evaluation_periods")
      .insert({
        nombre: "2025-1",
        fecha_inicio: fechaInicio.toISOString(),
        fecha_fin: fechaFin.toISOString(),
        fecha_cierre_autoevaluacion: fechaCierreAuto.toISOString(),
        fecha_cierre_evaluacion_jefe: fechaCierreJefe.toISOString(),
        estado: "en_curso",
        descripcion: "Período de evaluación primer trimestre 2025",
      })
      .select("id")
      .single();

    if (error) throw error;

    toast.success("Período 2025-1 creado exitosamente");
    return data.id;
  } catch (error: any) {
    console.error("Error creando período:", error);
    toast.error(`Error: ${error.message}`);
    return null;
  }
};

/**
 * Verifica el estado de la base de datos y muestra un resumen
 */
export const checkDatabaseStatus = async () => {
  const status = {
    connection: false,
    tables: {} as Record<string, boolean>,
    period2025: false,
    openQuestions: 0,
  };

  // Verificar conexión
  status.connection = await testSupabaseConnection();

  // Verificar tablas
  status.tables = await checkTablesExist();

  // Verificar período 2025-1
  try {
    const { data } = await supabase
      .from("evaluation_periods")
      .select("id")
      .eq("nombre", "2025-1")
      .single();
    status.period2025 = !!data;
  } catch {
    status.period2025 = false;
  }

  // Contar preguntas abiertas
  try {
    const { count } = await supabase
      .from("open_questions")
      .select("*", { count: "exact", head: true });
    status.openQuestions = count || 0;
  } catch {
    status.openQuestions = 0;
  }

  return status;
};

/**
 * Función de utilidad para mostrar el estado en la consola
 */
export const logDatabaseStatus = async () => {
  const status = await checkDatabaseStatus();
  
  console.log("=== Estado de la Base de Datos ===");
  console.log(`Conexión: ${status.connection ? "✅ OK" : "❌ Error"}`);
  console.log("\nTablas:");
  Object.entries(status.tables).forEach(([table, exists]) => {
    console.log(`  ${table}: ${exists ? "✅" : "❌"}`);
  });
  console.log(`\nPeríodo 2025-1: ${status.period2025 ? "✅ Existe" : "❌ No existe"}`);
  console.log(`Preguntas abiertas: ${status.openQuestions}`);
  console.log("===================================");
  
  return status;
};

// Exportar funciones para uso en consola del navegador
if (typeof window !== "undefined") {
  (window as any).supabaseUtils = {
    testConnection: testSupabaseConnection,
    checkTables: checkTablesExist,
    createPeriod2025,
    checkStatus: checkDatabaseStatus,
    logStatus: logDatabaseStatus,
  };
  
  console.log("✅ Utilidades de Supabase disponibles en window.supabaseUtils");
  console.log("Prueba ejecutar: window.supabaseUtils.logStatus()");
}

