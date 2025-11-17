/**
 * Módulo de validación exhaustiva para importación de asignaciones
 * Valida colaboradores, jefes y permisos antes de insertar en Supabase
 */

import { validateEvaluationPermission } from './validations';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fixedData?: any;
}

export interface AssignmentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  colaboradorDpi: string;
  jefeDpi: string;
  grupoId?: string;
}

/**
 * Normaliza un DPI eliminando TODOS los espacios
 */
export function normalizarDPI(dpi: any): string {
  if (!dpi) return '';
  return String(dpi).trim().replace(/\s+/g, '');
}

/**
 * Valida un DPI para asignaciones
 */
export function validateDPIForAssignment(dpi: any, context: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Verificar que existe
  if (dpi === null || dpi === undefined || dpi === '') {
    errors.push(`${context}: DPI vacío o nulo`);
    return { isValid: false, errors, warnings };
  }

  // Normalizar DPI (eliminar espacios)
  const dpiNormalizado = normalizarDPI(dpi);
  
  // Verificar longitud
  if (dpiNormalizado.length < 10 || dpiNormalizado.length > 20) {
    errors.push(`${context}: DPI "${dpiNormalizado}" tiene longitud inválida (${dpiNormalizado.length} caracteres, debe ser entre 10-20)`);
    return { isValid: false, errors, warnings };
  }

  // Verificar que solo contiene dígitos
  if (!/^\d+$/.test(dpiNormalizado)) {
    errors.push(`${context}: DPI "${dpiNormalizado}" contiene caracteres no numéricos`);
    return { isValid: false, errors, warnings };
  }

  // Warning si el DPI original tenía espacios
  if (String(dpi).includes(' ')) {
    warnings.push(`${context}: DPI "${dpi}" contenía espacios, se normalizó a "${dpiNormalizado}"`);
  }

  return {
    isValid: true,
    errors,
    warnings,
    fixedData: dpiNormalizado
  };
}

/**
 * Valida un registro de asignación completo
 */
export async function validateAssignmentRecord(
  row: any,
  rowIndex: number,
  usersMap: Map<string, any>,
  existingAssignments: Set<string>
): Promise<AssignmentValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  console.group(`🔍 Validando asignación fila ${rowIndex}`);

  // ============================================================
  // 1. Validar DPI del COLABORADOR
  // ============================================================
  const colaboradorDpiValidation = validateDPIForAssignment(row.colaborador_dpi, 'Colaborador');
  
  if (!colaboradorDpiValidation.isValid) {
    errors.push(...colaboradorDpiValidation.errors);
    console.error('❌ Colaborador DPI inválido:', colaboradorDpiValidation.errors);
    console.groupEnd();
    return {
      isValid: false,
      errors,
      warnings,
      colaboradorDpi: '',
      jefeDpi: ''
    };
  }

  const colaboradorDpi = colaboradorDpiValidation.fixedData!;
  warnings.push(...colaboradorDpiValidation.warnings);

  // ============================================================
  // 2. Validar que el colaborador existe en el sistema
  // ============================================================
  const colaborador = usersMap.get(colaboradorDpi);
  
  if (!colaborador) {
    errors.push(`Colaborador con DPI "${colaboradorDpi}" no existe en el sistema`);
    console.error('❌ Colaborador no encontrado:', colaboradorDpi);
    console.groupEnd();
    return {
      isValid: false,
      errors,
      warnings,
      colaboradorDpi,
      jefeDpi: ''
    };
  }

  console.log('✅ Colaborador encontrado:', {
    dpi: colaboradorDpi,
    nombre: `${colaborador.nombre} ${colaborador.apellidos}`,
    nivel: colaborador.nivel,
    cargo: colaborador.cargo
  });

  // ============================================================
  // 3. Validar DPI del JEFE
  // ============================================================
  const jefeDpiValidation = validateDPIForAssignment(row.jefe_dpi, 'Jefe');
  
  if (!jefeDpiValidation.isValid) {
    errors.push(...jefeDpiValidation.errors);
    console.error('❌ Jefe DPI inválido:', jefeDpiValidation.errors);
    console.groupEnd();
    return {
      isValid: false,
      errors,
      warnings,
      colaboradorDpi,
      jefeDpi: ''
    };
  }

  const jefeDpi = jefeDpiValidation.fixedData!;
  warnings.push(...jefeDpiValidation.warnings);

  // ============================================================
  // 4. Validar que el jefe existe en el sistema
  // ============================================================
  const jefe = usersMap.get(jefeDpi);
  
  if (!jefe) {
    errors.push(`Jefe con DPI "${jefeDpi}" no existe en el sistema`);
    console.error('❌ Jefe no encontrado:', jefeDpi);
    console.groupEnd();
    return {
      isValid: false,
      errors,
      warnings,
      colaboradorDpi,
      jefeDpi
    };
  }

  console.log('✅ Jefe encontrado:', {
    dpi: jefeDpi,
    nombre: `${jefe.nombre} ${jefe.apellidos}`,
    nivel: jefe.nivel,
    cargo: jefe.cargo
  });

  // ============================================================
  // 5. Validar que no sea auto-asignación
  // ============================================================
  if (colaboradorDpi === jefeDpi) {
    errors.push(`El colaborador "${colaborador.nombre} ${colaborador.apellidos}" no puede ser su propio jefe`);
    console.error('❌ Auto-asignación detectada');
    console.groupEnd();
    return {
      isValid: false,
      errors,
      warnings,
      colaboradorDpi,
      jefeDpi
    };
  }

  // ============================================================
  // 6. Validar permisos de evaluación según reglas de negocio
  // ============================================================
  try {
    const permissionCheck = await validateEvaluationPermission(jefeDpi, colaboradorDpi);
    
    if (!permissionCheck.valid) {
      errors.push(`Permiso denegado: ${permissionCheck.error || 'Sin permisos de evaluación'}`);
      console.error('❌ Permiso de evaluación denegado:', permissionCheck.error);
      console.groupEnd();
      return {
        isValid: false,
        errors,
        warnings,
        colaboradorDpi,
        jefeDpi
      };
    }

    if (permissionCheck.message) {
      console.log('✅ Permisos válidos:', permissionCheck.message);
    }

    console.log('✅ Permisos de evaluación válidos');
  } catch (error: any) {
    errors.push(`Error validando permisos: ${error.message}`);
    console.error('❌ Error en validación de permisos:', error);
    console.groupEnd();
    return {
      isValid: false,
      errors,
      warnings,
      colaboradorDpi,
      jefeDpi
    };
  }

  // ============================================================
  // 7. Verificar duplicados
  // ============================================================
  const assignmentKey = `${colaboradorDpi}-${jefeDpi}`;
  
  if (existingAssignments.has(assignmentKey)) {
    warnings.push(`Asignación duplicada: "${colaborador.nombre} ${colaborador.apellidos}" ya está asignado a "${jefe.nombre} ${jefe.apellidos}"`);
    console.warn('⚠️ Asignación duplicada detectada:', assignmentKey);
  }

  // ============================================================
  // 8. Validar grupo_id (opcional)
  // ============================================================
  let grupoId: string | undefined = undefined;
  
  if (row.grupo_id && String(row.grupo_id).trim()) {
    grupoId = String(row.grupo_id).trim();
    console.log('📋 Grupo especificado:', grupoId);
  }

  console.log('✅ Validación exitosa');
  console.groupEnd();

  return {
    isValid: true,
    errors,
    warnings,
    colaboradorDpi,
    jefeDpi,
    grupoId
  };
}

/**
 * Valida un lote completo de asignaciones
 */
export async function validateAssignmentBatch(
  assignments: any[],
  users: any[]
): Promise<{
  valid: AssignmentValidationResult[];
  invalid: AssignmentValidationResult[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
    duplicates: number;
  };
}> {
  console.group('📊 Validando lote de asignaciones');
  console.log(`Total de registros a validar: ${assignments.length}`);

  // Crear Map de usuarios por DPI para búsqueda rápida
  const usersMap = new Map<string, any>();
  users.forEach(user => {
    const dpiNormalizado = normalizarDPI(user.dpi);
    usersMap.set(dpiNormalizado, user);
  });

  console.log(`Usuarios en sistema: ${usersMap.size}`);

  // Set para detectar duplicados
  const existingAssignments = new Set<string>();

  const valid: AssignmentValidationResult[] = [];
  const invalid: AssignmentValidationResult[] = [];
  let totalWarnings = 0;
  let duplicateCount = 0;

  // Validar cada registro
  for (let i = 0; i < assignments.length; i++) {
    const result = await validateAssignmentRecord(
      assignments[i],
      i + 1,
      usersMap,
      existingAssignments
    );

    if (result.isValid) {
      valid.push(result);
      
      // Marcar como existente para detectar duplicados en el mismo lote
      const key = `${result.colaboradorDpi}-${result.jefeDpi}`;
      if (existingAssignments.has(key)) {
        duplicateCount++;
      }
      existingAssignments.add(key);
    } else {
      invalid.push(result);
    }

    totalWarnings += result.warnings.length;
  }

  const stats = {
    total: assignments.length,
    valid: valid.length,
    invalid: invalid.length,
    warnings: totalWarnings,
    duplicates: duplicateCount
  };

  console.log('📊 Resumen de validación:', stats);
  console.groupEnd();

  return { valid, invalid, stats };
}

/**
 * Formatea errores para mostrar al usuario
 */
export function formatValidationErrors(invalid: AssignmentValidationResult[]): string {
  if (invalid.length === 0) return '';

  const errorsByType = new Map<string, string[]>();

  invalid.forEach(result => {
    result.errors.forEach(error => {
      const type = error.split(':')[0];
      if (!errorsByType.has(type)) {
        errorsByType.set(type, []);
      }
      errorsByType.get(type)!.push(error);
    });
  });

  let output = '❌ Errores de validación:\n\n';
  
  errorsByType.forEach((errors, type) => {
    output += `${type}:\n`;
    errors.forEach(err => output += `  • ${err}\n`);
    output += '\n';
  });

  return output;
}
