import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileText, Edit, Plus, Eye, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getAllInstruments, getInstrumentsByLevel, registerInstrument } from "@/lib/instruments";
import { Instrument } from "@/types/evaluation";
import { getInstrumentConfig } from "@/lib/instruments";

const AdminInstrumentos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [instruments, setInstruments] = useState<Record<string, Instrument>>({});
  const [loading, setLoading] = useState(true);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);

  useEffect(() => {
    if (!user || (user.rol !== "admin_rrhh" && user.rol !== "admin_general")) {
      navigate("/dashboard");
      return;
    }
    loadInstruments();
  }, [user, navigate]);

  const loadInstruments = () => {
    try {
      const allInstruments = getAllInstruments();
      setInstruments(allInstruments);
    } catch (error) {
      console.error("Error loading instruments:", error);
      toast.error("Error al cargar instrumentos");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (instrument: Instrument) => {
    return (
      <Badge variant="outline" className="text-success border-success">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Activo
      </Badge>
    );
  };

  const handleViewInstrument = (instrument: Instrument) => {
    setSelectedInstrument(instrument);
    setShowViewDialog(true);
  };

  const getTotalItems = (instrument: Instrument): number => {
    const desempenoItems = instrument.dimensionesDesempeno.reduce((sum, dim) => sum + dim.items.length, 0);
    const potencialItems = instrument.dimensionesPotencial?.reduce((sum, dim) => sum + dim.items.length, 0) || 0;
    return desempenoItems + potencialItems;
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
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Administración de Instrumentos</h1>
          <p className="text-muted-foreground">
            Gestione los instrumentos de evaluación disponibles en el sistema
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Cargando instrumentos...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Resumen</CardTitle>
                <CardDescription>
                  Información general sobre los instrumentos disponibles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">Total de Instrumentos</p>
                    <p className="text-2xl font-bold text-primary">{Object.keys(instruments).length}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">Niveles Cubiertos</p>
                    <p className="text-2xl font-bold text-accent">
                      {new Set(Object.values(instruments).map(i => i.nivel)).size}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">Estado</p>
                    <Badge className="bg-success text-success-foreground">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Sistema Operativo
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Instrumentos Disponibles</CardTitle>
                <CardDescription>
                  Lista de todos los instrumentos configurados en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(instruments).length === 0 ? (
                  <div className="py-12 text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No hay instrumentos configurados aún</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Los instrumentos se configuran programáticamente por el equipo de desarrollo
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nivel</TableHead>
                        <TableHead>Versión</TableHead>
                        <TableHead>Dimensiones</TableHead>
                        <TableHead>Ítems</TableHead>
                        <TableHead>Tiempo Estimado</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.values(instruments).map((instrument) => {
                        const desempenoDimensions = instrument.dimensionesDesempeno.length;
                        const potencialDimensions = instrument.dimensionesPotencial?.length || 0;
                        const totalItems = getTotalItems(instrument);
                        
                        return (
                          <TableRow key={instrument.id}>
                            <TableCell className="font-medium">{instrument.id}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{instrument.nivel}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{instrument.version}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>Desempeño: {desempenoDimensions}</span>
                                {potencialDimensions > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    Potencial: {potencialDimensions}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{totalItems}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {instrument.tiempoEstimado || "N/A"}
                            </TableCell>
                            <TableCell>{getStatusBadge(instrument)}</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewInstrument(instrument)}
                              >
                                <Eye className="mr-1 h-3 w-3" />
                                Ver Detalles
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Dialog para ver detalles del instrumento */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalles del Instrumento</DialogTitle>
              <DialogDescription>
                Información completa del instrumento seleccionado
              </DialogDescription>
            </DialogHeader>
            
            {selectedInstrument && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label className="text-sm font-medium">ID</Label>
                    <p className="text-sm">{selectedInstrument.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Nivel</Label>
                    <Badge variant="outline">{selectedInstrument.nivel}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Versión</Label>
                    <p className="text-sm">{selectedInstrument.version}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Dimensiones de Desempeño</Label>
                  <div className="space-y-4">
                    {selectedInstrument.dimensionesDesempeno.map((dim, idx) => (
                      <Card key={dim.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base">
                                {idx + 1}. {dim.nombre}
                              </CardTitle>
                              <CardDescription className="mt-1">{dim.descripcion}</CardDescription>
                            </div>
                            <Badge variant="outline" className="ml-2">
                              Peso: {Math.round(dim.peso * 100)}%
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Ítems ({dim.items.length}):
                            </Label>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                              {dim.items.map((item) => (
                                <li key={item.id}>{item.texto}</li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {selectedInstrument.dimensionesPotencial && selectedInstrument.dimensionesPotencial.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Dimensiones de Potencial</Label>
                    <div className="space-y-4">
                      {selectedInstrument.dimensionesPotencial.map((dim, idx) => (
                        <Card key={dim.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-base">
                                  {idx + 1}. {dim.nombre}
                                </CardTitle>
                                <CardDescription className="mt-1">{dim.descripcion}</CardDescription>
                              </div>
                              <Badge variant="outline" className="ml-2">
                                Peso: {Math.round(dim.peso * 100)}%
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">
                                Ítems ({dim.items.length}):
                              </Label>
                              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                {dim.items.map((item) => (
                                  <li key={item.id}>{item.texto}</li>
                                ))}
                              </ul>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminInstrumentos;

