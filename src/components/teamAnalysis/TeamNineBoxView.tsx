import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Grid3X3, ExternalLink, TrendingUp, Users } from "lucide-react";
import type {
  TeamMember9Box,
  TeamNineBoxViewProps,
} from "@/types/teamAnalysis";
import {
  NINE_BOX_METADATA,
  getPositionColor,
  getQuadrantMetadata,
  getPositionsByImportance,
  getPositionsByRetentionPriority,
  type NineBoxPosition,
} from "@/lib/nineBoxMetadata";

const NINE_BOX_POSITIONS: NineBoxPosition[][] = [
  ["bajo-alto", "medio-alto", "alto-alto"],
  ["bajo-medio", "medio-medio", "alto-medio"],
  ["bajo-bajo", "medio-bajo", "alto-bajo"],
];

// Etiquetas simplificadas para cada cuadrante
const QUADRANT_LABELS: Record<NineBoxPosition, string> = {
  "alto-alto": "Estrellas",
  "medio-alto": "Alto Potencial",
  "bajo-alto": "Enigmas",
  "alto-medio": "Pilares",
  "medio-medio": "Núcleo",
  "bajo-medio": "Requieren Atención",
  "alto-bajo": "Expertos",
  "medio-bajo": "Confiables",
  "bajo-bajo": "Bajo Rendimiento",
};

interface TeamNineBoxViewPropsExtended extends TeamNineBoxViewProps {
  periodoId?: string;
  jefeContexto?: string;
}

export function TeamNineBoxView({
  data,
  jefes,
  grupos,
  onMemberClick,
  periodoId,
  jefeContexto,
}: TeamNineBoxViewPropsExtended) {
  const navigate = useNavigate();
  const [filtroJefe, setFiltroJefe] = useState<string>("all");

  // Filtrar datos
  const filteredData = useMemo(() => {
    let result = data;
    if (filtroJefe !== "all") {
      result = result.filter((m) => m.jefeDpi === filtroJefe);
    }
    return result;
  }, [data, filtroJefe]);

  // Agrupar por posición 9-box
  const dataByPosition = useMemo(() => {
    const groups: Record<string, TeamMember9Box[]> = {};
    filteredData.forEach((member) => {
      const pos = member.posicion9Box || "sin-calcular";
      if (!groups[pos]) groups[pos] = [];
      groups[pos].push(member);
    });
    return groups;
  }, [filteredData]);

  // Métricas
  const totalPersonas = filteredData.length;
  const criticalTalent = getPositionsByImportance("critical");
  const urgentRetention = getPositionsByRetentionPriority("urgent");

  const criticalTalentCount = criticalTalent.reduce(
    (sum, metadata) => sum + (dataByPosition[metadata.key]?.length || 0),
    0
  );
  const urgentRetentionCount = urgentRetention.reduce(
    (sum, metadata) => sum + (dataByPosition[metadata.key]?.length || 0),
    0
  );
  const altoPotencialCount =
    (dataByPosition["alto-alto"]?.length || 0) +
    (dataByPosition["medio-alto"]?.length || 0) +
    (dataByPosition["bajo-alto"]?.length || 0);

  // Navegar a la matriz completa
  const handleVerMatrizCompleta = () => {
    const params = new URLSearchParams();
    const jefeParaFiltrar = filtroJefe !== "all" ? filtroJefe : jefeContexto;
    if (jefeParaFiltrar) params.set("jefe", jefeParaFiltrar);
    if (periodoId) params.set("periodo", periodoId);
    const queryString = params.toString();
    navigate(`/matriz-9box${queryString ? `?${queryString}` : ""}`);
  };

  return (
    <div className="space-y-6">
      {/* KPIs en línea */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-600" />
            <span className="text-xs text-slate-600 dark:text-slate-400">Total</span>
          </div>
          <p className="text-xl font-bold mt-1">{totalPersonas}</p>
        </div>
        <div className="p-3 rounded-lg border bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2">
            <span className="text-sm">⭐</span>
            <span className="text-xs text-amber-700 dark:text-amber-300">Talento Crítico</span>
          </div>
          <p className="text-xl font-bold text-amber-900 dark:text-amber-100 mt-1">{criticalTalentCount}</p>
        </div>
        <div className="p-3 rounded-lg border bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <span className="text-sm">🔒</span>
            <span className="text-xs text-red-700 dark:text-red-300">Retención</span>
          </div>
          <p className="text-xl font-bold text-red-900 dark:text-red-100 mt-1">{urgentRetentionCount}</p>
        </div>
        <div className="p-3 rounded-lg border bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span className="text-xs text-emerald-700 dark:text-emerald-300">Alto Potencial</span>
          </div>
          <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">{altoPotencialCount}</p>
        </div>
      </div>

      {/* Matriz 9-Box */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Grid3X3 className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Distribución 9-Box</CardTitle>
                <CardDescription className="text-xs">
                  Clic en cualquier celda para ver detalles
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {jefes.length > 0 && (
                <Select value={filtroJefe} onValueChange={setFiltroJefe}>
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Todos los equipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los equipos</SelectItem>
                    {jefes.map((jefe) => (
                      <SelectItem key={jefe.dpi} value={jefe.dpi}>
                        {jefe.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                onClick={handleVerMatrizCompleta}
                size="sm"
                className="gap-1.5 h-8"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Ver Completa</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Contenedor de la matriz con etiquetas de ejes */}
          <div className="relative">
            {/* Etiqueta eje Y (Potencial) */}
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-full">
              <div className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground">
                <span>Alto</span>
                <div className="w-px h-16 bg-gradient-to-b from-green-400 via-yellow-400 to-red-400"></div>
                <span>Bajo</span>
              </div>
            </div>

            {/* Grid 9-Box */}
            <div className="ml-8">
              {/* Etiqueta superior: POTENCIAL */}
              <div className="flex justify-center mb-2">
                <Badge variant="secondary" className="text-[10px] px-2 py-0">
                  ↑ POTENCIAL
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {NINE_BOX_POSITIONS.map((row) =>
                  row.map((position) => {
                    const members = dataByPosition[position] || [];
                    const metadata = getQuadrantMetadata(position) || NINE_BOX_METADATA[position];
                    const colorClass = getPositionColor(position);
                    const count = members.length;
                    const percentage = totalPersonas > 0 ? Math.round((count / totalPersonas) * 100) : 0;

                    return (
                      <div
                        key={position}
                        onClick={handleVerMatrizCompleta}
                        className={`
                          relative rounded-md p-2 min-h-[72px] cursor-pointer
                          transition-all duration-200 hover:scale-[1.02] hover:shadow-md
                          border ${colorClass}
                        `}
                        title={`${QUADRANT_LABELS[position]}: ${count} colaboradores (${percentage}%)`}
                      >
                        {/* Icono y nombre corto */}
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-sm">{metadata.icon}</span>
                          <span className="text-[10px] font-medium truncate">
                            {QUADRANT_LABELS[position]}
                          </span>
                        </div>

                        {/* Contador grande */}
                        <div className="flex items-end justify-between">
                          <span className="text-2xl font-bold leading-none">
                            {count}
                          </span>
                          {percentage > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {percentage}%
                            </span>
                          )}
                        </div>

                        {/* Barra de proporción visual */}
                        {count > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 rounded-b-md overflow-hidden">
                            <div
                              className="h-full bg-black/20"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Etiqueta inferior: DESEMPEÑO */}
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] text-muted-foreground">Bajo</span>
                <Badge variant="secondary" className="text-[10px] px-2 py-0">
                  DESEMPEÑO →
                </Badge>
                <span className="text-[10px] text-muted-foreground">Alto</span>
              </div>
            </div>
          </div>

          {/* Footer con acción */}
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Accede a la vista completa para ver filtros avanzados, detalles por cuadrante y exportaciones.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleVerMatrizCompleta}
              className="gap-1.5 text-xs"
            >
              <ExternalLink className="h-3 w-3" />
              Matriz Completa
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
