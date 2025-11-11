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
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border pb-4 mb-6">
      {/* Step indicator and Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-base px-3 py-1">
            Paso {currentStep + 1} de {steps.length}
          </Badge>
          <span className="text-sm text-muted-foreground">
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
