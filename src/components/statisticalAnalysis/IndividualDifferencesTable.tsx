import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { IndividualAnalysis } from "@/lib/statisticalAnalysis";
import { Users, Search } from "lucide-react";
import { useState } from "react";

interface IndividualDifferencesTableProps {
  data: IndividualAnalysis[];
}

export function IndividualDifferencesTable({ data }: IndividualDifferencesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof IndividualAnalysis | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: keyof IndividualAnalysis) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  let filteredData = data.filter(d =>
    d.colaboradorNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.nivel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (sortField) {
    filteredData = [...filteredData].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Análisis de Diferencias por Colaborador
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, área o nivel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('colaboradorNombre')}
                >
                  Colaborador {sortField === 'colaboradorNombre' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('scoreAuto')}
                >
                  Score Auto {sortField === 'scoreAuto' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('scoreJefe')}
                >
                  Score Jefe {sortField === 'scoreJefe' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('diferencia')}
                >
                  Diferencia {sortField === 'diferencia' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-right">Score Actual (50/50)</TableHead>
                <TableHead className="text-right">Score Simulado (70/30)</TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('impactoCambio')}
                >
                  Impacto {sortField === 'impactoCambio' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Nivel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No se encontraron resultados
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((row) => (
                  <TableRow key={row.colaboradorId}>
                    <TableCell className="font-medium">{row.colaboradorNombre}</TableCell>
                    <TableCell className="text-right">{row.scoreAuto.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{row.scoreJefe.toFixed(2)}</TableCell>
                    <TableCell className={`text-right ${
                      row.diferencia > 0.5 ? 'text-orange-600' : 
                      row.diferencia < -0.5 ? 'text-blue-600' : 
                      'text-gray-600'
                    }`}>
                      {row.diferencia > 0 ? '+' : ''}{row.diferencia.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">{row.scoreActual50_50.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{row.scoreSimulado70_30.toFixed(2)}</TableCell>
                    <TableCell className={`text-right font-medium ${
                      row.impactoCambio > 0.1 ? 'text-green-600' : 
                      row.impactoCambio < -0.1 ? 'text-red-600' : 
                      'text-gray-600'
                    }`}>
                      {row.impactoCambio > 0 ? '+' : ''}{row.impactoCambio.toFixed(2)}
                    </TableCell>
                    <TableCell>{row.area || '-'}</TableCell>
                    <TableCell>{row.nivel || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          Total de colaboradores: {filteredData.length}
        </div>
      </CardContent>
    </Card>
  );
}






