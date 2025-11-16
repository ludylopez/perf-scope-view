import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertTriangle,
  TrendingDown,
  Users,
  Clock,
  Target,
  ChevronRight,
} from "lucide-react";
import { getQuadrantMetadata } from "@/lib/nineBoxMetadata";
import { useNavigate } from "react-router-dom";

interface TeamMember {
  dpi: string;
  nombre: string;
  cargo: string;
  area: string;
  posicion9Box: string;
  desempenoPorcentaje: number;
  potencialPorcentaje?: number;
}

interface AlertItem {
  type: "critical" | "urgent" | "warning" | "info";
  category: string;
  title: string;
  description: string;
  members: TeamMember[];
  action?: string;
  icon: any;
}

interface UrgentAlertsProps {
  teamMembers: TeamMember[];
  className?: string;
}

export function UrgentAlerts({ teamMembers, className = "" }: UrgentAlertsProps) {
  const navigate = useNavigate();

  // Generar alertas inteligentes
  const generateAlerts = (): AlertItem[] => {
    const alerts: AlertItem[] = [];

    // 1. Talento crítico que requiere retención urgente
    const criticalTalent = teamMembers.filter(m => m.posicion9Box === "alto-alto");
    if (criticalTalent.length > 0) {
      alerts.push({
        type: "critical",
        category: "Retención Crítica",
        title: `${criticalTalent.length} Estrella${criticalTalent.length > 1 ? 's' : ''} requiere${criticalTalent.length === 1 ? '' : 'n'} plan de retención inmediato`,
        description: "Talento clave con alto riesgo de rotación. Acción urgente necesaria para retener.",
        members: criticalTalent,
        action: "Implementar estrategia de retención",
        icon: AlertTriangle,
      });
    }

    // 2. Enigmas - Alto potencial con bajo desempeño (situación crítica)
    const enigmas = teamMembers.filter(m => m.posicion9Box === "bajo-alto");
    if (enigmas.length > 0) {
      alerts.push({
        type: "urgent",
        category: "Intervención Urgente",
        title: `${enigmas.length} Enigma${enigmas.length > 1 ? 's' : ''} necesita${enigmas.length === 1 ? '' : 'n'} intervención inmediata`,
        description: "Alto potencial con bajo desempeño. Identificar barreras urgentemente para no perder el talento.",
        members: enigmas,
        action: "Diagnóstico y plan de mejora 90 días",
        icon: TrendingDown,
      });
    }

    // 3. Bajo rendimiento que requiere acción
    const bajoRendimiento = teamMembers.filter(m => m.posicion9Box === "bajo-bajo");
    if (bajoRendimiento.length > 0) {
      alerts.push({
        type: "urgent",
        category: "Plan de Mejora",
        title: `${bajoRendimiento.length} colaborador${bajoRendimiento.length > 1 ? 'es' : ''} en bajo rendimiento`,
        description: "Requieren plan de mejora inmediato o considerar desvinculación.",
        members: bajoRendimiento,
        action: "Plan de mejora 60-90 días",
        icon: AlertTriangle,
      });
    }

    // 4. Requieren atención (medio-bajo potencial)
    const requierenAtencion = teamMembers.filter(m => m.posicion9Box === "bajo-medio");
    if (requierenAtencion.length > 0) {
      alerts.push({
        type: "warning",
        category: "Atención Necesaria",
        title: `${requierenAtencion.length} colaborador${requierenAtencion.length > 1 ? 'es' : ''} requiere${requierenAtencion.length === 1 ? '' : 'n'} atención`,
        description: "Desempeño por debajo de expectativas. Plan de mejora necesario.",
        members: requierenAtencion,
        action: "Capacitación y seguimiento",
        icon: Clock,
      });
    }

    // 5. Alto potencial en desarrollo (oportunidad)
    const altoPotencial = teamMembers.filter(m => m.posicion9Box === "medio-alto");
    if (altoPotencial.length > 0) {
      alerts.push({
        type: "info",
        category: "Oportunidad de Desarrollo",
        title: `${altoPotencial.length} Alto${altoPotencial.length > 1 ? 's' : ''} Potencial en desarrollo`,
        description: "Con el apoyo adecuado pueden convertirse en Estrellas en 12-18 meses.",
        members: altoPotencial,
        action: "Plan de desarrollo intensivo",
        icon: Target,
      });
    }

    // 6. Expertos que requieren retención (alto desempeño, bajo potencial)
    const expertos = teamMembers.filter(m => m.posicion9Box === "alto-bajo");
    if (expertos.length > 0) {
      alerts.push({
        type: "info",
        category: "Retención de Expertos",
        title: `${expertos.length} Experto${expertos.length > 1 ? 's' : ''} técnico${expertos.length > 1 ? 's' : ''} valiosos`,
        description: "Especialistas de alto valor. Requieren carrera técnica y reconocimiento.",
        members: expertos,
        action: "Desarrollo técnico avanzado",
        icon: Users,
      });
    }

    return alerts.filter(a => a.members.length > 0);
  };

  const alerts = generateAlerts();

  if (alerts.length === 0) {
    return null;
  }

  const getAlertColor = (type: AlertItem["type"]) => {
    switch (type) {
      case "critical":
        return "border-red-500 bg-red-50 text-red-900";
      case "urgent":
        return "border-orange-500 bg-orange-50 text-orange-900";
      case "warning":
        return "border-yellow-500 bg-yellow-50 text-yellow-900";
      case "info":
        return "border-blue-500 bg-blue-50 text-blue-900";
      default:
        return "";
    }
  };

  const getAlertBadgeColor = (type: AlertItem["type"]) => {
    switch (type) {
      case "critical":
        return "bg-red-500 text-white";
      case "urgent":
        return "bg-orange-500 text-white";
      case "warning":
        return "bg-yellow-500 text-white";
      case "info":
        return "bg-blue-500 text-white";
      default:
        return "";
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Alertas y Recomendaciones Urgentes
        </CardTitle>
        <CardDescription>
          Acciones prioritarias basadas en el análisis de talento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert, index) => {
          const Icon = alert.icon;
          return (
            <Alert key={index} className={`${getAlertColor(alert.type)} border-2`}>
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTitle className="text-sm font-semibold mb-0">
                          {alert.title}
                        </AlertTitle>
                        <Badge className={getAlertBadgeColor(alert.type)}>
                          {alert.category}
                        </Badge>
                      </div>
                      <AlertDescription className="text-xs">
                        {alert.description}
                      </AlertDescription>
                    </div>
                  </div>

                  {/* Lista de colaboradores afectados (máximo 3) */}
                  <div className="space-y-1">
                    {alert.members.slice(0, 3).map((member) => (
                      <div
                        key={member.dpi}
                        className="flex items-center justify-between text-xs bg-background/50 p-2 rounded cursor-pointer hover:bg-background transition-colors"
                        onClick={() => navigate(`/evaluacion-equipo/${member.dpi}/comparativa`)}
                      >
                        <div className="flex-1">
                          <span className="font-medium">{member.nombre}</span>
                          <span className="text-muted-foreground ml-2">• {member.cargo}</span>
                        </div>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </div>
                    ))}
                    {alert.members.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center py-1">
                        + {alert.members.length - 3} más...
                      </p>
                    )}
                  </div>

                  {/* Acción recomendada */}
                  {alert.action && (
                    <div className="pt-2 border-t border-current/20">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium">
                          ✓ Acción recomendada: {alert.action}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            // Navegar al primer colaborador de la lista
                            if (alert.members.length > 0) {
                              navigate(`/evaluacion-equipo/${alert.members[0].dpi}/comparativa`);
                            }
                          }}
                        >
                          Ver Detalles
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Alert>
          );
        })}

        {/* Resumen */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Resumen:</strong> {alerts.length} alerta{alerts.length > 1 ? 's' : ''} activa{alerts.length > 1 ? 's' : ''}
            {" "}•{" "}
            {alerts.reduce((sum, a) => sum + a.members.length, 0)} colaborador{alerts.reduce((sum, a) => sum + a.members.length, 0) > 1 ? 'es' : ''} requiere{alerts.reduce((sum, a) => sum + a.members.length, 0) === 1 ? '' : 'n'} atención
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
