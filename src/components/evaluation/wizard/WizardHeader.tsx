import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

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
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progreso General</span>
          <span className="text-sm text-muted-foreground">
            {answeredItems} de {totalItems} respondidos ({Math.round(totalProgress)}%)
          </span>
        </div>
        <Progress value={totalProgress} className="h-2" />
      </div>

      {/* Stepper - Desktop */}
      <div className="hidden md:flex items-center justify-between gap-2">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                  idx < currentStep && "border-success bg-success text-success-foreground",
                  idx === currentStep && "border-primary bg-primary text-primary-foreground",
                  idx > currentStep && "border-border bg-background text-muted-foreground"
                )}
              >
                {idx < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-medium">{idx + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-medium transition-colors truncate",
                  idx === currentStep && "text-foreground",
                  idx !== currentStep && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-2 transition-colors",
                  idx < currentStep ? "bg-success" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Stepper - Mobile */}
      <div className="flex md:hidden items-center justify-between">
        <Badge variant={currentStep === steps.length - 1 ? "default" : "outline"}>
          Paso {currentStep + 1} de {steps.length}
        </Badge>
        <span className="text-sm font-medium truncate ml-2">
          {steps[currentStep]?.label}
        </span>
      </div>
    </div>
  );
};
