import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardFooterProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  canGoNext: boolean;
  isLastStep: boolean;
  isSubmitting?: boolean;
}

export const WizardFooter = ({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onSubmit,
  canGoNext,
  isLastStep,
  isSubmitting = false,
}: WizardFooterProps) => {
  const handleNext = () => {
    onNext();
    // Scroll al inicio después de cambiar de paso
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevious = () => {
    onPrevious();
    // Scroll al inicio después de cambiar de paso
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border pt-4 mt-6">
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className={cn(
            "w-full sm:w-auto",
            currentStep === 0 && "invisible"
          )}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Anterior
        </Button>

        <div className="flex gap-2 w-full sm:w-auto">
          {isLastStep ? (
            <Button
              size="lg"
              onClick={onSubmit}
              disabled={!canGoNext || isSubmitting}
              className="w-full bg-success hover:bg-success/90"
            >
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? "Enviando..." : "Enviar Evaluación"}
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleNext}
              disabled={!canGoNext}
              className="w-full"
            >
              Siguiente
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {!canGoNext && !isLastStep && (
        <p className="text-sm text-destructive text-center mt-2">
          Por favor completa todas las preguntas antes de continuar
        </p>
      )}
    </div>
  );
};
