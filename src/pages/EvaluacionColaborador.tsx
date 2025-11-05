import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LikertScale } from "@/components/evaluation/LikertScale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { INSTRUMENT_A1 } from "@/data/instruments";
import { getSubmittedEvaluation, getMockColaboradorEvaluation } from "@/lib/storage";
import { 
  calculatePerformanceScore, 
  getDimensionProgress,
  scoreToPercentage,
  calculateDimensionPercentage,
  calculateDimensionAverage
} from "@/lib/calculations";
import { 
  ArrowLeft, 
  CheckCircle2, 
  FileDown, 
  TrendingUp, 
  Target, 
  Award, 
  AlertCircle, 
  Users,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  XAxis,
  YAxis,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

// Datos mock del colaborador
const MOCK_COLABORADORES: Record<string, any> = {
  "1": {
    id: "1",
    dpi: "4567890123104",
    nombre: "Roberto Hernández Silva",
    cargo: "Coordinador",
    nivel: "S2",
    area: "Tecnología",
  },
};

const COLORS = {
  primary: "hsl(var(--primary))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  muted: "hsl(var(--muted-foreground))",
};

const EvaluacionColaborador = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const instrument = INSTRUMENT_A1;

  const [evaluation, setEvaluation] = useState<any>(null);
  const [colaborador, setColaborador] = useState<any>(null);
  const [currentDimension, setCurrentDimension] = useState(0);

  useEffect(() => {
    if (!id) {
      navigate("/evaluacion-equipo");
      return;
    }

    const colaboradorData = MOCK_COLABORADORES[id];
    if (!colaboradorData) {
      navigate("/evaluacion-equipo");
      return;
    }

    setColaborador(colaboradorData);

    // Intentar obtener evaluación real, si no existe usar mock
    const submitted = getSubmittedEvaluation(colaboradorData.dpi, "2025-1");
    const mockEvaluation = getMockColaboradorEvaluation(colaboradorData.dpi);
    
    setEvaluation(submitted || mockEvaluation);
  }, [id, navigate]);

  if (!evaluation || !colaborador) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <p>Cargando...</p>
        </main>
      </div>
    );
  }

  const dimensions = instrument.dimensionesDesempeno;
  const performanceScore = calculatePerformanceScore(
    evaluation.responses,
    dimensions
  );
  const performancePercentage = scoreToPercentage(performanceScore);

  const currentDim = dimensions[currentDimension];
  const dimProgress = getDimensionProgress(evaluation.responses, currentDim);

  // Preparar datos para el gráfico de radar
  const radarData = dimensions.map((dim, idx) => ({
    dimension: dim.nombre.length > 25 ? dim.nombre.substring(0, 25) + "..." : dim.nombre,
    nombreCompleto: dim.nombre,
    numero: idx + 1,
    porcentaje: calculateDimensionPercentage(evaluation.responses, dim),
    puntaje: calculateDimensionAverage(evaluation.responses, dim)
  }));

  // Datos para gráfico de barras
  const barData = radarData.map((d) => ({
    nombre: `D${d.numero}`,
    nombreCompleto: d.nombreCompleto,
    porcentaje: d.porcentaje,
    puntaje: d.puntaje.toFixed(1)
  }));

  // Datos para gráfico de pastel (distribución de rendimiento)
  const pieData = [
    { name: "Excelente (80-100%)", value: radarData.filter(d => d.porcentaje >= 80).length, color: COLORS.success },
    { name: "Bueno (60-79%)", value: radarData.filter(d => d.porcentaje >= 60 && d.porcentaje < 80).length, color: COLORS.primary },
    { name: "Requiere Mejora (<60%)", value: radarData.filter(d => d.porcentaje < 60).length, color: COLORS.warning },
  ];

  // Identificar fortalezas (top 3) y áreas de mejora (bottom 3)
  const sortedDimensions = [...radarData].sort((a, b) => b.porcentaje - a.porcentaje);
  const fortalezas = sortedDimensions.slice(0, 3);
  const areasDeOportunidad = sortedDimensions.slice(-3).reverse();

  // Generar insights en español claro
  const generarInsight = (porcentaje: number): string => {
    if (porcentaje >= 85) {
      return "Desempeño destacado";
    } else if (porcentaje >= 70) {
      return "Buen desempeño";
    } else if (porcentaje >= 55) {
      return "Desempeño aceptable";
    } else {
      return "Requiere atención";
    }
  };

  const nivelGeneral = generarInsight(performancePercentage);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/evaluacion-equipo")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Equipo
          </Button>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Periodo: 2025-1</p>
            <p className="text-sm text-muted-foreground">Nivel: {colaborador.nivel}</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">
              Evaluación de {colaborador.nombre}
            </h1>
            <Badge className="bg-success text-success-foreground">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Completada
            </Badge>
          </div>
          <div className="flex flex-wrap gap-4 text-muted-foreground">
            <p>
              <strong>Cargo:</strong> {colaborador.cargo}
            </p>
            <p>
              <strong>Área:</strong> {colaborador.area}
            </p>
            <p>
              <strong>Enviada el:</strong>{" "}
              {format(new Date(evaluation.fechaEnvio || evaluation.fechaUltimaModificacion), "d 'de' MMMM, yyyy", {
                locale: es,
              })}
            </p>
          </div>
        </div>

        <Alert className="mb-6 border-info bg-info/10">
          <AlertDescription className="text-sm">
            Esta es la autoevaluación del colaborador. Como jefe evaluador, puede revisar los resultados 
            y compararlos con su propia evaluación para obtener una visión completa del desempeño.
          </AlertDescription>
        </Alert>

        {/* Resumen Ejecutivo */}
        <div className="grid gap-6 mb-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Puntaje Global
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-5xl font-bold text-primary mb-2">
                  {performancePercentage}%
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {nivelGeneral}
                </p>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="text-muted-foreground">Escala:</span>
                  <span className="font-semibold">{performanceScore.toFixed(1)}/5.0</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="h-5 w-5 text-success" />
                Fortalezas Principales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-5xl font-bold text-success mb-2">
                  {fortalezas.length}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Dimensiones destacadas
                </p>
                <div className="space-y-1 text-xs">
                  {fortalezas.slice(0, 2).map((f, idx) => (
                    <p key={idx} className="truncate">{f.nombreCompleto}</p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-warning" />
                Áreas de Mejora
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-5xl font-bold text-warning mb-2">
                  {areasDeOportunidad.length}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Oportunidades de desarrollo
                </p>
                <div className="space-y-1 text-xs">
                  {areasDeOportunidad.slice(0, 2).map((a, idx) => (
                    <p key={idx} className="truncate">{a.nombreCompleto}</p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Análisis Visual */}
        <div className="grid gap-6 mb-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Rendimiento por Dimensión
              </CardTitle>
              <CardDescription>
                Comparación visual del desempeño en cada área evaluada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <XAxis 
                      dataKey="nombre" 
                      tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                              <p className="font-semibold text-sm mb-1">{data.nombreCompleto}</p>
                              <p className="text-sm font-medium text-primary">
                                {data.porcentaje}%
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Puntaje: {data.puntaje}/5.0
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="porcentaje" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Distribución de Rendimiento
              </CardTitle>
              <CardDescription>
                Clasificación de dimensiones según nivel de desempeño
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Radar */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Perfil Completo de Desempeño
            </CardTitle>
            <CardDescription>
              Visualización radial que muestra las fortalezas y áreas de mejora de forma integral
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis 
                    dataKey="dimension" 
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Radar
                    name="Porcentaje"
                    dataKey="porcentaje"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border rounded-lg p-3 shadow-lg max-w-xs">
                            <p className="font-semibold text-sm mb-1">{data.nombreCompleto}</p>
                            <p className="text-xs text-muted-foreground">
                              Puntaje: {data.puntaje.toFixed(2)}/5.0
                            </p>
                            <p className="text-sm font-medium text-primary">
                              {data.porcentaje}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
              {radarData.map((data, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {data.numero}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Dimensión {data.numero}</p>
                    <p className="text-sm font-semibold truncate">{data.nombreCompleto}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            data.porcentaje >= 80 ? 'bg-success' : 
                            data.porcentaje >= 60 ? 'bg-primary' : 
                            'bg-warning'
                          }`}
                          style={{ width: `${data.porcentaje}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-primary">{data.porcentaje}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Insights y Análisis */}
        <div className="grid gap-6 mb-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-success" />
                Fortalezas Identificadas
              </CardTitle>
              <CardDescription>
                Áreas donde el colaborador muestra mejor desempeño
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fortalezas.map((dim, idx) => {
                  const insight = generarInsight(dim.porcentaje);
                  return (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-success/20 bg-success/5">
                      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-success/20 text-success font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm mb-1">{dim.nombreCompleto}</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          {insight} • Puntaje: {dim.puntaje.toFixed(2)}/5.0
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-success transition-all" 
                              style={{ width: `${dim.porcentaje}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-success">{dim.porcentaje}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-warning" />
                Áreas de Oportunidad
              </CardTitle>
              <CardDescription>
                Dimensiones que requieren atención para mejorar el desempeño
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {areasDeOportunidad.map((dim, idx) => {
                  const insight = generarInsight(dim.porcentaje);
                  return (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-warning/20 bg-warning/5">
                      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-warning/20 text-warning font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm mb-1">{dim.nombreCompleto}</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          {insight} • Puntaje: {dim.puntaje.toFixed(2)}/5.0
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-warning transition-all" 
                              style={{ width: `${dim.porcentaje}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-warning">{dim.porcentaje}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Análisis y Recomendaciones */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Análisis y Observaciones Generales
            </CardTitle>
            <CardDescription>
              Resumen ejecutivo de los hallazgos más relevantes de la evaluación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <h4 className="font-semibold mb-2 text-success">Resumen Ejecutivo</h4>
                <p className="text-sm text-muted-foreground">
                  El colaborador muestra un desempeño general de <strong>{performancePercentage}%</strong>, 
                  lo que indica un nivel <strong>{nivelGeneral.toLowerCase()}</strong>. 
                  Las dimensiones más destacadas incluyen <strong>{fortalezas[0]?.nombreCompleto}</strong> y 
                  <strong> {fortalezas[1]?.nombreCompleto}</strong>, donde se observan resultados 
                  consistentes y por encima del promedio esperado.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <h4 className="font-semibold mb-2 text-warning">Recomendaciones de Desarrollo</h4>
                <p className="text-sm text-muted-foreground">
                  Se recomienda enfocar esfuerzos de desarrollo en <strong>{areasDeOportunidad[0]?.nombreCompleto}</strong> y 
                  <strong> {areasDeOportunidad[1]?.nombreCompleto}</strong>. Estas áreas presentan oportunidades 
                  claras de mejora que, al ser fortalecidas, contribuirán significativamente al crecimiento profesional 
                  del colaborador y al logro de los objetivos institucionales.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <h4 className="font-semibold mb-2 text-primary">Siguientes Pasos</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Programar reunión de retroalimentación para compartir estos resultados</li>
                  <li>Establecer plan de acción específico para las áreas de mejora identificadas</li>
                  <li>Definir objetivos de desarrollo para el próximo periodo</li>
                  <li>Monitorear el progreso en las dimensiones destacadas para mantener el nivel</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detalle de Respuestas */}
        <Card>
          <CardHeader>
            <CardTitle>Detalle de la Evaluación por Dimensión</CardTitle>
            <CardDescription>
              Revisión completa de todas las respuestas y comentarios del colaborador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={currentDimension.toString()} className="w-full">
              <TabsList className="mb-6 w-full flex-wrap justify-start h-auto gap-2">
                {dimensions.map((dim, idx) => {
                  const progress = getDimensionProgress(evaluation.responses, dim);
                  return (
                    <TabsTrigger
                      key={dim.id}
                      value={idx.toString()}
                      onClick={() => setCurrentDimension(idx)}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      Dim. {idx + 1}
                      {progress.answered === progress.total && " ✓"}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {dimensions.map((dim, idx) => {
                const dimPercentage = calculateDimensionPercentage(evaluation.responses, dim);
                const dimPuntaje = calculateDimensionAverage(evaluation.responses, dim);
                return (
                  <TabsContent key={dim.id} value={idx.toString()} className="space-y-4">
                    <div className="mb-4 p-4 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-1">
                            {dim.nombre} ({Math.round(dim.peso * 100)}%)
                          </h3>
                          {dim.descripcion && (
                            <p className="text-sm text-muted-foreground mb-3">
                              {dim.descripcion}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-2xl font-bold text-primary">{dimPercentage}%</div>
                          <div className="text-xs text-muted-foreground">Puntaje: {dimPuntaje.toFixed(2)}/5.0</div>
                        </div>
                      </div>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            dimPercentage >= 80 ? 'bg-success' : 
                            dimPercentage >= 60 ? 'bg-primary' : 
                            'bg-warning'
                          }`}
                          style={{ width: `${dimPercentage}%` }}
                        />
                      </div>
                    </div>

                    {dim.items.map((item) => (
                      <LikertScale
                        key={item.id}
                        itemId={item.id}
                        itemText={`${item.orden}. ${item.texto}`}
                        value={evaluation.responses[item.id]}
                        onChange={() => {}}
                        disabled={true}
                      />
                    ))}

                    {evaluation.comments[dim.id] && (
                      <div className="mt-6 space-y-2">
                        <Label>Comentarios y evidencias del colaborador:</Label>
                        <Textarea
                          value={evaluation.comments[dim.id]}
                          disabled
                          rows={4}
                          className="resize-none bg-muted"
                        />
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentDimension(Math.max(0, currentDimension - 1))}
                  disabled={currentDimension === 0}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentDimension(
                      Math.min(dimensions.length - 1, currentDimension + 1)
                    )
                  }
                  disabled={currentDimension === dimensions.length - 1}
                >
                  Siguiente
                  <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                </Button>
              </div>

              <Button variant="outline" disabled>
                <FileDown className="mr-2 h-4 w-4" />
                Descargar Reporte PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EvaluacionColaborador;
