import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ArrowLeft, Building } from "lucide-react";
import { DireccionRankingChart, BoxPlotChart, TreemapChart, StatsTable } from "@/components/charts";
import { mean, standardDeviation, median as calcMedian, percentile } from "@/lib/advancedStatistics";
import type { DireccionStats, BoxPlotData, TreemapNode, EstadisticasCompletas } from "@/types/analisis";

export default function AnalisisPorDireccion() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [direcciones, setDirecciones] = useState<DireccionStats[]>([]);

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

      // Obtener usuarios con dirección y rol para filtrar administrativos
      const { data: users } = await supabase
        .from("users")
        .select("dpi, direccion_unidad, area, rol")
        .in("dpi", colaboradorIds);

      if (!users) return;

      // Filtrar usuarios administrativos de monitoreo
      const validUsers = users?.filter(u => u.rol !== 'admin_general' && u.rol !== 'admin_rrhh') || [];

      // Agrupar por dirección (usar direccion_unidad o area como fallback)
      const resultsByDir: Record<string, { desempeno: number[]; potencial: number[] }> = {};

      results.forEach(r => {
        const user = validUsers.find(u => u.dpi === r.colaborador_id);
        // Excluir usuarios administrativos de monitoreo
        if (!user || (user.rol === 'admin_general' || user.rol === 'admin_rrhh')) {
          return;
        }
        
        // Usar direccion_unidad o area como fallback, o "Sin asignar"
        const dir = user.direccion_unidad || user.area || "Sin asignar";
        
        if (!resultsByDir[dir]) {
          resultsByDir[dir] = { desempeno: [], potencial: [] };
        }
        
        // Usar desempeno_porcentaje_promedio de consolidated
        const desempeno = (r as any).desempeno_porcentaje_promedio ?? (r as any).desempeno_porcentaje;
        const potencial = (r as any).potencial_porcentaje_promedio ?? (r as any).potencial_porcentaje;
        
        if (desempeno !== null && desempeno !== undefined && isFinite(desempeno) && desempeno > 0) {
          resultsByDir[dir].desempeno.push(desempeno);
        }
        if (potencial !== null && potencial !== undefined && isFinite(potencial) && potencial > 0) {
          resultsByDir[dir].potencial.push(potencial);
        }
      });

      // Calcular promedio global solo con datos válidos y excluyendo administrativos
      const desempenosValidos = results
        .map(r => {
          const user = validUsers.find(u => u.dpi === r.colaborador_id);
          if (!user || (user.rol === 'admin_general' || user.rol === 'admin_rrhh')) {
            return null;
          }
          return (r as any).desempeno_porcentaje_promedio ?? (r as any).desempeno_porcentaje;
        })
        .filter((v): v is number => v !== null && v !== undefined && isFinite(v) && v > 0);
      
      const promedioGlobal = desempenosValidos.length > 0 ? mean(desempenosValidos) : 0;

      const direccionesData: DireccionStats[] = Object.entries(resultsByDir)
        .filter(([_, data]) => data.desempeno.length > 0)
        .map(([nombre, data]) => {
          const calcStats = (arr: number[]): EstadisticasCompletas => {
            if (arr.length === 0) return { promedio: 0, mediana: 0, desviacion: 0, min: 0, max: 0, q1: 0, q3: 0 };
            return {
              promedio: mean(arr),
              mediana: calcMedian(arr),
              desviacion: standardDeviation(arr),
              min: Math.min(...arr),
              max: Math.max(...arr),
              q1: percentile(arr, 25),
              q3: percentile(arr, 75),
            };
          };

          const desempenoStats = calcStats(data.desempeno);
          const potencialStats = data.potencial.length > 0 ? calcStats(data.potencial) : null;
          
          return {
            nombre,
            totalColaboradores: data.desempeno.length,
            evaluados: data.desempeno.length,
            tasaParticipacion: 100,
            desempenoPromedio: desempenoStats.promedio,
            potencialPromedio: potencialStats?.promedio || 0,
            desviacion: desempenoStats.desviacion,
            ranking: 0,
            cambioVsPromedio: desempenoStats.promedio - promedioGlobal,
            desempeno: desempenoStats.promedio, // Agregar para DireccionRankingChart
            desempenoStats, // Guardar estadísticas completas
            potencialStats, // Guardar estadísticas de potencial
          };
        })
        .sort((a, b) => b.desempenoPromedio - a.desempenoPromedio)
        .map((d, i) => ({ ...d, ranking: i + 1 }));

      setDirecciones(direccionesData);
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

  const treemapData: TreemapNode[] = direcciones.map(d => ({
    name: d.nombre,
    value: d.totalColaboradores,
  }));

  const statsData = direcciones
    .filter(d => d.desempenoStats && d.totalColaboradores > 0) // Filtrar solo los que tienen estadísticas válidas
    .map(d => ({
      segmento: d.nombre,
      stats: d.desempenoStats!,
      n: d.totalColaboradores,
    }));

  // Validar que haya datos antes de renderizar
  if (direcciones.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Sin datos</AlertTitle>
            <AlertDescription>
              No hay datos de evaluación disponibles para mostrar el análisis por dirección.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

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
              <Building className="h-8 w-8" />
              Análisis por Dirección
            </h1>
            <p className="text-muted-foreground mt-1">Período: <span className="font-semibold">{periodoNombre}</span></p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Sección 6 del Informe</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DireccionRankingChart
            direcciones={direcciones}
            title="Ranking de Direcciones"
            metric="desempeno"
          />
          <TreemapChart
            data={treemapData}
            title="Distribución de Colaboradores"
            description="Tamaño proporcional a la cantidad de evaluados por dirección"
          />
        </div>

        <StatsTable
          data={statsData}
          title="Estadísticas por Dirección"
          showBoxPlot
        />

        {/* Top y Bottom 5 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="text-green-700">Top 5 Direcciones</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {direcciones.slice(0, 5).map((d, i) => (
                  <li key={d.nombre} className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm">{i + 1}</span>
                      <span className="truncate max-w-[200px]">{d.nombre}</span>
                    </span>
                    <span className="font-mono font-semibold text-green-600">{d.desempenoPromedio.toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50">
            <CardHeader>
              <CardTitle className="text-red-700">Bottom 5 Direcciones</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {direcciones.slice(-5).reverse().map((d, i) => (
                  <li key={d.nombre} className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-sm">{direcciones.length - i}</span>
                      <span className="truncate max-w-[200px]">{d.nombre}</span>
                    </span>
                    <span className="font-mono font-semibold text-red-600">{d.desempenoPromedio.toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
