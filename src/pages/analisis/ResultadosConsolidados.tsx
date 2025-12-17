import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getActivePeriod } from "@/lib/supabase";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Users,
  UserCheck,
  UserX,
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Building2,
  UserCog,
  Briefcase,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ResultadosConsolidadosData {
  poblacionTotal: {
    totalUsuarios: number;
    usuariosActivos: number;
    usuariosInactivos: number;
  };
  sujetosEvaluacion: {
    total: number;
    administrativos: number;
    operativos: number;
    concejoC1: number;
    alcaldeA1: number;
  };
  noSujetosEvaluacion: {
    total: number;
    inactivos: number;
    sinFechaIngreso: number;
    sinTipoPuesto: number;
    antiguedadInsuficiente: number;
  };
  evaluacionesEsperadas: {
    autoevaluaciones: number;
    evaluacionesJefe: number;
    total: number;
  };
  autoevaluaciones: {
    esperadas: number;
    completadas: number;
    enProgreso: number;
    pendientes: number;
    porcentajeCompletitud: number;
  };
  evaluacionesJefe: {
    esperadas: number;
    completadas: number;
    enProgreso: number;
    pendientes: number;
    porcentajeCompletitud: number;
  };
  autoevaluacionesJefes: {
    esperadas: number;
    completadas: number;
    enProgreso: number;
    pendientes: number;
    porcentajeCompletitud: number;
  };
  autoevaluacionesColaboradores: {
    esperadas: number;
    completadas: number;
    enProgreso: number;
    pendientes: number;
    porcentajeCompletitud: number;
  };
  metricasResultados?: {
    promedioDesempeno: number;
    promedioPotencial: number;
    nps: {
      promedio: number;
      promoters: number;
      passives: number;
      detractors: number;
      totalRespuestas: number;
    };
  };
}

export default function ResultadosConsolidados() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState("");
  const [data, setData] = useState<ResultadosConsolidadosData | null>(null);

  useEffect(() => {
    if (!user || (user.rol !== "admin_rrhh" && user.rol !== "admin_general")) {
      setError("Solo administradores pueden acceder a esta vista");
      setLoading(false);
      return;
    }
    loadData();
  }, [user]);

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

      // Llamar a la función SQL
      const { data: resultadosData, error: resultadosError } = await supabase.rpc(
        "get_resultados_consolidados",
        { periodo_id_param: periodo.id }
      );

      if (resultadosError) {
        console.error("Error cargando resultados consolidados:", resultadosError);
        setError("Error al cargar resultados consolidados: " + resultadosError.message);
        return;
      }

      if (!resultadosData) {
        setError("No se pudieron obtener los resultados consolidados");
        return;
      }

      setData(resultadosData as ResultadosConsolidadosData);
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Cargando resultados consolidados...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Sin datos</AlertTitle>
            <AlertDescription>No se encontraron datos para mostrar</AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link to="/analisis">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              Resultados Consolidados
            </h1>
            <p className="text-muted-foreground mt-2">
              Población total, elegibilidad y estado de evaluaciones - Período {periodoNombre}
            </p>
          </div>
          <Button variant="outline" onClick={loadData}>
            <Loader2 className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        {/* Población Total */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Población Total de Empleados
            </CardTitle>
            <CardDescription>
              Incluye todos los empleados (activos e inactivos), Concejo Municipal y Alcalde
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 border rounded-lg">
                <p className="text-4xl font-bold text-primary">{data.poblacionTotal.totalUsuarios}</p>
                <p className="text-sm text-muted-foreground mt-2">Total de Empleados</p>
              </div>
              <div className="text-center p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                  {data.poblacionTotal.usuariosActivos}
                </p>
                <p className="text-sm text-muted-foreground mt-2">Usuarios Activos</p>
              </div>
              <div className="text-center p-4 border rounded-lg bg-gray-50 dark:bg-gray-950">
                <p className="text-4xl font-bold text-gray-600 dark:text-gray-400">
                  {data.poblacionTotal.usuariosInactivos}
                </p>
                <p className="text-sm text-muted-foreground mt-2">Usuarios Inactivos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sujetos vs No Sujetos a Evaluación */}
        <div className="grid gap-6 mb-6 md:grid-cols-2">
          {/* Sujetos a Evaluación */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-green-600" />
                Sujetos a Evaluación
              </CardTitle>
              <CardDescription>
                Empleados que cumplen criterios de elegibilidad (activo + antigüedad suficiente)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center p-4 border-2 border-green-500 rounded-lg bg-green-50 dark:bg-green-950">
                  <p className="text-5xl font-bold text-green-600 dark:text-green-400">
                    {data.sujetosEvaluacion.total}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">Total Elegibles</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border rounded-lg">
                    <p className="text-2xl font-bold">{data.sujetosEvaluacion.administrativos}</p>
                    <p className="text-xs text-muted-foreground">Administrativos</p>
                    <p className="text-xs text-muted-foreground">(≥3 meses)</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-2xl font-bold">{data.sujetosEvaluacion.operativos}</p>
                    <p className="text-xs text-muted-foreground">Operativos</p>
                    <p className="text-xs text-muted-foreground">(≥6 meses)</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-2xl font-bold">{data.sujetosEvaluacion.concejoC1}</p>
                    <p className="text-xs text-muted-foreground">Concejo (C1)</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-2xl font-bold">{data.sujetosEvaluacion.alcaldeA1}</p>
                    <p className="text-xs text-muted-foreground">Alcalde (A1)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* No Sujetos a Evaluación */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-orange-600" />
                No Sujetos a Evaluación
              </CardTitle>
              <CardDescription>
                Empleados que no cumplen criterios de elegibilidad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center p-4 border-2 border-orange-500 rounded-lg bg-orange-50 dark:bg-orange-950">
                  <p className="text-5xl font-bold text-orange-600 dark:text-orange-400">
                    {data.noSujetosEvaluacion.total}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">Total No Elegibles</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 border rounded">
                    <span className="text-sm">Inactivos</span>
                    <Badge variant="outline">{data.noSujetosEvaluacion.inactivos}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 border rounded">
                    <span className="text-sm">Sin fecha de ingreso</span>
                    <Badge variant="outline">{data.noSujetosEvaluacion.sinFechaIngreso}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 border rounded">
                    <span className="text-sm">Sin tipo de puesto</span>
                    <Badge variant="outline">{data.noSujetosEvaluacion.sinTipoPuesto}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 border rounded">
                    <span className="text-sm">Antigüedad insuficiente</span>
                    <Badge variant="outline">{data.noSujetosEvaluacion.antiguedadInsuficiente}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Evaluaciones Esperadas */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Evaluaciones Esperadas (Totales)
            </CardTitle>
            <CardDescription>
              Total de evaluaciones que debieron realizarse según criterios de elegibilidad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 mb-4">
              <div className="text-center p-4 border rounded-lg">
                <p className="text-3xl font-bold text-primary">{data.evaluacionesEsperadas.autoevaluaciones}</p>
                <p className="text-sm text-muted-foreground mt-2">Autoevaluaciones Esperadas</p>
                <p className="text-xs text-muted-foreground">(Sujetos elegibles excluyendo jefes externos)</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-3xl font-bold text-primary">{data.evaluacionesEsperadas.evaluacionesJefe}</p>
                <p className="text-sm text-muted-foreground mt-2">Evaluaciones de Jefe Esperadas</p>
                <p className="text-xs text-muted-foreground">(Basadas en asignaciones activas)</p>
              </div>
              <div className="text-center p-4 border-2 border-primary rounded-lg bg-primary/5">
                <p className="text-4xl font-bold text-primary">{data.evaluacionesEsperadas.total}</p>
                <p className="text-sm font-semibold mt-2">Total de Evaluaciones Esperadas</p>
              </div>
            </div>
            
            {/* Párrafo explicativo */}
            <div className="mt-4 p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
              <p className="text-sm text-foreground leading-relaxed">
                <strong className="text-primary">Explicación de las evaluaciones esperadas:</strong> El total de{" "}
                <strong>{data.evaluacionesEsperadas.total} evaluaciones</strong> se compone de{" "}
                <strong>{data.evaluacionesEsperadas.autoevaluaciones} autoevaluaciones</strong> y{" "}
                <strong>{data.evaluacionesEsperadas.evaluacionesJefe} evaluaciones de jefe</strong>. Las{" "}
                {data.evaluacionesEsperadas.autoevaluaciones} autoevaluaciones corresponden a{" "}
                <strong>{data.autoevaluacionesColaboradores.esperadas} colaboradores</strong> (todos los activos) más{" "}
                <strong>{data.autoevaluacionesJefes.esperadas} jefes</strong> elegibles (excluyendo evaluadores externos), 
                quienes deben autoevaluarse según su rol y antigüedad.{" "}
                <strong className="text-primary">¿Por qué hay más evaluaciones de jefe ({data.evaluacionesEsperadas.evaluacionesJefe}) que autoevaluaciones ({data.evaluacionesEsperadas.autoevaluaciones})?</strong>{" "}
                La razón es que los <strong>directivos de alto nivel tienen múltiples evaluadores simultáneos</strong>. 
                En el sistema existen <strong>513 relaciones jefe-colaborador activas</strong> entre{" "}
                <strong>370 colaboradores únicos</strong> y <strong>44 jefes únicos</strong>. De estas,{" "}
                <strong>354 colaboradores tienen exactamente 1 evaluador</strong> (354 evaluaciones), mientras que{" "}
                <strong>16 directivos tienen múltiples evaluadores</strong> (159 evaluaciones). Específicamente: los{" "}
                <strong>6 Directores (D1) tienen exactamente 10 evaluadores cada uno</strong> (60 evaluaciones), los{" "}
                <strong>3 Directores (D2) tienen exactamente 10 evaluadores cada uno</strong> (30 evaluaciones),{" "}
                <strong>5 de los 9 Jefes de Dirección (E1) tienen exactamente 10 evaluadores cada uno</strong> (50 evaluaciones), 
                el <strong>Secretario Municipal (S2) tiene exactamente 10 evaluadores</strong> (10 evaluaciones), y el{" "}
                <strong>Alcalde (A1) tiene exactamente 9 evaluadores del Concejo Municipal</strong> (9 evaluaciones). 
                Este sistema de múltiples evaluadores para directivos genera <strong>159 evaluaciones adicionales</strong> 
                (60+30+50+10+9) que explican por qué el número de evaluaciones de jefe ({data.evaluacionesEsperadas.evaluacionesJefe}) 
                supera el número de autoevaluaciones ({data.evaluacionesEsperadas.autoevaluaciones}), ya que cada directivo 
                recibe múltiples evaluaciones independientes de diferentes supervisores, mientras que cada persona se autoevalúa 
                una sola vez. Este total refleja el alcance completo del proceso de evaluación 180° implementado en la organización, 
                asegurando que todos los colaboradores elegibles sean evaluados tanto por sí mismos como por sus supervisores directos.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Estado de Autoevaluaciones */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Estado de Autoevaluaciones
            </CardTitle>
            <CardDescription>
              Progreso de autoevaluaciones (todos los sujetos elegibles)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progreso General</span>
                <span className="text-sm font-bold">
                  {data.autoevaluaciones.completadas} / {data.autoevaluaciones.esperadas} (
                  {data.autoevaluaciones.porcentajeCompletitud}%)
                </span>
              </div>
              <Progress value={data.autoevaluaciones.porcentajeCompletitud} className="h-3" />
              <div className="grid gap-4 md:grid-cols-3 mt-4">
                <div className="text-center p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                  <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-600" />
                  <p className="text-3xl font-bold text-green-600">{data.autoevaluaciones.completadas}</p>
                  <p className="text-sm text-muted-foreground">Completadas</p>
                </div>
                <div className="text-center p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <p className="text-3xl font-bold text-blue-600">{data.autoevaluaciones.enProgreso}</p>
                  <p className="text-sm text-muted-foreground">En Progreso</p>
                </div>
                <div className="text-center p-4 border rounded-lg bg-orange-50 dark:bg-orange-950">
                  <XCircle className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                  <p className="text-3xl font-bold text-orange-600">{data.autoevaluaciones.pendientes}</p>
                  <p className="text-sm text-muted-foreground">Pendientes</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Desglose: Autoevaluaciones de Jefes vs Colaboradores */}
        <div className="grid gap-6 mb-6 md:grid-cols-2">
          {/* Autoevaluaciones de Jefes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Autoevaluaciones de Jefes
              </CardTitle>
              <CardDescription>
                Jefes elegibles (excluyendo evaluadores externos)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Progreso</span>
                  <span className="text-sm font-bold">
                    {data.autoevaluacionesJefes.completadas} / {data.autoevaluacionesJefes.esperadas} (
                    {data.autoevaluacionesJefes.porcentajeCompletitud}%)
                  </span>
                </div>
                <Progress value={data.autoevaluacionesJefes.porcentajeCompletitud} className="h-2" />
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xl font-bold text-green-600">{data.autoevaluacionesJefes.completadas}</p>
                    <p className="text-xs text-muted-foreground">Completadas</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-blue-600">{data.autoevaluacionesJefes.enProgreso}</p>
                    <p className="text-xs text-muted-foreground">En Progreso</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-orange-600">{data.autoevaluacionesJefes.pendientes}</p>
                    <p className="text-xs text-muted-foreground">Pendientes</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Autoevaluaciones de Colaboradores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Autoevaluaciones de Colaboradores
              </CardTitle>
              <CardDescription>
                Colaboradores elegibles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Progreso</span>
                  <span className="text-sm font-bold">
                    {data.autoevaluacionesColaboradores.completadas} / {data.autoevaluacionesColaboradores.esperadas} (
                    {data.autoevaluacionesColaboradores.porcentajeCompletitud}%)
                  </span>
                </div>
                <Progress value={data.autoevaluacionesColaboradores.porcentajeCompletitud} className="h-2" />
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xl font-bold text-green-600">
                      {data.autoevaluacionesColaboradores.completadas}
                    </p>
                    <p className="text-xs text-muted-foreground">Completadas</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-blue-600">
                      {data.autoevaluacionesColaboradores.enProgreso}
                    </p>
                    <p className="text-xs text-muted-foreground">En Progreso</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-orange-600">
                      {data.autoevaluacionesColaboradores.pendientes}
                    </p>
                    <p className="text-xs text-muted-foreground">Pendientes</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estado de Evaluaciones de Jefe */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Estado de Evaluaciones de Jefe
            </CardTitle>
            <CardDescription>
              Evaluaciones que los jefes deben realizar a sus colaboradores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progreso General</span>
                <span className="text-sm font-bold">
                  {data.evaluacionesJefe.completadas} / {data.evaluacionesJefe.esperadas} (
                  {data.evaluacionesJefe.porcentajeCompletitud}%)
                </span>
              </div>
              <Progress value={data.evaluacionesJefe.porcentajeCompletitud} className="h-3" />
              <div className="grid gap-4 md:grid-cols-3 mt-4">
                <div className="text-center p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                  <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-600" />
                  <p className="text-3xl font-bold text-green-600">{data.evaluacionesJefe.completadas}</p>
                  <p className="text-sm text-muted-foreground">Completadas</p>
                </div>
                <div className="text-center p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <p className="text-3xl font-bold text-blue-600">{data.evaluacionesJefe.enProgreso}</p>
                  <p className="text-sm text-muted-foreground">En Progreso</p>
                </div>
                <div className="text-center p-4 border rounded-lg bg-orange-50 dark:bg-orange-950">
                  <XCircle className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                  <p className="text-3xl font-bold text-orange-600">{data.evaluacionesJefe.pendientes}</p>
                  <p className="text-sm text-muted-foreground">Pendientes</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Métricas de Resultados */}
        {data.metricasResultados && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Métricas de Resultados
              </CardTitle>
              <CardDescription>
                Promedios calculados solo con evaluaciones completadas, excluyendo usuarios administrativos de monitoreo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-4">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-3xl font-bold text-primary">{data.metricasResultados.promedioDesempeno}%</p>
                  <p className="text-sm text-muted-foreground mt-2">Promedio de Desempeño</p>
                  <p className="text-xs text-muted-foreground">Basado en {data.metricasResultados.nps.totalRespuestas} evaluaciones completadas</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-3xl font-bold text-primary">{data.metricasResultados.promedioPotencial}%</p>
                  <p className="text-sm text-muted-foreground mt-2">Promedio de Potencial</p>
                  <p className="text-xs text-muted-foreground">Basado en evaluaciones completadas</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-3xl font-bold text-primary">{data.metricasResultados.nps.promedio}</p>
                  <p className="text-sm text-muted-foreground mt-2">Net Promoter Score (NPS)</p>
                  <p className="text-xs text-muted-foreground">
                    {data.metricasResultados.nps.promoters} promotores, {data.metricasResultados.nps.passives} pasivos, {data.metricasResultados.nps.detractors} detractores
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                <strong>Nota:</strong> Estas métricas se calculan únicamente con evaluaciones completadas (estado "enviado") 
                y excluyen usuarios administrativos de monitoreo (admin_general, admin_rrhh). 
                Representan el desempeño y potencial promedio de toda la municipalidad basado en {data.metricasResultados.nps.totalRespuestas} evaluaciones finalizadas.
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumen Ejecutivo */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Resumen Ejecutivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="font-medium">Población Total:</span>
                <span className="font-bold">{data.poblacionTotal.totalUsuarios} empleados</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="font-medium">Sujetos a Evaluación:</span>
                <span className="font-bold text-green-600">{data.sujetosEvaluacion.total} empleados</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="font-medium">No Sujetos a Evaluación:</span>
                <span className="font-bold text-orange-600">{data.noSujetosEvaluacion.total} empleados</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-primary/10 rounded border border-primary/20">
                <span className="font-semibold">Total Evaluaciones Esperadas:</span>
                <span className="font-bold text-primary text-lg">{data.evaluacionesEsperadas.total}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-950 rounded">
                <span className="font-medium">Autoevaluaciones Completadas:</span>
                <span className="font-bold text-green-600">
                  {data.autoevaluaciones.completadas} ({data.autoevaluaciones.porcentajeCompletitud}%)
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-950 rounded">
                <span className="font-medium">Evaluaciones de Jefe Completadas:</span>
                <span className="font-bold text-green-600">
                  {data.evaluacionesJefe.completadas} ({data.evaluacionesJefe.porcentajeCompletitud}%)
                </span>
              </div>
              {data.metricasResultados && (
                <>
                  <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-950 rounded">
                    <span className="font-medium">Promedio de Desempeño:</span>
                    <span className="font-bold text-blue-600">{data.metricasResultados.promedioDesempeno}%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-950 rounded">
                    <span className="font-medium">Promedio de Potencial:</span>
                    <span className="font-bold text-blue-600">{data.metricasResultados.promedioPotencial}%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-purple-50 dark:bg-purple-950 rounded">
                    <span className="font-medium">Net Promoter Score (NPS):</span>
                    <span className="font-bold text-purple-600">{data.metricasResultados.nps.promedio}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
