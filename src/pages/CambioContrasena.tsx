import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const CambioContrasena = () => {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nuevaContrasena: "",
    confirmarContrasena: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!user.primerIngreso) {
      navigate("/dashboard");
      return;
    }
  }, [user, navigate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nuevaContrasena) {
      newErrors.nuevaContrasena = "La nueva contraseña es requerida";
    } else if (formData.nuevaContrasena.length < 6) {
      newErrors.nuevaContrasena = "La contraseña debe tener al menos 6 caracteres";
    }

    if (!formData.confirmarContrasena) {
      newErrors.confirmarContrasena = "Debe confirmar la contraseña";
    } else if (formData.nuevaContrasena !== formData.confirmarContrasena) {
      newErrors.confirmarContrasena = "Las contraseñas no coinciden";
    }

    // Validar que no sea la fecha de nacimiento
    if (user && formData.nuevaContrasena === user.fechaNacimiento) {
      newErrors.nuevaContrasena = "La contraseña no puede ser su fecha de nacimiento";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Guardar la nueva contraseña (en producción esto se haría en Supabase)
      // Por ahora, actualizamos el estado local
      changePassword(formData.nuevaContrasena);
      
      // También guardar en localStorage para persistencia
      const userData = localStorage.getItem("user");
      if (userData) {
        const userObj = JSON.parse(userData);
        localStorage.setItem(`password_${userObj.dpi}`, formData.nuevaContrasena);
      }
      
      toast.success("Contraseña actualizada correctamente");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Error al actualizar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  if (!user || !user.primerIngreso) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="space-y-3 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary">
                <Lock className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Cambio de Contraseña Obligatorio
              </CardTitle>
              <CardDescription>
                Por seguridad, debe cambiar su contraseña antes de continuar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nuevaContrasena">Nueva Contraseña</Label>
                  <Input
                    id="nuevaContrasena"
                    type="password"
                    placeholder="Ingrese su nueva contraseña"
                    value={formData.nuevaContrasena}
                    onChange={(e) =>
                      setFormData({ ...formData, nuevaContrasena: e.target.value })
                    }
                    required
                  />
                  {errors.nuevaContrasena && (
                    <p className="text-xs text-destructive">{errors.nuevaContrasena}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Mínimo 6 caracteres. No puede ser su fecha de nacimiento.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmarContrasena">Confirmar Contraseña</Label>
                  <Input
                    id="confirmarContrasena"
                    type="password"
                    placeholder="Confirme su nueva contraseña"
                    value={formData.confirmarContrasena}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmarContrasena: e.target.value })
                    }
                    required
                  />
                  {errors.confirmarContrasena && (
                    <p className="text-xs text-destructive">{errors.confirmarContrasena}</p>
                  )}
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Esta es su primera vez ingresando al sistema. Por favor, cambie su contraseña
                    por una más segura.
                  </AlertDescription>
                </Alert>

                <Button type="submit" className="w-full" disabled={loading} size="lg">
                  {loading ? "Actualizando..." : "Cambiar Contraseña"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CambioContrasena;

