import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  ReferenceLine,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { pearsonCorrelation, getCorrelationInterpretation } from "@/lib/advancedStatistics";
import type { ScatterPoint, ScatterPlotData } from "@/types/analisis";

interface ScatterPlotCorrelationProps {
  data: ScatterPoint[];
  title?: string;
  description?: string;
  xLabel?: string;
  yLabel?: string;
  showTrendLine?: boolean;
  showCorrelation?: boolean;
  showQuadrants?: boolean;
  quadrantLabels?: { q1: string; q2: string; q3: string; q4: string };
  colorByGroup?: boolean;
  height?: number;
  colors?: string[];
  className?: string;
}

const defaultColors = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f43f5e", "#14b8a6",
];

// Calcular línea de regresión lineal
function calculateTrendLine(points: ScatterPoint[]): { slope: number; intercept: number; r2: number } | null {
  if (points.length < 2) return null;

  const n = points.length;
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);
  const sumY2 = points.reduce((sum, p) => sum + p.y * p.y, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calcular R²
  const meanY = sumY / n;
  const ssTotal = points.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0);
  const ssResidual = points.reduce((sum, p) => sum + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
  const r2 = 1 - ssResidual / ssTotal;

  return { slope, intercept, r2 };
}

export function ScatterPlotCorrelation({
  data,
  title,
  description,
  xLabel = "Variable X",
  yLabel = "Variable Y",
  showTrendLine = true,
  showCorrelation = true,
  showQuadrants = false,
  quadrantLabels,
  colorByGroup = true,
  height = 400,
  colors = defaultColors,
  className,
}: ScatterPlotCorrelationProps) {
  // Calcular correlación
  const xValues = data.map((d) => d.x);
  const yValues = data.map((d) => d.y);
  const correlation = pearsonCorrelation(xValues, yValues);
  const interpretation = getCorrelationInterpretation(correlation);

  // Calcular línea de tendencia
  const trendLine = showTrendLine ? calculateTrendLine(data) : null;

  // Calcular límites de los ejes
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const xPadding = (xMax - xMin) * 0.1;
  const yPadding = (yMax - yMin) * 0.1;

  // Centros de cuadrantes para líneas de referencia
  const xCenter = (xMin + xMax) / 2;
  const yCenter = (yMin + yMax) / 2;

  // Obtener grupos únicos
  const groups = [...new Set(data.filter((d) => d.group).map((d) => d.group!))];
  const hasGroups = groups.length > 0 && colorByGroup;
  // No mostrar leyenda si hay demasiados grupos (más de 8)
  const showLegend = hasGroups && groups.length <= 8;

  // Puntos de la línea de tendencia
  const trendLineData = trendLine
    ? [
        { x: xMin - xPadding, y: trendLine.slope * (xMin - xPadding) + trendLine.intercept },
        { x: xMax + xPadding, y: trendLine.slope * (xMax + xPadding) + trendLine.intercept },
      ]
    : [];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as ScatterPoint;

    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        {d.label && <p className="font-semibold mb-1">{d.label}</p>}
        <div className="space-y-1">
          <p>
            <span className="text-muted-foreground">{xLabel}: </span>
            <span className="font-mono">{d.x.toFixed(2)}</span>
          </p>
          <p>
            <span className="text-muted-foreground">{yLabel}: </span>
            <span className="font-mono">{d.y.toFixed(2)}</span>
          </p>
          {d.group && (
            <p>
              <span className="text-muted-foreground">Grupo: </span>
              <span>{d.group}</span>
            </p>
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
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                type="number"
                dataKey="x"
                name={xLabel}
                domain={[Math.floor(xMin - xPadding), Math.ceil(xMax + xPadding)]}
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => val.toFixed(0)}
                label={{ value: xLabel, position: "bottom", offset: 20, fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={yLabel}
                domain={[Math.floor(yMin - yPadding), Math.ceil(yMax + yPadding)]}
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => val.toFixed(0)}
                label={{ value: yLabel, angle: -90, position: "insideLeft", fontSize: 12 }}
              />
              <ZAxis dataKey="size" range={[80, 300]} />
              <Tooltip content={<CustomTooltip />} />

              {/* Líneas de cuadrantes */}
              {showQuadrants && (
                <>
                  <ReferenceLine x={xCenter} stroke="#9ca3af" strokeDasharray="5 5" />
                  <ReferenceLine y={yCenter} stroke="#9ca3af" strokeDasharray="5 5" />
                </>
              )}

              {/* Puntos por grupo o todos juntos */}
              {hasGroups ? (
                groups.map((group, groupIndex) => (
                  <Scatter
                    key={group}
                    name={group}
                    data={data.filter((d) => d.group === group)}
                    fill={colors[groupIndex % colors.length]}
                  />
                ))
              ) : (
                <Scatter name="Datos" data={data} fill={colors[0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.group ? colors[groups.indexOf(entry.group) % colors.length] : colors[0]}
                    />
                  ))}
                </Scatter>
              )}

              {/* Línea de tendencia */}
              {trendLine && trendLineData.length > 0 && (
                <Scatter
                  name="Tendencia"
                  data={trendLineData}
                  fill="transparent"
                  line={{ stroke: "#ef4444", strokeWidth: 2, strokeDasharray: "5 5" }}
                  shape={() => null}
                />
              )}

              {showLegend && <Legend />}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Panel de estadísticas */}
        {showCorrelation && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Correlación (r)</p>
                <p
                  className={cn(
                    "text-2xl font-mono font-bold",
                    correlation > 0.3 ? "text-green-600" :
                    correlation < -0.3 ? "text-red-600" : "text-gray-600"
                  )}
                >
                  {correlation.toFixed(3)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fuerza</p>
                <p className="text-lg font-medium capitalize">
                  {interpretation.strength.replace("_", " ")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dirección</p>
                <p className="text-lg font-medium capitalize">{interpretation.direction}</p>
              </div>
              {trendLine && (
                <div>
                  <p className="text-sm text-muted-foreground">R² (ajuste)</p>
                  <p className="text-2xl font-mono font-bold">{(trendLine.r2 * 100).toFixed(1)}%</p>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-3 text-center">
              {interpretation.description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Versión específica para Desempeño vs Potencial (típico para RRHH)
export function DesempenoPotencialScatter({
  data,
  title = "Correlación Desempeño vs Potencial",
  description,
  showQuadrants = true,
  height = 400,
  className,
}: {
  data: Array<{
    nombre?: string;
    desempeno: number;
    potencial: number;
    grupo?: string;
  }>;
  title?: string;
  description?: string;
  showQuadrants?: boolean;
  height?: number;
  className?: string;
}) {
  const scatterData: ScatterPoint[] = data.map((d) => ({
    x: d.desempeno,
    y: d.potencial,
    label: d.nombre,
    group: d.grupo,
  }));

  return (
    <ScatterPlotCorrelation
      data={scatterData}
      title={title}
      description={description}
      xLabel="Desempeño (%)"
      yLabel="Potencial (%)"
      showQuadrants={showQuadrants}
      quadrantLabels={{
        q1: "Alto Potencial / Alto Desempeño",
        q2: "Alto Potencial / Bajo Desempeño",
        q3: "Bajo Potencial / Bajo Desempeño",
        q4: "Bajo Potencial / Alto Desempeño",
      }}
      height={height}
      className={className}
    />
  );
}

// Versión para correlación Edad vs Desempeño
export function EdadDesempenoScatter({
  data,
  title = "Correlación Edad vs Desempeño",
  height = 400,
  className,
}: {
  data: Array<{
    nombre?: string;
    edad: number;
    desempeno: number;
    grupo?: string;
  }>;
  title?: string;
  height?: number;
  className?: string;
}) {
  const scatterData: ScatterPoint[] = data.map((d) => ({
    x: d.edad,
    y: d.desempeno,
    label: d.nombre,
    group: d.grupo,
  }));

  return (
    <ScatterPlotCorrelation
      data={scatterData}
      title={title}
      xLabel="Edad (años)"
      yLabel="Desempeño (%)"
      showQuadrants={false}
      height={height}
      className={className}
    />
  );
}

// Versión para correlación Antigüedad vs Desempeño
export function AntiguedadDesempenoScatter({
  data,
  title = "Correlación Antigüedad vs Desempeño",
  height = 400,
  className,
}: {
  data: Array<{
    nombre?: string;
    antiguedadMeses: number;
    desempeno: number;
    grupo?: string;
  }>;
  title?: string;
  height?: number;
  className?: string;
}) {
  const scatterData: ScatterPoint[] = data.map((d) => ({
    x: d.antiguedadMeses / 12, // Convertir a años
    y: d.desempeno,
    label: d.nombre,
    group: d.grupo,
  }));

  return (
    <ScatterPlotCorrelation
      data={scatterData}
      title={title}
      xLabel="Antigüedad (años)"
      yLabel="Desempeño (%)"
      showQuadrants={false}
      height={height}
      className={className}
    />
  );
}
