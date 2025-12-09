import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutDashboard,
  List,
  Grid3X3,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
  LogIn,
  Filter,
  FileDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { TeamAnalysisSummary } from "./TeamAnalysisSummary";
import { TeamMembersListCascada } from "./TeamMembersListCascada";
import { TeamNineBoxView } from "./TeamNineBoxView";
import { TeamMemberDetailModal } from "./TeamMemberDetailModal";

import {
  getEquipoCascadaCompleto,
  get9BoxCascadaFiltrable,
  TeamAnalysisError
} from "@/lib/teamAnalysis";
import { exportTeamAnalysisPDF } from "@/lib/exports";
import { supabase } from "@/integrations/supabase/client";
import type { TeamAIAnalysisResponse } from "@/types/teamAnalysis";

import type {
  TeamAnalysisTabProps,
  TeamAnalysisNodeCascada,
  TeamAnalysisStats,
  TeamMember9Box,
  JefeParaFiltro,
  GrupoParaFiltro,
} from "@/types/teamAnalysis";

// Tipos de error para UI
type ErrorType = "generic" | "unauthorized" | "forbidden" | "validation";

export function TeamAnalysisUnidadTab({ usuarioDpi, periodoId }: TeamAnalysisTabProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("resumen");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType>("generic");

  // Datos del equipo en cascada
  const [colaboradores, setColaboradores] = useState<TeamAnalysisNodeCascada[]>([]);
  const [stats, setStats] = useState<TeamAnalysisStats | null>(null);
  const [nineBoxData, setNineBoxData] = useState<TeamMember9Box[]>([]);
  const [jefesSubordinados, setJefesSubordinados] = useState<JefeParaFiltro[]>([]);
  const [gruposParaFiltro] = useState<GrupoParaFiltro[]>([]);

  // Filtro de jefe para 9-Box
  const [filtroJefe9Box, setFiltroJefe9Box] = useState<string>("todos");
  const [isLoading9Box, setIsLoading9Box] = useState(false);

  // Modal de detalle
  const [selectedMemberDpi, setSelectedMemberDpi] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Nombre del usuario actual para mostrar en la lista
  const [nombreUsuario, setNombreUsuario] = useState<string>("Tú");

  // Estado para exportación PDF
  const [isExporting, setIsExporting] = useState(false);
  const [jefeInfo, setJefeInfo] = useState<{ nombre: string; cargo: string; area: string } | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState<string>("");

  // Determinar tipo de error basado en el mensaje
  const categorizeError = (err: unknown): { message: string; type: ErrorType } => {
    if (err instanceof TeamAnalysisError) {
      if (err.code === "VALIDATION_ERROR") {
        return { message: err.message, type: "validation" };
      }
      if (err.statusCode === 401 || err.message.includes("UNAUTHORIZED")) {
        return { message: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.", type: "unauthorized" };
      }
      if (err.statusCode === 403 || err.message.includes("FORBIDDEN")) {
        return { message: "No tienes permisos para ver los datos de esta unidad.", type: "forbidden" };
      }
      return { message: err.message, type: "generic" };
    }
    if (err instanceof Error) {
      if (err.message.includes("UNAUTHORIZED")) {
        return { message: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.", type: "unauthorized" };
      }
      if (err.message.includes("FORBIDDEN")) {
        return { message: "No tienes permisos para ver los datos de esta unidad.", type: "forbidden" };
      }
      return { message: err.message, type: "generic" };
    }
    return { message: "Error al cargar los datos de la unidad. Por favor, intenta de nuevo.", type: "generic" };
  };

  // Cargar datos del equipo en cascada
  const loadData = useCallback(async () => {
    if (!usuarioDpi || !periodoId) return;

    setIsLoading(true);
    setError(null);
    setErrorType("generic");

    try {
      // Una sola llamada obtiene todo
      const data = await getEquipoCascadaCompleto(usuarioDpi, periodoId);

      if (data) {
        // Colaboradores
        setColaboradores(data.colaboradores);

        // Stats con eNPS incluido
        setStats({
          ...data.estadisticas,
          eNPS: data.eNPS.valor ?? undefined,
          eNPSPromoters: data.eNPS.promoters,
          eNPSPassives: data.eNPS.passives,
          eNPSDetractors: data.eNPS.detractors,
          eNPSTotalRespuestas: data.eNPS.totalRespuestas,
          eNPSOrganizacion: data.eNPS.valorOrganizacion ?? undefined,
        });

        // Jefes subordinados para filtros
        setJefesSubordinados(data.jefesSubordinados);

        // Convertir colaboradores a formato 9-Box
        const nineBox: TeamMember9Box[] = data.colaboradores
          .filter((c) => c.tieneEvaluacion && c.posicion9Box)
          .map((c) => ({
            dpi: c.dpi,
            nombre: c.nombreCompleto, // Usar nombreCompleto como nombre principal
            nombreCompleto: c.nombreCompleto, // También mantenerlo como nombreCompleto para compatibilidad
            cargo: c.cargo,
            area: c.area,
            nivel: c.nivel,
            desempenoFinal: c.desempenoPorcentaje || 0,
            potencial: c.potencialPorcentaje || 0,
            desempenoPorcentaje: c.desempenoPorcentaje || 0,
            potencialPorcentaje: c.potencialPorcentaje || 0,
            posicion9Box: c.posicion9Box!,
            jefeDpi: c.jefeDpi,
            jefeNombre: c.jefeNombre,
          }));
        setNineBoxData(nineBox);

        // Cargar info del jefe para exportación PDF
        const { data: jefeData } = await supabase
          .from("users")
          .select("nombre, apellidos, cargo, area")
          .eq("dpi", usuarioDpi)
          .single();

        if (jefeData) {
          const nombreCompleto = jefeData.nombre && jefeData.apellidos 
            ? `${jefeData.nombre} ${jefeData.apellidos}` 
            : jefeData.nombre || "";
          setJefeInfo({
            nombre: nombreCompleto,
            cargo: jefeData.cargo || "",
            area: jefeData.area || "",
          });
          setNombreUsuario(nombreCompleto || "Tú");
        }

        // Cargar nombre del periodo
        const { data: periodoData } = await supabase
          .from("evaluation_periods")
          .select("nombre")
          .eq("id", periodoId)
          .single();

        if (periodoData) {
          setPeriodoNombre(periodoData.nombre || periodoId);
        }
      }
    } catch (err) {
      const { message, type } = categorizeError(err);
      setError(message);
      setErrorType(type);
    } finally {
      setIsLoading(false);
    }
  }, [usuarioDpi, periodoId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cargar 9-Box filtrado cuando cambia el filtro de jefe
  const load9BoxFiltered = useCallback(async () => {
    if (!usuarioDpi || !periodoId) return;

    setIsLoading9Box(true);
    try {
      const filtroJefeDpi = filtroJefe9Box === "todos" ? undefined : filtroJefe9Box;
      const data = await get9BoxCascadaFiltrable(usuarioDpi, periodoId, filtroJefeDpi);
      setNineBoxData(data);
    } catch (err) {
      console.error("Error cargando 9-Box filtrado:", err);
    } finally {
      setIsLoading9Box(false);
    }
  }, [usuarioDpi, periodoId, filtroJefe9Box]);

  useEffect(() => {
    if (activeTab === "9box" && filtroJefe9Box !== "todos") {
      load9BoxFiltered();
    }
  }, [filtroJefe9Box, activeTab, load9BoxFiltered]);

  // Manejar click en miembro
  const handleMemberClick = (member: TeamAnalysisNodeCascada | TeamMember9Box | any) => {
    // Aceptar cualquier tipo y extraer el DPI
    const dpi = member.dpi || (member as any).dpi;
    if (dpi) {
      setSelectedMemberDpi(dpi);
      setIsDetailModalOpen(true);
    } else {
      console.warn("No se pudo obtener DPI del miembro:", member);
    }
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedMemberDpi(null);
  };

  // Exportar PDF
  const handleExportPDF = async () => {
    if (!stats || !jefeInfo) {
      return;
    }

    setIsExporting(true);
    try {
      // Cargar análisis IA si existe
      let aiAnalysis: TeamAIAnalysisResponse | null = null;
      const { data: analysisData } = await supabase
        .from("team_analysis")
        .select("analysis")
        .eq("jefe_dpi", usuarioDpi)
        .eq("periodo_id", periodoId)
        .eq("tipo", "cascada")
        .maybeSingle();

      if (analysisData?.analysis) {
        try {
          aiAnalysis = typeof analysisData.analysis === "string"
            ? JSON.parse(analysisData.analysis)
            : analysisData.analysis as TeamAIAnalysisResponse;
        } catch (parseError) {
          console.error("Error al parsear análisis IA:", parseError);
          // Continuar sin análisis IA si hay error de parseo
          aiAnalysis = null;
        }
      }

      await exportTeamAnalysisPDF(
        "unidad",
        { ...jefeInfo, dpi: usuarioDpi },
        { id: periodoId, nombre: periodoNombre },
        stats,
        nineBoxData,
        aiAnalysis,
        jefesSubordinados
      );
    } catch (err: any) {
      console.error("Error exportando PDF:", err);
      const toast = (await import("@/hooks/use-toast")).toast;
      toast({
        title: "Error al exportar PDF",
        description: err?.message || "Ocurrió un error al generar el PDF. Por favor, intente nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Mostrar error según tipo
  if (error) {
    // Error de sesión expirada
    if (errorType === "unauthorized") {
      return (
        <Alert variant="destructive" className="border-orange-500 bg-orange-50">
          <LogIn className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">Sesión Expirada</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p className="text-orange-700">{error}</p>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate("/login")}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Iniciar Sesión
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    // Error de permisos
    if (errorType === "forbidden") {
      return (
        <Alert variant="destructive" className="border-red-500 bg-red-50">
          <ShieldAlert className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Acceso Denegado</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p className="text-red-700">{error}</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/dashboard")}
              >
                Volver al Dashboard
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    // Error de validación
    if (errorType === "validation") {
      return (
        <Alert variant="destructive" className="border-yellow-500 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Datos Inválidos</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p className="text-yellow-700">{error}</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/dashboard")}
              >
                Volver al Dashboard
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    // Error genérico
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Mostrar skeleton mientras carga
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con botón de exportación */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
          disabled={isExporting || !stats || !jefeInfo}
          className="gap-2"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4" />
              Exportar PDF
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="resumen" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="colaboradores" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Colaboradores</span>
          </TabsTrigger>
          <TabsTrigger value="9box" className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            <span className="hidden sm:inline">9-Box</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-6">
          <TeamAnalysisSummary
            stats={stats}
            isLoading={isLoading}
            jefeDpi={usuarioDpi}
            periodoId={periodoId}
            isCascada={true}
          />
        </TabsContent>

        <TabsContent value="colaboradores" className="mt-6">
          <TeamMembersListCascada
            nodes={colaboradores}
            jefes={jefesSubordinados}
            grupos={gruposParaFiltro}
            onMemberClick={handleMemberClick}
            jefePrincipalDpi={usuarioDpi}
            jefePrincipalNombre={nombreUsuario}
          />
        </TabsContent>

        <TabsContent value="9box" className="mt-6">
          {/* Filtro por jefe subordinado */}
          {jefesSubordinados.length > 0 && (
            <div className="flex items-center gap-4 mb-4 p-4 bg-muted/30 rounded-lg">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="filtro-jefe" className="text-sm font-medium">
                Filtrar por equipo de:
              </Label>
              <Select
                value={filtroJefe9Box}
                onValueChange={setFiltroJefe9Box}
              >
                <SelectTrigger id="filtro-jefe" className="w-[280px]">
                  <SelectValue placeholder="Seleccionar jefe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">
                    Toda mi unidad
                  </SelectItem>
                  {jefesSubordinados.map((jefe) => (
                    <SelectItem key={jefe.dpi} value={jefe.dpi}>
                      {jefe.nombre} ({jefe.cargo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isLoading9Box && (
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          )}

          <TeamNineBoxView
            data={nineBoxData}
            jefes={jefesSubordinados}
            grupos={gruposParaFiltro}
            onMemberClick={handleMemberClick}
            periodoId={periodoId}
            jefeContexto={usuarioDpi}
          />
        </TabsContent>
      </Tabs>

      {/* Modal de detalle */}
      {selectedMemberDpi && (
        <TeamMemberDetailModal
          isOpen={isDetailModalOpen}
          onClose={handleCloseModal}
          colaboradorDpi={selectedMemberDpi}
          periodoId={periodoId}
        />
      )}
    </div>
  );
}
