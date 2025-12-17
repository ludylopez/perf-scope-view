import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ArrowLeft, PieChart as PieChartIcon } from "lucide-react";
import {
  StatCard,
  StatCardGrid,
  PerformanceDistributionChart,
  AutoVsJefeChart,
  InterpretationCard,
  DistributionInterpretation,
} from "@/components/charts";
import { mean, median, standardDeviation, skewness, kurtosis } from "@/lib/advancedStatistics";
import type { ResultadosGlobales as ResultadosGlobalesType, InterpretacionStats } from "@/types/analisis";

export default function ResultadosGlobales() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [data, setData] = useState<ResultadosGlobalesType | null>(null);
  const [rawScores, setRawScores] = useState<number[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const periodo = await getActivePeriod();
      if (!periodo) {
        setError("No se encontró un período de evaluación activo");
        return;
      }

      setPeriodoNombre(periodo.nombre);

      // Cargar resultados finales (usar consolidated para evitar duplicados)
      const { data: resultsData, error: resultsError } = await supabase
        .from("final_evaluation_results_consolidated")
        .select("colaborador_id, desempeno_porcentaje_promedio, potencial_porcentaje_promedio")
        .eq("periodo_id", periodo.id);

      if (resultsError) throw resultsError;
      
      // Obtener usuarios para filtrar administrativos
      const colaboradorIds = resultsData?.map(r => r.colaborador_id) || [];
      const { data: usersData } = await supabase
        .from("users")
        .select("dpi, rol")
        .in("dpi", colaboradorIds);
      
      // Crear mapa de roles para filtrar
      const userRoles = new Map(usersData?.map(u => [u.dpi, u.rol]) || []);
      
      // Filtrar usuarios administrativos de monitoreo
      const results = resultsData?.filter(r => {
        const rol = userRoles.get(r.colaborador_id);
        return rol && rol !== 'admin_general' && rol !== 'admin_rrhh';
      }) || [];

      if (!results || results.length === 0) {
        setError("No hay resultados de evaluación para este período");
        return;
      }

      // Cargar evaluaciones para auto vs jefe
      const { data: evaluationsData } = await supabase
        .from("evaluations")
        .select("usuario_id, colaborador_id, tipo, responses")
        .eq("periodo_id", periodo.id)
        .eq("estado", "enviado");
      
      // Filtrar evaluaciones de usuarios administrativos
      const evaluations = evaluationsData?.filter(e => {
        const rol = userRoles.get(e.usuario_id);
        return rol && rol !== 'admin_general' && rol !== 'admin_rrhh';
      }) || [];

      // Extraer scores (usar desempeno_porcentaje_promedio si viene de consolidated)
      const scores = results.map(r => {
        // Compatibilidad: puede venir de final_evaluation_results o final_evaluation_results_consolidated
        return (r as any).desempeno_porcentaje_promedio || (r as any).desempeno_porcentaje || 0;
      });
      setRawScores(scores);

      // Calcular estadísticas
      const promedio = mean(scores);
      const med = median(scores);
      const stdDev = standardDeviation(scores);

      // Distribución por categorías (usando rangos correctos)
      const categorias = [
        { categoria: "excelente", rango: "90-100", min: 90, max: 100 },
        { categoria: "muy_bueno", rango: "80-89", min: 80, max: 89.99 },
        { categoria: "satisfactorio", rango: "70-79", min: 70, max: 79.99 },
        { categoria: "necesita_mejorar", rango: "60-69", min: 60, max: 69.99 },
        { categoria: "insatisfactorio", rango: "<60", min: 0, max: 59.99 },
      ];

      const distribucion = categorias.map(cat => ({
        categoria: cat.categoria,
        rango: cat.rango,
        cantidad: scores.filter(s => s >= cat.min && s <= cat.max).length,
      }));
      
      // Verificar que la suma de la distribución sea igual al total de resultados
      const totalDistribucion = distribucion.reduce((sum, d) => sum + d.cantidad, 0);
      if (totalDistribucion !== results.length) {
        console.warn(`Advertencia: La distribución (${totalDistribucion}) no coincide con el total de resultados (${results.length})`);
      }

      // Calcular brecha auto vs jefe
      let brechaAutoJefe = {
        promedioAuto: 0,
        promedioJefe: 0,
        diferencia: 0,
        interpretacion: "Sin datos suficientes",
      };

      if (evaluations && evaluations.length > 0) {
        const autoEvals = evaluations.filter(e => e.tipo === "auto");
        const jefeEvals = evaluations.filter(e => e.tipo === "jefe");

        // Calcular promedios: primero promedio por evaluación, luego promedio de promedios
        const calcAvgResponses = (evals: any[]) => {
          if (evals.length === 0) return 0;
          // Calcular promedio por cada evaluación
          const promediosPorEvaluacion = evals.map(e => {
            const responses = e.responses as Record<string, number>;
            const values = Object.values(responses).filter(v => typeof v === "number" && v > 0);
            return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
          }).filter(p => p > 0);
          
          // Promedio de los promedios de cada evaluación
          return promediosPorEvaluacion.length > 0 
            ? promediosPorEvaluacion.reduce((a, b) => a + b, 0) / promediosPorEvaluacion.length 
            : 0;
        };

        const avgAuto = calcAvgResponses(autoEvals) * 20; // Convertir escala 1-5 a porcentaje
        const avgJefe = calcAvgResponses(jefeEvals) * 20;
        const diff = avgAuto - avgJefe;

        brechaAutoJefe = {
          promedioAuto: avgAuto,
          promedioJefe: avgJefe,
          diferencia: diff,
          interpretacion:
            diff > 10
              ? "Los colaboradores tienden a sobrevalorarse significativamente"
              : diff > 5
              ? "Existe una tendencia moderada a la sobrevaloración"
              : diff < -10
              ? "Los jefes califican más alto que las autoevaluaciones"
              : diff < -5
              ? "Ligera tendencia de jefes a calificar más alto"
              : "Las evaluaciones están alineadas",
        };
      }

      // Comparativa por dimensión (simplificada)
      const comparativaPorDimension: any[] = [];

      setData({
        promedioOrganizacional: promedio,
        mediana: med,
        desviacionEstandar: stdDev,
        distribucionCalificaciones: distribucion.map(d => ({
          ...d,
          porcentaje: (d.cantidad / scores.length) * 100,
          color: "",
        })),
        brechaAutoJefe,
        comparativaPorDimension,
      });
    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("Error al cargar los resultados globales");
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
            <p className="text-muted-foreground">Cargando resultados globales...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "No se encontraron datos"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Calcular estadísticas adicionales para interpretación
  const skew = rawScores.length > 2 ? skewness(rawScores) : 0;
  const kurt = rawScores.length > 3 ? kurtosis(rawScores) : 3;

  // Interpretación de resultados
  const interpretacion: InterpretacionStats = {
    titulo: "Análisis de Resultados Globales",
    descripcion: `El promedio organizacional de desempeño es ${data.promedioOrganizacional.toFixed(1)}%, con una desviación estándar de ${data.desviacionEstandar.toFixed(1)} puntos.`,
    hallazgos: [
      `El ${data.distribucionCalificaciones.find(d => d.categoria === "excelente")?.porcentaje.toFixed(1) || 0}% de colaboradores alcanzó calificación excelente (≥90%)`,
      `El ${data.distribucionCalificaciones.find(d => d.categoria === "insatisfactorio")?.porcentaje.toFixed(1) || 0}% requiere atención inmediata (<60%)`,
      data.brechaAutoJefe.diferencia > 5
        ? `Brecha auto vs jefe: ${data.brechaAutoJefe.diferencia.toFixed(1)} puntos (sobrevaloración)`
        : data.brechaAutoJefe.diferencia < -5
        ? `Brecha auto vs jefe: ${Math.abs(data.brechaAutoJefe.diferencia).toFixed(1)} puntos (jefes más altos)`
        : "Evaluaciones auto y jefe alineadas",
    ],
    recomendaciones: [
      data.promedioOrganizacional < 70
        ? "Implementar programa de mejora de desempeño organizacional"
        : undefined,
      data.desviacionEstandar > 15
        ? "Alta dispersión: revisar criterios de evaluación por área"
        : undefined,
      Math.abs(data.brechaAutoJefe.diferencia) > 10
        ? "Calibrar expectativas entre colaboradores y supervisores"
        : undefined,
    ].filter(Boolean) as string[],
    nivel:
      data.promedioOrganizacional >= 75
        ? "positivo"
        : data.promedioOrganizacional >= 60
        ? "neutral"
        : "atencion",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              to="/analisis"
              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a dashboards
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <PieChartIcon className="h-8 w-8" />
              Resultados Globales
            </h1>
            <p className="text-muted-foreground mt-1">
              Período: <span className="font-semibold">{periodoNombre}</span>
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Sección 3 del Informe</p>
            <p>Distribución y Brechas</p>
          </div>
        </div>

        {/* KPIs */}
        <StatCardGrid columns={4}>
          <StatCard
            title="Promedio Organizacional"
            value={data.promedioOrganizacional}
            format="percentage"
            color={
              data.promedioOrganizacional >= 80
                ? "success"
                : data.promedioOrganizacional >= 70
                ? "warning"
                : "danger"
            }
          />
          <StatCard
            title="Mediana"
            value={data.mediana}
            format="percentage"
            color="info"
          />
          <StatCard
            title="Desviación Estándar"
            value={data.desviacionEstandar}
            format="decimal"
            subtitle={data.desviacionEstandar > 15 ? "Alta dispersión" : "Dispersión normal"}
          />
          <StatCard
            title="Brecha Auto-Jefe"
            value={Math.abs(data.brechaAutoJefe.diferencia)}
            format="decimal"
            subtitle={
              data.brechaAutoJefe.diferencia > 0
                ? "Auto > Jefe"
                : data.brechaAutoJefe.diferencia < 0
                ? "Jefe > Auto"
                : "Alineados"
            }
            color={Math.abs(data.brechaAutoJefe.diferencia) > 10 ? "danger" : "success"}
          />
        </StatCardGrid>

        {/* Distribución de calificaciones */}
        <PerformanceDistributionChart
          data={data.distribucionCalificaciones.map(d => ({
            categoria: d.categoria,
            rango: d.rango,
            cantidad: d.cantidad,
          }))}
          title="Distribución de Calificaciones de Desempeño"
          description="Clasificación de colaboradores según su porcentaje de desempeño final"
          mean={data.promedioOrganizacional}
          median={data.mediana}
        />

        {/* Interpretación de distribución */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DistributionInterpretation
            mean={data.promedioOrganizacional}
            median={data.mediana}
            stdDev={data.desviacionEstandar}
            skewness={skew}
            kurtosis={kurt}
            variableName="el desempeño"
          />

          <InterpretationCard data={interpretacion} />
        </div>

        {/* Brecha Auto vs Jefe */}
        <Card>
          <CardHeader>
            <CardTitle>Brecha Autoevaluación vs Evaluación del Jefe</CardTitle>
            <CardDescription>
              Comparativa de percepciones entre colaboradores y supervisores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Promedio Autoevaluación</p>
                <p className="text-3xl font-bold text-blue-600">{data.brechaAutoJefe.promedioAuto.toFixed(1)}%</p>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Promedio Evaluación Jefe</p>
                <p className="text-3xl font-bold text-purple-600">{data.brechaAutoJefe.promedioJefe.toFixed(1)}%</p>
              </div>
              <div
                className={`text-center p-4 rounded-lg ${
                  Math.abs(data.brechaAutoJefe.diferencia) <= 5
                    ? "bg-green-50 dark:bg-green-950/20"
                    : "bg-amber-50 dark:bg-amber-950/20"
                }`}
              >
                <p className="text-sm text-muted-foreground">Diferencia</p>
                <p
                  className={`text-3xl font-bold ${
                    Math.abs(data.brechaAutoJefe.diferencia) <= 5
                      ? "text-green-600"
                      : "text-amber-600"
                  }`}
                >
                  {data.brechaAutoJefe.diferencia > 0 ? "+" : ""}
                  {data.brechaAutoJefe.diferencia.toFixed(1)}
                </p>
              </div>
            </div>
            <p className="text-center mt-4 text-muted-foreground">
              {data.brechaAutoJefe.interpretacion}
            </p>
          </CardContent>
        </Card>

        {/* Tabla resumen de distribución */}
        <Card>
          <CardHeader>
            <CardTitle>Detalle de Distribución</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Categoría</th>
                  <th className="text-left py-2">Rango</th>
                  <th className="text-right py-2">Cantidad</th>
                  <th className="text-right py-2">Porcentaje</th>
                  <th className="py-2">Distribución Visual</th>
                </tr>
              </thead>
              <tbody>
                {data.distribucionCalificaciones.map((cat) => (
                  <tr key={cat.categoria} className="border-b">
                    <td className="py-2 capitalize font-medium">
                      {cat.categoria.replace("_", " ")}
                    </td>
                    <td className="py-2 font-mono text-muted-foreground">{cat.rango}</td>
                    <td className="py-2 text-right font-mono">{cat.cantidad}</td>
                    <td className="py-2 text-right font-mono">{cat.porcentaje.toFixed(1)}%</td>
                    <td className="py-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${cat.porcentaje}%`,
                            backgroundColor:
                              cat.categoria === "excelente"
                                ? "#22c55e"
                                : cat.categoria === "muy_bueno"
                                ? "#84cc16"
                                : cat.categoria === "satisfactorio"
                                ? "#eab308"
                                : cat.categoria === "necesita_mejorar"
                                ? "#f97316"
                                : "#ef4444",
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
