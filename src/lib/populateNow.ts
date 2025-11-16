/**
 * Script para poblar las explicaciones inmediatamente
 * Este archivo puede ejecutarse desde el navegador
 */

import { generateAllDimensionExplanations } from "./generateDimensionExplanations";

// Ejecutar automáticamente al importar
export async function populateNow() {
  try {
    console.log("🚀 Iniciando población de explicaciones...");
    await generateAllDimensionExplanations();
    console.log("✅ Población completada exitosamente");
    return { success: true };
  } catch (error: any) {
    console.error("❌ Error:", error);
    return { success: false, error: error.message };
  }
}

// Auto-ejecutar si se llama directamente
if (typeof window !== "undefined") {
  // Solo ejecutar si se llama explícitamente desde la consola
  (window as any).populateExplanations = populateNow;
}

