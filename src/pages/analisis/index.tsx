import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  PieChart,
  Target,
  Users,
  Building,
  GraduationCap,
  FileText,
  TrendingUp,
  Scale,
  ArrowRight,
  Activity,
  Wallet,
  Brain,
  Users2,
  Rocket,
  GitCompare,
  AlertTriangle,
  Network,
  Fingerprint,
  UserX,
  CheckCircle,
  Award,
} from "lucide-react";

interface DashboardLink {
  path: string;
  title: string;
  description: string;
  icon: React.ElementType;
  section?: string;
  color: string;
}

const dashboards: DashboardLink[] = [
  {
    path: "/analisis/resultados-consolidados",
    title: "Resultados Consolidados",
    description: "Población total, elegibilidad y estado completo de evaluaciones. Incluye sujetos/no sujetos a evaluación y evaluaciones esperadas vs completadas.",
    icon: CheckCircle,
    section: "Sección 0",
    color: "bg-indigo-700",
  },
  {
    path: "/analisis/informe-final",
    title: "Informe Final (Autogenerado)",
    description: "Narrativa ejecutiva + ficha técnica/auditable generada automáticamente desde el período activo.",
    icon: FileText,
    section: "Sección 0",
    color: "bg-slate-700",
  },
  {
    path: "/analisis/resumen-ejecutivo",
    title: "Resumen Ejecutivo",
    description: "KPIs principales, tasas de participación y hallazgos clave del período de evaluación.",
    icon: BarChart3,
    section: "Sección 1",
    color: "bg-blue-500",
  },
  {
    path: "/analisis/resultados-globales",
    title: "Resultados Globales",
    description: "Distribución de calificaciones, promedios organizacionales y brechas auto vs jefe.",
    icon: PieChart,
    section: "Sección 3",
    color: "bg-green-500",
  },
  {
    path: "/analisis/por-dimension",
    title: "Análisis por Dimensión",
    description: "Radar multinivel, ranking de dimensiones, fortalezas y áreas críticas.",
    icon: Target,
    section: "Sección 4",
    color: "bg-purple-500",
  },
  {
    path: "/analisis/por-nivel",
    title: "Análisis por Nivel",
    description: "Estadísticas detalladas de los 11 niveles jerárquicos con distribuciones y rankings.",
    icon: Users,
    section: "Sección 5",
    color: "bg-orange-500",
  },
  {
    path: "/analisis/por-direccion",
    title: "Análisis por Dirección",
    description: "Ranking de las 18 direcciones/unidades, comparativas y distribución de personal.",
    icon: Building,
    section: "Sección 6",
    color: "bg-teal-500",
  },
  {
    path: "/analisis/capacitacion",
    title: "Análisis de Capacitación",
    description: "Brechas de competencias, necesidades por nivel/dirección y temas prioritarios.",
    icon: GraduationCap,
    section: "Sección 8",
    color: "bg-amber-500",
  },
  {
    path: "/analisis/planes-desarrollo",
    title: "Planes de Desarrollo",
    description: "Estadísticas de PDI generados, áreas de mejora frecuentes y cobertura.",
    icon: FileText,
    section: "Sección 9",
    color: "bg-indigo-500",
  },
  {
    path: "/analisis/correlaciones",
    title: "Análisis de Correlaciones",
    description: "Matriz de correlaciones, análisis por rango de edad, antigüedad, género y más.",
    icon: TrendingUp,
    section: "Estadística Avanzada",
    color: "bg-rose-500",
  },
  {
    path: "/analisis/estadistico-avanzado",
    title: "Análisis Estadístico Avanzado",
    description: "Regresión múltiple, ANOVA, factores predictivos, correlación NPS-Desempeño y productividad por dimensión.",
    icon: Brain,
    section: "Estadística Avanzada",
    color: "bg-violet-500",
  },
  {
    path: "/analisis/equidad",
    title: "Índices de Equidad",
    description: "Brechas por género, edad, antigüedad y tipo de puesto. Coeficiente de Gini organizacional.",
    icon: Scale,
    section: "Estadística Avanzada",
    color: "bg-cyan-500",
  },
  {
    path: "/analisis/por-renglon",
    title: "Análisis por Renglón",
    description: "Análisis por modalidad de contrato (011, 021, 022, 029, 031). Rankings y estadísticas por renglón presupuestario.",
    icon: Wallet,
    section: "Segmentación",
    color: "bg-emerald-500",
  },
  {
    path: "/analisis/demografico",
    title: "Análisis Demográfico",
    description: "Análisis detallado por edad y antigüedad. Correlaciones, scatter plots y distribuciones.",
    icon: Users2,
    section: "Segmentación",
    color: "bg-violet-500",
  },
  {
    path: "/analisis/potencial",
    title: "Potencial Estratégico",
    description: "Matriz 9-Box, análisis de talento clave, correlación desempeño-potencial y planes de sucesión.",
    icon: Rocket,
    section: "Talento",
    color: "bg-pink-500",
  },
  {
    path: "/analisis/brechas-dimension",
    title: "Brechas por Dimensión",
    description: "Análisis de fortalezas, oportunidades y áreas críticas por dimensión. Clasificación automática.",
    icon: Target,
    section: "Comparativas",
    color: "bg-fuchsia-500",
  },
  {
    path: "/analisis/comparativa-auto-jefe",
    title: "Comparativa Auto vs Jefe",
    description: "T-test pareado, correlaciones, distribución de brechas y análisis de percepción.",
    icon: GitCompare,
    section: "Comparativas",
    color: "bg-sky-500",
  },
  // Nuevos dashboards de análisis avanzado
  {
    path: "/analisis/outliers",
    title: "Análisis de Outliers",
    description: "Identificación de casos extremos (alto y bajo rendimiento) usando método IQR y Z-score.",
    icon: AlertTriangle,
    section: "Análisis Avanzado",
    color: "bg-red-500",
  },
  {
    path: "/analisis/liderazgo-cascada",
    title: "Liderazgo en Cascada",
    description: "Correlación entre desempeño de jefes y sus equipos. Efecto cascada del liderazgo.",
    icon: Network,
    section: "Análisis Avanzado",
    color: "bg-blue-600",
  },
  {
    path: "/analisis/perfiles",
    title: "Clustering de Perfiles",
    description: "Agrupación de colaboradores por K-means: desempeño, potencial y brecha. Perfiles organizacionales.",
    icon: Fingerprint,
    section: "Análisis Avanzado",
    color: "bg-purple-600",
  },
  {
    path: "/analisis/riesgo-rotacion",
    title: "Riesgo de Rotación",
    description: "Score compuesto de riesgo basado en desempeño, antigüedad, brecha y edad crítica.",
    icon: UserX,
    section: "Análisis Avanzado",
    color: "bg-orange-600",
  },
  {
    path: "/analisis/consistencia",
    title: "Consistencia Interna",
    description: "Alpha de Cronbach por dimensión. Fiabilidad del instrumento y análisis de ítems.",
    icon: CheckCircle,
    section: "Análisis Avanzado",
    color: "bg-green-600",
  },
  {
    path: "/analisis/benchmarking",
    title: "Benchmarking Interno",
    description: "Comparativa normalizada entre direcciones. Ranking por percentiles, z-scores y radar de dimensiones.",
    icon: Award,
    section: "Análisis Avanzado",
    color: "bg-teal-600",
  },
];

export default function AnalisisIndex() {
  // La verificación de admin se hace en AdminProtectedRoute, no es necesario duplicarla aquí
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <div className="flex items-center justify-center gap-3">
            <Activity className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold">Dashboards de Análisis</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Visualizaciones y estadísticas avanzadas para el informe de evaluación de desempeño.
            Selecciona un dashboard para generar insumos visuales.
          </p>
        </div>

        {/* Dashboards para el informe */}
        <div>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Secciones del Informe
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboards
              .filter((d) => d.section?.startsWith("Sección"))
              .map((dashboard) => (
                <DashboardCard key={dashboard.path} dashboard={dashboard} />
              ))}
          </div>
        </div>

        {/* Análisis estadístico avanzado */}
        <div>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Estadística Avanzada
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboards
              .filter((d) => d.section === "Estadística Avanzada")
              .map((dashboard) => (
                <DashboardCard key={dashboard.path} dashboard={dashboard} />
              ))}
          </div>
        </div>

        {/* Segmentación */}
        <div>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Users2 className="h-6 w-6" />
            Segmentación
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboards
              .filter((d) => d.section === "Segmentación")
              .map((dashboard) => (
                <DashboardCard key={dashboard.path} dashboard={dashboard} />
              ))}
          </div>
        </div>

        {/* Talento y Comparativas */}
        <div>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Rocket className="h-6 w-6" />
            Talento y Comparativas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboards
              .filter((d) => d.section === "Talento" || d.section === "Comparativas")
              .map((dashboard) => (
                <DashboardCard key={dashboard.path} dashboard={dashboard} />
              ))}
          </div>
        </div>

        {/* Análisis Avanzado */}
        <div>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Análisis Avanzado
          </h2>
          <p className="text-muted-foreground mb-4">
            Modelos estadísticos avanzados: detección de outliers, clustering, análisis de riesgo y fiabilidad del instrumento.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboards
              .filter((d) => d.section === "Análisis Avanzado")
              .map((dashboard) => (
                <DashboardCard key={dashboard.path} dashboard={dashboard} />
              ))}
          </div>
        </div>

        {/* Info */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-800 dark:text-blue-400">
                  Uso recomendado
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Cada dashboard genera gráficos de alto nivel optimizados para captura de pantalla.
                  Navega por las diferentes secciones, toma capturas de los gráficos relevantes
                  y agrégalos a tu documento de Word para construir el informe final.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardCard({ dashboard }: { dashboard: DashboardLink }) {
  const Icon = dashboard.icon;

  return (
    <Link to={dashboard.path}>
      <Card className="h-full hover:shadow-lg transition-all duration-200 hover:border-primary/50 group cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className={`p-3 rounded-lg ${dashboard.color} text-white`}>
              <Icon className="h-6 w-6" />
            </div>
            {dashboard.section && (
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                {dashboard.section}
              </span>
            )}
          </div>
          <CardTitle className="mt-4 group-hover:text-primary transition-colors">
            {dashboard.title}
          </CardTitle>
          <CardDescription>{dashboard.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center text-sm text-primary font-medium group-hover:gap-2 transition-all">
            <span>Ver dashboard</span>
            <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
