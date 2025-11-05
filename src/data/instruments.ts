import { Instrument } from "@/types/evaluation";

export const INSTRUMENT_A1: Instrument = {
  id: "A1_2025_V1",
  nivel: "A1",
  version: "2025.1",
  tiempoEstimado: "18-20 minutos",
  dimensionesDesempeno: [
    {
      id: "dim1",
      nombre: "PRODUCTIVIDAD Y CUMPLIMIENTO DE OBJETIVOS INSTITUCIONALES",
      descripcion: "Esta dimensión mide el logro de resultados y metas establecidas en los instrumentos de planificación municipal.",
      peso: 0.30,
      items: [
        { id: "d1_i1", texto: "Logra el cumplimiento de las metas establecidas en el Plan Operativo Anual (POA)", orden: 1 },
        { id: "d1_i2", texto: "Ejecuta el presupuesto municipal de manera eficiente y dentro de los plazos establecidos", orden: 2 },
        { id: "d1_i3", texto: "Implementa en tiempo y forma los acuerdos aprobados por el Concejo Municipal", orden: 3 },
        { id: "d1_i4", texto: "Avanza en la ejecución de proyectos estratégicos conforme al PDM-OT y PEI municipal", orden: 4 },
        { id: "d1_i5", texto: "Administra eficientemente los recursos humanos, financieros y materiales de la municipalidad", orden: 5 },
      ],
    },
    {
      id: "dim2",
      nombre: "CALIDAD DEL TRABAJO Y CUMPLIMIENTO NORMATIVO",
      descripcion: "Esta dimensión evalúa la transparencia, apego legal y calidad en los procesos administrativos.",
      peso: 0.20,
      items: [
        { id: "d2_i1", texto: "Mantiene transparencia en la gestión de recursos y rendición de cuentas oportuna", orden: 1 },
        { id: "d2_i2", texto: "Cumple con la normativa legal vigente y procedimientos de control interno (Acuerdo A-039-2023)", orden: 2 },
        { id: "d2_i3", texto: "Presenta informes de gestión completos, precisos y en los plazos establecidos", orden: 3 },
        { id: "d2_i4", texto: "Identifica, evalúa y gestiona adecuadamente los riesgos institucionales", orden: 4 },
      ],
    },
    {
      id: "dim3",
      nombre: "COMPETENCIAS TÉCNICAS Y CONDUCTUALES",
      descripcion: "Esta dimensión mide conocimientos especializados y habilidades de gestión requeridas para el puesto.",
      peso: 0.20,
      items: [
        { id: "d3_i1", texto: "Demuestra dominio de la gestión pública municipal y marco normativo aplicable", orden: 1 },
        { id: "d3_i2", texto: "Aplica herramientas de planificación estratégica y gestión por resultados", orden: 2 },
        { id: "d3_i3", texto: "Maneja adecuadamente aspectos de finanzas municipales y ejecución presupuestaria", orden: 3 },
        { id: "d3_i4", texto: "Ejerce liderazgo efectivo sobre el equipo directivo (Gerencia, Direcciones, Secretario)", orden: 4 },
        { id: "d3_i5", texto: "Toma decisiones estratégicas oportunas y fundamentadas en información confiable", orden: 5 },
        { id: "d3_i6", texto: "Demuestra visión estratégica alineada al desarrollo sostenible del municipio", orden: 6 },
        { id: "d3_i7", texto: "Maneja efectivamente situaciones de crisis, presión y conflictos complejos", orden: 7 },
      ],
    },
    {
      id: "dim4",
      nombre: "CONDUCTA ÉTICA Y COMPROMISO INSTITUCIONAL",
      descripcion: "Esta dimensión evalúa los valores y actitudes en el ejercicio del cargo.",
      peso: 0.10,
      items: [
        { id: "d4_i1", texto: "Actúa con probidad, integridad y transparencia en el ejercicio de sus funciones", orden: 1 },
        { id: "d4_i2", texto: "Demuestra orientación a resultados y búsqueda permanente de mejora continua", orden: 2 },
        { id: "d4_i3", texto: "Mantiene disponibilidad, compromiso y dedicación con las responsabilidades del cargo", orden: 3 },
      ],
    },
    {
      id: "dim5",
      nombre: "LIDERAZGO Y COORDINACIÓN DEL EQUIPO DIRECTIVO",
      descripcion: "Esta dimensión evalúa la capacidad de dirigir y coordinar al equipo de primer nivel.",
      peso: 0.10,
      items: [
        { id: "d5_i1", texto: "Dirige efectivamente al Gerente Municipal, Directores de nivel D1 y Secretario Municipal", orden: 1 },
        { id: "d5_i2", texto: "Logra coordinación eficiente entre las diferentes dependencias municipales", orden: 2 },
        { id: "d5_i3", texto: "Se comunica de manera clara, oportuna y asertiva con el equipo administrativo", orden: 3 },
        { id: "d5_i4", texto: "Resuelve conflictos internos de manera constructiva y promueve el trabajo colaborativo", orden: 4 },
      ],
    },
    {
      id: "dim6",
      nombre: "ENFOQUE CIUDADANO Y SERVICIO PÚBLICO",
      descripcion: "Esta dimensión mide la orientación al ciudadano y vocación de servicio público.",
      peso: 0.10,
      items: [
        { id: "d6_i1", texto: "Prioriza el interés ciudadano en la toma de decisiones administrativas", orden: 1 },
        { id: "d6_i2", texto: "Atiende y responde oportunamente a las demandas y necesidades de la población", orden: 2 },
        { id: "d6_i3", texto: "Representa adecuadamente a la institución y mantiene la imagen municipal", orden: 3 },
        { id: "d6_i4", texto: "Mantiene comunicación pública clara, accesible y promueve la participación ciudadana", orden: 4 },
      ],
    },
  ],
  dimensionesPotencial: [
    {
      id: "pot1",
      nombre: "AGILIDAD DE APRENDIZAJE Y ADAPTABILIDAD",
      descripcion: "Mide la capacidad para aprender, desaprender y adaptarse a nuevos contextos.",
      peso: 0.25,
      items: [
        { id: "p1_i1", texto: "Muestra apertura para incorporar nuevos conocimientos y enfoques de gestión", orden: 1 },
        { id: "p1_i2", texto: "Se adapta efectivamente a cambios normativos, tecnológicos y del contexto municipal", orden: 2 },
        { id: "p1_i3", texto: "Demuestra flexibilidad cognitiva para abordar problemas complejos con soluciones innovadoras", orden: 3 },
      ],
    },
    {
      id: "pot2",
      nombre: "PENSAMIENTO ESTRATÉGICO Y VISIÓN SISTÉMICA",
      descripcion: "Evalúa la capacidad de visualizar el futuro y comprender las interrelaciones organizacionales.",
      peso: 0.25,
      items: [
        { id: "p2_i1", texto: "Visualiza el desarrollo del municipio a mediano y largo plazo (más allá del corto plazo)", orden: 1 },
        { id: "p2_i2", texto: "Comprende la interdependencia entre las distintas áreas y procesos municipales", orden: 2 },
        { id: "p2_i3", texto: "Anticipa tendencias, oportunidades y riesgos del entorno que afectan al municipio", orden: 3 },
      ],
    },
    {
      id: "pot3",
      nombre: "CAPACIDAD DE LIDERAZGO TRANSFORMACIONAL",
      descripcion: "Mide la habilidad para inspirar, desarrollar talento y promover cambios positivos.",
      peso: 0.20,
      items: [
        { id: "p3_i1", texto: "Inspira y moviliza al equipo hacia el logro de la visión institucional", orden: 1 },
        { id: "p3_i2", texto: "Desarrolla capacidades de liderazgo en sus colaboradores directos (plan de sucesión)", orden: 2 },
        { id: "p3_i3", texto: "Promueve activamente una cultura organizacional de excelencia y orientación a resultados", orden: 3 },
      ],
    },
    {
      id: "pot4",
      nombre: "ORIENTACIÓN A LA INNOVACIÓN Y MEJORA CONTINUA",
      descripcion: "Evalúa la capacidad de generar e implementar mejoras e innovaciones.",
      peso: 0.15,
      items: [
        { id: "p4_i1", texto: "Propone proactivamente mejoras en procesos, servicios y gestión municipal", orden: 1 },
        { id: "p4_i2", texto: "Implementa soluciones creativas y diferenciadas a problemas institucionales", orden: 2 },
      ],
    },
    {
      id: "pot5",
      nombre: "INTELIGENCIA EMOCIONAL Y GESTIÓN DE RELACIONES",
      descripcion: "Mide la capacidad de autogestión emocional y construcción de relaciones estratégicas.",
      peso: 0.15,
      items: [
        { id: "p5_i1", texto: "Demuestra autoconocimiento, autorregulación emocional y manejo de la presión", orden: 1 },
        { id: "p5_i2", texto: "Construye y mantiene relaciones estratégicas efectivas con actores clave (interinstitucionales)", orden: 2 },
        { id: "p5_i3", texto: "Gestiona conflictos complejos de manera constructiva, buscando soluciones ganar-ganar", orden: 3 },
      ],
    },
  ],
};

// Otros instrumentos se agregarán progresivamente
export const INSTRUMENTS: Record<string, Instrument> = {
  A1: INSTRUMENT_A1,
};
