import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePeriod } from "@/contexts/PeriodContext";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LikertScale } from "@/components/evaluation/LikertScale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Instrument } from "@/types/evaluation";
import { getInstrumentForUser } from "@/lib/instruments";
import { getSubmittedEvaluation } from "@/lib/storage";
import { getDimensionProgress } from "@/lib/calculations";
import { ArrowLeft, FileDown, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const MisRespuestasDetalle = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { activePeriodId } = usePeriod();
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [currentDimension, setCurrentDimension] = useState(0);

  useEffect(() => {
    if (!user || !activePeriodId) return;

    const loadData = async () => {
      // Cargar instrumento según nivel del usuario
      const userInstrument = await getInstrumentForUser(user.nivel);
      if (!userInstrument) {
        toast.error("No se encontró un instrumento de evaluación para su nivel");
        navigate("/mi-autoevaluacion");
        return;
      }
      setInstrument(userInstrument);

      // Cargar evaluación enviada
      const savedEval = await getSubmittedEvaluation(user.dpi, activePeriodId);

      if (!savedEval) {
        toast.error("No se encontró una autoevaluación enviada");
        navigate("/mi-autoevaluacion");
        return;
      }

      setEvaluation(savedEval);
    };

    loadData();
  }, [user, activePeriodId, navigate]);

  if (!instrument || !evaluation) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-4 text-muted-foreground">Cargando detalles...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const dimensions = instrument.dimensionesDesempeno;
  const currentDim = dimensions[currentDimension];
  const dimProgress = getDimensionProgress(evaluation.responses, currentDim);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/mi-autoevaluacion")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Resultados
          </Button>
        </div>

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

export default MisRespuestasDetalle;
