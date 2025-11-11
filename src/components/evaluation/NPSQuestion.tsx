import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface NPSQuestionProps {
  value?: number;
  onChange: (value: number) => void;
}

export const NPSQuestion = ({ value, onChange }: NPSQuestionProps) => {
  const getNPSCategory = (score: number | undefined) => {
    if (score === undefined) return null;
    if (score >= 9) return { label: "Promotor", color: "bg-green-500 text-white" };
    if (score >= 7) return { label: "Pasivo", color: "bg-yellow-500 text-white" };
    return { label: "Detractor", color: "bg-red-500 text-white" };
  };

  const category = getNPSCategory(value);

  return (
    <Card className="mt-6 border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Recomendación Institucional</CardTitle>
          </div>
          {category && (
            <Badge className={category.color}>
              {category.label}
            </Badge>
          )}
        </div>
        <CardDescription className="mt-2">
          ¿Qué tan probable es que recomiendes la municipalidad como lugar de trabajo a un amigo o colega?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Label className="text-sm font-medium">
            Selecciona un valor del 0 al 10
          </Label>
          <p className="text-xs text-muted-foreground">
            0 = Nada probable • 10 = Extremadamente probable
          </p>
          
          <div className="grid grid-cols-11 gap-2">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
              <button
                key={score}
                type="button"
                onClick={() => onChange(score)}
                className={cn(
                  "h-12 rounded-md border-2 transition-all font-semibold text-sm",
                  "hover:scale-105 hover:shadow-md",
                  value === score
                    ? "border-primary bg-primary text-primary-foreground shadow-lg scale-105"
                    : "border-border bg-background text-foreground hover:border-primary/50"
                )}
              >
                {score}
              </button>
            ))}
          </div>

          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Nada probable</span>
            <span>Extremadamente probable</span>
          </div>

          {value !== undefined && (
            <div className="mt-4 p-3 bg-muted/50 rounded-md">
              <p className="text-sm">
                <strong>Tu puntuación: {value}/10</strong>
                {value >= 9 && (
                  <span className="text-success ml-2">
                    - ¡Gracias por ser promotor de nuestra institución!
                  </span>
                )}
                {value >= 7 && value < 9 && (
                  <span className="text-warning ml-2">
                    - Tu opinión es valiosa para mejorar
                  </span>
                )}
                {value < 7 && (
                  <span className="text-destructive ml-2">
                    - Queremos mejorar, tu feedback es importante
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
