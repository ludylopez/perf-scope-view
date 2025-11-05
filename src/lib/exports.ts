import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Tipos para exportación
export interface ExportData {
  title: string;
  subtitle?: string;
  periodo?: string;
  fecha?: string;
  tables?: Array<{
    title: string;
    headers: string[];
    rows: (string | number)[][];
  }>;
  summary?: Array<{
    label: string;
    value: string | number;
  }>;
}

// Exportar a PDF
export const exportToPDF = (data: ExportData, filename?: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Configuración de fuente
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(data.title, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 10;

  if (data.subtitle) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(data.subtitle, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 8;
  }

  if (data.periodo) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Período: ${data.periodo}`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 8;
  }

  if (data.fecha) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha de generación: ${data.fecha}`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 10;
  }

  doc.setTextColor(0, 0, 0);

  // Resumen
  if (data.summary && data.summary.length > 0) {
    yPosition += 5;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen", 14, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    data.summary.forEach((item) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${item.label}:`, 14, yPosition);
      doc.setFont("helvetica", "normal");
      const value = typeof item.value === "number" ? item.value.toFixed(2) : item.value.toString();
      doc.text(value, 80, yPosition);
      yPosition += 7;
    });
    yPosition += 5;
  }

  // Tablas
  if (data.tables && data.tables.length > 0) {
    data.tables.forEach((table, index) => {
      // Verificar si necesitamos nueva página
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(table.title, 14, yPosition);
      yPosition += 8;

      autoTable(doc, {
        head: [table.headers],
        body: table.rows,
        startY: yPosition,
        theme: "striped",
        headStyles: { fillColor: [66, 139, 202], textColor: 255 },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  // Descargar
  const finalFilename = filename || `reporte_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(finalFilename);
};

// Exportar a Excel
export const exportToExcel = (data: ExportData, filename?: string) => {
  const workbook = XLSX.utils.book_new();

  // Hoja de resumen
  if (data.summary && data.summary.length > 0) {
    const summaryData = [
      ["Resumen Ejecutivo"],
      [],
      ...data.summary.map((item) => [
        item.label,
        typeof item.value === "number" ? item.value.toFixed(2) : item.value.toString(),
      ]),
    ];

    if (data.periodo) {
      summaryData.splice(1, 0, [`Período: ${data.periodo}`]);
    }
    if (data.fecha) {
      summaryData.splice(2, 0, [`Fecha: ${data.fecha}`]);
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen");
  }

  // Hojas de tablas
  if (data.tables && data.tables.length > 0) {
    data.tables.forEach((table, index) => {
      const tableData = [table.headers, ...table.rows];
      const sheet = XLSX.utils.aoa_to_sheet(tableData);
      
      // Aplicar estilo de encabezado (solo visual en Excel)
      const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!sheet[cellAddress]) continue;
        sheet[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "4285CA" } },
          fgColor: { rgb: "FFFFFF" },
        };
      }

      const sheetName = table.title.substring(0, 31) || `Tabla ${index + 1}`;
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    });
  }

  // Descargar
  const finalFilename = filename || `reporte_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  XLSX.writeFile(workbook, finalFilename);
};

// Exportar resultados individuales a PDF
export const exportResultadoIndividualPDF = (
  colaboradorNombre: string,
  periodo: string,
  resultado: any,
  planDesarrollo?: any
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Título
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Resultados de Evaluación", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 10;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Colaborador: ${colaboradorNombre}`, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 7;
  doc.text(`Período: ${periodo}`, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 15;

  // Resultados
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Resultados Generales", 14, yPosition);
  yPosition += 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const resultados = [
    ["Desempeño Final", resultado.desempenoFinal?.toFixed(2) || "N/A"],
    ["Autoevaluación", resultado.desempenoAuto?.toFixed(2) || "N/A"],
    ["Evaluación Jefe", resultado.desempenoJefe?.toFixed(2) || "N/A"],
  ];

  if (resultado.potencial) {
    resultados.push(["Potencial", resultado.potencial.toFixed(2)]);
  }

  if (resultado.posicion9Box) {
    resultados.push(["Posición 9-Box", resultado.posicion9Box]);
  }

  resultados.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 14, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(value.toString(), 80, yPosition);
    yPosition += 7;
  });

  yPosition += 10;

  // Plan de desarrollo
  if (planDesarrollo && planDesarrollo.competenciasDesarrollar) {
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Plan de Desarrollo", 14, yPosition);
    yPosition += 10;

    planDesarrollo.competenciasDesarrollar.forEach((comp: any, index: number) => {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}. ${comp.competencia}`, 14, yPosition);
      yPosition += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Nivel Actual: ${comp.nivelActual}/5`, 20, yPosition);
      yPosition += 6;
      doc.text(`Nivel Objetivo: ${comp.nivelObjetivo}/5`, 20, yPosition);
      yPosition += 6;
      doc.text(`Plazo: ${comp.plazo}`, 20, yPosition);
      yPosition += 6;

      if (comp.acciones && comp.acciones.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Acciones:", 20, yPosition);
        yPosition += 6;
        doc.setFont("helvetica", "normal");
        comp.acciones.forEach((accion: string) => {
          doc.text(`• ${accion}`, 25, yPosition);
          yPosition += 6;
        });
      }

      yPosition += 5;
    });

    if (planDesarrollo.feedbackIndividual) {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Feedback Individual", 14, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const feedbackLines = doc.splitTextToSize(planDesarrollo.feedbackIndividual, pageWidth - 28);
      feedbackLines.forEach((line: string) => {
        doc.text(line, 14, yPosition);
        yPosition += 6;
      });
    }
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  const filename = `resultado_${colaboradorNombre.replace(/\s+/g, "_")}_${periodo}.pdf`;
  doc.save(filename);
};

// Exportar plan de desarrollo a PDF (versión imprimible)
export const exportPlanDesarrolloPDF = (
  colaboradorNombre: string,
  periodo: string,
  plan: any
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Encabezado
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Plan de Desarrollo Personalizado", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Colaborador: ${colaboradorNombre}`, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 7;
  doc.text(`Período: ${periodo}`, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 15;

  // Competencias
  plan.competenciasDesarrollar.forEach((comp: any, index: number) => {
    if (yPosition > pageHeight - 100) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`${index + 1}. ${comp.competencia}`, 14, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Nivel Actual: ${comp.nivelActual}/5`, 20, yPosition);
    yPosition += 6;
    doc.text(`Nivel Objetivo: ${comp.nivelObjetivo}/5`, 20, yPosition);
    yPosition += 6;
    doc.text(`Plazo: ${comp.plazo}`, 20, yPosition);
    yPosition += 8;

    if (comp.acciones && comp.acciones.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("Acciones Concretas:", 20, yPosition);
      yPosition += 7;
      doc.setFont("helvetica", "normal");
      comp.acciones.forEach((accion: string) => {
        doc.text(`• ${accion}`, 25, yPosition);
        yPosition += 6;
      });
    }

    yPosition += 10;
  });

  // Feedback
  if (plan.feedbackIndividual) {
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Feedback Individual", 14, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const feedbackLines = doc.splitTextToSize(plan.feedbackIndividual, pageWidth - 28);
    feedbackLines.forEach((line: string) => {
      doc.text(line, 14, yPosition);
      yPosition += 6;
    });
  }

  // Espacio para firmas
  yPosition = pageHeight - 60;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.line(14, yPosition, pageWidth / 2 - 10, yPosition);
  doc.text("Firma del Colaborador", pageWidth / 4, yPosition + 10, { align: "center" });
  
  doc.line(pageWidth / 2 + 10, yPosition, pageWidth - 14, yPosition);
  doc.text("Firma del Jefe Evaluador", (pageWidth / 4) * 3, yPosition + 10, { align: "center" });

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  const filename = `plan_desarrollo_${colaboradorNombre.replace(/\s+/g, "_")}_${periodo}.pdf`;
  doc.save(filename);
};

