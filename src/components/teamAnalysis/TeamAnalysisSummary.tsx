import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  TrendingUp,
  Target,
  CheckCircle2,
  ThumbsUp,
} from "lucide-react";
import type { TeamAnalysisStats } from "@/types/teamAnalysis";
import { TeamStrengthsOpportunities } from "./TeamStrengthsOpportunities";

interface TeamAnalysisSummaryProps {
  stats: TeamAnalysisStats | null;
  isLoading?: boolean;
  jefeDpi?: string;
  periodoId?: string;
  isCascada?: boolean;  // true = análisis de toda la unidad, false = solo equipo directo
}

export function TeamAnalysisSummary({ stats, isLoading, jefeDpi, periodoId, isCascada = false }: TeamAnalysisSummaryProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Personas</p>
                <p className="text-2xl font-bold">{stats.totalPersonas}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2 text-xs">
              <Badge variant="outline">{stats.totalJefes} jefes</Badge>
              <Badge variant="secondary">{stats.totalColaboradores} colaboradores</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Evaluaciones</p>
                <p className="text-2xl font-bold">{stats.evaluacionesCompletadas}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Completitud</span>
                <span className="font-medium">{Math.round(stats.tasaCompletitud)}%</span>
              </div>
              <Progress value={stats.tasaCompletitud} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Desempeño Promedio</p>
                <p className="text-2xl font-bold text-primary">
                  {Math.round(stats.promedioDesempenoUnidad)}%
                </p>
              </div>
            </div>
            <Progress
              value={stats.promedioDesempenoUnidad}
              className="h-2 mt-3"
            />
            {/* Comparativa vs organización */}
            {stats.promedioDesempenoOrganizacion > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs">
                {stats.promedioDesempenoUnidad >= stats.promedioDesempenoOrganizacion ? (
                  <>
                    <span className="text-green-600 font-medium">
                      ↑ {Math.round(stats.promedioDesempenoUnidad - stats.promedioDesempenoOrganizacion)} pts
                    </span>
                    <span className="text-muted-foreground">
                      vs org ({Math.round(stats.promedioDesempenoOrganizacion)}%)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-red-600 font-medium">
                      ↓ {Math.round(stats.promedioDesempenoOrganizacion - stats.promedioDesempenoUnidad)} pts
                    </span>
                    <span className="text-muted-foreground">
                      vs org ({Math.round(stats.promedioDesempenoOrganizacion)}%)
                    </span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Potencial Promedio</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(stats.promedioPotencialUnidad)}%
                </p>
              </div>
            </div>
            <Progress
              value={stats.promedioPotencialUnidad}
              className="h-2 mt-3"
            />
            {/* Comparativa vs organización */}
            {stats.promedioPotencialOrganizacion > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs">
                {stats.promedioPotencialUnidad >= stats.promedioPotencialOrganizacion ? (
                  <>
                    <span className="text-green-600 font-medium">
                      ↑ {Math.round(stats.promedioPotencialUnidad - stats.promedioPotencialOrganizacion)} pts
                    </span>
                    <span className="text-muted-foreground">
                      vs org ({Math.round(stats.promedioPotencialOrganizacion)}%)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-red-600 font-medium">
                      ↓ {Math.round(stats.promedioPotencialOrganizacion - stats.promedioPotencialUnidad)} pts
                    </span>
                    <span className="text-muted-foreground">
                      vs org ({Math.round(stats.promedioPotencialOrganizacion)}%)
                    </span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                stats.eNPS !== undefined && stats.eNPS >= 0
                  ? "bg-emerald-100"
                  : stats.eNPS !== undefined && stats.eNPS < 0
                    ? "bg-red-100"
                    : "bg-gray-100"
              }`}>
                <ThumbsUp className={`h-5 w-5 ${
                  stats.eNPS !== undefined && stats.eNPS >= 0
                    ? "text-emerald-600"
                    : stats.eNPS !== undefined && stats.eNPS < 0
                      ? "text-red-600"
                      : "text-gray-600"
                }`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">eNPS</p>
                <p className={`text-2xl font-bold ${
                  stats.eNPS !== undefined && stats.eNPS >= 50
                    ? "text-emerald-600"
                    : stats.eNPS !== undefined && stats.eNPS >= 0
                      ? "text-amber-600"
                      : stats.eNPS !== undefined && stats.eNPS < 0
                        ? "text-red-600"
                        : "text-gray-400"
                }`}>
                  {stats.eNPS !== undefined ? (stats.eNPS > 0 ? `+${stats.eNPS}` : stats.eNPS) : "N/A"}
                </p>
              </div>
            </div>
            {/* Desglose de promotores/detractores */}
            {stats.eNPSTotalRespuestas !== undefined && stats.eNPSTotalRespuestas > 0 && (
              <div className="mt-3 flex gap-2 text-xs">
                <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                  😊 {stats.eNPSPromoters || 0}
                </Badge>
                <Badge variant="outline" className="text-gray-500 border-gray-200">
                  😐 {stats.eNPSPassives || 0}
                </Badge>
                <Badge variant="outline" className="text-red-500 border-red-200">
                  😞 {stats.eNPSDetractors || 0}
                </Badge>
              </div>
            )}
            {/* Comparativa vs organización */}
            {stats.eNPS !== undefined && stats.eNPSOrganizacion !== undefined && (
              <div className="mt-2 flex items-center gap-1 text-xs">
                {stats.eNPS >= stats.eNPSOrganizacion ? (
                  <>
                    <span className="text-green-600 font-medium">
                      ↑ {stats.eNPS - stats.eNPSOrganizacion} pts
                    </span>
                    <span className="text-muted-foreground">
                      vs org ({stats.eNPSOrganizacion > 0 ? `+${stats.eNPSOrganizacion}` : stats.eNPSOrganizacion})
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-red-600 font-medium">
                      ↓ {stats.eNPSOrganizacion - stats.eNPS} pts
                    </span>
                    <span className="text-muted-foreground">
                      vs org ({stats.eNPSOrganizacion > 0 ? `+${stats.eNPSOrganizacion}` : stats.eNPSOrganizacion})
                    </span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Análisis de Fortalezas y Oportunidades */}
      {jefeDpi && periodoId && (
        <TeamStrengthsOpportunities
          jefeDpi={jefeDpi}
          periodoId={periodoId}
          isCascada={isCascada}
        />
      )}
    </div>
  );
}
