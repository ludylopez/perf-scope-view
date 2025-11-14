-- Migración: Agregar Instrumento O2 (OPERATIVOS II)
-- Fecha: 2025-11-14
-- Descripción: Inserta la configuración del instrumento de evaluación para nivel O2

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
  updated_at = NOW();

-- Comentario
COMMENT ON TABLE instrument_configs IS 'Configuraciones de instrumentos de evaluación con sus dimensiones y reglas de cálculo. Incluye O2 (OPERATIVOS II).';
