-- Migración: Agregar Instrumento D1 (GERENTE - DIRECCIONES I)
-- Fecha: 2025-11-23
-- Descripción: Inserta la configuración del instrumento de evaluación para nivel D1
-- NOTA: La dimensión 3 contiene items condicionales que se filtran según el cargo del usuario

INSERT INTO instrument_configs (
  id,
  nivel,
  dimensiones_desempeno,
  dimensiones_potencial,
  configuracion_calculo,
  activo
) VALUES (
  'D1',
  'D1',
  '[
    {
      "id": "dim1_d1",
      "nombre": "PRODUCTIVIDAD ESTRATÉGICA",
      "descripcion": "Capacidad para cumplir eficientemente las metas estratégicas de la dirección, ejecutar planes institucionales y lograr resultados oportunos.",
      "peso": 0.15385,
      "items": [
        {"id": "d1_i1_d1", "texto": "Cumple las metas y objetivos establecidos en el Plan Estratégico Institucional (PEI), Plan Operativo Multianual (POM) y Plan Operativo Anual (POA) para su dirección.", "orden": 1},
        {"id": "d1_i2_d1", "texto": "Ejecuta eficientemente el presupuesto y los recursos asignados a su área, optimizando su uso para alcanzar los resultados esperados.", "orden": 2},
        {"id": "d1_i3_d1", "texto": "Cumple oportunamente con los compromisos, plazos y entregables adquiridos ante el Alcalde Municipal y el Concejo Municipal.", "orden": 3},
        {"id": "d1_i4_d1", "texto": "Logra los resultados institucionales esperados de su dirección, contribuyendo efectivamente al cumplimiento de los objetivos municipales.", "orden": 4}
      ]
    },
    {
      "id": "dim2_d1",
      "nombre": "CALIDAD DE GESTIÓN DIRECTIVA",
      "descripcion": "Garantizar que los productos, servicios, informes y procesos de la dirección cumplan con estándares técnicos, normativos y de control interno, con precisión y confiabilidad.",
      "peso": 0.15385,
      "items": [
        {"id": "d2_i1_d1", "texto": "Garantiza que los informes, documentos y productos generados por su dirección sean técnicamente sólidos y de alta calidad.", "orden": 5},
        {"id": "d2_i2_d1", "texto": "Asegura que los procesos de su área cumplan con los estándares de control interno establecidos en el Acuerdo A-039-2023 y normativa aplicable.", "orden": 6},
        {"id": "d2_i3_d1", "texto": "Supervisa que la información generada por su dirección sea precisa, confiable y esté debidamente respaldada.", "orden": 7},
        {"id": "d2_i4_d1", "texto": "Atiende oportunamente los hallazgos de auditorías internas y externas, implementando las acciones correctivas necesarias.", "orden": 8}
      ]
    },
    {
      "id": "dim3_d1",
      "nombre": "COMPETENCIAS DIRECTIVAS",
      "descripcion": "Dominio de conocimientos técnicos, habilidades de gestión pública municipal y competencias estratégicas necesarias para dirigir efectivamente su área de responsabilidad.",
      "peso": 0.19231,
      "items": [
        {"id": "d3_i1_d1", "texto": "Demuestra dominio técnico de la gestión pública municipal, aplicando correctamente la normativa y procedimientos aplicables a su área.", "orden": 9},
        {"id": "d3_i2_d1", "texto": "Utiliza efectivamente las herramientas de planificación estratégica y operativa (PEI, POM, POA) para dirigir su área.", "orden": 10},
        {"id": "d3_i3_d1", "texto": "Toma decisiones técnicamente fundamentadas basándose en análisis riguroso de información, normativa y contexto institucional.", "orden": 11},
        {"id": "d3_i4a_d1", "texto": "Gestiona integradamente las múltiples direcciones municipales, articulando sus esfuerzos hacia objetivos comunes.", "orden": 12},
        {"id": "d3_i5a_d1", "texto": "Utiliza sistemas de seguimiento y monitoreo (SICOIN, tableros de control) para dirigir la gestión institucional.", "orden": 13},
        {"id": "d3_i4b_d1", "texto": "Conduce procesos de juzgamiento administrativo aplicando correctamente el debido proceso y fundamentación legal.", "orden": 12},
        {"id": "d3_i5b_d1", "texto": "Emite resoluciones administrativas debidamente fundamentadas en derecho, con claridad jurídica y proporcionalidad.", "orden": 13},
        {"id": "d3_i4c_d1", "texto": "Gestiona integralmente los subsistemas de recursos humanos (reclutamiento, capacitación, evaluación, compensación).", "orden": 12},
        {"id": "d3_i5c_d1", "texto": "Implementa sistemas de evaluación del desempeño y desarrollo del talento humano basados en competencias.", "orden": 13},
        {"id": "d3_i4d_d1", "texto": "Formula proyectos de inversión conforme metodología SNIP y lineamientos de SEGEPLAN con calidad técnica.", "orden": 12},
        {"id": "d3_i5d_d1", "texto": "Gestiona efectivamente la participación ciudadana (COMUDE/COCODE) en procesos de planificación municipal.", "orden": 13},
        {"id": "d3_i4e_d1", "texto": "Dirige la gestión financiera y presupuestaria municipal en SICOIN GL/SIAF-Muni garantizando cumplimiento normativo.", "orden": 12},
        {"id": "d3_i5e_d1", "texto": "Analiza estados financieros y elabora informes de ejecución presupuestaria con rigurosidad técnica.", "orden": 13},
        {"id": "d3_i4f_d1", "texto": "Transversaliza el enfoque de género en políticas, planes y proyectos municipales con fundamento técnico.", "orden": 12},
        {"id": "d3_i5f_d1", "texto": "Coordina efectivamente acciones de prevención y atención de violencia contra las mujeres con instancias competentes.", "orden": 13}
      ]
    },
    {
      "id": "dim4_d1",
      "nombre": "LIDERAZGO ÉTICO Y CULTURA ORGANIZACIONAL",
      "descripcion": "Actuar con probidad, transparencia e integridad en el ejercicio del cargo, promoviendo una cultura de ética, legalidad y valores institucionales.",
      "peso": 0.15385,
      "items": [
        {"id": "d4_i1_d1", "texto": "Actúa con probidad, transparencia e integridad en todas las decisiones y acciones relacionadas con su cargo.", "orden": 14},
        {"id": "d4_i2_d1", "texto": "Gestiona los recursos municipales con transparencia, rindiendo cuentas de manera clara y oportuna.", "orden": 15},
        {"id": "d4_i3_d1", "texto": "Garantiza el apego a la legalidad y al marco normativo municipal en todas las actuaciones de su dirección.", "orden": 16},
        {"id": "d4_i4_d1", "texto": "Promueve activamente una cultura de ética, valores institucionales y cumplimiento normativo en su equipo de trabajo.", "orden": 17}
      ]
    },
    {
      "id": "dim5_d1",
      "nombre": "COORDINACIÓN INSTITUCIONAL ESTRATÉGICA",
      "descripcion": "Establecer y mantener relaciones efectivas de coordinación con otras direcciones municipales y actores externos, representando profesionalmente a la institución y construyendo alianzas estratégicas.",
      "peso": 0.15385,
      "items": [
        {"id": "d5_i1_d1", "texto": "Coordina efectivamente con otras direcciones y unidades municipales para lograr objetivos institucionales comunes.", "orden": 18},
        {"id": "d5_i2_d1", "texto": "Representa profesional y dignamente a la municipalidad ante instituciones públicas, privadas y la ciudadanía.", "orden": 19},
        {"id": "d5_i3_d1", "texto": "Se comunica de forma clara, oportuna y estratégica con actores clave internos y externos a la municipalidad.", "orden": 20},
        {"id": "d5_i4_d1", "texto": "Construye alianzas estratégicas y facilita consensos con diversos actores para beneficio institucional.", "orden": 21}
      ]
    },
    {
      "id": "dim6_d1",
      "nombre": "LIDERAZGO Y GESTIÓN DE EQUIPOS",
      "descripcion": "Dirigir, motivar y desarrollar al equipo de trabajo de la dirección hacia el logro de objetivos, asignando efectivamente funciones, proporcionando retroalimentación y promoviendo un clima laboral positivo.",
      "peso": 0.19231,
      "items": [
        {"id": "d6_i1_d1", "texto": "Dirige efectivamente a su equipo de trabajo hacia el cumplimiento de los objetivos y metas de la dirección.", "orden": 22},
        {"id": "d6_i2_d1", "texto": "Desarrolla las capacidades y el talento del personal de su dirección mediante capacitación, coaching o asignación de retos.", "orden": 23},
        {"id": "d6_i3_d1", "texto": "Asigna funciones, tareas y recursos de manera efectiva según las competencias y fortalezas de cada miembro del equipo.", "orden": 24},
        {"id": "d6_i4_d1", "texto": "Proporciona retroalimentación constructiva, oportuna y específica que contribuye al desarrollo del personal.", "orden": 25},
        {"id": "d6_i5_d1", "texto": "Promueve un clima laboral positivo que favorece el alto desempeño, la colaboración y el compromiso del equipo.", "orden": 26}
      ]
    }
  ]'::JSONB,
  '[
    {
      "id": "pot_dim1_d1",
      "nombre": "CAPACIDAD DE APRENDIZAJE Y ADAPTACIÓN",
      "descripcion": "Aprende rápidamente de experiencias, se adapta efectivamente a contextos cambiantes y busca activamente su desarrollo profesional.",
      "peso": 0.25,
      "items": [
        {"id": "pot_d1_i1_d1", "texto": "Aprende rápidamente nuevos conocimientos, herramientas o metodologías y los aplica efectivamente en su trabajo.", "orden": 27},
        {"id": "pot_d1_i2_d1", "texto": "Se adapta efectivamente a cambios organizacionales, nuevas directrices o situaciones imprevistas, manteniendo su efectividad.", "orden": 28}
      ]
    },
    {
      "id": "pot_dim2_d1",
      "nombre": "VISIÓN ESTRATÉGICA AMPLIADA",
      "descripcion": "Piensa más allá de su área de responsabilidad, visualiza oportunidades institucionales y comprende el contexto político-social amplio.",
      "peso": 0.25,
      "items": [
        {"id": "pot_d2_i1_d1", "texto": "Demuestra una visión que trasciende su dirección, considerando el impacto institucional amplio de sus propuestas y decisiones.", "orden": 29},
        {"id": "pot_d2_i2_d1", "texto": "Comprende y considera el contexto político, social y económico más amplio en sus análisis y recomendaciones.", "orden": 30}
      ]
    },
    {
      "id": "pot_dim3_d1",
      "nombre": "INFLUENCIA Y LIDERAZGO AMPLIADO",
      "descripcion": "Influye positivamente más allá de su área de autoridad formal, lidera iniciativas transversales e inspira a otros fuera de su equipo directo.",
      "peso": 0.125,
      "items": [
        {"id": "pot_d3_i1_d1", "texto": "Ejerce influencia positiva y lidera iniciativas más allá de su área de responsabilidad formal, siendo reconocido por otros.", "orden": 31}
      ]
    },
    {
      "id": "pot_dim4_d1",
      "nombre": "CAPACIDAD DE GESTIÓN DE COMPLEJIDAD",
      "descripcion": "Maneja simultáneamente múltiples prioridades, toma decisiones en contextos ambiguos e integra perspectivas diversas.",
      "peso": 0.125,
      "items": [
        {"id": "pot_d4_i1_d1", "texto": "Gestiona efectivamente múltiples prioridades y situaciones complejas simultáneamente, manteniendo claridad estratégica.", "orden": 32}
      ]
    },
    {
      "id": "pot_dim5_d1",
      "nombre": "ORIENTACIÓN AL CRECIMIENTO INSTITUCIONAL",
      "descripcion": "Propone mejoras e innovaciones, piensa en el largo plazo institucional y prioriza el bien común sobre logros individuales.",
      "peso": 0.125,
      "items": [
        {"id": "pot_d5_i1_d1", "texto": "Propone activamente mejoras, innovaciones o soluciones orientadas al crecimiento y fortalecimiento institucional de largo plazo.", "orden": 33}
      ]
    },
    {
      "id": "pot_dim6_d1",
      "nombre": "RESILIENCIA EXCEPCIONAL",
      "descripcion": "Mantiene alto desempeño en contextos adversos, con recuperación rápida de contratiempos y energía sostenida en ciclos exigentes.",
      "peso": 0.125,
      "items": [
        {"id": "pot_d6_i1_d1", "texto": "Mantiene un alto nivel de desempeño incluso en contextos de alta presión, adversidad o crisis institucional.", "orden": 34}
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

