import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import { es } from "date-fns/locale";
import { scoreToPercentage } from "./calculations";
import React from "react";

/**
 * Obtiene el nombre completo de la Directora de RRHH desde la base de datos
 * Busca primero por nombre "Nuria" o "Nury", luego por cargo/área, y finalmente por rol
 * @returns Nombre completo de la directora o null si no se encuentra
 */
export const getDirectoraRRHHNombre = async (): Promise<string | null> => {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    
    // Primero buscar por nombre "Nuria" o "Nury" (en nombre o apellidos)
    let { data: directora } = await supabase
      .from("users")
      .select("nombre, apellidos")
      .or("nombre.ilike.%Nuria%,nombre.ilike.%Nury%,apellidos.ilike.%Nuria%,apellidos.ilike.%Nury%")
      .eq("estado", "activo")
      .limit(1)
      .maybeSingle();
    
    // Si no se encuentra por nombre, buscar por cargo "Directora" en área de RRHH
    if (!directora) {
      const { data: directoraPorCargo } = await supabase
        .from("users")
        .select("nombre, apellidos")
        .ilike("cargo", "%Directora%")
        .ilike("area", "%recursos humanos%")
        .eq("estado", "activo")
        .limit(1)
        .maybeSingle();
      
      directora = directoraPorCargo || null;
    }
    
    // Si aún no se encuentra, buscar por cargo o área relacionada a RRHH
    if (!directora) {
      const { data: directoraPorCargo2 } = await supabase
        .from("users")
        .select("nombre, apellidos")
        .or("cargo.ilike.%recursos humanos%,cargo.ilike.%RRHH%,cargo.ilike.%rrhh%,area.ilike.%recursos humanos%")
        .eq("estado", "activo")
        .limit(1)
        .maybeSingle();
      
      directora = directoraPorCargo2 || null;
    }
    
    // Si aún no se encuentra, buscar por rol admin_rrhh o admin_general
    if (!directora) {
      const { data: directoraPorRol } = await supabase
        .from("users")
        .select("nombre, apellidos")
        .in("rol", ["admin_rrhh", "admin_general"])
        .eq("estado", "activo")
        .limit(1)
        .maybeSingle();
      
      directora = directoraPorRol || null;
    }
    
    if (directora) {
      return directora.apellidos 
        ? `${directora.nombre} ${directora.apellidos}` 
        : directora.nombre;
    }
    
    return null;
  } catch (error) {
    console.error("Error obteniendo nombre de Directora RRHH:", error);
    return null;
  }
};

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
  planDesarrollo?: any,
  resultadoConsolidado?: any // Información de múltiples evaluadores
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

  // Agregar información de múltiples evaluadores si existe
  if (resultadoConsolidado && resultadoConsolidado.totalEvaluadores > 1) {
    resultados.push(["Total Evaluadores", `${resultadoConsolidado.totalEvaluadores}`]);
  }

  resultados.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 14, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(value.toString(), 80, yPosition);
    yPosition += 7;
  });

  // Mostrar detalles de múltiples evaluadores si existen
  if (resultadoConsolidado && resultadoConsolidado.totalEvaluadores > 1 && resultadoConsolidado.resultadosPorEvaluador) {
    yPosition += 5;
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Evaluaciones por Evaluador", 14, yPosition);
    yPosition += 10;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    resultadoConsolidado.resultadosPorEvaluador.forEach((evalResult: any, idx: number) => {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }
      
      const evaluadorNombre = evalResult.evaluadorNombre || `Evaluador ${idx + 1}`;
      doc.setFont("helvetica", "bold");
      doc.text(`${evaluadorNombre}:`, 20, yPosition);
      yPosition += 6;
      
      doc.setFont("helvetica", "normal");
      doc.text(`  Desempeño: ${scoreToPercentage(evalResult.desempenoFinal)}%`, 25, yPosition);
      yPosition += 5;
      
      if (evalResult.potencial) {
        doc.text(`  Potencial: ${scoreToPercentage(evalResult.potencial)}%`, 25, yPosition);
        yPosition += 5;
      }
      
      if (evalResult.posicion9Box) {
        doc.text(`  9-Box: ${evalResult.posicion9Box}`, 25, yPosition);
        yPosition += 5;
      }
      
      yPosition += 3;
    });
  }

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
/**
 * Función auxiliar compartida para preparar datos de PDF
 * Garantiza que tanto la exportación individual como masiva usen exactamente la misma lógica
 * Cumple con principios DRY (Don't Repeat Yourself) y Single Source of Truth
 */
interface PreparePDFDataParams {
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
    jefeNombre?: string;
    directoraRRHHNombre?: string;
  };
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
      dimensionId?: string;
      descripcion?: string;
    }>;
    resultadoConsolidado?: {
      totalEvaluadores?: number;
      resultadosPorEvaluador?: Array<{
        evaluadorNombre?: string;
        desempenoFinal?: number;
        potencial?: number;
        posicion9Box?: string;
      }>;
    };
  };
}

interface PreparedPDFData {
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
    jefeNombre?: string;
    jefeCargo?: string;
    directoraRRHHNombre?: string;
    directoraRRHHCargo?: string;
  };
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
      dimensionId?: string;
      descripcion?: string;
      explicacion?: string;
    }>;
    resultadoConsolidado?: {
      totalEvaluadores?: number;
      resultadosPorEvaluador?: Array<{
        evaluadorNombre?: string;
        desempenoFinal?: number;
        potencial?: number;
        posicion9Box?: string;
      }>;
    };
  };
}

const preparePDFData = async (params: PreparePDFDataParams): Promise<PreparedPDFData> => {
  const { empleado, resultadoData } = params;

  // 1. Obtener nombre del jefe inmediato si no está proporcionado
  // IMPORTANTE: C1 (Concejo Municipal) no tiene jefe, así que no intentar obtenerlo
  let nombreJefe = empleado.jefeNombre;
  if (!nombreJefe && empleado.dpi && empleado.nivel !== 'C1') {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Primero intentar obtener desde user_assignments (relación activa)
      const { data: assignment } = await supabase
        .from("user_assignments")
        .select("jefe_id")
        .eq("colaborador_id", empleado.dpi)
        .eq("activo", true)
        .maybeSingle();
      
      let jefeId = null;
      if (assignment?.jefe_id) {
        jefeId = assignment.jefe_id;
      } else {
        // Si no hay en user_assignments, intentar desde users.jefe_inmediato_id
        const { data: usuario } = await supabase
          .from("users")
          .select("jefe_inmediato_id")
          .eq("dpi", empleado.dpi)
          .maybeSingle();
        
        jefeId = usuario?.jefe_inmediato_id || null;
      }
      
      if (jefeId) {
        const { data: jefe } = await supabase
          .from("users")
          .select("nombre, apellidos, cargo")
          .eq("dpi", jefeId)
          .maybeSingle();
        
        if (jefe) {
          nombreJefe = jefe.apellidos 
            ? `${jefe.nombre} ${jefe.apellidos}` 
            : jefe.nombre;
          // Guardar cargo del jefe si existe
          if (jefe.cargo && typeof jefe.cargo === 'string' && jefe.cargo.trim() !== '') {
            empleado.jefeCargo = jefe.cargo.trim();
          }
        }
      }
    } catch (error) {
      console.error("Error obteniendo nombre del jefe:", error);
    }
  }
  
  // 2. Obtener nombre y cargo de la Directora de RRHH
  let nombreDirectoraRRHH = empleado.directoraRRHHNombre;
  let cargoDirectoraRRHH = empleado.directoraRRHHCargo;
  
  if (!nombreDirectoraRRHH || !cargoDirectoraRRHH) {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Buscar por nombre "Nuria" o "Nury"
      let { data: directora } = await supabase
        .from("users")
        .select("nombre, apellidos, cargo")
        .or("nombre.ilike.%Nuria%,nombre.ilike.%Nury%,apellidos.ilike.%Nuria%,apellidos.ilike.%Nury%")
        .eq("estado", "activo")
        .limit(1)
        .maybeSingle();
      
      // Si no se encuentra por nombre, buscar por cargo "Directora" en área de RRHH
      if (!directora) {
        const { data: directoraPorCargo } = await supabase
          .from("users")
          .select("nombre, apellidos, cargo")
          .ilike("cargo", "%Directora%")
          .ilike("area", "%recursos humanos%")
          .eq("estado", "activo")
          .limit(1)
          .maybeSingle();
        
        directora = directoraPorCargo || null;
      }
      
      // Si aún no se encuentra, buscar por cargo o área relacionada a RRHH
      if (!directora) {
        const { data: directoraPorCargo2 } = await supabase
          .from("users")
          .select("nombre, apellidos, cargo")
          .or("cargo.ilike.%recursos humanos%,cargo.ilike.%RRHH%,cargo.ilike.%rrhh%,area.ilike.%recursos humanos%")
          .eq("estado", "activo")
          .limit(1)
          .maybeSingle();
        
        directora = directoraPorCargo2 || null;
      }
      
      // Si aún no se encuentra, buscar por rol admin_rrhh o admin_general
      if (!directora) {
        const { data: directoraPorRol } = await supabase
          .from("users")
          .select("nombre, apellidos, cargo")
          .or("rol.eq.admin_rrhh,rol.eq.admin_general")
          .eq("estado", "activo")
          .limit(1)
          .maybeSingle();
        
        directora = directoraPorRol || null;
      }
      
      if (directora) {
        if (!nombreDirectoraRRHH) {
          nombreDirectoraRRHH = directora.apellidos 
            ? `${directora.nombre} ${directora.apellidos}` 
            : directora.nombre;
        }
        if (!cargoDirectoraRRHH && directora.cargo && typeof directora.cargo === 'string' && directora.cargo.trim() !== '') {
          cargoDirectoraRRHH = directora.cargo.trim();
        }
      } else {
        // Fallback: usar función original si no se encuentra
        if (!nombreDirectoraRRHH) {
          nombreDirectoraRRHH = await getDirectoraRRHHNombre() || undefined;
        }
        if (!cargoDirectoraRRHH) {
          cargoDirectoraRRHH = 'Directora de Recursos Humanos';
        }
      }
    } catch (error) {
      console.error("Error obteniendo información de Directora RRHH:", error);
      if (!nombreDirectoraRRHH) {
        nombreDirectoraRRHH = await getDirectoraRRHHNombre() || undefined;
      }
      if (!cargoDirectoraRRHH) {
        cargoDirectoraRRHH = 'Directora de Recursos Humanos';
      }
    }
  }
  
  // 3. Pre-cargar explicaciones de la base de datos para cada dimensión
  const { getDimensionExplanation } = await import("@/lib/generateDimensionExplanations");
  const radarDataWithExplanations = await Promise.all(
    resultadoData.radarData.map(async (r) => {
      // Asegurar que todos los valores sean válidos
      const dimension = r.dimension || `Dimensión ${r.dimensionId || 'desconocida'}`;
      const tuEvaluacion = typeof r.tuEvaluacion === 'number' && !isNaN(r.tuEvaluacion) ? r.tuEvaluacion : 0;
      const promedioMunicipal = r.promedioMunicipal !== undefined && typeof r.promedioMunicipal === 'number' && !isNaN(r.promedioMunicipal) ? r.promedioMunicipal : undefined;
      
      let explicacion: string | null | undefined = null;
      if (r.dimensionId && empleado.nivel) {
        try {
          const result = await getDimensionExplanation(
            r.dimensionId,
            empleado.nivel,
            tuEvaluacion,
            promedioMunicipal
          );
          // Asegurar que explicacion sea string o undefined, nunca null
          explicacion = result && typeof result === 'string' && result.trim() !== '' ? result : undefined;
        } catch (error) {
          console.warn(`No se pudo obtener explicación para ${r.dimensionId}:`, error);
          explicacion = undefined;
        }
      }
      return {
        dimension,
        tuEvaluacion,
        promedioMunicipal,
        dimensionId: r.dimensionId || undefined,
        descripcion: (r.descripcion && typeof r.descripcion === 'string' && r.descripcion.trim() !== '') ? r.descripcion : undefined,
        explicacion: explicacion // Ya está validado arriba
      };
    })
  );
  
  // 4. Validar y limpiar fortalezas y áreas de oportunidad
  const fortalezasValidas = (resultadoData.fortalezas || []).map(f => ({
    dimension: f.dimension || 'Dimensión desconocida',
    nombreCompleto: f.nombreCompleto || f.dimension || 'Dimensión desconocida',
    tuEvaluacion: typeof f.tuEvaluacion === 'number' && !isNaN(f.tuEvaluacion) ? f.tuEvaluacion : 0,
    promedioMunicipal: f.promedioMunicipal !== undefined && typeof f.promedioMunicipal === 'number' && !isNaN(f.promedioMunicipal) ? f.promedioMunicipal : undefined
  }));

  const areasOportunidadValidas = (resultadoData.areasOportunidad || []).map(a => ({
    dimension: a.dimension || 'Dimensión desconocida',
    nombreCompleto: a.nombreCompleto || a.dimension || 'Dimensión desconocida',
    tuEvaluacion: typeof a.tuEvaluacion === 'number' && !isNaN(a.tuEvaluacion) ? a.tuEvaluacion : 0,
    promedioMunicipal: a.promedioMunicipal !== undefined && typeof a.promedioMunicipal === 'number' && !isNaN(a.promedioMunicipal) ? a.promedioMunicipal : undefined
  }));
  
  // 5. Crear resultadoData con explicaciones pre-cargadas y datos validados
  // IMPORTANTE: Para C1 (Concejo Municipal), jefeCompleto siempre es false y no hay resultadoConsolidado
  const esC1 = empleado.nivel === 'C1';
  const resultadoDataWithExplanations = {
    performancePercentage: typeof resultadoData.performancePercentage === 'number' && !isNaN(resultadoData.performancePercentage) 
      ? resultadoData.performancePercentage 
      : 0,
    jefeCompleto: esC1 ? false : (resultadoData.jefeCompleto || false), // C1 nunca tiene evaluación de jefe
    fortalezas: fortalezasValidas,
    areasOportunidad: areasOportunidadValidas,
    radarData: radarDataWithExplanations,
    resultadoConsolidado: esC1 ? undefined : (resultadoData.resultadoConsolidado || undefined) // C1 no tiene múltiples evaluadores
  };
  
  // 6. Validar datos antes de generar PDF
  if (!resultadoDataWithExplanations || !resultadoDataWithExplanations.radarData || resultadoDataWithExplanations.radarData.length === 0) {
    throw new Error("No hay datos de evaluación disponibles para generar el PDF");
  }
  
  // 7. Validar que los datos de radar tengan la estructura correcta
  resultadoDataWithExplanations.radarData.forEach((r, idx) => {
    if (typeof r.tuEvaluacion !== 'number' || isNaN(r.tuEvaluacion)) {
      console.warn(`⚠️ Dimensión ${idx + 1} (${r.dimension}) tiene tuEvaluacion inválido:`, r.tuEvaluacion);
    }
    if (r.promedioMunicipal !== undefined && (typeof r.promedioMunicipal !== 'number' || isNaN(r.promedioMunicipal))) {
      console.warn(`⚠️ Dimensión ${idx + 1} (${r.dimension}) tiene promedioMunicipal inválido:`, r.promedioMunicipal);
    }
  });
  
  // 8. Validación adicional para C1: asegurar que jefeCompleto sea false y no haya resultadoConsolidado
  if (esC1) {
    if (resultadoDataWithExplanations.jefeCompleto !== false) {
      console.warn('⚠️ [PDF] C1 tiene jefeCompleto diferente de false, corrigiendo...');
      resultadoDataWithExplanations.jefeCompleto = false;
    }
    if (resultadoDataWithExplanations.resultadoConsolidado !== undefined) {
      console.warn('⚠️ [PDF] C1 tiene resultadoConsolidado, eliminando...');
      resultadoDataWithExplanations.resultadoConsolidado = undefined;
    }
  }
  
  return {
    empleado: {
      ...empleado,
      jefeNombre: nombreJefe,
      jefeCargo: empleado.jefeCargo,
      directoraRRHHNombre: nombreDirectoraRRHH,
      directoraRRHHCargo: cargoDirectoraRRHH,
    },
    resultadoData: resultadoDataWithExplanations,
  };
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
    jefeNombre?: string;
    jefeCargo?: string;
    directoraRRHHNombre?: string;
    directoraRRHHCargo?: string;
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
      dimensionId?: string;
      descripcion?: string;
    }>;
    resultadoConsolidado?: {
      totalEvaluadores?: number;
      resultadosPorEvaluador?: Array<{
        evaluadorNombre?: string;
        desempenoFinal?: number;
        potencial?: number;
        posicion9Box?: string;
      }>;
    };
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
    
    // Importar componente PDF y renderer dinámicamente
    const { EvaluacionPDF } = await import("@/components/pdf/EvaluacionPDF");
    const { pdf } = await import("@react-pdf/renderer");
    const React = await import("react");
    
    // Obtener datos completos con preparePDFData para asegurar información correcta
    const preparedData = await preparePDFData({ empleado, resultadoData });
    
    // Generar PDF usando React.createElement
    // IMPORTANTE: EvaluacionPDF ya retorna un <Document>, no debemos envolverlo en otro Document
    // Usar datos preparados que incluyen información completa de jefe y directora RRHH
    const blob = await pdf(
      React.createElement(EvaluacionPDF, {
        empleado: preparedData.empleado,
        periodo,
        fechaGeneracion,
        resultadoData: preparedData.resultadoData,
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
  } catch (error: any) {
    console.error("❌ Error al exportar PDF con React-PDF:", error);
    console.error("❌ Stack trace:", error?.stack);
    console.error("❌ Error details:", {
      message: error?.message,
      name: error?.name,
      cause: error?.cause
    });
    
    const toast = (await import("@/hooks/use-toast")).toast;
    
    // Solo hacer fallback si el error es específico de React-PDF, no si es de datos
    if (error?.message?.includes("No hay datos")) {
      toast({
        title: "Error",
        description: error.message || "No hay datos disponibles para generar el PDF",
        variant: "destructive"
      });
      throw error;
    }
    
    // Mostrar error detallado al usuario
    toast({
      title: "Error al generar PDF",
      description: `Error: ${error?.message || 'Error desconocido'}. Revisa la consola para más detalles.`,
      variant: "destructive",
      duration: 10000
    });
    
    // NO hacer fallback automático - el usuario debe saber que hay un problema
    // Si realmente necesita el PDF, puede intentar nuevamente o contactar soporte
    throw error;
  }
};

// Interfaz para datos de colaborador para exportación masiva
export interface ColaboradorExportData {
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
    jefeNombre?: string;
    jefeCargo?: string;
    directoraRRHHNombre?: string;
    directoraRRHHCargo?: string;
  };
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
      dimensionId?: string;
      descripcion?: string;
    }>;
  };
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
  } | null;
}

// Exportar múltiples PDFs en un archivo ZIP
export const exportMultiplePDFsToZip = async (
  colaboradores: ColaboradorExportData[],
  periodo: string,
  jefeNombre: string,
  onProgress?: (current: number, total: number, nombreColaborador: string) => void
): Promise<void> => {
  try {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    const toast = (await import("@/hooks/use-toast")).toast;

    toast({
      title: "Iniciando exportación masiva...",
      description: `Generando ${colaboradores.length} PDFs. Esto puede tomar unos minutos.`
    });

    const fechaGeneracion = new Date();
    const errores: string[] = [];
    let exitosos = 0;

    // Procesar cada colaborador
    for (let i = 0; i < colaboradores.length; i++) {
      const colaborador = colaboradores[i];
      const nombreCompleto = colaborador.empleado.apellidos
        ? `${colaborador.empleado.nombre} ${colaborador.empleado.apellidos}`
        : colaborador.empleado.nombre;

      // Notificar progreso
      if (onProgress) {
        onProgress(i + 1, colaboradores.length, nombreCompleto);
      }

      try {
        // Importar componentes necesarios
        const { EvaluacionPDF } = await import("@/components/pdf/EvaluacionPDF");
        const { pdf } = await import("@react-pdf/renderer");
        const React = await import("react");

        // Preparar resultadoData con resultadoConsolidado si existe (compatibilidad con ColaboradorExportData)
        const resultadoDataConConsolidado = {
          ...colaborador.resultadoData,
          resultadoConsolidado: (colaborador.resultadoData as any).resultadoConsolidado || undefined,
        };

        // Obtener datos completos con preparePDFData para asegurar información correcta de jefe y directora RRHH
        const preparedData = await preparePDFData({ 
          empleado: colaborador.empleado, 
          resultadoData: resultadoDataConConsolidado 
        });

        // Generar PDF usando exactamente la misma lógica que exportEvaluacionCompletaPDFReact
        // Usar datos preparados que incluyen información completa de jefe y directora RRHH
        const blob = await pdf(
          React.createElement(EvaluacionPDF, {
            empleado: preparedData.empleado,
            periodo,
            fechaGeneracion,
            resultadoData: preparedData.resultadoData,
            planDesarrollo: colaborador.planDesarrollo,
          })
        ).toBlob();

        // Convertir blob a ArrayBuffer
        const arrayBuffer = await blob.arrayBuffer();

        // Nombre del archivo limpio
        const nombreArchivo = `evaluacion_${nombreCompleto.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]/g, "")}_${periodo.replace(/\s+/g, "_")}.pdf`;

        // Agregar al ZIP
        zip.file(nombreArchivo, arrayBuffer);
        exitosos++;

        console.log(`✅ PDF generado: ${nombreArchivo} (${i + 1}/${colaboradores.length})`);

      } catch (error: any) {
        console.error(`❌ Error generando PDF para ${nombreCompleto}:`, error);
        errores.push(`${nombreCompleto}: ${error?.message || 'Error desconocido'}`);
      }

      // Pequeña pausa para no saturar el navegador
      if (i % 5 === 4) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (exitosos === 0) {
      toast({
        title: "Error",
        description: "No se pudo generar ningún PDF",
        variant: "destructive"
      });
      throw new Error("No se generó ningún PDF");
    }

    // Generar el archivo ZIP
    toast({
      title: "Comprimiendo archivos...",
      description: `${exitosos} PDFs generados, creando archivo ZIP`
    });

    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });

    // Descargar el ZIP
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    const nombreJefeLimpio = jefeNombre.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]/g, "");
    link.download = `evaluaciones_equipo_${nombreJefeLimpio}_${periodo.replace(/\s+/g, "_")}_${format(fechaGeneracion, "yyyy-MM-dd")}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Mostrar resultado final
    if (errores.length > 0) {
      toast({
        title: `Exportación completada con errores`,
        description: `${exitosos} PDFs generados, ${errores.length} fallidos. Revisa la consola para detalles.`,
        variant: "default",
        duration: 10000
      });
      console.warn("⚠️ Errores durante la exportación:", errores);
    } else {
      toast({
        title: "Exportación completada",
        description: `${exitosos} PDFs generados exitosamente en un archivo ZIP`
      });
    }

  } catch (error: any) {
    console.error("❌ Error en exportación masiva:", error);
    const toast = (await import("@/hooks/use-toast")).toast;
    toast({
      title: "Error en exportación masiva",
      description: error?.message || "Error desconocido al generar los PDFs",
      variant: "destructive"
    });
    throw error;
  }
};

// Exportar análisis de equipo/unidad a PDF
export const exportTeamAnalysisPDF = async (
  tipo: 'equipo' | 'unidad',
  jefeData: {
    nombre: string;
    cargo: string;
    area: string;
    dpi: string;
  },
  periodoData: {
    id: string;
    nombre: string;
  },
  stats: import('@/types/teamAnalysis').TeamAnalysisStats,
  colaboradores: import('@/types/teamAnalysis').TeamMember9Box[],
  aiAnalysis?: import('@/types/teamAnalysis').TeamAIAnalysisResponse | null,
  jefesSubordinados?: import('@/types/teamAnalysis').JefeParaFiltro[]
): Promise<void> => {
  // Validar datos requeridos
  if (!jefeData?.nombre || !periodoData?.nombre || !stats || !colaboradores || colaboradores.length === 0) {
    const toast = (await import("@/hooks/use-toast")).toast;
    toast({
      title: "Error de validación",
      description: "Faltan datos requeridos para generar el PDF",
      variant: "destructive"
    });
    throw new Error("Datos incompletos para generar el PDF");
  }

  try {
    const toast = (await import("@/hooks/use-toast")).toast;
    toast({
      title: "Generando PDF...",
      description: `Exportando análisis de ${tipo === 'equipo' ? 'equipo' : 'unidad'}`
    });

    const { TeamAnalysisPDF } = await import("@/components/pdf/teamAnalysis");
    const { pdf } = await import("@react-pdf/renderer");
    const React = await import("react");

    const fechaGeneracion = new Date();

    const blob = await pdf(
      React.createElement(TeamAnalysisPDF, {
        tipo,
        jefe: jefeData,
        periodo: periodoData,
        fechaGeneracion,
        stats,
        colaboradores,
        aiAnalysis: aiAnalysis || undefined,
        jefesSubordinados,
      })
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const tipoLabel = tipo === 'equipo' ? 'equipo' : 'unidad';
    const nombreLimpio = jefeData.nombre
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]/g, "")
      .substring(0, 50); // Limitar longitud del nombre
    const periodoLimpio = periodoData.nombre
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]/g, "")
      .substring(0, 30); // Limitar longitud del período
    link.download = `analisis_${tipoLabel}_${nombreLimpio}_${periodoLimpio}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "PDF generado",
      description: "El archivo se ha descargado correctamente"
    });
  } catch (error: any) {
    console.error("Error al exportar análisis de equipo:", error);
    const toast = (await import("@/hooks/use-toast")).toast;
    toast({
      title: "Error",
      description: error?.message || "Error al generar el PDF",
      variant: "destructive"
    });
    throw error;
  }
};

