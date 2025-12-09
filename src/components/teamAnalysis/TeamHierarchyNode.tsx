import { useState } from "react";
import { ChevronRight, ChevronDown, Users, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TeamAnalysisNode } from "@/types/teamAnalysis";
import { NINE_BOX_METADATA, getPositionColor, type NineBoxPosition } from "@/lib/nineBoxMetadata";

interface TeamHierarchyNodeProps {
  node: TeamAnalysisNode;
  children: TeamAnalysisNode[];
  allNodes: TeamAnalysisNode[];
  level?: number;
  onNodeClick?: (node: TeamAnalysisNode) => void;
}

// Función para obtener color según porcentaje
const getPercentageColor = (percentage: number | undefined): string => {
  if (percentage === undefined || percentage === null) return "";
  if (percentage >= 80) return "bg-green-500/20 text-green-700 dark:text-green-400";
  if (percentage >= 60) return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
  return "bg-red-500/20 text-red-700 dark:text-red-400";
};

export function TeamHierarchyNode({
  node,
  children,
  allNodes,
  level = 0,
  onNodeClick,
}: TeamHierarchyNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Expandir primeros 2 niveles

  const hasChildren = children.length > 0;
  const posicion = node.posicion9Box as NineBoxPosition | undefined;
  const posicionMetadata = posicion ? NINE_BOX_METADATA[posicion] : null;
  const posicionColorClass = posicion ? getPositionColor(posicion) : "";

  // Obtener hijos de cada nodo hijo (para recursión)
  const getChildrenOf = (parentDpi: string) =>
    allNodes.filter((n) => n.jefeDpi === parentDpi);

  return (
    <div className="select-none">
      {/* Nodo actual */}
      <div
        className={`flex items-center gap-1 py-1.5 px-1 rounded hover:bg-muted/50 transition-colors ${
          onNodeClick ? "cursor-pointer" : ""
        }`}
        style={{ paddingLeft: `${level * 20 + 4}px` }}
        onClick={() => onNodeClick?.(node)}
      >
        {/* Botón expandir/colapsar */}
        {hasChildren ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </Button>
        ) : (
          <div className="w-5 shrink-0" />
        )}

        {/* Icono de rol */}
        <div
          className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 ${
            node.esJefe ? "bg-primary/10" : "bg-muted"
          }`}
        >
          {node.esJefe ? (
            <Users className="h-3 w-3 text-primary" />
          ) : (
            <User className="h-3 w-3 text-muted-foreground" />
          )}
        </div>

        {/* Info del colaborador */}
        <div className="flex-1 min-w-[200px] flex items-center gap-1.5 truncate">
          <span className="font-medium text-sm truncate">{node.nombreCompleto}</span>
          <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
            {node.nivel}
          </Badge>
          {node.esJefe && node.totalColaboradoresDirectos !== undefined && node.totalColaboradoresDirectos > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">
              {node.totalColaboradoresDirectos}
            </Badge>
          )}
        </div>

        {/* Desempeño */}
        <div className="w-20 text-center shrink-0">
          {node.tieneEvaluacion && node.desempenoPorcentaje !== undefined ? (
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getPercentageColor(node.desempenoPorcentaje)}`}
            >
              {Math.round(node.desempenoPorcentaje)}%
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>

        {/* Potencial */}
        <div className="w-20 text-center shrink-0">
          {node.tieneEvaluacion && node.potencialPorcentaje !== undefined ? (
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getPercentageColor(node.potencialPorcentaje)}`}
            >
              {Math.round(node.potencialPorcentaje)}%
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>

        {/* 9-Box */}
        <div className="w-28 text-center shrink-0">
          {posicion && posicionMetadata ? (
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${posicionColorClass}`}
            >
              {posicionMetadata.shortName}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>
      </div>

      {/* Fila de promedio de equipo (solo si es jefe expandido con colaboradores) */}
      {node.esJefe && isExpanded && hasChildren && node.promedioEquipo !== undefined && (
        <div
          className="flex items-center gap-1 py-1 px-1 bg-muted/30 border-l-2 border-primary/30 text-muted-foreground"
          style={{ paddingLeft: `${level * 20 + 36}px` }}
        >
          <div className="flex-1 min-w-[200px] text-xs italic">
            Promedio equipo
          </div>
          {/* Promedio desempeño del equipo */}
          <div className="w-20 text-center shrink-0">
            <span className="text-xs font-medium">{Math.round(node.promedioEquipo)}%</span>
          </div>
          <div className="w-20 shrink-0" />
          <div className="w-28 shrink-0" />
        </div>
      )}

      {/* Hijos (recursivo) */}
      {hasChildren && isExpanded && (
        <div className="border-l border-muted ml-3">
          {children.map((child) => (
            <TeamHierarchyNode
              key={child.dpi}
              node={child}
              children={getChildrenOf(child.dpi)}
              allNodes={allNodes}
              level={level + 1}
              onNodeClick={onNodeClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
