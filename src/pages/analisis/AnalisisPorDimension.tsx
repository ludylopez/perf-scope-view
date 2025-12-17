import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ArrowLeft, Target, ChevronDown, ChevronUp, List } from "lucide-react";
import { RadarDimensiones, LollipopChart, InterpretationCard } from "@/components/charts";
import type { DimensionStats, InterpretacionStats, LollipopData, ClasificacionDimension, CategoriaCalificacion } from "@/types/analisis";
import { CATEGORIAS_CALIFICACION } from "@/types/analisis";

// Mapeo de consolidación de dimensiones
// Las dimensiones de los diferentes instrumentos se agrupan en categorías principales
const DIMENSION_CATEGORIES: Record<string, string> = {
  // PRODUCTIVIDAD
  "PRODUCTIVIDAD": "Productividad",
  "PRODUCTIVIDAD Y CUMPLIMIENTO DE OBJETIVOS INSTITUCIONALES": "Productividad",
  "PRODUCTIVIDAD Y CUMPLIMIENTO DE OBJETIVOS": "Productividad",
  "PRODUCTIVIDAD Y RESULTADOS INSTITUCIONALES": "Productividad",
  "PRODUCTIVIDAD EN EL TRABAJO": "Productividad",
  "PRODUCTIVIDAD ESTRATÉGICA": "Productividad",

  // CALIDAD
  "CALIDAD": "Calidad",
  "CALIDAD DEL TRABAJO": "Calidad",
  "CALIDAD DEL TRABAJO Y CUMPLIMIENTO NORMATIVO": "Calidad",
  "CALIDAD DE LA GESTIÓN ADMINISTRATIVA": "Calidad",
  "CALIDAD DE GESTIÓN DIRECTIVA": "Calidad",

  // COMPETENCIAS
  "COMPETENCIAS LABORALES": "Competencias",
  "COMPETENCIAS LABORALES (TÉCNICAS Y ESPECÍFICAS)": "Competencias",
  "COMPETENCIAS TÉCNICAS Y CONDUCTUALES": "Competencias",
  "COMPETENCIAS TÉCNICAS Y ADMINISTRATIVAS": "Competencias",
  "COMPETENCIAS DIRECTIVAS": "Competencias",
  "CONOCIMIENTOS Y HABILIDADES DEL TRABAJO": "Competencias",
  "CONOCIMIENTOS Y HABILIDADES DEL PUESTO": "Competencias",
  "CAPACIDADES COGNITIVAS": "Competencias",

  // COMPORTAMIENTO Y ÉTICA
  "COMPORTAMIENTO ORGANIZACIONAL": "Comportamiento",
  "COMPORTAMIENTO ORGANIZACIONAL Y ACTITUD LABORAL": "Comportamiento",
  "CONDUCTA ÉTICA Y COMPROMISO INSTITUCIONAL": "Comportamiento",
  "CUMPLIMIENTO NORMATIVO Y ÉTICA ADMINISTRATIVA": "Comportamiento",
  "DISCIPLINA Y COMPORTAMIENTO": "Comportamiento",
  "ACTITUD Y COMPORTAMIENTO EN EL TRABAJO": "Comportamiento",
  "LIDERAZGO ÉTICO Y CULTURA ORGANIZACIONAL": "Comportamiento",
  "TRANSPARENCIA, RENDICIÓN DE CUENTAS Y PROBIDAD": "Comportamiento",
  "COMPROMISO INSTITUCIONAL Y RESPONSABILIDAD": "Comportamiento",

  // RELACIONES INTERPERSONALES
  "RELACIONES INTERPERSONALES": "Relaciones",
  "RELACIONES INTERPERSONALES Y TRABAJO EN EQUIPO": "Relaciones",
  "TRABAJO EN EQUIPO Y RELACIONES": "Relaciones",
  "TRABAJO CON OTRAS PERSONAS": "Relaciones",
  "INTELIGENCIA EMOCIONAL Y GESTIÓN DE RELACIONES": "Relaciones",

  // LIDERAZGO Y COORDINACIÓN
  "LIDERAZGO Y GESTIÓN DE EQUIPOS": "Liderazgo",
  "LIDERAZGO Y COORDINACIÓN DEL EQUIPO DIRECTIVO": "Liderazgo",
  "LIDERAZGO ESTRATÉGICO": "Liderazgo",
  "COORDINACIÓN Y DIRECCIÓN ADMINISTRATIVA": "Liderazgo",
  "COORDINACIÓN INSTITUCIONAL": "Liderazgo",
  "COORDINACIÓN INSTITUCIONAL ESTRATÉGICA": "Liderazgo",
  "CAPACIDAD DE LIDERAZGO TRANSFORMACIONAL": "Liderazgo",
  "COMPETENCIAS DE LIDERAZGO EMERGENTE": "Liderazgo",
  "LIDERAZGO EMERGENTE": "Liderazgo",
  "INFLUENCIA Y LIDERAZGO AMPLIADO": "Liderazgo",
  "LIDERAZGO AMPLIADO E INFLUENCIA INSTITUCIONAL": "Liderazgo",
  "CAPACIDAD DE LIDERAZGO AMPLIADO": "Liderazgo",
  "CAPACIDAD DE ORIENTAR Y COORDINAR": "Liderazgo",

  // SERVICIO Y ATENCIÓN
  "ORIENTACIÓN AL SERVICIO Y ATENCIÓN AL USUARIO": "Servicio",
  "ORIENTACIÓN AL SERVICIO": "Servicio",
  "ORIENTACIÓN AL SERVICIO Y CUMPLIMIENTO DE PROTOCOLOS": "Servicio",
  "ENFOQUE CIUDADANO Y SERVICIO PÚBLICO": "Servicio",
  "SERVICIO Y SEGURIDAD": "Servicio",
  "SERVICIO INSTITUCIONAL Y TRANSPARENCIA": "Servicio",
  "SEGURIDAD Y CUMPLIMIENTO OPERATIVO": "Servicio",
  "SEGURIDAD Y CUIDADO EN EL TRABAJO": "Servicio",

  // POTENCIAL Y DESARROLLO
  "POTENCIAL PARA DESARROLLO": "Potencial",
  "POTENCIAL PARA RESPONSABILIDADES ADMINISTRATIVAS DE MAYOR ALCANCE": "Potencial",
  "POTENCIAL DE CRECIMIENTO Y DESARROLLO PROFESIONAL": "Potencial",
  "CAPACIDAD DE CRECIMIENTO Y DESARROLLO": "Potencial",
  "AGILIDAD DE APRENDIZAJE Y ADAPTABILIDAD": "Potencial",
  "CAPACIDAD DE APRENDIZAJE": "Potencial",
  "CAPACIDAD DE APRENDIZAJE Y ADAPTACIÓN": "Potencial",
  "CAPACIDAD DE APRENDIZAJE Y DESARROLLO": "Potencial",
  "MOTIVACIÓN Y COMPROMISO CON EL DESARROLLO": "Potencial",
  "DESARROLLO Y APRENDIZAJE": "Potencial",
  "ORIENTACIÓN AL CRECIMIENTO": "Potencial",
  "ORIENTACIÓN AL CRECIMIENTO INSTITUCIONAL": "Potencial",
  "ADAPTABILIDAD Y RESILIENCIA": "Potencial",
  "RESILIENCIA EXCEPCIONAL": "Potencial",
  "INICIATIVA Y RESPONSABILIDAD": "Potencial",
  "DISPOSICIÓN Y COMPROMISO": "Potencial",

  // VISIÓN ESTRATÉGICA
  "PENSAMIENTO ESTRATÉGICO Y VISIÓN SISTÉMICA": "Visión Estratégica",
  "VISIÓN ESTRATÉGICA": "Visión Estratégica",
  "VISIÓN ESTRATÉGICA Y PENSAMIENTO SISTÉMICO": "Visión Estratégica",
  "VISIÓN ESTRATÉGICA AMPLIADA": "Visión Estratégica",
  "VISIÓN INSTITUCIONAL": "Visión Estratégica",
  "DIRECCIÓN ESTRATÉGICA Y FORTALECIMIENTO INSTITUCIONAL": "Visión Estratégica",
  "ORIENTACIÓN A LA INNOVACIÓN Y MEJORA CONTINUA": "Visión Estratégica",
  "GESTIÓN DEL CAMBIO E INNOVACIÓN": "Visión Estratégica",
  "GESTIÓN Y TOMA DE DECISIONES": "Visión Estratégica",
  "CAPACIDAD DE GESTIÓN COMPLEJA": "Visión Estratégica",
  "CAPACIDAD DE GESTIÓN DE COMPLEJIDAD": "Visión Estratégica",
  "PENSAMIENTO ESTRATÉGICO BÁSICO": "Visión Estratégica",

  // CONCEJO MUNICIPAL (categoría especial)
  "ASISTENCIA Y PARTICIPACIÓN EN SESIONES": "Concejo Municipal",
  "TRABAJO EN COMISIONES MUNICIPALES": "Concejo Municipal",
  "INICIATIVA Y PROPUESTAS PARA EL DESARROLLO MUNICIPAL": "Concejo Municipal",
  "FISCALIZACIÓN Y CONTROL DEL GOBIERNO MUNICIPAL": "Concejo Municipal",
  "APROBACIÓN Y CONTROL PRESUPUESTARIO": "Concejo Municipal",
  "EMISIÓN DE NORMATIVA Y POLÍTICAS PÚBLICAS MUNICIPALES": "Concejo Municipal",
};

// Función para consolidar una dimensión a su categoría
const consolidateDimension = (nombre: string): string => {
  // Buscar coincidencia exacta
  if (DIMENSION_CATEGORIES[nombre]) {
    return DIMENSION_CATEGORIES[nombre];
  }

  // Buscar coincidencia parcial (por si hay variaciones menores)
  const nombreUpper = nombre.toUpperCase();
  for (const [key, category] of Object.entries(DIMENSION_CATEGORIES)) {
    if (nombreUpper.includes(key.toUpperCase()) || key.toUpperCase().includes(nombreUpper)) {
      return category;
    }
  }

  // Si no se encuentra, devolver el nombre original truncado
  return nombre.length > 25 ? nombre.substring(0, 22) + "..." : nombre;
};

// Mapeo de códigos de nivel a nombres descriptivos
const NIVEL_NOMBRES: Record<string, string> = {
  "A1": "Alta Dirección",
  "D1": "Director",
  "D2": "Subdirector",
  "E1": "Encargado I",
  "E2": "Encargado II",
  "A3": "Profesional III",
  "A4": "Profesional IV",
  "OTE": "Operativo Técnico",
  "O1": "Operativo I",
  "O2": "Operativo II",
  "S2": "Servicios II",
  "C1": "Concejo Municipal",
};

// Función para clasificar según el baremo estándar de 5 niveles
const clasificarPorBaremo = (promedio: number): CategoriaCalificacion => {
  if (promedio >= 90) return 'excelente';
  if (promedio >= 80) return 'muy_bueno';
  if (promedio >= 70) return 'satisfactorio';
  if (promedio >= 60) return 'necesita_mejorar';
  return 'insatisfactorio';
};

// Función para convertir CategoriaCalificacion a ClasificacionDimension (para compatibilidad)
const categoriaAClasificacion = (categoria: CategoriaCalificacion): ClasificacionDimension => {
  if (categoria === 'excelente' || categoria === 'muy_bueno') return 'fortaleza';
  if (categoria === 'satisfactorio' || categoria === 'necesita_mejorar') return 'oportunidad';
  return 'critica';
};

// Tipo para dimensiones detalladas con su categoría y niveles que aplican
interface DimensionDetallada {
  nombre: string;
  categoria: string;
  promedio: number;
  clasificacion: ClasificacionDimension; // Mantener para compatibilidad con componentes existentes
  categoriaCalificacion: CategoriaCalificacion; // Nueva: usar baremo estándar de 5 niveles
  niveles: string[]; // Niveles/instrumentos que usan esta dimensión
}

export default function AnalisisPorDimension() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [dimensiones, setDimensiones] = useState<DimensionStats[]>([]);
  const [dimensionesDetalle, setDimensionesDetalle] = useState<DimensionDetallada[]>([]);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

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

      // Cargar configuraciones de instrumentos para obtener dimensiones
      const { data: instruments } = await supabase
        .from("instrument_configs")
        .select("id, nivel, dimensiones_desempeno")
        .eq("activo", true);

      if (!instruments || instruments.length === 0) {
        setError("No hay instrumentos configurados");
        return;
      }

      // Crear mapa de item -> dimensión
      // dimensiones_desempeno es un array de dimensiones, cada una con items
      const itemToDimensionMap = new Map<string, string>();
      // Mapa de dimensión -> niveles que la usan
      const dimensionToNivelesMap = new Map<string, Set<string>>();

      instruments.forEach(inst => {
        const nivel = inst.nivel as string || inst.id;
        const dims = inst.dimensiones_desempeno as Array<{
          id: string;
          nombre: string;
          items: Array<{ id: string }>;
        }> | null;

        if (dims && Array.isArray(dims)) {
          dims.forEach(dim => {
            // Registrar qué nivel usa esta dimensión
            if (!dimensionToNivelesMap.has(dim.nombre)) {
              dimensionToNivelesMap.set(dim.nombre, new Set());
            }
            dimensionToNivelesMap.get(dim.nombre)!.add(nivel);

            if (dim.items && Array.isArray(dim.items)) {
              dim.items.forEach(item => {
                // Mapear el ID exacto (formato: d1_i1_a4)
                itemToDimensionMap.set(item.id, dim.nombre);
              });
            }
          });
        }
      });

      // Cargar evaluaciones de jefes (70% del peso) - excluyendo administrativos
      const { data: bossEvalsData } = await supabase
        .from("evaluations")
        .select("usuario_id, colaborador_id, responses")
        .eq("periodo_id", periodo.id)
        .eq("tipo", "jefe")
        .eq("estado", "enviado");

      // Cargar autoevaluaciones (30% del peso) - excluyendo administrativos
      const { data: selfEvalsData } = await supabase
        .from("evaluations")
        .select("usuario_id, colaborador_id, responses")
        .eq("periodo_id", periodo.id)
        .eq("tipo", "auto")
        .eq("estado", "enviado");

      // Obtener usuarios para filtrar administrativos
      const usuarioIds = [
        ...(bossEvalsData?.map(e => e.usuario_id).filter(Boolean) || []),
        ...(selfEvalsData?.map(e => e.usuario_id).filter(Boolean) || [])
      ];
      const { data: usersData } = await supabase
        .from("users")
        .select("dpi, rol")
        .in("dpi", [...new Set(usuarioIds)]);
      
      // Crear mapa de roles para filtrar
      const userRoles = new Map(usersData?.map(u => [u.dpi, u.rol]) || []);
      
      // Filtrar evaluaciones de usuarios administrativos
      const bossEvals = bossEvalsData?.filter(e => {
        const rol = userRoles.get(e.usuario_id);
        return rol && rol !== 'admin_general' && rol !== 'admin_rrhh';
      }) || [];

      const selfEvals = selfEvalsData?.filter(e => {
        const rol = userRoles.get(e.usuario_id);
        return rol && rol !== 'admin_general' && rol !== 'admin_rrhh';
      }) || [];

      if ((!bossEvals || bossEvals.length === 0) && (!selfEvals || selfEvals.length === 0)) {
        setError("No hay evaluaciones enviadas para este período");
        return;
      }

      // Agregar puntuaciones por dimensión (sin consolidar primero)
      const dimensionesRawMap: Record<string, { suma: number; count: number }> = {};
      const itemsSinProcesar: string[] = [];
      let totalItemsProcesados = 0;
      let totalItemsConDimension = 0;

      // Función para procesar respuestas
      const processResponses = (
        respuestas: Record<string, number> | null,
        peso: number
      ) => {
        if (!respuestas || typeof respuestas !== "object") return;

        Object.entries(respuestas).forEach(([itemId, score]) => {
          if (typeof score !== "number") return;
          totalItemsProcesados++;

          // Buscar dimensión por item ID
          let dimension = itemToDimensionMap.get(itemId);

          // Si no encontramos por item ID exacto, intentar extraer número de dimensión del ID
          // Formato típico: d1_i1_a4, d2_i3_d1, etc.
          if (!dimension && itemId.match(/^d\d+_i\d+_/)) {
            const dimNum = itemId.match(/^d(\d+)_/)?.[1];
            if (dimNum) {
              // Buscar la dimensión correspondiente usando el número de dimensión
              // Buscar cualquier item que pertenezca a la misma dimensión (mismo dX)
              for (const [key, dimName] of itemToDimensionMap.entries()) {
                if (key.match(/^d\d+_/) && key.match(/^d(\d+)_/)?.[1] === dimNum) {
                  dimension = dimName;
                  break;
                }
              }
            }
          }

          if (dimension) {
            totalItemsConDimension++;
            if (!dimensionesRawMap[dimension]) {
              dimensionesRawMap[dimension] = { suma: 0, count: 0 };
            }
            // Convertir score (1-5) a porcentaje (0-100)
            const porcentaje = ((score - 1) / 4) * 100;
            dimensionesRawMap[dimension].suma += porcentaje * peso;
            dimensionesRawMap[dimension].count += peso;
          } else {
            // Registrar items que no se pudieron mapear a una dimensión
            if (!itemsSinProcesar.includes(itemId)) {
              itemsSinProcesar.push(itemId);
            }
          }
        });
      };

      // Procesar evaluaciones de jefes (peso 70%)
      bossEvals?.forEach(ev => {
        processResponses(ev.responses as Record<string, number> | null, 0.7);
      });

      // Procesar autoevaluaciones (peso 30%)
      selfEvals?.forEach(ev => {
        processResponses(ev.responses as Record<string, number> | null, 0.3);
      });

      // Verificar que todos los items fueron procesados
      if (itemsSinProcesar.length > 0) {
        console.warn(`Advertencia: ${itemsSinProcesar.length} items no pudieron ser mapeados a dimensiones:`, itemsSinProcesar.slice(0, 10));
      }
      if (totalItemsProcesados > 0) {
        const porcentajeProcesado = (totalItemsConDimension / totalItemsProcesados) * 100;
        console.log(`Items procesados: ${totalItemsConDimension}/${totalItemsProcesados} (${porcentajeProcesado.toFixed(1)}%)`);
      }

      // Crear array de dimensiones detalladas (sin consolidar)
      const detalleArray: DimensionDetallada[] = Object.entries(dimensionesRawMap)
        .filter(([_, data]) => data.count > 0)
        .map(([nombre, data]) => {
          const promedio = data.suma / data.count;
          const nivelesSet = dimensionToNivelesMap.get(nombre);
          const niveles = nivelesSet ? Array.from(nivelesSet).sort() : [];
          const categoriaCalificacion = clasificarPorBaremo(promedio);
          return {
            nombre,
            categoria: consolidateDimension(nombre),
            promedio,
            clasificacion: categoriaAClasificacion(categoriaCalificacion), // Compatibilidad con componentes existentes
            categoriaCalificacion, // Baremo estándar de 5 niveles
            niveles,
          };
        })
        .sort((a, b) => b.promedio - a.promedio);

      setDimensionesDetalle(detalleArray);

      // Consolidar dimensiones similares
      const consolidatedMap: Record<string, { suma: number; count: number; rawDimensions: string[] }> = {};

      Object.entries(dimensionesRawMap).forEach(([rawNombre, data]) => {
        const categoria = consolidateDimension(rawNombre);

        if (!consolidatedMap[categoria]) {
          consolidatedMap[categoria] = { suma: 0, count: 0, rawDimensions: [] };
        }

        consolidatedMap[categoria].suma += data.suma;
        consolidatedMap[categoria].count += data.count;
        consolidatedMap[categoria].rawDimensions.push(rawNombre);
      });

      const dimsArray: DimensionStats[] = Object.entries(consolidatedMap)
        .filter(([_, data]) => data.count > 0)
        .map(([nombre, data]) => {
          const promedio = data.suma / data.count;
          const categoriaCalificacion = clasificarPorBaremo(promedio);
          return {
            id: nombre,
            nombre: nombre,
            promedioGlobal: promedio,
            mediana: promedio,
            desviacion: 0,
            clasificacion: categoriaAClasificacion(categoriaCalificacion), // Compatibilidad con componentes existentes
            porNivel: {},
            porCategoria: {},
          };
        })
        .sort((a, b) => b.promedioGlobal - a.promedioGlobal);

      if (dimsArray.length === 0) {
        setError("No se encontraron dimensiones con datos. Verifica que las evaluaciones contengan respuestas válidas.");
        return;
      }

      setDimensiones(dimsArray);
    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("Error al cargar el análisis por dimensión");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
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

  // Clasificar las dimensiones CONSOLIDADAS según baremo estándar de 5 niveles
  // Estas son las categorías principales que se muestran en el gráfico (Visión Estratégica, Comportamiento, etc.)
  const excelentes = dimensiones.filter(d => {
    const categoria = clasificarPorBaremo(d.promedioGlobal);
    return categoria === "excelente";
  });
  
  const muyBuenos = dimensiones.filter(d => {
    const categoria = clasificarPorBaremo(d.promedioGlobal);
    return categoria === "muy_bueno";
  });
  
  const satisfactorios = dimensiones.filter(d => {
    const categoria = clasificarPorBaremo(d.promedioGlobal);
    return categoria === "satisfactorio";
  });
  
  const necesitanMejorar = dimensiones.filter(d => {
    const categoria = clasificarPorBaremo(d.promedioGlobal);
    return categoria === "necesita_mejorar";
  });
  
  const insatisfactorios = dimensiones.filter(d => {
    const categoria = clasificarPorBaremo(d.promedioGlobal);
    return categoria === "insatisfactorio";
  });
  
  // Mantener compatibilidad con clasificación de 3 niveles para componentes existentes
  const fortalezas = dimensiones.filter(d => d.clasificacion === "fortaleza");
  const oportunidades = dimensiones.filter(d => d.clasificacion === "oportunidad");
  const criticas = dimensiones.filter(d => d.clasificacion === "critica");

  const radarData = dimensiones.map(d => ({
    nombre: d.nombre,
    valor: d.promedioGlobal,
    clasificacion: d.clasificacion,
  }));

  const lollipopData: LollipopData[] = dimensiones.map(d => ({
    label: d.nombre,
    value: d.promedioGlobal,
    baseline: 75,
    color: d.clasificacion === "fortaleza" ? "#22c55e" : d.clasificacion === "oportunidad" ? "#eab308" : "#ef4444",
  }));

  const interpretacion: InterpretacionStats = {
    titulo: "Resumen de Dimensiones",
    descripcion: `Se consolidaron ${dimensionesDetalle.length} dimensiones originales en ${dimensiones.length} categorías principales. Clasificación según baremo estándar de 5 niveles.`,
    hallazgos: [
      `${excelentes.length} categorías excelentes (≥90%)`,
      `${muyBuenos.length} categorías muy buenas (80-89%)`,
      `${satisfactorios.length} categorías satisfactorias (70-79%)`,
      `${necesitanMejorar.length} categorías que necesitan mejorar (60-69%)`,
      `${insatisfactorios.length} categorías insatisfactorias (<60%)`,
      dimensiones.length > 0 ? `Mejor categoría: ${dimensiones[0].nombre} (${dimensiones[0].promedioGlobal.toFixed(1)}% - ${clasificarPorBaremo(dimensiones[0].promedioGlobal)})` : "",
    ].filter(Boolean),
    recomendaciones: [
      ...(insatisfactorios.length > 0 ? [`Priorizar intervenciones urgentes en: ${insatisfactorios.map(c => c.nombre).join(", ")}`] : []),
      ...(necesitanMejorar.length > 0 ? [`Desarrollar planes de mejora para: ${necesitanMejorar.map(c => c.nombre).join(", ")}`] : []),
    ].filter(Boolean),
    nivel: insatisfactorios.length > 2 ? "critico" : (insatisfactorios.length > 0 || necesitanMejorar.length > 3) ? "atencion" : "positivo",
  };

  // Agrupar dimensiones detalladas por categoría
  const dimensionesPorCategoria = dimensionesDetalle.reduce((acc, dim) => {
    if (!acc[dim.categoria]) acc[dim.categoria] = [];
    acc[dim.categoria].push(dim);
    return acc;
  }, {} as Record<string, DimensionDetallada[]>);

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
              <Target className="h-8 w-8" />
              Análisis por Dimensión
            </h1>
            <p className="text-muted-foreground mt-1">Período: <span className="font-semibold">{periodoNombre}</span></p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Sección 4 del Informe</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RadarDimensiones dimensiones={radarData} title="Radar de Dimensiones" height={400} />
          <InterpretationCard data={interpretacion} />
        </div>

        <LollipopChart
          data={lollipopData}
          title="Ranking de Dimensiones"
          description="Ordenado de mayor a menor promedio. Línea base en 80% (umbral de 'Muy Bueno' según baremo estándar)"
          baselineValue={80}
          baselineLabel="Umbral Muy Bueno"
          valueFormat="percentage"
          orientation="horizontal"
          height={400}
        />

        {/* Clasificación según baremo estándar de 5 niveles */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="text-green-700 dark:text-green-400 text-sm">Excelente ({excelentes.length})</CardTitle>
              <CardDescription className="text-xs">≥90%</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {excelentes.map(d => (
                  <li key={d.id} className="flex justify-between">
                    <span className="truncate">{d.nombre}</span>
                    <span className="font-mono font-semibold text-green-600 ml-2">{d.promedioGlobal.toFixed(1)}%</span>
                  </li>
                ))}
                {excelentes.length === 0 && <li className="text-muted-foreground text-xs">Ninguna</li>}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/30 dark:bg-green-950/10">
            <CardHeader>
              <CardTitle className="text-green-600 dark:text-green-300 text-sm">Muy Bueno ({muyBuenos.length})</CardTitle>
              <CardDescription className="text-xs">80-89%</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {muyBuenos.map(d => (
                  <li key={d.id} className="flex justify-between">
                    <span className="truncate">{d.nombre}</span>
                    <span className="font-mono font-semibold text-green-500 ml-2">{d.promedioGlobal.toFixed(1)}%</span>
                  </li>
                ))}
                {muyBuenos.length === 0 && <li className="text-muted-foreground text-xs">Ninguna</li>}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
            <CardHeader>
              <CardTitle className="text-yellow-700 dark:text-yellow-400 text-sm">Satisfactorio ({satisfactorios.length})</CardTitle>
              <CardDescription className="text-xs">70-79%</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {satisfactorios.map(d => (
                  <li key={d.id} className="flex justify-between">
                    <span className="truncate">{d.nombre}</span>
                    <span className="font-mono font-semibold text-yellow-600 ml-2">{d.promedioGlobal.toFixed(1)}%</span>
                  </li>
                ))}
                {satisfactorios.length === 0 && <li className="text-muted-foreground text-xs">Ninguna</li>}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
            <CardHeader>
              <CardTitle className="text-orange-700 dark:text-orange-400 text-sm">Necesita Mejorar ({necesitanMejorar.length})</CardTitle>
              <CardDescription className="text-xs">60-69%</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {necesitanMejorar.map(d => (
                  <li key={d.id} className="flex justify-between">
                    <span className="truncate">{d.nombre}</span>
                    <span className="font-mono font-semibold text-orange-600 ml-2">{d.promedioGlobal.toFixed(1)}%</span>
                  </li>
                ))}
                {necesitanMejorar.length === 0 && <li className="text-muted-foreground text-xs">Ninguna</li>}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
            <CardHeader>
              <CardTitle className="text-red-700 dark:text-red-400 text-sm">Insatisfactorio ({insatisfactorios.length})</CardTitle>
              <CardDescription className="text-xs">&lt;60%</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {insatisfactorios.map(d => (
                  <li key={d.id} className="flex justify-between">
                    <span className="truncate">{d.nombre}</span>
                    <span className="font-mono font-semibold text-red-600 ml-2">{d.promedioGlobal.toFixed(1)}%</span>
                  </li>
                ))}
                {insatisfactorios.length === 0 && <li className="text-muted-foreground text-xs">Ninguna</li>}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Sección de Detalle por Categoría */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <List className="h-5 w-5" />
                  Detalle de Dimensiones por Categoría
                </CardTitle>
                <CardDescription>
                  {dimensionesDetalle.length} dimensiones originales agrupadas en {dimensiones.length} categorías
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMostrarDetalle(!mostrarDetalle)}
              >
                {mostrarDetalle ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Ocultar detalle
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Ver detalle
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {mostrarDetalle && (
            <CardContent>
              <div className="space-y-6">
                {Object.entries(dimensionesPorCategoria)
                  .sort(([, a], [, b]) => {
                    const promedioA = a.reduce((sum, d) => sum + d.promedio, 0) / a.length;
                    const promedioB = b.reduce((sum, d) => sum + d.promedio, 0) / b.length;
                    return promedioB - promedioA;
                  })
                  .map(([categoria, dims]) => {
                    const promedioCat = dims.reduce((sum, d) => sum + d.promedio, 0) / dims.length;
                    const categoriaCalificacionCat = clasificarPorBaremo(promedioCat);
                    const clasificacionCat = categoriaAClasificacion(categoriaCalificacionCat);
                    const colorBorder = clasificacionCat === "fortaleza" ? "border-l-green-500" : clasificacionCat === "oportunidad" ? "border-l-yellow-500" : "border-l-red-500";
                    const colorBg = clasificacionCat === "fortaleza" ? "bg-green-50/30 dark:bg-green-950/10" : clasificacionCat === "oportunidad" ? "bg-yellow-50/30 dark:bg-yellow-950/10" : "bg-red-50/30 dark:bg-red-950/10";

                    return (
                      <div key={categoria} className={`border-l-4 ${colorBorder} ${colorBg} rounded-r-lg p-4`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-lg">{categoria}</h4>
                          <span className={`font-mono font-bold ${
                            clasificacionCat === "fortaleza" ? "text-green-600" :
                            clasificacionCat === "oportunidad" ? "text-yellow-600" : "text-red-600"
                          }`}>
                            {promedioCat.toFixed(1)}%
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 pr-4">Dimensión Original</th>
                                <th className="text-left py-2 pr-4">Niveles que Aplica</th>
                                <th className="text-right py-2 w-24">Promedio</th>
                                <th className="text-center py-2 w-20">Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dims.sort((a, b) => b.promedio - a.promedio).map((dim, idx) => (
                                <tr key={idx} className="border-b border-dashed last:border-0">
                                  <td className="py-2 pr-4 text-muted-foreground">{dim.nombre}</td>
                                  <td className="py-2 pr-4">
                                    <div className="flex flex-wrap gap-1">
                                      {dim.niveles.length > 0 ? (
                                        dim.niveles.map((nivel) => (
                                          <span
                                            key={nivel}
                                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                            title={NIVEL_NOMBRES[nivel] || nivel}
                                          >
                                            {NIVEL_NOMBRES[nivel] || nivel}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-xs text-muted-foreground">-</span>
                                      )}
                                    </div>
                                  </td>
                                    <td className="text-right py-2 font-mono">{dim.promedio.toFixed(1)}%</td>
                                    <td className="text-center py-2">
                                      <span 
                                        className={`inline-block w-3 h-3 rounded-full ${
                                          dim.categoriaCalificacion === "excelente" ? "bg-green-600" :
                                          dim.categoriaCalificacion === "muy_bueno" ? "bg-green-500" :
                                          dim.categoriaCalificacion === "satisfactorio" ? "bg-yellow-500" :
                                          dim.categoriaCalificacion === "necesita_mejorar" ? "bg-orange-500" : "bg-red-500"
                                        }`}
                                        title={dim.categoriaCalificacion}
                                      />
                                    </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
