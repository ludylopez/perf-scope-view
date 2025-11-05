import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { getAPIUsageStats, getGeminiApiKey } from "@/lib/gemini";

// Componente de configuración del sistema
const ConfiguracionSistema = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [usageStats, setUsageStats] = useState(getAPIUsageStats());
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    if (!user || (user.rol !== "admin_rrhh" && user.rol !== "admin_general")) {
      navigate("/dashboard");
      return;
    }
    loadStats();
    
    // Actualizar estadísticas cada 5 segundos
    const interval = setInterval(() => {
      loadStats();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [user, navigate]);

  const loadStats = () => {
    const stats = getAPIUsageStats();
    setUsageStats(stats);
    setHasApiKey(!!getGeminiApiKey());
  };

  // Calcular costo estimado (aproximado basado en precios de Gemini)
  // Gemini Flash: ~$0.075 por 1M tokens de entrada, ~$0.30 por 1M tokens de salida
  const calculateEstimatedCost = () => {
    // Usar tokens reales si están disponibles, sino estimar
    const totalTokens = usageStats.totalTokens || 0;
    const estimatedTokens = totalTokens > 0 
      ? totalTokens 
      : (usageStats.totalCalls || 0) * 2000; // Estimación conservadora: 2000 tokens por llamada
    
    // Costo promedio: ~$0.10 por 1M tokens (mezcla entrada/salida)
    const costPerMillion = 0.10;
    const estimatedCost = (estimatedTokens / 1000000) * costPerMillion;
    
    return {
      estimatedTokens,
      estimatedCost,
      costPerCall: costPerMillion / 500,
    };
  };

  const costInfo = calculateEstimatedCost();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-foreground mt-4">
            Configuración del Sistema
          </h1>
          <p className="text-muted-foreground mt-2">
            Estadísticas y configuración global de la plataforma
          </p>
        </div>

        {/* Estado de API de Google AI */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-info" />
              Estado de Google AI (Gemini)
            </CardTitle>
            <CardDescription>
              Información sobre el uso de la API de Google AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                {hasApiKey ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <div>
                      <p className="font-medium">API Key Configurada</p>
                      <p className="text-sm text-muted-foreground">
                        La generación automática de planes de desarrollo está habilitada
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-warning" />
                    <div>
                      <p className="font-medium">API Key No Configurada</p>
                      <p className="text-sm text-muted-foreground">
                        La API key se configura mediante variables de entorno en el servidor
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-2">Nota:</p>
              <p className="text-sm text-muted-foreground">
                La clave de API de Google AI se configura mediante la variable de entorno <code className="bg-muted px-1 rounded">VITE_GEMINI_API_KEY</code> en el servidor.
                Los administradores no pueden modificarla desde esta interfaz por seguridad.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas de Uso de API */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Estadísticas de Uso de IA
            </CardTitle>
            <CardDescription>
              Consumo de créditos y uso de la API de Google AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <div className="p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">Total de Llamadas</p>
                <p className="text-3xl font-bold text-primary">{usageStats.totalCalls || 0}</p>
              </div>

              <div className="p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">Llamadas Exitosas</p>
                <p className="text-3xl font-bold text-success">{usageStats.successfulCalls || 0}</p>
                {usageStats.totalCalls > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((usageStats.successfulCalls / usageStats.totalCalls) * 100)}% éxito
                  </p>
                )}
              </div>

              <div className="p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">Llamadas Fallidas</p>
                <p className="text-3xl font-bold text-destructive">{usageStats.failedCalls || 0}</p>
              </div>

              <div className="p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">Tokens Estimados</p>
                <p className="text-3xl font-bold text-info">{costInfo.estimatedTokens.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ~${costInfo.estimatedCost.toFixed(4)} USD estimado
                </p>
              </div>
            </div>

            {usageStats.lastCallDate && (
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm">
                  <span className="font-medium">Última llamada:</span>{" "}
                  {new Date(usageStats.lastCallDate).toLocaleString("es-GT", {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            )}

            {usageStats.totalCalls === 0 && (
              <div className="p-4 rounded-lg border border-muted text-center">
                <p className="text-sm text-muted-foreground">
                  Aún no se han realizado llamadas a la API de Google AI
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información adicional */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium mb-1">Estado de la API</p>
                <Badge variant={hasApiKey ? "default" : "secondary"}>
                  {hasApiKey ? "Configurada" : "No configurada"}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Uso</p>
                <p className="text-sm text-muted-foreground">
                  Generación automática de planes de desarrollo
                </p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-2">Notas importantes:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Las estadísticas se registran localmente en el navegador</li>
                <li>Los costos son estimaciones aproximadas basadas en el uso típico</li>
                <li>Para estadísticas precisas, consulta el dashboard de Google Cloud Console</li>
                <li>La API key se configura mediante variables de entorno del servidor</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ConfiguracionSistema;
