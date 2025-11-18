/**
 * Utilidad para importar asignaciones directamente desde la consola del navegador
 * Uso: window.importarAsignaciones()
 */

import { supabase } from '@/integrations/supabase/client';

interface AsignacionCSV {
  colaborador_dpi: string;
  jefe_dpi: string;
}

const ASIGNACIONES_DATA: AsignacionCSV[] = [
  { colaborador_dpi: "1616902622007", jefe_dpi: "2727807232007" },
  { colaborador_dpi: "1616902622007", jefe_dpi: "2535682262007" },
  { colaborador_dpi: "1616902622007", jefe_dpi: "1889965322007" },
  { colaborador_dpi: "1616902622007", jefe_dpi: "1660135282007" },
  { colaborador_dpi: "1616902622007", jefe_dpi: "1666356852007" },
  { colaborador_dpi: "1616902622007", jefe_dpi: "1658194642007" },
  { colaborador_dpi: "1616902622007", jefe_dpi: "1823097112007" },
  { colaborador_dpi: "1616902622007", jefe_dpi: "1944019012007" },
  { colaborador_dpi: "1616902622007", jefe_dpi: "1982235442007" },
  { colaborador_dpi: "2727807232007", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "2535682262007", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "1889965322007", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "1660135282007", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "1666356852007", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "1658194642007", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "1823097112007", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "1944019012007", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "1982235442007", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "1779331272007", jefe_dpi: "2727807232007" },
  { colaborador_dpi: "1779331272007", jefe_dpi: "2535682262007" },
  { colaborador_dpi: "1779331272007", jefe_dpi: "1889965322007" },
  { colaborador_dpi: "1779331272007", jefe_dpi: "1660135282007" },
  { colaborador_dpi: "1779331272007", jefe_dpi: "1666356852007" },
  { colaborador_dpi: "1779331272007", jefe_dpi: "1658194642007" },
  { colaborador_dpi: "1779331272007", jefe_dpi: "1823097112007" },
  { colaborador_dpi: "1779331272007", jefe_dpi: "1944019012007" },
  { colaborador_dpi: "1779331272007", jefe_dpi: "1982235442007" },
  { colaborador_dpi: "1779331272007", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "1593347802007", jefe_dpi: "2727807232007" },
  { colaborador_dpi: "1593347802007", jefe_dpi: "2535682262007" },
  { colaborador_dpi: "1593347802007", jefe_dpi: "1889965322007" },
  { colaborador_dpi: "1593347802007", jefe_dpi: "1660135282007" },
  { colaborador_dpi: "1593347802007", jefe_dpi: "1666356852007" },
  { colaborador_dpi: "1593347802007", jefe_dpi: "1658194642007" },
  { colaborador_dpi: "1593347802007", jefe_dpi: "1823097112007" },
  { colaborador_dpi: "1593347802007", jefe_dpi: "1944019012007" },
  { colaborador_dpi: "1593347802007", jefe_dpi: "1982235442007" },
  { colaborador_dpi: "1593347802007", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "1646296290101", jefe_dpi: "2727807232007" },
  { colaborador_dpi: "1646296290101", jefe_dpi: "2535682262007" },
  { colaborador_dpi: "1646296290101", jefe_dpi: "1889965322007" },
  { colaborador_dpi: "1646296290101", jefe_dpi: "1660135282007" },
  { colaborador_dpi: "1646296290101", jefe_dpi: "1666356852007" },
  { colaborador_dpi: "1646296290101", jefe_dpi: "1658194642007" },
  { colaborador_dpi: "1646296290101", jefe_dpi: "1823097112007" },
  { colaborador_dpi: "1646296290101", jefe_dpi: "1944019012007" },
  { colaborador_dpi: "1646296290101", jefe_dpi: "1982235442007" },
  { colaborador_dpi: "1646296290101", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "1842954320805", jefe_dpi: "2727807232007" },
  { colaborador_dpi: "1842954320805", jefe_dpi: "2535682262007" },
  { colaborador_dpi: "1842954320805", jefe_dpi: "1889965322007" },
  { colaborador_dpi: "1842954320805", jefe_dpi: "1660135282007" },
  { colaborador_dpi: "1842954320805", jefe_dpi: "1666356852007" },
  { colaborador_dpi: "1842954320805", jefe_dpi: "1658194642007" },
  { colaborador_dpi: "1842954320805", jefe_dpi: "1823097112007" },
  { colaborador_dpi: "1842954320805", jefe_dpi: "1944019012007" },
  { colaborador_dpi: "1842954320805", jefe_dpi: "1982235442007" },
  { colaborador_dpi: "1842954320805", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "1976806152007", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "2473925962007", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "1944021262011", jefe_dpi: "2727807232007" },
  { colaborador_dpi: "1944021262011", jefe_dpi: "2535682262007" },
  { colaborador_dpi: "1944021262011", jefe_dpi: "1889965322007" },
  { colaborador_dpi: "1944021262011", jefe_dpi: "1660135282007" },
  { colaborador_dpi: "1944021262011", jefe_dpi: "1666356852007" },
  { colaborador_dpi: "1944021262011", jefe_dpi: "1658194642007" },
  { colaborador_dpi: "1944021262011", jefe_dpi: "1823097112007" },
  { colaborador_dpi: "1944021262011", jefe_dpi: "1944019012007" },
  { colaborador_dpi: "1944021262011", jefe_dpi: "1982235442007" },
  { colaborador_dpi: "1944021262011", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "1673792402011", jefe_dpi: "2727807232007" },
  { colaborador_dpi: "1673792402011", jefe_dpi: "2535682262007" },
  { colaborador_dpi: "1673792402011", jefe_dpi: "1889965322007" },
  { colaborador_dpi: "1673792402011", jefe_dpi: "1660135282007" },
  { colaborador_dpi: "1673792402011", jefe_dpi: "1666356852007" },
  { colaborador_dpi: "1673792402011", jefe_dpi: "1658194642007" },
  { colaborador_dpi: "1673792402011", jefe_dpi: "1823097112007" },
  { colaborador_dpi: "1673792402011", jefe_dpi: "1944019012007" },
  { colaborador_dpi: "1673792402011", jefe_dpi: "1982235442007" },
  { colaborador_dpi: "1673792402011", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "1943720492007", jefe_dpi: "2727807232007" },
  { colaborador_dpi: "1943720492007", jefe_dpi: "2535682262007" },
  { colaborador_dpi: "1943720492007", jefe_dpi: "1889965322007" },
  { colaborador_dpi: "1943720492007", jefe_dpi: "1660135282007" },
  { colaborador_dpi: "1943720492007", jefe_dpi: "1666356852007" },
  { colaborador_dpi: "1943720492007", jefe_dpi: "1658194642007" },
  { colaborador_dpi: "1943720492007", jefe_dpi: "1823097112007" },
  { colaborador_dpi: "1943720492007", jefe_dpi: "1944019012007" },
  { colaborador_dpi: "1943720492007", jefe_dpi: "1982235442007" },
  { colaborador_dpi: "1943720492007", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "1943076542007", jefe_dpi: "2727807232007" },
  { colaborador_dpi: "1943076542007", jefe_dpi: "2535682262007" },
  { colaborador_dpi: "1943076542007", jefe_dpi: "1889965322007" },
  { colaborador_dpi: "1943076542007", jefe_dpi: "1660135282007" },
  { colaborador_dpi: "1943076542007", jefe_dpi: "1666356852007" },
  { colaborador_dpi: "1943076542007", jefe_dpi: "1658194642007" },
  { colaborador_dpi: "1943076542007", jefe_dpi: "1823097112007" },
  { colaborador_dpi: "1943076542007", jefe_dpi: "1944019012007" },
  { colaborador_dpi: "1943076542007", jefe_dpi: "1982235442007" },
  { colaborador_dpi: "1943076542007", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "2500885092007", jefe_dpi: "2727807232007" },
  { colaborador_dpi: "2500885092007", jefe_dpi: "2535682262007" },
  { colaborador_dpi: "2500885092007", jefe_dpi: "1889965322007" },
  { colaborador_dpi: "2500885092007", jefe_dpi: "1660135282007" },
  { colaborador_dpi: "2500885092007", jefe_dpi: "1666356852007" },
  { colaborador_dpi: "2500885092007", jefe_dpi: "1658194642007" },
  { colaborador_dpi: "2500885092007", jefe_dpi: "1823097112007" },
  { colaborador_dpi: "2500885092007", jefe_dpi: "1944019012007" },
  { colaborador_dpi: "2500885092007", jefe_dpi: "1982235442007" },
  { colaborador_dpi: "2500885092007", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "1926397062007", jefe_dpi: "2727807232007" },
  { colaborador_dpi: "1926397062007", jefe_dpi: "2535682262007" },
  { colaborador_dpi: "1926397062007", jefe_dpi: "1889965322007" },
  { colaborador_dpi: "1926397062007", jefe_dpi: "1660135282007" },
  { colaborador_dpi: "1926397062007", jefe_dpi: "1666356852007" },
  { colaborador_dpi: "1926397062007", jefe_dpi: "1658194642007" },
  { colaborador_dpi: "1926397062007", jefe_dpi: "1823097112007" },
  { colaborador_dpi: "1926397062007", jefe_dpi: "1944019012007" },
  { colaborador_dpi: "1926397062007", jefe_dpi: "1982235442007" },
  { colaborador_dpi: "1926397062007", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "1769811792007", jefe_dpi: "2727807232007" },
  { colaborador_dpi: "1769811792007", jefe_dpi: "2535682262007" },
  { colaborador_dpi: "1769811792007", jefe_dpi: "1889965322007" },
  { colaborador_dpi: "1769811792007", jefe_dpi: "1660135282007" },
  { colaborador_dpi: "1769811792007", jefe_dpi: "1666356852007" },
  { colaborador_dpi: "1769811792007", jefe_dpi: "1658194642007" },
  { colaborador_dpi: "1769811792007", jefe_dpi: "1823097112007" },
  { colaborador_dpi: "1769811792007", jefe_dpi: "1944019012007" },
  { colaborador_dpi: "1769811792007", jefe_dpi: "1982235442007" },
  { colaborador_dpi: "1769811792007", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "1926094242001", jefe_dpi: "2727807232007" },
  { colaborador_dpi: "1926094242001", jefe_dpi: "2535682262007" },
  { colaborador_dpi: "1926094242001", jefe_dpi: "1889965322007" },
  { colaborador_dpi: "1926094242001", jefe_dpi: "1660135282007" },
  { colaborador_dpi: "1926094242001", jefe_dpi: "1666356852007" },
  { colaborador_dpi: "1926094242001", jefe_dpi: "1658194642007" },
  { colaborador_dpi: "1926094242001", jefe_dpi: "1823097112007" },
  { colaborador_dpi: "1926094242001", jefe_dpi: "1944019012007" },
  { colaborador_dpi: "1926094242001", jefe_dpi: "1982235442007" },
  { colaborador_dpi: "1926094242001", jefe_dpi: "1616902622007" },
  { colaborador_dpi: "2728542980101", jefe_dpi: "2727807232007" },
  { colaborador_dpi: "2728542980101", jefe_dpi: "2535682262007" },
  { colaborador_dpi: "2728542980101", jefe_dpi: "1889965322007" },
  { colaborador_dpi: "2728542980101", jefe_dpi: "1660135282007" },
  { colaborador_dpi: "2728542980101", jefe_dpi: "1666356852007" },
  { colaborador_dpi: "2728542980101", jefe_dpi: "1658194642007" },
  { colaborador_dpi: "2728542980101", jefe_dpi: "1823097112007" },
  { colaborador_dpi: "2728542980101", jefe_dpi: "1944019012007" },
  { colaborador_dpi: "2728542980101", jefe_dpi: "1982235442007" },
  { colaborador_dpi: "2728542980101", jefe_dpi: "1616902622007" },
];

export async function importarAsignacionesDirecto() {
  console.log('🚀 Iniciando importación de asignaciones múltiples evaluadores (C1)...\n');
  console.log(`📊 Total de asignaciones: ${ASIGNACIONES_DATA.length}\n`);

  try {
    // 1. Verificar usuarios existentes
    console.log('🔍 Verificando usuarios en la base de datos...');
    const { data: usuarios, error: errorUsuarios } = await supabase
      .from('users')
      .select('dpi, nombre, apellidos, cargo, nivel, rol')
      .eq('estado', 'activo');

    if (errorUsuarios) {
      console.error('❌ Error al cargar usuarios:', errorUsuarios.message);
      return {
        success: false,
        error: errorUsuarios.message
      };
    }

    const usuariosMap = new Map(usuarios!.map(u => [u.dpi, u]));
    console.log(`✅ Usuarios activos encontrados: ${usuariosMap.size}\n`);

    // 2. Validar asignaciones
    console.log('✅ Validando asignaciones...');
    const asignacionesValidas = [];
    const errores = [];

    for (const asignacion of ASIGNACIONES_DATA) {
      const { colaborador_dpi, jefe_dpi } = asignacion;

      if (!usuariosMap.has(colaborador_dpi)) {
        errores.push(`Colaborador ${colaborador_dpi} no existe`);
        continue;
      }

      if (!usuariosMap.has(jefe_dpi)) {
        errores.push(`Jefe ${jefe_dpi} no existe`);
        continue;
      }

      if (colaborador_dpi === jefe_dpi) {
        errores.push(`Auto-asignación: ${colaborador_dpi}`);
        continue;
      }

      asignacionesValidas.push({
        colaborador_id: colaborador_dpi,
        jefe_id: jefe_dpi,
        activo: true
      });
    }

    console.log(`✅ Asignaciones válidas: ${asignacionesValidas.length}`);
    if (errores.length > 0) {
      console.warn(`⚠️  Errores: ${errores.length}`);
      errores.slice(0, 10).forEach(e => console.warn(`  - ${e}`));
      if (errores.length > 10) {
        console.warn(`  ... y ${errores.length - 10} errores más`);
      }
    }
    console.log('');

    if (asignacionesValidas.length === 0) {
      console.error('❌ No hay asignaciones válidas para importar');
      return {
        success: false,
        error: 'No hay asignaciones válidas',
        errores
      };
    }

    // 3. Insertar asignaciones en lotes
    console.log('💾 Insertando asignaciones en la base de datos...');
    const BATCH_SIZE = 100;
    let insertados = 0;
    let duplicados = 0;

    for (let i = 0; i < asignacionesValidas.length; i += BATCH_SIZE) {
      const lote = asignacionesValidas.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('user_assignments')
        .insert(lote);

      if (error) {
        if (error.code === '23505') { // Duplicado
          duplicados += lote.length;
          console.log(`⚠️  Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${lote.length} asignaciones ya existen`);
        } else {
          console.error(`❌ Error en lote ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
        }
      } else {
        insertados += lote.length;
        console.log(`✅ Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${lote.length} asignaciones insertadas`);
      }
    }

    // 4. Actualizar roles de jefes
    console.log('\n🔄 Actualizando roles de jefes...');
    const jefesUnicos = [...new Set(asignacionesValidas.map(a => a.jefe_id))];
    
    let jefesActualizados = 0;
    for (const jefeDpi of jefesUnicos) {
      const usuario = usuariosMap.get(jefeDpi);
      // Solo actualizar si no es admin (mantener admin_rrhh y admin_general)
      if (usuario && usuario.rol !== 'admin_rrhh' && usuario.rol !== 'admin_general') {
        const { error } = await supabase
          .from('users')
          .update({ rol: 'jefe' })
          .eq('dpi', jefeDpi);

        if (!error) {
          jefesActualizados++;
        }
      }
    }
    
    console.log(`✅ ${jefesActualizados} jefes actualizados de ${jefesUnicos.length} jefes únicos`);

    // 5. Resumen
    console.log('\n📊 ═══════════════════════════════════════');
    console.log('📊 RESUMEN FINAL DE IMPORTACIÓN');
    console.log('📊 ═══════════════════════════════════════');
    console.log(`✅ Asignaciones insertadas: ${insertados}`);
    console.log(`⚠️  Asignaciones duplicadas: ${duplicados}`);
    console.log(`❌ Asignaciones con errores: ${errores.length}`);
    console.log(`📝 Total procesado: ${ASIGNACIONES_DATA.length}`);
    console.log(`👥 Supervisores actualizados: ${supervisoresActualizados}`);
    console.log(`👥 Jefes únicos: ${jefesUnicos.length}`);
    console.log('📊 ═══════════════════════════════════════\n');

    return {
      success: true,
      insertados,
      duplicados,
      errores: errores.length,
      supervisores: supervisoresActualizados,
      jefesUnicos: jefesUnicos.length
    };

  } catch (error: any) {
    console.error('❌ Error general:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Exponer en window para acceso desde consola
if (typeof window !== 'undefined') {
  (window as any).importarAsignaciones = importarAsignacionesDirecto;
}
