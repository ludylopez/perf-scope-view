import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Award,
  AlertTriangle,
  Briefcase,
  Building2,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { getDetalleColaboradorCompleto } from "@/lib/teamAnalysis";
import type { TeamMemberDetail, TeamMemberDetailModalProps } from "@/types/teamAnalysis";
import {
  NINE_BOX_METADATA,
  getPositionColor,
  type NineBoxPosition,
} from "@/lib/nineBoxMetadata";

export function TeamMemberDetailModal({
  isOpen,
  onClose,
  colaboradorDpi,
  periodoId,
}: TeamMemberDetailModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [detalle, setDetalle] = useState<TeamMemberDetail | null>(null);

  useEffect(() => {
    if (isOpen && colaboradorDpi && periodoId) {
      loadDetalle();
    }
  }, [isOpen, colaboradorDpi, periodoId]);

  const loadDetalle = async () => {
    setIsLoading(true);
    try {
      const data = await getDetalleColaboradorCompleto(colaboradorDpi, periodoId);
      setDetalle(data);
    } catch (error) {
      console.error("Error cargando detalle:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const posicion = detalle?.evaluacion?.posicion9Box as NineBoxPosition | undefined;
  const posicionMetadata = posicion ? NINE_BOX_METADATA[posicion] : null;
  const posicionColorClass = posicion ? getPositionColor(posicion) : "";

  // Preparar datos para el radar chart
  const radarData = detalle?.evaluacion?.comparativo?.dimensiones?.map((d) => ({
    dimension: d.nombre.length > 15 ? d.nombre.substring(0, 15) + "..." : d.nombre,
    dimensionCompleta: d.nombre,
    autoevaluacion: Math.round(d.autoevaluacion),
    evaluacionJefe: Math.round(d.evaluacionJefe),
    promedioUnidad: detalle?.promedioUnidad || 0,
  })) || [];

  // Identificar fortalezas y áreas de oportunidad
  const dimensionesOrdenadas = [...(detalle?.evaluacion?.comparativo?.dimensiones || [])]
    .sort((a, b) => b.evaluacionJefe - a.evaluacionJefe);
  const fortalezas = dimensionesOrdenadas.slice(0, 3);
  const areasOportunidad = dimensionesOrdenadas.slice(-3).reverse();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              {detalle?.usuario?.esJefe ? (
                <Users className="h-5 w-5 text-primary" />
              ) : (
                <User className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <span className="text-xl">
                {isLoading ? (
                  <Skeleton className="h-6 w-48" />
                ) : (
                  detalle?.usuario?.nombreCompleto || "Colaborador"
                )}
              </span>
              {!isLoading && detalle && (
                <p className="text-sm font-normal text-muted-foreground">
                  {detalle.usuario.cargo} • {detalle.usuario.area}
                </p>
              )}
            </div>
            {posicion && (
              <Badge variant="outline" className={`ml-auto ${posicionColorClass}`}>
                {posicionMetadata?.shortName || posicion}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : detalle ? (
          <div className="space-y-6 mt-4">
            {/* Métricas principales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Target className="h-4 w-4" />
                    <span className="text-xs">Desempeño</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {detalle.evaluacion.tieneEvaluacion
                      ? `${Math.round(detalle.evaluacion.desempenoPorcentaje || 0)}%`
                      : "-"}
                  </p>
                  {detalle.evaluacion.tieneEvaluacion && (
                    <Progress
                      value={detalle.evaluacion.desempenoPorcentaje || 0}
                      className="h-1 mt-2"
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs">Potencial</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {detalle.evaluacion.tieneEvaluacion && detalle.evaluacion.potencialPorcentaje
                      ? `${Math.round(detalle.evaluacion.potencialPorcentaje)}%`
                      : "-"}
                  </p>
                  {detalle.evaluacion.potencialPorcentaje && (
                    <Progress
                      value={detalle.evaluacion.potencialPorcentaje}
                      className="h-1 mt-2"
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Building2 className="h-4 w-4" />
                    <span className="text-xs">Promedio Unidad</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-600">
                    {Math.round(detalle.promedioUnidad)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {detalle.evaluacion.tieneEvaluacion && (
                      <>
                        {(detalle.evaluacion.desempenoPorcentaje || 0) > detalle.promedioUnidad ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Por encima
                          </span>
                        ) : (detalle.evaluacion.desempenoPorcentaje || 0) < detalle.promedioUnidad ? (
                          <span className="text-amber-600 flex items-center gap-1">
                            <TrendingDown className="h-3 w-3" />
                            Por debajo
                          </span>
                        ) : (
                          <span className="text-gray-500 flex items-center gap-1">
                            <Minus className="h-3 w-3" />
                            En promedio
                          </span>
                        )}
                      </>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Briefcase className="h-4 w-4" />
                    <span className="text-xs">Nivel</span>
                  </div>
                  <p className="text-2xl font-bold">{detalle.usuario.nivel}</p>
                  {detalle.usuario.esJefe && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <Users className="h-3 w-3 inline mr-1" />
                      {detalle.usuario.totalEquipo} en equipo
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Gráfico Radar por Dimensiones */}
            {radarData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Análisis por Dimensiones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                        <PolarGrid />
                        <PolarAngleAxis
                          dataKey="dimension"
                          tick={{ fontSize: 11 }}
                        />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar
                          name="Autoevaluación"
                          dataKey="autoevaluacion"
                          stroke="#8884d8"
                          fill="#8884d8"
                          fillOpacity={0.3}
                        />
                        <Radar
                          name="Evaluación Jefe"
                          dataKey="evaluacionJefe"
                          stroke="#82ca9d"
                          fill="#82ca9d"
                          fillOpacity={0.3}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => [`${value}%`, name]}
                        />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fortalezas y Áreas de Oportunidad */}
            {(fortalezas.length > 0 || areasOportunidad.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Award className="h-5 w-5 text-green-600" />
                      Fortalezas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {fortalezas.map((d, idx) => (
                        <li key={idx} className="flex items-center justify-between">
                          <span className="text-sm">{d.nombre}</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {Math.round(d.evaluacionJefe)}%
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      Áreas de Oportunidad
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {areasOportunidad.map((d, idx) => (
                        <li key={idx} className="flex items-center justify-between">
                          <span className="text-sm">{d.nombre}</span>
                          <Badge variant="outline" className="bg-amber-50 text-amber-700">
                            {Math.round(d.evaluacionJefe)}%
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Comparativo Auto vs Jefe */}
            {detalle.evaluacion.comparativo?.dimensiones && detalle.evaluacion.comparativo.dimensiones.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Comparativo: Autoevaluación vs Evaluación Jefe
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dimensión</TableHead>
                        <TableHead className="text-center">Auto</TableHead>
                        <TableHead className="text-center">Jefe</TableHead>
                        <TableHead className="text-center">Diferencia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detalle.evaluacion.comparativo.dimensiones.map((d, idx) => {
                        const diff = d.evaluacionJefe - d.autoevaluacion;
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{d.nombre}</TableCell>
                            <TableCell className="text-center">
                              {Math.round(d.autoevaluacion)}%
                            </TableCell>
                            <TableCell className="text-center">
                              {Math.round(d.evaluacionJefe)}%
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={
                                  diff > 5
                                    ? "bg-green-50 text-green-700"
                                    : diff < -5
                                    ? "bg-red-50 text-red-700"
                                    : "bg-gray-50 text-gray-700"
                                }
                              >
                                {diff > 0 ? "+" : ""}{Math.round(diff)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Contexto Organizacional */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contexto Organizacional</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Jefe directo:</span>
                    <p className="font-medium">
                      {detalle.usuario.jefeDirecto?.nombre || "Sin asignar"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Área:</span>
                    <p className="font-medium">{detalle.usuario.area}</p>
                  </div>
                  {detalle.usuario.esJefe && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Equipo a cargo:</span>
                        <p className="font-medium">{detalle.usuario.totalEquipo} personas</p>
                      </div>
                      {detalle.evaluacion.promedioEquipo !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Promedio equipo:</span>
                          <p className="font-medium">
                            {Math.round(detalle.evaluacion.promedioEquipo)}%
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recomendaciones basadas en 9-box */}
            {posicionMetadata && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {posicionMetadata.icon} Recomendaciones de Desarrollo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {posicionMetadata.description}
                  </p>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Enfoque de desarrollo:</h4>
                    <div className="flex flex-wrap gap-2">
                      {posicionMetadata.developmentFocus.slice(0, 5).map((focus, idx) => (
                        <Badge key={idx} variant="secondary">
                          {focus}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Acciones recomendadas:</h4>
                    <ul className="space-y-2">
                      {posicionMetadata.recommendedActions.slice(0, 3).map((action, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Badge
                            variant="outline"
                            className={
                              action.priority === "urgent"
                                ? "bg-red-50 text-red-700"
                                : action.priority === "high"
                                ? "bg-orange-50 text-orange-700"
                                : "bg-blue-50 text-blue-700"
                            }
                          >
                            {action.priority === "urgent"
                              ? "Urgente"
                              : action.priority === "high"
                              ? "Alta"
                              : "Media"}
                          </Badge>
                          <div>
                            <span className="font-medium">{action.title}:</span>{" "}
                            <span className="text-muted-foreground">
                              {action.description}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <h4 className="font-medium mb-1 text-sm">Guía para el supervisor:</h4>
                    <p className="text-sm text-muted-foreground">
                      {posicionMetadata.managerGuidance}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No se encontró información del colaborador
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
