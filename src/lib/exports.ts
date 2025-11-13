import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { scoreToPercentage } from "./calculations";

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
    ["Desempeño Final", resultado.desempenoFinal ? `${scoreToPercentage(resultado.desempenoFinal)}%` : "N/A"],
    ["Autoevaluación", resultado.desempenoAuto ? `${scoreToPercentage(resultado.desempenoAuto)}%` : "N/A"],
    ["Evaluación Jefe", resultado.desempenoJefe ? `${scoreToPercentage(resultado.desempenoJefe)}%` : "N/A"],
  ];

  if (resultado.potencial) {
    resultados.push(["Potencial", `${scoreToPercentage(resultado.potencial)}%`]);
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

// Función helper para dibujar círculo de progreso
const drawCircularProgress = (doc: jsPDF, x: number, y: number, radius: number, percentage: number) => {
  // Círculo de fondo (gris)
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(8);
  doc.circle(x, y, radius, 'D');
  
  // Círculo de progreso (azul primario)
  doc.setDrawColor(59, 130, 246); // Color azul similar al primary
  doc.setLineWidth(8);
  
  // Dibujar arco de progreso usando líneas
  const startAngle = -90; // Comenzar desde arriba
  const endAngle = startAngle + (percentage / 100) * 360;
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  
  // Dibujar arco con múltiples segmentos para suavidad
  const steps = Math.max(50, Math.floor((percentage / 100) * 100));
  const angleStep = (endRad - startRad) / steps;
  
  for (let i = 0; i < steps; i++) {
    const angle1 = startRad + angleStep * i;
    const angle2 = startRad + angleStep * (i + 1);
    
    const x1 = x + radius * Math.cos(angle1);
    const y1 = y + radius * Math.sin(angle1);
    const x2 = x + radius * Math.cos(angle2);
    const y2 = y + radius * Math.sin(angle2);
    
    doc.line(x1, y1, x2, y2);
  }
  
  // Texto del porcentaje en el centro
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(59, 130, 246);
  const text = `${percentage}%`;
  const textWidth = doc.getTextWidth(text);
  doc.text(text, x - textWidth / 2, y + 4);
};

// Función helper para dibujar tarjeta con fondo de color
const drawColoredCard = (doc: jsPDF, x: number, y: number, width: number, height: number, color: [number, number, number], borderColor: [number, number, number]) => {
  // Fondo
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(x, y, width, height, 3, 3, 'F');
  
  // Borde
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, width, height, 3, 3, 'D');
};

// Exportar evaluación completa del colaborador a PDF
export const exportEvaluacionCompletaPDF = (
  empleado: {
    nombre: string;
    dpi?: string;
    cargo?: string;
    area?: string;
    nivel?: string;
  },
  periodo: string,
  fechaGeneracion: Date,
  resultadoData: {
    performancePercentage: number;
    jefeCompleto: boolean;
    fortalezas: any[];
    areasOportunidad: any[];
    radarData: any[];
    promedioMunicipal: Record<string, number>;
  }
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Encabezado con fondo de color
  doc.setFillColor(59, 130, 246); // Azul primario
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Evaluación de Desempeño", pageWidth / 2, 25, { align: "center" });
  
  yPosition = 45;

  // Tarjeta de información del empleado
  const cardX = 14;
  const cardWidth = pageWidth - 28;
  const cardHeight = 60;
  
  drawColoredCard(doc, cardX, yPosition, cardWidth, cardHeight, [249, 250, 251], [229, 231, 235]);
  
  yPosition += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(`Empleado: ${empleado.nombre}`, cardX + 8, yPosition);
  yPosition += 6;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  
  if (empleado.dpi) {
    doc.text(`DPI: ${empleado.dpi}`, cardX + 8, yPosition);
    yPosition += 5;
  }
  
  if (empleado.cargo) {
    doc.text(`Cargo: ${empleado.cargo}`, cardX + 8, yPosition);
    yPosition += 5;
  }
  
  if (empleado.area) {
    doc.text(`Área: ${empleado.area}`, cardX + 8, yPosition);
    yPosition += 5;
  }
  
  if (empleado.nivel) {
    doc.text(`Nivel: ${empleado.nivel}`, cardX + 8, yPosition);
    yPosition += 5;
  }

  doc.text(`Período: ${periodo}`, cardX + 8, yPosition);
  yPosition += 5;
  
  doc.text(`Fecha: ${format(fechaGeneracion, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}`, cardX + 8, yPosition);
  yPosition += 5;
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(34, 197, 94); // Verde para estado
  doc.text(`Estado: ${resultadoData.jefeCompleto ? "Resultado Consolidado" : "Autoevaluación Enviada"}`, cardX + 8, yPosition);
  yPosition += 20;

  // Sección de Resultado General con gráfico circular
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Resultado General", 14, yPosition);
  yPosition += 12;

  // Dibujar círculo de progreso
  const circleX = 50;
  const circleY = yPosition + 30;
  const circleRadius = 25;
  
  drawCircularProgress(doc, circleX, circleY, circleRadius, resultadoData.performancePercentage);
  
  // Interpretación al lado del círculo
  let interpretacion = "";
  let interpretacionColor: [number, number, number] = [0, 0, 0];
  if (resultadoData.performancePercentage >= 90) {
    interpretacion = "Excelente";
    interpretacionColor = [34, 197, 94]; // Verde
  } else if (resultadoData.performancePercentage >= 75) {
    interpretacion = "Bueno";
    interpretacionColor = [59, 130, 246]; // Azul
  } else if (resultadoData.performancePercentage >= 60) {
    interpretacion = "Regular";
    interpretacionColor = [234, 179, 8]; // Amarillo
  } else {
    interpretacion = "Necesita mejorar";
    interpretacionColor = [249, 115, 22]; // Naranja
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(interpretacionColor[0], interpretacionColor[1], interpretacionColor[2]);
  doc.text(`Tu desempeño es ${interpretacion}`, 90, circleY - 5);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const descripcion = resultadoData.performancePercentage >= 75 
    ? "Estás cumpliendo satisfactoriamente con las expectativas del cargo."
    : "Hay áreas importantes que requieren atención y mejora.";
  const descLines = doc.splitTextToSize(descripcion, pageWidth - 100);
  doc.text(descLines, 90, circleY + 8);
  
  yPosition = circleY + circleRadius + 20;

  // Fortalezas con tarjetas de color
  if (resultadoData.fortalezas.length > 0) {
    if (yPosition > pageHeight - 100) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Fortalezas Identificadas", 14, yPosition);
    yPosition += 12;

    resultadoData.fortalezas.forEach((fortaleza, index) => {
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = 20;
      }

      // Tarjeta amarilla para fortalezas
      const cardHeight = 35;
      drawColoredCard(
        doc, 
        cardX, 
        yPosition, 
        cardWidth, 
        cardHeight, 
        [254, 252, 232], // Amarillo claro
        [250, 204, 21]   // Amarillo borde
      );

      // Icono de trofeo (simulado con texto)
      doc.setFontSize(16);
      doc.setTextColor(234, 179, 8);
      doc.text("🏆", cardX + 10, yPosition + 12);

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      const title = fortaleza.dimension.length > 40 
        ? fortaleza.dimension.substring(0, 40) + "..." 
        : fortaleza.dimension;
      doc.text(title, cardX + 25, yPosition + 10);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Puntaje: ${fortaleza.tuEvaluacion.toFixed(1)}%`, cardX + 25, yPosition + 18);
      
      if (fortaleza.promedioMunicipal && fortaleza.promedioMunicipal > 0) {
        doc.text(`Promedio Municipal: ${fortaleza.promedioMunicipal.toFixed(1)}%`, cardX + 25, yPosition + 25);
      }
      
      yPosition += cardHeight + 8;
    });
    yPosition += 5;
  }

  // Áreas de Oportunidad con tarjetas de color
  if (resultadoData.areasOportunidad.length > 0) {
    if (yPosition > pageHeight - 100) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Áreas de Oportunidad", 14, yPosition);
    yPosition += 12;

    resultadoData.areasOportunidad.forEach((area, index) => {
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = 20;
      }

      // Tarjeta naranja para áreas de oportunidad
      const cardHeight = 35;
      drawColoredCard(
        doc, 
        cardX, 
        yPosition, 
        cardWidth, 
        cardHeight, 
        [255, 247, 237], // Naranja claro
        [249, 115, 22]   // Naranja borde
      );

      // Icono de bombilla (simulado con texto)
      doc.setFontSize(16);
      doc.setTextColor(249, 115, 22);
      doc.text("💡", cardX + 10, yPosition + 12);

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      const title = area.dimension.length > 40 
        ? area.dimension.substring(0, 40) + "..." 
        : area.dimension;
      doc.text(title, cardX + 25, yPosition + 10);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Puntaje: ${area.tuEvaluacion.toFixed(1)}%`, cardX + 25, yPosition + 18);
      
      if (area.promedioMunicipal && area.promedioMunicipal > 0) {
        doc.text(`Promedio Municipal: ${area.promedioMunicipal.toFixed(1)}%`, cardX + 25, yPosition + 25);
      }
      
      yPosition += cardHeight + 8;
    });
    yPosition += 5;
  }

  // Desglose por Dimensión
  if (resultadoData.radarData.length > 0) {
    if (yPosition > pageHeight - 100) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Desglose por Dimensión", 14, yPosition);
    yPosition += 10;

    // Preparar datos para la tabla
    const tableHeaders = ["Dimensión", "Tu Resultado (%)", "Promedio Municipal (%)"];
    const tableRows = resultadoData.radarData.map(d => {
      // Obtener promedio municipal del objeto o del record
      const promedioValue = d.promedioMunicipal || (d.dimensionData?.id ? resultadoData.promedioMunicipal[d.dimensionData.id] : 0);
      const promedio = promedioValue && promedioValue > 0 
        ? promedioValue.toFixed(1) 
        : "N/A";
      return [
        d.dimension.length > 30 ? d.dimension.substring(0, 30) + "..." : d.dimension,
        d.tuEvaluacion.toFixed(1),
        promedio
      ];
    });

    autoTable(doc, {
      head: [tableHeaders],
      body: tableRows,
      startY: yPosition,
      theme: "striped",
      headStyles: { 
        fillColor: [66, 139, 202], 
        textColor: 255,
        fontStyle: "bold"
      },
      styles: { 
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 50, halign: "center" },
        2: { cellWidth: 50, halign: "center" }
      },
      margin: { left: 14, right: 14 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Footer en todas las páginas
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
  const filename = `evaluacion_${empleado.nombre.replace(/\s+/g, "_")}_${periodo.replace(/\s+/g, "_")}_${format(fechaGeneracion, "yyyy-MM-dd")}.pdf`;
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

