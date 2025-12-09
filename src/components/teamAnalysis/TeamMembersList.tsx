import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  List,
  ArrowUpDown,
  Info,
  BarChart3,
} from "lucide-react";
import { TeamFilters } from "./TeamFilters";
import { TeamMemberRow } from "./TeamMemberRow";
import type {
  TeamAnalysisNode,
  TeamAnalysisFilters,
  JefeParaFiltro,
  GrupoParaFiltro,
} from "@/types/teamAnalysis";
import { filtrarJerarquia } from "@/lib/teamAnalysis";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TeamMembersListProps {
  nodes: TeamAnalysisNode[];
  jefes: JefeParaFiltro[];
  grupos: GrupoParaFiltro[];
  onMemberClick?: (node: TeamAnalysisNode) => void;
}

type SortKey = "nombre" | "area" | "nivel" | "desempeno" | "potencial" | "9box";
type SortOrder = "asc" | "desc";

const ITEMS_PER_PAGE = 50;

export function TeamMembersList({
  nodes,
  jefes,
  grupos,
  onMemberClick,
}: TeamMembersListProps) {
  const [filters, setFilters] = useState<TeamAnalysisFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("nombre");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Filtrar nodos
  const filteredNodes = useMemo(() => {
    return filtrarJerarquia(nodes, filters);
  }, [nodes, filters]);

  // Ordenar nodos (por defecto: desempeño descendente, luego nombre)
  const sortedNodes = useMemo(() => {
    return [...filteredNodes].sort((a, b) => {
      // Si no hay ordenamiento específico, ordenar por desempeño descendente, luego nombre
      if (sortKey === "nombre" && sortOrder === "asc") {
        const desempenoComp = (b.desempenoPorcentaje || 0) - (a.desempenoPorcentaje || 0);
        if (desempenoComp !== 0) return desempenoComp;
        return a.nombreCompleto.localeCompare(b.nombreCompleto);
      }

      let comparison = 0;

      switch (sortKey) {
        case "nombre":
          comparison = a.nombreCompleto.localeCompare(b.nombreCompleto);
          break;
        case "area":
          comparison = (a.area || "").localeCompare(b.area || "");
          break;
        case "nivel":
          comparison = (a.nivel || "").localeCompare(b.nivel || "");
          break;
        case "desempeno":
          comparison =
            (a.desempenoPorcentaje || 0) - (b.desempenoPorcentaje || 0);
          break;
        case "potencial":
          comparison =
            (a.potencialPorcentaje || 0) - (b.potencialPorcentaje || 0);
          break;
        case "9box":
          comparison = (a.posicion9Box || "").localeCompare(
            b.posicion9Box || ""
          );
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [filteredNodes, sortKey, sortOrder]);

  // Calcular estadísticas de distribución
  const estadisticasDistribucion = useMemo(() => {
    const total = filteredNodes.length;
    const conEvaluacion = filteredNodes.filter(n => n.tieneEvaluacion).length;
    const promedioDesempeno = conEvaluacion > 0
      ? filteredNodes
          .filter(n => n.tieneEvaluacion && n.desempenoPorcentaje !== undefined)
          .reduce((sum, n) => sum + (n.desempenoPorcentaje || 0), 0) / conEvaluacion
      : 0;
    const promedioPotencial = conEvaluacion > 0
      ? filteredNodes
          .filter(n => n.tieneEvaluacion && n.potencialPorcentaje !== undefined)
          .reduce((sum, n) => sum + (n.potencialPorcentaje || 0), 0) / conEvaluacion
      : 0;

    return {
      total,
      conEvaluacion,
      promedioDesempeno,
      promedioPotencial,
    };
  }, [filteredNodes]);

  // Paginar
  const totalPages = Math.ceil(sortedNodes.length / ITEMS_PER_PAGE);
  const paginatedNodes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedNodes.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedNodes, currentPage]);

  // Reset página cuando cambian filtros
  const handleFiltersChange = (newFilters: TeamAnalysisFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // Manejar ordenamiento
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const SortableHeader = ({
    label,
    sortKeyName,
  }: {
    label: string;
    sortKeyName: SortKey;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(sortKeyName)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={`h-3 w-3 ${
            sortKey === sortKeyName ? "text-primary" : "text-muted-foreground"
          }`}
        />
      </div>
    </TableHead>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <List className="h-5 w-5" />
              Lista de Colaboradores
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-2">Colores en porcentajes:</p>
                  <ul className="space-y-1 text-sm">
                    <li><span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span><strong>Verde:</strong> Alto desempeño/potencial (≥85% / ≥80%)</li>
                    <li><span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-2"></span><strong>Amarillo:</strong> Medio (70-84% / 65-79%)</li>
                    <li><span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span><strong>Rojo:</strong> Requiere atención (&lt;70% / &lt;65%)</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Badge variant="outline">
            {filteredNodes.length} de {nodes.length} colaboradores
          </Badge>
        </div>

        {/* Resumen estadístico */}
        {estadisticasDistribucion.total > 0 && (
          <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border mb-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Resumen:</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {estadisticasDistribucion.conEvaluacion} con evaluación
                </span>
              </div>
              {estadisticasDistribucion.conEvaluacion > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Promedio Desempeño: <span className="font-semibold">{estadisticasDistribucion.promedioDesempeno.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Promedio Potencial: <span className="font-semibold">{estadisticasDistribucion.promedioPotencial.toFixed(0)}%</span>
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Filtros */}
        <TeamFilters
          jefes={jefes}
          grupos={grupos}
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      </CardHeader>

      <CardContent>
        {paginatedNodes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <List className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No se encontraron colaboradores con los filtros aplicados</p>
          </div>
        ) : (
          <>
            {/* Tabla */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader label="Nombre" sortKeyName="nombre" />
                    <SortableHeader label="Área" sortKeyName="area" />
                    <SortableHeader label="Nivel" sortKeyName="nivel" />
                    <TableHead>Jefe</TableHead>
                    <SortableHeader label="Desempeño" sortKeyName="desempeno" />
                    <SortableHeader label="Potencial" sortKeyName="potencial" />
                    <SortableHeader label="9-Box" sortKeyName="9box" />
                    <TableHead>Equipo</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedNodes.map((node) => (
                    <TeamMemberRow
                      key={node.dpi}
                      node={node}
                      onClick={() => onMemberClick?.(node)}
                      showJefe={true}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
                  {Math.min(currentPage * ITEMS_PER_PAGE, sortedNodes.length)} de{" "}
                  {sortedNodes.length}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <span className="text-sm px-2">
                    Página {currentPage} de {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
