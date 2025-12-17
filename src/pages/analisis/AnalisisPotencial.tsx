import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ArrowLeft, Rocket, Star, TrendingUp, Users, Target, BarChart3, UserCheck, TrendingDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  StatCard,
  StatCardGrid,
  BoxPlotChart,
  StatsTable,
  TreemapChart,
  DireccionRankingChart,
  DesempenoPotencialScatter,
  CorrelationInterpretation,
} from "@/components/charts";
import { mean, standardDeviation, median as calcMedian, percentile, pearsonCorrelation, getCorrelationInterpretation } from "@/lib/advancedStatistics";
import type { BoxPlotData, TreemapNode, EstadisticasCompletas } from "@/types/analisis";

// Colores para 9-Box (soporta ambos formatos: guión y guión bajo)
const COLORES_9BOX: Record<string, { bg: string; text: string; label: string }> = {
  "alto_alto": { bg: "bg-green-500", text: "text-white", label: "Estrellas" },
  "alto-alto": { bg: "bg-green-500", text: "text-white", label: "Estrellas" },
  "alto_medio": { bg: "bg-green-400", text: "text-white", label: "Alto Potencial" },
  "alto-medio": { bg: "bg-green-400", text: "text-white", label: "Alto Potencial" },
  "alto_bajo": { bg: "bg-yellow-400", text: "text-gray-800", label: "Potencial Oculto" },
  "alto-bajo": { bg: "bg-yellow-400", text: "text-gray-800", label: "Potencial Oculto" },
  "medio_alto": { bg: "bg-blue-500", text: "text-white", label: "Alto Desempeño" },
  "medio-alto": { bg: "bg-blue-500", text: "text-white", label: "Alto Desempeño" },
  "medio_medio": { bg: "bg-blue-300", text: "text-gray-800", label: "Sólido" },
  "medio-medio": { bg: "bg-blue-300", text: "text-gray-800", label: "Sólido" },
  "medio_bajo": { bg: "bg-yellow-500", text: "text-white", label: "Inconsistente" },
  "medio-bajo": { bg: "bg-yellow-500", text: "text-white", label: "Inconsistente" },
  "bajo_alto": { bg: "bg-orange-400", text: "text-white", label: "Enigma" },
  "bajo-alto": { bg: "bg-orange-400", text: "text-white", label: "Enigma" },
  "bajo_medio": { bg: "bg-orange-500", text: "text-white", label: "En Desarrollo" },
  "bajo-medio": { bg: "bg-orange-500", text: "text-white", label: "En Desarrollo" },
  "bajo_bajo": { bg: "bg-red-500", text: "text-white", label: "Acción Requerida" },
  "bajo-bajo": { bg: "bg-red-500", text: "text-white", label: "Acción Requerida" },
};

interface ColaboradorPotencial {
  id: string;
  nombre: string;
  desempeno: number;
  potencial: number;
  posicion9Box: string;
  nivel: string;
  direccion: string;
  edad?: number;
  antiguedadMeses?: number;
  cargo?: string;
  npsScore?: number;
}

interface PotencialPorSegmento {
  segmento: string;
  cantidad: number;
  promedioPotencial: number;
  promedioDesempeno: number;
  stats: EstadisticasCompletas;
}

export default function AnalisisPotencial() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [colaboradores, setColaboradores] = useState<ColaboradorPotencial[]>([]);
  const [distribucion9Box, setDistribucion9Box] = useState<Record<string, number>>({});
  const [potencialPorNivel, setPotencialPorNivel] = useState<PotencialPorSegmento[]>([]);
  const [potencialPorDireccion, setPotencialPorDireccion] = useState<PotencialPorSegmento[]>([]);
  const [correlacion, setCorrelacion] = useState({ coeficiente: 0, interpretacion: getCorrelationInterpretation(0) });
  const [totalColaboradores, setTotalColaboradores] = useState(0);
  const [totalEsperado, setTotalEsperado] = useState(0); // Total esperado sin C1
  const [npsPorNivel, setNpsPorNivel] = useState<Array<{ nivel: string; promedio: number; cantidad: number; promoters: number; passives: number; detractors: number }>>([]);
  const [npsPorDireccion, setNpsPorDireccion] = useState<Array<{ direccion: string; promedio: number; cantidad: number; promoters: number; passives: number; detractors: number }>>([]);

  // Función auxiliar para calcular 9-Box si no está en la BD
  // Formato: desempeno-potencial (ej: "alto-alto", "medio-bajo")
  // Umbrales: Bajo < 60%, Medio 60-80%, Alto >= 80%
  const calcular9Box = (desempeno: number, potencial: number): string => {
    const nivelDesempeno = desempeno >= 80 ? "alto" : desempeno >= 60 ? "medio" : "bajo";
    const nivelPotencial = potencial >= 80 ? "alto" : potencial >= 60 ? "medio" : "bajo";
    return `${nivelDesempeno}-${nivelPotencial}`;
  };

  // Normalizar formato de 9-box (mantener formato con guión para consistencia con BD)
  // La BD usa "alto-alto" (con guión), así que normalizamos todo a ese formato
  const normalizar9Box = (posicion: string | null | undefined): string => {
    if (!posicion || typeof posicion !== 'string') return "sin-clasificar";
    // Normalizar: convertir guiones bajos a guiones (formato estándar de BD)
    const normalizado = posicion.trim().replace(/_/g, "-").toLowerCase();
    // Validar que sea un formato válido
    const formatosValidos = [
      "alto-alto", "alto-medio", "alto-bajo",
      "medio-alto", "medio-medio", "medio-bajo",
      "bajo-alto", "bajo-medio", "bajo-bajo"
    ];
    return formatosValidos.includes(normalizado) ? normalizado : "sin-clasificar";
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const periodo = await getActivePeriod();
      if (!periodo) {
        setError("No se encontró un período activo");
        return;
      }

      setPeriodoNombre(periodo.nombre);

      // Obtener total esperado de colaboradores (sin C1, sin admin)
      const { data: allUsers } = await supabase
        .from("users")
        .select("dpi, rol, nivel, estado")
        .eq("estado", "activo");
      
      // Filtrar en el cliente (más confiable que múltiples filtros en Supabase)
      const totalEsperado = allUsers?.filter(u => 
        u.rol !== 'admin_general' && 
        u.rol !== 'admin_rrhh' && 
        u.nivel !== 'C1'
      ).length || 0;
      
      setTotalEsperado(totalEsperado);

      // Obtener resultados consolidados con potencial
      const { data: results } = await supabase
        .from("final_evaluation_results_consolidated")
        .select("colaborador_id, desempeno_porcentaje_promedio, potencial_porcentaje_promedio, posicion_9box_moda")
        .eq("periodo_id", periodo.id)
        .not("potencial_porcentaje_promedio", "is", null);

      if (!results || results.length === 0) {
        setError("No hay datos de potencial disponibles");
        return;
      }

      const colaboradorIds = results.map(r => r.colaborador_id);

      // Obtener datos de usuarios (incluyendo rol para filtrar administrativos y datos demográficos)
      const { data: users } = await supabase
        .from("users")
        .select("dpi, nombre, nivel, direccion_unidad, rol, fecha_nacimiento, fecha_ingreso, cargo")
        .in("dpi", colaboradorIds);

      if (!users) return;

      // Filtrar usuarios administrativos de monitoreo Y miembros del Concejo (C1)
      // C1 no tiene evaluación de potencial (solo autoevaluación de desempeño)
      // A1 (Alcalde) SÍ tiene potencial y debe incluirse
      const validUsers = users.filter(u => 
        u.rol !== 'admin_general' && 
        u.rol !== 'admin_rrhh' &&
        u.nivel !== 'C1' // Excluir miembros del Concejo (no tienen potencial)
      );

      // Obtener NPS scores de autoevaluaciones
      // NOTA: El tipo en la BD es "auto", no "autoevaluacion"
      const { data: npsData } = await supabase
        .from("evaluations")
        .select("usuario_id, nps_score")
        .eq("periodo_id", periodo.id)
        .eq("tipo", "auto")
        .eq("estado", "enviado")
        .not("nps_score", "is", null)
        .in("usuario_id", colaboradorIds);

      // Crear mapa de NPS por colaborador
      const npsMap = new Map<string, number>();
      npsData?.forEach(e => {
        if (e.nps_score !== null && e.nps_score !== undefined) {
          npsMap.set(e.usuario_id, e.nps_score);
        }
      });

      // Procesar colaboradores con datos demográficos y NPS
      const colabs: ColaboradorPotencial[] = results
        .map(r => {
          const user = validUsers.find(u => u.dpi === r.colaborador_id);
          // Excluir usuarios administrativos y C1
          if (!user) return null;
          
          // Verificación adicional: excluir C1 explícitamente
          if (user.nivel === 'C1') return null;

          const desempeno = (r as any).desempeno_porcentaje_promedio ?? 0;
          const potencial = (r as any).potencial_porcentaje_promedio ?? 0;
          
          if (!desempeno || !potencial || desempeno <= 0 || potencial <= 0) return null;

          // Obtener posición 9-box de la BD o calcularla
          const posicion9BoxRaw = (r as any).posicion_9box_moda || calcular9Box(desempeno, potencial);
          // Normalizar formato (la BD usa guiones, el código usa guiones bajos)
          const posicion9Box = normalizar9Box(posicion9BoxRaw);

          // Calcular edad y antigüedad
          let edad: number | undefined;
          let antiguedadMeses: number | undefined;
          
          if (user.fecha_nacimiento) {
            const fechaNac = new Date(user.fecha_nacimiento);
            const hoy = new Date();
            edad = hoy.getFullYear() - fechaNac.getFullYear();
            const mesDiff = hoy.getMonth() - fechaNac.getMonth();
            if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < fechaNac.getDate())) {
              edad--;
            }
          }
          
          if (user.fecha_ingreso) {
            const fechaIngreso = new Date(user.fecha_ingreso);
            const hoy = new Date();
            antiguedadMeses = (hoy.getFullYear() - fechaIngreso.getFullYear()) * 12 + 
                            (hoy.getMonth() - fechaIngreso.getMonth());
            if (hoy.getDate() < fechaIngreso.getDate()) {
              antiguedadMeses--;
            }
          }

          return {
            id: r.colaborador_id,
            nombre: user.nombre || "Sin nombre",
            desempeno,
            potencial,
            posicion9Box,
            nivel: user.nivel || "Sin nivel",
            direccion: user.direccion_unidad || "Sin dirección",
            edad,
            antiguedadMeses,
            cargo: user.cargo || undefined,
            npsScore: npsMap.get(r.colaborador_id),
          };
        })
        .filter((c): c is ColaboradorPotencial => c !== null);

      setColaboradores(colabs);
      setTotalColaboradores(colabs.length);

      // Calcular distribución 9-Box (normalizar todas las claves)
      const dist9Box: Record<string, number> = {};
      colabs.forEach(c => {
        // Normalizar la clave antes de contar
        const claveNormalizada = normalizar9Box(c.posicion9Box);
        dist9Box[claveNormalizada] = (dist9Box[claveNormalizada] || 0) + 1;
      });
      
      // Log para depuración
      console.log("Distribución 9-Box calculada:", dist9Box);
      console.log("Total colaboradores:", colabs.length);
      console.log("Muestra de posiciones 9-Box:", colabs.slice(0, 5).map(c => ({ 
        id: c.id, 
        posicion: c.posicion9Box,
        desempeno: c.desempeno,
        potencial: c.potencial 
      })));
      
      setDistribucion9Box(dist9Box);

      // Calcular correlación desempeño-potencial
      if (colabs.length >= 2) {
        const desempenos = colabs.map(c => c.desempeno).filter(d => isFinite(d) && !isNaN(d));
        const potenciales = colabs.map(c => c.potencial).filter(p => isFinite(p) && !isNaN(p));
        
        if (desempenos.length >= 2 && potenciales.length >= 2 && desempenos.length === potenciales.length) {
          const corrCoef = pearsonCorrelation(desempenos, potenciales);
          // Validar que la correlación sea un número válido
          if (isFinite(corrCoef) && !isNaN(corrCoef)) {
            setCorrelacion({
              coeficiente: corrCoef,
              interpretacion: getCorrelationInterpretation(corrCoef),
            });
          } else {
            setCorrelacion({
              coeficiente: 0,
              interpretacion: getCorrelationInterpretation(0),
            });
          }
        } else {
          setCorrelacion({
            coeficiente: 0,
            interpretacion: getCorrelationInterpretation(0),
          });
        }
      } else {
        setCorrelacion({
          coeficiente: 0,
          interpretacion: getCorrelationInterpretation(0),
        });
      }

      // Función para calcular stats
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

      // Potencial por nivel
      const byNivel: Record<string, ColaboradorPotencial[]> = {};
      colabs.forEach(c => {
        if (!byNivel[c.nivel]) byNivel[c.nivel] = [];
        byNivel[c.nivel].push(c);
      });

      const nivelStats: PotencialPorSegmento[] = Object.entries(byNivel)
        .filter(([_, arr]) => arr.length >= 3)
        .map(([nivel, arr]) => ({
          segmento: nivel,
          cantidad: arr.length,
          promedioPotencial: mean(arr.map(c => c.potencial)),
          promedioDesempeno: mean(arr.map(c => c.desempeno)),
          stats: calcStats(arr.map(c => c.potencial)),
        }))
        .sort((a, b) => b.promedioPotencial - a.promedioPotencial);

      setPotencialPorNivel(nivelStats);

      // Potencial por dirección
      const byDir: Record<string, ColaboradorPotencial[]> = {};
      colabs.forEach(c => {
        if (!byDir[c.direccion]) byDir[c.direccion] = [];
        byDir[c.direccion].push(c);
      });

      const dirStats: PotencialPorSegmento[] = Object.entries(byDir)
        .filter(([_, arr]) => arr.length >= 3)
        .map(([dir, arr]) => ({
          segmento: dir,
          cantidad: arr.length,
          promedioPotencial: mean(arr.map(c => c.potencial)),
          promedioDesempeno: mean(arr.map(c => c.desempeno)),
          stats: calcStats(arr.map(c => c.potencial)),
        }))
        .sort((a, b) => b.promedioPotencial - a.promedioPotencial);

      setPotencialPorDireccion(dirStats);

      // Calcular NPS por nivel
      const npsByNivel: Record<string, { scores: number[]; colaboradores: ColaboradorPotencial[] }> = {};
      colabs.forEach(c => {
        if (c.npsScore !== undefined && c.npsScore !== null) {
          if (!npsByNivel[c.nivel]) {
            npsByNivel[c.nivel] = { scores: [], colaboradores: [] };
          }
          npsByNivel[c.nivel].scores.push(c.npsScore);
          npsByNivel[c.nivel].colaboradores.push(c);
        }
      });

      const npsNivelStats = Object.entries(npsByNivel).map(([nivel, data]) => {
        const scores = data.scores;
        const promedio = mean(scores);
        const promoters = scores.filter(s => s >= 9).length;
        const passives = scores.filter(s => s >= 7 && s < 9).length;
        const detractors = scores.filter(s => s < 7).length;
        return {
          nivel,
          promedio,
          cantidad: scores.length,
          promoters,
          passives,
          detractors,
        };
      }).sort((a, b) => b.promedio - a.promedio);

      setNpsPorNivel(npsNivelStats);

      // Calcular NPS por dirección
      const npsByDir: Record<string, { scores: number[]; colaboradores: ColaboradorPotencial[] }> = {};
      colabs.forEach(c => {
        if (c.npsScore !== undefined && c.npsScore !== null) {
          if (!npsByDir[c.direccion]) {
            npsByDir[c.direccion] = { scores: [], colaboradores: [] };
          }
          npsByDir[c.direccion].scores.push(c.npsScore);
          npsByDir[c.direccion].colaboradores.push(c);
        }
      });

      const npsDirStats = Object.entries(npsByDir)
        .filter(([_, data]) => data.scores.length >= 3) // Solo direcciones con al menos 3 respuestas
        .map(([direccion, data]) => {
          const scores = data.scores;
          const promedio = mean(scores);
          const promoters = scores.filter(s => s >= 9).length;
          const passives = scores.filter(s => s >= 7 && s < 9).length;
          const detractors = scores.filter(s => s < 7).length;
          return {
            direccion,
            promedio,
            cantidad: scores.length,
            promoters,
            passives,
            detractors,
          };
        }).sort((a, b) => b.promedio - a.promedio);

      setNpsPorDireccion(npsDirStats);
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

  // Estadísticas generales
  const promedioPotencial = colaboradores.length > 0 ? mean(colaboradores.map(c => c.potencial)) : 0;
  const medianaPotencial = colaboradores.length > 0 ? calcMedian(colaboradores.map(c => c.potencial)) : 0;
  const promedioDesempeno = colaboradores.length > 0 ? mean(colaboradores.map(c => c.desempeno)) : 0;
  // Usar formato normalizado (con guión) para los filtros
  const altoPotencial = colaboradores.filter(c =>
    ["alto-alto", "alto-medio", "medio-alto"].includes(c.posicion9Box)
  ).length;
  const accionRequerida = colaboradores.filter(c =>
    ["bajo-bajo", "bajo-medio", "medio-bajo"].includes(c.posicion9Box)
  ).length;
  const estrellas = colaboradores.filter(c => c.posicion9Box === "alto-alto").length;
  const enigma = colaboradores.filter(c => c.posicion9Box === "bajo-alto").length;
  const potencialOculto = colaboradores.filter(c => c.posicion9Box === "alto-bajo").length;
  
  // Análisis de calidad: distribución y dispersión
  const desviacionPotencial = colaboradores.length > 0 
    ? standardDeviation(colaboradores.map(c => c.potencial)) 
    : 0;
  const coeficienteVariacion = promedioPotencial > 0 
    ? (desviacionPotencial / promedioPotencial) * 100 
    : 0;

  // Box plots por nivel
  const boxPlotNivel: BoxPlotData[] = potencialPorNivel.map(n => ({
    segment: n.segmento,
    min: n.stats.min,
    q1: n.stats.q1,
    median: n.stats.mediana,
    q3: n.stats.q3,
    max: n.stats.max,
    mean: n.stats.promedio,
  }));

  // Treemap 9-Box (normalizar claves para buscar en COLORES_9BOX)
  const treemap9Box: TreemapNode[] = Object.entries(distribucion9Box)
    .filter(([key]) => key !== "sin_clasificar" && key !== "sin-clasificar")
    .map(([posicion, cantidad]) => {
      // Buscar en ambos formatos (guión y guión bajo)
      const label = COLORES_9BOX[posicion]?.label || 
                    COLORES_9BOX[posicion.replace(/-/g, "_")]?.label || 
                    COLORES_9BOX[posicion.replace(/_/g, "-")]?.label ||
                    posicion;
      return {
        name: label,
        value: cantidad,
      };
    });

  // Ranking por nivel
  const rankingNivel = potencialPorNivel.map((n, i) => ({
    nombre: n.segmento,
    desempeno: n.promedioPotencial,
    ranking: i + 1,
  }));

  // Stats table
  const statsTableNivel = potencialPorNivel.map(n => ({
    segmento: n.segmento,
    stats: n.stats,
    n: n.cantidad,
  }));

  // Scatter data (filtrar datos inválidos)
  const scatterData = colaboradores
    .filter(c => isFinite(c.desempeno) && !isNaN(c.desempeno) && isFinite(c.potencial) && !isNaN(c.potencial))
    .map(c => ({
      x: c.desempeno,
      y: c.potencial,
      name: c.nombre,
    }));

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
              <Rocket className="h-8 w-8" />
              Análisis de Potencial Estratégico
            </h1>
            <p className="text-muted-foreground mt-1">
              Período: <span className="font-semibold">{periodoNombre}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              <strong>Nota:</strong> Este análisis incluye colaboradores con evaluación de potencial. 
              Los miembros del Concejo (C1) están excluidos porque solo tienen autoevaluación de desempeño. 
              El Alcalde (A1) está incluido si tiene evaluación de potencial.
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Matriz 9-Box y Talento</p>
            <p className="text-xs mt-1">
              {colaboradores.length} de {totalEsperado} colaboradores analizados
              {totalEsperado > 0 && (
                <span className="block text-xs mt-0.5">
                  ({((colaboradores.length / totalEsperado) * 100).toFixed(1)}% cobertura)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Información sobre alcance del análisis */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Alcance del Análisis de Potencial</AlertTitle>
          <AlertDescription className="text-blue-700 text-sm">
            <div className="space-y-2 mt-2">
              <div>
                <p>
                  <strong>Total esperado (sin Concejo, sin admin):</strong> {totalEsperado} colaboradores
                </p>
                <p>
                  <strong>Con evaluación de potencial:</strong> {colaboradores.length} colaboradores
                  {totalEsperado > 0 && (
                    <span className="ml-2 text-xs">
                      ({((colaboradores.length / totalEsperado) * 100).toFixed(1)}% cobertura)
                    </span>
                  )}
                </p>
                {totalEsperado > colaboradores.length && (
                  <p className="text-orange-700 font-medium">
                    <strong>⚠ Sin evaluación de potencial:</strong> {totalEsperado - colaboradores.length} colaboradores 
                    que deberían tener evaluación de potencial pero aún no la tienen.
                  </p>
                )}
                {totalEsperado > colaboradores.length && (
                  <p className="text-xs text-orange-600 mt-1 italic">
                    <strong>Nota:</strong> Estos {totalEsperado - colaboradores.length} colaboradores no tienen ninguna evaluación 
                    (ni autoevaluación ni evaluación de jefe) de potencial. Esto puede deberse a que aún no han completado 
                    su autoevaluación o sus jefes aún no han completado la evaluación de potencial.
                  </p>
                )}
              </div>
              <div>
                <p>
                  <strong>Incluidos:</strong> Todos los colaboradores con evaluación de potencial completa. 
                  Esto incluye al Alcalde (A1) si tiene evaluación de potencial.
                </p>
                <p>
                  <strong>Excluidos:</strong> 
                </p>
                <ul className="list-disc list-inside ml-2 space-y-0.5">
                  <li>Miembros del Concejo Municipal (C1): No tienen evaluación de potencial, solo autoevaluación de desempeño.</li>
                  <li>Usuarios administrativos de monitoreo (admin_general, admin_rrhh): No son colaboradores municipales.</li>
                  {totalEsperado > colaboradores.length && (
                    <li>
                      {totalEsperado - colaboradores.length} colaboradores activos que aún no tienen evaluación de potencial. 
                      Estos colaboradores no tienen ninguna evaluación de potencial (ni autoevaluación ni evaluación de jefe), 
                      lo que puede deberse a que: (a) no han completado su autoevaluación de potencial, o (b) sus jefes aún 
                      no han completado la evaluación de potencial de estos colaboradores.
                    </li>
                  )}
                </ul>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                <strong>Nota técnica:</strong> La matriz 9-Box requiere ambas dimensiones (desempeño y potencial). 
                Por esta razón, los miembros del Concejo no pueden ser clasificados en la matriz 9-Box.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {/* KPIs Principales */}
        <StatCardGrid columns={4}>
          <StatCard
            title="Potencial Promedio"
            value={promedioPotencial}
            format="percentage"
            subtitle={`Mediana: ${medianaPotencial.toFixed(1)}%`}
            color="primary"
          />
          <StatCard
            title="Correlación D-P"
            value={correlacion.coeficiente}
            format="decimal"
            subtitle={correlacion.interpretacion.strength}
            color={Math.abs(correlacion.coeficiente) > 0.5 ? "success" : "default"}
          />
          <StatCard
            title="Alto Potencial"
            value={altoPotencial}
            subtitle={`${colaboradores.length > 0 ? ((altoPotencial / colaboradores.length) * 100).toFixed(1) : 0}% del total`}
            color="success"
          />
          <StatCard
            title="Acción Requerida"
            value={accionRequerida}
            subtitle={`${colaboradores.length > 0 ? ((accionRequerida / colaboradores.length) * 100).toFixed(1) : 0}% del total`}
            color="danger"
          />
        </StatCardGrid>

        {/* KPIs de Calidad y Análisis Profundo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Estrellas</p>
                  <p className="text-2xl font-bold text-green-600">{estrellas}</p>
                  <p className="text-xs text-muted-foreground">
                    {colaboradores.length > 0 ? ((estrellas / colaboradores.length) * 100).toFixed(1) : 0}% del total
                  </p>
                </div>
                <Star className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Potencial Oculto</p>
                  <p className="text-2xl font-bold text-yellow-600">{potencialOculto}</p>
                  <p className="text-xs text-muted-foreground">
                    Alto potencial, bajo desempeño
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Enigma</p>
                  <p className="text-2xl font-bold text-orange-600">{enigma}</p>
                  <p className="text-xs text-muted-foreground">
                    Bajo desempeño, alto potencial
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Dispersión</p>
                  <p className="text-2xl font-bold">{coeficienteVariacion.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">
                    CV: {coeficienteVariacion < 20 ? "Baja" : coeficienteVariacion < 35 ? "Moderada" : "Alta"}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Correlación */}
        <Card>
          <CardHeader>
            <CardTitle>Correlación Desempeño - Potencial</CardTitle>
            <CardDescription>Análisis de la relación entre desempeño actual y potencial percibido</CardDescription>
          </CardHeader>
          <CardContent>
            {scatterData.length < 2 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Datos insuficientes</AlertTitle>
                <AlertDescription>
                  No se pudo calcular la correlación entre Desempeño y Potencial. 
                  Esto puede deberse a datos insuficientes o valores faltantes.
                  <br />
                  <strong>Datos disponibles:</strong> {scatterData.length} colaboradores con datos válidos de ambas variables.
                  <br />
                  Se requieren al menos 2 pares de valores válidos para calcular la correlación.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-2">
                  <DesempenoPotencialScatter
                    data={scatterData}
                    title=""
                  />
                </div>
                <div className="space-y-4">
                  <CorrelationInterpretation
                    variable1="Desempeño"
                    variable2="Potencial"
                    coefficient={isFinite(correlacion.coeficiente) && !isNaN(correlacion.coeficiente) ? correlacion.coeficiente : 0}
                  />
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">Interpretación</h4>
                    <p className="text-sm text-blue-700">
                      {correlacion.interpretacion.description}
                    </p>
                    <p className="text-sm text-blue-600 mt-2">
                      {correlacion.coeficiente > 0.5
                        ? "Los colaboradores con alto desempeño tienden a ser percibidos con alto potencial, lo cual es esperado en un sistema de evaluación coherente."
                        : correlacion.coeficiente > 0.3
                        ? "Existe una relación moderada, indicando que el potencial no depende únicamente del desempeño actual."
                        : correlacion.coeficiente > 0
                        ? "El potencial se percibe de forma independiente al desempeño actual, lo cual puede indicar criterios complementarios en la evaluación."
                        : "No hay suficiente evidencia de relación entre desempeño y potencial con los datos disponibles."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribución 9-Box */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución en Matriz 9-Box</CardTitle>
            <CardDescription>Clasificación de colaboradores por desempeño y potencial</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 max-w-2xl mx-auto">
              {/* Fila superior (Alto Potencial) - Orden correcto: bajo-alto, medio-alto, alto-alto */}
              {["bajo-alto", "medio-alto", "alto-alto"].map(pos => {
                // Buscar en ambos formatos
                const config = COLORES_9BOX[pos] || COLORES_9BOX[pos.replace(/-/g, "_")];
                const count = distribucion9Box[pos] || 
                             distribucion9Box[pos.replace(/-/g, "_")] || 
                             distribucion9Box[pos.replace(/_/g, "-")] || 
                             0;
                const pct = colaboradores.length > 0 ? ((count / colaboradores.length) * 100).toFixed(1) : "0";
                return (
                  <div
                    key={pos}
                    className={`${config?.bg || "bg-gray-200"} ${config?.text || "text-gray-800"} p-4 rounded-lg text-center`}
                  >
                    <p className="font-semibold">{config?.label || pos}</p>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm opacity-80">{pct}%</p>
                  </div>
                );
              })}
              {/* Fila media (Medio Potencial) - Orden: bajo-medio, medio-medio, alto-medio */}
              {["bajo-medio", "medio-medio", "alto-medio"].map(pos => {
                const config = COLORES_9BOX[pos] || COLORES_9BOX[pos.replace(/-/g, "_")];
                const count = distribucion9Box[pos] || 
                             distribucion9Box[pos.replace(/-/g, "_")] || 
                             distribucion9Box[pos.replace(/_/g, "-")] || 
                             0;
                const pct = colaboradores.length > 0 ? ((count / colaboradores.length) * 100).toFixed(1) : "0";
                return (
                  <div
                    key={pos}
                    className={`${config?.bg || "bg-gray-200"} ${config?.text || "text-gray-800"} p-4 rounded-lg text-center`}
                  >
                    <p className="font-semibold">{config?.label || pos}</p>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm opacity-80">{pct}%</p>
                  </div>
                );
              })}
              {/* Fila inferior (Bajo Potencial) - Orden: bajo-bajo, medio-bajo, alto-bajo */}
              {["bajo-bajo", "medio-bajo", "alto-bajo"].map(pos => {
                const config = COLORES_9BOX[pos] || COLORES_9BOX[pos.replace(/-/g, "_")];
                const count = distribucion9Box[pos] || 
                             distribucion9Box[pos.replace(/-/g, "_")] || 
                             distribucion9Box[pos.replace(/_/g, "-")] || 
                             0;
                const pct = colaboradores.length > 0 ? ((count / colaboradores.length) * 100).toFixed(1) : "0";
                return (
                  <div
                    key={pos}
                    className={`${config?.bg || "bg-gray-200"} ${config?.text || "text-gray-800"} p-4 rounded-lg text-center`}
                  >
                    <p className="font-semibold">{config?.label || pos}</p>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm opacity-80">{pct}%</p>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-4 text-sm text-muted-foreground max-w-2xl mx-auto">
              <span>← Bajo Desempeño</span>
              <span className="font-semibold">DESEMPEÑO</span>
              <span>Alto Desempeño →</span>
            </div>
            <div className="text-center mt-2 text-sm text-muted-foreground">
              ↑ Alto Potencial | POTENCIAL | Bajo Potencial ↓
            </div>
          </CardContent>
        </Card>

        {/* Potencial por Nivel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DireccionRankingChart
            direcciones={rankingNivel}
            title="Ranking de Potencial por Nivel"
            metric="desempeno"
          />
          <TreemapChart
            data={treemap9Box}
            title="Distribución por Clasificación 9-Box"
            description="Tamaño proporcional a la cantidad de colaboradores"
          />
        </div>

        {/* Box Plot de Potencial por Nivel */}
        {boxPlotNivel.length > 0 && (
          <BoxPlotChart
            data={boxPlotNivel}
            title="Distribución de Potencial por Nivel Jerárquico"
            description="Dispersión del potencial percibido en cada nivel"
            yLabel="Potencial (%)"
          />
        )}

        {/* Tabla de estadísticas */}
        <StatsTable
          data={statsTableNivel}
          title="Estadísticas de Potencial por Nivel"
          showPercentiles
          showBoxPlot
        />

        {/* Análisis Estratégico */}
        <Card>
          <CardHeader>
            <CardTitle>Análisis Estratégico del Talento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Estrellas */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800">Talento Clave</span>
                </div>
                <p className="text-2xl font-bold text-green-700">
                  {distribucion9Box["alto_alto"] || 0}
                </p>
                <p className="text-sm text-green-600">
                  Colaboradores "Estrellas" con alto desempeño y alto potencial.
                  Prioridad para retención y desarrollo.
                </p>
              </div>

              {/* Alto Potencial */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-800">Alto Potencial</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">
                  {(distribucion9Box["alto-medio"] || distribucion9Box["alto_medio"] || 0) + 
                   (distribucion9Box["medio-alto"] || distribucion9Box["medio_alto"] || 0)}
                </p>
                <p className="text-sm text-blue-600">
                  Candidatos para planes de sucesión y programas de desarrollo acelerado.
                </p>
              </div>

              {/* Desarrollo */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-amber-600" />
                  <span className="font-semibold text-amber-800">En Desarrollo</span>
                </div>
                <p className="text-2xl font-bold text-amber-700">
                  {(distribucion9Box["bajo-medio"] || distribucion9Box["bajo_medio"] || 0) + 
                   (distribucion9Box["medio-bajo"] || distribucion9Box["medio_bajo"] || 0)}
                </p>
                <p className="text-sm text-amber-600">
                  Requieren coaching y acompañamiento para mejorar desempeño o potencial.
                </p>
              </div>
            </div>

            {/* Análisis de Calidad de Datos */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Calidad y Confiabilidad de los Datos
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
                <div>
                  <p className="font-semibold mb-1">Cobertura:</p>
                  <p>{colaboradores.length} colaboradores con datos de potencial</p>
                  <p className="text-xs text-blue-600 mt-1">
                    {colaboradores.length > 0 && totalColaboradores > 0 
                      ? `${((colaboradores.length / totalColaboradores) * 100).toFixed(1)}% de cobertura`
                      : "Cobertura completa"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold mb-1">Consistencia:</p>
                  <p>Correlación D-P: {correlacion.coeficiente.toFixed(3)}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    {Math.abs(correlacion.coeficiente) > 0.7 
                      ? "Alta consistencia entre evaluadores"
                      : Math.abs(correlacion.coeficiente) > 0.5
                      ? "Consistencia moderada"
                      : "Evaluaciones independientes"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold mb-1">Dispersión:</p>
                  <p>CV: {coeficienteVariacion.toFixed(1)}%</p>
                  <p className="text-xs text-blue-600 mt-1">
                    {coeficienteVariacion < 20 
                      ? "Población homogénea en potencial"
                      : coeficienteVariacion < 35
                      ? "Variabilidad moderada"
                      : "Alta heterogeneidad en potencial"}
                  </p>
                </div>
              </div>
            </div>

            {/* Recomendaciones Estratégicas Mejoradas */}
            <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-800 mb-3">Recomendaciones Estratégicas Basadas en Datos</h4>
              <div className="space-y-3 text-sm text-purple-700">
                <div className="flex gap-3">
                  <Star className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Retención crítica:</strong> Priorizar acciones de engagement para los{" "}
                    {estrellas} colaboradores "Estrellas" (alto-alto). Representan el{" "}
                    {colaboradores.length > 0 ? ((estrellas / colaboradores.length) * 100).toFixed(1) : 0}% del talento clave.
                    <span className="text-purple-600 block mt-1 text-xs">
                      Acción: Programas de retención, reconocimiento y desarrollo de carrera.
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Planes de sucesión:</strong> Identificar posiciones clave y preparar a{" "}
                    {altoPotencial} colaboradores de "Alto Potencial" como sucesores.
                    <span className="text-purple-600 block mt-1 text-xs">
                      Acción: Programas de desarrollo acelerado, mentoring y rotación estratégica.
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Users className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Desarrollo focalizado:</strong> Diseñar programas específicos para los{" "}
                    {accionRequerida} colaboradores que requieren intervención inmediata.
                    <span className="text-purple-600 block mt-1 text-xs">
                      Acción: Coaching individualizado, planes de mejora con seguimiento mensual.
                    </span>
                  </div>
                </div>
                {potencialOculto > 0 && (
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Potencial oculto ({potencialOculto} casos):</strong> Alto potencial pero bajo desempeño.
                      Posibles causas: contexto desfavorable, falta de recursos, problemas de motivación o alineación.
                      <span className="text-purple-600 block mt-1 text-xs">
                        Acción: Investigación individual, ajuste de contexto laboral, apoyo específico.
                      </span>
                    </div>
                  </div>
                )}
                {enigma > 0 && (
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Enigma ({enigma} casos):</strong> Bajo desempeño pero alto potencial percibido.
                      Requiere análisis profundo: ¿evaluación incorrecta, problemas de contexto, o potencial no desarrollado?
                      <span className="text-purple-600 block mt-1 text-xs">
                        Acción: Revisión de evaluación, análisis de barreras, plan de desarrollo agresivo.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Potencial por Dirección */}
        {potencialPorDireccion.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Potencial por Dirección/Unidad</CardTitle>
              <CardDescription>Promedio de potencial por área organizacional</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {potencialPorDireccion.slice(0, 10).map((dir, idx) => (
                  <div key={dir.segmento} className="flex items-center gap-4">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${
                      idx < 3 ? "bg-green-500" : idx < 6 ? "bg-blue-500" : "bg-gray-400"
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium truncate max-w-[300px]">{dir.segmento}</span>
                        <span className="font-mono font-semibold">{dir.promedioPotencial.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            idx < 3 ? "bg-green-500" : idx < 6 ? "bg-blue-500" : "bg-gray-400"
                          }`}
                          style={{ width: `${dir.promedioPotencial}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground w-16 text-right">
                      ({dir.cantidad})
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumen Ejecutivo con Insights Clave */}
        <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-6 w-6 text-purple-600" />
              Resumen Ejecutivo: Insights Clave del Análisis de Potencial
            </CardTitle>
            <CardDescription>Hallazgos principales y acciones estratégicas recomendadas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Insight 1: Distribución del Talento */}
              <div className="p-4 bg-white rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Distribución del Talento
                </h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>
                    <strong>{estrellas} colaboradores "Estrellas"</strong> ({colaboradores.length > 0 ? ((estrellas / colaboradores.length) * 100).toFixed(1) : 0}%) 
                    representan el talento de mayor valor. Requieren programas de retención prioritarios.
                  </li>
                  <li>
                    <strong>{altoPotencial} colaboradores de Alto Potencial</strong> ({colaboradores.length > 0 ? ((altoPotencial / colaboradores.length) * 100).toFixed(1) : 0}%) 
                    son candidatos ideales para planes de sucesión y desarrollo acelerado.
                  </li>
                  <li>
                    <strong>{accionRequerida} colaboradores requieren acción inmediata</strong> ({colaboradores.length > 0 ? ((accionRequerida / colaboradores.length) * 100).toFixed(1) : 0}%) 
                    necesitan intervención para mejorar su desempeño o potencial.
                  </li>
                </ul>
              </div>

              {/* Insight 2: Calidad de Evaluación */}
              <div className="p-4 bg-white rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Calidad de la Evaluación
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>
                    <strong>Correlación D-P: {correlacion.coeficiente.toFixed(3)}</strong> - 
                    {Math.abs(correlacion.coeficiente) > 0.7 
                      ? " Alta consistencia entre evaluadores. El sistema de evaluación es coherente."
                      : Math.abs(correlacion.coeficiente) > 0.5
                      ? " Consistencia moderada. Las evaluaciones son relativamente coherentes."
                      : " Baja correlación. Puede indicar criterios independientes o necesidad de calibración."}
                  </li>
                  <li>
                    <strong>Dispersión: {coeficienteVariacion.toFixed(1)}%</strong> - 
                    {coeficienteVariacion < 20 
                      ? " Población homogénea en potencial percibido."
                      : coeficienteVariacion < 35
                      ? " Variabilidad moderada en potencial."
                      : " Alta heterogeneidad. Existe diversidad significativa en el potencial percibido."}
                  </li>
                  <li>
                    <strong>Cobertura: {colaboradores.length} colaboradores</strong> con datos completos de potencial y desempeño.
                  </li>
                </ul>
              </div>
            </div>

            {/* Insight 3: Casos Especiales */}
            {(potencialOculto > 0 || enigma > 0) && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Casos que Requieren Atención Especial
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-amber-700">
                  {potencialOculto > 0 && (
                    <div>
                      <strong>Potencial Oculto ({potencialOculto} casos):</strong> Alto potencial pero bajo desempeño.
                      <span className="block mt-1 text-xs text-amber-600">
                        Posibles causas: contexto desfavorable, falta de recursos, problemas de motivación, 
                        desalineación con el rol, o necesidad de desarrollo específico.
                      </span>
                    </div>
                  )}
                  {enigma > 0 && (
                    <div>
                      <strong>Enigma ({enigma} casos):</strong> Bajo desempeño pero alto potencial percibido.
                      <span className="block mt-1 text-xs text-amber-600">
                        Requiere investigación: ¿evaluación incorrecta, barreras contextuales, 
                        potencial no desarrollado, o problemas de alineación?
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Insight 4: Acciones Prioritarias */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Acciones Prioritarias Recomendadas
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="p-3 bg-white rounded border border-green-200">
                  <p className="font-semibold text-green-800 mb-1">1. Retención Crítica</p>
                  <p className="text-green-700 text-xs">
                    Implementar programas de engagement y reconocimiento para {estrellas} colaboradores "Estrellas".
                    Inversión prioritaria en retención.
                  </p>
                </div>
                <div className="p-3 bg-white rounded border border-blue-200">
                  <p className="font-semibold text-blue-800 mb-1">2. Desarrollo Acelerado</p>
                  <p className="text-blue-700 text-xs">
                    Crear programas de desarrollo acelerado y mentoring para {altoPotencial} colaboradores 
                    de alto potencial. Prepararlos para roles de liderazgo.
                  </p>
                </div>
                <div className="p-3 bg-white rounded border border-amber-200">
                  <p className="font-semibold text-amber-800 mb-1">3. Intervención Inmediata</p>
                  <p className="text-amber-700 text-xs">
                    Diseñar planes de mejora individualizados para {accionRequerida} colaboradores 
                    que requieren acción. Seguimiento mensual y coaching intensivo.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ============================================ */}
        {/* VISTAS DETALLADAS - ANÁLISIS PROFUNDO */}
        {/* ============================================ */}

        <Tabs defaultValue="estrellas" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="estrellas" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Estrellas ({estrellas})</span>
            </TabsTrigger>
            <TabsTrigger value="accion-requerida" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Acción Requerida ({accionRequerida})</span>
            </TabsTrigger>
            <TabsTrigger value="potencial-oculto" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Potencial Oculto ({potencialOculto})</span>
            </TabsTrigger>
            <TabsTrigger value="nps-detallado" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">NPS Detallado</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Detalle de Estrellas */}
          <TabsContent value="estrellas" className="space-y-6 mt-6">
            <Card className="border-green-200 bg-green-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <Star className="h-6 w-6" />
                  Detalle de las {estrellas} Estrellas - Planes de Sucesión
                </CardTitle>
                <CardDescription>
                  Colaboradores con alto desempeño y alto potencial. Prioridad ALTA para planes de sucesión y retención.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Distribución por Nivel */}
                <div>
                  <h3 className="font-semibold mb-4">Distribución por Nivel Jerárquico</h3>
                  {(() => {
                    const estrellasList = colaboradores.filter(c => c.posicion9Box === "alto-alto");
                    const byNivel: Record<string, ColaboradorPotencial[]> = {};
                    estrellasList.forEach(e => {
                      if (!byNivel[e.nivel]) byNivel[e.nivel] = [];
                      byNivel[e.nivel].push(e);
                    });
                    const nivelData = Object.entries(byNivel)
                      .map(([nivel, arr]) => ({
                        nivel,
                        cantidad: arr.length,
                        porcentaje: (arr.length / estrellasList.length) * 100,
                        promedioDesempeno: mean(arr.map(c => c.desempeno)),
                        promedioPotencial: mean(arr.map(c => c.potencial)),
                      }))
                      .sort((a, b) => b.cantidad - a.cantidad);

                    return (
                      <div className="space-y-4">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={nivelData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="nivel" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="cantidad" fill="#22c55e" name="Cantidad de Estrellas" />
                          </BarChart>
                        </ResponsiveContainer>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nivel</TableHead>
                              <TableHead className="text-right">Cantidad</TableHead>
                              <TableHead className="text-right">% del Total</TableHead>
                              <TableHead className="text-right">Desempeño Prom.</TableHead>
                              <TableHead className="text-right">Potencial Prom.</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {nivelData.map((n) => (
                              <TableRow key={n.nivel}>
                                <TableCell className="font-medium">{n.nivel}</TableCell>
                                <TableCell className="text-right">{n.cantidad}</TableCell>
                                <TableCell className="text-right">{n.porcentaje.toFixed(1)}%</TableCell>
                                <TableCell className="text-right">{n.promedioDesempeno.toFixed(1)}%</TableCell>
                                <TableCell className="text-right">{n.promedioPotencial.toFixed(1)}%</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })()}
                </div>

                {/* Distribución por Dirección */}
                <div>
                  <h3 className="font-semibold mb-4">Distribución por Dirección/Unidad</h3>
                  {(() => {
                    const estrellasList = colaboradores.filter(c => c.posicion9Box === "alto-alto");
                    const byDir: Record<string, ColaboradorPotencial[]> = {};
                    estrellasList.forEach(e => {
                      if (!byDir[e.direccion]) byDir[e.direccion] = [];
                      byDir[e.direccion].push(e);
                    });
                    const dirData = Object.entries(byDir)
                      .map(([direccion, arr]) => ({
                        direccion,
                        cantidad: arr.length,
                        porcentaje: (arr.length / estrellasList.length) * 100,
                        promedioDesempeno: mean(arr.map(c => c.desempeno)),
                        promedioPotencial: mean(arr.map(c => c.potencial)),
                      }))
                      .sort((a, b) => b.cantidad - a.cantidad)
                      .slice(0, 15);

                    return (
                      <div className="space-y-4">
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart data={dirData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="direccion" type="category" width={200} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="cantidad" fill="#22c55e" name="Cantidad de Estrellas" />
                          </BarChart>
                        </ResponsiveContainer>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Dirección/Unidad</TableHead>
                              <TableHead className="text-right">Cantidad</TableHead>
                              <TableHead className="text-right">% del Total</TableHead>
                              <TableHead className="text-right">Desempeño Prom.</TableHead>
                              <TableHead className="text-right">Potencial Prom.</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dirData.map((d) => (
                              <TableRow key={d.direccion}>
                                <TableCell className="font-medium">{d.direccion}</TableCell>
                                <TableCell className="text-right">{d.cantidad}</TableCell>
                                <TableCell className="text-right">{d.porcentaje.toFixed(1)}%</TableCell>
                                <TableCell className="text-right">{d.promedioDesempeno.toFixed(1)}%</TableCell>
                                <TableCell className="text-right">{d.promedioPotencial.toFixed(1)}%</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })()}
                </div>

                {/* Lista completa de Estrellas */}
                <div>
                  <h3 className="font-semibold mb-4">Lista Completa de Estrellas</h3>
                  <div className="max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Nivel</TableHead>
                          <TableHead>Dirección</TableHead>
                          <TableHead className="text-right">Desempeño</TableHead>
                          <TableHead className="text-right">Potencial</TableHead>
                          {colaboradores.some(c => c.npsScore !== undefined) && (
                            <TableHead className="text-right">NPS</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {colaboradores
                          .filter(c => c.posicion9Box === "alto-alto")
                          .sort((a, b) => (b.desempeno + b.potencial) - (a.desempeno + a.potencial))
                          .map((e) => (
                            <TableRow key={e.id}>
                              <TableCell className="font-medium">{e.nombre}</TableCell>
                              <TableCell>{e.nivel}</TableCell>
                              <TableCell>{e.direccion}</TableCell>
                              <TableCell className="text-right">{e.desempeno.toFixed(1)}%</TableCell>
                              <TableCell className="text-right">{e.potencial.toFixed(1)}%</TableCell>
                              {e.npsScore !== undefined && (
                                <TableCell className="text-right">
                                  <span className={e.npsScore >= 9 ? "text-green-600 font-semibold" : e.npsScore >= 7 ? "text-yellow-600" : "text-red-600"}>
                                    {e.npsScore}
                                  </span>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Acción Requerida */}
          <TabsContent value="accion-requerida" className="space-y-6 mt-6">
            <Card className="border-red-200 bg-red-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-6 w-6" />
                  Detalle de {accionRequerida} Colaboradores en Acción Requerida
                </CardTitle>
                <CardDescription>
                  Colaboradores con bajo desempeño y bajo potencial. Prioridad ALTA para intervención inmediata.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Distribución por Dirección */}
                <div>
                  <h3 className="font-semibold mb-4">Distribución por Dirección/Unidad</h3>
                  {(() => {
                    const accionList = colaboradores.filter(c => 
                      ["bajo-bajo", "bajo-medio", "medio-bajo"].includes(c.posicion9Box)
                    );
                    const byDir: Record<string, ColaboradorPotencial[]> = {};
                    accionList.forEach(a => {
                      if (!byDir[a.direccion]) byDir[a.direccion] = [];
                      byDir[a.direccion].push(a);
                    });
                    const dirData = Object.entries(byDir)
                      .map(([direccion, arr]) => ({
                        direccion,
                        cantidad: arr.length,
                      }))
                      .sort((a, b) => b.cantidad - a.cantidad);

                    return (
                      <div className="space-y-4">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={dirData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="direccion" type="category" width={200} />
                            <Tooltip />
                            <Bar dataKey="cantidad" fill="#ef4444" name="Cantidad" />
                          </BarChart>
                        </ResponsiveContainer>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Dirección/Unidad</TableHead>
                              <TableHead className="text-right">Cantidad</TableHead>
                              <TableHead className="text-right">% del Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dirData.map((d) => (
                              <TableRow key={d.direccion}>
                                <TableCell className="font-medium">{d.direccion}</TableCell>
                                <TableCell className="text-right">{d.cantidad}</TableCell>
                                <TableCell className="text-right">
                                  {((d.cantidad / accionList.length) * 100).toFixed(1)}%
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })()}
                </div>

                {/* Lista completa */}
                <div>
                  <h3 className="font-semibold mb-4">Lista Completa de Colaboradores Requiriendo Acción</h3>
                  <div className="max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Nivel</TableHead>
                          <TableHead>Dirección</TableHead>
                          <TableHead>Posición 9-Box</TableHead>
                          <TableHead className="text-right">Desempeño</TableHead>
                          <TableHead className="text-right">Potencial</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {colaboradores
                          .filter(c => ["bajo-bajo", "bajo-medio", "medio-bajo"].includes(c.posicion9Box))
                          .sort((a, b) => (a.desempeno + a.potencial) - (b.desempeno + b.potencial))
                          .map((a) => (
                            <TableRow key={a.id} className="bg-red-50">
                              <TableCell className="font-medium">{a.nombre}</TableCell>
                              <TableCell>{a.nivel}</TableCell>
                              <TableCell>{a.direccion}</TableCell>
                              <TableCell>
                                <span className="px-2 py-1 rounded text-xs bg-red-200 text-red-800">
                                  {COLORES_9BOX[a.posicion9Box]?.label || a.posicion9Box}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-red-600">{a.desempeno.toFixed(1)}%</TableCell>
                              <TableCell className="text-right text-red-600">{a.potencial.toFixed(1)}%</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Potencial Oculto */}
          <TabsContent value="potencial-oculto" className="space-y-6 mt-6">
            <Card className="border-yellow-200 bg-yellow-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <Target className="h-6 w-6" />
                  Perfil Demográfico de {potencialOculto} Colaboradores con Potencial Oculto
                </CardTitle>
                <CardDescription>
                  Colaboradores con alto potencial pero bajo desempeño. Prioridad MEDIA para desarrollo y apoyo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {potencialOculto > 0 ? (
                  <>
                    {/* Estadísticas Demográficas */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(() => {
                        const ocultoList = colaboradores.filter(c => c.posicion9Box === "alto-bajo");
                        const edades = ocultoList.map(c => c.edad).filter((e): e is number => e !== undefined);
                        const antiguedades = ocultoList.map(c => c.antiguedadMeses).filter((a): a is number => a !== undefined);
                        
                        return (
                          <>
                            <Card>
                              <CardContent className="pt-6">
                                <p className="text-sm text-muted-foreground mb-1">Edad Promedio</p>
                                <p className="text-2xl font-bold">
                                  {edades.length > 0 ? mean(edades).toFixed(1) : "N/A"} años
                                </p>
                                {edades.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Rango: {Math.min(...edades)} - {Math.max(...edades)} años
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-6">
                                <p className="text-sm text-muted-foreground mb-1">Antigüedad Promedio</p>
                                <p className="text-2xl font-bold">
                                  {antiguedades.length > 0 ? (mean(antiguedades) / 12).toFixed(1) : "N/A"} años
                                </p>
                                {antiguedades.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Rango: {(Math.min(...antiguedades) / 12).toFixed(1)} - {(Math.max(...antiguedades) / 12).toFixed(1)} años
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-6">
                                <p className="text-sm text-muted-foreground mb-1">Potencial Promedio</p>
                                <p className="text-2xl font-bold text-yellow-600">
                                  {mean(ocultoList.map(c => c.potencial)).toFixed(1)}%
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Desempeño: {mean(ocultoList.map(c => c.desempeno)).toFixed(1)}%
                                </p>
                              </CardContent>
                            </Card>
                          </>
                        );
                      })()}
                    </div>

                    {/* Distribución por Nivel */}
                    <div>
                      <h3 className="font-semibold mb-4">Distribución por Nivel</h3>
                      {(() => {
                        const ocultoList = colaboradores.filter(c => c.posicion9Box === "alto-bajo");
                        const byNivel: Record<string, ColaboradorPotencial[]> = {};
                        ocultoList.forEach(o => {
                          if (!byNivel[o.nivel]) byNivel[o.nivel] = [];
                          byNivel[o.nivel].push(o);
                        });
                        const nivelData = Object.entries(byNivel)
                          .map(([nivel, arr]) => ({
                            nivel,
                            cantidad: arr.length,
                            porcentaje: (arr.length / ocultoList.length) * 100,
                          }))
                          .sort((a, b) => b.cantidad - a.cantidad);

                        const COLORS = ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7'];

                        return (
                          <div className="space-y-4">
                            <ResponsiveContainer width="100%" height={300}>
                              <PieChart>
                                <Pie
                                  data={nivelData}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ nivel, cantidad, porcentaje }) => `${nivel}: ${cantidad} (${porcentaje.toFixed(0)}%)`}
                                  outerRadius={100}
                                  fill="#8884d8"
                                  dataKey="cantidad"
                                >
                                  {nivelData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nivel</TableHead>
                                  <TableHead className="text-right">Cantidad</TableHead>
                                  <TableHead className="text-right">% del Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {nivelData.map((n) => (
                                  <TableRow key={n.nivel}>
                                    <TableCell className="font-medium">{n.nivel}</TableCell>
                                    <TableCell className="text-right">{n.cantidad}</TableCell>
                                    <TableCell className="text-right">{n.porcentaje.toFixed(1)}%</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Lista completa */}
                    <div>
                      <h3 className="font-semibold mb-4">Lista Completa de Colaboradores con Potencial Oculto</h3>
                      <div className="max-h-[400px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nombre</TableHead>
                              <TableHead>Nivel</TableHead>
                              <TableHead>Dirección</TableHead>
                              <TableHead className="text-right">Edad</TableHead>
                              <TableHead className="text-right">Antigüedad</TableHead>
                              <TableHead className="text-right">Desempeño</TableHead>
                              <TableHead className="text-right">Potencial</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {colaboradores
                              .filter(c => c.posicion9Box === "alto-bajo")
                              .sort((a, b) => b.potencial - a.potencial)
                              .map((o) => (
                                <TableRow key={o.id} className="bg-yellow-50">
                                  <TableCell className="font-medium">{o.nombre}</TableCell>
                                  <TableCell>{o.nivel}</TableCell>
                                  <TableCell>{o.direccion}</TableCell>
                                  <TableCell className="text-right">{o.edad || "N/A"}</TableCell>
                                  <TableCell className="text-right">
                                    {o.antiguedadMeses ? `${(o.antiguedadMeses / 12).toFixed(1)} años` : "N/A"}
                                  </TableCell>
                                  <TableCell className="text-right text-red-600">{o.desempeno.toFixed(1)}%</TableCell>
                                  <TableCell className="text-right text-green-600 font-semibold">{o.potencial.toFixed(1)}%</TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No hay colaboradores con potencial oculto</AlertTitle>
                    <AlertDescription>
                      Todos los colaboradores con alto potencial también tienen alto desempeño.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: NPS Detallado */}
          <TabsContent value="nps-detallado" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-6 w-6" />
                  Análisis Detallado de NPS (Net Promoter Score)
                </CardTitle>
                <CardDescription>
                  Employee Net Promoter Score por nivel jerárquico y dirección. Prioridad MEDIA para engagement.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* NPS por Nivel */}
                {npsPorNivel.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-4">NPS por Nivel Jerárquico</h3>
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={npsPorNivel}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nivel" />
                          <YAxis domain={[0, 10]} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="promedio" fill="#3b82f6" name="NPS Promedio" />
                        </BarChart>
                      </ResponsiveContainer>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nivel</TableHead>
                            <TableHead className="text-right">NPS Promedio</TableHead>
                            <TableHead className="text-right">Respuestas</TableHead>
                            <TableHead className="text-right">Promoters (9-10)</TableHead>
                            <TableHead className="text-right">Passives (7-8)</TableHead>
                            <TableHead className="text-right">Detractors (0-6)</TableHead>
                            <TableHead className="text-right">eNPS</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {npsPorNivel.map((n) => {
                            const enps = n.cantidad > 0 
                              ? ((n.promoters / n.cantidad) * 100) - ((n.detractors / n.cantidad) * 100)
                              : 0;
                            return (
                              <TableRow key={n.nivel}>
                                <TableCell className="font-medium">{n.nivel}</TableCell>
                                <TableCell className="text-right">
                                  <span className={n.promedio >= 7 ? "text-green-600 font-semibold" : n.promedio >= 5 ? "text-yellow-600" : "text-red-600"}>
                                    {n.promedio.toFixed(1)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">{n.cantidad}</TableCell>
                                <TableCell className="text-right text-green-600">{n.promoters}</TableCell>
                                <TableCell className="text-right text-yellow-600">{n.passives}</TableCell>
                                <TableCell className="text-right text-red-600">{n.detractors}</TableCell>
                                <TableCell className="text-right">
                                  <span className={enps >= 50 ? "text-green-600 font-semibold" : enps >= 0 ? "text-yellow-600" : "text-red-600"}>
                                    {enps.toFixed(1)}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* NPS por Dirección */}
                {npsPorDireccion.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-4">NPS por Dirección/Unidad (Top 15)</h3>
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={npsPorDireccion.slice(0, 15)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" domain={[0, 10]} />
                          <YAxis dataKey="direccion" type="category" width={200} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="promedio" fill="#8b5cf6" name="NPS Promedio" />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="max-h-[500px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Dirección/Unidad</TableHead>
                              <TableHead className="text-right">NPS Promedio</TableHead>
                              <TableHead className="text-right">Respuestas</TableHead>
                              <TableHead className="text-right">Promoters</TableHead>
                              <TableHead className="text-right">Passives</TableHead>
                              <TableHead className="text-right">Detractors</TableHead>
                              <TableHead className="text-right">eNPS</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {npsPorDireccion.slice(0, 15).map((d) => {
                              const enps = d.cantidad > 0 
                                ? ((d.promoters / d.cantidad) * 100) - ((d.detractors / d.cantidad) * 100)
                                : 0;
                              return (
                                <TableRow key={d.direccion}>
                                  <TableCell className="font-medium">{d.direccion}</TableCell>
                                  <TableCell className="text-right">
                                    <span className={d.promedio >= 7 ? "text-green-600 font-semibold" : d.promedio >= 5 ? "text-yellow-600" : "text-red-600"}>
                                      {d.promedio.toFixed(1)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right">{d.cantidad}</TableCell>
                                  <TableCell className="text-right text-green-600">{d.promoters}</TableCell>
                                  <TableCell className="text-right text-yellow-600">{d.passives}</TableCell>
                                  <TableCell className="text-right text-red-600">{d.detractors}</TableCell>
                                  <TableCell className="text-right">
                                    <span className={enps >= 50 ? "text-green-600 font-semibold" : enps >= 0 ? "text-yellow-600" : "text-red-600"}>
                                      {enps.toFixed(1)}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}

                {npsPorNivel.length === 0 && npsPorDireccion.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No hay datos de NPS disponibles</AlertTitle>
                    <AlertDescription>
                      No se encontraron respuestas de NPS para este período.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
