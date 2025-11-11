import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";

interface MobileOpenQuestionsProps {
  questions: Array<{
    id: string;
    pregunta: string;
    tipo: "capacitacion" | "herramienta" | "otro";
    orden: number;
    obligatoria: boolean;
  }>;
  responses: Record<string, string>;
  onChange: (questionId: string, respuesta: string) => void;
  disabled?: boolean;
}

export const MobileOpenQuestions = ({
  questions,
  responses,
  onChange,
  disabled = false,
}: MobileOpenQuestionsProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Necesidades de Desarrollo y Recursos</h3>
      </div>
      
      <p className="text-base text-muted-foreground leading-relaxed">
        Comparta sus necesidades de capacitación y herramientas para mejorar su desempeño
      </p>

      <div className="space-y-6">
        {questions.map((question) => (
          <div key={question.id} className="space-y-3 p-4 rounded-lg border-2 bg-card">
            <Label htmlFor={`open-${question.id}`} className="text-base font-medium">
              {question.pregunta}
              {question.obligatoria && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={`open-${question.id}`}
              placeholder="Escriba su respuesta aquí..."
              value={responses[question.id] || ""}
              onChange={(e) => onChange(question.id, e.target.value)}
              rows={5}
              maxLength={500}
              disabled={disabled}
              className="resize-none text-base"
            />
            <p className="text-xs text-muted-foreground text-right">
              {responses[question.id]?.length || 0}/500 caracteres
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
