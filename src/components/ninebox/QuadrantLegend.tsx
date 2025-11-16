import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NINE_BOX_METADATA, NineBoxPosition, getPositionColor } from "@/lib/nineBoxMetadata";
import { Info, HelpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuadrantInfo } from "./QuadrantInfo";
import { Button } from "@/components/ui/button";

interface QuadrantLegendProps {
  className?: string;
  showDetailedInfo?: boolean;
}

export function QuadrantLegend({ className = "", showDetailedInfo = false }: QuadrantLegendProps) {
  const positions: NineBoxPosition[][] = [
    ["bajo-alto", "medio-alto", "alto-alto"],
    ["bajo-medio", "medio-medio", "alto-medio"],
    ["bajo-bajo", "medio-bajo", "alto-bajo"],
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Leyenda de la Matriz 9-Box
            </CardTitle>
            <CardDescription className="mt-1">
              Comprenda el significado de cada cuadrante y las acciones recomendadas
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Explicación de los Ejes */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-sm text-blue-900 mb-2">¿Cómo se interpreta la matriz?</h4>
          <div className="space-y-2 text-sm text-blue-800">
            <p>
              <strong>Eje Horizontal (Desempeño):</strong> Mide los resultados actuales del colaborador.
              Refleja qué tan bien está cumpliendo con las expectativas de su rol.
            </p>
            <p>
              <strong>Eje Vertical (Potencial):</strong> Mide la capacidad de crecimiento y desarrollo futuro.
              Indica la probabilidad de éxito en roles de mayor responsabilidad.
            </p>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="text-center">
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                  Bajo: &lt; 50%
                </Badge>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                  Medio: 50-75%
                </Badge>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                  Alto: &gt; 75%
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de Cuadrantes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">Los 9 Cuadrantes</h4>
            {showDetailedInfo && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Ver Guía Completa
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Guía Completa de la Matriz 9-Box</DialogTitle>
                    <DialogDescription>
                      Información detallada sobre cada cuadrante, características y acciones recomendadas
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    {Object.values(NINE_BOX_METADATA).map((metadata) => (
                      <QuadrantInfo
                        key={metadata.key}
                        position={metadata.key}
                        showActions={true}
                        compact={false}
                      />
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Matriz Visual 3x3 */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <tbody>
                {positions.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((position) => {
                      const metadata = NINE_BOX_METADATA[position];
                      return (
                        <td
                          key={position}
                          className={`p-3 border ${getPositionColor(position)} cursor-help hover:opacity-80 transition-opacity`}
                        >
                          <Dialog>
                            <DialogTrigger asChild>
                              <div className="text-center">
                                <div className="text-xl mb-1">{metadata.icon}</div>
                                <div className="font-semibold text-xs mb-1">
                                  {metadata.shortName}
                                </div>
                                <div className="text-[10px] opacity-75 line-clamp-2">
                                  {metadata.label}
                                </div>
                              </div>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <span className="text-2xl">{metadata.icon}</span>
                                  {metadata.label}
                                </DialogTitle>
                                <DialogDescription>
                                  Información detallada sobre este cuadrante
                                </DialogDescription>
                              </DialogHeader>
                              <QuadrantInfo
                                position={position}
                                showActions={true}
                                compact={false}
                              />
                            </DialogContent>
                          </Dialog>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Etiquetas de los ejes */}
          <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">← Desempeño</span>
              <span className="text-red-600">Bajo</span>
              <span>|</span>
              <span className="text-yellow-600">Medio</span>
              <span>|</span>
              <span className="text-green-600">Alto →</span>
            </div>
            <div className="flex flex-col items-end text-right">
              <span className="font-medium">Potencial ↑</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-green-600">Alto</span>
                <span className="text-yellow-600">Medio</span>
                <span className="text-red-600">Bajo ↓</span>
              </div>
            </div>
          </div>
        </div>

        {/* Leyenda de Prioridades Estratégicas */}
        <div className="mt-6 space-y-3">
          <h4 className="font-semibold text-sm">Prioridades Estratégicas</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Importancia Estratégica Crítica */}
            <div className="border rounded-lg p-3 bg-red-50">
              <div className="font-medium text-sm text-red-900 mb-2">
                🎯 Importancia Crítica
              </div>
              <div className="space-y-1 text-xs text-red-800">
                <div>⭐ Estrellas / Talento Clave</div>
                <div className="text-[11px] opacity-75">
                  Máxima prioridad de retención y desarrollo
                </div>
              </div>
            </div>

            {/* Alta Prioridad */}
            <div className="border rounded-lg p-3 bg-orange-50">
              <div className="font-medium text-sm text-orange-900 mb-2">
                🔥 Alta Prioridad
              </div>
              <div className="space-y-1 text-xs text-orange-800">
                <div>💎 Alto Potencial | 🏛️ Pilares | ❓ Enigmas</div>
                <div className="text-[11px] opacity-75">
                  Requieren atención e inversión significativa
                </div>
              </div>
            </div>

            {/* Retención Urgente */}
            <div className="border rounded-lg p-3 bg-purple-50">
              <div className="font-medium text-sm text-purple-900 mb-2">
                🔒 Retención Urgente
              </div>
              <div className="space-y-1 text-xs text-purple-800">
                <div>⭐ Estrellas | 🎓 Expertos</div>
                <div className="text-[11px] opacity-75">
                  Alto riesgo de pérdida - acción inmediata
                </div>
              </div>
            </div>

            {/* Intervención Requerida */}
            <div className="border rounded-lg p-3 bg-amber-50">
              <div className="font-medium text-sm text-amber-900 mb-2">
                ⚡ Intervención Requerida
              </div>
              <div className="space-y-1 text-xs text-amber-800">
                <div>❓ Enigmas | ⚠️ Requieren Atención | 🔴 Bajo Rendimiento</div>
                <div className="text-[11px] opacity-75">
                  Plan de mejora o acción correctiva urgente
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Consejos Generales */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-sm text-blue-900 mb-2 flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Consejos para Usar la Matriz 9-Box
          </h4>
          <ul className="space-y-1.5 text-xs text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>
                <strong>No es permanente:</strong> Las posiciones pueden cambiar entre períodos.
                Use esto como herramienta de desarrollo, no de etiquetado.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>
                <strong>Diferencie inversión:</strong> No todos los empleados requieren el mismo nivel de
                atención. Priorice según importancia estratégica.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>
                <strong>Combine con conversaciones:</strong> La matriz es el inicio, no el fin.
                Úsela para guiar conversaciones de desarrollo y carrera.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>
                <strong>Monitoree movimientos:</strong> Preste atención a quiénes mejoran o empeoran
                su posición entre evaluaciones.
              </span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
