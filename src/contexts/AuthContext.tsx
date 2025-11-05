import React, { createContext, useContext, useState, useEffect } from "react";
import { User, AuthContextType } from "@/types/auth";
import { toast } from "sonner";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demonstration
const MOCK_USERS: User[] = [
  {
    dpi: "1234567890101",
    nombre: "Juan Carlos",
    apellidos: "Pérez López",
    fechaNacimiento: "15081990",
    correo: "juan.perez@ejemplo.com",
    nivel: "A1",
    cargo: "Director General",
    area: "Dirección",
    rol: "colaborador",
    estado: "activo",
    primerIngreso: false,
  },
  {
    dpi: "2345678901012",
    nombre: "María Elena",
    apellidos: "García Martínez",
    fechaNacimiento: "22031985",
    correo: "maria.garcia@ejemplo.com",
    nivel: "A2",
    cargo: "Subdirector",
    area: "Operaciones",
    jefeInmediato: "Juan Carlos Pérez López",
    rol: "jefe",
    estado: "activo",
    primerIngreso: false,
  },
  {
    dpi: "3456789012103",
    nombre: "Ana Sofía",
    apellidos: "Rodríguez Torres",
    fechaNacimiento: "10121988",
    correo: "ana.rodriguez@ejemplo.com",
    nivel: "D1",
    cargo: "Jefe de Departamento",
    area: "Recursos Humanos",
    jefeInmediato: "María Elena García Martínez",
    rol: "admin_rrhh",
    estado: "activo",
    primerIngreso: false,
  },
  {
    dpi: "4567890123104",
    nombre: "Roberto",
    apellidos: "Hernández Silva",
    fechaNacimiento: "05061992",
    correo: "roberto.hernandez@ejemplo.com",
    nivel: "S2",
    cargo: "Coordinador",
    area: "Tecnología",
    jefeInmediato: "María Elena García Martínez",
    rol: "colaborador",
    estado: "activo",
    primerIngreso: true,
  },
  {
    dpi: "9999999999999",
    nombre: "Admin",
    apellidos: "Sistema",
    fechaNacimiento: "01011980",
    correo: "admin@sistema.com",
    nivel: "A1",
    cargo: "Administrador del Sistema",
    area: "TI",
    rol: "admin_general",
    estado: "activo",
    primerIngreso: false,
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (dpi: string, password: string) => {
    const foundUser = MOCK_USERS.find((u) => u.dpi === dpi);
    
    if (!foundUser) {
      throw new Error("DPI no encontrado");
    }

    if (password !== foundUser.fechaNacimiento && password !== "nuevaclave123") {
      throw new Error("Contraseña incorrecta");
    }

    setUser(foundUser);
    setIsAuthenticated(true);
    localStorage.setItem("user", JSON.stringify(foundUser));
    
    toast.success(`Bienvenido, ${foundUser.nombre}`);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("user");
    toast.info("Sesión cerrada");
  };

  const changePassword = (newPassword: string) => {
    if (user) {
      const updatedUser = { ...user, primerIngreso: false };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success("Contraseña actualizada correctamente");
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, changePassword, isAuthenticated }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
