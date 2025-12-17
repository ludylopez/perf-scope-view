import { supabase } from "@/integrations/supabase/client";
import { getEvaluationsForPeriod } from "@/lib/statisticalAnalysis";
import { scoreToPercentage } from "@/lib/calculations";
import {
  mean,
  median,
  standardDeviation,
  skewness,
  kurtosis,
  pearsonCorrelation,
  getCorrelationInterpretation,
  generateStatisticalSummary,
  calculateGapAnalysis,
  percentile,
  interquartileRange,
  detectOutliersIQR,
  calculateRiskScore,
  kMeansClustering,
  standardize,
  percentileRanks,
  type RiskFactor,
} from "@/lib/advancedStatistics";
import type { ParticipacionNivel, ScatterPoint, TreemapNode } from "@/types/analisis";
import { CATEGORIAS_CALIFICACION, COLORES_9BOX } from "@/types/analisis";
import { NINE_BOX_METADATA, type NineBoxPosition } from "@/lib/nineBoxMetadata";

export type ReportSource =
  | "evaluation_periods"
  | "users"
  | "evaluations"
  | "final_evaluation_results"
  | "job_levels"
  | "development_plans";

export interface ReportSection {
  id: string;
  title: string;
  sources: ReportSource[];
  content: {
    paragraphs: string[];
    bullets?: string[];
    tables?: Array<{
      title: string;
      columns: string[];
      rows: Array<(string | number | null)[]>;
    }>;
  };
}

export interface ReportMetrics {
  periodo: { id: string; nombre: string };
  fetchedAtISO: string;

  coverage: {
    totalActivos: number;
    totalEvaluados: number;
    tasaParticipacion: number; // 0-100
    totalAutoEnviadas: number;
    totalJefeEnviadas: number;
  };

  desempeno: {
    n: number;
    promedio: number;
    mediana: number;
    desviacion: number;
    skewness: number;
    kurtosis: number;
    pctExcelente: number; // >= 90
    pctInsatisfactorio: number; // < 60
  };

  potencial?: {
    n: number;
    promedio: number;
  };

  brechaAutoJefe: {
    promedioAuto: number; // 0-100
    promedioJefe: number; // 0-100
    brecha: number; // (Jefe - Auto) en puntos porcentuales
    correlacion: number; // Pearson sobre pares
    correlacionInterpretacion: ReturnType<typeof getCorrelationInterpretation>;
  };

  segmentacion: {
    porNivel: Array<{ nivel: string; n: number; promedioDesempeno: number; promedioPotencial?: number }>;
    porDireccion: Array<{ direccion: string; n: number; promedioDesempeno: number; promedioPotencial?: number }>;
    porTipoPuesto: Array<{ tipo: string; n: number; promedioDesempeno: number }>;
  };

  distribucion9Box: Record<string, number>;

  pdi?: {
    totalPlanes: number;
    coberturaSobreEvaluados: number; // 0-100
  };
}

export interface ReportDoc {
  meta?: ReportMeta;
  metrics: ReportMetrics;
  executive: {
    headline: string;
    highlights: string[];
    risks: string[];
    recommendations: string[];
    nextSteps306090: {
      d30: string[];
      d60: string[];
      d90: string[];
    };
  };
  sections: ReportSection[];
  artifacts?: ReportArtifacts;
  markdown: string;
}

export interface ReportMeta {
  entidad: string;
  titulo: string;
  anio: number;
}

export interface ReportArtifacts {
  qa: {
    resultadosSinPotencial: number;
    resultadosSin9Box: number;
    usuariosSinNivel: number;
    usuariosSinDireccion: number;
  };
  participacionPorNivel: ParticipacionNivel[];
  distribucionDesempeno: Array<{ categoria: string; rango: string; cantidad: number }>;
  nineBoxTreemap: TreemapNode[];
  scatterAutoVsJefe: ScatterPoint[]; // x=Auto, y=Jefe
  scatterDesempenoVsPotencial: ScatterPoint[]; // x=Desempeño, y=Potencial
  rankingDirecciones: Array<{
    direccion: string;
    totalColaboradores: number;
    evaluados: number;
    tasaParticipacion: number;
    promedioDesempeno: number;
    promedioPotencial?: number;
  }>;
  dimensiones: {
    totalCategorias: number;
    fortalezas: Array<{ nombre: string; promedio: number }>;
    oportunidades: Array<{ nombre: string; promedio: number }>;
    criticas: Array<{ nombre: string; promedio: number }>;
    radar: Array<{ nombre: string; valor: number; clasificacion: "fortaleza" | "oportunidad" | "critica" }>;
    lollipop: Array<{ label: string; value: number; baseline?: number; color?: string }>;
    interpretacion: {
      titulo: string;
      descripcion: string;
      hallazgos: string[];
      recomendaciones?: string[];
      nivel: "positivo" | "neutral" | "atencion" | "critico";
    };
  };
  nineBox: {
    total: number;
    sinCalcular: number;
    matrix: {
      // Filas: potencial (alto, medio, bajo). Columnas: desempeño (bajo, medio, alto)
      rows: Array<{
        potencial: "alto" | "medio" | "bajo";
        cols: Array<{
          desempeno: "bajo" | "medio" | "alto";
          position: NineBoxPosition;
          label: string;
          shortName: string;
          count: number;
        }>;
      }>;
    };
    byPosition: Record<NineBoxPosition, EmployeeRow[]>;
    sin_calcular: EmployeeRow[];
  };
  dependencias: Array<{
    dependencia: string;
    n: number;
    promedioDesempeno: number;
    promedioPotencial: number | null;
    empleados: EmployeeRow[];
  }>;
  instrumentosPorNivel: Array<{
    nivel: string;
    nivelNombre: string;
    instrumentId: string;
    activo: boolean;
    pesos: { jefe: number; auto: number };
    desempeno: {
      totalDimensiones: number;
      totalItems: number;
      dimensiones: Array<{
        id: string;
        nombre: string;
        descripcion?: string;
        peso: number;
        itemsCount: number;
        items: Array<{ orden: number; id: string; texto: string }>;
      }>;
    };
    potencial: {
      aplica: boolean;
      totalDimensiones: number;
      totalItems: number;
      dimensiones: Array<{
        id: string;
        nombre: string;
        descripcion?: string;
        peso: number;
        itemsCount: number;
        items: Array<{ orden: number; id: string; texto: string }>;
      }>;
    };
    explicacion: {
      comoSeResponde: string[];
      comoSeCalcula: string[];
    };
  }>;

  // === NUEVAS SECCIONES AVANZADAS ===

  // Análisis por Nivel Jerárquico
  analisisPorNivel: Array<{
    nivel: string;
    nombre: string;
    n: number;
    promedioDesempeno: number;
    mediana: number;
    desviacion: number;
    min: number;
    max: number;
    q1: number;
    q3: number;
    ranking: number;
  }>;

  // Análisis Demográfico
  demografico: {
    porEdad: Array<{ rango: string; n: number; promedio: number }>;
    porAntiguedad: Array<{ rango: string; n: number; promedio: number }>;
    correlacionEdad: number;
    correlacionAntiguedad: number;
    interpretacionEdad: string;
    interpretacionAntiguedad: string;
  };

  // Análisis de Outliers
  outliers: {
    altoRendimiento: Array<{ dpi: string; nombre: string; direccion: string; desempeno: number; zScore: number }>;
    bajoRendimiento: Array<{ dpi: string; nombre: string; direccion: string; desempeno: number; zScore: number }>;
    bounds: { lowerMild: number; upperMild: number };
    stats: { total: number; outliersAltos: number; outliersBajos: number; porcentaje: number };
    interpretacion: string;
  };

  // Análisis de Riesgo de Rotación
  riesgoRotacion: {
    distribucion: { bajo: number; medio: number; alto: number; critico: number };
    topRiesgo: Array<{
      dpi: string;
      nombre: string;
      direccion: string;
      riskScore: number;
      riskLevel: string;
      factoresPrincipales: string[];
    }>;
    porDireccion: Array<{ direccion: string; n: number; promedioRiesgo: number; criticos: number }>;
    interpretacion: string;
  };

  // Liderazgo en Cascada
  liderazgoCascada: {
    correlacionJefeEquipo: number;
    interpretacion: string;
    jefesConEquipo: Array<{
      jefeId: string;
      jefeNombre: string;
      desempenoJefe: number;
      promedioEquipo: number;
      tamanoEquipo: number;
      diferencia: number;
    }>;
    resumen: { jefesAnalizados: number; equiposTotales: number; correlacionFuerte: boolean };
  };

  // Clustering de Perfiles
  perfiles: {
    clusters: Array<{
      id: number;
      nombre: string;
      descripcion: string;
      n: number;
      centroide: { desempeno: number; potencial: number };
      color: string;
    }>;
    distribucion: Array<{ perfil: string; porcentaje: number }>;
    interpretacion: string;
  };

  // Benchmarking Interno por Dirección
  benchmarking: {
    ranking: Array<{
      direccion: string;
      n: number;
      promedio: number;
      zScore: number;
      percentil: number;
      clasificacion: "top" | "promedio" | "bajo";
    }>;
    mejorDireccion: { nombre: string; promedio: number };
    peorDireccion: { nombre: string; promedio: number };
    brechaMaxima: number;
    interpretacion: string;
  };

  // Necesidades de Capacitación
  capacitacion: {
    temasPrioritarios: Array<{ tema: string; brecha: number; afectados: number; prioridad: "alta" | "media" | "baja" }>;
    porDireccion: Array<{ direccion: string; temasIdentificados: number; prioridad: string }>;
    resumen: string;
  };
}

export interface EmployeeRow {
  dpi: string;
  nombre: string;
  cargo?: string;
  nivel?: string;
  dependencia?: string;
  desempeno: number | null; // 0-100
  potencial: number | null; // 0-100
  posicion9Box: string | null;
}

function round(value: number, decimals = 1): number {
  if (!isFinite(value)) return 0;
  const p = Math.pow(10, decimals);
  return Math.round(value * p) / p;
}

function pct(part: number, total: number, decimals = 1): number {
  if (total <= 0) return 0;
  return round((part / total) * 100, decimals);
}

function safeString(v: unknown, fallback = "Sin dato"): string {
  if (typeof v === "string" && v.trim()) return v.trim();
  return fallback;
}

function groupBy<T>(items: T[], keyFn: (t: T) => string): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const key = keyFn(item) || "Sin dato";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

export async function fetchReportDataset(periodoId: string) {
  const fetchedAtISO = new Date().toISOString();

  const [
    { data: periodRow },
    { data: users },
    { data: results },
    { data: jobLevels },
    { data: plans },
    { data: instrumentConfigs },
    { data: userAssignments },
  ] = await Promise.all([
    supabase.from("evaluation_periods").select("*").eq("id", periodoId).maybeSingle(),
    // Importante: usar select("*") para evitar fallar si el esquema de usuarios cambia (Municipalidades suelen agregar campos).
    supabase.from("users").select("*"),
    supabase
      .from("final_evaluation_results")
      .select("*")
      .eq("periodo_id", periodoId),
    supabase.from("job_levels").select("code,name,category,hierarchical_order"),
    supabase.from("development_plans").select("id,colaborador_id,periodo_id").eq("periodo_id", periodoId),
    // Importante: traer el instrumento completo para poder renderizar el "instrumento literal" (ítems con texto/orden)
    supabase.from("instrument_configs").select("*").eq("activo", true),
    // Asignaciones jefe-colaborador para análisis de liderazgo en cascada
    supabase.from("user_assignments").select("colaborador_id, jefe_id").eq("activo", true),
  ]);

  const evaluationsWithScore = await getEvaluationsForPeriod(periodoId);

  return {
    fetchedAtISO,
    periodo: { id: periodoId, nombre: (periodRow as any)?.nombre || periodoId },
    users: users || [],
    results: results || [],
    jobLevels: jobLevels || [],
    evaluationsWithScore,
    plans: plans || [],
    instrumentConfigs: instrumentConfigs || [],
    userAssignments: userAssignments || [],
  };
}

export function computeReportMetrics(dataset: Awaited<ReturnType<typeof fetchReportDataset>>): ReportMetrics {
  const { periodo, fetchedAtISO, users, results, evaluationsWithScore, plans } = dataset;

  const activos = users.filter((u: any) => (u.estado || "activo") === "activo");
  const totalActivos = activos.length;
  const totalEvaluados = results.length;
  const tasaParticipacion = pct(totalEvaluados, totalActivos, 1);

  const totalAutoEnviadas = evaluationsWithScore.filter((e) => e.tipo === "auto").length;
  const totalJefeEnviadas = evaluationsWithScore.filter((e) => e.tipo === "jefe").length;

  const desempenoVals = results
    .map((r: any) => r.desempeno_porcentaje as number | null)
    .filter((v): v is number => typeof v === "number" && v > 0);

  const promedio = mean(desempenoVals);
  const med = median(desempenoVals);
  const std = standardDeviation(desempenoVals);
  const sk = skewness(desempenoVals);
  const ku = kurtosis(desempenoVals);

  const pctExcelente = pct(desempenoVals.filter((v) => v >= 90).length, desempenoVals.length, 1);
  const pctInsatisfactorio = pct(desempenoVals.filter((v) => v < 60).length, desempenoVals.length, 1);

  const potencialVals = results
    .map((r: any) => r.potencial_porcentaje as number | null)
    .filter((v): v is number => typeof v === "number" && v > 0);

  // Brecha auto vs jefe (promedios)
  const autoScoresPct = evaluationsWithScore
    .filter((e) => e.tipo === "auto")
    .map((e) => scoreToPercentage(e.score));
  const jefeScoresPct = evaluationsWithScore
    .filter((e) => e.tipo === "jefe")
    .map((e) => scoreToPercentage(e.score));

  const promedioAuto = mean(autoScoresPct);
  const promedioJefe = mean(jefeScoresPct);

  // Brecha por pares (correlación)
  const autoMap = new Map<string, number>();
  const jefeMap = new Map<string, number[]>();
  evaluationsWithScore.forEach((ev) => {
    const pctScore = scoreToPercentage(ev.score);
    if (ev.tipo === "auto") {
      autoMap.set(ev.usuario_id, pctScore);
    } else if (ev.tipo === "jefe" && ev.colaborador_id) {
      if (!jefeMap.has(ev.colaborador_id)) jefeMap.set(ev.colaborador_id, []);
      jefeMap.get(ev.colaborador_id)!.push(pctScore);
    }
  });
  const pairedAuto: number[] = [];
  const pairedJefe: number[] = [];
  for (const [dpi, a] of autoMap.entries()) {
    const jArr = jefeMap.get(dpi);
    if (jArr && jArr.length > 0) {
      pairedAuto.push(a);
      pairedJefe.push(mean(jArr));
    }
  }
  const corr = pearsonCorrelation(pairedAuto, pairedJefe);
  const corrInterp = getCorrelationInterpretation(corr);

  // Distribución 9box
  const distribucion9Box = results.reduce((acc: Record<string, number>, r: any) => {
    const key = r.posicion_9box ? String(r.posicion_9box) : "sin_calcular";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  // Segmentación por nivel/dirección/tipo_puesto (sobre desempeño)
  const userByDpi = new Map<string, any>((users || []).map((u: any) => [u.dpi, u]));
  const resultRows = results
    .map((r: any) => {
      const u = userByDpi.get(r.colaborador_id);
      return {
        colaborador_id: r.colaborador_id,
        desempeno: typeof r.desempeno_porcentaje === "number" ? r.desempeno_porcentaje : null,
        potencial: typeof r.potencial_porcentaje === "number" ? r.potencial_porcentaje : null,
        nivel: u?.nivel,
        direccion: u?.direccion_unidad || u?.area,
        tipo_puesto: u?.tipo_puesto,
      };
    })
    .filter((x) => typeof x.desempeno === "number" && (x.desempeno as number) > 0);

  const byNivel = groupBy(resultRows, (r) => safeString(r.nivel, "Sin nivel"));
  const porNivel = Object.entries(byNivel)
    .map(([nivel, rows]) => ({
      nivel,
      n: rows.length,
      promedioDesempeno: round(mean(rows.map((r) => r.desempeno as number)), 1),
      promedioPotencial: rows.some((r) => typeof r.potencial === "number")
        ? round(mean(rows.map((r) => (typeof r.potencial === "number" ? r.potencial : 0)).filter((v) => v > 0)), 1)
        : undefined,
    }))
    .sort((a, b) => b.promedioDesempeno - a.promedioDesempeno);

  const byDir = groupBy(resultRows, (r) => safeString(r.direccion, "Sin dirección"));
  const porDireccion = Object.entries(byDir)
    .map(([direccion, rows]) => ({
      direccion,
      n: rows.length,
      promedioDesempeno: round(mean(rows.map((r) => r.desempeno as number)), 1),
      promedioPotencial: rows.some((r) => typeof r.potencial === "number")
        ? round(mean(rows.map((r) => (typeof r.potencial === "number" ? r.potencial : 0)).filter((v) => v > 0)), 1)
        : undefined,
    }))
    .sort((a, b) => b.promedioDesempeno - a.promedioDesempeno);

  const byTipo = groupBy(resultRows, (r) => safeString(r.tipo_puesto, "Sin tipo"));
  const porTipoPuesto = Object.entries(byTipo)
    .map(([tipo, rows]) => ({
      tipo,
      n: rows.length,
      promedioDesempeno: round(mean(rows.map((r) => r.desempeno as number)), 1),
    }))
    .sort((a, b) => b.promedioDesempeno - a.promedioDesempeno);

  const pdiTotal = plans.length;
  const pdiCobertura = pct(pdiTotal, totalEvaluados, 1);

  return {
    periodo,
    fetchedAtISO,
    coverage: {
      totalActivos,
      totalEvaluados,
      tasaParticipacion,
      totalAutoEnviadas,
      totalJefeEnviadas,
    },
    desempeno: {
      n: desempenoVals.length,
      promedio: round(promedio, 1),
      mediana: round(med, 1),
      desviacion: round(std, 1),
      skewness: round(sk, 3),
      kurtosis: round(ku, 3),
      pctExcelente,
      pctInsatisfactorio,
    },
    potencial: potencialVals.length
      ? {
          n: potencialVals.length,
          promedio: round(mean(potencialVals), 1),
        }
      : undefined,
    brechaAutoJefe: {
      promedioAuto: round(promedioAuto, 1),
      promedioJefe: round(promedioJefe, 1),
      brecha: round(promedioJefe - promedioAuto, 1),
      correlacion: round(corr, 3),
      correlacionInterpretacion: corrInterp,
    },
    segmentacion: {
      porNivel,
      porDireccion,
      porTipoPuesto,
    },
    distribucion9Box,
    pdi: totalEvaluados > 0 ? { totalPlanes: pdiTotal, coberturaSobreEvaluados: pdiCobertura } : undefined,
  };
}

export function generateNarrative(metrics: ReportMetrics): ReportDoc["executive"] {
  const { coverage, desempeno, potencial, brechaAutoJefe, segmentacion, pdi } = metrics;

  const highlights: string[] = [];
  const risks: string[] = [];
  const recommendations: string[] = [];

  // Cobertura
  highlights.push(
    `Cobertura del período: ${coverage.totalEvaluados} evaluados de ${coverage.totalActivos} activos (${coverage.tasaParticipacion.toFixed(
      1
    )}%).`
  );
  if (coverage.tasaParticipacion < 70) {
    risks.push("Participación menor al 70%: riesgo de representatividad y sesgo en conclusiones por segmento.");
    recommendations.push("Ejecutar plan de cierre/corrección de participación y validar elegibilidad/asignaciones antes del próximo corte.");
  }

  // Desempeño
  highlights.push(
    `Desempeño organizacional: promedio ${desempeno.promedio.toFixed(1)}%, mediana ${desempeno.mediana.toFixed(
      1
    )}%, desviación ${desempeno.desviacion.toFixed(1)} puntos.`
  );
  if (desempeno.desviacion > 15) {
    risks.push("Alta dispersión de desempeño: posible heterogeneidad real y/o criterios de evaluación no calibrados.");
    recommendations.push("Implementar calibración de evaluadores por dirección/nivel y guía de criterios con ejemplos.");
  }
  if (desempeno.pctInsatisfactorio >= 10) {
    risks.push(`Proporción relevante bajo 60% (${desempeno.pctInsatisfactorio.toFixed(1)}%): requiere plan de intervención priorizado.`);
    recommendations.push("Definir ruta de mejora y seguimiento trimestral para casos <60% (coaching + PDI + control de avance).");
  }
  if (desempeno.pctExcelente >= 20) {
    highlights.push(`Talento destacado: ${desempeno.pctExcelente.toFixed(1)}% en rango excelente (≥90%).`);
    recommendations.push("Implementar estrategia de reconocimiento/retención y apalancar buenas prácticas (mentoría interna).");
  }

  // Potencial (si existe)
  if (potencial) {
    highlights.push(`Potencial: promedio ${potencial.promedio.toFixed(1)}% (n=${potencial.n}).`);
  } else {
    risks.push("No se detectó potencial en resultados (campo potencial_porcentaje vacío o no calculado).");
    recommendations.push("Asegurar captura/cálculo de potencial para alimentar 9-Box y planes de sucesión.");
  }

  // Brecha auto-jefe
  highlights.push(
    `Brecha Auto vs Jefe: Auto ${brechaAutoJefe.promedioAuto.toFixed(1)}% vs Jefe ${brechaAutoJefe.promedioJefe.toFixed(
      1
    )}% (Jefe−Auto=${brechaAutoJefe.brecha.toFixed(1)}). Correlación: ${brechaAutoJefe.correlacion.toFixed(3)} (${brechaAutoJefe.correlacionInterpretacion.strength}).`
  );
  if (Math.abs(brechaAutoJefe.brecha) > 5) {
    risks.push("Brecha Auto vs Jefe >5 puntos: indica desalineación de expectativas y criterios de evaluación.");
    recommendations.push("Estandarizar retroalimentación y reforzar sesiones 1:1 con criterios observables por dimensión.");
  }
  if (brechaAutoJefe.correlacion < 0.5) {
    risks.push("Correlación Auto-Jefe baja: sugiere inconsistencia de percepción o falta de criterios compartidos.");
    recommendations.push("Capacitar evaluadores y socializar ejemplos/anchor statements por nivel e instrumento.");
  }

  // Segmentación: top/bottom por dirección y nivel (si hay n mínimo)
  const topDir = segmentacion.porDireccion.filter((d) => d.n >= 5).slice(0, 3);
  const bottomDir = [...segmentacion.porDireccion].filter((d) => d.n >= 5).slice(-3);
  if (topDir.length) {
    highlights.push(
      `Top direcciones (n≥5): ${topDir.map((d) => `${d.direccion} (${d.promedioDesempeno.toFixed(1)}%)`).join("; ")}.`
    );
  }
  if (bottomDir.length) {
    risks.push(
      `Direcciones con mayor oportunidad (n≥5): ${bottomDir
        .map((d) => `${d.direccion} (${d.promedioDesempeno.toFixed(1)}%)`)
        .join("; ")}.`
    );
  }

  // PDI
  if (pdi) {
    highlights.push(`Planes de desarrollo (PDI): ${pdi.totalPlanes} (${pdi.coberturaSobreEvaluados.toFixed(1)}% sobre evaluados).`);
    if (pdi.coberturaSobreEvaluados < 70) {
      risks.push("Cobertura de PDI <70%: riesgo de que la evaluación no se traduzca en mejora sostenida.");
      recommendations.push("Establecer gobernanza de PDI (responsables, fechas de revisión, indicadores y evidencia).");
    }
  }

  // Doble lectura: riesgos y recomendaciones deben quedar siempre con al menos 3 items
  while (risks.length < 3) risks.push("Riesgo operativo: documentar y formalizar criterios/roles para sostener el proceso anual.");
  while (recommendations.length < 5) recommendations.push("Definir KPIs de seguimiento y tablero de control trimestral para RRHH y Gerencia.");

  const headline = `Informe ejecutivo del período: ${coverage.tasaParticipacion.toFixed(1)}% de participación, desempeño promedio ${desempeno.promedio.toFixed(
    1
  )}%.`;

  const nextSteps306090 = {
    d30: [
      "Validar cierre del dataset (corte de datos) y consolidar inconsistencias de participación/asignaciones.",
      "Aprobar Top 5 recomendaciones y responsables (RACI).",
      "Definir cohortes de intervención: <60%, 60–69%, 70–79%, ≥80%.",
    ],
    d60: [
      "Ejecutar calibración de evaluadores y guía de criterios por dimensión/nivel.",
      "Arrancar plan de capacitación priorizado por brechas y necesidad institucional.",
      "Operativizar seguimiento de PDI (cadencia, evidencias, bitácora).",
    ],
    d90: [
      "Medir avance (KPIs) y ajustar intervenciones por dirección/nivel.",
      "Formalizar procedimiento anual (gobernanza, calendario, auditoría).",
      "Preparar mejoras del próximo ciclo (instrumentos, comunicación, soporte).",
    ],
  };

  return { headline, highlights, risks, recommendations, nextSteps306090 };
}

function computeArtifacts(dataset: Awaited<ReturnType<typeof fetchReportDataset>>, metrics: ReportMetrics): ReportArtifacts {
  const users = dataset.users as any[];
  const results = dataset.results as any[];
  const jobLevels = dataset.jobLevels as any[];
  const instrumentConfigs = (dataset as any).instrumentConfigs as any[];
  const evals = dataset.evaluationsWithScore;

  const activos = users.filter((u) => (u.estado || "activo") === "activo");
  const userByDpi = new Map<string, any>(users.map((u) => [String(u.dpi), u]));
  const resultsByDpi = new Map<string, any>(results.map((r) => [String(r.colaborador_id), r]));

  const usuariosSinNivel = activos.filter((u) => !String(u.nivel || "").trim()).length;
  const usuariosSinDireccion = activos.filter((u) => !String(u.direccion_unidad || u.area || "").trim()).length;
  const resultadosSinPotencial = results.filter((r) => !(typeof r.potencial_porcentaje === "number" && r.potencial_porcentaje > 0)).length;
  const resultadosSin9Box = results.filter((r) => !String(r.posicion_9box || "").trim()).length;

  // Participación por nivel (desde activos, evaluados desde resultados finales)
  const totalPorNivel: Record<string, number> = {};
  activos.forEach((u) => {
    const nivel = String(u.nivel || "Sin nivel").trim() || "Sin nivel";
    totalPorNivel[nivel] = (totalPorNivel[nivel] || 0) + 1;
  });
  const evaluadosPorNivel: Record<string, number> = {};
  results.forEach((r) => {
    const u = userByDpi.get(String(r.colaborador_id));
    const nivel = String(u?.nivel || "Sin nivel").trim() || "Sin nivel";
    evaluadosPorNivel[nivel] = (evaluadosPorNivel[nivel] || 0) + 1;
  });

  const levelNameByCode = new Map<string, string>();
  const levelOrderByCode = new Map<string, number>();
  jobLevels.forEach((l) => {
    const code = String(l.code);
    levelNameByCode.set(code, String(l.name || code));
    levelOrderByCode.set(code, typeof l.hierarchical_order === "number" ? l.hierarchical_order : 9999);
  });

  const participacionPorNivel: ParticipacionNivel[] = Object.keys(totalPorNivel).map((nivel) => {
    const total = totalPorNivel[nivel] || 0;
    const evaluados = evaluadosPorNivel[nivel] || 0;
    return {
      nivel,
      nombre: levelNameByCode.get(nivel) || nivel,
      total,
      evaluados,
      porcentaje: total > 0 ? round((evaluados / total) * 100, 1) : 0,
    };
  }).sort((a, b) => {
    const oa = levelOrderByCode.get(a.nivel) ?? 9999;
    const ob = levelOrderByCode.get(b.nivel) ?? 9999;
    if (oa !== ob) return oa - ob;
    return a.nombre.localeCompare(b.nombre);
  });

  // Distribución desempeño para gráfico (mismas categorías de dashboards)
  const desempenoVals = results
    .map((r) => r.desempeno_porcentaje as number | null)
    .filter((v): v is number => typeof v === "number" && v > 0);

  const distribucionDesempeno = CATEGORIAS_CALIFICACION.map((c) => {
    const cantidad = desempenoVals.filter((v) => v >= c.min && v <= c.max).length;
    return { categoria: c.categoria, rango: c.rango, cantidad };
  });

  // 9-box para treemap
  const nineBoxCounts: Record<string, number> = {};
  results.forEach((r) => {
    const key = String(r.posicion_9box || "sin_calcular").trim() || "sin_calcular";
    nineBoxCounts[key] = (nineBoxCounts[key] || 0) + 1;
  });
  const nineBoxTreemap: TreemapNode[] = Object.entries(nineBoxCounts)
    .map(([k, v]) => ({
      name: k,
      value: v,
      color: COLORES_9BOX[k] || undefined,
    }))
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  // Scatter Auto vs Jefe por colaborador (x=auto, y=jefe)
  const autoMap = new Map<string, number>();
  const jefeMap = new Map<string, number[]>();
  evals.forEach((ev) => {
    const scorePct = scoreToPercentage(ev.score);
    if (ev.tipo === "auto") {
      autoMap.set(String(ev.usuario_id), scorePct);
    } else if (ev.tipo === "jefe" && ev.colaborador_id) {
      const key = String(ev.colaborador_id);
      if (!jefeMap.has(key)) jefeMap.set(key, []);
      jefeMap.get(key)!.push(scorePct);
    }
  });
  const scatterAutoVsJefe: ScatterPoint[] = [];
  for (const [dpi, auto] of autoMap.entries()) {
    const jArr = jefeMap.get(dpi);
    if (!jArr || jArr.length === 0) continue;
    const jefe = mean(jArr);
    const u = userByDpi.get(dpi);
    const nombre = u ? `${String(u.nombre || "").trim()} ${String(u.apellidos || "").trim()}`.trim() : undefined;
    // Usar dirección como grupo (más legible que código de nivel)
    const group = String(u?.direccion_unidad || u?.area || "").trim() || undefined;
    scatterAutoVsJefe.push({ x: round(auto, 1), y: round(jefe, 1), label: nombre, group });
  }

  // Scatter Desempeño vs Potencial (desde resultados finales) - valores redondeados
  const scatterDesempenoVsPotencial: ScatterPoint[] = results
    .map((r) => {
      const desempeno = typeof r.desempeno_porcentaje === "number" ? r.desempeno_porcentaje : null;
      const potencial = typeof r.potencial_porcentaje === "number" ? r.potencial_porcentaje : null;
      if (desempeno === null || potencial === null || desempeno <= 0 || potencial <= 0) return null;
      const u = userByDpi.get(String(r.colaborador_id));
      const nombre = u ? `${String(u.nombre || "").trim()} ${String(u.apellidos || "").trim()}`.trim() : undefined;
      const group = String(u?.direccion_unidad || u?.area || "").trim() || undefined;
      return { x: round(desempeno, 1), y: round(potencial, 1), label: nombre, group } satisfies ScatterPoint;
    })
    .filter(Boolean) as ScatterPoint[];

  // Ranking direcciones con participación (usando activos por dirección)
  const activosPorDir: Record<string, number> = {};
  activos.forEach((u) => {
    const dir = String(u.direccion_unidad || u.area || "Sin dirección").trim() || "Sin dirección";
    activosPorDir[dir] = (activosPorDir[dir] || 0) + 1;
  });
  const evaluadosPorDir: Record<string, number> = {};
  const desempenoPorDir: Record<string, number[]> = {};
  const potencialPorDir: Record<string, number[]> = {};
  results.forEach((r) => {
    const u = userByDpi.get(String(r.colaborador_id));
    const dir = String(u?.direccion_unidad || u?.area || "Sin dirección").trim() || "Sin dirección";
    evaluadosPorDir[dir] = (evaluadosPorDir[dir] || 0) + 1;

    const d = typeof r.desempeno_porcentaje === "number" ? r.desempeno_porcentaje : null;
    if (typeof d === "number" && d > 0) {
      if (!desempenoPorDir[dir]) desempenoPorDir[dir] = [];
      desempenoPorDir[dir].push(d);
    }
    const p = typeof r.potencial_porcentaje === "number" ? r.potencial_porcentaje : null;
    if (typeof p === "number" && p > 0) {
      if (!potencialPorDir[dir]) potencialPorDir[dir] = [];
      potencialPorDir[dir].push(p);
    }
  });

  const rankingDirecciones = Object.keys(activosPorDir).map((dir) => {
    const totalColaboradores = activosPorDir[dir] || 0;
    const evaluados = evaluadosPorDir[dir] || 0;
    const tasaParticipacion = totalColaboradores > 0 ? round((evaluados / totalColaboradores) * 100, 1) : 0;
    const promD = desempenoPorDir[dir]?.length ? round(mean(desempenoPorDir[dir]), 1) : 0;
    const promP = potencialPorDir[dir]?.length ? round(mean(potencialPorDir[dir]), 1) : undefined;
    return { direccion: dir, totalColaboradores, evaluados, tasaParticipacion, promedioDesempeno: promD, promedioPotencial: promP };
  }).sort((a, b) => (b.promedioDesempeno - a.promedioDesempeno));

  // Dimensiones (consolidación compatible con lectura ejecutiva)
  const consolidateDimension = (nombre: string): string => {
    const n = String(nombre || "").trim();
    if (!n) return "Sin dimensión";
    const u = n.toUpperCase();

    if (u.includes("CONCEJO") || u.includes("SESIONES") || u.includes("COMISIONES") || u.includes("FISCALIZ") || u.includes("PRESUP")) return "Concejo Municipal";
    if (u.includes("PRODUCTIVIDAD") || u.includes("OBJETIVO") || u.includes("RESULTADO")) return "Productividad";
    if (u.includes("CALIDAD")) return "Calidad";
    if (u.includes("COMPETEN") || u.includes("CONOCIMIENT") || u.includes("HABILIDAD") || u.includes("CAPACIDAD")) return "Competencias";
    if (u.includes("COMPORTAMIENTO") || u.includes("ÉTICA") || u.includes("ETICA") || u.includes("DISCIPLINA") || u.includes("TRANSPARENCIA") || u.includes("PROBIDAD") || u.includes("COMPROMISO") || u.includes("RESPONSABIL")) return "Comportamiento";
    if (u.includes("RELACION") || u.includes("EQUIPO") || u.includes("PERSONAS") || u.includes("EMOCIONAL")) return "Relaciones";
    if (u.includes("LIDER") || u.includes("COORDIN") || u.includes("INFLUENC") || u.includes("DIRECCIÓN") || u.includes("DIRECCION")) return "Liderazgo";
    if (u.includes("SERVICIO") || u.includes("USUARIO") || u.includes("CIUDAD") || u.includes("SEGURIDAD") || u.includes("PROTOCO")) return "Servicio";
    if (u.includes("POTENCIAL") || u.includes("APRENDIZAJE") || u.includes("DESARROLLO") || u.includes("ADAPT") || u.includes("RESILIEN") || u.includes("CRECIMIENTO")) return "Potencial";
    if (u.includes("VISIÓN") || u.includes("VISION") || u.includes("ESTRATÉG") || u.includes("ESTRATEG") || u.includes("INNOV") || u.includes("DECISION") || u.includes("CAMBIO") || u.includes("COMPLEJ")) return "Visión Estratégica";

    return n.length > 28 ? `${n.substring(0, 25)}...` : n;
  };

  const itemToDimensionMap = new Map<string, string>();
  (instrumentConfigs || []).forEach((inst) => {
    const dims = inst?.dimensiones_desempeno as Array<{ id: string; nombre: string; items?: Array<{ id: string }> }> | null;
    if (!dims || !Array.isArray(dims)) return;
    dims.forEach((dim) => {
      if (!dim?.items || !Array.isArray(dim.items)) return;
      dim.items.forEach((item) => {
        if (item?.id) itemToDimensionMap.set(String(item.id), String(dim.nombre || dim.id || "Sin dimensión"));
      });
    });
  });

  const dimensionesRawMap: Record<string, { suma: number; count: number }> = {};
  const processResponses = (respuestas: Record<string, number> | null, peso: number) => {
    if (!respuestas || typeof respuestas !== "object") return;
    Object.entries(respuestas).forEach(([itemId, score]) => {
      if (typeof score !== "number") return;

      let dimension = itemToDimensionMap.get(itemId);
      if (!dimension && /^d\\d+_i\\d+$/.test(itemId)) {
        const dimNum = itemId.match(/^d(\\d+)_/)?.[1];
        if (dimNum) {
          for (const [key, dimName] of itemToDimensionMap.entries()) {
            if (key.startsWith(`d${dimNum}_`)) {
              dimension = dimName;
              break;
            }
          }
        }
      }
      if (!dimension) return;

      if (!dimensionesRawMap[dimension]) dimensionesRawMap[dimension] = { suma: 0, count: 0 };
      const porcentaje = ((score - 1) / 4) * 100;
      dimensionesRawMap[dimension].suma += porcentaje * peso;
      dimensionesRawMap[dimension].count += peso;
    });
  };

  evals.forEach((ev) => {
    const peso = ev.tipo === "jefe" ? 0.7 : 0.3;
    processResponses(ev.responses, peso);
  });

  const consolidatedMap: Record<string, { suma: number; count: number }> = {};
  Object.entries(dimensionesRawMap).forEach(([rawNombre, data]) => {
    if (data.count <= 0) return;
    const categoria = consolidateDimension(rawNombre);
    if (!consolidatedMap[categoria]) consolidatedMap[categoria] = { suma: 0, count: 0 };
    consolidatedMap[categoria].suma += data.suma;
    consolidatedMap[categoria].count += data.count;
  });

  const dims = Object.entries(consolidatedMap)
    .filter(([_, d]) => d.count > 0)
    .map(([nombre, d]) => {
      const promedio = d.suma / d.count;
      const clasificacion: "fortaleza" | "oportunidad" | "critica" =
        promedio >= 75 ? "fortaleza" : promedio >= 60 ? "oportunidad" : "critica";
      return { nombre, promedio, clasificacion };
    })
    .sort((a, b) => b.promedio - a.promedio);

  const fortalezas = dims.filter((d) => d.clasificacion === "fortaleza").map((d) => ({ nombre: d.nombre, promedio: round(d.promedio, 1) }));
  const oportunidades = dims.filter((d) => d.clasificacion === "oportunidad").map((d) => ({ nombre: d.nombre, promedio: round(d.promedio, 1) }));
  const criticas = dims.filter((d) => d.clasificacion === "critica").map((d) => ({ nombre: d.nombre, promedio: round(d.promedio, 1) }));

  const radar = dims.map((d) => ({ nombre: d.nombre, valor: round(d.promedio, 1), clasificacion: d.clasificacion }));
  const lollipop = dims.map((d) => ({
    label: d.nombre,
    value: round(d.promedio, 1),
    baseline: 75,
    color: d.clasificacion === "fortaleza" ? "#22c55e" : d.clasificacion === "oportunidad" ? "#eab308" : "#ef4444",
  }));

  const interpretacionNivel: "positivo" | "neutral" | "atencion" | "critico" =
    criticas.length > 2 ? "critico" : criticas.length > 0 ? "atencion" : "positivo";

  const interpretacion = {
    titulo: "Resumen de Dimensiones (consolidado)",
    descripcion: `Se consolidaron dimensiones de instrumentos activos en ${dims.length} categorías principales para lectura ejecutiva.`,
    hallazgos: [
      `${fortalezas.length} categorías clasificadas como fortalezas (≥75%)`,
      `${oportunidades.length} categorías como áreas de oportunidad (60–74%)`,
      `${criticas.length} categorías críticas (<60%)`,
      fortalezas[0] ? `Mejor categoría: ${fortalezas[0].nombre} (${fortalezas[0].promedio.toFixed(1)}%)` : "",
    ].filter(Boolean),
    recomendaciones: criticas.length > 0 ? [`Priorizar intervención en: ${criticas.map((c) => c.nombre).join(", ")}.`] : undefined,
    nivel: interpretacionNivel,
  };

  // === NUEVAS SECCIONES AVANZADAS ===

  // 1. Análisis por Nivel Jerárquico
  const desempenoPorNivel: Record<string, number[]> = {};
  results.forEach((r) => {
    const u = userByDpi.get(String(r.colaborador_id));
    const nivel = String(u?.nivel || "Sin nivel").trim() || "Sin nivel";
    const d = typeof r.desempeno_porcentaje === "number" ? r.desempeno_porcentaje : null;
    if (typeof d === "number" && d > 0) {
      if (!desempenoPorNivel[nivel]) desempenoPorNivel[nivel] = [];
      desempenoPorNivel[nivel].push(d);
    }
  });

  const analisisPorNivel = Object.entries(desempenoPorNivel)
    .filter(([_, vals]) => vals.length > 0)
    .map(([nivel, vals]) => ({
      nivel,
      nombre: levelNameByCode.get(nivel) || nivel,
      n: vals.length,
      promedioDesempeno: round(mean(vals), 1),
      mediana: round(median(vals), 1),
      desviacion: round(standardDeviation(vals), 1),
      min: round(Math.min(...vals), 1),
      max: round(Math.max(...vals), 1),
      q1: round(percentile(vals, 25), 1),
      q3: round(percentile(vals, 75), 1),
      ranking: 0, // se asigna después
    }))
    .sort((a, b) => b.promedioDesempeno - a.promedioDesempeno);

  analisisPorNivel.forEach((n, i) => { n.ranking = i + 1; });

  // 2. Análisis Demográfico
  const now = new Date();
  const datosDemograficos: Array<{ dpi: string; edad: number | null; antiguedad: number | null; desempeno: number }> = [];

  results.forEach((r) => {
    const u = userByDpi.get(String(r.colaborador_id));
    const d = typeof r.desempeno_porcentaje === "number" ? r.desempeno_porcentaje : null;
    if (!d || d <= 0) return;

    const fechaNac = u?.fecha_nacimiento ? new Date(u.fecha_nacimiento) : null;
    const edad = fechaNac ? Math.floor((now.getTime() - fechaNac.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

    const fechaIngreso = u?.fecha_ingreso ? new Date(u.fecha_ingreso) : null;
    const antiguedad = fechaIngreso ? (now.getTime() - fechaIngreso.getTime()) / (365.25 * 24 * 60 * 60 * 1000) : null;

    datosDemograficos.push({ dpi: r.colaborador_id, edad, antiguedad, desempeno: d });
  });

  const conEdad = datosDemograficos.filter((x) => x.edad !== null && x.edad > 15 && x.edad < 80);
  const conAntiguedad = datosDemograficos.filter((x) => x.antiguedad !== null && x.antiguedad >= 0);

  const correlacionEdad = conEdad.length >= 5
    ? pearsonCorrelation(conEdad.map((x) => x.edad!), conEdad.map((x) => x.desempeno))
    : 0;
  const correlacionAntiguedad = conAntiguedad.length >= 5
    ? pearsonCorrelation(conAntiguedad.map((x) => x.antiguedad!), conAntiguedad.map((x) => x.desempeno))
    : 0;

  const rangosEdad: Record<string, number[]> = { "<30": [], "30-40": [], "40-50": [], "50-60": [], ">60": [] };
  conEdad.forEach((x) => {
    const e = x.edad!;
    if (e < 30) rangosEdad["<30"].push(x.desempeno);
    else if (e < 40) rangosEdad["30-40"].push(x.desempeno);
    else if (e < 50) rangosEdad["40-50"].push(x.desempeno);
    else if (e < 60) rangosEdad["50-60"].push(x.desempeno);
    else rangosEdad[">60"].push(x.desempeno);
  });

  const rangosAntiguedad: Record<string, number[]> = { "<1 año": [], "1-3 años": [], "3-5 años": [], "5-10 años": [], ">10 años": [] };
  conAntiguedad.forEach((x) => {
    const a = x.antiguedad!;
    if (a < 1) rangosAntiguedad["<1 año"].push(x.desempeno);
    else if (a < 3) rangosAntiguedad["1-3 años"].push(x.desempeno);
    else if (a < 5) rangosAntiguedad["3-5 años"].push(x.desempeno);
    else if (a < 10) rangosAntiguedad["5-10 años"].push(x.desempeno);
    else rangosAntiguedad[">10 años"].push(x.desempeno);
  });

  const demografico = {
    porEdad: Object.entries(rangosEdad)
      .filter(([_, vals]) => vals.length > 0)
      .map(([rango, vals]) => ({ rango, n: vals.length, promedio: round(mean(vals), 1) })),
    porAntiguedad: Object.entries(rangosAntiguedad)
      .filter(([_, vals]) => vals.length > 0)
      .map(([rango, vals]) => ({ rango, n: vals.length, promedio: round(mean(vals), 1) })),
    correlacionEdad: round(correlacionEdad, 3),
    correlacionAntiguedad: round(correlacionAntiguedad, 3),
    interpretacionEdad: getCorrelationInterpretation(correlacionEdad).description,
    interpretacionAntiguedad: getCorrelationInterpretation(correlacionAntiguedad).description,
  };

  // 3. Análisis de Outliers
  const datosOutliers = results
    .filter((r) => typeof r.desempeno_porcentaje === "number" && r.desempeno_porcentaje > 0)
    .map((r) => {
      const u = userByDpi.get(String(r.colaborador_id));
      return {
        dpi: String(r.colaborador_id),
        nombre: u ? String(u.nombre || "").trim() : "Sin nombre",
        direccion: String(u?.direccion_unidad || u?.area || "Sin dirección").trim(),
        value: r.desempeno_porcentaje as number,
      };
    });

  const outlierResult = detectOutliersIQR(datosOutliers, (item) => item.value);

  const outliersAltos = outlierResult.outliers
    .filter((o) => o.outlierType === "mild_high" || o.outlierType === "extreme_high")
    .map((o) => ({ dpi: o.dpi, nombre: o.nombre, direccion: o.direccion, desempeno: round(o.value, 1), zScore: o.zScore }))
    .sort((a, b) => b.desempeno - a.desempeno)
    .slice(0, 10);

  const outliersBajos = outlierResult.outliers
    .filter((o) => o.outlierType === "mild_low" || o.outlierType === "extreme_low")
    .map((o) => ({ dpi: o.dpi, nombre: o.nombre, direccion: o.direccion, desempeno: round(o.value, 1), zScore: o.zScore }))
    .sort((a, b) => a.desempeno - b.desempeno)
    .slice(0, 10);

  const outliers = {
    altoRendimiento: outliersAltos,
    bajoRendimiento: outliersBajos,
    bounds: { lowerMild: outlierResult.bounds.lowerMild, upperMild: outlierResult.bounds.upperMild },
    stats: {
      total: outlierResult.stats.total,
      outliersAltos: outliersAltos.length,
      outliersBajos: outliersBajos.length,
      porcentaje: outlierResult.stats.outlierPercent,
    },
    interpretacion: outliersAltos.length > 0 || outliersBajos.length > 0
      ? `Se identificaron ${outliersAltos.length} colaboradores con alto rendimiento excepcional y ${outliersBajos.length} casos que requieren atención especial.`
      : "No se detectaron outliers significativos en la distribución de desempeño.",
  };

  // 4. Análisis de Riesgo de Rotación
  const datosRiesgo: Array<{
    dpi: string;
    nombre: string;
    direccion: string;
    riskScore: number;
    riskLevel: string;
    factoresPrincipales: string[];
  }> = [];

  results.forEach((r) => {
    const u = userByDpi.get(String(r.colaborador_id));
    const d = typeof r.desempeno_porcentaje === "number" ? r.desempeno_porcentaje : null;
    if (!d || d <= 0 || !u) return;

    const fechaIngreso = u.fecha_ingreso ? new Date(u.fecha_ingreso) : null;
    const antiguedadAnios = fechaIngreso
      ? (now.getTime() - fechaIngreso.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      : 5;

    const fechaNac = u.fecha_nacimiento ? new Date(u.fecha_nacimiento) : null;
    const edad = fechaNac ? Math.floor((now.getTime() - fechaNac.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

    const factores: RiskFactor[] = [
      { name: "Bajo desempeño", value: d, weight: 0.4, threshold: 60, direction: "lower_is_risk" },
      { name: "Baja antigüedad", value: antiguedadAnios, weight: 0.25, threshold: 2, direction: "lower_is_risk" },
      { name: "Rango de edad crítico", value: edad ? (edad < 30 || edad > 55 ? 1 : 0) : 0, weight: 0.15, threshold: 0.5, direction: "higher_is_risk" },
      { name: "Estancamiento", value: antiguedadAnios > 10 && d < 65 ? 1 : 0, weight: 0.2, threshold: 0.5, direction: "higher_is_risk" },
    ];

    const riskResult = calculateRiskScore(factores);
    datosRiesgo.push({
      dpi: String(r.colaborador_id),
      nombre: String(u.nombre || "").trim(),
      direccion: String(u.direccion_unidad || u.area || "Sin dirección").trim(),
      riskScore: riskResult.totalScore,
      riskLevel: riskResult.riskLevel,
      factoresPrincipales: riskResult.contributingFactors.filter((f) => f.alert).map((f) => f.name),
    });
  });

  const distribucionRiesgo = { bajo: 0, medio: 0, alto: 0, critico: 0 };
  datosRiesgo.forEach((r) => {
    distribucionRiesgo[r.riskLevel as keyof typeof distribucionRiesgo]++;
  });

  const riesgoPorDir: Record<string, { scores: number[]; criticos: number }> = {};
  datosRiesgo.forEach((r) => {
    if (!riesgoPorDir[r.direccion]) riesgoPorDir[r.direccion] = { scores: [], criticos: 0 };
    riesgoPorDir[r.direccion].scores.push(r.riskScore);
    if (r.riskLevel === "critico" || r.riskLevel === "alto") riesgoPorDir[r.direccion].criticos++;
  });

  const riesgoRotacion = {
    distribucion: distribucionRiesgo,
    topRiesgo: datosRiesgo.sort((a, b) => b.riskScore - a.riskScore).slice(0, 15),
    porDireccion: Object.entries(riesgoPorDir)
      .map(([direccion, data]) => ({
        direccion,
        n: data.scores.length,
        promedioRiesgo: round(mean(data.scores), 1),
        criticos: data.criticos,
      }))
      .sort((a, b) => b.promedioRiesgo - a.promedioRiesgo),
    interpretacion: distribucionRiesgo.critico + distribucionRiesgo.alto > 0
      ? `Se identificaron ${distribucionRiesgo.critico} casos críticos y ${distribucionRiesgo.alto} de alto riesgo que requieren intervención.`
      : "La mayoría de colaboradores presentan bajo riesgo de rotación.",
  };

  // 5. Liderazgo en Cascada (correlación jefe-equipo)
  // Usar user_assignments para obtener relaciones jefe-colaborador
  const userAssignments = (dataset as any).userAssignments || [];
  const jefeEquipos: Map<string, { jefeDesempeno: number; equipoDesempenos: number[] }> = new Map();
  const resultsByDpiLocal = new Map<string, number>();
  results.forEach((r) => {
    if (typeof r.desempeno_porcentaje === "number" && r.desempeno_porcentaje > 0) {
      resultsByDpiLocal.set(String(r.colaborador_id), r.desempeno_porcentaje);
    }
  });

  // Usar user_assignments para mapear relaciones jefe-colaborador
  userAssignments.forEach((assignment: any) => {
    const colabId = String(assignment.colaborador_id);
    const jefeId = String(assignment.jefe_id);
    if (!colabId || !jefeId) return;

    const colabDesempeno = resultsByDpiLocal.get(colabId);
    const jefeDesempeno = resultsByDpiLocal.get(jefeId);
    if (!colabDesempeno) return; // El colaborador debe tener resultado

    if (!jefeEquipos.has(jefeId)) {
      jefeEquipos.set(jefeId, { jefeDesempeno: jefeDesempeno || 0, equipoDesempenos: [] });
    }
    jefeEquipos.get(jefeId)!.equipoDesempenos.push(colabDesempeno);
    // Actualizar desempeño del jefe si ahora está disponible
    if (jefeDesempeno && jefeEquipos.get(jefeId)!.jefeDesempeno === 0) {
      jefeEquipos.get(jefeId)!.jefeDesempeno = jefeDesempeno;
    }
  });

  const jefesConEquipo: Array<{
    jefeId: string;
    jefeNombre: string;
    desempenoJefe: number;
    promedioEquipo: number;
    tamanoEquipo: number;
    diferencia: number;
  }> = [];

  const jefesDesempenos: number[] = [];
  const equiposPromedios: number[] = [];

  jefeEquipos.forEach((data, jefeId) => {
    // Requiere al menos 1 colaborador y que el jefe tenga resultado propio
    if (data.equipoDesempenos.length < 1) return;
    if (data.jefeDesempeno <= 0) return; // El jefe debe tener evaluación
    const jefeUser = userByDpi.get(jefeId);
    const promedioEquipo = mean(data.equipoDesempenos);
    jefesDesempenos.push(data.jefeDesempeno);
    equiposPromedios.push(promedioEquipo);
    jefesConEquipo.push({
      jefeId,
      jefeNombre: jefeUser ? String(jefeUser.nombre || "").trim() : jefeId,
      desempenoJefe: round(data.jefeDesempeno, 1),
      promedioEquipo: round(promedioEquipo, 1),
      tamanoEquipo: data.equipoDesempenos.length,
      diferencia: round(data.jefeDesempeno - promedioEquipo, 1),
    });
  });

  const correlacionJefeEquipo = jefesDesempenos.length >= 3
    ? pearsonCorrelation(jefesDesempenos, equiposPromedios)
    : 0;

  const liderazgoCascada = {
    correlacionJefeEquipo: round(correlacionJefeEquipo, 3),
    interpretacion: jefesConEquipo.length > 0
      ? getCorrelationInterpretation(correlacionJefeEquipo).description
      : "No hay suficientes datos de relaciones jefe-colaborador para analizar el efecto cascada.",
    jefesConEquipo: jefesConEquipo.sort((a, b) => b.desempenoJefe - a.desempenoJefe).slice(0, 15),
    resumen: {
      jefesAnalizados: jefesConEquipo.length,
      equiposTotales: jefesConEquipo.reduce((sum, j) => sum + j.tamanoEquipo, 0),
      correlacionFuerte: Math.abs(correlacionJefeEquipo) >= 0.5,
    },
  };

  // 6. Clustering de Perfiles (K-means simplificado)
  const datosCluster = results
    .filter((r) =>
      typeof r.desempeno_porcentaje === "number" && r.desempeno_porcentaje > 0 &&
      typeof r.potencial_porcentaje === "number" && r.potencial_porcentaje > 0
    )
    .map((r) => ({
      dpi: String(r.colaborador_id),
      desempeno: r.desempeno_porcentaje as number,
      potencial: r.potencial_porcentaje as number,
    }));

  const perfilNombres = ["Talento Clave", "Alto Potencial", "Sólido Contribuidor", "En Desarrollo"];
  const perfilColores = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];
  const perfilDescripciones = [
    "Alto desempeño y alto potencial - retención prioritaria",
    "Potencial de crecimiento superior - desarrollo acelerado",
    "Desempeño consistente - mantener y reconocer",
    "Requiere desarrollo - planes de mejora focalizados",
  ];

  let perfiles: ReportArtifacts["perfiles"];
  if (datosCluster.length >= 10) {
    const clusterResult = kMeansClustering(
      datosCluster,
      4,
      [(item) => item.desempeno, (item) => item.potencial],
      50
    );

    const clusters = clusterResult.clusters
      .sort((a, b) => (mean(a.centroid) > mean(b.centroid) ? -1 : 1))
      .map((c, i) => ({
        id: i,
        nombre: perfilNombres[i] || `Perfil ${i + 1}`,
        descripcion: perfilDescripciones[i] || "",
        n: c.size,
        centroide: { desempeno: c.centroid[0], potencial: c.centroid[1] },
        color: perfilColores[i] || "#888",
      }));

    const total = datosCluster.length;
    perfiles = {
      clusters,
      distribucion: clusters.map((c) => ({ perfil: c.nombre, porcentaje: round((c.n / total) * 100, 1) })),
      interpretacion: `Se identificaron ${clusters.length} perfiles distintos en la organización. ${
        clusters[0]?.n > 0 ? `El grupo "${clusters[0].nombre}" representa el ${round((clusters[0].n / total) * 100, 1)}% del talento.` : ""
      }`,
    };
  } else {
    perfiles = {
      clusters: [],
      distribucion: [],
      interpretacion: "No hay suficientes datos con desempeño y potencial para realizar clustering de perfiles.",
    };
  }

  // 7. Benchmarking Interno por Dirección
  const direccionesConDatos = Object.entries(desempenoPorDir)
    .filter(([_, vals]) => vals.length >= 3)
    .map(([dir, vals]) => ({ direccion: dir, valores: vals, promedio: mean(vals), n: vals.length }));

  const promediosDir = direccionesConDatos.map((d) => d.promedio);
  const zScoresDir = promediosDir.length >= 2 ? standardize(promediosDir) : promediosDir.map(() => 0);
  const percentilesDir = promediosDir.length >= 2 ? percentileRanks(promediosDir) : promediosDir.map(() => 50);

  const benchmarking: ReportArtifacts["benchmarking"] = {
    ranking: direccionesConDatos
      .map((d, i) => ({
        direccion: d.direccion,
        n: d.n,
        promedio: round(d.promedio, 1),
        zScore: round(zScoresDir[i], 2),
        percentil: round(percentilesDir[i], 0),
        clasificacion: (percentilesDir[i] >= 75 ? "top" : percentilesDir[i] >= 25 ? "promedio" : "bajo") as "top" | "promedio" | "bajo",
      }))
      .sort((a, b) => b.promedio - a.promedio),
    mejorDireccion: direccionesConDatos.length > 0
      ? { nombre: direccionesConDatos.sort((a, b) => b.promedio - a.promedio)[0].direccion, promedio: round(Math.max(...promediosDir), 1) }
      : { nombre: "N/A", promedio: 0 },
    peorDireccion: direccionesConDatos.length > 0
      ? { nombre: direccionesConDatos.sort((a, b) => a.promedio - b.promedio)[0].direccion, promedio: round(Math.min(...promediosDir), 1) }
      : { nombre: "N/A", promedio: 0 },
    brechaMaxima: promediosDir.length >= 2 ? round(Math.max(...promediosDir) - Math.min(...promediosDir), 1) : 0,
    interpretacion: direccionesConDatos.length >= 2
      ? `Brecha de ${round(Math.max(...promediosDir) - Math.min(...promediosDir), 1)} puntos entre la mejor y peor dirección. ${
          Math.max(...promediosDir) - Math.min(...promediosDir) > 15 ? "Se recomienda investigar las causas de la heterogeneidad." : ""
        }`
      : "No hay suficientes direcciones con datos para realizar benchmarking.",
  };

  // 8. Necesidades de Capacitación (basado en dimensiones críticas)
  const temasCapacitacion = dims
    .filter((d) => d.clasificacion === "critica" || d.clasificacion === "oportunidad")
    .map((d) => ({
      tema: d.nombre,
      brecha: round(75 - d.promedio, 1),
      afectados: results.length, // Simplificación: todos afectados
      prioridad: (d.promedio < 60 ? "alta" : d.promedio < 70 ? "media" : "baja") as "alta" | "media" | "baja",
    }))
    .sort((a, b) => b.brecha - a.brecha);

  const capacitacion: ReportArtifacts["capacitacion"] = {
    temasPrioritarios: temasCapacitacion.slice(0, 10),
    porDireccion: rankingDirecciones.slice(0, 10).map((d) => ({
      direccion: d.direccion,
      temasIdentificados: temasCapacitacion.filter((t) => t.prioridad === "alta").length,
      prioridad: d.promedioDesempeno < 65 ? "alta" : d.promedioDesempeno < 75 ? "media" : "baja",
    })),
    resumen: temasCapacitacion.length > 0
      ? `Se identificaron ${temasCapacitacion.filter((t) => t.prioridad === "alta").length} temas de capacitación prioritarios. ` +
        `Las áreas más críticas son: ${temasCapacitacion.slice(0, 3).map((t) => t.tema).join(", ")}.`
      : "Todas las dimensiones están en niveles aceptables. Se recomienda capacitación de mantenimiento.",
  };

  return {
    qa: { resultadosSinPotencial, resultadosSin9Box, usuariosSinNivel, usuariosSinDireccion },
    participacionPorNivel,
    distribucionDesempeno,
    nineBoxTreemap,
    scatterAutoVsJefe,
    scatterDesempenoVsPotencial,
    rankingDirecciones,
    dimensiones: {
      totalCategorias: dims.length,
      fortalezas,
      oportunidades,
      criticas,
      radar,
      lollipop,
      interpretacion,
    },
    nineBox: buildNineBoxArtifacts(results, userByDpi),
    dependencias: buildDependenciasArtifacts(results, userByDpi),
    instrumentosPorNivel: buildInstrumentosPorNivelArtifacts(instrumentConfigs, jobLevels),
    // Nuevas secciones
    analisisPorNivel,
    demografico,
    outliers,
    riesgoRotacion,
    liderazgoCascada,
    perfiles,
    benchmarking,
    capacitacion,
  };
}

function buildInstrumentosPorNivelArtifacts(
  instrumentConfigs: any[],
  jobLevels: any[]
): ReportArtifacts["instrumentosPorNivel"] {
  const levelNameByCode = new Map<string, string>();
  jobLevels.forEach((l) => {
    const code = String(l.code);
    levelNameByCode.set(code, String(l.name || code));
  });

  const safeItems = (items: any): Array<{ orden: number; id: string; texto: string }> => {
    if (!items || !Array.isArray(items)) return [];
    return items
      .map((it, idx) => {
        // Formato esperado (migraciones): { id, texto, orden }
        if (typeof it === "string") {
          return { orden: idx + 1, id: it, texto: it };
        }
        if (it && typeof it === "object") {
          const id = String((it as any).id || (it as any).key || (it as any).item_id || (it as any).codigo || "").trim() || `item_${idx + 1}`;
          const texto =
            String(
              (it as any).texto ||
                (it as any).pregunta ||
                (it as any).label ||
                (it as any).descripcion ||
                (it as any).name ||
                id
            ).trim() || id;
          const ordenRaw = (it as any).orden ?? (it as any).order ?? (it as any).numero ?? (it as any).index;
          const orden = typeof ordenRaw === "number" && isFinite(ordenRaw) ? ordenRaw : idx + 1;
          return { orden, id, texto };
        }
        return { orden: idx + 1, id: `item_${idx + 1}`, texto: `Ítem ${idx + 1}` };
      })
      .sort((a, b) => a.orden - b.orden);
  };

  const safeDims = (
    dims: any
  ): Array<{
    id: string;
    nombre: string;
    descripcion?: string;
    peso: number;
    items: Array<{ orden: number; id: string; texto: string }>;
  }> => {
    if (!dims || !Array.isArray(dims)) return [];
    return dims.map((d) => ({
      id: String(d.id || ""),
      nombre: String(d.nombre || d.name || d.id || "Sin nombre"),
      descripcion: typeof d.descripcion === "string" ? d.descripcion : typeof d.description === "string" ? d.description : undefined,
      peso: typeof d.peso === "number" ? d.peso : 1,
      items: safeItems(d.items),
    }));
  };

  const configs = (instrumentConfigs || [])
    .filter((c) => c && c.nivel && c.id)
    .map((c) => {
      const nivel = String(c.nivel);
      const nivelNombre = levelNameByCode.get(nivel) || nivel;
      const instrumentId = String(c.id);
      const activo = Boolean(c.activo ?? true);

      const cfg = (c.configuracion_calculo || {}) as any;
      const pesoJefe = typeof cfg.pesoJefe === "number" ? cfg.pesoJefe : 0.7;
      const pesoAuto = typeof cfg.pesoAuto === "number" ? cfg.pesoAuto : 0.3;

      const dimsDes = safeDims(c.dimensiones_desempeno);
      const dimsPot = safeDims(c.dimensiones_potencial);

      const desDim = dimsDes.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        descripcion: d.descripcion,
        peso: d.peso,
        itemsCount: d.items.length,
        items: d.items,
      }));
      const potDim = dimsPot.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        descripcion: d.descripcion,
        peso: d.peso,
        itemsCount: d.items.length,
        items: d.items,
      }));

      const totalItemsDes = dimsDes.reduce((acc, d) => acc + d.items.length, 0);
      const totalItemsPot = dimsPot.reduce((acc, d) => acc + d.items.length, 0);

      const aplicaPotencial = dimsPot.length > 0;

      const explicacion = {
        comoSeResponde: [
          "Cada instrumento se responde en escala tipo Likert 1–5 (1 = menor grado / 5 = mayor grado).",
          "Los ítems están agrupados por dimensiones; cada dimensión representa un componente del desempeño (y, si aplica, del potencial).",
          "La autoevaluación y la evaluación del jefe usan el mismo instrumento de desempeño por nivel.",
        ],
        comoSeCalcula: [
          "Cálculo por dimensión: se obtiene el promedio de los ítems respondidos en la dimensión (escala 1–5).",
          "Cálculo de desempeño (1–5): suma ponderada de promedios por dimensión usando el peso de cada dimensión.",
          `Cálculo de desempeño final: ponderación de jefe y auto según configuración del instrumento (Jefe ${Math.round(
            pesoJefe * 100
          )}% / Auto ${Math.round(pesoAuto * 100)}%).`,
          aplicaPotencial
            ? "Cálculo de potencial (1–5): suma ponderada de promedios por dimensión de potencial (evaluación del jefe)."
            : "Potencial: no aplica en este nivel (dimensiones de potencial vacías).",
          "Conversión a porcentaje (0–100): se utiliza la conversión del sistema para escala 1–5.",
          "9‑Box: se asigna posición con base en desempeño% y potencial% en bandas bajo/medio/alto definidas por el sistema.",
        ].filter(Boolean) as string[],
      };

      return {
        nivel,
        nivelNombre,
        instrumentId,
        activo,
        pesos: { jefe: pesoJefe, auto: pesoAuto },
        desempeno: { totalDimensiones: desDim.length, totalItems: totalItemsDes, dimensiones: desDim },
        potencial: { aplica: aplicaPotencial, totalDimensiones: potDim.length, totalItems: totalItemsPot, dimensiones: potDim },
        explicacion,
      };
    })
    .sort((a, b) => a.nivel.localeCompare(b.nivel));

  return configs;
}

const NINE_BOX_POSITIONS: NineBoxPosition[][] = [
  ["bajo-alto", "medio-alto", "alto-alto"], // Potencial alto, desempeño bajo→alto
  ["bajo-medio", "medio-medio", "alto-medio"], // Potencial medio
  ["bajo-bajo", "medio-bajo", "alto-bajo"], // Potencial bajo
];

function toEmployeeRow(resultRow: any, user: any): EmployeeRow {
  const dpi = String(resultRow.colaborador_id);
  const nombre = user ? `${String(user.nombre || "").trim()} ${String(user.apellidos || "").trim()}`.trim() : dpi;
  const dependencia = String(user?.dependencia || user?.direccion_unidad || user?.area || "Sin dependencia").trim() || "Sin dependencia";

  return {
    dpi,
    nombre,
    cargo: user?.cargo ? String(user.cargo) : undefined,
    nivel: user?.nivel ? String(user.nivel) : undefined,
    dependencia,
    desempeno: typeof resultRow.desempeno_porcentaje === "number" ? resultRow.desempeno_porcentaje : null,
    potencial: typeof resultRow.potencial_porcentaje === "number" ? resultRow.potencial_porcentaje : null,
    posicion9Box: resultRow.posicion_9box ? String(resultRow.posicion_9box) : null,
  };
}

function buildNineBoxArtifacts(results: any[], userByDpi: Map<string, any>): ReportArtifacts["nineBox"] {
  const byPosition: Record<NineBoxPosition, EmployeeRow[]> = {
    "alto-alto": [],
    "alto-medio": [],
    "alto-bajo": [],
    "medio-alto": [],
    "medio-medio": [],
    "medio-bajo": [],
    "bajo-alto": [],
    "bajo-medio": [],
    "bajo-bajo": [],
  };
  const sin_calcular: EmployeeRow[] = [];

  results.forEach((r) => {
    const u = userByDpi.get(String(r.colaborador_id));
    const row = toEmployeeRow(r, u);
    const pos = String(r.posicion_9box || "").trim();
    if (!pos) {
      sin_calcular.push(row);
      return;
    }
    if ((pos as NineBoxPosition) in byPosition) {
      byPosition[pos as NineBoxPosition].push(row);
    } else {
      // Si viene un valor no esperado, tratarlo como sin calcular para no romper UI
      sin_calcular.push(row);
    }
  });

  const matrix = {
    rows: [
      { potencial: "alto" as const, cols: NINE_BOX_POSITIONS[0].map((position, idx) => ({
        desempeno: (idx === 0 ? "bajo" : idx === 1 ? "medio" : "alto") as "bajo" | "medio" | "alto",
        position,
        label: NINE_BOX_METADATA[position].label,
        shortName: NINE_BOX_METADATA[position].shortName,
        count: byPosition[position].length,
      }))},
      { potencial: "medio" as const, cols: NINE_BOX_POSITIONS[1].map((position, idx) => ({
        desempeno: (idx === 0 ? "bajo" : idx === 1 ? "medio" : "alto") as "bajo" | "medio" | "alto",
        position,
        label: NINE_BOX_METADATA[position].label,
        shortName: NINE_BOX_METADATA[position].shortName,
        count: byPosition[position].length,
      }))},
      { potencial: "bajo" as const, cols: NINE_BOX_POSITIONS[2].map((position, idx) => ({
        desempeno: (idx === 0 ? "bajo" : idx === 1 ? "medio" : "alto") as "bajo" | "medio" | "alto",
        position,
        label: NINE_BOX_METADATA[position].label,
        shortName: NINE_BOX_METADATA[position].shortName,
        count: byPosition[position].length,
      }))},
    ],
  };

  const total = results.length;
  return {
    total,
    sinCalcular: sin_calcular.length,
    matrix,
    byPosition,
    sin_calcular,
  };
}

function buildDependenciasArtifacts(results: any[], userByDpi: Map<string, any>): ReportArtifacts["dependencias"] {
  const groups: Record<string, EmployeeRow[]> = {};
  results.forEach((r) => {
    const u = userByDpi.get(String(r.colaborador_id));
    const row = toEmployeeRow(r, u);
    const dep = row.dependencia || "Sin dependencia";
    if (!groups[dep]) groups[dep] = [];
    groups[dep].push(row);
  });

  return Object.entries(groups)
    .map(([dependencia, empleados]) => {
      const desempenos = empleados.map((e) => e.desempeno).filter((v): v is number => typeof v === "number" && v > 0);
      const potenciales = empleados.map((e) => e.potencial).filter((v): v is number => typeof v === "number" && v > 0);
      return {
        dependencia,
        n: empleados.length,
        promedioDesempeno: round(mean(desempenos), 1),
        promedioPotencial: potenciales.length ? round(mean(potenciales), 1) : null,
        empleados: empleados.sort((a, b) => (b.desempeno || 0) - (a.desempeno || 0)),
      };
    })
    .sort((a, b) => b.n - a.n);
}

export function renderMarkdown(doc: Omit<ReportDoc, "markdown">): string {
  const { meta, metrics, executive } = doc;
  const lines: string[] = [];

  if (meta) {
    lines.push(`# ${meta.titulo}`);
    lines.push(`**Entidad:** ${meta.entidad}`);
    lines.push(`**Año:** ${meta.anio}`);
    lines.push("");
  } else {
    lines.push(`# Informe Final — Evaluación de Desempeño`);
  }
  lines.push(`Período: **${metrics.periodo.nombre}** (${metrics.periodo.id})`);
  lines.push(`Corte de datos: **${metrics.fetchedAtISO}**`);
  lines.push("");

  lines.push(`## Resumen ejecutivo`);
  lines.push(executive.headline);
  lines.push("");
  lines.push(`### Hallazgos clave`);
  executive.highlights.forEach((h) => lines.push(`- ${h}`));
  lines.push("");
  lines.push(`### Riesgos/alertas`);
  executive.risks.forEach((r) => lines.push(`- ${r}`));
  lines.push("");
  lines.push(`### Recomendaciones priorizadas`);
  executive.recommendations.forEach((r) => lines.push(`- ${r}`));
  lines.push("");

  lines.push(`### Próximos pasos (30/60/90 días)`);
  lines.push(`**30 días**`);
  executive.nextSteps306090.d30.forEach((x) => lines.push(`- ${x}`));
  lines.push(`**60 días**`);
  executive.nextSteps306090.d60.forEach((x) => lines.push(`- ${x}`));
  lines.push(`**90 días**`);
  executive.nextSteps306090.d90.forEach((x) => lines.push(`- ${x}`));
  lines.push("");

  lines.push(`## Ficha técnica`);
  lines.push(`- Fuentes: \`evaluation_periods\`, \`users\`, \`evaluations\`, \`final_evaluation_results\`, \`job_levels\`, \`development_plans\``);
  lines.push(`- Inclusión: evaluaciones con \`estado=enviado\` y resultados finales del período`);
  lines.push(`- Brecha Auto vs Jefe: se reporta como **Jefe − Auto** (puntos porcentuales)`);
  lines.push("");

  lines.push(`## Indicadores principales`);
  lines.push(`- Participación: **${metrics.coverage.tasaParticipacion.toFixed(1)}%** (${metrics.coverage.totalEvaluados}/${metrics.coverage.totalActivos})`);
  lines.push(
    `- Desempeño: promedio **${metrics.desempeno.promedio.toFixed(1)}%**, mediana **${metrics.desempeno.mediana.toFixed(
      1
    )}%**, desviación **${metrics.desempeno.desviacion.toFixed(1)}**`
  );
  lines.push(`- Excelente (≥90%): **${metrics.desempeno.pctExcelente.toFixed(1)}%**`);
  lines.push(`- Insatisfactorio (<60%): **${metrics.desempeno.pctInsatisfactorio.toFixed(1)}%**`);
  if (metrics.potencial) lines.push(`- Potencial: promedio **${metrics.potencial.promedio.toFixed(1)}%** (n=${metrics.potencial.n})`);
  lines.push(
    `- Auto vs Jefe: Auto **${metrics.brechaAutoJefe.promedioAuto.toFixed(1)}%**, Jefe **${metrics.brechaAutoJefe.promedioJefe.toFixed(
      1
    )}%**, Brecha **${metrics.brechaAutoJefe.brecha.toFixed(1)}**`
  );
  lines.push(
    `- Correlación Auto-Jefe: **${metrics.brechaAutoJefe.correlacion.toFixed(3)}** (${metrics.brechaAutoJefe.correlacionInterpretacion.strength})`
  );
  if (metrics.pdi) lines.push(`- PDI: **${metrics.pdi.coberturaSobreEvaluados.toFixed(1)}%** cobertura (${metrics.pdi.totalPlanes} planes)`);
  lines.push("");

  // Segmentación: Top 5 direcciones
  const topDirs = metrics.segmentacion.porDireccion.filter((d) => d.n >= 5).slice(0, 10);
  if (topDirs.length) {
    lines.push(`## Ranking por dirección (n≥5)`);
    topDirs.forEach((d, i) => lines.push(`${i + 1}. ${d.direccion}: ${d.promedioDesempeno.toFixed(1)}% (n=${d.n})`));
    lines.push("");
  }

  // Segmentación por nivel (Top 10)
  const topNiv = metrics.segmentacion.porNivel.filter((d) => d.n >= 5).slice(0, 10);
  if (topNiv.length) {
    lines.push(`## Ranking por nivel (n≥5)`);
    topNiv.forEach((d, i) => lines.push(`${i + 1}. ${d.nivel}: ${d.promedioDesempeno.toFixed(1)}% (n=${d.n})`));
    lines.push("");
  }

  lines.push(`## Distribución 9-Box`);
  const nineEntries = Object.entries(metrics.distribucion9Box).sort((a, b) => b[1] - a[1]);
  if (nineEntries.length) nineEntries.forEach(([k, v]) => lines.push(`- ${k}: ${v}`));
  else lines.push(`- Sin datos`);
  lines.push("");

  return lines.join("\n");
}

export async function generateReport(periodoId: string, meta?: ReportMeta): Promise<ReportDoc> {
  const dataset = await fetchReportDataset(periodoId);
  const metrics = computeReportMetrics(dataset);
  const executive = generateNarrative(metrics);
  const artifacts = computeArtifacts(dataset, metrics);

  // Secciones (para UI; el markdown es la salida “copiable”)
  const summaryStats = metrics.desempeno.n ? generateStatisticalSummary(
    dataset.results
      .map((r: any) => r.desempeno_porcentaje as number | null)
      .filter((v): v is number => typeof v === "number" && v > 0)
  ) : null;

  const tipoGroups = dataset.results
    .map((r: any) => {
      const u = (dataset.users || []).find((x: any) => x.dpi === r.colaborador_id);
      const tipo = safeString(u?.tipo_puesto, "Sin tipo");
      const val = r.desempeno_porcentaje;
      return typeof val === "number" && val > 0 ? { name: tipo, values: [val] } : null;
    })
    .filter(Boolean) as Array<{ name: string; values: number[] }>;

  // Consolidar por tipo (evitar arrays unitarios por fila)
  const tipoAgg: Record<string, number[]> = {};
  tipoGroups.forEach((g) => {
    if (!tipoAgg[g.name]) tipoAgg[g.name] = [];
    tipoAgg[g.name].push(...g.values);
  });
  const gapAnalysis = Object.keys(tipoAgg).length >= 2
    ? calculateGapAnalysis(Object.entries(tipoAgg).map(([name, values]) => ({ name, values })))
    : null;

  const sections: ReportSection[] = [
    {
      id: "resumen",
      title: "Resumen ejecutivo",
      sources: ["evaluation_periods", "users", "evaluations", "final_evaluation_results"],
      content: {
        paragraphs: [executive.headline],
        bullets: [
          ...executive.highlights,
          "—",
          "Riesgos/alertas:",
          ...executive.risks,
          "—",
          "Recomendaciones:",
          ...executive.recommendations,
        ],
      },
    },
    {
      id: "ficha-tecnica",
      title: "Ficha técnica y trazabilidad",
      sources: ["evaluation_periods", "users", "evaluations", "final_evaluation_results", "job_levels", "development_plans"],
      content: {
        paragraphs: [
          `Corte de datos: ${metrics.fetchedAtISO}. Fuentes: evaluation_periods, users, evaluations, final_evaluation_results, job_levels, development_plans.`,
          "Inclusión: evaluaciones con estado=enviado y resultados finales del período. Brecha Auto vs Jefe reportada como (Jefe − Auto).",
        ],
      },
    },
    {
      id: "estadistica",
      title: "Lectura estadística (auditable)",
      sources: ["final_evaluation_results"],
      content: {
        paragraphs: summaryStats
          ? [
              summaryStats.interpretation,
              `Distribución: skew=${metrics.desempeno.skewness}, kurtosis=${metrics.desempeno.kurtosis}.`,
            ]
          : ["Sin datos suficientes para resumen estadístico."],
      },
    },
    {
      id: "equidad-segmentos",
      title: "Equidad y segmentación (resumen)",
      sources: ["users", "final_evaluation_results"],
      content: {
        paragraphs: [
          gapAnalysis
            ? gapAnalysis.summary
            : "No hay segmentos suficientes para análisis comparativo por tipo de puesto (se requieren ≥2 grupos).",
        ],
      },
    },
  ];

  const partialDoc = { meta, metrics, executive, sections };
  const markdown = renderMarkdown(partialDoc);

  return { ...partialDoc, artifacts, markdown };
}


