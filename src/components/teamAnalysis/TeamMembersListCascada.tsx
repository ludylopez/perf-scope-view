import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  List,
  ArrowUpDown,
  ChevronDown,
  Users,
  User,
  Info,
  BarChart3,
} from "lucide-react";
import { TeamFilters } from "./TeamFilters";
import { TeamMemberRow } from "./TeamMemberRow";
import type {
  TeamAnalysisNodeCascada,
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

interface TeamMembersListCascadaProps {
  nodes: TeamAnalysisNodeCascada[];
  jefes: JefeParaFiltro[];
  grupos: GrupoParaFiltro[];
  onMemberClick?: (node: TeamAnalysisNodeCascada) => void;
  jefePrincipalDpi: string;
  jefePrincipalNombre?: string;
}

type SortKey = "nombre" | "area" | "nivel" | "desempeno" | "potencial" | "9box" | "jefe";
type SortOrder = "asc" | "desc";
type ViewMode = "list" | "grouped";

const ITEMS_PER_PAGE = 50;

export function TeamMembersListCascada({
  nodes,
  jefes,
  grupos,
  onMemberClick,
  jefePrincipalDpi,
  jefePrincipalNombre = "Tú",
}: TeamMembersListCascadaProps) {
  const [filters, setFilters] = useState<TeamAnalysisFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("nombre");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("grouped"); // Cambiar a grouped por defecto
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["directos"]));

  // Filtrar nodos
  const filteredNodes = useMemo(() => {
    return filtrarJerarquia(nodes, filters);
  }, [nodes, filters]);

  // Ordenar nodos (por defecto: nivel jerárquico primero, luego desempeño)
  const sortedNodes = useMemo(() => {
    return [...filteredNodes].sort((a, b) => {
      // Si no hay ordenamiento específico, ordenar por nivel jerárquico primero
      if (sortKey === "nombre" && sortOrder === "asc") {
        // Ordenamiento por defecto mejorado: nivel jerárquico, luego desempeño, luego nombre
        const nivelComp = (a.nivelJerarquico || 1) - (b.nivelJerarquico || 1);
        if (nivelComp !== 0) return nivelComp;
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
        case "jefe":
          comparison = (a.jefeNombre || "").localeCompare(b.jefeNombre || "");
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [filteredNodes, sortKey, sortOrder]);

  // Agrupar por jefe para vista agrupada
  const groupedByJefe = useMemo(() => {
    const groups = new Map<string, {
      jefeDpi: string;
      jefeNombre: string;
      colaboradores: TeamAnalysisNodeCascada[];
      nivel: number;
    }>();

    // Separar directos (nivel 1) de indirectos (nivel 2+)
    const directos = sortedNodes.filter(n => n.nivelJerarquico === 1);
    const indirectos = sortedNodes.filter(n => n.nivelJerarquico > 1);

    // Agregar grupo de directos
    if (directos.length > 0) {
      groups.set("directos", {
        jefeDpi: jefePrincipalDpi,
        jefeNombre: `${jefePrincipalNombre} (Mis Colaboradores Directos)`,
        colaboradores: directos,
        nivel: 0,
      });
    }

    // Agrupar indirectos por su jefe
    indirectos.forEach(node => {
      const jefeDpi = node.jefeDpi || "sin-jefe";
      const jefeNombre = node.jefeNombre || "Sin jefe asignado";

      if (!groups.has(jefeDpi)) {
        groups.set(jefeDpi, {
          jefeDpi,
          jefeNombre: `Equipo de ${jefeNombre}`,
          colaboradores: [],
          nivel: node.nivelJerarquico - 1,
        });
      }
      groups.get(jefeDpi)!.colaboradores.push(node);
    });

    // Ordenar grupos: directos primero, luego por nivel jerárquico
    return Array.from(groups.entries())
      .sort((a, b) => {
        if (a[0] === "directos") return -1;
        if (b[0] === "directos") return 1;
        return a[1].nivel - b[1].nivel;
      });
  }, [sortedNodes, jefePrincipalDpi, jefePrincipalNombre]);

  // Paginar (solo para vista lista)
  const totalPages = Math.ceil(sortedNodes.length / ITEMS_PER_PAGE);
  const paginatedNodes = useMemo(() => {
    if (viewMode === "grouped") return sortedNodes;
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedNodes.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedNodes, currentPage, viewMode]);

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

  // Toggle grupo expandido
  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
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

  // Obtener badge de nivel jerárquico con colores distintivos
  const getNivelBadge = (nivel: number) => {
    if (nivel === 1) {
      return (
        <Badge variant="default" className="text-xs bg-blue-500 text-white hover:bg-blue-600">
          Directo
        </Badge>
      );
    }
    const colors = [
      "", // nivel 0 no existe
      "", // nivel 1 ya manejado arriba
      "bg-purple-500 text-white hover:bg-purple-600", // nivel 2
      "bg-orange-500 text-white hover:bg-orange-600", // nivel 3
      "bg-pink-500 text-white hover:bg-pink-600", // nivel 4
      "bg-teal-500 text-white hover:bg-teal-600", // nivel 5+
    ];
    const colorClass = colors[nivel] || "bg-gray-500 text-white hover:bg-gray-600";
    return (
      <Badge variant="outline" className={`text-xs ${colorClass} border-0`}>
        Nivel {nivel}
      </Badge>
    );
  };

  // Obtener color para porcentaje de desempeño
  const getDesempenoColor = (porcentaje: number): string => {
    if (porcentaje >= 85) return "text-green-600 dark:text-green-400 font-semibold";
    if (porcentaje >= 70) return "text-yellow-600 dark:text-yellow-400 font-semibold";
    return "text-red-600 dark:text-red-400 font-semibold";
  };

  // Obtener color para porcentaje de potencial
  const getPotencialColor = (porcentaje: number): string => {
    if (porcentaje >= 80) return "text-green-600 dark:text-green-400 font-semibold";
    if (porcentaje >= 65) return "text-yellow-600 dark:text-yellow-400 font-semibold";
    return "text-red-600 dark:text-red-400 font-semibold";
  };

  // Calcular estadísticas de distribución por nivel jerárquico
  const estadisticasPorNivel = useMemo(() => {
    const stats = new Map<number, { total: number; conEvaluacion: number; promedioDesempeno: number; promedioPotencial: number }>();
    
    filteredNodes.forEach(node => {
      const nivel = node.nivelJerarquico || 1;
      if (!stats.has(nivel)) {
        stats.set(nivel, { total: 0, conEvaluacion: 0, promedioDesempeno: 0, promedioPotencial: 0 });
      }
      const stat = stats.get(nivel)!;
      stat.total++;
      if (node.tieneEvaluacion) {
        stat.conEvaluacion++;
        stat.promedioDesempeno += node.desempenoPorcentaje || 0;
        stat.promedioPotencial += node.potencialPorcentaje || 0;
      }
    });

    // Calcular promedios
    stats.forEach((stat, nivel) => {
      if (stat.conEvaluacion > 0) {
        stat.promedioDesempeno = stat.promedioDesempeno / stat.conEvaluacion;
        stat.promedioPotencial = stat.promedioPotencial / stat.conEvaluacion;
      }
    });

    return Array.from(stats.entries()).sort((a, b) => a[0] - b[0]);
  }, [filteredNodes]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <List className="h-5 w-5" />
              Lista de Colaboradores (Unidad Completa)
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-2">Niveles Jerárquicos:</p>
                  <ul className="space-y-1 text-sm">
                    <li><span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2"></span><strong>Directo:</strong> Reportan directamente a ti</li>
                    <li><span className="inline-block w-3 h-3 rounded-full bg-purple-500 mr-2"></span><strong>Nivel 2:</strong> Reportan a tus colaboradores directos</li>
                    <li><span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-2"></span><strong>Nivel 3+:</strong> Reportan a jefes de nivel 2 o superior</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle vista */}
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-r-none"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grouped" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode("grouped")}
              >
                <Users className="h-4 w-4" />
              </Button>
            </div>
            <Badge variant="outline">
              {filteredNodes.length} de {nodes.length} colaboradores
            </Badge>
          </div>
        </div>

        {/* Resumen estadístico por nivel jerárquico */}
        {estadisticasPorNivel.length > 0 && (
          <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border mb-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Distribución:</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {estadisticasPorNivel.map(([nivel, stats]) => (
                <div key={nivel} className="flex items-center gap-2">
                  {getNivelBadge(nivel)}
                  <span className="text-sm text-muted-foreground">
                    {stats.total} {stats.total === 1 ? 'persona' : 'personas'}
                    {stats.conEvaluacion > 0 && (
                      <span className="ml-1">
                        • Promedio: {stats.promedioDesempeno.toFixed(0)}% / {stats.promedioPotencial.toFixed(0)}%
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filtros */}
        <TeamFilters
          jefes={jefes}
          grupos={grupos}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          showNivelFilter={true}
        />
      </CardHeader>

      <CardContent>
        {filteredNodes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <List className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No se encontraron colaboradores con los filtros aplicados</p>
          </div>
        ) : viewMode === "grouped" ? (
          /* Vista agrupada por jefe */
          <div className="space-y-4">
            {groupedByJefe.map(([groupId, group]) => (
              <Collapsible
                key={groupId}
                open={expandedGroups.has(groupId)}
                onOpenChange={() => toggleGroup(groupId)}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          expandedGroups.has(groupId) ? "" : "-rotate-90"
                        }`}
                      />
                      {groupId === "directos" ? (
                        <User className="h-4 w-4 text-primary" />
                      ) : (
                        <Users className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{group.jefeNombre}</span>
                    </div>
                    <Badge variant="outline">
                      {group.colaboradores.length} colaboradores
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="rounded-md border mt-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <SortableHeader label="Nombre" sortKeyName="nombre" />
                          <SortableHeader label="Área" sortKeyName="area" />
                          <SortableHeader label="Nivel" sortKeyName="nivel" />
                          <TableHead>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 cursor-help">
                                    Nivel Jerárquico
                                    <Info className="h-3 w-3 text-muted-foreground" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Indica qué tan lejos está el colaborador en la jerarquía organizacional</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableHead>
                          <SortableHeader label="Desempeño" sortKeyName="desempeno" />
                          <SortableHeader label="Potencial" sortKeyName="potencial" />
                          <SortableHeader label="9-Box" sortKeyName="9box" />
                          <TableHead className="w-8"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.colaboradores.map((node) => (
                          <TableRow
                            key={node.dpi}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => onMemberClick?.(node)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {node.esJefe && (
                                  <Users className="h-3 w-3 text-muted-foreground" />
                                )}
                                <div>
                                  <div>{node.nombreCompleto}</div>
                                  <div className="text-xs text-muted-foreground">{node.cargo}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{node.area || "-"}</TableCell>
                            <TableCell>{node.nivel || "-"}</TableCell>
                            <TableCell>{getNivelBadge(node.nivelJerarquico)}</TableCell>
                            <TableCell>
                              {node.tieneEvaluacion && node.desempenoPorcentaje !== undefined ? (
                                <span className={getDesempenoColor(node.desempenoPorcentaje)}>
                                  {node.desempenoPorcentaje.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {node.tieneEvaluacion && node.potencialPorcentaje !== undefined ? (
                                <span className={getPotencialColor(node.potencialPorcentaje)}>
                                  {node.potencialPorcentaje.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {node.posicion9Box ? (
                                <Badge variant="secondary" className="capitalize">
                                  {node.posicion9Box.replace("-", " ")}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        ) : (
          /* Vista lista plana con columna de jefe */
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader label="Nombre" sortKeyName="nombre" />
                    <SortableHeader label="Área" sortKeyName="area" />
                    <SortableHeader label="Nivel" sortKeyName="nivel" />
                    <SortableHeader label="Jefe Directo" sortKeyName="jefe" />
                    <TableHead>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 cursor-help">
                              Nivel Jerárquico
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Indica qué tan lejos está el colaborador en la jerarquía organizacional</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <SortableHeader label="Desempeño" sortKeyName="desempeno" />
                    <SortableHeader label="Potencial" sortKeyName="potencial" />
                    <SortableHeader label="9-Box" sortKeyName="9box" />
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedNodes.map((node) => (
                    <TableRow
                      key={node.dpi}
                      className={`cursor-pointer hover:bg-muted/50 ${
                        node.nivelJerarquico === 1 ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                      }`}
                      onClick={() => onMemberClick?.(node)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2 relative">
                          {/* Indentación visual para niveles jerárquicos */}
                          {node.nivelJerarquico > 1 && (
                            <div className="absolute left-0 top-0 bottom-0 flex items-center">
                              <div className="w-0.5 h-full bg-muted-foreground/20" style={{ marginLeft: `${(node.nivelJerarquico - 2) * 16}px` }} />
                            </div>
                          )}
                          <div className="flex items-center gap-2" style={{ paddingLeft: node.nivelJerarquico > 1 ? `${(node.nivelJerarquico - 1) * 16}px` : '0' }}>
                            {node.esJefe && (
                              <Users className="h-4 w-4 text-primary shrink-0" title="Jefe con subordinados" />
                            )}
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span>{node.nombreCompleto}</span>
                                {node.nivelJerarquico > 1 && node.jefeNombre && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="text-xs text-muted-foreground italic">
                                          (via {node.jefeNombre})
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Reporta a través de {node.jefeNombre}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">{node.cargo}</div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{node.area || "-"}</TableCell>
                      <TableCell>{node.nivel || "-"}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {node.nivelJerarquico === 1 ? (
                            <span className="text-primary font-medium">{jefePrincipalNombre}</span>
                          ) : (
                            node.jefeNombre || "-"
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getNivelBadge(node.nivelJerarquico)}</TableCell>
                      <TableCell>
                        {node.tieneEvaluacion && node.desempenoPorcentaje !== undefined ? (
                          <span className={getDesempenoColor(node.desempenoPorcentaje)}>
                            {node.desempenoPorcentaje.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {node.tieneEvaluacion && node.potencialPorcentaje !== undefined ? (
                          <span className={getPotencialColor(node.potencialPorcentaje)}>
                            {node.potencialPorcentaje.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {node.posicion9Box ? (
                          <Badge variant="secondary" className="capitalize">
                            {node.posicion9Box.replace("-", " ")}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
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
