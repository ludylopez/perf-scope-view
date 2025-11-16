import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  QuadrantMetadata,
  getQuadrantMetadata,
  getPriorityColor,
  getActionCategoryIcon
} from "@/lib/nineBoxMetadata";
import {
  Info,
  Target,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lightbulb,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useState } from "react";

interface QuadrantInfoProps {
  position: string;
  className?: string;
  showActions?: boolean;
  compact?: boolean;
}

export function QuadrantInfo({
  position,
  className = "",
  showActions = true,
  compact = false
}: QuadrantInfoProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const metadata = getQuadrantMetadata(position);

  if (!metadata) {
    return null;
  }

  const importanceColors = {
    critical: "bg-red-100 text-red-800 border-red-300",
    high: "bg-orange-100 text-orange-800 border-orange-300",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
    low: "bg-blue-100 text-blue-800 border-blue-300",
  };

  const retentionColors = {
    urgent: "bg-red-100 text-red-800 border-red-300",
    high: "bg-orange-100 text-orange-800 border-orange-300",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
    low: "bg-gray-100 text-gray-800 border-gray-300",
  };

  return (
    <Card className={`${className} border-2`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{metadata.icon}</span>
              <CardTitle className="text-xl">{metadata.label}</CardTitle>
            </div>
            <CardDescription className="text-sm">
              {metadata.description}
            </CardDescription>
          </div>
          {compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-2"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <Badge className={`${importanceColors[metadata.strategicImportance]} border`}>
            <Target className="h-3 w-3 mr-1" />
            Importancia: {
              metadata.strategicImportance === "critical" ? "Crítica" :
              metadata.strategicImportance === "high" ? "Alta" :
              metadata.strategicImportance === "medium" ? "Media" : "Baja"
            }
          </Badge>
          <Badge className={`${retentionColors[metadata.retentionPriority]} border`}>
            <Users className="h-3 w-3 mr-1" />
            Retención: {
              metadata.retentionPriority === "urgent" ? "Urgente" :
              metadata.retentionPriority === "high" ? "Alta" :
              metadata.retentionPriority === "medium" ? "Media" : "Baja"
            }
          </Badge>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Características Clave */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <h4 className="font-semibold text-sm">Características Clave</h4>
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {metadata.keyCharacteristics.map((char, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{char}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Ruta de Carrera */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <h4 className="font-semibold text-sm">Ruta de Carrera</h4>
            </div>
            <p className="text-sm text-muted-foreground">{metadata.careerPath}</p>
          </div>

          {/* Marco de Tiempo */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <h4 className="font-semibold text-sm">Marco de Tiempo Típico</h4>
            </div>
            <p className="text-sm text-muted-foreground">{metadata.typicalTimeframe}</p>
          </div>

          {/* Áreas de Desarrollo */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-yellow-600" />
              <h4 className="font-semibold text-sm">Enfoque de Desarrollo</h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {metadata.developmentFocus.map((focus, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {focus}
                </Badge>
              ))}
            </div>
          </div>

          {/* Guía para el Manager */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2 mb-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <h4 className="font-semibold text-sm text-blue-900">Guía para el Jefe</h4>
            </div>
            <p className="text-sm text-blue-800">{metadata.managerGuidance}</p>
          </div>

          {/* Factores de Riesgo (si existen) */}
          {metadata.riskFactors && metadata.riskFactors.length > 0 && (
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <h4 className="font-semibold text-sm text-amber-900">Factores de Riesgo</h4>
              </div>
              <ul className="space-y-1 text-sm text-amber-800">
                {metadata.riskFactors.map((risk, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-amber-600 mt-1">⚠</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Acciones Recomendadas */}
          {showActions && metadata.recommendedActions.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-600" />
                Acciones Recomendadas
              </h4>
              <div className="space-y-2">
                {metadata.recommendedActions.map((action, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-3 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-start gap-2 flex-1">
                        <span className="text-lg mt-0.5">
                          {getActionCategoryIcon(action.category)}
                        </span>
                        <div className="flex-1">
                          <h5 className="font-medium text-sm">{action.title}</h5>
                          <p className="text-xs text-muted-foreground mt-1">
                            {action.description}
                          </p>
                        </div>
                      </div>
                      <Badge className={`${getPriorityColor(action.priority)} border text-xs flex-shrink-0`}>
                        {action.priority === "urgent" ? "Urgente" :
                         action.priority === "high" ? "Alta" :
                         action.priority === "medium" ? "Media" : "Baja"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
