import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvaluationWithScore } from "@/lib/statisticalAnalysis";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { LineChart, Line } from "recharts";
import { BarChart3 } from "lucide-react";

interface DistributionChartProps {
  evaluations: EvaluationWithScore[];
}

export function DistributionChart({ evaluations }: DistributionChartProps) {
  // Crear histograma de distribución
  const bins = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
  
  const autoScores = evaluations.filter(e => e.tipo === 'auto').map(e => e.score);
  const jefeScores = evaluations.filter(e => e.tipo === 'jefe').map(e => e.score);

  const getFrequency = (scores: number[], binStart: number, binEnd: number) => {
    return scores.filter(s => s >= binStart && s < binEnd).length;
  };

  const chartData = bins.slice(0, -1).map((bin, i) => {
    const binStart = bin;
    const binEnd = bins[i + 1];
    const binLabel = `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`;
    
    return {
      rango: binLabel,
      auto: getFrequency(autoScores, binStart, binEnd),
      jefe: getFrequency(jefeScores, binStart, binEnd),
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Distribución de Scores: Autoevaluación vs Evaluación Jefe
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="rango" />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value} evaluaciones`,
                  name === 'auto' ? 'Autoevaluación' : 'Evaluación Jefe'
                ]}
              />
              <Legend 
                formatter={(value) => value === 'auto' ? 'Autoevaluación' : 'Evaluación Jefe'}
              />
              <Bar dataKey="auto" fill="#8884d8" name="auto" />
              <Bar dataKey="jefe" fill="#82ca9d" name="jefe" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>Total autoevaluaciones: {autoScores.length}</p>
          <p>Total evaluaciones jefe: {jefeScores.length}</p>
        </div>
      </CardContent>
    </Card>
  );
}


