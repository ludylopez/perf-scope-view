import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Download,
  Users,
  UserCheck,
  UserX,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  parsearArchivoAsignaciones,
  mapearColumnasAsignaciones,
  procesarAsignacionesImportadas,
  importarAsignacionesLote,
  descargarPlantillaAsignaciones,
  ImportedAssignment,
  ImportProgress
} from "@/lib/importAssignments";

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'results';

interface ColumnMapping {
  excelColumn: string;
  mappedTo: 'colaborador_dpi' | 'jefe_dpi' | 'grupo_id' | null;
  sampleValue: string;
}

interface ImportAssignmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

const FIELD_MAPPINGS = {
  colaborador_dpi: { 
    label: 'DPI Colaborador', 
    required: true, 
    examples: ['DPI COLABORADOR', 'COLABORADOR', 'EMPLEADO DPI', 'CUI COLABORADOR'] 
  },
  jefe_dpi: { 
    label: 'DPI Jefe/Evaluador', 
    required: true, 
    examples: ['DPI JEFE', 'JEFE', 'EVALUADOR DPI', 'SUPERVISOR', 'CUI JEFE'] 
  },
  grupo_id: { 
    label: 'ID Grupo (Opcional)', 
    required: false, 
    examples: ['GRUPO', 'EQUIPO', 'CUADRILLA', 'ID GRUPO'] 
  },
};

export const ImportAssignmentsDialog = ({ open, onOpenChange, onImportComplete }: ImportAssignmentsDialogProps) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<ImportedAssignment[]>([]);
  const [invalidData, setInvalidData] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [importProgress, setImportProgress] = useState<ImportProgress>({ current: 0, total: 0, percentage: 0 });
  const [importResults, setImportResults] = useState<{ 
    exitosos: number; 
    errores: Array<{ assignment: ImportedAssignment; error: string }> 
  } | null>(null);

  // Cargar usuarios al abrir el diálogo
  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("dpi, nombre, apellidos, cargo, nivel, area, rol")
        .eq("estado", "activo");

      if (error) throw error;
      setUsers(data || []);
      console.log(`✅ Usuarios cargados: ${data?.length || 0}`);
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast.error("Error al cargar usuarios del sistema");
    }
  };

  const resetDialog = useCallback(() => {
    setStep('upload');
    setFile(null);
    setExcelHeaders([]);
    setExcelData([]);
    setColumnMappings({});
    setPreviewData([]);
    setInvalidData([]);
    setWarnings([]);
    setImportProgress({ current: 0, total: 0, percentage: 0 });
    setImportResults(null);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(extension || '')) {
      toast.error('Formato de archivo no soportado. Use Excel (.xlsx, .xls) o CSV');
      return;
    }

    try {
      setFile(selectedFile);
      toast.info('Procesando archivo...');

      const parsed = await parsearArchivoAsignaciones(selectedFile);
      setExcelHeaders(parsed.headers);
      setExcelData(parsed.rows);

      // Auto-mapear columnas
      const autoMapping = mapearColumnasAsignaciones(parsed.headers);
      setColumnMappings(autoMapping);

      toast.success(`Archivo cargado: ${parsed.rows.length} registros encontrados`);
      setStep('mapping');
    } catch (error: any) {
      console.error('Error parsing file:', error);
      toast.error(error.message || 'Error al procesar el archivo');
    }
  };

  const handleMappingComplete = async () => {
    // Validar que campos requeridos estén mapeados
    const colaboradorMapped = Object.values(columnMappings).includes('colaborador_dpi');
    const jefeMapped = Object.values(columnMappings).includes('jefe_dpi');

    if (!colaboradorMapped || !jefeMapped) {
      toast.error('Debe mapear al menos DPI Colaborador y DPI Jefe');
      return;
    }

    try {
      toast.info('Validando asignaciones...');
      
      const processed = await procesarAsignacionesImportadas(
        excelData,
        columnMappings,
        users
      );

      setPreviewData(processed.valid);
      setInvalidData(processed.invalid);
      setWarnings(processed.warnings);

      if (processed.valid.length === 0) {
        toast.error('No hay asignaciones válidas para importar');
        return;
      }

      toast.success(`${processed.valid.length} asignaciones válidas encontradas`);
      setStep('preview');
    } catch (error: any) {
      console.error('Error processing:', error);
      toast.error('Error al procesar las asignaciones');
    }
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      toast.error('No hay asignaciones para importar');
      return;
    }

    setStep('importing');

    try {
      const results = await importarAsignacionesLote(
        previewData,
        (progress) => setImportProgress(progress),
        10
      );

      setImportResults(results);
      setStep('results');

      if (results.exitosos > 0) {
        toast.success(`${results.exitosos} asignaciones importadas exitosamente`);
        onImportComplete();
      }

      if (results.errores.length > 0) {
        toast.error(`${results.errores.length} asignaciones fallaron`);
      }
    } catch (error: any) {
      console.error('Error importing:', error);
      toast.error('Error durante la importación');
      setStep('preview');
    }
  };

  const handleDownloadTemplate = () => {
    descargarPlantillaAsignaciones();
    toast.success('Plantilla descargada');
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Asignaciones Masivas
          </DialogTitle>
          <DialogDescription>
            Importe asignaciones de jefes y colaboradores desde un archivo Excel o CSV
          </DialogDescription>
        </DialogHeader>

        {/* PASO 1: UPLOAD */}
        {step === 'upload' && (
          <div className="space-y-4">
            <Alert>
              <Download className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>¿Primera vez? Descargue una plantilla de ejemplo</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownloadTemplate}
                    className="ml-4"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Plantilla
                  </Button>
                </div>
              </AlertDescription>
            </Alert>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Arrastra tu archivo aquí o haz clic para seleccionar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Formatos soportados: Excel (.xlsx, .xls) o CSV
                  </p>
                </div>
              </Label>
              <input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {file && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Archivo seleccionado: <strong>{file.name}</strong>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* PASO 2: MAPPING */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Mapee cada columna de su archivo a los campos correspondientes. 
                Los campos marcados con * son obligatorios.
              </AlertDescription>
            </Alert>

            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {excelHeaders.map((header, index) => {
                  const sampleValue = excelData[0]?.[header] || '';
                  const currentMapping = columnMappings[header] || null;

                  return (
                    <Card key={index}>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                            {header}
                          </span>
                          <span className="text-xs text-muted-foreground font-normal">
                            Ejemplo: {sampleValue}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-3">
                        <Select
                          value={currentMapping || 'none'}
                          onValueChange={(value) => {
                            const newMappings = { ...columnMappings };
                            if (value === 'none') {
                              delete newMappings[header];
                            } else {
                              // Eliminar mapeo previo de este target
                              Object.keys(newMappings).forEach(key => {
                                if (newMappings[key] === value) {
                                  delete newMappings[key];
                                }
                              });
                              newMappings[header] = value;
                            }
                            setColumnMappings(newMappings);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="No mapear" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No mapear</SelectItem>
                            {Object.entries(FIELD_MAPPINGS).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                {config.label} {config.required && '*'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Atrás
              </Button>
              <Button onClick={handleMappingComplete}>
                Continuar a Vista Previa
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* PASO 3: PREVIEW */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{previewData.length + invalidData.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                    <UserCheck className="h-4 w-4" />
                    Válidas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{previewData.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                    <UserX className="h-4 w-4" />
                    Con Errores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{invalidData.length}</div>
                </CardContent>
              </Card>
            </div>

            {invalidData.length > 0 && (
              <Accordion type="single" collapsible>
                <AccordionItem value="errors">
                  <AccordionTrigger className="text-red-600">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Ver {invalidData.length} asignaciones con errores
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {invalidData.map((item, index) => (
                          <Alert key={index} variant="destructive">
                            <AlertDescription className="text-xs">
                              <div className="font-semibold mb-1">
                                Colaborador: {item.colaboradorDpi} → Jefe: {item.jefeDpi}
                              </div>
                              <ul className="list-disc list-inside space-y-1">
                                {item.errors.map((error: string, i: number) => (
                                  <li key={i}>{error}</li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </ScrollArea>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            <div>
              <h3 className="text-sm font-semibold mb-2">
                Vista previa de asignaciones válidas (primeras 20)
              </h3>
              <ScrollArea className="h-[300px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador DPI</TableHead>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Jefe DPI</TableHead>
                      <TableHead>Jefe</TableHead>
                      <TableHead>Grupo</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.slice(0, 20).map((assignment, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">{assignment.colaboradorDpi}</TableCell>
                        <TableCell className="text-xs">{assignment.colaboradorNombre}</TableCell>
                        <TableCell className="font-mono text-xs">{assignment.jefeDpi}</TableCell>
                        <TableCell className="text-xs">{assignment.jefeNombre}</TableCell>
                        <TableCell className="text-xs">{assignment.grupoId || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="default" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Válido
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Atrás
              </Button>
              <Button 
                onClick={handleImport}
                disabled={previewData.length === 0}
              >
                Importar {previewData.length} Asignaciones
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* PASO 4: IMPORTING */}
        {step === 'importing' && (
          <div className="space-y-4 py-8">
            <div className="text-center">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <h3 className="text-lg font-semibold mb-2">Importando asignaciones...</h3>
              <p className="text-sm text-muted-foreground">
                {importProgress.current} de {importProgress.total} procesadas
              </p>
            </div>
            <Progress value={importProgress.percentage} className="w-full" />
          </div>
        )}

        {/* PASO 5: RESULTS */}
        {step === 'results' && importResults && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {importResults.exitosos > 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  Importación Completada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Asignaciones exitosas:</span>
                    <Badge variant="default" className="bg-green-600">
                      {importResults.exitosos}
                    </Badge>
                  </div>
                  {importResults.errores.length > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Asignaciones fallidas:</span>
                      <Badge variant="destructive">
                        {importResults.errores.length}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {importResults.errores.length > 0 && (
              <Accordion type="single" collapsible>
                <AccordionItem value="import-errors">
                  <AccordionTrigger className="text-red-600">
                    Ver errores de importación
                  </AccordionTrigger>
                  <AccordionContent>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {importResults.errores.map((item, index) => (
                          <Alert key={index} variant="destructive">
                            <AlertDescription className="text-xs">
                              <div className="font-semibold">
                                {item.assignment.colaboradorNombre} → {item.assignment.jefeNombre}
                              </div>
                              <div>{item.error}</div>
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </ScrollArea>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            <DialogFooter>
              <Button onClick={handleClose}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
