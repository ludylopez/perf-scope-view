import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ArrowLeft, GraduationCap } from "lucide-react";
import { CapacitacionTreemap, LollipopChart, StatCard, StatCardGrid } from "@/components/charts";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { TopicoConsolidado, LollipopData } from "@/types/analisis";

export default function AnalisisCapacitacion() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [topicos, setTopicos] = useState<TopicoConsolidado[]>([]);
  const [totalPlanes, setTotalPlanes] = useState(0);
  const [totalConNecesidades, setTotalConNecesidades] = useState(0);

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

      // Cargar planes de desarrollo
      const { data: planes } = await supabase
        .from("development_plans")
        .select("id, plan_estructurado")
        .eq("periodo_id", periodo.id);

      if (!planes) {
        setError("No hay planes de desarrollo");
        return;
      }

      setTotalPlanes(planes.length);

      // Extraer tópicos de capacitación
      const topicosMap: Record<string, { frecuencia: number; categoria: string; prioridad: string }> = {};

      planes.forEach(plan => {
        const planEstructurado = plan.plan_estructurado as any;
        if (planEstructurado?.topicosCapacitacion) {
          const caps = planEstructurado.topicosCapacitacion as any[];
          caps.forEach(cap => {
            const nombre = cap.topico || cap.nombre || "Sin especificar";
            if (!topicosMap[nombre]) {
              topicosMap[nombre] = {
                frecuencia: 0,
                categoria: cap.categoria || "General",
                prioridad: cap.prioridad || "media",
              };
            }
            topicosMap[nombre].frecuencia += 1;
          });
        }
      });

      const topicosArray: TopicoConsolidado[] = Object.entries(topicosMap)
        .map(([topico, data]) => ({
          topico,
          frecuencia: data.frecuencia,
          porcentaje: (data.frecuencia / planes.length) * 100,
          prioridad: data.prioridad as "alta" | "media" | "baja",
          categoria: data.categoria as any,
        }))
        .sort((a, b) => b.frecuencia - a.frecuencia);

      setTopicos(topicosArray);
      setTotalConNecesidades(new Set(
        planes.filter(p => (p.plan_estructurado as any)?.topicosCapacitacion?.length > 0).map(p => p.id)
      ).size);
    } catch (err) {
      console.error("Error:", err);
      setError("Error al cargar datos de capacitación");
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

  const treemapTemas = topicos.slice(0, 15).map(t => ({
    nombre: t.topico,
    frecuencia: t.frecuencia,
    prioridad: t.prioridad,
  }));

  const lollipopData: LollipopData[] = topicos.slice(0, 10).map(t => ({
    label: t.topico.length > 30 ? t.topico.substring(0, 30) + "..." : t.topico,
    value: t.frecuencia,
    color: t.prioridad === "alta" ? "#ef4444" : t.prioridad === "media" ? "#f97316" : "#eab308",
  }));

  const prioridadData = [
    { nombre: "Alta", cantidad: topicos.filter(t => t.prioridad === "alta").length, color: "#ef4444" },
    { nombre: "Media", cantidad: topicos.filter(t => t.prioridad === "media").length, color: "#f97316" },
    { nombre: "Baja", cantidad: topicos.filter(t => t.prioridad === "baja").length, color: "#eab308" },
  ];

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
              <GraduationCap className="h-8 w-8" />
              Análisis de Capacitación
            </h1>
            <p className="text-muted-foreground mt-1">Período: <span className="font-semibold">{periodoNombre}</span></p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Sección 8 del Informe</p>
          </div>
        </div>

        <StatCardGrid columns={4}>
          <StatCard title="Planes Generados" value={totalPlanes} color="info" />
          <StatCard title="Con Necesidades" value={totalConNecesidades} color="warning" />
          <StatCard title="Temas Únicos" value={topicos.length} color="success" />
          <StatCard
            title="Cobertura"
            value={totalPlanes > 0 ? (totalConNecesidades / totalPlanes) * 100 : 0}
            format="percentage"
          />
        </StatCardGrid>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CapacitacionTreemap
            temas={treemapTemas}
            title="Temas de Capacitación por Frecuencia"
            description="Tamaño proporcional a las veces que se menciona el tema"
          />

          <Card>
            <CardHeader>
              <CardTitle>Distribución por Prioridad</CardTitle>
              <CardDescription>Cantidad de temas según nivel de prioridad</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prioridadData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="nombre" width={60} />
                    <Tooltip />
                    <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                      {prioridadData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <LollipopChart
          data={lollipopData}
          title="Top 10 Temas de Capacitación"
          description="Temas más frecuentes identificados en los planes de desarrollo"
          orientation="horizontal"
          showBaseline={false}
          valueFormat="number"
          height={400}
        />

        {/* Tabla detallada */}
        <Card>
          <CardHeader>
            <CardTitle>Detalle de Temas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">#</th>
                    <th className="text-left py-2">Tema</th>
                    <th className="text-right py-2">Frecuencia</th>
                    <th className="text-right py-2">% Planes</th>
                    <th className="text-center py-2">Prioridad</th>
                  </tr>
                </thead>
                <tbody>
                  {topicos.slice(0, 20).map((t, i) => (
                    <tr key={t.topico} className="border-b">
                      <td className="py-2 text-muted-foreground">{i + 1}</td>
                      <td className="py-2 font-medium">{t.topico}</td>
                      <td className="py-2 text-right font-mono">{t.frecuencia}</td>
                      <td className="py-2 text-right font-mono">{t.porcentaje.toFixed(1)}%</td>
                      <td className="py-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            t.prioridad === "alta"
                              ? "bg-red-100 text-red-700"
                              : t.prioridad === "media"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {t.prioridad}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
