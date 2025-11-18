import React, { createContext, useContext, useState, useEffect } from "react";
import { User, AuthContextType } from "@/types/auth";
import { toast } from "sonner";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Funciones auxiliares para hash de contraseñas usando Web Crypto API
const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
};

// Mock users eliminados - ahora todos los usuarios deben estar en la base de datos

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
                .maybeSingle();
              
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
    let passwordHash: string | null = null;
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("dpi", dpi)
        .maybeSingle();
      
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
        passwordHash = data.password_hash || null;
      }
    } catch (error) {
      console.error("Error loading user from Supabase:", error);
    }
    
    if (!foundUser) {
      throw new Error("DPI no encontrado");
    }

    // Verificar contraseña: primero password_hash si existe, luego fecha_nacimiento como fallback
    let passwordValid = false;
    
    if (passwordHash) {
      // Usuario tiene contraseña personalizada
      passwordValid = await verifyPassword(password, passwordHash);
    } else {
      // Usuario usa fecha de nacimiento como contraseña (comportamiento por defecto)
      passwordValid = password === foundUser.fechaNacimiento;
    }

    if (!passwordValid) {
      if (passwordHash) {
        throw new Error("Contraseña incorrecta");
      } else {
        throw new Error("Contraseña incorrecta. Use su fecha de nacimiento (DDMMAAAA)");
      }
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

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) {
      throw new Error("No hay usuario autenticado");
    }

    // Validar que la nueva contraseña tenga al menos 8 caracteres
    if (newPassword.length < 8) {
      throw new Error("La nueva contraseña debe tener al menos 8 caracteres");
    }

    // Validar que la nueva contraseña no sea igual a la fecha de nacimiento
    if (newPassword === user.fechaNacimiento) {
      throw new Error("La nueva contraseña no puede ser igual a su fecha de nacimiento");
    }

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Obtener el usuario actual con password_hash
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("password_hash, fecha_nacimiento")
        .eq("dpi", user.dpi)
        .single();

      if (fetchError) throw fetchError;

      // Verificar contraseña actual
      let currentPasswordValid = false;
      if (userData.password_hash) {
        currentPasswordValid = await verifyPassword(currentPassword, userData.password_hash);
      } else {
        // Si no tiene password_hash, verificar contra fecha_nacimiento
        currentPasswordValid = currentPassword === userData.fecha_nacimiento;
      }

      if (!currentPasswordValid) {
        throw new Error("La contraseña actual es incorrecta");
      }

      // Hashear nueva contraseña
      const newPasswordHash = await hashPassword(newPassword);

      // Actualizar password_hash en la base de datos
      const { error: updateError } = await supabase
        .from("users")
        .update({ password_hash: newPasswordHash })
        .eq("dpi", user.dpi);

      if (updateError) throw updateError;

      toast.success("Contraseña actualizada exitosamente");
    } catch (error: any) {
      console.error("Error changing password:", error);
      throw new Error(error.message || "Error al cambiar la contraseña");
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, changePassword, isAuthenticated, isLoading }}
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
