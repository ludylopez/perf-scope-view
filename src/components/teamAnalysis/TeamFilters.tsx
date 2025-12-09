import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { TeamFiltersProps } from "@/types/teamAnalysis";
import { JOB_LEVEL_CODES } from "@/types/jobLevel";

export function TeamFilters({
  jefes,
  grupos,
  filters,
  onFiltersChange,
  showNivelFilter = true,
}: TeamFiltersProps) {
  const hasActiveFilters =
    filters.jefeDpi || filters.grupoId || filters.nivelPuesto || filters.busqueda;

  const clearFilters = () => {
    onFiltersChange({});
  };

  const updateFilter = (key: keyof typeof filters, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Búsqueda por texto */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o cargo..."
            value={filters.busqueda || ""}
            onChange={(e) => updateFilter("busqueda", e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filtro por jefe */}
        {jefes.length > 0 && (
          <Select
            value={filters.jefeDpi || "all"}
            onValueChange={(value) =>
              updateFilter("jefeDpi", value === "all" ? undefined : value)
            }
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtrar por jefe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los equipos</SelectItem>
              {jefes.map((jefe) => (
                <SelectItem key={jefe.dpi} value={jefe.dpi}>
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full bg-primary"
                      style={{ opacity: 1 - jefe.nivelJerarquico * 0.15 }}
                    />
                    {jefe.nombre}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Filtro por grupo */}
        {grupos.length > 0 && (
          <Select
            value={filters.grupoId || "all"}
            onValueChange={(value) =>
              updateFilter("grupoId", value === "all" ? undefined : value)
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los grupos</SelectItem>
              {grupos.map((grupo) => (
                <SelectItem key={grupo.id} value={grupo.id}>
                  <span className="flex items-center gap-2">
                    {grupo.nombre}
                    <Badge variant="outline" className="text-xs">
                      {grupo.totalMiembros}
                    </Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Filtro por nivel de puesto */}
        {showNivelFilter && (
          <Select
            value={filters.nivelPuesto || "all"}
            onValueChange={(value) =>
              updateFilter("nivelPuesto", value === "all" ? undefined : value)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Nivel de puesto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los niveles</SelectItem>
              {Object.entries(JOB_LEVEL_CODES).map(([code, name]) => (
                <SelectItem key={code} value={code}>
                  {code} - {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Botón limpiar filtros */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Indicador de filtros activos */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filtros activos:</span>
          {filters.busqueda && (
            <Badge variant="secondary" className="text-xs">
              Búsqueda: "{filters.busqueda}"
            </Badge>
          )}
          {filters.jefeDpi && (
            <Badge variant="secondary" className="text-xs">
              Jefe: {jefes.find((j) => j.dpi === filters.jefeDpi)?.nombre || filters.jefeDpi}
            </Badge>
          )}
          {filters.grupoId && (
            <Badge variant="secondary" className="text-xs">
              Grupo: {grupos.find((g) => g.id === filters.grupoId)?.nombre || "Seleccionado"}
            </Badge>
          )}
          {filters.nivelPuesto && (
            <Badge variant="secondary" className="text-xs">
              Nivel: {filters.nivelPuesto}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
