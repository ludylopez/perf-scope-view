import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DivergingBarData } from "@/types/analisis";

interface DivergingBarChartProps {
  data: DivergingBarData[];
  title?: string;
  description?: string;
  leftLabel?: string;
  rightLabel?: string;
  leftColor?: string;
  rightColor?: string;
  showValues?: boolean;
  valueFormat?: "number" | "percentage" | "decimal";
  height?: number;
  className?: string;
}

export function DivergingBarChart({
  data,
  title,
  description,
  leftLabel = "Izquierda",
  rightLabel = "Derecha",
  leftColor = "#ef4444",
  rightColor = "#22c55e",
  showValues = true,
  valueFormat = "decimal",
  height = 400,
  className,
}: DivergingBarChartProps) {
  // Transformar datos para gráfico divergente
  const chartData = data.map((d) => ({
    ...d,
    left: -d.leftValue, // Valores negativos para ir a la izquierda
    right: d.rightValue,
    diff: d.rightValue - d.leftValue,
  }));

  const formatValue = (val: number): string => {
    const absVal = Math.abs(val);
    switch (valueFormat) {
      case "percentage":
        return `${absVal.toFixed(1)}%`;
      case "decimal":
        return absVal.toFixed(2);
      default:
        return absVal.toLocaleString();
    }
  };

  // Calcular dominio simétrico
  const maxAbsValue = Math.max(
    ...data.flatMap((d) => [Math.abs(d.leftValue), Math.abs(d.rightValue)])
  );
  const domain = [-maxAbsValue * 1.1, maxAbsValue * 1.1];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;

    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold mb-2">{d.label}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: leftColor }} />
            <span className="text-muted-foreground">{d.leftLabel || leftLabel}:</span>
          </div>
          <span className="font-mono">{formatValue(d.leftValue)}</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: rightColor }} />
            <span className="text-muted-foreground">{d.rightLabel || rightLabel}:</span>
          </div>
          <span className="font-mono">{formatValue(d.rightValue)}</span>
        </div>
        <div className="mt-2 pt-2 border-t">
          <span className="text-muted-foreground">Diferencia: </span>
          <span
            className={cn(
              "font-mono font-semibold",
              d.diff > 0 ? "text-green-600" : d.diff < 0 ? "text-red-600" : "text-gray-600"
            )}
          >
            {d.diff > 0 ? "+" : ""}{formatValue(d.diff)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        {/* Leyenda superior */}
        <div className="flex justify-center gap-8 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: leftColor }} />
            <span className="text-sm font-medium">{leftLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: rightColor }} />
            <span className="text-sm font-medium">{rightLabel}</span>
          </div>
        </div>

        <div style={{ height: Math.max(height, data.length * 35) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 40, left: 100, bottom: 10 }}
              stackOffset="sign"
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
              <XAxis
                type="number"
                domain={domain}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatValue(Math.abs(v))}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 12 }}
                width={90}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine x={0} stroke="#9ca3af" strokeWidth={2} />

              <Bar dataKey="left" stackId="stack" fill={leftColor} radius={[4, 0, 0, 4]}>
                {showValues && (
                  <LabelList
                    dataKey="leftValue"
                    position="left"
                    formatter={formatValue}
                    style={{ fontSize: 10, fill: leftColor }}
                  />
                )}
              </Bar>
              <Bar dataKey="right" stackId="stack" fill={rightColor} radius={[0, 4, 4, 0]}>
                {showValues && (
                  <LabelList
                    dataKey="rightValue"
                    position="right"
                    formatter={formatValue}
                    style={{ fontSize: 10, fill: rightColor }}
                  />
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Variante específica para Auto vs Jefe
export function AutoVsJefeChart({
  data,
  title = "Comparativa Autoevaluación vs Evaluación Jefe",
  description,
  height = 400,
  className,
}: {
  data: Array<{
    dimension: string;
    auto: number;
    jefe: number;
  }>;
  title?: string;
  description?: string;
  height?: number;
  className?: string;
}) {
  const divergingData: DivergingBarData[] = data.map((d) => ({
    label: d.dimension,
    leftValue: d.auto,
    rightValue: d.jefe,
    leftLabel: "Auto",
    rightLabel: "Jefe",
  }));

  return (
    <DivergingBarChart
      data={divergingData}
      title={title}
      description={description}
      leftLabel="Autoevaluación"
      rightLabel="Evaluación Jefe"
      leftColor="#3b82f6"
      rightColor="#8b5cf6"
      valueFormat="decimal"
      height={height}
      className={className}
    />
  );
}

// Variante para mostrar brechas (diferencias respecto a un valor base)
export function GapBarChart({
  data,
  title,
  description,
  baselineLabel = "Base",
  positiveLabel = "Por encima",
  negativeLabel = "Por debajo",
  height = 400,
  className,
}: {
  data: Array<{
    label: string;
    value: number;
    baseline: number;
  }>;
  title?: string;
  description?: string;
  baselineLabel?: string;
  positiveLabel?: string;
  negativeLabel?: string;
  height?: number;
  className?: string;
}) {
  // Calcular diferencias
  const chartData = data.map((d) => {
    const diff = d.value - d.baseline;
    return {
      label: d.label,
      positive: diff > 0 ? diff : 0,
      negative: diff < 0 ? diff : 0,
      value: d.value,
      baseline: d.baseline,
      diff,
    };
  });

  const maxAbsDiff = Math.max(...chartData.map((d) => Math.abs(d.diff)));
  const domain = [-maxAbsDiff * 1.2, maxAbsDiff * 1.2];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;

    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold">{d.label}</p>
        <div className="mt-2 space-y-1">
          <p>
            <span className="text-muted-foreground">Valor: </span>
            <span className="font-mono">{d.value.toFixed(2)}</span>
          </p>
          <p>
            <span className="text-muted-foreground">{baselineLabel}: </span>
            <span className="font-mono">{d.baseline.toFixed(2)}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Diferencia: </span>
            <span
              className={cn(
                "font-mono font-semibold",
                d.diff > 0 ? "text-green-600" : d.diff < 0 ? "text-red-600" : ""
              )}
            >
              {d.diff > 0 ? "+" : ""}{d.diff.toFixed(2)}
            </span>
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <div className="flex justify-center gap-8 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span className="text-sm">{positiveLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span className="text-sm">{negativeLabel}</span>
          </div>
        </div>

        <div style={{ height: Math.max(height, data.length * 35) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
              <XAxis
                type="number"
                domain={domain}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.toFixed(1)}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 12 }}
                width={90}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine x={0} stroke="#9ca3af" strokeWidth={2} />
              <Bar dataKey="positive" fill="#22c55e" radius={[0, 4, 4, 0]} />
              <Bar dataKey="negative" fill="#ef4444" radius={[4, 0, 0, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
