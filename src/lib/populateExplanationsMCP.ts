/**
 * Script para poblar explicaciones usando el MCP de Supabase
 * Este script procesa los instrumentos y genera las explicaciones
 */

// Datos de los instrumentos procesados manualmente
const instrumentosData = [
  // A1
  { nivel: "A1", dimensiones: [
    { id: "dim1_a1", nombre: "PRODUCTIVIDAD Y RESULTADOS INSTITUCIONALES", descripcion: "Evalúa el cumplimiento de metas institucionales, ejecución presupuestaria y resultados del Plan Operativo Anual." },
    { id: "dim2_a1", nombre: "CALIDAD DE LA GESTIÓN ADMINISTRATIVA", descripcion: "Evalúa la calidad de la gestión municipal, los servicios públicos y la respuesta a necesidades institucionales." },
    { id: "dim3_a1", nombre: "COMPETENCIAS TÉCNICAS Y ADMINISTRATIVAS", descripcion: "Evalúa las competencias técnicas y de gestión pública requeridas para el ejercicio administrativo del cargo." },
    { id: "dim4_a1", nombre: "CUMPLIMIENTO NORMATIVO Y ÉTICA ADMINISTRATIVA", descripcion: "Evalúa el cumplimiento de normativa, transparencia y conducta ética en el ejercicio administrativo." },
    { id: "dim5_a1", nombre: "COORDINACIÓN Y DIRECCIÓN ADMINISTRATIVA", descripcion: "Evalúa la efectividad en la coordinación de la estructura administrativa y el trabajo con equipos directivos." },
    { id: "dim6_a1", nombre: "DIRECCIÓN ESTRATÉGICA Y FORTALECIMIENTO INSTITUCIONAL", descripcion: "Evalúa la dirección estratégica de la administración municipal y las acciones para fortalecer las capacidades institucionales." },
  ]},
  // A3
  { nivel: "A3", dimensiones: [
    { id: "dim1_a3", nombre: "PRODUCTIVIDAD Y CUMPLIMIENTO DE OBJETIVOS", descripcion: "Esta dimensión evalúa la capacidad del colaborador para alcanzar los objetivos asignados, cumplir plazos y optimizar el uso de recursos en sus funciones administrativas." },
    { id: "dim2_a3", nombre: "CALIDAD DEL TRABAJO", descripcion: "Esta dimensión evalúa la precisión, presentación profesional, cumplimiento de estándares normativos y orientación a la mejora en el trabajo realizado." },
    { id: "dim3_a3", nombre: "COMPETENCIAS LABORALES (TÉCNICAS Y ESPECÍFICAS)", descripcion: "Esta dimensión evalúa el dominio de conocimientos, habilidades y técnicas específicas requeridas para el desempeño efectivo del puesto administrativo." },
    { id: "dim4_a3", nombre: "COMPORTAMIENTO ORGANIZACIONAL Y ACTITUD LABORAL", descripcion: "Esta dimensión evalúa la conducta laboral, responsabilidad, valores éticos y adherencia a las normas institucionales." },
    { id: "dim5_a3", nombre: "RELACIONES INTERPERSONALES Y TRABAJO EN EQUIPO", descripcion: "Esta dimensión evalúa la capacidad de comunicarse efectivamente, colaborar con otros y mantener relaciones profesionales constructivas." },
    { id: "dim6_a3", nombre: "ORIENTACIÓN AL SERVICIO Y ATENCIÓN AL USUARIO", descripcion: "Esta dimensión evalúa la actitud de servicio, calidad de atención y efectividad en la respuesta a usuarios internos (directores, jefes, compañeros) y/o externos (ciudadanos, instituciones)." },
  ]},
  // E1
  { nivel: "E1", dimensiones: [
    { id: "dim1_e1", nombre: "PRODUCTIVIDAD", descripcion: "Grado en que el/la colaborador/a cumple con las metas, objetivos y cantidad de trabajo esperado en su área, utilizando eficientemente los recursos y cumpliendo con plazos establecidos." },
    { id: "dim2_e1", nombre: "CALIDAD", descripcion: "Nivel de exactitud, precisión y cumplimiento de estándares técnicos y normativos en el trabajo realizado por el área a su cargo." },
    { id: "dim3_e1", nombre: "COMPETENCIAS LABORALES", descripcion: "Conjunto de conocimientos, habilidades técnicas y gerenciales necesarias para ejercer efectivamente el puesto de Jefe o Encargado de Unidad." },
    { id: "dim4_e1", nombre: "COMPORTAMIENTO ORGANIZACIONAL", descripcion: "Grado en que el/la colaborador/a demuestra valores institucionales, ética profesional, disciplina y actúa como modelo a seguir para su equipo." },
    { id: "dim5_e1", nombre: "RELACIONES INTERPERSONALES", descripcion: "Capacidad para establecer y mantener relaciones de trabajo efectivas, comunicarse claramente y colaborar con diversos actores internos y externos." },
    { id: "dim6_e1", nombre: "LIDERAZGO Y GESTIÓN DE EQUIPOS", descripcion: "Capacidad para dirigir, motivar, desarrollar y coordinar efectivamente al equipo de trabajo para el logro de objetivos, promoviendo un ambiente laboral positivo." },
  ]},
  // O1
  { nivel: "O1", dimensiones: [
    { id: "dim1_o1", nombre: "PRODUCTIVIDAD EN EL TRABAJO", descripcion: "Evalúa la capacidad del colaborador para completar tareas en tiempo, cumplir horarios y mantener un ritmo constante de trabajo." },
    { id: "dim2_o1", nombre: "CALIDAD DEL TRABAJO", descripcion: "Evalúa la calidad y completitud del trabajo realizado, así como la necesidad de correcciones." },
    { id: "dim3_o1", nombre: "CONOCIMIENTOS Y HABILIDADES DEL TRABAJO", descripcion: "Evalúa el conocimiento del trabajo, uso adecuado de herramientas y equipos, cumplimiento de seguridad y capacidad de reporte." },
    { id: "dim4_o1", nombre: "DISCIPLINA Y COMPORTAMIENTO", descripcion: "Evalúa el cumplimiento de reglas, actitud hacia el trabajo, respeto a las instrucciones y honestidad." },
    { id: "dim5_o1", nombre: "TRABAJO CON OTRAS PERSONAS", descripcion: "Evalúa la capacidad de trabajar en equipo, comunicación con el jefe y trato respetuoso con las personas." },
    { id: "dim6_o1", nombre: "SERVICIO Y SEGURIDAD", descripcion: "Evalúa la disposición para ayudar, rapidez en la atención, cumplimiento de reglas de seguridad y reporte de situaciones peligrosas." },
  ]},
];

// Función para adaptar descripción a lenguaje de resultado
function adaptDescriptionToResult(descripcionBase: string, porcentaje: number, dimensionNombre: string): string {
  const nombreLower = dimensionNombre.toLowerCase();
  
  let contexto = "";
  if (nombreLower.includes("productividad") || nombreLower.includes("cumplimiento") || nombreLower.includes("objetivos")) {
    contexto = "productividad";
  } else if (nombreLower.includes("calidad")) {
    contexto = "calidad";
  } else if (nombreLower.includes("competencia") || nombreLower.includes("técnica") || nombreLower.includes("conocimiento") || nombreLower.includes("laborales")) {
    contexto = "competencia";
  } else if (nombreLower.includes("comportamiento") || nombreLower.includes("actitud") || nombreLower.includes("organizacional") || nombreLower.includes("disciplina")) {
    contexto = "comportamiento";
  } else if (nombreLower.includes("relaciones") || nombreLower.includes("equipo") || nombreLower.includes("comunicación") || nombreLower.includes("trabajo con otras")) {
    contexto = "relaciones";
  } else if (nombreLower.includes("servicio") || nombreLower.includes("atención") || nombreLower.includes("usuario") || nombreLower.includes("orientación") || nombreLower.includes("seguridad")) {
    contexto = "servicio";
  } else if (nombreLower.includes("liderazgo") || nombreLower.includes("gestión") || nombreLower.includes("dirección") || nombreLower.includes("coordinación")) {
    contexto = "liderazgo";
  } else {
    contexto = "general";
  }

  let descripcionAdaptada = descripcionBase
    .replace(/^Evalúa\s+/i, "")
    .replace(/^Esta dimensión evalúa\s+/i, "")
    .replace(/^Grado en que\s+/i, "")
    .replace(/^Nivel de\s+/i, "")
    .replace(/^Conjunto de\s+/i, "")
    .replace(/^Capacidad para\s+/i, "")
    .trim();

  if (porcentaje >= 85) {
    switch (contexto) {
      case "productividad":
        return `Con un ${porcentaje.toFixed(1)}%, demuestras alta efectividad en ${descripcionAdaptada.toLowerCase()}. Tu capacidad para cumplir objetivos y optimizar recursos es excepcional.`;
      case "calidad":
        return `Con un ${porcentaje.toFixed(1)}%, tu trabajo se caracteriza por la excelencia en ${descripcionAdaptada.toLowerCase()}. La precisión y cumplimiento de estándares son consistentes.`;
      case "competencia":
        return `Con un ${porcentaje.toFixed(1)}%, demuestras un dominio excepcional de ${descripcionAdaptada.toLowerCase()}. Tus habilidades técnicas son un diferenciador clave.`;
      case "comportamiento":
        return `Con un ${porcentaje.toFixed(1)}%, tus valores y actitud profesional son un pilar sólido. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} refleja tu compromiso con la cultura organizacional.`;
      case "relaciones":
        return `Con un ${porcentaje.toFixed(1)}%, destacas por tu capacidad en ${descripcionAdaptada.toLowerCase()}. Tu habilidad para colaborar y comunicarte efectivamente es reconocida.`;
      case "servicio":
        return `Con un ${porcentaje.toFixed(1)}%, demuestras un compromiso excepcional con ${descripcionAdaptada.toLowerCase()}. Tu enfoque en el usuario es ejemplar.`;
      case "liderazgo":
        return `Con un ${porcentaje.toFixed(1)}%, demuestras excelencia en ${descripcionAdaptada.toLowerCase()}. Tu capacidad para dirigir y coordinar equipos es destacada.`;
      default:
        return `Con un ${porcentaje.toFixed(1)}%, esta es una de tus áreas más fuertes. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} refleja tu excelente desempeño.`;
    }
  } else if (porcentaje >= 75) {
    switch (contexto) {
      case "productividad":
        return `Con un ${porcentaje.toFixed(1)}%, cumples adecuadamente con ${descripcionAdaptada.toLowerCase()}. Hay oportunidad de optimizar aún más tu gestión del tiempo y recursos.`;
      case "calidad":
        return `Con un ${porcentaje.toFixed(1)}%, mantienes un nivel adecuado en ${descripcionAdaptada.toLowerCase()}. Continúa mejorando la precisión y presentación de tu trabajo.`;
      case "competencia":
        return `Con un ${porcentaje.toFixed(1)}%, muestras buenos conocimientos en ${descripcionAdaptada.toLowerCase()}. Hay espacio para fortalecer aún más tus competencias técnicas.`;
      case "comportamiento":
        return `Con un ${porcentaje.toFixed(1)}%, muestras una actitud positiva hacia el trabajo. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} puede fortalecerse aún más.`;
      case "relaciones":
        return `Con un ${porcentaje.toFixed(1)}%, mantienes buenas relaciones profesionales. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} puede mejorarse con mayor participación colaborativa.`;
      case "servicio":
        return `Con un ${porcentaje.toFixed(1)}%, muestras una actitud positiva hacia el servicio. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} puede fortalecerse para superar expectativas.`;
      case "liderazgo":
        return `Con un ${porcentaje.toFixed(1)}%, muestras buen desempeño en ${descripcionAdaptada.toLowerCase()}. Hay oportunidad de fortalecer tus habilidades de liderazgo.`;
      default:
        return `Con un ${porcentaje.toFixed(1)}%, muestras un desempeño adecuado en ${descripcionAdaptada.toLowerCase()}. Hay espacio para crecer y fortalecer aún más esta competencia.`;
    }
  } else if (porcentaje >= 60) {
    switch (contexto) {
      case "productividad":
        return `Con un ${porcentaje.toFixed(1)}%, hay oportunidad de mejorar ${descripcionAdaptada.toLowerCase()}. Considera técnicas de gestión del tiempo y priorización de tareas.`;
      case "calidad":
        return `Con un ${porcentaje.toFixed(1)}%, es importante fortalecer ${descripcionAdaptada.toLowerCase()}. Considera revisar procesos y estándares para elevar la calidad.`;
      case "competencia":
        return `Con un ${porcentaje.toFixed(1)}%, hay oportunidad de fortalecer ${descripcionAdaptada.toLowerCase()}. Considera capacitación adicional para mejorar tu desempeño técnico.`;
      case "comportamiento":
        return `Con un ${porcentaje.toFixed(1)}%, es importante enfocarse en ${descripcionAdaptada.toLowerCase()}. Considera cómo puedes demostrar mejor los valores institucionales.`;
      case "relaciones":
        return `Con un ${porcentaje.toFixed(1)}%, hay oportunidad de mejorar ${descripcionAdaptada.toLowerCase()}. Considera participar más activamente en actividades de equipo.`;
      case "servicio":
        return `Con un ${porcentaje.toFixed(1)}%, es importante fortalecer ${descripcionAdaptada.toLowerCase()}. Considera cómo puedes anticipar mejor las necesidades de los usuarios.`;
      case "liderazgo":
        return `Con un ${porcentaje.toFixed(1)}%, hay oportunidad de desarrollar ${descripcionAdaptada.toLowerCase()}. Considera capacitación en liderazgo y gestión de equipos.`;
      default:
        return `Con un ${porcentaje.toFixed(1)}%, esta área requiere atención y desarrollo. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} necesita fortalecerse.`;
    }
  } else {
    switch (contexto) {
      case "productividad":
        return `Con un ${porcentaje.toFixed(1)}%, esta área requiere atención prioritaria. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} necesita un plan de desarrollo específico.`;
      case "calidad":
        return `Con un ${porcentaje.toFixed(1)}%, es fundamental mejorar ${descripcionAdaptada.toLowerCase()}. Se requiere atención inmediata para elevar los estándares de calidad.`;
      case "competencia":
        return `Con un ${porcentaje.toFixed(1)}%, esta área requiere atención prioritaria. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} necesita desarrollo urgente.`;
      case "comportamiento":
        return `Con un ${porcentaje.toFixed(1)}%, es fundamental alinear mejor ${descripcionAdaptada.toLowerCase()}. Se requiere atención para fortalecer tu compromiso institucional.`;
      case "relaciones":
        return `Con un ${porcentaje.toFixed(1)}%, esta área requiere desarrollo urgente. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} necesita atención prioritaria.`;
      case "servicio":
        return `Con un ${porcentaje.toFixed(1)}%, es fundamental fortalecer ${descripcionAdaptada.toLowerCase()}. Se requiere atención inmediata para mejorar el servicio.`;
      case "liderazgo":
        return `Con un ${porcentaje.toFixed(1)}%, esta área requiere desarrollo urgente. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} necesita un plan de desarrollo específico.`;
      default:
        return `Con un ${porcentaje.toFixed(1)}%, esta área requiere atención prioritaria. ${descripcionAdaptada.charAt(0).toUpperCase() + descripcionAdaptada.slice(1)} necesita un plan de desarrollo específico.`;
    }
  }
}

/**
 * Genera todas las explicaciones desde los instrumentos
 */
export function generateAllExplanationsForMCP(): Array<{
  dimension_id: string;
  dimension_nombre: string;
  nivel: string;
  descripcion_base: string;
  rango_minimo: number;
  rango_maximo: number;
  explicacion: string;
  incluye_comparacion: boolean;
}> {
  const allExplanations: Array<{
    dimension_id: string;
    dimension_nombre: string;
    nivel: string;
    descripcion_base: string;
    rango_minimo: number;
    rango_maximo: number;
    explicacion: string;
    incluye_comparacion: boolean;
  }> = [];

  const rangos = [
    { min: 0, max: 59.99 },
    { min: 60, max: 74.99 },
    { min: 75, max: 84.99 },
    { min: 85, max: 100 }
  ];

  instrumentosData.forEach((instrumento) => {
    instrumento.dimensiones.forEach((dimension) => {
      rangos.forEach((rango) => {
        const porcentajeMedio = (rango.min + rango.max) / 2;
        const explicacion = adaptDescriptionToResult(
          dimension.descripcion,
          porcentajeMedio,
          dimension.nombre
        );

        allExplanations.push({
          dimension_id: dimension.id,
          dimension_nombre: dimension.nombre,
          nivel: instrumento.nivel,
          descripcion_base: dimension.descripcion,
          rango_minimo: rango.min,
          rango_maximo: rango.max,
          explicacion,
          incluye_comparacion: true
        });
      });
    });
  });

  return allExplanations;
}

