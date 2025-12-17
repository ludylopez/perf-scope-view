/**
 * Script para verificar evaluaciones completas sin resultado calculado
 * 
 * Ejecutar con: npx tsx scripts/verificarEvaluacionesPendientes.ts [PERIODO_ID]
 * 
 * Si no se proporciona PERIODO_ID, se usará el período más reciente.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const periodoId = process.argv[2] || null;
  
  console.log('🔍 === VERIFICACIÓN DE EVALUACIONES PENDIENTES ===\n');
  
  if (periodoId) {
    console.log(`📅 Período especificado: ${periodoId}\n`);
  } else {
    console.log('📅 Usando período más reciente\n');
  }

  try {
    // 1. Obtener resumen
    console.log('📊 Obteniendo resumen...');
    const { data: resumen, error: errorResumen } = await supabase.rpc(
      'resumen_evaluaciones_pendientes',
      { p_periodo_id: periodoId }
    );

    if (errorResumen) {
      console.error('❌ Error obteniendo resumen:', errorResumen);
      throw errorResumen;
    }

    if (!resumen || resumen.length === 0) {
      console.log('⚠️ No se encontró información para el período especificado.');
      return;
    }

    const stats = resumen[0];
    console.log('\n📊 RESUMEN:');
    console.log(`  Período: ${stats.periodo_nombre} (${stats.periodo_id})`);
    console.log(`  Total pendientes: ${stats.total_pendientes}`);
    console.log(`  ⚠️ Casos problemáticos (autoevaluación después): ${stats.casos_problematicos}`);
    console.log(`  ℹ️ Casos normales (autoevaluación antes): ${stats.casos_normales}`);
    console.log('');

    if (stats.total_pendientes === 0) {
      console.log('✅ No hay evaluaciones pendientes. Todas las evaluaciones completas tienen resultado calculado.');
      return;
    }

    // 2. Obtener lista detallada
    console.log('📋 Obteniendo lista detallada...');
    const { data: pendientes, error: errorPendientes } = await supabase.rpc(
      'verificar_evaluaciones_pendientes',
      { p_periodo_id: periodoId }
    );

    if (errorPendientes) {
      console.error('❌ Error obteniendo lista:', errorPendientes);
      throw errorPendientes;
    }

    if (!pendientes || pendientes.length === 0) {
      console.log('✅ No hay evaluaciones pendientes.');
      return;
    }

    console.log(`\n📋 DETALLE DE ${pendientes.length} EVALUACIONES PENDIENTES:\n`);

    // Agrupar por tipo de caso
    const problematicos = pendientes.filter((p: any) => !p.fecha_autoevaluacion_anterior);
    const normales = pendientes.filter((p: any) => p.fecha_autoevaluacion_anterior);

    if (problematicos.length > 0) {
      console.log(`⚠️ CASOS PROBLEMÁTICOS (${problematicos.length}): Autoevaluación enviada DESPUÉS que evaluación del jefe\n`);
      problematicos.forEach((p: any, index: number) => {
        console.log(`  ${index + 1}. ${p.colaborador_nombre} (${p.colaborador_id})`);
        console.log(`     Evaluador: ${p.evaluador_nombre} (${p.evaluador_id})`);
        console.log(`     Fecha autoevaluación: ${new Date(p.autoevaluacion_fecha_envio).toLocaleString('es-GT')}`);
        console.log(`     Fecha evaluación jefe: ${new Date(p.evaluacion_jefe_fecha_envio).toLocaleString('es-GT')}`);
        console.log(`     Diferencia: ${Math.abs(p.dias_diferencia)} días`);
        console.log(`     Estado: ${p.estado}`);
        console.log('');
      });
    }

    if (normales.length > 0) {
      console.log(`ℹ️ CASOS NORMALES (${normales.length}): Autoevaluación enviada ANTES que evaluación del jefe\n`);
      normales.forEach((p: any, index: number) => {
        console.log(`  ${index + 1}. ${p.colaborador_nombre} (${p.colaborador_id})`);
        console.log(`     Evaluador: ${p.evaluador_nombre} (${p.evaluador_id})`);
        console.log(`     Fecha autoevaluación: ${new Date(p.autoevaluacion_fecha_envio).toLocaleString('es-GT')}`);
        console.log(`     Fecha evaluación jefe: ${new Date(p.evaluacion_jefe_fecha_envio).toLocaleString('es-GT')}`);
        console.log(`     Diferencia: ${Math.abs(p.dias_diferencia)} días`);
        console.log('');
      });
    }

    console.log('\n💡 Para recalcular estos resultados, ejecuta:');
    console.log(`   SELECT * FROM recalculate_pending_results('${periodoId || 'NULL'}');`);
    console.log('   O desde la consola del navegador:');
    console.log(`   await verificarEvaluacionesPendientes.recalcular('${periodoId || 'null'}')`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
