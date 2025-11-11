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
  const [isLoading, setIsLoading] = useState(true);

  // Cargar sesión persistente al iniciar
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        const sessionTimestamp = localStorage.getItem("session_timestamp");
        
        if (storedUser && sessionTimestamp) {
          // Verificar si la sesión no ha expirado (30 días)
          const sessionAge = Date.now() - parseInt(sessionTimestamp);
          const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 días en milisegundos
          
          if (sessionAge < maxAge) {
            const userObj = JSON.parse(storedUser);
            
            // Verificar que el usuario siga activo en Supabase
            try {
              const { supabase } = await import("@/integrations/supabase/client");
              const { data, error } = await supabase
                .from("users")
                .select("estado")
                .eq("dpi", userObj.dpi)
                .single();
              
              if (!error && data && data.estado === "activo") {
                setUser(userObj);
                setIsAuthenticated(true);
              } else {
                // Usuario inactivo o no encontrado, limpiar sesión
                localStorage.removeItem("user");
                localStorage.removeItem("session_timestamp");
              }
            } catch {
              // Si hay error al verificar, usar el usuario guardado (fallback)
              setUser(userObj);
              setIsAuthenticated(true);
            }
          } else {
            // Sesión expirada
            localStorage.removeItem("user");
            localStorage.removeItem("session_timestamp");
          }
        }
      } catch (error) {
        console.error("Error restoring session:", error);
        localStorage.removeItem("user");
        localStorage.removeItem("session_timestamp");
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (dpi: string, password: string) => {
    // Buscar usuario en Supabase primero, luego en mock
    let foundUser: User | null = null;
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("dpi", dpi)
        .single();
      
      if (!error && data) {
        foundUser = {
          dpi: data.dpi,
          nombre: data.nombre,
          apellidos: data.apellidos,
          fechaNacimiento: data.fecha_nacimiento,
          correo: data.correo,
          nivel: data.nivel,
          cargo: data.cargo,
          area: data.area,
          direccionUnidad: data.direccion_unidad,
          departamentoDependencia: data.departamento_dependencia,
          renglon: data.renglon,
          profesion: data.profesion,
          instrumentoId: data.instrumento_id, // Mapear override de instrumento
          rol: data.rol as User["rol"],
          estado: data.estado as "activo" | "inactivo",
          primerIngreso: data.primer_ingreso || false,
        };
      }
    } catch (error) {
      console.error("Error loading user from Supabase:", error);
    }
    
    // Si no se encuentra en Supabase, buscar en mock
    if (!foundUser) {
      foundUser = MOCK_USERS.find((u) => u.dpi === dpi) || null;
    }
    
    if (!foundUser) {
      throw new Error("DPI no encontrado");
    }

    // La contraseña SIEMPRE debe ser la fecha de nacimiento (formato DDMMAAAA)
    if (password !== foundUser.fechaNacimiento) {
      throw new Error("Contraseña incorrecta. Use su fecha de nacimiento (DDMMAAAA)");
    }

    setUser(foundUser);
    setIsAuthenticated(true);
    // Guardar usuario y timestamp de sesión para persistencia
    localStorage.setItem("user", JSON.stringify(foundUser));
    localStorage.setItem("session_timestamp", Date.now().toString());
    
    toast.success(`Bienvenido, ${foundUser.nombre}`);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    // Limpiar toda la información de sesión
    localStorage.removeItem("user");
    localStorage.removeItem("session_timestamp");
    toast.info("Sesión cerrada");
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isAuthenticated, isLoading }}
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
