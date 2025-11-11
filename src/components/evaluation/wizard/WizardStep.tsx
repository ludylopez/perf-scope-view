import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DimensionProgress } from "@/components/evaluation/DimensionProgress";

interface WizardStepProps {
  title: string;
  description?: string;
  weight?: number;
  currentStep: number;
  totalSteps: number;
  answered?: number;
  total?: number;
  children: ReactNode;
}

export const WizardStep = ({
  title,
  description,
  weight,
  currentStep,
  totalSteps,
  answered,
  total,
  children,
}: WizardStepProps) => {
  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-2xl mb-2">{title}</CardTitle>
            {description && (
              <CardDescription className="text-base leading-relaxed">
                {description}
              </CardDescription>
            )}
            {weight !== undefined && (
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Peso:</strong> {Math.round(weight * 100)}%
              </p>
            )}
          </div>
          {answered !== undefined && total !== undefined && (
            <DimensionProgress answered={answered} total={total} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );
};
