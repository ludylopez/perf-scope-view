import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ArrowLeft, Users2, Calendar, Clock, UserCircle, Briefcase, GraduationCap } from "lucide-react";
import {
  StatCard,
  StatCardGrid,
  BoxPlotChart,
  StatsTable,
  ScatterPlotCorrelation,
  CorrelationInterpretation,
  DireccionRankingChart,
  TreemapChart,
  GapBarChart,
} from "@/components/charts";
import { mean, standardDeviation, median as calcMedian, percentile, pearsonCorrelation, getCorrelationInterpretation, mode as calcMode } from "@/lib/advancedStatistics";
import type { BoxPlotData, TreemapNode, EstadisticasCompletas } from "@/types/analisis";

interface RangoStats {
  rango: string;
  orden: number;
  cantidad: number;
  desempeno: EstadisticasCompletas;
  potencial: EstadisticasCompletas;
  diferenciaVsGlobal: number;
}

interface GeneroStats {
  genero: string;
  cantidad: number;
  porcentaje: number;
  desempeno: EstadisticasCompletas;
  potencial: EstadisticasCompletas;
  diferenciaVsGlobal: number;
}

interface TipoPuestoStats {
  tipo: string;
  cantidad: number;
  porcentaje: number;
  desempeno: EstadisticasCompletas;
  potencial: EstadisticasCompletas;
  diferenciaVsGlobal: number;
}

interface NivelEducativoStats {
  nivel: string;
  cantidad: number;
  porcentaje: number;
  desempeno: EstadisticasCompletas;
  diferenciaVsGlobal: number;
}

interface CorrelacionData {
  variable1: string;
  variable2: string;
  coeficiente: number;
  interpretacion: ReturnType<typeof getCorrelationInterpretation>;
}

export default function AnalisisDemografico() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [rangosEdad, setRangosEdad] = useState<RangoStats[]>([]);
  const [rangosAntiguedad, setRangosAntiguedad] = useState<RangoStats[]>([]);
  const [correlaciones, setCorrelaciones] = useState<CorrelacionData[]>([]);
  const [scatterData, setScatterData] = useState<{ edad: Array<{ x: number; y: number }>; antiguedad: Array<{ x: number; y: number }> }>({
    edad: [],
    antiguedad: [],
  });
  const [promedioGlobal, setPromedioGlobal] = useState(0);
  const [promedioEdad, setPromedioEdad] = useState(0);
  const [medianaEdad, setMedianaEdad] = useState(0);
  const [modaEdad, setModaEdad] = useState(0);
  const [desviacionEdad, setDesviacionEdad] = useState(0);
  const [promedioAntiguedad, setPromedioAntiguedad] = useState(0);
  const [medianaAntiguedad, setMedianaAntiguedad] = useState(0);
  const [modaAntiguedad, setModaAntiguedad] = useState(0);
  const [desviacionAntiguedad, setDesviacionAntiguedad] = useState(0);
  const [minEdad, setMinEdad] = useState(0);
  const [maxEdad, setMaxEdad] = useState(0);
  const [minAntiguedad, setMinAntiguedad] = useState(0);
  const [maxAntiguedad, setMaxAntiguedad] = useState(0);
  const [cantidadJovenes, setCantidadJovenes] = useState(0);
  const [cantidadLongevos, setCantidadLongevos] = useState(0);
  const [cantidadRecientes, setCantidadRecientes] = useState(0);
  const [cantidadAntiguos, setCantidadAntiguos] = useState(0);

  // Nuevos estados para análisis demográfico completo
  const [generoStats, setGeneroStats] = useState<GeneroStats[]>([]);
  const [tipoPuestoStats, setTipoPuestoStats] = useState<TipoPuestoStats[]>([]);
  const [nivelEducativoStats, setNivelEducativoStats] = useState<NivelEducativoStats[]>([]);
  const [totalColaboradores, setTotalColaboradores] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const getRangoEdad = (edad: number): { rango: string; orden: number } => {
    if (edad < 25) return { rango: "18-24", orden: 1 };
    if (edad < 35) return { rango: "25-34", orden: 2 };
    if (edad < 45) return { rango: "35-44", orden: 3 };
    if (edad < 55) return { rango: "45-54", orden: 4 };
    if (edad < 65) return { rango: "55-64", orden: 5 };
    return { rango: "65+", orden: 6 };
  };

  const getRangoAntiguedad = (meses: number): { rango: string; orden: number } => {
    if (meses < 6) return { rango: "< 6 meses", orden: 1 };
    if (meses < 12) return { rango: "6-12 meses", orden: 2 };
    if (meses < 24) return { rango: "1-2 años", orden: 3 };
    if (meses < 60) return { rango: "2-5 años", orden: 4 };
    if (meses < 120) return { rango: "5-10 años", orden: 5 };
    return { rango: "10+ años", orden: 6 };
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
        .from("final_evaluation_results_consolidated")
        .select("colaborador_id, desempeno_porcentaje_promedio, potencial_porcentaje_promedio")
        .eq("periodo_id", periodo.id);

      if (!results || results.length === 0) {
        setError("No hay resultados de evaluación");
        return;
      }

      const colaboradorIds = results.map(r => r.colaborador_id);

      const { data: users } = await supabase
        .from("users")
        .select("dpi, edad, antiguedad, fecha_ingreso, genero, tipo_puesto, profesion, rol")
        .in("dpi", colaboradorIds);

      // Filtrar usuarios administrativos de monitoreo
      const validUsers = users?.filter(u => u.rol !== 'admin_general' && u.rol !== 'admin_rrhh') || [];

      if (!users) return;

      setTotalColaboradores(results.length);

      // Calcular promedios globales (usando datos consolidados)
      const allDesempeno = results.map(r => (r as any).desempeno_porcentaje_promedio ?? (r as any).desempeno_porcentaje ?? 0)
        .filter((v): v is number => v !== null && v > 0);
      const globalAvg = mean(allDesempeno);
      setPromedioGlobal(globalAvg);

      // Calcular antigüedad si no existe (en meses para cálculos internos, pero mostrar en años)
      const now = new Date();
      const usersWithAntiguedad = validUsers.map(u => {
        let antiguedad = u.antiguedad;
        if (!antiguedad && u.fecha_ingreso) {
          const fechaIngreso = new Date(u.fecha_ingreso);
          antiguedad = Math.floor((now.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 30));
        }
        return { ...u, antiguedad };
      });

      // Datos para scatter plots y correlaciones
      const edadData: Array<{ x: number; y: number }> = [];
      const antiguedadData: Array<{ x: number; y: number }> = [];
      const edades: number[] = [];
      const antiguedades: number[] = [];
      const desempenos: number[] = [];

      // Agrupar por rangos
      const resultsByEdad: Record<string, { desempeno: number[]; potencial: number[]; orden: number }> = {};
      const resultsByAntiguedad: Record<string, { desempeno: number[]; potencial: number[]; orden: number }> = {};

      results.forEach(r => {
        const user = usersWithAntiguedad.find(u => u.dpi === r.colaborador_id);
        const desempeno = (r as any).desempeno_porcentaje_promedio ?? (r as any).desempeno_porcentaje ?? 0;
        const potencial = (r as any).potencial_porcentaje_promedio ?? (r as any).potencial_porcentaje ?? 0;
        if (!user || !desempeno || desempeno <= 0) return;

        // Por edad
        if (user.edad) {
          const { rango, orden } = getRangoEdad(user.edad);
          if (!resultsByEdad[rango]) {
            resultsByEdad[rango] = { desempeno: [], potencial: [], orden };
          }
          resultsByEdad[rango].desempeno.push(desempeno);
          if (potencial > 0) resultsByEdad[rango].potencial.push(potencial);

          edadData.push({ x: user.edad, y: desempeno });
          edades.push(user.edad);
          desempenos.push(desempeno);
        }

        // Por antigüedad
        if (user.antiguedad !== null && user.antiguedad !== undefined) {
          const { rango, orden } = getRangoAntiguedad(user.antiguedad);
          if (!resultsByAntiguedad[rango]) {
            resultsByAntiguedad[rango] = { desempeno: [], potencial: [], orden };
          }
          resultsByAntiguedad[rango].desempeno.push(desempeno);
          if (potencial > 0) resultsByAntiguedad[rango].potencial.push(potencial);

          antiguedadData.push({ x: user.antiguedad, y: desempeno });
          antiguedades.push(user.antiguedad);
        }
      });

      setScatterData({ edad: edadData, antiguedad: antiguedadData });

      // Calcular estadísticas completas de edad y antigüedad
      if (edades.length > 0) {
        setPromedioEdad(mean(edades));
        setMedianaEdad(calcMedian(edades));
        const modaEdadCalc = calcMode(edades);
        setModaEdad(Array.isArray(modaEdadCalc) ? modaEdadCalc[0] : modaEdadCalc);
        setDesviacionEdad(standardDeviation(edades));
        setMinEdad(Math.min(...edades));
        setMaxEdad(Math.max(...edades));
        // Contar colaboradores jóvenes (< 30 años) y longevos (> 60 años)
        setCantidadJovenes(edades.filter(e => e < 30).length);
        setCantidadLongevos(edades.filter(e => e > 60).length);
      }
      if (antiguedades.length > 0) {
        setPromedioAntiguedad(mean(antiguedades));
        setMedianaAntiguedad(calcMedian(antiguedades));
        const modaAntiguedadCalc = calcMode(antiguedades);
        setModaAntiguedad(Array.isArray(modaAntiguedadCalc) ? modaAntiguedadCalc[0] : modaAntiguedadCalc);
        setDesviacionAntiguedad(standardDeviation(antiguedades));
        setMinAntiguedad(Math.min(...antiguedades));
        setMaxAntiguedad(Math.max(...antiguedades));
        // Contar colaboradores recientes (< 1 año) y antiguos (> 10 años)
        setCantidadRecientes(antiguedades.filter(a => a < 12).length); // menos de 12 meses = menos de 1 año
        setCantidadAntiguos(antiguedades.filter(a => a >= 120).length); // 120 meses = 10 años
      }

      // Calcular correlaciones
      const correlacionesCalc: CorrelacionData[] = [];

      if (edades.length > 5) {
        const corrEdad = pearsonCorrelation(edades, desempenos.slice(0, edades.length));
        correlacionesCalc.push({
          variable1: "Edad",
          variable2: "Desempeño",
          coeficiente: corrEdad,
          interpretacion: getCorrelationInterpretation(corrEdad),
        });
      }

      if (antiguedades.length > 5 && desempenos.length >= antiguedades.length) {
        // Filtrar para que coincidan
        const desempenosAntiguedad = results
          .filter(r => {
            const user = usersWithAntiguedad.find(u => u.dpi === r.colaborador_id);
            const desempeno = (r as any).desempeno_porcentaje_promedio ?? (r as any).desempeno_porcentaje ?? 0;
            return user?.antiguedad !== null && user?.antiguedad !== undefined && desempeno > 0;
          })
          .map(r => (r as any).desempeno_porcentaje_promedio ?? (r as any).desempeno_porcentaje ?? 0)
          .slice(0, antiguedades.length);

        if (desempenosAntiguedad.length === antiguedades.length) {
          const corrAntiguedad = pearsonCorrelation(antiguedades, desempenosAntiguedad);
          correlacionesCalc.push({
            variable1: "Antigüedad (años)",
            variable2: "Desempeño",
            coeficiente: corrAntiguedad,
            interpretacion: getCorrelationInterpretation(corrAntiguedad),
          });
        }
      }

      // Agregar correlación Potencial-Desempeño (el factor más importante)
      const potenciales = results
        .map(r => (r as any).potencial_porcentaje_promedio ?? (r as any).potencial_porcentaje ?? null)
        .filter((v): v is number => v !== null && v > 0);
      const desempenosPotencial = results
        .map(r => (r as any).desempeno_porcentaje_promedio ?? (r as any).desempeno_porcentaje ?? null)
        .filter((v): v is number => v !== null && v > 0)
        .slice(0, potenciales.length);

      if (potenciales.length >= 10 && desempenosPotencial.length === potenciales.length) {
        const corrPotencial = pearsonCorrelation(potenciales, desempenosPotencial);
        correlacionesCalc.unshift({ // Agregar al inicio porque es el más importante
          variable1: "Potencial",
          variable2: "Desempeño",
          coeficiente: corrPotencial,
          interpretacion: getCorrelationInterpretation(corrPotencial),
        });
      }

      if (edades.length > 5 && antiguedades.length > 5) {
        // Correlación edad-antigüedad (solo donde ambos existan)
        const paired = results
          .map(r => {
            const user = usersWithAntiguedad.find(u => u.dpi === r.colaborador_id);
            if (user?.edad && user?.antiguedad !== null && user?.antiguedad !== undefined) {
              return { edad: user.edad, antiguedad: user.antiguedad };
            }
            return null;
          })
          .filter((p): p is { edad: number; antiguedad: number } => p !== null);

        if (paired.length > 5) {
          const corrEdadAnt = pearsonCorrelation(
            paired.map(p => p.edad),
            paired.map(p => p.antiguedad)
          );
          correlacionesCalc.push({
            variable1: "Edad",
            variable2: "Antigüedad",
            coeficiente: corrEdadAnt,
            interpretacion: getCorrelationInterpretation(corrEdadAnt),
          });
        }
      }

      setCorrelaciones(correlacionesCalc);

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

      // Procesar rangos de edad
      const edadStats: RangoStats[] = Object.entries(resultsByEdad)
        .map(([rango, data]) => ({
          rango,
          orden: data.orden,
          cantidad: data.desempeno.length,
          desempeno: calcStats(data.desempeno),
          potencial: calcStats(data.potencial),
          diferenciaVsGlobal: calcStats(data.desempeno).promedio - globalAvg,
        }))
        .sort((a, b) => a.orden - b.orden);

      // Procesar rangos de antigüedad
      const antiguedadStats: RangoStats[] = Object.entries(resultsByAntiguedad)
        .map(([rango, data]) => ({
          rango,
          orden: data.orden,
          cantidad: data.desempeno.length,
          desempeno: calcStats(data.desempeno),
          potencial: calcStats(data.potencial),
          diferenciaVsGlobal: calcStats(data.desempeno).promedio - globalAvg,
        }))
        .sort((a, b) => a.orden - b.orden);

      setRangosEdad(edadStats);
      setRangosAntiguedad(antiguedadStats);

      // ═══════════════════════════════════════════════════════════════════════════════
      // NUEVOS ANÁLISIS DEMOGRÁFICOS
      // ═══════════════════════════════════════════════════════════════════════════════

      // Procesar datos por GÉNERO
      const resultsByGenero: Record<string, { desempeno: number[]; potencial: number[] }> = {};
      results.forEach(r => {
        const user = validUsers.find(u => u.dpi === r.colaborador_id);
        const desempeno = (r as any).desempeno_porcentaje_promedio ?? (r as any).desempeno_porcentaje ?? 0;
        const potencial = (r as any).potencial_porcentaje_promedio ?? (r as any).potencial_porcentaje ?? 0;
        if (!user || !desempeno || desempeno <= 0 || !user.genero) return;

        const generoNormalizado = user.genero.toLowerCase() === 'masculino' ? 'Masculino' :
                                  user.genero.toLowerCase() === 'femenino' ? 'Femenino' : user.genero;

        if (!resultsByGenero[generoNormalizado]) {
          resultsByGenero[generoNormalizado] = { desempeno: [], potencial: [] };
        }
        resultsByGenero[generoNormalizado].desempeno.push(desempeno);
        if (potencial > 0) resultsByGenero[generoNormalizado].potencial.push(potencial);
      });

      const totalConGenero = Object.values(resultsByGenero).reduce((sum, g) => sum + g.desempeno.length, 0);
      const generoStatsCalc: GeneroStats[] = Object.entries(resultsByGenero)
        .map(([genero, data]) => ({
          genero,
          cantidad: data.desempeno.length,
          porcentaje: (data.desempeno.length / totalConGenero) * 100,
          desempeno: calcStats(data.desempeno),
          potencial: calcStats(data.potencial),
          diferenciaVsGlobal: calcStats(data.desempeno).promedio - globalAvg,
        }))
        .sort((a, b) => b.cantidad - a.cantidad);

      setGeneroStats(generoStatsCalc);

      // Procesar datos por TIPO DE PUESTO
      const resultsByTipoPuesto: Record<string, { desempeno: number[]; potencial: number[] }> = {};
      results.forEach(r => {
        const user = validUsers.find(u => u.dpi === r.colaborador_id);
        const desempeno = (r as any).desempeno_porcentaje_promedio ?? (r as any).desempeno_porcentaje ?? 0;
        const potencial = (r as any).potencial_porcentaje_promedio ?? (r as any).potencial_porcentaje ?? 0;
        if (!user || !desempeno || desempeno <= 0 || !user.tipo_puesto) return;

        const tipoNormalizado = user.tipo_puesto.charAt(0).toUpperCase() + user.tipo_puesto.slice(1).toLowerCase();

        if (!resultsByTipoPuesto[tipoNormalizado]) {
          resultsByTipoPuesto[tipoNormalizado] = { desempeno: [], potencial: [] };
        }
        resultsByTipoPuesto[tipoNormalizado].desempeno.push(desempeno);
        if (potencial > 0) resultsByTipoPuesto[tipoNormalizado].potencial.push(potencial);
      });

      const totalConTipoPuesto = Object.values(resultsByTipoPuesto).reduce((sum, t) => sum + t.desempeno.length, 0);
      const tipoPuestoStatsCalc: TipoPuestoStats[] = Object.entries(resultsByTipoPuesto)
        .map(([tipo, data]) => ({
          tipo,
          cantidad: data.desempeno.length,
          porcentaje: (data.desempeno.length / totalConTipoPuesto) * 100,
          desempeno: calcStats(data.desempeno),
          potencial: calcStats(data.potencial),
          diferenciaVsGlobal: calcStats(data.desempeno).promedio - globalAvg,
        }))
        .sort((a, b) => b.cantidad - a.cantidad);

      setTipoPuestoStats(tipoPuestoStatsCalc);

      // Procesar datos por NIVEL EDUCATIVO (agrupando profesiones)
      const getNivelEducativo = (profesion: string | null): string => {
        if (!profesion) return "Sin información";
        const prof = profesion.toLowerCase();

        // Nivel Universitario
        if (prof.includes('ingeniero') || prof.includes('licenciado') || prof.includes('abogado') ||
            prof.includes('arquitecto') || prof.includes('doctor') || prof.includes('médico') ||
            prof.includes('contador público')) {
          return "Universitario";
        }
        // Nivel Técnico/Perito
        if (prof.includes('perito') || prof.includes('técnico') || prof.includes('secretaria')) {
          return "Técnico/Perito";
        }
        // Nivel Diversificado/Bachiller
        if (prof.includes('bachiller') || prof.includes('diversificado') || prof.includes('magisterio')) {
          return "Diversificado";
        }
        // Nivel Básico/Primaria
        if (prof.includes('básico') || prof.includes('primaria')) {
          return "Educación Básica";
        }
        // Oficios y otros
        if (prof.includes('labrador') || prof.includes('agricultor') || prof.includes('albañil') ||
            prof.includes('piloto') || prof.includes('comerciante') || prof.includes('jardinero') ||
            prof.includes('mecánico') || prof.includes('electricista') || prof.includes('carpintero') ||
            prof.includes('soldador') || prof.includes('operador')) {
          return "Oficios/Ocupaciones";
        }

        return "Otros";
      };

      const resultsByNivelEducativo: Record<string, { desempeno: number[] }> = {};
      results.forEach(r => {
        const user = validUsers.find(u => u.dpi === r.colaborador_id);
        const desempeno = (r as any).desempeno_porcentaje_promedio ?? (r as any).desempeno_porcentaje ?? 0;
        if (!user || !desempeno || desempeno <= 0) return;

        const nivel = getNivelEducativo(user.profesion);

        if (!resultsByNivelEducativo[nivel]) {
          resultsByNivelEducativo[nivel] = { desempeno: [] };
        }
        resultsByNivelEducativo[nivel].desempeno.push(desempeno);
      });

      const totalConNivel = Object.values(resultsByNivelEducativo).reduce((sum, n) => sum + n.desempeno.length, 0);
      const nivelEducativoStatsCalc: NivelEducativoStats[] = Object.entries(resultsByNivelEducativo)
        .map(([nivel, data]) => ({
          nivel,
          cantidad: data.desempeno.length,
          porcentaje: (data.desempeno.length / totalConNivel) * 100,
          desempeno: calcStats(data.desempeno),
          diferenciaVsGlobal: calcStats(data.desempeno).promedio - globalAvg,
        }))
        .sort((a, b) => b.cantidad - a.cantidad);

      setNivelEducativoStats(nivelEducativoStatsCalc);

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

  // Box plots para edad
  const boxPlotEdad: BoxPlotData[] = rangosEdad
    .filter(r => r.cantidad >= 3)
    .map(r => ({
      segment: r.rango,
      min: r.desempeno.min,
      q1: r.desempeno.q1,
      median: r.desempeno.mediana,
      q3: r.desempeno.q3,
      max: r.desempeno.max,
      mean: r.desempeno.promedio,
    }));

  // Box plots para antigüedad
  const boxPlotAntiguedad: BoxPlotData[] = rangosAntiguedad
    .filter(r => r.cantidad >= 3)
    .map(r => ({
      segment: r.rango,
      min: r.desempeno.min,
      q1: r.desempeno.q1,
      median: r.desempeno.mediana,
      q3: r.desempeno.q3,
      max: r.desempeno.max,
      mean: r.desempeno.promedio,
    }));

  // Stats tables
  const statsTableEdad = rangosEdad.map(r => ({
    segmento: r.rango,
    stats: r.desempeno,
    n: r.cantidad,
  }));

  const statsTableAntiguedad = rangosAntiguedad.map(r => ({
    segmento: r.rango,
    stats: r.desempeno,
    n: r.cantidad,
  }));

  // Treemaps
  const treemapEdad: TreemapNode[] = rangosEdad.map(r => ({
    name: r.rango,
    value: r.cantidad,
  }));

  const treemapAntiguedad: TreemapNode[] = rangosAntiguedad.map(r => ({
    name: r.rango,
    value: r.cantidad,
  }));

  // Rankings
  const rankingEdad = [...rangosEdad]
    .sort((a, b) => b.desempeno.promedio - a.desempeno.promedio)
    .map((r, i) => ({
      nombre: r.rango,
      desempeno: r.desempeno.promedio,
      ranking: i + 1,
    }));

  const rankingAntiguedad = [...rangosAntiguedad]
    .sort((a, b) => b.desempeno.promedio - a.desempeno.promedio)
    .map((r, i) => ({
      nombre: r.rango,
      desempeno: r.desempeno.promedio,
      ranking: i + 1,
    }));

  // Mejor y peor rango
  const mejorEdad = rankingEdad[0];
  const peorEdad = rankingEdad[rankingEdad.length - 1];
  const mejorAntiguedad = rankingAntiguedad[0];
  const peorAntiguedad = rankingAntiguedad[rankingAntiguedad.length - 1];

  const totalEdad = rangosEdad.reduce((sum, r) => sum + r.cantidad, 0);
  const totalAntiguedad = rangosAntiguedad.reduce((sum, r) => sum + r.cantidad, 0);

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
              <Users2 className="h-8 w-8" />
              Análisis Demográfico Detallado
            </h1>
            <p className="text-muted-foreground mt-1">Período: <span className="font-semibold">{periodoNombre}</span></p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Análisis Integral</p>
            <p className="font-semibold">{totalColaboradores} colaboradores</p>
          </div>
        </div>

        {/* KPIs globales - Resumen demográfico */}
        <div className="space-y-6">
          {/* Primera fila: Métricas principales */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              title="Desempeño Global"
              value={promedioGlobal}
              format="percentage"
              subtitle="promedio"
              color="primary"
            />
            <StatCard
              title="Antigüedad Prom."
              value={promedioAntiguedad / 12}
              format="decimal"
              subtitle="años"
            />
            <StatCard
              title="Edad Promedio"
              value={promedioEdad}
              format="decimal"
              subtitle="años"
            />
            {generoStats.length > 0 && (
              <StatCard
                title="% Masculino"
                value={generoStats.find(g => g.genero === 'Masculino')?.porcentaje || 0}
                format="percentage"
                subtitle={`${generoStats.find(g => g.genero === 'Masculino')?.cantidad || 0} colaboradores`}
              />
            )}
            {generoStats.length > 0 && (
              <StatCard
                title="% Femenino"
                value={generoStats.find(g => g.genero === 'Femenino')?.porcentaje || 0}
                format="percentage"
                subtitle={`${generoStats.find(g => g.genero === 'Femenino')?.cantidad || 0} colaboradores`}
              />
            )}
            {tipoPuestoStats.length > 0 && (
              <StatCard
                title="% Operativo"
                value={tipoPuestoStats.find(t => t.tipo === 'Operativo')?.porcentaje || 0}
                format="percentage"
                subtitle={`${tipoPuestoStats.find(t => t.tipo === 'Operativo')?.cantidad || 0} colaboradores`}
              />
            )}
          </div>

          {/* Segunda fila: Estadísticas robustas de Edad */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Caracterización Demográfica: Edad</CardTitle>
              <CardDescription>Medidas de tendencia central y dispersión para caracterizar completamente la población</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="Promedio"
                  value={promedioEdad}
                  format="decimal"
                  subtitle="años"
                  color={Math.abs(promedioEdad - medianaEdad) > 3 ? "warning" : "default"}
                />
                <StatCard
                  title="Mediana"
                  value={medianaEdad}
                  format="decimal"
                  subtitle="años"
                  color="success"
                />
                <StatCard
                  title="Moda"
                  value={modaEdad}
                  format="decimal"
                  subtitle="años"
                />
                <StatCard
                  title="Desv. Estándar"
                  value={desviacionEdad}
                  format="decimal"
                  subtitle="años"
                  color={desviacionEdad > 15 ? "warning" : "default"}
                />
              </div>
              {Math.abs(promedioEdad - medianaEdad) > 3 && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Distribución asimétrica:</strong> La diferencia entre promedio ({promedioEdad.toFixed(1)} años) y mediana ({medianaEdad.toFixed(1)} años) 
                    indica una distribución asimétrica. La mediana es más representativa del empleado típico.
                    {desviacionEdad > 15 && ` Alta dispersión (σ = ${desviacionEdad.toFixed(1)} años) sugiere una población muy heterogénea en edad.`}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Tercera fila: Estadísticas robustas de Antigüedad */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Caracterización Demográfica: Antigüedad</CardTitle>
              <CardDescription>Medidas de tendencia central y dispersión para caracterizar completamente la antigüedad del personal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="Promedio"
                  value={promedioAntiguedad / 12}
                  format="decimal"
                  subtitle="años"
                  color={Math.abs((promedioAntiguedad / 12) - (medianaAntiguedad / 12)) > 2 ? "warning" : "default"}
                />
                <StatCard
                  title="Mediana"
                  value={medianaAntiguedad / 12}
                  format="decimal"
                  subtitle="años"
                  color="success"
                />
                <StatCard
                  title="Moda"
                  value={modaAntiguedad / 12}
                  format="decimal"
                  subtitle="años"
                />
                <StatCard
                  title="Desv. Estándar"
                  value={desviacionAntiguedad / 12}
                  format="decimal"
                  subtitle="años"
                  color={(desviacionAntiguedad / 12) > 5 ? "warning" : "default"}
                />
              </div>
              {Math.abs((promedioAntiguedad / 12) - (medianaAntiguedad / 12)) > 2 && (
                <Alert className="mt-4" variant="warning">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Distribución muy asimétrica:</strong> La diferencia significativa entre promedio ({(promedioAntiguedad / 12).toFixed(1)} años) 
                    y mediana ({(medianaAntiguedad / 12).toFixed(1)} años) indica que hay muchos empleados nuevos y algunos muy antiguos. 
                    La mediana ({(medianaAntiguedad / 12).toFixed(1)} años) es más representativa del empleado típico. 
                    La moda ({(modaAntiguedad / 12).toFixed(1)} años) muestra el valor más frecuente.
                    {(desviacionAntiguedad / 12) > 5 && ` Alta dispersión (σ = ${(desviacionAntiguedad / 12).toFixed(1)} años) confirma heterogeneidad en antigüedad.`}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Cuarta fila: Extremos y rangos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Extremos de Edad */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Extremos de Edad</CardTitle>
                <CardDescription>Colaboradores más jóvenes y más longevos de la organización</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    title="Más Joven"
                    value={minEdad}
                    format="decimal"
                    subtitle="años"
                    color="info"
                  />
                  <StatCard
                    title="Más Longevo"
                    value={maxEdad}
                    format="decimal"
                    subtitle="años"
                    color="info"
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700 font-medium">Colaboradores Jóvenes</p>
                    <p className="text-2xl font-bold text-blue-900">{cantidadJovenes}</p>
                    <p className="text-xs text-blue-600">Menores de 30 años</p>
                    <p className="text-xs text-blue-500 mt-1">
                      {totalColaboradores > 0 ? ((cantidadJovenes / totalColaboradores) * 100).toFixed(1) : 0}% del total
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-700 font-medium">Colaboradores Longevos</p>
                    <p className="text-2xl font-bold text-purple-900">{cantidadLongevos}</p>
                    <p className="text-xs text-purple-600">Mayores de 60 años</p>
                    <p className="text-xs text-purple-500 mt-1">
                      {totalColaboradores > 0 ? ((cantidadLongevos / totalColaboradores) * 100).toFixed(1) : 0}% del total
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Rango de edad:</strong> {minEdad.toFixed(0)} - {maxEdad.toFixed(0)} años 
                    (diferencia de {(maxEdad - minEdad).toFixed(0)} años)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Extremos de Antigüedad */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Extremos de Antigüedad</CardTitle>
                <CardDescription>Colaboradores más recientes y más antiguos de la organización</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    title="Más Reciente"
                    value={minAntiguedad / 12}
                    format="decimal"
                    subtitle="años"
                    color="info"
                  />
                  <StatCard
                    title="Más Antiguo"
                    value={maxAntiguedad / 12}
                    format="decimal"
                    subtitle="años"
                    color="info"
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700 font-medium">Colaboradores Recientes</p>
                    <p className="text-2xl font-bold text-green-900">{cantidadRecientes}</p>
                    <p className="text-xs text-green-600">Menos de 1 año</p>
                    <p className="text-xs text-green-500 mt-1">
                      {totalColaboradores > 0 ? ((cantidadRecientes / totalColaboradores) * 100).toFixed(1) : 0}% del total
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-700 font-medium">Colaboradores Antiguos</p>
                    <p className="text-2xl font-bold text-amber-900">{cantidadAntiguos}</p>
                    <p className="text-xs text-amber-600">Más de 10 años</p>
                    <p className="text-xs text-amber-500 mt-1">
                      {totalColaboradores > 0 ? ((cantidadAntiguos / totalColaboradores) * 100).toFixed(1) : 0}% del total
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Rango de antigüedad:</strong> {(minAntiguedad / 12).toFixed(2)} - {(maxAntiguedad / 12).toFixed(2)} años 
                    (diferencia de {((maxAntiguedad - minAntiguedad) / 12).toFixed(2)} años)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Correlaciones */}
        {correlaciones.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Correlaciones</CardTitle>
              <CardDescription>Relación entre variables demográficas y desempeño</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {correlaciones.map((corr, idx) => (
                  <CorrelationInterpretation
                    key={idx}
                    variable1={corr.variable1}
                    variable2={corr.variable2}
                    coefficient={corr.coeficiente}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs para todas las variables demográficas */}
        <Tabs defaultValue="genero" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="genero" className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              Género
            </TabsTrigger>
            <TabsTrigger value="tipo-puesto" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Tipo Puesto
            </TabsTrigger>
            <TabsTrigger value="educacion" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Educación
            </TabsTrigger>
            <TabsTrigger value="edad" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Edad
            </TabsTrigger>
            <TabsTrigger value="antiguedad" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Antigüedad
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          {/* TAB GÉNERO */}
          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="genero" className="space-y-6 mt-6">
            {generoStats.length > 0 ? (
              <>
                {/* KPIs de Género */}
                <StatCardGrid columns={4}>
                  {generoStats.map(g => (
                    <StatCard
                      key={g.genero}
                      title={g.genero}
                      value={g.desempeno.promedio}
                      format="percentage"
                      subtitle={`${g.cantidad} colaboradores (${g.porcentaje.toFixed(1)}%)`}
                      color={g.diferenciaVsGlobal >= 0 ? "success" : "danger"}
                    />
                  ))}
                  <StatCard
                    title="Brecha de Género"
                    value={Math.abs((generoStats[0]?.desempeno.promedio || 0) - (generoStats[1]?.desempeno.promedio || 0))}
                    format="decimal"
                    subtitle="puntos porcentuales"
                    color={Math.abs((generoStats[0]?.desempeno.promedio || 0) - (generoStats[1]?.desempeno.promedio || 0)) > 5 ? "warning" : "success"}
                  />
                </StatCardGrid>

                {/* Gráfico de brechas por género */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCircle className="h-5 w-5" />
                      Comparativa de Desempeño por Género
                    </CardTitle>
                    <CardDescription>Diferencia respecto al promedio global ({promedioGlobal.toFixed(1)}%)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {generoStats.map(g => (
                        <div key={g.genero} className="flex items-center gap-4">
                          <div className="w-24 font-medium">{g.genero}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-8 rounded ${g.diferenciaVsGlobal >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(Math.abs(g.diferenciaVsGlobal) * 5, 100)}%` }}
                              />
                              <span className={`font-semibold ${g.diferenciaVsGlobal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {g.diferenciaVsGlobal >= 0 ? '+' : ''}{g.diferenciaVsGlobal.toFixed(2)} pts
                              </span>
                            </div>
                          </div>
                          <div className="w-20 text-right font-bold">{g.desempeno.promedio.toFixed(1)}%</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Distribución y estadísticas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TreemapChart
                    data={generoStats.map(g => ({ name: g.genero, value: g.cantidad }))}
                    title="Distribución por Género"
                    description="Proporción de colaboradores por género"
                  />
                  <Card>
                    <CardHeader>
                      <CardTitle>Estadísticas Detalladas por Género</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Género</th>
                              <th className="text-right py-2">N</th>
                              <th className="text-right py-2">Promedio</th>
                              <th className="text-right py-2">Mediana</th>
                              <th className="text-right py-2">Desv. Est.</th>
                              <th className="text-right py-2">Min</th>
                              <th className="text-right py-2">Max</th>
                            </tr>
                          </thead>
                          <tbody>
                            {generoStats.map(g => (
                              <tr key={g.genero} className="border-b">
                                <td className="py-2 font-medium">{g.genero}</td>
                                <td className="text-right py-2">{g.cantidad}</td>
                                <td className="text-right py-2 font-semibold">{g.desempeno.promedio.toFixed(1)}%</td>
                                <td className="text-right py-2">{g.desempeno.mediana.toFixed(1)}%</td>
                                <td className="text-right py-2">{g.desempeno.desviacion.toFixed(2)}</td>
                                <td className="text-right py-2">{g.desempeno.min.toFixed(1)}%</td>
                                <td className="text-right py-2">{g.desempeno.max.toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Interpretación */}
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold text-purple-800 flex items-center gap-2 mb-3">
                      <UserCircle className="h-5 w-5" />
                      Análisis de Equidad de Género
                    </h4>
                    <ul className="space-y-2 text-sm text-purple-700">
                      <li>
                        La brecha de género en desempeño es de{" "}
                        <strong>{Math.abs((generoStats[0]?.desempeno.promedio || 0) - (generoStats[1]?.desempeno.promedio || 0)).toFixed(2)} puntos</strong>.
                        {Math.abs((generoStats[0]?.desempeno.promedio || 0) - (generoStats[1]?.desempeno.promedio || 0)) <= 3
                          ? " Esta diferencia es estadísticamente pequeña."
                          : " Esta diferencia merece atención y análisis adicional."}
                      </li>
                      <li>
                        La representación femenina es del {generoStats.find(g => g.genero === 'Femenino')?.porcentaje.toFixed(1)}% de la fuerza laboral evaluada.
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Sin datos de género</AlertTitle>
                <AlertDescription>No hay información de género disponible para los colaboradores evaluados.</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          {/* TAB TIPO DE PUESTO */}
          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="tipo-puesto" className="space-y-6 mt-6">
            {tipoPuestoStats.length > 0 ? (
              <>
                {/* KPIs de Tipo de Puesto */}
                <StatCardGrid columns={4}>
                  {tipoPuestoStats.map(t => (
                    <StatCard
                      key={t.tipo}
                      title={t.tipo}
                      value={t.desempeno.promedio}
                      format="percentage"
                      subtitle={`${t.cantidad} colaboradores (${t.porcentaje.toFixed(1)}%)`}
                      color={t.diferenciaVsGlobal >= 0 ? "success" : "danger"}
                    />
                  ))}
                  <StatCard
                    title="Brecha Tipo Puesto"
                    value={Math.abs((tipoPuestoStats[0]?.desempeno.promedio || 0) - (tipoPuestoStats[1]?.desempeno.promedio || 0))}
                    format="decimal"
                    subtitle="puntos porcentuales"
                  />
                </StatCardGrid>

                {/* Comparativa */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Comparativa de Desempeño por Tipo de Puesto
                    </CardTitle>
                    <CardDescription>Diferencia respecto al promedio global ({promedioGlobal.toFixed(1)}%)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {tipoPuestoStats.map(t => (
                        <div key={t.tipo} className="flex items-center gap-4">
                          <div className="w-28 font-medium">{t.tipo}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-8 rounded ${t.diferenciaVsGlobal >= 0 ? 'bg-blue-500' : 'bg-orange-500'}`}
                                style={{ width: `${Math.min(Math.abs(t.diferenciaVsGlobal) * 5, 100)}%` }}
                              />
                              <span className={`font-semibold ${t.diferenciaVsGlobal >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                {t.diferenciaVsGlobal >= 0 ? '+' : ''}{t.diferenciaVsGlobal.toFixed(2)} pts
                              </span>
                            </div>
                          </div>
                          <div className="w-20 text-right font-bold">{t.desempeno.promedio.toFixed(1)}%</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Distribución y estadísticas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TreemapChart
                    data={tipoPuestoStats.map(t => ({ name: t.tipo, value: t.cantidad }))}
                    title="Distribución por Tipo de Puesto"
                    description="Proporción de colaboradores por tipo"
                  />
                  <Card>
                    <CardHeader>
                      <CardTitle>Estadísticas por Tipo de Puesto</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Tipo</th>
                              <th className="text-right py-2">N</th>
                              <th className="text-right py-2">Promedio</th>
                              <th className="text-right py-2">Mediana</th>
                              <th className="text-right py-2">Desv. Est.</th>
                              <th className="text-right py-2">Q1</th>
                              <th className="text-right py-2">Q3</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tipoPuestoStats.map(t => (
                              <tr key={t.tipo} className="border-b">
                                <td className="py-2 font-medium">{t.tipo}</td>
                                <td className="text-right py-2">{t.cantidad}</td>
                                <td className="text-right py-2 font-semibold">{t.desempeno.promedio.toFixed(1)}%</td>
                                <td className="text-right py-2">{t.desempeno.mediana.toFixed(1)}%</td>
                                <td className="text-right py-2">{t.desempeno.desviacion.toFixed(2)}</td>
                                <td className="text-right py-2">{t.desempeno.q1.toFixed(1)}%</td>
                                <td className="text-right py-2">{t.desempeno.q3.toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Interpretación */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold text-blue-800 flex items-center gap-2 mb-3">
                      <Briefcase className="h-5 w-5" />
                      Análisis por Tipo de Puesto
                    </h4>
                    <ul className="space-y-2 text-sm text-blue-700">
                      <li>
                        El personal <strong>{tipoPuestoStats[0]?.tipo}</strong> representa el {tipoPuestoStats[0]?.porcentaje.toFixed(1)}%
                        con un desempeño promedio de {tipoPuestoStats[0]?.desempeno.promedio.toFixed(1)}%.
                      </li>
                      <li>
                        La brecha entre tipos de puesto es de{" "}
                        <strong>{Math.abs((tipoPuestoStats[0]?.desempeno.promedio || 0) - (tipoPuestoStats[1]?.desempeno.promedio || 0)).toFixed(2)} puntos</strong>.
                      </li>
                      <li>
                        La dispersión (desviación estándar) del personal operativo es {tipoPuestoStats.find(t => t.tipo === 'Operativo')?.desempeno.desviacion.toFixed(2)}
                        vs {tipoPuestoStats.find(t => t.tipo === 'Administrativo')?.desempeno.desviacion.toFixed(2)} del administrativo.
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Sin datos de tipo de puesto</AlertTitle>
                <AlertDescription>No hay información de tipo de puesto disponible.</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          {/* TAB NIVEL EDUCATIVO */}
          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="educacion" className="space-y-6 mt-6">
            {nivelEducativoStats.length > 0 ? (
              <>
                {/* KPIs de Nivel Educativo */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {nivelEducativoStats.slice(0, 6).map(n => (
                    <StatCard
                      key={n.nivel}
                      title={n.nivel}
                      value={n.desempeno.promedio}
                      format="percentage"
                      subtitle={`${n.cantidad} (${n.porcentaje.toFixed(0)}%)`}
                      color={n.diferenciaVsGlobal >= 0 ? "success" : "danger"}
                    />
                  ))}
                </div>

                {/* Ranking por nivel educativo */}
                <DireccionRankingChart
                  direcciones={nivelEducativoStats.map((n, i) => ({
                    nombre: n.nivel,
                    desempeno: n.desempeno.promedio,
                    ranking: i + 1,
                  }))}
                  title="Ranking por Nivel Educativo"
                  metric="desempeno"
                />

                {/* Distribución y estadísticas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TreemapChart
                    data={nivelEducativoStats.map(n => ({ name: n.nivel, value: n.cantidad }))}
                    title="Distribución por Nivel Educativo"
                    description="Proporción de colaboradores por nivel"
                  />
                  <Card>
                    <CardHeader>
                      <CardTitle>Estadísticas por Nivel Educativo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Nivel</th>
                              <th className="text-right py-2">N</th>
                              <th className="text-right py-2">%</th>
                              <th className="text-right py-2">Promedio</th>
                              <th className="text-right py-2">vs Global</th>
                            </tr>
                          </thead>
                          <tbody>
                            {nivelEducativoStats.map(n => (
                              <tr key={n.nivel} className="border-b">
                                <td className="py-2 font-medium">{n.nivel}</td>
                                <td className="text-right py-2">{n.cantidad}</td>
                                <td className="text-right py-2">{n.porcentaje.toFixed(1)}%</td>
                                <td className="text-right py-2 font-semibold">{n.desempeno.promedio.toFixed(1)}%</td>
                                <td className={`text-right py-2 font-semibold ${n.diferenciaVsGlobal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {n.diferenciaVsGlobal >= 0 ? '+' : ''}{n.diferenciaVsGlobal.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Interpretación */}
                <Card className="bg-emerald-50 border-emerald-200">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold text-emerald-800 flex items-center gap-2 mb-3">
                      <GraduationCap className="h-5 w-5" />
                      Análisis por Nivel Educativo
                    </h4>
                    <ul className="space-y-2 text-sm text-emerald-700">
                      <li>
                        El nivel educativo con mejor desempeño es <strong>{nivelEducativoStats[0]?.nivel}</strong> con
                        un promedio de {nivelEducativoStats[0]?.desempeno.promedio.toFixed(1)}%.
                      </li>
                      <li>
                        La categoría más grande es <strong>{
                          nivelEducativoStats.reduce((max, n) => n.cantidad > max.cantidad ? n : max, nivelEducativoStats[0])?.nivel
                        }</strong> con {
                          nivelEducativoStats.reduce((max, n) => n.cantidad > max.cantidad ? n : max, nivelEducativoStats[0])?.cantidad
                        } colaboradores.
                      </li>
                      <li>
                        La brecha entre el mejor y peor nivel es de{" "}
                        <strong>{(nivelEducativoStats[0]?.desempeno.promedio - nivelEducativoStats[nivelEducativoStats.length - 1]?.desempeno.promedio).toFixed(2)} puntos</strong>.
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Sin datos de nivel educativo</AlertTitle>
                <AlertDescription>No hay información de profesión/nivel educativo disponible.</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Tab Edad */}
          <TabsContent value="edad" className="space-y-6 mt-6">
            <StatCardGrid columns={3}>
              <StatCard
                title="Mejor Rango (Edad)"
                value={mejorEdad?.desempeno || 0}
                format="percentage"
                subtitle={mejorEdad?.nombre || "-"}
                color="success"
              />
              <StatCard
                title="Peor Rango (Edad)"
                value={peorEdad?.desempeno || 0}
                format="percentage"
                subtitle={peorEdad?.nombre || "-"}
                color="danger"
              />
              <StatCard
                title="Brecha Edad"
                value={(mejorEdad?.desempeno || 0) - (peorEdad?.desempeno || 0)}
                format="decimal"
                subtitle="puntos porcentuales"
              />
            </StatCardGrid>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DireccionRankingChart
                direcciones={rankingEdad}
                title="Ranking por Rango de Edad"
                metric="desempeno"
              />
              <TreemapChart
                data={treemapEdad}
                title="Distribución por Rango de Edad"
                description="Tamaño proporcional a la cantidad de colaboradores"
              />
            </div>

            {boxPlotEdad.length > 0 && (
              <BoxPlotChart
                data={boxPlotEdad}
                title="Distribución de Desempeño por Rango de Edad"
                description="Dispersión de calificaciones en cada grupo etario"
                yLabel="Desempeño (%)"
              />
            )}

            {scatterData.edad.length > 0 && (
              <ScatterPlotCorrelation
                data={scatterData.edad}
                title="Correlación Edad vs Desempeño"
                xLabel="Edad (años)"
                yLabel="Desempeño (%)"
                showRegression
              />
            )}

            <StatsTable
              data={statsTableEdad}
              title="Estadísticas por Rango de Edad"
              showPercentiles
              showBoxPlot
            />
          </TabsContent>

          {/* Tab Antigüedad */}
          <TabsContent value="antiguedad" className="space-y-6 mt-6">
            <StatCardGrid columns={3}>
              <StatCard
                title="Mejor Rango (Antigüedad)"
                value={mejorAntiguedad?.desempeno || 0}
                format="percentage"
                subtitle={mejorAntiguedad?.nombre || "-"}
                color="success"
              />
              <StatCard
                title="Peor Rango (Antigüedad)"
                value={peorAntiguedad?.desempeno || 0}
                format="percentage"
                subtitle={peorAntiguedad?.nombre || "-"}
                color="danger"
              />
              <StatCard
                title="Brecha Antigüedad"
                value={(mejorAntiguedad?.desempeno || 0) - (peorAntiguedad?.desempeno || 0)}
                format="decimal"
                subtitle="puntos porcentuales"
              />
            </StatCardGrid>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DireccionRankingChart
                direcciones={rankingAntiguedad}
                title="Ranking por Rango de Antigüedad"
                metric="desempeno"
              />
              <TreemapChart
                data={treemapAntiguedad}
                title="Distribución por Antigüedad"
                description="Tamaño proporcional a la cantidad de colaboradores"
              />
            </div>

            {boxPlotAntiguedad.length > 0 && (
              <BoxPlotChart
                data={boxPlotAntiguedad}
                title="Distribución de Desempeño por Antigüedad"
                description="Dispersión de calificaciones según tiempo en la organización"
                yLabel="Desempeño (%)"
              />
            )}

            {scatterData.antiguedad.length > 0 && (
              <ScatterPlotCorrelation
                data={scatterData.antiguedad.map(p => ({ x: p.x / 12, y: p.y }))}
                title="Correlación Antigüedad vs Desempeño"
                xLabel="Antigüedad (años)"
                yLabel="Desempeño (%)"
                showRegression
              />
            )}

            <StatsTable
              data={statsTableAntiguedad}
              title="Estadísticas por Rango de Antigüedad"
              showPercentiles
              showBoxPlot
            />
          </TabsContent>
        </Tabs>

        {/* Interpretación Final - Resumen Ejecutivo Demográfico */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users2 className="h-6 w-6" />
              Resumen Ejecutivo del Análisis Demográfico
            </CardTitle>
            <CardDescription>Hallazgos principales y recomendaciones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Grid de 4 resúmenes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Género */}
              {generoStats.length > 0 && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-800 flex items-center gap-2 mb-2">
                    <UserCircle className="h-4 w-4" />
                    Género
                  </h4>
                  <ul className="space-y-1 text-xs text-purple-700">
                    <li>Brecha: <strong>{Math.abs((generoStats[0]?.desempeno.promedio || 0) - (generoStats[1]?.desempeno.promedio || 0)).toFixed(1)} pts</strong></li>
                    <li>Mejor: {generoStats[0]?.genero} ({generoStats[0]?.desempeno.promedio.toFixed(1)}%)</li>
                    <li>Representación F: {generoStats.find(g => g.genero === 'Femenino')?.porcentaje.toFixed(0)}%</li>
                  </ul>
                </div>
              )}

              {/* Tipo Puesto */}
              {tipoPuestoStats.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 flex items-center gap-2 mb-2">
                    <Briefcase className="h-4 w-4" />
                    Tipo Puesto
                  </h4>
                  <ul className="space-y-1 text-xs text-blue-700">
                    <li>Brecha: <strong>{Math.abs((tipoPuestoStats[0]?.desempeno.promedio || 0) - (tipoPuestoStats[1]?.desempeno.promedio || 0)).toFixed(1)} pts</strong></li>
                    <li>Mejor: {tipoPuestoStats[0]?.tipo} ({tipoPuestoStats[0]?.desempeno.promedio.toFixed(1)}%)</li>
                    <li>Operativo: {tipoPuestoStats.find(t => t.tipo === 'Operativo')?.porcentaje.toFixed(0)}%</li>
                  </ul>
                </div>
              )}

              {/* Edad */}
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="font-semibold text-orange-800 flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  Edad
                </h4>
                <ul className="space-y-1 text-xs text-orange-700">
                  <li>Brecha: <strong>{((mejorEdad?.desempeno || 0) - (peorEdad?.desempeno || 0)).toFixed(1)} pts</strong></li>
                  <li>Mejor: {mejorEdad?.nombre} ({mejorEdad?.desempeno.toFixed(1)}%)</li>
                  <li>Promedio: {promedioEdad.toFixed(0)} años</li>
                </ul>
              </div>

              {/* Antigüedad */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4" />
                  Antigüedad
                </h4>
                <ul className="space-y-1 text-xs text-green-700">
                  <li>Brecha: <strong>{((mejorAntiguedad?.desempeno || 0) - (peorAntiguedad?.desempeno || 0)).toFixed(1)} pts</strong></li>
                  <li>Mejor: {mejorAntiguedad?.nombre} ({mejorAntiguedad?.desempeno.toFixed(1)}%)</li>
                  <li>Promedio: {(promedioAntiguedad / 12).toFixed(1)} años</li>
                </ul>
              </div>
            </div>

            {/* Nivel Educativo resumen */}
            {nivelEducativoStats.length > 0 && (
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <h4 className="font-semibold text-emerald-800 flex items-center gap-2 mb-2">
                  <GraduationCap className="h-4 w-4" />
                  Nivel Educativo
                </h4>
                <div className="flex flex-wrap gap-2 text-xs">
                  {nivelEducativoStats.slice(0, 5).map(n => (
                    <span
                      key={n.nivel}
                      className={`px-2 py-1 rounded ${n.diferenciaVsGlobal >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}
                    >
                      {n.nivel}: {n.desempeno.promedio.toFixed(1)}% ({n.diferenciaVsGlobal >= 0 ? '+' : ''}{n.diferenciaVsGlobal.toFixed(1)})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recomendaciones */}
            <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-800 mb-2">Consideraciones y Recomendaciones</h4>
              <ul className="space-y-1 text-sm text-amber-700 list-disc list-inside">
                <li>Las diferencias menores a 3 puntos porcentuales generalmente no son estadísticamente significativas.</li>
                <li>Grupos con pocos colaboradores pueden mostrar mayor variabilidad; interpretar con cautela.</li>
                <li>Se recomienda analizar intersecciones (ej: género + nivel educativo) para hallazgos más profundos.</li>
                <li>Las brechas identificadas pueden servir como base para programas de desarrollo focalizados.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
