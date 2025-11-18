import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface WizardStep {
  id: string;
  label: string;
  completed: boolean;
}

interface WizardHeaderProps {
  steps: WizardStep[];
  currentStep: number;
  totalProgress: number;
  answeredItems: number;
  totalItems: number;
}

export const WizardHeader = ({
  steps,
  currentStep,
  totalProgress,
  answeredItems,
  totalItems,
}: WizardHeaderProps) => {
  // Detectar si estamos en la primera dimensión de potencial
  const isFirstPotencialStep = steps[currentStep]?.id?.startsWith("potencial-") && 
    currentStep > 0 && 
    steps[currentStep - 1]?.id?.startsWith("desempeno-");

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border pb-4 mb-6">
      {/* Step indicator and Progress */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm sm:text-base px-2 sm:px-3 py-1">
              Paso {currentStep + 1} de {steps.length}
            </Badge>
            {isFirstPotencialStep && (
              <Badge variant="secondary" className="text-xs sm:text-sm px-2 py-1 animate-in fade-in slide-in-from-left-2">
                Nueva Sección
              </Badge>
            )}
          </div>
          <span className="text-xs sm:text-sm text-muted-foreground">
            {answeredItems} de {totalItems} respondidos
          </span>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progreso general</span>
            <span className="font-medium">{Math.round(totalProgress)}%</span>
          </div>
          <Progress value={totalProgress} className="h-2" />
        </div>
      </div>
    </div>
  );
};
