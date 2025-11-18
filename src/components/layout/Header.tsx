import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, User, Lock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getRoleName = (rol: string) => {
    const roles: Record<string, string> = {
      colaborador: "Colaborador",
      jefe: "Jefe Evaluador",
      admin_rrhh: "Admin RR.HH.",
      admin_general: "Administrador General",
      supervisor: "Supervisor", // Mantener por compatibilidad (debería migrarse a "jefe")
    };
    return roles[rol] || rol;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
            <span className="text-lg font-bold text-primary-foreground">E</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              Sistema de Evaluación 180°
            </h1>
            <p className="text-xs text-muted-foreground">
              Gestión de Desempeño y Potencial
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden md:inline">
                {user?.nombre} {user?.apellidos}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-2 text-sm">
              <p className="font-medium">{user?.nombre} {user?.apellidos}</p>
              <p className="text-xs text-muted-foreground">{user?.cargo}</p>
              <p className="text-xs text-muted-foreground">{user?.area}</p>
              <p className="mt-2 text-xs">
                <span className="font-medium">Rol:</span> {getRoleName(user?.rol || "")}
              </p>
              <p className="text-xs">
                <span className="font-medium">Nivel:</span> {user?.nivel}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/cambio-contrasena")}>
              <Lock className="mr-2 h-4 w-4" />
              Cambiar Contraseña
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
