-- Migración: Agregar Instrumento D2 (DIRECCIONES II)
-- Fecha: 2025-11-19
-- Descripción: Inserta la configuración del instrumento de evaluación para nivel D2

INSERT INTO instrument_configs (
  id,
  nivel,
  dimensiones_desempeno,
  dimensiones_potencial,
  configuracion_calculo,
  activo
) VALUES (
  'D2',
  'D2',
  '[
    {
      "id": "dim1_d2",
      "nombre": "PRODUCTIVIDAD",
      "descripcion": "Capacidad para cumplir con los objetivos estratégicos, metas y planes establecidos para la dirección, utilizando eficientemente los recursos y cumpliendo con los plazos institucionales.",
      "peso": 0.20,
      "items": [
        {"id": "d1_i1_d2", "texto": "Cumple con los objetivos estratégicos establecidos en el plan anual de su dirección", "orden": 1},
        {"id": "d1_i2_d2", "texto": "Ejecuta eficientemente el Plan Operativo Anual (POA) asignado a su dirección", "orden": 2},
        {"id": "d1_i3_d2", "texto": "Entrega informes, proyectos y reportes dentro de los plazos establecidos", "orden": 3},
        {"id": "d1_i4_d2", "texto": "Gestiona eficientemente los recursos (humanos, financieros, materiales) asignados a su dirección", "orden": 4},
        {"id": "d1_i5_d2", "texto": "Alcanza las metas cuantitativas y cualitativas establecidas para su dirección", "orden": 5}
      ]
    },
    {
      "id": "dim2_d2",
      "nombre": "CALIDAD",
      "descripcion": "Capacidad para asegurar que los servicios, procesos, informes y productos de la dirección cumplan con los estándares de calidad, normas técnicas y requisitos institucionales establecidos.",
      "peso": 0.15,
      "items": [
        {"id": "d2_i1_d2", "texto": "Los servicios y procesos de su dirección cumplen con los estándares de calidad establecidos", "orden": 6},
        {"id": "d2_i2_d2", "texto": "Los informes y reportes que presenta son precisos, exactos y completos", "orden": 7},
        {"id": "d2_i3_d2", "texto": "Implementa acciones de mejora continua en los procesos de su dirección", "orden": 8},
        {"id": "d2_i4_d2", "texto": "Asegura el cumplimiento de la normativa técnica y legal aplicable a su dirección", "orden": 9}
      ]
    },
    {
      "id": "dim3_d2",
      "nombre": "COMPETENCIAS LABORALES",
      "descripcion": "Conjunto de competencias comportamentales esenciales para el desempeño efectivo del nivel directivo, incluyendo liderazgo, planificación estratégica, orientación a resultados, trabajo en equipo, integridad y adaptabilidad.",
      "peso": 0.25,
      "items": [
        {"id": "d3_i1_d2", "texto": "LIDERAZGO Y COMUNICACIÓN: Demuestra liderazgo efectivo, comunica claramente objetivos y expectativas, e influye positivamente en su equipo y en otras direcciones", "orden": 10},
        {"id": "d3_i2_d2", "texto": "PLANIFICACIÓN Y PENSAMIENTO ESTRATÉGICO: Planifica y organiza efectivamente las actividades de la dirección, analiza situaciones complejas y toma decisiones fundamentadas", "orden": 11},
        {"id": "d3_i3_d2", "texto": "ORIENTACIÓN A RESULTADOS Y CALIDAD: Se enfoca en lograr resultados de calidad, toma iniciativa ante problemas y busca información para fundamentar sus acciones", "orden": 12},
        {"id": "d3_i4_d2", "texto": "TRABAJO EN EQUIPO Y COLABORACIÓN: Trabaja colaborativamente con otros, negocia efectivamente y promueve la cooperación entre direcciones y entidades externas", "orden": 13},
        {"id": "d3_i5_d2", "texto": "INTEGRIDAD Y RESPONSABILIDAD: Actúa con integridad y ética profesional, asume responsabilidad por sus decisiones, cumple compromisos y es confiable", "orden": 14},
        {"id": "d3_i6_d2", "texto": "ADAPTABILIDAD Y GESTIÓN DEL ESTRÉS: Se adapta a cambios, mantiene el control en situaciones de presión, demuestra resistencia ante obstáculos y gestiona múltiples demandas efectivamente", "orden": 15}
      ]
    },
    {
      "id": "dim4_d2",
      "nombre": "COMPORTAMIENTO ORGANIZACIONAL",
      "descripcion": "Cumplimiento de normas, políticas y valores institucionales, demostrando ejemplaridad, ética profesional y uso apropiado de los recursos municipales.",
      "peso": 0.10,
      "items": [
        {"id": "d4_i1_d2", "texto": "Cumple con el horario de trabajo establecido y asiste regularmente a sus labores", "orden": 16},
        {"id": "d4_i2_d2", "texto": "Actúa con ética, transparencia e integridad, siendo modelo a seguir para su equipo y otras direcciones", "orden": 17},
        {"id": "d4_i3_d2", "texto": "Utiliza apropiadamente los recursos municipales (instalaciones, equipo, vehículos, materiales)", "orden": 18}
      ]
    },
    {
      "id": "dim5_d2",
      "nombre": "LIDERAZGO Y GESTIÓN DE EQUIPOS",
      "descripcion": "Capacidad para liderar, supervisar, desarrollar y motivar al personal de la dirección, tomar decisiones gerenciales apropiadas y promover un clima laboral positivo y productivo.",
      "peso": 0.20,
      "items": [
        {"id": "d5_i1_d2", "texto": "Supervisa efectivamente el desempeño del personal de su dirección y brinda retroalimentación oportuna", "orden": 19},
        {"id": "d5_i2_d2", "texto": "Identifica necesidades de capacitación y promueve el desarrollo profesional de su equipo", "orden": 20},
        {"id": "d5_i3_d2", "texto": "Delega tareas apropiadamente según las capacidades y carga de trabajo del equipo", "orden": 21},
        {"id": "d5_i4_d2", "texto": "Toma decisiones gerenciales oportunas y justas sobre asuntos relacionados con el personal de su dirección", "orden": 22},
        {"id": "d5_i5_d2", "texto": "Resuelve conflictos del equipo de manera efectiva y promueve un clima laboral positivo y productivo", "orden": 23},
        {"id": "d5_i6_d2", "texto": "Inspira y motiva a su equipo hacia el logro de los objetivos estratégicos de la dirección", "orden": 24}
      ]
    },
    {
      "id": "dim6_d2",
      "nombre": "COORDINACIÓN INSTITUCIONAL",
      "descripcion": "Capacidad para coordinar efectivamente con el Alcalde Municipal, Concejo Municipal, otras direcciones y entidades externas, gestionando relaciones productivas y representando dignamente a la institución.",
      "peso": 0.10,
      "items": [
        {"id": "d6_i1_d2", "texto": "Coordina efectivamente con el Alcalde Municipal, informando oportunamente sobre la gestión de su dirección", "orden": 25},
        {"id": "d6_i2_d2", "texto": "Presenta propuestas claras, fundamentadas y oportunas al Concejo Municipal cuando corresponde", "orden": 26},
        {"id": "d6_i3_d2", "texto": "Colabora efectivamente con otras direcciones municipales para lograr objetivos institucionales comunes", "orden": 27},
        {"id": "d6_i4_d2", "texto": "Gestiona relaciones productivas con entidades externas relevantes (instituciones gubernamentales, ONGs, sector privado, etc.)", "orden": 28}
      ]
    }
  ]'::JSONB,
  '[
    {
      "id": "pot_dim1_d2",
      "nombre": "CAPACIDAD DE APRENDIZAJE Y DESARROLLO",
      "descripcion": "Apertura para aprender nuevas competencias, adaptabilidad cognitiva y búsqueda activa de crecimiento profesional.",
      "peso": 0.30,
      "items": [
        {"id": "pot_d1_i1_d2", "texto": "Demuestra apertura y disposición para aprender nuevas competencias, conocimientos y responsabilidades", "orden": 29},
        {"id": "pot_d1_i2_d2", "texto": "Se adapta rápidamente a nuevos retos, responsabilidades y cambios en el entorno institucional", "orden": 30},
        {"id": "pot_d1_i3_d2", "texto": "Busca activamente oportunidades de desarrollo profesional y crecimiento personal (capacitaciones, estudios, experiencias)", "orden": 31}
      ]
    },
    {
      "id": "pot_dim2_d2",
      "nombre": "VISIÓN ESTRATÉGICA Y PENSAMIENTO SISTÉMICO",
      "descripcion": "Capacidad para comprender el panorama amplio de la gestión municipal, pensar a largo plazo y conectar los objetivos de su dirección con la estrategia institucional.",
      "peso": 0.30,
      "items": [
        {"id": "pot_d2_i1_d2", "texto": "Comprende cómo su dirección contribuye a los objetivos estratégicos y misión de la Municipalidad", "orden": 32},
        {"id": "pot_d2_i2_d2", "texto": "Propone iniciativas, proyectos o mejoras que benefician a la institución más allá de su dirección", "orden": 33},
        {"id": "pot_d2_i3_d2", "texto": "Anticipa tendencias, cambios y necesidades futuras relevantes para la gestión municipal", "orden": 34}
      ]
    },
    {
      "id": "pot_dim3_d2",
      "nombre": "LIDERAZGO AMPLIADO E INFLUENCIA INSTITUCIONAL",
      "descripcion": "Capacidad para ejercer liderazgo e influencia más allá de su dirección, siendo referente institucional y liderando proyectos transversales.",
      "peso": 0.20,
      "items": [
        {"id": "pot_d3_i1_d2", "texto": "Ejerce influencia positiva más allá de su dirección, siendo reconocido como referente y líder institucional", "orden": 35},
        {"id": "pot_d3_i2_d2", "texto": "Demuestra capacidad para liderar proyectos transversales, interinstitucionales o de alto impacto municipal", "orden": 36}
      ]
    },
    {
      "id": "pot_dim4_d2",
      "nombre": "GESTIÓN DEL CAMBIO E INNOVACIÓN",
      "descripcion": "Capacidad para proponer e implementar innovaciones, gestionar procesos de cambio y transformar la gestión de su dirección.",
      "peso": 0.20,
      "items": [
        {"id": "pot_d4_i1_d2", "texto": "Propone e implementa innovaciones, mejoras o soluciones creativas que transforman la gestión de su dirección o de la Municipalidad", "orden": 37},
        {"id": "pot_d4_i2_d2", "texto": "Gestiona efectivamente procesos de cambio en su dirección, logrando la adopción exitosa por parte del equipo", "orden": 38}
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

COMMENT ON TABLE instrument_configs IS 'Configuraciones de instrumentos de evaluación con sus dimensiones y reglas de cálculo. A1 usa pesos 55/45 (Alta Dirección), A3, O2, E1, O1, OTE y D2 usan 70/30 estándar.';

