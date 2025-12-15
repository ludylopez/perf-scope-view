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
import { CATEGORIAS_CALIFICACION, COLORES_CALIFICACION } from "@/types/analisis";

interface HistogramData {
  rango: string;
  cantidad: number;
  porcentaje: number;
  color?: string;
}

interface DistributionHistogramProps {
  data: HistogramData[];
  title?: string;
  description?: string;
  showPercentage?: boolean;
  showMean?: boolean;
  meanValue?: number;
  showMedian?: boolean;
  medianValue?: number;
  orientation?: "vertical" | "horizontal";
  height?: number;
  colorScheme?: "default" | "performance" | "custom";
  className?: string;
}

const defaultColors = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
];

export function DistributionHistogram({
  data,
  title,
  description,
  showPercentage = true,
  showMean = false,
  meanValue,
  showMedian = false,
  medianValue,
  orientation = "vertical",
  height = 350,
  colorScheme = "default",
  className,
}: DistributionHistogramProps) {
  const getColor = (index: number, rango: string) => {
    if (colorScheme === "performance") {
      // Buscar si coincide con alguna categoría de calificación
      const categoria = CATEGORIAS_CALIFICACION.find((c) => c.rango === rango);
      if (categoria) {
        return COLORES_CALIFICACION[categoria.categoria];
      }
    }
    return data[index]?.color || defaultColors[index % defaultColors.length];
  };

  const total = data.reduce((sum, d) => sum + d.cantidad, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as HistogramData;

    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold">{d.rango}</p>
        <div className="mt-2 space-y-1">
          <p>
            <span className="text-muted-foreground">Cantidad: </span>
            <span className="font-mono font-medium">{d.cantidad.toLocaleString()}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Porcentaje: </span>
            <span className="font-mono font-medium">{d.porcentaje.toFixed(1)}%</span>
          </p>
        </div>
      </div>
    );
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
          <div style={{ height: Math.max(height, data.length * 50) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 10, right: 50, left: 80, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="rango"
                  tick={{ fontSize: 12 }}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getColor(index, entry.rango)} />
                  ))}
                  {showPercentage && (
                    <LabelList
                      dataKey="porcentaje"
                      position="right"
                      formatter={(v: number) => `${v.toFixed(1)}%`}
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
              data={data}
              margin={{ top: 20, right: 20, bottom: 40, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis
                dataKey="rango"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <Tooltip content={<CustomTooltip />} />
              {showMean && meanValue !== undefined && (
                <ReferenceLine
                  x={meanValue}
                  stroke="#3b82f6"
                  strokeDasharray="5 5"
                  label={{
                    value: `Media: ${meanValue.toFixed(1)}`,
                    position: "top",
                    fill: "#3b82f6",
                    fontSize: 11,
                  }}
                />
              )}
              {showMedian && medianValue !== undefined && (
                <ReferenceLine
                  x={medianValue}
                  stroke="#8b5cf6"
                  strokeDasharray="5 5"
                  label={{
                    value: `Mediana: ${medianValue.toFixed(1)}`,
                    position: "top",
                    fill: "#8b5cf6",
                    fontSize: 11,
                  }}
                />
              )}
              <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(index, entry.rango)} />
                ))}
                {showPercentage && (
                  <LabelList
                    dataKey="porcentaje"
                    position="top"
                    formatter={(v: number) => `${v.toFixed(1)}%`}
                    style={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Resumen */}
        <div className="mt-4 flex justify-center gap-6 text-sm text-muted-foreground">
          <span>Total: <span className="font-mono font-medium text-foreground">{total.toLocaleString()}</span></span>
          {showMean && meanValue !== undefined && (
            <span>Media: <span className="font-mono font-medium text-foreground">{meanValue.toFixed(2)}</span></span>
          )}
          {showMedian && medianValue !== undefined && (
            <span>Mediana: <span className="font-mono font-medium text-foreground">{medianValue.toFixed(2)}</span></span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Histograma específico para distribución de calificaciones de desempeño
export function PerformanceDistributionChart({
  data,
  title = "Distribución de Calificaciones",
  description,
  showStats = true,
  mean,
  median,
  height = 350,
  className,
}: {
  data: Array<{
    categoria: string;
    rango: string;
    cantidad: number;
  }>;
  title?: string;
  description?: string;
  showStats?: boolean;
  mean?: number;
  median?: number;
  height?: number;
  className?: string;
}) {
  const total = data.reduce((sum, d) => sum + d.cantidad, 0);

  const histogramData: HistogramData[] = data.map((d) => ({
    rango: d.rango,
    cantidad: d.cantidad,
    porcentaje: total > 0 ? (d.cantidad / total) * 100 : 0,
    color: COLORES_CALIFICACION[d.categoria as keyof typeof COLORES_CALIFICACION],
  }));

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
              data={histogramData}
              margin={{ top: 20, right: 20, bottom: 40, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis
                dataKey="rango"
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  const cat = data.find((c) => c.rango === d.rango);

                  return (
                    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-semibold capitalize">
                        {cat?.categoria.replace("_", " ")}
                      </p>
                      <p className="text-muted-foreground">{d.rango}</p>
                      <div className="mt-2">
                        <p>
                          Cantidad: <span className="font-mono font-medium">{d.cantidad}</span>
                        </p>
                        <p>
                          Porcentaje: <span className="font-mono font-medium">{d.porcentaje.toFixed(1)}%</span>
                        </p>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                {histogramData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <LabelList
                  dataKey="cantidad"
                  position="top"
                  style={{ fontSize: 11, fill: "hsl(var(--foreground))", fontWeight: 500 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda de categorías */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          {data.map((d) => (
            <div key={d.categoria} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded"
                style={{
                  backgroundColor:
                    COLORES_CALIFICACION[d.categoria as keyof typeof COLORES_CALIFICACION],
                }}
              />
              <span className="capitalize text-muted-foreground">
                {d.categoria.replace("_", " ")}
              </span>
              <span className="font-mono">({d.cantidad})</span>
            </div>
          ))}
        </div>

        {/* Estadísticas */}
        {showStats && (
          <div className="mt-4 pt-4 border-t flex justify-center gap-8 text-sm">
            <div className="text-center">
              <p className="text-muted-foreground">Total</p>
              <p className="font-mono font-semibold text-lg">{total}</p>
            </div>
            {mean !== undefined && (
              <div className="text-center">
                <p className="text-muted-foreground">Media</p>
                <p className="font-mono font-semibold text-lg">{mean.toFixed(1)}%</p>
              </div>
            )}
            {median !== undefined && (
              <div className="text-center">
                <p className="text-muted-foreground">Mediana</p>
                <p className="font-mono font-semibold text-lg">{median.toFixed(1)}%</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
