import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Target, Scale, CheckSquare } from "lucide-react";

export const EvaluationInstructions = () => {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="instructions">
        <AccordionTrigger className="text-lg font-semibold">
          📋 Instructivo de Evaluación
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Qué mide este instrumento:</h4>
                  <p className="text-sm text-muted-foreground">
                    <strong>Desempeño actual:</strong> Qué tan bien cumple con las
                    responsabilidades de su puesto durante el período evaluado.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Scale className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                <div className="w-full">
                  <h4 className="font-semibold mb-2">Escala de calificación:</h4>
                  <div className="space-y-2">
                    <div className="flex gap-3 text-sm">
                      <span className="font-bold text-destructive">1</span>
                      <span className="text-muted-foreground">
                        <strong>Deficiente:</strong> No cumple con los estándares mínimos
                        requeridos
                      </span>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <span className="font-bold text-warning">2</span>
                      <span className="text-muted-foreground">
                        <strong>Por debajo del estándar:</strong> Cumple parcialmente,
                        necesita mejora significativa
                      </span>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <span className="font-bold text-info">3</span>
                      <span className="text-muted-foreground">
                        <strong>Cumple el estándar:</strong> Satisface los requisitos
                        básicos del puesto
                      </span>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <span className="font-bold text-primary">4</span>
                      <span className="text-muted-foreground">
                        <strong>Supera el estándar:</strong> Excede consistentemente las
                        expectativas
                      </span>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <span className="font-bold text-success">5</span>
                      <span className="text-muted-foreground">
                        <strong>Excelente:</strong> Desempeño excepcional, referente en la
                        organización
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckSquare className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Criterios de evaluación:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Base su evaluación en evidencias observables y hechos concretos</li>
                    <li>Considere el período completo de evaluación</li>
                    <li>Sea objetivo y consistente en sus criterios</li>
                    <li>
                      Utilice los espacios de comentarios para justificar calificaciones
                      extremas (1 o 5)
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-info mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Tiempo estimado:</h4>
                  <p className="text-sm text-muted-foreground">18-20 minutos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
