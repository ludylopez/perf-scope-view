import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getQuadrantMetadata, NineBoxPosition } from "@/lib/nineBoxMetadata";
import {
  BarChart3,
  TrendingUp,
  Users,
  AlertTriangle,
  Award,
  Target,
} from "lucide-react";

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
  jefe?: string;
  jefeNombre?: string;
}

interface GlobalAnalyticsProps {
  allMembers: TeamMember9Box[];
  className?: string;
}

interface AreaStats {
  area: string;
  total: number;
  estrellas: number;
  altoPotencial: number;
  bajoRendimiento: number;
  promedioDesempeno: number;
  promedioPotencial: number;
}

interface JefeStats {
  jefe: string;
  jefeNombre: string;
  total: number;
  estrellas: number;
  altoPotencial: number;
  bajoRendimiento: number;
  promedioDesempeno: number;
}

export function GlobalAnalytics({ allMembers, className = "" }: GlobalAnalyticsProps) {
  // Análisis por área
  const areaStats = useMemo(() => {
    const areas = new Map<string, TeamMember9Box[]>();
    allMembers.forEach(member => {
      if (!areas.has(member.area)) {
        areas.set(member.area, []);
      }
      areas.get(member.area)!.push(member);
    });

    const stats: AreaStats[] = [];
    areas.forEach((members, area) => {
      const estrellas = members.filter(m => m.posicion9Box === "alto-alto").length;
      const altoPotencial = members.filter(m =>
        m.posicion9Box === "alto-alto" || m.posicion9Box === "medio-alto" || m.posicion9Box === "bajo-alto"
      ).length;
      const bajoRendimiento = members.filter(m => m.posicion9Box === "bajo-bajo").length;
      const promedioDesempeno = members.reduce((sum, m) => sum + m.desempenoPorcentaje, 0) / members.length;
      const potenciales = members.filter(m => m.potencialPorcentaje !== undefined);
      const promedioPotencial = potenciales.length > 0
        ? potenciales.reduce((sum, m) => sum + (m.potencialPorcentaje || 0), 0) / potenciales.length
        : 0;

      stats.push({
        area,
        total: members.length,
        estrellas,
        altoPotencial,
        bajoRendimiento,
        promedioDesempeno,
        promedioPotencial,
      });
    });

    return stats.sort((a, b) => b.total - a.total);
  }, [allMembers]);

  // Análisis por jefe
  const jefeStats = useMemo(() => {
    const jefes = new Map<string, TeamMember9Box[]>();
    allMembers.forEach(member => {
      if (member.jefe && member.jefeNombre) {
        if (!jefes.has(member.jefe)) {
          jefes.set(member.jefe, []);
        }
        jefes.get(member.jefe)!.push(member);
      }
    });

    const stats: JefeStats[] = [];
    jefes.forEach((members, jefe) => {
      const jefeNombre = members[0].jefeNombre || "Desconocido";
      const estrellas = members.filter(m => m.posicion9Box === "alto-alto").length;
      const altoPotencial = members.filter(m =>
        m.posicion9Box === "alto-alto" || m.posicion9Box === "medio-alto" || m.posicion9Box === "bajo-alto"
      ).length;
      const bajoRendimiento = members.filter(m => m.posicion9Box === "bajo-bajo").length;
      const promedioDesempeno = members.reduce((sum, m) => sum + m.desempenoPorcentaje, 0) / members.length;

      stats.push({
        jefe,
        jefeNombre,
        total: members.length,
        estrellas,
        altoPotencial,
        bajoRendimiento,
        promedioDesempeno,
      });
    });

    return stats.sort((a, b) => b.total - a.total);
  }, [allMembers]);

  // Distribución general
  const generalDistribution = useMemo(() => {
    const total = allMembers.length;
    const distribution = {
      "alto-alto": 0,
      "medio-alto": 0,
      "bajo-alto": 0,
      "alto-medio": 0,
      "medio-medio": 0,
      "bajo-medio": 0,
      "alto-bajo": 0,
      "medio-bajo": 0,
      "bajo-bajo": 0,
    };

    allMembers.forEach(m => {
      if (distribution.hasOwnProperty(m.posicion9Box)) {
        distribution[m.posicion9Box as NineBoxPosition]++;
      }
    });

    return Object.entries(distribution).map(([position, count]) => {
      const metadata = getQuadrantMetadata(position);
      return {
        position: position as NineBoxPosition,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
        metadata,
      };
    }).filter(d => d.count > 0).sort((a, b) => b.count - a.count);
  }, [allMembers]);

  const totalColaboradores = allMembers.length;
  const totalEstrellas = allMembers.filter(m => m.posicion9Box === "alto-alto").length;
  const totalBajoRendimiento = allMembers.filter(m => m.posicion9Box === "bajo-bajo").length;
  const totalAltoPotencial = allMembers.filter(m =>
    m.posicion9Box === "alto-alto" || m.posicion9Box === "medio-alto" || m.posicion9Box === "bajo-alto"
  ).length;
  const promedioDesempenoGeneral = totalColaboradores > 0
    ? allMembers.reduce((sum, m) => sum + m.desempenoPorcentaje, 0) / totalColaboradores
    : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Resumen Global */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Análisis Global de la Municipalidad
          </CardTitle>
          <CardDescription>
            Panorama completo del talento organizacional
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-700" />
                <p className="text-sm text-blue-700 font-medium">Total Colaboradores</p>
              </div>
              <p className="text-3xl font-bold text-blue-900">{totalColaboradores}</p>
              <p className="text-xs text-blue-600 mt-1">Evaluados en el período</p>
            </div>

            <div className="p-4 rounded-lg border bg-yellow-50 border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-yellow-700" />
                <p className="text-sm text-yellow-700 font-medium">Talento Estrella</p>
              </div>
              <p className="text-3xl font-bold text-yellow-900">{totalEstrellas}</p>
              <p className="text-xs text-yellow-600 mt-1">
                {totalColaboradores > 0 ? ((totalEstrellas / totalColaboradores) * 100).toFixed(1) : 0}% del total
              </p>
            </div>

            <div className="p-4 rounded-lg border bg-green-50 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-700" />
                <p className="text-sm text-green-700 font-medium">Alto Potencial</p>
              </div>
              <p className="text-3xl font-bold text-green-900">{totalAltoPotencial}</p>
              <p className="text-xs text-green-600 mt-1">
                {totalColaboradores > 0 ? ((totalAltoPotencial / totalColaboradores) * 100).toFixed(1) : 0}% del total
              </p>
            </div>

            <div className="p-4 rounded-lg border bg-red-50 border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-700" />
                <p className="text-sm text-red-700 font-medium">Bajo Rendimiento</p>
              </div>
              <p className="text-3xl font-bold text-red-900">{totalBajoRendimiento}</p>
              <p className="text-xs text-red-600 mt-1">Requiere intervención</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Promedio de Desempeño General</p>
            <div className="flex items-center gap-3">
              <Progress value={promedioDesempenoGeneral} className="flex-1" />
              <Badge variant="outline" className="font-mono">
                {promedioDesempenoGeneral.toFixed(1)}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distribución por Cuadrante */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución por Cuadrante 9-Box</CardTitle>
          <CardDescription>Concentración de talento en cada categoría</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {generalDistribution.map(({ position, count, percentage, metadata }) => (
              <div key={position} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-48">
                  <span className="text-lg">{metadata?.icon}</span>
                  <span className="text-sm font-medium">{metadata?.shortName}</span>
                </div>
                <Progress value={percentage} className="flex-1" />
                <div className="flex items-center gap-2 w-32 justify-end">
                  <Badge variant="outline" className="font-mono text-xs">
                    {count}
                  </Badge>
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Áreas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Análisis por Área
          </CardTitle>
          <CardDescription>Comparativa de desempeño entre áreas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {areaStats.map((area) => (
              <div key={area.area} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">{area.area}</h4>
                    <p className="text-xs text-muted-foreground">
                      {area.total} colaborador{area.total !== 1 ? "es" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-yellow-50">
                      ⭐ {area.estrellas}
                    </Badge>
                    <Badge variant="outline" className="bg-green-50">
                      💎 {area.altoPotencial}
                    </Badge>
                    {area.bajoRendimiento > 0 && (
                      <Badge variant="outline" className="bg-red-50">
                        🔴 {area.bajoRendimiento}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Desempeño Promedio</p>
                    <div className="flex items-center gap-2">
                      <Progress value={area.promedioDesempeno} className="flex-1 h-2" />
                      <Badge variant="outline" className="font-mono text-xs">
                        {area.promedioDesempeno.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  {area.promedioPotencial > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Potencial Promedio</p>
                      <div className="flex items-center gap-2">
                        <Progress value={area.promedioPotencial} className="flex-1 h-2" />
                        <Badge variant="outline" className="font-mono text-xs">
                          {area.promedioPotencial.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Jefes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Análisis por Jefe/Supervisor
          </CardTitle>
          <CardDescription>Desempeño de equipos por responsable</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {jefeStats.map((jefe) => (
              <div key={jefe.jefe} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">{jefe.jefeNombre}</h4>
                    <p className="text-xs text-muted-foreground">
                      {jefe.total} colaborador{jefe.total !== 1 ? "es" : ""} a cargo
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-yellow-50">
                      ⭐ {jefe.estrellas}
                    </Badge>
                    <Badge variant="outline" className="bg-green-50">
                      💎 {jefe.altoPotencial}
                    </Badge>
                    {jefe.bajoRendimiento > 0 && (
                      <Badge variant="outline" className="bg-red-50">
                        🔴 {jefe.bajoRendimiento}
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Desempeño Promedio del Equipo</p>
                  <div className="flex items-center gap-2">
                    <Progress value={jefe.promedioDesempeno} className="flex-1 h-2" />
                    <Badge variant="outline" className="font-mono text-xs">
                      {jefe.promedioDesempeno.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
