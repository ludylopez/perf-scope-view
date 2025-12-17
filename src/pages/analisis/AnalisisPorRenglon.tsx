import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ArrowLeft, Wallet, TrendingUp, TrendingDown, Minus, Users, Clock, UserCircle, Briefcase, Target } from "lucide-react";
import {
  StatCard,
  StatCardGrid,
  BoxPlotChart,
  StatsTable,
  LollipopChart,
  DireccionRankingChart,
  TreemapChart,
} from "@/components/charts";
import { mean, standardDeviation, median as calcMedian, percentile, coefficientOfVariation } from "@/lib/advancedStatistics";
import type { BoxPlotData, TreemapNode, EstadisticasCompletas } from "@/types/analisis";

// Descripción de renglones presupuestarios (según nomenclatura guatemalteca)
// Incluye variantes con y sin ceros iniciales para compatibilidad
const RENGLON_NOMBRES: Record<string, string> = {
  "011": "Personal permanente",
  "11": "Personal permanente",
  "021": "Personal supernumerario",
  "21": "Personal supernumerario",
  "022": "Personal por contrato",
  "22": "Personal por contrato",
  "029": "Otras remuneraciones de personal temporal",
  "29": "Otras remuneraciones de personal temporal",
  "031": "Jornales",
  "31": "Jornales",
  "041": "Servicios extraordinarios de personal permanente",
  "41": "Servicios extraordinarios de personal permanente",
};

// Contexto de cada tipo de renglón para interpretación
const RENGLON_CONTEXTO: Record<string, { tipo: string; estabilidad: string; descripcion: string }> = {
  "011": { tipo: "Permanente", estabilidad: "Alta", descripcion: "Personal de planta con estabilidad laboral completa" },
  "11": { tipo: "Permanente", estabilidad: "Alta", descripcion: "Personal de planta con estabilidad laboral completa" },
  "022": { tipo: "Contrato", estabilidad: "Media", descripcion: "Personal contratado por tiempo determinado" },
  "22": { tipo: "Contrato", estabilidad: "Media", descripcion: "Personal contratado por tiempo determinado" },
  "029": { tipo: "Temporal", estabilidad: "Baja", descripcion: "Personal temporal para proyectos específicos" },
  "29": { tipo: "Temporal", estabilidad: "Baja", descripcion: "Personal temporal para proyectos específicos" },
  "031": { tipo: "Jornal", estabilidad: "Baja", descripcion: "Personal pagado por jornal/día trabajado" },
  "31": { tipo: "Jornal", estabilidad: "Baja", descripcion: "Personal pagado por jornal/día trabajado" },
};

interface RenglonStats {
  renglon: string;
  nombre: string;
  cantidad: number;
  desempeno: EstadisticasCompletas;
  potencial: EstadisticasCompletas;
  coeficienteVariacion: number;
  diferenciaVsGlobal: number;
  ranking: number;
  // Nuevos campos demográficos
  edadPromedio: number;
  antiguedadPromedio: number; // en años
  porcentajeMasculino: number;
  porcentajeOperativo: number;
  contexto: { tipo: string; estabilidad: string; descripcion: string } | null;
}

interface AnalisisCruzado {
  renglon: string;
  segmento: string;
  tipo: 'genero' | 'tipo_puesto';
  cantidad: number;
  desempenoPromedio: number;
  potencialPromedio: number;
}

export default function AnalisisPorRenglon() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [renglones, setRenglones] = useState<RenglonStats[]>([]);
  const [promedioGlobal, setPromedioGlobal] = useState(0);
  const [promedioPotencialGlobal, setPromedioPotencialGlobal] = useState(0);
  const [analisisCruzado, setAnalisisCruzado] = useState<AnalisisCruzado[]>([]);
  const [totalColaboradores, setTotalColaboradores] = useState(0);

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

      // Obtener resultados de evaluación CONSOLIDADOS
      const { data: results } = await supabase
        .from("final_evaluation_results_consolidated")
        .select("colaborador_id, desempeno_porcentaje_promedio, potencial_porcentaje_promedio")
        .eq("periodo_id", periodo.id);

      if (!results || results.length === 0) {
        setError("No hay resultados de evaluación");
        return;
      }

      const colaboradorIds = results.map(r => r.colaborador_id);

      // Obtener usuarios con sus renglones y datos demográficos
      const { data: users } = await supabase
        .from("users")
        .select("dpi, renglon, edad, antiguedad, genero, tipo_puesto, rol")
        .in("dpi", colaboradorIds);

      if (!users) return;

      // Filtrar usuarios admin
      const validUsers = users.filter(u => u.rol !== 'admin_general' && u.rol !== 'admin_rrhh');

      // Calcular promedios globales
      const allDesempeno = results
        .map(r => r.desempeno_porcentaje_promedio)
        .filter((v): v is number => v !== null && v > 0);
      const allPotencial = results
        .map(r => r.potencial_porcentaje_promedio)
        .filter((v): v is number => v !== null && v > 0);

      const globalAvg = mean(allDesempeno);
      const globalPotencialAvg = mean(allPotencial);
      setPromedioGlobal(globalAvg);
      setPromedioPotencialGlobal(globalPotencialAvg);
      setTotalColaboradores(results.length);

      // Agrupar por renglón con datos demográficos
      const resultsByRenglon: Record<string, {
        desempeno: number[];
        potencial: number[];
        edades: number[];
        antiguedades: number[];
        generos: string[];
        tiposPuesto: string[];
      }> = {};

      results.forEach(r => {
        const user = validUsers.find(u => u.dpi === r.colaborador_id);
        const renglon = user?.renglon;
        const desempeno = r.desempeno_porcentaje_promedio;
        const potencial = r.potencial_porcentaje_promedio;

        // Excluir colaboradores sin renglón asignado (ej: miembros del concejo)
        if (!renglon || renglon.trim() === '') return;

        if (!resultsByRenglon[renglon]) {
          resultsByRenglon[renglon] = {
            desempeno: [],
            potencial: [],
            edades: [],
            antiguedades: [],
            generos: [],
            tiposPuesto: []
          };
        }
        if (desempeno && desempeno > 0) {
          resultsByRenglon[renglon].desempeno.push(desempeno);
        }
        if (potencial && potencial > 0) {
          resultsByRenglon[renglon].potencial.push(potencial);
        }
        if (user?.edad) {
          resultsByRenglon[renglon].edades.push(user.edad);
        }
        if (user?.antiguedad) {
          resultsByRenglon[renglon].antiguedades.push(user.antiguedad / 12); // Convertir a años
        }
        if (user?.genero) {
          resultsByRenglon[renglon].generos.push(user.genero.toLowerCase());
        }
        if (user?.tipo_puesto) {
          resultsByRenglon[renglon].tiposPuesto.push(user.tipo_puesto.toLowerCase());
        }
      });

      // Calcular estadísticas por renglón
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

      const renglonesData: RenglonStats[] = Object.entries(resultsByRenglon)
        .filter(([_, data]) => data.desempeno.length >= 3) // Mínimo 3 para análisis estadístico
        .map(([codigo, data]) => {
          const desempenoStats = calcStats(data.desempeno);
          const potencialStats = calcStats(data.potencial);
          const cv = desempenoStats.promedio > 0
            ? coefficientOfVariation(data.desempeno)
            : 0;

          // Calcular porcentajes demográficos
          const totalGeneros = data.generos.length;
          const masculinos = data.generos.filter(g => g === 'masculino').length;
          const totalTipos = data.tiposPuesto.length;
          const operativos = data.tiposPuesto.filter(t => t === 'operativo').length;

          return {
            renglon: codigo,
            nombre: RENGLON_NOMBRES[codigo] || codigo,
            cantidad: data.desempeno.length,
            desempeno: desempenoStats,
            potencial: potencialStats,
            coeficienteVariacion: cv,
            diferenciaVsGlobal: desempenoStats.promedio - globalAvg,
            ranking: 0,
            edadPromedio: data.edades.length > 0 ? mean(data.edades) : 0,
            antiguedadPromedio: data.antiguedades.length > 0 ? mean(data.antiguedades) : 0,
            porcentajeMasculino: totalGeneros > 0 ? (masculinos / totalGeneros) * 100 : 0,
            porcentajeOperativo: totalTipos > 0 ? (operativos / totalTipos) * 100 : 0,
            contexto: RENGLON_CONTEXTO[codigo] || null,
          };
        })
        .sort((a, b) => b.desempeno.promedio - a.desempeno.promedio)
        .map((r, i) => ({ ...r, ranking: i + 1 }));

      setRenglones(renglonesData);

      // Calcular análisis cruzado por género y tipo de puesto
      const cruzadoData: AnalisisCruzado[] = [];

      Object.entries(resultsByRenglon).forEach(([renglon, data]) => {
        if (data.desempeno.length < 3) return;

        // Por género
        const byGenero: Record<string, { desempeno: number[]; potencial: number[] }> = {};
        results.forEach(r => {
          const user = validUsers.find(u => u.dpi === r.colaborador_id);
          if (user?.renglon !== renglon || !user?.genero) return;
          const genero = user.genero.toLowerCase() === 'masculino' ? 'Masculino' : 'Femenino';
          if (!byGenero[genero]) byGenero[genero] = { desempeno: [], potencial: [] };
          if (r.desempeno_porcentaje_promedio && r.desempeno_porcentaje_promedio > 0) {
            byGenero[genero].desempeno.push(r.desempeno_porcentaje_promedio);
          }
          if (r.potencial_porcentaje_promedio && r.potencial_porcentaje_promedio > 0) {
            byGenero[genero].potencial.push(r.potencial_porcentaje_promedio);
          }
        });

        Object.entries(byGenero).forEach(([genero, gData]) => {
          if (gData.desempeno.length >= 3) {
            cruzadoData.push({
              renglon,
              segmento: genero,
              tipo: 'genero',
              cantidad: gData.desempeno.length,
              desempenoPromedio: mean(gData.desempeno),
              potencialPromedio: gData.potencial.length > 0 ? mean(gData.potencial) : 0,
            });
          }
        });

        // Por tipo de puesto
        const byTipo: Record<string, { desempeno: number[]; potencial: number[] }> = {};
        results.forEach(r => {
          const user = validUsers.find(u => u.dpi === r.colaborador_id);
          if (user?.renglon !== renglon || !user?.tipo_puesto) return;
          const tipo = user.tipo_puesto.charAt(0).toUpperCase() + user.tipo_puesto.slice(1).toLowerCase();
          if (!byTipo[tipo]) byTipo[tipo] = { desempeno: [], potencial: [] };
          if (r.desempeno_porcentaje_promedio && r.desempeno_porcentaje_promedio > 0) {
            byTipo[tipo].desempeno.push(r.desempeno_porcentaje_promedio);
          }
          if (r.potencial_porcentaje_promedio && r.potencial_porcentaje_promedio > 0) {
            byTipo[tipo].potencial.push(r.potencial_porcentaje_promedio);
          }
        });

        Object.entries(byTipo).forEach(([tipo, tData]) => {
          if (tData.desempeno.length >= 3) {
            cruzadoData.push({
              renglon,
              segmento: tipo,
              tipo: 'tipo_puesto',
              cantidad: tData.desempeno.length,
              desempenoPromedio: mean(tData.desempeno),
              potencialPromedio: tData.potencial.length > 0 ? mean(tData.potencial) : 0,
            });
          }
        });
      });

      setAnalisisCruzado(cruzadoData);

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

  if (renglones.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Sin datos</AlertTitle>
            <AlertDescription>
              No hay suficientes datos de renglón presupuestario para mostrar el análisis.
              Se requieren al menos 3 colaboradores por renglón.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Preparar datos para gráficos
  const boxPlotData: BoxPlotData[] = renglones.map(r => ({
    segment: r.renglon,
    min: r.desempeno.min,
    q1: r.desempeno.q1,
    median: r.desempeno.mediana,
    q3: r.desempeno.q3,
    max: r.desempeno.max,
    mean: r.desempeno.promedio,
  }));

  const treemapData: TreemapNode[] = renglones.map(r => ({
    name: `${r.renglon} - ${r.nombre}`,
    value: r.cantidad,
  }));

  const statsTableData = renglones.map(r => ({
    segmento: `${r.renglon} - ${r.nombre}`,
    stats: r.desempeno,
    n: r.cantidad,
  }));

  const rankingData = renglones.map(r => ({
    nombre: `${r.renglon} - ${r.nombre}`,
    desempeno: r.desempeno.promedio,
    ranking: r.ranking,
  }));

  const lollipopData = renglones.map(r => ({
    label: r.renglon,
    value: r.diferenciaVsGlobal,
    baseline: 0,
    color: r.diferenciaVsGlobal >= 0 ? "#22c55e" : "#ef4444",
  }));

  // Estadísticas resumen
  const totalEvaluados = renglones.reduce((sum, r) => sum + r.cantidad, 0);
  const mejorRenglon = renglones[0];
  const peorRenglon = renglones[renglones.length - 1];
  const brechaMaxima = mejorRenglon && peorRenglon
    ? mejorRenglon.desempeno.promedio - peorRenglon.desempeno.promedio
    : 0;

  // Mayor dispersión (CV más alto)
  const mayorDispersion = [...renglones].sort((a, b) => b.coeficienteVariacion - a.coeficienteVariacion)[0];

  // Renglón con mayor antigüedad promedio
  const mayorAntiguedad = [...renglones].sort((a, b) => b.antiguedadPromedio - a.antiguedadPromedio)[0];

  // Renglón con mayor potencial
  const mejorPotencial = [...renglones].sort((a, b) => b.potencial.promedio - a.potencial.promedio)[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link to="/analisis" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2">
              <ArrowLeft className="h-4 w-4" />
              Volver a dashboards
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Wallet className="h-8 w-8" />
              Análisis por Renglón Presupuestario
            </h1>
            <p className="text-muted-foreground mt-1">Período: <span className="font-semibold">{periodoNombre}</span></p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Modalidad de Contrato</p>
          </div>
        </div>

        {/* KPIs principales */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Renglones"
            value={renglones.length}
            subtitle={`${totalEvaluados} colaboradores`}
          />
          <StatCard
            title="Mejor Desempeño"
            value={mejorRenglon?.desempeno.promedio || 0}
            format="percentage"
            subtitle={`${mejorRenglon?.renglon} - ${mejorRenglon?.nombre}`}
            color="success"
          />
          <StatCard
            title="Mejor Potencial"
            value={mejorPotencial?.potencial.promedio || 0}
            format="percentage"
            subtitle={`${mejorPotencial?.renglon} - ${mejorPotencial?.nombre}`}
            color="primary"
          />
          <StatCard
            title="Brecha Máxima"
            value={brechaMaxima}
            format="decimal"
            subtitle="puntos porcentuales"
            color={brechaMaxima > 10 ? "danger" : "warning"}
          />
          <StatCard
            title="Mayor Antigüedad"
            value={mayorAntiguedad?.antiguedadPromedio || 0}
            format="decimal"
            subtitle={`años (${mayorAntiguedad?.renglon})`}
          />
          <StatCard
            title="Mayor Dispersión"
            value={mayorDispersion?.coeficienteVariacion || 0}
            format="percentage"
            subtitle={`CV (${mayorDispersion?.renglon})`}
            color={mayorDispersion?.coeficienteVariacion > 20 ? "warning" : "default"}
          />
        </div>

        {/* Tabla de Caracterización Demográfica por Renglón */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Caracterización Demográfica por Renglón
            </CardTitle>
            <CardDescription>Perfil demográfico y de desempeño de cada modalidad de contrato</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-2">Renglón</th>
                    <th className="text-left py-3 px-2">Descripción</th>
                    <th className="text-right py-3 px-2">N</th>
                    <th className="text-right py-3 px-2">Desempeño</th>
                    <th className="text-right py-3 px-2">Potencial</th>
                    <th className="text-right py-3 px-2">Edad Prom.</th>
                    <th className="text-right py-3 px-2">Antigüedad</th>
                    <th className="text-right py-3 px-2">% Masc.</th>
                    <th className="text-right py-3 px-2">% Operativo</th>
                    <th className="text-right py-3 px-2">vs Global</th>
                  </tr>
                </thead>
                <tbody>
                  {renglones.map(r => (
                    <tr key={r.renglon} className="border-b hover:bg-muted/30">
                      <td className="py-3 px-2">
                        <span className="font-mono font-bold text-primary">{r.renglon}</span>
                      </td>
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium">{r.nombre}</p>
                          {r.contexto && (
                            <p className="text-xs text-muted-foreground">
                              {r.contexto.tipo} • Estabilidad: {r.contexto.estabilidad}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="text-right py-3 px-2 font-semibold">{r.cantidad}</td>
                      <td className="text-right py-3 px-2">
                        <span className="font-semibold">{r.desempeno.promedio.toFixed(1)}%</span>
                      </td>
                      <td className="text-right py-3 px-2">
                        <span className="text-muted-foreground">{r.potencial.promedio.toFixed(1)}%</span>
                      </td>
                      <td className="text-right py-3 px-2">{r.edadPromedio.toFixed(0)} años</td>
                      <td className="text-right py-3 px-2">{r.antiguedadPromedio.toFixed(1)} años</td>
                      <td className="text-right py-3 px-2">{r.porcentajeMasculino.toFixed(0)}%</td>
                      <td className="text-right py-3 px-2">{r.porcentajeOperativo.toFixed(0)}%</td>
                      <td className={`text-right py-3 px-2 font-semibold ${r.diferenciaVsGlobal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {r.diferenciaVsGlobal >= 0 ? '+' : ''}{r.diferenciaVsGlobal.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Gráficos principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DireccionRankingChart
            direcciones={rankingData}
            title="Ranking por Renglón Presupuestario"
            metric="desempeno"
          />
          <TreemapChart
            data={treemapData}
            title="Distribución de Colaboradores por Renglón"
            description="Tamaño proporcional a la cantidad de evaluados"
          />
        </div>

        {/* Box Plots */}
        <BoxPlotChart
          data={boxPlotData}
          title="Distribución de Desempeño por Renglón"
          description="Dispersión y outliers de calificaciones por tipo de contrato"
          yLabel="Desempeño (%)"
        />

        {/* Diferencia vs Global */}
        <Card>
          <CardHeader>
            <CardTitle>Diferencia vs Promedio Organizacional</CardTitle>
            <CardDescription>
              Promedio global: {promedioGlobal.toFixed(1)}% - Valores positivos indican mejor desempeño que el promedio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LollipopChart
              data={lollipopData}
              title=""
              showBaseline
              orientation="horizontal"
            />
          </CardContent>
        </Card>

        {/* Tabla de estadísticas */}
        <StatsTable
          data={statsTableData}
          title="Estadísticas Detalladas por Renglón"
          showPercentiles
          showBoxPlot
        />

        {/* Análisis Cruzado por Renglón */}
        {analisisCruzado.length > 0 && (
          <Tabs defaultValue="tipo_puesto" className="w-full">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Análisis Cruzado por Renglón
                </CardTitle>
                <CardDescription>Desempeño segmentado por tipo de puesto y género dentro de cada renglón</CardDescription>
              </CardHeader>
              <CardContent>
                <TabsList className="mb-4">
                  <TabsTrigger value="tipo_puesto" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Por Tipo de Puesto
                  </TabsTrigger>
                  <TabsTrigger value="genero" className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    Por Género
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="tipo_puesto">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left py-2 px-3">Renglón</th>
                          <th className="text-left py-2 px-3">Tipo Puesto</th>
                          <th className="text-right py-2 px-3">N</th>
                          <th className="text-right py-2 px-3">Desempeño</th>
                          <th className="text-right py-2 px-3">Potencial</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analisisCruzado
                          .filter(a => a.tipo === 'tipo_puesto')
                          .sort((a, b) => a.renglon.localeCompare(b.renglon) || b.desempenoPromedio - a.desempenoPromedio)
                          .map((a, idx) => (
                            <tr key={idx} className="border-b hover:bg-muted/30">
                              <td className="py-2 px-3 font-mono font-semibold">{a.renglon}</td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  a.segmento === 'Operativo' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {a.segmento}
                                </span>
                              </td>
                              <td className="text-right py-2 px-3">{a.cantidad}</td>
                              <td className="text-right py-2 px-3 font-semibold">{a.desempenoPromedio.toFixed(1)}%</td>
                              <td className="text-right py-2 px-3 text-muted-foreground">{a.potencialPromedio.toFixed(1)}%</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="genero">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left py-2 px-3">Renglón</th>
                          <th className="text-left py-2 px-3">Género</th>
                          <th className="text-right py-2 px-3">N</th>
                          <th className="text-right py-2 px-3">Desempeño</th>
                          <th className="text-right py-2 px-3">Potencial</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analisisCruzado
                          .filter(a => a.tipo === 'genero')
                          .sort((a, b) => a.renglon.localeCompare(b.renglon) || b.desempenoPromedio - a.desempenoPromedio)
                          .map((a, idx) => (
                            <tr key={idx} className="border-b hover:bg-muted/30">
                              <td className="py-2 px-3 font-mono font-semibold">{a.renglon}</td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  a.segmento === 'Femenino' ? 'bg-pink-100 text-pink-800' : 'bg-cyan-100 text-cyan-800'
                                }`}>
                                  {a.segmento}
                                </span>
                              </td>
                              <td className="text-right py-2 px-3">{a.cantidad}</td>
                              <td className="text-right py-2 px-3 font-semibold">{a.desempenoPromedio.toFixed(1)}%</td>
                              <td className="text-right py-2 px-3 text-muted-foreground">{a.potencialPromedio.toFixed(1)}%</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        )}

        {/* Interpretación y Hallazgos */}
        <Card>
          <CardHeader>
            <CardTitle>Hallazgos e Interpretación</CardTitle>
            <CardDescription>Análisis de patrones y recomendaciones basadas en los datos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cards de resumen por renglón */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renglones.map(r => (
                <div
                  key={r.renglon}
                  className={`p-4 rounded-lg border ${
                    r.diferenciaVsGlobal > 2 ? "bg-green-50 border-green-200" :
                    r.diferenciaVsGlobal < -2 ? "bg-red-50 border-red-200" :
                    "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {r.diferenciaVsGlobal > 2 ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : r.diferenciaVsGlobal < -2 ? (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      ) : (
                        <Minus className="h-5 w-5 text-gray-600" />
                      )}
                      <span className="font-mono font-bold text-lg">{r.renglon}</span>
                      <span className="text-sm text-muted-foreground">- {r.nombre}</span>
                    </div>
                    <span className={`font-semibold ${r.diferenciaVsGlobal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {r.diferenciaVsGlobal >= 0 ? '+' : ''}{r.diferenciaVsGlobal.toFixed(1)} pts
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Desempeño</p>
                      <p className="font-semibold text-lg">{r.desempeno.promedio.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Potencial</p>
                      <p className="font-semibold text-lg">{r.potencial.promedio.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Edad Prom.</p>
                      <p className="font-semibold">{r.edadPromedio.toFixed(0)} años</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Antigüedad</p>
                      <p className="font-semibold">{r.antiguedadPromedio.toFixed(1)} años</p>
                    </div>
                  </div>

                  {r.contexto && (
                    <p className="mt-3 text-xs text-muted-foreground italic">
                      {r.contexto.descripcion}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Hallazgos Clave */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <Target className="h-5 w-5" />
                Hallazgos Clave
              </h4>
              <ul className="space-y-3 text-sm text-blue-700">
                <li>
                  <strong>Mejor desempeño:</strong> El renglón <span className="font-mono">{mejorRenglon?.renglon}</span> ({mejorRenglon?.nombre})
                  presenta el mejor promedio con <span className="font-semibold">{mejorRenglon?.desempeno.promedio.toFixed(1)}%</span>,
                  con una antigüedad promedio de {mejorRenglon?.antiguedadPromedio.toFixed(1)} años.
                </li>
                {peorRenglon && mejorRenglon && peorRenglon.renglon !== mejorRenglon.renglon && (
                  <li>
                    <strong>Brecha entre modalidades:</strong> Existe una diferencia de <span className="font-semibold">{brechaMaxima.toFixed(1)} puntos</span> entre
                    el renglón {mejorRenglon.renglon} y {peorRenglon.renglon}.
                    {mayorAntiguedad && mayorAntiguedad.antiguedadPromedio > 10 && mayorAntiguedad.desempeno.promedio < promedioGlobal && (
                      <span className="text-amber-700"> Nota: El renglón con mayor antigüedad ({mayorAntiguedad.renglon}) no es el de mejor desempeño, lo cual podría indicar necesidad de actualización de competencias.</span>
                    )}
                  </li>
                )}
                {analisisCruzado.filter(a => a.tipo === 'tipo_puesto').length > 0 && (
                  <li>
                    <strong>Tipo de puesto:</strong> El personal operativo muestra
                    {analisisCruzado.filter(a => a.tipo === 'tipo_puesto' && a.segmento === 'Operativo').reduce((sum, a) => sum + a.desempenoPromedio, 0) /
                     analisisCruzado.filter(a => a.tipo === 'tipo_puesto' && a.segmento === 'Operativo').length >
                     analisisCruzado.filter(a => a.tipo === 'tipo_puesto' && a.segmento === 'Administrativo').reduce((sum, a) => sum + a.desempenoPromedio, 0) /
                     analisisCruzado.filter(a => a.tipo === 'tipo_puesto' && a.segmento === 'Administrativo').length
                      ? ' mejor desempeño que el administrativo en promedio.'
                      : ' menor desempeño que el administrativo en promedio.'}
                  </li>
                )}
                {mayorDispersion && mayorDispersion.coeficienteVariacion > 15 && (
                  <li>
                    <strong>Alta dispersión:</strong> El renglón <span className="font-mono">{mayorDispersion.renglon}</span> muestra un CV del {mayorDispersion.coeficienteVariacion.toFixed(1)}%,
                    indicando heterogeneidad significativa en el desempeño de este grupo.
                  </li>
                )}
              </ul>
            </div>

            {/* Recomendaciones */}
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-800 mb-2">Recomendaciones</h4>
              <ul className="space-y-1 text-sm text-amber-700 list-disc list-inside">
                <li>Analizar factores que explican las diferencias de desempeño entre modalidades de contrato.</li>
                <li>Considerar programas de desarrollo específicos para renglones con menor desempeño.</li>
                {mayorAntiguedad && mayorAntiguedad.antiguedadPromedio > 10 && (
                  <li>Evaluar programas de actualización para el personal de mayor antigüedad (renglón {mayorAntiguedad.renglon}).</li>
                )}
                <li>Revisar si las diferencias por tipo de puesto requieren intervenciones diferenciadas.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
