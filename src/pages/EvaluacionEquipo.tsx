import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileEdit, CheckCircle2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getJefeEvaluationDraft, hasJefeEvaluation } from "@/lib/storage";

const MOCK_TEAM = [
  {
    id: "1",
    dpi: "4567890123104",
    nombre: "Roberto Hernández Silva",
    cargo: "Coordinador",
    nivel: "S2",
    area: "Tecnología",
  },
  {
    id: "2",
    dpi: "9999999999998",
    nombre: "Carlos Méndez Juárez",
    cargo: "Analista Senior",
    nivel: "E1",
    area: "Tecnología",
  },
  {
    id: "3",
    dpi: "9999999999997",
    nombre: "Laura Vásquez Cruz",
    cargo: "Especialista",
    nivel: "E2",
    area: "Tecnología",
  },
];

const EvaluacionEquipo = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teamStatus, setTeamStatus] = useState<Record<string, { estado: string; progreso: number }>>({});

  useEffect(() => {
    if (!user) return;

    const status: Record<string, { estado: string; progreso: number }> = {};
    
    MOCK_TEAM.forEach((colaborador) => {
      const evaluado = hasJefeEvaluation(user.dpi, colaborador.dpi, "2025-1");
      if (evaluado) {
        const draft = getJefeEvaluationDraft(user.dpi, colaborador.dpi, "2025-1");
        status[colaborador.id] = {
          estado: "completado",
          progreso: draft?.progreso || 100,
        };
      } else {
        const draft = getJefeEvaluationDraft(user.dpi, colaborador.dpi, "2025-1");
        if (draft) {
          status[colaborador.id] = {
            estado: "en_progreso",
            progreso: draft.progreso,
          };
        } else {
          status[colaborador.id] = {
            estado: "pendiente",
            progreso: 0,
          };
        }
      }
    });

    setTeamStatus(status);
  }, [user]);

  const getStatusBadge = (estado: string) => {
    if (estado === "completado") {
      return (
        <Badge className="bg-success text-success-foreground">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Completado
        </Badge>
      );
    }
    if (estado === "en_progreso") {
      return (
        <Badge variant="outline" className="text-primary border-primary">
          <Clock className="mr-1 h-3 w-3" />
          En Progreso
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-warning border-warning">
        <Clock className="mr-1 h-3 w-3" />
        Pendiente
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Mi Equipo</h1>
          <p className="text-muted-foreground">
            Evalúe el desempeño y potencial de sus colaboradores
          </p>
        </div>

        <div className="grid gap-4">
          {MOCK_TEAM.map((colaborador) => {
            const status = teamStatus[colaborador.id] || { estado: "pendiente", progreso: 0 };
            return (
              <Card key={colaborador.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{colaborador.nombre}</CardTitle>
                      <CardDescription>
                        {colaborador.cargo} • {colaborador.area} • Nivel {colaborador.nivel}
                      </CardDescription>
                    </div>
                    {getStatusBadge(status.estado)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progreso</span>
                        <span className="font-medium">{status.progreso}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-gradient-primary transition-all"
                          style={{ width: `${status.progreso}%` }}
                        />
                      </div>
                    </div>
                    <Button 
                      className="ml-4"
                      onClick={() => navigate(`/evaluacion-equipo/${colaborador.id}`)}
                    >
                      <FileEdit className="mr-2 h-4 w-4" />
                      {status.estado === "completado" ? "Ver Evaluación" : "Evaluar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default EvaluacionEquipo;
