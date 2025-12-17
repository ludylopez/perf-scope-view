import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck,
  Beaker,
} from "lucide-react";
import { StatCard, StatCardGrid, InterpretationCard } from "@/components/charts";
import { cronbachAlpha, cronbachAlphaIfItemDeleted, mean } from "@/lib/advancedStatistics";
import type { InterpretacionStats } from "@/types/analisis";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ReferenceLine,
} from "recharts";

interface DimensionConsistencia {
  id: string;
  nombre: string;
  nivel: string;
  alpha: number;
  reliability: string;
  itemCount: number;
  sampleSize: number;
  itemsAnalysis: Array<{
    itemIndex: number;
    itemId: string;
    itemTexto: string;
    alphaIfDeleted: number;
    changeFromTotal: number;
    recommendation: "mantener" | "revisar" | "eliminar";
  }>;
}

const RELIABILITY_COLORS: Record<string, string> = {
  excelente: "#22c55e",
  buena: "#84cc16",
  aceptable: "#eab308",
  cuestionable: "#f97316",
  pobre: "#ef4444",
  inaceptable: "#dc2626",
};

const RELIABILITY_ICONS: Record<string, React.ReactNode> = {
  excelente: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  buena: <CheckCircle2 className="h-4 w-4 text-lime-600" />,
  aceptable: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
  cuestionable: <AlertTriangle className="h-4 w-4 text-orange-600" />,
  pobre: <XCircle className="h-4 w-4 text-red-600" />,
  inaceptable: <XCircle className="h-4 w-4 text-red-700" />,
};

export default function AnalisisConsistencia() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [dimensiones, setDimensiones] = useState<DimensionConsistencia[]>([]);
  const [alphaGlobal, setAlphaGlobal] = useState<number | null>(null);

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

      // Cargar configuraciones de instrumentos
      const { data: instruments } = await supabase
        .from("instrument_configs")
        .select("id, nivel, dimensiones_desempeno")
        .eq("activo", true);

      if (!instruments || instruments.length === 0) {
        setError("No hay instrumentos configurados");
        return;
      }

      // Cargar todas las evaluaciones con respuestas
      const { data: evaluations } = await supabase
        .from("evaluations")
        .select("id, responses, colaborador_id")
        .eq("periodo_id", periodo.id)
        .eq("estado", "enviado")
        .eq("tipo", "jefe"); // Usamos evaluaciones de jefe para consistencia

      if (!evaluations || evaluations.length < 10) {
        setError("Se requieren al menos 10 evaluaciones para calcular consistencia interna");
        return;
      }

      const dimensionesData: DimensionConsistencia[] = [];

      // Procesar cada instrumento/nivel
      for (const inst of instruments) {
        const dims = inst.dimensiones_desempeno as Array<{
          id: string;
          nombre: string;
          items: Array<{ id: string; texto: string }>;
        }> | null;

        if (!dims || !Array.isArray(dims)) continue;

        // Procesar cada dimensión
        for (const dim of dims) {
          if (!dim.items || dim.items.length < 2) continue;

          // Construir matriz de respuestas por ítem
          const itemScores: number[][] = [];
          const itemIds = dim.items.map((i) => i.id);

          // Inicializar arrays para cada ítem
          for (let i = 0; i < dim.items.length; i++) {
            itemScores.push([]);
          }

          // Recoger respuestas de todas las evaluaciones
          for (const ev of evaluations) {
            const responses = ev.responses as Record<string, number> | null;
            if (!responses) continue;

            // Verificar que tiene respuestas para todos los ítems de esta dimensión
            const itemResponses = itemIds.map((id) => responses[id]);
            if (itemResponses.some((r) => r === undefined || r === null)) continue;

            // Agregar las respuestas
            for (let i = 0; i < itemIds.length; i++) {
              itemScores[i].push(responses[itemIds[i]]);
            }
          }

          // Calcular Alpha solo si hay suficientes datos
          if (itemScores[0].length >= 10) {
            const alphaResult = cronbachAlpha(itemScores);
            const itemAnalysis = cronbachAlphaIfItemDeleted(itemScores);

            dimensionesData.push({
              id: dim.id,
              nombre: dim.nombre,
              nivel: inst.nivel as string || inst.id,
              alpha: alphaResult.alpha,
              reliability: alphaResult.reliability,
              itemCount: alphaResult.itemCount,
              sampleSize: alphaResult.sampleSize,
              itemsAnalysis: itemAnalysis.map((ia, idx) => ({
                itemIndex: ia.itemIndex,
                itemId: itemIds[idx],
                itemTexto: dim.items[idx]?.texto || `Ítem ${idx + 1}`,
                alphaIfDeleted: ia.alphaIfDeleted,
                changeFromTotal: ia.changeFromTotal,
                recommendation: ia.recommendation,
              })),
            });
          }
        }
      }

      // Ordenar por alpha descendente
      dimensionesData.sort((a, b) => b.alpha - a.alpha);
      setDimensiones(dimensionesData);

      // Calcular alpha global promedio
      if (dimensionesData.length > 0) {
        setAlphaGlobal(mean(dimensionesData.map((d) => d.alpha)));
      }
    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("Error al calcular la consistencia interna");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Calculando consistencia interna...</span>
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

  // Estadísticas por nivel de confiabilidad
  const porReliability = {
    excelente: dimensiones.filter((d) => d.reliability === "excelente"),
    buena: dimensiones.filter((d) => d.reliability === "buena"),
    aceptable: dimensiones.filter((d) => d.reliability === "aceptable"),
    cuestionable: dimensiones.filter((d) => d.reliability === "cuestionable"),
    pobre: dimensiones.filter((d) => d.reliability === "pobre"),
    inaceptable: dimensiones.filter((d) => d.reliability === "inaceptable"),
  };

  // Ítems problemáticos
  const itemsProblematicos = dimensiones.flatMap((d) =>
    d.itemsAnalysis
      .filter((i) => i.recommendation !== "mantener")
      .map((i) => ({
        dimension: d.nombre,
        nivel: d.nivel,
        ...i,
      }))
  );

  // Datos para gráficos
  const barData = dimensiones.slice(0, 15).map((d) => ({
    nombre: d.nombre.length > 25 ? d.nombre.substring(0, 22) + "..." : d.nombre,
    alpha: d.alpha,
    color: RELIABILITY_COLORS[d.reliability],
    nivel: d.nivel,
    reliability: d.reliability,
  }));

  const interpretacion: InterpretacionStats = {
    titulo: "Validación del Instrumento",
    descripcion: `Se evaluó la consistencia interna de ${dimensiones.length} dimensiones usando Alpha de Cronbach.`,
    hallazgos: [
      `Alpha promedio global: ${alphaGlobal?.toFixed(3) || "N/A"}`,
      `${porReliability.excelente.length + porReliability.buena.length} dimensiones con confiabilidad buena o excelente`,
      `${porReliability.aceptable.length} dimensiones con confiabilidad aceptable`,
      `${porReliability.cuestionable.length + porReliability.pobre.length + porReliability.inaceptable.length} dimensiones que requieren revisión`,
      itemsProblematicos.length > 0
        ? `${itemsProblematicos.length} ítems identificados para revisión`
        : "",
    ].filter(Boolean),
    recomendaciones:
      itemsProblematicos.length > 0
        ? [
            "Revisar la redacción de ítems problemáticos",
            "Considerar eliminar o reformular ítems que reducen la consistencia",
            "Validar con expertos en el dominio",
          ]
        : ["El instrumento muestra buena consistencia interna"],
    nivel:
      alphaGlobal && alphaGlobal >= 0.7
        ? "positivo"
        : alphaGlobal && alphaGlobal >= 0.6
        ? "atencion"
        : "critico",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              to="/analisis"
              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a dashboards
            </Link>
            <h1 className="text-3xl font-bold">Consistencia Interna</h1>
            <p className="text-muted-foreground">{periodoNombre}</p>
          </div>
        </div>

        <StatCardGrid columns={4}>
          <StatCard
            title="Alpha Promedio Global"
            value={alphaGlobal?.toFixed(3) || "N/A"}
            icon={<Beaker className="h-5 w-5" />}
            color={
              alphaGlobal && alphaGlobal >= 0.8
                ? "green"
                : alphaGlobal && alphaGlobal >= 0.7
                ? "amber"
                : "red"
            }
          />
          <StatCard
            title="Dimensiones Analizadas"
            value={dimensiones.length}
            icon={<FileCheck className="h-5 w-5" />}
          />
          <StatCard
            title="Confiabilidad Alta"
            value={porReliability.excelente.length + porReliability.buena.length}
            subtitle="α ≥ 0.80"
            icon={<CheckCircle2 className="h-5 w-5" />}
            color="green"
          />
          <StatCard
            title="Requieren Revisión"
            value={
              porReliability.cuestionable.length +
              porReliability.pobre.length +
              porReliability.inaceptable.length
            }
            subtitle="α < 0.70"
            icon={<AlertTriangle className="h-5 w-5" />}
            color="red"
          />
        </StatCardGrid>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Alpha de Cronbach por Dimensión</CardTitle>
              <CardDescription>
                Top 15 dimensiones ordenadas por consistencia interna
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 1]} tickFormatter={(v) => v.toFixed(1)} />
                  <YAxis
                    dataKey="nombre"
                    type="category"
                    width={150}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    content={({ payload }) => {
                      if (payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold">{data.nombre}</p>
                            <p className="text-sm text-muted-foreground">Nivel: {data.nivel}</p>
                            <p className="text-sm font-mono">α = {data.alpha.toFixed(4)}</p>
                            <Badge
                              className="mt-1"
                              style={{ backgroundColor: data.color }}
                            >
                              {data.reliability}
                            </Badge>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine x={0.7} stroke="#f59e0b" strokeDasharray="5 5" />
                  <ReferenceLine x={0.8} stroke="#22c55e" strokeDasharray="5 5" />
                  <Bar dataKey="alpha">
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-amber-500" /> α = 0.70 (Mínimo aceptable)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-green-500" /> α = 0.80 (Buena)
                </span>
              </div>
            </CardContent>
          </Card>

          <InterpretationCard data={interpretacion} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumen por Nivel de Confiabilidad</CardTitle>
            <CardDescription>
              Clasificación de dimensiones según su Alpha de Cronbach
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(porReliability).map(([nivel, dims]) => (
                <div
                  key={nivel}
                  className="p-4 rounded-lg border"
                  style={{ borderColor: RELIABILITY_COLORS[nivel] + "50" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {RELIABILITY_ICONS[nivel]}
                    <span className="font-medium capitalize">{nivel}</span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: RELIABILITY_COLORS[nivel] }}>
                    {dims.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {nivel === "excelente" && "α ≥ 0.90"}
                    {nivel === "buena" && "0.80 ≤ α < 0.90"}
                    {nivel === "aceptable" && "0.70 ≤ α < 0.80"}
                    {nivel === "cuestionable" && "0.60 ≤ α < 0.70"}
                    {nivel === "pobre" && "0.50 ≤ α < 0.60"}
                    {nivel === "inaceptable" && "α < 0.50"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {itemsProblematicos.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                Ítems que Requieren Revisión ({itemsProblematicos.length})
              </CardTitle>
              <CardDescription>
                Ítems cuya eliminación mejoraría el Alpha de su dimensión
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Dimensión</th>
                      <th className="text-left py-2 px-2">Nivel</th>
                      <th className="text-left py-2 px-2">Ítem</th>
                      <th className="text-right py-2 px-2">α si se elimina</th>
                      <th className="text-right py-2 px-2">Cambio</th>
                      <th className="text-center py-2 px-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsProblematicos.slice(0, 20).map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-amber-100/50">
                        <td className="py-2 px-2">{item.dimension}</td>
                        <td className="py-2 px-2 text-muted-foreground">{item.nivel}</td>
                        <td className="py-2 px-2 text-xs max-w-xs truncate">
                          {item.itemTexto}
                        </td>
                        <td className="py-2 px-2 text-right font-mono">
                          {item.alphaIfDeleted.toFixed(4)}
                        </td>
                        <td
                          className={`py-2 px-2 text-right font-mono ${
                            item.changeFromTotal > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {item.changeFromTotal > 0 ? "+" : ""}
                          {item.changeFromTotal.toFixed(4)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Badge
                            variant={
                              item.recommendation === "eliminar"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {item.recommendation}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="todas" className="w-full">
          <TabsList>
            <TabsTrigger value="todas">Todas ({dimensiones.length})</TabsTrigger>
            <TabsTrigger value="alta" className="text-green-600">
              Alta ({porReliability.excelente.length + porReliability.buena.length})
            </TabsTrigger>
            <TabsTrigger value="media" className="text-amber-600">
              Media ({porReliability.aceptable.length + porReliability.cuestionable.length})
            </TabsTrigger>
            <TabsTrigger value="baja" className="text-red-600">
              Baja ({porReliability.pobre.length + porReliability.inaceptable.length})
            </TabsTrigger>
          </TabsList>

          {["todas", "alta", "media", "baja"].map((tab) => {
            const filteredDims =
              tab === "todas"
                ? dimensiones
                : tab === "alta"
                ? [...porReliability.excelente, ...porReliability.buena]
                : tab === "media"
                ? [...porReliability.aceptable, ...porReliability.cuestionable]
                : [...porReliability.pobre, ...porReliability.inaceptable];

            return (
              <TabsContent key={tab} value={tab}>
                <Card>
                  <CardContent className="pt-6">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2">Dimensión</th>
                            <th className="text-left py-2 px-2">Nivel</th>
                            <th className="text-right py-2 px-2">Alpha</th>
                            <th className="text-center py-2 px-2">Confiabilidad</th>
                            <th className="text-right py-2 px-2">Ítems</th>
                            <th className="text-right py-2 px-2">Muestra</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDims.map((d) => (
                            <tr key={d.id} className="border-b hover:bg-muted/50">
                              <td className="py-3 px-2">{d.nombre}</td>
                              <td className="py-3 px-2 text-muted-foreground">{d.nivel}</td>
                              <td className="py-3 px-2 text-right font-mono font-semibold">
                                {d.alpha.toFixed(4)}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <Badge
                                  style={{ backgroundColor: RELIABILITY_COLORS[d.reliability] }}
                                >
                                  {d.reliability}
                                </Badge>
                              </td>
                              <td className="py-3 px-2 text-right">{d.itemCount}</td>
                              <td className="py-3 px-2 text-right text-muted-foreground">
                                n={d.sampleSize}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>

        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Beaker className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-800 dark:text-blue-400">
                  Sobre el Alpha de Cronbach
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  El Alpha de Cronbach mide la consistencia interna de un conjunto de ítems,
                  es decir, qué tan relacionados están entre sí. Valores de 0.70+ son aceptables
                  para investigación, 0.80+ para propósitos diagnósticos. Un Alpha bajo puede
                  indicar que los ítems miden constructos diferentes o que algunos ítems están
                  mal redactados. El análisis "Alpha si se elimina el ítem" ayuda a identificar
                  ítems problemáticos cuya eliminación mejoraría la consistencia.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
