import { PlanCapacitacionEstructurado, TematicaCapacitacion } from "@/types/trainingPlan";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Target, TrendingUp, FileText, CheckCircle2, BookOpen, Layers } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface TrainingPlanStructuredProps {
  planEstructurado: PlanCapacitacionEstructurado;
}

// Funciones auxiliares compartidas
const getPrioridadColor = (prioridad: string) => {
  switch (prioridad) {
    case 'urgente':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'alta':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'media':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'baja':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getTipoColor = (tipo: string) => {
  switch (tipo) {
    case 'curso':
      return 'bg-blue-100 text-blue-800';
    case 'taller':
      return 'bg-green-100 text-green-800';
    case 'workshop':
      return 'bg-purple-100 text-purple-800';
    case 'mentoria':
      return 'bg-pink-100 text-pink-800';
    case 'autoaprendizaje':
      return 'bg-indigo-100 text-indigo-800';
    case 'practica_guiada':
      return 'bg-teal-100 text-teal-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getRecursoTipoColor = (tipo: string) => {
  switch (tipo) {
    case 'humano':
      return 'bg-blue-100 text-blue-800';
    case 'material':
      return 'bg-green-100 text-green-800';
    case 'presupuesto':
      return 'bg-yellow-100 text-yellow-800';
    case 'infraestructura':
      return 'bg-purple-100 text-purple-800';
    case 'tecnologico':
      return 'bg-indigo-100 text-indigo-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function TrainingPlanStructured({ planEstructurado }: TrainingPlanStructuredProps) {
  // Verificar si tiene la nueva estructura profesional
  const tieneEstructuraProfesional = planEstructurado.informacionGeneral || planEstructurado.programaCapacitacion;

  return (
    <div className="space-y-6">
      {/* Título del Plan */}
      <div className="text-center border-b pb-4">
        <h1 className="text-3xl font-bold mb-2">PLAN DE CAPACITACIÓN</h1>
        {planEstructurado.informacionGeneral && (
          <div className="space-y-1 text-muted-foreground">
            <p className="text-lg font-semibold">{planEstructurado.informacionGeneral.areaDepartamento}</p>
            <p>Período: {planEstructurado.informacionGeneral.periodo}</p>
            <p>Elaborado por: {planEstructurado.informacionGeneral.responsable}</p>
          </div>
        )}
      </div>

      {/* Información General */}
      {planEstructurado.informacionGeneral && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">1. Información General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Área/Departamento:</span>
                <p className="text-muted-foreground">{planEstructurado.informacionGeneral.areaDepartamento}</p>
              </div>
              <div>
                <span className="font-semibold">Responsable:</span>
                <p className="text-muted-foreground">{planEstructurado.informacionGeneral.responsable}</p>
              </div>
              <div>
                <span className="font-semibold">Total de colaboradores:</span>
                <p className="text-muted-foreground">{planEstructurado.informacionGeneral.totalColaboradores} personas</p>
              </div>
              <div>
                <span className="font-semibold">Período:</span>
                <p className="text-muted-foreground">{planEstructurado.informacionGeneral.periodo}</p>
              </div>
              <div className="col-span-2">
                <span className="font-semibold">Fecha de elaboración:</span>
                <p className="text-muted-foreground">{planEstructurado.informacionGeneral.fechaElaboracion}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Justificación */}
      {planEstructurado.justificacion && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">2. Justificación</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {planEstructurado.justificacion}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Objetivos */}
      {(planEstructurado.objetivoGeneral || planEstructurado.objetivosEspecificos) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">3. Objetivos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {planEstructurado.objetivoGeneral && (
              <div>
                <h4 className="font-semibold mb-2">3.1 Objetivo General</h4>
                <p className="text-sm text-muted-foreground">{planEstructurado.objetivoGeneral}</p>
              </div>
            )}
            {planEstructurado.objetivosEspecificos && planEstructurado.objetivosEspecificos.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">3.2 Objetivos Específicos</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {planEstructurado.objetivosEspecificos.map((obj, idx) => (
                    <li key={idx}>{obj}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detección de Necesidades */}
      {planEstructurado.deteccionNecesidades && planEstructurado.deteccionNecesidades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">4. Detección de Necesidades</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Las necesidades de capacitación fueron identificadas mediante:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {planEstructurado.deteccionNecesidades.map((necesidad, idx) => (
                <li key={idx}>{necesidad}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Programa de Capacitación - Tabla Principal */}
      {planEstructurado.programaCapacitacion && planEstructurado.programaCapacitacion.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">5. Programa de Capacitación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted">
                    <th className="p-2 text-left font-semibold">Capacitación</th>
                    <th className="p-2 text-left font-semibold">Objetivo</th>
                    <th className="p-2 text-left font-semibold">Participantes</th>
                    <th className="p-2 text-left font-semibold">Modalidad</th>
                    <th className="p-2 text-left font-semibold">Duración</th>
                    <th className="p-2 text-left font-semibold">Fecha</th>
                    <th className="p-2 text-left font-semibold">Instructor</th>
                  </tr>
                </thead>
                <tbody>
                  {planEstructurado.programaCapacitacion.map((cap, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div className="font-medium">{cap.capacitacion}</div>
                        <Badge className={`mt-1 ${getPrioridadColor(cap.prioridad)}`}>
                          {cap.prioridad.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-2 text-muted-foreground">{cap.objetivo}</td>
                      <td className="p-2">{cap.participantes}</td>
                      <td className="p-2 capitalize">{cap.modalidad}</td>
                      <td className="p-2">{cap.duracion}</td>
                      <td className="p-2">{cap.fecha}</td>
                      <td className="p-2">{cap.instructor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metodología */}
      {planEstructurado.metodologia && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">6. Metodología</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {planEstructurado.metodologia}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Evaluación y Seguimiento */}
      {planEstructurado.evaluacionSeguimiento && planEstructurado.evaluacionSeguimiento.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">7. Evaluación y Seguimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Se aplicarán los siguientes mecanismos de evaluación:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {planEstructurado.evaluacionSeguimiento.map((evalItem, idx) => (
                <li key={idx}>{evalItem}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Indicadores de Éxito */}
      {planEstructurado.indicadoresExito && planEstructurado.indicadoresExito.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">8. Indicadores de Éxito</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted">
                    <th className="p-2 text-left font-semibold">Indicador</th>
                    <th className="p-2 text-left font-semibold">Meta</th>
                  </tr>
                </thead>
                <tbody>
                  {planEstructurado.indicadoresExito.map((indicador, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{indicador.indicador}</td>
                      <td className="p-2 text-muted-foreground">{indicador.meta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estrategia de Implementación (legacy) */}
      {planEstructurado.estrategiaImplementacion && !tieneEstructuraProfesional && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Estrategia de Implementación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {planEstructurado.estrategiaImplementacion}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tabs para información adicional (solo si hay datos legacy o temáticas) */}
      {(planEstructurado.tematicas?.length > 0 || planEstructurado.objetivos?.length > 0 || planEstructurado.cronograma?.length > 0 || planEstructurado.recursos?.length > 0 || planEstructurado.metricasExito?.length > 0) && (
      <Tabs defaultValue={planEstructurado.tematicas && planEstructurado.tematicas.length > 0 ? "tematicas" : "objetivos"} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          {planEstructurado.tematicas && planEstructurado.tematicas.length > 0 && (
            <TabsTrigger value="tematicas">Temáticas</TabsTrigger>
          )}
          <TabsTrigger value="objetivos">Objetivos</TabsTrigger>
          {(!planEstructurado.tematicas || planEstructurado.tematicas.length === 0) && (
            <TabsTrigger value="actividades">Actividades</TabsTrigger>
          )}
          <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
          <TabsTrigger value="recursos">Recursos</TabsTrigger>
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
        </TabsList>

        {/* Tab: Temáticas Agrupadas */}
        {planEstructurado.tematicas && planEstructurado.tematicas.length > 0 && (
          <TabsContent value="tematicas" className="mt-4">
            <div className="space-y-4">
              {planEstructurado.tematicas.map((tematica, idx) => (
                <TematicaCard key={idx} tematica={tematica} index={idx} />
              ))}
            </div>
          </TabsContent>
        )}

        {/* Tab: Objetivos */}
        <TabsContent value="objetivos" className="mt-4">
          <div className="space-y-3">
            {planEstructurado.objetivos.map((objetivo, idx) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">{idx + 1}</span>
                    </div>
                    <p className="text-sm flex-1">{objetivo}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab: Actividades (solo si no hay temáticas) */}
        {(!planEstructurado.tematicas || planEstructurado.tematicas.length === 0) && (
          <TabsContent value="actividades" className="mt-4">
            <div className="space-y-4">
              {planEstructurado.actividades && planEstructurado.actividades.map((actividad, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{actividad.topico}</CardTitle>
                      <CardDescription className="mt-1">
                        {actividad.descripcion}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={getPrioridadColor(actividad.prioridad)}>
                        {actividad.prioridad.toUpperCase()}
                      </Badge>
                      <Badge className={getTipoColor(actividad.tipo)}>
                        {actividad.tipo.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Duración:</span>
                      <span className="font-medium">{actividad.duracion}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Modalidad:</span>
                      <span className="font-medium capitalize">{actividad.modalidad}</span>
                    </div>
                    {actividad.responsable && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Responsable:</span>
                        <span className="font-medium">{actividad.responsable}</span>
                      </div>
                    )}
                    {actividad.dimensionRelacionada && (
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Dimensión:</span>
                        <span className="font-medium text-xs">{actividad.dimensionRelacionada}</span>
                      </div>
                    )}
                  </div>
                  {actividad.recursosNecesarios && actividad.recursosNecesarios.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Recursos Necesarios:</p>
                      <div className="flex flex-wrap gap-2">
                        {actividad.recursosNecesarios.map((recurso, rIdx) => (
                          <Badge key={rIdx} variant="outline" className="text-xs">
                            {recurso}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {actividad.participantes && actividad.participantes.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Participantes:</p>
                      <div className="flex flex-wrap gap-2">
                        {actividad.participantes.map((participante, pIdx) => (
                          <Badge key={pIdx} variant="secondary" className="text-xs">
                            {participante}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        )}

        {/* Tab: Cronograma */}
        <TabsContent value="cronograma" className="mt-4">
          <div className="space-y-4">
            {planEstructurado.cronograma.map((item, idx) => {
              // Intentar obtener temática primero (nuevo formato)
              let nombre = '';
              let descripcion = '';
              
              if (planEstructurado.tematicas && planEstructurado.tematicas.length > 0) {
                const tematica = planEstructurado.tematicas[parseInt(item.actividad)];
                if (tematica) {
                  nombre = tematica.nombre;
                  descripcion = tematica.descripcion;
                }
              } else if (planEstructurado.actividades && planEstructurado.actividades.length > 0) {
                // Fallback a formato legacy
                const actividad = planEstructurado.actividades[parseInt(item.actividad)];
                if (actividad) {
                  nombre = actividad.topico;
                  descripcion = actividad.descripcion;
                }
              }
              
              if (!nombre) return null;
              
              return (
                <Card key={idx}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{nombre}</h4>
                        <p className="text-sm text-muted-foreground">{descripcion}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {item.fechaInicio} - {item.fechaFin}
                          </span>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`mt-2 ${
                            item.estado === 'completado' ? 'bg-green-50 text-green-700 border-green-300' :
                            item.estado === 'en_proceso' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                            'bg-gray-50 text-gray-700 border-gray-300'
                          }`}
                        >
                          {item.estado === 'planificado' ? 'Planificado' :
                           item.estado === 'en_proceso' ? 'En Proceso' :
                           item.estado === 'completado' ? 'Completado' :
                           'Cancelado'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab: Recursos */}
        <TabsContent value="recursos" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {planEstructurado.recursos.map((recurso, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{recurso.descripcion}</CardTitle>
                    <Badge className={getRecursoTipoColor(recurso.tipo)}>
                      {recurso.tipo}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {recurso.cantidad && (
                      <p>
                        <span className="text-muted-foreground">Cantidad:</span>{' '}
                        <span className="font-medium">{recurso.cantidad}</span>
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Disponible:</span>
                      {recurso.disponible ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Disponible
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                          Requiere adquisición
                        </Badge>
                      )}
                    </div>
                    {recurso.observaciones && (
                      <p className="text-muted-foreground italic mt-2">
                        {recurso.observaciones}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab: Métricas de Éxito */}
        <TabsContent value="metricas" className="mt-4">
          <div className="space-y-4">
            {planEstructurado.metricasExito.map((metrica, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      {metrica.nombre}
                    </CardTitle>
                    <Badge variant={metrica.tipo === 'cuantitativa' ? 'default' : 'secondary'}>
                      {metrica.tipo === 'cuantitativa' ? 'Cuantitativa' : 'Cualitativa'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {metrica.valorObjetivo && (
                      <p>
                        <span className="text-muted-foreground">Valor Objetivo:</span>{' '}
                        <span className="font-semibold text-primary">{metrica.valorObjetivo}</span>
                      </p>
                    )}
                    <p>
                      <span className="text-muted-foreground">Método de Medición:</span>{' '}
                      <span className="font-medium">{metrica.metodoMedicion}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Plazo:</span>{' '}
                      <span className="font-medium">{metrica.plazo}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}

// Componente para mostrar una temática agrupada
function TematicaCard({ tematica, index }: { tematica: TematicaCapacitacion; index: number }) {
  const [isOpen, setIsOpen] = useState(index < 2); // Abrir las primeras 2 por defecto

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-l-4 border-l-primary">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">{tematica.nombre}</CardTitle>
                </div>
                <CardDescription className="text-base mt-2">
                  {tematica.descripcion}
                </CardDescription>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge className={getPrioridadColor(tematica.prioridad)}>
                    {tematica.prioridad.toUpperCase()}
                  </Badge>
                  {tematica.nivelesAplicables && tematica.nivelesAplicables.length > 0 && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {tematica.nivelesAplicables.join(", ")}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0">
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Objetivo de la temática */}
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-start gap-2">
                <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-primary mb-1">Objetivo de la Temática</p>
                  <p className="text-sm">{tematica.objetivo}</p>
                </div>
              </div>
            </div>

            {/* Temas incluidos */}
            {tematica.temas && tematica.temas.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Temas incluidos:</p>
                <div className="flex flex-wrap gap-2">
                  {tematica.temas.map((tema, tIdx) => (
                    <Badge key={tIdx} variant="secondary" className="text-xs">
                      {tema}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Participantes recomendados */}
            {tematica.participantesRecomendados && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Participantes:</span>
                <span className="font-medium">{tematica.participantesRecomendados}</span>
              </div>
            )}

            {/* Dimensiones relacionadas */}
            {tematica.dimensionesRelacionadas && tematica.dimensionesRelacionadas.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Dimensiones:</span>
                <div className="flex flex-wrap gap-1">
                  {tematica.dimensionesRelacionadas.map((dim, dIdx) => (
                    <Badge key={dIdx} variant="outline" className="text-xs">
                      {dim}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actividades de la temática */}
            {tematica.actividades && tematica.actividades.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-semibold mb-3">Actividades de esta temática:</p>
                <div className="space-y-3">
                  {tematica.actividades.map((actividad, aIdx) => (
                    <Card key={aIdx} className="bg-muted/30">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-base">{actividad.topico}</CardTitle>
                            <CardDescription className="mt-1 text-sm">
                              {actividad.descripcion}
                            </CardDescription>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge className={getPrioridadColor(actividad.prioridad)}>
                              {actividad.prioridad.toUpperCase()}
                            </Badge>
                            <Badge className={getTipoColor(actividad.tipo)}>
                              {actividad.tipo.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Duración:</span>
                            <span className="font-medium">{actividad.duracion}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Modalidad:</span>
                            <span className="font-medium capitalize">{actividad.modalidad}</span>
                          </div>
                          {actividad.responsable && (
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Responsable:</span>
                              <span className="font-medium text-xs">{actividad.responsable}</span>
                            </div>
                          )}
                          {actividad.dimensionRelacionada && (
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Dimensión:</span>
                              <span className="font-medium text-xs">{actividad.dimensionRelacionada}</span>
                            </div>
                          )}
                        </div>
                        {actividad.recursosNecesarios && actividad.recursosNecesarios.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm font-medium mb-2">Recursos Necesarios:</p>
                            <div className="flex flex-wrap gap-2">
                              {actividad.recursosNecesarios.map((recurso, rIdx) => (
                                <Badge key={rIdx} variant="outline" className="text-xs">
                                  {recurso}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

