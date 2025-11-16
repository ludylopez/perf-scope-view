import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import { es } from "date-fns/locale";
import { scoreToPercentage } from "./calculations";
import { pdf } from "@react-pdf/renderer";
import React from "react";

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

// Función helper para dibujar gráfico de radar
const drawRadarChart = (doc: jsPDF, x: number, y: number, radius: number, data: Array<{dimension: string, tuResultado: number}>) => {
  const numDimensions = data.length;
  if (numDimensions === 0) return;
  
  const centerX = x + radius;
  const centerY = y + radius;
  const maxValue = 100;
  
  // Dibujar círculos concéntricos (grid)
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  for (let i = 1; i <= 5; i++) {
    const r = (radius * i) / 5;
    doc.circle(centerX, centerY, r, 'D');
  }
  
  // Dibujar líneas radiales
  for (let i = 0; i < numDimensions; i++) {
    const angle = (i * 2 * Math.PI) / numDimensions - Math.PI / 2;
    const endX = centerX + radius * Math.cos(angle);
    const endY = centerY + radius * Math.sin(angle);
    doc.line(centerX, centerY, endX, endY);
    
    // Etiquetas de dimensiones
    const labelRadius = radius + 15;
    const labelX = centerX + labelRadius * Math.cos(angle);
    const labelY = centerY + labelRadius * Math.sin(angle);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    
    // Acortar nombres largos
    let label = data[i].dimension;
    if (label.length > 15) {
      label = label.substring(0, 12) + "...";
    }
    
    // Ajustar posición del texto según el ángulo
    let align: "left" | "center" | "right" = "center";
    if (Math.cos(angle) > 0.3) align = "left";
    else if (Math.cos(angle) < -0.3) align = "right";
    
    doc.text(label, labelX, labelY, { align });
  }
  
  // Dibujar polígono de datos
  const points: [number, number][] = [];
  for (let i = 0; i < numDimensions; i++) {
    const angle = (i * 2 * Math.PI) / numDimensions - Math.PI / 2;
    const value = data[i].tuResultado;
    const r = (radius * value) / maxValue;
    const px = centerX + r * Math.cos(angle);
    const py = centerY + r * Math.sin(angle);
    points.push([px, py]);
  }
  
  // Dibujar polígono de datos
  if (points.length > 0) {
    // Rellenar el polígono con líneas radiales desde el centro (efecto de relleno más eficiente)
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.3);
    const fillSteps = 10; // Reducir pasos para mejor rendimiento
    for (let step = 1; step < fillSteps; step++) {
      const factor = step / fillSteps;
      for (let i = 0; i < numDimensions; i++) {
        const angle = (i * 2 * Math.PI) / numDimensions - Math.PI / 2;
        const value = data[i].tuResultado;
        const r = (radius * value * factor) / maxValue;
        const px = centerX + r * Math.cos(angle);
        const py = centerY + r * Math.sin(angle);
        doc.line(centerX, centerY, px, py);
      }
    }
    
    // Dibujar líneas del polígono (borde)
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(2);
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      doc.line(current[0], current[1], next[0], next[1]);
    }
    
    // Dibujar puntos en los vértices
    doc.setFillColor(59, 130, 246);
    points.forEach(([px, py]) => {
      doc.circle(px, py, 2.5, 'F');
    });
  }
  
  // Etiquetas de valores en los ejes
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  for (let i = 1; i <= 5; i++) {
    const value = (i * 20);
    const labelY = centerY - (radius * i) / 5;
    doc.text(value.toString(), centerX - radius - 8, labelY, { align: "right" });
  }
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
    areasDeOportunidad: any[];
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
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(234, 179, 8);
      doc.text("★", cardX + 10, yPosition + 12);

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
  if (resultadoData.areasDeOportunidad.length > 0) {
    if (yPosition > pageHeight - 100) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Áreas de Oportunidad", 14, yPosition);
    yPosition += 12;

    resultadoData.areasDeOportunidad.forEach((area, index) => {
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
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(249, 115, 22);
      doc.text("●", cardX + 10, yPosition + 12);

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

  // Gráfico de Radar (Telaraña)
  if (resultadoData.radarData.length > 0) {
    if (yPosition > pageHeight - 120) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Panorama de Competencias", 14, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const descRadar = resultadoData.jefeCompleto 
      ? "Vista integral de tu desempeño por dimensión"
      : "Vista de tu autoevaluación por dimensión";
    doc.text(descRadar, 14, yPosition);
    yPosition += 15;

    // Dibujar gráfico de radar
    const radarSize = 70;
    const radarX = pageWidth / 2 - radarSize;
    const radarY = yPosition;
    
    const radarChartData = resultadoData.radarData.map(d => ({
      dimension: d.dimension,
      tuResultado: d.tuEvaluacion
    }));
    
    drawRadarChart(doc, radarX, radarY, radarSize, radarChartData);
    
    yPosition += radarSize * 2 + 20;
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

// Exportar evaluación completa capturando la pantalla (solución híbrida: texto seleccionable + imagen)
export const exportEvaluacionCompletaPDFFromElement = async (
  elementId: string,
  empleado: {
    nombre: string;
    apellidos?: string;
    dpi?: string;
    cargo?: string;
    area?: string;
    nivel?: string;
    direccionUnidad?: string;
    departamentoDependencia?: string;
    profesion?: string;
    correo?: string;
    telefono?: string;
  },
  periodo: string,
  fechaGeneracion: Date
) => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Elemento con ID "${elementId}" no encontrado`);
    }

    // Mostrar mensaje de carga
    const toast = (await import("@/hooks/use-toast")).toast;
    toast({
      title: "Generando PDF...",
      description: "Capturando la vista actual, por favor espere"
    });

    // Capturar el elemento como imagen (solo el contenido, sin encabezado)
    const canvas = await html2canvas(element, {
      scale: 2, // Mayor resolución
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: element.scrollWidth,
      height: element.scrollHeight,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Crear PDF en formato A4
    const doc = new jsPDF({
      orientation: imgWidth > imgHeight ? "landscape" : "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Convertir píxeles a mm (asumiendo 96 DPI: 1px = 0.264583mm)
    const pxToMm = 0.264583;
    const imgWidthMm = imgWidth * pxToMm;
    const imgHeightMm = imgHeight * pxToMm;
    
    // Calcular dimensiones
    const margin = 8; // mm - reducir márgenes para más espacio
    const footerHeight = 12; // mm - reducir footer
    
    const nombreCompleto = empleado.apellidos 
      ? `${empleado.nombre} ${empleado.apellidos}` 
      : empleado.nombre;
    
    // ===== ENCABEZADO MODERNO CON DISEÑO MEJORADO =====
    // Header más compacto y moderno
    const headerHeight = 28; // mm - header más compacto
    
    // Fondo azul con gradiente (simulado con rectángulo)
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');
    
    // Título principal centrado
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Evaluación de Desempeño", pageWidth / 2, 8, { align: "center" });
    
    // Información del empleado en diseño tipo tarjeta moderna
    // Fondo blanco con borde sutil para la tarjeta de información
    const cardY = headerHeight + 3;
    const cardHeight = 22; // Altura de la tarjeta
    const cardPadding = 4;
    
    // Fondo de tarjeta (blanco con sombra sutil)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, cardY, pageWidth - (margin * 2), cardHeight, 2, 2, 'FD');
    
    // Diseño en grid de 2 columnas
    const col1X = margin + cardPadding;
    const col2X = pageWidth / 2 + 2;
    const colWidth = (pageWidth / 2) - margin - cardPadding - 2;
    let currentY = cardY + cardPadding + 3;
    const lineHeight = 4;
    
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    
    // Columna 1 - Información personal (alineada a la izquierda)
    let col1Y = currentY;
    
    // Nombre completo
    doc.setFont("helvetica", "bold");
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(7);
    doc.text("Empleado", col1X, col1Y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    const nombreLines = doc.splitTextToSize(nombreCompleto, colWidth - 3);
    doc.text(nombreLines, col1X, col1Y + 3.5);
    col1Y += 3.5 + (nombreLines.length > 1 ? (nombreLines.length - 1) * 3 : 0) + 3;
    
    // Cargo
    if (empleado.cargo) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(6);
      doc.text("Cargo", col1X, col1Y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const cargoLines = doc.splitTextToSize(empleado.cargo, colWidth - 3);
      doc.text(cargoLines, col1X, col1Y + 3);
      col1Y += 3 + (cargoLines.length > 1 ? (cargoLines.length - 1) * 2.5 : 0) + 2;
    }
    
    // Área
    if (empleado.area) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(6);
      doc.text("Área", col1X, col1Y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const areaLines = doc.splitTextToSize(empleado.area, colWidth - 3);
      doc.text(areaLines, col1X, col1Y + 3);
      col1Y += 3 + (areaLines.length > 1 ? (areaLines.length - 1) * 2.5 : 0) + 2;
    }
    
    // Columna 2 - Información administrativa (alineada a la izquierda de su columna)
    let col2Y = currentY;
    
    // DPI
    if (empleado.dpi) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(59, 130, 246);
      doc.setFontSize(7);
      doc.text("DPI", col2X, col2Y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(empleado.dpi, col2X, col2Y + 3.5);
      col2Y += 6.5;
    }
    
    // Nivel
    if (empleado.nivel) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(6);
      doc.text("Nivel", col2X, col2Y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(empleado.nivel, col2X, col2Y + 3);
      col2Y += 5;
    }
    
    // Período
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(6);
    doc.text("Período", col2X, col2Y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(periodo, col2X, col2Y + 3);
    col2Y += 5;
    
    // Dirección/Unidad y Depto (si existen, en una fila adicional compacta)
    const maxY = Math.max(col1Y, col2Y);
    if (empleado.direccionUnidad || empleado.departamentoDependencia) {
      if (empleado.direccionUnidad) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(6);
        doc.text("Dirección/Unidad", col1X, maxY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const dirLines = doc.splitTextToSize(empleado.direccionUnidad, colWidth - 3);
        doc.text(dirLines, col1X, maxY + 3);
      }
      if (empleado.departamentoDependencia) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(6);
        doc.text("Depto/Dependencia", col2X, maxY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const deptoLines = doc.splitTextToSize(empleado.departamentoDependencia, colWidth - 3);
        doc.text(deptoLines, col2X, maxY + 3);
      }
    }
    
    // Calcular posición final después del header
    const yAfterHeader = cardY + cardHeight + 3;
    
    const availableWidth = pageWidth - (margin * 2);
    const availableHeight = pageHeight - yAfterHeader - footerHeight - margin;
    
    // Calcular altura disponible en 2 páginas
    const availableHeightFirstPage = availableHeight;
    const availableHeightNextPages = pageHeight - headerHeight - footerHeight - margin - 5;
    const totalAvailableHeight = availableHeightFirstPage + availableHeightNextPages; // Altura total en 2 páginas
    
    // Calcular escala para que el contenido quepa en máximo 2 páginas
    const scaleX = availableWidth / imgWidthMm;
    const scaleY = totalAvailableHeight / imgHeightMm; // Usar altura total de 2 páginas
    
    // Calcular escala óptima: debe caber en 2 páginas
    // Priorizar que quepa en el ancho disponible y en 2 páginas de altura
    const optimalScale = Math.min(scaleX * 0.98, scaleY * 0.98, 1); // Usar 98% del espacio disponible
    const scale = Math.max(optimalScale, 0.4); // Mínimo 40% para mantener legibilidad básica
    
    const scaledWidth = imgWidthMm * scale;
    const scaledHeight = imgHeightMm * scale;
    
    // Centrar la imagen (después del header)
    const x = (pageWidth - scaledWidth) / 2;
    let sourceY = 0;
    let pageNum = 1;
    
    // Dividir la imagen en máximo 2 páginas
    while (sourceY < imgHeight && pageNum <= 2) {
      // Calcular cuánto de la imagen cabe en esta página
      const remainingImgHeight = imgHeight - sourceY;
      const availableHeightForThisPage = pageNum === 1 ? availableHeightFirstPage : availableHeightNextPages;
      const availableHeightPx = (availableHeightForThisPage / scale) / pxToMm;
      const heightToUse = Math.min(remainingImgHeight, availableHeightPx);
      
      // Crear un canvas temporal con la porción de la imagen
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = imgWidth;
      tempCanvas.height = heightToUse;
      const tempCtx = tempCanvas.getContext("2d");
      
      if (tempCtx) {
        // Dibujar la porción de la imagen original en el canvas temporal
        tempCtx.drawImage(canvas, 0, sourceY, imgWidth, heightToUse, 0, 0, imgWidth, heightToUse);
        const tempImgData = tempCanvas.toDataURL("image/png");
        
        // Calcular altura en mm para esta porción
        const heightMm = (heightToUse * pxToMm) * scale;
        
        // Posición Y en la página
        const currentY = pageNum === 1 ? yAfterHeader : (headerHeight + 3);
        
        // Agregar la porción al PDF
        doc.addImage(tempImgData, "PNG", x, currentY, scaledWidth, heightMm);
      }
      
      sourceY += heightToUse;
      
      // Si aún queda contenido y no hemos alcanzado el límite de 2 páginas, agregar una nueva página
      if (sourceY < imgHeight && pageNum < 2) {
        doc.addPage();
        pageNum++;
        
        // Dibujar header en la nueva página
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 0, pageWidth, headerHeight, 'F');
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("Evaluación de Desempeño", pageWidth / 2, 8, { align: "center" });
        
        // Redibujar tarjeta de información del empleado en la nueva página
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, cardY, pageWidth - (margin * 2), cardHeight, 2, 2, 'FD');
        
        // Redibujar información del empleado (versión compacta para páginas siguientes)
        doc.setFontSize(7);
        doc.setTextColor(0, 0, 0);
        let infoY = cardY + cardPadding + 3;
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(59, 130, 246);
        doc.text("Empleado:", col1X, infoY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const nombreShort = nombreCompleto.length > 40 ? nombreCompleto.substring(0, 40) + "..." : nombreCompleto;
        doc.text(nombreShort, col1X + 20, infoY);
        
        if (empleado.dpi) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(59, 130, 246);
          doc.text("DPI:", col2X, infoY);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(0, 0, 0);
          doc.text(empleado.dpi, col2X + 12, infoY);
        }
        
        infoY += 4;
        if (empleado.cargo) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(6);
          doc.text("Cargo:", col1X, infoY);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(0, 0, 0);
          const cargoShort = empleado.cargo.length > 35 ? empleado.cargo.substring(0, 35) + "..." : empleado.cargo;
          doc.text(cargoShort, col1X + 15, infoY);
        }
        
        if (empleado.nivel) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(6);
          doc.text("Nivel:", col2X, infoY);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(0, 0, 0);
          doc.text(empleado.nivel, col2X + 15, infoY);
        }
        
        infoY += 4;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(6);
        doc.text("Período:", col2X, infoY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(periodo, col2X + 18, infoY);
      }
    }

    // Footer compacto en todas las páginas
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${totalPages} • Generado el ${format(fechaGeneracion, "dd/MM/yyyy HH:mm")}`,
        pageWidth / 2,
        pageHeight - 6,
        { align: "center" }
      );
    }

    // Descargar
    const filename = `evaluacion_${empleado.nombre.replace(/\s+/g, "_")}_${periodo.replace(/\s+/g, "_")}_${format(fechaGeneracion, "yyyy-MM-dd")}.pdf`;
    doc.save(filename);

    toast({
      title: "Éxito",
      description: "PDF generado exitosamente"
    });
  } catch (error) {
    console.error("Error al exportar PDF:", error);
    const toast = (await import("@/hooks/use-toast")).toast;
    toast({
      title: "Error",
      description: "Error al generar el PDF. Por favor, intente nuevamente.",
      variant: "destructive"
    });
    throw error;
  }
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

// Capturar gráfico radar como imagen para embebido en PDF
export const captureRadarChart = async (): Promise<string | null> => {
  try {
    // Buscar el elemento del gráfico radar usando diferentes selectores
    let radarElement: HTMLElement | null = null;
    
    // Intentar con data-attribute primero
    radarElement = document.querySelector('[data-radar-chart]') as HTMLElement;
    
    // Si no se encuentra, buscar por clase o estructura del componente PerformanceRadarAnalysis
    if (!radarElement) {
      const responsiveContainer = document.querySelector('.recharts-responsive-container');
      if (responsiveContainer) {
        radarElement = responsiveContainer as HTMLElement;
      }
    }
    
    // Si aún no se encuentra, buscar cualquier canvas o svg dentro de un Card que contenga "radar"
    if (!radarElement) {
      const cards = document.querySelectorAll('[class*="Card"]');
      for (const card of cards) {
        const hasRadar = card.querySelector('svg') || card.querySelector('canvas');
        if (hasRadar && card.textContent?.toLowerCase().includes('radar')) {
          radarElement = card as HTMLElement;
          break;
        }
      }
    }
    
    if (!radarElement) {
      console.warn('No se encontró el elemento del gráfico radar para capturar');
      return null;
    }
    
    // Capturar el elemento como imagen con alta calidad
    const canvas = await html2canvas(radarElement, {
      scale: 3, // Alta resolución para mejor calidad en PDF
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: radarElement.scrollWidth,
      height: radarElement.scrollHeight,
      windowWidth: radarElement.scrollWidth,
      windowHeight: radarElement.scrollHeight,
    });
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error al capturar gráfico radar:', error);
    return null;
  }
};

// Exportar evaluación completa usando React-PDF
export const exportEvaluacionCompletaPDFReact = async (
  empleado: {
    nombre: string;
    apellidos?: string;
    dpi?: string;
    cargo?: string;
    area?: string;
    nivel?: string;
    direccionUnidad?: string;
    departamentoDependencia?: string;
    profesion?: string;
    correo?: string;
    telefono?: string;
  },
  periodo: string,
  fechaGeneracion: Date,
  resultadoData: {
    performancePercentage: number;
    jefeCompleto: boolean;
    fortalezas: Array<{
      dimension: string;
      nombreCompleto?: string;
      tuEvaluacion: number;
      promedioMunicipal?: number;
    }>;
    areasOportunidad: Array<{
      dimension: string;
      nombreCompleto?: string;
      tuEvaluacion: number;
      promedioMunicipal?: number;
    }>;
    radarData: Array<{
      dimension: string;
      tuEvaluacion: number;
      promedioMunicipal?: number;
    }>;
  },
  planDesarrollo?: {
    planEstructurado?: {
      objetivos?: string[];
      acciones?: Array<{
        descripcion: string;
        responsable: string;
        fecha: string;
        recursos?: string[];
        indicador: string;
        prioridad: 'alta' | 'media' | 'baja';
      }>;
      dimensionesDebiles?: Array<{
        dimension: string;
        score?: number;
        accionesEspecificas?: string[];
      }>;
    };
    recomendaciones?: string[];
  } | null
) => {
  try {
    // Mostrar mensaje de carga
    const toast = (await import("@/hooks/use-toast")).toast;
    toast({
      title: "Generando PDF...",
      description: "Por favor espere mientras se genera el documento"
    });
    
    // Importar componente PDF dinámicamente
    const { EvaluacionPDF } = await import("@/components/pdf/EvaluacionPDF");
    
    // Generar PDF usando React.createElement para evitar problemas con JSX en archivo .ts
    const blob = await pdf(
      React.createElement(EvaluacionPDF, {
        empleado,
        periodo,
        fechaGeneracion,
        resultadoData,
        planDesarrollo,
      })
    ).toBlob();
    
    // Crear URL y descargar
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `evaluacion_${empleado.nombre.replace(/\s+/g, "_")}_${periodo.replace(/\s+/g, "_")}_${format(fechaGeneracion, "yyyy-MM-dd")}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Éxito",
      description: "PDF generado exitosamente"
    });
  } catch (error) {
    console.error("Error al exportar PDF con React-PDF:", error);
    const toast = (await import("@/hooks/use-toast")).toast;
    toast({
      title: "Error",
      description: "Error al generar el PDF. Intentando método alternativo...",
      variant: "destructive"
    });
    
    // Fallback a método anterior
    try {
      await exportEvaluacionCompletaPDFFromElement(
        "resultados-evaluacion-container",
        empleado,
        periodo,
        fechaGeneracion
      );
    } catch (fallbackError) {
      console.error("Error en fallback:", fallbackError);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF. Por favor, intente nuevamente.",
        variant: "destructive"
      });
      throw fallbackError;
    }
  }
};

