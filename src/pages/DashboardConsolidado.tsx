import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, AlertCircle } from "lucide-react";
import { TeamAnalysisTab } from "@/components/teamAnalysis";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getJerarquiaInfo } from "@/lib/jerarquias";
import { getActivePeriod } from "@/lib/supabase";

const DashboardConsolidado = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jerarquiaInfo, setJerarquiaInfo] = useState<any>(null);
  const [periodoId, setPeriodoId] = useState<string>("");

  useEffect(() => {
    if (!user) {
      navigate("/dashboard");
      return;
    }

    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Obtener período activo
      let periodData = null;
      const activePeriod = await getActivePeriod();
      if (activePeriod) {
        setPeriodoId(activePeriod.id);
        periodData = { id: activePeriod.id };
      } else {
        // Intentar obtener el período más reciente
        const { data: latestPeriod } = await supabase
          .from("evaluation_periods")
          .select("id, nombre, estado")
          .order("fecha_inicio", { ascending: false })
          .limit(1)
          .single();

        if (latestPeriod) {
          setPeriodoId(latestPeriod.id);
          periodData = { id: latestPeriod.id };
        } else {
          // Último intento: buscar por nombre común
          const { data } = await supabase
            .from("evaluation_periods")
            .select("id")
            .eq("nombre", "2025-1")
            .single();
          periodData = data;
          if (periodData) {
            setPeriodoId(periodData.id);
          }
        }
      }

      if (!periodoId && !periodData?.id) {
        toast.warning("No se encontró un período de evaluación activo.");
      }

      // Cargar información de jerarquía
      const info = await getJerarquiaInfo(user!.dpi);
      setJerarquiaInfo(info);

    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-muted-foreground">Cargando análisis de equipo...</p>
          </div>
        </main>
      </div>
    );
  }

  // Solo mostrar si el usuario tiene colaboradores directos (es jefe)
  if (!jerarquiaInfo?.tieneColaboradores) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              Volver al Dashboard
            </Button>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Análisis de Equipo no disponible</h3>
              <p className="text-muted-foreground">
                Este análisis está disponible para jefes que tienen colaboradores a su cargo.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            Volver al Dashboard
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Análisis de Mi Equipo</h1>
          <p className="text-muted-foreground">
            Resultados de los colaboradores que usted evaluó directamente
          </p>
        </div>

        {periodoId ? (
          <TeamAnalysisTab
            usuarioDpi={user!.dpi}
            periodoId={periodoId}
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Período de evaluación requerido</h3>
              <p className="text-muted-foreground mb-4">
                Para ver el análisis de equipo, es necesario tener un período de evaluación activo.
              </p>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Volver al Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default DashboardConsolidado;
