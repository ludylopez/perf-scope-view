import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GeneralStats } from "@/lib/statisticalAnalysis";
import { BarChart3 } from "lucide-react";

interface StatsOverviewProps {
  stats: GeneralStats[];
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const autoStats = stats.find(s => s.tipo === 'auto');
  const jefeStats = stats.find(s => s.tipo === 'jefe');

  if (!autoStats || !jefeStats) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No hay datos suficientes para mostrar estadísticas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Estadísticas Generales por Tipo de Evaluador
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Métrica</TableHead>
                <TableHead className="text-right">Autoevaluación</TableHead>
                <TableHead className="text-right">Evaluación Jefe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Cantidad de evaluaciones</TableCell>
                <TableCell className="text-right">{autoStats.cantidad}</TableCell>
                <TableCell className="text-right">{jefeStats.cantidad}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Promedio general</TableCell>
                <TableCell className="text-right">{autoStats.promedio.toFixed(2)}</TableCell>
                <TableCell className="text-right">{jefeStats.promedio.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Desviación estándar</TableCell>
                <TableCell className="text-right">{autoStats.desviacionEstandar.toFixed(2)}</TableCell>
                <TableCell className="text-right">{jefeStats.desviacionEstandar.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Mediana</TableCell>
                <TableCell className="text-right">{autoStats.mediana.toFixed(2)}</TableCell>
                <TableCell className="text-right">{jefeStats.mediana.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Score mínimo</TableCell>
                <TableCell className="text-right">{autoStats.minimo.toFixed(2)}</TableCell>
                <TableCell className="text-right">{jefeStats.minimo.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Score máximo</TableCell>
                <TableCell className="text-right">{autoStats.maximo.toFixed(2)}</TableCell>
                <TableCell className="text-right">{jefeStats.maximo.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Porcentaje con score ≥ 4</TableCell>
                <TableCell className="text-right">{autoStats.porcentajeAlto.toFixed(1)}%</TableCell>
                <TableCell className="text-right">{jefeStats.porcentajeAlto.toFixed(1)}%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Porcentaje con score &lt; 3</TableCell>
                <TableCell className="text-right">{autoStats.porcentajeBajo.toFixed(1)}%</TableCell>
                <TableCell className="text-right">{jefeStats.porcentajeBajo.toFixed(1)}%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}




