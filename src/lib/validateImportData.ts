/**
 * Módulo de validación exhaustiva para importación de usuarios
 * Valida TODOS los campos antes de intentar insertar en Supabase
 */

import { mapearNivelAcodigo, normalizarGenero, convertirFechaNacimiento, convertirFechaIngreso, separarNombre } from './importUsers';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fixedData?: any;
}

export interface FieldValidation {
  field: string;
  value: any;
  expectedType: string;
  constraints: string[];
  isValid: boolean;
  error?: string;
  warning?: string;
  fixedValue?: any;
}

/**
 * Valida y diagnostica UN registro completo
 */
export function validateUserRecord(
  row: any,
  rowIndex: number,
  nivelesValidos: Set<string>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fixedData: any = {};

  console.group(`🔍 Validando fila ${rowIndex}`);

  // ============================================================
  // 1. DPI (VARCHAR(20), PRIMARY KEY, NOT NULL)
  // ============================================================
  const dpiValidation = validateDPI(row.dpi, rowIndex);
  if (!dpiValidation.isValid) {
    errors.push(dpiValidation.error!);
  } else {
    fixedData.dpi = dpiValidation.fixedValue;
    if (dpiValidation.warning) warnings.push(dpiValidation.warning);
  }
  logFieldValidation('DPI', dpiValidation);

  // ============================================================
  // 2. NOMBRE COMPLETO → nombre + apellidos (VARCHAR(255), NOT NULL)
  // ============================================================
  const nombreValidation = validateNombreCompleto(row.nombreCompleto, rowIndex);
  if (!nombreValidation.isValid) {
    errors.push(nombreValidation.error!);
  } else {
    fixedData.nombre = nombreValidation.fixedValue.nombre;
    fixedData.apellidos = nombreValidation.fixedValue.apellidos;
    if (nombreValidation.warning) warnings.push(nombreValidation.warning);
  }
  logFieldValidation('NOMBRE', nombreValidation);

  // ============================================================
  // 3. FECHA_NACIMIENTO (VARCHAR(10), NOT NULL, formato DDMMAAAA)
  // ============================================================
  const fechaNacValidation = validateFechaNacimiento(row.fechaNacimiento, rowIndex);
  if (!fechaNacValidation.isValid) {
    errors.push(fechaNacValidation.error!);
  } else {
    fixedData.fecha_nacimiento = fechaNacValidation.fixedValue;
    if (fechaNacValidation.warning) warnings.push(fechaNacValidation.warning);
  }
  logFieldValidation('FECHA_NACIMIENTO', fechaNacValidation);

  // ============================================================
  // 4. FECHA_INGRESO (DATE, OPCIONAL, formato YYYY-MM-DD)
  // ============================================================
  const fechaIngValidation = validateFechaIngreso(row.fechaIngreso, rowIndex);
  if (!fechaIngValidation.isValid) {
    errors.push(fechaIngValidation.error!);
  } else {
    fixedData.fecha_ingreso = fechaIngValidation.fixedValue;
    if (fechaIngValidation.warning) warnings.push(fechaIngValidation.warning);
  }
  logFieldValidation('FECHA_INGRESO', fechaIngValidation);

  // ============================================================
  // 5. NIVEL (VARCHAR(10), NOT NULL, debe estar en job_levels)
  // ============================================================
  const nivelValidation = validateNivel(row.nivel, rowIndex, nivelesValidos);
  if (!nivelValidation.isValid) {
    errors.push(nivelValidation.error!);
  } else {
    fixedData.nivel = nivelValidation.fixedValue;
    if (nivelValidation.warning) warnings.push(nivelValidation.warning);
  }
  logFieldValidation('NIVEL', nivelValidation);

  // ============================================================
  // 6. CARGO (VARCHAR(255), NOT NULL)
  // ============================================================
  const cargoValidation = validateTextField(row.cargo, 'cargo', 255, true, rowIndex);
  if (!cargoValidation.isValid) {
    errors.push(cargoValidation.error!);
  } else {
    fixedData.cargo = cargoValidation.fixedValue;
    if (cargoValidation.warning) warnings.push(cargoValidation.warning);
  }
  logFieldValidation('CARGO', cargoValidation);

  // ============================================================
  // 7. AREA (VARCHAR(255), NOT NULL)
  // ============================================================
  const areaValidation = validateTextField(row.area, 'area', 255, true, rowIndex);
  if (!areaValidation.isValid) {
    errors.push(areaValidation.error!);
  } else {
    fixedData.area = areaValidation.fixedValue;
    if (areaValidation.warning) warnings.push(areaValidation.warning);
  }
  logFieldValidation('AREA', areaValidation);

  // ============================================================
  // 8. GÉNERO (VARCHAR(20), OPCIONAL, enum específico)
  // ============================================================
  const generoValidation = validateGenero(row.genero, rowIndex);
  if (!generoValidation.isValid) {
    errors.push(generoValidation.error!);
  } else {
    fixedData.genero = generoValidation.fixedValue;
    if (generoValidation.warning) warnings.push(generoValidation.warning);
  }
  logFieldValidation('GENERO', generoValidation);

  // ============================================================
  // CAMPOS CON VALORES POR DEFECTO
  // ============================================================
  fixedData.rol = 'colaborador';
  fixedData.estado = 'activo';
  fixedData.primer_ingreso = true;
  // tipo_puesto se asignará automáticamente por el trigger BEFORE INSERT

  console.groupEnd();

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    fixedData: errors.length === 0 ? fixedData : undefined
  };
}

// ============================================================
// FUNCIONES DE VALIDACIÓN POR CAMPO
// ============================================================

function validateDPI(dpi: any, rowIndex: number): FieldValidation {
  const field = 'dpi';
  const expectedType = 'VARCHAR(20)';
  const constraints = ['NOT NULL', 'PRIMARY KEY', '13 dígitos sin espacios'];

  if (!dpi) {
    return {
      field,
      value: dpi,
      expectedType,
      constraints,
      isValid: false,
      error: `Fila ${rowIndex}: DPI vacío o nulo`
    };
  }

  // Convertir a string y limpiar
  const dpiStr = String(dpi).trim().replace(/\s+/g, '');

  // Validar que solo contenga dígitos
  if (!/^\d+$/.test(dpiStr)) {
    return {
      field,
      value: dpi,
      expectedType,
      constraints,
      isValid: false,
      error: `Fila ${rowIndex}: DPI debe contener solo dígitos, recibido: "${dpi}"`
    };
  }

  // Validar longitud (DPI guatemalteco tiene 13 dígitos)
  if (dpiStr.length < 10) {
    return {
      field,
      value: dpi,
      expectedType,
      constraints,
      isValid: false,
      error: `Fila ${rowIndex}: DPI demasiado corto (${dpiStr.length} dígitos), mínimo 10`
    };
  }

  if (dpiStr.length > 20) {
    return {
      field,
      value: dpi,
      expectedType,
      constraints,
      isValid: false,
      error: `Fila ${rowIndex}: DPI demasiado largo (${dpiStr.length} dígitos), máximo 20`
    };
  }

  let warning: string | undefined;
  if (dpiStr.length !== 13) {
    warning = `Fila ${rowIndex}: DPI tiene ${dpiStr.length} dígitos (esperado: 13)`;
  }

  return {
    field,
    value: dpi,
    expectedType,
    constraints,
    isValid: true,
    fixedValue: dpiStr,
    warning
  };
}

function validateNombreCompleto(nombreCompleto: any, rowIndex: number): FieldValidation {
  const field = 'nombreCompleto';
  const expectedType = 'VARCHAR(255) + VARCHAR(255)';
  const constraints = ['NOT NULL', 'Se separa en nombre y apellidos'];

  if (!nombreCompleto) {
    return {
      field,
      value: nombreCompleto,
      expectedType,
      constraints,
      isValid: false,
      error: `Fila ${rowIndex}: Nombre completo vacío o nulo`
    };
  }

  const nombreStr = String(nombreCompleto).trim();

  if (nombreStr.length === 0) {
    return {
      field,
      value: nombreCompleto,
      expectedType,
      constraints,
      isValid: false,
      error: `Fila ${rowIndex}: Nombre completo vacío después de trim`
    };
  }

  const { nombre, apellidos } = separarNombre(nombreStr);

  if (!nombre) {
    return {
      field,
      value: nombreCompleto,
      expectedType,
      constraints,
      isValid: false,
      error: `Fila ${rowIndex}: No se pudo extraer nombre de "${nombreStr}"`
    };
  }

  return {
    field,
    value: nombreCompleto,
    expectedType,
    constraints,
    isValid: true,
    fixedValue: { nombre, apellidos }
  };
}

function validateFechaNacimiento(fechaNac: any, rowIndex: number): FieldValidation {
  const field = 'fecha_nacimiento';
  const expectedType = 'VARCHAR(10)';
  const constraints = ['NOT NULL', 'Formato DDMMAAAA', 'Exactamente 8 dígitos'];

  if (fechaNac === null || fechaNac === undefined || fechaNac === '') {
    return {
      field,
      value: fechaNac,
      expectedType,
      constraints,
      isValid: false,
      error: `Fila ${rowIndex}: Fecha de nacimiento vacía o nula`
    };
  }

  try {
    const fechaConvertida = convertirFechaNacimiento(fechaNac);

    // Validar que tenga exactamente 8 dígitos
    if (!/^\d{8}$/.test(fechaConvertida)) {
      return {
        field,
        value: fechaNac,
        expectedType,
        constraints,
        isValid: false,
        error: `Fila ${rowIndex}: Fecha convertida "${fechaConvertida}" no tiene 8 dígitos`
      };
    }

    return {
      field,
      value: fechaNac,
      expectedType,
      constraints,
      isValid: true,
      fixedValue: fechaConvertida
    };
  } catch (error: any) {
    return {
      field,
      value: fechaNac,
      expectedType,
      constraints,
      isValid: false,
      error: `Fila ${rowIndex}: ${error.message}`
    };
  }
}

function validateFechaIngreso(fechaIng: any, rowIndex: number): FieldValidation {
  const field = 'fecha_ingreso';
  const expectedType = 'DATE';
  const constraints = ['OPCIONAL', 'Formato YYYY-MM-DD'];

  // Si está vacío, es válido (campo opcional)
  if (!fechaIng) {
    return {
      field,
      value: fechaIng,
      expectedType,
      constraints,
      isValid: true,
      fixedValue: null
    };
  }

  try {
    const fechaConvertida = convertirFechaIngreso(fechaIng);

    if (!fechaConvertida) {
      return {
        field,
        value: fechaIng,
        expectedType,
        constraints,
        isValid: true,
        fixedValue: null,
        warning: `Fila ${rowIndex}: No se pudo convertir fecha de ingreso "${fechaIng}", se dejará NULL`
      };
    }

    // Validar formato YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaConvertida)) {
      return {
        field,
        value: fechaIng,
        expectedType,
        constraints,
        isValid: false,
        error: `Fila ${rowIndex}: Fecha de ingreso "${fechaConvertida}" no tiene formato YYYY-MM-DD`
      };
    }

    return {
      field,
      value: fechaIng,
      expectedType,
      constraints,
      isValid: true,
      fixedValue: fechaConvertida
    };
  } catch (error: any) {
    return {
      field,
      value: fechaIng,
      expectedType,
      constraints,
      isValid: true,
      fixedValue: null,
      warning: `Fila ${rowIndex}: Error convirtiendo fecha de ingreso "${fechaIng}": ${error.message}, se dejará NULL`
    };
  }
}

function validateNivel(nivel: any, rowIndex: number, nivelesValidos: Set<string>): FieldValidation {
  const field = 'nivel';
  const expectedType = 'VARCHAR(10)';
  const constraints = ['NOT NULL', 'Debe existir en job_levels', 'Códigos válidos: ' + Array.from(nivelesValidos).join(', ')];

  if (!nivel) {
    return {
      field,
      value: nivel,
      expectedType,
      constraints,
      isValid: false,
      error: `Fila ${rowIndex}: Nivel vacío o nulo`
    };
  }

  const nivelStr = String(nivel).trim();
  const nivelMapeado = mapearNivelAcodigo(nivelStr);

  if (!nivelesValidos.has(nivelMapeado)) {
    return {
      field,
      value: nivel,
      expectedType,
      constraints,
      isValid: false,
      error: `Fila ${rowIndex}: Nivel "${nivelStr}" mapeado a "${nivelMapeado}" no existe en job_levels. Válidos: ${Array.from(nivelesValidos).join(', ')}`
    };
  }

  let warning: string | undefined;
  if (nivelStr !== nivelMapeado) {
    warning = `Fila ${rowIndex}: Nivel "${nivelStr}" convertido a "${nivelMapeado}"`;
  }

  return {
    field,
    value: nivel,
    expectedType,
    constraints,
    isValid: true,
    fixedValue: nivelMapeado,
    warning
  };
}

function validateGenero(genero: any, rowIndex: number): FieldValidation {
  const field = 'genero';
  const expectedType = 'VARCHAR(20)';
  const constraints = ['OPCIONAL', 'Valores: masculino, femenino, otro, prefiero_no_decir'];

  // Si está vacío, es válido (campo opcional)
  if (!genero) {
    return {
      field,
      value: genero,
      expectedType,
      constraints,
      isValid: true,
      fixedValue: null
    };
  }

  const generoStr = String(genero).trim();
  const generoNormalizado = normalizarGenero(generoStr);

  if (!generoNormalizado) {
    return {
      field,
      value: genero,
      expectedType,
      constraints,
      isValid: true,
      fixedValue: null,
      warning: `Fila ${rowIndex}: Género "${generoStr}" no reconocido, se dejará NULL`
    };
  }

  return {
    field,
    value: genero,
    expectedType,
    constraints,
    isValid: true,
    fixedValue: generoNormalizado
  };
}

function validateTextField(
  value: any,
  fieldName: string,
  maxLength: number,
  required: boolean,
  rowIndex: number
): FieldValidation {
  const field = fieldName;
  const expectedType = `VARCHAR(${maxLength})`;
  const constraints = [required ? 'NOT NULL' : 'OPCIONAL', `Máximo ${maxLength} caracteres`];

  if (!value) {
    if (required) {
      return {
        field,
        value,
        expectedType,
        constraints,
        isValid: false,
        error: `Fila ${rowIndex}: ${fieldName} vacío o nulo (campo requerido)`
      };
    } else {
      return {
        field,
        value,
        expectedType,
        constraints,
        isValid: true,
        fixedValue: null
      };
    }
  }

  const valueStr = String(value).trim();

  if (valueStr.length === 0 && required) {
    return {
      field,
      value,
      expectedType,
      constraints,
      isValid: false,
      error: `Fila ${rowIndex}: ${fieldName} vacío después de trim (campo requerido)`
    };
  }

  if (valueStr.length > maxLength) {
    return {
      field,
      value,
      expectedType,
      constraints,
      isValid: false,
      error: `Fila ${rowIndex}: ${fieldName} demasiado largo (${valueStr.length} caracteres, máximo ${maxLength})`
    };
  }

  return {
    field,
    value,
    expectedType,
    constraints,
    isValid: true,
    fixedValue: valueStr
  };
}

function logFieldValidation(fieldName: string, validation: FieldValidation) {
  const icon = validation.isValid ? '✅' : '❌';
  const originalValue = validation.value;
  const fixedValue = validation.fixedValue;

  console.log(`${icon} ${fieldName}:`);
  console.log(`   Original: ${JSON.stringify(originalValue)} (${typeof originalValue})`);

  if (fixedValue !== undefined && fixedValue !== originalValue) {
    console.log(`   Corregido: ${JSON.stringify(fixedValue)} (${typeof fixedValue})`);
  }

  if (validation.error) {
    console.error(`   ❌ Error: ${validation.error}`);
  }

  if (validation.warning) {
    console.warn(`   ⚠️  Warning: ${validation.warning}`);
  }
}
