import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, AlertCircle, ArrowLeft, Users } from "lucide-react";
import { TeamAnalysisUnidadTab } from "@/components/teamAnalysis/TeamAnalysisUnidadTab";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getJerarquiaInfo } from "@/lib/jerarquias";

const DashboardUnidad = () => {
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
      const { data: activePeriod } = await supabase
        .from("evaluation_periods")
        .select("id, nombre, estado")
        .eq("estado", "activo")
        .maybeSingle();

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
            <p className="text-muted-foreground">Cargando análisis de unidad...</p>
          </div>
        </main>
      </div>
    );
  }

  // Solo mostrar si el usuario tiene jefes subordinados (es jefe de jefes)
  if (!jerarquiaInfo?.tieneJefesSubordinados) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Dashboard
            </Button>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Análisis de Unidad no disponible</h3>
              <p className="text-muted-foreground mb-4">
                Este análisis está disponible para jefes que tienen subordinados que también son jefes.
              </p>
              {jerarquiaInfo?.tieneColaboradores && (
                <Button
                  variant="outline"
                  onClick={() => navigate("/dashboard-consolidado")}
                  className="gap-2"
                >
                  <Users className="h-4 w-4" />
                  Ver Análisis de Mi Equipo
                </Button>
              )}
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
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
          {/* Botón para ir a análisis de equipo directo */}
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard-consolidado")}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            Ver Mi Equipo Directo
          </Button>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Análisis de Mi Unidad</h1>
          </div>
          <p className="text-muted-foreground">
            Resultados de toda su unidad: colaboradores directos y los equipos de sus jefes subordinados
          </p>
          <div className="flex gap-2 mt-2">
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
              {jerarquiaInfo?.totalColaboradores || 0} colaboradores en total
            </span>
            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
              {jerarquiaInfo?.totalJefesSubordinados || 0} jefes subordinados
            </span>
          </div>
        </div>

        {periodoId ? (
          <TeamAnalysisUnidadTab
            usuarioDpi={user!.dpi}
            periodoId={periodoId}
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Período de evaluación requerido</h3>
              <p className="text-muted-foreground mb-4">
                Para ver el análisis de unidad, es necesario tener un período de evaluación activo.
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

export default DashboardUnidad;
