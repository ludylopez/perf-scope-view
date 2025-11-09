// Función auxiliar para parsear archivos CSV/Excel y mapear a formato de usuario
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ImportedUser {
  dpi: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento: string; // Formato DDMMAAAA
  fechaIngreso: string; // Formato YYYY-MM-DD para fecha_ingreso
  nivel: string;
  cargo: string;
  area: string;
  tipoPuesto?: 'administrativo' | 'operativo';
  genero?: 'masculino' | 'femenino' | 'otro' | 'prefiero_no_decir';
}

/**
 * Normaliza el género desde diferentes formatos posibles en el CSV
 */
export const normalizarGenero = (genero: string): 'masculino' | 'femenino' | 'otro' | 'prefiero_no_decir' | null => {
  const generoLower = genero.trim().toLowerCase();
  
  if (generoLower.includes('masc') || generoLower === 'm' || generoLower === 'masculino') {
    return 'masculino';
  }
  if (generoLower.includes('femen') || generoLower === 'f' || generoLower === 'femenino') {
    return 'femenino';
  }
  if (generoLower.includes('otro') || generoLower === 'o') {
    return 'otro';
  }
  if (generoLower.includes('prefiero') || generoLower.includes('no') || generoLower === 'n/a') {
    return 'prefiero_no_decir';
  }
  
  return null;
};

/**
 * Infiere el tipo de puesto desde el código de nivel
 * NOTA: Esta función se mantiene por compatibilidad pero ya no es necesaria
 * ya que el trigger SQL sync_tipo_puesto_from_job_level lo hace automáticamente
 * @deprecated Usar job_levels.category en su lugar
 */
export const inferTipoPuesto = (nivel: string): 'administrativo' | 'operativo' | null => {
  const nivelUpper = nivel.toUpperCase().trim();
  // Niveles administrativos
  if (['A1', 'A2', 'A3', 'A4', 'S2', 'D1', 'D2', 'E1', 'E2'].includes(nivelUpper)) {
    return 'administrativo';
  }
  // Niveles operativos
  if (['OTE', 'O1', 'O2', 'OS'].includes(nivelUpper)) {
    return 'operativo';
  }
  return null;
};

/**
 * Convierte fecha de varios formatos a DDMMAAAA para fecha_nacimiento
 * @throws Error si la fecha no puede ser convertida o es inválida
 */
export const convertirFechaNacimiento = (fecha: string | number | Date): string => {
  if (fecha === null || fecha === undefined || fecha === '') {
    throw new Error('Fecha vacía o nula');
  }

  try {
    let date: Date | null = null;

    if (typeof fecha === 'number') {
      // Excel serial date
      const parsedDate = XLSX.SSF.parse_date_code(fecha);
      if (!parsedDate) {
        throw new Error(`No se pudo parsear fecha Excel: ${fecha}`);
      }
      date = new Date(parsedDate.y, parsedDate.m - 1, parsedDate.d);
    } else if (typeof fecha === 'string') {
      const fechaStr = fecha.trim();

      if (!fechaStr) {
        throw new Error('Fecha vacía después de trim');
      }

      // Si ya está en formato DDMMAAAA, validar y retornar
      if (/^\d{8}$/.test(fechaStr)) {
        const day = parseInt(fechaStr.substring(0, 2));
        const month = parseInt(fechaStr.substring(2, 4));
        const year = parseInt(fechaStr.substring(4, 8));

        // Validar que sea una fecha válida
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
          return fechaStr;
        } else {
          throw new Error(`Fecha DDMMAAAA inválida: ${fechaStr} (día: ${day}, mes: ${month}, año: ${year})`);
        }
      }

      // Intentar parsear manualmente con split
      const parts = fechaStr.split(/[\/\-\.\s]+/);

      if (parts.length === 3) {
        const [part1, part2, part3] = parts;

        // Limpiar partes (remover espacios)
        const p1 = part1.trim();
        const p2 = part2.trim();
        const p3 = part3.trim();

        let day: number;
        let month: number;
        let year: number;

        // Detectar formato basándose en la longitud de las partes
        if (p3.length === 4) {
          // Formato DD/MM/YYYY o D/M/YYYY
          day = parseInt(p1, 10);
          month = parseInt(p2, 10);
          year = parseInt(p3, 10);
        } else if (p1.length === 4) {
          // Formato YYYY-MM-DD o YYYY/MM/DD
          year = parseInt(p1, 10);
          month = parseInt(p2, 10);
          day = parseInt(p3, 10);
        } else {
          throw new Error(`Formato de fecha no reconocido: ${fechaStr}`);
        }

        // Validar rangos
        if (isNaN(day) || isNaN(month) || isNaN(year)) {
          throw new Error(`Componentes de fecha no numéricos: día=${p1}, mes=${p2}, año=${p3}`);
        }

        if (day < 1 || day > 31) {
          throw new Error(`Día fuera de rango (1-31): ${day}`);
        }

        if (month < 1 || month > 12) {
          throw new Error(`Mes fuera de rango (1-12): ${month}`);
        }

        if (year < 1900 || year > 2100) {
          throw new Error(`Año fuera de rango (1900-2100): ${year}`);
        }

        // Crear fecha y validar que sea válida (ej: 31/02 no es válido)
        date = new Date(year, month - 1, day);

        // Verificar que la fecha creada corresponde a los valores ingresados
        // (new Date puede ajustar fechas inválidas, ej: 31/02 → 03/03)
        if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
          throw new Error(`Fecha inválida: ${day}/${month}/${year} (el día ${day} no existe en el mes ${month})`);
        }
      } else {
        throw new Error(`Formato de fecha no soportado (se esperaban 3 partes separadas por / - o .): ${fechaStr}`);
      }
    } else if (fecha instanceof Date) {
      date = fecha;
    } else {
      throw new Error(`Tipo de fecha no soportado: ${typeof fecha}`);
    }

    // Validar que date esté asignado
    if (!date) {
      throw new Error('No se pudo crear objeto Date');
    }

    // Validar que la fecha sea válida
    if (isNaN(date.getTime())) {
      throw new Error('Fecha inválida (NaN)');
    }

    // Formatear a DDMMAAAA
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());

    const resultado = `${day}${month}${year}`;

    // Validación final: debe ser exactamente 8 dígitos
    if (!/^\d{8}$/.test(resultado)) {
      throw new Error(`Resultado no tiene 8 dígitos: ${resultado}`);
    }

    return resultado;
  } catch (error: any) {
    const errorMsg = `Error convirtiendo fecha "${fecha}": ${error.message || error}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
};

/**
 * Convierte fecha a formato YYYY-MM-DD para fecha_ingreso
 */
export const convertirFechaIngreso = (fecha: string | number | Date): string | null => {
  try {
    if (!fecha) return null;

    let date: Date;

    if (typeof fecha === 'number') {
      // Excel serial date - parse_date_code retorna {y, m, d}, no un Date
      const parsedDate = XLSX.SSF.parse_date_code(fecha);
      if (!parsedDate) {
        console.error('Error convirtiendo fecha de ingreso:', fecha);
        return null;
      }
      date = new Date(parsedDate.y, parsedDate.m - 1, parsedDate.d);
    } else if (typeof fecha === 'string') {
      const fechaStr = fecha.trim();

      // Intentar parsear manualmente con split
      const parts = fechaStr.split(/[\/\-]/);
      if (parts.length === 3) {
        const [part1, part2, part3] = parts;

        // Detectar formato basándose en la longitud de las partes
        if (part3.length === 4) {
          // Formato DD/MM/YYYY o D/M/YYYY
          const day = parseInt(part1);
          const month = parseInt(part2);
          const year = parseInt(part3);

          if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
            date = new Date(year, month - 1, day);
          } else {
            throw new Error('Fecha fuera de rango');
          }
        } else if (part1.length === 4) {
          // Formato YYYY-MM-DD o YYYY/MM/DD
          const year = parseInt(part1);
          const month = parseInt(part2);
          const day = parseInt(part3);

          if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
            date = new Date(year, month - 1, day);
          } else {
            throw new Error('Fecha fuera de rango');
          }
        } else {
          // Intentar con new Date() como fallback
          date = new Date(fechaStr);
        }
      } else {
        // Intentar con new Date() como fallback
        date = new Date(fechaStr);
      }
    } else {
      date = fecha;
    }

    if (isNaN(date.getTime())) {
      return null;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error convirtiendo fecha de ingreso:', fecha, error);
    return null;
  }
};

/**
 * Separa nombre completo en nombre y apellidos
 */
export const separarNombre = (nombreCompleto: string): { nombre: string; apellidos: string } => {
  const partes = nombreCompleto.trim().split(/\s+/);
  if (partes.length === 1) {
    return { nombre: partes[0], apellidos: '' };
  }
  if (partes.length === 2) {
    return { nombre: partes[0], apellidos: partes[1] };
  }
  // Si tiene más de 2 partes, asumimos que el primer nombre es el nombre y el resto son apellidos
  return {
    nombre: partes[0],
    apellidos: partes.slice(1).join(' ')
  };
};

/**
 * Parsea archivo CSV/Excel y retorna usuarios importados
 */
export const parsearArchivoUsuarios = async (file: File): Promise<{ usuarios: ImportedUser[]; errores: string[] }> => {
  const errores: string[] = [];
  const usuarios: ImportedUser[] = [];
  
  try {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'csv') {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Detectar header
      const headerLine = lines[0];
      const headerIndex = headerLine.toLowerCase().includes('dpi') || headerLine.toLowerCase().includes('nombre') ? 0 : -1;
      
      if (headerIndex === -1) {
        throw new Error('No se encontró encabezado válido en el archivo CSV');
      }
      
      // Parsear header
      const headers = headerLine.split('\t').map(h => h.trim());
      if (headers.length === 0) {
        // Intentar con coma
        const headersComa = headerLine.split(',').map(h => h.trim());
        if (headersComa.length > 1) {
          headers.push(...headersComa);
        }
      }
      
      // Mapear índices de columnas
      const columnMap: Record<string, number> = {};
      headers.forEach((h, i) => {
        const headerLower = h.toLowerCase();
        if (headerLower.includes('dpi')) columnMap.dpi = i;
        if (headerLower.includes('nombre') && !headerLower.includes('completo')) columnMap.nombre = i;
        if (headerLower.includes('fecha') && headerLower.includes('nacimiento')) columnMap.fechaNacimiento = i;
        if (headerLower.includes('fecha') && (headerLower.includes('inicio') || headerLower.includes('laboral'))) columnMap.fechaIngreso = i;
        if (headerLower.includes('nivel') || headerLower.includes('puesto')) columnMap.nivel = i;
        if (headerLower.includes('puesto') && !headerLower.includes('nivel')) columnMap.cargo = i;
        if (headerLower.includes('departamento') || headerLower.includes('dependencia')) columnMap.area = i;
        if (headerLower.includes('direccion') || headerLower.includes('unidad')) columnMap.direccion = i;
        if (headerLower.includes('sexo') || headerLower.includes('género') || headerLower.includes('genero')) columnMap.genero = i;
      });
      
      // Procesar líneas de datos
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const parts = line.includes('\t') ? line.split('\t') : line.split(',');
        const partsTrimmed = parts.map(p => p.trim());
        
        try {
          const dpi = partsTrimmed[columnMap.dpi]?.toString().trim();
          const nombreCompleto = partsTrimmed[columnMap.nombre]?.trim() || '';
          const fechaNac = partsTrimmed[columnMap.fechaNacimiento]?.trim() || '';
          const fechaIng = partsTrimmed[columnMap.fechaIngreso]?.trim() || '';
          const nivel = partsTrimmed[columnMap.nivel]?.trim().toUpperCase() || '';
          const cargo = partsTrimmed[columnMap.cargo]?.trim() || '';
          const area = partsTrimmed[columnMap.area]?.trim() || partsTrimmed[columnMap.direccion]?.trim() || '';
          const generoRaw = partsTrimmed[columnMap.genero]?.trim() || '';
          
          if (!dpi || dpi.length < 10) {
            errores.push(`Línea ${i + 1}: DPI inválido o faltante`);
            continue;
          }
          
          if (!nombreCompleto) {
            errores.push(`Línea ${i + 1}: Nombre faltante`);
            continue;
          }
          
          if (!fechaNac) {
            errores.push(`Línea ${i + 1}: Fecha de nacimiento faltante`);
            continue;
          }
          
          const { nombre, apellidos } = separarNombre(nombreCompleto);

          // Convertir fechas - estas funciones ahora lanzan excepciones en lugar de retornar vacío
          let fechaNacFormato: string;
          try {
            fechaNacFormato = convertirFechaNacimiento(fechaNac);
          } catch (error: any) {
            errores.push(`Línea ${i + 1}: ${error.message}`);
            continue;
          }

          const fechaIngFormato = convertirFechaIngreso(fechaIng);
          // NOTA: tipo_puesto se sincronizará automáticamente desde job_levels via trigger SQL
          // Se mantiene inferTipoPuesto como fallback para compatibilidad
          const tipoPuesto = inferTipoPuesto(nivel);
          const genero = generoRaw ? normalizarGenero(generoRaw) : undefined;
          
          usuarios.push({
            dpi,
            nombre,
            apellidos,
            fechaNacimiento: fechaNacFormato,
            fechaIngreso: fechaIngFormato || '',
            nivel,
            cargo,
            area,
            tipoPuesto: tipoPuesto || undefined,
            genero: genero || undefined,
          });
        } catch (error: any) {
          errores.push(`Línea ${i + 1}: ${error.message || 'Error al procesar'}`);
        }
      }
    } else if (['xlsx', 'xls'].includes(extension || '')) {
      // Procesar Excel
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
      
      if (jsonData.length === 0) {
        throw new Error('El archivo Excel está vacío');
      }
      
      // Buscar header
      let headerRowIndex = 0;
      const headerRow = jsonData[0] as string[];
      const headerLower = headerRow.map((h: any) => String(h).toLowerCase());
      
      // Mapear índices de columnas
      const columnMap: Record<string, number> = {};
      headerLower.forEach((h: string, i: number) => {
        if (h.includes('dpi')) columnMap.dpi = i;
        if (h.includes('nombre') && !h.includes('completo')) columnMap.nombre = i;
        if (h.includes('fecha') && h.includes('nacimiento')) columnMap.fechaNacimiento = i;
        if (h.includes('fecha') && (h.includes('inicio') || h.includes('laboral'))) columnMap.fechaIngreso = i;
        if (h.includes('nivel') || (h.includes('puesto') && h.includes('nivel'))) columnMap.nivel = i;
        if (h.includes('puesto') && !h.includes('nivel')) columnMap.cargo = i;
        if (h.includes('departamento') || h.includes('dependencia')) columnMap.area = i;
        if (h.includes('direccion') || h.includes('unidad')) columnMap.direccion = i;
        if (h.includes('sexo') || h.includes('género') || h.includes('genero')) columnMap.genero = i;
      });
      
      // Procesar filas de datos
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (!row || row.length === 0) continue;
        
        try {
          const dpi = String(row[columnMap.dpi] || '').trim();
          const nombreCompleto = String(row[columnMap.nombre] || '').trim();
          const fechaNac = row[columnMap.fechaNacimiento];
          const fechaIng = row[columnMap.fechaIngreso];
          const nivel = String(row[columnMap.nivel] || '').trim().toUpperCase();
          const cargo = String(row[columnMap.cargo] || '').trim();
          const area = String(row[columnMap.area] || row[columnMap.direccion] || '').trim();
          const generoRaw = String(row[columnMap.genero] || '').trim();
          
          if (!dpi || dpi.length < 10) {
            errores.push(`Fila ${i + 1}: DPI inválido o faltante`);
            continue;
          }
          
          if (!nombreCompleto) {
            errores.push(`Fila ${i + 1}: Nombre faltante`);
            continue;
          }
          
          if (!fechaNac) {
            errores.push(`Fila ${i + 1}: Fecha de nacimiento faltante`);
            continue;
          }
          
          const { nombre, apellidos } = separarNombre(nombreCompleto);

          // Convertir fechas - estas funciones ahora lanzan excepciones en lugar de retornar vacío
          let fechaNacFormato: string;
          try {
            fechaNacFormato = convertirFechaNacimiento(fechaNac);
          } catch (error: any) {
            errores.push(`Fila ${i + 1}: ${error.message}`);
            continue;
          }

          const fechaIngFormato = convertirFechaIngreso(fechaIng);
          // NOTA: tipo_puesto se sincronizará automáticamente desde job_levels via trigger SQL
          // Se mantiene inferTipoPuesto como fallback para compatibilidad
          const tipoPuesto = inferTipoPuesto(nivel);
          const genero = generoRaw ? normalizarGenero(generoRaw) : undefined;
          
          usuarios.push({
            dpi,
            nombre,
            apellidos,
            fechaNacimiento: fechaNacFormato,
            fechaIngreso: fechaIngFormato || '',
            nivel,
            cargo,
            area,
            tipoPuesto: tipoPuesto || undefined,
            genero: genero || undefined,
          });
        } catch (error: any) {
          errores.push(`Fila ${i + 1}: ${error.message || 'Error al procesar'}`);
        }
      }
    } else {
      throw new Error('Formato de archivo no soportado. Use CSV o Excel (.xlsx, .xls)');
    }
    
    return { usuarios, errores };
  } catch (error: any) {
    errores.push(`Error al procesar archivo: ${error.message}`);
    return { usuarios, errores };
  }
};

/**
 * Importa usuarios masivamente a Supabase
 */
export const importarUsuarios = async (usuarios: ImportedUser[]): Promise<{ exitosos: number; errores: Array<{ usuario: ImportedUser; error: string }> }> => {
  const errores: Array<{ usuario: ImportedUser; error: string }> = [];
  let exitosos = 0;
  
  // Procesar en lotes de 50 para evitar sobrecarga
  const BATCH_SIZE = 50;
  for (let i = 0; i < usuarios.length; i += BATCH_SIZE) {
    const batch = usuarios.slice(i, i + BATCH_SIZE);
    
    const usuariosParaInsertar = batch.map(u => ({
      dpi: u.dpi,
      nombre: u.nombre,
      apellidos: u.apellidos,
      fecha_nacimiento: u.fechaNacimiento,
      fecha_ingreso: u.fechaIngreso || null,
      nivel: u.nivel,
      cargo: u.cargo,
      area: u.area,
      tipo_puesto: u.tipoPuesto || null,
      genero: u.genero || null,
      rol: 'colaborador' as const,
      estado: 'activo' as const,
      primer_ingreso: true,
    }));
    
    try {
      const { error } = await supabase
        .from('users')
        .upsert(usuariosParaInsertar, {
          onConflict: 'dpi',
          ignoreDuplicates: false,
        });
      
      if (error) {
        batch.forEach(u => {
          errores.push({ usuario: u, error: error.message });
        });
      } else {
        exitosos += batch.length;
      }
    } catch (error: any) {
      batch.forEach(u => {
        errores.push({ usuario: u, error: error.message || 'Error desconocido' });
      });
    }
  }
  
  return { exitosos, errores };
};

