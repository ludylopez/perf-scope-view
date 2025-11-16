import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowUpDown, ArrowUp, ArrowDown, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getQuadrantMetadata } from "@/lib/nineBoxMetadata";

interface TeamMember9Box {
  dpi: string;
  nombre: string;
  cargo: string;
  area: string;
  nivel: string;
  desempenoFinal: number;
  potencial?: number;
  posicion9Box: string;
  desempenoPorcentaje: number;
  potencialPorcentaje?: number;
}

type SortField = "nombre" | "cargo" | "area" | "nivel" | "desempenoPorcentaje" | "potencialPorcentaje" | "posicion9Box";
type SortDirection = "asc" | "desc";

interface AdvancedListProps {
  members: TeamMember9Box[];
  className?: string;
}

export function AdvancedList({ members, className = "" }: AdvancedListProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>("nombre");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Manejo especial para valores opcionales
      if (sortField === "potencialPorcentaje") {
        aValue = a.potencialPorcentaje ?? -1;
        bValue = b.potencialPorcentaje ?? -1;
      }

      // Comparación
      if (typeof aValue === "string" && typeof bValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [members, sortField, sortDirection]);

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = sortField === field;
    return (
      <Button
        variant="ghost"
        size="sm"
        className={`h-8 ${isActive ? "font-bold" : ""}`}
        onClick={() => handleSort(field)}
      >
        {children}
        {isActive ? (
          sortDirection === "asc" ? (
            <ArrowUp className="ml-2 h-3 w-3" />
          ) : (
            <ArrowDown className="ml-2 h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="ml-2 h-3 w-3 opacity-40" />
        )}
      </Button>
    );
  };

  const getImportanceBadgeColor = (importance?: string) => {
    switch (importance) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getRetentionBadgeColor = (priority?: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "medium":
        return "bg-yellow-500 text-white";
      case "low":
        return "bg-gray-400 text-white";
      default:
        return "bg-gray-300 text-gray-800";
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Vista de Lista Avanzada</CardTitle>
        <CardDescription>
          Haga clic en los encabezados para ordenar. Total: {members.length} colaboradores
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">
                  <SortButton field="nombre">Nombre</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="cargo">Cargo</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="area">Área</SortButton>
                </TableHead>
                <TableHead className="w-[80px]">
                  <SortButton field="nivel">Nivel</SortButton>
                </TableHead>
                <TableHead className="w-[180px]">
                  <SortButton field="posicion9Box">Posición 9-Box</SortButton>
                </TableHead>
                <TableHead className="w-[100px] text-center">
                  <SortButton field="desempenoPorcentaje">Desempeño</SortButton>
                </TableHead>
                <TableHead className="w-[100px] text-center">
                  <SortButton field="potencialPorcentaje">Potencial</SortButton>
                </TableHead>
                <TableHead className="w-[120px] text-center">Importancia</TableHead>
                <TableHead className="w-[110px] text-center">Retención</TableHead>
                <TableHead className="w-[80px] text-center">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No hay colaboradores que mostrar
                  </TableCell>
                </TableRow>
              ) : (
                sortedMembers.map((member) => {
                  const metadata = getQuadrantMetadata(member.posicion9Box);

                  return (
                    <TableRow
                      key={member.dpi}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/evaluacion-equipo/${member.dpi}/comparativa`)}
                    >
                      <TableCell className="font-medium">{member.nombre}</TableCell>
                      <TableCell className="text-sm">{member.cargo}</TableCell>
                      <TableCell className="text-sm">{member.area}</TableCell>
                      <TableCell className="text-sm">{member.nivel}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{metadata?.icon}</span>
                          <span className="text-xs font-medium">{metadata?.shortName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono text-xs">
                          {member.desempenoPorcentaje}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {member.potencialPorcentaje !== undefined ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            {member.potencialPorcentaje}%
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-xs ${getImportanceBadgeColor(metadata?.strategicImportance)}`}
                        >
                          {metadata?.strategicImportance === "critical" ? "Crítica" :
                           metadata?.strategicImportance === "high" ? "Alta" :
                           metadata?.strategicImportance === "medium" ? "Media" : "Baja"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={`text-xs ${getRetentionBadgeColor(metadata?.retentionPriority)}`}
                        >
                          {metadata?.retentionPriority === "urgent" ? "Urgente" :
                           metadata?.retentionPriority === "high" ? "Alta" :
                           metadata?.retentionPriority === "medium" ? "Media" : "Baja"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/evaluacion-equipo/${member.dpi}/comparativa`);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Leyenda de colores */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-xs font-semibold mb-2">Leyenda de Importancia:</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-300">
              Crítica
            </Badge>
            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
              Alta
            </Badge>
            <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
              Media
            </Badge>
            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
              Baja
            </Badge>
          </div>

          <p className="text-xs font-semibold mb-2 mt-3">Leyenda de Retención:</p>
          <div className="flex flex-wrap gap-2">
            <Badge className="text-xs bg-red-500 text-white">Urgente</Badge>
            <Badge className="text-xs bg-orange-500 text-white">Alta</Badge>
            <Badge className="text-xs bg-yellow-500 text-white">Media</Badge>
            <Badge className="text-xs bg-gray-400 text-white">Baja</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
