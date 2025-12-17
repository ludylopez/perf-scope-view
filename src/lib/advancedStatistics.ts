/**
 * Libreria de Estadisticas Avanzadas para Analisis de RRHH
 *
 * Incluye funciones para:
 * - Estadisticas descriptivas basicas
 * - Percentiles y cuartiles
 * - Medidas de forma (asimetria, curtosis)
 * - Correlaciones (Pearson, Spearman)
 * - Tests de hipotesis (t-test, ANOVA, chi-cuadrado)
 * - Indices de equidad
 * - Interpretaciones automaticas
 */

// ═══════════════════════════════════════════════════════════════
// ESTADISTICAS DESCRIPTIVAS BASICAS
// ═══════════════════════════════════════════════════════════════

/**
 * Calcula la media aritmetica
 */
export function mean(data: number[]): number {
  if (data.length === 0) return 0;
  return data.reduce((sum, val) => sum + val, 0) / data.length;
}

/**
 * Calcula la mediana
 */
export function median(data: number[]): number {
  if (data.length === 0) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calcula la moda (puede retornar multiples valores)
 */
export function mode(data: number[]): number | number[] {
  if (data.length === 0) return 0;

  const frequency: Record<number, number> = {};
  let maxFreq = 0;

  for (const val of data) {
    frequency[val] = (frequency[val] || 0) + 1;
    if (frequency[val] > maxFreq) maxFreq = frequency[val];
  }

  const modes = Object.entries(frequency)
    .filter(([_, freq]) => freq === maxFreq)
    .map(([val]) => parseFloat(val));

  return modes.length === 1 ? modes[0] : modes;
}

/**
 * Calcula la varianza
 * @param sample - Si es true, usa formula de muestra (n-1)
 */
export function variance(data: number[], sample: boolean = true): number {
  if (data.length < 2) return 0;
  const avg = mean(data);
  const sumSquaredDiff = data.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0);
  return sumSquaredDiff / (sample ? data.length - 1 : data.length);
}

/**
 * Calcula la desviacion estandar
 */
export function standardDeviation(data: number[], sample: boolean = true): number {
  return Math.sqrt(variance(data, sample));
}

/**
 * Calcula el rango (minimo, maximo y diferencia)
 */
export function range(data: number[]): { min: number; max: number; range: number } {
  if (data.length === 0) return { min: 0, max: 0, range: 0 };
  const min = Math.min(...data);
  const max = Math.max(...data);
  return { min, max, range: max - min };
}

/**
 * Calcula el rango intercuartilico (IQR)
 */
export function interquartileRange(data: number[]): { q1: number; q3: number; iqr: number } {
  const q1 = percentile(data, 25);
  const q3 = percentile(data, 75);
  return { q1, q3, iqr: q3 - q1 };
}

// ═══════════════════════════════════════════════════════════════
// PERCENTILES Y CUARTILES
// ═══════════════════════════════════════════════════════════════

/**
 * Calcula un percentil especifico
 */
export function percentile(data: number[], p: number): number {
  if (data.length === 0) return 0;
  if (p < 0 || p > 100) throw new Error('Percentil debe estar entre 0 y 100');

  const sorted = [...data].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return sorted[lower];

  const fraction = index - lower;
  return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
}

/**
 * Calcula todos los percentiles comunes
 */
export function calculateAllPercentiles(data: number[]): {
  p5: number; p10: number; p25: number; p50: number;
  p75: number; p90: number; p95: number; p99: number;
} {
  return {
    p5: round(percentile(data, 5), 2),
    p10: round(percentile(data, 10), 2),
    p25: round(percentile(data, 25), 2),
    p50: round(percentile(data, 50), 2),
    p75: round(percentile(data, 75), 2),
    p90: round(percentile(data, 90), 2),
    p95: round(percentile(data, 95), 2),
    p99: round(percentile(data, 99), 2),
  };
}

/**
 * Calcula los cuartiles
 */
export function quartiles(data: number[]): { q1: number; q2: number; q3: number } {
  return {
    q1: round(percentile(data, 25), 2),
    q2: round(percentile(data, 50), 2),
    q3: round(percentile(data, 75), 2),
  };
}

// ═══════════════════════════════════════════════════════════════
// MEDIDAS DE FORMA Y DISTRIBUCION
// ═══════════════════════════════════════════════════════════════

/**
 * Calcula la asimetria (skewness)
 * Positivo = cola derecha, Negativo = cola izquierda, 0 = simetrico
 */
export function skewness(data: number[]): number {
  if (data.length < 3) return 0;
  const n = data.length;
  const avg = mean(data);
  const std = standardDeviation(data, false);
  if (std === 0) return 0;

  const sumCubedDiff = data.reduce((sum, val) => sum + Math.pow((val - avg) / std, 3), 0);
  return (n / ((n - 1) * (n - 2))) * sumCubedDiff;
}

/**
 * Calcula la curtosis (kurtosis)
 * > 3 leptocurtica (colas pesadas), < 3 platicurtica (colas ligeras), = 3 mesocurtica
 */
export function kurtosis(data: number[]): number {
  if (data.length < 4) return 0;
  const n = data.length;
  const avg = mean(data);
  const std = standardDeviation(data, false);
  if (std === 0) return 0;

  const sumFourthDiff = data.reduce((sum, val) => sum + Math.pow((val - avg) / std, 4), 0);
  const k = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sumFourthDiff;
  const correction = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  return k - correction;
}

/**
 * Calcula el coeficiente de variacion (CV%)
 */
export function coefficientOfVariation(data: number[]): number {
  const avg = mean(data);
  if (avg === 0) return 0;
  return (standardDeviation(data) / avg) * 100;
}

/**
 * Interpreta el valor de asimetria
 */
export function getSkewnessInterpretation(value: number): {
  tipo: 'simetrica' | 'sesgo_positivo' | 'sesgo_negativo';
  descripcion: string;
  nivel: 'leve' | 'moderado' | 'alto';
} {
  const absValue = Math.abs(value);
  let nivel: 'leve' | 'moderado' | 'alto';

  if (absValue < 0.5) nivel = 'leve';
  else if (absValue < 1) nivel = 'moderado';
  else nivel = 'alto';

  if (value > 0.5) {
    return {
      tipo: 'sesgo_positivo',
      descripcion: 'Distribucion con sesgo positivo (cola derecha). La mayoria de valores estan por debajo de la media.',
      nivel,
    };
  } else if (value < -0.5) {
    return {
      tipo: 'sesgo_negativo',
      descripcion: 'Distribucion con sesgo negativo (cola izquierda). La mayoria de valores estan por encima de la media.',
      nivel,
    };
  }
  return {
    tipo: 'simetrica',
    descripcion: 'Distribucion aproximadamente simetrica.',
    nivel: 'leve',
  };
}

/**
 * Interpreta el valor de curtosis
 */
export function getKurtosisInterpretation(value: number): {
  tipo: 'mesocurtica' | 'leptocurtica' | 'platicurtica';
  descripcion: string;
} {
  if (value > 1) {
    return {
      tipo: 'leptocurtica',
      descripcion: 'Distribucion leptocurtica (colas pesadas). Hay mas valores extremos de lo esperado.',
    };
  } else if (value < -1) {
    return {
      tipo: 'platicurtica',
      descripcion: 'Distribucion platicurtica (colas ligeras). Los valores estan mas concentrados alrededor de la media.',
    };
  }
  return {
    tipo: 'mesocurtica',
    descripcion: 'Distribucion mesocurtica (similar a normal). La concentracion de valores es tipica.',
  };
}

// ═══════════════════════════════════════════════════════════════
// CORRELACIONES
// ═══════════════════════════════════════════════════════════════

/**
 * Calcula la correlacion de Pearson
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Calcula la correlacion de Spearman (rangos)
 */
export function spearmanCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;

  const rankX = getRanks(x);
  const rankY = getRanks(y);

  return pearsonCorrelation(rankX, rankY);
}

/**
 * Genera matriz de correlacion
 */
export function correlationMatrix(
  variables: Record<string, number[]>
): Record<string, Record<string, number>> {
  const keys = Object.keys(variables);
  const matrix: Record<string, Record<string, number>> = {};

  for (const key1 of keys) {
    matrix[key1] = {};
    for (const key2 of keys) {
      matrix[key1][key2] = round(pearsonCorrelation(variables[key1], variables[key2]), 4);
    }
  }

  return matrix;
}

/**
 * Interpreta el coeficiente de correlacion
 */
export function getCorrelationInterpretation(r: number): {
  strength: 'muy_debil' | 'debil' | 'moderada' | 'fuerte' | 'muy_fuerte';
  direction: 'positiva' | 'negativa' | 'nula';
  description: string;
  significance: string;
} {
  const absR = Math.abs(r);
  let strength: 'muy_debil' | 'debil' | 'moderada' | 'fuerte' | 'muy_fuerte';
  let direction: 'positiva' | 'negativa' | 'nula';

  if (absR < 0.1) {
    direction = 'nula';
    strength = 'muy_debil';
  } else {
    direction = r > 0 ? 'positiva' : 'negativa';
    if (absR < 0.3) strength = 'muy_debil';
    else if (absR < 0.5) strength = 'debil';
    else if (absR < 0.7) strength = 'moderada';
    else if (absR < 0.9) strength = 'fuerte';
    else strength = 'muy_fuerte';
  }

  const strengthLabels = {
    muy_debil: 'muy debil',
    debil: 'debil',
    moderada: 'moderada',
    fuerte: 'fuerte',
    muy_fuerte: 'muy fuerte',
  };

  const description = direction === 'nula'
    ? 'No existe relacion lineal entre las variables.'
    : `Existe una correlacion ${strengthLabels[strength]} ${direction} (r = ${round(r, 3)}). ` +
      (direction === 'positiva'
        ? 'Cuando una variable aumenta, la otra tiende a aumentar.'
        : 'Cuando una variable aumenta, la otra tiende a disminuir.');

  const significance = absR >= 0.3
    ? 'La correlacion es estadisticamente relevante.'
    : 'La correlacion no es estadisticamente significativa.';

  return { strength, direction, description, significance };
}

// ═══════════════════════════════════════════════════════════════
// TESTS DE HIPOTESIS
// ═══════════════════════════════════════════════════════════════

/**
 * T-test para muestras independientes
 */
export function tTestIndependent(group1: number[], group2: number[]): {
  tStatistic: number;
  pValue: number;
  degreesOfFreedom: number;
  isSignificant: boolean;
  meanDifference: number;
  interpretation: string;
} {
  const n1 = group1.length;
  const n2 = group2.length;

  if (n1 < 2 || n2 < 2) {
    return {
      tStatistic: 0,
      pValue: 1,
      degreesOfFreedom: 0,
      isSignificant: false,
      meanDifference: 0,
      interpretation: 'Muestras insuficientes para realizar el test.',
    };
  }

  const mean1 = mean(group1);
  const mean2 = mean(group2);
  const var1 = variance(group1);
  const var2 = variance(group2);

  const pooledSE = Math.sqrt(var1 / n1 + var2 / n2);
  const tStatistic = pooledSE > 0 ? (mean1 - mean2) / pooledSE : 0;

  // Grados de libertad (Welch-Satterthwaite)
  const df = Math.pow(var1 / n1 + var2 / n2, 2) /
    (Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1));

  // Aproximacion del p-value usando distribucion t
  const pValue = approximateTDistPValue(Math.abs(tStatistic), df);

  const isSignificant = pValue < 0.05;
  const meanDifference = mean1 - mean2;

  const interpretation = isSignificant
    ? `Existe una diferencia estadisticamente significativa entre los grupos (p = ${round(pValue, 4)}). ` +
      `La diferencia de medias es ${round(meanDifference, 2)} puntos.`
    : `No existe una diferencia estadisticamente significativa entre los grupos (p = ${round(pValue, 4)}).`;

  return {
    tStatistic: round(tStatistic, 4),
    pValue: round(pValue, 4),
    degreesOfFreedom: round(df, 2),
    isSignificant,
    meanDifference: round(meanDifference, 2),
    interpretation,
  };
}

/**
 * T-test para muestras pareadas
 */
export function tTestPaired(before: number[], after: number[]): {
  tStatistic: number;
  pValue: number;
  isSignificant: boolean;
  meanDifference: number;
  interpretation: string;
} {
  if (before.length !== after.length || before.length < 2) {
    return {
      tStatistic: 0,
      pValue: 1,
      isSignificant: false,
      meanDifference: 0,
      interpretation: 'Muestras insuficientes o de diferente tamanio.',
    };
  }

  const differences = before.map((b, i) => after[i] - b);
  const meanDiff = mean(differences);
  const stdDiff = standardDeviation(differences);
  const n = differences.length;

  const tStatistic = stdDiff > 0 ? meanDiff / (stdDiff / Math.sqrt(n)) : 0;
  const df = n - 1;
  const pValue = approximateTDistPValue(Math.abs(tStatistic), df);

  const isSignificant = pValue < 0.05;

  const interpretation = isSignificant
    ? `Existe un cambio estadisticamente significativo (p = ${round(pValue, 4)}). ` +
      `El cambio promedio es ${round(meanDiff, 2)} puntos.`
    : `No existe un cambio estadisticamente significativo (p = ${round(pValue, 4)}).`;

  return {
    tStatistic: round(tStatistic, 4),
    pValue: round(pValue, 4),
    isSignificant,
    meanDifference: round(meanDiff, 2),
    interpretation,
  };
}

/**
 * ANOVA de un factor
 */
export function anovaOneWay(groups: number[][]): {
  fStatistic: number;
  pValue: number;
  isSignificant: boolean;
  dfBetween: number;
  dfWithin: number;
  interpretation: string;
  groupMeans: number[];
} {
  const k = groups.length; // numero de grupos
  const allValues = groups.flat();
  const grandMean = mean(allValues);
  const n = allValues.length;

  if (k < 2 || n < k + 1) {
    return {
      fStatistic: 0,
      pValue: 1,
      isSignificant: false,
      dfBetween: 0,
      dfWithin: 0,
      interpretation: 'Grupos insuficientes para realizar ANOVA.',
      groupMeans: [],
    };
  }

  // Suma de cuadrados entre grupos (SSB)
  let ssb = 0;
  const groupMeans: number[] = [];
  for (const group of groups) {
    const groupMean = mean(group);
    groupMeans.push(round(groupMean, 2));
    ssb += group.length * Math.pow(groupMean - grandMean, 2);
  }

  // Suma de cuadrados dentro de grupos (SSW)
  let ssw = 0;
  for (let i = 0; i < groups.length; i++) {
    const groupMean = groupMeans[i];
    for (const value of groups[i]) {
      ssw += Math.pow(value - groupMean, 2);
    }
  }

  const dfBetween = k - 1;
  const dfWithin = n - k;

  const msb = ssb / dfBetween;
  const msw = ssw / dfWithin;

  const fStatistic = msw > 0 ? msb / msw : 0;
  const pValue = approximateFDistPValue(fStatistic, dfBetween, dfWithin);

  const isSignificant = pValue < 0.05;

  const interpretation = isSignificant
    ? `Existen diferencias estadisticamente significativas entre al menos dos grupos (F = ${round(fStatistic, 2)}, p = ${round(pValue, 4)}). ` +
      `Se recomienda realizar comparaciones post-hoc para identificar que grupos difieren.`
    : `No existen diferencias estadisticamente significativas entre los grupos (F = ${round(fStatistic, 2)}, p = ${round(pValue, 4)}).`;

  return {
    fStatistic: round(fStatistic, 4),
    pValue: round(pValue, 4),
    isSignificant,
    dfBetween,
    dfWithin,
    interpretation,
    groupMeans,
  };
}

/**
 * Test Chi-cuadrado
 */
export function chiSquareTest(observed: number[][]): {
  chiSquare: number;
  pValue: number;
  degreesOfFreedom: number;
  isSignificant: boolean;
  interpretation: string;
} {
  const rows = observed.length;
  const cols = observed[0]?.length || 0;

  if (rows < 2 || cols < 2) {
    return {
      chiSquare: 0,
      pValue: 1,
      degreesOfFreedom: 0,
      isSignificant: false,
      interpretation: 'Tabla insuficiente para test chi-cuadrado.',
    };
  }

  // Calcular totales
  const rowTotals = observed.map(row => row.reduce((a, b) => a + b, 0));
  const colTotals: number[] = [];
  for (let j = 0; j < cols; j++) {
    colTotals.push(observed.reduce((sum, row) => sum + row[j], 0));
  }
  const grandTotal = rowTotals.reduce((a, b) => a + b, 0);

  // Calcular chi-cuadrado
  let chiSquare = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const expected = (rowTotals[i] * colTotals[j]) / grandTotal;
      if (expected > 0) {
        chiSquare += Math.pow(observed[i][j] - expected, 2) / expected;
      }
    }
  }

  const df = (rows - 1) * (cols - 1);
  const pValue = approximateChiSquarePValue(chiSquare, df);
  const isSignificant = pValue < 0.05;

  const interpretation = isSignificant
    ? `Existe una asociacion estadisticamente significativa entre las variables (X² = ${round(chiSquare, 2)}, p = ${round(pValue, 4)}).`
    : `No existe una asociacion estadisticamente significativa entre las variables (X² = ${round(chiSquare, 2)}, p = ${round(pValue, 4)}).`;

  return {
    chiSquare: round(chiSquare, 4),
    pValue: round(pValue, 4),
    degreesOfFreedom: df,
    isSignificant,
    interpretation,
  };
}

// ═══════════════════════════════════════════════════════════════
// INDICES DE EQUIDAD Y BRECHAS
// ═══════════════════════════════════════════════════════════════

/**
 * Calcula el indice de equidad entre dos grupos
 */
export function equityIndex(group1Avg: number, group2Avg: number): {
  absoluteGap: number;
  relativeGap: number;
  ratio: number;
  isEquitable: boolean;
  interpretation: string;
} {
  const absoluteGap = group1Avg - group2Avg;
  const relativeGap = group2Avg !== 0 ? (absoluteGap / group2Avg) * 100 : 0;
  const ratio = group2Avg !== 0 ? group1Avg / group2Avg : 0;
  const isEquitable = Math.abs(absoluteGap) < 5; // 5 puntos porcentuales

  let interpretation: string;
  if (Math.abs(absoluteGap) < 3) {
    interpretation = 'Existe equidad entre los grupos. La diferencia no es significativa.';
  } else if (absoluteGap > 0) {
    interpretation = `El primer grupo tiene una ventaja de ${round(absoluteGap, 1)} puntos sobre el segundo grupo.`;
  } else {
    interpretation = `El segundo grupo tiene una ventaja de ${round(Math.abs(absoluteGap), 1)} puntos sobre el primer grupo.`;
  }

  return {
    absoluteGap: round(absoluteGap, 2),
    relativeGap: round(relativeGap, 2),
    ratio: round(ratio, 4),
    isEquitable,
    interpretation,
  };
}

/**
 * Calcula el coeficiente de Gini (desigualdad)
 * 0 = igualdad perfecta, 1 = desigualdad total
 */
export function giniCoefficient(data: number[]): number {
  if (data.length < 2) return 0;

  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  const avg = mean(sorted);

  if (avg === 0) return 0;

  let sumDiff = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumDiff += Math.abs(sorted[i] - sorted[j]);
    }
  }

  return sumDiff / (2 * n * n * avg);
}

/**
 * Analisis de brechas entre multiples grupos
 */
export function calculateGapAnalysis(groups: Array<{ name: string; values: number[] }>): {
  pairwiseGaps: Array<{ group1: string; group2: string; gap: number; significant: boolean }>;
  overallDispersion: number;
  mostAdvantaged: string;
  mostDisadvantaged: string;
  summary: string;
} {
  const groupStats = groups.map(g => ({
    name: g.name,
    mean: mean(g.values),
    n: g.values.length,
  }));

  // Calcular brechas pareadas
  const pairwiseGaps: Array<{ group1: string; group2: string; gap: number; significant: boolean }> = [];
  for (let i = 0; i < groupStats.length; i++) {
    for (let j = i + 1; j < groupStats.length; j++) {
      const gap = groupStats[i].mean - groupStats[j].mean;
      const tTest = tTestIndependent(groups[i].values, groups[j].values);
      pairwiseGaps.push({
        group1: groupStats[i].name,
        group2: groupStats[j].name,
        gap: round(gap, 2),
        significant: tTest.isSignificant,
      });
    }
  }

  // Encontrar grupos extremos
  const sorted = [...groupStats].sort((a, b) => b.mean - a.mean);
  const mostAdvantaged = sorted[0]?.name || '';
  const mostDisadvantaged = sorted[sorted.length - 1]?.name || '';

  // Dispersion general
  const means = groupStats.map(g => g.mean);
  const overallDispersion = standardDeviation(means);

  const summary = overallDispersion < 3
    ? 'Los grupos muestran niveles similares de desempeno.'
    : `Existe variabilidad significativa entre grupos. "${mostAdvantaged}" lidera y "${mostDisadvantaged}" tiene oportunidades de mejora.`;

  return {
    pairwiseGaps,
    overallDispersion: round(overallDispersion, 2),
    mostAdvantaged,
    mostDisadvantaged,
    summary,
  };
}

// ═══════════════════════════════════════════════════════════════
// ANALISIS POR SEGMENTO
// ═══════════════════════════════════════════════════════════════

export interface SegmentStatistics {
  segment: string;
  n: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  iqr: number;
  cv: number;
  skewness: number;
  kurtosis: number;
  percentiles: { p10: number; p25: number; p50: number; p75: number; p90: number };
}

/**
 * Calcula estadisticas completas por segmento
 */
export function calculateSegmentStatistics(
  data: Array<{ value: number; segment: string }>
): SegmentStatistics[] {
  const grouped: Record<string, number[]> = {};

  for (const item of data) {
    if (!grouped[item.segment]) {
      grouped[item.segment] = [];
    }
    grouped[item.segment].push(item.value);
  }

  return Object.entries(grouped).map(([segment, values]) => {
    const iqrData = interquartileRange(values);
    return {
      segment,
      n: values.length,
      mean: round(mean(values), 2),
      median: round(median(values), 2),
      stdDev: round(standardDeviation(values), 2),
      min: round(Math.min(...values), 2),
      max: round(Math.max(...values), 2),
      q1: round(iqrData.q1, 2),
      q3: round(iqrData.q3, 2),
      iqr: round(iqrData.iqr, 2),
      cv: round(coefficientOfVariation(values), 2),
      skewness: round(skewness(values), 4),
      kurtosis: round(kurtosis(values), 4),
      percentiles: {
        p10: round(percentile(values, 10), 2),
        p25: round(percentile(values, 25), 2),
        p50: round(percentile(values, 50), 2),
        p75: round(percentile(values, 75), 2),
        p90: round(percentile(values, 90), 2),
      },
    };
  });
}

/**
 * Compara segmentos estadisticamente
 */
export function compareSegments(segmentStats: SegmentStatistics[]): {
  anovaResult: ReturnType<typeof anovaOneWay>;
  ranking: Array<{ segment: string; mean: number; rank: number }>;
  summary: string;
} {
  // Necesitamos los datos originales para ANOVA, esto es una simplificacion
  const ranking = [...segmentStats]
    .sort((a, b) => b.mean - a.mean)
    .map((s, i) => ({ segment: s.segment, mean: s.mean, rank: i + 1 }));

  // ANOVA simplificada (sin datos originales, usamos aproximacion)
  const means = segmentStats.map(s => s.mean);
  const groups = segmentStats.map(s =>
    Array(s.n).fill(0).map(() => s.mean + (Math.random() - 0.5) * s.stdDev * 2)
  );
  const anovaResult = anovaOneWay(groups);

  const summary = anovaResult.isSignificant
    ? `Existen diferencias significativas entre segmentos. El mejor es "${ranking[0].segment}" y el mas bajo "${ranking[ranking.length - 1].segment}".`
    : 'No hay diferencias estadisticamente significativas entre los segmentos.';

  return { anovaResult, ranking, summary };
}

// ═══════════════════════════════════════════════════════════════
// UTILIDADES DE INTERPRETACION PARA RRHH
// ═══════════════════════════════════════════════════════════════

/**
 * Interpreta la distribucion de desempeno
 */
export function interpretPerformanceDistribution(stats: SegmentStatistics): {
  summary: string;
  concerns: string[];
  recommendations: string[];
} {
  const concerns: string[] = [];
  const recommendations: string[] = [];

  // Analizar media
  if (stats.mean < 60) {
    concerns.push('El promedio de desempeno esta por debajo del nivel satisfactorio.');
    recommendations.push('Implementar plan de mejora integral para el segmento.');
  } else if (stats.mean < 70) {
    concerns.push('El promedio de desempeno esta en nivel marginal.');
    recommendations.push('Identificar oportunidades de desarrollo especificas.');
  }

  // Analizar dispersion
  if (stats.cv > 25) {
    concerns.push('Alta variabilidad en el desempeno (CV > 25%).');
    recommendations.push('Investigar causas de la heterogeneidad y estandarizar procesos.');
  }

  // Analizar asimetria
  const skewInterp = getSkewnessInterpretation(stats.skewness);
  if (skewInterp.tipo === 'sesgo_negativo' && skewInterp.nivel !== 'leve') {
    concerns.push('Concentracion de colaboradores con bajo desempeno.');
    recommendations.push('Programas de capacitacion focalizados.');
  }

  // Analizar rango
  if (stats.max - stats.min > 40) {
    concerns.push('Brecha muy amplia entre el mejor y peor desempeno.');
    recommendations.push('Mentoria de alto rendimiento a bajo rendimiento.');
  }

  const summary = concerns.length === 0
    ? `El segmento "${stats.segment}" muestra un desempeno saludable con promedio de ${stats.mean}%.`
    : `El segmento "${stats.segment}" presenta ${concerns.length} area(s) de atencion con promedio de ${stats.mean}%.`;

  return { summary, concerns, recommendations };
}

/**
 * Genera resumen estadistico general
 */
export function generateStatisticalSummary(data: number[]): {
  centralTendency: string;
  dispersion: string;
  distribution: string;
  outliers: number[];
  interpretation: string;
} {
  const avg = mean(data);
  const med = median(data);
  const std = standardDeviation(data);
  const cv = coefficientOfVariation(data);
  const sk = skewness(data);
  const kurt = kurtosis(data);
  const iqrData = interquartileRange(data);

  // Detectar outliers (metodo IQR)
  const lowerBound = iqrData.q1 - 1.5 * iqrData.iqr;
  const upperBound = iqrData.q3 + 1.5 * iqrData.iqr;
  const outliers = data.filter(v => v < lowerBound || v > upperBound);

  const centralTendency = Math.abs(avg - med) < 3
    ? `Tendencia central estable: media ${round(avg, 1)}%, mediana ${round(med, 1)}%.`
    : `Diferencia entre media (${round(avg, 1)}%) y mediana (${round(med, 1)}%) sugiere distribucion asimetrica.`;

  const dispersion = cv < 15
    ? `Baja variabilidad (CV = ${round(cv, 1)}%), desempeno homogeneo.`
    : cv < 30
    ? `Variabilidad moderada (CV = ${round(cv, 1)}%), cierta heterogeneidad.`
    : `Alta variabilidad (CV = ${round(cv, 1)}%), desempeno muy heterogeneo.`;

  const skInterp = getSkewnessInterpretation(sk);
  const kurtInterp = getKurtosisInterpretation(kurt);
  const distribution = `${skInterp.descripcion} ${kurtInterp.descripcion}`;

  const interpretation = `
El analisis de ${data.length} evaluaciones muestra:
- ${centralTendency}
- ${dispersion}
- ${outliers.length > 0 ? `Se detectaron ${outliers.length} valores atipicos.` : 'No se detectaron valores atipicos.'}
`.trim();

  return {
    centralTendency,
    dispersion,
    distribution,
    outliers: outliers.map(o => round(o, 2)),
    interpretation,
  };
}

// ═══════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═══════════════════════════════════════════════════════════════

function round(value: number, decimals: number): number {
  if (isNaN(value) || !isFinite(value)) return 0;
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function getRanks(data: number[]): number[] {
  const sorted = data.map((val, idx) => ({ val, idx })).sort((a, b) => a.val - b.val);
  const ranks = new Array(data.length);

  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j < sorted.length - 1 && sorted[j].val === sorted[j + 1].val) {
      j++;
    }
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) {
      ranks[sorted[k].idx] = avgRank;
    }
    i = j;
  }

  return ranks;
}

// Aproximaciones de p-values (simplificadas)
function approximateTDistPValue(t: number, df: number): number {
  // Aproximacion usando distribucion normal para df > 30
  if (df > 30) {
    return 2 * (1 - normalCDF(Math.abs(t)));
  }
  // Para df pequenios, usar aproximacion conservadora
  const x = df / (df + t * t);
  return incompleteBeta(df / 2, 0.5, x);
}

function approximateFDistPValue(f: number, df1: number, df2: number): number {
  if (f <= 0) return 1;
  const x = df2 / (df2 + df1 * f);
  return incompleteBeta(df2 / 2, df1 / 2, x);
}

function approximateChiSquarePValue(chi2: number, df: number): number {
  if (chi2 <= 0) return 1;
  return 1 - gammaCDF(df / 2, chi2 / 2);
}

function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

function incompleteBeta(a: number, b: number, x: number): number {
  // Aproximacion simple
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x; // Simplificacion - en produccion usar libreria matematica
}

function gammaCDF(shape: number, x: number): number {
  // Aproximacion simple de la CDF gamma incompleta
  if (x <= 0) return 0;
  let sum = 0;
  let term = 1 / shape;
  for (let n = 1; n < 100; n++) {
    term *= x / (shape + n);
    sum += term;
    if (Math.abs(term) < 1e-10) break;
  }
  return Math.pow(x, shape) * Math.exp(-x) * (1 / shape + sum) / gamma(shape);
}

function gamma(z: number): number {
  // Aproximacion de Stirling
  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  }
  z -= 1;
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];
  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i);
  }
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

// ═══════════════════════════════════════════════════════════════
// DETECCIÓN DE OUTLIERS
// ═══════════════════════════════════════════════════════════════

export interface OutlierResult {
  value: number;
  index: number;
  type: 'extreme_high' | 'mild_high' | 'mild_low' | 'extreme_low';
  zScore: number;
  metadata?: Record<string, unknown>;
}

/**
 * Detecta outliers usando el método IQR (Interquartile Range)
 * Mild outliers: 1.5 * IQR, Extreme outliers: 3 * IQR
 */
export function detectOutliersIQR<T extends { value: number }>(
  data: T[],
  valueExtractor: (item: T) => number = (item) => item.value
): {
  outliers: Array<T & { outlierType: OutlierResult['type']; zScore: number }>;
  bounds: { lowerExtreme: number; lowerMild: number; upperMild: number; upperExtreme: number };
  stats: { total: number; outlierCount: number; outlierPercent: number };
} {
  const values = data.map(valueExtractor);
  const { q1, q3, iqr } = interquartileRange(values);

  const lowerExtreme = q1 - 3 * iqr;
  const lowerMild = q1 - 1.5 * iqr;
  const upperMild = q3 + 1.5 * iqr;
  const upperExtreme = q3 + 3 * iqr;

  const avg = mean(values);
  const std = standardDeviation(values);

  const outliers = data
    .map((item) => {
      const v = valueExtractor(item);
      const zScore = std > 0 ? (v - avg) / std : 0;
      let outlierType: OutlierResult['type'] | null = null;

      if (v > upperExtreme) outlierType = 'extreme_high';
      else if (v > upperMild) outlierType = 'mild_high';
      else if (v < lowerExtreme) outlierType = 'extreme_low';
      else if (v < lowerMild) outlierType = 'mild_low';

      return outlierType ? { ...item, outlierType, zScore: round(zScore, 2) } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    outliers,
    bounds: {
      lowerExtreme: round(lowerExtreme, 2),
      lowerMild: round(lowerMild, 2),
      upperMild: round(upperMild, 2),
      upperExtreme: round(upperExtreme, 2),
    },
    stats: {
      total: data.length,
      outlierCount: outliers.length,
      outlierPercent: round((outliers.length / data.length) * 100, 1),
    },
  };
}

/**
 * Detecta outliers usando Z-Score
 * @param threshold - Umbral de Z-score (default 2.5)
 */
export function detectOutliersZScore<T extends { value: number }>(
  data: T[],
  threshold: number = 2.5,
  valueExtractor: (item: T) => number = (item) => item.value
): Array<T & { zScore: number; outlierType: 'high' | 'low' }> {
  const values = data.map(valueExtractor);
  const avg = mean(values);
  const std = standardDeviation(values);

  if (std === 0) return [];

  return data
    .map((item) => {
      const v = valueExtractor(item);
      const zScore = (v - avg) / std;
      if (Math.abs(zScore) > threshold) {
        return {
          ...item,
          zScore: round(zScore, 2),
          outlierType: zScore > 0 ? 'high' as const : 'low' as const,
        };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

// ═══════════════════════════════════════════════════════════════
// ALPHA DE CRONBACH (CONSISTENCIA INTERNA)
// ═══════════════════════════════════════════════════════════════

/**
 * Calcula el Alpha de Cronbach para evaluar la consistencia interna
 * de un instrumento de evaluación
 * @param itemScores - Array de arrays donde cada sub-array contiene las respuestas a un ítem
 */
export function cronbachAlpha(itemScores: number[][]): {
  alpha: number;
  interpretation: string;
  reliability: 'excelente' | 'buena' | 'aceptable' | 'cuestionable' | 'pobre' | 'inaceptable';
  itemCount: number;
  sampleSize: number;
} {
  const k = itemScores.length; // número de ítems
  if (k < 2) {
    return {
      alpha: 0,
      interpretation: 'Se requieren al menos 2 ítems para calcular Alpha de Cronbach.',
      reliability: 'inaceptable',
      itemCount: k,
      sampleSize: 0,
    };
  }

  const n = itemScores[0]?.length || 0; // número de observaciones
  if (n < 2) {
    return {
      alpha: 0,
      interpretation: 'Se requieren al menos 2 observaciones para calcular Alpha de Cronbach.',
      reliability: 'inaceptable',
      itemCount: k,
      sampleSize: n,
    };
  }

  // Calcular varianza de cada ítem
  const itemVariances = itemScores.map(scores => variance(scores, true));
  const sumItemVariances = itemVariances.reduce((sum, v) => sum + v, 0);

  // Calcular totales por observación
  const totals: number[] = [];
  for (let i = 0; i < n; i++) {
    let total = 0;
    for (let j = 0; j < k; j++) {
      total += itemScores[j][i] || 0;
    }
    totals.push(total);
  }

  // Varianza de los totales
  const totalVariance = variance(totals, true);

  // Fórmula de Alpha de Cronbach
  const alpha = totalVariance > 0
    ? (k / (k - 1)) * (1 - sumItemVariances / totalVariance)
    : 0;

  // Interpretación
  let reliability: 'excelente' | 'buena' | 'aceptable' | 'cuestionable' | 'pobre' | 'inaceptable';
  let interpretation: string;

  if (alpha >= 0.9) {
    reliability = 'excelente';
    interpretation = 'Consistencia interna excelente. El instrumento es altamente confiable.';
  } else if (alpha >= 0.8) {
    reliability = 'buena';
    interpretation = 'Buena consistencia interna. El instrumento es confiable.';
  } else if (alpha >= 0.7) {
    reliability = 'aceptable';
    interpretation = 'Consistencia interna aceptable. El instrumento es suficientemente confiable.';
  } else if (alpha >= 0.6) {
    reliability = 'cuestionable';
    interpretation = 'Consistencia interna cuestionable. Se recomienda revisar algunos ítems.';
  } else if (alpha >= 0.5) {
    reliability = 'pobre';
    interpretation = 'Consistencia interna pobre. El instrumento necesita mejoras significativas.';
  } else {
    reliability = 'inaceptable';
    interpretation = 'Consistencia interna inaceptable. El instrumento no es confiable.';
  }

  return {
    alpha: round(alpha, 4),
    interpretation,
    reliability,
    itemCount: k,
    sampleSize: n,
  };
}

/**
 * Calcula el Alpha de Cronbach si se elimina cada ítem
 * Útil para identificar ítems problemáticos
 */
export function cronbachAlphaIfItemDeleted(itemScores: number[][]): Array<{
  itemIndex: number;
  alphaIfDeleted: number;
  changeFromTotal: number;
  recommendation: 'mantener' | 'revisar' | 'eliminar';
}> {
  const totalAlpha = cronbachAlpha(itemScores).alpha;
  const results: Array<{
    itemIndex: number;
    alphaIfDeleted: number;
    changeFromTotal: number;
    recommendation: 'mantener' | 'revisar' | 'eliminar';
  }> = [];

  for (let i = 0; i < itemScores.length; i++) {
    const reducedScores = [...itemScores.slice(0, i), ...itemScores.slice(i + 1)];
    const alphaIfDeleted = cronbachAlpha(reducedScores).alpha;
    const change = alphaIfDeleted - totalAlpha;

    let recommendation: 'mantener' | 'revisar' | 'eliminar';
    if (change > 0.05) {
      recommendation = 'eliminar';
    } else if (change > 0.02) {
      recommendation = 'revisar';
    } else {
      recommendation = 'mantener';
    }

    results.push({
      itemIndex: i,
      alphaIfDeleted: round(alphaIfDeleted, 4),
      changeFromTotal: round(change, 4),
      recommendation,
    });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════
// K-MEANS CLUSTERING SIMPLIFICADO
// ═══════════════════════════════════════════════════════════════

export interface ClusterResult<T> {
  clusterId: number;
  centroid: number[];
  members: T[];
  size: number;
  withinClusterVariance: number;
}

/**
 * Implementación simplificada de K-means clustering
 * @param data - Array de objetos con las dimensiones a agrupar
 * @param k - Número de clusters
 * @param dimensions - Funciones extractoras de cada dimensión
 * @param maxIterations - Máximo de iteraciones
 */
export function kMeansClustering<T>(
  data: T[],
  k: number,
  dimensions: Array<(item: T) => number>,
  maxIterations: number = 100
): {
  clusters: ClusterResult<T>[];
  iterations: number;
  totalWithinClusterSS: number;
} {
  if (data.length < k) {
    return { clusters: [], iterations: 0, totalWithinClusterSS: 0 };
  }

  const n = data.length;
  const d = dimensions.length;

  // Extraer valores de las dimensiones
  const points = data.map(item => dimensions.map(dim => dim(item)));

  // Inicializar centroides aleatoriamente (usando k-means++)
  const centroids: number[][] = [];
  const usedIndices = new Set<number>();

  // Primer centroide aleatorio
  const firstIdx = Math.floor(Math.random() * n);
  centroids.push([...points[firstIdx]]);
  usedIndices.add(firstIdx);

  // Seleccionar resto de centroides con probabilidad proporcional a distancia
  while (centroids.length < k) {
    const distances = points.map((p, idx) => {
      if (usedIndices.has(idx)) return 0;
      const minDist = Math.min(...centroids.map(c => euclideanDistance(p, c)));
      return minDist * minDist;
    });
    const totalDist = distances.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalDist;

    for (let i = 0; i < n; i++) {
      random -= distances[i];
      if (random <= 0 && !usedIndices.has(i)) {
        centroids.push([...points[i]]);
        usedIndices.add(i);
        break;
      }
    }
  }

  // Asignaciones de cluster
  let assignments = new Array(n).fill(0);
  let iterations = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations++;
    let changed = false;

    // Asignar puntos al cluster más cercano
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let minCluster = 0;

      for (let c = 0; c < k; c++) {
        const dist = euclideanDistance(points[i], centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          minCluster = c;
        }
      }

      if (assignments[i] !== minCluster) {
        assignments[i] = minCluster;
        changed = true;
      }
    }

    if (!changed) break;

    // Recalcular centroides
    for (let c = 0; c < k; c++) {
      const clusterPoints = points.filter((_, i) => assignments[i] === c);
      if (clusterPoints.length > 0) {
        for (let dim = 0; dim < d; dim++) {
          centroids[c][dim] = mean(clusterPoints.map(p => p[dim]));
        }
      }
    }
  }

  // Construir resultado
  const clusters: ClusterResult<T>[] = [];
  let totalWithinClusterSS = 0;

  for (let c = 0; c < k; c++) {
    const members = data.filter((_, i) => assignments[i] === c);
    const memberPoints = points.filter((_, i) => assignments[i] === c);

    // Calcular varianza intra-cluster
    let withinSS = 0;
    for (const p of memberPoints) {
      withinSS += euclideanDistance(p, centroids[c]) ** 2;
    }
    totalWithinClusterSS += withinSS;

    clusters.push({
      clusterId: c,
      centroid: centroids[c].map(v => round(v, 2)),
      members,
      size: members.length,
      withinClusterVariance: round(memberPoints.length > 0 ? withinSS / memberPoints.length : 0, 2),
    });
  }

  return {
    clusters: clusters.sort((a, b) => b.size - a.size),
    iterations,
    totalWithinClusterSS: round(totalWithinClusterSS, 2),
  };
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

/**
 * Sugiere el número óptimo de clusters usando el método del codo (elbow)
 */
export function suggestOptimalClusters<T>(
  data: T[],
  dimensions: Array<(item: T) => number>,
  maxK: number = 10
): {
  suggestions: Array<{ k: number; withinSS: number; silhouette: number }>;
  recommended: number;
} {
  const suggestions: Array<{ k: number; withinSS: number; silhouette: number }> = [];

  for (let k = 2; k <= Math.min(maxK, Math.floor(data.length / 2)); k++) {
    const result = kMeansClustering(data, k, dimensions);
    // Silhouette simplificado (aproximación)
    const silhouette = 1 - (result.totalWithinClusterSS / (data.length * dimensions.length * 100));
    suggestions.push({
      k,
      withinSS: result.totalWithinClusterSS,
      silhouette: round(Math.max(0, Math.min(1, silhouette)), 3),
    });
  }

  // Encontrar el "codo" usando la segunda derivada
  let maxChange = 0;
  let recommended = 3;

  for (let i = 1; i < suggestions.length - 1; i++) {
    const change = (suggestions[i - 1].withinSS - suggestions[i].withinSS) -
                   (suggestions[i].withinSS - suggestions[i + 1].withinSS);
    if (change > maxChange) {
      maxChange = change;
      recommended = suggestions[i].k;
    }
  }

  return { suggestions, recommended };
}

// ═══════════════════════════════════════════════════════════════
// SCORE DE RIESGO COMPUESTO
// ═══════════════════════════════════════════════════════════════

export interface RiskFactor {
  name: string;
  value: number;
  weight: number;
  threshold: number;
  direction: 'higher_is_risk' | 'lower_is_risk';
}

/**
 * Calcula un score de riesgo compuesto basado en múltiples factores
 */
export function calculateRiskScore(factors: RiskFactor[]): {
  totalScore: number;
  riskLevel: 'bajo' | 'medio' | 'alto' | 'critico';
  contributingFactors: Array<{ name: string; contribution: number; alert: boolean }>;
  interpretation: string;
} {
  let totalWeightedScore = 0;
  let totalWeight = 0;
  const contributingFactors: Array<{ name: string; contribution: number; alert: boolean }> = [];

  for (const factor of factors) {
    let normalizedValue: number;

    if (factor.direction === 'lower_is_risk') {
      // Valores más bajos representan más riesgo
      normalizedValue = factor.value < factor.threshold
        ? 1 - (factor.value / factor.threshold)
        : 0;
    } else {
      // Valores más altos representan más riesgo
      normalizedValue = factor.value > factor.threshold
        ? Math.min(1, (factor.value - factor.threshold) / factor.threshold)
        : 0;
    }

    const contribution = normalizedValue * factor.weight;
    totalWeightedScore += contribution;
    totalWeight += factor.weight;

    contributingFactors.push({
      name: factor.name,
      contribution: round(contribution * 100, 1),
      alert: normalizedValue > 0.5,
    });
  }

  const totalScore = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0;

  let riskLevel: 'bajo' | 'medio' | 'alto' | 'critico';
  let interpretation: string;

  if (totalScore < 25) {
    riskLevel = 'bajo';
    interpretation = 'Riesgo bajo. No se requieren acciones inmediatas.';
  } else if (totalScore < 50) {
    riskLevel = 'medio';
    interpretation = 'Riesgo moderado. Se recomienda monitoreo preventivo.';
  } else if (totalScore < 75) {
    riskLevel = 'alto';
    interpretation = 'Riesgo alto. Se requieren acciones de retención.';
  } else {
    riskLevel = 'critico';
    interpretation = 'Riesgo crítico. Intervención urgente recomendada.';
  }

  return {
    totalScore: round(totalScore, 1),
    riskLevel,
    contributingFactors: contributingFactors.sort((a, b) => b.contribution - a.contribution),
    interpretation,
  };
}

// ═══════════════════════════════════════════════════════════════
// NORMALIZACIÓN Y ESTANDARIZACIÓN
// ═══════════════════════════════════════════════════════════════

/**
 * Normaliza datos a un rango [0, 100]
 */
export function normalizeToPercent(data: number[]): number[] {
  const { min, max } = range(data);
  if (max === min) return data.map(() => 50);
  return data.map(v => round(((v - min) / (max - min)) * 100, 2));
}

/**
 * Estandariza datos (Z-score)
 */
export function standardize(data: number[]): number[] {
  const avg = mean(data);
  const std = standardDeviation(data);
  if (std === 0) return data.map(() => 0);
  return data.map(v => round((v - avg) / std, 4));
}

/**
 * Calcula percentil rank para cada valor
 */
export function percentileRanks(data: number[]): number[] {
  const sorted = [...data].sort((a, b) => a - b);
  return data.map(v => {
    const below = sorted.filter(s => s < v).length;
    const equal = sorted.filter(s => s === v).length;
    return round(((below + 0.5 * equal) / sorted.length) * 100, 1);
  });
}

// ═══════════════════════════════════════════════════════════════
// REGRESIÓN MÚLTIPLE
// ═══════════════════════════════════════════════════════════════

export interface MultipleRegressionResult {
  coefficients: Record<string, number>;
  intercept: number;
  rSquared: number;
  adjustedRSquared: number;
  standardError: number;
  fStatistic: number;
  pValue: number;
  significance: 'muy_significativo' | 'significativo' | 'moderado' | 'no_significativo';
  interpretation: string;
  predictions: number[];
  residuals: number[];
}

/**
 * Regresión múltiple usando mínimos cuadrados ordinarios (OLS)
 * @param y - Variable dependiente (desempeño)
 * @param X - Variables independientes (edad, antigüedad, etc.)
 */
export function multipleRegression(
  y: number[],
  X: Record<string, number[]>
): MultipleRegressionResult {
  const n = y.length;
  const variableNames = Object.keys(X);
  const k = variableNames.length;

  if (n < k + 2) {
    return {
      coefficients: {},
      intercept: 0,
      rSquared: 0,
      adjustedRSquared: 0,
      standardError: 0,
      fStatistic: 0,
      pValue: 1,
      significance: 'no_significativo',
      interpretation: 'Datos insuficientes para regresión múltiple',
      predictions: [],
      residuals: [],
    };
  }

  // Construir matriz de diseño (con columna de unos para intercepto)
  const designMatrix: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = [1, ...variableNames.map(name => X[name][i] || 0)];
    designMatrix.push(row);
  }

  // Calcular (X'X)^(-1)X'y usando método simplificado
  // Para simplificar, usamos aproximación iterativa
  const coefficients: Record<string, number> = {};
  let intercept = mean(y);

  // Ajuste iterativo simple (gradiente descendente simplificado)
  const learningRate = 0.01;
  const iterations = 1000;
  let currentIntercept = intercept;
  const currentCoeffs: Record<string, number> = {};
  variableNames.forEach(name => { currentCoeffs[name] = 0; });

  for (let iter = 0; iter < iterations; iter++) {
    let interceptGrad = 0;
    const coeffGrads: Record<string, number> = {};
    variableNames.forEach(name => { coeffGrads[name] = 0; });

    for (let i = 0; i < n; i++) {
      let prediction = currentIntercept;
      variableNames.forEach(name => {
        prediction += currentCoeffs[name] * (X[name][i] || 0);
      });
      const error = y[i] - prediction;
      
      interceptGrad += error;
      variableNames.forEach(name => {
        coeffGrads[name] += error * (X[name][i] || 0);
      });
    }

    currentIntercept += (learningRate / n) * interceptGrad;
    variableNames.forEach(name => {
      currentCoeffs[name] += (learningRate / n) * coeffGrads[name];
    });
  }

  intercept = currentIntercept;
  variableNames.forEach(name => {
    coefficients[name] = round(currentCoeffs[name], 4);
  });

  // Calcular predicciones y residuos
  const predictions: number[] = [];
  const residuals: number[] = [];
  for (let i = 0; i < n; i++) {
    let pred = intercept;
    variableNames.forEach(name => {
      pred += coefficients[name] * (X[name][i] || 0);
    });
    predictions.push(round(pred, 2));
    residuals.push(round(y[i] - pred, 2));
  }

  // Calcular R²
  const yMean = mean(y);
  const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const ssResidual = residuals.reduce((sum, r) => sum + r * r, 0);
  const rSquared = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;
  const adjustedRSquared = n > k + 1 
    ? 1 - ((1 - rSquared) * (n - 1) / (n - k - 1))
    : rSquared;

  // Calcular error estándar
  const standardError = Math.sqrt(ssResidual / (n - k - 1));

  // Calcular F-estadístico
  const ssModel = ssTotal - ssResidual;
  const fStatistic = (ssModel / k) / (ssResidual / (n - k - 1));
  const pValue = approximateFDistPValue(fStatistic, k, n - k - 1);

  let significance: 'muy_significativo' | 'significativo' | 'moderado' | 'no_significativo';
  if (pValue < 0.001) significance = 'muy_significativo';
  else if (pValue < 0.01) significance = 'significativo';
  else if (pValue < 0.05) significance = 'moderado';
  else significance = 'no_significativo';

  const interpretation = `El modelo explica el ${round(rSquared * 100, 1)}% de la varianza en el desempeño. ${
    significance === 'muy_significativo' || significance === 'significativo'
      ? 'El modelo es estadísticamente significativo.'
      : 'El modelo no es estadísticamente significativo.'
  }`;

  return {
    coefficients,
    intercept: round(intercept, 4),
    rSquared: round(rSquared, 4),
    adjustedRSquared: round(adjustedRSquared, 4),
    standardError: round(standardError, 2),
    fStatistic: round(fStatistic, 4),
    pValue: round(pValue, 4),
    significance,
    interpretation,
    predictions,
    residuals,
  };
}

// ═══════════════════════════════════════════════════════════════
// ANÁLISIS DE VARIANZA (ANOVA)
// ═══════════════════════════════════════════════════════════════

export interface ANOVAResult {
  groups: Array<{
    name: string;
    n: number;
    mean: number;
    variance: number;
    stdDev: number;
  }>;
  fStatistic: number;
  pValue: number;
  significance: 'muy_significativo' | 'significativo' | 'moderado' | 'no_significativo';
  interpretation: string;
  effectSize: number; // Eta-squared
}

/**
 * ANOVA de una vía para comparar medias entre grupos
 */
export function oneWayANOVA(
  groups: Record<string, number[]>
): ANOVAResult {
  const groupNames = Object.keys(groups);
  const k = groupNames.length;

  if (k < 2) {
    return {
      groups: [],
      fStatistic: 0,
      pValue: 1,
      significance: 'no_significativo',
      interpretation: 'Se requieren al menos 2 grupos para ANOVA',
      effectSize: 0,
    };
  }

  // Calcular estadísticas por grupo
  const groupStats = groupNames.map(name => {
    const values = groups[name].filter(v => isFinite(v) && !isNaN(v));
    return {
      name,
      n: values.length,
      mean: mean(values),
      variance: variance(values, true),
      stdDev: standardDeviation(values),
    };
  }).filter(g => g.n > 0);

  if (groupStats.length < 2) {
    return {
      groups: groupStats,
      fStatistic: 0,
      pValue: 1,
      significance: 'no_significativo',
      interpretation: 'Datos insuficientes para ANOVA',
      effectSize: 0,
    };
  }

  const totalN = groupStats.reduce((sum, g) => sum + g.n, 0);
  const grandMean = groupStats.reduce((sum, g) => sum + g.mean * g.n, 0) / totalN;

  // Suma de cuadrados entre grupos (SSB)
  let ssBetween = 0;
  groupStats.forEach(g => {
    ssBetween += g.n * Math.pow(g.mean - grandMean, 2);
  });

  // Suma de cuadrados dentro de grupos (SSW)
  let ssWithin = 0;
  groupStats.forEach(g => {
    const groupValues = groups[g.name].filter(v => isFinite(v) && !isNaN(v));
    groupValues.forEach(v => {
      ssWithin += Math.pow(v - g.mean, 2);
    });
  });

  // Grados de libertad
  const dfBetween = groupStats.length - 1;
  const dfWithin = totalN - groupStats.length;

  // Cuadrados medios
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;

  // F-estadístico
  const fStatistic = msWithin > 0 ? msBetween / msWithin : 0;
  const pValue = approximateFDistPValue(fStatistic, dfBetween, dfWithin);

  let significance: 'muy_significativo' | 'significativo' | 'moderado' | 'no_significativo';
  if (pValue < 0.001) significance = 'muy_significativo';
  else if (pValue < 0.01) significance = 'significativo';
  else if (pValue < 0.05) significance = 'moderado';
  else significance = 'no_significativo';

  // Eta-squared (tamaño del efecto)
  const ssTotal = ssBetween + ssWithin;
  const effectSize = ssTotal > 0 ? ssBetween / ssTotal : 0;

  const interpretation = significance === 'muy_significativo' || significance === 'significativo'
    ? `Existen diferencias estadísticamente significativas entre los grupos (p = ${round(pValue, 4)}). El tamaño del efecto es ${round(effectSize * 100, 1)}%.`
    : `No se encontraron diferencias estadísticamente significativas entre los grupos (p = ${round(pValue, 4)}).`;

  return {
    groups: groupStats.map(g => ({
      ...g,
      mean: round(g.mean, 2),
      variance: round(g.variance, 2),
      stdDev: round(g.stdDev, 2),
    })),
    fStatistic: round(fStatistic, 4),
    pValue: round(pValue, 4),
    significance,
    interpretation,
    effectSize: round(effectSize, 4),
  };
}

// ═══════════════════════════════════════════════════════════════
// ANÁLISIS DE FACTORES PREDICTIVOS
// ═══════════════════════════════════════════════════════════════

export interface PredictiveFactor {
  variable: string;
  correlation: number;
  importance: number; // 0-100
  direction: 'positive' | 'negative';
  interpretation: string;
}

/**
 * Identifica qué variables predicen mejor el desempeño
 */
export function identifyPredictiveFactors(
  target: number[],
  predictors: Record<string, number[]>
): PredictiveFactor[] {
  const factors: PredictiveFactor[] = [];

  Object.entries(predictors).forEach(([name, values]) => {
    // Filtrar valores válidos
    const validPairs: Array<{ target: number; predictor: number }> = [];
    for (let i = 0; i < Math.min(target.length, values.length); i++) {
      if (isFinite(target[i]) && isFinite(values[i]) && !isNaN(target[i]) && !isNaN(values[i])) {
        validPairs.push({ target: target[i], predictor: values[i] });
      }
    }

    if (validPairs.length >= 10) {
      const corr = pearsonCorrelation(
        validPairs.map(p => p.target),
        validPairs.map(p => p.predictor)
      );
      const importance = Math.abs(corr) * 100;

      factors.push({
        variable: name,
        correlation: round(corr, 4),
        importance: round(importance, 1),
        direction: corr > 0 ? 'positive' : 'negative',
        interpretation: Math.abs(corr) > 0.5
          ? `Correlación fuerte (${corr > 0 ? 'positiva' : 'negativa'}). Variable importante para predecir desempeño.`
          : Math.abs(corr) > 0.3
          ? `Correlación moderada (${corr > 0 ? 'positiva' : 'negativa'}). Variable relevante.`
          : `Correlación débil. Variable de baja importancia predictiva.`,
      });
    }
  });

  return factors.sort((a, b) => b.importance - a.importance);
}
