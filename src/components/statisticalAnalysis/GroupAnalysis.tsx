import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndividualAnalysis, calculateByGroup } from "@/lib/statisticalAnalysis";
import { Users, Building2, Briefcase } from "lucide-react";

interface GroupAnalysisProps {
  data: IndividualAnalysis[];
}

export function GroupAnalysis({ data }: GroupAnalysisProps) {
  const byCategoria = calculateByGroup(data, 'categoria');
  const byArea = calculateByGroup(data, 'area');
  const byNivel = calculateByGroup(data, 'nivel');

  const calculateGroupStats = (groupData: IndividualAnalysis[]) => {
    if (groupData.length === 0) {
      return {
        cantidad: 0,
        promedioAuto: 0,
        promedioJefe: 0,
        promedioDiferencia: 0,
        promedioImpacto: 0,
      };
    }

    const promedioAuto = groupData.reduce((sum, d) => sum + d.scoreAuto, 0) / groupData.length;
    const promedioJefe = groupData.reduce((sum, d) => sum + d.scoreJefe, 0) / groupData.length;
    const promedioDiferencia = groupData.reduce((sum, d) => sum + d.diferencia, 0) / groupData.length;
    const promedioImpacto = groupData.reduce((sum, d) => sum + d.impactoCambio, 0) / groupData.length;

    return {
      cantidad: groupData.length,
      promedioAuto: Math.round(promedioAuto * 100) / 100,
      promedioJefe: Math.round(promedioJefe * 100) / 100,
      promedioDiferencia: Math.round(promedioDiferencia * 100) / 100,
      promedioImpacto: Math.round(promedioImpacto * 100) / 100,
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Análisis Segmentado por Grupo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="categoria" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="categoria">
              <Briefcase className="h-4 w-4 mr-2" />
              Por Categoría
            </TabsTrigger>
            <TabsTrigger value="area">
              <Building2 className="h-4 w-4 mr-2" />
              Por Área
            </TabsTrigger>
            <TabsTrigger value="nivel">
              <Users className="h-4 w-4 mr-2" />
              Por Nivel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categoria" className="mt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Prom. Auto</TableHead>
                    <TableHead className="text-right">Prom. Jefe</TableHead>
                    <TableHead className="text-right">Prom. Diferencia</TableHead>
                    <TableHead className="text-right">Prom. Impacto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(byCategoria)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([categoria, groupData]) => {
                      const stats = calculateGroupStats(groupData);
                      return (
                        <TableRow key={categoria}>
                          <TableCell className="font-medium">
                            {categoria === 'administrativo' ? 'Administrativo' : 
                             categoria === 'operativo' ? 'Operativo' : categoria}
                          </TableCell>
                          <TableCell className="text-right">{stats.cantidad}</TableCell>
                          <TableCell className="text-right">{stats.promedioAuto.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{stats.promedioJefe.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{stats.promedioDiferencia.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{stats.promedioImpacto.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="area" className="mt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Área</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Prom. Auto</TableHead>
                    <TableHead className="text-right">Prom. Jefe</TableHead>
                    <TableHead className="text-right">Prom. Diferencia</TableHead>
                    <TableHead className="text-right">Prom. Impacto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(byArea)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([area, groupData]) => {
                      const stats = calculateGroupStats(groupData);
                      return (
                        <TableRow key={area}>
                          <TableCell className="font-medium">{area}</TableCell>
                          <TableCell className="text-right">{stats.cantidad}</TableCell>
                          <TableCell className="text-right">{stats.promedioAuto.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{stats.promedioJefe.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{stats.promedioDiferencia.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{stats.promedioImpacto.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="nivel" className="mt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nivel</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Prom. Auto</TableHead>
                    <TableHead className="text-right">Prom. Jefe</TableHead>
                    <TableHead className="text-right">Prom. Diferencia</TableHead>
                    <TableHead className="text-right">Prom. Impacto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(byNivel)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([nivel, groupData]) => {
                      const stats = calculateGroupStats(groupData);
                      return (
                        <TableRow key={nivel}>
                          <TableCell className="font-medium">{nivel}</TableCell>
                          <TableCell className="text-right">{stats.cantidad}</TableCell>
                          <TableCell className="text-right">{stats.promedioAuto.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{stats.promedioJefe.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{stats.promedioDiferencia.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{stats.promedioImpacto.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}


