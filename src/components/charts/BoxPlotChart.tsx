import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ErrorBar, Scatter, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BoxPlotData } from "@/types/analisis";

interface BoxPlotChartProps {
  data: BoxPlotData[];
  title?: string;
  description?: string;
  xLabel?: string;
  yLabel?: string;
  showMean?: boolean;
  showOutliers?: boolean;
  orientation?: "vertical" | "horizontal";
  height?: number;
  colors?: string[];
  className?: string;
}

const defaultColors = [
  "#3b82f6", "#22c55e", "#eab308", "#f97316", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#f43f5e",
];

// Componente custom para renderizar el box plot
const BoxPlotShape = (props: any) => {
  const { x, y, width, height, payload, fill } = props;
  const { min, q1, median, q3, max, mean } = payload;

  // Validar que todos los valores sean números válidos
  if (
    !isFinite(min) || !isFinite(q1) || !isFinite(median) ||
    !isFinite(q3) || !isFinite(max) ||
    min === undefined || q1 === undefined || median === undefined ||
    q3 === undefined || max === undefined
  ) {
    return null;
  }

  const range = max - min;
  // Evitar división por cero
  if (range <= 0 || !isFinite(range)) {
    return null;
  }

  // Calcular escala
  const yScale = height / range;
  const boxY = y + (max - q3) * yScale;
  const boxHeight = (q3 - q1) * yScale;
  const medianY = y + (max - median) * yScale;
  const meanY = mean !== undefined && isFinite(mean) ? y + (max - mean) * yScale : undefined;
  const minY = y + height;
  const maxY = y;
  const whiskerX = x + width / 2;

  return (
    <g>
      {/* Whisker superior (max a q3) */}
      <line
        x1={whiskerX}
        y1={maxY}
        x2={whiskerX}
        y2={boxY}
        stroke={fill}
        strokeWidth={1}
        strokeDasharray="3,3"
      />
      {/* Cap superior */}
      <line
        x1={x + width * 0.25}
        y1={maxY}
        x2={x + width * 0.75}
        y2={maxY}
        stroke={fill}
        strokeWidth={2}
      />

      {/* Caja (q1 a q3) */}
      <rect
        x={x}
        y={boxY}
        width={width}
        height={boxHeight}
        fill={fill}
        fillOpacity={0.3}
        stroke={fill}
        strokeWidth={2}
      />

      {/* Mediana */}
      <line
        x1={x}
        y1={medianY}
        x2={x + width}
        y2={medianY}
        stroke={fill}
        strokeWidth={3}
      />

      {/* Media (si está habilitada) */}
      {meanY !== undefined && (
        <circle
          cx={whiskerX}
          cy={meanY}
          r={4}
          fill="white"
          stroke={fill}
          strokeWidth={2}
        />
      )}

      {/* Whisker inferior (q1 a min) */}
      <line
        x1={whiskerX}
        y1={boxY + boxHeight}
        x2={whiskerX}
        y2={minY}
        stroke={fill}
        strokeWidth={1}
        strokeDasharray="3,3"
      />
      {/* Cap inferior */}
      <line
        x1={x + width * 0.25}
        y1={minY}
        x2={x + width * 0.75}
        y2={minY}
        stroke={fill}
        strokeWidth={2}
      />
    </g>
  );
};

export function BoxPlotChart({
  data,
  title,
  description,
  xLabel,
  yLabel,
  showMean = true,
  showOutliers = true,
  orientation = "vertical",
  height = 400,
  colors = defaultColors,
  className,
}: BoxPlotChartProps) {
  // Filtrar datos válidos primero
  const validData = data.filter(
    (d) =>
      isFinite(d.min) && isFinite(d.max) && isFinite(d.q1) &&
      isFinite(d.q3) && isFinite(d.median) && d.max > d.min
  );

  // Encontrar el rango global para el eje Y
  const allValues = validData.flatMap((d) => [d.min, d.max, ...(d.outliers || []).filter(isFinite)]);
  const globalMin = allValues.length > 0 ? Math.min(...allValues) : 0;
  const globalMax = allValues.length > 0 ? Math.max(...allValues) : 100;
  const range = globalMax - globalMin;
  const padding = range > 0 ? range * 0.1 : 10;

  // Preparar datos para renderizado personalizado (solo datos válidos)
  const chartData = validData.map((item, index) => ({
    ...item,
    fill: colors[index % colors.length],
    // Para el bar chart, usamos el rango completo
    range: item.max - item.min,
    base: item.min,
  }));

  // Si no hay datos válidos, mostrar mensaje
  if (chartData.length === 0) {
    return (
      <Card className={className}>
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>
          <div style={{ height }} className="flex items-center justify-center text-muted-foreground">
            No hay datos suficientes para mostrar el gráfico
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload as BoxPlotData & { fill: string };

    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold mb-2">{d.segment}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
          <span>Máximo:</span>
          <span className="font-mono text-foreground">{d.max.toFixed(2)}</span>
          <span>Q3 (75%):</span>
          <span className="font-mono text-foreground">{d.q3.toFixed(2)}</span>
          <span>Mediana:</span>
          <span className="font-mono text-foreground font-semibold">{d.median.toFixed(2)}</span>
          <span>Q1 (25%):</span>
          <span className="font-mono text-foreground">{d.q1.toFixed(2)}</span>
          <span>Mínimo:</span>
          <span className="font-mono text-foreground">{d.min.toFixed(2)}</span>
          {d.mean !== undefined && (
            <>
              <span>Media:</span>
              <span className="font-mono text-foreground">{d.mean.toFixed(2)}</span>
            </>
          )}
          {d.outliers && d.outliers.length > 0 && (
            <>
              <span>Outliers:</span>
              <span className="font-mono text-foreground">{d.outliers.length}</span>
            </>
          )}
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
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="segment"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
                label={xLabel ? { value: xLabel, position: "bottom", offset: 20 } : undefined}
              />
              <YAxis
                domain={[globalMin - padding, globalMax + padding]}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
                label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft" } : undefined}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Barras invisibles para detección de hover */}
              <Bar
                dataKey="range"
                fill="transparent"
                shape={<BoxPlotShape />}
              />

              {/* Outliers */}
              {showOutliers && (
                <Scatter
                  data={chartData.flatMap((d, i) =>
                    (d.outliers || []).map((o) => ({
                      segment: d.segment,
                      outlier: o,
                      fill: d.fill,
                    }))
                  )}
                  dataKey="outlier"
                >
                  {chartData.flatMap((d) =>
                    (d.outliers || []).map((_, i) => (
                      <Cell key={`outlier-${d.segment}-${i}`} fill={d.fill} />
                    ))
                  )}
                </Scatter>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda explicativa */}
        <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-8 h-4 border-2 border-primary bg-primary/30 rounded-sm" />
            <span>Rango intercuartil (Q1-Q3)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-0.5 bg-primary" />
            <span>Mediana</span>
          </div>
          {showMean && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full border-2 border-primary bg-white" />
              <span>Media</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 border-t-2 border-dashed border-primary" />
            <span>Whiskers (min-max)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Versión simplificada para tablas o espacios pequeños
export function BoxPlotMini({
  min,
  q1,
  median,
  q3,
  max,
  color = "#3b82f6",
  width = 100,
}: {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  color?: string;
  width?: number;
}) {
  // Validar que todos los valores sean números válidos
  if (
    !isFinite(min) || !isFinite(q1) || !isFinite(median) || 
    !isFinite(q3) || !isFinite(max) ||
    min === undefined || q1 === undefined || median === undefined ||
    q3 === undefined || max === undefined
  ) {
    return (
      <svg width={width} height={20} className="inline-block">
        <text x={width / 2} y={12} textAnchor="middle" fontSize="10" fill="#999">
          Sin datos
        </text>
      </svg>
    );
  }

  const range = max - min;
  if (range <= 0 || !isFinite(range)) {
    return (
      <svg width={width} height={20} className="inline-block">
        <text x={width / 2} y={12} textAnchor="middle" fontSize="10" fill="#999">
          Sin datos
        </text>
      </svg>
    );
  }

  const scale = (v: number) => {
    if (!isFinite(v)) return 0;
    return ((v - min) / range) * width;
  };

  return (
    <svg width={width} height={20} className="inline-block">
      {/* Whisker line */}
      <line
        x1={scale(min)}
        y1={10}
        x2={scale(max)}
        y2={10}
        stroke={color}
        strokeWidth={1}
        strokeDasharray="2,2"
      />
      {/* Min cap */}
      <line x1={scale(min)} y1={5} x2={scale(min)} y2={15} stroke={color} strokeWidth={1} />
      {/* Max cap */}
      <line x1={scale(max)} y1={5} x2={scale(max)} y2={15} stroke={color} strokeWidth={1} />
      {/* Box */}
      <rect
        x={scale(q1)}
        y={3}
        width={scale(q3) - scale(q1)}
        height={14}
        fill={color}
        fillOpacity={0.3}
        stroke={color}
        strokeWidth={1}
      />
      {/* Median */}
      <line x1={scale(median)} y1={3} x2={scale(median)} y2={17} stroke={color} strokeWidth={2} />
    </svg>
  );
}
