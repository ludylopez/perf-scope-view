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
    <div className="space-y-6">
      {/* Gráfico Radar Mejorado - Solo tu resultado */}
      <Card className="overflow-hidden border-2">
        <CardHeader className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <ResponsiveContainer width="100%" height={450}>
            <RadarChart data={radarData}>
              <defs>
                <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                </linearGradient>
              </defs>
              <PolarGrid 
                stroke="hsl(var(--border))" 
                strokeWidth={1.5}
              />
              <PolarAngleAxis 
                dataKey="dimension" 
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 13, fontWeight: 600 }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickCount={6}
              />
              <Radar
                name="Tu Resultado"
                dataKey="tuResultado"
                stroke="hsl(var(--primary))"
                fill="url(#radarGradient)"
                fillOpacity={0.6}
                strokeWidth={3}
              />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Análisis de Dimensiones - Sin scroll, compacto */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Fortalezas */}
        {fortalezas.length > 0 && fortalezas.map((dim, idx) => (
          <Card
            key={`fortaleza-${idx}`}
            className="group relative overflow-hidden border-l-4 border-l-success bg-gradient-to-br from-success/5 to-transparent hover:shadow-lg transition-all duration-300 animate-fade-in"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-success text-success-foreground text-sm font-bold shadow-md">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-sm leading-tight truncate">{dim.nombre}</h4>
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs font-semibold whitespace-nowrap">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        FORTALEZA
                      </Badge>
                    </div>
                    {dim.descripcion && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{dim.descripcion}</p>
                    )}
                  </div>
                </div>
                <span className="text-3xl font-bold text-success flex-shrink-0">{dim.porcentaje}%</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-success/20">
                <div 
                  className="h-full bg-gradient-to-r from-success to-success/80 transition-all duration-700" 
                  style={{ width: `${dim.porcentaje}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Oportunidades */}
        {oportunidades.length > 0 && oportunidades.map((dim, idx) => (
          <Card
            key={`oportunidad-${idx}`}
            className="group relative overflow-hidden border-l-4 border-l-warning bg-gradient-to-br from-warning/5 to-transparent hover:shadow-lg transition-all duration-300 animate-fade-in"
            style={{ animationDelay: `${(fortalezas.length + idx) * 100}ms` }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-warning text-white text-sm font-bold shadow-md">
                    {fortalezas.length + idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-sm leading-tight truncate">{dim.nombre}</h4>
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs font-semibold whitespace-nowrap">
                        <Target className="h-3 w-3 mr-1" />
                        OPORTUNIDAD
                      </Badge>
                    </div>
                    {dim.descripcion && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{dim.descripcion}</p>
                    )}
                  </div>
                </div>
                <span className="text-3xl font-bold text-warning flex-shrink-0">{dim.porcentaje}%</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-warning/20">
                <div 
                  className="h-full bg-gradient-to-r from-warning to-warning/80 transition-all duration-700" 
                  style={{ width: `${dim.porcentaje}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
