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

export const INSTRUMENT_O2: Instrument = {
  id: "O2_2025_V1",
  nivel: "O2",
  version: "2025.1",
  tiempoEstimado: "15-20 minutos",
  dimensionesDesempeno: [
    {
      id: "dim1_o2",
      nombre: "PRODUCTIVIDAD",
      descripcion: "Evalúa la cantidad de trabajo y aprovechamiento del tiempo en las tareas operativas asignadas.",
      peso: 0.15385, // 20/130
      items: [
        { id: "d1_i1_o2", texto: "Completa las tareas que se le asignan dentro de los plazos establecidos", orden: 1 },
        { id: "d1_i2_o2", texto: "Realiza la cantidad de trabajo esperada para su puesto durante la jornada", orden: 2 },
        { id: "d1_i3_o2", texto: "Aprovecha bien su tiempo de trabajo y evita demoras innecesarias", orden: 3 },
        { id: "d1_i4_o2", texto: "Cumple con las metas o programaciones que le corresponden (rutas, recorridos, actividades)", orden: 4 },
      ],
    },
    {
      id: "dim2_o2",
      nombre: "CALIDAD",
      descripcion: "Evalúa la calidad del trabajo realizado, el cumplimiento de estándares y la precisión en las tareas operativas.",
      peso: 0.15385, // 20/130
      items: [
        { id: "d2_i1_o2", texto: "Realiza su trabajo con calidad, cumpliendo los estándares técnicos o procedimientos establecidos", orden: 5 },
        { id: "d2_i2_o2", texto: "Mantiene orden y limpieza en su área de trabajo, herramientas, equipo o unidad asignada", orden: 6 },
        { id: "d2_i3_o2", texto: "Ejecuta las tareas con precisión, evitando errores o necesidad de rehacer el trabajo", orden: 7 },
        { id: "d2_i4_o2", texto: "Cuida y da mantenimiento básico a las herramientas, maquinaria o equipo que utiliza", orden: 8 },
      ],
    },
    {
      id: "dim3_o2",
      nombre: "COMPETENCIAS LABORALES",
      descripcion: "Evalúa las habilidades técnicas, conocimientos específicos y capacidad de resolución de problemas en el trabajo operativo.",
      peso: 0.19231, // 25/130
      items: [
        { id: "d3_i1_o2", texto: "Conoce y aplica correctamente las técnicas, procedimientos o métodos de trabajo de su puesto", orden: 9 },
        { id: "d3_i2_o2", texto: "Maneja adecuadamente las herramientas, maquinaria, equipo o materiales propios de su trabajo", orden: 10 },
        { id: "d3_i3_o2", texto: "Identifica y reporta oportunamente problemas o situaciones que requieren atención", orden: 11 },
        { id: "d3_i4_o2", texto: "Resuelve problemas operativos básicos de su trabajo sin requerir supervisión constante", orden: 12 },
        { id: "d3_i5_o2", texto: "Comprende las instrucciones que recibe y las ejecuta apropiadamente", orden: 13 },
      ],
    },
    {
      id: "dim4_o2",
      nombre: "COMPORTAMIENTO ORGANIZACIONAL",
      descripcion: "Evalúa la disciplina laboral, responsabilidad, cumplimiento de normas y actitud hacia el trabajo.",
      peso: 0.15385, // 20/130
      items: [
        { id: "d4_i1_o2", texto: "Es puntual en el ingreso a su jornada y cumple con el horario de trabajo establecido", orden: 14 },
        { id: "d4_i2_o2", texto: "Muestra buena actitud hacia el trabajo y disposición para realizar las tareas asignadas", orden: 15 },
        { id: "d4_i3_o2", texto: "Actúa con responsabilidad en sus funciones y responde por los resultados de su trabajo", orden: 16 },
        { id: "d4_i4_o2", texto: "Respeta las normas, reglamentos y procedimientos establecidos en su área de trabajo", orden: 17 },
      ],
    },
    {
      id: "dim5_o2",
      nombre: "RELACIONES INTERPERSONALES",
      descripcion: "Evalúa la capacidad de trabajar en equipo, comunicarse efectivamente y mantener relaciones laborales positivas.",
      peso: 0.15385, // 20/130
      items: [
        { id: "d5_i1_o2", texto: "Trabaja cooperativamente con sus compañeros de cuadrilla o equipo de trabajo", orden: 18 },
        { id: "d5_i2_o2", texto: "Se comunica respetuosamente con su supervisor, compañeros y otros empleados municipales", orden: 19 },
        { id: "d5_i3_o2", texto: "Atiende con respeto y cortesía a los ciudadanos o usuarios que interactúan con él en su trabajo", orden: 20 },
        { id: "d5_i4_o2", texto: "Contribuye a mantener un buen ambiente de trabajo en su cuadrilla o equipo", orden: 21 },
      ],
    },
    {
      id: "dim6_o2",
      nombre: "SEGURIDAD Y CUMPLIMIENTO OPERATIVO",
      descripcion: "Evalúa el cumplimiento de normas de seguridad, uso apropiado de equipo de protección y conducta laboral responsable.",
      peso: 0.19231, // 25/130 (ajustado para sumar exactamente 1.0)
      items: [
        { id: "d6_i1_o2", texto: "Utiliza correctamente el equipo de protección personal (EPP) asignado para su trabajo", orden: 22 },
        { id: "d6_i2_o2", texto: "Cumple con las normas y procedimientos de seguridad ocupacional establecidos", orden: 23 },
        { id: "d6_i3_o2", texto: "Reporta accidentes, incidentes o condiciones inseguras que identifica en su trabajo", orden: 24 },
        { id: "d6_i4_o2", texto: "Mantiene conducta apropiada durante la jornada laboral (no se presenta bajo efectos de alcohol o drogas)", orden: 25 },
        { id: "d6_i5_o2", texto: "Cuida los recursos municipales asignados (vehículo, herramientas, materiales) y evita su uso indebido", orden: 26 },
      ],
    },
  ],
  dimensionesPotencial: [
    {
      id: "pot1_o2",
      nombre: "POTENCIAL PARA DESARROLLO",
      descripcion: "Evalúa las capacidades de aprendizaje, adaptabilidad y posibilidades de crecimiento del colaborador operativo.",
      peso: 1.0, // 100%
      items: [
        { id: "p1_i1_o2", texto: "Aprende nuevas tareas rápidamente y busca mejorar sus formas de trabajar", orden: 27 },
        { id: "p1_i2_o2", texto: "Muestra interés en capacitarse y desarrollar nuevas habilidades para su trabajo", orden: 28 },
        { id: "p1_i3_o2", texto: "Se adapta bien a cambios en procedimientos, herramientas o métodos de trabajo", orden: 29 },
        { id: "p1_i4_o2", texto: "Toma iniciativa para apoyar en tareas adicionales o colaborar más allá de lo mínimo requerido", orden: 30 },
        { id: "p1_i5_o2", texto: "Tiene potencial para asumir mayores responsabilidades o un rol de coordinación en su área", orden: 31 },
      ],
    },
  ],
};

export const INSTRUMENT_E1: Instrument = {
  id: "E1_2025_V1",
  nivel: "E1",
  version: "2025.1",
  tiempoEstimado: "25-30 minutos",
  dimensionesDesempeno: [
    {
      id: "dim1_e1",
      nombre: "PRODUCTIVIDAD",
      descripcion: "Grado en que el/la colaborador/a cumple con las metas, objetivos y cantidad de trabajo esperado en su área, utilizando eficientemente los recursos y cumpliendo con plazos establecidos.",
      peso: 0.17241, // 25/145
      items: [
        { id: "d1_i1_e1", texto: "Cumple con las metas y objetivos establecidos en el Plan Operativo Anual (POA) de su área", orden: 1 },
        { id: "d1_i2_e1", texto: "Entrega informes, reportes y documentación requerida dentro de los plazos establecidos", orden: 2 },
        { id: "d1_i3_e1", texto: "Responde de manera oportuna a las solicitudes, emergencias o incidencias de su área", orden: 3 },
        { id: "d1_i4_e1", texto: "Utiliza de manera eficiente los recursos (personal, materiales, equipos, presupuesto) asignados a su área", orden: 4 },
        { id: "d1_i5_e1", texto: "La cantidad de trabajo realizado por su área cumple con lo esperado para el período evaluado", orden: 5 },
      ],
    },
    {
      id: "dim2_e1",
      nombre: "CALIDAD",
      descripcion: "Nivel de exactitud, precisión y cumplimiento de estándares técnicos y normativos en el trabajo realizado por el área a su cargo.",
      peso: 0.13793, // 20/145
      items: [
        { id: "d2_i1_e1", texto: "El trabajo realizado por su área cumple con los estándares de calidad y especificaciones técnicas requeridas", orden: 6 },
        { id: "d2_i2_e1", texto: "Aplica correctamente la normativa, reglamentos y procedimientos correspondientes a su área", orden: 7 },
        { id: "d2_i3_e1", texto: "Los informes, documentos y registros que elabora o supervisa son precisos, completos y confiables", orden: 8 },
        { id: "d2_i4_e1", texto: "Las decisiones técnicas que toma en su área son acertadas y están bien fundamentadas", orden: 9 },
      ],
    },
    {
      id: "dim3_e1",
      nombre: "COMPETENCIAS LABORALES",
      descripcion: "Conjunto de conocimientos, habilidades técnicas y gerenciales necesarias para ejercer efectivamente el puesto de Jefe o Encargado de Unidad.",
      peso: 0.20690, // 30/145
      items: [
        { id: "d3_i1_e1", texto: "Demuestra dominio de los conocimientos técnicos especializados requeridos para su puesto", orden: 10 },
        { id: "d3_i2_e1", texto: "Aplica criterio profesional apropiado para analizar situaciones complejas y tomar decisiones en su área", orden: 11 },
        { id: "d3_i3_e1", texto: "Planifica y organiza de manera efectiva las actividades, recursos y prioridades de su área", orden: 12 },
        { id: "d3_i4_e1", texto: "Coordina exitosamente con otras unidades municipales e instituciones externas relevantes para su trabajo", orden: 13 },
        { id: "d3_i5_e1", texto: "Maneja adecuadamente los sistemas informáticos, plataformas y herramientas tecnológicas necesarias para su trabajo", orden: 14 },
        { id: "d3_i6_e1", texto: "Se mantiene actualizado/a en los conocimientos, normativa y mejores prácticas relevantes para su área", orden: 15 },
      ],
    },
    {
      id: "dim4_e1",
      nombre: "COMPORTAMIENTO ORGANIZACIONAL",
      descripcion: "Grado en que el/la colaborador/a demuestra valores institucionales, ética profesional, disciplina y actúa como modelo a seguir para su equipo.",
      peso: 0.13793, // 20/145
      items: [
        { id: "d4_i1_e1", texto: "Cumple con el horario de trabajo establecido y está disponible cuando su área lo requiere", orden: 16 },
        { id: "d4_i2_e1", texto: "Actúa con integridad, ética profesional y transparencia en todas sus actuaciones", orden: 17 },
        { id: "d4_i3_e1", texto: "Mantiene la confidencialidad de información sensible y cumple con protocolos de seguridad de datos", orden: 18 },
        { id: "d4_i4_e1", texto: "Es un modelo a seguir para su equipo en cuanto a disciplina, orden y cumplimiento de políticas institucionales", orden: 19 },
      ],
    },
    {
      id: "dim5_e1",
      nombre: "RELACIONES INTERPERSONALES",
      descripcion: "Capacidad para establecer y mantener relaciones de trabajo efectivas, comunicarse claramente y colaborar con diversos actores internos y externos.",
      peso: 0.13793, // 20/145
      items: [
        { id: "d5_i1_e1", texto: "Se comunica de manera clara, respetuosa y efectiva con colaboradores, superiores y ciudadanos", orden: 20 },
        { id: "d5_i2_e1", texto: "Colabora de manera efectiva con otras áreas y unidades municipales para lograr objetivos comunes", orden: 21 },
        { id: "d5_i3_e1", texto: "Mantiene relaciones profesionales positivas con instituciones externas y actores clave relevantes para su trabajo", orden: 22 },
        { id: "d5_i4_e1", texto: "Maneja conflictos y situaciones tensas de manera constructiva, profesional y respetuosa", orden: 23 },
      ],
    },
    {
      id: "dim6_e1",
      nombre: "LIDERAZGO Y GESTIÓN DE EQUIPOS",
      descripcion: "Capacidad para dirigir, motivar, desarrollar y coordinar efectivamente al equipo de trabajo para el logro de objetivos, promoviendo un ambiente laboral positivo.",
      peso: 0.20690, // 30/145
      items: [
        { id: "d6_i1_e1", texto: "Asigna tareas y responsabilidades de manera clara, equitativa y apropiada a las capacidades de su equipo", orden: 24 },
        { id: "d6_i2_e1", texto: "Realiza seguimiento regular del trabajo de sus colaboradores y proporciona retroalimentación constructiva y oportuna", orden: 25 },
        { id: "d6_i3_e1", texto: "Verifica que el trabajo de su equipo cumpla con los estándares de calidad, procedimientos y plazos establecidos", orden: 26 },
        { id: "d6_i4_e1", texto: "Identifica necesidades de capacitación de su equipo y promueve activamente su desarrollo profesional", orden: 27 },
        { id: "d6_i5_e1", texto: "Delega apropiadamente, empodera a su equipo con autonomía adecuada y evita la microgestión", orden: 28 },
        { id: "d6_i6_e1", texto: "Mantiene al equipo motivado, maneja conflictos de manera constructiva y fomenta un clima laboral positivo", orden: 29 },
      ],
    },
  ],
  dimensionesPotencial: [
    {
      id: "pot_dim1_e1",
      nombre: "CAPACIDAD DE LIDERAZGO AMPLIADO",
      descripcion: "Evalúa si el/la colaborador/a puede liderar equipos más grandes o gestionar múltiples unidades.",
      peso: 0.25, // 10/40
      items: [
        { id: "pot_d1_i1_e1", texto: "Demuestra capacidad para liderar equipos más grandes o gestionar múltiples unidades simultáneamente", orden: 1 },
        { id: "pot_d1_i2_e1", texto: "Ha desarrollado líderes dentro de su equipo (colaboradores bajo su cargo han crecido profesionalmente o sido promovidos)", orden: 2 },
      ],
    },
    {
      id: "pot_dim2_e1",
      nombre: "VISIÓN ESTRATÉGICA",
      descripcion: "Evalúa si el/la colaborador/a puede pensar más allá de lo operativo hacia lo estratégico institucional.",
      peso: 0.25, // 10/40
      items: [
        { id: "pot_d2_i1_e1", texto: "Comprende cómo su área contribuye a los objetivos estratégicos institucionales y propone mejoras con visión de largo plazo", orden: 3 },
        { id: "pot_d2_i2_e1", texto: "Anticipa tendencias, riesgos u oportunidades que podrían afectar a la municipalidad y propone soluciones de manera proactiva", orden: 4 },
      ],
    },
    {
      id: "pot_dim3_e1",
      nombre: "CAPACIDAD DE GESTIÓN COMPLEJA",
      descripcion: "Evalúa si el/la colaborador/a puede manejar mayor complejidad presupuestaria, normativa y política.",
      peso: 0.25, // 10/40
      items: [
        { id: "pot_d3_i1_e1", texto: "Demuestra capacidad para manejar presupuestos más grandes, proyectos de mayor envergadura o múltiples áreas de responsabilidad", orden: 5 },
        { id: "pot_d3_i2_e1", texto: "Maneja de manera efectiva situaciones políticamente sensibles, negociaciones complejas y coordinación con altos funcionarios", orden: 6 },
      ],
    },
    {
      id: "pot_dim4_e1",
      nombre: "DISPOSICIÓN Y COMPROMISO",
      descripcion: "Evalúa el interés y preparación del/la colaborador/a para asumir mayores responsabilidades.",
      peso: 0.25, // 10/40
      items: [
        { id: "pot_d4_i1_e1", texto: "Muestra interés activo en asumir mayores responsabilidades y busca oportunidades de contribuir más allá de su puesto actual", orden: 7 },
        { id: "pot_d4_i2_e1", texto: "Está dispuesto/a y preparado/a para asumir un puesto de nivel directivo (D2 o D1) si se le ofreciera en el corto o mediano plazo", orden: 8 },
      ],
    },
  ],
};

export const INSTRUMENT_O1: Instrument = {
  id: "O1_2025_V1",
  nivel: "O1",
  version: "2025.1",
  tiempoEstimado: "20-25 minutos",
  dimensionesDesempeno: [
    {
      id: "dim1_o1",
      nombre: "PRODUCTIVIDAD EN EL TRABAJO",
      descripcion: "Evalúa la capacidad del colaborador para completar tareas en tiempo, cumplir horarios y mantener un ritmo constante de trabajo.",
      peso: 0.17391, // 4/23
      items: [
        { id: "d1_i1_o1", texto: "Termina el trabajo que le asignan en el tiempo establecido", orden: 1 },
        { id: "d1_i2_o1", texto: "Llega a tiempo y cumple su horario de trabajo", orden: 2 },
        { id: "d1_i3_o1", texto: "Mantiene un ritmo constante de trabajo durante su jornada", orden: 3 },
        { id: "d1_i4_o1", texto: "Aprovecha bien su tiempo de trabajo", orden: 4 },
      ],
    },
    {
      id: "dim2_o1",
      nombre: "CALIDAD DEL TRABAJO",
      descripcion: "Evalúa la calidad y completitud del trabajo realizado, así como la necesidad de correcciones.",
      peso: 0.13043, // 3/23
      items: [
        { id: "d2_i1_o1", texto: "Hace bien su trabajo, como le enseñaron", orden: 5 },
        { id: "d2_i2_o1", texto: "Hace el trabajo completo, sin dejar pasos pendientes", orden: 6 },
        { id: "d2_i3_o1", texto: "Su trabajo casi nunca necesita ser corregido", orden: 7 },
      ],
    },
    {
      id: "dim3_o1",
      nombre: "CONOCIMIENTOS Y HABILIDADES DEL TRABAJO",
      descripcion: "Evalúa el conocimiento del trabajo, uso adecuado de herramientas y equipos, cumplimiento de seguridad y capacidad de reporte.",
      peso: 0.21739, // 5/23
      items: [
        { id: "d3_i1_o1", texto: "Sabe cómo hacer su trabajo correctamente", orden: 8 },
        { id: "d3_i2_o1", texto: "Usa bien las herramientas y equipos de su trabajo", orden: 9 },
        { id: "d3_i3_o1", texto: "Siempre usa su equipo de seguridad (casco, guantes, chaleco, botas, uniforme)", orden: 10 },
        { id: "d3_i4_o1", texto: "Sabe qué hacer en las situaciones del día a día de su trabajo", orden: 11 },
        { id: "d3_i5_o1", texto: "Llena los reportes o papeles que le piden, de forma clara", orden: 12 },
      ],
    },
    {
      id: "dim4_o1",
      nombre: "DISCIPLINA Y COMPORTAMIENTO",
      descripcion: "Evalúa el cumplimiento de reglas, actitud hacia el trabajo, respeto a las instrucciones y honestidad.",
      peso: 0.17391, // 4/23
      items: [
        { id: "d4_i1_o1", texto: "Cumple las reglas de la municipalidad y se presenta bien con su uniforme", orden: 13 },
        { id: "d4_i2_o1", texto: "Tiene buena actitud para hacer su trabajo", orden: 14 },
        { id: "d4_i3_o1", texto: "Hace caso a las instrucciones de su jefe con respeto", orden: 15 },
        { id: "d4_i4_o1", texto: "Es honesto y actúa correctamente en su trabajo", orden: 16 },
      ],
    },
    {
      id: "dim5_o1",
      nombre: "TRABAJO CON OTRAS PERSONAS",
      descripcion: "Evalúa la capacidad de trabajar en equipo, comunicación con el jefe y trato respetuoso con las personas.",
      peso: 0.13043, // 3/23
      items: [
        { id: "d5_i1_o1", texto: "Trabaja bien con sus compañeros y los apoya", orden: 17 },
        { id: "d5_i2_o1", texto: "Avisa a su jefe cuando pasa algo importante", orden: 18 },
        { id: "d5_i3_o1", texto: "Trata bien a las personas, con respeto", orden: 19 },
      ],
    },
    {
      id: "dim6_o1",
      nombre: "SERVICIO Y SEGURIDAD",
      descripcion: "Evalúa la disposición para ayudar, rapidez en la atención, cumplimiento de reglas de seguridad y reporte de situaciones peligrosas.",
      peso: 0.17391, // 4/23
      items: [
        { id: "d6_i1_o1", texto: "Está dispuesto a ayudar a las personas en su trabajo", orden: 20 },
        { id: "d6_i2_o1", texto: "Atiende rápido cuando le piden ayuda", orden: 21 },
        { id: "d6_i3_o1", texto: "Sigue las reglas de seguridad en su trabajo", orden: 22 },
        { id: "d6_i4_o1", texto: "Avisa cuando ve algo peligroso", orden: 23 },
      ],
    },
  ],
  dimensionesPotencial: [
    {
      id: "pot1_o1",
      nombre: "CAPACIDAD DE CRECIMIENTO Y DESARROLLO",
      descripcion: "Evalúa la capacidad de aprendizaje, iniciativa para mejorar, adaptabilidad, autonomía e interés en el desarrollo profesional.",
      peso: 1.0, // 5/5 = 1.0
      items: [
        { id: "p1_i1_o1", texto: "Aprende rápido cuando le enseñan cosas nuevas", orden: 24 },
        { id: "p1_i2_o1", texto: "Da ideas para mejorar su trabajo", orden: 25 },
        { id: "p1_i3_o1", texto: "Se adapta bien cuando le cambian de tarea", orden: 26 },
        { id: "p1_i4_o1", texto: "Puede trabajar bien con poca supervisión", orden: 27 },
        { id: "p1_i5_o1", texto: "Tiene interés en aprender más y crecer en su trabajo", orden: 28 },
      ],
    },
  ],
};

export const INSTRUMENT_OTE: Instrument = {
  id: "OTE_2025_V1",
  nivel: "OTE",
  version: "2025.1",
  tiempoEstimado: "25-30 minutos",
  dimensionesDesempeno: [
    {
      id: "dim1_ote",
      nombre: "PRODUCTIVIDAD",
      descripcion: "Esta dimensión mide si el colaborador completa sus tareas en el tiempo establecido y cumple con la cantidad de trabajo asignado.",
      peso: 0.14815, // 4/27
      items: [
        { id: "d1_i1_ote", texto: "Cumplimiento del trabajo asignado - El colaborador completa todas las tareas y trabajos que se le asignan", orden: 1 },
        { id: "d1_i2_ote", texto: "Cumplimiento de horarios y plazos - El colaborador termina sus trabajos en los tiempos y fechas establecidos", orden: 2 },
        { id: "d1_i3_ote", texto: "Aprovechamiento del tiempo de trabajo - El colaborador usa bien su tiempo de trabajo y no lo desperdicia", orden: 3 },
        { id: "d1_i4_ote", texto: "Ritmo de trabajo constante - El colaborador mantiene un ritmo de trabajo estable durante toda su jornada", orden: 4 },
      ],
    },
    {
      id: "dim2_ote",
      nombre: "CALIDAD",
      descripcion: "Esta dimensión mide si el colaborador hace su trabajo bien hecho, con cuidado y siguiendo las indicaciones correctamente.",
      peso: 0.18519, // 5/27
      items: [
        { id: "d2_i1_ote", texto: "Precisión y cuidado en el trabajo - El colaborador hace su trabajo con precisión, cuidado y atención a los detalles", orden: 5 },
        { id: "d2_i2_ote", texto: "Cumplimiento de instrucciones y procedimientos - El colaborador sigue correctamente las instrucciones y los procedimientos establecidos", orden: 6 },
        { id: "d2_i3_ote", texto: "Presentación y acabado del trabajo - El trabajo que realiza el colaborador se ve bien terminado y presentado", orden: 7 },
        { id: "d2_i4_ote", texto: "Revisión del trabajo antes de terminarlo - El colaborador revisa y verifica que su trabajo esté bien antes de darlo por terminado", orden: 8 },
        { id: "d2_i5_ote", texto: "Trabajos sin errores o que requieran corrección - El colaborador entrega trabajos que están bien hechos desde la primera vez, sin necesidad de corregirlos", orden: 9 },
      ],
    },
    {
      id: "dim3_ote",
      nombre: "CONOCIMIENTOS Y HABILIDADES DEL PUESTO",
      descripcion: "Esta dimensión mide si el colaborador tiene los conocimientos y habilidades necesarios para hacer bien su trabajo.",
      peso: 0.18519, // 5/27
      items: [
        { id: "d3_i1_ote", texto: "Conocimientos técnicos de su trabajo - El colaborador conoce bien cómo hacer su trabajo y domina las tareas de su puesto", orden: 10 },
        { id: "d3_i2_ote", texto: "Capacidad para resolver problemas en el trabajo - El colaborador sabe cómo resolver los problemas que se presentan en su trabajo diario", orden: 11 },
        { id: "d3_i3_ote", texto: "Manejo de equipos, herramientas o maquinaria - El colaborador sabe usar correctamente los equipos, herramientas o maquinaria de su trabajo", orden: 12 },
        { id: "d3_i4_ote", texto: "Comprensión y seguimiento de indicaciones - El colaborador entiende bien las indicaciones que se le dan y las sigue correctamente", orden: 13 },
        { id: "d3_i5_ote", texto: "Interés por aprender y mejorar - El colaborador busca aprender cosas nuevas y mejorar en su trabajo", orden: 14 },
      ],
    },
    {
      id: "dim4_ote",
      nombre: "ACTITUD Y COMPORTAMIENTO EN EL TRABAJO",
      descripcion: "Esta dimensión mide la actitud, puntualidad y comportamiento del colaborador en su trabajo.",
      peso: 0.14815, // 4/27
      items: [
        { id: "d4_i1_ote", texto: "Puntualidad y asistencia - El colaborador llega a tiempo a su trabajo y asiste todos los días", orden: 15 },
        { id: "d4_i2_ote", texto: "Disciplina y cumplimiento de reglas - El colaborador respeta y cumple las reglas y normas de la municipalidad", orden: 16 },
        { id: "d4_i3_ote", texto: "Seguimiento de instrucciones de sus superiores - El colaborador sigue las órdenes e instrucciones que recibe de sus jefes", orden: 17 },
        { id: "d4_i4_ote", texto: "Actitud positiva hacia el trabajo - El colaborador muestra buena actitud, disposición y entusiasmo en su trabajo", orden: 18 },
      ],
    },
    {
      id: "dim5_ote",
      nombre: "TRABAJO EN EQUIPO Y RELACIONES",
      descripcion: "Esta dimensión mide cómo el colaborador se relaciona y trabaja con sus compañeros, jefes y otras personas.",
      peso: 0.14815, // 4/27
      items: [
        { id: "d5_i1_ote", texto: "Trabajo en equipo con sus compañeros - El colaborador trabaja bien con sus compañeros y colabora cuando es necesario", orden: 19 },
        { id: "d5_i2_ote", texto: "Comunicación clara con jefes y compañeros - El colaborador se comunica de forma clara cuando habla o reporta información", orden: 20 },
        { id: "d5_i3_ote", texto: "Coordinación con otras áreas o unidades - El colaborador coordina y trabaja bien con personas de otras áreas cuando es necesario", orden: 21 },
        { id: "d5_i4_ote", texto: "Trato respetuoso con usuarios y comunidad - El colaborador trata con respeto y amabilidad a los usuarios y personas de la comunidad", orden: 22 },
      ],
    },
    {
      id: "dim6_ote",
      nombre: "SEGURIDAD Y CUIDADO EN EL TRABAJO",
      descripcion: "Esta dimensión mide si el colaborador trabaja de forma segura, cuida su equipo y sigue las normas de seguridad.",
      peso: 0.18519, // 5/27
      items: [
        { id: "d6_i1_ote", texto: "Uso del equipo de protección personal - El colaborador usa correctamente todo su equipo de protección (casco, guantes, botas, chaleco, etc.) durante toda su jornada", orden: 23 },
        { id: "d6_i2_ote", texto: "Cumplimiento de normas de seguridad - El colaborador sigue todas las normas y reglas de seguridad en su trabajo", orden: 24 },
        { id: "d6_i3_ote", texto: "Identificación y reporte de situaciones peligrosas - El colaborador identifica situaciones peligrosas y las reporta a tiempo para evitar accidentes", orden: 25 },
        { id: "d6_i4_ote", texto: "Instalación de señales de seguridad en su trabajo - El colaborador coloca y respeta las señales de seguridad cuando trabaja (conos, cinta, letreros, etc.)", orden: 26 },
        { id: "d6_i5_ote", texto: "Cuidado de herramientas, equipos y maquinaria - El colaborador cuida bien sus herramientas, equipos o maquinaria y los usa correctamente", orden: 27 },
      ],
    },
  ],
  dimensionesPotencial: [
    {
      id: "pot_dim_a_ote",
      nombre: "CAPACIDAD DE APRENDIZAJE Y ADAPTACIÓN",
      descripcion: "Esta dimensión mide si el colaborador puede aprender cosas nuevas y adaptarse a cambios.",
      peso: 0.33333, // 2/6
      items: [
        { id: "pot_da_i1_ote", texto: "Facilidad para aprender cosas nuevas - El colaborador aprende rápido cuando se le enseñan nuevos procedimientos, herramientas o tareas", orden: 28 },
        { id: "pot_da_i2_ote", texto: "Adaptación a cambios - El colaborador se adapta bien cuando hay cambios en su trabajo (nuevos procedimientos, nuevas herramientas, nuevos horarios, etc.)", orden: 29 },
      ],
    },
    {
      id: "pot_dim_b_ote",
      nombre: "INICIATIVA Y RESPONSABILIDAD",
      descripcion: "Esta dimensión mide si el colaborador toma iniciativa y asume responsabilidades por su cuenta.",
      peso: 0.33333, // 2/6
      items: [
        { id: "pot_db_i1_ote", texto: "Propone mejoras y toma iniciativa - El colaborador propone ideas para mejorar su trabajo y toma iniciativa sin que se lo pidan", orden: 30 },
        { id: "pot_db_i2_ote", texto: "Asume responsabilidades adicionales - El colaborador está dispuesto a asumir más responsabilidades o ayudar en otras tareas cuando se necesita", orden: 31 },
      ],
    },
    {
      id: "pot_dim_c_ote",
      nombre: "CAPACIDAD DE ORIENTAR Y COORDINAR",
      descripcion: "Esta dimensión mide si el colaborador puede enseñar a otros y coordinar tareas.",
      peso: 0.33333, // 2/6
      items: [
        { id: "pot_dc_i1_ote", texto: "Capacidad de enseñar y ayudar a otros - El colaborador puede enseñar y explicar su trabajo a otros compañeros, especialmente a los nuevos", orden: 32 },
        { id: "pot_dc_i2_ote", texto: "Capacidad para organizar y coordinar trabajo en grupo - El colaborador puede organizar tareas de un grupo pequeño y coordinar el trabajo con otros", orden: 33 },
      ],
    },
  ],
};

export const INSTRUMENT_A4: Instrument = {
  id: "A4_2025_V1",
  nivel: "A4",
  version: "2025.1",
  tiempoEstimado: "25-30 minutos",
  dimensionesDesempeno: [
    {
      id: "dim1_a4",
      nombre: "PRODUCTIVIDAD",
      descripcion: "Cumplimiento oportuno de las tareas administrativas y operativas asignadas, manteniendo un volumen de trabajo adecuado y dando seguimiento efectivo a compromisos y pendientes.",
      peso: 0.16667, // 20/120
      items: [
        { id: "d1_i1_a4", texto: "Completa las tareas administrativas asignadas (registro de documentos, elaboración de reportes, actualización de bases de datos) dentro de los plazos establecidos.", orden: 1 },
        { id: "d1_i2_a4", texto: "Mantiene un volumen de trabajo apropiado a las exigencias del puesto, gestionando eficientemente las tareas diarias y eventuales.", orden: 2 },
        { id: "d1_i3_a4", texto: "Da seguimiento oportuno a pendientes, compromisos y solicitudes, alertando sobre plazos próximos a vencer o situaciones que requieren atención.", orden: 3 },
        { id: "d1_i4_a4", texto: "Aprovecha eficientemente el tiempo de trabajo, evitando retrasos innecesarios y cumpliendo con las metas u objetivos del área.", orden: 4 },
      ],
    },
    {
      id: "dim2_a4",
      nombre: "CALIDAD",
      descripcion: "Exactitud, completitud y orden en los registros, documentos y procesos realizados, manteniendo estándares de calidad establecidos y detectando oportunamente errores o inconsistencias.",
      peso: 0.16667, // 20/120
      items: [
        { id: "d2_i1_a4", texto: "Mantiene registros y expedientes exactos, completos y debidamente organizados, permitiendo su consulta y verificación en cualquier momento.", orden: 5 },
        { id: "d2_i2_a4", texto: "Verifica la integridad y completitud de la documentación de soporte antes de procesarla, archivarla o remitirla.", orden: 6 },
        { id: "d2_i3_a4", texto: "Detecta y corrige oportunamente errores o inconsistencias en su trabajo, evitando reprocesos y garantizando la confiabilidad de la información.", orden: 7 },
        { id: "d2_i4_a4", texto: "Cumple con los estándares de calidad y presentación establecidos para los documentos, reportes y productos de su área.", orden: 8 },
      ],
    },
    {
      id: "dim3_a4",
      nombre: "COMPETENCIAS LABORALES",
      descripcion: "Dominio y aplicación apropiada de los conocimientos técnicos, procedimientos, sistemas y herramientas específicas requeridas para el desempeño efectivo del puesto.",
      peso: 0.20833, // 25/120
      items: [
        { id: "d3_i1_a4", texto: "Utiliza apropiadamente los sistemas informáticos y herramientas del área (SICOIN, Office, sistemas propios u otros) para registrar información y generar reportes.", orden: 9 },
        { id: "d3_i2_a4", texto: "Aplica correctamente los procedimientos, lineamientos técnicos y normativa establecidos para los procesos bajo su responsabilidad.", orden: 10 },
        { id: "d3_i3_a4", texto: "Demuestra dominio de los conocimientos técnicos o especializados necesarios para realizar las funciones propias de su puesto.", orden: 11 },
        { id: "d3_i4_a4", texto: "Busca actualizarse y mejorar continuamente sus competencias técnicas mediante capacitaciones, consultas o práctica.", orden: 12 },
        { id: "d3_i5_a4", texto: "[Solo para puestos \"Encargados\"] Orienta y supervisa apropiadamente al personal auxiliar bajo su responsabilidad en las tareas operativas del área.\n\n[Para otros puestos] Resuelve consultas y situaciones técnicas del área con criterio apropiado y dentro de su ámbito de responsabilidad.", orden: 13 },
      ],
    },
    {
      id: "dim4_a4",
      nombre: "COMPORTAMIENTO ORGANIZACIONAL",
      descripcion: "Cumplimiento de normas, reglamentos, lineamientos de control interno y valores institucionales, demostrando integridad, asistencia, puntualidad y uso apropiado de recursos municipales.",
      peso: 0.12500, // 15/120
      items: [
        { id: "d4_i1_a4", texto: "Cumple con los lineamientos del Sistema de Control Interno (Acuerdo A-039-2023) en los procesos bajo su responsabilidad, documentando evidencias apropiadamente.", orden: 14 },
        { id: "d4_i2_a4", texto: "Asiste puntualmente a su jornada laboral y cumple con el horario establecido, justificando apropiadamente ausencias o permisos cuando corresponde.", orden: 15 },
        { id: "d4_i3_a4", texto: "Resguarda apropiadamente la confidencialidad de información sensible y documentos valorados, cumpliendo con normativa de transparencia y protección de datos personales.", orden: 16 },
      ],
    },
    {
      id: "dim5_a4",
      nombre: "RELACIONES INTERPERSONALES",
      descripcion: "Calidad de la comunicación, coordinación y colaboración con compañeros, jefaturas y otras dependencias, contribuyendo a un ambiente de trabajo positivo y al logro de objetivos compartidos.",
      peso: 0.12500, // 15/120
      items: [
        { id: "d5_i1_a4", texto: "Coordina efectivamente con otras dependencias para el cumplimiento de tareas, manteniendo comunicación oportuna y respetuosa.", orden: 17 },
        { id: "d5_i2_a4", texto: "Colabora con sus compañeros de trabajo y apoya en tareas del equipo cuando es necesario, contribuyendo a un ambiente de trabajo positivo.", orden: 18 },
        { id: "d5_i3_a4", texto: "Se comunica de manera clara, profesional y oportuna, escuchando activamente y transmitiendo información completa y precisa.", orden: 19 },
      ],
    },
    {
      id: "dim6_a4",
      nombre: "ORIENTACIÓN AL SERVICIO Y CUMPLIMIENTO DE PROTOCOLOS",
      descripcion: "Calidad, calidez y oportunidad en la atención a usuarios internos y externos, brindando información clara y canalizando apropiadamente solicitudes. Cumplimiento estricto de protocolos de seguridad y procedimientos operativos específicos del puesto, previniendo riesgos y respondiendo efectivamente ante situaciones imprevistas.",
      peso: 0.20833, // 25/120
      items: [
        { id: "d6_i1_a4", texto: "Atiende a usuarios internos y externos con calidad y calidez, canalizando apropiadamente sus solicitudes y brindando información clara y completa.", orden: 20 },
        { id: "d6_i2_a4", texto: "Responde oportunamente a las consultas y solicitudes, buscando soluciones efectivas dentro de su ámbito de responsabilidad.", orden: 21 },
        { id: "d6_i3_a4", texto: "Mantiene actitud de servicio, profesionalismo y cortesía en el trato con todas las personas, incluso en situaciones difíciles o de presión.", orden: 22 },
        { id: "d6_i4_a4", texto: "Cumple estrictamente los protocolos de seguridad y procedimientos operativos específicos de su puesto, utilizando apropiadamente el equipo asignado.", orden: 23 },
        { id: "d6_i5_a4", texto: "Previene riesgos y responde efectivamente ante situaciones imprevistas o de emergencia, manteniendo disciplina y autocontrol.", orden: 24 },
      ],
    },
  ],
  dimensionesPotencial: [
    {
      id: "pot_dim1_a4",
      nombre: "CAPACIDAD DE APRENDIZAJE",
      descripcion: "Rapidez y efectividad para adquirir nuevos conocimientos, habilidades y adaptarse a nuevas tecnologías o procedimientos.",
      peso: 0.23077, // 15/65
      items: [
        { id: "pot_d1_i1_a4", texto: "Aprende rápidamente nuevos procedimientos, sistemas o herramientas cuando son introducidos en el área.", orden: 25 },
        { id: "pot_d1_i2_a4", texto: "Busca activamente oportunidades de capacitación, desarrollo profesional o actualización técnica.", orden: 26 },
        { id: "pot_d1_i3_a4", texto: "Aplica efectivamente en su trabajo los nuevos conocimientos o habilidades adquiridos, mejorando su desempeño.", orden: 27 },
      ],
    },
    {
      id: "pot_dim2_a4",
      nombre: "ORIENTACIÓN AL CRECIMIENTO",
      descripcion: "Motivación y disposición para asumir mayores responsabilidades y desarrollar una carrera profesional.",
      peso: 0.23077, // 15/65
      items: [
        { id: "pot_d2_i1_a4", texto: "Expresa interés en asumir mayores responsabilidades, roles de mayor complejidad o especializarse en su área técnica.", orden: 28 },
        { id: "pot_d2_i2_a4", texto: "Se ofrece voluntariamente para participar en proyectos especiales, comisiones o tareas adicionales más allá de sus funciones.", orden: 29 },
        { id: "pot_d2_i3_a4", texto: "Tiene claridad sobre sus metas de desarrollo profesional y comunica apropiadamente sus intereses de crecimiento.", orden: 30 },
      ],
    },
    {
      id: "pot_dim3_a4",
      nombre: "LIDERAZGO EMERGENTE",
      descripcion: "Capacidad de influir positivamente, orientar y apoyar a otros sin tener autoridad formal.",
      peso: 0.23077, // 15/65
      items: [
        { id: "pot_d3_i1_a4", texto: "Sus compañeros buscan frecuentemente su orientación, consejo o apoyo en temas relacionados con el trabajo.", orden: 31 },
        { id: "pot_d3_i2_a4", texto: "Toma iniciativa para coordinar, facilitar o liderar esfuerzos de equipo sin que se lo asignen formalmente.", orden: 32 },
        { id: "pot_d3_i3_a4", texto: "Apoya y desarrolla a otros compañeros compartiendo generosamente su conocimiento y experiencia.", orden: 33 },
      ],
    },
    {
      id: "pot_dim4_a4",
      nombre: "PENSAMIENTO ESTRATÉGICO BÁSICO",
      descripcion: "Capacidad de ver más allá de las tareas inmediatas, entender el contexto amplio y proponer mejoras.",
      peso: 0.15385, // 10/65
      items: [
        { id: "pot_d4_i1_a4", texto: "Comprende claramente cómo su trabajo se relaciona con los objetivos del área y de la municipalidad en general.", orden: 34 },
        { id: "pot_d4_i2_a4", texto: "Propone mejoras, soluciones o ideas que van más allá de sus tareas inmediatas y benefician al área o la institución.", orden: 35 },
      ],
    },
    {
      id: "pot_dim5_a4",
      nombre: "ADAPTABILIDAD Y RESILIENCIA",
      descripcion: "Manejo efectivo del cambio, la presión y las situaciones ambiguas o difíciles.",
      peso: 0.15385, // 10/65
      items: [
        { id: "pot_d5_i1_a4", texto: "Se ajusta efectivamente a cambios en prioridades, procedimientos, sistemas o condiciones de trabajo.", orden: 36 },
        { id: "pot_d5_i2_a4", texto: "Mantiene actitud positiva y rendimiento estable ante situaciones de presión, dificultad o incertidumbre.", orden: 37 },
      ],
    },
  ],
};

export const INSTRUMENT_S2: Instrument = {
  id: "S2_2025_V1",
  nivel: "S2",
  version: "2025.1",
  tiempoEstimado: "30-35 minutos",
  dimensionesDesempeno: [
    {
      id: "dim1_s2",
      nombre: "PRODUCTIVIDAD",
      descripcion: "Cumplimiento oportuno de las funciones administrativas y legales de la Secretaría Municipal, incluyendo elaboración de actas, certificaciones y gestión documental.",
      peso: 0.16667, // 20/120
      items: [
        { id: "d1_i1_s2", texto: "Elaboración de actas del Concejo Municipal - Elabora las actas de las sesiones ordinarias y extraordinarias del Concejo Municipal de forma completa, oportuna y conforme al formato oficial establecido, entregándolas dentro de los plazos legales para firma y aprobación.", orden: 1 },
        { id: "d1_i2_s2", texto: "Emisión de certificaciones - Emite certificaciones de documentos oficiales (actas, acuerdos, resoluciones, constancias) de manera oportuna, cumpliendo con los plazos establecidos y atendiendo las solicitudes de unidades internas y ciudadanía.", orden: 2 },
        { id: "d1_i3_s2", texto: "Gestión de correspondencia oficial - Recibe, registra, distribuye y da seguimiento a la correspondencia oficial entrante y saliente de la Secretaría Municipal, garantizando trazabilidad y cumplimiento de plazos de respuesta institucionales.", orden: 3 },
        { id: "d1_i4_s2", texto: "Organización del archivo municipal - Mantiene organizado, clasificado y actualizado el archivo físico y digital de la Secretaría Municipal (actas, acuerdos, resoluciones, correspondencia), facilitando su consulta y resguardo conforme a normativa de archivo.", orden: 4 },
      ],
    },
    {
      id: "dim2_s2",
      nombre: "CALIDAD",
      descripcion: "Exactitud, precisión y cumplimiento de estándares legales y protocolarios en la elaboración de documentos oficiales y gestión documental.",
      peso: 0.16667, // 20/120
      items: [
        { id: "d2_i1_s2", texto: "Precisión y exactitud de documentos oficiales - Los documentos elaborados (actas, certificaciones, oficios) son precisos, exactos y libres de errores ortográficos, gramaticales o de contenido, cumpliendo con los estándares de calidad institucional y legalidad.", orden: 5 },
        { id: "d2_i2_s2", texto: "Cumplimiento de formatos y protocolos oficiales - Elabora actas, acuerdos, certificaciones y correspondencia aplicando correctamente los formatos oficiales, protocolos institucionales y requisitos legales establecidos en el Código Municipal y normativa aplicable.", orden: 6 },
        { id: "d2_i3_s2", texto: "Validez legal de certificaciones - Las certificaciones que emite cumplen con todos los requisitos legales (sellos, firmas, fechas, folios) garantizando su validez jurídica y evitando rechazos o cuestionamientos por defectos de forma.", orden: 7 },
        { id: "d2_i4_s2", texto: "Integridad y resguardo documental - Garantiza la integridad, autenticidad y resguardo adecuado de los libros de actas, documentos originales y archivo municipal, evitando pérdidas, alteraciones o deterioro de documentación oficial.", orden: 8 },
      ],
    },
    {
      id: "dim3_s2",
      nombre: "COMPETENCIAS LABORALES",
      descripcion: "Dominio y aplicación de conocimientos técnico-legales, normativa municipal y procedimientos especializados requeridos para el ejercicio efectivo del cargo de Secretario Municipal.",
      peso: 0.20833, // 25/120
      items: [
        { id: "d3_i1_s2", texto: "Dominio de normativa municipal - Demuestra conocimiento actualizado y aplica correctamente el Código Municipal (especialmente Art. 84), Ley de Servicio Municipal, Ley de Acceso a Información Pública y demás normativa aplicable a las funciones de la Secretaría.", orden: 9 },
        { id: "d3_i2_s2", texto: "Gestión documental y archivo - Aplica técnicas de gestión documental (clasificación, foliación, índices) y mantiene el archivo municipal conforme a estándares archivísticos y normativa de conservación documental.", orden: 10 },
        { id: "d3_i3_s2", texto: "Redacción oficial y protocolo - Redacta actas, acuerdos, resoluciones, oficios y minutas con redacción oficial clara, precisa y protocolar, utilizando lenguaje jurídico-administrativo apropiado y estructura formal correcta.", orden: 11 },
        { id: "d3_i4_s2", texto: "Procedimientos de certificación y fe pública - Domina y aplica correctamente los procedimientos de certificación de documentos oficiales, ejerciendo la fe pública conforme a la competencia legal del puesto y resguardando la legalidad institucional.", orden: 12 },
        { id: "d3_i5_s2", texto: "Transparencia y acceso a información - Conoce y aplica la Ley de Acceso a Información Pública, gestiona solicitudes de información conforme a plazos legales, identifica excepciones y garantiza el derecho ciudadano al acceso a información municipal.", orden: 13 },
      ],
    },
    {
      id: "dim4_s2",
      nombre: "COMPORTAMIENTO ORGANIZACIONAL",
      descripcion: "Cumplimiento de normas, valores institucionales, ética pública y probidad en el ejercicio de las funciones de Secretario Municipal.",
      peso: 0.16667, // 20/120
      items: [
        { id: "d4_i1_s2", texto: "Probidad y ética pública - Actúa con probidad, imparcialidad y transparencia en el ejercicio de sus funciones, evitando conflictos de interés y ejerciendo la fe pública con responsabilidad y apego a la legalidad.", orden: 14 },
        { id: "d4_i2_s2", texto: "Discreción y confidencialidad - Mantiene estricta confidencialidad sobre información sensible, deliberaciones del Concejo, asuntos reservados y datos personales, manejando la información institucional con discreción profesional.", orden: 15 },
        { id: "d4_i3_s2", texto: "Cumplimiento del Sistema de Control Interno - Cumple y hace cumplir el Sistema de Control Interno (Acuerdo A-039-2023), los procedimientos de la Secretaría y las disposiciones de auditoría, garantizando trazabilidad y respaldo documental de actuaciones.", orden: 16 },
        { id: "d4_i4_s2", texto: "Puntualidad, asistencia y disponibilidad - Asiste puntualmente a sesiones del Concejo, cumple con el horario de la Secretaría y demuestra disponibilidad para atender sesiones extraordinarias, emergencias institucionales y requerimientos urgentes de certificación.", orden: 17 },
      ],
    },
    {
      id: "dim5_s2",
      nombre: "RELACIONES INTERPERSONALES",
      descripcion: "Calidad de la comunicación, coordinación y colaboración con autoridades, funcionarios y ciudadanía.",
      peso: 0.12500, // 15/120
      items: [
        { id: "d5_i1_s2", texto: "Coordinación con Concejo Municipal y Alcaldía - Mantiene comunicación efectiva, respetuosa y protocolar con los miembros del Concejo Municipal y el Alcalde, brindando apoyo oportuno y facilitando la toma de decisiones institucionales.", orden: 18 },
        { id: "d5_i2_s2", texto: "Colaboración con unidades internas - Coordina eficazmente con Gerencia, Direcciones y Unidades municipales, facilitando certificaciones, información y documentación de archivo, con actitud colaborativa y orientación al trabajo en equipo.", orden: 19 },
        { id: "d5_i3_s2", texto: "Atención a la ciudadanía - Atiende con respeto, amabilidad y orientación al servicio las solicitudes de información y certificaciones de la ciudadanía, brindando orientación clara sobre procedimientos y requisitos.", orden: 20 },
      ],
    },
    {
      id: "dim6_s2",
      nombre: "SERVICIO INSTITUCIONAL Y TRANSPARENCIA",
      descripcion: "Orientación al servicio público, transparencia activa y apoyo estratégico a las funciones del Concejo Municipal y Alcaldía.",
      peso: 0.16667, // 20/120
      items: [
        { id: "d6_i1_s2", texto: "Transparencia activa y acceso a información - Facilita el acceso ciudadano a información pública municipal, responde solicitudes dentro de plazos legales, publica información conforme a Ley y promueve la transparencia institucional.", orden: 21 },
        { id: "d6_i2_s2", texto: "Apoyo estratégico al Concejo Municipal - Brinda soporte técnico-administrativo eficaz al Concejo Municipal (preparación de sesiones, seguimiento de acuerdos, elaboración de actas), facilitando la función legislativa y de control del órgano colegiado.", orden: 22 },
        { id: "d6_i3_s2", texto: "Apoyo a funciones delegadas por la Alcaldía - Ejecuta oportunamente las funciones que la Alcaldía le delega conforme al Código Municipal, brindando apoyo administrativo y legal al despacho del Alcalde.", orden: 23 },
        { id: "d6_i4_s2", texto: "Proactividad y mejora continua - Propone mejoras en procedimientos de la Secretaría, anticipa necesidades de documentación, agiliza trámites sin comprometer legalidad y contribuye a la eficiencia institucional.", orden: 24 },
      ],
    },
  ],
  dimensionesPotencial: [
    {
      id: "pot_dim1_s2",
      nombre: "LIDERAZGO ESTRATÉGICO",
      descripcion: "Capacidad para influir positivamente, liderar equipos y representar a la institución en niveles estratégicos.",
      peso: 0.30, // 30/100
      items: [
        { id: "pot_d1_i1_s2", texto: "Capacidad de influencia institucional - Demuestra capacidad para influir positivamente en decisiones institucionales más allá de su área, siendo reconocido como referente técnico-legal por autoridades y funcionarios de distintos niveles.", orden: 25 },
        { id: "pot_d1_i2_s2", texto: "Visión de liderazgo de equipos - Muestra potencial para liderar equipos más amplios, delegar efectivamente, desarrollar colaboradores y gestionar áreas operativas más allá de la Secretaría Municipal.", orden: 26 },
        { id: "pot_d1_i3_s2", texto: "Comunicación y representación institucional - Tiene capacidad para representar a la municipalidad en espacios interinstitucionales, comunicar con claridad temas complejos y proyectar imagen institucional profesional.", orden: 27 },
      ],
    },
    {
      id: "pot_dim2_s2",
      nombre: "GESTIÓN Y TOMA DE DECISIONES",
      descripcion: "Capacidad para el pensamiento estratégico, toma de decisiones complejas y gestión de recursos institucionales.",
      peso: 0.30, // 30/100
      items: [
        { id: "pot_d2_i1_s2", texto: "Pensamiento estratégico - Demuestra capacidad de análisis estratégico, anticipa escenarios futuros, identifica oportunidades de mejora institucional y propone soluciones innovadoras alineadas a objetivos municipales.", orden: 28 },
        { id: "pot_d2_i2_s2", texto: "Toma de decisiones bajo presión - Muestra capacidad para tomar decisiones efectivas en situaciones complejas, ambiguas o de alta presión, evaluando riesgos y considerando impacto institucional.", orden: 29 },
        { id: "pot_d2_i3_s2", texto: "Gestión de recursos y resultados - Evidencia potencial para gestionar presupuestos, recursos humanos y materiales de áreas más amplias, con orientación a resultados y eficiencia institucional.", orden: 30 },
      ],
    },
    {
      id: "pot_dim3_s2",
      nombre: "DESARROLLO Y APRENDIZAJE",
      descripcion: "Capacidad para el aprendizaje continuo y la adaptación al cambio.",
      peso: 0.20, // 20/100
      items: [
        { id: "pot_d3_i1_s2", texto: "Actualización y aprendizaje continuo - Busca activamente capacitación, actualización en normativa municipal, gestión pública y nuevas tendencias, demostrando iniciativa de desarrollo profesional continuo.", orden: 31 },
        { id: "pot_d3_i2_s2", texto: "Adaptabilidad y gestión del cambio - Muestra flexibilidad para adaptarse a cambios organizacionales, nuevas normativas, tecnologías o procedimientos, promoviendo la mejora continua y la innovación institucional.", orden: 32 },
      ],
    },
    {
      id: "pot_dim4_s2",
      nombre: "VISIÓN INSTITUCIONAL",
      descripcion: "Comprensión integral de la gestión municipal y compromiso con el desarrollo institucional.",
      peso: 0.20, // 20/100
      items: [
        { id: "pot_d4_i1_s2", texto: "Comprensión integral de la gestión municipal - Demuestra comprensión amplia del funcionamiento municipal más allá de la Secretaría (planificación, presupuesto, servicios, desarrollo local), con visión sistémica de la institución.", orden: 33 },
        { id: "pot_d4_i2_s2", texto: "Compromiso con el desarrollo institucional - Evidencia compromiso genuino con el desarrollo y fortalecimiento institucional, propone iniciativas de mejora, participa en proyectos transversales y contribuye al logro de objetivos estratégicos municipales.", orden: 34 },
      ],
    },
  ],
};

export const INSTRUMENT_E2: Instrument = {
  id: "E2_2025_V1",
  nivel: "E2",
  version: "2025.1",
  tiempoEstimado: "25-30 minutos",
  dimensionesDesempeno: [
    {
      id: "dim1_e2",
      nombre: "PRODUCTIVIDAD",
      descripcion: "Evalúa el cumplimiento de metas, volumen de trabajo y eficiencia en el uso del tiempo.",
      peso: 0.16667, // 20/120
      items: [
        { id: "d1_i1_e2", texto: "Cumple con las metas y tareas operativas asignadas a su unidad dentro de los plazos establecidos.", orden: 1 },
        { id: "d1_i2_e2", texto: "Maneja un volumen de trabajo adecuado, atendiendo las demandas de su área sin atrasos significativos.", orden: 2 },
        { id: "d1_i3_e2", texto: "Entrega productos, informes y documentos requeridos en el tiempo estipulado.", orden: 3 },
        { id: "d1_i4_e2", texto: "Organiza su tiempo y prioriza sus tareas de manera eficiente para cumplir con sus responsabilidades.", orden: 4 },
      ],
    },
    {
      id: "dim2_e2",
      nombre: "CALIDAD",
      descripcion: "Evalúa la precisión, exactitud y cumplimiento de estándares técnicos en el trabajo realizado.",
      peso: 0.16667, // 20/120
      items: [
        { id: "d2_i1_e2", texto: "El trabajo técnico que realiza (registros, documentos, procesos) es preciso y libre de errores significativos.", orden: 5 },
        { id: "d2_i2_e2", texto: "Los informes, reportes y documentos que elabora cumplen con los estándares de calidad y formato requeridos.", orden: 6 },
        { id: "d2_i3_e2", texto: "Cumple con los procedimientos, lineamientos y protocolos establecidos para su área de trabajo.", orden: 7 },
        { id: "d2_i4_e2", texto: "Demuestra atención al detalle en la documentación, registros y expedientes que maneja.", orden: 8 },
      ],
    },
    {
      id: "dim3_e2",
      nombre: "COMPETENCIAS LABORALES",
      descripcion: "Evalúa el dominio técnico especializado y las habilidades requeridas para el puesto.",
      peso: 0.20833, // 25/120
      items: [
        { id: "d3_i1_e2", texto: "Posee y aplica el conocimiento técnico especializado requerido para desempeñar eficazmente su puesto.", orden: 9 },
        { id: "d3_i2_e2", texto: "Utiliza correctamente los sistemas informáticos y herramientas tecnológicas necesarias para su trabajo (SICOIN, Office, sistemas municipales).", orden: 10 },
        { id: "d3_i3_e2", texto: "Conoce y aplica adecuadamente la normativa municipal, reglamentos y procedimientos de control interno que rigen su área.", orden: 11 },
        { id: "d3_i4_e2", texto: "Analiza situaciones operativas de su unidad e identifica soluciones apropiadas a los problemas que enfrenta.", orden: 12 },
        { id: "d3_i5_e2", texto: "Gestiona adecuadamente la documentación, archivo y expedientes de su área, manteniéndolos organizados y accesibles.", orden: 13 },
      ],
    },
    {
      id: "dim4_e2",
      nombre: "COMPORTAMIENTO ORGANIZACIONAL",
      descripcion: "Evalúa el cumplimiento de normas institucionales, disciplina y conducta laboral.",
      peso: 0.12500, // 15/120
      items: [
        { id: "d4_i1_e2", texto: "Cumple con el horario de trabajo establecido y demuestra puntualidad en su asistencia.", orden: 14 },
        { id: "d4_i2_e2", texto: "Respeta la jerarquía organizacional y acata las instrucciones de su jefatura inmediata.", orden: 15 },
        { id: "d4_i3_e2", texto: "Actúa con apego a las normas institucionales, reglamentos municipales y código de conducta.", orden: 16 },
      ],
    },
    {
      id: "dim5_e2",
      nombre: "RELACIONES INTERPERSONALES",
      descripcion: "Evalúa la capacidad de trabajar en equipo, comunicarse efectivamente y coordinar con otras unidades.",
      peso: 0.16667, // 20/120
      items: [
        { id: "d5_i1_e2", texto: "Trabaja de manera colaborativa con sus compañeros y contribuye al logro de objetivos comunes.", orden: 17 },
        { id: "d5_i2_e2", texto: "Se comunica de forma clara y efectiva, tanto verbalmente como por escrito, con su jefatura, colegas y personal a cargo.", orden: 18 },
        { id: "d5_i3_e2", texto: "Mantiene una relación profesional y respetuosa con su jefe inmediato, aportando información oportuna y siguiendo instrucciones.", orden: 19 },
        { id: "d5_i4_e2", texto: "Coordina eficazmente con otras unidades y direcciones de la municipalidad para facilitar el trabajo institucional.", orden: 20 },
      ],
    },
    {
      id: "dim6_e2",
      nombre: "ORIENTACIÓN AL SERVICIO",
      descripcion: "Evalúa la disposición para atender necesidades y solicitudes con calidad, oportunidad y actitud positiva.",
      peso: 0.16667, // 20/120
      items: [
        { id: "d6_i1_e2", texto: "Atiende con cortesía, respeto y disposición las solicitudes que recibe (de usuarios externos o de otras unidades internas).", orden: 21 },
        { id: "d6_i2_e2", texto: "Responde de manera oportuna a las peticiones, requerimientos o consultas que le presentan.", orden: 22 },
        { id: "d6_i3_e2", texto: "Brinda seguimiento adecuado a las solicitudes hasta su resolución o canalización apropiada.", orden: 23 },
        { id: "d6_i4_e2", texto: "Mantiene una actitud de colaboración y servicio que facilita el trabajo de otros y el cumplimiento de objetivos institucionales.", orden: 24 },
      ],
    },
  ],
  dimensionesPotencial: [
    {
      id: "pot_dim1_e2",
      nombre: "POTENCIAL DE CRECIMIENTO Y DESARROLLO PROFESIONAL",
      descripcion: "Evalúa la capacidad del colaborador para asumir roles de mayor responsabilidad o especialización, considerando trayectoria gerencial (ascenso a E1) o trayectoria técnica (especialista/experto de referencia).",
      peso: 1.0, // Solo una dimensión
      items: [
        { id: "pot_d1_i1_e2", texto: "VISIÓN ESTRATÉGICA: Demuestra capacidad para comprender el impacto de su área en los objetivos institucionales y piensa más allá de las tareas operativas inmediatas.", orden: 25 },
        { id: "pot_d1_i2_e2", texto: "LIDERAZGO AMPLIADO: Muestra habilidades para dirigir equipos más grandes o coordinar múltiples procesos, ejerciendo influencia positiva más allá de su equipo directo.", orden: 26 },
        { id: "pot_d1_i3_e2", texto: "TOMA DE DECISIONES COMPLEJAS: Es capaz de manejar situaciones con múltiples variables y tomar decisiones tácticas (no solo operativas) con autonomía y criterio adecuado.", orden: 27 },
        { id: "pot_d1_i4_e2", texto: "ESPECIALIZACIÓN TÉCNICA: Demuestra interés y capacidad para profundizar en su conocimiento técnico y convertirse en experto/referente en su área específica.", orden: 28 },
        { id: "pot_d1_i5_e2", texto: "APRENDIZAJE CONTINUO: Busca activamente oportunidades de desarrollo profesional, se mantiene actualizado y aplica nuevos conocimientos a su trabajo.", orden: 29 },
        { id: "pot_d1_i6_e2", texto: "TRANSFERENCIA DE CONOCIMIENTO: Tiene la capacidad y disposición para capacitar, formar y compartir su conocimiento con otros colaboradores de manera efectiva.", orden: 30 },
      ],
    },
  ],
};

export const INSTRUMENT_D2: Instrument = {
  id: "D2_2025_V1",
  nivel: "D2",
  version: "2025.1",
  tiempoEstimado: "30-35 minutos",
  dimensionesDesempeno: [
    {
      id: "dim1_d2",
      nombre: "PRODUCTIVIDAD",
      descripcion: "Capacidad para cumplir con los objetivos estratégicos, metas y planes establecidos para la dirección, utilizando eficientemente los recursos y cumpliendo con los plazos institucionales.",
      peso: 0.20, // 20%
      items: [
        { id: "d1_i1_d2", texto: "Cumple con los objetivos estratégicos establecidos en el plan anual de su dirección", orden: 1 },
        { id: "d1_i2_d2", texto: "Ejecuta eficientemente el Plan Operativo Anual (POA) asignado a su dirección", orden: 2 },
        { id: "d1_i3_d2", texto: "Entrega informes, proyectos y reportes dentro de los plazos establecidos", orden: 3 },
        { id: "d1_i4_d2", texto: "Gestiona eficientemente los recursos (humanos, financieros, materiales) asignados a su dirección", orden: 4 },
        { id: "d1_i5_d2", texto: "Alcanza las metas cuantitativas y cualitativas establecidas para su dirección", orden: 5 },
      ],
    },
    {
      id: "dim2_d2",
      nombre: "CALIDAD",
      descripcion: "Capacidad para asegurar que los servicios, procesos, informes y productos de la dirección cumplan con los estándares de calidad, normas técnicas y requisitos institucionales establecidos.",
      peso: 0.15, // 15%
      items: [
        { id: "d2_i1_d2", texto: "Los servicios y procesos de su dirección cumplen con los estándares de calidad establecidos", orden: 6 },
        { id: "d2_i2_d2", texto: "Los informes y reportes que presenta son precisos, exactos y completos", orden: 7 },
        { id: "d2_i3_d2", texto: "Implementa acciones de mejora continua en los procesos de su dirección", orden: 8 },
        { id: "d2_i4_d2", texto: "Asegura el cumplimiento de la normativa técnica y legal aplicable a su dirección", orden: 9 },
      ],
    },
    {
      id: "dim3_d2",
      nombre: "COMPETENCIAS LABORALES",
      descripcion: "Conjunto de competencias comportamentales esenciales para el desempeño efectivo del nivel directivo, incluyendo liderazgo, planificación estratégica, orientación a resultados, trabajo en equipo, integridad y adaptabilidad.",
      peso: 0.25, // 25%
      items: [
        { id: "d3_i1_d2", texto: "LIDERAZGO Y COMUNICACIÓN: Demuestra liderazgo efectivo, comunica claramente objetivos y expectativas, e influye positivamente en su equipo y en otras direcciones", orden: 10 },
        { id: "d3_i2_d2", texto: "PLANIFICACIÓN Y PENSAMIENTO ESTRATÉGICO: Planifica y organiza efectivamente las actividades de la dirección, analiza situaciones complejas y toma decisiones fundamentadas", orden: 11 },
        { id: "d3_i3_d2", texto: "ORIENTACIÓN A RESULTADOS Y CALIDAD: Se enfoca en lograr resultados de calidad, toma iniciativa ante problemas y busca información para fundamentar sus acciones", orden: 12 },
        { id: "d3_i4_d2", texto: "TRABAJO EN EQUIPO Y COLABORACIÓN: Trabaja colaborativamente con otros, negocia efectivamente y promueve la cooperación entre direcciones y entidades externas", orden: 13 },
        { id: "d3_i5_d2", texto: "INTEGRIDAD Y RESPONSABILIDAD: Actúa con integridad y ética profesional, asume responsabilidad por sus decisiones, cumple compromisos y es confiable", orden: 14 },
        { id: "d3_i6_d2", texto: "ADAPTABILIDAD Y GESTIÓN DEL ESTRÉS: Se adapta a cambios, mantiene el control en situaciones de presión, demuestra resistencia ante obstáculos y gestiona múltiples demandas efectivamente", orden: 15 },
      ],
    },
    {
      id: "dim4_d2",
      nombre: "COMPORTAMIENTO ORGANIZACIONAL",
      descripcion: "Cumplimiento de normas, políticas y valores institucionales, demostrando ejemplaridad, ética profesional y uso apropiado de los recursos municipales.",
      peso: 0.10, // 10%
      items: [
        { id: "d4_i1_d2", texto: "Cumple con el horario de trabajo establecido y asiste regularmente a sus labores", orden: 16 },
        { id: "d4_i2_d2", texto: "Actúa con ética, transparencia e integridad, siendo modelo a seguir para su equipo y otras direcciones", orden: 17 },
        { id: "d4_i3_d2", texto: "Utiliza apropiadamente los recursos municipales (instalaciones, equipo, vehículos, materiales)", orden: 18 },
      ],
    },
    {
      id: "dim5_d2",
      nombre: "LIDERAZGO Y GESTIÓN DE EQUIPOS",
      descripcion: "Capacidad para liderar, supervisar, desarrollar y motivar al personal de la dirección, tomar decisiones gerenciales apropiadas y promover un clima laboral positivo y productivo.",
      peso: 0.20, // 20%
      items: [
        { id: "d5_i1_d2", texto: "Supervisa efectivamente el desempeño del personal de su dirección y brinda retroalimentación oportuna", orden: 19 },
        { id: "d5_i2_d2", texto: "Identifica necesidades de capacitación y promueve el desarrollo profesional de su equipo", orden: 20 },
        { id: "d5_i3_d2", texto: "Delega tareas apropiadamente según las capacidades y carga de trabajo del equipo", orden: 21 },
        { id: "d5_i4_d2", texto: "Toma decisiones gerenciales oportunas y justas sobre asuntos relacionados con el personal de su dirección", orden: 22 },
        { id: "d5_i5_d2", texto: "Resuelve conflictos del equipo de manera efectiva y promueve un clima laboral positivo y productivo", orden: 23 },
        { id: "d5_i6_d2", texto: "Inspira y motiva a su equipo hacia el logro de los objetivos estratégicos de la dirección", orden: 24 },
      ],
    },
    {
      id: "dim6_d2",
      nombre: "COORDINACIÓN INSTITUCIONAL",
      descripcion: "Capacidad para coordinar efectivamente con el Alcalde Municipal, Concejo Municipal, otras direcciones y entidades externas, gestionando relaciones productivas y representando dignamente a la institución.",
      peso: 0.10, // 10%
      items: [
        { id: "d6_i1_d2", texto: "Coordina efectivamente con el Alcalde Municipal, informando oportunamente sobre la gestión de su dirección", orden: 25 },
        { id: "d6_i2_d2", texto: "Presenta propuestas claras, fundamentadas y oportunas al Concejo Municipal cuando corresponde", orden: 26 },
        { id: "d6_i3_d2", texto: "Colabora efectivamente con otras direcciones municipales para lograr objetivos institucionales comunes", orden: 27 },
        { id: "d6_i4_d2", texto: "Gestiona relaciones productivas con entidades externas relevantes (instituciones gubernamentales, ONGs, sector privado, etc.)", orden: 28 },
      ],
    },
  ],
  dimensionesPotencial: [
    {
      id: "pot_dim1_d2",
      nombre: "CAPACIDAD DE APRENDIZAJE Y DESARROLLO",
      descripcion: "Apertura para aprender nuevas competencias, adaptabilidad cognitiva y búsqueda activa de crecimiento profesional.",
      peso: 0.30, // 3/10
      items: [
        { id: "pot_d1_i1_d2", texto: "Demuestra apertura y disposición para aprender nuevas competencias, conocimientos y responsabilidades", orden: 29 },
        { id: "pot_d1_i2_d2", texto: "Se adapta rápidamente a nuevos retos, responsabilidades y cambios en el entorno institucional", orden: 30 },
        { id: "pot_d1_i3_d2", texto: "Busca activamente oportunidades de desarrollo profesional y crecimiento personal (capacitaciones, estudios, experiencias)", orden: 31 },
      ],
    },
    {
      id: "pot_dim2_d2",
      nombre: "VISIÓN ESTRATÉGICA Y PENSAMIENTO SISTÉMICO",
      descripcion: "Capacidad para comprender el panorama amplio de la gestión municipal, pensar a largo plazo y conectar los objetivos de su dirección con la estrategia institucional.",
      peso: 0.30, // 3/10
      items: [
        { id: "pot_d2_i1_d2", texto: "Comprende cómo su dirección contribuye a los objetivos estratégicos y misión de la Municipalidad", orden: 32 },
        { id: "pot_d2_i2_d2", texto: "Propone iniciativas, proyectos o mejoras que benefician a la institución más allá de su dirección", orden: 33 },
        { id: "pot_d2_i3_d2", texto: "Anticipa tendencias, cambios y necesidades futuras relevantes para la gestión municipal", orden: 34 },
      ],
    },
    {
      id: "pot_dim3_d2",
      nombre: "LIDERAZGO AMPLIADO E INFLUENCIA INSTITUCIONAL",
      descripcion: "Capacidad para ejercer liderazgo e influencia más allá de su dirección, siendo referente institucional y liderando proyectos transversales.",
      peso: 0.20, // 2/10
      items: [
        { id: "pot_d3_i1_d2", texto: "Ejerce influencia positiva más allá de su dirección, siendo reconocido como referente y líder institucional", orden: 35 },
        { id: "pot_d3_i2_d2", texto: "Demuestra capacidad para liderar proyectos transversales, interinstitucionales o de alto impacto municipal", orden: 36 },
      ],
    },
    {
      id: "pot_dim4_d2",
      nombre: "GESTIÓN DEL CAMBIO E INNOVACIÓN",
      descripcion: "Capacidad para proponer e implementar innovaciones, gestionar procesos de cambio y transformar la gestión de su dirección.",
      peso: 0.20, // 2/10
      items: [
        { id: "pot_d4_i1_d2", texto: "Propone e implementa innovaciones, mejoras o soluciones creativas que transforman la gestión de su dirección o de la Municipalidad", orden: 37 },
        { id: "pot_d4_i2_d2", texto: "Gestiona efectivamente procesos de cambio en su dirección, logrando la adopción exitosa por parte del equipo", orden: 38 },
      ],
    },
  ],
};

export const INSTRUMENT_D1: Instrument = {
  id: "D1_2025_V1",
  nivel: "D1",
  version: "2025.1",
  tiempoEstimado: "30-35 minutos",
  dimensionesDesempeno: [
    {
      id: "dim1_d1",
      nombre: "PRODUCTIVIDAD ESTRATÉGICA",
      descripcion: "Capacidad para cumplir eficientemente las metas estratégicas de la dirección, ejecutar planes institucionales y lograr resultados oportunos.",
      peso: 0.15385, // 20/130
      items: [
        { id: "d1_i1_d1", texto: "Cumple las metas y objetivos establecidos en el Plan Estratégico Institucional (PEI), Plan Operativo Multianual (POM) y Plan Operativo Anual (POA) para su dirección.", orden: 1 },
        { id: "d1_i2_d1", texto: "Ejecuta eficientemente el presupuesto y los recursos asignados a su área, optimizando su uso para alcanzar los resultados esperados.", orden: 2 },
        { id: "d1_i3_d1", texto: "Cumple oportunamente con los compromisos, plazos y entregables adquiridos ante el Alcalde Municipal y el Concejo Municipal.", orden: 3 },
        { id: "d1_i4_d1", texto: "Logra los resultados institucionales esperados de su dirección, contribuyendo efectivamente al cumplimiento de los objetivos municipales.", orden: 4 },
      ],
    },
    {
      id: "dim2_d1",
      nombre: "CALIDAD DE GESTIÓN DIRECTIVA",
      descripcion: "Garantizar que los productos, servicios, informes y procesos de la dirección cumplan con estándares técnicos, normativos y de control interno, con precisión y confiabilidad.",
      peso: 0.15385, // 20/130
      items: [
        { id: "d2_i1_d1", texto: "Garantiza que los informes, documentos y productos generados por su dirección sean técnicamente sólidos y de alta calidad.", orden: 5 },
        { id: "d2_i2_d1", texto: "Asegura que los procesos de su área cumplan con los estándares de control interno establecidos en el Acuerdo A-039-2023 y normativa aplicable.", orden: 6 },
        { id: "d2_i3_d1", texto: "Supervisa que la información generada por su dirección sea precisa, confiable y esté debidamente respaldada.", orden: 7 },
        { id: "d2_i4_d1", texto: "Atiende oportunamente los hallazgos de auditorías internas y externas, implementando las acciones correctivas necesarias.", orden: 8 },
      ],
    },
    {
      id: "dim3_d1",
      nombre: "COMPETENCIAS DIRECTIVAS",
      descripcion: "Dominio de conocimientos técnicos, habilidades de gestión pública municipal y competencias estratégicas necesarias para dirigir efectivamente su área de responsabilidad.",
      peso: 0.19231, // 25/130
      items: [
        // Items universales (todos los puestos D1)
        { id: "d3_i1_d1", texto: "Demuestra dominio técnico de la gestión pública municipal, aplicando correctamente la normativa y procedimientos aplicables a su área.", orden: 9 },
        { id: "d3_i2_d1", texto: "Utiliza efectivamente las herramientas de planificación estratégica y operativa (PEI, POM, POA) para dirigir su área.", orden: 10 },
        { id: "d3_i3_d1", texto: "Toma decisiones técnicamente fundamentadas basándose en análisis riguroso de información, normativa y contexto institucional.", orden: 11 },
        // Items específicos por puesto (se filtran según cargo)
        // Gerente Municipal
        { id: "d3_i4a_d1", texto: "Gestiona integradamente las múltiples direcciones municipales, articulando sus esfuerzos hacia objetivos comunes.", orden: 12 },
        { id: "d3_i5a_d1", texto: "Utiliza sistemas de seguimiento y monitoreo (SICOIN, tableros de control) para dirigir la gestión institucional.", orden: 13 },
        // Juez Municipal
        { id: "d3_i4b_d1", texto: "Conduce procesos de juzgamiento administrativo aplicando correctamente el debido proceso y fundamentación legal.", orden: 12 },
        { id: "d3_i5b_d1", texto: "Emite resoluciones administrativas debidamente fundamentadas en derecho, con claridad jurídica y proporcionalidad.", orden: 13 },
        // Directora de Recursos Humanos
        { id: "d3_i4c_d1", texto: "Gestiona integralmente los subsistemas de recursos humanos (reclutamiento, capacitación, evaluación, compensación).", orden: 12 },
        { id: "d3_i5c_d1", texto: "Implementa sistemas de evaluación del desempeño y desarrollo del talento humano basados en competencias.", orden: 13 },
        // Directora de DMP
        { id: "d3_i4d_d1", texto: "Formula proyectos de inversión conforme metodología SNIP y lineamientos de SEGEPLAN con calidad técnica.", orden: 12 },
        { id: "d3_i5d_d1", texto: "Gestiona efectivamente la participación ciudadana (COMUDE/COCODE) en procesos de planificación municipal.", orden: 13 },
        // Director de DAFIM
        { id: "d3_i4e_d1", texto: "Dirige la gestión financiera y presupuestaria municipal en SICOIN GL/SIAF-Muni garantizando cumplimiento normativo.", orden: 12 },
        { id: "d3_i5e_d1", texto: "Analiza estados financieros y elabora informes de ejecución presupuestaria con rigurosidad técnica.", orden: 13 },
        // Directora de DMM
        { id: "d3_i4f_d1", texto: "Transversaliza el enfoque de género en políticas, planes y proyectos municipales con fundamento técnico.", orden: 12 },
        { id: "d3_i5f_d1", texto: "Coordina efectivamente acciones de prevención y atención de violencia contra las mujeres con instancias competentes.", orden: 13 },
      ],
    },
    {
      id: "dim4_d1",
      nombre: "LIDERAZGO ÉTICO Y CULTURA ORGANIZACIONAL",
      descripcion: "Actuar con probidad, transparencia e integridad en el ejercicio del cargo, promoviendo una cultura de ética, legalidad y valores institucionales.",
      peso: 0.15385, // 20/130
      items: [
        { id: "d4_i1_d1", texto: "Actúa con probidad, transparencia e integridad en todas las decisiones y acciones relacionadas con su cargo.", orden: 14 },
        { id: "d4_i2_d1", texto: "Gestiona los recursos municipales con transparencia, rindiendo cuentas de manera clara y oportuna.", orden: 15 },
        { id: "d4_i3_d1", texto: "Garantiza el apego a la legalidad y al marco normativo municipal en todas las actuaciones de su dirección.", orden: 16 },
        { id: "d4_i4_d1", texto: "Promueve activamente una cultura de ética, valores institucionales y cumplimiento normativo en su equipo de trabajo.", orden: 17 },
      ],
    },
    {
      id: "dim5_d1",
      nombre: "COORDINACIÓN INSTITUCIONAL ESTRATÉGICA",
      descripcion: "Establecer y mantener relaciones efectivas de coordinación con otras direcciones municipales y actores externos, representando profesionalmente a la institución y construyendo alianzas estratégicas.",
      peso: 0.15385, // 20/130
      items: [
        { id: "d5_i1_d1", texto: "Coordina efectivamente con otras direcciones y unidades municipales para lograr objetivos institucionales comunes.", orden: 18 },
        { id: "d5_i2_d1", texto: "Representa profesional y dignamente a la municipalidad ante instituciones públicas, privadas y la ciudadanía.", orden: 19 },
        { id: "d5_i3_d1", texto: "Se comunica de forma clara, oportuna y estratégica con actores clave internos y externos a la municipalidad.", orden: 20 },
        { id: "d5_i4_d1", texto: "Construye alianzas estratégicas y facilita consensos con diversos actores para beneficio institucional.", orden: 21 },
      ],
    },
    {
      id: "dim6_d1",
      nombre: "LIDERAZGO Y GESTIÓN DE EQUIPOS",
      descripcion: "Dirigir, motivar y desarrollar al equipo de trabajo de la dirección hacia el logro de objetivos, asignando efectivamente funciones, proporcionando retroalimentación y promoviendo un clima laboral positivo.",
      peso: 0.19231, // 25/130
      items: [
        { id: "d6_i1_d1", texto: "Dirige efectivamente a su equipo de trabajo hacia el cumplimiento de los objetivos y metas de la dirección.", orden: 22 },
        { id: "d6_i2_d1", texto: "Desarrolla las capacidades y el talento del personal de su dirección mediante capacitación, coaching o asignación de retos.", orden: 23 },
        { id: "d6_i3_d1", texto: "Asigna funciones, tareas y recursos de manera efectiva según las competencias y fortalezas de cada miembro del equipo.", orden: 24 },
        { id: "d6_i4_d1", texto: "Proporciona retroalimentación constructiva, oportuna y específica que contribuye al desarrollo del personal.", orden: 25 },
        { id: "d6_i5_d1", texto: "Promueve un clima laboral positivo que favorece el alto desempeño, la colaboración y el compromiso del equipo.", orden: 26 },
      ],
    },
  ],
  dimensionesPotencial: [
    {
      id: "pot_dim1_d1",
      nombre: "CAPACIDAD DE APRENDIZAJE Y ADAPTACIÓN",
      descripcion: "Aprende rápidamente de experiencias, se adapta efectivamente a contextos cambiantes y busca activamente su desarrollo profesional.",
      peso: 0.25, // 10/40
      items: [
        { id: "pot_d1_i1_d1", texto: "Aprende rápidamente nuevos conocimientos, herramientas o metodologías y los aplica efectivamente en su trabajo.", orden: 27 },
        { id: "pot_d1_i2_d1", texto: "Se adapta efectivamente a cambios organizacionales, nuevas directrices o situaciones imprevistas, manteniendo su efectividad.", orden: 28 },
      ],
    },
    {
      id: "pot_dim2_d1",
      nombre: "VISIÓN ESTRATÉGICA AMPLIADA",
      descripcion: "Piensa más allá de su área de responsabilidad, visualiza oportunidades institucionales y comprende el contexto político-social amplio.",
      peso: 0.25, // 10/40
      items: [
        { id: "pot_d2_i1_d1", texto: "Demuestra una visión que trasciende su dirección, considerando el impacto institucional amplio de sus propuestas y decisiones.", orden: 29 },
        { id: "pot_d2_i2_d1", texto: "Comprende y considera el contexto político, social y económico más amplio en sus análisis y recomendaciones.", orden: 30 },
      ],
    },
    {
      id: "pot_dim3_d1",
      nombre: "INFLUENCIA Y LIDERAZGO AMPLIADO",
      descripcion: "Influye positivamente más allá de su área de autoridad formal, lidera iniciativas transversales e inspira a otros fuera de su equipo directo.",
      peso: 0.125, // 5/40
      items: [
        { id: "pot_d3_i1_d1", texto: "Ejerce influencia positiva y lidera iniciativas más allá de su área de responsabilidad formal, siendo reconocido por otros.", orden: 31 },
      ],
    },
    {
      id: "pot_dim4_d1",
      nombre: "CAPACIDAD DE GESTIÓN DE COMPLEJIDAD",
      descripcion: "Maneja simultáneamente múltiples prioridades, toma decisiones en contextos ambiguos e integra perspectivas diversas.",
      peso: 0.125, // 5/40
      items: [
        { id: "pot_d4_i1_d1", texto: "Gestiona efectivamente múltiples prioridades y situaciones complejas simultáneamente, manteniendo claridad estratégica.", orden: 32 },
      ],
    },
    {
      id: "pot_dim5_d1",
      nombre: "ORIENTACIÓN AL CRECIMIENTO INSTITUCIONAL",
      descripcion: "Propone mejoras e innovaciones, piensa en el largo plazo institucional y prioriza el bien común sobre logros individuales.",
      peso: 0.125, // 5/40
      items: [
        { id: "pot_d5_i1_d1", texto: "Propone activamente mejoras, innovaciones o soluciones orientadas al crecimiento y fortalecimiento institucional de largo plazo.", orden: 33 },
      ],
    },
    {
      id: "pot_dim6_d1",
      nombre: "RESILIENCIA EXCEPCIONAL",
      descripcion: "Mantiene alto desempeño en contextos adversos, con recuperación rápida de contratiempos y energía sostenida en ciclos exigentes.",
      peso: 0.125, // 5/40
      items: [
        { id: "pot_d6_i1_d1", texto: "Mantiene un alto nivel de desempeño incluso en contextos de alta presión, adversidad o crisis institucional.", orden: 34 },
      ],
    },
  ],
};

// Otros instrumentos se agregarán progresivamente
export const INSTRUMENTS: Record<string, Instrument> = {
  A1: INSTRUMENT_A1,
  A3: INSTRUMENT_A3,
  O2: INSTRUMENT_O2,
  E1: INSTRUMENT_E1,
  O1: INSTRUMENT_O1,
  OTE: INSTRUMENT_OTE,
  D2: INSTRUMENT_D2,
  D1: INSTRUMENT_D1,
};
