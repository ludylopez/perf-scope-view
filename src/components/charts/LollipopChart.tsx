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
import type { LollipopData } from "@/types/analisis";

interface LollipopChartProps {
  data: LollipopData[];
  title?: string;
  description?: string;
  orientation?: "horizontal" | "vertical";
  showBaseline?: boolean;
  baselineValue?: number;
  baselineLabel?: string;
  showValues?: boolean;
  valueFormat?: "number" | "percentage" | "decimal";
  sortBy?: "value" | "label" | "none";
  sortOrder?: "asc" | "desc";
  height?: number;
  colors?: {
    positive?: string;
    negative?: string;
    neutral?: string;
    baseline?: string;
  };
  className?: string;
}

const defaultColors = {
  positive: "#22c55e",
  negative: "#ef4444",
  neutral: "#3b82f6",
  baseline: "#9ca3af",
};

export function LollipopChart({
  data,
  title,
  description,
  orientation = "horizontal",
  showBaseline = true,
  baselineValue = 0,
  baselineLabel = "Base",
  showValues = true,
  valueFormat = "number",
  sortBy = "value",
  sortOrder = "desc",
  height = 400,
  colors = defaultColors,
  className,
}: LollipopChartProps) {
  const mergedColors = { ...defaultColors, ...colors };

  // Ordenar datos
  const sortedData = [...data].sort((a, b) => {
    if (sortBy === "none") return 0;
    if (sortBy === "label") {
      return sortOrder === "asc"
        ? a.label.localeCompare(b.label)
        : b.label.localeCompare(a.label);
    }
    return sortOrder === "asc" ? a.value - b.value : b.value - a.value;
  });

  const getColor = (value: number, baseline: number | undefined) => {
    const base = baseline ?? baselineValue;
    if (value > base) return mergedColors.positive;
    if (value < base) return mergedColors.negative;
    return mergedColors.neutral;
  };

  const formatValue = (val: number): string => {
    switch (valueFormat) {
      case "percentage":
        return `${val.toFixed(1)}%`;
      case "decimal":
        return val.toFixed(2);
      default:
        return val.toLocaleString();
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as LollipopData;

    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold">{d.label}</p>
        <div className="flex items-center gap-2 mt-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getColor(d.value, d.baseline) }}
          />
          <span className="font-mono">{formatValue(d.value)}</span>
        </div>
        {d.baseline !== undefined && (
          <p className="text-muted-foreground text-xs mt-1">
            Base: {formatValue(d.baseline)} | Diferencia: {formatValue(d.value - d.baseline)}
          </p>
        )}
      </div>
    );
  };

  // Calcular dominio del eje
  const allValues = sortedData.flatMap((d) => [d.value, d.baseline ?? baselineValue]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const padding = (maxValue - minValue) * 0.1;

  // Shape personalizado para lollipop
  const LollipopShape = (props: any) => {
    const { x, y, width, height, fill, payload } = props;
    const isHorizontal = orientation === "horizontal";
    const value = payload.value;
    const baseline = payload.baseline ?? baselineValue;

    if (isHorizontal) {
      const circleX = x + width;
      const circleY = y + height / 2;
      const lineStartX = x;

      return (
        <g>
          <line
            x1={lineStartX}
            y1={circleY}
            x2={circleX}
            y2={circleY}
            stroke={fill}
            strokeWidth={2}
          />
          <circle
            cx={circleX}
            cy={circleY}
            r={6}
            fill={fill}
            stroke="white"
            strokeWidth={2}
          />
        </g>
      );
    } else {
      const circleX = x + width / 2;
      const circleY = y;

      return (
        <g>
          <line
            x1={circleX}
            y1={y + height}
            x2={circleX}
            y2={circleY}
            stroke={fill}
            strokeWidth={2}
          />
          <circle
            cx={circleX}
            cy={circleY}
            r={6}
            fill={fill}
            stroke="white"
            strokeWidth={2}
          />
        </g>
      );
    }
  };

  if (orientation === "horizontal") {
    return (
      <Card className={className}>
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>
          <div style={{ height: Math.max(height, sortedData.length * 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                <XAxis
                  type="number"
                  domain={[minValue - padding, maxValue + padding]}
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatValue}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  width={90}
                />
                <Tooltip content={<CustomTooltip />} />
                {showBaseline && (
                  <ReferenceLine
                    x={baselineValue}
                    stroke={mergedColors.baseline}
                    strokeDasharray="5 5"
                    label={{
                      value: baselineLabel,
                      position: "top",
                      fill: mergedColors.baseline,
                      fontSize: 11,
                    }}
                  />
                )}
                <Bar
                  dataKey="value"
                  shape={<LollipopShape />}
                  isAnimationActive={true}
                >
                  {sortedData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || getColor(entry.value, entry.baseline)}
                    />
                  ))}
                  {showValues && (
                    <LabelList
                      dataKey="value"
                      position="right"
                      formatter={formatValue}
                      style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
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

  // Orientación vertical
  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedData}
              margin={{ top: 20, right: 20, bottom: 60, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, angle: -45, textAnchor: "end" } as any}
                interval={0}
                height={60}
              />
              <YAxis
                domain={[minValue - padding, maxValue + padding]}
                tick={{ fontSize: 12 }}
                tickFormatter={formatValue}
              />
              <Tooltip content={<CustomTooltip />} />
              {showBaseline && (
                <ReferenceLine
                  y={baselineValue}
                  stroke={mergedColors.baseline}
                  strokeDasharray="5 5"
                  label={{
                    value: baselineLabel,
                    position: "left",
                    fill: mergedColors.baseline,
                    fontSize: 11,
                  }}
                />
              )}
              <Bar
                dataKey="value"
                shape={<LollipopShape />}
                isAnimationActive={true}
              >
                {sortedData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || getColor(entry.value, entry.baseline)}
                  />
                ))}
                {showValues && (
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={formatValue}
                    style={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
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

// Variante para mostrar brechas
export function GapLollipop({
  data,
  title,
  description,
  referenceLabel = "Promedio",
  referenceValue,
  height = 400,
  className,
}: {
  data: Array<{ label: string; value: number }>;
  title?: string;
  description?: string;
  referenceLabel?: string;
  referenceValue?: number;
  height?: number;
  className?: string;
}) {
  const avg = referenceValue ?? data.reduce((sum, d) => sum + d.value, 0) / data.length;

  const chartData: LollipopData[] = data.map((d) => ({
    label: d.label,
    value: d.value,
    baseline: avg,
  }));

  return (
    <LollipopChart
      data={chartData}
      title={title}
      description={description}
      baselineValue={avg}
      baselineLabel={`${referenceLabel}: ${avg.toFixed(1)}`}
      valueFormat="decimal"
      height={height}
      className={className}
    />
  );
}
