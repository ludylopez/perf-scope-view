import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Autoevaluacion from "./pages/Autoevaluacion";
import MiAutoevaluacion from "./pages/MiAutoevaluacion";
import EvaluacionEquipo from "./pages/EvaluacionEquipo";
import EvaluacionColaborador from "./pages/EvaluacionColaborador";
import VistaComparativa from "./pages/VistaComparativa";
import AdminAsignaciones from "./pages/AdminAsignaciones";
import AdminGrupos from "./pages/AdminGrupos";
import AdminPeriodos from "./pages/AdminPeriodos";
import AdminUsuarios from "./pages/AdminUsuarios";
import DashboardRRHH from "./pages/DashboardRRHH";
import VistaPlanDesarrollo from "./pages/VistaPlanDesarrollo";
import VistaResultadosFinales from "./pages/VistaResultadosFinales";
import EstadisticasGrupales from "./pages/EstadisticasGrupales";
import SupabaseUtils from "./pages/SupabaseUtils";
import ConfiguracionSistema from "./pages/ConfiguracionSistema";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
