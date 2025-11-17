/**
 * Utilidades para importar asignaciones masivas desde Excel/CSV
 */

import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { normalizarDPI, validateAssignmentBatch, AssignmentValidationResult } from './validateAssignmentData';
import { updateUserRoleFromAssignments } from './userRoleDetection';

export interface ParsedAssignmentFile {
  headers: string[];
  rows: any[];
  hasHeaders: boolean;
}

export interface ColumnMapping {
  excelColumn: string;
  mappedTo: 'colaborador_dpi' | 'jefe_dpi' | 'grupo_id' | null;
  sampleValue: string;
}

export interface ImportedAssignment {
  colaboradorDpi: string;
  jefeDpi: string;
  grupoId?: string;
  colaboradorNombre?: string;
  jefeNombre?: string;
}

export interface ImportProgress {
  current: number;
  total: number;
  percentage: number;
}

/**
 * Parsea un archivo Excel o CSV y extrae headers y datos
 */
export async function parsearArchivoAsignaciones(file: File): Promise<ParsedAssignmentFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Leer primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        if (jsonData.length === 0) {
          reject(new Error('El archivo está vacío'));
          return;
        }

        // Detectar si tiene headers (primera fila tiene strings, segunda tiene números o está vacía)
        const firstRow = jsonData[0] as any[];
        const secondRow = jsonData[1] as any[];
        
        const hasHeaders = firstRow.every((cell: any) => 
          typeof cell === 'string' && cell.trim().length > 0
        ) && (
          !secondRow || 
          secondRow.some((cell: any) => typeof cell === 'number' || /^\d+$/.test(String(cell)))
        );

        let headers: string[];
        let dataRows: any[];

        if (hasHeaders) {
          headers = firstRow.map((h: any) => String(h).trim());
          dataRows = jsonData.slice(1) as any[];
        } else {
          // Generar headers genéricos
          headers = firstRow.map((_: any, i: number) => `Columna ${i + 1}`);
          dataRows = jsonData as any[];
        }

        // Convertir filas a objetos
        const rows = dataRows
          .filter((row: any[]) => row && row.length > 0 && row.some(cell => cell !== ''))
          .map((row: any[]) => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] !== undefined ? row[index] : '';
            });
            return obj;
          });

        console.log('✅ Archivo parseado:', {
          headers,
          totalRows: rows.length,
          hasHeaders,
          firstRow: rows[0]
        });

        resolve({ headers, rows, hasHeaders });
      } catch (error) {
        console.error('Error parseando archivo:', error);
        reject(new Error('Error al leer el archivo. Asegúrese de que sea un archivo Excel o CSV válido.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Auto-detecta el mapeo de columnas basándose en nombres comunes
 */
export function mapearColumnasAsignaciones(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  const colaboradorPatterns = [
    'colaborador',
    'empleado',
    'dpi col',
    'dpi_col',
    'colaborador_dpi',
    'colaborador dpi',
    'dpi colaborador',
    'cui colaborador',
    'cui col'
  ];

  const jefePatterns = [
    'jefe',
    'evaluador',
    'supervisor',
    'dpi jefe',
    'dpi_jefe',
    'jefe_dpi',
    'jefe dpi',
    'dpi evaluador',
    'cui jefe',
    'cui evaluador'
  ];

  const grupoPatterns = [
    'grupo',
    'equipo',
    'cuadrilla',
    'grupo_id',
    'equipo_id',
    'id grupo',
    'id equipo'
  ];

  headers.forEach(header => {
    const normalized = header.toLowerCase().trim();

    // Buscar colaborador
    if (colaboradorPatterns.some(pattern => normalized.includes(pattern))) {
      mapping[header] = 'colaborador_dpi';
    }
    // Buscar jefe
    else if (jefePatterns.some(pattern => normalized.includes(pattern))) {
      mapping[header] = 'jefe_dpi';
    }
    // Buscar grupo
    else if (grupoPatterns.some(pattern => normalized.includes(pattern))) {
      mapping[header] = 'grupo_id';
    }
  });

  console.log('🗺️ Mapeo auto-detectado:', mapping);

  return mapping;
}

/**
 * Aplica el mapeo de columnas y procesa los datos
 */
export async function procesarAsignacionesImportadas(
  rows: any[],
  mapping: Record<string, string>,
  users: any[]
): Promise<{
  valid: ImportedAssignment[];
  invalid: any[];
  warnings: string[];
}> {
  console.group('⚙️ Procesando asignaciones importadas');

  // Aplicar mapeo
  const mappedData = rows.map(row => {
    const mapped: any = {};
    
    Object.entries(mapping).forEach(([excelCol, targetField]) => {
      if (targetField) {
        mapped[targetField] = row[excelCol];
      }
    });

    return mapped;
  });

  console.log(`Datos mapeados: ${mappedData.length} registros`);

  // Validar lote completo
  const validationResult = await validateAssignmentBatch(mappedData, users);

  // Crear Map de usuarios para enriquecer datos
  const usersMap = new Map<string, any>();
  users.forEach(user => {
    const dpiNormalizado = normalizarDPI(user.dpi);
    usersMap.set(dpiNormalizado, user);
  });

  // Enriquecer datos válidos con nombres
  const valid: ImportedAssignment[] = validationResult.valid.map(result => {
    const colaborador = usersMap.get(result.colaboradorDpi);
    const jefe = usersMap.get(result.jefeDpi);

    return {
      colaboradorDpi: result.colaboradorDpi,
      jefeDpi: result.jefeDpi,
      grupoId: result.grupoId,
      colaboradorNombre: colaborador ? `${colaborador.nombre} ${colaborador.apellidos}` : undefined,
      jefeNombre: jefe ? `${jefe.nombre} ${jefe.apellidos}` : undefined
    };
  });

  // Recopilar todos los warnings
  const allWarnings: string[] = [];
  validationResult.valid.forEach(result => {
    allWarnings.push(...result.warnings);
  });
  validationResult.invalid.forEach(result => {
    allWarnings.push(...result.warnings);
  });

  // Agregar asignaciones inválidas con sus datos originales
  const invalid = validationResult.invalid.map(result => ({
    colaboradorDpi: result.colaboradorDpi || 'N/A',
    jefeDpi: result.jefeDpi || 'N/A',
    errors: result.errors,
    warnings: result.warnings
  }));

  console.log('✅ Procesamiento completado:', {
    valid: valid.length,
    invalid: invalid.length,
    warnings: allWarnings.length
  });

  console.groupEnd();

  return { valid, invalid, warnings: allWarnings };
}

/**
 * Importa asignaciones en lotes con reintentos
 */
export async function importarAsignacionesLote(
  assignments: ImportedAssignment[],
  onProgress?: (progress: ImportProgress) => void,
  batchSize: number = 10
): Promise<{
  exitosos: number;
  errores: Array<{ assignment: ImportedAssignment; error: string }>;
}> {
  console.group('📤 Importando asignaciones');
  console.log(`Total a importar: ${assignments.length}`);
  console.log(`Tamaño de lote: ${batchSize}`);

  const errores: Array<{ assignment: ImportedAssignment; error: string }> = [];
  let exitosos = 0;

  // Dividir en lotes
  for (let i = 0; i < assignments.length; i += batchSize) {
    const lote = assignments.slice(i, i + batchSize);
    console.log(`\n📦 Procesando lote ${Math.floor(i / batchSize) + 1} (${lote.length} registros)`);

    for (const assignment of lote) {
      try {
        // Insertar asignación con upsert para evitar duplicados
        const { error: insertError } = await supabase
          .from('user_assignments')
          .upsert({
            colaborador_id: assignment.colaboradorDpi,
            jefe_id: assignment.jefeDpi,
            grupo_id: assignment.grupoId || null,
            activo: true
          }, {
            onConflict: 'colaborador_id,jefe_id',
            ignoreDuplicates: false
          });

        if (insertError) {
          console.error(`❌ Error insertando asignación:`, insertError);
          errores.push({
            assignment,
            error: insertError.message
          });
        } else {
          exitosos++;
          console.log(`✅ Asignación creada: ${assignment.colaboradorNombre} → ${assignment.jefeNombre}`);

          // Actualizar rol del jefe basado en sus asignaciones
          try {
            await updateUserRoleFromAssignments(assignment.jefeDpi);
          } catch (roleError: any) {
            console.warn(`⚠️ Error actualizando rol del jefe:`, roleError.message);
            // No agregamos a errores porque la asignación sí se creó
          }
        }
      } catch (error: any) {
        console.error(`❌ Error inesperado:`, error);
        errores.push({
          assignment,
          error: error.message || 'Error desconocido'
        });
      }

      // Actualizar progreso
      if (onProgress) {
        const current = i + lote.indexOf(assignment) + 1;
        onProgress({
          current,
          total: assignments.length,
          percentage: Math.round((current / assignments.length) * 100)
        });
      }
    }

    // Pequeña pausa entre lotes para no saturar
    if (i + batchSize < assignments.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('\n✅ Importación completada:', {
    exitosos,
    errores: errores.length,
    total: assignments.length
  });
  console.groupEnd();

  return { exitosos, errores };
}

/**
 * Genera un CSV de plantilla de ejemplo
 */
export function generarPlantillaAsignaciones(): string {
  const headers = ['colaborador_dpi', 'jefe_dpi', 'grupo_id'];
  const ejemplos = [
    ['1234567890123', '9876543210987', ''],
    ['5555666677778', '9876543210987', 'GRUPO-001'],
    ['1111222233334', '4444555566667', '']
  ];

  const csv = [
    headers.join(','),
    ...ejemplos.map(row => row.join(','))
  ].join('\n');

  return csv;
}

/**
 * Descarga la plantilla como archivo
 */
export function descargarPlantillaAsignaciones(): void {
  const csv = generarPlantillaAsignaciones();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'plantilla_asignaciones.csv');
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
