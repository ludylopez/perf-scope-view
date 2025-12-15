import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
} from "lucide-react";
import type { InterpretacionStats } from "@/types/analisis";

interface InterpretationCardProps {
  data: InterpretacionStats;
  showRecommendations?: boolean;
  className?: string;
}

const nivelConfig = {
  positivo: {
    icon: CheckCircle2,
    bgColor: "bg-green-50 dark:bg-green-950/20",
    borderColor: "border-green-200 dark:border-green-800",
    iconColor: "text-green-600",
    titleColor: "text-green-800 dark:text-green-400",
  },
  neutral: {
    icon: Info,
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    iconColor: "text-blue-600",
    titleColor: "text-blue-800 dark:text-blue-400",
  },
  atencion: {
    icon: AlertTriangle,
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    iconColor: "text-yellow-600",
    titleColor: "text-yellow-800 dark:text-yellow-400",
  },
  critico: {
    icon: AlertCircle,
    bgColor: "bg-red-50 dark:bg-red-950/20",
    borderColor: "border-red-200 dark:border-red-800",
    iconColor: "text-red-600",
    titleColor: "text-red-800 dark:text-red-400",
  },
};

export function InterpretationCard({
  data,
  showRecommendations = true,
  className,
}: InterpretationCardProps) {
  const config = nivelConfig[data.nivel];
  const Icon = config.icon;

  return (
    <Card className={cn(config.bgColor, config.borderColor, "border", className)}>
      <CardHeader className="pb-3">
        <CardTitle className={cn("flex items-center gap-2 text-lg", config.titleColor)}>
          <Icon className={cn("h-5 w-5", config.iconColor)} />
          {data.titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{data.descripcion}</p>

        {data.hallazgos.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Hallazgos principales:</h4>
            <ul className="space-y-1.5">
              {data.hallazgos.map((hallazgo, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className={cn("mt-1 w-1.5 h-1.5 rounded-full shrink-0", config.iconColor.replace("text-", "bg-"))} />
                  <span>{hallazgo}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {showRecommendations && data.recomendaciones && data.recomendaciones.length > 0 && (
          <div className="pt-2 border-t">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Recomendaciones:
            </h4>
            <ul className="space-y-1.5">
              {data.recomendaciones.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0 bg-amber-500" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente para mostrar interpretación de correlación
export function CorrelationInterpretation({
  correlation,
  variable1,
  variable2,
  pValue,
  className,
}: {
  correlation: number | null | undefined;
  variable1: string;
  variable2: string;
  pValue?: number;
  className?: string;
}) {
  // Manejar casos donde correlation es undefined, null o NaN
  if (correlation === undefined || correlation === null || isNaN(correlation)) {
    const interpretacion: InterpretacionStats = {
      titulo: "Correlación no disponible",
      descripcion: `No se pudo calcular la correlación entre ${variable1} y ${variable2}. Esto puede deberse a datos insuficientes o valores faltantes.`,
      hallazgos: [
        "Datos insuficientes para calcular correlación",
        "Se requieren al menos 2 pares de valores válidos",
      ],
      recomendaciones: [
        "Verificar que existan suficientes datos para ambas variables",
        "Revisar si hay valores nulos o faltantes en los datos",
      ],
      nivel: "neutral",
    };
    return <InterpretationCard data={interpretacion} className={className} />;
  }

  const absCorr = Math.abs(correlation);
  const isPositive = correlation > 0;
  const isSignificant = pValue ? pValue < 0.05 : absCorr > 0.3;

  let fuerza = "muy débil";
  let nivel: InterpretacionStats["nivel"] = "neutral";

  if (absCorr >= 0.8) {
    fuerza = "muy fuerte";
    nivel = "positivo";
  } else if (absCorr >= 0.6) {
    fuerza = "fuerte";
    nivel = "positivo";
  } else if (absCorr >= 0.4) {
    fuerza = "moderada";
    nivel = "atencion";
  } else if (absCorr >= 0.2) {
    fuerza = "débil";
    nivel = "neutral";
  }

  const direccion = isPositive ? "positiva" : correlation < 0 ? "negativa" : "nula";

  const interpretacion: InterpretacionStats = {
    titulo: `Correlación ${direccion} ${fuerza}`,
    descripcion: isPositive
      ? `Existe una relación ${fuerza} entre ${variable1} y ${variable2}. A medida que ${variable1} aumenta, ${variable2} tiende a aumentar también.`
      : correlation < 0
      ? `Existe una relación ${fuerza} inversa entre ${variable1} y ${variable2}. A medida que ${variable1} aumenta, ${variable2} tiende a disminuir.`
      : `No se encontró una relación significativa entre ${variable1} y ${variable2}.`,
    hallazgos: [
      `Coeficiente de correlación: ${correlation.toFixed(3)}`,
      pValue ? `Valor p: ${pValue.toFixed(4)} (${isSignificant ? "estadísticamente significativo" : "no significativo"})` : "",
      `Fuerza de la relación: ${fuerza}`,
      `Dirección: ${direccion}`,
    ].filter(Boolean),
    recomendaciones: isSignificant
      ? [
          `Considerar esta variable (${variable1}) en análisis de ${variable2}`,
          absCorr >= 0.6 ? "Realizar análisis de regresión para predicciones" : undefined,
          absCorr < 0.4 ? "Explorar otras variables que puedan tener mayor impacto" : undefined,
        ].filter(Boolean) as string[]
      : ["Buscar otras variables con mayor poder explicativo"],
    nivel,
  };

  return <InterpretationCard data={interpretacion} className={className} />;
}

// Componente para mostrar interpretación de distribución
export function DistributionInterpretation({
  mean,
  median,
  stdDev,
  skewness,
  kurtosis,
  variableName = "los datos",
  className,
}: {
  mean: number | null | undefined;
  median: number | null | undefined;
  stdDev: number | null | undefined;
  skewness?: number | null;
  kurtosis?: number | null;
  variableName?: string;
  className?: string;
}) {
  // Manejar casos donde los valores principales son undefined, null o NaN
  if (
    mean === undefined || mean === null || isNaN(mean) ||
    median === undefined || median === null || isNaN(median) ||
    stdDev === undefined || stdDev === null || isNaN(stdDev)
  ) {
    const interpretacion: InterpretacionStats = {
      titulo: "Análisis de Distribución",
      descripcion: `No se pudo calcular las estadísticas de distribución para ${variableName}. Esto puede deberse a datos insuficientes.`,
      hallazgos: [
        "Datos insuficientes para calcular estadísticas",
        "Se requieren valores numéricos válidos",
      ],
      recomendaciones: [
        "Verificar que existan suficientes datos",
        "Revisar si hay valores nulos o faltantes",
      ],
      nivel: "neutral",
    };
    return <InterpretationCard data={interpretacion} className={className} />;
  }

  const hallazgos: string[] = [
    `Media: ${mean.toFixed(2)}`,
    `Mediana: ${median.toFixed(2)}`,
    `Desviación estándar: ${stdDev.toFixed(2)}`,
  ];

  let nivel: InterpretacionStats["nivel"] = "neutral";
  const recomendaciones: string[] = [];

  // Analizar asimetría
  if (skewness !== undefined) {
    hallazgos.push(`Asimetría: ${skewness.toFixed(3)}`);
    if (Math.abs(skewness) > 1) {
      hallazgos.push(
        skewness > 0
          ? "Distribución con sesgo positivo (cola derecha)"
          : "Distribución con sesgo negativo (cola izquierda)"
      );
      nivel = "atencion";
      recomendaciones.push("Revisar valores atípicos que puedan estar afectando la distribución");
    } else if (Math.abs(skewness) < 0.5) {
      hallazgos.push("Distribución aproximadamente simétrica");
    }
  }

  // Analizar curtosis
  if (kurtosis !== undefined) {
    hallazgos.push(`Curtosis: ${kurtosis.toFixed(3)}`);
    if (kurtosis > 3) {
      hallazgos.push("Distribución leptocúrtica (colas pesadas, pico pronunciado)");
      recomendaciones.push("Considerar presencia de outliers en los análisis");
    } else if (kurtosis < 3) {
      hallazgos.push("Distribución platicúrtica (colas ligeras, pico aplanado)");
    }
  }

  // Analizar diferencia media-mediana
  const diffMediaMediana = Math.abs(mean - median);
  if (diffMediaMediana > stdDev * 0.2) {
    hallazgos.push(
      `Diferencia notable entre media y mediana (${diffMediaMediana.toFixed(2)})`
    );
    recomendaciones.push("La mediana puede ser más representativa del valor típico");
    nivel = "atencion";
  }

  // Analizar dispersión
  const cv = (stdDev / mean) * 100;
  if (cv > 30) {
    hallazgos.push(`Alta variabilidad (CV: ${cv.toFixed(1)}%)`);
    nivel = "atencion";
    recomendaciones.push("Analizar por segmentos para identificar fuentes de variabilidad");
  } else if (cv < 10) {
    hallazgos.push(`Baja variabilidad (CV: ${cv.toFixed(1)}%)`);
    nivel = "positivo";
  }

  const interpretacion: InterpretacionStats = {
    titulo: "Análisis de Distribución",
    descripcion: `Resumen estadístico de ${variableName}. La distribución muestra ${cv > 20 ? "alta" : cv < 10 ? "baja" : "moderada"} variabilidad con una ${Math.abs((mean - median) / stdDev) < 0.2 ? "distribución simétrica" : "asimetría notable"}.`,
    hallazgos,
    recomendaciones: recomendaciones.length > 0 ? recomendaciones : undefined,
    nivel,
  };

  return <InterpretationCard data={interpretacion} className={className} />;
}

// Componente para mostrar interpretación de brecha/equidad
export function EquityInterpretation({
  grupo1,
  grupo2,
  variable,
  className,
}: {
  grupo1: { nombre: string; valor: number | null | undefined; n: number };
  grupo2: { nombre: string; valor: number | null | undefined; n: number };
  variable: string;
  className?: string;
}) {
  // Manejar casos donde los valores son undefined, null o NaN
  if (
    grupo1.valor === undefined || grupo1.valor === null || isNaN(grupo1.valor) ||
    grupo2.valor === undefined || grupo2.valor === null || isNaN(grupo2.valor)
  ) {
    const interpretacion: InterpretacionStats = {
      titulo: `Análisis de Equidad: ${variable}`,
      descripcion: `No se pudo calcular la brecha entre ${grupo1.nombre} y ${grupo2.nombre}. Datos insuficientes.`,
      hallazgos: [
        `${grupo1.nombre}: ${grupo1.valor !== undefined && grupo1.valor !== null ? grupo1.valor.toFixed(2) : "N/A"} (n=${grupo1.n})`,
        `${grupo2.nombre}: ${grupo2.valor !== undefined && grupo2.valor !== null ? grupo2.valor.toFixed(2) : "N/A"} (n=${grupo2.n})`,
        "Datos insuficientes para calcular brecha",
      ],
      recomendaciones: [
        "Verificar que ambos grupos tengan datos suficientes",
      ],
      nivel: "neutral",
    };
    return <InterpretationCard data={interpretacion} className={className} />;
  }

  const brecha = grupo1.valor - grupo2.valor;
  const brechaAbs = Math.abs(brecha);
  const brechaRelativa = (brechaAbs / Math.max(grupo1.valor, grupo2.valor)) * 100;
  const grupoMayor = brecha > 0 ? grupo1 : grupo2;
  const grupoMenor = brecha > 0 ? grupo2 : grupo1;

  let nivel: InterpretacionStats["nivel"] = "positivo";
  let descripcionBrecha = "mínima";

  if (brechaRelativa > 15) {
    nivel = "critico";
    descripcionBrecha = "significativa";
  } else if (brechaRelativa > 10) {
    nivel = "atencion";
    descripcionBrecha = "moderada";
  } else if (brechaRelativa > 5) {
    nivel = "neutral";
    descripcionBrecha = "leve";
  }

  const interpretacion: InterpretacionStats = {
    titulo: `Análisis de Equidad: ${variable}`,
    descripcion: `Comparación de ${variable} entre ${grupo1.nombre} y ${grupo2.nombre}. Se observa una brecha ${descripcionBrecha} de ${brechaAbs.toFixed(2)} puntos (${brechaRelativa.toFixed(1)}%).`,
    hallazgos: [
      `${grupo1.nombre}: ${grupo1.valor.toFixed(2)} (n=${grupo1.n})`,
      `${grupo2.nombre}: ${grupo2.valor.toFixed(2)} (n=${grupo2.n})`,
      `Brecha absoluta: ${brechaAbs.toFixed(2)} puntos`,
      `Brecha relativa: ${brechaRelativa.toFixed(1)}%`,
      `Grupo con mayor ${variable}: ${grupoMayor.nombre}`,
    ],
    recomendaciones:
      brechaRelativa > 5
        ? [
            `Investigar factores que puedan explicar la diferencia entre ${grupoMayor.nombre} y ${grupoMenor.nombre}`,
            brechaRelativa > 10
              ? "Considerar intervenciones específicas para reducir la brecha"
              : undefined,
            "Monitorear evolución de la brecha en próximos períodos",
          ].filter(Boolean) as string[]
        : ["Mantener monitoreo para asegurar equidad sostenida"],
    nivel,
  };

  return <InterpretationCard data={interpretacion} className={className} />;
}

// Componente simple para mostrar una métrica con tendencia
export function MetricWithTrend({
  label,
  value,
  previousValue,
  format = "number",
  invertTrend = false,
  className,
}: {
  label: string;
  value: number;
  previousValue?: number;
  format?: "number" | "percentage" | "decimal";
  invertTrend?: boolean;
  className?: string;
}) {
  const formatValue = (v: number) => {
    switch (format) {
      case "percentage":
        return `${v.toFixed(1)}%`;
      case "decimal":
        return v.toFixed(2);
      default:
        return v.toLocaleString();
    }
  };

  const change = previousValue ? value - previousValue : 0;
  const changePercent = previousValue ? ((change / previousValue) * 100).toFixed(1) : "0";
  const isPositive = invertTrend ? change < 0 : change > 0;
  const isNegative = invertTrend ? change > 0 : change < 0;

  return (
    <div className={cn("p-4 rounded-lg bg-muted/30", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-end gap-2 mt-1">
        <span className="text-2xl font-bold font-mono">{formatValue(value)}</span>
        {previousValue !== undefined && change !== 0 && (
          <div
            className={cn(
              "flex items-center gap-0.5 text-sm font-medium pb-1",
              isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-gray-500"
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : isNegative ? (
              <TrendingDown className="h-4 w-4" />
            ) : (
              <Minus className="h-4 w-4" />
            )}
            <span>{changePercent}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
