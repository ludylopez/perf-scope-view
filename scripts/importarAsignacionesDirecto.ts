/**
 * Script para importar asignaciones masivas desde CSV
 * Maneja múltiples evaluadores por colaborador (C1)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oxadpbdlpvwyapuondei.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94YWRwYmRscHZ3eWFwdW9uZGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMjU5MzcsImV4cCI6MjA3NzkwMTkzN30.HjIoMaw20qx7DscE-XWCaz88EWa0Jv_aCDcMtv6eadw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Datos del CSV (copiados directamente)
const CSV_DATA = `colaborador_dpi,jefe_dpi
1616 90262 2007,2727 80723 2007 
1616 90262 2007,2535 68226 2007
1616 90262 2007,1889 96532 2007
1616 90262 2007,1660 13528 2007
1616 90262 2007,1666 35685 2007
1616 90262 2007,1658 19464 2007
1616 90262 2007,1823 09711 2007
1616 90262 2007,1944 01901 2007
1616 90262 2007,1982 23544 2007
2727 80723 2007 ,1616 90262 2007
2535 68226 2007,1616 90262 2007
1889 96532 2007,1616 90262 2007
1660 13528 2007,1616 90262 2007
1666 35685 2007,1616 90262 2007
1658 19464 2007,1616 90262 2007
1823 09711 2007,1616 90262 2007
1944 01901 2007,1616 90262 2007
1982 23544 2007,1616 90262 2007
1779 33127 2007 ,2727 80723 2007 
1779 33127 2007 ,2535 68226 2007
1779 33127 2007 ,1889 96532 2007
1779 33127 2007 ,1660 13528 2007
1779 33127 2007 ,1666 35685 2007
1779 33127 2007 ,1658 19464 2007
1779 33127 2007 ,1823 09711 2007
1779 33127 2007 ,1944 01901 2007
1779 33127 2007 ,1982 23544 2007
1779 33127 2007 ,1616 90262 2007
1593 34780 2007,2727 80723 2007 
1593 34780 2007,2535 68226 2007
1593 34780 2007,1889 96532 2007
1593 34780 2007,1660 13528 2007
1593 34780 2007,1666 35685 2007
1593 34780 2007,1658 19464 2007
1593 34780 2007,1823 09711 2007
1593 34780 2007,1944 01901 2007
1593 34780 2007,1982 23544 2007
1593 34780 2007,1616 90262 2007
1646 29629 0101,2727 80723 2007 
1646 29629 0101,2535 68226 2007
1646 29629 0101,1889 96532 2007
1646 29629 0101,1660 13528 2007
1646 29629 0101,1666 35685 2007
1646 29629 0101,1658 19464 2007
1646 29629 0101,1823 09711 2007
1646 29629 0101,1944 01901 2007
1646 29629 0101,1982 23544 2007
1646 29629 0101,1616 90262 2007
1842 95432 0805,2727 80723 2007 
1842 95432 0805,2535 68226 2007
1842 95432 0805,1889 96532 2007
1842 95432 0805,1660 13528 2007
1842 95432 0805,1666 35685 2007
1842 95432 0805,1658 19464 2007
1842 95432 0805,1823 09711 2007
1842 95432 0805,1944 01901 2007
1842 95432 0805,1982 23544 2007
1842 95432 0805,1616 90262 2007
1976 80615 2007,1616 90262 2007
2473 92596 2007,1616 90262 2007
1944 02126 2011,2727 80723 2007 
1944 02126 2011,2535 68226 2007
1944 02126 2011,1889 96532 2007
1944 02126 2011,1660 13528 2007
1944 02126 2011,1666 35685 2007
1944 02126 2011,1658 19464 2007
1944 02126 2011,1823 09711 2007
1944 02126 2011,1944 01901 2007
1944 02126 2011,1982 23544 2007
1944 02126 2011,1616 90262 2007
1673 79240 2011,2727 80723 2007 
1673 79240 2011,2535 68226 2007
1673 79240 2011,1889 96532 2007
1673 79240 2011,1660 13528 2007
1673 79240 2011,1666 35685 2007
1673 79240 2011,1658 19464 2007
1673 79240 2011,1823 09711 2007
1673 79240 2011,1944 01901 2007
1673 79240 2011,1982 23544 2007
1673 79240 2011,1616 90262 2007
1943 72049 2007,2727 80723 2007 
1943 72049 2007,2535 68226 2007
1943 72049 2007,1889 96532 2007
1943 72049 2007,1660 13528 2007
1943 72049 2007,1666 35685 2007
1943 72049 2007,1658 19464 2007
1943 72049 2007,1823 09711 2007
1943 72049 2007,1944 01901 2007
1943 72049 2007,1982 23544 2007
1943 72049 2007,1616 90262 2007
1943 07654 2007 ,2727 80723 2007 
1943 07654 2007 ,2535 68226 2007
1943 07654 2007 ,1889 96532 2007
1943 07654 2007 ,1660 13528 2007
1943 07654 2007 ,1666 35685 2007
1943 07654 2007 ,1658 19464 2007
1943 07654 2007 ,1823 09711 2007
1943 07654 2007 ,1944 01901 2007
1943 07654 2007 ,1982 23544 2007
1943 07654 2007 ,1616 90262 2007
2500 88509 2007,2727 80723 2007 
2500 88509 2007,2535 68226 2007
2500 88509 2007,1889 96532 2007
2500 88509 2007,1660 13528 2007
2500 88509 2007,1666 35685 2007
2500 88509 2007,1658 19464 2007
2500 88509 2007,1823 09711 2007
2500 88509 2007,1944 01901 2007
2500 88509 2007,1982 23544 2007
2500 88509 2007,1616 90262 2007
1926 39706 2007,2727 80723 2007 
1926 39706 2007,2535 68226 2007
1926 39706 2007,1889 96532 2007
1926 39706 2007,1660 13528 2007
1926 39706 2007,1666 35685 2007
1926 39706 2007,1658 19464 2007
1926 39706 2007,1823 09711 2007
1926 39706 2007,1944 01901 2007
1926 39706 2007,1982 23544 2007
1926 39706 2007,1616 90262 2007
1769 81179 2007,2727 80723 2007 
1769 81179 2007,2535 68226 2007
1769 81179 2007,1889 96532 2007
1769 81179 2007,1660 13528 2007
1769 81179 2007,1666 35685 2007
1769 81179 2007,1658 19464 2007
1769 81179 2007,1823 09711 2007
1769 81179 2007,1944 01901 2007
1769 81179 2007,1982 23544 2007
1769 81179 2007,1616 90262 2007
1926 09424 2001,2727 80723 2007 
1926 09424 2001,2535 68226 2007
1926 09424 2001,1889 96532 2007
1926 09424 2001,1660 13528 2007
1926 09424 2001,1666 35685 2007
1926 09424 2001,1658 19464 2007
1926 09424 2001,1823 09711 2007
1926 09424 2001,1944 01901 2007
1926 09424 2001,1982 23544 2007
1926 09424 2001,1616 90262 2007
2728 54298 0101,2727 80723 2007 
2728 54298 0101,2535 68226 2007
2728 54298 0101,1889 96532 2007
2728 54298 0101,1660 13528 2007
2728 54298 0101,1666 35685 2007
2728 54298 0101,1658 19464 2007
2728 54298 0101,1823 09711 2007
2728 54298 0101,1944 01901 2007
2728 54298 0101,1982 23544 2007
2728 54298 0101,1616 90262 2007`;

function normalizarDPI(dpi: string): string {
  return dpi.trim().replace(/\s+/g, '');
}

async function importarAsignaciones() {
  console.log('🚀 Iniciando importación de asignaciones...\n');

  // Parsear CSV
  const lineas = CSV_DATA.split('\n').filter(l => l.trim());
  const asignaciones = lineas.slice(1).map(linea => {
    const [colab, jefe] = linea.split(',');
    return {
      colaborador_dpi: normalizarDPI(colab),
      jefe_dpi: normalizarDPI(jefe)
    };
  });

  console.log(`📊 Total de asignaciones a procesar: ${asignaciones.length}\n`);

  // Verificar usuarios existentes
  console.log('🔍 Verificando usuarios en la base de datos...');
  const { data: usuarios, error: errorUsuarios } = await supabase
    .from('users')
    .select('dpi, nombre, apellidos, cargo, nivel')
    .eq('estado', 'activo');

  if (errorUsuarios) {
    console.error('❌ Error al cargar usuarios:', errorUsuarios);
    return;
  }

  const usuariosMap = new Map(usuarios!.map(u => [u.dpi, u]));
  console.log(`✅ Usuarios activos encontrados: ${usuariosMap.size}\n`);

  // Validar y preparar asignaciones
  const asignacionesValidas = [];
  const errores = [];

  for (let i = 0; i < asignaciones.length; i++) {
    const { colaborador_dpi, jefe_dpi } = asignaciones[i];

    // Validar colaborador existe
    if (!usuariosMap.has(colaborador_dpi)) {
      errores.push(`Línea ${i + 2}: Colaborador ${colaborador_dpi} no existe`);
      continue;
    }

    // Validar jefe existe
    if (!usuariosMap.has(jefe_dpi)) {
      errores.push(`Línea ${i + 2}: Jefe ${jefe_dpi} no existe`);
      continue;
    }

    // Validar no sea auto-asignación
    if (colaborador_dpi === jefe_dpi) {
      errores.push(`Línea ${i + 2}: Auto-asignación detectada`);
      continue;
    }

    asignacionesValidas.push({
      colaborador_id: colaborador_dpi,
      jefe_id: jefe_dpi,
      activo: true
    });
  }

  console.log(`✅ Asignaciones válidas: ${asignacionesValidas.length}`);
  console.log(`❌ Errores: ${errores.length}\n`);

  if (errores.length > 0) {
    console.log('⚠️  Errores encontrados:');
    errores.forEach(e => console.log(`  - ${e}`));
    console.log('');
  }

  // Insertar en lotes
  if (asignacionesValidas.length > 0) {
    console.log('💾 Insertando asignaciones en la base de datos...');
    
    const BATCH_SIZE = 50;
    let insertados = 0;
    let fallos = 0;

    for (let i = 0; i < asignacionesValidas.length; i += BATCH_SIZE) {
      const lote = asignacionesValidas.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('user_assignments')
        .insert(lote);

      if (error) {
        console.log(`❌ Error en lote ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
        fallos += lote.length;
      } else {
        insertados += lote.length;
        console.log(`✅ Lote ${Math.floor(i / BATCH_SIZE) + 1} insertado (${lote.length} asignaciones)`);
      }
    }

    console.log('\n📊 RESUMEN FINAL:');
    console.log(`  ✅ Asignaciones insertadas: ${insertados}`);
    console.log(`  ❌ Asignaciones fallidas: ${fallos}`);
    console.log(`  📝 Total procesado: ${asignaciones.length}`);
    
    // Actualizar roles de supervisores
    console.log('\n🔄 Actualizando roles de supervisores...');
    const jefesUnicos = [...new Set(asignacionesValidas.map(a => a.jefe_id))];
    
    for (const jefeDpi of jefesUnicos) {
      await supabase
        .from('users')
        .update({ rol: 'supervisor' })
        .eq('dpi', jefeDpi)
        .neq('rol', 'admin');
    }
    
    console.log(`✅ ${jefesUnicos.length} supervisores actualizados`);
  }

  console.log('\n✨ Proceso completado');
}

// Ejecutar
importarAsignaciones().catch(console.error);
