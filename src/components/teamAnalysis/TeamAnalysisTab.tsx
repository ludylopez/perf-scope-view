import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard,
  List,
  Grid3X3,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { TeamAnalysisSummary } from "./TeamAnalysisSummary";
import { TeamMembersList } from "./TeamMembersList";
import { TeamNineBoxView } from "./TeamNineBoxView";
import { TeamMemberDetailModal } from "./TeamMemberDetailModal";

import { getEquipoDirectoCompleto, TeamAnalysisError } from "@/lib/teamAnalysis";

import type {
  TeamAnalysisTabProps,
  TeamAnalysisNode,
  TeamAnalysisStats,
  TeamMember9Box,
  GrupoParaFiltro,
} from "@/types/teamAnalysis";

// Tipos de error para UI
type ErrorType = "generic" | "unauthorized" | "forbidden" | "validation";

export function TeamAnalysisTab({ usuarioDpi, periodoId }: TeamAnalysisTabProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("resumen");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType>("generic");

  // Datos del equipo directo
  const [colaboradores, setColaboradores] = useState<TeamAnalysisNode[]>([]);
  const [stats, setStats] = useState<TeamAnalysisStats | null>(null);
  const [nineBoxData, setNineBoxData] = useState<TeamMember9Box[]>([]);
  const [gruposParaFiltro, setGruposParaFiltro] = useState<GrupoParaFiltro[]>([]);

  // Modal de detalle
  const [selectedMemberDpi, setSelectedMemberDpi] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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
        return { message: "No tienes permisos para ver los datos de este equipo.", type: "forbidden" };
      }
      return { message: err.message, type: "generic" };
    }
    if (err instanceof Error) {
      if (err.message.includes("UNAUTHORIZED")) {
        return { message: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.", type: "unauthorized" };
      }
      if (err.message.includes("FORBIDDEN")) {
        return { message: "No tienes permisos para ver los datos de este equipo.", type: "forbidden" };
      }
      return { message: err.message, type: "generic" };
    }
    return { message: "Error al cargar los datos del equipo. Por favor, intenta de nuevo.", type: "generic" };
  };

  // Cargar datos del equipo directo
  const loadData = useCallback(async () => {
    if (!usuarioDpi || !periodoId) return;

    setIsLoading(true);
    setError(null);
    setErrorType("generic");

    try {
      // Una sola llamada obtiene todo
      const data = await getEquipoDirectoCompleto(usuarioDpi, periodoId);

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

        // Convertir colaboradores a formato 9-Box
        const nineBox: TeamMember9Box[] = data.colaboradores
          .filter((c: TeamAnalysisNode) => c.tieneEvaluacion && c.posicion9Box)
          .map((c: TeamAnalysisNode) => ({
            dpi: c.dpi,
            nombreCompleto: c.nombreCompleto,
            cargo: c.cargo,
            area: c.area,
            nivel: c.nivel,
            desempenoPorcentaje: c.desempenoPorcentaje || 0,
            potencialPorcentaje: c.potencialPorcentaje || 0,
            posicion9Box: c.posicion9Box!,
            jefeDpi: usuarioDpi,
            jefeNombre: "", // No necesario para equipo directo
          }));
        setNineBoxData(nineBox);

        // Grupos no aplican para equipo directo
        setGruposParaFiltro([]);
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

  // Manejar click en miembro
  const handleMemberClick = (member: TeamAnalysisNode | TeamMember9Box) => {
    setSelectedMemberDpi(member.dpi);
    setIsDetailModalOpen(true);
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedMemberDpi(null);
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
          />
        </TabsContent>

        <TabsContent value="colaboradores" className="mt-6">
          <TeamMembersList
            nodes={colaboradores}
            jefes={[]} // Sin filtro de jefes - es equipo directo
            grupos={gruposParaFiltro}
            onMemberClick={handleMemberClick}
          />
        </TabsContent>

        <TabsContent value="9box" className="mt-6">
          <TeamNineBoxView
            data={nineBoxData}
            jefes={[]} // Sin filtro de jefes - es equipo directo
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
