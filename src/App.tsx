import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PeriodProvider } from "@/contexts/PeriodContext";
import { importarAsignacionesDirecto } from "./lib/importarAsignacionesDirecto";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import "./lib/diagnosticoEvaluaciones"; // Cargar funciones de diagnóstico
import "./lib/buscarAutoevaluacion"; // Cargar función de búsqueda de autoevaluaciones
import "./lib/diagnosticoAutoevaluacionesColaboradores"; // Cargar funciones de diagnóstico de autoevaluaciones de colaboradores
import "./utils/diagnosticoEvaluacion"; // Cargar función de diagnóstico de cálculos de evaluación
import "./lib/recalcularResultado"; // Cargar función para recalcular resultados
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Autoevaluacion from "./pages/Autoevaluacion";
import MiAutoevaluacion from "./pages/MiAutoevaluacion";
import MisRespuestasDetalle from "./pages/MisRespuestasDetalle";
import EvaluacionEquipo from "./pages/EvaluacionEquipo";
import EvaluacionColaborador from "./pages/EvaluacionColaborador";
import VistaComparativa from "./pages/VistaComparativa";
import AdminAsignaciones from "./pages/AdminAsignaciones";
import AdminGrupos from "./pages/AdminGrupos";
import AdminPeriodos from "./pages/AdminPeriodos";
import AdminUsuarios from "./pages/AdminUsuarios";
import AdminNiveles from "./pages/AdminNiveles";
import DashboardRRHH from "./pages/DashboardRRHH";
import VistaPlanDesarrollo from "./pages/VistaPlanDesarrollo";
import VistaResultadosFinales from "./pages/VistaResultadosFinales";
import EstadisticasGrupales from "./pages/EstadisticasGrupales";
import SupabaseUtils from "./pages/SupabaseUtils";
import AdminInstrumentos from "./pages/AdminInstrumentos";
import Matriz9Box from "./pages/Matriz9Box";
import EvaluacionJefes from "./pages/EvaluacionJefes";
import EvaluacionJefeIndividual from "./pages/EvaluacionJefeIndividual";
import VistaDetalleJefe from "./pages/VistaDetalleJefe";
import VistaAutoevaluacionesJefes from "./pages/VistaAutoevaluacionesJefes";
import VistaAutoevaluacionesColaboradores from "./pages/VistaAutoevaluacionesColaboradores";
import VistaEvaluacionesCompletadas from "./pages/VistaEvaluacionesCompletadas";
import VistaEvaluacionesEnProgreso from "./pages/VistaEvaluacionesEnProgreso";
import DashboardConsolidado from "./pages/DashboardConsolidado";
import DashboardUnidad from "./pages/DashboardUnidad";
import NotFound from "./pages/NotFound";
import ConfiguracionSistema from "./pages/ConfiguracionSistema";
import PopulateExplanations from "./pages/PopulateExplanations";
import DashboardPersonal from "./pages/DashboardPersonal";
import CambioContrasena from "./pages/CambioContrasena";
import AnalisisEstadisticoEvaluaciones from "./pages/AnalisisEstadisticoEvaluaciones";
// Componentes de análisis
import AnalisisIndex from "./pages/analisis/index";
import InformeFinal from "./pages/analisis/InformeFinal";
import ResumenEjecutivo from "./pages/analisis/ResumenEjecutivo";
import ResultadosGlobales from "./pages/analisis/ResultadosGlobales";
import AnalisisPorDimension from "./pages/analisis/AnalisisPorDimension";
import AnalisisPorNivel from "./pages/analisis/AnalisisPorNivel";
import AnalisisPorDireccion from "./pages/analisis/AnalisisPorDireccion";
import AnalisisCapacitacion from "./pages/analisis/AnalisisCapacitacion";
import AnalisisPlanesDesarrollo from "./pages/analisis/AnalisisPlanesDesarrollo";
import AnalisisCorrelaciones from "./pages/analisis/AnalisisCorrelaciones";
import AnalisisEquidad from "./pages/analisis/AnalisisEquidad";
import AnalisisPorRenglon from "./pages/analisis/AnalisisPorRenglon";
import AnalisisDemografico from "./pages/analisis/AnalisisDemografico";
import AnalisisPotencial from "./pages/analisis/AnalisisPotencial";
import AnalisisBrechasDimension from "./pages/analisis/AnalisisBrechasDimension";
import AnalisisBrechasAutoJefe from "./pages/analisis/AnalisisBrechasAutoJefe";
import ComparativaAutoJefe from "./pages/analisis/ComparativaAutoJefe";
import AnalisisOutliers from "./pages/analisis/AnalisisOutliers";
import AnalisisLiderazgoCascada from "./pages/analisis/AnalisisLiderazgoCascada";
import AnalisisPerfiles from "./pages/analisis/AnalisisPerfiles";
import AnalisisRiesgoRotacion from "./pages/analisis/AnalisisRiesgoRotacion";
import AnalisisConsistencia from "./pages/analisis/AnalisisConsistencia";
import AnalisisBenchmarking from "./pages/analisis/AnalisisBenchmarking";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Mostrar loading mientras se restaura la sesión
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// Componente wrapper para mostrar el botón de WhatsApp solo cuando el usuario esté autenticado
const WhatsAppButtonWrapper = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  // No mostrar en la página de login
  if (location.pathname === "/login" || !isAuthenticated) {
    return null;
  }
  
  // Número de WhatsApp - Cambiar este número según sea necesario
  const whatsappNumber = "50247035917"; // Formato: código de país + número sin espacios ni guiones
  
  return <WhatsAppButton phoneNumber={whatsappNumber} />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PeriodProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <WhatsAppButtonWrapper />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/autoevaluacion"
              element={
                <ProtectedRoute>
                  <Autoevaluacion />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mi-autoevaluacion"
              element={
                <ProtectedRoute>
                  <MiAutoevaluacion />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mis-respuestas-detalle"
              element={
                <ProtectedRoute>
                  <MisRespuestasDetalle />
                </ProtectedRoute>
              }
            />
            <Route
              path="/evaluacion-equipo"
              element={
                <ProtectedRoute>
                  <EvaluacionEquipo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/evaluacion-equipo/:id"
              element={
                <ProtectedRoute>
                  <EvaluacionColaborador />
                </ProtectedRoute>
              }
            />
            <Route
              path="/evaluacion-equipo/:id/comparativa"
              element={
                <ProtectedRoute>
                  <VistaComparativa />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/asignaciones"
              element={
                <ProtectedRoute>
                  <AdminAsignaciones />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/grupos"
              element={
                <ProtectedRoute>
                  <AdminGrupos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/periodos"
              element={
                <ProtectedRoute>
                  <AdminPeriodos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/usuarios"
              element={
                <ProtectedRoute>
                  <AdminUsuarios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/niveles"
              element={
                <ProtectedRoute>
                  <AdminNiveles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardRRHH />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plan-desarrollo/:id"
              element={
                <ProtectedRoute>
                  <VistaPlanDesarrollo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mis-resultados"
              element={
                <ProtectedRoute>
                  <VistaResultadosFinales />
                </ProtectedRoute>
              }
            />
            <Route
              path="/estadisticas-grupales"
              element={
                <ProtectedRoute>
                  <EstadisticasGrupales />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/supabase-utils"
              element={
                <ProtectedRoute>
                  <SupabaseUtils />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/configuracion"
              element={
                <ProtectedRoute>
                  <ConfiguracionSistema />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/populate-explanations"
              element={
                <ProtectedRoute>
                  <PopulateExplanations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/instrumentos"
              element={
                <ProtectedRoute>
                  <AdminInstrumentos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/matriz-9box"
              element={
                <ProtectedRoute>
                  <Matriz9Box />
                </ProtectedRoute>
              }
            />
            <Route
              path="/evaluacion-jefes"
              element={
                <ProtectedRoute>
                  <EvaluacionJefes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/evaluacion-jefe/:id"
              element={
                <ProtectedRoute>
                  <EvaluacionJefeIndividual />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/evaluaciones/jefe/:id"
              element={
                <ProtectedRoute>
                  <VistaDetalleJefe />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/autoevaluaciones-jefes"
              element={
                <ProtectedRoute>
                  <VistaAutoevaluacionesJefes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/autoevaluaciones-colaboradores"
              element={
                <ProtectedRoute>
                  <VistaAutoevaluacionesColaboradores />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/evaluaciones/completadas"
              element={
                <ProtectedRoute>
                  <VistaEvaluacionesCompletadas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/evaluaciones/en-progreso"
              element={
                <ProtectedRoute>
                  <VistaEvaluacionesEnProgreso />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard-consolidado"
              element={
                <ProtectedRoute>
                  <DashboardConsolidado />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard-unidad"
              element={
                <ProtectedRoute>
                  <DashboardUnidad />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/personal"
              element={
                <ProtectedRoute>
                  <DashboardPersonal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cambio-contrasena"
              element={
                <ProtectedRoute>
                  <CambioContrasena />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis-estadistico"
              element={<AnalisisEstadisticoEvaluaciones />}
            />
            {/* Rutas de análisis */}
            <Route
              path="/analisis"
              element={
                <ProtectedRoute>
                  <AnalisisIndex />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis/informe-final"
              element={
                <ProtectedRoute>
                  <InformeFinal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis/resumen-ejecutivo"
              element={
                <ProtectedRoute>
                  <ResumenEjecutivo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis/resultados-globales"
              element={
                <ProtectedRoute>
                  <ResultadosGlobales />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis/por-dimension"
              element={
                <ProtectedRoute>
                  <AnalisisPorDimension />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis/por-nivel"
              element={
                <ProtectedRoute>
                  <AnalisisPorNivel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis/por-direccion"
              element={
                <ProtectedRoute>
                  <AnalisisPorDireccion />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis/capacitacion"
              element={
                <ProtectedRoute>
                  <AnalisisCapacitacion />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis/planes-desarrollo"
              element={
                <ProtectedRoute>
                  <AnalisisPlanesDesarrollo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis/correlaciones"
              element={
                <ProtectedRoute>
                  <AnalisisCorrelaciones />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis/equidad"
              element={
                <ProtectedRoute>
                  <AnalisisEquidad />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis/por-renglon"
              element={
                <ProtectedRoute>
                  <AnalisisPorRenglon />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis/demografico"
              element={
                <ProtectedRoute>
                  <AnalisisDemografico />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis/potencial"
              element={
                <ProtectedRoute>
                  <AnalisisPotencial />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis/brechas-dimension"
              element={
                <ProtectedRoute>
                  <AnalisisBrechasDimension />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis/brechas-auto-jefe"
              element={
                <ProtectedRoute>
                  <AnalisisBrechasAutoJefe />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis/comparativa-auto-jefe"
              element={
                <ProtectedRoute>
                  <ComparativaAutoJefe />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis/outliers"
              element={
                <ProtectedRoute>
                  <AnalisisOutliers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis/liderazgo-cascada"
              element={
                <ProtectedRoute>
                  <AnalisisLiderazgoCascada />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis/perfiles"
              element={
                <ProtectedRoute>
                  <AnalisisPerfiles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis/riesgo-rotacion"
              element={
                <ProtectedRoute>
                  <AnalisisRiesgoRotacion />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis/consistencia"
              element={
                <ProtectedRoute>
                  <AnalisisConsistencia />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analisis/benchmarking"
              element={
                <ProtectedRoute>
                  <AnalisisBenchmarking />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </PeriodProvider>
    </AuthProvider>
  </QueryClientProvider>
);

// Exponer función de importación en consola
if (typeof window !== 'undefined') {
  (window as any).importarAsignaciones = importarAsignacionesDirecto;
  console.log('✅ Función importarAsignaciones() disponible en consola del navegador');
}

export default App;
