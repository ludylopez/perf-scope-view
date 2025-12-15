import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GraduationCap, Loader2, FileDown } from "lucide-react";
import { TrainingPlanModal } from "./TrainingPlanModal";
import { getPlanCapacitacionUnidad } from "@/lib/trainingPlanService";
import { TrainingPlanPDF } from "../pdf/trainingPlan/TrainingPlanPDF";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PlanCapacitacionUnidad } from "@/types/trainingPlan";

interface UnitTrainingPlanButtonProps {
  jefeDpi: string;
  periodoId: string;
}

export function UnitTrainingPlanButton({ jefeDpi, periodoId }: UnitTrainingPlanButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [plan, setPlan] = useState<PlanCapacitacionUnidad | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

  // Cargar plan al montar para verificar si existe
  useEffect(() => {
    checkPlanExists();
  }, [jefeDpi, periodoId]);

  const checkPlanExists = async () => {
    setIsLoadingPlan(true);
    try {
      const { plan: planData } = await getPlanCapacitacionUnidad(jefeDpi, periodoId);
      setPlan(planData);
    } catch (error) {
      console.error('Error verificando plan:', error);
    } finally {
      setIsLoadingPlan(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-2"
        >
          <GraduationCap className="h-4 w-4" />
          {plan ? 'Ver Plan' : 'Generar Plan'}
        </Button>

        {plan && (
          <PDFDownloadLink
            document={<TrainingPlanPDF plan={plan} />}
            fileName={`plan-capacitacion-${plan.metadata.periodoNombre.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`}
            className="inline-block"
          >
            {({ loading }) => (
              <Button
                variant="outline"
                size="sm"
                disabled={loading || isLoadingPlan}
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4" />
                    PDF
                  </>
                )}
              </Button>
            )}
          </PDFDownloadLink>
        )}
      </div>

      <TrainingPlanModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          // Recargar plan después de cerrar el modal por si se regeneró
          checkPlanExists();
        }}
        jefeDpi={jefeDpi}
        periodoId={periodoId}
        onPlanGenerated={checkPlanExists}
      />
    </>
  );
}

