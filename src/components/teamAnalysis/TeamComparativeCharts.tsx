import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { BarChart3, Trophy, Users, TrendingUp, TrendingDown } from "lucide-react";
import type { TeamComparativeChartsProps, TeamComparison } from "@/types/teamAnalysis";
import {
  NINE_BOX_METADATA,
  getPositionColor,
  type NineBoxPosition,
} from "@/lib/nineBoxMetadata";

export function TeamComparativeCharts({
  comparativas,
  promedioUnidad,
}: TeamComparativeChartsProps) {
  if (comparativas.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No hay equipos subordinados para comparar</p>
        </CardContent>
      </Card>
    );
  }

  // Preparar datos para el gráfico de barras
  const chartData = comparativas
    .filter((c) => c.promedioDesempeno !== null)
    .map((c) => ({
      nombre:
        c.jefeNombre.split(" ").slice(0, 2).join(" ").substring(0, 15) +
        (c.jefeNombre.length > 15 ? "..." : ""),
      nombreCompleto: c.jefeNombre,
      desempeno: Math.round(c.promedioDesempeno || 0),
      potencial: Math.round(c.promedioPotencial || 0),
      totalEquipo: c.totalEquipo,
      tasaCompletitud: Math.round(c.tasaCompletitud),
    }))
    .sort((a, b) => b.desempeno - a.desempeno);

  // Ordenar para ranking
  const ranking = [...comparativas]
    .filter((c) => c.promedioDesempeno !== null)
    .sort((a, b) => (b.promedioDesempeno || 0) - (a.promedioDesempeno || 0));

  return (
    <div className="space-y-6">
      {/* Gráfico de barras comparativo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Comparativa de Equipos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="nombre"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  tick={{ fontSize: 11 }}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value}%`,
                    name === "desempeno"
                      ? "Desempeño"
                      : name === "potencial"
                      ? "Potencial"
                      : name,
                  ]}
                  labelFormatter={(label) => {
                    const item = chartData.find((d) => d.nombre === label);
                    return item?.nombreCompleto || label;
                  }}
                />
                <Legend />
                <ReferenceLine
                  y={promedioUnidad}
                  stroke="#888"
                  strokeDasharray="5 5"
                  label={{
                    value: `Promedio: ${Math.round(promedioUnidad)}%`,
                    position: "insideTopRight",
                    fill: "#666",
                    fontSize: 11,
                  }}
                />
                <Bar
                  dataKey="desempeno"
                  name="Desempeño"
                  fill="#8884d8"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="potencial"
                  name="Potencial"
                  fill="#82ca9d"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Ranking de equipos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Ranking de Equipos por Desempeño
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Pos.</TableHead>
                <TableHead>Jefe de Equipo</TableHead>
                <TableHead className="text-center">Equipo</TableHead>
                <TableHead className="text-center">Completitud</TableHead>
                <TableHead className="text-center">Desempeño</TableHead>
                <TableHead className="text-center">Potencial</TableHead>
                <TableHead className="text-center">vs Promedio</TableHead>
                <TableHead className="text-center">Evaluación Jefe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((equipo, index) => {
                const diff = (equipo.promedioDesempeno || 0) - promedioUnidad;
                const posicionJefe = equipo.evaluacionJefe?.posicion9Box as
                  | NineBoxPosition
                  | undefined;
                const posicionMetadata = posicionJefe
                  ? NINE_BOX_METADATA[posicionJefe]
                  : null;
                const posicionColorClass = posicionJefe
                  ? getPositionColor(posicionJefe)
                  : "";

                return (
                  <TableRow key={equipo.jefeDpi}>
                    {/* Posición */}
                    <TableCell>
                      <Badge
                        variant={index === 0 ? "default" : "outline"}
                        className={
                          index === 0
                            ? "bg-yellow-500"
                            : index === 1
                            ? "bg-gray-400"
                            : index === 2
                            ? "bg-amber-600"
                            : ""
                        }
                      >
                        #{index + 1}
                      </Badge>
                    </TableCell>

                    {/* Info del jefe */}
                    <TableCell>
                      <div>
                        <p className="font-medium">{equipo.jefeNombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {equipo.jefeCargo}
                        </p>
                      </div>
                    </TableCell>

                    {/* Tamaño equipo */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{equipo.totalEquipo}</span>
                      </div>
                    </TableCell>

                    {/* Completitud */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={equipo.tasaCompletitud}
                          className="w-16 h-2"
                        />
                        <span className="text-sm">
                          {Math.round(equipo.tasaCompletitud)}%
                        </span>
                      </div>
                    </TableCell>

                    {/* Desempeño */}
                    <TableCell className="text-center">
                      <span className="text-lg font-bold text-primary">
                        {Math.round(equipo.promedioDesempeno || 0)}%
                      </span>
                    </TableCell>

                    {/* Potencial */}
                    <TableCell className="text-center">
                      <span className="text-lg font-medium text-blue-600">
                        {Math.round(equipo.promedioPotencial || 0)}%
                      </span>
                    </TableCell>

                    {/* Diferencia vs promedio */}
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          diff > 5
                            ? "bg-green-50 text-green-700 border-green-300"
                            : diff < -5
                            ? "bg-red-50 text-red-700 border-red-300"
                            : "bg-gray-50 text-gray-700"
                        }
                      >
                        {diff > 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1 inline" />
                        ) : diff < 0 ? (
                          <TrendingDown className="h-3 w-3 mr-1 inline" />
                        ) : null}
                        {diff > 0 ? "+" : ""}
                        {Math.round(diff)}%
                      </Badge>
                    </TableCell>

                    {/* Evaluación del jefe como colaborador */}
                    <TableCell className="text-center">
                      {equipo.evaluacionJefe?.existe ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm">
                            {Math.round(equipo.evaluacionJefe.desempeno || 0)}%
                          </span>
                          {posicionMetadata && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${posicionColorClass}`}
                            >
                              {posicionMetadata.shortName}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Sin evaluar
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resumen estadístico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Análisis Comparativo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700 font-medium">
                Mejor equipo
              </p>
              <p className="text-lg font-bold text-green-800">
                {ranking[0]?.jefeNombre.split(" ").slice(0, 2).join(" ")}
              </p>
              <p className="text-2xl font-bold text-green-600">
                {Math.round(ranking[0]?.promedioDesempeno || 0)}%
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700 font-medium">
                Promedio de equipos
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {Math.round(
                  comparativas.reduce(
                    (sum, c) => sum + (c.promedioDesempeno || 0),
                    0
                  ) / comparativas.filter((c) => c.promedioDesempeno).length || 0
                )}%
              </p>
              <p className="text-xs text-blue-600">
                Desempeño
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-700 font-medium">
                Mayor potencial
              </p>
              <p className="text-lg font-bold text-purple-800">
                {[...comparativas]
                  .sort(
                    (a, b) =>
                      (b.promedioPotencial || 0) - (a.promedioPotencial || 0)
                  )[0]
                  ?.jefeNombre.split(" ")
                  .slice(0, 2)
                  .join(" ")}
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {Math.round(
                  [...comparativas].sort(
                    (a, b) =>
                      (b.promedioPotencial || 0) - (a.promedioPotencial || 0)
                  )[0]?.promedioPotencial || 0
                )}%
              </p>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-700 font-medium">
                Equipos por encima del promedio
              </p>
              <p className="text-2xl font-bold text-amber-600">
                {
                  comparativas.filter(
                    (c) => (c.promedioDesempeno || 0) > promedioUnidad
                  ).length
                }{" "}
                de {comparativas.length}
              </p>
              <p className="text-xs text-amber-600">
                ({Math.round(
                  (comparativas.filter(
                    (c) => (c.promedioDesempeno || 0) > promedioUnidad
                  ).length /
                    comparativas.length) *
                    100
                )}%)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
