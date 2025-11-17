import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  UserCheck,
  UserX,
  Briefcase,
  TrendingUp,
  Download,
  ArrowLeft,
  AlertCircle,
  Calendar,
  Award,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PersonalAnalytics {
  resumen: {
    totalActivos: number;
    totalInactivos: number;
    totalJefes: number;
    totalColaboradores: number;
    edadPromedio: number;
    antiguedadPromedio: number;
    proximosJubilacion: number;
    nuevosIngresos: number;
    veteranos: number;
    ratioSupervisor: number;
  };
  distribucion: {
    porGenero: Array<{ genero: string; cantidad: number; porcentaje: number }>;
    porEdadRango: Array<{ rango: string; cantidad: number; porcentaje: number }>;
    porArea: Array<{ area: string; cantidad: number; porcentaje: number }>;
    porNivel: Array<{ nivel: string; cantidad: number; porcentaje: number }>;
    porRenglon: Array<{ renglon: string; cantidad: number; porcentaje: number }>;
    porTipoPuesto: Array<{ tipo: string; cantidad: number; porcentaje: number }>;
    porAntiguedadRango: Array<{ rango: string; cantidad: number; porcentaje: number }>;
    topProfesiones: Array<{ profesion: string; cantidad: number }>;
    topCargos: Array<{ cargo: string; cantidad: number }>;
  };
}

// Colores para gráficos
const CHART_COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // green-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#84cc16", // lime-500
  "#f97316", // orange-500
  "#6366f1", // indigo-500
];

const DashboardPersonal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc("get_personal_analytics");

      if (error) {
        console.error("Error cargando análisis de personal:", error);
        toast({
          title: "Error al cargar datos",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setAnalytics(data);
    } catch (error) {
      console.error("Error inesperado:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado al cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    toast({
      title: "Exportar a Excel",
      description: "Funcionalidad en desarrollo",
    });
  };

  const handleExportPDF = () => {
    toast({
      title: "Exportar a PDF",
      description: "Funcionalidad en desarrollo",
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No se pudieron cargar los datos</p>
            <Button onClick={loadAnalytics} className="mt-4">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { resumen, distribucion } = analytics;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Análisis de Personal</h1>
            <p className="text-muted-foreground">Estadísticas demográficas y organizacionales</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel}>
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personal Activo</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumen.totalActivos}</div>
            <p className="text-xs text-muted-foreground">
              {resumen.totalJefes} jefes, {resumen.totalColaboradores} colaboradores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personal Inactivo</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumen.totalInactivos}</div>
            <p className="text-xs text-muted-foreground">
              {resumen.totalActivos + resumen.totalInactivos} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Edad Promedio</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumen.edadPromedio} años</div>
            <p className="text-xs text-muted-foreground">
              {resumen.proximosJubilacion} próximos a jubilación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Antigüedad Promedio</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumen.antiguedadPromedio} años</div>
            <p className="text-xs text-muted-foreground">
              {resumen.veteranos} veteranos (15+ años)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {(resumen.proximosJubilacion > 0 || resumen.nuevosIngresos > 0) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertCircle className="h-5 w-5" />
              Alertas de Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {resumen.proximosJubilacion > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-amber-100">
                  {resumen.proximosJubilacion}
                </Badge>
                <span className="text-sm text-amber-900">
                  empleados próximos a jubilación (60+ años)
                </span>
              </div>
            )}
            {resumen.nuevosIngresos > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-100">
                  {resumen.nuevosIngresos}
                </Badge>
                <span className="text-sm text-blue-900">
                  nuevos ingresos (menos de 1 año)
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-purple-100">
                1:{resumen.ratioSupervisor}
              </Badge>
              <span className="text-sm text-purple-900">
                ratio supervisor:colaborador
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs de Análisis */}
      <Tabs defaultValue="demografico" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="demografico">Demográfico</TabsTrigger>
          <TabsTrigger value="organizacional">Organizacional</TabsTrigger>
          <TabsTrigger value="antiguedad">Antigüedad</TabsTrigger>
          <TabsTrigger value="cargos">Cargos</TabsTrigger>
        </TabsList>

        {/* Tab: Análisis Demográfico */}
        <TabsContent value="demografico" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Distribución por Género */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Género</CardTitle>
                <CardDescription>Personal activo por género</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={distribucion.porGenero}
                      dataKey="cantidad"
                      nameKey="genero"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ genero, porcentaje }) => `${genero}: ${porcentaje}%`}
                    >
                      {distribucion.porGenero.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribución por Edad */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Edad</CardTitle>
                <CardDescription>Rangos etarios del personal</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={distribucion.porEdadRango}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rango" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Análisis Organizacional */}
        <TabsContent value="organizacional" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Distribución por Área */}
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Áreas</CardTitle>
                <CardDescription>Distribución de personal por área</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={distribucion.porArea.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="area" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribución por Nivel */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Nivel</CardTitle>
                <CardDescription>Personal por nivel organizacional</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={distribucion.porNivel}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nivel" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribución por Renglón */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Renglón</CardTitle>
                <CardDescription>Personal por renglón presupuestario</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={distribucion.porRenglon}
                      dataKey="cantidad"
                      nameKey="renglon"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ renglon, porcentaje }) => `${renglon}: ${porcentaje}%`}
                    >
                      {distribucion.porRenglon.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribución por Tipo de Puesto */}
            <Card>
              <CardHeader>
                <CardTitle>Tipo de Puesto</CardTitle>
                <CardDescription>Administrativo vs Operativo</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={distribucion.porTipoPuesto}
                      dataKey="cantidad"
                      nameKey="tipo"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ tipo, porcentaje }) => `${tipo}: ${porcentaje}%`}
                    >
                      {distribucion.porTipoPuesto.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Análisis de Antigüedad */}
        <TabsContent value="antiguedad" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Antigüedad</CardTitle>
              <CardDescription>Años de servicio del personal</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={distribucion.porAntiguedadRango}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rango" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cantidad" fill="#8b5cf6" name="Empleados" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Cargos y Profesiones */}
        <TabsContent value="cargos" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Top Profesiones */}
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Profesiones</CardTitle>
                <CardDescription>Profesiones más comunes</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={distribucion.topProfesiones.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="profesion" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill="#ec4899" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Cargos */}
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Cargos</CardTitle>
                <CardDescription>Cargos más comunes</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={distribucion.topCargos.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="cargo" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill="#06b6d4" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardPersonal;
