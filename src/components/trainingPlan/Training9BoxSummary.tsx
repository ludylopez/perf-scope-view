import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Distribucion9Box } from "@/types/trainingPlan";
import { Grid3X3, AlertTriangle, TrendingUp, Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Training9BoxSummaryProps {
  distribucion: Distribucion9Box[];
}

const getFactorUrgenciaColor = (factor: number) => {
  if (factor >= 80) return "text-destructive";
  if (factor >= 50) return "text-orange-500";
  return "text-muted-foreground";
};

const getFactorUrgenciaBg = (factor: number) => {
  if (factor >= 80) return "bg-destructive/10";
  if (factor >= 50) return "bg-orange-500/10";
  return "bg-muted";
};

export function Training9BoxSummary({ distribucion }: Training9BoxSummaryProps) {
  if (!distribucion || distribucion.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No hay datos de distribución 9-Box disponibles
        </CardContent>
      </Card>
    );
  }

  const total = distribucion.reduce((sum, d) => sum + d.cantidad, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Distribución 9-Box
          </CardTitle>
          <CardDescription>
            Clasificación de colaboradores según desempeño y potencial
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {distribucion.map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-4 border rounded-lg space-y-2",
                  getFactorUrgenciaBg(item.factorUrgencia)
                )}
                style={{
                  borderLeftColor: item.factorUrgencia >= 80 ? "#ef4444" : item.factorUrgencia >= 50 ? "#f97316" : "#6b7280",
                  borderLeftWidth: "4px",
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{item.posicion}</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Cantidad:</span>
                        <span className="font-medium">{item.cantidad}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Porcentaje:</span>
                        <span className="font-medium">{item.porcentaje}%</span>
                      </div>
                      <div className="mt-2">
                        <Progress value={item.porcentaje} className="h-2" />
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={item.factorUrgencia >= 80 ? "destructive" : item.factorUrgencia >= 50 ? "default" : "secondary"}
                    className="ml-2"
                  >
                    {item.factorUrgencia >= 80 ? (
                      <AlertTriangle className="h-3 w-3 mr-1" />
                    ) : item.factorUrgencia >= 50 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <Minus className="h-3 w-3 mr-1" />
                    )}
                    Factor: {item.factorUrgencia}
                  </Badge>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    <strong>Acción:</strong> {item.accionRecomendada}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total de Colaboradores:</span>
              <span className="text-lg font-bold">{total}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

