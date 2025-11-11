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

export const INSTRUMENT_A3: Instrument = {
  id: "A3_2025_V1",
  nivel: "A3",
  version: "2025.1",
  tiempoEstimado: "20-25 minutos",
  dimensionesDesempeno: [
    {
      id: "dim1_a3",
      nombre: "PRODUCTIVIDAD Y CUMPLIMIENTO DE OBJETIVOS",
      descripcion: "Esta dimensión evalúa la capacidad del colaborador para alcanzar los objetivos asignados, cumplir plazos y optimizar el uso de recursos en sus funciones administrativas.",
      peso: 0.20,
      items: [
        { id: "d1_i1_a3", texto: "Completa las tareas administrativas asignadas (gestión de agenda, correspondencia, elaboración de oficios/memorandos, archivo, trámites, reportes) dentro de los plazos establecidos", orden: 1 },
        { id: "d1_i2_a3", texto: "Maneja eficientemente varias tareas al mismo tiempo, priorizando apropiadamente según urgencia e importancia, sin que la calidad del trabajo se vea afectada", orden: 2 },
        { id: "d1_i3_a3", texto: "Utiliza productivamente los recursos disponibles (tiempo de trabajo, herramientas tecnológicas, materiales de oficina, sistemas municipales) evitando desperdicios o uso inadecuado", orden: 3 },
        { id: "d1_i4_a3", texto: "Mantiene un ritmo de trabajo apropiado que le permite completar el volumen de tareas esperado para su puesto, sin requerir supervisión constante sobre su productividad", orden: 4 },
      ],
    },
    {
      id: "dim2_a3",
      nombre: "CALIDAD DEL TRABAJO",
      descripcion: "Esta dimensión evalúa la precisión, presentación profesional, cumplimiento de estándares normativos y orientación a la mejora en el trabajo realizado.",
      peso: 0.20,
      items: [
        { id: "d2_i1_a3", texto: "Produce documentos administrativos (oficios, memorandos, actas, reportes, listados) sin errores significativos de contenido, ortografía o formato que requieran corrección", orden: 5 },
        { id: "d2_i2_a3", texto: "Mantiene orden en su área de trabajo, archivos físicos y digitales. Los documentos que genera tienen presentación profesional apropiada para representar a la institución", orden: 6 },
        { id: "d2_i3_a3", texto: "Conoce y aplica correctamente los procedimientos administrativos establecidos, normativa municipal relevante y lineamientos del Sistema de Control Interno (Acuerdo A-039-2023) en su trabajo", orden: 7 },
        { id: "d2_i4_a3", texto: "Se adapta positivamente a cambios en procedimientos, sistemas o metodologías. Propone mejoras viables cuando identifica oportunidades de eficiencia en procesos de su área", orden: 8 },
      ],
    },
    {
      id: "dim3_a3",
      nombre: "COMPETENCIAS LABORALES (TÉCNICAS Y ESPECÍFICAS)",
      descripcion: "Esta dimensión evalúa el dominio de conocimientos, habilidades y técnicas específicas requeridas para el desempeño efectivo del puesto administrativo.",
      peso: 0.20,
      items: [
        { id: "d3_i1_a3", texto: "Domina los sistemas informáticos municipales, procedimientos administrativos y normativa específica de su área de trabajo necesarios para ejecutar sus funciones", orden: 9 },
        { id: "d3_i2_a3", texto: "Clasifica, organiza, resguarda y mantiene actualizado el archivo (físico y digital) de su área de forma ordenada, accesible y conforme a lineamientos institucionales", orden: 10 },
        { id: "d3_i3_a3", texto: "Redacta documentos administrativos (oficios, memorandos, actas, informes) de forma clara, coherente, profesional y con el formato institucional apropiado", orden: 11 },
        { id: "d3_i4_a3", texto: "Maneja competentemente las herramientas ofimáticas (Word, Excel, correo electrónico, plataformas digitales) y sistemas municipales requeridos para su puesto", orden: 12 },
        { id: "d3_i5_a3", texto: "Toma decisiones operativas apropiadas dentro de su ámbito de responsabilidad, resuelve situaciones administrativas rutinarias sin requerir supervisión constante y consulta oportunamente casos complejos", orden: 13 },
      ],
    },
    {
      id: "dim4_a3",
      nombre: "COMPORTAMIENTO ORGANIZACIONAL Y ACTITUD LABORAL",
      descripcion: "Esta dimensión evalúa la conducta laboral, responsabilidad, valores éticos y adherencia a las normas institucionales.",
      peso: 0.15,
      items: [
        { id: "d4_i1_a3", texto: "Es puntual en el ingreso a su jornada laboral, mantiene buena asistencia y muestra disponibilidad cuando el servicio requiere permanencia o apoyo fuera del horario habitual", orden: 14 },
        { id: "d4_i2_a3", texto: "Actúa con responsabilidad en sus funciones, cumple los compromisos adquiridos, cuida los bienes municipales asignados y responde por los resultados de su trabajo", orden: 15 },
        { id: "d4_i3_a3", texto: "Demuestra conducta ética e integridad en el ejercicio de sus funciones, maneja con probidad la información institucional y respeta la confidencialidad de documentos sensibles", orden: 16 },
        { id: "d4_i4_a3", texto: "Se identifica con la misión y objetivos de la municipalidad, contribuye positivamente al logro de metas institucionales desde su puesto y actúa alineado con los valores municipales", orden: 17 },
      ],
    },
    {
      id: "dim5_a3",
      nombre: "RELACIONES INTERPERSONALES Y TRABAJO EN EQUIPO",
      descripcion: "Esta dimensión evalúa la capacidad de comunicarse efectivamente, colaborar con otros y mantener relaciones profesionales constructivas.",
      peso: 0.10,
      items: [
        { id: "d5_i1_a3", texto: "Se comunica oralmente de forma clara, respetuosa y efectiva con su jefe inmediato, compañeros de trabajo y usuarios (internos o externos) que atiende", orden: 18 },
        { id: "d5_i2_a3", texto: "Colabora efectivamente con compañeros de su área y otras unidades, comparte información necesaria oportunamente y apoya en tareas que requieren trabajo conjunto", orden: 19 },
        { id: "d5_i3_a3", texto: "Mantiene relaciones respetuosas incluso en situaciones de presión o desacuerdo, maneja conflictos o tensiones de manera profesional y contribuye a un clima laboral positivo", orden: 20 },
      ],
    },
    {
      id: "dim6_a3",
      nombre: "ORIENTACIÓN AL SERVICIO Y ATENCIÓN AL USUARIO",
      descripcion: "Esta dimensión evalúa la actitud de servicio, calidad de atención y efectividad en la respuesta a usuarios internos (directores, jefes, compañeros) y/o externos (ciudadanos, instituciones).",
      peso: 0.15,
      items: [
        { id: "d6_i1_a3", texto: "Atiende a los usuarios (jefe inmediato, compañeros, ciudadanos, instituciones) con respeto, empatía, cortesía y actitud de servicio, proyectando buena imagen institucional", orden: 21 },
        { id: "d6_i2_a3", texto: "Resuelve apropiadamente las solicitudes dentro de su competencia o canaliza efectivamente con la persona/área correcta. Brinda información precisa y orientación útil", orden: 22 },
        { id: "d6_i3_a3", texto: "Da seguimiento a las gestiones administrativas bajo su responsabilidad hasta lograr su cierre o resolución, manteniendo informados a los interesados sobre avances", orden: 23 },
      ],
    },
  ],
  dimensionesPotencial: [
    {
      id: "pot1_a3",
      nombre: "CAPACIDADES COGNITIVAS",
      descripcion: "Evalúa la capacidad de aprendizaje, pensamiento analítico y adaptabilidad cognitiva del colaborador.",
      peso: 0.3333,
      items: [
        { id: "p1_i1_a3", texto: "Aprende con facilidad nuevos sistemas, procedimientos o metodologías de trabajo. Requiere pocas repeticiones para dominar tareas nuevas", orden: 24 },
        { id: "p1_i2_a3", texto: "Analiza situaciones, identifica causas raíz de problemas administrativos y comprende relaciones entre diferentes elementos de su trabajo", orden: 25 },
        { id: "p1_i3_a3", texto: "Se adapta efectivamente a cambios tecnológicos, metodológicos o de procedimientos, incorporando nuevas formas de trabajo sin resistencia", orden: 26 },
        { id: "p1_i4_a3", texto: "Transfiere conocimientos y experiencias previas a situaciones nuevas o no rutinarias, encontrando soluciones sin necesidad de instrucciones detalladas", orden: 27 },
      ],
    },
    {
      id: "pot2_a3",
      nombre: "COMPETENCIAS DE LIDERAZGO EMERGENTE",
      descripcion: "Evalúa el potencial de liderazgo, influencia positiva y visión institucional del colaborador.",
      peso: 0.3333,
      items: [
        { id: "p2_i1_a3", texto: "Influye positivamente en compañeros aunque no tenga personal a cargo. Es referente al que otros acuden por orientación. Toma iniciativa en proyectos o mejoras", orden: 28 },
        { id: "p2_i2_a3", texto: "Comprende cómo su trabajo contribuye a objetivos mayores de la municipalidad. Se interesa por temas institucionales más allá de sus tareas inmediatas", orden: 29 },
        { id: "p2_i3_a3", texto: "Propone mejoras, identifica oportunidades y toma iniciativa para implementar cambios positivos sin esperar que se lo soliciten", orden: 30 },
      ],
    },
    {
      id: "pot3_a3",
      nombre: "MOTIVACIÓN Y COMPROMISO CON EL DESARROLLO",
      descripcion: "Evalúa la ambición profesional constructiva, aprovechamiento de capacitaciones y búsqueda activa de retroalimentación.",
      peso: 0.3334,
      items: [
        { id: "p3_i1_a3", texto: "Muestra interés genuino en su desarrollo profesional y tiene aspiraciones claras de crecimiento dentro de la carrera administrativa municipal", orden: 31 },
        { id: "p3_i2_a3", texto: "Participa activamente en capacitaciones cuando se ofrecen, aprovecha el aprendizaje y aplica lo aprendido en su trabajo", orden: 32 },
        { id: "p3_i3_a3", texto: "Busca feedback de su jefe y compañeros para mejorar, acepta la crítica constructiva positivamente y actúa sobre las sugerencias recibidas", orden: 33 },
      ],
    },
  ],
};

// Otros instrumentos se agregarán progresivamente
export const INSTRUMENTS: Record<string, Instrument> = {
  A1: INSTRUMENT_A1,
  A3: INSTRUMENT_A3,
};
