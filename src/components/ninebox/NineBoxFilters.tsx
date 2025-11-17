import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Filter, SlidersHorizontal } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface FilterOptions {
  searchTerm: string;
  area?: string;
  nivel?: string;
  cargo?: string;
  position?: string;
  importancia?: "critical" | "high" | "medium" | "low";
  retencion?: "urgent" | "high" | "medium" | "low";
  jefe?: string; // Para vista RRHH
}

interface NineBoxFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  availableAreas: string[];
  availableNiveles: string[];
  availableCargos: string[];
  availableJefes?: { dpi: string; nombre: string }[]; // Para vista RRHH
  totalCount: number;
  filteredCount: number;
  isGlobalView?: boolean; // Para mostrar filtros RRHH
}

const positionOptions = [
  { value: "alto-alto", label: "⭐ Estrellas" },
  { value: "medio-alto", label: "💎 Alto Potencial" },
  { value: "bajo-alto", label: "❓ Enigmas" },
  { value: "alto-medio", label: "🏛️ Pilares" },
  { value: "medio-medio", label: "⚙️ Núcleo Estable" },
  { value: "bajo-medio", label: "⚠️ Requieren Atención" },
  { value: "alto-bajo", label: "🎓 Expertos" },
  { value: "medio-bajo", label: "📋 Confiables" },
  { value: "bajo-bajo", label: "🔴 Bajo Rendimiento" },
];

const importanciaOptions = [
  { value: "critical", label: "Crítica" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Baja" },
];

const retencionOptions = [
  { value: "urgent", label: "Urgente" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Baja" },
];

export function NineBoxFilters({
  filters,
  onFiltersChange,
  availableAreas,
  availableNiveles,
  availableCargos,
  availableJefes = [],
  totalCount,
  filteredCount,
  isGlobalView = false,
}: NineBoxFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: keyof FilterOptions, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value === "all" ? undefined : value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchTerm: "",
    });
  };

  const activeFiltersCount = Object.keys(filters).filter(
    (key) => key !== "searchTerm" && filters[key as keyof FilterOptions]
  ).length;

  const hasActiveFilters = filters.searchTerm || activeFiltersCount > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros y Búsqueda
            </CardTitle>
            <CardDescription>
              {filteredCount === totalCount
                ? `Mostrando todos los ${totalCount} colaboradores`
                : `Mostrando ${filteredCount} de ${totalCount} colaboradores`}
            </CardDescription>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Búsqueda principal */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, cargo o área..."
            value={filters.searchTerm}
            onChange={(e) => updateFilter("searchTerm", e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtros rápidos */}
        <div className="flex flex-wrap gap-2">
          <Select
            value={filters.position || "all"}
            onValueChange={(value) => updateFilter("position", value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas las posiciones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las posiciones</SelectItem>
              {positionOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.area || "all"}
            onValueChange={(value) => updateFilter("area", value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas las áreas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las áreas</SelectItem>
              {availableAreas.map((area) => (
                <SelectItem key={area} value={area}>
                  {area}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.nivel || "all"}
            onValueChange={(value) => updateFilter("nivel", value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos los niveles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los niveles</SelectItem>
              {availableNiveles.map((nivel) => (
                <SelectItem key={nivel} value={nivel}>
                  {nivel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtros avanzados */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Avanzado
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 rounded-full h-5 w-5 p-0 flex items-center justify-center">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Filtros Avanzados</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Refine su búsqueda con criterios adicionales
                  </p>
                </div>

                <div className="space-y-3">
                  {isGlobalView && availableJefes.length > 0 && (
                    <div>
                      <label className="text-xs font-medium mb-1.5 block">Jefe Inmediato</label>
                      <Select
                        value={filters.jefe || "all"}
                        onValueChange={(value) => updateFilter("jefe", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los jefes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los jefes</SelectItem>
                          {availableJefes.map((jefe) => (
                            <SelectItem key={jefe.dpi} value={jefe.dpi}>
                              {jefe.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Cargo</label>
                    <Select
                      value={filters.cargo || "all"}
                      onValueChange={(value) => updateFilter("cargo", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los cargos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los cargos</SelectItem>
                        {availableCargos.map((cargo) => (
                          <SelectItem key={cargo} value={cargo}>
                            {cargo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium mb-1.5 block">
                      Importancia Estratégica
                    </label>
                    <Select
                      value={filters.importancia || "all"}
                      onValueChange={(value) => updateFilter("importancia", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Cualquier importancia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Cualquier importancia</SelectItem>
                        {importanciaOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium mb-1.5 block">
                      Prioridad de Retención
                    </label>
                    <Select
                      value={filters.retencion || "all"}
                      onValueChange={(value) => updateFilter("retencion", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Cualquier prioridad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Cualquier prioridad</SelectItem>
                        {retencionOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Filtros activos */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <span className="text-xs text-muted-foreground self-center">Filtros activos:</span>

            {filters.searchTerm && (
              <Badge variant="secondary" className="gap-1">
                Búsqueda: "{filters.searchTerm}"
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => updateFilter("searchTerm", "")}
                />
              </Badge>
            )}

            {filters.position && (
              <Badge variant="secondary" className="gap-1">
                Posición: {positionOptions.find(p => p.value === filters.position)?.label}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => updateFilter("position", undefined)}
                />
              </Badge>
            )}

            {filters.area && (
              <Badge variant="secondary" className="gap-1">
                Área: {filters.area}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => updateFilter("area", undefined)}
                />
              </Badge>
            )}

            {filters.nivel && (
              <Badge variant="secondary" className="gap-1">
                Nivel: {filters.nivel}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => updateFilter("nivel", undefined)}
                />
              </Badge>
            )}

            {filters.cargo && (
              <Badge variant="secondary" className="gap-1">
                Cargo: {filters.cargo}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => updateFilter("cargo", undefined)}
                />
              </Badge>
            )}

            {filters.jefe && (
              <Badge variant="secondary" className="gap-1">
                Jefe: {availableJefes.find(j => j.dpi === filters.jefe)?.nombre}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => updateFilter("jefe", undefined)}
                />
              </Badge>
            )}

            {filters.importancia && (
              <Badge variant="secondary" className="gap-1">
                Importancia: {importanciaOptions.find(i => i.value === filters.importancia)?.label}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => updateFilter("importancia", undefined)}
                />
              </Badge>
            )}

            {filters.retencion && (
              <Badge variant="secondary" className="gap-1">
                Retención: {retencionOptions.find(r => r.value === filters.retencion)?.label}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => updateFilter("retencion", undefined)}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
