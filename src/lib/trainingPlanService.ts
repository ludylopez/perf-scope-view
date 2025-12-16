/**
 * Servicio para generar Plan de Capacitación Consolidado por Unidad
 * TODO EN TYPESCRIPT - Sin migraciones SQL
 */

import { supabase } from "@/integrations/supabase/client";
import { PlanCapacitacionUnidad, BrechaDimension, TopicoCapacitacion, Distribucion9Box, PlanCapacitacionEstructurado } from "@/types/trainingPlan";
import { getEquipoCascadaCompleto } from "./teamAnalysis";
import type { EquipoCascadaCompleto } from "@/types/teamAnalysis";

export interface TrainingPlanError {
  message: string;
  details?: string;
  code?: string;
}

/**
 * Normaliza un tópico (por ahora sin tabla de sinónimos, solo lowercase y trim)
 */
function normalizarTopico(topico: string): string {
  return topico.toLowerCase().trim();
}

/**
 * Calcula similitud entre dos tópicos usando palabras clave comunes
 */
function calcularSimilitud(topico1: string, topico2: string): number {
  const palabras1 = new Set(topico1.toLowerCase().split(/\s+/));
  const palabras2 = new Set(topico2.toLowerCase().split(/\s+/));
  
  const interseccion = new Set([...palabras1].filter(p => palabras2.has(p)));
  const union = new Set([...palabras1, ...palabras2]);
  
  if (union.size === 0) return 0;
  return interseccion.size / union.size;
}

/**
 * Agrupa tópicos similares por temática
 */
function agruparTopicosPorTematica(capacitaciones: TopicoCapacitacion[]): Array<{
  tematica: string;
  topicos: TopicoCapacitacion[];
  prioridadMaxima: 'urgente' | 'alta' | 'media' | 'baja';
  categoria: string;
  dimensiones: Set<string>;
  frecuenciaTotal: number;
}> {
  const grupos: Array<{
    tematica: string;
    topicos: TopicoCapacitacion[];
    prioridadMaxima: 'urgente' | 'alta' | 'media' | 'baja';
    categoria: string;
    dimensiones: Set<string>;
    frecuenciaTotal: number;
  }> = [];

  const umbralSimilitud = 0.3; // 30% de similitud para agrupar

  for (const cap of capacitaciones) {
    let asignado = false;

    // Buscar grupo existente con similitud
    for (const grupo of grupos) {
      // Agrupar por categoría primero
      if (grupo.categoria === cap.categoria) {
        // Verificar similitud con algún tópico del grupo
        const tieneSimilitud = grupo.topicos.some(t => 
          calcularSimilitud(t.topico, cap.topico) >= umbralSimilitud
        );

        if (tieneSimilitud) {
          grupo.topicos.push(cap);
          grupo.frecuenciaTotal += cap.frecuenciaAbsoluta;
          cap.dimensionesRelacionadas.forEach(d => grupo.dimensiones.add(d));
          
          // Actualizar prioridad máxima
          const ordenPrioridad = { urgente: 1, alta: 2, media: 3, baja: 4 };
          if (ordenPrioridad[cap.prioridad] < ordenPrioridad[grupo.prioridadMaxima]) {
            grupo.prioridadMaxima = cap.prioridad;
          }
          
          asignado = true;
          break;
        }
      }
    }

    // Si no se asignó, crear nuevo grupo
    if (!asignado) {
      const nombreTematica = cap.categoria === 'Liderazgo' ? 'Liderazgo y Gestión de Equipos' :
                             cap.categoria === 'Soft Skills' ? 'Habilidades Blandas y Comunicación' :
                             cap.categoria === 'Técnica' ? 'Competencias Técnicas' :
                             cap.categoria === 'Herramientas' ? 'Herramientas y Tecnología' :
                             cap.categoria === 'Normativa' ? 'Normativa y Procedimientos' :
                             'Desarrollo Profesional';

      grupos.push({
        tematica: nombreTematica,
        topicos: [cap],
        prioridadMaxima: cap.prioridad,
        categoria: cap.categoria,
        dimensiones: new Set(cap.dimensionesRelacionadas),
        frecuenciaTotal: cap.frecuenciaAbsoluta,
      });
    }
  }

  // Ordenar grupos por prioridad y frecuencia
  grupos.sort((a, b) => {
    const ordenPrioridad = { urgente: 1, alta: 2, media: 3, baja: 4 };
    const diffPrioridad = ordenPrioridad[a.prioridadMaxima] - ordenPrioridad[b.prioridadMaxima];
    if (diffPrioridad !== 0) return diffPrioridad;
    return b.frecuenciaTotal - a.frecuenciaTotal;
  });

  return grupos;
}

/**
 * Determina si un tópico es una solicitud de recurso físico (no capacitación)
 */
function esRecursoFisico(topico: string): boolean {
  if (!topico || typeof topico !== 'string') return false;
  
  const topicoLower = topico.toLowerCase().trim();
  
  // Palabras clave que indican solicitudes de recursos físicos (no capacitaciones)
  const palabrasClaveRecursos = [
    // Vehículos y transporte
    'vehículo', 'vehiculo', 'auto', 'carro', 'moto', 'transporte', '4x4',
    // Equipos y herramientas físicas
    'equipo de computo', 'equipo de cómputo', 'computadora', 'laptop', 'impresora', 'scanner',
    'proyector', 'cañonera', 'canonera', 'pantalla', 'monitor',
    'bocinas', 'parlantes', 'micrófono', 'microfono', 'amplificador', 'consola de sonido', 'consola',
    'extintor', 'triángulos', 'triangulos', 'espuma', 'yomper', 'yumper', 'batería', 'bateria',
    'bomba de riego', 'sopladora', 'fajas para cortar', 'fajas para cortar grama', 'cinta métrica', 'cinta metrica',
    'herramientas de limpieza', 'herramientas de jardinería', 'herramientas de jardineria',
    'equipo contra incendios', 'mangueras', 'equipo personal de respiración', 'equipo personal de aparatos de respiración',
    'arac', 'aire comprimido', 'cuerdas', 'mosquetones', 'nudos', 'equipo de seguridad de alturas',
    'herramientas de trabajo forzado', 'herramientas de trabajo', 'herramientas en buenas condiciones',
    // Software y herramientas tecnológicas (no capacitaciones, son licencias/herramientas)
    'antivirus', 'gestores de contraseñas', 'vpn', 'software de gestión', 'ninjaone', 'datadog',
    'soluciones de privacidad', 'herramientas de supervisión',
    // Infraestructura y espacios
    'espacio físico', 'espacio fisico', 'instalaciones', 'mobiliario', 'mesas de trabajo',
    'bodega', 'oficina', 'área de trabajo', 'area de trabajo', 'ubicación', 'ubicacion',
    'ampliación del espacio', 'ampliacion del espacio', 'mejores espacios', 'mejores espacios para practicar',
    'área más grande', 'area mas grande', 'área adecuada', 'area adecuada',
    // Recursos humanos (no capacitación)
    'más personal', 'mas personal', 'recurso humano', 'personal adicional', 'recurso humano y logístico',
    // Materiales y suministros
    'materiales didácticos', 'materiales didacticos', 'documentos', 'manuales', 'políticas', 'politicas',
    'alcohol', 'gasas', 'vendas', 'microopore', 'abastecernos de recursos',
    // Otros recursos físicos
    'mejor equipo', 'equipo nuevo', 'equipo sofisticado', 'equipo adecuado',
    'mantenimiento constante', 'equipo y ubicación', 'equipo y ubicacion', 'instalaciones dignas',
    'mejoras de equipo', 'mejoras en herramientas', 'herramientas de seguridad',
    'mejor equipo para desempeñar', 'equipo para mejor desempeño',
    // Frases comunes que indican solicitudes de recursos
    'un vehículo', 'un área', 'un espacio', 'un proyector', 'un equipo',
    'mejor equipo', 'equipo nuevo', 'equipo adecuado', 'equipo sofisticado',
    'más herramientas', 'mas herramientas', 'herramientas nuevas',
    'mejores espacios', 'mejor ubicación', 'mejor ubicacion',
    // Frases específicas de tu lista
    'un espacio acorde a la oficina', 'una mejor fluidez de comunicación',
    'mejoras de equipo, para atender con mayor rapidez',
    'ampliación del espacio físico, mobiliario y recurso humano',
    'documentos con procesos claros manuales politicas',
  ];
  
  // Verificar si contiene palabras clave de recursos físicos
  for (const palabra of palabrasClaveRecursos) {
    if (topicoLower.includes(palabra)) {
      return true;
    }
  }
  
  // Patrones que indican solicitudes de recursos
  const patronesRecursos = [
    /^un\s+(vehículo|vehiculo|auto|equipo|área|area|espacio|proyector|equipo|proyector|cañonera|canonera)/i,
    /^(mejor|nuevo|nueva|adecuado|adecuada|sofisticado|sofisticada|mejor)\s+(equipo|herramienta|vehículo|vehiculo|espacio|área|area|computo|computo|computadora)/i,
    /^(más|mas)\s+(personal|herramientas|equipo|recursos|herramientas de trabajo)/i,
    /(vehículo|vehiculo|equipo|herramienta|espacio|área|area|instalación|instalacion)\s+(nuevo|nueva|adecuado|adecuada|mejor|sofisticado|sofisticada|4x4)/i,
    /(para|de)\s+(trabajo|uso|mantenimiento|limpieza|jardinería|jardineria|atender|desempeñar)/i,
    /(extintor|triángulos|triangulos|espuma|yomper|yumper|batería|bateria|bomba|sopladora|fajas|mangueras)/i,
    /(bocinas|parlantes|micrófono|microfono|amplificador|consola|par de bocinas)/i,
    /(mobiliario|mesas|bodega|oficina|instalaciones|espacio físico|espacio fisico|ampliación|ampliacion)/i,
    /(abastecernos|abastecer|suministros|materiales didácticos|materiales didacticos)/i,
    /(antivirus|vpn|software de gestión|herramientas de supervisión|gestores de contraseñas)/i,
    /(mejoras de equipo|mejoras en herramientas|mejor equipo para|equipo para mejor)/i,
  ];
  
  for (const patron of patronesRecursos) {
    if (patron.test(topicoLower)) {
      return true;
    }
  }
  
  // Excluir tópicos muy cortos o genéricos que no son capacitaciones
  if (topicoLower.length < 10 && (
    topicoLower.includes('equipo') || 
    topicoLower.includes('herramienta') || 
    topicoLower.includes('vehículo') || 
    topicoLower.includes('vehiculo') ||
    topicoLower === 'nada' ||
    topicoLower === 'de momento no'
  )) {
    return true;
  }
  
  return false;
}

/**
 * Prepara los datos para enviar a la IA - FILTRANDO tópicos que no son capacitaciones reales
 * La IA hará el agrupamiento inteligente
 */
function prepararDatosParaIA(plan: PlanCapacitacionUnidad): {
  todosLosTopicos: Array<{
    topico: string;
    categoria: string;
    prioridad: string;
    frecuenciaAbsoluta: number;
    frecuenciaPorcentual: number;
    dimensionesRelacionadas: string[];
    fuentes: string[];
    scorePrioridad: number;
    niveles?: Array<{ nivel: string; cantidad: number; cargos: string[] }>;
    categoriasPuesto?: string[];
    colaboradoresIds?: string[];
    colaboradoresInfo?: Array<{ 
      id: string; 
      nivel: string; 
      cargo: string; 
      categoriaPuesto: string;
      nombre?: string;
      area?: string;
      departamento?: string;
    }>;
  }>;
  estadisticas: {
    totalTopicos: number;
    topicosUrgentes: number;
    topicosAltos: number;
    categorias: string[];
    dimensionesUnicas: string[];
    nivelesDisponibles?: Array<{ code: string; name: string; category: string }>;
  };
} {
  // Filtrar y mapear tópicos - EXCLUYENDO solicitudes de recursos físicos (no capacitaciones)
  const todosLosTopicosRaw = (Array.isArray(plan.capacitaciones) ? plan.capacitaciones : [])
    .map((cap: any) => ({
      topico: cap.topico || '',
      categoria: cap.categoria || '',
      prioridad: cap.prioridad || 'media',
      frecuenciaAbsoluta: cap.frecuenciaAbsoluta || 0,
      frecuenciaPorcentual: cap.frecuenciaPorcentual || 0,
      dimensionesRelacionadas: Array.isArray(cap.dimensionesRelacionadas) ? cap.dimensionesRelacionadas : [],
      fuentes: Array.isArray(cap.fuentes) ? cap.fuentes : [],
      scorePrioridad: cap.scorePrioridad || 0,
      niveles: Array.isArray(cap.niveles) ? cap.niveles : [],
      categoriasPuesto: Array.isArray(cap.categoriasPuesto) ? cap.categoriasPuesto : [],
      colaboradoresIds: Array.isArray(cap.colaboradoresIds) ? cap.colaboradoresIds : [],
      colaboradoresInfo: Array.isArray(cap.colaboradoresInfo) ? cap.colaboradoresInfo : [],
    }));
  
  // Filtrar tópicos que son solicitudes de recursos físicos (no capacitaciones)
  const todosLosTopicos = todosLosTopicosRaw.filter(t => {
    const esRecurso = esRecursoFisico(t.topico);
    if (esRecurso) {
      console.log(`🚫 FILTRADO (no es capacitación): "${t.topico}" - Es solicitud de recurso físico`);
    }
    return !esRecurso;
  });
  
  const topicosFiltrados = todosLosTopicosRaw.length - todosLosTopicos.length;
  if (topicosFiltrados > 0) {
    console.log(`📊 FILTRADO: ${topicosFiltrados} tópicos excluidos (solicitudes de recursos físicos, no capacitaciones)`);
    console.log(`📊 Tópicos válidos para capacitación: ${todosLosTopicos.length} de ${todosLosTopicosRaw.length}`);
  }

  // Solo estadísticas básicas para contexto
  const topicosUrgentes = todosLosTopicos.filter(t => t.prioridad === 'urgente').length;
  const topicosAltos = todosLosTopicos.filter(t => t.prioridad === 'alta').length;
  const categorias = [...new Set(todosLosTopicos.map(t => t.categoria).filter(Boolean))];
  const dimensionesUnicas = [...new Set(todosLosTopicos.flatMap(t => Array.isArray(t.dimensionesRelacionadas) ? t.dimensionesRelacionadas : []))];

  return {
    todosLosTopicos,
    estadisticas: {
      totalTopicos: todosLosTopicos.length,
      topicosUrgentes,
      topicosAltos,
      categorias,
      dimensionesUnicas,
    },
  };
}

/**
 * Pre-agrupa tópicos similares para optimizar el prompt y calcular participantes únicos
 */
function preAgruparTopicos(
  topicos: Array<{
    topico: string;
    categoria: string;
    prioridad: string;
    frecuenciaAbsoluta: number;
    frecuenciaPorcentual: number;
    dimensionesRelacionadas: string[];
    fuentes: string[];
    scorePrioridad: number;
    niveles?: Array<{ nivel: string; cantidad: number; cargos: string[] }>;
    categoriasPuesto?: string[];
    colaboradoresIds?: string[];
    colaboradoresInfo?: Array<{ id: string; nivel: string; cargo: string; categoriaPuesto: string }>;
  }>,
  totalColaboradores: number,
  umbralSimilitud: number = 0.6
): {
  tematicasPreAgrupadas: import('./types/trainingPlan').TematicaPreAgrupada[];
  topicosIndividuales: typeof topicos;
} {
  const tematicasPreAgrupadas: import('./types/trainingPlan').TematicaPreAgrupada[] = [];
  const topicosIndividuales: typeof topicos = [];
  const topicosProcesados = new Set<number>();

  // Función para calcular similitud entre dos tópicos
  const calcularSimilitud = (t1: typeof topicos[0], t2: typeof topicos[0]): number => {
    let similitud = 0;
    let factores = 0;

    // Similitud de categoría (40% peso)
    if (t1.categoria === t2.categoria) {
      similitud += 0.4;
    }
    factores += 0.4;

    // Similitud de prioridad (20% peso)
    if (t1.prioridad === t2.prioridad) {
      similitud += 0.2;
    }
    factores += 0.2;

    // Similitud semántica en nombres (20% peso)
    const nombre1 = t1.topico.toLowerCase().trim();
    const nombre2 = t2.topico.toLowerCase().trim();
    const palabras1 = new Set(nombre1.split(/\s+/));
    const palabras2 = new Set(nombre2.split(/\s+/));
    const palabrasComunes = [...palabras1].filter(p => palabras2.has(p)).length;
    const palabrasTotales = new Set([...palabras1, ...palabras2]).size;
    const similitudSemantica = palabrasTotales > 0 ? palabrasComunes / palabrasTotales : 0;
    similitud += similitudSemantica * 0.2;
    factores += 0.2;

    // Overlap de niveles/cargos (20% peso)
    const niveles1 = new Set(t1.niveles?.map(n => n.nivel) || []);
    const niveles2 = new Set(t2.niveles?.map(n => n.nivel) || []);
    const nivelesComunes = [...niveles1].filter(n => niveles2.has(n)).length;
    const nivelesTotales = new Set([...niveles1, ...niveles2]).size;
    const similitudNiveles = nivelesTotales > 0 ? nivelesComunes / nivelesTotales : 0;
    similitud += similitudNiveles * 0.2;
    factores += 0.2;

    return factores > 0 ? similitud / factores : 0;
  };

  // Función para calcular colaboradores únicos de un grupo de tópicos
  const calcularColaboradoresUnicos = (topicosGrupo: typeof topicos): string[] => {
    const colaboradoresSet = new Set<string>();
    topicosGrupo.forEach(t => {
      if (Array.isArray(t.colaboradoresIds)) {
        t.colaboradoresIds.forEach(id => colaboradoresSet.add(id));
      }
    });
    return Array.from(colaboradoresSet);
  };

  // Función para generar descripción de participantes
  const generarDescripcionParticipantes = (
    colaboradoresUnicos: string[],
    colaboradoresInfoMap: Map<string, { nivel: string; cargo: string; categoriaPuesto: string }>,
    totalColaboradores: number
  ): string => {
    const frecuencia = colaboradoresUnicos.length;
    const frecuenciaPorcentual = (frecuencia / totalColaboradores) * 100;

    // Aumentar umbral a 95% para ser más estricto
    // Solo usar "Todo el equipo" cuando realmente es casi todo el equipo
    if (frecuenciaPorcentual >= 95) {
      return `Todo el equipo completo (${frecuencia} personas)`;
    }

    // Agrupar por nivel
    const porNivel = new Map<string, { cantidad: number; cargos: Set<string> }>();
    colaboradoresUnicos.forEach(id => {
      const info = colaboradoresInfoMap.get(id);
      if (info) {
        const nivel = info.nivel || 'Sin nivel';
        if (!porNivel.has(nivel)) {
          porNivel.set(nivel, { cantidad: 0, cargos: new Set() });
        }
        const nivelInfo = porNivel.get(nivel)!;
        nivelInfo.cantidad++;
        if (info.cargo && info.cargo !== 'Sin cargo') {
          nivelInfo.cargos.add(info.cargo);
        }
      }
    });

    // Construir descripción
    const partes: string[] = [];
    porNivel.forEach((info, nivel) => {
      if (info.cargos.size > 0) {
        const cargosStr = Array.from(info.cargos).join(', ');
        partes.push(`${cargosStr} de nivel ${nivel} (${info.cantidad} persona${info.cantidad > 1 ? 's' : ''})`);
      } else {
        partes.push(`Personal de nivel ${nivel} (${info.cantidad} persona${info.cantidad > 1 ? 's' : ''})`);
      }
    });

    if (partes.length === 0) {
      return `${frecuencia} persona${frecuencia > 1 ? 's' : ''}`;
    }

    return partes.join(', ');
  };

  // Procesar tópicos por prioridad (urgente primero)
  const ordenPrioridad = { urgente: 1, alta: 2, media: 3, baja: 4 };
  const topicosOrdenados = [...topicos].sort((a, b) => {
    const ordenA = ordenPrioridad[a.prioridad as keyof typeof ordenPrioridad] || 5;
    const ordenB = ordenPrioridad[b.prioridad as keyof typeof ordenPrioridad] || 5;
    return ordenA - ordenB || b.scorePrioridad - a.scorePrioridad;
  });

  // Agrupar tópicos similares
  for (let i = 0; i < topicosOrdenados.length; i++) {
    if (topicosProcesados.has(i)) continue;

    const topicoActual = topicosOrdenados[i];
    const grupo: typeof topicos = [topicoActual];
    topicosProcesados.add(i);

    // Buscar tópicos similares
    for (let j = i + 1; j < topicosOrdenados.length; j++) {
      if (topicosProcesados.has(j)) continue;

      const topicoComparar = topicosOrdenados[j];
      const similitud = calcularSimilitud(topicoActual, topicoComparar);

      if (similitud >= umbralSimilitud) {
        // CRÍTICO: Verificar overlap de colaboradores (70%+ en común)
        // Esto evita agrupar tópicos con participantes completamente diferentes
        const colaboradores1 = new Set(topicoActual.colaboradoresIds || []);
        const colaboradores2 = new Set(topicoComparar.colaboradoresIds || []);
        
        // Calcular colaboradores comunes
        const colaboradoresComunes = [...colaboradores1].filter(id => colaboradores2.has(id)).length;
        const colaboradoresTotales = new Set([...colaboradores1, ...colaboradores2]).size;
        const overlapColaboradores = colaboradoresTotales > 0 
          ? colaboradoresComunes / colaboradoresTotales 
          : 0;
        
        // Solo agrupar si hay al menos 70% de colaboradores en común
        // Esto evita que Excel (10 personas) y Liderazgo (12 personas diferentes) se agrupen
        if (overlapColaboradores < 0.7) {
          continue; // No agrupar - tienen participantes muy diferentes
        }
        
        // Verificar que compartan niveles/cargos (al menos 50% overlap)
        const niveles1 = new Set(topicoActual.niveles?.map(n => n.nivel) || []);
        const niveles2 = new Set(topicoComparar.niveles?.map(n => n.nivel) || []);
        const nivelesComunes = [...niveles1].filter(n => niveles2.has(n)).length;
        const nivelesTotales = new Set([...niveles1, ...niveles2]).size;
        const overlapNiveles = nivelesTotales > 0 ? nivelesComunes / nivelesTotales : 0;

        if (overlapNiveles >= 0.5 || grupo.length < 2) {
          grupo.push(topicoComparar);
          topicosProcesados.add(j);
        }
      }
    }

    // Si el grupo tiene al menos 2 tópicos, crear temática pre-agrupada
    if (grupo.length >= 2) {
      const colaboradoresUnicos = calcularColaboradoresUnicos(grupo);
      const frecuenciaCombinada = colaboradoresUnicos.length;
      const frecuenciaPorcentual = Math.round((frecuenciaCombinada / totalColaboradores) * 100 * 10) / 10;

      // Construir mapa de información de colaboradores
      const colaboradoresInfoMap = new Map<string, { nivel: string; cargo: string; categoriaPuesto: string }>();
      grupo.forEach(t => {
        if (Array.isArray(t.colaboradoresInfo)) {
          t.colaboradoresInfo.forEach(info => {
            colaboradoresInfoMap.set(info.id, info);
          });
        }
      });

      // Calcular niveles combinados
      const nivelesCombinados = new Map<string, { cantidad: number; cargos: Set<string> }>();
      colaboradoresUnicos.forEach(id => {
        const info = colaboradoresInfoMap.get(id);
        if (info) {
          const nivel = info.nivel || 'Sin nivel';
          if (!nivelesCombinados.has(nivel)) {
            nivelesCombinados.set(nivel, { cantidad: 0, cargos: new Set() });
          }
          const nivelInfo = nivelesCombinados.get(nivel)!;
          nivelInfo.cantidad++;
          if (info.cargo && info.cargo !== 'Sin cargo') {
            nivelInfo.cargos.add(info.cargo);
          }
        }
      });

      const nivelesArray = Array.from(nivelesCombinados.entries()).map(([nivel, info]) => ({
        nivel,
        cantidad: info.cantidad,
        cargos: Array.from(info.cargos),
      })).sort((a, b) => b.cantidad - a.cantidad);

      // Categorías de puesto combinadas
      const categoriasPuestoSet = new Set<string>();
      grupo.forEach(t => {
        if (Array.isArray(t.categoriasPuesto)) {
          t.categoriasPuesto.forEach(cat => categoriasPuestoSet.add(cat));
        }
      });

      // Dimensiones relacionadas combinadas
      const dimensionesSet = new Set<string>();
      grupo.forEach(t => {
        if (Array.isArray(t.dimensionesRelacionadas)) {
          t.dimensionesRelacionadas.forEach(dim => dimensionesSet.add(dim));
        }
      });

      // Determinar prioridad del grupo (la más alta)
      const prioridades = grupo.map(t => ordenPrioridad[t.prioridad as keyof typeof ordenPrioridad] || 5);
      const prioridadMinima = Math.min(...prioridades);
      const prioridadGrupo = Object.keys(ordenPrioridad).find(
        key => ordenPrioridad[key as keyof typeof ordenPrioridad] === prioridadMinima
      ) as 'urgente' | 'alta' | 'media' | 'baja';

      // Generar nombre de la temática (usar el tópico más prioritario o combinación)
      const nombreTematica = grupo.length === 2 
        ? `${grupo[0].topico} y ${grupo[1].topico}`
        : grupo[0].topico + (grupo.length > 2 ? ` y ${grupo.length - 1} tópicos relacionados` : '');

      const participantesDescripcion = generarDescripcionParticipantes(
        colaboradoresUnicos,
        colaboradoresInfoMap,
        totalColaboradores
      );

      tematicasPreAgrupadas.push({
        nombre: nombreTematica,
        topicosIncluidos: grupo.map(t => t.topico),
        colaboradoresUnicos,
        frecuenciaCombinada,
        frecuenciaPorcentual,
        niveles: nivelesArray,
        categoriasPuesto: Array.from(categoriasPuestoSet),
        prioridad: prioridadGrupo,
        categoria: grupo[0].categoria,
        dimensionesRelacionadas: Array.from(dimensionesSet),
        participantesDescripcion,
      });
    } else {
      // Tópico individual que no se pudo agrupar
      topicosIndividuales.push(topicoActual);
    }
  }

  return {
    tematicasPreAgrupadas,
    topicosIndividuales,
  };
}

/**
 * Calcula Z-Score: (valor - media) / desviacion_std
 */
function calcularZScore(valor: number, media: number, desviacionStd: number): number {
  if (desviacionStd === 0) return 0;
  return (valor - media) / desviacionStd;
}

/**
 * Calcula percentiles de un array de números
 */
function calcularPercentiles(valores: number[]): { p25: number; p50: number; p75: number } {
  const sorted = [...valores].sort((a, b) => a - b);
  const n = sorted.length;
  
  const getPercentile = (p: number) => {
    const index = (p / 100) * (n - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    if (lower === upper) return sorted[lower];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };
  
  return {
    p25: getPercentile(25),
    p50: getPercentile(50),
    p75: getPercentile(75),
  };
}

/**
 * Obtiene el plan de capacitación consolidado para una unidad jerárquica
 * TODO calculado en TypeScript - sin funciones SQL
 */
export async function getPlanCapacitacionUnidad(
  jefeDpi: string,
  periodoId: string
): Promise<{ plan: PlanCapacitacionUnidad | null; error: TrainingPlanError | null }> {
  try {
    console.log('🔍 Generando plan de capacitación en TypeScript:', { jefeDpi, periodoId });
    
    // 1. Obtener período
    const { data: periodo, error: periodoError } = await supabase
      .from('evaluation_periods')
      .select('id, nombre')
      .eq('id', periodoId)
      .single();
    
    if (periodoError || !periodo) {
      return {
        plan: null,
        error: { message: 'Período de evaluación no encontrado' }
      };
    }

    // 2. Obtener equipo en cascada
    const equipoCascada = await getEquipoCascadaCompleto(jefeDpi, periodoId);
    if (!equipoCascada || !equipoCascada.colaboradores || equipoCascada.colaboradores.length === 0) {
      return {
        plan: null,
        error: { message: 'No se encontraron colaboradores en la unidad' }
      };
    }

    const colaboradoresIds = equipoCascada.colaboradores.map(c => c.dpi);
    const totalColaboradores = colaboradoresIds.length;

    // 3. Obtener evaluaciones completadas
    const { data: evaluaciones, error: evalError } = await supabase
      .from('evaluations')
      .select('usuario_id, estado, tipo')
      .in('usuario_id', colaboradoresIds)
      .eq('periodo_id', periodoId)
      .eq('estado', 'enviado')
      .eq('tipo', 'auto');

    if (evalError) {
      console.error('Error obteniendo evaluaciones:', evalError);
    }

    const evaluacionesCompletadas = evaluaciones?.length || 0;
    const tasaCompletitud = totalColaboradores > 0 
      ? Math.round((evaluacionesCompletadas / totalColaboradores) * 100 * 10) / 10 
      : 0;

    // 4. Obtener resultados finales para promedios
    const { data: resultadosFinales } = await supabase
      .from('final_evaluation_results')
      .select('colaborador_id, desempeno_porcentaje, posicion_9box')
      .in('colaborador_id', colaboradoresIds)
      .eq('periodo_id', periodoId);

    const promedioDesempenoUnidad = resultadosFinales && resultadosFinales.length > 0
      ? Math.round((resultadosFinales.reduce((sum, r) => sum + (r.desempeno_porcentaje || 0), 0) / resultadosFinales.length) * 10) / 10
      : 0;

    // Promedio organizacional
    const { data: resultadosOrg } = await supabase
      .from('final_evaluation_results')
      .select('desempeno_porcentaje')
      .eq('periodo_id', periodoId);

    const promedioDesempenoOrg = resultadosOrg && resultadosOrg.length > 0
      ? Math.round((resultadosOrg.reduce((sum, r) => sum + (r.desempeno_porcentaje || 0), 0) / resultadosOrg.length) * 10) / 10
      : 0;

    // 5. Calcular brechas por dimensión (simplificado - necesitaríamos calcular dimensiones)
    // Por ahora, retornamos array vacío ya que calcular dimensiones requiere la función SQL
    // TODO: Implementar cálculo de dimensiones en TypeScript si es necesario
    const brechasDimensiones: BrechaDimension[] = [];

    // 6. Obtener tópicos de capacitación de training_topics con información de colaboradores
    const { data: topicosTraining } = await supabase
      .from('training_topics')
      .select(`
        topico, 
        categoria, 
        dimension_relacionada, 
        fuente, 
        colaborador_id,
        users!inner(nivel, cargo, tipo_puesto, direccion_unidad, departamento_dependencia)
      `)
      .in('colaborador_id', colaboradoresIds)
      .eq('periodo_id', periodoId);

    // 7. Obtener comentarios del jefe (evaluations.comments)
    const { data: evaluacionesJefe } = await supabase
      .from('evaluations')
      .select('colaborador_id, comments')
      .in('colaborador_id', colaboradoresIds)
      .eq('periodo_id', periodoId)
      .eq('tipo', 'jefe')
      .eq('estado', 'enviado')
      .not('comments', 'is', null);

    // 8. Obtener solicitudes directas (open_question_responses)
    const { data: evaluacionesAuto } = await supabase
      .from('evaluations')
      .select('id, usuario_id')
      .in('usuario_id', colaboradoresIds)
      .eq('periodo_id', periodoId)
      .eq('tipo', 'auto')
      .eq('estado', 'enviado');

    const evaluacionesAutoIds = evaluacionesAuto?.map(e => e.id) || [];

    const { data: solicitudes } = evaluacionesAutoIds.length > 0 ? await supabase
      .from('open_question_responses')
      .select(`
        respuesta,
        evaluacion_id,
        open_questions!inner(tipo)
      `)
      .in('evaluacion_id', evaluacionesAutoIds)
      .in('open_questions.tipo', ['capacitacion', 'herramienta']) : { data: null };

    // 9. Consolidar tópicos con información de niveles y cargos
    const topicosMap = new Map<string, {
      topico: string;
      categoria: string;
      frecuencia: number;
      colaboradoresIds: Set<string>; // IDs de colaboradores que necesitan este tópico
      colaboradoresInfo: Map<string, { 
        nivel: string; 
        cargo: string; 
        categoriaPuesto: string;
        nombre?: string;
        area?: string;
        departamento?: string;
      }>; // Info detallada por colaborador
      dimensiones: Set<string>;
      fuentes: Set<string>;
      niveles: Map<string, { cantidad: number; cargos: Set<string> }>;
      categoriasPuesto: Set<string>;
    }>();

    // Tópicos de training_topics
    topicosTraining?.forEach((tt: any) => {
      // FILTRAR: Excluir tópicos que son solicitudes de recursos físicos (no capacitaciones)
      if (esRecursoFisico(tt.topico)) {
        console.log(`🚫 FILTRADO (no es capacitación): "${tt.topico}" - Es solicitud de recurso físico`);
        return; // Saltar este tópico
      }
      
      const topicoNorm = normalizarTopico(tt.topico);
      const key = `${topicoNorm}|${tt.categoria}`;
      
      if (!topicosMap.has(key)) {
        topicosMap.set(key, {
          topico: topicoNorm,
          categoria: tt.categoria,
          frecuencia: 0,
          colaboradoresIds: new Set(),
          colaboradoresInfo: new Map(),
          dimensiones: new Set(),
          fuentes: new Set(),
          niveles: new Map(),
          categoriasPuesto: new Set(),
        });
      }
      
      const entry = topicosMap.get(key)!;
      // NOTA: entry.frecuencia cuenta registros (puede haber múltiples por colaborador)
      // La frecuencia real se calcula usando entry.colaboradoresIds.size (colaboradores únicos)
      entry.frecuencia++;
      if (tt.dimension_relacionada) entry.dimensiones.add(tt.dimension_relacionada);
      entry.fuentes.add(tt.fuente || 'plan');
      
      // Capturar colaborador_id e información detallada
      if (tt.colaborador_id) {
        entry.colaboradoresIds.add(tt.colaborador_id);
        
        // Agregar información de nivel y cargo
        if (tt.users) {
          const nivel = tt.users.nivel || 'Sin nivel';
          const cargo = tt.users.cargo || 'Sin cargo';
          const categoriaPuesto = tt.users.tipo_puesto || 'Sin categoría';
          const area = tt.users.direccion_unidad || tt.users.departamento_dependencia || 'Sin área';
          const departamento = tt.users.departamento_dependencia || 'Sin departamento';
          
          // Buscar nombre del colaborador en equipoCascada
          const colaborador = equipoCascada.colaboradores.find(c => c.dpi === tt.colaborador_id);
          const nombre = colaborador ? `${colaborador.nombre || ''} ${colaborador.apellidos || ''}`.trim() : undefined;
          
          entry.colaboradoresInfo.set(tt.colaborador_id, {
            nivel,
            cargo,
            categoriaPuesto,
            nombre,
            area,
            departamento
          });
          
          if (categoriaPuesto !== 'Sin categoría') {
            entry.categoriasPuesto.add(categoriaPuesto);
          }
          
          if (!entry.niveles.has(nivel)) {
            entry.niveles.set(nivel, { cantidad: 0, cargos: new Set() });
          }
          
          const nivelInfo = entry.niveles.get(nivel)!;
          nivelInfo.cantidad++;
          if (cargo !== 'Sin cargo') {
            nivelInfo.cargos.add(cargo);
          }
        }
      }
    });

    // Tópicos de solicitudes directas
    solicitudes?.forEach((sq: any) => {
      if (sq.respuesta && sq.respuesta.trim().length > 3) {
        // FILTRAR: Excluir tópicos que son solicitudes de recursos físicos (no capacitaciones)
        if (esRecursoFisico(sq.respuesta)) {
          console.log(`🚫 FILTRADO (no es capacitación): "${sq.respuesta}" - Es solicitud de recurso físico`);
          return; // Saltar este tópico
        }
        
        const topicoNorm = normalizarTopico(sq.respuesta);
        const categoria = sq.open_questions?.tipo === 'capacitacion' ? 'Técnica' : 
                         sq.open_questions?.tipo === 'herramienta' ? 'Herramientas' : 'Otro';
        const key = `${topicoNorm}|${categoria}`;
        
        if (!topicosMap.has(key)) {
          topicosMap.set(key, {
            topico: topicoNorm,
            categoria,
            frecuencia: 0,
            colaboradoresIds: new Set(),
            colaboradoresInfo: new Map(),
            dimensiones: new Set(),
            fuentes: new Set(),
            niveles: new Map(), // Inicializar niveles
            categoriasPuesto: new Set(), // Inicializar categoriasPuesto
          });
        }
        
        const entry = topicosMap.get(key)!;
        // NOTA: entry.frecuencia cuenta registros (puede haber múltiples por colaborador)
        // La frecuencia real se calcula usando entry.colaboradoresIds.size (colaboradores únicos)
        entry.frecuencia++;
        entry.fuentes.add('solicitud_colaborador');
        
        // Intentar obtener información del colaborador si está disponible
        // Las solicitudes directas vienen de evaluaciones, podemos obtener el usuario_id
        const evaluacion = evaluacionesAuto?.find(e => e.id === sq.evaluacion_id);
        if (evaluacion?.usuario_id) {
          entry.colaboradoresIds.add(evaluacion.usuario_id);
          // Buscar información del usuario en el equipo
          const colaborador = equipoCascada.colaboradores.find(c => c.dpi === evaluacion.usuario_id);
          if (colaborador) {
            entry.colaboradoresInfo.set(evaluacion.usuario_id, {
              nivel: colaborador.nivel || 'Sin nivel',
              cargo: colaborador.cargo || 'Sin cargo',
              categoriaPuesto: colaborador.tipo_puesto || 'Sin categoría',
              nombre: colaborador.nombre && colaborador.apellidos 
                ? `${colaborador.nombre} ${colaborador.apellidos}`.trim() 
                : undefined,
              area: colaborador.direccion_unidad || colaborador.departamento_dependencia || 'Sin área',
              departamento: colaborador.departamento_dependencia || 'Sin departamento'
            });
          }
        }
      }
    });

    // 10. Convertir a array y calcular scores
    const topicosArray: Array<{
      topico: string;
      categoria: string;
      frecuencia: number;
      frecuenciaPorcentual: number;
      dimensiones: string[];
      fuentes: string[];
      scorePrioridad: number;
      niveles: Array<{ nivel: string; cantidad: number; cargos: string[] }>;
      categoriasPuesto: string[];
      colaboradoresIds: string[];
      colaboradoresInfo: Array<{ 
        id: string; 
        nivel: string; 
        cargo: string; 
        categoriaPuesto: string;
        nombre?: string;
        area?: string;
        departamento?: string;
      }>;
    }> = Array.from(topicosMap.values()).map(entry => {
      // CRÍTICO: Usar colaboradores únicos, NO conteo de registros
      // Un mismo colaborador puede tener el mismo tópico múltiples veces (por diferentes dimensiones)
      const colaboradoresUnicos = entry.colaboradoresIds.size;
      const frecuenciaPorcentual = Math.round((colaboradoresUnicos / totalColaboradores) * 100 * 10) / 10;
      // Score simplificado: frecuencia% * 0.5 + 50 * 0.5 (sin Z-Score por ahora)
      const scorePrioridad = (frecuenciaPorcentual * 0.5) + (50 * 0.5);
      
      // Convertir niveles a array (con validación)
      const nivelesArray = entry.niveles && entry.niveles instanceof Map
        ? Array.from(entry.niveles.entries()).map(([nivel, info]) => ({
            nivel,
            cantidad: info.cantidad,
            cargos: Array.from(info.cargos || []),
          })).sort((a, b) => b.cantidad - a.cantidad) // Ordenar por cantidad descendente
        : [];
      
      // Convertir categoriasPuesto a array (con validación)
      const categoriasPuestoArray = entry.categoriasPuesto && entry.categoriasPuesto instanceof Set
        ? Array.from(entry.categoriasPuesto)
        : [];
      
      // Convertir colaboradoresIds a array
      const colaboradoresIdsArray = entry.colaboradoresIds && entry.colaboradoresIds instanceof Set
        ? Array.from(entry.colaboradoresIds)
        : [];
      
      // Convertir colaboradoresInfo a array
      const colaboradoresInfoArray = entry.colaboradoresInfo && entry.colaboradoresInfo instanceof Map
        ? Array.from(entry.colaboradoresInfo.entries()).map(([id, info]) => ({
            id,
            nivel: info.nivel,
            cargo: info.cargo,
            categoriaPuesto: info.categoriaPuesto,
            nombre: info.nombre,
            area: info.area,
            departamento: info.departamento
          }))
        : [];
      
      return {
        topico: entry.topico,
        categoria: entry.categoria,
        frecuencia: colaboradoresUnicos, // Usar colaboradores únicos, no conteo de registros
        frecuenciaPorcentual,
        dimensiones: Array.from(entry.dimensiones || []),
        fuentes: Array.from(entry.fuentes || []),
        scorePrioridad: Math.round(scorePrioridad * 100) / 100,
        niveles: nivelesArray,
        categoriasPuesto: categoriasPuestoArray,
        colaboradoresIds: colaboradoresIdsArray,
        colaboradoresInfo: colaboradoresInfoArray,
      };
    });

    // 11. Calcular percentiles y clasificar
    const scores = topicosArray.map(t => t.scorePrioridad);
    const percentiles = calcularPercentiles(scores);

    const capacitaciones: TopicoCapacitacion[] = topicosArray.map(t => ({
      topico: t.topico,
      categoria: t.categoria as any,
      frecuenciaAbsoluta: t.frecuencia,
      frecuenciaPorcentual: t.frecuenciaPorcentual,
      scorePrioridad: t.scorePrioridad,
      prioridad: t.scorePrioridad >= percentiles.p75 ? 'urgente' :
                t.scorePrioridad >= percentiles.p50 ? 'alta' :
                t.scorePrioridad >= percentiles.p25 ? 'media' : 'baja',
      dimensionesRelacionadas: t.dimensiones,
      fuentes: t.fuentes as any[],
      // Agregar información de niveles y cargos
      niveles: t.niveles,
      categoriasPuesto: t.categoriasPuesto,
      // Agregar información de colaboradores
      colaboradoresIds: t.colaboradoresIds,
      colaboradoresInfo: t.colaboradoresInfo,
    } as any)).sort((a, b) => {
      const order = { urgente: 1, alta: 2, media: 3, baja: 4 };
      return (order[a.prioridad] || 5) - (order[b.prioridad] || 5) || b.scorePrioridad - a.scorePrioridad;
    });

    // 12. Distribución 9-Box
    const distribucion9BoxMap = new Map<string, number>();
    resultadosFinales?.forEach(r => {
      if (r.posicion_9box) {
        distribucion9BoxMap.set(r.posicion_9box, (distribucion9BoxMap.get(r.posicion_9box) || 0) + 1);
      }
    });

    const distribucion9Box: Distribucion9Box[] = Array.from(distribucion9BoxMap.entries()).map(([posicion, cantidad]) => {
      const porcentaje = Math.round((cantidad / totalColaboradores) * 100 * 10) / 10;
      const factorUrgencia = posicion.startsWith('bajo-') ? 100 :
                            posicion.startsWith('medio-') ? 50 : 20;
      const accionRecomendada = posicion.startsWith('bajo-') ? 'Desarrollo urgente requerido' :
                               posicion.startsWith('medio-') ? 'Desarrollo gradual recomendado' :
                               posicion.startsWith('alto-') ? 'Mantenimiento y crecimiento' :
                               'Evaluación necesaria';
      
      return {
        posicion,
        cantidad,
        porcentaje,
        factorUrgencia,
        accionRecomendada,
      };
    }).sort((a, b) => b.factorUrgencia - a.factorUrgencia);

    // 13. Resumen ejecutivo
    const capacitacionesPrioritarias = capacitaciones
      .filter(c => c.prioridad === 'urgente' || c.prioridad === 'alta')
      .slice(0, 5)
      .map(c => c.topico);

    const dimensionMasCritica = brechasDimensiones.length > 0
      ? brechasDimensiones.sort((a, b) => a.zScore - b.zScore)[0]?.dimensionNombre || null
      : null;

    const situacionGeneral = brechasDimensiones.some(b => b.prioridad === 'critica')
      ? 'La unidad presenta brechas críticas que requieren atención inmediata'
      : brechasDimensiones.some(b => b.prioridad === 'alta')
      ? 'La unidad muestra áreas de mejora importantes'
      : 'La unidad se encuentra en un nivel adecuado con oportunidades de desarrollo';

    const recomendacionGeneral = capacitaciones.some(c => c.prioridad === 'urgente')
      ? 'Priorizar capacitaciones urgentes identificadas y abordar brechas críticas'
      : 'Continuar con desarrollo gradual y fortalecer áreas de oportunidad';

    // 14. Intentar cargar plan estructurado guardado (si existe)
    let planEstructuradoGuardado: PlanCapacitacionEstructurado | undefined = undefined;
    try {
      const { data: planGuardado, error: errorPlanGuardado } = await supabase
        .from('training_plans_structured')
        .select('plan_data, fecha_generacion')
        .eq('jefe_dpi', jefeDpi)
        .eq('periodo_id', periodoId)
        .maybeSingle();

      if (!errorPlanGuardado && planGuardado?.plan_data) {
        // plan_data puede venir como objeto JSONB ya parseado o como string
        const planDataRaw = planGuardado.plan_data;
        const planDataString = typeof planDataRaw === 'string' 
          ? planDataRaw 
          : JSON.stringify(planDataRaw);
        
        try {
          planEstructuradoGuardado = parseTrainingPlanResponse(planDataString);
          
          // Validar que se parseó correctamente - PERO NO DESCARTAR si tiene temáticas o programa
          if (planEstructuradoGuardado) {
            console.log('📋 Plan estructurado cargado desde BD:', {
              fechaGeneracion: planGuardado.fecha_generacion,
              tieneTematicas: !!planEstructuradoGuardado.tematicas?.length,
              numTematicas: planEstructuradoGuardado.tematicas?.length || 0,
              tienePrograma: !!planEstructuradoGuardado.programaCapacitacion?.length,
              tieneActividades: !!planEstructuradoGuardado.actividades?.length,
            });
          } else {
            console.warn('⚠️ Plan estructurado parseado pero es null/undefined');
            planEstructuradoGuardado = undefined;
          }
        } catch (parseError) {
          console.error('❌ Error parseando plan estructurado:', parseError);
          planEstructuradoGuardado = undefined;
        }
        
        // Verificar si el plan guardado tiene frecuencias sospechosas (todo "Todo el equipo completo")
        const tieneTodoEquipoCompleto = planEstructuradoGuardado?.tematicas?.some((t: any) => {
          return t.actividades?.some((a: any) => {
            const participantes = a.participantes || '';
            return participantes.toLowerCase().includes('todo el equipo completo') || 
                   participantes.toLowerCase().includes('todo el equipo');
          });
        });
        
        if (tieneTodoEquipoCompleto) {
          console.warn('⚠️ ADVERTENCIA: El plan guardado contiene "Todo el equipo completo" en múltiples capacitaciones.');
          console.warn('⚠️ Esto puede indicar que fue generado con frecuencias incorrectas. Se recomienda regenerar.');
        }
      }
    } catch (errorCargaPlan) {
      console.warn('⚠️ No se pudo cargar plan estructurado guardado:', errorCargaPlan);
      // Continuar sin plan estructurado guardado
    }

    // 14.5. Log de frecuencias para debugging
    console.log('📊 FRECUENCIAS CALCULADAS (para validación):');
    capacitaciones.slice(0, 10).forEach((cap, idx) => {
      console.log(`  ${idx + 1}. ${cap.topico}: ${cap.frecuenciaAbsoluta}/${totalColaboradores} (${cap.frecuenciaPorcentual}%)`);
      if (cap.colaboradoresInfo && cap.colaboradoresInfo.length > 0) {
        console.log(`     Colaboradores: ${cap.colaboradoresInfo.map((c: any) => c.nombre || c.id).join(', ')}`);
      }
    });

    // 15. Construir resultado
    const plan: PlanCapacitacionUnidad = {
      metadata: {
        periodoId,
        periodoNombre: periodo.nombre,
        fechaGeneracion: new Date().toISOString(),
        jefeDpi,
      },
      contexto: {
        totalColaboradores,
        evaluacionesCompletadas,
        tasaCompletitud,
        promedioDesempenoUnidad,
        promedioDesempenoOrg,
      },
      brechasDimensiones,
      capacitaciones,
      distribucion9Box,
      resumenEjecutivo: {
        situacionGeneral,
        dimensionMasCritica,
        capacitacionesPrioritarias,
        recomendacionGeneral,
      },
      planEstructurado: planEstructuradoGuardado, // Incluir plan guardado si existe
    };

    console.log('✅ Plan de capacitación generado exitosamente en TypeScript');
    return { plan, error: null };

  } catch (error: any) {
    console.error('❌ Excepción en getPlanCapacitacionUnidad:', error);
    return {
      plan: null,
      error: {
        message: error.message || 'Error inesperado al generar el plan de capacitación',
        details: error.stack
      }
    };
  }
}

/**
 * Genera un Plan de Capacitación Estructurado usando IA (OpenAI)
 * Usa Edge Function de Supabase para mantener consistencia y seguridad
 */
/**
 * Función auxiliar para guardar el plan estructurado en la base de datos
 */
async function guardarPlanEstructurado(
  planEstructurado: PlanCapacitacionEstructurado,
  planData: PlanCapacitacionUnidad
): Promise<void> {
  // Guardar plan estructurado en la base de datos
  // Usamos upsert (igual que team_analysis) - no necesitamos eliminar antes, upsert lo maneja con onConflict
  try {
    // Verificar que tenemos los datos necesarios
    if (!planData.metadata.jefeDpi || !planData.metadata.periodoId) {
      console.error('❌ ERROR: Faltan datos para guardar el plan:', {
        jefeDpi: planData.metadata.jefeDpi,
        periodoId: planData.metadata.periodoId,
      });
      return;
    }

    // Verificar DPI del usuario autenticado para debugging RLS
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { data: sessionData } = await supabase.auth.getSession();
    
    console.log('🔍 DEBUG guardado plan:', {
      jefe_dpi_a_guardar: planData.metadata.jefeDpi,
      usuario_autenticado_id: authUser?.id,
      tiene_session: !!sessionData?.session,
      access_token_presente: !!sessionData?.session?.access_token,
    });
    
    // Usar upsert igual que team_analysis (replicar el patrón que ya funciona)
    const { data: savedPlan, error: saveError } = await supabase
      .from('training_plans_structured')
      .upsert(
        {
          jefe_dpi: planData.metadata.jefeDpi,
          periodo_id: planData.metadata.periodoId,
          plan_data: planEstructurado,
          fecha_generacion: new Date().toISOString(),
          generado_por_ia: true,
        },
        {
          onConflict: 'jefe_dpi,periodo_id',
        }
      )
      .select()
      .single();

    if (saveError) {
      console.error('❌ ERROR AL GUARDAR PLAN EN BD:', {
        error: saveError,
        code: saveError.code,
        jefe_dpi: planData.metadata.jefeDpi,
        periodo_id: planData.metadata.periodoId,
        message: saveError.message,
        details: saveError.details,
        hint: saveError.hint,
      });
      
      // Si es error de RLS, mostrar mensaje específico
      if (saveError.code === '42501' || saveError.message?.includes('policy') || saveError.message?.includes('RLS') || saveError.message?.includes('row-level security')) {
        console.error('🚫 ERROR DE RLS: La política de seguridad está bloqueando el guardado.');
        console.error('💡 El usuario autenticado debe tener el mismo DPI que jefe_dpi');
        console.error('💡 DPI a guardar:', planData.metadata.jefeDpi);
        console.error('💡 Usuario autenticado:', authUser?.id);
      }
    } else {
      console.log('✅ Plan estructurado guardado exitosamente en BD:', {
        id: savedPlan?.id,
        jefe_dpi: planData.metadata.jefeDpi,
        periodo_id: planData.metadata.periodoId,
        fecha_generacion: savedPlan?.fecha_generacion,
      });
    }
  } catch (saveError: any) {
    console.error('❌ EXCEPCIÓN AL GUARDAR PLAN:', {
      error: saveError,
      message: saveError?.message,
      stack: saveError?.stack,
    });
  }
}

export async function generateTrainingPlanWithAI(
  planData: PlanCapacitacionUnidad
): Promise<{ plan: PlanCapacitacionEstructurado | null; error: TrainingPlanError | null }> {
  try {
    console.log('🤖 Generando plan de capacitación estructurado con IA (Edge Function)...');

    // Preparar datos para IA
    const datosParaIA = prepararDatosParaIA(planData);
    
    // Validar que haya datos para procesar
    if (!datosParaIA.todosLosTopicos || datosParaIA.todosLosTopicos.length === 0) {
      return {
        plan: null,
        error: {
          message: 'No se encontraron tópicos de capacitación para generar el plan. Verifica que haya evaluaciones completadas con planes de desarrollo.',
          code: 'NO_TOPICS_FOUND'
        }
      };
    }
    
    // Enviar TODOS los tópicos a la IA para que analice y agrupe libremente
    // NO hacer pre-agrupamiento - la IA tiene toda la información para decidir
    console.log('📊 Enviando todos los tópicos a la IA para análisis libre:', {
      totalTopicos: datosParaIA.todosLosTopicos.length,
      urgentes: datosParaIA.estadisticas.topicosUrgentes,
      altos: datosParaIA.estadisticas.topicosAltos,
    });
    
    // Log crítico: Verificar frecuencias que se envían a la IA
    console.log('🔍 VALIDACIÓN DE FRECUENCIAS ENVIADAS A LA IA:');
    datosParaIA.todosLosTopicos.slice(0, 10).forEach((topico, idx) => {
      console.log(`  ${idx + 1}. ${topico.topico}: ${topico.frecuenciaAbsoluta}/${planData.contexto.totalColaboradores} (${topico.frecuenciaPorcentual}%)`);
      if (topico.frecuenciaPorcentual >= 95) {
        console.log(`     ⚠️ ALTA FRECUENCIA - Puede usar "Todo el equipo completo"`);
      } else {
        console.log(`     ✅ BAJA/MEDIA FRECUENCIA - DEBE especificar participantes exactos`);
      }
      if (topico.colaboradoresInfo && topico.colaboradoresInfo.length > 0) {
        console.log(`     Colaboradores específicos: ${topico.colaboradoresInfo.map((c: any) => `${c.nombre || c.id} (${c.nivel}, ${c.cargo})`).join(', ')}`);
      }
    });

    // Intentar primero con supabase.functions.invoke
    try {
      // Asegurar que todos los arrays estén inicializados
      // Enviar TODOS los tópicos - la IA los analizará y agrupará
      const planDataParaEnviar = {
        metadata: planData.metadata,
        contexto: planData.contexto,
        brechasDimensiones: Array.isArray(planData.brechasDimensiones) ? planData.brechasDimensiones : [],
        todosLosTopicos: Array.isArray(datosParaIA.todosLosTopicos) ? datosParaIA.todosLosTopicos : [],
        tematicasPreAgrupadas: [], // No usar pre-agrupamiento - la IA decide
        estadisticas: {
          ...datosParaIA.estadisticas,
          categorias: Array.isArray(datosParaIA.estadisticas.categorias) ? datosParaIA.estadisticas.categorias : [],
          dimensionesUnicas: Array.isArray(datosParaIA.estadisticas.dimensionesUnicas) ? datosParaIA.estadisticas.dimensionesUnicas : [],
        },
        resumenEjecutivo: planData.resumenEjecutivo,
      };

      const { data, error: functionError } = await supabase.functions.invoke(
        "generate-training-plan",
        {
          body: {
            planData: planDataParaEnviar,
          },
        }
      );

      if (functionError) {
        throw functionError;
      }

      if (!data?.success) {
        throw new Error(data?.error || "Error desconocido al generar plan de capacitación");
      }

      // Parsear respuesta
      const planEstructurado = parseTrainingPlanResponse(JSON.stringify(data.plan));

      // Validar plan generado (sin temáticas pre-agrupadas ya que la IA hizo todo el análisis)
      const validacion = validarPlanGenerado(
        planEstructurado,
        datosParaIA.todosLosTopicos,
        [], // No hay temáticas pre-agrupadas
        planData.contexto.totalColaboradores
      );

      if (!validacion.valido) {
        console.warn('⚠️ Validación del plan falló:', validacion.errores);
      }
      if (validacion.advertencias.length > 0) {
        console.warn('⚠️ Advertencias en el plan:', validacion.advertencias);
      }

      // Guardar plan estructurado ANTES de retornar
      await guardarPlanEstructurado(planEstructurado, planData);

      console.log('✅ Plan de capacitación estructurado generado exitosamente');
      return { plan: planEstructurado, error: null };

    } catch (invokeError: any) {
      // Si falla la invocación, intentar con fetch directo (fallback)
      console.warn('⚠️ Invocación con supabase.functions.invoke falló, intentando con fetch directo:', invokeError);
      
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://oxadpbdlpvwyapuondei.supabase.co";
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94YWRwYmRscHZ3eWFwdW9uZGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMjU5MzcsImV4cCI6MjA3NzkwMTkzN30.HjIoMaw20qx7DscE-XWCaz88EWa0Jv_aCDcMtv6eadw";
      
      // Asegurar que todos los arrays estén inicializados (mismo que arriba)
      // Enviar TODOS los tópicos - la IA los analizará y agrupará
      const planDataParaEnviar = {
        metadata: planData.metadata,
        contexto: planData.contexto,
        brechasDimensiones: Array.isArray(planData.brechasDimensiones) ? planData.brechasDimensiones : [],
        todosLosTopicos: Array.isArray(datosParaIA.todosLosTopicos) ? datosParaIA.todosLosTopicos : [],
        tematicasPreAgrupadas: [], // No usar pre-agrupamiento - la IA decide
        estadisticas: {
          ...datosParaIA.estadisticas,
          categorias: Array.isArray(datosParaIA.estadisticas.categorias) ? datosParaIA.estadisticas.categorias : [],
          dimensionesUnicas: Array.isArray(datosParaIA.estadisticas.dimensionesUnicas) ? datosParaIA.estadisticas.dimensionesUnicas : [],
        },
        resumenEjecutivo: planData.resumenEjecutivo,
      };

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-training-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          planData: planDataParaEnviar,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        console.error('❌ Error de Edge Function:', {
          status: response.status,
          error: errorData,
          errorText: errorText.substring(0, 500)
        });
        
        if (response.status === 404) {
          throw new Error('La Edge Function "generate-training-plan" no está desplegada en Supabase. Por favor, despliégala desde el Dashboard de Supabase o contacta al administrador.');
        }
        
        const errorMessage = errorData.error || errorData.message || `Error ${response.status}: ${errorText.substring(0, 200)}`;
        throw new Error(errorMessage);
      }

      const responseData = await response.json();

      if (!responseData?.success) {
        throw new Error(responseData?.error || "Error desconocido al generar plan de capacitación");
      }

      // Parsear respuesta
      const planEstructurado = parseTrainingPlanResponse(JSON.stringify(responseData.plan));

      // Validar plan generado (sin temáticas pre-agrupadas ya que la IA hizo todo el análisis)
      const validacion = validarPlanGenerado(
        planEstructurado,
        datosParaIA.todosLosTopicos,
        [], // No hay temáticas pre-agrupadas
        planData.contexto.totalColaboradores
      );

      if (!validacion.valido) {
        console.error('❌ VALIDACIÓN DEL PLAN FALLÓ - ERRORES CRÍTICOS:');
        validacion.errores.forEach((error, idx) => {
          console.error(`   ${idx + 1}. ${error}`);
        });
      }
      if (validacion.advertencias.length > 0) {
        console.warn('⚠️ ADVERTENCIAS EN EL PLAN GENERADO:');
        validacion.advertencias.forEach((advertencia, idx) => {
          console.warn(`   ${idx + 1}. ${advertencia}`);
        });
      }
      
      // Log adicional para debugging
      console.log('📊 Estadísticas del plan generado:', {
        programaCapacitacion: planEstructurado.programaCapacitacion?.length || 0,
        tematicas: planEstructurado.tematicas?.length || 0,
        tieneObjetivoGeneral: !!planEstructurado.objetivoGeneral,
        objetivosEspecificos: planEstructurado.objetivosEspecificos?.length || 0,
        cronograma: planEstructurado.cronograma?.length || 0,
        tieneJustificacion: !!planEstructurado.justificacion,
        tieneMetodologia: !!planEstructurado.metodologia,
      });
      
      // Validación estratégica de completitud (no obligatoria, solo informativa)
      const topicosIncluidos = new Set<string>();
      const topicosEnPlan = [
        ...(planEstructurado.tematicas || []).flatMap((t: any) => 
          (t.temas || []).concat((t.actividades || []).map((a: any) => a.topico))
        ),
        ...(planEstructurado.programaCapacitacion || []).flatMap((c: any) => c.temas || [])
      ];
      topicosEnPlan.forEach((t: string) => {
        if (t) topicosIncluidos.add(t.toLowerCase().trim());
      });
      
      const topicosUrgentes = datosParaIA.todosLosTopicos.filter(t => t.prioridad === 'urgente');
      const topicosAltos = datosParaIA.todosLosTopicos.filter(t => t.prioridad === 'alta');
      
      const topicosUrgentesIncluidos = topicosUrgentes.filter(t => {
        const topicoLower = t.topico.toLowerCase().trim();
        return Array.from(topicosIncluidos).some(incluido => 
          incluido.includes(topicoLower) || topicoLower.includes(incluido)
        );
      });
      
      const topicosAltosIncluidos = topicosAltos.filter(t => {
        const topicoLower = t.topico.toLowerCase().trim();
        return Array.from(topicosIncluidos).some(incluido => 
          incluido.includes(topicoLower) || topicoLower.includes(incluido)
        );
      });
      
      const porcentajeUrgentes = topicosUrgentes.length > 0
        ? Math.round((topicosUrgentesIncluidos.length / topicosUrgentes.length) * 100)
        : 100;
      
      const porcentajeAltos = topicosAltos.length > 0
        ? Math.round((topicosAltosIncluidos.length / topicosAltos.length) * 100)
        : 100;
      
      // Calcular estadísticas por categoría
      const topicosPorCategoria = new Map<string, { total: number; urgentes: number; altos: number; incluidos: number; urgentesIncluidos: number; altosIncluidos: number }>();
      datosParaIA.todosLosTopicos.forEach((t: any) => {
        if (!t || !t.topico) return;
        const categoria = t.categoria || 'Sin categoría';
        if (!topicosPorCategoria.has(categoria)) {
          topicosPorCategoria.set(categoria, { total: 0, urgentes: 0, altos: 0, incluidos: 0, urgentesIncluidos: 0, altosIncluidos: 0 });
        }
        const stats = topicosPorCategoria.get(categoria)!;
        stats.total++;
        if (t.prioridad === 'urgente') stats.urgentes++;
        if (t.prioridad === 'alta') stats.altos++;
        
        // Verificar si está incluido
        const topicoLower = t.topico.toLowerCase().trim();
        const estaIncluido = Array.from(topicosIncluidos).some(incluido => 
          incluido.includes(topicoLower) || topicoLower.includes(incluido)
        );
        if (estaIncluido) {
          stats.incluidos++;
          if (t.prioridad === 'urgente') stats.urgentesIncluidos++;
          if (t.prioridad === 'alta') stats.altosIncluidos++;
        }
      });
      
      console.log('📈 ANÁLISIS ESTRATÉGICO DEL PLAN:');
      console.log(`   - Tópicos urgentes incluidos: ${topicosUrgentesIncluidos.length}/${topicosUrgentes.length} (${porcentajeUrgentes}%)`);
      console.log(`   - Tópicos de alta prioridad incluidos: ${topicosAltosIncluidos.length}/${topicosAltos.length} (${porcentajeAltos}%)`);
      console.log(`   - Total de tópicos en plan: ${topicosIncluidos.size} de ${datosParaIA.todosLosTopicos.length}`);
      
      // Análisis por categoría
      console.log('\n📊 ANÁLISIS POR CATEGORÍA:');
      topicosPorCategoria.forEach((stats, categoria) => {
        const porcentajeCategoria = stats.total > 0 ? Math.round((stats.incluidos / stats.total) * 100) : 0;
        const porcentajeUrgentesCat = stats.urgentes > 0 ? Math.round((stats.urgentesIncluidos / stats.urgentes) * 100) : 100;
        const porcentajeAltosCat = stats.altos > 0 ? Math.round((stats.altosIncluidos / stats.altos) * 100) : 100;
        
        console.log(`   ${categoria}:`);
        console.log(`     - Incluidos: ${stats.incluidos}/${stats.total} (${porcentajeCategoria}%)`);
        if (stats.urgentes > 0) {
          console.log(`     - Urgentes incluidos: ${stats.urgentesIncluidos}/${stats.urgentes} (${porcentajeUrgentesCat}%)`);
        }
        if (stats.altos > 0) {
          console.log(`     - Alta prioridad incluidos: ${stats.altosIncluidos}/${stats.altos} (${porcentajeAltosCat}%)`);
        }
        
        // Advertencia si falta una categoría completa
        if (stats.incluidos === 0 && stats.total > 0) {
          console.warn(`     ⚠️⚠️⚠️ CATEGORÍA COMPLETA OMITIDA: ${categoria} tiene ${stats.total} tópicos pero NINGUNO fue incluido en el plan`);
        } else if (porcentajeCategoria < 50 && stats.total > 2) {
          console.warn(`     ⚠️ ADVERTENCIA: Solo se incluyeron ${porcentajeCategoria}% de tópicos de ${categoria}`);
        }
      });
      
      if (porcentajeUrgentes < 70) {
        console.warn(`⚠️ ADVERTENCIA: Solo se incluyeron ${porcentajeUrgentes}% de tópicos urgentes. Considera incluir más tópicos críticos.`);
      } else if (porcentajeUrgentes >= 90) {
        console.log(`✅ EXCELENTE: Se incluyeron ${porcentajeUrgentes}% de tópicos urgentes (muy completo)`);
      } else {
        console.log(`✅ BUENO: Se incluyeron ${porcentajeUrgentes}% de tópicos urgentes (cobertura adecuada)`);
      }
      
      if (topicosUrgentes.length > 0 && topicosUrgentesIncluidos.length < topicosUrgentes.length) {
        const topicosUrgentesFaltantes = topicosUrgentes.filter(t => !topicosUrgentesIncluidos.includes(t));
        console.log(`   📋 Tópicos urgentes no incluidos (para referencia):`, 
          topicosUrgentesFaltantes
            .slice(0, 5)
            .map(t => `- ${t.topico} (${t.categoria}, ${t.frecuenciaAbsoluta} persona${t.frecuenciaAbsoluta > 1 ? 's' : ''})`)
            .join(', ')
        );
      }

      // Guardar plan estructurado ANTES de retornar
      await guardarPlanEstructurado(planEstructurado, planData);

      console.log('✅ Plan de capacitación estructurado generado exitosamente (usando fetch directo)');
      return { plan: planEstructurado, error: null };
    }

  } catch (error: any) {
    console.error('❌ Error generando plan estructurado con IA:', error);
    
    // Mensaje de error más amigable
    let errorMessage = 'Error al generar plan de capacitación con IA';
    if (error.message?.includes('no está desplegada') || error.message?.includes('404')) {
      errorMessage = 'La Edge Function "generate-training-plan" no está desplegada en Supabase. Por favor, despliégala desde el Dashboard de Supabase (Edge Functions > Create function) o contacta al administrador.';
    } else if (error.message?.includes('API key') || error.message?.includes('OPENAI_API_KEY')) {
      errorMessage = 'API key de OpenAI no configurada en Supabase. Por favor, contacta al administrador del sistema.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      plan: null,
      error: {
        message: errorMessage,
        details: error.stack,
        code: error.message?.includes('no está desplegada') || error.message?.includes('404') ? 'FUNCTION_NOT_DEPLOYED' : 
              error.message?.includes('API key') || error.message?.includes('OPENAI_API_KEY') ? 'API_KEY_MISSING' : undefined
      }
    };
  }
}

/**
 * Valida el plan generado por la IA para verificar completitud y especificidad de participantes
 */
function validarPlanGenerado(
  plan: PlanCapacitacionEstructurado,
  topicosOriginales: Array<{
    topico: string;
    prioridad: string;
    frecuenciaPorcentual: number;
    colaboradoresIds?: string[];
    colaboradoresInfo?: Array<{
      id: string;
      nivel: string;
      cargo: string;
      categoriaPuesto: string;
      nombre?: string;
      area?: string;
      departamento?: string;
    }>;
  }>,
  tematicasPreAgrupadas: import('./types/trainingPlan').TematicaPreAgrupada[],
  totalColaboradores: number
): {
  valido: boolean;
  errores: string[];
  advertencias: string[];
} {
  const errores: string[] = [];
  const advertencias: string[] = [];

  // 1. Validar completitud: Todos los tópicos urgentes están incluidos
  const topicosUrgentes = topicosOriginales.filter(t => t.prioridad === 'urgente');
  const topicosIncluidos = new Set<string>();
  
  // Recopilar tópicos incluidos del plan
  if (plan.programaCapacitacion) {
    plan.programaCapacitacion.forEach(cap => {
      if (Array.isArray(cap.temas)) {
        cap.temas.forEach(tema => topicosIncluidos.add(tema.toLowerCase().trim()));
      }
    });
  }
  if (plan.tematicas) {
    plan.tematicas.forEach(tem => {
      if (Array.isArray(tem.temas)) {
        tem.temas.forEach(tema => topicosIncluidos.add(tema.toLowerCase().trim()));
      }
    });
  }

  topicosUrgentes.forEach(topico => {
    const topicoNorm = topico.topico.toLowerCase().trim();
    let encontrado = false;
    
    // Buscar en tópicos incluidos
    topicosIncluidos.forEach(incluido => {
      if (incluido.includes(topicoNorm) || topicoNorm.includes(incluido)) {
        encontrado = true;
      }
    });
    
    if (!encontrado) {
      errores.push(`Tópico urgente "${topico.topico}" no está incluido en el plan`);
    }
  });

  // 2. Validar especificidad de participantes
  if (plan.programaCapacitacion) {
    plan.programaCapacitacion.forEach((cap, idx) => {
      const participantes = cap.participantes || '';
      const participantesLower = participantes.toLowerCase();
      
      // Verificar si usa "todo el equipo" cuando no debería
      if (participantesLower.includes('todo el equipo') || participantesLower.includes('todos')) {
        // Buscar si hay temática pre-agrupada correspondiente
        const tematicaPreAgrupada = tematicasPreAgrupadas.find(t => 
          t.topicosIncluidos.some(topic => 
            cap.temas?.some(ct => ct.toLowerCase().includes(topic.toLowerCase()))
          )
        );
        
        if (tematicaPreAgrupada) {
          // Verificar frecuencia de la temática pre-agrupada
          if (tematicaPreAgrupada.frecuenciaPorcentual < 95) {
            errores.push(
              `Capacitación "${cap.capacitacion}" usa "Todo el equipo" pero la frecuencia es ${tematicaPreAgrupada.frecuenciaPorcentual}% (menor al 95%)`
            );
          }
        } else {
          // Buscar en tópicos individuales
          const topicoRelacionado = topicosOriginales.find(t => 
            cap.temas?.some(ct => ct.toLowerCase().includes(t.topico.toLowerCase()))
          );
          
          if (topicoRelacionado && topicoRelacionado.frecuenciaPorcentual < 95) {
            errores.push(
              `Capacitación "${cap.capacitacion}" usa "Todo el equipo" pero la frecuencia del tópico es ${topicoRelacionado.frecuenciaPorcentual}% (menor al 95%)`
            );
          }
        }
      }
      
      // Verificar que participantes sea específico (no solo "todos")
      if (participantesLower.includes('todo') && !participantesLower.includes('nivel') && !participantesLower.includes('cargo')) {
        advertencias.push(
          `Capacitación "${cap.capacitacion}" podría ser más específica en participantes (actual: "${participantes}")`
        );
      }
      
      // Validar que los participantes mencionados existan en los datos reales
      if (cap.temas && cap.temas.length > 0) {
        const topicoRelacionado = topicosOriginales.find(t => 
          cap.temas?.some(ct => ct.toLowerCase().includes(t.topico.toLowerCase()))
        );
        
        if (topicoRelacionado && topicoRelacionado.colaboradoresInfo && topicoRelacionado.colaboradoresInfo.length > 0) {
          // Extraer áreas mencionadas en participantes
          const areasMencionadas = new Set<string>();
          const nivelesMencionados = new Set<string>();
          const cargosMencionados = new Set<string>();
          
          // Buscar áreas, niveles y cargos en la descripción de participantes
          if (participantesLower.includes('área') || participantesLower.includes('departamento')) {
            // Intentar extraer área mencionada
            const matchArea = participantes.match(/(?:área|departamento)[\s:]+([^,(\n]+)/i);
            if (matchArea) {
              areasMencionadas.add(matchArea[1].trim());
            }
          }
          
          // Buscar niveles mencionados
          const matchNivel = participantes.match(/nivel\s+([A-Z0-9]+)/i);
          if (matchNivel) {
            nivelesMencionados.add(matchNivel[1].trim());
          }
          
          // Verificar que las áreas/niveles mencionados existan en los datos reales
          const areasReales = new Set(topicoRelacionado.colaboradoresInfo.map(c => c.area).filter(Boolean));
          const nivelesReales = new Set(topicoRelacionado.colaboradoresInfo.map(c => c.nivel).filter(Boolean));
          
          areasMencionadas.forEach(area => {
            if (!areasReales.has(area) && !Array.from(areasReales).some(a => a?.toLowerCase().includes(area.toLowerCase()))) {
              advertencias.push(
                `Capacitación "${cap.capacitacion}" menciona área "${area}" que no coincide exactamente con los datos reales (áreas disponibles: ${Array.from(areasReales).join(', ')})`
              );
            }
          });
          
          nivelesMencionados.forEach(nivel => {
            if (!nivelesReales.has(nivel)) {
              advertencias.push(
                `Capacitación "${cap.capacitacion}" menciona nivel "${nivel}" que no existe en los datos reales (niveles disponibles: ${Array.from(nivelesReales).join(', ')})`
              );
            }
          });
        }
      }
    });
  }

  // 3. Validar consistencia: Participantes de temáticas pre-agrupadas no fueron cambiados
  if (plan.programaCapacitacion && tematicasPreAgrupadas.length > 0) {
    tematicasPreAgrupadas.forEach(tematicaPre => {
      const capacitacionCorrespondiente = plan.programaCapacitacion?.find(cap => 
        tematicaPre.topicosIncluidos.some(topic => 
          cap.temas?.some(ct => ct.toLowerCase().includes(topic.toLowerCase()))
        )
      );
      
      if (capacitacionCorrespondiente) {
        const participantesPlan = capacitacionCorrespondiente.participantes || '';
        const participantesPreAgrupados = tematicaPre.participantesDescripcion || '';
        
        // Verificar si los participantes fueron cambiados significativamente
        if (participantesPlan.toLowerCase() !== participantesPreAgrupados.toLowerCase()) {
          // Permitir variaciones menores pero alertar sobre cambios significativos
          const cambioSignificativo = 
            (participantesPreAgrupados.includes('Todo el equipo') && !participantesPlan.includes('Todo el equipo')) ||
            (!participantesPreAgrupados.includes('Todo el equipo') && participantesPlan.includes('Todo el equipo')) ||
            (participantesPreAgrupados.match(/\d+/)?.[0] !== participantesPlan.match(/\d+/)?.[0]);
          
          if (cambioSignificativo) {
            advertencias.push(
              `Los participantes de la temática "${tematicaPre.nombre}" fueron modificados. Original: "${participantesPreAgrupados}", Actual: "${participantesPlan}"`
            );
          }
        }
      }
    });
  }

  // 4. Validar estructura: Plan tiene secciones requeridas
  if (!plan.programaCapacitacion || plan.programaCapacitacion.length === 0) {
    if (!plan.tematicas || plan.tematicas.length === 0) {
      errores.push('El plan no tiene programa de capacitación ni temáticas definidas');
    } else {
      advertencias.push('El plan no tiene programaCapacitacion, solo tematicas (formato legacy)');
    }
  } else {
    // Validar que haya suficientes capacitaciones (no solo 1-2)
    if (plan.programaCapacitacion.length < 3) {
      advertencias.push(`El plan solo tiene ${plan.programaCapacitacion.length} capacitación(es) - debería tener más para cubrir todos los tópicos`);
    }
  }
  
  // Validar objetivos
  if (!plan.objetivoGeneral && (!plan.objetivosEspecificos || plan.objetivosEspecificos.length === 0)) {
    errores.push('El plan no tiene objetivos definidos (objetivoGeneral u objetivosEspecificos)');
  }
  
  // Validar cronograma
  if (!plan.cronograma || plan.cronograma.length === 0) {
    errores.push('El plan no tiene cronograma definido');
  } else {
    // Validar que el cronograma tenga suficientes actividades
    if (plan.cronograma.length < 3) {
      advertencias.push(`El cronograma solo tiene ${plan.cronograma.length} actividad(es) - debería tener más para cubrir todo el año`);
    }
  }
  
  // Validar justificación
  if (!plan.justificacion || plan.justificacion.trim().length === 0) {
    advertencias.push('El plan no tiene justificación definida');
  }
  
  // Validar metodología
  if (!plan.metodologia || plan.metodologia.trim().length === 0) {
    advertencias.push('El plan no tiene metodología definida');
  }

  return {
    valido: errores.length === 0,
    errores,
    advertencias,
  };
}

/**
 * Parsea la respuesta de la Edge Function a un PlanCapacitacionEstructurado
 */
function parseTrainingPlanResponse(planData: any): PlanCapacitacionEstructurado {
  try {
    // Si ya viene como objeto, usarlo directamente
    const parsed = typeof planData === 'string' ? JSON.parse(planData) : planData;

    return {
      // Formato profesional nuevo (prioritario)
      informacionGeneral: parsed.informacionGeneral,
      justificacion: parsed.justificacion,
      objetivoGeneral: parsed.objetivoGeneral,
      objetivosEspecificos: parsed.objetivosEspecificos || [],
      deteccionNecesidades: parsed.deteccionNecesidades || [],
      programaCapacitacion: parsed.programaCapacitacion || [],
      metodologia: parsed.metodologia,
      evaluacionSeguimiento: parsed.evaluacionSeguimiento || [],
      indicadoresExito: parsed.indicadoresExito || [],
      
      // Formato legacy (mantener para compatibilidad)
      objetivos: parsed.objetivos || [],
      tematicas: parsed.tematicas || [], // Nuevo formato: temáticas agrupadas
      actividades: parsed.actividades || [], // Formato legacy: mantener para compatibilidad
      cronograma: parsed.cronograma || [],
      recursos: parsed.recursos || [],
      metricasExito: parsed.metricasExito || [],
      estrategiaImplementacion: parsed.estrategiaImplementacion || "Estrategia de implementación a definir.",
      fechaGeneracion: parsed.fechaGeneracion || new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error parsing training plan response:", error);
    throw error;
  }
}
