import { useState, useEffect } from "react";
import { getActivePeriod } from "@/lib/supabase";
import {
  getEvaluationsForPeriod,
  calculateGeneralStats,
  calculateIndividualDifferences,
  calculateImpactChange,
  categorizeDifferences,
  EvaluationWithScore,
  IndividualAnalysis,
} from "@/lib/statisticalAnalysis";
import { StatsOverview } from "@/components/statisticalAnalysis/StatsOverview";
import { IndividualDifferencesTable } from "@/components/statisticalAnalysis/IndividualDifferencesTable";
import { ImpactSummary } from "@/components/statisticalAnalysis/ImpactSummary";
import { DifferenceDistribution } from "@/components/statisticalAnalysis/DifferenceDistribution";
import { DistributionChart } from "@/components/statisticalAnalysis/DistributionChart";
import { GroupAnalysis } from "@/components/statisticalAnalysis/GroupAnalysis";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Loader2, BarChart3 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AnalisisEstadisticoEvaluaciones() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState<string>("");
  const [evaluations, setEvaluations] = useState<EvaluationWithScore[]>([]);
  const [generalStats, setGeneralStats] = useState<any[]>([]);
  const [individualData, setIndividualData] = useState<IndividualAnalysis[]>([]);
  const [impactSummary, setImpactSummary] = useState<any>(null);
  const [differenceCategories, setDifferenceCategories] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener período activo
      const periodo = await getActivePeriod();
      if (!periodo) {
        setError("No se encontró un período de evaluación activo");
        setLoading(false);
        return;
      }

      setPeriodoNombre(periodo.nombre);

      // Obtener evaluaciones
      const evals = await getEvaluationsForPeriod(periodo.id);
      if (evals.length === 0) {
        setError("No hay evaluaciones completadas en el período actual");
        setLoading(false);
        return;
      }

      setEvaluations(evals);

      // Calcular estadísticas generales
      const stats = calculateGeneralStats(evals);
      setGeneralStats(stats);

      // Calcular diferencias individuales
      const individual = await calculateIndividualDifferences(evals);
      setIndividualData(individual);

      if (individual.length > 0) {
        // Calcular impacto del cambio
        const impact = calculateImpactChange(individual);
        setImpactSummary(impact);

        // Categorizar diferencias
        const categories = categorizeDifferences(individual);
        setDifferenceCategories(categories);
      }
    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("Error al cargar los datos de análisis estadístico");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Cargando análisis estadístico...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Análisis Estadístico de Evaluaciones
          </h1>
          <p className="text-muted-foreground mt-2">
            Período: <span className="font-semibold">{periodoNombre}</span>
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="individual">Individual</TabsTrigger>
          <TabsTrigger value="impact">Impacto</TabsTrigger>
          <TabsTrigger value="distribution">Distribución</TabsTrigger>
          <TabsTrigger value="groups">Grupos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <StatsOverview stats={generalStats} />
          <DistributionChart evaluations={evaluations} />
        </TabsContent>

        <TabsContent value="individual" className="space-y-6 mt-6">
          <IndividualDifferencesTable data={individualData} />
        </TabsContent>

        <TabsContent value="impact" className="space-y-6 mt-6">
          {impactSummary && <ImpactSummary impact={impactSummary} />}
          {individualData.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  El impacto muestra cómo cambiaría el score final de cada colaborador
                  si se cambiara la ponderación de 50/50 (autoevaluación/jefe) a 70/30.
                  Un impacto positivo significa que el colaborador subiría su score,
                  mientras que un impacto negativo significa que bajaría.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="distribution" className="space-y-6 mt-6">
          <DifferenceDistribution categories={differenceCategories} />
        </TabsContent>

        <TabsContent value="groups" className="space-y-6 mt-6">
          <GroupAnalysis data={individualData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

