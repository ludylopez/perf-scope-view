import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface OpenQuestionsProps {
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

export const OpenQuestions = ({
  questions,
  responses,
  onChange,
  disabled = false,
}: OpenQuestionsProps) => {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Necesidades de Desarrollo y Recursos
        </CardTitle>
        <CardDescription>
          Comparta sus necesidades de capacitación y herramientas para mejorar su desempeño
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((question) => (
          <div key={question.id} className="space-y-2">
            <Label htmlFor={`open-${question.id}`} className="text-base font-medium">
              {question.pregunta}
              {question.obligatoria && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={`open-${question.id}`}
              placeholder="Escriba su respuesta aquí..."
              value={responses[question.id] || ""}
              onChange={(e) => onChange(question.id, e.target.value)}
              rows={4}
              maxLength={500}
              disabled={disabled}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {responses[question.id]?.length || 0}/500 caracteres
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

