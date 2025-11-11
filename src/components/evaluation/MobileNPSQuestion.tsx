import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface MobileNPSQuestionProps {
  value?: number;
  onChange: (value: number) => void;
}

export const MobileNPSQuestion = ({ value, onChange }: MobileNPSQuestionProps) => {
  const getNPSCategory = (score: number | undefined) => {
    if (score === undefined) return null;
    if (score >= 9) return { label: "Promotor", color: "bg-success text-success-foreground" };
    if (score >= 7) return { label: "Pasivo", color: "bg-warning text-warning-foreground" };
    return { label: "Detractor", color: "bg-destructive text-destructive-foreground" };
  };

  const category = getNPSCategory(value);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Recomendación Institucional</h3>
        </div>
        {category && (
          <Badge className={category.color}>
            {category.label}
          </Badge>
        )}
      </div>
      
      <p className="text-base text-muted-foreground leading-relaxed">
        ¿Qué tan probable es que recomiendes la municipalidad como lugar de trabajo a un amigo o colega?
      </p>

      <div className="space-y-3">
        <p className="text-sm font-medium">
          Selecciona un valor del 0 al 10
        </p>
        <p className="text-xs text-muted-foreground">
          0 = Nada probable • 10 = Extremadamente probable
        </p>
        
        {/* Mobile: 2 rows */}
        <div className="grid grid-cols-6 gap-2 sm:hidden">
          {[0, 1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              className={cn(
                "h-14 rounded-lg border-2 transition-all font-bold text-lg",
                "hover:scale-105 hover:shadow-md active:scale-95",
                value === score
                  ? "border-primary bg-primary text-primary-foreground shadow-lg scale-105"
                  : "border-border bg-background text-foreground hover:border-primary/50"
              )}
            >
              {score}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-2 sm:hidden">
          {[6, 7, 8, 9, 10].map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              className={cn(
                "h-14 rounded-lg border-2 transition-all font-bold text-lg",
                "hover:scale-105 hover:shadow-md active:scale-95",
                value === score
                  ? "border-primary bg-primary text-primary-foreground shadow-lg scale-105"
                  : "border-border bg-background text-foreground hover:border-primary/50"
              )}
            >
              {score}
            </button>
          ))}
        </div>

        {/* Desktop: single row */}
        <div className="hidden sm:grid grid-cols-11 gap-2">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              className={cn(
                "h-14 rounded-lg border-2 transition-all font-bold text-lg",
                "hover:scale-105 hover:shadow-md active:scale-95",
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
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
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
    </div>
  );
};
