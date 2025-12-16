import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { BrechaDimension } from "@/types/trainingPlan";
import { AlertTriangle, TrendingDown, TrendingUp, Minus } from "lucide-react";

interface TrainingGapChartProps {
  brechas: BrechaDimension[];
}

const getPrioridadColor = (prioridad: string) => {
  switch (prioridad) {
    case "critica":
      return "#ef4444"; // red-500
    case "alta":
      return "#f97316"; // orange-500
    case "media":
      return "#eab308"; // yellow-500
    default:
      return "#22c55e"; // green-500
  }
};

const getPrioridadBadgeVariant = (prioridad: string): "destructive" | "default" | "secondary" | "outline" => {
  switch (prioridad) {
    case "critica":
      return "destructive";
    case "alta":
      return "default";
    case "media":
      return "secondary";
    default:
      return "outline";
  }
};

export function TrainingGapChart({ brechas }: TrainingGapChartProps) {
  if (!brechas || brechas.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No hay brechas identificadas para mostrar
        </CardContent>
      </Card>
    );
  }

  // Preparar datos para el gráfico
  const chartData = brechas.map((brecha) => ({
    dimension: brecha.dimensionNombre.length > 30 
      ? brecha.dimensionNombre.substring(0, 30) + "..." 
      : brecha.dimensionNombre,
    dimensionCompleta: brecha.dimensionNombre,
    zScore: brecha.zScore,
    promedioUnidad: brecha.promedioUnidad,
    promedioOrg: brecha.promedioOrg,
    prioridad: brecha.prioridad,
    colaboradoresDebiles: brecha.colaboradoresDebiles,
    porcentajeDebiles: brecha.porcentajeDebiles,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Brechas por Dimensión</CardTitle>
          <CardDescription>
            Comparación estadística entre unidad y organización usando Z-Score
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 20, right: 30, bottom: 20, left: 150 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                domain={[-3, 1]}
                label={{ value: "Z-Score", position: "insideBottom", offset: -5 }}
              />
              <YAxis 
                type="category" 
                dataKey="dimension"
                width={140}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold mb-2">{data.dimensionCompleta}</p>
                        <p className="text-sm"><strong>Z-Score:</strong> {data.zScore.toFixed(2)}</p>
                        <p className="text-sm"><strong>Promedio Unidad:</strong> {data.promedioUnidad.toFixed(2)}</p>
                        <p className="text-sm"><strong>Promedio Org:</strong> {data.promedioOrg.toFixed(2)}</p>
                        <p className="text-sm"><strong>Colaboradores Débiles:</strong> {data.colaboradoresDebiles} ({data.porcentajeDebiles}%)</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar dataKey="zScore" name="Z-Score">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getPrioridadColor(entry.prioridad)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabla detallada */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Brechas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {brechas.map((brecha, idx) => (
              <div
                key={idx}
                className="p-4 border rounded-lg space-y-2"
                style={{
                  borderLeftColor: getPrioridadColor(brecha.prioridad),
                  borderLeftWidth: "4px",
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">{brecha.dimensionNombre}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Promedio Unidad</p>
                        <p className="font-medium">{brecha.promedioUnidad.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Promedio Org</p>
                        <p className="font-medium">{brecha.promedioOrg.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Z-Score</p>
                        <div className="flex items-center gap-1">
                          {brecha.zScore < -1 ? (
                            <TrendingDown className="h-4 w-4 text-destructive" />
                          ) : brecha.zScore > 0 ? (
                            <TrendingUp className="h-4 w-4 text-success" />
                          ) : (
                            <Minus className="h-4 w-4 text-muted-foreground" />
                          )}
                          <p className="font-medium">{brecha.zScore.toFixed(2)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Colaboradores Débiles</p>
                        <p className="font-medium">
                          {brecha.colaboradoresDebiles} ({brecha.porcentajeDebiles}%)
                        </p>
                      </div>
                    </div>
                  </div>
                  <Badge variant={getPrioridadBadgeVariant(brecha.prioridad)}>
                    {brecha.prioridad.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



