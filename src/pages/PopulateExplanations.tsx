/**
 * Página de utilidad para poblar las explicaciones de dimensiones
 * Esta página ejecuta el script generateAllDimensionExplanations
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { generateAllDimensionExplanations } from "@/lib/generateDimensionExplanations";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function PopulateExplanations() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  const handlePopulate = async () => {
    setLoading(true);
    setSuccess(false);
    setError(null);
    setMessage("");

    try {
      // Redirigir logs de console a nuestro estado
      const originalLog = console.log;
      const originalWarn = console.warn;
      const originalError = console.error;
      
      const logs: string[] = [];
      console.log = (...args) => {
        logs.push(args.join(" "));
        originalLog(...args);
      };
      console.warn = (...args) => {
        logs.push("⚠️ " + args.join(" "));
        originalWarn(...args);
      };
      console.error = (...args) => {
        logs.push("❌ " + args.join(" "));
        originalError(...args);
      };

      await generateAllDimensionExplanations();
      
      // Restaurar console
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;

      setMessage(logs.join("\n"));
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Error desconocido al poblar las explicaciones");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Poblar Explicaciones de Dimensiones</CardTitle>
          <CardDescription>
            Este proceso genera y almacena explicaciones dinámicas para todas las dimensiones de todos los instrumentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Las explicaciones se han generado y almacenado exitosamente.
              </AlertDescription>
            </Alert>
          )}

          {message && (
            <div className="bg-gray-50 p-4 rounded-md">
              <pre className="text-xs whitespace-pre-wrap font-mono">{message}</pre>
            </div>
          )}

          <Button
            onClick={handlePopulate}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando explicaciones...
              </>
            ) : (
              "Generar y Poblar Explicaciones"
            )}
          </Button>

          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Nota:</strong> Este proceso puede tardar varios minutos dependiendo de la cantidad de instrumentos y dimensiones.</p>
            <p>El proceso:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Procesa todos los instrumentos (A1, A3, A4, E1, E2, O1, O2, OTE, S2, D1, D2)</li>
              <li>Genera explicaciones para cada dimensión en 4 rangos de porcentaje (0-59, 60-74, 75-84, 85-100)</li>
              <li>Almacena las explicaciones en la base de datos</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

