import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { TrendingUp, Target, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface DimensionAnalysis {
  nombre: string;
  descripcion?: string;
  porcentaje: number;
  isFortaleza: boolean;
  promedioMunicipal?: number;
}

interface PerformanceRadarAnalysisProps {
  radarData: Array<{ dimension: string; tuResultado: number; promedioMunicipal?: number }>;
  dimensionAnalysis: DimensionAnalysis[];
  title?: string;
  description?: string;
}

export const PerformanceRadarAnalysis = ({
  radarData,
  dimensionAnalysis,
  title = "Panorama de Competencias",
  description = "Vista integral de tu desempeño por dimensión comparado con el promedio municipal"
}: PerformanceRadarAnalysisProps) => {
  
  // Ordenar dimensiones: primero fortalezas (descendente), luego oportunidades (ascendente)
  const sortedDimensions = [...dimensionAnalysis].sort((a, b) => {
    if (a.isFortaleza && !b.isFortaleza) return -1;
    if (!a.isFortaleza && b.isFortaleza) return 1;
    if (a.isFortaleza) return b.porcentaje - a.porcentaje; // Fortalezas: mayor primero
    return a.porcentaje - b.porcentaje; // Oportunidades: menor primero
  });

  const fortalezas = sortedDimensions.filter(d => d.isFortaleza);
  const oportunidades = sortedDimensions.filter(d => !d.isFortaleza);

  return (
    <Card className="overflow-hidden border-2">
      <CardHeader className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Gráfico Radar */}
          <div className="p-6 border-r">
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis 
                  dataKey="dimension" 
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Radar
                  name="Promedio Municipal"
                  dataKey="promedioMunicipal"
                  stroke="hsl(var(--muted-foreground))"
                  fill="hsl(var(--muted-foreground))"
                  fillOpacity={0.2}
                />
                <Radar
                  name="Tu Resultado"
                  dataKey="tuResultado"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted-foreground/40" />
                <span className="text-muted-foreground">Promedio Municipal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-foreground font-medium">Tu Resultado</span>
              </div>
            </div>
          </div>

          {/* Análisis de Dimensiones */}
          <div className="flex flex-col">
            <div className="p-6 pb-4 border-b bg-gradient-to-br from-background to-muted/20">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-base">Detalle por Dimensión</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Resultados detallados con identificación de fortalezas y oportunidades
              </p>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px]">
              {/* Fortalezas */}
              {fortalezas.length > 0 && (
                <div className="p-4 space-y-3">
                  {fortalezas.map((dim, idx) => (
                    <div
                      key={`fortaleza-${idx}`}
                      className="group relative p-4 rounded-lg border-l-4 border-l-success bg-success/5 hover:bg-success/10 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-success text-success-foreground text-sm font-bold shadow-sm">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm leading-tight">{dim.nombre}</h4>
                            {dim.descripcion && (
                              <p className="text-xs text-muted-foreground mt-0.5">{dim.descripcion}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className="bg-success hover:bg-success text-success-foreground px-2 py-0.5 text-xs font-semibold shadow-sm">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            FORTALEZA
                          </Badge>
                          <span className="text-xl font-bold text-success">{dim.porcentaje}%</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-success/20">
                          <div 
                            className="h-full bg-success transition-all duration-500" 
                            style={{ width: `${dim.porcentaje}%` }}
                          />
                        </div>
                        {dim.promedioMunicipal && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">vs. Promedio Municipal</span>
                            <span className={cn(
                              "font-medium",
                              dim.porcentaje > dim.promedioMunicipal ? "text-success" : "text-muted-foreground"
                            )}>
                              {dim.promedioMunicipal}% ({dim.porcentaje > dim.promedioMunicipal ? '+' : ''}{(dim.porcentaje - dim.promedioMunicipal).toFixed(1)}%)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Oportunidades */}
              {oportunidades.length > 0 && (
                <div className="p-4 space-y-3 bg-muted/10">
                  {oportunidades.map((dim, idx) => (
                    <div
                      key={`oportunidad-${idx}`}
                      className="group relative p-4 rounded-lg border-l-4 border-l-warning bg-warning/5 hover:bg-warning/10 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-warning text-white text-sm font-bold shadow-sm">
                            {fortalezas.length + idx + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm leading-tight">{dim.nombre}</h4>
                            {dim.descripcion && (
                              <p className="text-xs text-muted-foreground mt-0.5">{dim.descripcion}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className="bg-warning hover:bg-warning text-white px-2 py-0.5 text-xs font-semibold shadow-sm">
                            <Target className="h-3 w-3 mr-1" />
                            OPORTUNIDAD
                          </Badge>
                          <span className="text-xl font-bold text-warning">{dim.porcentaje}%</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-warning/20">
                          <div 
                            className="h-full bg-warning transition-all duration-500" 
                            style={{ width: `${dim.porcentaje}%` }}
                          />
                        </div>
                        {dim.promedioMunicipal && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">vs. Promedio Municipal</span>
                            <span className={cn(
                              "font-medium",
                              dim.porcentaje >= dim.promedioMunicipal ? "text-foreground" : "text-warning"
                            )}>
                              {dim.promedioMunicipal}% ({dim.porcentaje >= dim.promedioMunicipal ? '+' : ''}{(dim.porcentaje - dim.promedioMunicipal).toFixed(1)}%)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
