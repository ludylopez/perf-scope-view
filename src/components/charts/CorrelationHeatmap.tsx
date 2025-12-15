import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getCorrelationInterpretation } from "@/lib/advancedStatistics";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CorrelationHeatmapProps {
  matrix: Record<string, Record<string, number>>;
  labels?: Record<string, string>;
  title?: string;
  description?: string;
  showValues?: boolean;
  colorScale?: "diverging" | "sequential";
  minValue?: number;
  maxValue?: number;
  className?: string;
}

// Escala de colores divergente (rojo-blanco-verde)
const getColorDiverging = (value: number): string => {
  if (value === 0) return "#f5f5f5";
  if (value > 0) {
    const intensity = Math.min(value, 1);
    const r = Math.round(245 - intensity * 211);
    const g = Math.round(245 - intensity * 48);
    const b = Math.round(245 - intensity * 150);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const intensity = Math.min(Math.abs(value), 1);
    const r = Math.round(245 - intensity * 6);
    const g = Math.round(245 - intensity * 177);
    const b = Math.round(245 - intensity * 177);
    return `rgb(${r}, ${g}, ${b})`;
  }
};

// Escala de colores secuencial (blanco-azul)
const getColorSequential = (value: number, min: number, max: number): string => {
  const normalized = (value - min) / (max - min);
  const r = Math.round(255 - normalized * 196);
  const g = Math.round(255 - normalized * 125);
  const b = Math.round(255 - normalized * 9);
  return `rgb(${r}, ${g}, ${b})`;
};

export function CorrelationHeatmap({
  matrix,
  labels = {},
  title,
  description,
  showValues = true,
  colorScale = "diverging",
  minValue = -1,
  maxValue = 1,
  className,
}: CorrelationHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: string; col: string } | null>(null);

  const variables = Object.keys(matrix);
  const getLabel = (key: string) => labels[key] || key;

  const getColor = (value: number) => {
    if (colorScale === "diverging") {
      return getColorDiverging(value);
    }
    return getColorSequential(value, minValue, maxValue);
  };

  const getTextColor = (value: number) => {
    const absValue = Math.abs(value);
    return absValue > 0.5 ? "text-white" : "text-gray-700";
  };

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <div className="overflow-x-auto">
          <TooltipProvider>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-sm font-medium text-muted-foreground"></th>
                  {variables.map((col) => (
                    <th
                      key={col}
                      className="p-2 text-center text-xs font-medium text-muted-foreground"
                      style={{ writingMode: "vertical-rl", textOrientation: "mixed", height: 120 }}
                    >
                      {getLabel(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variables.map((row, rowIndex) => (
                  <tr key={row}>
                    <td className="p-2 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">
                      {getLabel(row)}
                    </td>
                    {variables.map((col, colIndex) => {
                      const value = matrix[row]?.[col] ?? 0;
                      const interpretation = getCorrelationInterpretation(value);
                      const isHovered = hoveredCell?.row === row && hoveredCell?.col === col;
                      const isDiagonal = row === col;

                      return (
                        <td
                          key={col}
                          className="p-0"
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "w-12 h-12 flex items-center justify-center cursor-pointer transition-all duration-150",
                                  isHovered && "ring-2 ring-primary ring-inset",
                                  isDiagonal && "opacity-50"
                                )}
                                style={{ backgroundColor: getColor(value) }}
                                onMouseEnter={() => setHoveredCell({ row, col })}
                                onMouseLeave={() => setHoveredCell(null)}
                              >
                                {showValues && (
                                  <span className={cn("text-xs font-mono font-medium", getTextColor(value))}>
                                    {value.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-semibold">
                                  {getLabel(row)} × {getLabel(col)}
                                </p>
                                <p className="text-sm">
                                  <span className="text-muted-foreground">Correlación:</span>{" "}
                                  <span className="font-mono font-bold">{value.toFixed(3)}</span>
                                </p>
                                <p className="text-sm">
                                  <span className="text-muted-foreground">Fuerza:</span>{" "}
                                  <span className="capitalize">{interpretation.strength.replace("_", " ")}</span>
                                </p>
                                <p className="text-sm">
                                  <span className="text-muted-foreground">Dirección:</span>{" "}
                                  <span className="capitalize">{interpretation.direction}</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {interpretation.description}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </TooltipProvider>
        </div>

        {/* Leyenda de escala */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">-1.0</span>
          <div
            className="h-4 w-48 rounded"
            style={{
              background: colorScale === "diverging"
                ? "linear-gradient(to right, #ef4444, #f5f5f5, #22c55e)"
                : "linear-gradient(to right, #ffffff, #3b82f6)",
            }}
          />
          <span className="text-xs text-muted-foreground">+1.0</span>
        </div>

        {/* Interpretación de colores */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getColorDiverging(-1) }} />
            <span className="text-muted-foreground">Negativa fuerte</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getColorDiverging(-0.5) }} />
            <span className="text-muted-foreground">Negativa moderada</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getColorDiverging(0) }} />
            <span className="text-muted-foreground">Sin correlación</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getColorDiverging(0.5) }} />
            <span className="text-muted-foreground">Positiva moderada</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getColorDiverging(1) }} />
            <span className="text-muted-foreground">Positiva fuerte</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Versión compacta para resumen
export function CorrelationBadge({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  const interpretation = getCorrelationInterpretation(value);
  const bgColor = getColorDiverging(value);
  const textColor = Math.abs(value) > 0.5 ? "text-white" : "text-gray-700";

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: bgColor }}>
      <span className={cn("font-mono font-bold", textColor)}>{value.toFixed(2)}</span>
      {label && <span className={cn("text-sm", textColor)}>{label}</span>}
    </div>
  );
}
