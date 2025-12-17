import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ArrowLeft, Scale } from "lucide-react";
import {
  StatCard,
  StatCardGrid,
  BoxPlotChart,
  EquityInterpretation,
  StatsTable,
  ComparisonTable,
} from "@/components/charts";
import { mean, standardDeviation, median as calcMedian, percentile, giniCoefficient, equityIndex } from "@/lib/advancedStatistics";
import type { IndiceEquidad, BoxPlotData, EstadisticasCompletas } from "@/types/analisis";

interface ColaboradorData {
  id: string;
  desempeno: number;
  genero: string;
  tipoPuesto: string;
  rangoEdad: string;
  rangoAntiguedad: string;
}

export default function AnalisisEquidad() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [colaboradores, setColaboradores] = useState<ColaboradorData[]>([]);
  const [gini, setGini] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const getRangoEdad = (edad: number): string => {
    if (edad < 26) return "18-25";
    if (edad < 36) return "26-35";
    if (edad < 46) return "36-45";
    if (edad < 56) return "46-55";
    return "56+";
  };

  const getRangoAntiguedad = (meses: number): string => {
    if (meses < 12) return "< 1 año";
    if (meses < 24) return "1-2 años";
    if (meses < 60) return "2-5 años";
    if (meses < 120) return "5-10 años";
    return "10+ años";
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const periodo = await getActivePeriod();
      if (!periodo) {
        setError("No se encontró un período activo");
        return;
      }

      setPeriodoNombre(periodo.nombre);

      const { data: results } = await supabase
        .from("final_evaluation_results")
        .select("colaborador_id, desempeno_porcentaje")
        .eq("periodo_id", periodo.id);

      if (!results || results.length === 0) {
        setError("No hay resultados");
        return;
      }

      const colaboradorIds = results.map(r => r.colaborador_id);

      const { data: users } = await supabase
        .from("users")
        .select("dpi, genero, tipo_puesto, edad, fecha_ingreso")
        .in("dpi", colaboradorIds);

      if (!users) return;

      const now = new Date();
      const colabs: ColaboradorData[] = results
        .map(r => {
          const user = users.find(u => u.dpi === r.colaborador_id);
          if (!user || !r.desempeno_porcentaje) return null;

          const fechaIngreso = user.fecha_ingreso ? new Date(user.fecha_ingreso) : null;
          const antiguedadMeses = fechaIngreso
            ? Math.floor((now.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 30))
            : 0;

          return {
            id: r.colaborador_id,
            desempeno: r.desempeno_porcentaje,
            genero: user.genero || "no_especificado",
            tipoPuesto: user.tipo_puesto || "no_especificado",
            rangoEdad: user.edad ? getRangoEdad(user.edad) : "no_especificado",
            rangoAntiguedad: getRangoAntiguedad(antiguedadMeses),
          };
        })
        .filter((c): c is ColaboradorData => c !== null);

      setColaboradores(colabs);

      // Calcular Gini
      const scores = colabs.map(c => c.desempeno);
      setGini(giniCoefficient(scores));
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

  // Calcular estadísticas por grupo
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

  // Por género
  const masculino = colaboradores.filter(c => c.genero === "masculino");
  const femenino = colaboradores.filter(c => c.genero === "femenino");
  const statsM = calcStats(masculino.map(c => c.desempeno));
  const statsF = calcStats(femenino.map(c => c.desempeno));

  // Por tipo de puesto
  const administrativo = colaboradores.filter(c => c.tipoPuesto === "administrativo");
  const operativo = colaboradores.filter(c => c.tipoPuesto === "operativo");
  const statsAdmin = calcStats(administrativo.map(c => c.desempeno));
  const statsOper = calcStats(operativo.map(c => c.desempeno));

  // Box plots por género
  const boxPlotGenero: BoxPlotData[] = [
    { segment: "Masculino", ...statsM, median: statsM.mediana, mean: statsM.promedio },
    { segment: "Femenino", ...statsF, median: statsF.mediana, mean: statsF.promedio },
  ].filter(b => b.max > 0);

  // Box plots por tipo puesto
  const boxPlotTipo: BoxPlotData[] = [
    { segment: "Administrativo", ...statsAdmin, median: statsAdmin.mediana, mean: statsAdmin.promedio },
    { segment: "Operativo", ...statsOper, median: statsOper.mediana, mean: statsOper.promedio },
  ].filter(b => b.max > 0);

  // Box plots por rango de edad
  const rangosEdad = ["18-25", "26-35", "36-45", "46-55", "56+"];
  const boxPlotEdad: BoxPlotData[] = rangosEdad
    .map(rango => {
      const arr = colaboradores.filter(c => c.rangoEdad === rango).map(c => c.desempeno);
      if (arr.length < 2) return null;
      const stats = calcStats(arr);
      return { segment: rango, ...stats, median: stats.mediana, mean: stats.promedio };
    })
    .filter((b): b is BoxPlotData => b !== null);

  // Box plots por antigüedad
  const rangosAntiguedad = ["< 1 año", "1-2 años", "2-5 años", "5-10 años", "10+ años"];
  const boxPlotAntiguedad: BoxPlotData[] = rangosAntiguedad
    .map(rango => {
      const arr = colaboradores.filter(c => c.rangoAntiguedad === rango).map(c => c.desempeno);
      if (arr.length < 2) return null;
      const stats = calcStats(arr);
      return { segment: rango, ...stats, median: stats.mediana, mean: stats.promedio };
    })
    .filter((b): b is BoxPlotData => b !== null);

  const brechaGenero = Math.abs(statsM.promedio - statsF.promedio);
  const brechaTipo = Math.abs(statsAdmin.promedio - statsOper.promedio);

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
              <Scale className="h-8 w-8" />
              Índices de Equidad
            </h1>
            <p className="text-muted-foreground mt-1">Período: <span className="font-semibold">{periodoNombre}</span></p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Estadística Avanzada</p>
          </div>
        </div>

        <StatCardGrid columns={4}>
          <StatCard
            title="Coeficiente de Gini"
            value={gini}
            format="decimal"
            subtitle={gini < 0.2 ? "Alta equidad" : gini < 0.3 ? "Equidad moderada" : "Revisar dispersión"}
            color={gini < 0.2 ? "success" : gini < 0.3 ? "warning" : "danger"}
          />
          <StatCard
            title="Brecha de Género"
            value={brechaGenero}
            format="decimal"
            subtitle={brechaGenero < 5 ? "Equitativo" : "Requiere atención"}
            color={brechaGenero < 5 ? "success" : "warning"}
          />
          <StatCard
            title="Brecha Tipo Puesto"
            value={brechaTipo}
            format="decimal"
            subtitle={brechaTipo < 5 ? "Equitativo" : "Requiere atención"}
            color={brechaTipo < 5 ? "success" : "warning"}
          />
          <StatCard title="Total Analizados" value={colaboradores.length} />
        </StatCardGrid>

        <Tabs defaultValue="genero" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="genero">Género</TabsTrigger>
            <TabsTrigger value="tipo">Tipo Puesto</TabsTrigger>
            <TabsTrigger value="edad">Edad</TabsTrigger>
            <TabsTrigger value="antiguedad">Antigüedad</TabsTrigger>
          </TabsList>

          <TabsContent value="genero" className="space-y-6 mt-6">
            {boxPlotGenero.length > 0 && (
              <BoxPlotChart
                data={boxPlotGenero}
                title="Distribución de Desempeño por Género"
                yLabel="Desempeño (%)"
              />
            )}
            {masculino.length > 0 && femenino.length > 0 && (
              <EquityInterpretation
                grupo1={{ nombre: "Masculino", valor: statsM.promedio, n: masculino.length }}
                grupo2={{ nombre: "Femenino", valor: statsF.promedio, n: femenino.length }}
                variable="Desempeño"
              />
            )}
            <ComparisonTable
              groups={[
                { name: "Masculino", color: "#3b82f6" },
                { name: "Femenino", color: "#ec4899" },
              ]}
              metrics={[
                { label: "Cantidad", values: [masculino.length, femenino.length] },
                { label: "Promedio", values: [statsM.promedio, statsF.promedio], format: "decimal", highlightDiff: true },
                { label: "Mediana", values: [statsM.mediana, statsF.mediana], format: "decimal" },
                { label: "Desv. Std.", values: [statsM.desviacion, statsF.desviacion], format: "decimal" },
              ]}
              title="Comparativa por Género"
            />
          </TabsContent>

          <TabsContent value="tipo" className="space-y-6 mt-6">
            {boxPlotTipo.length > 0 && (
              <BoxPlotChart
                data={boxPlotTipo}
                title="Distribución de Desempeño por Tipo de Puesto"
                yLabel="Desempeño (%)"
              />
            )}
            {administrativo.length > 0 && operativo.length > 0 && (
              <EquityInterpretation
                grupo1={{ nombre: "Administrativo", valor: statsAdmin.promedio, n: administrativo.length }}
                grupo2={{ nombre: "Operativo", valor: statsOper.promedio, n: operativo.length }}
                variable="Desempeño"
              />
            )}
            <ComparisonTable
              groups={[
                { name: "Administrativo", color: "#22c55e" },
                { name: "Operativo", color: "#f59e0b" },
              ]}
              metrics={[
                { label: "Cantidad", values: [administrativo.length, operativo.length] },
                { label: "Promedio", values: [statsAdmin.promedio, statsOper.promedio], format: "decimal", highlightDiff: true },
                { label: "Mediana", values: [statsAdmin.mediana, statsOper.mediana], format: "decimal" },
                { label: "Desv. Std.", values: [statsAdmin.desviacion, statsOper.desviacion], format: "decimal" },
              ]}
              title="Comparativa por Tipo de Puesto"
            />
          </TabsContent>

          <TabsContent value="edad" className="space-y-6 mt-6">
            {boxPlotEdad.length > 0 && (
              <BoxPlotChart
                data={boxPlotEdad}
                title="Distribución de Desempeño por Rango de Edad"
                yLabel="Desempeño (%)"
              />
            )}
          </TabsContent>

          <TabsContent value="antiguedad" className="space-y-6 mt-6">
            {boxPlotAntiguedad.length > 0 && (
              <BoxPlotChart
                data={boxPlotAntiguedad}
                title="Distribución de Desempeño por Antigüedad"
                yLabel="Desempeño (%)"
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Interpretación del Gini */}
        <Card>
          <CardHeader>
            <CardTitle>Interpretación del Coeficiente de Gini</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              El coeficiente de Gini mide la desigualdad en la distribución de calificaciones.
              Un valor de 0 indica perfecta igualdad (todos tienen la misma calificación),
              mientras que un valor cercano a 1 indica máxima desigualdad.
            </p>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className={`p-3 rounded-lg ${gini < 0.15 ? "bg-green-100 ring-2 ring-green-500" : "bg-green-50"}`}>
                <p className="font-mono font-bold">&lt; 0.15</p>
                <p className="text-sm text-muted-foreground">Muy equitativo</p>
              </div>
              <div className={`p-3 rounded-lg ${gini >= 0.15 && gini < 0.25 ? "bg-yellow-100 ring-2 ring-yellow-500" : "bg-yellow-50"}`}>
                <p className="font-mono font-bold">0.15 - 0.25</p>
                <p className="text-sm text-muted-foreground">Equitativo</p>
              </div>
              <div className={`p-3 rounded-lg ${gini >= 0.25 && gini < 0.35 ? "bg-orange-100 ring-2 ring-orange-500" : "bg-orange-50"}`}>
                <p className="font-mono font-bold">0.25 - 0.35</p>
                <p className="text-sm text-muted-foreground">Desigualdad moderada</p>
              </div>
              <div className={`p-3 rounded-lg ${gini >= 0.35 ? "bg-red-100 ring-2 ring-red-500" : "bg-red-50"}`}>
                <p className="font-mono font-bold">&gt; 0.35</p>
                <p className="text-sm text-muted-foreground">Alta desigualdad</p>
              </div>
            </div>
            <p className="text-center text-lg font-semibold">
              Gini actual: <span className="font-mono">{gini.toFixed(3)}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
