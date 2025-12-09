import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, Users } from "lucide-react";
import { TeamHierarchyNode } from "./TeamHierarchyNode";
import type { TeamAnalysisNode, TeamHierarchyProps } from "@/types/teamAnalysis";

interface TeamHierarchyTreeProps extends TeamHierarchyProps {
  usuarioDpi: string;
}

export function TeamHierarchyTree({
  nodes,
  onNodeClick,
  usuarioDpi,
}: TeamHierarchyTreeProps) {
  if (nodes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No hay colaboradores en la jerarquía</p>
        </CardContent>
      </Card>
    );
  }

  // Encontrar los nodos raíz (subordinados directos del usuario actual)
  const rootNodes = nodes.filter((n) => n.jefeDpi === usuarioDpi || n.nivelJerarquico === 1);

  // Función para obtener hijos de un nodo
  const getChildrenOf = (parentDpi: string) =>
    nodes.filter((n) => n.jefeDpi === parentDpi);

  // Calcular estadísticas del árbol
  const totalJefes = nodes.filter((n) => n.esJefe).length;
  const totalColaboradores = nodes.filter((n) => !n.esJefe).length;
  const totalConEvaluacion = nodes.filter((n) => n.tieneEvaluacion).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Network className="h-5 w-5" />
            Jerarquía de la Unidad
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {totalJefes} jefes
            </Badge>
            <Badge variant="secondary">
              {totalColaboradores} colaboradores
            </Badge>
            <Badge variant="default">
              {totalConEvaluacion} evaluados
            </Badge>
          </div>
        </div>
        {/* Leyenda de columnas */}
        <div className="flex items-center text-xs text-muted-foreground mt-4 border-b pb-2">
          <div className="flex-1 min-w-[250px] pl-14">Colaborador</div>
          <div className="w-20 text-center">Desempeño</div>
          <div className="w-20 text-center">Potencial</div>
          <div className="w-28 text-center">9-Box</div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-0.5">
          {rootNodes.map((rootNode) => (
            <TeamHierarchyNode
              key={rootNode.dpi}
              node={rootNode}
              children={getChildrenOf(rootNode.dpi)}
              allNodes={nodes}
              level={0}
              onNodeClick={onNodeClick}
            />
          ))}
        </div>

        {/* Mensaje si el árbol está vacío pero hay nodos sin jerarquía */}
        {rootNodes.length === 0 && nodes.length > 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Los colaboradores no tienen una jerarquía definida correctamente.</p>
            <p className="text-sm mt-1">
              Verifica que el campo "jefe_inmediato_id" esté configurado.
            </p>
          </div>
        )}

        {/* Leyenda de colores */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="font-medium">Escala de resultados:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500" />
              <span>≥80% Excelente</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500" />
              <span>60-79% Bueno</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500" />
              <span>&lt;60% Mejorar</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
