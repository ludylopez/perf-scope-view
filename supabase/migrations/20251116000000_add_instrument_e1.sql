-- Migración: Agregar Instrumento E1 (ENCARGADOS Y JEFES DE UNIDADES I)
-- Fecha: 2025-11-16
-- Descripción: Inserta la configuración del instrumento de evaluación para nivel E1

INSERT INTO instrument_configs (
  id,
  nivel,
  dimensiones_desempeno,
  dimensiones_potencial,
  configuracion_calculo,
  activo
) VALUES (
  'E1',
  'E1',
  '[
    {
      "id": "dim1_e1",
      "nombre": "PRODUCTIVIDAD",
      "descripcion": "Grado en que el/la colaborador/a cumple con las metas, objetivos y cantidad de trabajo esperado en su área, utilizando eficientemente los recursos y cumpliendo con plazos establecidos.",
      "peso": 0.17241,
      "items": [
        {"id": "d1_i1_e1", "texto": "Cumple con las metas y objetivos establecidos en el Plan Operativo Anual (POA) de su área", "orden": 1},
        {"id": "d1_i2_e1", "texto": "Entrega informes, reportes y documentación requerida dentro de los plazos establecidos", "orden": 2},
        {"id": "d1_i3_e1", "texto": "Responde de manera oportuna a las solicitudes, emergencias o incidencias de su área", "orden": 3},
        {"id": "d1_i4_e1", "texto": "Utiliza de manera eficiente los recursos (personal, materiales, equipos, presupuesto) asignados a su área", "orden": 4},
        {"id": "d1_i5_e1", "texto": "La cantidad de trabajo realizado por su área cumple con lo esperado para el período evaluado", "orden": 5}
      ]
    },
    {
      "id": "dim2_e1",
      "nombre": "CALIDAD",
      "descripcion": "Nivel de exactitud, precisión y cumplimiento de estándares técnicos y normativos en el trabajo realizado por el área a su cargo.",
      "peso": 0.13793,
      "items": [
        {"id": "d2_i1_e1", "texto": "El trabajo realizado por su área cumple con los estándares de calidad y especificaciones técnicas requeridas", "orden": 6},
        {"id": "d2_i2_e1", "texto": "Aplica correctamente la normativa, reglamentos y procedimientos correspondientes a su área", "orden": 7},
        {"id": "d2_i3_e1", "texto": "Los informes, documentos y registros que elabora o supervisa son precisos, completos y confiables", "orden": 8},
        {"id": "d2_i4_e1", "texto": "Las decisiones técnicas que toma en su área son acertadas y están bien fundamentadas", "orden": 9}
      ]
    },
    {
      "id": "dim3_e1",
      "nombre": "COMPETENCIAS LABORALES",
      "descripcion": "Conjunto de conocimientos, habilidades técnicas y gerenciales necesarias para ejercer efectivamente el puesto de Jefe o Encargado de Unidad.",
      "peso": 0.20690,
      "items": [
        {"id": "d3_i1_e1", "texto": "Demuestra dominio de los conocimientos técnicos especializados requeridos para su puesto", "orden": 10},
        {"id": "d3_i2_e1", "texto": "Aplica criterio profesional apropiado para analizar situaciones complejas y tomar decisiones en su área", "orden": 11},
        {"id": "d3_i3_e1", "texto": "Planifica y organiza de manera efectiva las actividades, recursos y prioridades de su área", "orden": 12},
        {"id": "d3_i4_e1", "texto": "Coordina exitosamente con otras unidades municipales e instituciones externas relevantes para su trabajo", "orden": 13},
        {"id": "d3_i5_e1", "texto": "Maneja adecuadamente los sistemas informáticos, plataformas y herramientas tecnológicas necesarias para su trabajo", "orden": 14},
        {"id": "d3_i6_e1", "texto": "Se mantiene actualizado/a en los conocimientos, normativa y mejores prácticas relevantes para su área", "orden": 15}
      ]
    },
    {
      "id": "dim4_e1",
      "nombre": "COMPORTAMIENTO ORGANIZACIONAL",
      "descripcion": "Grado en que el/la colaborador/a demuestra valores institucionales, ética profesional, disciplina y actúa como modelo a seguir para su equipo.",
      "peso": 0.13793,
      "items": [
        {"id": "d4_i1_e1", "texto": "Cumple con el horario de trabajo establecido y está disponible cuando su área lo requiere", "orden": 16},
        {"id": "d4_i2_e1", "texto": "Actúa con integridad, ética profesional y transparencia en todas sus actuaciones", "orden": 17},
        {"id": "d4_i3_e1", "texto": "Mantiene la confidencialidad de información sensible y cumple con protocolos de seguridad de datos", "orden": 18},
        {"id": "d4_i4_e1", "texto": "Es un modelo a seguir para su equipo en cuanto a disciplina, orden y cumplimiento de políticas institucionales", "orden": 19}
      ]
    },
    {
      "id": "dim5_e1",
      "nombre": "RELACIONES INTERPERSONALES",
      "descripcion": "Capacidad para establecer y mantener relaciones de trabajo efectivas, comunicarse claramente y colaborar con diversos actores internos y externos.",
      "peso": 0.13793,
      "items": [
        {"id": "d5_i1_e1", "texto": "Se comunica de manera clara, respetuosa y efectiva con colaboradores, superiores y ciudadanos", "orden": 20},
        {"id": "d5_i2_e1", "texto": "Colabora de manera efectiva con otras áreas y unidades municipales para lograr objetivos comunes", "orden": 21},
        {"id": "d5_i3_e1", "texto": "Mantiene relaciones profesionales positivas con instituciones externas y actores clave relevantes para su trabajo", "orden": 22},
        {"id": "d5_i4_e1", "texto": "Maneja conflictos y situaciones tensas de manera constructiva, profesional y respetuosa", "orden": 23}
      ]
    },
    {
      "id": "dim6_e1",
      "nombre": "LIDERAZGO Y GESTIÓN DE EQUIPOS",
      "descripcion": "Capacidad para dirigir, motivar, desarrollar y coordinar efectivamente al equipo de trabajo para el logro de objetivos, promoviendo un ambiente laboral positivo.",
      "peso": 0.20690,
      "items": [
        {"id": "d6_i1_e1", "texto": "Asigna tareas y responsabilidades de manera clara, equitativa y apropiada a las capacidades de su equipo", "orden": 24},
        {"id": "d6_i2_e1", "texto": "Realiza seguimiento regular del trabajo de sus colaboradores y proporciona retroalimentación constructiva y oportuna", "orden": 25},
        {"id": "d6_i3_e1", "texto": "Verifica que el trabajo de su equipo cumpla con los estándares de calidad, procedimientos y plazos establecidos", "orden": 26},
        {"id": "d6_i4_e1", "texto": "Identifica necesidades de capacitación de su equipo y promueve activamente su desarrollo profesional", "orden": 27},
        {"id": "d6_i5_e1", "texto": "Delega apropiadamente, empodera a su equipo con autonomía adecuada y evita la microgestión", "orden": 28},
        {"id": "d6_i6_e1", "texto": "Mantiene al equipo motivado, maneja conflictos de manera constructiva y fomenta un clima laboral positivo", "orden": 29}
      ]
    }
  ]'::JSONB,
  '[
    {
      "id": "pot_dim1_e1",
      "nombre": "CAPACIDAD DE LIDERAZGO AMPLIADO",
      "descripcion": "Evalúa si el/la colaborador/a puede liderar equipos más grandes o gestionar múltiples unidades.",
      "peso": 0.25,
      "items": [
        {"id": "pot_d1_i1_e1", "texto": "Demuestra capacidad para liderar equipos más grandes o gestionar múltiples unidades simultáneamente", "orden": 1},
        {"id": "pot_d1_i2_e1", "texto": "Ha desarrollado líderes dentro de su equipo (colaboradores bajo su cargo han crecido profesionalmente o sido promovidos)", "orden": 2}
      ]
    },
    {
      "id": "pot_dim2_e1",
      "nombre": "VISIÓN ESTRATÉGICA",
      "descripcion": "Evalúa si el/la colaborador/a puede pensar más allá de lo operativo hacia lo estratégico institucional.",
      "peso": 0.25,
      "items": [
        {"id": "pot_d2_i1_e1", "texto": "Comprende cómo su área contribuye a los objetivos estratégicos institucionales y propone mejoras con visión de largo plazo", "orden": 3},
        {"id": "pot_d2_i2_e1", "texto": "Anticipa tendencias, riesgos u oportunidades que podrían afectar a la municipalidad y propone soluciones de manera proactiva", "orden": 4}
      ]
    },
    {
      "id": "pot_dim3_e1",
      "nombre": "CAPACIDAD DE GESTIÓN COMPLEJA",
      "descripcion": "Evalúa si el/la colaborador/a puede manejar mayor complejidad presupuestaria, normativa y política.",
      "peso": 0.25,
      "items": [
        {"id": "pot_d3_i1_e1", "texto": "Demuestra capacidad para manejar presupuestos más grandes, proyectos de mayor envergadura o múltiples áreas de responsabilidad", "orden": 5},
        {"id": "pot_d3_i2_e1", "texto": "Maneja de manera efectiva situaciones políticamente sensibles, negociaciones complejas y coordinación con altos funcionarios", "orden": 6}
      ]
    },
    {
      "id": "pot_dim4_e1",
      "nombre": "DISPOSICIÓN Y COMPROMISO",
      "descripcion": "Evalúa el interés y preparación del/la colaborador/a para asumir mayores responsabilidades.",
      "peso": 0.25,
      "items": [
        {"id": "pot_d4_i1_e1", "texto": "Muestra interés activo en asumir mayores responsabilidades y busca oportunidades de contribuir más allá de su puesto actual", "orden": 7},
        {"id": "pot_d4_i2_e1", "texto": "Está dispuesto/a y preparado/a para asumir un puesto de nivel directivo (D2 o D1) si se le ofreciera en el corto o mediano plazo", "orden": 8}
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
COMMENT ON TABLE instrument_configs IS 'Configuraciones de instrumentos de evaluación con sus dimensiones y reglas de cálculo. A1 usa pesos 55/45 (Alta Dirección), A3, O2 y E1 usan 70/30 estándar.';

