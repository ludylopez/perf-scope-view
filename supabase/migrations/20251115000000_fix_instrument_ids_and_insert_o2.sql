-- Migración: Corregir IDs de A1 e Insertar O2
-- Fecha: 2025-11-15
-- Descripción: 
--   1. Corrige los IDs de A1 para que coincidan con el frontend (agregar sufijos _a1)
--   2. Corrige la configuración de cálculo de A1 (0.55/0.45 en vez de 0.7/0.3)
--   3. Inserta el instrumento O2 con IDs correctos

-- ============================================================================
-- 1. ACTUALIZAR INSTRUMENTO A1 CON IDs CORRECTOS Y CONFIGURACIÓN CORRECTA
-- ============================================================================

UPDATE instrument_configs
SET 
  dimensiones_desempeno = '[
    {
      "id": "dim1_a1",
      "nombre": "PRODUCTIVIDAD Y RESULTADOS INSTITUCIONALES",
      "descripcion": "Evalúa el cumplimiento de metas institucionales, ejecución presupuestaria y resultados del Plan Operativo Anual.",
      "peso": 0.17857,
      "items": [
        {"id": "d1_i1_a1", "texto": "Logra el cumplimiento de las metas establecidas en el Plan Operativo Anual (POA), según los indicadores de ejecución y resultados documentados en los reportes institucionales", "orden": 1},
        {"id": "d1_i2_a1", "texto": "Alcanza niveles óptimos de ejecución presupuestaria municipal (física y financiera), según los reportes del Sistema de Contabilidad Integrada (SICOIN) y los informes de la DAFIM", "orden": 2},
        {"id": "d1_i3_a1", "texto": "Completa los proyectos de inversión municipal priorizados dentro de los plazos establecidos, según los reportes de avance físico y las actas de recepción de obras", "orden": 3},
        {"id": "d1_i4_a1", "texto": "Asegura que las direcciones y unidades municipales cumplan con sus metas operativas establecidas, según los reportes de seguimiento y monitoreo institucional", "orden": 4},
        {"id": "d1_i5_a1", "texto": "Ejecuta oportunamente los acuerdos y resoluciones del Concejo Municipal, según consta en las actas de seguimiento y los informes de cumplimiento de acuerdos", "orden": 5}
      ]
    },
    {
      "id": "dim2_a1",
      "nombre": "CALIDAD DE LA GESTIÓN ADMINISTRATIVA",
      "descripcion": "Evalúa la calidad de la gestión municipal, los servicios públicos y la respuesta a necesidades institucionales.",
      "peso": 0.14286,
      "items": [
        {"id": "d2_i1_a1", "texto": "Los servicios públicos municipales (agua, aseo, alumbrado, mercados, cementerios) funcionan con calidad y continuidad, según las estadísticas de cobertura, reportes operativos y niveles de quejas ciudadanas registradas", "orden": 6},
        {"id": "d2_i2_a1", "texto": "Las obras e inversiones municipales cumplen con las especificaciones técnicas y normativas de calidad establecidas, según los informes de supervisión técnica y las actas de recepción definitiva", "orden": 7},
        {"id": "d2_i3_a1", "texto": "Los procesos administrativos institucionales funcionan con eficiencia y dentro de los plazos legales establecidos, según auditorías de procesos y reportes de tiempos de respuesta", "orden": 8},
        {"id": "d2_i4_a1", "texto": "El tiempo de respuesta a solicitudes administrativas, trámites y requerimientos institucionales cumple con los estándares establecidos, según registros de ventanilla única y sistemas de correspondencia", "orden": 9}
      ]
    },
    {
      "id": "dim3_a1",
      "nombre": "COMPETENCIAS TÉCNICAS Y ADMINISTRATIVAS",
      "descripcion": "Evalúa las competencias técnicas y de gestión pública requeridas para el ejercicio administrativo del cargo.",
      "peso": 0.17857,
      "items": [
        {"id": "d3_i1_a1", "texto": "Demuestra conocimiento técnico de la gestión pública municipal aplicando correctamente la normativa legal vigente (Código Municipal, Ley de Contrataciones, Ley Orgánica del Presupuesto), según verificación en resoluciones, contratos y documentos oficiales emitidos", "orden": 10},
        {"id": "d3_i2_a1", "texto": "Toma decisiones administrativas fundamentadas en análisis técnico y datos objetivos, según la documentación de respaldo de las decisiones y las justificaciones técnicas presentadas", "orden": 11},
        {"id": "d3_i3_a1", "texto": "Propone e implementa políticas, programas y proyectos alineados con los instrumentos de planificación municipal (PDM-OT, PEI, POM), según la coherencia documentada entre propuestas y planes vigentes", "orden": 12},
        {"id": "d3_i4_a1", "texto": "Administra eficientemente los recursos institucionales aplicando principios de control interno, según los resultados de auditorías internas/externas y los informes de fiscalización", "orden": 13},
        {"id": "d3_i5_a1", "texto": "Los documentos administrativos, resoluciones y actos emitidos cumplen con los requisitos legales y técnicos establecidos, según revisiones de asesoría legal y auditorías de cumplimiento", "orden": 14}
      ]
    },
    {
      "id": "dim4_a1",
      "nombre": "CUMPLIMIENTO NORMATIVO Y ÉTICA ADMINISTRATIVA",
      "descripcion": "Evalúa el cumplimiento de normativa, transparencia y conducta ética en el ejercicio administrativo.",
      "peso": 0.14286,
      "items": [
        {"id": "d4_i1_a1", "texto": "Actúa con transparencia en la gestión administrativa, según la publicación oportuna de información en el portal de transparencia, respuestas a solicitudes de acceso a la información y cumplimiento de la Ley de Acceso a la Información Pública", "orden": 15},
        {"id": "d4_i2_a1", "texto": "Cumple con las normativas, reglamentos y procedimientos administrativos establecidos, según verificación de auditorías, informes de control interno y resoluciones de entes fiscalizadores", "orden": 16},
        {"id": "d4_i3_a1", "texto": "Implementa las recomendaciones y acciones correctivas derivadas de auditorías internas y externas, según el seguimiento documentado de planes de acción y reportes de cumplimiento", "orden": 17},
        {"id": "d4_i4_a1", "texto": "Gestiona adecuadamente situaciones administrativas complejas o conflictivas aplicando el debido proceso y el marco legal, según la documentación de casos y las resoluciones emitidas", "orden": 18}
      ]
    },
    {
      "id": "dim5_a1",
      "nombre": "COORDINACIÓN Y DIRECCIÓN ADMINISTRATIVA",
      "descripcion": "Evalúa la efectividad en la coordinación de la estructura administrativa y el trabajo con equipos directivos.",
      "peso": 0.14286,
      "items": [
        {"id": "d5_i1_a1", "texto": "Coordina efectivamente el trabajo de la Gerencia Municipal y los titulares de direcciones, según los reportes de cumplimiento de metas institucionales y la ejecución sincronizada de proyectos transversales", "orden": 19},
        {"id": "d5_i2_a1", "texto": "Facilita la coordinación interinstitucional necesaria para el desarrollo de proyectos municipales, según convenios firmados, actas de coordinación y resultados de proyectos conjuntos documentados", "orden": 20},
        {"id": "d5_i3_a1", "texto": "Gestiona eficazmente alianzas con instituciones públicas, cooperación internacional y sector privado que generan recursos o beneficios para el municipio, según convenios suscritos, recursos gestionados y proyectos ejecutados", "orden": 21},
        {"id": "d5_i4_a1", "texto": "Mantiene canales de comunicación administrativa efectivos con las diferentes unidades municipales, según reportes de flujo de información, tiempos de respuesta institucional y cumplimiento de directrices administrativas", "orden": 22}
      ]
    },
    {
      "id": "dim6_a1",
      "nombre": "DIRECCIÓN ESTRATÉGICA Y FORTALECIMIENTO INSTITUCIONAL",
      "descripcion": "Evalúa la dirección estratégica de la administración municipal y las acciones para fortalecer las capacidades institucionales.",
      "peso": 0.21428,
      "items": [
        {"id": "d6_i1_a1", "texto": "Dirige la administración municipal de manera que los resultados institucionales muestren avance en el cumplimiento del Plan de Desarrollo Municipal (PDM-OT), según los indicadores de seguimiento y evaluación del PDM", "orden": 23},
        {"id": "d6_i2_a1", "texto": "Asegura que las sesiones administrativas de planificación y seguimiento se realicen con regularidad y generen decisiones documentadas, según actas, minutas y seguimiento de acuerdos administrativos", "orden": 24},
        {"id": "d6_i3_a1", "texto": "Implementa mecanismos de rendición de cuentas administrativa (informes periódicos, publicación de resultados, auditorías), según la disponibilidad y calidad de reportes institucionales producidos", "orden": 25},
        {"id": "d6_i4_a1", "texto": "Gestiona recursos externos (transferencias, cooperación, préstamos) para complementar el presupuesto municipal, según montos gestionados, convenios firmados y recursos efectivamente incorporados al presupuesto", "orden": 26},
        {"id": "d6_i5_a1", "texto": "Las decisiones administrativas de largo plazo demuestran consideración del impacto institucional y la sostenibilidad financiera, según análisis de factibilidad documentados y proyecciones fiscales presentadas", "orden": 27},
        {"id": "d6_i6_a1", "texto": "Impulsa procesos de modernización administrativa y fortalecimiento institucional, según proyectos implementados (sistemas informáticos, capacitaciones, mejora de procesos) y resultados medibles obtenidos", "orden": 28}
      ]
    }
  ]'::JSONB,
  dimensiones_potencial = '[
    {
      "id": "pot1_a1",
      "nombre": "POTENCIAL PARA RESPONSABILIDADES ADMINISTRATIVAS DE MAYOR ALCANCE",
      "descripcion": "Evalúa el potencial del Alcalde Municipal para asumir responsabilidades administrativas de mayor complejidad o alcance territorial.",
      "peso": 1.0,
      "items": [
        {"id": "p1_i1_a1", "texto": "Demuestra capacidad técnica para coordinar iniciativas administrativas de mayor alcance territorial (mancomunidades, asociaciones de municipios, proyectos multimunicipal), según proyectos liderados o participación activa documentada", "orden": 29},
        {"id": "p1_i2_a1", "texto": "Posee conocimientos y experiencia técnica que le permitirían asumir roles administrativos de mayor responsabilidad en el ámbito de gobierno local, según formación académica, capacitaciones y trayectoria profesional", "orden": 30},
        {"id": "p1_i3_a1", "texto": "Muestra capacidad de aprendizaje y actualización continua en temas de gestión pública y administración municipal, según participación en capacitaciones, diplomados, seminarios y aplicación de nuevos conocimientos", "orden": 31},
        {"id": "p1_i4_a1", "texto": "Desarrolla e implementa prácticas administrativas innovadoras que mejoran la gestión municipal, según proyectos de innovación ejecutados, sistemas implementados y mejoras documentadas", "orden": 32},
        {"id": "p1_i5_a1", "texto": "Demuestra visión estratégica y capacidad técnica para contribuir a políticas públicas de desarrollo local de mayor alcance, según propuestas presentadas, estudios elaborados o participación en espacios técnicos de formulación de políticas", "orden": 33}
      ]
    }
  ]'::JSONB,
  configuracion_calculo = '{"pesoJefe": 0.55, "pesoAuto": 0.45}'::JSONB,
  updated_at = NOW()
WHERE id = 'A1';

-- ============================================================================
-- 2. INSERTAR INSTRUMENTO O2 CON IDs CORRECTOS
-- ============================================================================

INSERT INTO instrument_configs (
  id,
  nivel,
  dimensiones_desempeno,
  dimensiones_potencial,
  configuracion_calculo,
  activo
) VALUES (
  'O2',
  'O2',
  '[
    {
      "id": "dim1_o2",
      "nombre": "PRODUCTIVIDAD",
      "descripcion": "Evalúa la cantidad de trabajo y aprovechamiento del tiempo en las tareas operativas asignadas.",
      "peso": 0.15385,
      "items": [
        {"id": "d1_i1_o2", "texto": "Completa las tareas que se le asignan dentro de los plazos establecidos", "orden": 1},
        {"id": "d1_i2_o2", "texto": "Realiza la cantidad de trabajo esperada para su puesto durante la jornada", "orden": 2},
        {"id": "d1_i3_o2", "texto": "Aprovecha bien su tiempo de trabajo y evita demoras innecesarias", "orden": 3},
        {"id": "d1_i4_o2", "texto": "Cumple con las metas o programaciones que le corresponden (rutas, recorridos, actividades)", "orden": 4}
      ]
    },
    {
      "id": "dim2_o2",
      "nombre": "CALIDAD",
      "descripcion": "Evalúa la calidad del trabajo realizado, el cumplimiento de estándares y la precisión en las tareas operativas.",
      "peso": 0.15385,
      "items": [
        {"id": "d2_i1_o2", "texto": "Realiza su trabajo con calidad, cumpliendo los estándares técnicos o procedimientos establecidos", "orden": 5},
        {"id": "d2_i2_o2", "texto": "Mantiene orden y limpieza en su área de trabajo, herramientas, equipo o unidad asignada", "orden": 6},
        {"id": "d2_i3_o2", "texto": "Ejecuta las tareas con precisión, evitando errores o necesidad de rehacer el trabajo", "orden": 7},
        {"id": "d2_i4_o2", "texto": "Cuida y da mantenimiento básico a las herramientas, maquinaria o equipo que utiliza", "orden": 8}
      ]
    },
    {
      "id": "dim3_o2",
      "nombre": "COMPETENCIAS LABORALES",
      "descripcion": "Evalúa las habilidades técnicas, conocimientos específicos y capacidad de resolución de problemas en el trabajo operativo.",
      "peso": 0.19231,
      "items": [
        {"id": "d3_i1_o2", "texto": "Conoce y aplica correctamente las técnicas, procedimientos o métodos de trabajo de su puesto", "orden": 9},
        {"id": "d3_i2_o2", "texto": "Maneja adecuadamente las herramientas, maquinaria, equipo o materiales propios de su trabajo", "orden": 10},
        {"id": "d3_i3_o2", "texto": "Identifica y reporta oportunamente problemas o situaciones que requieren atención", "orden": 11},
        {"id": "d3_i4_o2", "texto": "Resuelve problemas operativos básicos de su trabajo sin requerir supervisión constante", "orden": 12},
        {"id": "d3_i5_o2", "texto": "Comprende las instrucciones que recibe y las ejecuta apropiadamente", "orden": 13}
      ]
    },
    {
      "id": "dim4_o2",
      "nombre": "COMPORTAMIENTO ORGANIZACIONAL",
      "descripcion": "Evalúa la disciplina laboral, responsabilidad, cumplimiento de normas y actitud hacia el trabajo.",
      "peso": 0.15385,
      "items": [
        {"id": "d4_i1_o2", "texto": "Es puntual en el ingreso a su jornada y cumple con el horario de trabajo establecido", "orden": 14},
        {"id": "d4_i2_o2", "texto": "Muestra buena actitud hacia el trabajo y disposición para realizar las tareas asignadas", "orden": 15},
        {"id": "d4_i3_o2", "texto": "Actúa con responsabilidad en sus funciones y responde por los resultados de su trabajo", "orden": 16},
        {"id": "d4_i4_o2", "texto": "Respeta las normas, reglamentos y procedimientos establecidos en su área de trabajo", "orden": 17}
      ]
    },
    {
      "id": "dim5_o2",
      "nombre": "RELACIONES INTERPERSONALES",
      "descripcion": "Evalúa la capacidad de trabajar en equipo, comunicarse efectivamente y mantener relaciones laborales positivas.",
      "peso": 0.15385,
      "items": [
        {"id": "d5_i1_o2", "texto": "Trabaja cooperativamente con sus compañeros de cuadrilla o equipo de trabajo", "orden": 18},
        {"id": "d5_i2_o2", "texto": "Se comunica respetuosamente con su supervisor, compañeros y otros empleados municipales", "orden": 19},
        {"id": "d5_i3_o2", "texto": "Atiende con respeto y cortesía a los ciudadanos o usuarios que interactúan con él en su trabajo", "orden": 20},
        {"id": "d5_i4_o2", "texto": "Contribuye a mantener un buen ambiente de trabajo en su cuadrilla o equipo", "orden": 21}
      ]
    },
    {
      "id": "dim6_o2",
      "nombre": "SEGURIDAD Y CUMPLIMIENTO OPERATIVO",
      "descripcion": "Evalúa el cumplimiento de normas de seguridad, uso apropiado de equipo de protección y conducta laboral responsable.",
      "peso": 0.19231,
      "items": [
        {"id": "d6_i1_o2", "texto": "Utiliza correctamente el equipo de protección personal (EPP) asignado para su trabajo", "orden": 22},
        {"id": "d6_i2_o2", "texto": "Cumple con las normas y procedimientos de seguridad ocupacional establecidos", "orden": 23},
        {"id": "d6_i3_o2", "texto": "Reporta accidentes, incidentes o condiciones inseguras que identifica en su trabajo", "orden": 24},
        {"id": "d6_i4_o2", "texto": "Mantiene conducta apropiada durante la jornada laboral (no se presenta bajo efectos de alcohol o drogas)", "orden": 25},
        {"id": "d6_i5_o2", "texto": "Cuida los recursos municipales asignados (vehículo, herramientas, materiales) y evita su uso indebido", "orden": 26}
      ]
    }
  ]'::JSONB,
  '[
    {
      "id": "pot1_o2",
      "nombre": "POTENCIAL PARA DESARROLLO",
      "descripcion": "Evalúa las capacidades de aprendizaje, adaptabilidad y posibilidades de crecimiento del colaborador operativo.",
      "peso": 1.0,
      "items": [
        {"id": "p1_i1_o2", "texto": "Aprende nuevas tareas rápidamente y busca mejorar sus formas de trabajar", "orden": 27},
        {"id": "p1_i2_o2", "texto": "Muestra interés en capacitarse y desarrollar nuevas habilidades para su trabajo", "orden": 28},
        {"id": "p1_i3_o2", "texto": "Se adapta bien a cambios en procedimientos, herramientas o métodos de trabajo", "orden": 29},
        {"id": "p1_i4_o2", "texto": "Toma iniciativa para apoyar en tareas adicionales o colaborar más allá de lo mínimo requerido", "orden": 30},
        {"id": "p1_i5_o2", "texto": "Tiene potencial para asumir mayores responsabilidades o un rol de coordinación en su área", "orden": 31}
      ]
    }
  ]'::JSONB,
  '{"pesoJefe": 0.7, "pesoAuto": 0.3}'::JSONB,
  true
)
ON CONFLICT (id) DO UPDATE SET
  nivel = EXCLUDED.nivel,
  dimensiones_desempeno = EXCLUDED.dimensiones_desempeno,
  dimensiones_potencial = EXCLUDED.dimensiones_potencial,
  configuracion_calculo = EXCLUDED.configuracion_calculo,
  activo = EXCLUDED.activo,
  updated_at = NOW();

-- Comentario final
COMMENT ON TABLE instrument_configs IS 'Configuraciones de instrumentos de evaluación con sus dimensiones y reglas de cálculo. A1 usa pesos 55/45 (Alta Dirección), A3 y O2 usan 70/30 estándar.';

