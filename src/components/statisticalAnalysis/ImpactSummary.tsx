import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImpactSummary as ImpactSummaryType } from "@/lib/statisticalAnalysis";
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from "lucide-react";

interface ImpactSummaryProps {
  impact: ImpactSummaryType;
}

export function ImpactSummary({ impact }: ImpactSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Resumen del Impacto del Cambio (50/50 → 70/30)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUp className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-green-700 dark:text-green-300">Colaboradores que Subirían</h3>
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">{impact.suben.cantidad}</div>
            <div className="text-sm text-green-600 dark:text-green-400">
              {impact.suben.porcentaje.toFixed(1)}% del total
            </div>
            <div className="text-sm text-green-600 dark:text-green-400 mt-1">
              Promedio: +{impact.suben.promedioPuntos.toFixed(2)} puntos
            </div>
          </div>

          <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDown className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-red-700 dark:text-red-300">Colaboradores que Bajarían</h3>
            </div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">{impact.bajan.cantidad}</div>
            <div className="text-sm text-red-600 dark:text-red-400">
              {impact.bajan.porcentaje.toFixed(1)}% del total
            </div>
            <div className="text-sm text-red-600 dark:text-red-400 mt-1">
              Promedio: -{impact.bajan.promedioPuntos.toFixed(2)} puntos
            </div>
          </div>

          <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-950">
            <div className="flex items-center gap-2 mb-2">
              <Minus className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Sin Cambio Significativo</h3>
            </div>
            <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{impact.sinCambio.cantidad}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {impact.sinCambio.porcentaje.toFixed(1)}% del total
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              (±0.1 puntos)
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold">Máxima Subida de Score</h3>
            </div>
            <div className="text-2xl font-bold text-green-600">+{impact.maximaSubida.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground mt-1">puntos</div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold">Máxima Baja de Score</h3>
            </div>
            <div className="text-2xl font-bold text-red-600">-{impact.maximaBaja.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground mt-1">puntos</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}




