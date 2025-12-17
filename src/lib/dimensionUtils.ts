import { AccionDesarrollo, DimensionDebil } from '@/types/evaluation';

/**
 * Obtiene el color de una dimensión basado en su nombre
 */
export const getDimensionColor = (dimension?: string): string => {
  if (!dimension) return '#6b7280'; // Gris por defecto
  
  const dimLower = dimension.toLowerCase();
  
  // Mapeo de dimensiones comunes
  if (dimLower.includes('productividad') || dimLower.includes('cumplimiento') || dimLower.includes('objetivos')) {
    return '#3b82f6'; // Azul
  }
  if (dimLower.includes('calidad')) {
    return '#10b981'; // Verde
  }
  if (dimLower.includes('competencia') || dimLower.includes('técnica') || dimLower.includes('laboral')) {
    return '#f59e0b'; // Amarillo/Naranja
  }
  if (dimLower.includes('comportamiento') || dimLower.includes('actitud') || dimLower.includes('organizacional')) {
    return '#8b5cf6'; // Púrpura
  }
  if (dimLower.includes('relaciones') || dimLower.includes('equipo') || dimLower.includes('interpersonal')) {
    return '#ec4899'; // Rosa
  }
  if (dimLower.includes('servicio') || dimLower.includes('atención') || dimLower.includes('usuario') || dimLower.includes('orientación')) {
    return '#06b6d4'; // Cyan
  }
  if (dimLower.includes('liderazgo') || dimLower.includes('dirección') || dimLower.includes('coordinación')) {
    return '#6366f1'; // Índigo
  }
  if (dimLower.includes('transparencia') || dimLower.includes('probidad') || dimLower.includes('ética')) {
    return '#14b8a6'; // Teal
  }
  
  return '#6b7280'; // Gris por defecto
};

/**
 * Obtiene la dimensión de una acción (con fallback si no existe)
 * 
 * ESTRATEGIA:
 * 1. Si la acción tiene el campo `dimension` (planes nuevos generados por IA), usarlo directamente
 * 2. Si no, usar fallback inteligente basado en palabras clave y dimensiones débiles
 * 3. El fallback busca coincidencias en:
 *    - Palabras de la dimensión en la descripción de la acción
 *    - Palabras clave comunes asociadas a cada dimensión
 */
export const getDimensionFromAction = (
  accion: Pick<AccionDesarrollo, "descripcion"> & Partial<AccionDesarrollo>,
  dimensionesDebiles?: Array<{ dimension: string; score?: number; accionesEspecificas?: string[] }>
): string | null => {
  // PRIORIDAD 1: Si la acción ya tiene dimensión (planes nuevos), usarla directamente
  if (accion.dimension && accion.dimension.trim()) {
    return accion.dimension.trim();
  }
  
  // PRIORIDAD 2: Fallback inteligente basado en dimensiones débiles y palabras clave
  if (dimensionesDebiles && dimensionesDebiles.length > 0) {
    const descripcionLower = (accion.descripcion || '').toLowerCase();
    
    // Mapa de palabras clave comunes por dimensión (para mejorar matching)
    const palabrasClaveComunes: { [key: string]: string[] } = {
      'productividad': ['productividad', 'cumplimiento', 'objetivos', 'metas', 'poa', 'plan', 'entregas', 'plazos'],
      'calidad': ['calidad', 'servicio', 'atención', 'ciudadano', 'protocolo', 'estándares', 'precisión'],
      'competencia': ['competencia', 'técnica', 'laboral', 'conocimiento', 'habilidad', 'capacitación', 'aprendizaje'],
      'comportamiento': ['comportamiento', 'actitud', 'organizacional', 'puntualidad', 'asistencia', 'disciplina'],
      'relaciones': ['relaciones', 'equipo', 'interpersonal', 'colaborativo', 'trabajo en equipo', 'comunicación'],
      'servicio': ['servicio', 'atención', 'usuario', 'orientación', 'ciudadano', 'requerimientos'],
      'liderazgo': ['liderazgo', 'dirección', 'coordinación', 'supervisión', 'gestión', 'equipo'],
      'transparencia': ['transparencia', 'probidad', 'ética', 'integridad', 'honestidad']
    };
    
    // Buscar la dimensión con mayor coincidencia
    let bestMatch: { dimension: string; score: number } | null = null;
    
    dimensionesDebiles.forEach((dim) => {
      const dimLower = dim.dimension.toLowerCase();
      const palabrasDimension = dimLower.split(/\s+/);
      
      let score = 0;
      
      // Estrategia 1: Coincidencias directas de palabras de la dimensión
      palabrasDimension.forEach((palabra) => {
        if (palabra.length > 3 && descripcionLower.includes(palabra)) {
          score += palabra.length * 2; // Mayor peso para palabras de la dimensión
        }
      });
      
      // Estrategia 2: Coincidencias con palabras clave comunes
      Object.keys(palabrasClaveComunes).forEach((key) => {
        if (dimLower.includes(key)) {
          palabrasClaveComunes[key].forEach((palabraClave) => {
            if (descripcionLower.includes(palabraClave)) {
              score += palabraClave.length * 1.5; // Peso adicional para palabras clave
            }
          });
        }
      });
      
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { dimension: dim.dimension, score };
      }
    });
    
    // Umbral reducido de 5 a 3 para hacer el matching más permisivo
    // Esto permite detectar dimensiones incluso con coincidencias parciales
    if (bestMatch && bestMatch.score > 3) {
      return bestMatch.dimension;
    }
  }
  
  return null;
};

/**
 * Mapa de dimensiones con sus colores y nombres
 */
export const DIMENSION_LEGEND = [
  { name: 'Productividad y Cumplimiento', color: '#3b82f6', keywords: ['productividad', 'cumplimiento', 'objetivos'] },
  { name: 'Calidad del Trabajo', color: '#10b981', keywords: ['calidad'] },
  { name: 'Competencias Laborales', color: '#f59e0b', keywords: ['competencia', 'técnica', 'laboral'] },
  { name: 'Comportamiento Organizacional', color: '#8b5cf6', keywords: ['comportamiento', 'actitud', 'organizacional'] },
  { name: 'Relaciones Interpersonales', color: '#ec4899', keywords: ['relaciones', 'equipo', 'interpersonal'] },
  { name: 'Orientación al Servicio', color: '#06b6d4', keywords: ['servicio', 'atención', 'usuario', 'orientación'] },
  { name: 'Liderazgo y Coordinación', color: '#6366f1', keywords: ['liderazgo', 'dirección', 'coordinación'] },
  { name: 'Transparencia y Probidad', color: '#14b8a6', keywords: ['transparencia', 'probidad', 'ética'] },
];

/**
 * Obtiene las dimensiones únicas que están siendo usadas en las acciones
 */
export const getUsedDimensions = (
  acciones: any[],
  dimensionesDebiles?: any[]
): Array<{ name: string; color: string }> => {
  const usedDimensionsSet = new Set<string>();
  
  acciones.forEach((accion) => {
    const dimension = getDimensionFromAction(accion, dimensionesDebiles);
    if (dimension) {
      usedDimensionsSet.add(dimension);
    }
  });
  
  // Mapear las dimensiones usadas a sus colores y nombres de la leyenda
  const usedDimensions = Array.from(usedDimensionsSet)
    .map((dimName) => {
      const dimLower = dimName.toLowerCase();
      const legendItem = DIMENSION_LEGEND.find((item) =>
        item.keywords.some((keyword) => dimLower.includes(keyword))
      );
      
      if (legendItem) {
        return { name: dimName, color: legendItem.color };
      }
      
      // Si no encuentra coincidencia exacta, usar el color por defecto
      return { name: dimName, color: getDimensionColor(dimName) };
    })
    .sort((a, b) => a.name.localeCompare(b.name)); // Ordenar alfabéticamente
  
  return usedDimensions;
};

/**
 * Formatea una fecha de formato ISO (YYYY-MM-DD) a formato DD/MM/YYYY
 * También maneja rangos de fechas (YYYY-MM al YYYY-MM)
 */
export const formatDateForPDF = (fecha: string): string => {
  if (!fecha || !fecha.trim()) return fecha;
  
  const fechaTrimmed = fecha.trim();
  
  // Si es un rango de fechas (ej: "2026-01 al 2026-02")
  if (fechaTrimmed.includes(' al ')) {
    const partes = fechaTrimmed.split(' al ');
    if (partes.length === 2) {
      const fechaInicio = formatSingleDate(partes[0].trim());
      const fechaFin = formatSingleDate(partes[1].trim());
      return `${fechaInicio} al ${fechaFin}`;
    }
  }
  
  // Si es una fecha simple
  return formatSingleDate(fechaTrimmed);
};

/**
 * Formatea una fecha individual de YYYY-MM-DD a DD/MM/YYYY
 */
const formatSingleDate = (fecha: string): string => {
  // Formato ISO: YYYY-MM-DD
  const isoRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = fecha.match(isoRegex);
  
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  
  // Si no coincide con el formato esperado, retornar la fecha original
  return fecha;
};

