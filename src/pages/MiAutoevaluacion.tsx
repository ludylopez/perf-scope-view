import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
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
import { getSubmittedEvaluation } from "@/lib/storage";
import { calculatePerformanceScore, getDimensionProgress } from "@/lib/calculations";
import { ArrowLeft, CheckCircle2, FileDown } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const MiAutoevaluacion = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const instrument = INSTRUMENT_A1;

  const [evaluation, setEvaluation] = useState<any>(null);
  const [currentDimension, setCurrentDimension] = useState(0);

  useEffect(() => {
    if (!user) return;

    const submitted = getSubmittedEvaluation(user.dpi, "2025-1");
    
    if (!submitted) {
      navigate("/autoevaluacion");
      return;
    }

    setEvaluation(submitted);
  }, [user, navigate]);

  if (!evaluation) {
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

  const currentDim = dimensions[currentDimension];
  const dimProgress = getDimensionProgress(evaluation.responses, currentDim);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Button>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Periodo: 2025-1</p>
            <p className="text-sm text-muted-foreground">Nivel: {user?.nivel}</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">
              Mi Autoevaluación
            </h1>
            <Badge className="bg-success text-success-foreground">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Enviada
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Enviada el{" "}
            {format(new Date(evaluation.fechaEnvio), "d 'de' MMMM, yyyy", {
              locale: es,
            })}
          </p>
        </div>

        <Alert className="mb-6 border-info bg-info/10">
          <AlertDescription className="text-sm">
            Esta es su autoevaluación enviada. Los resultados finales se calcularán
            como <strong>30% de su autoevaluación + 70% de la evaluación de su
            jefe</strong>. Recibirá los resultados finales cuando el periodo de
            evaluación cierre.
          </AlertDescription>
        </Alert>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Puntaje de Autoevaluación</CardTitle>
            <CardDescription>
              Promedio ponderado de sus respuestas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-5xl font-bold text-primary">
                {performanceScore.toFixed(1)}
              </div>
              <div className="text-muted-foreground">
                <p className="text-sm">de 5.0</p>
                <p className="text-xs">escala Likert</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mis Respuestas por Dimensión</CardTitle>
            <CardDescription>
              Visualización completa de su autoevaluación
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

              {dimensions.map((dim, idx) => (
                <TabsContent key={dim.id} value={idx.toString()} className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">
                      {dim.nombre} ({Math.round(dim.peso * 100)}%)
                    </h3>
                    {dim.descripcion && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {dim.descripcion}
                      </p>
                    )}
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
                      <Label>Comentarios y evidencias:</Label>
                      <Textarea
                        value={evaluation.comments[dim.id]}
                        disabled
                        rows={4}
                        className="resize-none bg-muted"
                      />
                    </div>
                  )}
                </TabsContent>
              ))}
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
                Descargar PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MiAutoevaluacion;
