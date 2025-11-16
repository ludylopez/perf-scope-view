/**
 * Funciones de exportación específicas para la Matriz 9-Box
 * Incluye exportación a PDF, Excel y datos estructurados
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { NINE_BOX_METADATA, getQuadrantMetadata } from "./nineBoxMetadata";

interface TeamMember9Box {
  dpi: string;
  nombre: string;
  cargo: string;
  area: string;
  nivel: string;
  desempenoFinal: number;
  potencial?: number;
  posicion9Box: string;
  desempenoPorcentaje: number;
  potencialPorcentaje?: number;
}

interface NineBoxData {
  [key: string]: TeamMember9Box[];
}

/**
 * Exporta la matriz 9-box a PDF con visualización gráfica
 */
export async function exportNineBoxToPDF(
  teamMembers: TeamMember9Box[],
  nineBoxData: NineBoxData,
  managerName: string,
  periodName: string
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Título principal
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Matriz 9-Box de Talento", pageWidth / 2, yPosition, { align: "center" });

  yPosition += 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Jefe: ${managerName}`, pageWidth / 2, yPosition, { align: "center" });

  yPosition += 6;
  doc.text(`Período: ${periodName}`, pageWidth / 2, yPosition, { align: "center" });

  yPosition += 6;
  doc.setFontSize(9);
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString("es-GT")}`, pageWidth / 2, yPosition, { align: "center" });

  yPosition += 15;

  // Resumen Ejecutivo
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen Ejecutivo", 14, yPosition);
  yPosition += 8;

  const totalEvaluados = teamMembers.length;
  const criticalTalent = nineBoxData["alto-alto"]?.length || 0;
  const highPotential = (nineBoxData["alto-alto"]?.length || 0) +
                        (nineBoxData["medio-alto"]?.length || 0) +
                        (nineBoxData["bajo-alto"]?.length || 0);
  const highPerformance = (nineBoxData["alto-alto"]?.length || 0) +
                          (nineBoxData["alto-medio"]?.length || 0) +
                          (nineBoxData["alto-bajo"]?.length || 0);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const summaryData = [
    ["Total Evaluados", totalEvaluados.toString()],
    ["Talento Crítico (Estrellas)", `${criticalTalent} (${((criticalTalent/totalEvaluados)*100).toFixed(1)}%)`],
    ["Alto Potencial Total", `${highPotential} (${((highPotential/totalEvaluados)*100).toFixed(1)}%)`],
    ["Alto Desempeño Total", `${highPerformance} (${((highPerformance/totalEvaluados)*100).toFixed(1)}%)`],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [["Métrica", "Valor"]],
    body: summaryData,
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246], fontSize: 10, fontStyle: "bold" },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Distribución por Cuadrante
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Distribución por Cuadrante", 14, yPosition);
  yPosition += 8;

  const distributionData = Object.entries(nineBoxData).map(([position, members]) => {
    const metadata = getQuadrantMetadata(position);
    return [
      `${metadata?.icon} ${metadata?.shortName}`,
      members.length.toString(),
      `${((members.length/totalEvaluados)*100).toFixed(1)}%`,
      metadata?.strategicImportance === "critical" ? "Crítica" :
      metadata?.strategicImportance === "high" ? "Alta" :
      metadata?.strategicImportance === "medium" ? "Media" : "Baja"
    ];
  }).filter(row => parseInt(row[1]) > 0);

  autoTable(doc, {
    startY: yPosition,
    head: [["Cuadrante", "Cantidad", "%", "Importancia"]],
    body: distributionData,
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246], fontSize: 10, fontStyle: "bold" },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Nueva página para listado detallado
  doc.addPage();
  yPosition = 20;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Listado Detallado por Cuadrante", 14, yPosition);
  yPosition += 10;

  // Listar colaboradores por cuadrante (solo cuadrantes con colaboradores)
  const positionsWithMembers = Object.entries(nineBoxData).filter(([_, members]) => members.length > 0);

  for (const [position, members] of positionsWithMembers) {
    const metadata = getQuadrantMetadata(position);

    // Verificar si hay espacio suficiente, si no, crear nueva página
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`${metadata?.icon} ${metadata?.label}`, 14, yPosition);
    yPosition += 6;

    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    const description = metadata?.description || "";
    const descriptionLines = doc.splitTextToSize(description, pageWidth - 28);
    doc.text(descriptionLines, 14, yPosition);
    yPosition += descriptionLines.length * 4 + 4;

    // Tabla de colaboradores
    const memberData = members.map(m => [
      m.nombre,
      m.cargo,
      m.area,
      `${m.desempenoPorcentaje}%`,
      m.potencialPorcentaje ? `${m.potencialPorcentaje}%` : "N/A"
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [["Nombre", "Cargo", "Área", "Desempeño", "Potencial"]],
      body: memberData,
      theme: "grid",
      headStyles: { fillColor: [71, 85, 105], fontSize: 9, fontStyle: "bold" },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Nueva página para recomendaciones
  doc.addPage();
  yPosition = 20;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Acciones Recomendadas Prioritarias", 14, yPosition);
  yPosition += 10;

  // Acciones por importancia crítica
  const criticalPositions = ["alto-alto", "medio-alto", "bajo-alto"];
  for (const position of criticalPositions) {
    const members = nineBoxData[position];
    if (!members || members.length === 0) continue;

    const metadata = getQuadrantMetadata(position);
    if (!metadata) continue;

    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`${metadata.icon} ${metadata.shortName} (${members.length} colaborador${members.length > 1 ? 'es' : ''})`, 14, yPosition);
    yPosition += 6;

    // Top 3 acciones urgentes
    const urgentActions = metadata.recommendedActions
      .filter(a => a.priority === "urgent" || a.priority === "high")
      .slice(0, 3);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    urgentActions.forEach((action, index) => {
      const priority = action.priority === "urgent" ? "🔴 URGENTE" : "🟠 ALTA";
      doc.text(`${priority} - ${action.title}`, 18, yPosition);
      yPosition += 5;

      const actionDesc = doc.splitTextToSize(action.description, pageWidth - 32);
      doc.setFont("helvetica", "italic");
      doc.text(actionDesc, 22, yPosition);
      yPosition += actionDesc.length * 4 + 3;
      doc.setFont("helvetica", "normal");
    });

    yPosition += 5;
  }

  // Pie de página
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
    doc.text(
      "Matriz 9-Box - Gestión de Talento",
      14,
      pageHeight - 10
    );
  }

  // Guardar PDF
  const fileName = `Matriz_9Box_${managerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);

  return fileName;
}

/**
 * Exporta la matriz 9-box a Excel con múltiples hojas
 */
export function exportNineBoxToExcel(
  teamMembers: TeamMember9Box[],
  nineBoxData: NineBoxData,
  managerName: string,
  periodName: string
) {
  const workbook = XLSX.utils.book_new();

  // Hoja 1: Resumen
  const summaryData = [
    ["MATRIZ 9-BOX DE TALENTO"],
    ["Jefe:", managerName],
    ["Período:", periodName],
    ["Fecha:", new Date().toLocaleDateString("es-GT")],
    [],
    ["RESUMEN EJECUTIVO"],
    ["Total Evaluados", teamMembers.length],
    ["Talento Crítico (Estrellas)", nineBoxData["alto-alto"]?.length || 0],
    ["Alto Potencial Total",
      (nineBoxData["alto-alto"]?.length || 0) +
      (nineBoxData["medio-alto"]?.length || 0) +
      (nineBoxData["bajo-alto"]?.length || 0)],
    ["Alto Desempeño Total",
      (nineBoxData["alto-alto"]?.length || 0) +
      (nineBoxData["alto-medio"]?.length || 0) +
      (nineBoxData["alto-bajo"]?.length || 0)],
    [],
    ["DISTRIBUCIÓN POR CUADRANTE"],
    ["Cuadrante", "Cantidad", "Porcentaje", "Importancia Estratégica"],
  ];

  Object.entries(nineBoxData).forEach(([position, members]) => {
    const metadata = getQuadrantMetadata(position);
    summaryData.push([
      `${metadata?.shortName}`,
      members.length,
      `${((members.length/teamMembers.length)*100).toFixed(1)}%`,
      metadata?.strategicImportance === "critical" ? "Crítica" :
      metadata?.strategicImportance === "high" ? "Alta" :
      metadata?.strategicImportance === "medium" ? "Media" : "Baja"
    ]);
  });

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen");

  // Hoja 2: Listado Completo
  const allMembersData = [
    ["Nombre", "Cargo", "Área", "Nivel", "Posición 9-Box", "Desempeño %", "Potencial %", "Importancia", "Prioridad Retención"]
  ];

  teamMembers.forEach(member => {
    const metadata = getQuadrantMetadata(member.posicion9Box);
    allMembersData.push([
      member.nombre,
      member.cargo,
      member.area,
      member.nivel,
      metadata?.shortName || member.posicion9Box,
      member.desempenoPorcentaje,
      member.potencialPorcentaje || "N/A",
      metadata?.strategicImportance === "critical" ? "Crítica" :
      metadata?.strategicImportance === "high" ? "Alta" :
      metadata?.strategicImportance === "medium" ? "Media" : "Baja",
      metadata?.retentionPriority === "urgent" ? "Urgente" :
      metadata?.retentionPriority === "high" ? "Alta" :
      metadata?.retentionPriority === "medium" ? "Media" : "Baja"
    ]);
  });

  const allMembersSheet = XLSX.utils.aoa_to_sheet(allMembersData);
  XLSX.utils.book_append_sheet(workbook, allMembersSheet, "Listado Completo");

  // Hojas 3-11: Una hoja por cuadrante con colaboradores
  Object.entries(nineBoxData).forEach(([position, members]) => {
    if (members.length === 0) return;

    const metadata = getQuadrantMetadata(position);
    const sheetData = [
      [metadata?.label || position],
      [metadata?.description || ""],
      [],
      ["Nombre", "Cargo", "Área", "Nivel", "Desempeño %", "Potencial %"],
    ];

    members.forEach(member => {
      sheetData.push([
        member.nombre,
        member.cargo,
        member.area,
        member.nivel,
        member.desempenoPorcentaje,
        member.potencialPorcentaje || "N/A"
      ]);
    });

    sheetData.push([]);
    sheetData.push(["ACCIONES RECOMENDADAS"]);

    metadata?.recommendedActions.slice(0, 5).forEach(action => {
      sheetData.push([
        `${action.priority === "urgent" ? "🔴 URGENTE" : action.priority === "high" ? "🟠 ALTA" : "⚡"} ${action.title}`,
        action.description
      ]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(sheetData);
    const sheetName = metadata?.shortName.substring(0, 31) || position;
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  });

  // Guardar archivo
  const fileName = `Matriz_9Box_${managerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);

  return fileName;
}

/**
 * Exporta datos para análisis (JSON estructurado)
 */
export function exportNineBoxToJSON(
  teamMembers: TeamMember9Box[],
  nineBoxData: NineBoxData,
  managerName: string,
  periodName: string
) {
  const exportData = {
    metadata: {
      manager: managerName,
      period: periodName,
      exportDate: new Date().toISOString(),
      totalMembers: teamMembers.length,
    },
    summary: {
      criticalTalent: nineBoxData["alto-alto"]?.length || 0,
      highPotential: (nineBoxData["alto-alto"]?.length || 0) +
                     (nineBoxData["medio-alto"]?.length || 0) +
                     (nineBoxData["bajo-alto"]?.length || 0),
      highPerformance: (nineBoxData["alto-alto"]?.length || 0) +
                       (nineBoxData["alto-medio"]?.length || 0) +
                       (nineBoxData["alto-bajo"]?.length || 0),
    },
    distribution: Object.entries(nineBoxData).map(([position, members]) => {
      const metadata = getQuadrantMetadata(position);
      return {
        position,
        label: metadata?.label,
        shortName: metadata?.shortName,
        count: members.length,
        percentage: ((members.length/teamMembers.length)*100).toFixed(1),
        strategicImportance: metadata?.strategicImportance,
        retentionPriority: metadata?.retentionPriority,
      };
    }),
    members: teamMembers.map(member => {
      const metadata = getQuadrantMetadata(member.posicion9Box);
      return {
        ...member,
        quadrantLabel: metadata?.label,
        quadrantShortName: metadata?.shortName,
        strategicImportance: metadata?.strategicImportance,
        retentionPriority: metadata?.retentionPriority,
      };
    }),
  };

  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Matriz_9Box_${managerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);

  return link.download;
}
