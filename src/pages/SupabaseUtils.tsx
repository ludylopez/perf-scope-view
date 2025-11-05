import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Database,
  AlertCircle,
  FileText
} from "lucide-react";
import { 
  testSupabaseConnection, 
  checkTablesExist, 
  createPeriod2025,
  checkDatabaseStatus 
} from "@/lib/supabaseUtils";
import { toast } from "sonner";

const SupabaseUtils = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    if (user && (user.rol === "admin_rrhh" || user.rol === "admin_general")) {
      loadStatus();
    }
  }, [user]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const dbStatus = await checkDatabaseStatus();
      setStatus(dbStatus);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePeriod = async () => {
    setLoading(true);
    try {
      await createPeriod2025();
      await loadStatus();
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      await testSupabaseConnection();
      await loadStatus();
    } finally {
      setLoading(false);
    }
  };

  if (!user || (user.rol !== "admin_rrhh" && user.rol !== "admin_general")) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Solo administradores pueden acceder a esta página
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Utilidades de Supabase
            </h1>
            <p className="text-muted-foreground mt-2">
              Verificación y gestión de la base de datos
            </p>
          </div>
          <Button onClick={loadStatus} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        {/* Estado de Conexión */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Estado de Conexión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {status?.connection ? (
                  <>
                    <CheckCircle2 className="h-6 w-6 text-success" />
                    <span className="font-medium">Conexión exitosa</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-6 w-6 text-destructive" />
                    <span className="font-medium">Error de conexión</span>
                  </>
                )}
              </div>
              <Button variant="outline" onClick={handleTestConnection} disabled={loading}>
                Probar Conexión
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Estado de Tablas */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Estado de Tablas</CardTitle>
            <CardDescription>
              Verificación de existencia de tablas en la base de datos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {status?.tables && Object.entries(status.tables).map(([table, exists]: [string, any]) => (
                <div key={table} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-mono">{table}</span>
                  {exists ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Estado del Período */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Período 2025-1</CardTitle>
            <CardDescription>
              Verificación y creación del período de evaluación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {status?.period2025 ? (
                  <>
                    <CheckCircle2 className="h-6 w-6 text-success" />
                    <span className="font-medium">Período 2025-1 existe</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-6 w-6 text-warning" />
                    <span className="font-medium">Período 2025-1 no existe</span>
                  </>
                )}
              </div>
              {!status?.period2025 && (
                <Button onClick={handleCreatePeriod} disabled={loading}>
                  Crear Período 2025-1
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resumen */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Preguntas Abiertas:</span>
                <Badge variant={status?.openQuestions > 0 ? "default" : "secondary"}>
                  {status?.openQuestions || 0}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Tablas Creadas:</span>
                <Badge>
                  {status?.tables ? Object.values(status.tables).filter(Boolean).length : 0} / 9
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instrucciones */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Instrucciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p>
                <strong>1. Aplicar el esquema SQL:</strong> Si las tablas no existen, copia el contenido de 
                <code className="bg-muted px-2 py-1 rounded">supabase/migrations/001_initial_schema.sql</code> y 
                ejecútalo en el SQL Editor de Supabase.
              </p>
              <p>
                <strong>2. Crear período:</strong> Usa el botón arriba para crear el período 2025-1 automáticamente.
              </p>
              <p>
                <strong>3. Verificar en consola:</strong> Abre la consola del navegador y ejecuta{" "}
                <code className="bg-muted px-2 py-1 rounded">window.supabaseUtils.logStatus()</code> para más detalles.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SupabaseUtils;

