
-- Insertar configuración del instrumento A3 en la base de datos
-- Este instrumento está diseñado específicamente para el nivel administrativo A3

INSERT INTO instrument_configs (
  id,
  nivel,
  dimensiones_desempeno,
  dimensiones_potencial,
  configuracion_calculo,
  activo
)
VALUES (
  'A3',
  'A3',
  '[
    {
      "id": "dim1_a3",
      "nombre": "PRODUCTIVIDAD Y CUMPLIMIENTO DE OBJETIVOS",
      "descripcion": "Esta dimensión evalúa la capacidad del colaborador para alcanzar los objetivos asignados, cumplir plazos y optimizar el uso de recursos en sus funciones administrativas.",
      "peso": 0.20,
      "items": [
        {"id": "d1_i1_a3", "texto": "Completa las tareas administrativas asignadas (gestión de agenda, correspondencia, elaboración de oficios/memorandos, archivo, trámites, reportes) dentro de los plazos establecidos", "orden": 1},
        {"id": "d1_i2_a3", "texto": "Maneja eficientemente varias tareas al mismo tiempo, priorizando apropiadamente según urgencia e importancia, sin que la calidad del trabajo se vea afectada", "orden": 2},
        {"id": "d1_i3_a3", "texto": "Utiliza productivamente los recursos disponibles (tiempo de trabajo, herramientas tecnológicas, materiales de oficina, sistemas municipales) evitando desperdicios o uso inadecuado", "orden": 3},
        {"id": "d1_i4_a3", "texto": "Mantiene un ritmo de trabajo apropiado que le permite completar el volumen de tareas esperado para su puesto, sin requerir supervisión constante sobre su productividad", "orden": 4}
      ]
    },
    {
      "id": "dim2_a3",
      "nombre": "CALIDAD DEL TRABAJO",
      "descripcion": "Esta dimensión evalúa la precisión, presentación profesional, cumplimiento de estándares normativos y orientación a la mejora en el trabajo realizado.",
      "peso": 0.20,
      "items": [
        {"id": "d2_i1_a3", "texto": "Produce documentos administrativos (oficios, memorandos, actas, reportes, listados) sin errores significativos de contenido, ortografía o formato que requieran corrección", "orden": 5},
        {"id": "d2_i2_a3", "texto": "Mantiene orden en su área de trabajo, archivos físicos y digitales. Los documentos que genera tienen presentación profesional apropiada para representar a la institución", "orden": 6},
        {"id": "d2_i3_a3", "texto": "Conoce y aplica correctamente los procedimientos administrativos establecidos, normativa municipal relevante y lineamientos del Sistema de Control Interno (Acuerdo A-039-2023) en su trabajo", "orden": 7},
        {"id": "d2_i4_a3", "texto": "Se adapta positivamente a cambios en procedimientos, sistemas o metodologías. Propone mejoras viables cuando identifica oportunidades de eficiencia en procesos de su área", "orden": 8}
      ]
    },
    {
      "id": "dim3_a3",
      "nombre": "COMPETENCIAS LABORALES (TÉCNICAS Y ESPECÍFICAS)",
      "descripcion": "Esta dimensión evalúa el dominio de conocimientos, habilidades y técnicas específicas requeridas para el desempeño efectivo del puesto administrativo.",
      "peso": 0.20,
      "items": [
        {"id": "d3_i1_a3", "texto": "Domina los sistemas informáticos municipales, procedimientos administrativos y normativa específica de su área de trabajo necesarios para ejecutar sus funciones", "orden": 9},
        {"id": "d3_i2_a3", "texto": "Clasifica, organiza, resguarda y mantiene actualizado el archivo (físico y digital) de su área de forma ordenada, accesible y conforme a lineamientos institucionales", "orden": 10},
        {"id": "d3_i3_a3", "texto": "Redacta documentos administrativos (oficios, memorandos, actas, informes) de forma clara, coherente, profesional y con el formato institucional apropiado", "orden": 11},
        {"id": "d3_i4_a3", "texto": "Maneja competentemente las herramientas ofimáticas (Word, Excel, correo electrónico, plataformas digitales) y sistemas municipales requeridos para su puesto", "orden": 12},
        {"id": "d3_i5_a3", "texto": "Toma decisiones operativas apropiadas dentro de su ámbito de responsabilidad, resuelve situaciones administrativas rutinarias sin requerir supervisión constante y consulta oportunamente casos complejos", "orden": 13}
      ]
    },
    {
      "id": "dim4_a3",
      "nombre": "COMPORTAMIENTO ORGANIZACIONAL Y ACTITUD LABORAL",
      "descripcion": "Esta dimensión evalúa la conducta laboral, responsabilidad, valores éticos y adherencia a las normas institucionales.",
      "peso": 0.15,
      "items": [
        {"id": "d4_i1_a3", "texto": "Es puntual en el ingreso a su jornada laboral, mantiene buena asistencia y muestra disponibilidad cuando el servicio requiere permanencia o apoyo fuera del horario habitual", "orden": 14},
        {"id": "d4_i2_a3", "texto": "Actúa con responsabilidad en sus funciones, cumple los compromisos adquiridos, cuida los bienes municipales asignados y responde por los resultados de su trabajo", "orden": 15},
        {"id": "d4_i3_a3", "texto": "Demuestra conducta ética e integridad en el ejercicio de sus funciones, maneja con probidad la información institucional y respeta la confidencialidad de documentos sensibles", "orden": 16},
        {"id": "d4_i4_a3", "texto": "Se identifica con la misión y objetivos de la municipalidad, contribuye positivamente al logro de metas institucionales desde su puesto y actúa alineado con los valores municipales", "orden": 17}
      ]
    },
    {
      "id": "dim5_a3",
      "nombre": "RELACIONES INTERPERSONALES Y TRABAJO EN EQUIPO",
      "descripcion": "Esta dimensión evalúa la capacidad de comunicarse efectivamente, colaborar con otros y mantener relaciones profesionales constructivas.",
      "peso": 0.10,
      "items": [
        {"id": "d5_i1_a3", "texto": "Se comunica oralmente de forma clara, respetuosa y efectiva con su jefe inmediato, compañeros de trabajo y usuarios (internos o externos) que atiende", "orden": 18},
        {"id": "d5_i2_a3", "texto": "Colabora efectivamente con compañeros de su área y otras unidades, comparte información necesaria oportunamente y apoya en tareas que requieren trabajo conjunto", "orden": 19},
        {"id": "d5_i3_a3", "texto": "Mantiene relaciones respetuosas incluso en situaciones de presión o desacuerdo, maneja conflictos o tensiones de manera profesional y contribuye a un clima laboral positivo", "orden": 20}
      ]
    },
    {
      "id": "dim6_a3",
      "nombre": "ORIENTACIÓN AL SERVICIO Y ATENCIÓN AL USUARIO",
      "descripcion": "Esta dimensión evalúa la actitud de servicio, calidad de atención y efectividad en la respuesta a usuarios internos (directores, jefes, compañeros) y/o externos (ciudadanos, instituciones).",
      "peso": 0.15,
      "items": [
        {"id": "d6_i1_a3", "texto": "Atiende a los usuarios (jefe inmediato, compañeros, ciudadanos, instituciones) con respeto, empatía, cortesía y actitud de servicio, proyectando buena imagen institucional", "orden": 21},
        {"id": "d6_i2_a3", "texto": "Resuelve apropiadamente las solicitudes dentro de su competencia o canaliza efectivamente con la persona/área correcta. Brinda información precisa y orientación útil", "orden": 22},
        {"id": "d6_i3_a3", "texto": "Da seguimiento a las gestiones administrativas bajo su responsabilidad hasta lograr su cierre o resolución, manteniendo informados a los interesados sobre avances", "orden": 23}
      ]
    }
  ]'::jsonb,
  '[
    {
      "id": "pot1_a3",
      "nombre": "CAPACIDADES COGNITIVAS",
      "descripcion": "Evalúa la capacidad de aprendizaje, pensamiento analítico y adaptabilidad cognitiva del colaborador.",
      "peso": 0.3333,
      "items": [
        {"id": "p1_i1_a3", "texto": "Aprende con facilidad nuevos sistemas, procedimientos o metodologías de trabajo. Requiere pocas repeticiones para dominar tareas nuevas", "orden": 24},
        {"id": "p1_i2_a3", "texto": "Analiza situaciones, identifica causas raíz de problemas administrativos y comprende relaciones entre diferentes elementos de su trabajo", "orden": 25},
        {"id": "p1_i3_a3", "texto": "Se adapta efectivamente a cambios tecnológicos, metodológicos o de procedimientos, incorporando nuevas formas de trabajo sin resistencia", "orden": 26},
        {"id": "p1_i4_a3", "texto": "Transfiere conocimientos y experiencias previas a situaciones nuevas o no rutinarias, encontrando soluciones sin necesidad de instrucciones detalladas", "orden": 27}
      ]
    },
    {
      "id": "pot2_a3",
      "nombre": "COMPETENCIAS DE LIDERAZGO EMERGENTE",
      "descripcion": "Evalúa el potencial de liderazgo, influencia positiva y visión institucional del colaborador.",
      "peso": 0.3333,
      "items": [
        {"id": "p2_i1_a3", "texto": "Influye positivamente en compañeros aunque no tenga personal a cargo. Es referente al que otros acuden por orientación. Toma iniciativa en proyectos o mejoras", "orden": 28},
        {"id": "p2_i2_a3", "texto": "Comprende cómo su trabajo contribuye a objetivos mayores de la municipalidad. Se interesa por temas institucionales más allá de sus tareas inmediatas", "orden": 29},
        {"id": "p2_i3_a3", "texto": "Propone mejoras, identifica oportunidades y toma iniciativa para implementar cambios positivos sin esperar que se lo soliciten", "orden": 30}
      ]
    },
    {
      "id": "pot3_a3",
      "nombre": "MOTIVACIÓN Y COMPROMISO CON EL DESARROLLO",
      "descripcion": "Evalúa la ambición profesional constructiva, aprovechamiento de capacitaciones y búsqueda activa de retroalimentación.",
      "peso": 0.3334,
      "items": [
        {"id": "p3_i1_a3", "texto": "Muestra interés genuino en su desarrollo profesional y tiene aspiraciones claras de crecimiento dentro de la carrera administrativa municipal", "orden": 31},
        {"id": "p3_i2_a3", "texto": "Participa activamente en capacitaciones cuando se ofrecen, aprovecha el aprendizaje y aplica lo aprendido en su trabajo", "orden": 32},
        {"id": "p3_i3_a3", "texto": "Busca feedback de su jefe y compañeros para mejorar, acepta la crítica constructiva positivamente y actúa sobre las sugerencias recibidas", "orden": 33}
      ]
    }
  ]'::jsonb,
  '{"pesoAuto": 0.3, "pesoJefe": 0.7}'::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE SET
  dimensiones_desempeno = EXCLUDED.dimensiones_desempeno,
  dimensiones_potencial = EXCLUDED.dimensiones_potencial,
  activo = EXCLUDED.activo,
  updated_at = NOW();
