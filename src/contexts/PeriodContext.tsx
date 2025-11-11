import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getActivePeriod } from "@/lib/supabase";
import { EvaluationPeriod } from "@/types/period";

interface PeriodContextType {
  activePeriod: EvaluationPeriod | null;
  activePeriodId: string | null;
  isLoading: boolean;
  error: string | null;
  refreshPeriod: () => Promise<void>;
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

export const PeriodProvider = ({ children }: { children: ReactNode }) => {
  const [activePeriod, setActivePeriod] = useState<EvaluationPeriod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivePeriod = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const period = await getActivePeriod();
      
      if (period) {
        console.log("✅ Período activo cargado en context:", period.nombre, "UUID:", period.id);
        setActivePeriod(period);
      } else {
        console.warn("⚠️ No se encontró período activo en la base de datos");
        setActivePeriod(null);
        setError("No hay período de evaluación activo configurado");
      }
    } catch (err) {
      console.error("❌ Error cargando período activo:", err);
      setError("Error al cargar período de evaluación");
      setActivePeriod(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActivePeriod();
  }, []);

  const value: PeriodContextType = {
    activePeriod,
    activePeriodId: activePeriod?.id || null,
    isLoading,
    error,
    refreshPeriod: loadActivePeriod,
  };

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
};

export const usePeriod = () => {
  const context = useContext(PeriodContext);
  if (context === undefined) {
    throw new Error("usePeriod debe ser usado dentro de un PeriodProvider");
  }
  return context;
};
