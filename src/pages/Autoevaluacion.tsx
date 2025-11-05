import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { LikertScale } from "@/components/evaluation/LikertScale";
import { INSTRUMENT_A1 } from "@/data/instruments";
import { ArrowLeft, ArrowRight, Save, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Autoevaluacion = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const instrument = INSTRUMENT_A1;
  
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [currentDimension, setCurrentDimension] = useState(0);

  const dimensions = instrument.dimensionesDesempeno;
  const totalItems = dimensions.reduce((sum, dim) => sum + dim.items.length, 0);
  const answeredItems = Object.keys(responses).length;
  const progressPercentage = (answeredItems / totalItems) * 100;

  const handleResponseChange = (itemId: string, value: number) => {
    setResponses((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleCommentChange = (dimensionId: string, comment: string) => {
    setComments((prev) => ({ ...prev, [dimensionId]: comment }));
  };

  const handleSaveDraft = () => {
    toast.success("Borrador guardado correctamente");
  };

  const handleSubmit = () => {
    const allAnswered = dimensions.every((dim) =>
      dim.items.every((item) => responses[item.id] !== undefined)
    );

    if (!allAnswered) {
      toast.error("Por favor, responda todos los ítems antes de enviar");
      return;
    }

    toast.success("Autoevaluación enviada exitosamente");
    navigate("/dashboard");
  };

  const currentDim = dimensions[currentDimension];
  const answeredInCurrentDim = currentDim.items.filter(
    (item) => responses[item.id] !== undefined
  ).length;

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

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Autoevaluación de Desempeño
          </h1>
          <p className="text-muted-foreground">
            Complete su evaluación respondiendo honestamente cada ítem
          </p>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progreso General</span>
            <span className="text-sm text-muted-foreground">
              {answeredItems} de {totalItems} ítems respondidos
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <Alert className="mb-6">
          <AlertDescription>
            <strong>Escala de evaluación:</strong> 1 = Muy bajo, 2 = Bajo, 3 = Medio, 4 = Alto, 5 = Muy alto
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>
              {currentDim.nombre} ({Math.round(currentDim.peso * 100)}%)
            </CardTitle>
            <CardDescription>
              Dimensión {currentDimension + 1} de {dimensions.length} •{" "}
              {answeredInCurrentDim} de {currentDim.items.length} ítems respondidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={currentDimension.toString()} className="w-full">
              <TabsList className="mb-6 w-full flex-wrap justify-start h-auto gap-2">
                {dimensions.map((dim, idx) => {
                  const answered = dim.items.filter(
                    (item) => responses[item.id] !== undefined
                  ).length;
                  const isComplete = answered === dim.items.length;
                  
                  return (
                    <TabsTrigger
                      key={dim.id}
                      value={idx.toString()}
                      onClick={() => setCurrentDimension(idx)}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      Dim. {idx + 1}
                      {isComplete && " ✓"}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {dimensions.map((dim, idx) => (
                <TabsContent key={dim.id} value={idx.toString()} className="space-y-4">
                  {dim.items.map((item) => (
                    <LikertScale
                      key={item.id}
                      itemId={item.id}
                      itemText={`${item.orden}. ${item.texto}`}
                      value={responses[item.id]}
                      onChange={(value) => handleResponseChange(item.id, value)}
                    />
                  ))}

                  <div className="mt-6 space-y-2">
                    <Label htmlFor={`comment-${dim.id}`}>
                      Comentarios adicionales sobre esta dimensión (opcional)
                    </Label>
                    <Textarea
                      id={`comment-${dim.id}`}
                      placeholder="Agregue comentarios, evidencias o ejemplos que considere relevantes..."
                      value={comments[dim.id] || ""}
                      onChange={(e) => handleCommentChange(dim.id, e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                  </div>
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
                    setCurrentDimension(Math.min(dimensions.length - 1, currentDimension + 1))
                  }
                  disabled={currentDimension === dimensions.length - 1}
                >
                  Siguiente
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSaveDraft}>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Borrador
                </Button>
                <Button onClick={handleSubmit}>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Evaluación
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Autoevaluacion;
