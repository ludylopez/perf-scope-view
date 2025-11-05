import { Instrument } from "@/types/evaluation";

export const INSTRUMENT_A1: Instrument = {
  id: "A1_2025_V1",
  nivel: "A1",
  version: "2025.1",
  dimensionesDesempeno: [
    {
      id: "dim1",
      nombre: "Productividad y cumplimiento",
      peso: 0.30,
      items: [
        { id: "d1_i1", texto: "Cumple con las metas y objetivos establecidos en tiempo y forma", orden: 1 },
        { id: "d1_i2", texto: "Administra eficientemente los recursos asignados", orden: 2 },
        { id: "d1_i3", texto: "Demuestra capacidad para priorizar tareas según su importancia", orden: 3 },
        { id: "d1_i4", texto: "Mantiene un nivel de productividad constante", orden: 4 },
        { id: "d1_i5", texto: "Propone mejoras para optimizar procesos", orden: 5 },
      ],
    },
    {
      id: "dim2",
      nombre: "Calidad y normativo",
      peso: 0.20,
      items: [
        { id: "d2_i1", texto: "Cumple con los estándares de calidad establecidos", orden: 1 },
        { id: "d2_i2", texto: "Conoce y aplica las normativas y procedimientos vigentes", orden: 2 },
        { id: "d2_i3", texto: "Detecta y corrige errores de manera proactiva", orden: 3 },
        { id: "d2_i4", texto: "Documenta adecuadamente sus procesos y resultados", orden: 4 },
      ],
    },
    {
      id: "dim3",
      nombre: "Competencias técnicas y conductuales",
      peso: 0.20,
      items: [
        { id: "d3_i1", texto: "Posee los conocimientos técnicos necesarios para su puesto", orden: 1 },
        { id: "d3_i2", texto: "Se mantiene actualizado en su área de especialización", orden: 2 },
        { id: "d3_i3", texto: "Comunica ideas de forma clara y efectiva", orden: 3 },
        { id: "d3_i4", texto: "Trabaja colaborativamente con otros equipos", orden: 4 },
        { id: "d3_i5", texto: "Resuelve conflictos de manera constructiva", orden: 5 },
        { id: "d3_i6", texto: "Demuestra proactividad e iniciativa", orden: 6 },
        { id: "d3_i7", texto: "Maneja el estrés y la presión de manera adecuada", orden: 7 },
      ],
    },
    {
      id: "dim4",
      nombre: "Ética y compromiso",
      peso: 0.10,
      items: [
        { id: "d4_i1", texto: "Actúa con integridad y transparencia", orden: 1 },
        { id: "d4_i2", texto: "Respeta los valores y la cultura organizacional", orden: 2 },
        { id: "d4_i3", texto: "Demuestra compromiso con la institución", orden: 3 },
      ],
    },
    {
      id: "dim5",
      nombre: "Liderazgo del equipo directivo",
      peso: 0.10,
      items: [
        { id: "d5_i1", texto: "Inspira y motiva a su equipo", orden: 1 },
        { id: "d5_i2", texto: "Toma decisiones estratégicas acertadas", orden: 2 },
        { id: "d5_i3", texto: "Delega responsabilidades de manera efectiva", orden: 3 },
        { id: "d5_i4", texto: "Desarrolla las capacidades de su equipo", orden: 4 },
      ],
    },
    {
      id: "dim6",
      nombre: "Enfoque al ciudadano",
      peso: 0.10,
      items: [
        { id: "d6_i1", texto: "Orienta su trabajo hacia la satisfacción del ciudadano", orden: 1 },
        { id: "d6_i2", texto: "Responde oportunamente a las necesidades de los usuarios", orden: 2 },
        { id: "d6_i3", texto: "Busca continuamente mejorar la experiencia del ciudadano", orden: 3 },
        { id: "d6_i4", texto: "Escucha y atiende las inquietudes de forma respetuosa", orden: 4 },
      ],
    },
  ],
  dimensionesPotencial: [
    {
      id: "pot1",
      nombre: "Aprendizaje y adaptabilidad",
      peso: 0.25,
      items: [
        { id: "p1_i1", texto: "Aprende rápidamente nuevas habilidades y conocimientos", orden: 1 },
        { id: "p1_i2", texto: "Se adapta fácilmente a cambios en el entorno laboral", orden: 2 },
        { id: "p1_i3", texto: "Demuestra flexibilidad ante situaciones imprevistas", orden: 3 },
      ],
    },
    {
      id: "pot2",
      nombre: "Pensamiento estratégico",
      peso: 0.25,
      items: [
        { id: "p2_i1", texto: "Visualiza el panorama completo y anticipa tendencias", orden: 1 },
        { id: "p2_i2", texto: "Genera soluciones innovadoras a problemas complejos", orden: 2 },
        { id: "p2_i3", texto: "Alinea acciones con objetivos de largo plazo", orden: 3 },
      ],
    },
    {
      id: "pot3",
      nombre: "Liderazgo transformacional",
      peso: 0.20,
      items: [
        { id: "p3_i1", texto: "Influye positivamente en otros para alcanzar metas", orden: 1 },
        { id: "p3_i2", texto: "Promueve una cultura de mejora continua", orden: 2 },
        { id: "p3_i3", texto: "Empodera a otros para tomar decisiones", orden: 3 },
      ],
    },
    {
      id: "pot4",
      nombre: "Innovación",
      peso: 0.15,
      items: [
        { id: "p4_i1", texto: "Propone ideas creativas y fuera de lo convencional", orden: 1 },
        { id: "p4_i2", texto: "Experimenta con nuevos enfoques y metodologías", orden: 2 },
      ],
    },
    {
      id: "pot5",
      nombre: "Inteligencia emocional",
      peso: 0.15,
      items: [
        { id: "p5_i1", texto: "Reconoce y gestiona sus propias emociones", orden: 1 },
        { id: "p5_i2", texto: "Comprende y responde a las emociones de otros", orden: 2 },
        { id: "p5_i3", texto: "Mantiene la calma y claridad en situaciones difíciles", orden: 3 },
      ],
    },
  ],
};

// Otros instrumentos se agregarán progresivamente
export const INSTRUMENTS: Record<string, Instrument> = {
  A1: INSTRUMENT_A1,
};
