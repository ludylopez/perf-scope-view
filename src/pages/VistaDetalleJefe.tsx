import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, FileText, User, CheckCircle2, Clock, AlertCircle, Sparkles, FileDown, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { calculatePerformanceScore, calculateDimensionAverage, calculateDimensionPercentage, scoreToPercentage } from "@/lib/calculations";
import { getInstrumentForUser } from "@/lib/instruments";
import { getInstrumentCalculationConfig } from "@/lib/instrumentCalculations";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { EvaluacionPDF } from "@/components/pdf/EvaluacionPDF";
import { getConsolidatedResult } from "@/lib/finalResultSupabase";

const VistaDetalleJefe = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const periodoId = searchParams.get("periodo") || "";

  const [jefe, setJefe] = useState<any>(null);
  const [evaluaciones, setEvaluaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEsperadas, setTotalEsperadas] = useState(0);
  const [planesDesarrollo, setPlanesDesarrollo] = useState<Map<string, any>>(new Map());
  const [generandoPlanes, setGenerandoPlanes] = useState<Set<string>>(new Set());
  const [datosExportacionPDF, setDatosExportacionPDF] = useState<Map<string, any>>(new Map());

  // Cargar total de asignaciones esperadas
  useEffect(() => {
    const loadTotalEsperadas = async () => {
      if (!id) return;

      const { count } = await supabase
        .from("user_assignments")
        .select("*", { count: "exact", head: true })
        .eq("jefe_id", id)
        .eq("activo", true);

      setTotalEsperadas(count || 0);
    };

    loadTotalEsperadas();
  }, [id]);

  useEffect(() => {
    if (!id) {
      navigate("/admin/dashboard");
      return;
    }

    // Verificar que el usuario tenga permisos (admin o rrhh)
    if (user?.rol !== "admin_general" && user?.rol !== "admin_rrhh") {
      toast.error("No tienes permisos para ver esta información");
      navigate("/admin/dashboard");
      return;
    }

    loadData();
  }, [id, periodoId, user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar información del jefe
      const { data: jefeData, error: jefeError } = await supabase
        .from("users")
        .select("*")
        .eq("dpi", id)
        .single();

      if (jefeError) throw jefeError;
      setJefe(jefeData);

      // Cargar todas las asignaciones activas del jefe
      const periodoFinal = periodoId || (await getActivePeriodId());
      
      if (periodoFinal && id) {
        // 1. Obtener todas las asignaciones activas del jefe
        const { data: asignacionesData, error: asignacionesError } = await supabase
          .from("user_assignments")
          .select(`
            colaborador_id,
            colaborador:users!user_assignments_colaborador_id_fkey(
              dpi,
              nombre,
              apellidos,
              cargo,
              area,
              nivel
            )
          `)
          .eq("jefe_id", id)
          .eq("activo", true);

        if (asignacionesError) throw asignacionesError;

        if (!asignacionesData || asignacionesData.length === 0) {
          setEvaluaciones([]);
          return;
        }

        // 2. Obtener todas las evaluaciones existentes del jefe para este período
        const colaboradoresIds = asignacionesData.map(a => a.colaborador_id).filter(Boolean);
        
        const { data: evaluacionesData, error: evalError } = await supabase
          .from("evaluations")
          .select("*")
          .eq("evaluador_id", id)
          .eq("periodo_id", periodoFinal)
          .eq("tipo", "jefe")
          .in("colaborador_id", colaboradoresIds);

        if (evalError) throw evalError;

        // 3. Crear mapa de evaluaciones por colaborador_id
        const evaluacionesMap = new Map();
        evaluacionesData?.forEach(evaluacion => {
          evaluacionesMap.set(evaluacion.colaborador_id, evaluacion);
        });

        // 4. Combinar asignaciones con evaluaciones (o crear entrada pendiente si no existe)
        const evaluacionesCompletas = asignacionesData.map(asignacion => {
          const colaborador = asignacion.colaborador;
          const evaluacion = evaluacionesMap.get(asignacion.colaborador_id);

          if (evaluacion) {
            // Ya existe evaluación
            return {
              ...evaluacion,
              colaborador: colaborador
            };
          } else {
            // Pendiente - no hay evaluación aún
            return {
              id: null,
              colaborador_id: asignacion.colaborador_id,
              evaluador_id: id,
              periodo_id: periodoFinal,
              tipo: "jefe",
              estado: "pendiente",
              progreso: 0,
              responses: {},
              comments: {},
              created_at: null,
              updated_at: null,
              colaborador: colaborador
            };
          }
        });

        // 5. Cargar planes de desarrollo para cada colaborador
        const planesMap = new Map<string, any>();
        if (colaboradoresIds.length > 0) {
          const { data: planesData, error: planesError } = await supabase
            .from("development_plans")
            .select("*")
            .eq("periodo_id", periodoFinal)
            .in("colaborador_id", colaboradoresIds)
            .order("created_at", { ascending: false });

          if (!planesError && planesData) {
            // Agrupar por colaborador_id y tomar el más reciente de cada uno
            planesData.forEach((plan) => {
              if (!planesMap.has(plan.colaborador_id)) {
                planesMap.set(plan.colaborador_id, plan);
              }
            });
          }
        }
        setPlanesDesarrollo(planesMap);

        // 6. Ordenar: pendientes primero, luego en progreso, luego completadas
        evaluacionesCompletas.sort((a, b) => {
          const order = { pendiente: 1, borrador: 2, enviado: 3 };
          const aOrder = order[a.estado as keyof typeof order] || 4;
          const bOrder = order[b.estado as keyof typeof order] || 4;
          
          if (aOrder !== bOrder) {
            return aOrder - bOrder;
          }
          
          // Si mismo estado, ordenar por fecha de actualización (más reciente primero)
          const aDate = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const bDate = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return bDate - aDate;
        });

        setEvaluaciones(evaluacionesCompletas);
      }
    } catch (error: any) {
      console.error("Error cargando datos:", error);
      toast.error("Error al cargar información del jefe");
    } finally {
      setLoading(false);
    }
  };

  const getActivePeriodId = async () => {
    const { data } = await supabase
      .from("evaluation_periods")
      .select("id")
      .eq("activo", true)
      .single();
    return data?.id || "";
  };

  // Helper para calcular respuestas consolidadas
  const calculateConsolidatedResponses = (
    autoResponses: Record<string, number>,
    jefeResponses: Record<string, number>,
    instrumentId?: string
  ): Record<string, number> => {
    const consolidated: Record<string, number> = {};
    
    // Obtener pesos del instrumento (por defecto 70/30)
    let pesoJefe = 0.7;
    let pesoAuto = 0.3;
    
    if (instrumentId) {
      try {
        const instrumentConfig = getInstrumentCalculationConfig(instrumentId);
        if (instrumentConfig?.pesoJefe !== undefined && instrumentConfig?.pesoAuto !== undefined) {
          pesoJefe = instrumentConfig.pesoJefe;
          pesoAuto = instrumentConfig.pesoAuto;
        }
      } catch (error) {
        console.warn(`⚠️ No se pudo obtener configuración del instrumento ${instrumentId}, usando pesos por defecto 70/30`);
      }
    }
    
    const allItemIds = new Set([
      ...Object.keys(autoResponses),
      ...Object.keys(jefeResponses)
    ]);
    
    allItemIds.forEach((itemId) => {
      const autoValue = autoResponses[itemId] || 0;
      const jefeValue = jefeResponses[itemId] || 0;
      
      if (autoResponses[itemId] !== undefined && jefeResponses[itemId] !== undefined) {
        // Aplicar pesos dinámicos
        consolidated[itemId] = Math.round((jefeValue * pesoJefe + autoValue * pesoAuto) * 100) / 100;
      } else if (autoResponses[itemId] !== undefined) {
        consolidated[itemId] = autoValue;
      } else if (jefeResponses[itemId] !== undefined) {
        consolidated[itemId] = jefeValue;
      }
    });
    
    return consolidated;
  };

  // Helper para obtener título amigable de dimensión
  const getDimensionFriendlyTitle = (dimension: any): string => {
    const nombre = dimension.nombre.toLowerCase();
    
    // Casos específicos
    if (nombre.includes("servicio institucional") && nombre.includes("transparencia")) return "Servicio y Transparencia";
    if (nombre.includes("liderazgo estratégico")) return "Liderazgo Estratégico";
    if (nombre.includes("gestión") && nombre.includes("toma de decisiones")) return "Gestión y Decisiones";
    if (nombre.includes("desarrollo") && nombre.includes("aprendizaje")) return "Desarrollo y Aprendizaje";
    if (nombre.includes("visión institucional")) return "Visión Institucional";
    
    // Casos generales
    if (nombre.includes("competencias laborales") && nombre.includes("técnica")) return "Competencias Laborales";
    if (nombre.includes("comportamiento") && nombre.includes("organizacional")) return "Comportamiento Organizacional";
    if (nombre.includes("relaciones interpersonales") || nombre.includes("trabajo en equipo")) return "Relaciones Interpersonales";
    if (nombre.includes("orientación al servicio") || nombre.includes("atención al usuario")) return "Orientación al Servicio";
    if (nombre.includes("calidad del trabajo") || nombre.includes("calidad")) return "Calidad";
    if (nombre.includes("productividad") || nombre.includes("cumplimiento")) return "Productividad";
    if (nombre.includes("liderazgo") || nombre.includes("dirección")) return "Liderazgo";
    if (nombre.includes("ciudadan") || nombre.includes("servicio")) return "Servicio al Ciudadano";
    if (nombre.includes("gestión") && nombre.includes("resultado")) return "Gestión de Resultados";
    if (nombre.includes("transparencia") || nombre.includes("ética")) return "Ética y Transparencia";
    
    return dimension.nombre.length > 40 ? dimension.nombre.substring(0, 40) + "..." : dimension.nombre;
  };

  // Función para validar que existan ambas evaluaciones antes de generar plan
  const validarEvaluacionesParaPlan = async (colaboradorId: string, periodoId: string): Promise<boolean> => {
    try {
      // Verificar autoevaluación
      const { data: autoevaluacion, error: autoError } = await supabase
        .from("evaluations")
        .select("id")
        .eq("usuario_id", colaboradorId)
        .eq("periodo_id", periodoId)
        .eq("tipo", "auto")
        .eq("estado", "enviado")
        .single();

      if (autoError || !autoevaluacion) {
        toast.error("El colaborador debe tener su autoevaluación completada");
        return false;
      }

      // Verificar evaluación del jefe
      const { data: evaluacionJefe, error: jefeError } = await supabase
        .from("evaluations")
        .select("id")
        .eq("colaborador_id", colaboradorId)
        .eq("periodo_id", periodoId)
        .eq("tipo", "jefe")
        .eq("estado", "enviado")
        .single();

      if (jefeError || !evaluacionJefe) {
        toast.error("Debe completar la evaluación del colaborador primero");
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error validando evaluaciones:", error);
      return false;
    }
  };

  // Función para generar plan de desarrollo
  const generarPlanDesarrollo = async (colaboradorId: string, colaboradorNombre: string) => {
    const periodoFinal = periodoId || (await getActivePeriodId());
    if (!periodoFinal) {
      toast.error("No hay período activo");
      return;
    }

    // Validar evaluaciones
    const puedeGenerar = await validarEvaluacionesParaPlan(colaboradorId, periodoFinal);
    if (!puedeGenerar) {
      return;
    }

    // Marcar como generando
    setGenerandoPlanes(prev => new Set(prev).add(colaboradorId));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://oxadpbdlpvwyapuondei.supabase.co";
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94YWRwYmRscHZ3eWFwdW9uZGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMjU5MzcsImV4cCI6MjA3NzkwMTkzN30.HjIoMaw20qx7DscE-XWCaz88EWa0Jv_aCDcMtv6eadw";
      
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-development-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          colaborador_id: colaboradorId,
          periodo_id: periodoFinal,
        }),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData?.success) {
        throw new Error(responseData?.error || "Error generando plan");
      }

      toast.success(`Plan de desarrollo generado para ${colaboradorNombre}`);
      
      // Recargar datos para actualizar el indicador
      await loadData();
    } catch (error: any) {
      console.error("Error generando plan:", error);
      toast.error(`Error al generar plan: ${error?.message || "Error desconocido"}`);
    } finally {
      setGenerandoPlanes(prev => {
        const newSet = new Set(prev);
        newSet.delete(colaboradorId);
        return newSet;
      });
    }
  };

  // Función para preparar datos para PDF
  const prepararDatosParaPDF = async (colaborador: any, evaluacionJefe: any) => {
    try {
      // Obtener autoevaluación
      const periodoFinal = periodoId || (await getActivePeriodId());
      const { data: autoevaluacion, error: autoError } = await supabase
        .from("evaluations")
        .select("*")
        .eq("usuario_id", colaborador.dpi)
        .eq("periodo_id", periodoFinal)
        .eq("tipo", "auto")
        .eq("estado", "enviado")
        .single();

      if (autoError || !autoevaluacion) {
        throw new Error("Autoevaluación no encontrada");
      }

      // Obtener instrumento
      const nivelColaborador = colaborador.nivel || colaborador.colaborador?.nivel || "";
      const instrument = await getInstrumentForUser(nivelColaborador);
      if (!instrument) {
        throw new Error("Instrumento no encontrado");
      }

      const instrumentId = instrument.id || colaborador.nivel;
      const responsesToUse = calculateConsolidatedResponses(
        autoevaluacion.responses,
        evaluacionJefe.responses,
        instrumentId
      );

      // Calcular performance score y percentage
      const performanceScore = calculatePerformanceScore(responsesToUse, instrument.dimensionesDesempeno);
      const performancePercentage = scoreToPercentage(performanceScore);

      // Preparar radarData
      const titulosGenerados: string[] = [];
      const radarDataPDF = instrument.dimensionesDesempeno.map((dim, idx) => {
        const promedio = calculateDimensionAverage(responsesToUse, dim);
        const porcentaje = calculateDimensionPercentage(responsesToUse, dim);
        
        let dimensionTitle = getDimensionFriendlyTitle(dim);
        if (titulosGenerados.includes(dimensionTitle)) {
          dimensionTitle = dim.nombre.length <= 30 
            ? dim.nombre 
            : `${dimensionTitle} (${idx + 1})`;
        }
        titulosGenerados.push(dimensionTitle);
        
        return {
          dimension: dimensionTitle,
          nombreCompleto: dim.nombre,
          numero: idx + 1,
          tuEvaluacion: porcentaje,
          puntaje: promedio,
          dimensionData: dim
        };
      });

      // Calcular promedio municipal por dimensión
      let promedioMunicipal: Record<string, number> = {};
      try {
        const { data: usuariosMismoNivel } = await supabase
          .from('users')
          .select('dpi')
          .eq('nivel', colaborador.nivel)
          .eq('estado', 'activo')
          .in('rol', ['colaborador', 'jefe']);

        const dpisMismoNivel = usuariosMismoNivel?.map(u => u.dpi) || [];
        
        if (dpisMismoNivel.length > 0) {
          const { data: finalResults } = await supabase
            .from('final_evaluation_results')
            .select('colaborador_id, resultado_final, autoevaluacion_id, evaluacion_jefe_id')
            .eq('periodo_id', periodoFinal)
            .in('colaborador_id', dpisMismoNivel);

          if (finalResults && finalResults.length > 0) {
            const autoevaluacionIds = finalResults.map(r => r.autoevaluacion_id).filter(id => id);
            const jefeEvaluacionIds = finalResults.map(r => r.evaluacion_jefe_id).filter(id => id);
            
            const { data: autoEvals } = await supabase
              .from('evaluations')
              .select('id, responses')
              .in('id', autoevaluacionIds)
              .eq('tipo', 'auto');

            const { data: jefeEvals } = await supabase
              .from('evaluations')
              .select('id, responses')
              .in('id', jefeEvaluacionIds)
              .eq('tipo', 'jefe');

            const autoEvalMap = new Map((autoEvals || []).map(e => [e.id, (e.responses as Record<string, number>) || {}]));
            const jefeEvalMap = new Map((jefeEvals || []).map(e => [e.id, (e.responses as Record<string, number>) || {}]));

            instrument.dimensionesDesempeno.forEach((dim) => {
              let sumaPorcentajes = 0;
              let contador = 0;

              finalResults.forEach((resultado) => {
                const autoResponses = autoEvalMap.get(resultado.autoevaluacion_id) || {};
                const jefeResponses = jefeEvalMap.get(resultado.evaluacion_jefe_id) || {};
                const consolidadas = calculateConsolidatedResponses(autoResponses, jefeResponses, instrumentId);
                const porcentaje = calculateDimensionPercentage(consolidadas, dim);
                if (porcentaje > 0) {
                  sumaPorcentajes += porcentaje;
                  contador++;
                }
              });

              promedioMunicipal[dim.id] = contador > 0 ? Math.round(sumaPorcentajes / contador) : 0;
            });
          }
        }
      } catch (error) {
        console.error("Error calculando promedio municipal:", error);
      }

      // Identificar fortalezas y áreas de oportunidad
      const sortedDimensions = [...radarDataPDF].sort((a, b) => b.tuEvaluacion - a.tuEvaluacion);
      const fortalezas = sortedDimensions.slice(0, 3).map(f => ({
        dimension: f.dimension,
        nombreCompleto: f.nombreCompleto,
        tuEvaluacion: f.tuEvaluacion,
        promedioMunicipal: promedioMunicipal[f.dimensionData.id] || 0
      }));
      
      const areasOportunidad = sortedDimensions.slice(-3).reverse().map(a => ({
        dimension: a.dimension,
        nombreCompleto: a.nombreCompleto,
        tuEvaluacion: a.tuEvaluacion,
        promedioMunicipal: promedioMunicipal[a.dimensionData.id] || 0
      }));

      return {
        radarDataPDF: radarDataPDF.map(d => ({
          dimension: d.dimension,
          tuEvaluacion: d.tuEvaluacion,
          promedioMunicipal: promedioMunicipal[d.dimensionData.id] || 0,
          dimensionId: d.dimensionData?.id,
          descripcion: d.dimensionData?.descripcion
        })),
        fortalezas,
        areasOportunidad,
        performancePercentage,
        jefeCompleto: true
      };
    } catch (error: any) {
      console.error("Error preparando datos para PDF:", error);
      throw error;
    }
  };

  // Componente para exportar PDF (igual que en VistaResultadosFinales)
  const BotonExportarPDF = ({ colaborador, evaluacion }: { colaborador: any; evaluacion: any }) => {
    const [datosPDF, setDatosPDF] = useState<any>(null);
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
      if (evaluacion.estado !== "enviado") return;

      const cargarDatosPDF = async () => {
        setCargando(true);
        try {
          const periodoFinal = periodoId || (await getActivePeriodId());
          if (!periodoFinal) {
            setCargando(false);
            return;
          }
          
          // Cargar autoevaluación
          const { data: autoevaluacion } = await supabase
            .from("evaluations")
            .select("*")
            .eq("usuario_id", colaborador.dpi)
            .eq("periodo_id", periodoFinal)
            .eq("tipo", "auto")
            .eq("estado", "enviado")
            .single();

          if (!autoevaluacion) {
            setCargando(false);
            return;
          }

          // Obtener datos del colaborador completo primero (para tener el nivel)
          const { data: colaboradorCompleto } = await supabase
            .from("users")
            .select("*")
            .eq("dpi", colaborador.dpi)
            .single();

          if (!colaboradorCompleto) {
            setCargando(false);
            return;
          }

          // Cargar instrumento usando el nivel del colaborador completo
          const nivelColaborador = colaboradorCompleto.nivel || colaborador.nivel || "";
          if (!nivelColaborador) {
            setCargando(false);
            return;
          }

          const instrument = await getInstrumentForUser(nivelColaborador);
          if (!instrument) {
            setCargando(false);
            return;
          }

          // Cargar resultado final
          const resultadoFinal = await getConsolidatedResult(colaborador.dpi, periodoFinal) || 
            await (async () => {
              const { data } = await supabase
                .from("final_evaluation_results")
                .select("resultado_final")
                .eq("colaborador_id", colaborador.dpi)
                .eq("periodo_id", periodoFinal)
                .single();
              return data?.resultado_final || null;
            })();

          if (!resultadoFinal) {
            setCargando(false);
            return;
          }

          // Cargar plan de desarrollo
          const planDesarrollo = planesDesarrollo.get(colaborador.dpi);
          let planParaPDF = null;
          if (planDesarrollo) {
            const competencias = planDesarrollo.competencias_desarrollar || {};
            planParaPDF = {
              planEstructurado: planDesarrollo.planEstructurado || (typeof competencias === 'object' && competencias.acciones ? competencias : null),
              recomendaciones: planDesarrollo.recomendaciones || (typeof competencias === 'object' && competencias.recomendaciones ? competencias.recomendaciones : [])
            };
          }

          // Obtener nombre del período
          const { data: periodoData } = await supabase
            .from("evaluation_periods")
            .select("nombre")
            .eq("id", periodoFinal)
            .single();

          // Obtener nombre del jefe
          const { data: assignment } = await supabase
            .from("user_assignments")
            .select("jefe_id")
            .eq("colaborador_id", colaborador.dpi)
            .eq("activo", true)
            .single();

          let nombreJefe = "N/A";
          if (assignment?.jefe_id) {
            const { data: jefeData } = await supabase
              .from("users")
              .select("nombre, apellidos")
              .eq("dpi", assignment.jefe_id)
              .single();
            if (jefeData) {
              nombreJefe = `${jefeData.nombre} ${jefeData.apellidos}`;
            }
          }

          setDatosPDF({
            colaborador: colaboradorCompleto,
            autoevaluacion,
            evaluacionJefe: evaluacion,
            instrument,
            resultadoFinal,
            planDesarrollo: planParaPDF,
            periodoNombre: periodoData?.nombre || periodoFinal,
            nombreJefe
          });
        } catch (error) {
          console.error("Error cargando datos para PDF:", error);
        } finally {
          setCargando(false);
        }
      };

      cargarDatosPDF();
    }, [colaborador.dpi, evaluacion.estado, periodoId]);

    if (evaluacion.estado !== "enviado") {
      return (
        <Button variant="outline" size="sm" disabled>
          <FileDown className="h-3 w-3 mr-1" />
          Exportar PDF
        </Button>
      );
    }

    if (cargando || !datosPDF) {
      return (
        <Button variant="outline" size="sm" disabled>
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Cargando...
        </Button>
      );
    }

    const { colaborador: colCompleto, autoevaluacion, evaluacionJefe, instrument, resultadoFinal, planDesarrollo, periodoNombre, nombreJefe } = datosPDF;

    return (
      <Button variant="outline" size="sm" asChild>
        <PDFDownloadLink
          document={
            <EvaluacionPDF
              empleado={{
                nombre: colCompleto.nombre || colaborador.nombre || "",
                apellidos: colCompleto.apellidos || colaborador.apellidos || "",
                dpi: colCompleto.dpi || colaborador.dpi || "",
                cargo: colCompleto.cargo || colaborador.cargo || "",
                area: colCompleto.area || colaborador.area || "",
                nivel: colCompleto.nivel || colaborador.nivel || "",
                direccionUnidad: colCompleto.direccionUnidad || "",
                departamentoDependencia: colCompleto.departamentoDependencia || "",
                profesion: colCompleto.profesion || "",
                correo: colCompleto.correo || "",
                telefono: colCompleto.telefono || "",
                jefeNombre: nombreJefe,
                directoraRRHHNombre: "Brenda Carolina Lopez Perez",
              }}
              periodo={periodoNombre}
              fechaGeneracion={new Date()}
              resultadoData={{
                performancePercentage: resultadoFinal.desempenoFinal ? scoreToPercentage(resultadoFinal.desempenoFinal) : 0,
                jefeCompleto: !!evaluacionJefe,
                fortalezas: instrument.dimensionesDesempeno
                  .map((dim: any) => {
                    const autoItems = dim.items.map((item: any) => autoevaluacion.responses[item.id]).filter((v: any) => v !== undefined);
                    const jefeItems = dim.items.map((item: any) => evaluacionJefe.responses[item.id]).filter((v: any) => v !== undefined);
                    
                    const autoAvg = autoItems.length > 0 ? autoItems.reduce((sum: number, val: number) => sum + val, 0) / autoItems.length : 0;
                    const jefeAvg = jefeItems.length > 0 ? jefeItems.reduce((sum: number, val: number) => sum + val, 0) / jefeItems.length : 0;
                    
                    return {
                      dimension: dim.nombre,
                      nombreCompleto: dim.nombre,
                      tuEvaluacion: jefeAvg,
                      promedioMunicipal: autoAvg,
                    };
                  })
                  .sort((a: any, b: any) => b.tuEvaluacion - a.tuEvaluacion)
                  .slice(0, 3),
                areasOportunidad: instrument.dimensionesDesempeno
                  .map((dim: any) => {
                    const autoItems = dim.items.map((item: any) => autoevaluacion.responses[item.id]).filter((v: any) => v !== undefined);
                    const jefeItems = dim.items.map((item: any) => evaluacionJefe.responses[item.id]).filter((v: any) => v !== undefined);
                    
                    const autoAvg = autoItems.length > 0 ? autoItems.reduce((sum: number, val: number) => sum + val, 0) / autoItems.length : 0;
                    const jefeAvg = jefeItems.length > 0 ? jefeItems.reduce((sum: number, val: number) => sum + val, 0) / jefeItems.length : 0;
                    
                    return {
                      dimension: dim.nombre,
                      nombreCompleto: dim.nombre,
                      tuEvaluacion: jefeAvg,
                      promedioMunicipal: autoAvg,
                    };
                  })
                  .sort((a: any, b: any) => a.tuEvaluacion - b.tuEvaluacion)
                  .slice(0, 3),
                radarData: instrument.dimensionesDesempeno.map((dim: any) => {
                  const autoItems = dim.items.map((item: any) => autoevaluacion.responses[item.id]).filter((v: any) => v !== undefined);
                  const jefeItems = dim.items.map((item: any) => evaluacionJefe.responses[item.id]).filter((v: any) => v !== undefined);
                  
                  const autoAvg = autoItems.length > 0 ? autoItems.reduce((sum: number, val: number) => sum + val, 0) / autoItems.length : 0;
                  const jefeAvg = jefeItems.length > 0 ? jefeItems.reduce((sum: number, val: number) => sum + val, 0) / jefeItems.length : 0;
                  
                  return {
                    dimension: dim.nombre.substring(0, 20),
                    tuEvaluacion: jefeAvg,
                    promedioMunicipal: autoAvg,
                  };
                }),
                resultadoConsolidado: undefined,
              }}
              planDesarrollo={planDesarrollo}
            />
          }
          fileName={`evaluacion_${(colCompleto?.nombre || colaborador?.nombre || 'evaluacion').replace(/\s+/g, '_')}_${periodoNombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`}
          style={{ textDecoration: 'none' }}
        >
          <Download className="h-3 w-3 mr-1" />
          Exportar PDF
        </PDFDownloadLink>
      </Button>
    );
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "enviado":
        return <Badge className="bg-success text-white"><CheckCircle2 className="h-3 w-3 mr-1" />Completada</Badge>;
      case "borrador":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En Progreso</Badge>;
      default:
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Pendiente</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto p-6">
          <div className="text-center py-12">Cargando...</div>
        </main>
      </div>
    );
  }

  if (!jefe) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Jefe no encontrado</p>
            <Button onClick={() => navigate("/admin/dashboard")} className="mt-4">
              Volver al Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const completadas = evaluaciones.filter(e => e.estado === "enviado").length;
  const enProgreso = evaluaciones.filter(e => e.estado === "borrador").length;
  const pendientes = Math.max(0, totalEsperadas - completadas - enProgreso);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información del Jefe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nombre</p>
                <p className="font-semibold">{jefe.nombre} {jefe.apellidos}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cargo</p>
                <p className="font-semibold">{jefe.cargo || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Área</p>
                <p className="font-semibold">{jefe.area || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nivel</p>
                <p className="font-semibold">{jefe.nivel || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Resumen de Evaluaciones</CardTitle>
            <CardDescription>
              Estado de las evaluaciones realizadas por este jefe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-success">{completadas}</p>
                <p className="text-sm text-muted-foreground">Completadas</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-warning">{enProgreso}</p>
                <p className="text-sm text-muted-foreground">En Progreso</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-destructive">{pendientes}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Evaluaciones por Colaborador
            </CardTitle>
            <CardDescription>
              Lista detallada de todas las evaluaciones: completadas, en progreso y pendientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {evaluaciones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Este jefe no tiene colaboradores asignados</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Última Actualización</TableHead>
                    <TableHead>Plan de Desarrollo</TableHead>
                    <TableHead>Exportar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluaciones.map((evaluacion) => {
                    const colaborador = evaluacion.colaborador;
                    const progreso = evaluacion.progreso || 0;
                    const estaCompletada = evaluacion.estado === "enviado";
                    
                    return (
                      <TableRow 
                        key={evaluacion.id}
                        className={estaCompletada ? "bg-green-50/50 dark:bg-green-950/20" : ""}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {estaCompletada && (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            )}
                            {colaborador?.nombre} {colaborador?.apellidos}
                          </div>
                        </TableCell>
                        <TableCell>{colaborador?.cargo || "N/A"}</TableCell>
                        <TableCell>{colaborador?.area || "N/A"}</TableCell>
                        <TableCell>{getEstadoBadge(evaluacion.estado)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${progreso}%` }}
                              />
                            </div>
                            <span className="text-sm">{progreso}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {evaluacion.estado === "pendiente" 
                            ? "Sin iniciar"
                            : evaluacion.updated_at
                            ? new Date(evaluacion.updated_at).toLocaleDateString("es-ES", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const plan = planesDesarrollo.get(evaluacion.colaborador_id);
                            const estaGenerando = generandoPlanes.has(evaluacion.colaborador_id);
                            
                            if (plan) {
                              return (
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-success text-white">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Plan Generado
                                  </Badge>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => generarPlanDesarrollo(evaluacion.colaborador_id, `${colaborador?.nombre} ${colaborador?.apellidos}`)}
                                    disabled={estaGenerando}
                                  >
                                    {estaGenerando ? (
                                      <>
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        Generando...
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="h-3 w-3 mr-1" />
                                        Regenerar
                                      </>
                                    )}
                                  </Button>
                                </div>
                              );
                            } else {
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => generarPlanDesarrollo(evaluacion.colaborador_id, `${colaborador?.nombre} ${colaborador?.apellidos}`)}
                                  disabled={estaGenerando || evaluacion.estado !== "enviado"}
                                >
                                  {estaGenerando ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Generando...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="h-3 w-3 mr-1" />
                                      Generar Plan
                                    </>
                                  )}
                                </Button>
                              );
                            }
                          })()}
                        </TableCell>
                        <TableCell>
                          <BotonExportarPDF colaborador={colaborador} evaluacion={evaluacion} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default VistaDetalleJefe;

