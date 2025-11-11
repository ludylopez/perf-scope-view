import { Instrument } from "@/types/evaluation";

export const INSTRUMENT_A1: Instrument = {
  id: "A1_2025_V1",
  nivel: "A1",
  version: "2025.1",
  tiempoEstimado: "20-25 minutos",
  dimensionesDesempeno: [
    {
      id: "dim1_a1",
      nombre: "PRODUCTIVIDAD Y RESULTADOS INSTITUCIONALES",
      descripcion: "Evalúa el cumplimiento de metas institucionales, ejecución presupuestaria y resultados del Plan Operativo Anual.",
      peso: 0.17857, // 25/140
      items: [
        { id: "d1_i1_a1", texto: "Logra el cumplimiento de las metas establecidas en el Plan Operativo Anual (POA), según los indicadores de ejecución y resultados documentados en los reportes institucionales", orden: 1 },
        { id: "d1_i2_a1", texto: "Alcanza niveles óptimos de ejecución presupuestaria municipal (física y financiera), según los reportes del Sistema de Contabilidad Integrada (SICOIN) y los informes de la DAFIM", orden: 2 },
        { id: "d1_i3_a1", texto: "Completa los proyectos de inversión municipal priorizados dentro de los plazos establecidos, según los reportes de avance físico y las actas de recepción de obras", orden: 3 },
        { id: "d1_i4_a1", texto: "Asegura que las direcciones y unidades municipales cumplan con sus metas operativas establecidas, según los reportes de seguimiento y monitoreo institucional", orden: 4 },
        { id: "d1_i5_a1", texto: "Ejecuta oportunamente los acuerdos y resoluciones del Concejo Municipal, según consta en las actas de seguimiento y los informes de cumplimiento de acuerdos", orden: 5 },
      ],
    },
    {
      id: "dim2_a1",
      nombre: "CALIDAD DE LA GESTIÓN ADMINISTRATIVA",
      descripcion: "Evalúa la calidad de la gestión municipal, los servicios públicos y la respuesta a necesidades institucionales.",
      peso: 0.14286, // 20/140
      items: [
        { id: "d2_i1_a1", texto: "Los servicios públicos municipales (agua, aseo, alumbrado, mercados, cementerios) funcionan con calidad y continuidad, según las estadísticas de cobertura, reportes operativos y niveles de quejas ciudadanas registradas", orden: 6 },
        { id: "d2_i2_a1", texto: "Las obras e inversiones municipales cumplen con las especificaciones técnicas y normativas de calidad establecidas, según los informes de supervisión técnica y las actas de recepción definitiva", orden: 7 },
        { id: "d2_i3_a1", texto: "Los procesos administrativos institucionales funcionan con eficiencia y dentro de los plazos legales establecidos, según auditorías de procesos y reportes de tiempos de respuesta", orden: 8 },
        { id: "d2_i4_a1", texto: "El tiempo de respuesta a solicitudes administrativas, trámites y requerimientos institucionales cumple con los estándares establecidos, según registros de ventanilla única y sistemas de correspondencia", orden: 9 },
      ],
    },
    {
      id: "dim3_a1",
      nombre: "COMPETENCIAS TÉCNICAS Y ADMINISTRATIVAS",
      descripcion: "Evalúa las competencias técnicas y de gestión pública requeridas para el ejercicio administrativo del cargo.",
      peso: 0.17857, // 25/140
      items: [
        { id: "d3_i1_a1", texto: "Demuestra conocimiento técnico de la gestión pública municipal aplicando correctamente la normativa legal vigente (Código Municipal, Ley de Contrataciones, Ley Orgánica del Presupuesto), según verificación en resoluciones, contratos y documentos oficiales emitidos", orden: 10 },
        { id: "d3_i2_a1", texto: "Toma decisiones administrativas fundamentadas en análisis técnico y datos objetivos, según la documentación de respaldo de las decisiones y las justificaciones técnicas presentadas", orden: 11 },
        { id: "d3_i3_a1", texto: "Propone e implementa políticas, programas y proyectos alineados con los instrumentos de planificación municipal (PDM-OT, PEI, POM), según la coherencia documentada entre propuestas y planes vigentes", orden: 12 },
        { id: "d3_i4_a1", texto: "Administra eficientemente los recursos institucionales aplicando principios de control interno, según los resultados de auditorías internas/externas y los informes de fiscalización", orden: 13 },
        { id: "d3_i5_a1", texto: "Los documentos administrativos, resoluciones y actos emitidos cumplen con los requisitos legales y técnicos establecidos, según revisiones de asesoría legal y auditorías de cumplimiento", orden: 14 },
      ],
    },
    {
      id: "dim4_a1",
      nombre: "CUMPLIMIENTO NORMATIVO Y ÉTICA ADMINISTRATIVA",
      descripcion: "Evalúa el cumplimiento de normativa, transparencia y conducta ética en el ejercicio administrativo.",
      peso: 0.14286, // 20/140
      items: [
        { id: "d4_i1_a1", texto: "Actúa con transparencia en la gestión administrativa, según la publicación oportuna de información en el portal de transparencia, respuestas a solicitudes de acceso a la información y cumplimiento de la Ley de Acceso a la Información Pública", orden: 15 },
        { id: "d4_i2_a1", texto: "Cumple con las normativas, reglamentos y procedimientos administrativos establecidos, según verificación de auditorías, informes de control interno y resoluciones de entes fiscalizadores", orden: 16 },
        { id: "d4_i3_a1", texto: "Implementa las recomendaciones y acciones correctivas derivadas de auditorías internas y externas, según el seguimiento documentado de planes de acción y reportes de cumplimiento", orden: 17 },
        { id: "d4_i4_a1", texto: "Gestiona adecuadamente situaciones administrativas complejas o conflictivas aplicando el debido proceso y el marco legal, según la documentación de casos y las resoluciones emitidas", orden: 18 },
      ],
    },
    {
      id: "dim5_a1",
      nombre: "COORDINACIÓN Y DIRECCIÓN ADMINISTRATIVA",
      descripcion: "Evalúa la efectividad en la coordinación de la estructura administrativa y el trabajo con equipos directivos.",
      peso: 0.14286, // 20/140
      items: [
        { id: "d5_i1_a1", texto: "Coordina efectivamente el trabajo de la Gerencia Municipal y los titulares de direcciones, según los reportes de cumplimiento de metas institucionales y la ejecución sincronizada de proyectos transversales", orden: 19 },
        { id: "d5_i2_a1", texto: "Facilita la coordinación interinstitucional necesaria para el desarrollo de proyectos municipales, según convenios firmados, actas de coordinación y resultados de proyectos conjuntos documentados", orden: 20 },
        { id: "d5_i3_a1", texto: "Gestiona eficazmente alianzas con instituciones públicas, cooperación internacional y sector privado que generan recursos o beneficios para el municipio, según convenios suscritos, recursos gestionados y proyectos ejecutados", orden: 21 },
        { id: "d5_i4_a1", texto: "Mantiene canales de comunicación administrativa efectivos con las diferentes unidades municipales, según reportes de flujo de información, tiempos de respuesta institucional y cumplimiento de directrices administrativas", orden: 22 },
      ],
    },
    {
      id: "dim6_a1",
      nombre: "DIRECCIÓN ESTRATÉGICA Y FORTALECIMIENTO INSTITUCIONAL",
      descripcion: "Evalúa la dirección estratégica de la administración municipal y las acciones para fortalecer las capacidades institucionales.",
      peso: 0.21428, // 30/140 (ajustado para sumar exactamente 1.0)
      items: [
        { id: "d6_i1_a1", texto: "Dirige la administración municipal de manera que los resultados institucionales muestren avance en el cumplimiento del Plan de Desarrollo Municipal (PDM-OT), según los indicadores de seguimiento y evaluación del PDM", orden: 23 },
        { id: "d6_i2_a1", texto: "Asegura que las sesiones administrativas de planificación y seguimiento se realicen con regularidad y generen decisiones documentadas, según actas, minutas y seguimiento de acuerdos administrativos", orden: 24 },
        { id: "d6_i3_a1", texto: "Implementa mecanismos de rendición de cuentas administrativa (informes periódicos, publicación de resultados, auditorías), según la disponibilidad y calidad de reportes institucionales producidos", orden: 25 },
        { id: "d6_i4_a1", texto: "Gestiona recursos externos (transferencias, cooperación, préstamos) para complementar el presupuesto municipal, según montos gestionados, convenios firmados y recursos efectivamente incorporados al presupuesto", orden: 26 },
        { id: "d6_i5_a1", texto: "Las decisiones administrativas de largo plazo demuestran consideración del impacto institucional y la sostenibilidad financiera, según análisis de factibilidad documentados y proyecciones fiscales presentadas", orden: 27 },
        { id: "d6_i6_a1", texto: "Impulsa procesos de modernización administrativa y fortalecimiento institucional, según proyectos implementados (sistemas informáticos, capacitaciones, mejora de procesos) y resultados medibles obtenidos", orden: 28 },
      ],
    },
  ],
  dimensionesPotencial: [
    {
      id: "pot1_a1",
      nombre: "POTENCIAL PARA RESPONSABILIDADES ADMINISTRATIVAS DE MAYOR ALCANCE",
      descripcion: "Evalúa el potencial del Alcalde Municipal para asumir responsabilidades administrativas de mayor complejidad o alcance territorial.",
      peso: 1.0, // 100%
      items: [
        { id: "p1_i1_a1", texto: "Demuestra capacidad técnica para coordinar iniciativas administrativas de mayor alcance territorial (mancomunidades, asociaciones de municipios, proyectos multimunicipal), según proyectos liderados o participación activa documentada", orden: 29 },
        { id: "p1_i2_a1", texto: "Posee conocimientos y experiencia técnica que le permitirían asumir roles administrativos de mayor responsabilidad en el ámbito de gobierno local, según formación académica, capacitaciones y trayectoria profesional", orden: 30 },
        { id: "p1_i3_a1", texto: "Muestra capacidad de aprendizaje y actualización continua en temas de gestión pública y administración municipal, según participación en capacitaciones, diplomados, seminarios y aplicación de nuevos conocimientos", orden: 31 },
        { id: "p1_i4_a1", texto: "Desarrolla e implementa prácticas administrativas innovadoras que mejoran la gestión municipal, según proyectos de innovación ejecutados, sistemas implementados y mejoras documentadas", orden: 32 },
        { id: "p1_i5_a1", texto: "Demuestra visión estratégica y capacidad técnica para contribuir a políticas públicas de desarrollo local de mayor alcance, según propuestas presentadas, estudios elaborados o participación en espacios técnicos de formulación de políticas", orden: 33 },
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
