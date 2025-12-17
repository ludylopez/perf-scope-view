import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getActivePeriod } from "@/lib/supabase";
import { generateReport, type ReportDoc } from "@/lib/consultingReport";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  StatCard,
  StatCardGrid,
  PerformanceDistributionChart,
  DistributionInterpretation,
  ScatterPlotCorrelation,
  CorrelationInterpretation,
  TreemapChart,
  RadarDimensiones,
  LollipopChart,
  InterpretationCard,
  StatsTable,
} from "@/components/charts";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { Loader2, AlertCircle, ArrowLeft, FileText, RefreshCw, Printer } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getPositionColor, type NineBoxPosition, NINE_BOX_METADATA } from "@/lib/nineBoxMetadata";

export default function InformeFinal() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<ReportDoc | null>(null);
  const [periodoNombre, setPeriodoNombre] = useState<string>("");
  const [mostrarNominal, setMostrarNominal] = useState(false);
  const [instrumentModalOpen, setInstrumentModalOpen] = useState(false);
  const [instrumentSelected, setInstrumentSelected] = useState<
    NonNullable<ReportDoc["artifacts"]>["instrumentosPorNivel"][number] | null
  >(null);

  const escapeHtml = (input: string) =>
    input
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const printInstrumentOnly = (inst: NonNullable<typeof instrumentSelected>) => {
    const metaTitle = meta?.titulo || "Informe";
    const entidad = meta?.entidad || "Entidad";
    const anio = meta?.anio || new Date().getFullYear();

    const pesos = `Jefe ${Math.round(inst.pesos.jefe * 100)}% / Auto ${Math.round(inst.pesos.auto * 100)}%`;
    const aplicaPotencial = inst.potencial.aplica ? "Sí" : "No";

    const renderDim = (d: any) => {
      const items = Array.isArray(d.items) ? d.items : [];
      return `
        <div class="dim">
          <div class="dim-head">
            <div>
              <div class="dim-title">${escapeHtml(String(d.nombre || "Sin nombre"))}</div>
              ${d.descripcion ? `<div class="dim-desc">${escapeHtml(String(d.descripcion))}</div>` : ""}
            </div>
            <div class="dim-meta">Peso: ${Number(d.peso).toFixed(2)} · Ítems: ${Number(d.itemsCount ?? items.length)}</div>
          </div>
          <table class="items-table" role="presentation">
            <tbody>
              ${items
                .map((it: any, idx: number) => {
                  const orden = Number.isFinite(it?.orden) ? it.orden : idx + 1;
                  const texto = String(it?.texto || "").trim() || "—";
                  return `<tr><td class="num mono">${escapeHtml(String(orden))}.</td><td class="txt">${escapeHtml(texto)}</td></tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      `;
    };

    const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(`Instrumento - ${inst.nivelNombre}`)}</title>
    <style>
      @page { size: A4; margin: 0.55cm; }
      /* Normalización solicitada: Arial tamaño 11 (impresión) */
      body { font-family: Arial, sans-serif; font-size: 11pt; color: #111827; margin: 10px; }
      .header { border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 16px; }
      .kicker { color: #6b7280; }
      h1 { font-size: 11pt; margin: 4px 0 0; font-weight: 700; }
      .meta { margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 14px; }
      .meta b { color: #111827; }
      h2 { font-size: 11pt; margin: 10px 0 6px; font-weight: 700; }
      ul { margin: 6px 0 0 16px; }
      ul li { margin: 2px 0; line-height: 1.2; }
      .dim { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; margin: 8px 0; break-inside: avoid; }
      .dim-head { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
      .dim-title { font-weight: 700; }
      .dim-desc { color: #374151; margin-top: 2px; line-height: 1.2; }
      .dim-meta { color: #6b7280; white-space: nowrap; }
      .items-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      .items-table td { border-bottom: 1px solid #e5e7eb; padding: 3px 6px; vertical-align: top; }
      .items-table tr:nth-child(even) td { background: #f9fafb; }
      .items-table .num { width: 38px; text-align: right; white-space: nowrap; color: #111827; }
      .items-table .txt { line-height: 1.2; }
      .mono { font-family: "Courier New", Courier, monospace; }
      @media print {
        body { margin: 0; }
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="kicker">${escapeHtml(entidad)} · ${escapeHtml(metaTitle)} · ${escapeHtml(String(anio))}</div>
      <h1>${escapeHtml(`Instrumento de evaluación — Nivel ${inst.nivelNombre} (${inst.nivel})`)}</h1>
      <div class="meta">
        <div><b>Aplica a nivel:</b> ${escapeHtml(inst.nivelNombre)} (${escapeHtml(inst.nivel)})</div>
        <div><b>Incluye potencial:</b> ${escapeHtml(aplicaPotencial)}</div>
        <div><b>Ponderación Auto/Jefe:</b> ${escapeHtml(pesos)}</div>
        <div><b>Escala:</b> Likert 1–5 (1 = menor grado, 5 = mayor grado)</div>
      </div>
    </div>

    <h2>Cómo se responde</h2>
    <ul>
      ${inst.explicacion.comoSeResponde.map((x) => `<li>${escapeHtml(String(x))}</li>`).join("")}
    </ul>

    <h2>Cómo se calcula</h2>
    <ul>
      ${inst.explicacion.comoSeCalcula.map((x) => `<li>${escapeHtml(String(x))}</li>`).join("")}
    </ul>

    <h2>Desempeño — Dimensiones e ítems</h2>
    ${inst.desempeno.dimensiones.map(renderDim).join("")}

    <h2>Potencial — Dimensiones e ítems</h2>
    ${inst.potencial.aplica ? inst.potencial.dimensiones.map(renderDim).join("") : `<div class="kicker">Este nivel no incluye evaluación de potencial.</div>`}

  </body>
</html>`;

    // Evitar bloqueadores de pop-ups: imprimir usando un iframe fuera de pantalla.
    // Nota: Edge puede imprimir en blanco si el iframe es 0x0 o display:none.
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.border = "0";
    iframe.style.opacity = "0.01";
    iframe.setAttribute("aria-hidden", "true");

    const cleanup = () => {
      try {
        iframe.remove();
      } catch {
        // no-op
      }
    };

    document.body.appendChild(iframe);

    try {
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      if (!doc || !win) return cleanup();

      doc.open();
      doc.write(html);
      doc.close();

      // Esperar un tick para que el navegador renderice antes de imprimir.
      setTimeout(() => {
        try {
          win.focus();
          win.print();
        } finally {
          // Cleanup con delay para no cortar el diálogo de impresión
          setTimeout(cleanup, 1000);
        }
      }, 250);
    } catch (e) {
      console.error(e);
      cleanup();
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const periodo = await getActivePeriod();
      if (!periodo) {
        setError("No se encontró un período de evaluación activo");
        return;
      }

      setPeriodoNombre(periodo.nombre);
      const report = await generateReport(periodo.id, {
        entidad: "Municipalidad de Esquipulas",
        titulo: "Informe Resultados de evaluación de desempeño 2025",
        anio: 2025,
      });
      setDoc(report);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Error generando el informe");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const artifacts = doc?.artifacts;

  // === Helpers para determinar si una sección tiene datos significativos ===
  const hasOutliersData = artifacts?.outliers &&
    (artifacts.outliers.stats.outliersAltos > 0 || artifacts.outliers.stats.outliersBajos > 0);

  const hasRiesgoRotacionData = artifacts?.riesgoRotacion &&
    (artifacts.riesgoRotacion.distribucion.alto > 0 || artifacts.riesgoRotacion.distribucion.critico > 0 || artifacts.riesgoRotacion.topRiesgo.length > 0);

  const hasLiderazgoCascadaData = artifacts?.liderazgoCascada &&
    artifacts.liderazgoCascada.jefesConEquipo.length > 0;

  const hasPerfilesData = artifacts?.perfiles &&
    artifacts.perfiles.clusters.length > 0;

  const hasBenchmarkingData = artifacts?.benchmarking &&
    artifacts.benchmarking.ranking.length >= 2;

  const hasCapacitacionData = artifacts?.capacitacion &&
    artifacts.capacitacion.temasPrioritarios.length > 0;

  // Solo mostrar demográfico si hay datos de EDAD significativos
  const hasDemograficoData = artifacts?.demografico &&
    artifacts.demografico.porEdad.length >= 2 && artifacts.demografico.porEdad.reduce((s, r) => s + r.n, 0) >= 10;

  const hasScatterAutoJefeData = (artifacts?.scatterAutoVsJefe ?? []).length >= 3;

  const hasScatterDesempenoPotencialData = (artifacts?.scatterDesempenoVsPotencial ?? []).length >= 3;

  const hasNineBoxData = artifacts?.nineBox && artifacts.nineBox.total > 0;

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Generando informe...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "No se pudo generar el informe"}</AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
          <Link to="/analisis">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a dashboards
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { metrics, executive } = doc;
  const meta = doc.meta;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-6 space-y-6">
        <style>{`
          @media print {
            .no-print { display: none !important; }
            .print-container { padding: 0 !important; }
            .print-page-break { break-after: page; page-break-after: always; }
            .print-avoid-break { break-inside: avoid; page-break-inside: avoid; }
          }
        `}</style>
        {/* Header */}
        <div className="flex items-center justify-between no-print">
          <div>
            <Link to="/analisis" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2">
              <ArrowLeft className="h-4 w-4" />
              Volver a dashboards
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8" />
              Informe Final (Autogenerado)
            </h1>
            <p className="text-muted-foreground mt-1">
              Período: <span className="font-semibold">{periodoNombre}</span> · Corte:{" "}
              <span className="font-mono">{metrics.fetchedAtISO}</span>
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={load}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerar
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir / PDF
            </Button>
          </div>
        </div>

        <Tabs defaultValue="documento" className="w-full">
          <TabsList className="grid w-full grid-cols-4 no-print">
            <TabsTrigger value="documento">Documento</TabsTrigger>
            <TabsTrigger value="ejecutivo">Ejecutivo</TabsTrigger>
            <TabsTrigger value="metricas">Métricas</TabsTrigger>
            <TabsTrigger value="auditoria">Auditable</TabsTrigger>
          </TabsList>

          <TabsContent value="documento" className="space-y-6 mt-6 print-container">
            <Card className="print-avoid-break">
              <CardHeader>
                <CardTitle className="text-2xl">{meta?.titulo || "Informe Final de Consultoría — Evaluación de Desempeño"}</CardTitle>
                <CardDescription>
                  <span className="font-semibold">{meta?.entidad || "Municipalidad"}</span>
                  {meta?.anio ? <> · <span className="font-semibold">{meta.anio}</span></> : null}
                  {" "}· Período activo: <span className="font-semibold">{periodoNombre}</span> · Corte de datos:{" "}
                  <span className="font-mono">{metrics.fetchedAtISO}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p>
                  Este documento presenta resultados, hallazgos y recomendaciones del proceso de evaluación de desempeño. Incluye una lectura ejecutiva para
                  RRHH/Gerencia y una capa técnica/auditable (fuentes, reglas y supuestos) para control interno.
                </p>

                <div className="no-print flex items-center justify-between gap-4 p-3 border rounded-md bg-white/60 dark:bg-white/5">
                  <div>
                    <p className="font-semibold">Datos nominales (DPI/nombre)</p>
                    <p className="text-xs text-muted-foreground">
                      Por defecto se muestran resultados agregados. Actívalo solo para uso interno de RRHH / Control Interno.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{mostrarNominal ? "Visible" : "Oculto"}</span>
                    <Switch checked={mostrarNominal} onCheckedChange={setMostrarNominal} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 border rounded-md bg-white/60 dark:bg-white/5">
                    <p className="font-semibold mb-1">Objetivo</p>
                    <p>Convertir resultados en decisiones: calibración, intervención, capacitación, PDI y gobernanza del ciclo anual.</p>
                  </div>
                  <div className="p-3 border rounded-md bg-white/60 dark:bg-white/5">
                    <p className="font-semibold mb-1">Alcance</p>
                    <p>Resultados finales del período, evaluaciones enviadas (auto/jefe) y planes de desarrollo registrados.</p>
                  </div>
                  <div className="p-3 border rounded-md bg-white/60 dark:bg-white/5">
                    <p className="font-semibold mb-1">Confidencialidad</p>
                    <p>El reporte muestra tendencias agregadas; evitar publicar listados nominales fuera de RRHH/Control Interno.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="no-print">
              <CardHeader>
                <CardTitle>Índice</CardTitle>
                <CardDescription>Navegación rápida por secciones del documento</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    { id: "sec-resumen", label: "1. Resumen ejecutivo", show: true },
                    { id: "sec-qa", label: "2. Calidad de datos (QA) y trazabilidad", show: true },
                    { id: "sec-global", label: "3. Resultados globales y distribución", show: true },
                    { id: "sec-participacion", label: "4. Participación por nivel", show: true },
                    { id: "sec-nivel", label: "5. Análisis por nivel jerárquico", show: true },
                    { id: "sec-direcciones", label: "6. Análisis por dirección / unidad", show: true },
                    { id: "sec-demografico", label: "7. Análisis demográfico", show: hasDemograficoData },
                    { id: "sec-brecha", label: "8. Brecha Auto vs Jefe", show: hasScatterAutoJefeData },
                    { id: "sec-potencial", label: "9. Desempeño vs Potencial (9-Box)", show: hasScatterDesempenoPotencialData },
                    { id: "sec-9box", label: "10. Matriz 9-Box", show: hasNineBoxData },
                    { id: "sec-outliers", label: "11. Análisis de Outliers", show: hasOutliersData },
                    { id: "sec-riesgo", label: "12. Riesgo de Rotación", show: hasRiesgoRotacionData },
                    { id: "sec-liderazgo", label: "13. Liderazgo en Cascada", show: hasLiderazgoCascadaData },
                    { id: "sec-perfiles", label: "14. Clustering de Perfiles", show: hasPerfilesData },
                    { id: "sec-benchmarking", label: "15. Benchmarking Interno", show: hasBenchmarkingData },
                    { id: "sec-dimensiones", label: "16. Análisis por dimensión", show: true },
                    { id: "sec-capacitacion", label: "17. Necesidades de Capacitación", show: hasCapacitacionData },
                    { id: "sec-pdi", label: "18. Planes de desarrollo (PDI)", show: true },
                    { id: "sec-dependencias", label: "19. Listado por dependencia", show: true },
                    { id: "sec-anexos", label: "Anexos técnicos", show: true },
                    { id: "sec-anexo-instrumentos", label: "Anexo — Instrumentos por nivel", show: true },
                  ].filter(x => x.show).map((x) => (
                    <a key={x.id} href={`#${x.id}`} className="text-primary hover:underline">
                      {x.label}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>

            <DocSection id="sec-resumen" title="1. Resumen ejecutivo" subtitle="Lectura para RRHH y Gerencia">
              <div className="space-y-4">
                <p className="text-sm">{executive.headline}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg bg-white/60 dark:bg-white/5">
                    <h3 className="font-semibold mb-2">Hallazgos clave</h3>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      {executive.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg bg-white/60 dark:bg-white/5">
                    <h3 className="font-semibold mb-2">Riesgos/alertas</h3>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      {executive.risks.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg bg-white/60 dark:bg-white/5">
                    <h3 className="font-semibold mb-2">Recomendaciones priorizadas</h3>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      {executive.recommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Card className="bg-white/60 dark:bg-white/5 print-avoid-break">
                  <CardHeader>
                    <CardTitle className="text-base">KPIs de cierre (corte actual)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StatCardGrid columns={4}>
                      <StatCard title="Participación" value={metrics.coverage.tasaParticipacion} format="percentage" subtitle={`${metrics.coverage.totalEvaluados}/${metrics.coverage.totalActivos}`} />
                      <StatCard title="Desempeño (promedio)" value={metrics.desempeno.promedio} format="percentage" subtitle={`Mediana ${metrics.desempeno.mediana.toFixed(1)}%`} />
                      <StatCard title="Dispersión (DE)" value={metrics.desempeno.desviacion} format="decimal" subtitle="Desviación estándar" />
                      <StatCard title="Brecha Jefe−Auto" value={metrics.brechaAutoJefe.brecha} format="decimal" subtitle={`r=${metrics.brechaAutoJefe.correlacion.toFixed(3)}`} />
                    </StatCardGrid>
                  </CardContent>
                </Card>

                <Card className="print-avoid-break">
                  <CardHeader>
                    <CardTitle className="text-base">Plan 30 / 60 / 90 días (implementación)</CardTitle>
                    <CardDescription>Acciones mínimas para que el proceso sea sostenible y auditable</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">30 días</h3>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        {executive.nextSteps306090.d30.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">60 días</h3>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        {executive.nextSteps306090.d60.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">90 días</h3>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        {executive.nextSteps306090.d90.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </DocSection>

            <DocSection id="sec-qa" title="2. Calidad de datos (QA) y trazabilidad" subtitle="Evidencia mínima para auditoría y control interno">
              <div className="space-y-4">
                <p className="text-sm">
                  Esta sección resume “qué tan completo” está el dataset del período: cobertura, campos críticos faltantes y supuestos aplicados. En Municipalidad,
                  esto facilita que Control Interno valide el proceso sin re-ejecutar cálculos manuales.
                </p>

                <StatCardGrid columns={4}>
                  <StatCard title="Resultados sin potencial" value={artifacts?.qa.resultadosSinPotencial ?? 0} subtitle="final_evaluation_results.potencial_porcentaje" color={(artifacts?.qa.resultadosSinPotencial ?? 0) > 0 ? "warning" : "success"} />
                  <StatCard title="Resultados sin 9-Box" value={artifacts?.qa.resultadosSin9Box ?? 0} subtitle="final_evaluation_results.posicion_9box" color={(artifacts?.qa.resultadosSin9Box ?? 0) > 0 ? "warning" : "success"} />
                  <StatCard title="Activos sin nivel" value={artifacts?.qa.usuariosSinNivel ?? 0} subtitle="users.nivel" color={(artifacts?.qa.usuariosSinNivel ?? 0) > 0 ? "warning" : "success"} />
                  <StatCard title="Activos sin dirección" value={artifacts?.qa.usuariosSinDireccion ?? 0} subtitle="users.direccion_unidad / users.area" color={(artifacts?.qa.usuariosSinDireccion ?? 0) > 0 ? "warning" : "success"} />
                </StatCardGrid>

                <Card className="print-avoid-break">
                  <CardHeader>
                    <CardTitle className="text-base">Fuentes y reglas</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p><span className="font-semibold">Fuentes:</span> evaluation_periods, users, evaluations, final_evaluation_results, job_levels, development_plans</p>
                    <p><span className="font-semibold">Inclusión:</span> evaluaciones con <span className="font-mono">estado=enviado</span> y resultados finales del período.</p>
                    <p><span className="font-semibold">Escala:</span> auto/jefe se calcula en 1–5 y se convierte a 0–100 con la misma función del sistema.</p>
                    <p><span className="font-semibold">Brecha Auto vs Jefe:</span> se reporta como <span className="font-mono">Jefe − Auto</span> (puntos porcentuales).</p>
                  </CardContent>
                </Card>
              </div>
            </DocSection>

            <DocSection id="sec-global" title="3. Resultados globales y distribución" subtitle="Qué tan bien está la organización y cuánta dispersión existe">
              <div className="space-y-4">
                <p className="text-sm">
                  La lectura global combina centralidad (media/mediana) y dispersión (DE), para detectar si el desempeño es homogéneo o si existen brechas fuertes
                  entre unidades/niveles. Una dispersión elevada suele indicar heterogeneidad real y/o falta de calibración entre evaluadores.
                </p>

                <PerformanceDistributionChart
                  data={artifacts?.distribucionDesempeno ?? []}
                  mean={metrics.desempeno.promedio}
                  median={metrics.desempeno.mediana}
                  description="Clasificación por rangos (coherente con dashboards del módulo estadístico)."
                />

                <DistributionInterpretation
                  mean={metrics.desempeno.promedio}
                  median={metrics.desempeno.mediana}
                  stdDev={metrics.desempeno.desviacion}
                  skewness={metrics.desempeno.skewness}
                  kurtosis={metrics.desempeno.kurtosis}
                  variableName="calificaciones de desempeño (0–100)"
                />
              </div>
            </DocSection>

            <DocSection id="sec-participacion" title="4. Participación por nivel" subtitle="Representatividad y riesgo de sesgo">
              <div className="space-y-4">
                <p className="text-sm">
                  Una participación baja (global o por nivel) introduce sesgos: las conclusiones por segmento pueden reflejar solo a quienes completaron el proceso.
                  Aquí se muestra cobertura por nivel (activos vs evaluados).
                </p>

                <Card className="print-avoid-break">
                  <CardHeader>
                    <CardTitle className="text-base">Cobertura por nivel</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Nivel</th>
                          <th className="text-right py-2">Activos</th>
                          <th className="text-right py-2">Evaluados</th>
                          <th className="text-right py-2">Participación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(artifacts?.participacionPorNivel ?? []).map((r) => (
                          <tr key={r.nivel} className="border-b">
                            <td className="py-2">{r.nombre}</td>
                            <td className="py-2 text-right font-mono">{r.total}</td>
                            <td className="py-2 text-right font-mono">{r.evaluados}</td>
                            <td className="py-2 text-right font-mono">{r.porcentaje.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            </DocSection>

            <DocSection id="sec-nivel" title="5. Análisis por nivel jerárquico" subtitle="Desempeño por nivel de puesto con estadísticas detalladas">
              <div className="space-y-4">
                <p className="text-sm">
                  Este análisis permite comparar el desempeño entre los diferentes niveles de la estructura organizacional. Los niveles superiores
                  suelen tener menor variabilidad y mayor promedio, pero es importante verificar esta hipótesis con los datos.
                </p>

                {artifacts?.analisisPorNivel && artifacts.analisisPorNivel.length > 0 ? (
                  <>
                    <Card className="print-avoid-break">
                      <CardHeader>
                        <CardTitle className="text-base">Ranking por Nivel Jerárquico</CardTitle>
                        <CardDescription>Ordenado por promedio de desempeño (mayor a menor)</CardDescription>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">#</th>
                              <th className="text-left py-2">Nivel</th>
                              <th className="text-right py-2">n</th>
                              <th className="text-right py-2">Promedio</th>
                              <th className="text-right py-2">Mediana</th>
                              <th className="text-right py-2">DE</th>
                              <th className="text-right py-2">Mín</th>
                              <th className="text-right py-2">Máx</th>
                            </tr>
                          </thead>
                          <tbody>
                            {artifacts.analisisPorNivel.map((n) => (
                              <tr key={n.nivel} className="border-b">
                                <td className="py-2 font-mono">{n.ranking}</td>
                                <td className="py-2">{n.nombre}</td>
                                <td className="py-2 text-right font-mono">{n.n}</td>
                                <td className="py-2 text-right font-mono font-semibold">{n.promedioDesempeno.toFixed(1)}%</td>
                                <td className="py-2 text-right font-mono">{n.mediana.toFixed(1)}%</td>
                                <td className="py-2 text-right font-mono text-muted-foreground">{n.desviacion.toFixed(1)}</td>
                                <td className="py-2 text-right font-mono text-muted-foreground">{n.min.toFixed(1)}%</td>
                                <td className="py-2 text-right font-mono text-muted-foreground">{n.max.toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>

                    <Card className="print-avoid-break">
                      <CardHeader>
                        <CardTitle className="text-base">Distribución por Nivel</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={artifacts.analisisPorNivel} layout="vertical" margin={{ left: 120 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" domain={[0, 100]} />
                            <YAxis type="category" dataKey="nombre" width={110} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(val: number) => `${val.toFixed(1)}%`} />
                            <Bar dataKey="promedioDesempeno" fill="#3b82f6" name="Promedio" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay datos de niveles disponibles.</p>
                )}
              </div>
            </DocSection>

            <DocSection id="sec-direcciones" title="6. Análisis por dirección / unidad" subtitle="Brechas de gestión y focalización de intervención">
              <div className="space-y-4">
                <p className="text-sm">
                  El ranking por dirección ayuda a priorizar intervención. Se recomienda filtrar por tamaño mínimo (n) para evitar conclusiones sobre muestras muy
                  pequeñas. La tabla incluye participación y desempeño promedio.
                </p>

                <Card className="print-avoid-break">
                  <CardHeader>
                    <CardTitle className="text-base">Ranking por dirección (Top 15 por desempeño)</CardTitle>
                    <CardDescription>Ordenado por desempeño promedio. Útil para calibración y focalización.</CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Dirección</th>
                          <th className="text-right py-2">Activos</th>
                          <th className="text-right py-2">Evaluados</th>
                          <th className="text-right py-2">Participación</th>
                          <th className="text-right py-2">Desempeño</th>
                          <th className="text-right py-2">Potencial</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(artifacts?.rankingDirecciones ?? []).slice(0, 15).map((d) => (
                          <tr key={d.direccion} className="border-b">
                            <td className="py-2">{d.direccion}</td>
                            <td className="py-2 text-right font-mono">{d.totalColaboradores}</td>
                            <td className="py-2 text-right font-mono">{d.evaluados}</td>
                            <td className="py-2 text-right font-mono">{d.tasaParticipacion.toFixed(1)}%</td>
                            <td className="py-2 text-right font-mono">{d.promedioDesempeno.toFixed(1)}%</td>
                            <td className="py-2 text-right font-mono">{d.promedioPotencial !== undefined ? `${d.promedioPotencial.toFixed(1)}%` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            </DocSection>

            {hasDemograficoData && (
            <DocSection id="sec-demografico" title="7. Análisis demográfico" subtitle="Correlación entre edad, antigüedad y desempeño">
              <div className="space-y-4">
                <p className="text-sm">
                  El análisis demográfico permite identificar si existen patrones relacionados con la edad o antigüedad de los colaboradores.
                  Correlaciones significativas pueden indicar necesidad de programas específicos para diferentes grupos etarios o de antigüedad.
                </p>

                {artifacts?.demografico && (
                  <>
                    <StatCardGrid columns={4}>
                      <StatCard
                        title="Correlación Edad-Desempeño"
                        value={artifacts.demografico.correlacionEdad}
                        format="decimal"
                        subtitle={artifacts.demografico.interpretacionEdad}
                        color={Math.abs(artifacts.demografico.correlacionEdad) >= 0.3 ? "warning" : "success"}
                      />
                      <StatCard
                        title="Correlación Antigüedad-Desempeño"
                        value={artifacts.demografico.correlacionAntiguedad}
                        format="decimal"
                        subtitle={artifacts.demografico.interpretacionAntiguedad}
                        color={Math.abs(artifacts.demografico.correlacionAntiguedad) >= 0.3 ? "warning" : "success"}
                      />
                      <StatCard
                        title="Colaboradores con edad"
                        value={artifacts.demografico.porEdad.reduce((s, r) => s + r.n, 0)}
                        subtitle="Con fecha de nacimiento registrada"
                      />
                      <StatCard
                        title="Colaboradores con antigüedad"
                        value={artifacts.demografico.porAntiguedad.reduce((s, r) => s + r.n, 0)}
                        subtitle="Con fecha de ingreso registrada"
                      />
                    </StatCardGrid>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="print-avoid-break">
                        <CardHeader>
                          <CardTitle className="text-base">Desempeño por Rango de Edad</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {artifacts.demografico.porEdad.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart data={artifacts.demografico.porEdad}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="rango" />
                                <YAxis domain={[0, 100]} />
                                <Tooltip formatter={(val: number) => `${val.toFixed(1)}%`} />
                                <Bar dataKey="promedio" fill="#8b5cf6" name="Promedio">
                                  {artifacts.demografico.porEdad.map((_, i) => (
                                    <Cell key={i} fill={["#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#6b7280"][i % 5]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">Sin datos de edad disponibles</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="print-avoid-break">
                        <CardHeader>
                          <CardTitle className="text-base">Desempeño por Antigüedad</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {artifacts.demografico.porAntiguedad.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart data={artifacts.demografico.porAntiguedad}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="rango" />
                                <YAxis domain={[0, 100]} />
                                <Tooltip formatter={(val: number) => `${val.toFixed(1)}%`} />
                                <Bar dataKey="promedio" fill="#06b6d4" name="Promedio">
                                  {artifacts.demografico.porAntiguedad.map((_, i) => (
                                    <Cell key={i} fill={["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6"][i % 5]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">Sin datos de antigüedad disponibles</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </div>
            </DocSection>
            )}

            {hasScatterAutoJefeData && (
            <DocSection id="sec-brecha" title="8. Brecha Auto vs Jefe (alineación)" subtitle="Consistencia de criterio y expectativas">
              <div className="space-y-4">
                <p className="text-sm">
                  Esta sección evalúa el alineamiento entre percepción del colaborador (auto) y del evaluador (jefe). Se reporta brecha (Jefe−Auto) y correlación
                  de pares. Correlaciones bajas suelen requerir calibración y criterios observables por dimensión.
                </p>

                <ScatterPlotCorrelation
                  data={artifacts?.scatterAutoVsJefe ?? []}
                  title="Autoevaluación vs Evaluación del Jefe (por colaborador)"
                  description="Cada punto representa a una persona con ambos puntajes disponibles (Auto en X, Jefe en Y)."
                  xLabel="Auto (%)"
                  yLabel="Jefe (%)"
                  showQuadrants={true}
                  quadrantLabels={{
                    q1: "Jefe alto / Auto alto",
                    q2: "Jefe alto / Auto bajo",
                    q3: "Jefe bajo / Auto bajo",
                    q4: "Jefe bajo / Auto alto",
                  }}
                />

                <CorrelationInterpretation correlation={metrics.brechaAutoJefe.correlacion} variable1="Auto" variable2="Jefe" />
              </div>
            </DocSection>
            )}

            {hasScatterDesempenoPotencialData && (
            <DocSection id="sec-potencial" title="9. Desempeño vs Potencial (9-Box)" subtitle="Talento, sucesión y focos de inversión">
              <div className="space-y-4">
                <p className="text-sm">
                  El cruce Desempeño–Potencial permite segmentar inversión: alto desempeño/alto potencial (sostener y proyectar), alto potencial/bajo desempeño
                  (desbloquear), y bajo/bajo (intervención estructurada). La distribución 9-Box muestra composición del talento.
                </p>

                <ScatterPlotCorrelation
                  data={artifacts?.scatterDesempenoVsPotencial ?? []}
                  title="Desempeño vs Potencial (pares con datos)"
                  description="Se excluyen registros sin potencial o sin desempeño válido."
                  xLabel="Desempeño (%)"
                  yLabel="Potencial (%)"
                  showQuadrants={true}
                  quadrantLabels={{
                    q1: "Alto potencial / Alto desempeño",
                    q2: "Alto potencial / Bajo desempeño",
                    q3: "Bajo potencial / Bajo desempeño",
                    q4: "Bajo potencial / Alto desempeño",
                  }}
                />

                <TreemapChart
                  data={artifacts?.nineBoxTreemap ?? []}
                  title="Distribución 9-Box (conteo)"
                  description="Composición por posicion_9box registrada en resultados finales."
                />
              </div>
            </DocSection>
            )}

            {hasNineBoxData && (
            <DocSection id="sec-9box" title="10. Matriz 9-Box (tabla y listados)" subtitle="Matriz 3×3 con conteos y detalle por cuadrante">
              <div className="space-y-4">
                <p className="text-sm">
                  Eje horizontal: <span className="font-semibold">Desempeño</span> (bajo→alto). Eje vertical: <span className="font-semibold">Potencial</span> (bajo→alto).
                  Esta matriz sirve para decisiones de desarrollo, retención e intervención.
                </p>

                <Card className="print-avoid-break">
                  <CardHeader>
                    <CardTitle className="text-base">Matriz 9‑Box (conteo)</CardTitle>
                    <CardDescription>
                      Total evaluados con resultado final: <span className="font-mono">{artifacts?.nineBox.total ?? 0}</span> · Sin 9-box:{" "}
                      <span className="font-mono">{artifacts?.nineBox.sinCalcular ?? 0}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <div className="min-w-[720px]">
                      <table className="w-full text-sm border rounded-md overflow-hidden">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="p-2 text-left">Potencial \\ Desempeño</th>
                            <th className="p-2 text-center">Bajo</th>
                            <th className="p-2 text-center">Medio</th>
                            <th className="p-2 text-center">Alto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(artifacts?.nineBox.matrix.rows ?? []).map((row) => (
                            <tr key={row.potencial} className="border-b">
                              <td className="p-2 font-medium capitalize">{row.potencial}</td>
                              {row.cols.map((c) => (
                                <td key={c.position} className="p-2 align-top">
                                  <div className={`border rounded-md p-3 ${getPositionColor(c.position)}`}>
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <div className="text-xs font-semibold">{c.shortName}</div>
                                        <div className="text-[11px] opacity-80">{c.label}</div>
                                      </div>
                                      <div className="text-2xl font-bold font-mono">{c.count}</div>
                                    </div>
                                  </div>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card className="print-avoid-break">
                  <CardHeader>
                    <CardTitle className="text-base">Detalle por cuadrante</CardTitle>
                    <CardDescription>
                      Muestra listados por cuadrante. Activa “Datos nominales” para ver DPI/nombres.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="multiple" className="w-full">
                      {(Object.keys(artifacts?.nineBox.byPosition ?? {}) as NineBoxPosition[]).map((pos) => {
                        const members = artifacts?.nineBox.byPosition?.[pos] ?? [];
                        const metaQ = NINE_BOX_METADATA[pos];
                        return (
                          <AccordionItem key={pos} value={pos}>
                            <AccordionTrigger>
                              <div className="flex items-center gap-3">
                                <span className="text-lg">{metaQ.icon}</span>
                                <span className="font-semibold">{metaQ.label}</span>
                                <span className="text-xs text-muted-foreground">({pos})</span>
                                <span className="ml-2 text-sm font-mono">{members.length}</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              {members.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Sin registros en este cuadrante.</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b">
                                        {mostrarNominal ? <th className="text-left py-2">DPI</th> : null}
                                        <th className="text-left py-2">{mostrarNominal ? "Nombre" : "Registro"}</th>
                                        <th className="text-left py-2">Cargo</th>
                                        <th className="text-left py-2">Dependencia</th>
                                        <th className="text-right py-2">Desempeño</th>
                                        <th className="text-right py-2">Potencial</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {members.slice(0, 200).map((m, idx) => (
                                        <tr key={`${m.dpi}-${idx}`} className="border-b">
                                          {mostrarNominal ? <td className="py-2 font-mono">{m.dpi}</td> : null}
                                          <td className="py-2">{mostrarNominal ? m.nombre : `Registro #${idx + 1}`}</td>
                                          <td className="py-2">{m.cargo || "—"}</td>
                                          <td className="py-2">{m.dependencia || "—"}</td>
                                          <td className="py-2 text-right font-mono">{typeof m.desempeno === "number" ? `${m.desempeno.toFixed(1)}%` : "—"}</td>
                                          <td className="py-2 text-right font-mono">{typeof m.potencial === "number" ? `${m.potencial.toFixed(1)}%` : "—"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  {members.length > 200 ? (
                                    <p className="text-xs text-muted-foreground mt-2">Mostrando primeros 200 de {members.length}.</p>
                                  ) : null}
                                </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}

                      <AccordionItem value="sin_calcular">
                        <AccordionTrigger>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">Sin 9‑Box</span>
                            <span className="text-sm font-mono">{artifacts?.nineBox.sin_calcular?.length ?? 0}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <p className="text-sm text-muted-foreground mb-2">
                            Registros sin posicion_9box (no calculado o faltan datos de potencial/desempeño).
                          </p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  {mostrarNominal ? <th className="text-left py-2">DPI</th> : null}
                                  <th className="text-left py-2">{mostrarNominal ? "Nombre" : "Registro"}</th>
                                  <th className="text-left py-2">Dependencia</th>
                                  <th className="text-right py-2">Desempeño</th>
                                  <th className="text-right py-2">Potencial</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(artifacts?.nineBox.sin_calcular ?? []).slice(0, 200).map((m, idx) => (
                                  <tr key={`${m.dpi}-${idx}`} className="border-b">
                                    {mostrarNominal ? <td className="py-2 font-mono">{m.dpi}</td> : null}
                                    <td className="py-2">{mostrarNominal ? m.nombre : `Registro #${idx + 1}`}</td>
                                    <td className="py-2">{m.dependencia || "—"}</td>
                                    <td className="py-2 text-right font-mono">{typeof m.desempeno === "number" ? `${m.desempeno.toFixed(1)}%` : "—"}</td>
                                    <td className="py-2 text-right font-mono">{typeof m.potencial === "number" ? `${m.potencial.toFixed(1)}%` : "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              </div>
            </DocSection>
            )}

            {/* Secciones de Análisis Avanzado */}
            {hasOutliersData && (
            <DocSection id="sec-outliers" title="11. Análisis de Outliers" subtitle="Identificación de casos extremos de alto y bajo rendimiento">
              <div className="space-y-4">
                <p className="text-sm">
                  El análisis de outliers usando el método IQR (rango intercuartílico) identifica colaboradores con desempeño
                  significativamente por encima o por debajo de la norma. Los outliers altos son candidatos a reconocimiento y
                  los bajos requieren intervención focalizada.
                </p>

                {artifacts?.outliers ? (
                  <>
                    <StatCardGrid columns={4}>
                      <StatCard title="Total Evaluados" value={artifacts.outliers.stats.total} />
                      <StatCard title="Alto Rendimiento" value={artifacts.outliers.stats.outliersAltos} color="success" subtitle="Destacados" />
                      <StatCard title="Bajo Rendimiento" value={artifacts.outliers.stats.outliersBajos} color="danger" subtitle="Requieren atención" />
                      <StatCard title="% Outliers" value={artifacts.outliers.stats.porcentaje} format="percentage" subtitle="Del total" />
                    </StatCardGrid>

                    <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
                      <CardContent className="p-4">
                        <p className="text-sm">{artifacts.outliers.interpretacion}</p>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="border-green-200 print-avoid-break">
                        <CardHeader>
                          <CardTitle className="text-base text-green-700">Alto Rendimiento (Top 10)</CardTitle>
                          <CardDescription>Colaboradores destacados - candidatos a reconocimiento</CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                {mostrarNominal && <th className="text-left py-2">Nombre</th>}
                                <th className="text-left py-2">Dirección</th>
                                <th className="text-right py-2">Desempeño</th>
                                <th className="text-right py-2">Z-Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {artifacts.outliers.altoRendimiento.map((o, i) => (
                                <tr key={o.dpi} className="border-b">
                                  {mostrarNominal && <td className="py-2">{o.nombre}</td>}
                                  <td className="py-2">{o.direccion}</td>
                                  <td className="py-2 text-right font-mono font-semibold text-green-600">{o.desempeno.toFixed(1)}%</td>
                                  <td className="py-2 text-right font-mono">{o.zScore.toFixed(2)}</td>
                                </tr>
                              ))}
                              {artifacts.outliers.altoRendimiento.length === 0 && (
                                <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">Sin outliers altos detectados</td></tr>
                              )}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>

                      <Card className="border-red-200 print-avoid-break">
                        <CardHeader>
                          <CardTitle className="text-base text-red-700">Bajo Rendimiento (Top 10)</CardTitle>
                          <CardDescription>Colaboradores que requieren intervención</CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                {mostrarNominal && <th className="text-left py-2">Nombre</th>}
                                <th className="text-left py-2">Dirección</th>
                                <th className="text-right py-2">Desempeño</th>
                                <th className="text-right py-2">Z-Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {artifacts.outliers.bajoRendimiento.map((o, i) => (
                                <tr key={o.dpi} className="border-b">
                                  {mostrarNominal && <td className="py-2">{o.nombre}</td>}
                                  <td className="py-2">{o.direccion}</td>
                                  <td className="py-2 text-right font-mono font-semibold text-red-600">{o.desempeno.toFixed(1)}%</td>
                                  <td className="py-2 text-right font-mono">{o.zScore.toFixed(2)}</td>
                                </tr>
                              ))}
                              {artifacts.outliers.bajoRendimiento.length === 0 && (
                                <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">Sin outliers bajos detectados</td></tr>
                              )}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay datos de outliers disponibles.</p>
                )}
              </div>
            </DocSection>
            )}

            {hasRiesgoRotacionData && (
            <DocSection id="sec-riesgo" title="12. Riesgo de Rotación" subtitle="Score compuesto de riesgo basado en múltiples factores">
              <div className="space-y-4">
                <p className="text-sm">
                  El modelo de riesgo de rotación considera factores como bajo desempeño, baja antigüedad, edad crítica
                  y estancamiento para calcular un score compuesto. Permite priorizar intervenciones de retención.
                </p>

                {artifacts?.riesgoRotacion ? (
                  <>
                    <StatCardGrid columns={4}>
                      <StatCard title="Bajo Riesgo" value={artifacts.riesgoRotacion.distribucion.bajo} color="success" />
                      <StatCard title="Riesgo Medio" value={artifacts.riesgoRotacion.distribucion.medio} color="warning" />
                      <StatCard title="Riesgo Alto" value={artifacts.riesgoRotacion.distribucion.alto} color="danger" />
                      <StatCard title="Riesgo Crítico" value={artifacts.riesgoRotacion.distribucion.critico} color="danger" />
                    </StatCardGrid>

                    <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200">
                      <CardContent className="p-4">
                        <p className="text-sm">{artifacts.riesgoRotacion.interpretacion}</p>
                      </CardContent>
                    </Card>

                    <Card className="print-avoid-break">
                      <CardHeader>
                        <CardTitle className="text-base">Colaboradores con Mayor Riesgo (Top 15)</CardTitle>
                        <CardDescription>Ordenados por score de riesgo descendente</CardDescription>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              {mostrarNominal && <th className="text-left py-2">Nombre</th>}
                              <th className="text-left py-2">Dirección</th>
                              <th className="text-right py-2">Score</th>
                              <th className="text-left py-2">Nivel</th>
                              <th className="text-left py-2">Factores</th>
                            </tr>
                          </thead>
                          <tbody>
                            {artifacts.riesgoRotacion.topRiesgo.map((r) => (
                              <tr key={r.dpi} className="border-b">
                                {mostrarNominal && <td className="py-2">{r.nombre}</td>}
                                <td className="py-2">{r.direccion}</td>
                                <td className="py-2 text-right font-mono">{r.riskScore.toFixed(0)}</td>
                                <td className="py-2">
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    r.riskLevel === "critico" ? "bg-red-100 text-red-800" :
                                    r.riskLevel === "alto" ? "bg-orange-100 text-orange-800" :
                                    r.riskLevel === "medio" ? "bg-yellow-100 text-yellow-800" :
                                    "bg-green-100 text-green-800"
                                  }`}>
                                    {r.riskLevel}
                                  </span>
                                </td>
                                <td className="py-2 text-xs text-muted-foreground">{r.factoresPrincipales.join(", ") || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay datos de riesgo de rotación disponibles.</p>
                )}
              </div>
            </DocSection>
            )}

            {hasLiderazgoCascadaData && (
            <DocSection id="sec-liderazgo" title="13. Liderazgo en Cascada" subtitle="Correlación entre desempeño de jefes y sus equipos">
              <div className="space-y-4">
                <p className="text-sm">
                  El análisis de liderazgo en cascada examina si existe correlación entre el desempeño de los jefes
                  y el desempeño promedio de sus equipos. Una correlación positiva fuerte sugiere que el liderazgo
                  tiene impacto directo en los resultados del equipo.
                </p>

                {artifacts?.liderazgoCascada ? (
                  <>
                    <StatCardGrid columns={3}>
                      <StatCard
                        title="Correlación Jefe-Equipo"
                        value={artifacts.liderazgoCascada.correlacionJefeEquipo}
                        format="decimal"
                        subtitle={artifacts.liderazgoCascada.interpretacion}
                        color={Math.abs(artifacts.liderazgoCascada.correlacionJefeEquipo) >= 0.5 ? "success" : "warning"}
                      />
                      <StatCard title="Jefes Analizados" value={artifacts.liderazgoCascada.resumen.jefesAnalizados} subtitle="Con equipos de 2+ personas" />
                      <StatCard title="Colaboradores en Equipos" value={artifacts.liderazgoCascada.resumen.equiposTotales} subtitle="Bajo supervisión directa" />
                    </StatCardGrid>

                    {artifacts.liderazgoCascada.jefesConEquipo.length > 0 ? (
                      <Card className="print-avoid-break">
                        <CardHeader>
                          <CardTitle className="text-base">Jefes y sus Equipos</CardTitle>
                          <CardDescription>Comparación de desempeño del jefe vs promedio del equipo</CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                {mostrarNominal && <th className="text-left py-2">Jefe</th>}
                                <th className="text-right py-2">Desempeño Jefe</th>
                                <th className="text-right py-2">Promedio Equipo</th>
                                <th className="text-right py-2">Tamaño Equipo</th>
                                <th className="text-right py-2">Diferencia</th>
                              </tr>
                            </thead>
                            <tbody>
                              {artifacts.liderazgoCascada.jefesConEquipo.map((j) => (
                                <tr key={j.jefeId} className="border-b">
                                  {mostrarNominal && <td className="py-2">{j.jefeNombre}</td>}
                                  <td className="py-2 text-right font-mono">{j.desempenoJefe.toFixed(1)}%</td>
                                  <td className="py-2 text-right font-mono">{j.promedioEquipo.toFixed(1)}%</td>
                                  <td className="py-2 text-right font-mono">{j.tamanoEquipo}</td>
                                  <td className={`py-2 text-right font-mono ${j.diferencia >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {j.diferencia >= 0 ? "+" : ""}{j.diferencia.toFixed(1)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="bg-muted/50">
                        <CardContent className="p-4 text-center text-muted-foreground">
                          No hay suficientes datos de relaciones jefe-colaborador para este análisis.
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay datos de liderazgo en cascada disponibles.</p>
                )}
              </div>
            </DocSection>
            )}

            {hasPerfilesData && (
            <DocSection id="sec-perfiles" title="14. Clustering de Perfiles" subtitle="Agrupación de colaboradores por K-means">
              <div className="space-y-4">
                <p className="text-sm">
                  El algoritmo K-means agrupa colaboradores en perfiles basados en su desempeño y potencial.
                  Esto permite identificar segmentos de talento y diseñar estrategias diferenciadas para cada grupo.
                </p>

                {artifacts?.perfiles && artifacts.perfiles.clusters.length > 0 ? (
                  <>
                    <Card className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-200">
                      <CardContent className="p-4">
                        <p className="text-sm">{artifacts.perfiles.interpretacion}</p>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {artifacts.perfiles.clusters.map((c) => (
                        <Card key={c.id} style={{ borderColor: c.color }} className="border-2">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base" style={{ color: c.color }}>{c.nombre}</CardTitle>
                            <CardDescription className="text-xs">{c.descripcion}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{c.n}</div>
                            <p className="text-xs text-muted-foreground">
                              Centroide: D={c.centroide.desempeno.toFixed(0)}% P={c.centroide.potencial.toFixed(0)}%
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Card className="print-avoid-break">
                      <CardHeader>
                        <CardTitle className="text-base">Distribución de Perfiles</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={artifacts.perfiles.distribucion}
                              dataKey="porcentaje"
                              nameKey="perfil"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={({ perfil, porcentaje }) => `${perfil}: ${porcentaje}%`}
                            >
                              {artifacts.perfiles.distribucion.map((_, i) => (
                                <Cell key={i} fill={artifacts.perfiles.clusters[i]?.color || "#888"} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card className="bg-muted/50">
                    <CardContent className="p-4 text-center text-muted-foreground">
                      {artifacts?.perfiles?.interpretacion || "No hay suficientes datos para realizar clustering de perfiles."}
                    </CardContent>
                  </Card>
                )}
              </div>
            </DocSection>
            )}

            {hasBenchmarkingData && (
            <DocSection id="sec-benchmarking" title="15. Benchmarking Interno" subtitle="Comparativa normalizada entre direcciones">
              <div className="space-y-4">
                <p className="text-sm">
                  El benchmarking interno permite comparar el desempeño entre direcciones usando métricas normalizadas
                  (Z-scores y percentiles). Esto facilita identificar áreas de excelencia y oportunidades de mejora.
                </p>

                {artifacts?.benchmarking ? (
                  <>
                    <StatCardGrid columns={3}>
                      <StatCard title="Mejor Dirección" value={artifacts.benchmarking.mejorDireccion.promedio} format="percentage" subtitle={artifacts.benchmarking.mejorDireccion.nombre} color="success" />
                      <StatCard title="Peor Dirección" value={artifacts.benchmarking.peorDireccion.promedio} format="percentage" subtitle={artifacts.benchmarking.peorDireccion.nombre} color="danger" />
                      <StatCard title="Brecha Máxima" value={artifacts.benchmarking.brechaMaxima} format="decimal" subtitle="Puntos porcentuales" color={artifacts.benchmarking.brechaMaxima > 15 ? "warning" : "success"} />
                    </StatCardGrid>

                    <Card className="bg-teal-50/50 dark:bg-teal-950/20 border-teal-200">
                      <CardContent className="p-4">
                        <p className="text-sm">{artifacts.benchmarking.interpretacion}</p>
                      </CardContent>
                    </Card>

                    <Card className="print-avoid-break">
                      <CardHeader>
                        <CardTitle className="text-base">Ranking Normalizado por Dirección</CardTitle>
                        <CardDescription>Z-Score y percentil para comparación justa</CardDescription>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Dirección</th>
                              <th className="text-right py-2">n</th>
                              <th className="text-right py-2">Promedio</th>
                              <th className="text-right py-2">Z-Score</th>
                              <th className="text-right py-2">Percentil</th>
                              <th className="text-left py-2">Clasificación</th>
                            </tr>
                          </thead>
                          <tbody>
                            {artifacts.benchmarking.ranking.map((d) => (
                              <tr key={d.direccion} className="border-b">
                                <td className="py-2">{d.direccion}</td>
                                <td className="py-2 text-right font-mono">{d.n}</td>
                                <td className="py-2 text-right font-mono">{d.promedio.toFixed(1)}%</td>
                                <td className={`py-2 text-right font-mono ${d.zScore >= 0 ? "text-green-600" : "text-red-600"}`}>
                                  {d.zScore >= 0 ? "+" : ""}{d.zScore.toFixed(2)}
                                </td>
                                <td className="py-2 text-right font-mono">{d.percentil}%</td>
                                <td className="py-2">
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    d.clasificacion === "top" ? "bg-green-100 text-green-800" :
                                    d.clasificacion === "bajo" ? "bg-red-100 text-red-800" :
                                    "bg-gray-100 text-gray-800"
                                  }`}>
                                    {d.clasificacion === "top" ? "Top" : d.clasificacion === "bajo" ? "Bajo" : "Promedio"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay datos de benchmarking disponibles.</p>
                )}
              </div>
            </DocSection>
            )}

            <DocSection id="sec-dimensiones" title="16. Análisis por dimensión" subtitle="Lectura de brechas de capacidades institucionales">
              <div className="space-y-4">
                <p className="text-sm">
                  Consolidación de dimensiones a categorías ejecutivas para lectura institucional (umbral fortaleza ≥75%). Esta sección ayuda a priorizar capacitación,
                  ajustes de gestión y definición de estándares por dimensión.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <RadarDimensiones
                    dimensiones={artifacts?.dimensiones.radar ?? []}
                    title="Radar de dimensiones (consolidado)"
                    description="Porcentaje 0–100; consolidación basada en nombres de dimensiones de instrumentos activos."
                    height={420}
                  />
                  <InterpretationCard data={(artifacts?.dimensiones.interpretacion as any) || { titulo: "Sin datos", descripcion: "No hay información de dimensiones.", hallazgos: [], nivel: "neutral" }} />
                </div>

                <LollipopChart
                  data={(artifacts?.dimensiones.lollipop as any) ?? []}
                  title="Ranking de dimensiones (consolidado)"
                  description="Ordenado de mayor a menor promedio. Línea base en 75%."
                  baselineValue={75}
                  baselineLabel="Umbral fortaleza"
                  valueFormat="percentage"
                  orientation="horizontal"
                  height={420}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
                    <CardHeader>
                      <CardTitle className="text-green-700 dark:text-green-400">Fortalezas ({artifacts?.dimensiones.fortalezas.length ?? 0})</CardTitle>
                      <CardDescription>Categorías ≥75%</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {(artifacts?.dimensiones.fortalezas ?? []).map((d) => (
                          <li key={d.nombre} className="flex justify-between gap-3">
                            <span>{d.nombre}</span>
                            <span className="font-mono font-semibold text-green-600">{d.promedio.toFixed(1)}%</span>
                          </li>
                        ))}
                        {(artifacts?.dimensiones.fortalezas ?? []).length === 0 ? <li className="text-muted-foreground">Sin fortalezas en el corte</li> : null}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
                    <CardHeader>
                      <CardTitle className="text-yellow-700 dark:text-yellow-400">Oportunidades ({artifacts?.dimensiones.oportunidades.length ?? 0})</CardTitle>
                      <CardDescription>Categorías 60–74%</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {(artifacts?.dimensiones.oportunidades ?? []).map((d) => (
                          <li key={d.nombre} className="flex justify-between gap-3">
                            <span>{d.nombre}</span>
                            <span className="font-mono font-semibold text-yellow-700">{d.promedio.toFixed(1)}%</span>
                          </li>
                        ))}
                        {(artifacts?.dimensiones.oportunidades ?? []).length === 0 ? <li className="text-muted-foreground">Sin oportunidades en el corte</li> : null}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
                    <CardHeader>
                      <CardTitle className="text-red-700 dark:text-red-400">Críticas ({artifacts?.dimensiones.criticas.length ?? 0})</CardTitle>
                      <CardDescription>Categorías &lt;60%</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {(artifacts?.dimensiones.criticas ?? []).map((d) => (
                          <li key={d.nombre} className="flex justify-between gap-3">
                            <span>{d.nombre}</span>
                            <span className="font-mono font-semibold text-red-600">{d.promedio.toFixed(1)}%</span>
                          </li>
                        ))}
                        {(artifacts?.dimensiones.criticas ?? []).length === 0 ? <li className="text-muted-foreground">Sin críticas en el corte</li> : null}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </DocSection>

            {hasCapacitacionData && (
            <DocSection id="sec-capacitacion" title="17. Necesidades de Capacitación" subtitle="Temas prioritarios identificados por brechas de competencias">
              <div className="space-y-4">
                <p className="text-sm">
                  Las necesidades de capacitación se identifican a partir de las dimensiones con menor puntaje.
                  La priorización considera la brecha respecto al umbral objetivo (75%) y el número de colaboradores afectados.
                </p>

                {artifacts?.capacitacion ? (
                  <>
                    <Card className="bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200">
                      <CardContent className="p-4">
                        <p className="text-sm">{artifacts.capacitacion.resumen}</p>
                      </CardContent>
                    </Card>

                    <Card className="print-avoid-break">
                      <CardHeader>
                        <CardTitle className="text-base">Temas de Capacitación Prioritarios</CardTitle>
                        <CardDescription>Ordenados por brecha (mayor primero)</CardDescription>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Tema/Dimensión</th>
                              <th className="text-right py-2">Brecha vs 75%</th>
                              <th className="text-left py-2">Prioridad</th>
                            </tr>
                          </thead>
                          <tbody>
                            {artifacts.capacitacion.temasPrioritarios.map((t) => (
                              <tr key={t.tema} className="border-b">
                                <td className="py-2">{t.tema}</td>
                                <td className="py-2 text-right font-mono text-red-600">-{t.brecha.toFixed(1)}</td>
                                <td className="py-2">
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    t.prioridad === "alta" ? "bg-red-100 text-red-800" :
                                    t.prioridad === "media" ? "bg-yellow-100 text-yellow-800" :
                                    "bg-green-100 text-green-800"
                                  }`}>
                                    {t.prioridad}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            {artifacts.capacitacion.temasPrioritarios.length === 0 && (
                              <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">No se identificaron temas críticos</td></tr>
                            )}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay datos de capacitación disponibles.</p>
                )}
              </div>
            </DocSection>
            )}

            <DocSection id="sec-pdi" title="18. Planes de desarrollo (PDI)" subtitle="Conversión de evaluación → mejora sostenida">
              <div className="space-y-4">
                <p className="text-sm">
                  El proceso se considera maduro cuando los resultados se traducen en planes (PDI) con responsables y seguimiento. Aquí se reporta cobertura del PDI
                  respecto a evaluados del período.
                </p>
                <StatCardGrid columns={3}>
                  <StatCard title="Planes generados" value={metrics.pdi?.totalPlanes ?? 0} subtitle="development_plans" />
                  <StatCard title="Cobertura PDI" value={metrics.pdi?.coberturaSobreEvaluados ?? 0} format="percentage" subtitle="sobre evaluados del período" color={(metrics.pdi?.coberturaSobreEvaluados ?? 0) < 70 ? "warning" : "success"} />
                  <StatCard title="Evaluados" value={metrics.coverage.totalEvaluados} subtitle="final_evaluation_results" />
                </StatCardGrid>
              </div>
            </DocSection>

            <DocSection id="sec-dependencias" title="19. Listado por dependencia" subtitle="Listado y resumen por unidad orgánica (con opción nominal)">
              <div className="space-y-4">
                <p className="text-sm">
                  Esta sección agrupa a los evaluados por <span className="font-semibold">dependencia</span> (usa `users.dependencia` si existe; si no, `direccion_unidad` y luego `area`).
                  Útil para gestión interna y trazabilidad por unidad.
                </p>

                <Card className="print-avoid-break">
                  <CardHeader>
                    <CardTitle className="text-base">Dependencias (resumen)</CardTitle>
                    <CardDescription>
                      Total dependencias: <span className="font-mono">{artifacts?.dependencias.length ?? 0}</span>. Abre una para ver el listado.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="multiple" className="w-full">
                      {(artifacts?.dependencias ?? []).slice(0, 50).map((d) => (
                        <AccordionItem key={d.dependencia} value={d.dependencia}>
                          <AccordionTrigger>
                            <div className="flex items-center justify-between w-full pr-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{d.dependencia}</span>
                                <span className="text-xs text-muted-foreground">(n={d.n})</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs">
                                <span>Desempeño: <span className="font-mono">{d.promedioDesempeno.toFixed(1)}%</span></span>
                                <span>Potencial: <span className="font-mono">{d.promedioPotencial !== null ? `${d.promedioPotencial.toFixed(1)}%` : "—"}</span></span>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b">
                                    {mostrarNominal ? <th className="text-left py-2">DPI</th> : null}
                                    <th className="text-left py-2">{mostrarNominal ? "Nombre" : "Registro"}</th>
                                    <th className="text-left py-2">Cargo</th>
                                    <th className="text-left py-2">Nivel</th>
                                    <th className="text-right py-2">Desempeño</th>
                                    <th className="text-right py-2">Potencial</th>
                                    <th className="text-left py-2">9‑Box</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {d.empleados.slice(0, 250).map((m, idx) => (
                                    <tr key={`${m.dpi}-${idx}`} className="border-b">
                                      {mostrarNominal ? <td className="py-2 font-mono">{m.dpi}</td> : null}
                                      <td className="py-2">{mostrarNominal ? m.nombre : `Registro #${idx + 1}`}</td>
                                      <td className="py-2">{m.cargo || "—"}</td>
                                      <td className="py-2">{m.nivel || "—"}</td>
                                      <td className="py-2 text-right font-mono">{typeof m.desempeno === "number" ? `${m.desempeno.toFixed(1)}%` : "—"}</td>
                                      <td className="py-2 text-right font-mono">{typeof m.potencial === "number" ? `${m.potencial.toFixed(1)}%` : "—"}</td>
                                      <td className="py-2">
                                        {m.posicion9Box ? (
                                          <span className={`inline-flex items-center px-2 py-0.5 border rounded text-xs ${getPositionColor(m.posicion9Box as NineBoxPosition)}`}>
                                            {(NINE_BOX_METADATA[m.posicion9Box as NineBoxPosition]?.shortName || m.posicion9Box)}
                                          </span>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {d.empleados.length > 250 ? (
                                <p className="text-xs text-muted-foreground mt-2">Mostrando primeros 250 de {d.empleados.length}.</p>
                              ) : null}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                    {(artifacts?.dependencias?.length ?? 0) > 50 ? (
                      <p className="text-xs text-muted-foreground mt-2">Mostrando 50 dependencias por límite de UI.</p>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </DocSection>

            <DocSection id="sec-anexos" title="10. Anexos técnicos (definiciones y reglas)" subtitle="Para auditoría, trazabilidad y replicabilidad">
              <div className="space-y-3 text-sm">
                <p>
                  Definiciones clave (auditables): Participación = evaluados / activos. Brecha Auto vs Jefe = (Jefe − Auto). Correlación = Pearson sobre pares Auto/Jefe
                  por colaborador con ambos puntajes.
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li><span className="font-semibold">Categorías de desempeño</span>: 90–100 Excelente; 80–89 Muy bueno; 70–79 Satisfactorio; 60–69 Necesita mejorar; &lt;60 Insatisfactorio.</li>
                  <li><span className="font-semibold">Corte de datos</span>: timestamp ISO mostrado al inicio (momento de generación del informe).</li>
                  <li><span className="font-semibold">Regla de inclusión</span>: evaluaciones enviadas y resultados finales del período activo.</li>
                  <li><span className="font-semibold">Limitaciones</span>: si faltan potencial o 9-box, el análisis de talento se reporta parcial.</li>
                </ul>
              </div>
            </DocSection>

            <DocSection
              id="sec-anexo-instrumentos"
              title="Anexo — Instrumentos aplicados por nivel (cómo funcionan)"
              subtitle="Listado de instrumentos vigentes por nivel y explicación del cálculo"
            >
              <div className="space-y-4">
                <p className="text-sm">
                  Este anexo documenta los instrumentos activos configurados en el sistema (`instrument_configs`) por nivel de puesto. Incluye la estructura (dimensiones/ítems),
                  los pesos auto/jefe y la explicación del cálculo para presentación y auditoría.
                </p>

                <Card className="print-avoid-break">
                  <CardHeader>
                    <CardTitle className="text-base">Instrumentos por nivel</CardTitle>
                    <CardDescription>
                      Total instrumentos activos/configurados: <span className="font-mono">{artifacts?.instrumentosPorNivel.length ?? 0}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="multiple" className="w-full">
                      {(artifacts?.instrumentosPorNivel ?? []).map((inst) => (
                        <AccordionItem key={inst.instrumentId} value={inst.instrumentId}>
                          <AccordionTrigger>
                            <div className="flex items-center justify-between w-full pr-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{inst.nivelNombre}</span>
                                <span className="text-xs text-muted-foreground">({inst.nivel})</span>
                                <span className="text-xs text-muted-foreground">· id: <span className="font-mono">{inst.instrumentId}</span></span>
                                <span className={`text-xs px-2 py-0.5 border rounded ${inst.activo ? "bg-green-50 border-green-200 text-green-800" : "bg-gray-50 border-gray-200 text-gray-700"}`}>
                                  {inst.activo ? "Activo" : "Inactivo"}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Pesos: Jefe <span className="font-mono">{Math.round(inst.pesos.jefe * 100)}%</span> / Auto <span className="font-mono">{Math.round(inst.pesos.auto * 100)}%</span>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm text-muted-foreground">
                                  Para ver el instrumento completo “tal cual” (dimensiones + descripciones + ítems), usa el botón de vista.
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    // Evitar que el click cierre/abra el acordeón
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setInstrumentSelected(inst);
                                    setInstrumentModalOpen(true);
                                  }}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Ver instrumento
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-3 border rounded-md bg-white/60 dark:bg-white/5">
                                  <p className="font-semibold mb-2">Cómo se responde</p>
                                  <ul className="list-disc list-inside text-sm space-y-1">
                                    {inst.explicacion.comoSeResponde.map((x, i) => <li key={i}>{x}</li>)}
                                  </ul>
                                </div>
                                <div className="p-3 border rounded-md bg-white/60 dark:bg-white/5">
                                  <p className="font-semibold mb-2">Cómo se calcula</p>
                                  <ul className="list-disc list-inside text-sm space-y-1">
                                    {inst.explicacion.comoSeCalcula.map((x, i) => <li key={i}>{x}</li>)}
                                  </ul>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-sm">Dimensiones de desempeño</CardTitle>
                                    <CardDescription>
                                      {inst.desempeno.totalDimensiones} dimensiones · {inst.desempeno.totalItems} ítems
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b">
                                          <th className="text-left py-2">Dimensión</th>
                                          <th className="text-right py-2">Peso</th>
                                          <th className="text-right py-2">Ítems</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {inst.desempeno.dimensiones.map((d) => (
                                          <tr key={d.id || d.nombre} className="border-b">
                                            <td className="py-2">{d.nombre}</td>
                                            <td className="py-2 text-right font-mono">{d.peso.toFixed(2)}</td>
                                            <td className="py-2 text-right font-mono">{d.itemsCount}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </CardContent>
                                </Card>

                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-sm">Dimensiones de potencial</CardTitle>
                                    <CardDescription>
                                      {inst.potencial.aplica ? (
                                        <>{inst.potencial.totalDimensiones} dimensiones · {inst.potencial.totalItems} ítems</>
                                      ) : (
                                        <>No aplica en este nivel</>
                                      )}
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent className="overflow-x-auto">
                                    {inst.potencial.aplica ? (
                                      <table className="w-full text-sm">
                                        <thead>
                                          <tr className="border-b">
                                            <th className="text-left py-2">Dimensión</th>
                                            <th className="text-right py-2">Peso</th>
                                            <th className="text-right py-2">Ítems</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {inst.potencial.dimensiones.map((d) => (
                                            <tr key={d.id || d.nombre} className="border-b">
                                              <td className="py-2">{d.nombre}</td>
                                              <td className="py-2 text-right font-mono">{d.peso.toFixed(2)}</td>
                                              <td className="py-2 text-right font-mono">{d.itemsCount}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">Este nivel no incluye evaluación de potencial.</p>
                                    )}
                                  </CardContent>
                                </Card>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>

                <Dialog open={instrumentModalOpen} onOpenChange={setInstrumentModalOpen}>
                  <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {instrumentSelected
                          ? `Instrumento ${instrumentSelected.nivelNombre} (${instrumentSelected.nivel})`
                          : "Instrumento"}
                      </DialogTitle>
                      <DialogDescription>
                        {instrumentSelected ? (
                          <>
                            ID: <span className="font-mono">{instrumentSelected.instrumentId}</span> · Pesos: Jefe{" "}
                            <span className="font-mono">{Math.round(instrumentSelected.pesos.jefe * 100)}%</span> / Auto{" "}
                            <span className="font-mono">{Math.round(instrumentSelected.pesos.auto * 100)}%</span>
                          </>
                        ) : null}
                      </DialogDescription>
                    </DialogHeader>

                    {instrumentSelected ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" onClick={() => printInstrumentOnly(instrumentSelected)}>
                            <Printer className="h-4 w-4 mr-2" />
                            Imprimir instrumento
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-semibold">Desempeño — dimensiones e ítems</h3>
                          <div className="space-y-4">
                            {instrumentSelected.desempeno.dimensiones.map((d) => (
                              <div key={`modal-des-${d.id || d.nombre}`} className="border rounded-md p-4">
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                                  <div>
                                    <p className="font-semibold">{d.nombre}</p>
                                    {d.descripcion ? <p className="text-sm text-muted-foreground mt-1">{d.descripcion}</p> : null}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Peso <span className="font-mono">{d.peso.toFixed(2)}</span> ·{" "}
                                    <span className="font-mono">{d.itemsCount}</span> ítems
                                  </div>
                                </div>
                                <div className="overflow-x-auto mt-3">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b">
                                        <th className="text-left py-2 w-[80px]">Orden</th>
                                        <th className="text-left py-2">Ítem</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(d.items ?? []).map((it, idx) => (
                                        <tr key={`${it.id}-${idx}`} className="border-b align-top">
                                          <td className="py-2 font-mono">{Number.isFinite(it.orden) ? it.orden : idx + 1}</td>
                                          <td className="py-2">{it.texto || it.id}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="font-semibold">Potencial — dimensiones e ítems</h3>
                          {!instrumentSelected.potencial.aplica ? (
                            <p className="text-sm text-muted-foreground">Este nivel no incluye evaluación de potencial.</p>
                          ) : (
                            <div className="space-y-4">
                              {instrumentSelected.potencial.dimensiones.map((d) => (
                                <div key={`modal-pot-${d.id || d.nombre}`} className="border rounded-md p-4">
                                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                                    <div>
                                      <p className="font-semibold">{d.nombre}</p>
                                      {d.descripcion ? <p className="text-sm text-muted-foreground mt-1">{d.descripcion}</p> : null}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Peso <span className="font-mono">{d.peso.toFixed(2)}</span> ·{" "}
                                      <span className="font-mono">{d.itemsCount}</span> ítems
                                    </div>
                                  </div>
                                  <div className="overflow-x-auto mt-3">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b">
                                          <th className="text-left py-2 w-[80px]">Orden</th>
                                          <th className="text-left py-2">Ítem</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(d.items ?? []).map((it, idx) => (
                                          <tr key={`${it.id}-${idx}`} className="border-b align-top">
                                            <td className="py-2 font-mono">{Number.isFinite(it.orden) ? it.orden : idx + 1}</td>
                                            <td className="py-2">{it.texto || it.id}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </DialogContent>
                </Dialog>
              </div>
            </DocSection>
          </TabsContent>

          <TabsContent value="ejecutivo" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumen ejecutivo</CardTitle>
                <CardDescription>Lectura para RRHH y Gerencia (con conclusiones y recomendaciones)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{executive.headline}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg bg-white/60 dark:bg-white/5">
                    <h3 className="font-semibold mb-2">Hallazgos clave</h3>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      {executive.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg bg-white/60 dark:bg-white/5">
                    <h3 className="font-semibold mb-2">Riesgos/alertas</h3>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      {executive.risks.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg bg-white/60 dark:bg-white/5">
                    <h3 className="font-semibold mb-2">Recomendaciones</h3>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      {executive.recommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plan 30/60/90 días</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">30 días</h3>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    {executive.nextSteps306090.d30.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">60 días</h3>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    {executive.nextSteps306090.d60.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">90 días</h3>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    {executive.nextSteps306090.d90.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metricas" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Indicadores principales</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Participación" value={`${metrics.coverage.tasaParticipacion.toFixed(1)}%`} subtitle={`${metrics.coverage.totalEvaluados}/${metrics.coverage.totalActivos}`} />
                <MetricCard title="Promedio desempeño" value={`${metrics.desempeno.promedio.toFixed(1)}%`} subtitle={`Mediana ${metrics.desempeno.mediana.toFixed(1)}%`} />
                <MetricCard title="Dispersión" value={`${metrics.desempeno.desviacion.toFixed(1)}`} subtitle="Desv. estándar" />
                <MetricCard title="Brecha Jefe−Auto" value={`${metrics.brechaAutoJefe.brecha.toFixed(1)}`} subtitle={`Corr ${metrics.brechaAutoJefe.correlacion.toFixed(3)}`} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ranking por dirección (Top 10)</CardTitle>
                <CardDescription>Solo direcciones con n≥5 (si aplica)</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Dirección</th>
                      <th className="text-right py-2">n</th>
                      <th className="text-right py-2">Prom. Desempeño</th>
                      <th className="text-right py-2">Prom. Potencial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.segmentacion.porDireccion.filter((d) => d.n >= 5).slice(0, 10).map((d) => (
                      <tr key={d.direccion} className="border-b">
                        <td className="py-2">{d.direccion}</td>
                        <td className="py-2 text-right font-mono">{d.n}</td>
                        <td className="py-2 text-right font-mono">{d.promedioDesempeno.toFixed(1)}%</td>
                        <td className="py-2 text-right font-mono">{d.promedioPotencial !== undefined ? `${d.promedioPotencial.toFixed(1)}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auditoria" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Ficha técnica (auditable)</CardTitle>
                <CardDescription>Fuentes, reglas y definiciones usadas por el generador</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><span className="font-semibold">Fuentes:</span> evaluation_periods, users, evaluations, final_evaluation_results, job_levels, development_plans</p>
                <p><span className="font-semibold">Inclusión:</span> evaluaciones con <span className="font-mono">estado=enviado</span> y resultados finales del período.</p>
                <p><span className="font-semibold">Brecha Auto vs Jefe:</span> se reporta como <span className="font-mono">Jefe − Auto</span> (puntos porcentuales).</p>
                <p><span className="font-semibold">Escala:</span> auto/jefe se calculan en 1–5 y se convierten a porcentaje 0–100 con la misma función usada en el sistema.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function DocSection({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    </section>
  );
}

function MetricCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <Card className="bg-white/60 dark:bg-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}


