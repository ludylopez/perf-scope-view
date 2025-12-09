import { Users, User, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TableCell, TableRow } from "@/components/ui/table";
import type { TeamAnalysisNode } from "@/types/teamAnalysis";
import { NINE_BOX_METADATA, getPositionColor, type NineBoxPosition } from "@/lib/nineBoxMetadata";

interface TeamMemberRowProps {
  node: TeamAnalysisNode;
  onClick?: () => void;
  showJefe?: boolean;
}

export function TeamMemberRow({ node, onClick, showJefe = true }: TeamMemberRowProps) {
  const posicion = node.posicion9Box as NineBoxPosition | undefined;
  const posicionLabel = posicion ? NINE_BOX_METADATA[posicion]?.shortName : null;
  const posicionColorClass = posicion ? getPositionColor(posicion) : null;

  return (
    <TableRow
      className={onClick ? "cursor-pointer hover:bg-muted/50" : ""}
      onClick={onClick}
    >
      {/* Nombre y cargo */}
      <TableCell>
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full ${
              node.esJefe ? "bg-primary/10" : "bg-muted"
            }`}
          >
            {node.esJefe ? (
              <Users className="h-4 w-4 text-primary" />
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="font-medium">{node.nombreCompleto}</p>
            <p className="text-sm text-muted-foreground">{node.cargo}</p>
          </div>
        </div>
      </TableCell>

      {/* Área */}
      <TableCell>
        <span className="text-sm">{node.area}</span>
      </TableCell>

      {/* Nivel */}
      <TableCell>
        <Badge variant="outline">{node.nivel}</Badge>
      </TableCell>

      {/* Jefe directo (opcional) */}
      {showJefe && (
        <TableCell>
          <span className="text-sm text-muted-foreground">
            {node.jefeDpi ? "Asignado" : "-"}
          </span>
        </TableCell>
      )}

      {/* Desempeño */}
      <TableCell>
        {node.tieneEvaluacion && node.desempenoPorcentaje !== undefined ? (
          <div className="flex items-center gap-2">
            <span className={`font-medium text-sm w-10 ${
              node.desempenoPorcentaje >= 85 
                ? "text-green-600 dark:text-green-400 font-semibold"
                : node.desempenoPorcentaje >= 70
                ? "text-yellow-600 dark:text-yellow-400 font-semibold"
                : "text-red-600 dark:text-red-400 font-semibold"
            }`}>
              {Math.round(node.desempenoPorcentaje)}%
            </span>
            <Progress
              value={node.desempenoPorcentaje}
              className="w-16 h-2"
            />
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </TableCell>

      {/* Potencial */}
      <TableCell>
        {node.tieneEvaluacion && node.potencialPorcentaje !== undefined ? (
          <div className="flex items-center gap-2">
            <span className={`font-medium text-sm w-10 ${
              node.potencialPorcentaje >= 80 
                ? "text-green-600 dark:text-green-400 font-semibold"
                : node.potencialPorcentaje >= 65
                ? "text-yellow-600 dark:text-yellow-400 font-semibold"
                : "text-red-600 dark:text-red-400 font-semibold"
            }`}>
              {Math.round(node.potencialPorcentaje)}%
            </span>
            <Progress
              value={node.potencialPorcentaje}
              className="w-16 h-2"
            />
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </TableCell>

      {/* Posición 9-Box */}
      <TableCell>
        {posicion && posicionLabel ? (
          <Badge
            variant="outline"
            className={`text-xs ${posicionColorClass}`}
          >
            {posicionLabel}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </TableCell>

      {/* Equipo (si es jefe) */}
      <TableCell>
        {node.esJefe && node.totalColaboradoresDirectos !== undefined ? (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{node.totalColaboradoresDirectos}</span>
            {node.promedioEquipo !== undefined && (
              <span className="text-xs text-muted-foreground">
                (Prom: {Math.round(node.promedioEquipo)}%)
              </span>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </TableCell>

      {/* Indicador de click */}
      {onClick && (
        <TableCell className="w-8">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </TableCell>
      )}
    </TableRow>
  );
}

