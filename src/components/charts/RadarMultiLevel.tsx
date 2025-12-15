import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RadarChartData } from "@/types/analisis";

interface RadarMultiLevelProps {
  data: RadarChartData[];
  series: Array<{
    dataKey: string;
    name: string;
    color: string;
    fillOpacity?: number;
  }>;
  title?: string;
  description?: string;
  domain?: [number, number];
  showLegend?: boolean;
  showGrid?: boolean;
  height?: number;
  className?: string;
}

const defaultColors = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f43f5e", "#14b8a6",
];

export function RadarMultiLevel({
  data,
  series,
  title,
  description,
  domain = [0, 100],
  showLegend = true,
  showGrid = true,
  height = 400,
  className,
}: RadarMultiLevelProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}:</span>
              </div>
              <span className="font-mono font-medium">{entry.value?.toFixed(1)}%</span>
            </div>
          ))}
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
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              {showGrid && <PolarGrid strokeDasharray="3 3" />}
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
              />
              <PolarRadiusAxis
                angle={90}
                domain={domain}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickCount={5}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              {series.map((s, index) => (
                <Radar
                  key={s.dataKey}
                  name={s.name}
                  dataKey={s.dataKey}
                  stroke={s.color || defaultColors[index % defaultColors.length]}
                  fill={s.color || defaultColors[index % defaultColors.length]}
                  fillOpacity={s.fillOpacity ?? 0.2}
                  strokeWidth={2}
                />
              ))}
              {showLegend && (
                <Legend
                  wrapperStyle={{ paddingTop: 20 }}
                  formatter={(value) => <span className="text-sm">{value}</span>}
                />
              )}
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Versión para comparar solo 2 series (típico auto vs jefe)
export function RadarComparativo({
  data,
  series1,
  series2,
  title,
  description,
  height = 350,
  className,
}: {
  data: Array<{ dimension: string; value1: number; value2: number }>;
  series1: { name: string; color?: string };
  series2: { name: string; color?: string };
  title?: string;
  description?: string;
  height?: number;
  className?: string;
}) {
  const radarData = data.map((d) => ({
    dimension: d.dimension,
    [series1.name]: d.value1,
    [series2.name]: d.value2,
  }));

  return (
    <RadarMultiLevel
      data={radarData}
      series={[
        { dataKey: series1.name, name: series1.name, color: series1.color || "#3b82f6" },
        { dataKey: series2.name, name: series2.name, color: series2.color || "#ef4444" },
      ]}
      title={title}
      description={description}
      height={height}
      className={className}
    />
  );
}

// Radar para dimensiones con colores por clasificación
export function RadarDimensiones({
  dimensiones,
  title = "Análisis por Dimensión",
  description,
  height = 400,
  className,
}: {
  dimensiones: Array<{
    nombre: string;
    valor: number;
    clasificacion: "fortaleza" | "oportunidad" | "critica";
  }>;
  title?: string;
  description?: string;
  height?: number;
  className?: string;
}) {
  const data = dimensiones.map((d) => ({
    dimension: d.nombre,
    valor: d.valor,
  }));

  const getColorByClasificacion = (clasificacion: string) => {
    switch (clasificacion) {
      case "fortaleza":
        return "#22c55e";
      case "oportunidad":
        return "#eab308";
      case "critica":
        return "#ef4444";
      default:
        return "#3b82f6";
    }
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
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
                tickCount={5}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = dimensiones.find((dim) => dim.nombre === payload[0].payload.dimension);
                  return (
                    <div className="bg-background border rounded-lg shadow-lg p-3">
                      <p className="font-semibold">{payload[0].payload.dimension}</p>
                      <p className="text-lg font-mono">{payload[0].value?.toFixed(1)}%</p>
                      {d && (
                        <p
                          className="text-sm capitalize mt-1"
                          style={{ color: getColorByClasificacion(d.clasificacion) }}
                        >
                          {d.clasificacion}
                        </p>
                      )}
                    </div>
                  );
                }}
              />
              <Radar
                name="Valor"
                dataKey="valor"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda de clasificaciones */}
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Fortaleza (≥75%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-muted-foreground">Oportunidad (60-74%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Crítica (&lt;60%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
