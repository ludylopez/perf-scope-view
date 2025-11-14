-- Migración: Agregar Instrumento A4 (ADMINISTRATIVOS II)
-- Fecha: 2025-11-20
-- Descripción: Inserta la configuración del instrumento de evaluación para nivel A4

INSERT INTO instrument_configs (
  id,
  nivel,
  dimensiones_desempeno,
  dimensiones_potencial,
  configuracion_calculo,
  activo
) VALUES (
  'A4',
  'A4',
  '[
    {
      "id": "dim1_a4",
      "nombre": "PRODUCTIVIDAD",
      "descripcion": "Cumplimiento oportuno de las tareas administrativas y operativas asignadas, manteniendo un volumen de trabajo adecuado y dando seguimiento efectivo a compromisos y pendientes.",
      "peso": 0.16667,
      "items": [
        {"id": "d1_i1_a4", "texto": "Completa las tareas administrativas asignadas (registro de documentos, elaboración de reportes, actualización de bases de datos) dentro de los plazos establecidos.", "orden": 1},
        {"id": "d1_i2_a4", "texto": "Mantiene un volumen de trabajo apropiado a las exigencias del puesto, gestionando eficientemente las tareas diarias y eventuales.", "orden": 2},
        {"id": "d1_i3_a4", "texto": "Da seguimiento oportuno a pendientes, compromisos y solicitudes, alertando sobre plazos próximos a vencer o situaciones que requieren atención.", "orden": 3},
        {"id": "d1_i4_a4", "texto": "Aprovecha eficientemente el tiempo de trabajo, evitando retrasos innecesarios y cumpliendo con las metas u objetivos del área.", "orden": 4}
      ]
    },
    {
      "id": "dim2_a4",
      "nombre": "CALIDAD",
      "descripcion": "Exactitud, completitud y orden en los registros, documentos y procesos realizados, manteniendo estándares de calidad establecidos y detectando oportunamente errores o inconsistencias.",
      "peso": 0.16667,
      "items": [
        {"id": "d2_i1_a4", "texto": "Mantiene registros y expedientes exactos, completos y debidamente organizados, permitiendo su consulta y verificación en cualquier momento.", "orden": 5},
        {"id": "d2_i2_a4", "texto": "Verifica la integridad y completitud de la documentación de soporte antes de procesarla, archivarla o remitirla.", "orden": 6},
        {"id": "d2_i3_a4", "texto": "Detecta y corrige oportunamente errores o inconsistencias en su trabajo, evitando reprocesos y garantizando la confiabilidad de la información.", "orden": 7},
        {"id": "d2_i4_a4", "texto": "Cumple con los estándares de calidad y presentación establecidos para los documentos, reportes y productos de su área.", "orden": 8}
      ]
    },
    {
      "id": "dim3_a4",
      "nombre": "COMPETENCIAS LABORALES",
      "descripcion": "Dominio y aplicación apropiada de los conocimientos técnicos, procedimientos, sistemas y herramientas específicas requeridas para el desempeño efectivo del puesto.",
      "peso": 0.20833,
      "items": [
        {"id": "d3_i1_a4", "texto": "Utiliza apropiadamente los sistemas informáticos y herramientas del área (SICOIN, Office, sistemas propios u otros) para registrar información y generar reportes.", "orden": 9},
        {"id": "d3_i2_a4", "texto": "Aplica correctamente los procedimientos, lineamientos técnicos y normativa establecidos para los procesos bajo su responsabilidad.", "orden": 10},
        {"id": "d3_i3_a4", "texto": "Demuestra dominio de los conocimientos técnicos o especializados necesarios para realizar las funciones propias de su puesto.", "orden": 11},
        {"id": "d3_i4_a4", "texto": "Busca actualizarse y mejorar continuamente sus competencias técnicas mediante capacitaciones, consultas o práctica.", "orden": 12},
        {"id": "d3_i5_a4", "texto": "[Solo para puestos \"Encargados\"] Orienta y supervisa apropiadamente al personal auxiliar bajo su responsabilidad en las tareas operativas del área.\n\n[Para otros puestos] Resuelve consultas y situaciones técnicas del área con criterio apropiado y dentro de su ámbito de responsabilidad.", "orden": 13}
      ]
    },
    {
      "id": "dim4_a4",
      "nombre": "COMPORTAMIENTO ORGANIZACIONAL",
      "descripcion": "Cumplimiento de normas, reglamentos, lineamientos de control interno y valores institucionales, demostrando integridad, asistencia, puntualidad y uso apropiado de recursos municipales.",
      "peso": 0.12500,
      "items": [
        {"id": "d4_i1_a4", "texto": "Cumple con los lineamientos del Sistema de Control Interno (Acuerdo A-039-2023) en los procesos bajo su responsabilidad, documentando evidencias apropiadamente.", "orden": 14},
        {"id": "d4_i2_a4", "texto": "Asiste puntualmente a su jornada laboral y cumple con el horario establecido, justificando apropiadamente ausencias o permisos cuando corresponde.", "orden": 15},
        {"id": "d4_i3_a4", "texto": "Resguarda apropiadamente la confidencialidad de información sensible y documentos valorados, cumpliendo con normativa de transparencia y protección de datos personales.", "orden": 16}
      ]
    },
    {
      "id": "dim5_a4",
      "nombre": "RELACIONES INTERPERSONALES",
      "descripcion": "Calidad de la comunicación, coordinación y colaboración con compañeros, jefaturas y otras dependencias, contribuyendo a un ambiente de trabajo positivo y al logro de objetivos compartidos.",
      "peso": 0.12500,
      "items": [
        {"id": "d5_i1_a4", "texto": "Coordina efectivamente con otras dependencias para el cumplimiento de tareas, manteniendo comunicación oportuna y respetuosa.", "orden": 17},
        {"id": "d5_i2_a4", "texto": "Colabora con sus compañeros de trabajo y apoya en tareas del equipo cuando es necesario, contribuyendo a un ambiente de trabajo positivo.", "orden": 18},
        {"id": "d5_i3_a4", "texto": "Se comunica de manera clara, profesional y oportuna, escuchando activamente y transmitiendo información completa y precisa.", "orden": 19}
      ]
    },
    {
      "id": "dim6_a4",
      "nombre": "ORIENTACIÓN AL SERVICIO Y CUMPLIMIENTO DE PROTOCOLOS",
      "descripcion": "Calidad, calidez y oportunidad en la atención a usuarios internos y externos, brindando información clara y canalizando apropiadamente solicitudes. Cumplimiento estricto de protocolos de seguridad y procedimientos operativos específicos del puesto, previniendo riesgos y respondiendo efectivamente ante situaciones imprevistas.",
      "peso": 0.20833,
      "items": [
        {"id": "d6_i1_a4", "texto": "Atiende a usuarios internos y externos con calidad y calidez, canalizando apropiadamente sus solicitudes y brindando información clara y completa.", "orden": 20},
        {"id": "d6_i2_a4", "texto": "Responde oportunamente a las consultas y solicitudes, buscando soluciones efectivas dentro de su ámbito de responsabilidad.", "orden": 21},
        {"id": "d6_i3_a4", "texto": "Mantiene actitud de servicio, profesionalismo y cortesía en el trato con todas las personas, incluso en situaciones difíciles o de presión.", "orden": 22},
        {"id": "d6_i4_a4", "texto": "Cumple estrictamente los protocolos de seguridad y procedimientos operativos específicos de su puesto, utilizando apropiadamente el equipo asignado.", "orden": 23},
        {"id": "d6_i5_a4", "texto": "Previene riesgos y responde efectivamente ante situaciones imprevistas o de emergencia, manteniendo disciplina y autocontrol.", "orden": 24}
      ]
    }
  ]'::JSONB,
  '[
    {
      "id": "pot_dim1_a4",
      "nombre": "CAPACIDAD DE APRENDIZAJE",
      "descripcion": "Rapidez y efectividad para adquirir nuevos conocimientos, habilidades y adaptarse a nuevas tecnologías o procedimientos.",
      "peso": 0.23077,
      "items": [
        {"id": "pot_d1_i1_a4", "texto": "Aprende rápidamente nuevos procedimientos, sistemas o herramientas cuando son introducidos en el área.", "orden": 25},
        {"id": "pot_d1_i2_a4", "texto": "Busca activamente oportunidades de capacitación, desarrollo profesional o actualización técnica.", "orden": 26},
        {"id": "pot_d1_i3_a4", "texto": "Aplica efectivamente en su trabajo los nuevos conocimientos o habilidades adquiridos, mejorando su desempeño.", "orden": 27}
      ]
    },
    {
      "id": "pot_dim2_a4",
      "nombre": "ORIENTACIÓN AL CRECIMIENTO",
      "descripcion": "Motivación y disposición para asumir mayores responsabilidades y desarrollar una carrera profesional.",
      "peso": 0.23077,
      "items": [
        {"id": "pot_d2_i1_a4", "texto": "Expresa interés en asumir mayores responsabilidades, roles de mayor complejidad o especializarse en su área técnica.", "orden": 28},
        {"id": "pot_d2_i2_a4", "texto": "Se ofrece voluntariamente para participar en proyectos especiales, comisiones o tareas adicionales más allá de sus funciones.", "orden": 29},
        {"id": "pot_d2_i3_a4", "texto": "Tiene claridad sobre sus metas de desarrollo profesional y comunica apropiadamente sus intereses de crecimiento.", "orden": 30}
      ]
    },
    {
      "id": "pot_dim3_a4",
      "nombre": "LIDERAZGO EMERGENTE",
      "descripcion": "Capacidad de influir positivamente, orientar y apoyar a otros sin tener autoridad formal.",
      "peso": 0.23077,
      "items": [
        {"id": "pot_d3_i1_a4", "texto": "Sus compañeros buscan frecuentemente su orientación, consejo o apoyo en temas relacionados con el trabajo.", "orden": 31},
        {"id": "pot_d3_i2_a4", "texto": "Toma iniciativa para coordinar, facilitar o liderar esfuerzos de equipo sin que se lo asignen formalmente.", "orden": 32},
        {"id": "pot_d3_i3_a4", "texto": "Apoya y desarrolla a otros compañeros compartiendo generosamente su conocimiento y experiencia.", "orden": 33}
      ]
    },
    {
      "id": "pot_dim4_a4",
      "nombre": "PENSAMIENTO ESTRATÉGICO BÁSICO",
      "descripcion": "Capacidad de ver más allá de las tareas inmediatas, entender el contexto amplio y proponer mejoras.",
      "peso": 0.15385,
      "items": [
        {"id": "pot_d4_i1_a4", "texto": "Comprende claramente cómo su trabajo se relaciona con los objetivos del área y de la municipalidad en general.", "orden": 34},
        {"id": "pot_d4_i2_a4", "texto": "Propone mejoras, soluciones o ideas que van más allá de sus tareas inmediatas y benefician al área o la institución.", "orden": 35}
      ]
    },
    {
      "id": "pot_dim5_a4",
      "nombre": "ADAPTABILIDAD Y RESILIENCIA",
      "descripcion": "Manejo efectivo del cambio, la presión y las situaciones ambiguas o difíciles.",
      "peso": 0.15385,
      "items": [
        {"id": "pot_d5_i1_a4", "texto": "Se ajusta efectivamente a cambios en prioridades, procedimientos, sistemas o condiciones de trabajo.", "orden": 36},
        {"id": "pot_d5_i2_a4", "texto": "Mantiene actitud positiva y rendimiento estable ante situaciones de presión, dificultad o incertidumbre.", "orden": 37}
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

