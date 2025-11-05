import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Key, Save, Trash2, CheckCircle2, AlertCircle, Shield } from "lucide-react";
import { toast } from "sonner";
import { getGeminiApiKey, setGeminiApiKey, removeGeminiApiKey } from "@/lib/gemini";

const ConfiguracionSistema = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || (user.rol !== "admin_rrhh" && user.rol !== "admin_general")) {
      navigate("/dashboard");
      return;
    }
    loadApiKey();
  }, [user, navigate]);

  const loadApiKey = () => {
    const existingKey = getGeminiApiKey();
    setHasApiKey(!!existingKey);
    if (existingKey) {
      // Mostrar solo los últimos 4 caracteres para seguridad
      setApiKey("•".repeat(20) + existingKey.slice(-4));
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim() || apiKey.startsWith("•")) {
      toast.error("Por favor ingresa una clave de API válida");
      return;
    }

    try {
      setLoading(true);
      setGeminiApiKey(apiKey.trim());
      setHasApiKey(true);
      toast.success("Clave de API guardada correctamente");
      loadApiKey();
    } catch (error) {
      toast.error("Error al guardar la clave de API");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveApiKey = () => {
    if (!confirm("¿Está seguro de eliminar la clave de API? Esto deshabilitará la generación automática de planes de desarrollo con IA.")) {
      return;
    }

    removeGeminiApiKey();
    setHasApiKey(false);
    setApiKey("");
    toast.success("Clave de API eliminada");
  };

  const handleTestApiKey = async () => {
    const key = getGeminiApiKey();
    if (!key) {
      toast.error("No hay clave de API configurada");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Responde solo: OK" }] }],
          }),
        }
      );

      if (response.ok) {
        toast.success("Clave de API válida y funcionando");
      } else {
        toast.error("La clave de API no es válida");
      }
    } catch (error) {
      toast.error("Error al probar la clave de API");
    } finally {
      setLoading(false);
    }
  };

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
            Configuración global de la plataforma de evaluación
          </p>
        </div>

        {/* Configuración de API de Google AI */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-info" />
              Configuración de Google AI (Gemini)
            </CardTitle>
            <CardDescription>
              Clave de API para generación automática de planes de desarrollo con IA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-info/30 bg-info/5 p-4">
              <div className="flex gap-2">
                <Shield className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-info mb-1">Configuración Global</p>
                  <p className="text-muted-foreground">
                    Esta clave se usará en toda la plataforma para generar planes de desarrollo personalizados.
                    La clave se almacena localmente en el navegador del administrador.
                    Para producción, considera almacenarla de forma segura en el servidor.
                  </p>
                </div>
              </div>
            </div>

            {hasApiKey ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-success/5 border-success/20">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <div>
                      <p className="font-medium">Clave de API configurada</p>
                      <p className="text-sm text-muted-foreground">
                        La generación automática de planes de desarrollo está habilitada
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {apiKey}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleTestApiKey}
                      disabled={loading}
                    >
                      Probar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleRemoveApiKey}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-muted/50">
                  <p className="text-sm font-medium mb-2">Cambiar Clave de API</p>
                  <div className="space-y-2">
                    <Label htmlFor="newApiKey">Nueva Clave de API</Label>
                    <Input
                      id="newApiKey"
                      type="password"
                      placeholder="Ingresa la nueva clave de Google AI (Gemini)"
                      value={apiKey.startsWith("•") ? "" : apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Obtén tu clave en:{" "}
                      <a 
                        href="https://aistudio.google.com/app/apikey" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Google AI Studio
                      </a>
                    </p>
                    <Button 
                      onClick={handleSaveApiKey} 
                      disabled={loading || !apiKey.trim() || apiKey.startsWith("•")}
                      className="w-full"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Actualizar Clave
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                  <div className="flex gap-2">
                    <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-warning mb-1">Clave de API no configurada</p>
                      <p className="text-muted-foreground">
                        Sin esta clave, los planes de desarrollo se generarán de forma básica sin IA.
                        La generación automática con IA requiere una clave de Google AI.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">Clave de API de Google AI</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Ingresa tu clave de Google AI (Gemini)"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Obtén tu clave en:{" "}
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Google AI Studio
                    </a>
                  </p>
                </div>
                <Button 
                  onClick={handleSaveApiKey} 
                  disabled={loading || !apiKey.trim()}
                  className="w-full"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Clave de API
                </Button>
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
                <li>La clave de API se almacena localmente en el navegador del administrador</li>
                <li>Si cambias de navegador o limpias el almacenamiento, necesitarás configurarla nuevamente</li>
                <li>Para producción, considera almacenar la clave en variables de entorno del servidor</li>
                <li>Sin la clave, los planes de desarrollo seguirán generándose pero sin análisis de IA</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ConfiguracionSistema;

