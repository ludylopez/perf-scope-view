import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { parsearArchivoUsuarios, importarUsuarios, ImportedUser, normalizarGenero } from "@/lib/importUsers";

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'results';

interface ColumnMapping {
  excelColumn: string;
  mappedTo: string | null;
  sampleValue: string;
}

interface ImportUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

const FIELD_MAPPINGS = {
  dpi: { label: 'DPI', required: true, examples: ['DPI', 'DOCUMENTO', 'CEDULA'] },
  nombre: { label: 'Nombre Completo', required: true, examples: ['NOMBRE', 'NOMBRE COMPLETO', 'EMPLEADO'] },
  fechaNacimiento: { label: 'Fecha de Nacimiento', required: true, examples: ['FECHA DE NACIMIENTO', 'NACIMIENTO', 'FECHA NAC'] },
  fechaIngreso: { label: 'Fecha de Ingreso', required: false, examples: ['FECHA DE INICIO LABORAL', 'FECHA INGRESO', 'INICIO'] },
  nivel: { label: 'Nivel de Puesto (Código)', required: true, examples: ['NIVEL DE PUESTO', 'CODIGO NIVEL', 'NIVEL'] },
  cargo: { label: 'Puesto/Cargo', required: true, examples: ['PUESTO', 'CARGO', 'POSICION'] },
  area: { label: 'Área/Departamento', required: true, examples: ['DEPARTAMENTO O DEPENDENCIA', 'DEPARTAMENTO', 'AREA', 'DIRECCION O UNIDAD'] },
  genero: { label: 'Género/Sexo', required: false, examples: ['SEXO', 'GENERO', 'GÉNERO'] },
  renglon: { label: 'Renglón', required: false, examples: ['RENGLON', 'RENGLÓN'] },
  profesion: { label: 'Profesión', required: false, examples: ['PROFESION', 'PROFESIÓN', 'OCUPACION'] },
};

export const ImportUsersDialog = ({ open, onOpenChange, onImportComplete }: ImportUsersDialogProps) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<ImportedUser[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ exitosos: number; errores: Array<{ usuario: ImportedUser; error: string }> } | null>(null);

  const resetDialog = useCallback(() => {
    setStep('upload');
    setFile(null);
    setExcelHeaders([]);
    setExcelData([]);
    setColumnMappings({});
    setPreviewData([]);
    setValidationErrors([]);
    setImportProgress(0);
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

    setFile(selectedFile);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as any[][];

      if (jsonData.length < 2) {
        toast.error('El archivo debe tener al menos una fila de encabezados y una fila de datos');
        return;
      }

      // Obtener headers (primera fila)
      const headers = jsonData[0].map(h => String(h).trim());
      setExcelHeaders(headers);

      // Obtener datos (resto de filas)
      setExcelData(jsonData.slice(1));

      // Auto-mapear columnas
      const autoMappings: Record<string, string> = {};
      headers.forEach(header => {
        const headerUpper = header.toUpperCase().trim();

        // Buscar coincidencia exacta o similar
        for (const [fieldKey, fieldConfig] of Object.entries(FIELD_MAPPINGS)) {
          if (fieldConfig.examples.some(example => headerUpper.includes(example.toUpperCase()))) {
            if (!autoMappings[fieldKey]) { // Solo mapear si aún no está mapeado
              autoMappings[fieldKey] = header;
            }
          }
        }
      });

      setColumnMappings(autoMappings);
      setStep('mapping');
      toast.success('Archivo cargado. Revisa el mapeo de columnas.');
    } catch (error: any) {
      console.error('Error reading file:', error);
      toast.error('Error al leer el archivo: ' + error.message);
    }
  };

  const handleMappingChange = (field: string, excelColumn: string) => {
    setColumnMappings(prev => ({
      ...prev,
      [field]: excelColumn
    }));
  };

  const validateMappings = (): boolean => {
    const errors: string[] = [];

    // Verificar campos requeridos
    Object.entries(FIELD_MAPPINGS).forEach(([fieldKey, fieldConfig]) => {
      if (fieldConfig.required && !columnMappings[fieldKey]) {
        errors.push(`El campo "${fieldConfig.label}" es requerido`);
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handlePreview = async () => {
    if (!validateMappings()) {
      toast.error('Por favor mapea todos los campos requeridos');
      return;
    }

    try {
      // Tomar las primeras 10 filas para preview
      const previewRows = excelData.slice(0, 10);
      const previewUsers: ImportedUser[] = [];
      const errors: string[] = [];

      previewRows.forEach((row, index) => {
        try {
          const dpiCol = excelHeaders.indexOf(columnMappings.dpi || '');
          const nombreCol = excelHeaders.indexOf(columnMappings.nombre || '');
          const fechaNacCol = excelHeaders.indexOf(columnMappings.fechaNacimiento || '');
          const fechaIngCol = columnMappings.fechaIngreso ? excelHeaders.indexOf(columnMappings.fechaIngreso) : -1;
          const nivelCol = excelHeaders.indexOf(columnMappings.nivel || '');
          const cargoCol = excelHeaders.indexOf(columnMappings.cargo || '');
          const areaCol = excelHeaders.indexOf(columnMappings.area || '');
          const generoCol = columnMappings.genero ? excelHeaders.indexOf(columnMappings.genero) : -1;

          const dpi = String(row[dpiCol] || '').trim().replace(/\s+/g, ' ');
          const nombreCompleto = String(row[nombreCol] || '').trim();
          const nivel = String(row[nivelCol] || '').trim().toUpperCase();
          const cargo = String(row[cargoCol] || '').trim();
          const area = String(row[areaCol] || '').trim();

          if (!dpi || !nombreCompleto || !nivel || !cargo || !area) {
            errors.push(`Fila ${index + 2}: Faltan datos requeridos`);
            return;
          }

          // Separar nombre y apellidos
          const partes = nombreCompleto.split(/\s+/);
          const nombre = partes[0] || '';
          const apellidos = partes.slice(1).join(' ') || '';

          // Procesar fechas (simplificado para preview)
          const fechaNacimiento = row[fechaNacCol] || '';
          const fechaIngreso = fechaIngCol >= 0 ? row[fechaIngCol] : '';
          const generoRaw = generoCol >= 0 ? String(row[generoCol] || '') : '';
          const generoNormalizado = generoRaw ? normalizarGenero(generoRaw) : undefined;

          previewUsers.push({
            dpi,
            nombre,
            apellidos,
            fechaNacimiento: String(fechaNacimiento),
            fechaIngreso: String(fechaIngreso),
            nivel,
            cargo,
            area,
            genero: generoNormalizado || undefined,
          });
        } catch (error: any) {
          errors.push(`Fila ${index + 2}: ${error.message}`);
        }
      });

      setPreviewData(previewUsers);
      setValidationErrors(errors);
      setStep('preview');
    } catch (error: any) {
      console.error('Error generating preview:', error);
      toast.error('Error al generar vista previa');
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setStep('importing');
    setImportProgress(0);

    try {
      // Parsear el archivo completo
      const { usuarios, errores } = await parsearArchivoUsuarios(file);

      if (usuarios.length === 0) {
        toast.error('No se pudieron procesar usuarios del archivo');
        setValidationErrors(errores);
        setStep('preview');
        return;
      }

      // Importar en lotes con progreso
      const BATCH_SIZE = 50;
      let totalImportados = 0;
      const allErrors: Array<{ usuario: ImportedUser; error: string }> = [];

      for (let i = 0; i < usuarios.length; i += BATCH_SIZE) {
        const batch = usuarios.slice(i, i + BATCH_SIZE);

        const { exitosos, errores: batchErrors } = await importarUsuarios(batch);

        totalImportados += exitosos;
        allErrors.push(...batchErrors);

        // Actualizar progreso
        const progress = Math.round(((i + batch.length) / usuarios.length) * 100);
        setImportProgress(progress);
      }

      setImportResults({
        exitosos: totalImportados,
        errores: allErrors
      });
      setStep('results');

      if (allErrors.length === 0) {
        toast.success(`${totalImportados} usuarios importados exitosamente`);
        onImportComplete();
      } else {
        toast.warning(`${totalImportados} importados, ${allErrors.length} con errores`);
      }
    } catch (error: any) {
      console.error('Error importing users:', error);
      toast.error('Error al importar usuarios: ' + error.message);
      setStep('preview');
    }
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const renderUploadStep = () => (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <Label htmlFor="file-upload" className="cursor-pointer">
          <div className="text-sm text-gray-600 mb-2">
            Click para seleccionar archivo o arrastra aquí
          </div>
          <div className="text-xs text-gray-500">
            Formatos soportados: Excel (.xlsx, .xls) o CSV
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

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Columnas esperadas:</strong>
          <ul className="mt-2 ml-4 list-disc text-sm">
            <li>DPI (requerido)</li>
            <li>Nombre Completo (requerido)</li>
            <li>Fecha de Nacimiento (requerido)</li>
            <li>Nivel de Puesto - Código (requerido, ej: O2, A1, D1)</li>
            <li>Puesto/Cargo (requerido)</li>
            <li>Área/Departamento (requerido)</li>
            <li>Fecha de Ingreso (opcional)</li>
            <li>Sexo/Género (opcional)</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderMappingStep = () => (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Verifica el mapeo automático de columnas. Los campos marcados con * son requeridos.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {Object.entries(FIELD_MAPPINGS).map(([fieldKey, fieldConfig]) => (
          <div key={fieldKey} className="grid grid-cols-2 gap-4 items-center">
            <Label className="text-right">
              {fieldConfig.label} {fieldConfig.required && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={columnMappings[fieldKey] || ''}
              onValueChange={(value) => handleMappingChange(fieldKey, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar columna" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">-- No mapear --</SelectItem>
                {excelHeaders.map(header => (
                  <SelectItem key={header} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc ml-4">
              {validationErrors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => setStep('upload')}>
          Atrás
        </Button>
        <Button onClick={handlePreview}>
          Vista Previa (10 filas)
        </Button>
      </DialogFooter>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Mostrando las primeras 10 filas. Total de filas en el archivo: <strong>{excelData.length}</strong>
        </AlertDescription>
      </Alert>

      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Errores encontrados:</div>
            <ul className="list-disc ml-4 text-sm max-h-32 overflow-y-auto">
              {validationErrors.slice(0, 10).map((error, i) => (
                <li key={i}>{error}</li>
              ))}
              {validationErrors.length > 10 && (
                <li>... y {validationErrors.length - 10} errores más</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="max-h-96 overflow-auto border rounded">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fila</TableHead>
              <TableHead>DPI</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Apellidos</TableHead>
              <TableHead>Nivel</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Área</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewData.map((user, index) => (
              <TableRow key={index}>
                <TableCell>{index + 2}</TableCell>
                <TableCell className="font-mono text-sm">{user.dpi}</TableCell>
                <TableCell>{user.nombre}</TableCell>
                <TableCell>{user.apellidos}</TableCell>
                <TableCell>
                  <Badge>{user.nivel}</Badge>
                </TableCell>
                <TableCell className="text-sm">{user.cargo}</TableCell>
                <TableCell className="text-sm">{user.area}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setStep('mapping')}>
          Ajustar Mapeo
        </Button>
        <Button onClick={handleImport} disabled={previewData.length === 0}>
          Importar {excelData.length} Usuarios
        </Button>
      </DialogFooter>
    </div>
  );

  const renderImportingStep = () => (
    <div className="space-y-4 py-8">
      <div className="text-center">
        <Upload className="mx-auto h-12 w-12 text-blue-500 animate-pulse mb-4" />
        <h3 className="text-lg font-semibold mb-2">Importando usuarios...</h3>
        <p className="text-sm text-gray-600 mb-4">Por favor espera mientras se importan los datos</p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progreso</span>
          <span>{importProgress}%</span>
        </div>
        <Progress value={importProgress} className="h-2" />
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          No cierres esta ventana hasta que termine la importación
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderResultsStep = () => (
    <div className="space-y-4">
      <div className="text-center py-4">
        {importResults && importResults.errores.length === 0 ? (
          <>
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-bold text-green-700 mb-2">
              ¡Importación Completada!
            </h3>
            <p className="text-gray-600">
              {importResults.exitosos} usuarios importados exitosamente
            </p>
          </>
        ) : (
          <>
            <AlertCircle className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
            <h3 className="text-xl font-bold text-yellow-700 mb-2">
              Importación con Advertencias
            </h3>
            <p className="text-gray-600">
              {importResults?.exitosos} usuarios importados,{' '}
              {importResults?.errores.length} con errores
            </p>
          </>
        )}
      </div>

      {importResults && importResults.errores.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Errores:</div>
            <div className="max-h-48 overflow-y-auto">
              <ul className="list-disc ml-4 text-sm space-y-1">
                {importResults.errores.slice(0, 20).map((err, i) => (
                  <li key={i}>
                    {err.usuario.nombre} {err.usuario.apellidos} ({err.usuario.dpi}): {err.error}
                  </li>
                ))}
                {importResults.errores.length > 20 && (
                  <li>... y {importResults.errores.length - 20} errores más</li>
                )}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <DialogFooter>
        <Button onClick={handleClose} className="w-full">
          Cerrar
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Usuarios desde Excel</DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Selecciona el archivo de Excel con los datos de usuarios'}
            {step === 'mapping' && 'Mapea las columnas del archivo a los campos del sistema'}
            {step === 'preview' && 'Revisa los datos antes de importar'}
            {step === 'importing' && 'Importando usuarios...'}
            {step === 'results' && 'Resultados de la importación'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && renderUploadStep()}
        {step === 'mapping' && renderMappingStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'importing' && renderImportingStep()}
        {step === 'results' && renderResultsStep()}
      </DialogContent>
    </Dialog>
  );
};
