import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Grid3x3, Users, Info, BookOpen, Target, Download, List, AlertCircle, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod, getEvaluationIdFromSupabase } from "@/lib/supabase";
import { calculateCompleteFinalScore } from "@/lib/finalScore";
import { getInstrumentForUser } from "@/lib/instruments";
import { scoreToPercentage } from "@/lib/calculations";
import { getFinalResultFromSupabase } from "@/lib/finalResultSupabase";
import { hasJefeEvaluation, getJefeEvaluationDraft, getSubmittedEvaluation } from "@/lib/storage";
import { getInstrumentConfigForUser } from "@/lib/backendCalculations";
import { QuadrantLegend } from "@/components/ninebox/QuadrantLegend";
import { QuadrantInfo } from "@/components/ninebox/QuadrantInfo";
import { NineBoxFilters, FilterOptions } from "@/components/ninebox/NineBoxFilters";
import { UrgentAlerts } from "@/components/ninebox/UrgentAlerts";
import { AdvancedList } from "@/components/ninebox/AdvancedList";
import { GlobalAnalytics } from "@/components/ninebox/GlobalAnalytics";
import {
  NINE_BOX_METADATA,
  NineBoxPosition,
  getQuadrantMetadata,
  getPositionColor,
  getPositionsByImportance,
  getPositionsByRetentionPriority
} from "@/lib/nineBoxMetadata";
import {
  exportNineBoxToPDF,
  exportNineBoxToExcel,
  exportNineBoxToJSON
} from "@/lib/nineBoxExport";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface TeamMember9Box {
  dpi: string;
  nombre: string;
  cargo: string;
  area: string;
  nivel: string;
  desempenoFinal: number;
  potencial?: number;
  posicion9Box: string;
  desempenoPorcentaje: number;
  potencialPorcentaje?: number;
  jefe?: string; // Para vista RRHH
  jefeNombre?: string; // Para vista RRHH
  totalEvaluadores?: number; // Número de evaluadores para este colaborador
}

interface NineBoxData {
  [key: string]: TeamMember9Box[];
  "alto-alto": TeamMember9Box[];
  "alto-medio": TeamMember9Box[];
  "alto-bajo": TeamMember9Box[];
  "medio-alto": TeamMember9Box[];
  "medio-medio": TeamMember9Box[];
  "medio-bajo": TeamMember9Box[];
  "bajo-alto": TeamMember9Box[];
  "bajo-medio": TeamMember9Box[];
  "bajo-bajo": TeamMember9Box[];
}

const Matriz9Box = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember9Box[]>([]);
  const [showLegend, setShowLegend] = useState(false);
  const [activePeriodName, setActivePeriodName] = useState<string>("");
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: "",
  });
  const [nineBoxData, setNineBoxData] = useState<NineBoxData>({
    "alto-alto": [],
    "alto-medio": [],
    "alto-bajo": [],
    "medio-alto": [],
    "medio-medio": [],
    "medio-bajo": [],
    "bajo-alto": [],
    "bajo-medio": [],
    "bajo-bajo": [],
  });

  // Detectar si el usuario es RRHH o Admin General
  const isRRHH = user?.rol === "admin_rrhh" || user?.rol === "admin_general";
  const isGlobalView = isRRHH;

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadTeamNineBox();
  }, [user, navigate]);

  const loadTeamNineBox = async () => {
    try {
      setLoading(true);

      const activePeriod = await getActivePeriod();
      if (!activePeriod) {
        toast.error("No se encontró un período de evaluación activo");
        return;
      }
      const periodoId = activePeriod.id;
      setActivePeriodName(activePeriod.nombre);

      const members: TeamMember9Box[] = [];

      // RRHH: Cargar TODOS los colaboradores evaluados de la municipalidad
      // NOTA: Los miembros del Concejo (C1) se excluyen de la matriz 9-Box porque
      // solo tienen autoevaluación de desempeño (sin evaluación de potencial),
      // y la matriz 9-Box requiere ambas dimensiones.
      if (isRRHH) {
        console.log("🔍 RRHH cargando matriz 9-box para periodo:", periodoId);

        // Obtener todos los resultados finales consolidados del período activo
        const { data: finalResults, error: finalResultsError } = await supabase
          .from("final_evaluation_results_consolidated")
          .select(`
            colaborador_id,
            desempeno_final_promedio,
            potencial_promedio,
            posicion_9box_moda,
            total_evaluadores,
            users!final_evaluation_results_consolidated_colaborador_id_fkey (
              dpi,
              nombre,
              apellidos,
              cargo,
              nivel,
              area
            )
          `)
          .eq("periodo_id", periodoId);

        console.log("📊 Resultados obtenidos:", finalResults?.length || 0);
        console.log("❌ Error:", finalResultsError);

        if (finalResultsError) {
          console.error("Error cargando resultados finales:", finalResultsError);
          toast.error(`Error al cargar resultados: ${finalResultsError.message}`);
          throw finalResultsError;
        }

        // Si no hay resultados, mostrar mensaje informativo
        if (!finalResults || finalResults.length === 0) {
          console.warn("⚠️ No se encontraron resultados finales para el período:", periodoId);
          toast.info(`No se encontraron evaluaciones completadas para el período "${activePeriod.nombre}". Asegúrate de que las evaluaciones hayan sido enviadas por los jefes y colaboradores.`);
          setTeamMembers([]);
          setNineBoxData({
            "alto-alto": [], "alto-medio": [], "alto-bajo": [],
            "medio-alto": [], "medio-medio": [], "medio-bajo": [],
            "bajo-alto": [], "bajo-medio": [], "bajo-bajo": [],
          });
          return;
        }

        // Obtener información de jefes para cada colaborador
        const { data: assignments, error: assignmentsError } = await supabase
          .from("user_assignments")
          .select(`
            colaborador_id,
            jefe_id,
            jefe:users!user_assignments_jefe_id_fkey (
              dpi,
              nombre,
              apellidos
            )
          `)
          .eq("activo", true);

        if (assignmentsError) throw assignmentsError;

        // Crear mapa de colaborador -> jefe
        const jefeMap = new Map();
        for (const assignment of assignments || []) {
          const jefe = Array.isArray(assignment.jefe) ? assignment.jefe[0] : assignment.jefe;
          if (jefe) {
            jefeMap.set(assignment.colaborador_id, {
              dpi: jefe.dpi,
              nombre: `${jefe.nombre} ${jefe.apellidos}`
            });
          }
        }

        for (const result of finalResults || []) {
          const colaborador = Array.isArray(result.users) ? result.users[0] : result.users;

          if (!colaborador) {
            console.warn("⚠️ Colaborador no encontrado para resultado:", result.colaborador_id);
            continue;
          }

          // Excluir miembros del Concejo (C1) de la matriz 9-Box ya que no tienen evaluación de potencial
          if (colaborador.nivel === 'C1') {
            console.log("ℹ️ Excluyendo miembro del Concejo (C1) de matriz 9-Box:", colaborador.nombre, colaborador.apellidos);
            continue;
          }

          if (!result.posicion_9box_moda) {
            console.warn("⚠️ Sin posición 9-box para:", colaborador.nombre, colaborador.apellidos);
            continue;
          }

          const jefeInfo = jefeMap.get(result.colaborador_id);

          members.push({
            dpi: colaborador.dpi,
            nombre: `${colaborador.nombre} ${colaborador.apellidos}`,
            cargo: colaborador.cargo,
            area: colaborador.area,
            nivel: colaborador.nivel,
            desempenoFinal: result.desempeno_final_promedio,
            potencial: result.potencial_promedio,
            posicion9Box: result.posicion_9box_moda,
            totalEvaluadores: result.total_evaluadores || 1,
            desempenoPorcentaje: scoreToPercentage(result.desempeno_final_promedio),
            potencialPorcentaje: result.potencial_promedio ? scoreToPercentage(result.potencial_promedio) : undefined,
            jefe: jefeInfo?.dpi,
            jefeNombre: jefeInfo?.nombre,
          });
        }

        console.log("✅ Total miembros cargados para RRHH:", members.length);
      }
      // JEFE: Cargar solo colaboradores asignados
      // NOTA: Los miembros del Concejo (C1) se excluyen de la matriz 9-Box porque
      // solo tienen autoevaluación de desempeño (sin evaluación de potencial),
      // y la matriz 9-Box requiere ambas dimensiones.
      else {
        const { data: assignments, error: assignmentsError } = await supabase
          .from("user_assignments")
          .select(`
            colaborador_id,
            users!user_assignments_colaborador_id_fkey (
              dpi,
              nombre,
              apellidos,
              cargo,
              nivel,
              area
            )
          `)
          .eq("jefe_id", user.dpi)
          .eq("activo", true);

        if (assignmentsError) throw assignmentsError;

        for (const assignment of assignments || []) {
          const colaborador = Array.isArray(assignment.users) ? assignment.users[0] : assignment.users;
          if (!colaborador) continue;

          // Excluir miembros del Concejo (C1) de la matriz 9-Box ya que no tienen evaluación de potencial
          if (colaborador.nivel === 'C1') {
            console.log("ℹ️ Excluyendo miembro del Concejo (C1) de matriz 9-Box:", colaborador.nombre, colaborador.apellidos);
            continue;
          }

          const colaboradorDpi = colaborador.dpi;
          const jefeEvaluado = await hasJefeEvaluation(user.dpi, colaboradorDpi, periodoId);

          if (!jefeEvaluado) continue;

          // Intentar cargar resultado consolidado primero
          const { getConsolidatedResult } = await import("@/lib/finalResultSupabase");
          let resultadoConsolidado = await getConsolidatedResult(colaboradorDpi, periodoId);
          
          let resultadoFinal: any = null;
          if (resultadoConsolidado && Object.keys(resultadoConsolidado).length > 0) {
            resultadoFinal = {
              desempenoFinal: resultadoConsolidado.desempenoFinalPromedio || 0,
              potencial: resultadoConsolidado.potencialPromedio,
              posicion9Box: resultadoConsolidado.posicion9BoxModa,
            };
            console.log("✅ [Matriz9Box] Resultado consolidado cargado:", {
              colaborador: `${colaborador.nombre} ${colaborador.apellidos}`,
              desempenoFinal: resultadoFinal.desempenoFinal,
              potencial: resultadoFinal.potencial,
              posicion9Box: resultadoFinal.posicion9Box
            });
          } else {
            // Fallback: usar getFinalResultFromSupabase
            resultadoFinal = await getFinalResultFromSupabase(colaboradorDpi, periodoId);
            console.log("✅ [Matriz9Box] Resultado desde final_evaluation_results:", {
              colaborador: `${colaborador.nombre} ${colaborador.apellidos}`,
              resultadoFinal: resultadoFinal
            });
          }

          if (!resultadoFinal) {
            const evaluacionJefe = await getJefeEvaluationDraft(user.dpi, colaboradorDpi, periodoId);
            const autoevaluacion = await getSubmittedEvaluation(colaboradorDpi, periodoId);

            if (!evaluacionJefe || evaluacionJefe.estado !== "enviado" || !autoevaluacion) continue;

            const instrument = await getInstrumentForUser(colaborador.nivel);
            if (!instrument) continue;

            const autoevaluacionId = await getEvaluationIdFromSupabase(colaboradorDpi, periodoId, "auto");
            const evaluacionJefeId = await getEvaluationIdFromSupabase(colaboradorDpi, periodoId, "jefe", user.dpi, colaboradorDpi);
            const instrumentConfig = await getInstrumentConfigForUser(colaboradorDpi);

            if (autoevaluacionId && evaluacionJefeId && instrumentConfig) {
              try {
                resultadoFinal = await calculateCompleteFinalScore(
                  autoevaluacion, evaluacionJefe, instrument.dimensionesDesempeno, instrument.dimensionesPotencial, true, autoevaluacionId, evaluacionJefeId, instrumentConfig
                );
              } catch (error) {
                resultadoFinal = await calculateCompleteFinalScore(
                  autoevaluacion, evaluacionJefe, instrument.dimensionesDesempeno, instrument.dimensionesPotencial, false
                );
              }
            } else {
              resultadoFinal = await calculateCompleteFinalScore(
                autoevaluacion, evaluacionJefe, instrument.dimensionesDesempeno, instrument.dimensionesPotencial, false
              );
            }

            if (!resultadoFinal.posicion9Box) continue;
          }

          members.push({
            dpi: colaboradorDpi,
            nombre: `${colaborador.nombre} ${colaborador.apellidos}`,
            cargo: colaborador.cargo,
            area: colaborador.area,
            nivel: colaborador.nivel,
            desempenoFinal: resultadoFinal.desempenoFinal,
            potencial: resultadoFinal.potencial,
            posicion9Box: resultadoFinal.posicion9Box || "medio-medio",
            desempenoPorcentaje: scoreToPercentage(resultadoFinal.desempenoFinal),
            potencialPorcentaje: resultadoFinal.potencial ? scoreToPercentage(resultadoFinal.potencial) : undefined,
          });
        }
      }

      setTeamMembers(members);

      const organized: NineBoxData = {
        "alto-alto": [], "alto-medio": [], "alto-bajo": [],
        "medio-alto": [], "medio-medio": [], "medio-bajo": [],
        "bajo-alto": [], "bajo-medio": [], "bajo-bajo": [],
      };

      members.forEach(member => {
        if (member.posicion9Box && organized[member.posicion9Box as keyof NineBoxData]) {
          organized[member.posicion9Box as keyof NineBoxData].push(member);
        }
      });

      setNineBoxData(organized);
    } catch (error: any) {
      console.error("Error loading 9-box matrix:", error);
      toast.error("Error al cargar matriz 9-box");
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de miembros
  const filteredMembers = useMemo(() => {
    return teamMembers.filter(member => {
      // Búsqueda por texto
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch =
          member.nombre.toLowerCase().includes(searchLower) ||
          member.cargo.toLowerCase().includes(searchLower) ||
          member.area.toLowerCase().includes(searchLower) ||
          (member.jefeNombre && member.jefeNombre.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Filtro por posición
      if (filters.position && member.posicion9Box !== filters.position) return false;

      // Filtro por área
      if (filters.area && member.area !== filters.area) return false;

      // Filtro por nivel
      if (filters.nivel && member.nivel !== filters.nivel) return false;

      // Filtro por cargo
      if (filters.cargo && member.cargo !== filters.cargo) return false;

      // Filtro por jefe (RRHH)
      if (filters.jefe && member.jefe !== filters.jefe) return false;

      // Filtro por número de evaluadores
      if (filters.numEvaluadores) {
        const numEvaluadores = member.totalEvaluadores || 1;
        if (filters.numEvaluadores === "multiple" && numEvaluadores <= 1) return false;
        if (filters.numEvaluadores === "single" && numEvaluadores > 1) return false;
      }

      // Filtro por importancia estratégica
      if (filters.importancia) {
        const metadata = getQuadrantMetadata(member.posicion9Box);
        if (metadata?.strategicImportance !== filters.importancia) return false;
      }

      // Filtro por prioridad de retención
      if (filters.retencion) {
        const metadata = getQuadrantMetadata(member.posicion9Box);
        if (metadata?.retentionPriority !== filters.retencion) return false;
      }

      return true;
    });
  }, [teamMembers, filters]);

  // Reorganizar datos filtrados
  const filteredNineBoxData = useMemo(() => {
    const organized: NineBoxData = {
      "alto-alto": [], "alto-medio": [], "alto-bajo": [],
      "medio-alto": [], "medio-medio": [], "medio-bajo": [],
      "bajo-alto": [], "bajo-medio": [], "bajo-bajo": [],
    };

    filteredMembers.forEach(member => {
      if (member.posicion9Box && organized[member.posicion9Box as keyof NineBoxData]) {
        organized[member.posicion9Box as keyof NineBoxData].push(member);
      }
    });

    return organized;
  }, [filteredMembers]);

  // Opciones para filtros
  const availableAreas = useMemo(() => [...new Set(teamMembers.map(m => m.area))].sort(), [teamMembers]);
  const availableNiveles = useMemo(() => [...new Set(teamMembers.map(m => m.nivel))].sort(), [teamMembers]);
  const availableCargos = useMemo(() => [...new Set(teamMembers.map(m => m.cargo))].sort(), [teamMembers]);
  const availableJefes = useMemo(() => {
    if (!isGlobalView) return [];
    const jefesMap = new Map<string, string>();
    teamMembers.forEach(m => {
      if (m.jefe && m.jefeNombre) {
        jefesMap.set(m.jefe, m.jefeNombre);
      }
    });
    return Array.from(jefesMap.entries())
      .map(([dpi, nombre]) => ({ dpi, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [teamMembers, isGlobalView]);

  const positions: Array<{ key: keyof NineBoxData; row: number; col: number }> = [
    { key: "bajo-alto", row: 0, col: 0 }, { key: "medio-alto", row: 0, col: 1 }, { key: "alto-alto", row: 0, col: 2 },
    { key: "bajo-medio", row: 1, col: 0 }, { key: "medio-medio", row: 1, col: 1 }, { key: "alto-medio", row: 1, col: 2 },
    { key: "bajo-bajo", row: 2, col: 0 }, { key: "medio-bajo", row: 2, col: 1 }, { key: "alto-bajo", row: 2, col: 2 },
  ];

  const totalEvaluados = teamMembers.length;
  const criticalTalent = getPositionsByImportance("critical");
  const urgentRetention = getPositionsByRetentionPriority("urgent");

  const criticalTalentCount = criticalTalent.reduce(
    (sum, metadata) => sum + (filteredNineBoxData[metadata.key as keyof NineBoxData]?.length || 0), 0
  );
  const urgentRetentionCount = urgentRetention.reduce(
    (sum, metadata) => sum + (filteredNineBoxData[metadata.key as keyof NineBoxData]?.length || 0), 0
  );

  // Handlers de exportación
  const handleExportPDF = async () => {
    try {
      toast.loading("Generando PDF...");
      const fileName = await exportNineBoxToPDF(
        filteredMembers,
        filteredNineBoxData,
        user?.nombre || "Manager",
        activePeriodName
      );
      toast.success(`PDF generado: ${fileName}`);
    } catch (error) {
      toast.error("Error al generar PDF");
      console.error(error);
    }
  };

  const handleExportExcel = () => {
    try {
      toast.loading("Generando Excel...");
      const fileName = exportNineBoxToExcel(
        filteredMembers,
        filteredNineBoxData,
        user?.nombre || "Manager",
        activePeriodName
      );
      toast.success(`Excel generado: ${fileName}`);
    } catch (error) {
      toast.error("Error al generar Excel");
      console.error(error);
    }
  };

  const handleExportJSON = () => {
    try {
      const fileName = exportNineBoxToJSON(
        filteredMembers,
        filteredNineBoxData,
        user?.nombre || "Manager",
        activePeriodName
      );
      toast.success(`JSON exportado: ${fileName}`);
    } catch (error) {
      toast.error("Error al exportar JSON");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/evaluacion-equipo")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Equipo
          </Button>

          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPDF}>
                  📄 Exportar a PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  📊 Exportar a Excel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportJSON}>
                  💾 Exportar datos JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={showLegend} onOpenChange={setShowLegend}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Guía Completa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Guía Completa de la Matriz 9-Box</DialogTitle>
                  <DialogDescription>
                    Comprenda cada cuadrante y las acciones recomendadas para la gestión del talento
                  </DialogDescription>
                </DialogHeader>
                <QuadrantLegend showDetailedInfo={true} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Grid3x3 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Matriz 9-Box de Talento</h1>
            {isGlobalView && (
              <Badge variant="default" className="bg-blue-600 text-white">
                Vista Global - RRHH
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {isGlobalView
              ? "Vista completa de toda la municipalidad - Análisis estratégico organizacional"
              : "Análisis estratégico de talento basado en desempeño actual y potencial futuro"
            }
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Cargando matriz 9-box...</p>
            </CardContent>
          </Card>
        ) : totalEvaluados === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay colaboradores evaluados aún</p>
              <p className="text-sm text-muted-foreground mt-2">
                Complete las evaluaciones de sus colaboradores para ver la matriz 9-box
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Filtros */}
            <NineBoxFilters
              filters={filters}
              onFiltersChange={setFilters}
              availableAreas={availableAreas}
              availableNiveles={availableNiveles}
              availableCargos={availableCargos}
              availableJefes={availableJefes}
              totalCount={totalEvaluados}
              filteredCount={filteredMembers.length}
              isGlobalView={isGlobalView}
            />

            {/* Alertas Urgentes */}
            <UrgentAlerts teamMembers={filteredMembers} />

            <Tabs defaultValue="matriz" className="space-y-6">
              <TabsList className={`grid w-full ${isGlobalView ? "grid-cols-5" : "grid-cols-4"}`}>
                <TabsTrigger value="matriz">
                  <Grid3x3 className="h-4 w-4 mr-2" />
                  Matriz Visual
                </TabsTrigger>
                <TabsTrigger value="lista">
                  <List className="h-4 w-4 mr-2" />
                  Vista de Lista
                </TabsTrigger>
                {isGlobalView && (
                  <TabsTrigger value="global">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Análisis Global
                  </TabsTrigger>
                )}
                <TabsTrigger value="prioridades">
                  <Target className="h-4 w-4 mr-2" />
                  Prioridades
                </TabsTrigger>
                <TabsTrigger value="guia">
                  <Info className="h-4 w-4 mr-2" />
                  Guía
                </TabsTrigger>
              </TabsList>

              {/* Tab: Matriz Visual */}
              <TabsContent value="matriz" className="space-y-6">
                {/* Resumen Estratégico */}
                <Card>
                  <CardHeader>
                    <CardTitle>Resumen Estratégico del Talento</CardTitle>
                    <CardDescription>Indicadores clave para la toma de decisiones</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                        <p className="text-sm text-blue-700 mb-1">Total Evaluados</p>
                        <p className="text-2xl font-bold text-blue-900">{filteredMembers.length}</p>
                        {filteredMembers.length < totalEvaluados && (
                          <p className="text-xs text-blue-600 mt-1">de {totalEvaluados} totales</p>
                        )}
                      </div>
                      <div className="p-4 rounded-lg border bg-red-50 border-red-200">
                        <p className="text-sm text-red-700 mb-1">Talento Crítico ⭐</p>
                        <p className="text-2xl font-bold text-red-900">{criticalTalentCount}</p>
                        <p className="text-xs text-red-600 mt-1">Máxima prioridad</p>
                      </div>
                      <div className="p-4 rounded-lg border bg-orange-50 border-orange-200">
                        <p className="text-sm text-orange-700 mb-1">Retención Urgente 🔒</p>
                        <p className="text-2xl font-bold text-orange-900">{urgentRetentionCount}</p>
                        <p className="text-xs text-orange-600 mt-1">Acción inmediata</p>
                      </div>
                      <div className="p-4 rounded-lg border bg-green-50 border-green-200">
                        <p className="text-sm text-green-700 mb-1">Alto Potencial 💎</p>
                        <p className="text-2xl font-bold text-green-900">
                          {filteredNineBoxData["alto-alto"].length +
                           filteredNineBoxData["medio-alto"].length +
                           filteredNineBoxData["bajo-alto"].length}
                        </p>
                        <p className="text-xs text-green-600 mt-1">Líderes futuros</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Matriz 9-Box Visual */}
                <Card>
                  <CardHeader>
                    <CardTitle>Matriz 9-Box del Equipo</CardTitle>
                    <CardDescription>
                      Haga clic en cualquier cuadrante para ver información detallada y recomendaciones
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm font-medium mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Eje Vertical:</span>
                          <Badge variant="outline">Potencial (Capacidad Futura)</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Desempeño (Resultados Actuales)</Badge>
                          <span className="text-muted-foreground">:Eje Horizontal</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {positions.map((pos) => {
                          const members = filteredNineBoxData[pos.key];
                          const metadata = getQuadrantMetadata(pos.key as string);

                          return (
                            <Dialog key={pos.key}>
                              <DialogTrigger asChild>
                                <div
                                  className={`min-h-[180px] p-4 rounded-lg border-2 cursor-pointer hover:shadow-lg transition-all ${getPositionColor(pos.key as NineBoxPosition)}`}
                                >
                                  <div className="mb-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xl">{metadata?.icon}</span>
                                        <Badge variant="outline" className="text-xs font-semibold">
                                          {metadata?.shortName}
                                        </Badge>
                                      </div>
                                      <Badge className="bg-primary/20 text-primary border-primary/30">
                                        {members.length}
                                      </Badge>
                                    </div>
                                    <p className="text-xs font-medium line-clamp-2">{metadata?.label}</p>
                                  </div>

                                  <div className="space-y-1.5 max-h-[100px] overflow-y-auto">
                                    {members.length === 0 ? (
                                      <p className="text-xs text-muted-foreground text-center py-4">Sin colaboradores</p>
                                    ) : (
                                      members.slice(0, 3).map((member) => (
                                        <div
                                          key={member.dpi}
                                          className="p-1.5 rounded bg-background/60 text-xs"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/evaluacion-equipo/${member.dpi}/comparativa`);
                                          }}
                                        >
                                          <p className="font-medium truncate text-xs">{member.nombre}</p>
                                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                            <span>D: {member.desempenoPorcentaje}%</span>
                                            {member.potencialPorcentaje !== undefined && (
                                              <span>P: {member.potencialPorcentaje}%</span>
                                            )}
                                          </div>
                                        </div>
                                      ))
                                    )}
                                    {members.length > 3 && (
                                      <p className="text-xs text-center text-muted-foreground pt-1">
                                        +{members.length - 3} más...
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <span className="text-2xl">{metadata?.icon}</span>
                                    {metadata?.label}
                                  </DialogTitle>
                                  <DialogDescription>
                                    {members.length} colaborador{members.length !== 1 ? "es" : ""} en este cuadrante
                                  </DialogDescription>
                                </DialogHeader>

                                <QuadrantInfo position={pos.key as string} showActions={true} />

                                {members.length > 0 && (
                                  <div className="mt-6">
                                    <h4 className="font-semibold mb-3">Colaboradores en este cuadrante:</h4>
                                    <div className="grid gap-3 md:grid-cols-2">
                                      {members.map((member) => (
                                        <Card
                                          key={member.dpi}
                                          className="cursor-pointer hover:shadow-md transition-shadow"
                                          onClick={() => navigate(`/evaluacion-equipo/${member.dpi}/comparativa`)}
                                        >
                                          <CardContent className="p-4">
                                            <div className="flex items-center gap-2 mb-1">
                                              <p className="font-medium text-sm">{member.nombre}</p>
                                              {member.totalEvaluadores && member.totalEvaluadores > 1 && (
                                                <Badge variant="outline" className="text-xs">
                                                  <Users className="h-3 w-3 mr-1" />
                                                  {member.totalEvaluadores}
                                                </Badge>
                                              )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-2">
                                              {member.cargo} • {member.area}
                                            </p>
                                            <div className="flex items-center gap-4 text-xs">
                                              <div>
                                                <span className="text-muted-foreground">Desempeño: </span>
                                                <span className="font-medium">{member.desempenoPorcentaje}%</span>
                                              </div>
                                              {member.potencialPorcentaje !== undefined && (
                                                <div>
                                                  <span className="text-muted-foreground">Potencial: </span>
                                                  <span className="font-medium">{member.potencialPorcentaje}%</span>
                                                </div>
                                              )}
                                            </div>
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          );
                        })}
                      </div>

                      <div className="flex justify-between items-end pt-2">
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded"></div>
                            <span>Alto ↑</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                            <span>Medio</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded"></div>
                            <span>Bajo ↓</span>
                          </div>
                          <span className="font-semibold mt-1">POTENCIAL</span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-semibold">DESEMPEÑO</span>
                          <span>← Bajo</span>
                          <div className="w-3 h-3 bg-red-500 rounded"></div>
                          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                          <div className="w-3 h-3 bg-green-500 rounded"></div>
                          <span>Alto →</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Vista de Lista */}
              <TabsContent value="lista">
                <AdvancedList members={filteredMembers} />
              </TabsContent>

              {/* Tab: Análisis Global (Solo RRHH) */}
              {isGlobalView && (
                <TabsContent value="global">
                  <GlobalAnalytics allMembers={teamMembers} />
                </TabsContent>
              )}

              {/* Tab: Prioridades Estratégicas */}
              <TabsContent value="prioridades" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Acciones Prioritarias por Cuadrante</CardTitle>
                    <CardDescription>
                      Recomendaciones específicas según la importancia estratégica y prioridad de retención
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {Object.entries(filteredNineBoxData).map(([position, members]) => {
                      if (members.length === 0) return null;
                      return (
                        <div key={position}>
                          <QuadrantInfo position={position} showActions={true} compact={true} />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Guía de Uso */}
              <TabsContent value="guia">
                <QuadrantLegend showDetailedInfo={true} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
};

export default Matriz9Box;
