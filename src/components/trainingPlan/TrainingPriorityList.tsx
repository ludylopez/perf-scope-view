import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TopicoCapacitacion } from "@/types/trainingPlan";
import { Search, Filter, GraduationCap, FileText, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrainingPriorityListProps {
  capacitaciones: TopicoCapacitacion[];
}

const getPrioridadBadgeVariant = (prioridad: string): "destructive" | "default" | "secondary" | "outline" => {
  switch (prioridad) {
    case "urgente":
      return "destructive";
    case "alta":
      return "default";
    case "media":
      return "secondary";
    default:
      return "outline";
  }
};

const getFuenteIcon = (fuente: string) => {
  switch (fuente) {
    case "plan":
      return <FileText className="h-3 w-3" />;
    case "comentario_jefe":
      return <MessageSquare className="h-3 w-3" />;
    case "solicitud_colaborador":
      return <User className="h-3 w-3" />;
    default:
      return <GraduationCap className="h-3 w-3" />;
  }
};

export function TrainingPriorityList({ capacitaciones }: TrainingPriorityListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todas");
  const [prioridadFilter, setPrioridadFilter] = useState<string>("todas");
  const [sortBy, setSortBy] = useState<"prioridad" | "frecuencia" | "score">("prioridad");

  if (!capacitaciones || capacitaciones.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No hay capacitaciones identificadas para mostrar
        </CardContent>
      </Card>
    );
  }

  // Filtrar y ordenar
  const filtered = capacitaciones
    .filter((cap) => {
      const matchesSearch = cap.topico.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategoria = categoriaFilter === "todas" || cap.categoria === categoriaFilter;
      const matchesPrioridad = prioridadFilter === "todas" || cap.prioridad === prioridadFilter;
      return matchesSearch && matchesCategoria && matchesPrioridad;
    })
    .sort((a, b) => {
      if (sortBy === "prioridad") {
        const order = { urgente: 1, alta: 2, media: 3, baja: 4 };
        return (order[a.prioridad] || 5) - (order[b.prioridad] || 5);
      } else if (sortBy === "frecuencia") {
        return b.frecuenciaPorcentual - a.frecuenciaPorcentual;
      } else {
        return b.scorePrioridad - a.scorePrioridad;
      }
    });

  const categoriasUnicas = Array.from(new Set(capacitaciones.map((c) => c.categoria)));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capacitaciones Priorizadas</CardTitle>
        <CardDescription>
          Tópicos de capacitación consolidados y priorizados por análisis estadístico
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filtros y búsqueda */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar capacitación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              {categoriasUnicas.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={prioridadFilter} onValueChange={setPrioridadFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las prioridades</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="baja">Baja</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prioridad">Por Prioridad</SelectItem>
              <SelectItem value="frecuencia">Por Frecuencia</SelectItem>
              <SelectItem value="score">Por Score</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabla de capacitaciones */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Tópico</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Frecuencia</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Fuentes</TableHead>
                <TableHead>Dimensiones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No se encontraron capacitaciones con los filtros aplicados
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((cap, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{cap.topico}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{cap.categoria}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{cap.frecuenciaAbsoluta} colaboradores</span>
                        <span className="text-xs text-muted-foreground">
                          {cap.frecuenciaPorcentual.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{cap.scorePrioridad.toFixed(2)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPrioridadBadgeVariant(cap.prioridad)}>
                        {cap.prioridad.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {cap.fuentes.map((fuente, fIdx) => (
                          <div
                            key={fIdx}
                            className="flex items-center gap-1"
                            title={fuente.replace("_", " ")}
                          >
                            {getFuenteIcon(fuente)}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {cap.dimensionesRelacionadas.slice(0, 2).map((dim, dIdx) => (
                          <Badge key={dIdx} variant="secondary" className="text-xs">
                            {dim.length > 20 ? dim.substring(0, 20) + "..." : dim}
                          </Badge>
                        ))}
                        {cap.dimensionesRelacionadas.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{cap.dimensionesRelacionadas.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          Mostrando {filtered.length} de {capacitaciones.length} capacitaciones
        </div>
      </CardContent>
    </Card>
  );
}



