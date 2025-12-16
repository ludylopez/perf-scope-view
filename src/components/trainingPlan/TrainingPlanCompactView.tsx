import { PlanCapacitacionEstructurado, TematicaCapacitacion } from "@/types/trainingPlan";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, Building2 } from "lucide-react";

interface TrainingPlanCompactViewProps {
  planEstructurado: PlanCapacitacionEstructurado;
  totalColaboradores?: number;
  directorNombre?: string;
}

export function TrainingPlanCompactView({ 
  planEstructurado, 
  totalColaboradores,
  directorNombre 
}: TrainingPlanCompactViewProps) {
  // Calcular estadísticas
  const tematicas = planEstructurado.tematicas || [];
  const programaCapacitacion = planEstructurado.programaCapacitacion || [];
  
  // Calcular total de actividades
  const totalActividades = tematicas.reduce((acc, tematica) => {
    return acc + (tematica.actividades?.length || 0);
  }, 0);
  
  // Calcular total de horas
  const totalHoras = tematicas.reduce((acc, tematica) => {
    const horasTematica = tematica.actividades?.reduce((hAcc, actividad) => {
      const horasMatch = actividad.duracion?.match(/(\d+)\s*hora/i);
      return hAcc + (horasMatch ? parseInt(horasMatch[1]) : 0);
    }, 0) || 0;
    return acc + horasTematica;
  }, 0);
  
  // Obtener información del departamento
  const areaDepartamento = planEstructurado.informacionGeneral?.areaDepartamento || "Unidad Organizacional";
  const responsable = planEstructurado.informacionGeneral?.responsable || "Gerencia de Recursos Humanos";
  const periodo = planEstructurado.informacionGeneral?.periodo || "Enero - Diciembre 2026";
  const totalColab = planEstructurado.informacionGeneral?.totalColaboradores || totalColaboradores || 0;

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg">
      {/* Header */}
      <div className="text-center border-b pb-4">
        <p className="text-sm text-muted-foreground mb-1">MUNICIPALIDAD DE ESQUIPULAS</p>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{areaDepartamento}</h1>
        <p className="text-base text-gray-600">Plan de Capacitación Anual</p>
        <p className="text-sm text-gray-500 mt-1">Período: {periodo}</p>
      </div>

      {/* Información del Departamento */}
      <div className="border-b pb-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-3 uppercase">INFORMACIÓN DEL DEPARTAMENTO</h2>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">DIRECTOR</p>
            <p className="text-sm font-semibold">{directorNombre || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">TOTAL COLABORADORES</p>
            <p className="text-sm font-semibold">{totalColab} personas</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">HORAS DE CAPACITACIÓN</p>
            <p className="text-sm font-semibold">{totalHoras} horas</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">COORDINACIÓN</p>
            <p className="text-sm font-semibold">{responsable}</p>
          </div>
        </div>
      </div>

      {/* Programa de Capacitación */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 uppercase">PROGRAMA DE CAPACITACIÓN</h2>
        
        <div className="space-y-6">
          {tematicas.map((tematica, idx) => (
            <TematicaCompactCard key={idx} tematica={tematica} />
          ))}
          
          {/* Si no hay temáticas pero hay programaCapacitacion, agrupar por temática similar */}
          {tematicas.length === 0 && programaCapacitacion.length > 0 && (
            <div className="space-y-6">
              {programaCapacitacion.map((cap, idx) => (
                <CapacitacionCompactCard key={idx} capacitacion={cap} />
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

function TematicaCompactCard({ tematica }: { tematica: TematicaCapacitacion }) {
  // Calcular duración total de la temática
  const duracionTotal = tematica.actividades?.reduce((acc, actividad) => {
    const horasMatch = actividad.duracion?.match(/(\d+)\s*hora/i);
    return acc + (horasMatch ? parseInt(horasMatch[1]) : 0);
  }, 0) || 0;

  // Determinar color del badge de participantes
  const participantesLower = (tematica.participantesRecomendados || "").toLowerCase();
  const esTodoElEquipo = participantesLower.includes("todo el equipo") || participantesLower.includes("todos");

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        {/* PARTICIPANTES ARRIBA DEL TÍTULO */}
        {tematica.participantesRecomendados && (
          <div className="mb-3">
            <Badge 
              variant="outline" 
              className={`w-full justify-start text-left ${esTodoElEquipo ? "bg-green-100 text-green-800 border-green-300" : "bg-blue-100 text-blue-800 border-blue-300"}`}
            >
              <Users className="h-3 w-3 mr-2 flex-shrink-0" />
              <span className="text-sm font-medium">{tematica.participantesRecomendados}</span>
            </Badge>
          </div>
        )}
        
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{tematica.nombre}</CardTitle>
            <CardDescription className="text-base">{tematica.descripcion}</CardDescription>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Duración total: {duracionTotal} horas</span>
          </div>
        </div>
      </CardHeader>
      
      {tematica.actividades && tematica.actividades.length > 0 && (
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="p-2 text-left font-semibold">ACTIVIDAD</th>
                  <th className="p-2 text-left font-semibold">TIPO</th>
                  <th className="p-2 text-left font-semibold">HORAS</th>
                  <th className="p-2 text-left font-semibold">MODALIDAD</th>
                  <th className="p-2 text-left font-semibold">COMPETENCIAS</th>
                </tr>
              </thead>
              <tbody>
                {tematica.actividades.map((actividad, aIdx) => {
                  // Extraer horas de la duración
                  const horasMatch = actividad.duracion?.match(/(\d+)\s*hora/i);
                  const horas = horasMatch ? horasMatch[1] : actividad.duracion || "N/A";
                  
                  // Obtener competencias (pueden venir de diferentes campos)
                  const competencias = actividad.dimensionRelacionada 
                    ? [actividad.dimensionRelacionada]
                    : tematica.dimensionesRelacionadas || [];
                  
                  return (
                    <tr key={aIdx} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium">{actividad.topico}</div>
                        {actividad.descripcion && (
                          <div className="text-xs text-muted-foreground mt-1">{actividad.descripcion}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs capitalize">
                          {actividad.tipo?.replace('_', ' ') || 'Curso'}
                        </Badge>
                      </td>
                      <td className="p-3">{horas} hrs</td>
                      <td className="p-3 capitalize">{actividad.modalidad || 'Presencial'}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {competencias.slice(0, 2).map((comp, cIdx) => (
                            <Badge key={cIdx} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                              {comp}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function CapacitacionCompactCard({ capacitacion }: { capacitacion: any }) {
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{capacitacion.capacitacion}</CardTitle>
            <CardDescription className="text-base">{capacitacion.objetivo}</CardDescription>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {capacitacion.participantes && (
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                <Users className="h-3 w-3 mr-1" />
                {capacitacion.participantes}
              </Badge>
            )}
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{capacitacion.duracion}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      {capacitacion.temas && capacitacion.temas.length > 0 && (
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {capacitacion.temas.map((tema: string, idx: number) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {tema}
              </Badge>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}


