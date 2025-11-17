import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import logoMunicipalidad from "@/assets/logo-municipalidad.png";

const Login = () => {
  const [dpi, setDpi] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(dpi, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
      toast.error("Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center">
            <img 
              src={logoMunicipalidad} 
              alt="Logo Municipalidad de Esquipulas" 
              className="h-full w-full object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold">
            Sistema de Evaluación 180°
          </CardTitle>
          <CardDescription>
            Ingrese sus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dpi">DPI</Label>
              <Input
                id="dpi"
                type="text"
                placeholder="Ingrese su DPI"
                value={dpi}
                onChange={(e) => setDpi(e.target.value)}
                required
                maxLength={13}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                13 dígitos sin espacios ni guiones
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Ingrese su contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                Ingrese su fecha de nacimiento (DDMMAAAA) sin espacios ni guiones
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </Button>
          </form>

          <div className="mt-6 rounded-lg bg-muted p-4 text-sm">
            <p className="font-medium text-foreground">Usuarios de prueba:</p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>• Colaborador: 1234567890101 / 15081990</li>
              <li>• Jefe: 2345678901012 / 22031985</li>
              <li>• Admin RR.HH.: 3456789012103 / 10121988</li>
              <li>• Admin General: 9999999999999 / 01011980</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
