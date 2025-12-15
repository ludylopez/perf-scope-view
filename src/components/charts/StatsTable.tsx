import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";
import type { EstadisticasCompletas, SegmentoStats } from "@/types/analisis";
import { BoxPlotMini } from "./BoxPlotChart";

interface StatsTableProps {
  data: Array<{
    segmento: string;
    stats: EstadisticasCompletas;
    n?: number;
    extras?: Record<string, number | string>;
  }>;
  title?: string;
  description?: string;
  showPercentiles?: boolean;
  showBoxPlot?: boolean;
  sortable?: boolean;
  highlightBest?: boolean;
  highlightWorst?: boolean;
  className?: string;
}

type SortKey = "segmento" | "promedio" | "mediana" | "desviacion" | "min" | "max" | "n";
type SortDirection = "asc" | "desc";

export function StatsTable({
  data,
  title,
  description,
  showPercentiles = false,
  showBoxPlot = true,
  sortable = true,
  highlightBest = true,
  highlightWorst = true,
  className,
}: StatsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("promedio");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (key: SortKey) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let valA: number | string;
    let valB: number | string;

    if (sortKey === "segmento") {
      valA = a.segmento;
      valB = b.segmento;
    } else if (sortKey === "n") {
      valA = a.n ?? 0;
      valB = b.n ?? 0;
    } else {
      valA = a.stats[sortKey];
      valB = b.stats[sortKey];
    }

    if (typeof valA === "string" && typeof valB === "string") {
      return sortDirection === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }

    return sortDirection === "asc"
      ? (valA as number) - (valB as number)
      : (valB as number) - (valA as number);
  });

  // Encontrar mejor y peor promedio (solo valores válidos)
  const promedios = data.map((d) => d.stats.promedio).filter(isFinite);
  const maxPromedio = promedios.length > 0 ? Math.max(...promedios) : 0;
  const minPromedio = promedios.length > 0 ? Math.min(...promedios) : 0;

  // Helper para formatear valores de forma segura
  const formatNumber = (val: number | undefined | null, decimals = 2): string => {
    if (val === undefined || val === null || !isFinite(val)) return "-";
    return val.toFixed(decimals);
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (!sortable) return null;
    if (sortKey !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  const HeaderCell = ({
    column,
    children,
    align = "right",
  }: {
    column: SortKey;
    children: React.ReactNode;
    align?: "left" | "right" | "center";
  }) => (
    <TableHead
      className={cn(
        sortable && "cursor-pointer hover:bg-muted/50 select-none",
        align === "left" ? "text-left" : align === "center" ? "text-center" : "text-right"
      )}
      onClick={() => handleSort(column)}
    >
      <div
        className={cn(
          "flex items-center",
          align === "left" ? "justify-start" : align === "center" ? "justify-center" : "justify-end"
        )}
      >
        {children}
        <SortIcon column={column} />
      </div>
    </TableHead>
  );

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
          <Table>
            <TableHeader>
              <TableRow>
                <HeaderCell column="segmento" align="left">
                  Segmento
                </HeaderCell>
                {data[0]?.n !== undefined && (
                  <HeaderCell column="n" align="center">
                    N
                  </HeaderCell>
                )}
                <HeaderCell column="promedio">Promedio</HeaderCell>
                <HeaderCell column="mediana">Mediana</HeaderCell>
                <HeaderCell column="desviacion">Desv. Est.</HeaderCell>
                <HeaderCell column="min">Mín</HeaderCell>
                <HeaderCell column="max">Máx</HeaderCell>
                {showPercentiles && (
                  <>
                    <TableHead className="text-right">P25</TableHead>
                    <TableHead className="text-right">P75</TableHead>
                  </>
                )}
                {showBoxPlot && <TableHead className="text-center">Distribución</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((row, index) => {
                const hasValidPromedio = isFinite(row.stats.promedio);
                const isBest = highlightBest && hasValidPromedio && row.stats.promedio === maxPromedio;
                const isWorst = highlightWorst && hasValidPromedio && row.stats.promedio === minPromedio && maxPromedio !== minPromedio;

                return (
                  <TableRow
                    key={row.segmento}
                    className={cn(
                      isBest && "bg-green-50 dark:bg-green-950/20",
                      isWorst && "bg-red-50 dark:bg-red-950/20"
                    )}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {isBest && (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-green-500 text-white">
                            Mejor
                          </span>
                        )}
                        {isWorst && (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-red-500 text-white">
                            Menor
                          </span>
                        )}
                        {row.segmento}
                      </div>
                    </TableCell>
                    {row.n !== undefined && (
                      <TableCell className="text-center font-mono text-muted-foreground">
                        {row.n}
                      </TableCell>
                    )}
                    <TableCell
                      className={cn(
                        "text-right font-mono font-semibold",
                        isBest && "text-green-700 dark:text-green-400",
                        isWorst && "text-red-700 dark:text-red-400"
                      )}
                    >
                      {formatNumber(row.stats.promedio)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatNumber(row.stats.mediana)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatNumber(row.stats.desviacion)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatNumber(row.stats.min)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatNumber(row.stats.max)}
                    </TableCell>
                    {showPercentiles && (
                      <>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatNumber(row.stats.q1)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatNumber(row.stats.q3)}
                        </TableCell>
                      </>
                    )}
                    {showBoxPlot && (
                      <TableCell className="text-center">
                        <BoxPlotMini
                          min={row.stats.min}
                          q1={row.stats.q1}
                          median={row.stats.mediana}
                          q3={row.stats.q3}
                          max={row.stats.max}
                          color={isBest ? "#22c55e" : isWorst ? "#ef4444" : "#3b82f6"}
                          width={80}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// Versión compacta para resumen rápido
export function StatsTableCompact({
  data,
  title,
  columns = ["promedio", "desviacion", "min", "max"],
  className,
}: {
  data: Array<{
    label: string;
    value: number;
    desviacion?: number;
    min?: number;
    max?: number;
    color?: string;
  }>;
  title?: string;
  columns?: Array<"promedio" | "desviacion" | "min" | "max">;
  className?: string;
}) {
  return (
    <Card className={className}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-left">Variable</TableHead>
              {columns.includes("promedio") && (
                <TableHead className="text-right">Promedio</TableHead>
              )}
              {columns.includes("desviacion") && (
                <TableHead className="text-right">Desv.</TableHead>
              )}
              {columns.includes("min") && (
                <TableHead className="text-right">Mín</TableHead>
              )}
              {columns.includes("max") && (
                <TableHead className="text-right">Máx</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {row.color && (
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: row.color }}
                      />
                    )}
                    {row.label}
                  </div>
                </TableCell>
                {columns.includes("promedio") && (
                  <TableCell className="text-right font-mono font-semibold">
                    {row.value.toFixed(2)}
                  </TableCell>
                )}
                {columns.includes("desviacion") && (
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {row.desviacion?.toFixed(2) ?? "-"}
                  </TableCell>
                )}
                {columns.includes("min") && (
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {row.min?.toFixed(2) ?? "-"}
                  </TableCell>
                )}
                {columns.includes("max") && (
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {row.max?.toFixed(2) ?? "-"}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Tabla de comparación lado a lado
export function ComparisonTable({
  groups,
  metrics,
  title,
  description,
  className,
}: {
  groups: Array<{ name: string; color?: string }>;
  metrics: Array<{
    label: string;
    values: number[];
    format?: "number" | "percentage" | "decimal";
    highlightDiff?: boolean;
  }>;
  title?: string;
  description?: string;
  className?: string;
}) {
  const formatValue = (val: number, format?: string) => {
    switch (format) {
      case "percentage":
        return `${val.toFixed(1)}%`;
      case "decimal":
        return val.toFixed(2);
      default:
        return val.toLocaleString();
    }
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-left">Métrica</TableHead>
              {groups.map((group) => (
                <TableHead key={group.name} className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {group.color && (
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: group.color }}
                      />
                    )}
                    {group.name}
                  </div>
                </TableHead>
              ))}
              {metrics.some((m) => m.highlightDiff) && (
                <TableHead className="text-right">Diferencia</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map((metric) => {
              const maxVal = Math.max(...metric.values);
              const minVal = Math.min(...metric.values);
              const diff =
                metric.values.length === 2
                  ? metric.values[0] - metric.values[1]
                  : maxVal - minVal;

              return (
                <TableRow key={metric.label}>
                  <TableCell className="font-medium">{metric.label}</TableCell>
                  {metric.values.map((val, index) => (
                    <TableCell
                      key={index}
                      className={cn(
                        "text-right font-mono",
                        val === maxVal && "text-green-700 dark:text-green-400 font-semibold",
                        val === minVal && metric.values.length > 1 && "text-red-700 dark:text-red-400"
                      )}
                    >
                      {formatValue(val, metric.format)}
                    </TableCell>
                  ))}
                  {metric.highlightDiff && (
                    <TableCell
                      className={cn(
                        "text-right font-mono",
                        diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : ""
                      )}
                    >
                      {diff > 0 ? "+" : ""}{formatValue(diff, metric.format)}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
