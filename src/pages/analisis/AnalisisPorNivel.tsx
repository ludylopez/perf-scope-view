import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ArrowLeft, Users } from "lucide-react";
import { StatsTable, BoxPlotChart, DireccionRankingChart, TreemapChart } from "@/components/charts";
import { mean, standardDeviation, median as calcMedian, percentile } from "@/lib/advancedStatistics";
import type { NivelStats, BoxPlotData, TreemapNode, EstadisticasCompletas } from "@/types/analisis";

export default function AnalisisPorNivel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [niveles, setNiveles] = useState<NivelStats[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const periodo = await getActivePeriod();
      if (!periodo) {
        setError("No se encontró un período de evaluación activo");
        return;
      }

      setPeriodoNombre(periodo.nombre);

      // Usar final_evaluation_results_consolidated para evitar duplicados y tener datos correctos
      const { data: results } = await supabase
        .from("final_evaluation_results_consolidated")
        .select("colaborador_id, desempeno_porcentaje_promedio, potencial_porcentaje_promedio")
        .eq("periodo_id", periodo.id);

      if (!results || results.length === 0) {
        setError("No hay resultados de evaluación");
        return;
      }

      const colaboradorIds = results.map(r => r.colaborador_id);

      const { data: usersData } = await supabase
        .from("users")
        .select("dpi, nivel, rol")
        .in("dpi", colaboradorIds);
      
      // Filtrar usuarios administrativos de monitoreo
      const users = usersData?.filter(u => u.rol !== 'admin_general' && u.rol !== 'admin_rrhh') || [];

      const { data: jobLevels } = await supabase
        .from("job_levels")
        .select("code, name, category, hierarchical_order");

      if (!users || !jobLevels) return;

      // Agrupar resultados por nivel
      const resultsByNivel: Record<string, { desempeno: number[]; potencial: number[] }> = {};

      results.forEach(r => {
        const user = users.find(u => u.dpi === r.colaborador_id);
        // Excluir usuarios administrativos de monitoreo
        if (user?.nivel && user.rol && !['admin_general', 'admin_rrhh'].includes(user.rol)) {
          if (!resultsByNivel[user.nivel]) {
            resultsByNivel[user.nivel] = { desempeno: [], potencial: [] };
          }
          // Usar desempeno_porcentaje_promedio de consolidated
          const desempeno = (r as any).desempeno_porcentaje_promedio ?? (r as any).desempeno_porcentaje;
          const potencial = (r as any).potencial_porcentaje_promedio ?? (r as any).potencial_porcentaje;
          if (desempeno !== null && desempeno !== undefined && isFinite(desempeno)) {
            resultsByNivel[user.nivel].desempeno.push(desempeno);
          }
          if (potencial !== null && potencial !== undefined && isFinite(potencial)) {
            resultsByNivel[user.nivel].potencial.push(potencial);
          }
        }
      });

      const nivelesData: NivelStats[] = jobLevels
        .filter(jl => resultsByNivel[jl.code] && resultsByNivel[jl.code].desempeno.length > 0)
        .map((jl, index) => {
          const data = resultsByNivel[jl.code];
          const calcStats = (arr: number[]): EstadisticasCompletas => {
            // Filtrar valores válidos
            const validArr = arr.filter(v => v !== null && v !== undefined && isFinite(v));
            if (validArr.length === 0) {
              return { promedio: NaN, mediana: NaN, desviacion: NaN, min: NaN, max: NaN, q1: NaN, q3: NaN };
            }
            if (validArr.length === 1) {
              const val = validArr[0];
              return { promedio: val, mediana: val, desviacion: 0, min: val, max: val, q1: val, q3: val };
            }
            return {
              promedio: mean(validArr),
              mediana: calcMedian(validArr),
              desviacion: standardDeviation(validArr),
              min: Math.min(...validArr),
              max: Math.max(...validArr),
              q1: percentile(validArr, 25),
              q3: percentile(validArr, 75),
            };
          };

          return {
            codigo: jl.code,
            nombre: jl.name,
            categoria: (jl.category as "administrativo" | "operativo") || "administrativo",
            orden: jl.hierarchical_order || index,
            totalColaboradores: data.desempeno.length,
            evaluados: data.desempeno.length,
            tasaParticipacion: 100,
            desempeno: calcStats(data.desempeno),
            potencial: calcStats(data.potencial),
            distribucionCalificaciones: {},
            distribucion9Box: {},
          };
        })
        .filter(n => isFinite(n.desempeno.promedio)) // Solo incluir niveles con datos válidos
        .sort((a, b) => b.desempeno.promedio - a.desempeno.promedio);

      // Asignar ranking
      nivelesData.forEach((n, i) => {
        (n as any).ranking = i + 1;
      });

      setNiveles(nivelesData);
    } catch (err) {
      console.error("Error:", err);
      setError("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  const boxPlotData: BoxPlotData[] = niveles.map(n => ({
    segment: n.codigo,
    min: n.desempeno.min,
    q1: n.desempeno.q1,
    median: n.desempeno.mediana,
    q3: n.desempeno.q3,
    max: n.desempeno.max,
    mean: n.desempeno.promedio,
  }));

  const statsTableData = niveles.map(n => ({
    segmento: `${n.codigo} - ${n.nombre}`,
    stats: n.desempeno,
    n: n.totalColaboradores,
  }));

  const treemapData: TreemapNode[] = niveles.map(n => ({
    name: n.codigo,
    value: n.totalColaboradores,
  }));

  const rankingData = niveles.map(n => ({
    nombre: `${n.codigo} - ${n.nombre}`,
    desempeno: n.desempeno.promedio,
    ranking: (n as any).ranking,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/analisis" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2">
              <ArrowLeft className="h-4 w-4" />
              Volver a dashboards
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              Análisis por Nivel Jerárquico
            </h1>
            <p className="text-muted-foreground mt-1">Período: <span className="font-semibold">{periodoNombre}</span></p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Sección 5 del Informe</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DireccionRankingChart
            direcciones={rankingData}
            title="Ranking por Nivel"
            metric="desempeno"
          />
          <TreemapChart
            data={treemapData}
            title="Distribución de Colaboradores por Nivel"
            description="Tamaño proporcional a la cantidad de evaluados"
          />
        </div>

        <BoxPlotChart
          data={boxPlotData}
          title="Distribución de Desempeño por Nivel"
          description="Box plots mostrando dispersión de calificaciones en cada nivel jerárquico"
          yLabel="Desempeño (%)"
        />

        <StatsTable
          data={statsTableData}
          title="Estadísticas Detalladas por Nivel"
          showPercentiles
          showBoxPlot
        />
      </div>
    </div>
  );
}
