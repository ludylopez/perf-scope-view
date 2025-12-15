import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BumpChartData } from "@/types/analisis";

interface BumpChartProps {
  data: BumpChartData[];
  title?: string;
  description?: string;
  periods?: string[];
  showValues?: boolean;
  invertRanking?: boolean; // true = 1 es mejor (arriba), false = valores más altos arriba
  height?: number;
  colors?: string[];
  className?: string;
}

const defaultColors = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f43f5e", "#14b8a6",
  "#6366f1", "#10b981", "#f97316", "#dc2626", "#7c3aed",
];

export function BumpChart({
  data,
  title,
  description,
  periods,
  showValues = true,
  invertRanking = true,
  height = 400,
  colors = defaultColors,
  className,
}: BumpChartProps) {
  // Extraer todos los períodos únicos
  const allPeriods = periods || [...new Set(data.flatMap((d) => d.rankings.map((r) => r.period)))];

  // Transformar datos para Recharts
  const chartData = allPeriods.map((period) => {
    const periodData: Record<string, any> = { period };
    data.forEach((item) => {
      const ranking = item.rankings.find((r) => r.period === period);
      if (ranking) {
        periodData[item.name] = invertRanking ? ranking.rank : -ranking.rank;
        periodData[`${item.name}_value`] = ranking.value;
        periodData[`${item.name}_rank`] = ranking.rank;
      }
    });
    return periodData;
  });

  // Calcular dominio del eje Y
  const allRanks = data.flatMap((d) => d.rankings.map((r) => r.rank));
  const maxRank = Math.max(...allRanks);
  const minRank = Math.min(...allRanks);

  const CustomDot = (props: any) => {
    const { cx, cy, payload, dataKey } = props;
    if (!cx || !cy) return null;

    const rank = payload[`${dataKey}_rank`];

    return (
      <g>
        <circle cx={cx} cy={cy} r={12} fill="white" stroke={props.stroke} strokeWidth={2} />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={10}
          fontWeight="bold"
          fill={props.stroke}
        >
          {rank}
        </text>
      </g>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    // Ordenar por ranking
    const sortedPayload = [...payload].sort((a, b) => {
      const rankA = a.payload[`${a.dataKey}_rank`] ?? 999;
      const rankB = b.payload[`${b.dataKey}_rank`] ?? 999;
      return rankA - rankB;
    });

    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm max-w-xs">
        <p className="font-semibold mb-2">{label}</p>
        <div className="space-y-1">
          {sortedPayload.map((entry: any, index: number) => {
            const rank = entry.payload[`${entry.dataKey}_rank`];
            const value = entry.payload[`${entry.dataKey}_value`];

            return (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="truncate max-w-[120px]">{entry.dataKey}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-muted-foreground">#{rank}</span>
                  {value !== undefined && (
                    <span className="font-mono font-medium">{value.toFixed(1)}</span>
                  )}
                </div>
              </div>
            );
          })}
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
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                domain={invertRanking ? [0.5, maxRank + 0.5] : [-(maxRank + 0.5), -0.5]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
                tickFormatter={(v) => `#${Math.abs(v)}`}
                reversed={invertRanking}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: 10 }}
                formatter={(value) => (
                  <span className="text-sm">{value}</span>
                )}
              />
              {data.map((item, index) => (
                <Line
                  key={item.name}
                  type="monotone"
                  dataKey={item.name}
                  stroke={colors[index % colors.length]}
                  strokeWidth={3}
                  dot={showValues ? <CustomDot /> : { r: 4, fill: colors[index % colors.length] }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Versión simplificada para ranking actual con cambios
export function RankingChangeChart({
  data,
  title = "Ranking",
  description,
  valueLabel = "Valor",
  height = 400,
  className,
}: {
  data: Array<{
    name: string;
    currentRank: number;
    previousRank?: number;
    value: number;
  }>;
  title?: string;
  description?: string;
  valueLabel?: string;
  height?: number;
  className?: string;
}) {
  // Ordenar por ranking actual
  const sortedData = [...data].sort((a, b) => a.currentRank - b.currentRank);

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-2" style={{ maxHeight: height, overflowY: "auto" }}>
          {sortedData.map((item, index) => {
            const change = item.previousRank
              ? item.previousRank - item.currentRank
              : 0;
            const changeColor =
              change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-gray-400";

            return (
              <div
                key={item.name}
                className={cn(
                  "flex items-center gap-4 p-3 rounded-lg",
                  index < 3 ? "bg-primary/5" : "bg-muted/30"
                )}
              >
                {/* Posición */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                    index === 0
                      ? "bg-yellow-500 text-white"
                      : index === 1
                      ? "bg-gray-400 text-white"
                      : index === 2
                      ? "bg-amber-600 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {item.currentRank}
                </div>

                {/* Nombre */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {valueLabel}: <span className="font-mono">
                      {item.value !== undefined && item.value !== null 
                        ? item.value.toFixed(2) 
                        : 'N/A'}
                    </span>
                  </p>
                </div>

                {/* Cambio */}
                {item.previousRank !== undefined && change !== 0 && (
                  <div className={cn("flex items-center gap-1", changeColor)}>
                    {change > 0 ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    <span className="text-sm font-medium">{Math.abs(change)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Versión específica para ranking de direcciones/áreas
export function DireccionRankingChart({
  direcciones,
  title = "Ranking de Direcciones",
  description,
  metric = "desempeno",
  height = 400,
  className,
}: {
  direcciones: Array<{
    nombre: string;
    desempeno?: number;
    desempenoPromedio?: number;
    potencial?: number;
    potencialPromedio?: number;
    ranking: number;
    rankingAnterior?: number;
  }>;
  title?: string;
  description?: string;
  metric?: "desempeno" | "potencial";
  height?: number;
  className?: string;
}) {
  // Filtrar direcciones con datos válidos y mapear
  const rankingData = direcciones
    .filter(d => {
      if (metric === "potencial") {
        return (d.potencial !== undefined && d.potencial !== null) || 
               (d.potencialPromedio !== undefined && d.potencialPromedio !== null);
      }
      return (d.desempeno !== undefined && d.desempeno !== null) || 
             (d.desempenoPromedio !== undefined && d.desempenoPromedio !== null);
    })
    .map((d) => {
      let value: number | undefined;
      if (metric === "potencial") {
        value = d.potencial ?? d.potencialPromedio;
      } else {
        value = d.desempeno ?? d.desempenoPromedio;
      }
      
      return {
        name: d.nombre,
        currentRank: d.ranking,
        previousRank: d.rankingAnterior,
        value: value ?? 0,
      };
    });
  
  // Si no hay datos válidos, mostrar mensaje
  if (rankingData.length === 0) {
    return (
      <Card className={className}>
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            No hay datos disponibles para mostrar
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <RankingChangeChart
      data={rankingData}
      title={title}
      description={description}
      valueLabel={metric === "potencial" ? "Potencial" : "Desempeño"}
      height={height}
      className={className}
    />
  );
}
