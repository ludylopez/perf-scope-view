import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ArrowLeft, FileText } from "lucide-react";
import { GaugeChart, StatCard, StatCardGrid, TreemapChart, LollipopChart } from "@/components/charts";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import type { AreaMejoraFrecuente, TreemapNode, LollipopData } from "@/types/analisis";

export default function AnalisisPlanesDesarrollo() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [totalGenerados, setTotalGenerados] = useState(0);
  const [totalEvaluados, setTotalEvaluados] = useState(0);
  const [cobertura, setCobertura] = useState(0);
  const [areasMejora, setAreasMejora] = useState<AreaMejoraFrecuente[]>([]);
  const [distribucionPorNivel, setDistribucionPorNivel] = useState<Record<string, number>>({});

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

      // Cargar planes
      const { data: planes } = await supabase
        .from("development_plans")
        .select("id, colaborador_id, plan_estructurado, competencias_desarrollar")
        .eq("periodo_id", periodo.id);

      const { data: results } = await supabase
        .from("final_evaluation_results")
        .select("colaborador_id")
        .eq("periodo_id", periodo.id);

      const { data: users } = await supabase
        .from("users")
        .select("dpi, nivel");

      if (!planes || !results) {
        setError("No se pudieron cargar los datos");
        return;
      }

      const total = planes.length;
      const evaluados = results.length;

      setTotalGenerados(total);
      setTotalEvaluados(evaluados);
      setCobertura(evaluados > 0 ? (total / evaluados) * 100 : 0);

      // Áreas de mejora
      const areasMap: Record<string, number> = {};

      planes.forEach(plan => {
        // De competencias_desarrollar
        const competencias = plan.competencias_desarrollar as string[] | null;
        if (competencias) {
          competencias.forEach(c => {
            areasMap[c] = (areasMap[c] || 0) + 1;
          });
        }

        // De plan_estructurado.dimensionesDebiles
        const planEst = plan.plan_estructurado as any;
        if (planEst?.dimensionesDebiles) {
          planEst.dimensionesDebiles.forEach((d: any) => {
            const dim = d.dimension || d.nombre;
            if (dim) areasMap[dim] = (areasMap[dim] || 0) + 1;
          });
        }
      });

      const areasArray: AreaMejoraFrecuente[] = Object.entries(areasMap)
        .map(([area, cantidad]) => ({
          area,
          cantidad,
          porcentaje: (cantidad / total) * 100,
        }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 15);

      setAreasMejora(areasArray);

      // Distribución por nivel
      if (users) {
        const niveles: Record<string, number> = {};
        planes.forEach(plan => {
          const user = users.find(u => u.dpi === plan.colaborador_id);
          if (user?.nivel) {
            niveles[user.nivel] = (niveles[user.nivel] || 0) + 1;
          }
        });
        setDistribucionPorNivel(niveles);
      }
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

  const lollipopData: LollipopData[] = areasMejora.map(a => ({
    label: a.area.length > 35 ? a.area.substring(0, 35) + "..." : a.area,
    value: a.cantidad,
  }));

  const treemapNiveles: TreemapNode[] = Object.entries(distribucionPorNivel)
    .filter(([_, v]) => v > 0)
    .map(([nombre, value]) => ({ name: nombre, value }));

  const pieData = Object.entries(distribucionPorNivel)
    .filter(([_, v]) => v > 0)
    .map(([name, value], i) => ({
      name,
      value,
      color: ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"][i % 7],
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
              <FileText className="h-8 w-8" />
              Planes de Desarrollo Individual
            </h1>
            <p className="text-muted-foreground mt-1">Período: <span className="font-semibold">{periodoNombre}</span></p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Sección 9 del Informe</p>
          </div>
        </div>

        <StatCardGrid columns={3}>
          <StatCard title="Planes Generados" value={totalGenerados} color="success" />
          <StatCard title="Total Evaluados" value={totalEvaluados} color="info" />
          <StatCard title="Áreas de Mejora Identificadas" value={areasMejora.length} />
        </StatCardGrid>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GaugeChart
            value={cobertura}
            title="Cobertura de Planes de Desarrollo"
            subtitle="Porcentaje de evaluados con plan generado"
            segments={[
              { from: 0, to: 50, color: "#ef4444", label: "Baja" },
              { from: 50, to: 75, color: "#f97316", label: "Moderada" },
              { from: 75, to: 90, color: "#eab308", label: "Buena" },
              { from: 90, to: 100, color: "#22c55e", label: "Completa" },
            ]}
            size="lg"
          />

          <Card>
            <CardHeader>
              <CardTitle>Distribución por Nivel</CardTitle>
              <CardDescription>Planes generados por nivel jerárquico</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <LollipopChart
          data={lollipopData}
          title="Áreas de Mejora más Frecuentes"
          description="Competencias y dimensiones más identificadas para desarrollo"
          orientation="horizontal"
          showBaseline={false}
          height={Math.max(400, areasMejora.length * 35)}
        />

        {/* Tabla de distribución por nivel */}
        <Card>
          <CardHeader>
            <CardTitle>Detalle por Nivel Jerárquico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Nivel</th>
                    <th className="text-right py-2">Planes</th>
                    <th className="text-right py-2">% del Total</th>
                    <th className="py-2">Distribución</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(distribucionPorNivel)
                    .sort((a, b) => b[1] - a[1])
                    .map(([nivel, cantidad]) => (
                      <tr key={nivel} className="border-b">
                        <td className="py-2 font-medium">{nivel}</td>
                        <td className="py-2 text-right font-mono">{cantidad}</td>
                        <td className="py-2 text-right font-mono">
                          {((cantidad / totalGenerados) * 100).toFixed(1)}%
                        </td>
                        <td className="py-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${(cantidad / totalGenerados) * 100}%` }}
                            />
                          </div>
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
