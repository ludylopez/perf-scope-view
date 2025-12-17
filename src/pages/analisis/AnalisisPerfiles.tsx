import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Users,
  Target,
  Layers,
  Sparkles,
} from "lucide-react";
import { StatCard, StatCardGrid, InterpretationCard } from "@/components/charts";
import { kMeansClustering, mean, standardDeviation } from "@/lib/advancedStatistics";
import type { InterpretacionStats } from "@/types/analisis";
import {
  ScatterChart,
  Scatter,
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
  BarChart,
  Bar,
} from "recharts";

interface ColaboradorPerfil {
  id: string;
  nombre: string;
  nivel: string;
  direccion: string;
  desempeno: number;
  potencial: number;
  brecha: number; // diferencia auto-jefe
  clusterId?: number;
}

interface ClusterInfo {
  id: number;
  nombre: string;
  descripcion: string;
  color: string;
  centroide: {
    desempeno: number;
    potencial: number;
    brecha: number;
  };
  miembros: ColaboradorPerfil[];
  recomendaciones: string[];
}

const CLUSTER_COLORS = ["#8b5cf6", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#ec4899"];

const CLUSTER_NAMES: Record<number, { nombre: string; descripcion: string }> = {
  0: {
    nombre: "Alto Potencial Equilibrado",
    descripcion: "Desempeño y potencial altos con buena autopercepción",
  },
  1: {
    nombre: "Sólido y Consistente",
    descripcion: "Desempeño estable con percepción equilibrada",
  },
  2: {
    nombre: "Emergente con Oportunidades",
    descripcion: "Potencial de crecimiento identificado",
  },
  3: {
    nombre: "Requiere Desarrollo",
    descripcion: "Necesita apoyo focalizado para mejorar",
  },
  4: {
    nombre: "Autopercepción Alta",
    descripcion: "Se autoevalúa por encima de la evaluación del jefe",
  },
  5: {
    nombre: "Perfil Atípico",
    descripcion: "Características únicas que requieren análisis individual",
  },
};

export default function AnalisisPerfiles() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [colaboradores, setColaboradores] = useState<ColaboradorPerfil[]>([]);
  const [numClusters, setNumClusters] = useState(4);
  const [clusters, setClusters] = useState<ClusterInfo[]>([]);

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

      const colabData: ColaboradorPerfil[] = results
        .map(r => {
          const user = users.find(u => u.dpi === r.colaborador_id);
          if (!r.desempeno_porcentaje) return null;

          const desempeno = r.desempeno_porcentaje;
          const potencial = r.potencial_porcentaje || desempeno * 0.9;
          // Brecha no disponible sin datos de auto/jefe individuales
          const brecha = 0;

          return {
            id: r.colaborador_id,
            nombre: user?.nombre || "Sin nombre",
            nivel: user?.nivel || "Sin nivel",
            direccion: user?.direccion_unidad || "Sin dirección",
            desempeno,
            potencial,
            brecha,
          };
        })
        .filter((c): c is ColaboradorPerfil => c !== null);

      setColaboradores(colabData);
    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("Error al cargar el análisis de perfiles");
    } finally {
      setLoading(false);
    }
  };

  // Ejecutar clustering cuando cambie numClusters o colaboradores
  const clusteringResult = useMemo(() => {
    if (colaboradores.length < numClusters) return null;

    const result = kMeansClustering(
      colaboradores,
      numClusters,
      [
        (c) => c.desempeno,
        (c) => c.potencial,
        (c) => c.brecha + 50, // Normalizar brecha a positivo
      ],
      100
    );

    // Asignar cluster a cada colaborador
    const colabsConCluster = colaboradores.map((c) => {
      const cluster = result.clusters.find((cl) =>
        cl.members.some((m) => m.id === c.id)
      );
      return { ...c, clusterId: cluster?.clusterId ?? 0 };
    });

    // Construir info de clusters
    const clustersInfo: ClusterInfo[] = result.clusters.map((cl, idx) => {
      const miembrosDesempeno = cl.members.map((m) => (m as ColaboradorPerfil).desempeno);
      const miembrosPotencial = cl.members.map((m) => (m as ColaboradorPerfil).potencial);
      const miembrosBrecha = cl.members.map((m) => (m as ColaboradorPerfil).brecha);

      const avgDesempeno = mean(miembrosDesempeno);
      const avgPotencial = mean(miembrosPotencial);
      const avgBrecha = mean(miembrosBrecha);

      // Determinar nombre basado en características
      let nombreIdx = idx;
      if (avgDesempeno >= 75 && avgPotencial >= 70) nombreIdx = 0;
      else if (avgDesempeno >= 65 && Math.abs(avgBrecha) < 5) nombreIdx = 1;
      else if (avgPotencial > avgDesempeno + 5) nombreIdx = 2;
      else if (avgDesempeno < 60) nombreIdx = 3;
      else if (avgBrecha > 10) nombreIdx = 4;
      else nombreIdx = Math.min(idx, 5);

      const clusterMeta = CLUSTER_NAMES[nombreIdx] || CLUSTER_NAMES[5];

      // Recomendaciones basadas en el perfil
      const recomendaciones: string[] = [];
      if (avgDesempeno >= 75) {
        recomendaciones.push("Considerar para roles de mayor responsabilidad");
        recomendaciones.push("Incluir en programas de mentoring como mentores");
      }
      if (avgPotencial > avgDesempeno + 10) {
        recomendaciones.push("Asignar proyectos retadores para desarrollar potencial");
      }
      if (avgBrecha > 10) {
        recomendaciones.push("Trabajar en calibración de expectativas");
        recomendaciones.push("Sesiones de feedback más frecuentes");
      }
      if (avgDesempeno < 60) {
        recomendaciones.push("Plan de desarrollo individualizado urgente");
        recomendaciones.push("Evaluar ajuste persona-puesto");
      }
      if (recomendaciones.length === 0) {
        recomendaciones.push("Mantener seguimiento regular de desempeño");
      }

      return {
        id: cl.clusterId,
        nombre: clusterMeta.nombre,
        descripcion: clusterMeta.descripcion,
        color: CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
        centroide: {
          desempeno: avgDesempeno,
          potencial: avgPotencial,
          brecha: avgBrecha,
        },
        miembros: cl.members.map((m) => ({
          ...(m as ColaboradorPerfil),
          clusterId: cl.clusterId,
        })),
        recomendaciones,
      };
    });

    return { clusters: clustersInfo, colaboradores: colabsConCluster };
  }, [colaboradores, numClusters]);

  useEffect(() => {
    if (clusteringResult) {
      setClusters(clusteringResult.clusters);
    }
  }, [clusteringResult]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando análisis de perfiles...</span>
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

  // Datos para scatter plot
  const scatterData =
    clusteringResult?.colaboradores.map((c) => ({
      x: c.desempeno,
      y: c.potencial,
      nombre: c.nombre,
      nivel: c.nivel,
      brecha: c.brecha,
      clusterId: c.clusterId,
      color: CLUSTER_COLORS[c.clusterId ?? 0],
    })) || [];

  // Datos para radar de centroides
  const radarData = [
    {
      dimension: "Desempeño",
      ...Object.fromEntries(clusters.map((c) => [c.nombre, c.centroide.desempeno])),
    },
    {
      dimension: "Potencial",
      ...Object.fromEntries(clusters.map((c) => [c.nombre, c.centroide.potencial])),
    },
    {
      dimension: "Equilibrio",
      ...Object.fromEntries(clusters.map((c) => [c.nombre, 50 + c.centroide.brecha])),
    },
  ];

  // Distribución por cluster
  const distribucionData = clusters.map((c) => ({
    nombre: c.nombre.split(" ").slice(0, 2).join(" "),
    cantidad: c.miembros.length,
    porcentaje: ((c.miembros.length / colaboradores.length) * 100).toFixed(1),
    color: c.color,
  }));

  const interpretacion: InterpretacionStats = {
    titulo: "Segmentación de Colaboradores",
    descripcion: `Se identificaron ${clusters.length} perfiles distintivos usando análisis de clustering en ${colaboradores.length} colaboradores.`,
    hallazgos: clusters.map(
      (c) =>
        `${c.nombre}: ${c.miembros.length} personas (${(
          (c.miembros.length / colaboradores.length) *
          100
        ).toFixed(0)}%)`
    ),
    recomendaciones: [
      "Diseñar estrategias de desarrollo diferenciadas por perfil",
      "Priorizar intervenciones en perfiles que requieren desarrollo",
      "Aprovechar perfiles de alto potencial como agentes de cambio",
    ],
    nivel: "neutral",
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
            <h1 className="text-3xl font-bold">Perfiles de Colaboradores</h1>
            <p className="text-muted-foreground">{periodoNombre}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Número de perfiles:</span>
            <div className="flex gap-1">
              {[3, 4, 5, 6].map((n) => (
                <Button
                  key={n}
                  variant={numClusters === n ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNumClusters(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <StatCardGrid columns={4}>
          <StatCard
            title="Colaboradores Analizados"
            value={colaboradores.length}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            title="Perfiles Identificados"
            value={clusters.length}
            icon={<Layers className="h-5 w-5" />}
          />
          <StatCard
            title="Perfil Más Grande"
            value={clusters[0]?.miembros.length || 0}
            subtitle={clusters[0]?.nombre || ""}
            icon={<Target className="h-5 w-5" />}
          />
          <StatCard
            title="Alto Potencial"
            value={clusters.filter((c) => c.centroide.desempeno >= 70).reduce((s, c) => s + c.miembros.length, 0)}
            subtitle="Desempeño ≥70%"
            icon={<Sparkles className="h-5 w-5" />}
            color="green"
          />
        </StatCardGrid>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Mapa de Perfiles: Desempeño vs Potencial</CardTitle>
              <CardDescription>
                Cada punto representa un colaborador, coloreado según su perfil asignado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Desempeño"
                    domain={[30, 100]}
                    label={{ value: "Desempeño %", position: "bottom" }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Potencial"
                    domain={[30, 100]}
                    label={{ value: "Potencial %", angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip
                    content={({ payload }) => {
                      if (payload && payload.length > 0) {
                        const data = payload[0].payload;
                        const cluster = clusters.find((c) => c.id === data.clusterId);
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold">{data.nombre}</p>
                            <p className="text-sm text-muted-foreground">{data.nivel}</p>
                            <p className="text-sm font-mono">
                              Desempeño: {data.x.toFixed(1)}% | Potencial: {data.y.toFixed(1)}%
                            </p>
                            <p className="text-sm">Brecha percepción: {data.brecha.toFixed(1)}</p>
                            <Badge
                              className="mt-1"
                              style={{ backgroundColor: cluster?.color }}
                            >
                              {cluster?.nombre}
                            </Badge>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter name="Colaboradores" data={scatterData}>
                    {scatterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribución por Perfil</CardTitle>
              <CardDescription>Cantidad de colaboradores en cada segmento</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={distribucionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="nombre" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ payload }) => {
                      if (payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold">{data.nombre}</p>
                            <p className="text-sm">
                              {data.cantidad} colaboradores ({data.porcentaje}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="cantidad">
                    {distribucionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <InterpretationCard data={interpretacion} />

        <Tabs defaultValue={clusters[0]?.id.toString()} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {clusters.map((cluster) => (
              <TabsTrigger
                key={cluster.id}
                value={cluster.id.toString()}
                className="flex items-center gap-2"
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cluster.color }}
                />
                {cluster.nombre.split(" ").slice(0, 2).join(" ")} ({cluster.miembros.length})
              </TabsTrigger>
            ))}
          </TabsList>

          {clusters.map((cluster) => (
            <TabsContent key={cluster.id} value={cluster.id.toString()}>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: cluster.color }}
                    />
                    <div>
                      <CardTitle>{cluster.nombre}</CardTitle>
                      <CardDescription>{cluster.descripcion}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Desempeño Promedio</p>
                      <p className="text-2xl font-bold font-mono">
                        {cluster.centroide.desempeno.toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Potencial Promedio</p>
                      <p className="text-2xl font-bold font-mono">
                        {cluster.centroide.potencial.toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Brecha Percepción</p>
                      <p
                        className={`text-2xl font-bold font-mono ${
                          cluster.centroide.brecha > 5
                            ? "text-amber-600"
                            : cluster.centroide.brecha < -5
                            ? "text-blue-600"
                            : "text-green-600"
                        }`}
                      >
                        {cluster.centroide.brecha > 0 ? "+" : ""}
                        {cluster.centroide.brecha.toFixed(1)}
                      </p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-medium mb-2">Recomendaciones para este perfil:</h4>
                    <ul className="space-y-1">
                      {cluster.recomendaciones.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span
                            className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                            style={{ backgroundColor: cluster.color }}
                          />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">Colaborador</th>
                          <th className="text-left py-2 px-2">Nivel</th>
                          <th className="text-left py-2 px-2">Dirección</th>
                          <th className="text-right py-2 px-2">Desempeño</th>
                          <th className="text-right py-2 px-2">Potencial</th>
                          <th className="text-right py-2 px-2">Brecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cluster.miembros
                          .sort((a, b) => b.desempeno - a.desempeno)
                          .slice(0, 20)
                          .map((m) => (
                            <tr key={m.id} className="border-b hover:bg-muted/50">
                              <td className="py-2 px-2">{m.nombre}</td>
                              <td className="py-2 px-2 text-muted-foreground">{m.nivel}</td>
                              <td className="py-2 px-2 text-muted-foreground text-xs">
                                {m.direccion}
                              </td>
                              <td className="py-2 px-2 text-right font-mono">
                                {m.desempeno.toFixed(1)}%
                              </td>
                              <td className="py-2 px-2 text-right font-mono">
                                {m.potencial.toFixed(1)}%
                              </td>
                              <td
                                className={`py-2 px-2 text-right font-mono ${
                                  m.brecha > 5
                                    ? "text-amber-600"
                                    : m.brecha < -5
                                    ? "text-blue-600"
                                    : ""
                                }`}
                              >
                                {m.brecha > 0 ? "+" : ""}
                                {m.brecha.toFixed(1)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {cluster.miembros.length > 20 && (
                      <p className="text-sm text-muted-foreground mt-2 text-center">
                        Mostrando 20 de {cluster.miembros.length} colaboradores
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Layers className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-800 dark:text-purple-400">
                  Metodología de Segmentación
                </h3>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  Se utiliza el algoritmo K-Means++ para agrupar colaboradores basándose en tres
                  dimensiones: desempeño final, potencial evaluado, y brecha de percepción
                  (auto-jefe). Los perfiles resultantes ayudan a diseñar intervenciones de
                  desarrollo diferenciadas y más efectivas para cada segmento.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
