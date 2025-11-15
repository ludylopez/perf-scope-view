-- Migración: Agregar Instrumento E2 (ENCARGADOS Y JEFES DE UNIDADES II)
-- Fecha: 2025-11-22
-- Descripción: Inserta la configuración del instrumento de evaluación para nivel E2

INSERT INTO instrument_configs (
  id,
  nivel,
  dimensiones_desempeno,
  dimensiones_potencial,
  configuracion_calculo,
  activo
) VALUES (
  'E2',
  'E2',
  '[
    {
      "id": "dim1_e2",
      "nombre": "PRODUCTIVIDAD",
      "descripcion": "Evalúa el cumplimiento de metas, volumen de trabajo y eficiencia en el uso del tiempo.",
      "peso": 0.16667,
      "items": [
        {"id": "d1_i1_e2", "texto": "Cumple con las metas y tareas operativas asignadas a su unidad dentro de los plazos establecidos.", "orden": 1},
        {"id": "d1_i2_e2", "texto": "Maneja un volumen de trabajo adecuado, atendiendo las demandas de su área sin atrasos significativos.", "orden": 2},
        {"id": "d1_i3_e2", "texto": "Entrega productos, informes y documentos requeridos en el tiempo estipulado.", "orden": 3},
        {"id": "d1_i4_e2", "texto": "Organiza su tiempo y prioriza sus tareas de manera eficiente para cumplir con sus responsabilidades.", "orden": 4}
      ]
    },
    {
      "id": "dim2_e2",
      "nombre": "CALIDAD",
      "descripcion": "Evalúa la precisión, exactitud y cumplimiento de estándares técnicos en el trabajo realizado.",
      "peso": 0.16667,
      "items": [
        {"id": "d2_i1_e2", "texto": "El trabajo técnico que realiza (registros, documentos, procesos) es preciso y libre de errores significativos.", "orden": 5},
        {"id": "d2_i2_e2", "texto": "Los informes, reportes y documentos que elabora cumplen con los estándares de calidad y formato requeridos.", "orden": 6},
        {"id": "d2_i3_e2", "texto": "Cumple con los procedimientos, lineamientos y protocolos establecidos para su área de trabajo.", "orden": 7},
        {"id": "d2_i4_e2", "texto": "Demuestra atención al detalle en la documentación, registros y expedientes que maneja.", "orden": 8}
      ]
    },
    {
      "id": "dim3_e2",
      "nombre": "COMPETENCIAS LABORALES",
      "descripcion": "Evalúa el dominio técnico especializado y las habilidades requeridas para el puesto.",
      "peso": 0.20833,
      "items": [
        {"id": "d3_i1_e2", "texto": "Posee y aplica el conocimiento técnico especializado requerido para desempeñar eficazmente su puesto.", "orden": 9},
        {"id": "d3_i2_e2", "texto": "Utiliza correctamente los sistemas informáticos y herramientas tecnológicas necesarias para su trabajo (SICOIN, Office, sistemas municipales).", "orden": 10},
        {"id": "d3_i3_e2", "texto": "Conoce y aplica adecuadamente la normativa municipal, reglamentos y procedimientos de control interno que rigen su área.", "orden": 11},
        {"id": "d3_i4_e2", "texto": "Analiza situaciones operativas de su unidad e identifica soluciones apropiadas a los problemas que enfrenta.", "orden": 12},
        {"id": "d3_i5_e2", "texto": "Gestiona adecuadamente la documentación, archivo y expedientes de su área, manteniéndolos organizados y accesibles.", "orden": 13}
      ]
    },
    {
      "id": "dim4_e2",
      "nombre": "COMPORTAMIENTO ORGANIZACIONAL",
      "descripcion": "Evalúa el cumplimiento de normas institucionales, disciplina y conducta laboral.",
      "peso": 0.12500,
      "items": [
        {"id": "d4_i1_e2", "texto": "Cumple con el horario de trabajo establecido y demuestra puntualidad en su asistencia.", "orden": 14},
        {"id": "d4_i2_e2", "texto": "Respeta la jerarquía organizacional y acata las instrucciones de su jefatura inmediata.", "orden": 15},
        {"id": "d4_i3_e2", "texto": "Actúa con apego a las normas institucionales, reglamentos municipales y código de conducta.", "orden": 16}
      ]
    },
    {
      "id": "dim5_e2",
      "nombre": "RELACIONES INTERPERSONALES",
      "descripcion": "Evalúa la capacidad de trabajar en equipo, comunicarse efectivamente y coordinar con otras unidades.",
      "peso": 0.16667,
      "items": [
        {"id": "d5_i1_e2", "texto": "Trabaja de manera colaborativa con sus compañeros y contribuye al logro de objetivos comunes.", "orden": 17},
        {"id": "d5_i2_e2", "texto": "Se comunica de forma clara y efectiva, tanto verbalmente como por escrito, con su jefatura, colegas y personal a cargo.", "orden": 18},
        {"id": "d5_i3_e2", "texto": "Mantiene una relación profesional y respetuosa con su jefe inmediato, aportando información oportuna y siguiendo instrucciones.", "orden": 19},
        {"id": "d5_i4_e2", "texto": "Coordina eficazmente con otras unidades y direcciones de la municipalidad para facilitar el trabajo institucional.", "orden": 20}
      ]
    },
    {
      "id": "dim6_e2",
      "nombre": "ORIENTACIÓN AL SERVICIO",
      "descripcion": "Evalúa la disposición para atender necesidades y solicitudes con calidad, oportunidad y actitud positiva.",
      "peso": 0.16667,
      "items": [
        {"id": "d6_i1_e2", "texto": "Atiende con cortesía, respeto y disposición las solicitudes que recibe (de usuarios externos o de otras unidades internas).", "orden": 21},
        {"id": "d6_i2_e2", "texto": "Responde de manera oportuna a las peticiones, requerimientos o consultas que le presentan.", "orden": 22},
        {"id": "d6_i3_e2", "texto": "Brinda seguimiento adecuado a las solicitudes hasta su resolución o canalización apropiada.", "orden": 23},
        {"id": "d6_i4_e2", "texto": "Mantiene una actitud de colaboración y servicio que facilita el trabajo de otros y el cumplimiento de objetivos institucionales.", "orden": 24}
      ]
    }
  ]'::JSONB,
  '[
    {
      "id": "pot_dim1_e2",
      "nombre": "POTENCIAL DE CRECIMIENTO Y DESARROLLO PROFESIONAL",
      "descripcion": "Evalúa la capacidad del colaborador para asumir roles de mayor responsabilidad o especialización, considerando trayectoria gerencial (ascenso a E1) o trayectoria técnica (especialista/experto de referencia).",
      "peso": 1.0,
      "items": [
        {"id": "pot_d1_i1_e2", "texto": "VISIÓN ESTRATÉGICA: Demuestra capacidad para comprender el impacto de su área en los objetivos institucionales y piensa más allá de las tareas operativas inmediatas.", "orden": 25},
        {"id": "pot_d1_i2_e2", "texto": "LIDERAZGO AMPLIADO: Muestra habilidades para dirigir equipos más grandes o coordinar múltiples procesos, ejerciendo influencia positiva más allá de su equipo directo.", "orden": 26},
        {"id": "pot_d1_i3_e2", "texto": "TOMA DE DECISIONES COMPLEJAS: Es capaz de manejar situaciones con múltiples variables y tomar decisiones tácticas (no solo operativas) con autonomía y criterio adecuado.", "orden": 27},
        {"id": "pot_d1_i4_e2", "texto": "ESPECIALIZACIÓN TÉCNICA: Demuestra interés y capacidad para profundizar en su conocimiento técnico y convertirse en experto/referente en su área específica.", "orden": 28},
        {"id": "pot_d1_i5_e2", "texto": "APRENDIZAJE CONTINUO: Busca activamente oportunidades de desarrollo profesional, se mantiene actualizado y aplica nuevos conocimientos a su trabajo.", "orden": 29},
        {"id": "pot_d1_i6_e2", "texto": "TRANSFERENCIA DE CONOCIMIENTO: Tiene la capacidad y disposición para capacitar, formar y compartir su conocimiento con otros colaboradores de manera efectiva.", "orden": 30}
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

