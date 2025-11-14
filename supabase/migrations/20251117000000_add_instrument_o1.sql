-- Migración: Agregar Instrumento O1 (OPERATIVOS I)
-- Fecha: 2025-11-17
-- Descripción: Inserta la configuración del instrumento de evaluación para nivel O1

INSERT INTO instrument_configs (
  id,
  nivel,
  dimensiones_desempeno,
  dimensiones_potencial,
  configuracion_calculo,
  activo
) VALUES (
  'O1',
  'O1',
  '[
    {
      "id": "dim1_o1",
      "nombre": "PRODUCTIVIDAD EN EL TRABAJO",
      "descripcion": "Evalúa la capacidad del colaborador para completar tareas en tiempo, cumplir horarios y mantener un ritmo constante de trabajo.",
      "peso": 0.17391,
      "items": [
        {"id": "d1_i1_o1", "texto": "Termina el trabajo que le asignan en el tiempo establecido", "orden": 1},
        {"id": "d1_i2_o1", "texto": "Llega a tiempo y cumple su horario de trabajo", "orden": 2},
        {"id": "d1_i3_o1", "texto": "Mantiene un ritmo constante de trabajo durante su jornada", "orden": 3},
        {"id": "d1_i4_o1", "texto": "Aprovecha bien su tiempo de trabajo", "orden": 4}
      ]
    },
    {
      "id": "dim2_o1",
      "nombre": "CALIDAD DEL TRABAJO",
      "descripcion": "Evalúa la calidad y completitud del trabajo realizado, así como la necesidad de correcciones.",
      "peso": 0.13043,
      "items": [
        {"id": "d2_i1_o1", "texto": "Hace bien su trabajo, como le enseñaron", "orden": 5},
        {"id": "d2_i2_o1", "texto": "Hace el trabajo completo, sin dejar pasos pendientes", "orden": 6},
        {"id": "d2_i3_o1", "texto": "Su trabajo casi nunca necesita ser corregido", "orden": 7}
      ]
    },
    {
      "id": "dim3_o1",
      "nombre": "CONOCIMIENTOS Y HABILIDADES DEL TRABAJO",
      "descripcion": "Evalúa el conocimiento del trabajo, uso adecuado de herramientas y equipos, cumplimiento de seguridad y capacidad de reporte.",
      "peso": 0.21739,
      "items": [
        {"id": "d3_i1_o1", "texto": "Sabe cómo hacer su trabajo correctamente", "orden": 8},
        {"id": "d3_i2_o1", "texto": "Usa bien las herramientas y equipos de su trabajo", "orden": 9},
        {"id": "d3_i3_o1", "texto": "Siempre usa su equipo de seguridad (casco, guantes, chaleco, botas, uniforme)", "orden": 10},
        {"id": "d3_i4_o1", "texto": "Sabe qué hacer en las situaciones del día a día de su trabajo", "orden": 11},
        {"id": "d3_i5_o1", "texto": "Llena los reportes o papeles que le piden, de forma clara", "orden": 12}
      ]
    },
    {
      "id": "dim4_o1",
      "nombre": "DISCIPLINA Y COMPORTAMIENTO",
      "descripcion": "Evalúa el cumplimiento de reglas, actitud hacia el trabajo, respeto a las instrucciones y honestidad.",
      "peso": 0.17391,
      "items": [
        {"id": "d4_i1_o1", "texto": "Cumple las reglas de la municipalidad y se presenta bien con su uniforme", "orden": 13},
        {"id": "d4_i2_o1", "texto": "Tiene buena actitud para hacer su trabajo", "orden": 14},
        {"id": "d4_i3_o1", "texto": "Hace caso a las instrucciones de su jefe con respeto", "orden": 15},
        {"id": "d4_i4_o1", "texto": "Es honesto y actúa correctamente en su trabajo", "orden": 16}
      ]
    },
    {
      "id": "dim5_o1",
      "nombre": "TRABAJO CON OTRAS PERSONAS",
      "descripcion": "Evalúa la capacidad de trabajar en equipo, comunicación con el jefe y trato respetuoso con las personas.",
      "peso": 0.13043,
      "items": [
        {"id": "d5_i1_o1", "texto": "Trabaja bien con sus compañeros y los apoya", "orden": 17},
        {"id": "d5_i2_o1", "texto": "Avisa a su jefe cuando pasa algo importante", "orden": 18},
        {"id": "d5_i3_o1", "texto": "Trata bien a las personas, con respeto", "orden": 19}
      ]
    },
    {
      "id": "dim6_o1",
      "nombre": "SERVICIO Y SEGURIDAD",
      "descripcion": "Evalúa la disposición para ayudar, rapidez en la atención, cumplimiento de reglas de seguridad y reporte de situaciones peligrosas.",
      "peso": 0.17391,
      "items": [
        {"id": "d6_i1_o1", "texto": "Está dispuesto a ayudar a las personas en su trabajo", "orden": 20},
        {"id": "d6_i2_o1", "texto": "Atiende rápido cuando le piden ayuda", "orden": 21},
        {"id": "d6_i3_o1", "texto": "Sigue las reglas de seguridad en su trabajo", "orden": 22},
        {"id": "d6_i4_o1", "texto": "Avisa cuando ve algo peligroso", "orden": 23}
      ]
    }
  ]'::JSONB,
  '[
    {
      "id": "pot1_o1",
      "nombre": "CAPACIDAD DE CRECIMIENTO Y DESARROLLO",
      "descripcion": "Evalúa la capacidad de aprendizaje, iniciativa para mejorar, adaptabilidad, autonomía e interés en el desarrollo profesional.",
      "peso": 1.0,
      "items": [
        {"id": "p1_i1_o1", "texto": "Aprende rápido cuando le enseñan cosas nuevas", "orden": 24},
        {"id": "p1_i2_o1", "texto": "Da ideas para mejorar su trabajo", "orden": 25},
        {"id": "p1_i3_o1", "texto": "Se adapta bien cuando le cambian de tarea", "orden": 26},
        {"id": "p1_i4_o1", "texto": "Puede trabajar bien con poca supervisión", "orden": 27},
        {"id": "p1_i5_o1", "texto": "Tiene interés en aprender más y crecer en su trabajo", "orden": 28}
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

COMMENT ON TABLE instrument_configs IS 'Configuraciones de instrumentos de evaluación con sus dimensiones y reglas de cálculo. A1 usa pesos 55/45 (Alta Dirección), A3, O2, E1 y O1 usan 70/30 estándar.';

