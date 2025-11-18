import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const CambioContrasena = () => {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [usesDefaultPassword, setUsesDefaultPassword] = useState<boolean | null>(null);

  // Verificar si el usuario usa contraseña por defecto
  useEffect(() => {
    const checkPasswordStatus = async () => {
      if (!user) return;

      try {
        const { data, error: fetchError } = await supabase
          .from("users")
          .select("password_hash")
          .eq("dpi", user.dpi)
          .single();

        if (!fetchError && data) {
          setUsesDefaultPassword(data.password_hash === null);
        }
      } catch (error) {
        console.error("Error checking password status:", error);
      }
    };

    checkPasswordStatus();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validaciones
    if (!currentPassword) {
      setError("Por favor ingrese su contraseña actual");
      return;
    }

    if (!newPassword) {
      setError("Por favor ingrese una nueva contraseña");
      return;
    }

    if (newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (newPassword === currentPassword) {
      setError("La nueva contraseña debe ser diferente a la actual");
      return;
    }

    setIsLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      // Limpiar formulario
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setUsesDefaultPassword(false);
      toast.success("Contraseña actualizada exitosamente");
      // Opcional: redirigir después de un momento
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cambiar la contraseña");
      toast.error("Error al cambiar la contraseña");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No hay usuario autenticado</p>
          <Button onClick={() => navigate("/login")} className="mt-4">
            Ir al Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Button>
        </div>

        <div className="mx-auto max-w-md">
          <Card className="shadow-lg">
            <CardHeader className="space-y-3 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Cambiar Contraseña
              </CardTitle>
              <CardDescription>
                Establezca una contraseña personalizada para mayor seguridad
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usesDefaultPassword === true && (
                <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                  <CheckCircle2 className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                    Actualmente está usando su fecha de nacimiento como contraseña. 
                    Se recomienda cambiar a una contraseña personalizada por seguridad.
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Contraseña Actual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder={
                      usesDefaultPassword
                        ? "Ingrese su fecha de nacimiento (DDMMAAAA)"
                        : "Ingrese su contraseña actual"
                    }
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="text-base"
                    disabled={isLoading}
                  />
                  {usesDefaultPassword && (
                    <p className="text-xs text-muted-foreground">
                      Si aún no ha cambiado su contraseña, use su fecha de nacimiento
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva Contraseña</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="text-base"
                    disabled={isLoading}
                    minLength={8}
                  />
                  <p className="text-xs text-muted-foreground">
                    La contraseña debe tener al menos 8 caracteres y no puede ser igual a su fecha de nacimiento
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirme su nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="text-base"
                    disabled={isLoading}
                    minLength={8}
                  />
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
                      Cambiando contraseña...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Cambiar Contraseña
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CambioContrasena;

