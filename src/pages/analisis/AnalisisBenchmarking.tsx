import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { Loader2, BarChart3, Target, TrendingUp, Award, AlertTriangle, ArrowLeft } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  ReferenceLine,
} from "recharts";
import { standardize, percentileRanks } from "@/lib/advancedStatistics";

interface ColaboradorData {
  id: string;
  nombre: string;
  direccion: string;
  nivel: string;
  porcentaje_desempeno: number;
  porcentaje_potencial: number;
  resultado_dimension: Record<string, any>;
}

interface DireccionBenchmark {
  direccion: string;
  cantidad: number;
  promedioDesempeno: number;
  promedioPotencial: number;
  desviacionDesempeno: number;
  percentilDesempeno: number;
  percentilPotencial: number;
  zScoreDesempeno: number;
  zScorePotencial: number;
  dimensiones: Record<string, number>;
}

interface DimensionComparativa {
  dimension: string;
  [key: string]: string | number;
}

const COLORES_DIRECCIONES = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00C49F",
  "#FFBB28", "#FF8042", "#0088FE", "#00C49F", "#FF6B6B",
  "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD"
];

export default function AnalisisBenchmarking() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [colaboradores, setColaboradores] = useState<ColaboradorData[]>([]);
  const [selectedDirecciones, setSelectedDirecciones] = useState<string[]>([]);
  const [metricaComparativa, setMetricaComparativa] = useState<"desempeno" | "potencial">("desempeno");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const periodo = await getActivePeriod();
      if (!periodo) {
        setError("No se encontró un período de evaluación activo");
        return;
      }
      setPeriodoNombre(periodo.nombre);

      // Cargar resultados finales del período
      const { data: results } = await supabase
        .from("final_evaluation_results")
        .select("colaborador_id, desempeno_porcentaje, potencial_porcentaje")
        .eq("periodo_id", periodo.id)
        .not("desempeno_porcentaje", "is", null);

      if (!results || results.length === 0) {
        setError("No hay evaluaciones completadas para este período");
        return;
      }

      const colaboradorIds = results.map(r => r.colaborador_id);

      // Obtener datos de usuarios
      const { data: users } = await supabase
        .from("users")
        .select("dpi, nombre, nivel, direccion_unidad")
        .in("dpi", colaboradorIds);

      if (!users) {
        setError("No se pudieron cargar los datos de colaboradores");
        return;
      }

      // Cargar evaluaciones con respuestas para obtener dimensiones
      const { data: evaluations } = await supabase
        .from("evaluations")
        .select("colaborador_id, responses")
        .eq("periodo_id", periodo.id)
        .eq("estado", "enviado")
        .eq("tipo", "jefe")
        .in("colaborador_id", colaboradorIds);

      // Cargar configuración de instrumentos para mapear ítems a dimensiones
      const { data: instruments } = await supabase
        .from("instrument_configs")
        .select("nivel, dimensiones_desempeno")
        .eq("activo", true);

      // Crear mapa de ítem -> dimensión
      const itemToDimension = new Map<string, string>();
      if (instruments) {
        instruments.forEach(inst => {
          const dims = inst.dimensiones_desempeno as Array<{
            id: string;
            nombre: string;
            items: Array<{ id: string }>;
          }> | null;
          if (dims && Array.isArray(dims)) {
            dims.forEach(dim => {
              if (dim.items && Array.isArray(dim.items)) {
                dim.items.forEach(item => {
                  itemToDimension.set(item.id, dim.nombre);
                });
              }
            });
          }
        });
      }

      // Calcular promedios por dimensión para cada colaborador
      const dimensionesPorColaborador = new Map<string, Record<string, number[]>>();

      if (evaluations) {
        evaluations.forEach(ev => {
          const responses = ev.responses as Record<string, number> | null;
          if (!responses || !ev.colaborador_id) return;

          if (!dimensionesPorColaborador.has(ev.colaborador_id)) {
            dimensionesPorColaborador.set(ev.colaborador_id, {});
          }
          const colabDims = dimensionesPorColaborador.get(ev.colaborador_id)!;

          Object.entries(responses).forEach(([itemId, valor]) => {
            if (typeof valor === 'number') {
              const dimNombre = itemToDimension.get(itemId) || 'Sin dimensión';
              if (!colabDims[dimNombre]) {
                colabDims[dimNombre] = [];
              }
              colabDims[dimNombre].push(valor);
            }
          });
        });
      }

      const colaboradoresData: ColaboradorData[] = results
        .map(r => {
          const user = users.find(u => u.dpi === r.colaborador_id);
          if (!r.desempeno_porcentaje || !user) return null;

          // Calcular promedios por dimensión
          const colabDims = dimensionesPorColaborador.get(r.colaborador_id) || {};
          const resultado_dimension: Record<string, number> = {};
          Object.entries(colabDims).forEach(([dim, valores]) => {
            if (valores.length > 0) {
              resultado_dimension[dim] = (valores.reduce((a, b) => a + b, 0) / valores.length) * 20; // Convertir 1-5 a porcentaje
            }
          });

          return {
            id: r.colaborador_id,
            nombre: user.nombre || "Sin nombre",
            direccion: user.direccion_unidad || "Sin dirección",
            nivel: user.nivel || "Sin nivel",
            porcentaje_desempeno: r.desempeno_porcentaje,
            porcentaje_potencial: r.potencial_porcentaje || r.desempeno_porcentaje * 0.9,
            resultado_dimension,
          };
        })
        .filter((c): c is ColaboradorData => c !== null);

      setColaboradores(colaboradoresData);

      // Seleccionar todas las direcciones por defecto
      const direcciones = [...new Set(colaboradoresData.map((c) => c.direccion).filter(Boolean))];
      setSelectedDirecciones(direcciones);
    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("Error al cargar el análisis de benchmarking");
    } finally {
      setLoading(false);
    }
  };

  // Calcular benchmarks por dirección
  const benchmarksPorDireccion = useMemo((): DireccionBenchmark[] => {
    const direccionesMap = new Map<string, ColaboradorData[]>();

    colaboradores.forEach((c) => {
      if (c.direccion) {
        const list = direccionesMap.get(c.direccion) || [];
        list.push(c);
        direccionesMap.set(c.direccion, list);
      }
    });

    const benchmarks: DireccionBenchmark[] = [];
    const promediosDesempeno: number[] = [];
    const promediosPotencial: number[] = [];

    direccionesMap.forEach((cols, direccion) => {
      const desempenos = cols.map((c) => c.porcentaje_desempeno);
      const potenciales = cols.map((c) => c.porcentaje_potencial);

      const promedioDesempeno = desempenos.reduce((a, b) => a + b, 0) / desempenos.length;
      const promedioPotencial = potenciales.reduce((a, b) => a + b, 0) / potenciales.length;

      promediosDesempeno.push(promedioDesempeno);
      promediosPotencial.push(promedioPotencial);

      // Calcular desviación estándar
      const varianza = desempenos.reduce((sum, val) => sum + Math.pow(val - promedioDesempeno, 2), 0) / desempenos.length;
      const desviacion = Math.sqrt(varianza);

      // Calcular promedios por dimensión
      const dimensiones: Record<string, number[]> = {};
      cols.forEach((c) => {
        if (c.resultado_dimension) {
          Object.entries(c.resultado_dimension).forEach(([dim, valor]) => {
            if (typeof valor === "number") {
              if (!dimensiones[dim]) dimensiones[dim] = [];
              dimensiones[dim].push(valor);
            }
          });
        }
      });

      const dimensionesPromedio: Record<string, number> = {};
      Object.entries(dimensiones).forEach(([dim, valores]) => {
        dimensionesPromedio[dim] = valores.reduce((a, b) => a + b, 0) / valores.length;
      });

      benchmarks.push({
        direccion,
        cantidad: cols.length,
        promedioDesempeno,
        promedioPotencial,
        desviacionDesempeno: desviacion,
        percentilDesempeno: 0, // Se calculará después
        percentilPotencial: 0,
        zScoreDesempeno: 0,
        zScorePotencial: 0,
        dimensiones: dimensionesPromedio,
      });
    });

    // Calcular percentiles y z-scores
    const zScoresDesempeno = standardize(promediosDesempeno);
    const zScoresPotencial = standardize(promediosPotencial);
    const percentilesDesempeno = percentileRanks(promediosDesempeno);
    const percentilesPotencial = percentileRanks(promediosPotencial);

    benchmarks.forEach((b, i) => {
      b.zScoreDesempeno = zScoresDesempeno[i];
      b.zScorePotencial = zScoresPotencial[i];
      b.percentilDesempeno = percentilesDesempeno[i];
      b.percentilPotencial = percentilesPotencial[i];
    });

    return benchmarks.sort((a, b) => b.promedioDesempeno - a.promedioDesempeno);
  }, [colaboradores]);

  // Estadísticas globales
  const estadisticasGlobales = useMemo(() => {
    if (colaboradores.length === 0) return null;

    const desempenos = colaboradores.map((c) => c.porcentaje_desempeno);
    const potenciales = colaboradores.map((c) => c.porcentaje_potencial);

    const promedioDesempeno = desempenos.reduce((a, b) => a + b, 0) / desempenos.length;
    const promedioPotencial = potenciales.reduce((a, b) => a + b, 0) / potenciales.length;

    const varianzaDesempeno = desempenos.reduce((sum, val) => sum + Math.pow(val - promedioDesempeno, 2), 0) / desempenos.length;
    const desviacionDesempeno = Math.sqrt(varianzaDesempeno);

    return {
      totalColaboradores: colaboradores.length,
      totalDirecciones: benchmarksPorDireccion.length,
      promedioDesempeno,
      promedioPotencial,
      desviacionDesempeno,
      mejorDireccion: benchmarksPorDireccion[0]?.direccion || "N/A",
      peorDireccion: benchmarksPorDireccion[benchmarksPorDireccion.length - 1]?.direccion || "N/A",
    };
  }, [colaboradores, benchmarksPorDireccion]);

  // Datos para gráfico de barras comparativo
  const datosBarras = useMemo(() => {
    return benchmarksPorDireccion
      .filter((b) => selectedDirecciones.includes(b.direccion))
      .map((b) => ({
        direccion: b.direccion.length > 20 ? b.direccion.substring(0, 20) + "..." : b.direccion,
        direccionCompleta: b.direccion,
        desempeno: Number(b.promedioDesempeno.toFixed(1)),
        potencial: Number(b.promedioPotencial.toFixed(1)),
        cantidad: b.cantidad,
      }));
  }, [benchmarksPorDireccion, selectedDirecciones]);

  // Datos para radar chart (dimensiones)
  const datosDimensiones = useMemo((): DimensionComparativa[] => {
    // Obtener todas las dimensiones únicas
    const todasDimensiones = new Set<string>();
    benchmarksPorDireccion.forEach((b) => {
      Object.keys(b.dimensiones).forEach((d) => todasDimensiones.add(d));
    });

    // Crear datos para radar
    const dimensionesArr = Array.from(todasDimensiones);
    return dimensionesArr.slice(0, 8).map((dim) => {
      const row: DimensionComparativa = { dimension: dim.length > 15 ? dim.substring(0, 15) + "..." : dim };
      benchmarksPorDireccion
        .filter((b) => selectedDirecciones.includes(b.direccion))
        .slice(0, 5)
        .forEach((b) => {
          row[b.direccion] = b.dimensiones[dim] || 0;
        });
      return row;
    });
  }, [benchmarksPorDireccion, selectedDirecciones]);

  // Datos para scatter plot
  const datosScatter = useMemo(() => {
    return benchmarksPorDireccion.map((b, i) => ({
      x: b.promedioDesempeno,
      y: b.promedioPotencial,
      z: b.cantidad,
      name: b.direccion,
      color: COLORES_DIRECCIONES[i % COLORES_DIRECCIONES.length],
    }));
  }, [benchmarksPorDireccion]);

  // Ranking normalizado
  const rankingNormalizado = useMemo(() => {
    return benchmarksPorDireccion.map((b, i) => ({
      posicion: i + 1,
      direccion: b.direccion,
      desempeno: b.promedioDesempeno,
      potencial: b.promedioPotencial,
      percentil: b.percentilDesempeno,
      zScore: b.zScoreDesempeno,
      cantidad: b.cantidad,
      clasificacion: b.percentilDesempeno >= 75 ? "Alto rendimiento" :
                     b.percentilDesempeno >= 50 ? "Rendimiento medio" :
                     b.percentilDesempeno >= 25 ? "Bajo rendimiento" : "Requiere atención",
    }));
  }, [benchmarksPorDireccion]);

  // Toggle dirección
  const toggleDireccion = (direccion: string) => {
    setSelectedDirecciones((prev) =>
      prev.includes(direccion)
        ? prev.filter((d) => d !== direccion)
        : [...prev, direccion]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando análisis de benchmarking...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div>
          <Link
            to="/analisis"
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a dashboards
          </Link>
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Benchmarking Interno</h1>
              <p className="text-muted-foreground">
                {periodoNombre} - Comparativa normalizada de desempeño entre direcciones
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas globales */}
      {estadisticasGlobales && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Promedio Organizacional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {estadisticasGlobales.promedioDesempeno.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Desviación: ±{estadisticasGlobales.desviacionDesempeno.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Award className="h-4 w-4 text-green-600" />
                Mejor Dirección
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-green-600 truncate" title={estadisticasGlobales.mejorDireccion}>
                {estadisticasGlobales.mejorDireccion}
              </div>
              <p className="text-xs text-muted-foreground">
                {benchmarksPorDireccion[0]?.promedioDesempeno.toFixed(1)}% promedio
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Requiere Atención
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-orange-500 truncate" title={estadisticasGlobales.peorDireccion}>
                {estadisticasGlobales.peorDireccion}
              </div>
              <p className="text-xs text-muted-foreground">
                {benchmarksPorDireccion[benchmarksPorDireccion.length - 1]?.promedioDesempeno.toFixed(1)}% promedio
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Brecha Max-Min
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(
                  (benchmarksPorDireccion[0]?.promedioDesempeno || 0) -
                  (benchmarksPorDireccion[benchmarksPorDireccion.length - 1]?.promedioDesempeno || 0)
                ).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Diferencia entre extremos
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtro de direcciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seleccionar Direcciones a Comparar</CardTitle>
          <CardDescription>
            Click para incluir/excluir direcciones del análisis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {benchmarksPorDireccion.map((b, i) => (
              <button
                key={b.direccion}
                onClick={() => toggleDireccion(b.direccion)}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  selectedDirecciones.includes(b.direccion)
                    ? "text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                style={{
                  backgroundColor: selectedDirecciones.includes(b.direccion)
                    ? COLORES_DIRECCIONES[i % COLORES_DIRECCIONES.length]
                    : undefined,
                }}
              >
                {b.direccion} ({b.cantidad})
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de barras comparativo */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Comparativa de Desempeño por Dirección</CardTitle>
            <CardDescription>
              Promedio de desempeño y potencial por cada dirección
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosBarras} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="direccion" type="category" width={150} tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border rounded shadow-lg">
                            <p className="font-medium">{data.direccionCompleta}</p>
                            <p className="text-sm">Colaboradores: {data.cantidad}</p>
                            <p className="text-sm text-blue-600">Desempeño: {data.desempeno}%</p>
                            <p className="text-sm text-green-600">Potencial: {data.potencial}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="desempeno" name="Desempeño" fill="#8884d8" />
                  <Bar dataKey="potencial" name="Potencial" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Scatter plot - Desempeño vs Potencial */}
        <Card>
          <CardHeader>
            <CardTitle>Posicionamiento de Direcciones</CardTitle>
            <CardDescription>
              Relación entre desempeño promedio y potencial (tamaño = cantidad de colaboradores)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid />
                  <XAxis type="number" dataKey="x" name="Desempeño" unit="%" domain={[0, 100]} />
                  <YAxis type="number" dataKey="y" name="Potencial" unit="%" domain={[0, 100]} />
                  <ZAxis type="number" dataKey="z" range={[100, 1000]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border rounded shadow-lg">
                            <p className="font-medium">{data.name}</p>
                            <p className="text-sm">Desempeño: {data.x.toFixed(1)}%</p>
                            <p className="text-sm">Potencial: {data.y.toFixed(1)}%</p>
                            <p className="text-sm">Colaboradores: {data.z}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    x={estadisticasGlobales?.promedioDesempeno}
                    stroke="#666"
                    strokeDasharray="5 5"
                    label={{ value: "Prom", position: "top" }}
                  />
                  <ReferenceLine
                    y={estadisticasGlobales?.promedioPotencial}
                    stroke="#666"
                    strokeDasharray="5 5"
                  />
                  <Scatter data={datosScatter}>
                    {datosScatter.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Radar chart - Dimensiones */}
        <Card>
          <CardHeader>
            <CardTitle>Comparativa por Dimensiones</CardTitle>
            <CardDescription>
              Perfil de dimensiones de las primeras 5 direcciones seleccionadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              {datosDimensiones.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={datosDimensiones}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis domain={[0, 100]} />
                    {benchmarksPorDireccion
                      .filter((b) => selectedDirecciones.includes(b.direccion))
                      .slice(0, 5)
                      .map((b, i) => (
                        <Radar
                          key={b.direccion}
                          name={b.direccion}
                          dataKey={b.direccion}
                          stroke={COLORES_DIRECCIONES[i % COLORES_DIRECCIONES.length]}
                          fill={COLORES_DIRECCIONES[i % COLORES_DIRECCIONES.length]}
                          fillOpacity={0.1}
                        />
                      ))}
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No hay datos de dimensiones disponibles
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de ranking */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking Normalizado de Direcciones</CardTitle>
          <CardDescription>
            Clasificación basada en percentiles y z-scores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="p-2 text-left border">Pos.</th>
                  <th className="p-2 text-left border">Dirección</th>
                  <th className="p-2 text-center border">Colaboradores</th>
                  <th className="p-2 text-center border">Desempeño</th>
                  <th className="p-2 text-center border">Potencial</th>
                  <th className="p-2 text-center border">Percentil</th>
                  <th className="p-2 text-center border">Z-Score</th>
                  <th className="p-2 text-center border">Clasificación</th>
                </tr>
              </thead>
              <tbody>
                {rankingNormalizado.map((r, i) => (
                  <tr key={r.direccion} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="p-2 border font-medium">{r.posicion}</td>
                    <td className="p-2 border">{r.direccion}</td>
                    <td className="p-2 text-center border">{r.cantidad}</td>
                    <td className="p-2 text-center border">{r.desempeno.toFixed(1)}%</td>
                    <td className="p-2 text-center border">{r.potencial.toFixed(1)}%</td>
                    <td className="p-2 text-center border">
                      <span className={`px-2 py-1 rounded text-xs ${
                        r.percentil >= 75 ? "bg-green-100 text-green-800" :
                        r.percentil >= 50 ? "bg-blue-100 text-blue-800" :
                        r.percentil >= 25 ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        P{r.percentil.toFixed(0)}
                      </span>
                    </td>
                    <td className="p-2 text-center border">
                      <span className={r.zScore >= 0 ? "text-green-600" : "text-red-600"}>
                        {r.zScore >= 0 ? "+" : ""}{r.zScore.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-2 text-center border">
                      <span className={`px-2 py-1 rounded text-xs ${
                        r.clasificacion === "Alto rendimiento" ? "bg-green-100 text-green-800" :
                        r.clasificacion === "Rendimiento medio" ? "bg-blue-100 text-blue-800" :
                        r.clasificacion === "Bajo rendimiento" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {r.clasificacion}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Insights y recomendaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Insights del Benchmarking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {benchmarksPorDireccion.length > 0 && (
            <>
              <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">
                <h4 className="font-medium text-green-800">Direcciones Destacadas (Percentil ≥ 75)</h4>
                <p className="text-sm text-green-700 mt-1">
                  {rankingNormalizado
                    .filter((r) => r.percentil >= 75)
                    .map((r) => r.direccion)
                    .join(", ") || "No hay direcciones en este rango"}
                </p>
                <p className="text-xs text-green-600 mt-2">
                  Recomendación: Identificar y documentar las mejores prácticas de estas direcciones para replicarlas.
                </p>
              </div>

              <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <h4 className="font-medium text-blue-800">Direcciones Promedio (Percentil 25-75)</h4>
                <p className="text-sm text-blue-700 mt-1">
                  {rankingNormalizado
                    .filter((r) => r.percentil >= 25 && r.percentil < 75)
                    .map((r) => r.direccion)
                    .join(", ") || "No hay direcciones en este rango"}
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  Recomendación: Analizar dimensiones específicas con mayor potencial de mejora.
                </p>
              </div>

              <div className="p-4 bg-orange-50 border-l-4 border-orange-500 rounded">
                <h4 className="font-medium text-orange-800">Direcciones que Requieren Atención (Percentil &lt; 25)</h4>
                <p className="text-sm text-orange-700 mt-1">
                  {rankingNormalizado
                    .filter((r) => r.percentil < 25)
                    .map((r) => r.direccion)
                    .join(", ") || "No hay direcciones en este rango"}
                </p>
                <p className="text-xs text-orange-600 mt-2">
                  Recomendación: Realizar diagnóstico profundo y establecer planes de mejora prioritarios.
                </p>
              </div>

              <div className="p-4 bg-purple-50 border-l-4 border-purple-500 rounded">
                <h4 className="font-medium text-purple-800">Homogeneidad Organizacional</h4>
                <p className="text-sm text-purple-700 mt-1">
                  Desviación estándar entre direcciones: {
                    Math.sqrt(
                      benchmarksPorDireccion.reduce(
                        (sum, b) => sum + Math.pow(b.promedioDesempeno - (estadisticasGlobales?.promedioDesempeno || 0), 2),
                        0
                      ) / benchmarksPorDireccion.length
                    ).toFixed(2)
                  }%
                </p>
                <p className="text-xs text-purple-600 mt-2">
                  {(Math.sqrt(
                    benchmarksPorDireccion.reduce(
                      (sum, b) => sum + Math.pow(b.promedioDesempeno - (estadisticasGlobales?.promedioDesempeno || 0), 2),
                      0
                    ) / benchmarksPorDireccion.length
                  )) < 5
                    ? "La organización muestra alta homogeneidad en el desempeño entre direcciones."
                    : "Existe variabilidad significativa entre direcciones, lo que sugiere oportunidades de aprendizaje cruzado."}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
