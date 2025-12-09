import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DifferenceCategory } from "@/lib/statisticalAnalysis";
import { PieChart } from "lucide-react";

interface DifferenceDistributionProps {
  categories: DifferenceCategory[];
}

export function DifferenceDistribution({ categories }: DifferenceDistributionProps) {
  const chartData = categories.map(cat => ({
    categoria: cat.interpretacion,
    cantidad: cat.cantidad,
    porcentaje: cat.porcentaje,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Distribución de Diferencias (Auto - Jefe)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="categoria" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  tick={{ fontSize: 11 }}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'cantidad' ? `${value} colaboradores` : `${value}%`,
                    name === 'cantidad' ? 'Cantidad' : 'Porcentaje'
                  ]}
                />
                <Legend />
                <Bar dataKey="cantidad" fill="#8884d8" name="Cantidad" />
                <Bar dataKey="porcentaje" fill="#82ca9d" name="Porcentaje (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Interpretación</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Porcentaje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.categoria}>
                  <TableCell className="font-medium">{cat.interpretacion}</TableCell>
                  <TableCell className="text-right">{cat.cantidad}</TableCell>
                  <TableCell className="text-right">{cat.porcentaje.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}


