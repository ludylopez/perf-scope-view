-- Migración: Agregar Instrumento OTE (OPERATIVOS TÉCNICO ESPECIALIZADO)
-- Fecha: 2025-11-18
-- Descripción: Inserta la configuración del instrumento de evaluación para nivel OTE

INSERT INTO instrument_configs (
  id,
  nivel,
  dimensiones_desempeno,
  dimensiones_potencial,
  configuracion_calculo,
  activo
) VALUES (
  'OTE',
  'OTE',
  '[
    {
      "id": "dim1_ote",
      "nombre": "PRODUCTIVIDAD",
      "descripcion": "Esta dimensión mide si el colaborador completa sus tareas en el tiempo establecido y cumple con la cantidad de trabajo asignado.",
      "peso": 0.14815,
      "items": [
        {"id": "d1_i1_ote", "texto": "Cumplimiento del trabajo asignado - El colaborador completa todas las tareas y trabajos que se le asignan", "orden": 1},
        {"id": "d1_i2_ote", "texto": "Cumplimiento de horarios y plazos - El colaborador termina sus trabajos en los tiempos y fechas establecidos", "orden": 2},
        {"id": "d1_i3_ote", "texto": "Aprovechamiento del tiempo de trabajo - El colaborador usa bien su tiempo de trabajo y no lo desperdicia", "orden": 3},
        {"id": "d1_i4_ote", "texto": "Ritmo de trabajo constante - El colaborador mantiene un ritmo de trabajo estable durante toda su jornada", "orden": 4}
      ]
    },
    {
      "id": "dim2_ote",
      "nombre": "CALIDAD",
      "descripcion": "Esta dimensión mide si el colaborador hace su trabajo bien hecho, con cuidado y siguiendo las indicaciones correctamente.",
      "peso": 0.18519,
      "items": [
        {"id": "d2_i1_ote", "texto": "Precisión y cuidado en el trabajo - El colaborador hace su trabajo con precisión, cuidado y atención a los detalles", "orden": 5},
        {"id": "d2_i2_ote", "texto": "Cumplimiento de instrucciones y procedimientos - El colaborador sigue correctamente las instrucciones y los procedimientos establecidos", "orden": 6},
        {"id": "d2_i3_ote", "texto": "Presentación y acabado del trabajo - El trabajo que realiza el colaborador se ve bien terminado y presentado", "orden": 7},
        {"id": "d2_i4_ote", "texto": "Revisión del trabajo antes de terminarlo - El colaborador revisa y verifica que su trabajo esté bien antes de darlo por terminado", "orden": 8},
        {"id": "d2_i5_ote", "texto": "Trabajos sin errores o que requieran corrección - El colaborador entrega trabajos que están bien hechos desde la primera vez, sin necesidad de corregirlos", "orden": 9}
      ]
    },
    {
      "id": "dim3_ote",
      "nombre": "CONOCIMIENTOS Y HABILIDADES DEL PUESTO",
      "descripcion": "Esta dimensión mide si el colaborador tiene los conocimientos y habilidades necesarios para hacer bien su trabajo.",
      "peso": 0.18519,
      "items": [
        {"id": "d3_i1_ote", "texto": "Conocimientos técnicos de su trabajo - El colaborador conoce bien cómo hacer su trabajo y domina las tareas de su puesto", "orden": 10},
        {"id": "d3_i2_ote", "texto": "Capacidad para resolver problemas en el trabajo - El colaborador sabe cómo resolver los problemas que se presentan en su trabajo diario", "orden": 11},
        {"id": "d3_i3_ote", "texto": "Manejo de equipos, herramientas o maquinaria - El colaborador sabe usar correctamente los equipos, herramientas o maquinaria de su trabajo", "orden": 12},
        {"id": "d3_i4_ote", "texto": "Comprensión y seguimiento de indicaciones - El colaborador entiende bien las indicaciones que se le dan y las sigue correctamente", "orden": 13},
        {"id": "d3_i5_ote", "texto": "Interés por aprender y mejorar - El colaborador busca aprender cosas nuevas y mejorar en su trabajo", "orden": 14}
      ]
    },
    {
      "id": "dim4_ote",
      "nombre": "ACTITUD Y COMPORTAMIENTO EN EL TRABAJO",
      "descripcion": "Esta dimensión mide la actitud, puntualidad y comportamiento del colaborador en su trabajo.",
      "peso": 0.14815,
      "items": [
        {"id": "d4_i1_ote", "texto": "Puntualidad y asistencia - El colaborador llega a tiempo a su trabajo y asiste todos los días", "orden": 15},
        {"id": "d4_i2_ote", "texto": "Disciplina y cumplimiento de reglas - El colaborador respeta y cumple las reglas y normas de la municipalidad", "orden": 16},
        {"id": "d4_i3_ote", "texto": "Seguimiento de instrucciones de sus superiores - El colaborador sigue las órdenes e instrucciones que recibe de sus jefes", "orden": 17},
        {"id": "d4_i4_ote", "texto": "Actitud positiva hacia el trabajo - El colaborador muestra buena actitud, disposición y entusiasmo en su trabajo", "orden": 18}
      ]
    },
    {
      "id": "dim5_ote",
      "nombre": "TRABAJO EN EQUIPO Y RELACIONES",
      "descripcion": "Esta dimensión mide cómo el colaborador se relaciona y trabaja con sus compañeros, jefes y otras personas.",
      "peso": 0.14815,
      "items": [
        {"id": "d5_i1_ote", "texto": "Trabajo en equipo con sus compañeros - El colaborador trabaja bien con sus compañeros y colabora cuando es necesario", "orden": 19},
        {"id": "d5_i2_ote", "texto": "Comunicación clara con jefes y compañeros - El colaborador se comunica de forma clara cuando habla o reporta información", "orden": 20},
        {"id": "d5_i3_ote", "texto": "Coordinación con otras áreas o unidades - El colaborador coordina y trabaja bien con personas de otras áreas cuando es necesario", "orden": 21},
        {"id": "d5_i4_ote", "texto": "Trato respetuoso con usuarios y comunidad - El colaborador trata con respeto y amabilidad a los usuarios y personas de la comunidad", "orden": 22}
      ]
    },
    {
      "id": "dim6_ote",
      "nombre": "SEGURIDAD Y CUIDADO EN EL TRABAJO",
      "descripcion": "Esta dimensión mide si el colaborador trabaja de forma segura, cuida su equipo y sigue las normas de seguridad.",
      "peso": 0.18519,
      "items": [
        {"id": "d6_i1_ote", "texto": "Uso del equipo de protección personal - El colaborador usa correctamente todo su equipo de protección (casco, guantes, botas, chaleco, etc.) durante toda su jornada", "orden": 23},
        {"id": "d6_i2_ote", "texto": "Cumplimiento de normas de seguridad - El colaborador sigue todas las normas y reglas de seguridad en su trabajo", "orden": 24},
        {"id": "d6_i3_ote", "texto": "Identificación y reporte de situaciones peligrosas - El colaborador identifica situaciones peligrosas y las reporta a tiempo para evitar accidentes", "orden": 25},
        {"id": "d6_i4_ote", "texto": "Instalación de señales de seguridad en su trabajo - El colaborador coloca y respeta las señales de seguridad cuando trabaja (conos, cinta, letreros, etc.)", "orden": 26},
        {"id": "d6_i5_ote", "texto": "Cuidado de herramientas, equipos y maquinaria - El colaborador cuida bien sus herramientas, equipos o maquinaria y los usa correctamente", "orden": 27}
      ]
    }
  ]'::JSONB,
  '[
    {
      "id": "pot_dim_a_ote",
      "nombre": "CAPACIDAD DE APRENDIZAJE Y ADAPTACIÓN",
      "descripcion": "Esta dimensión mide si el colaborador puede aprender cosas nuevas y adaptarse a cambios.",
      "peso": 0.33333,
      "items": [
        {"id": "pot_da_i1_ote", "texto": "Facilidad para aprender cosas nuevas - El colaborador aprende rápido cuando se le enseñan nuevos procedimientos, herramientas o tareas", "orden": 28},
        {"id": "pot_da_i2_ote", "texto": "Adaptación a cambios - El colaborador se adapta bien cuando hay cambios en su trabajo (nuevos procedimientos, nuevas herramientas, nuevos horarios, etc.)", "orden": 29}
      ]
    },
    {
      "id": "pot_dim_b_ote",
      "nombre": "INICIATIVA Y RESPONSABILIDAD",
      "descripcion": "Esta dimensión mide si el colaborador toma iniciativa y asume responsabilidades por su cuenta.",
      "peso": 0.33333,
      "items": [
        {"id": "pot_db_i1_ote", "texto": "Propone mejoras y toma iniciativa - El colaborador propone ideas para mejorar su trabajo y toma iniciativa sin que se lo pidan", "orden": 30},
        {"id": "pot_db_i2_ote", "texto": "Asume responsabilidades adicionales - El colaborador está dispuesto a asumir más responsabilidades o ayudar en otras tareas cuando se necesita", "orden": 31}
      ]
    },
    {
      "id": "pot_dim_c_ote",
      "nombre": "CAPACIDAD DE ORIENTAR Y COORDINAR",
      "descripcion": "Esta dimensión mide si el colaborador puede enseñar a otros y coordinar tareas.",
      "peso": 0.33333,
      "items": [
        {"id": "pot_dc_i1_ote", "texto": "Capacidad de enseñar y ayudar a otros - El colaborador puede enseñar y explicar su trabajo a otros compañeros, especialmente a los nuevos", "orden": 32},
        {"id": "pot_dc_i2_ote", "texto": "Capacidad para organizar y coordinar trabajo en grupo - El colaborador puede organizar tareas de un grupo pequeño y coordinar el trabajo con otros", "orden": 33}
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

COMMENT ON TABLE instrument_configs IS 'Configuraciones de instrumentos de evaluación con sus dimensiones y reglas de cálculo. A1 usa pesos 55/45 (Alta Dirección), A3, O2, E1, O1 y OTE usan 70/30 estándar.';

