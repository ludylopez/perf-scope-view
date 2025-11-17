-- Migración 026: Insertar instrumento C1 (Concejo Municipal)
-- Descripción: Inserta la configuración del instrumento de evaluación para nivel C1
-- IMPORTANTE: C1 solo tiene autoevaluación de desempeño, NO tiene evaluación de potencial

INSERT INTO instrument_configs (
  id,
  nivel,
  dimensiones_desempeno,
  dimensiones_potencial,
  configuracion_calculo,
  activo
) VALUES (
  'C1',
  'C1',
  '[
    {
      "id": "dim1_c1",
      "nombre": "ASISTENCIA Y PARTICIPACIÓN EN SESIONES",
      "descripcion": "Fundamento legal: Artículo 9 y 35 literal (a) del Código Municipal - \"La iniciativa, deliberación y decisión de los asuntos municipales\"",
      "peso": 0.142857,
      "items": [
        {"id": "d1_i1_c1", "texto": "Asiste puntualmente a las sesiones ordinarias del Concejo Municipal convocadas durante el período", "orden": 1},
        {"id": "d1_i2_c1", "texto": "Asiste a las sesiones extraordinarias del Concejo Municipal cuando son convocadas", "orden": 2},
        {"id": "d1_i3_c1", "texto": "Permanece durante toda la sesión, desde su inicio hasta su cierre formal, sin ausentarse", "orden": 3},
        {"id": "d1_i4_c1", "texto": "Revisa previamente la agenda y los documentos de apoyo antes de cada sesión del Concejo Municipal", "orden": 4}
      ]
    },
    {
      "id": "dim2_c1",
      "nombre": "TRABAJO EN COMISIONES MUNICIPALES",
      "descripcion": "Fundamento legal: Artículo 36 y 37 del Código Municipal; Objetivo (c) del Manual de Organización - \"Cumplir con la organización y funcionamiento de las comisiones obligatorias\"",
      "peso": 0.142857,
      "items": [
        {"id": "d2_i1_c1", "texto": "Asiste regularmente a las reuniones de trabajo de la(s) comisión(es) municipal(es) en la(s) que participa", "orden": 5},
        {"id": "d2_i2_c1", "texto": "Presenta dictámenes e informes de su comisión en los plazos establecidos por el Concejo Municipal", "orden": 6},
        {"id": "d2_i3_c1", "texto": "Los dictámenes e informes que presenta incluyen fundamentación técnica y legal apropiada", "orden": 7},
        {"id": "d2_i4_c1", "texto": "Se coordina con las dependencias municipales correspondientes para obtener información necesaria para el trabajo de su comisión", "orden": 8}
      ]
    },
    {
      "id": "dim3_c1",
      "nombre": "INICIATIVA Y PROPUESTAS PARA EL DESARROLLO MUNICIPAL",
      "descripcion": "Fundamento legal: Artículo 35 literal (a) y (c) del Código Municipal; Objetivo (b) - \"La iniciativa, deliberación y decisión de los asuntos municipales\" y \"Velar por el desarrollo integral del municipio\"",
      "peso": 0.142857,
      "items": [
        {"id": "d3_i1_c1", "texto": "Presenta iniciativas (propuestas de acuerdos, ordenanzas o reglamentos) al Concejo Municipal para su conocimiento y discusión", "orden": 9},
        {"id": "d3_i2_c1", "texto": "Propone políticas públicas municipales orientadas a mejorar la calidad de vida de los vecinos del municipio", "orden": 10},
        {"id": "d3_i3_c1", "texto": "Identifica necesidades comunitarias y plantea propuestas de solución viables en el Concejo Municipal", "orden": 11},
        {"id": "d3_i4_c1", "texto": "Las iniciativas y propuestas que presenta están fundamentadas con base técnica, legal o presupuestaria", "orden": 12}
      ]
    },
    {
      "id": "dim4_c1",
      "nombre": "FISCALIZACIÓN Y CONTROL DEL GOBIERNO MUNICIPAL",
      "descripcion": "Fundamento legal: Artículo 35 literal (d) y 54 literal (b) del Código Municipal - \"El control y fiscalización de los distintos actos del gobierno municipal y de su administración\"",
      "peso": 0.142857,
      "items": [
        {"id": "d4_i1_c1", "texto": "Revisa y analiza los informes presentados por el Alcalde Municipal al Concejo sobre la gestión administrativa", "orden": 13},
        {"id": "d4_i2_c1", "texto": "Da seguimiento al cumplimiento de los acuerdos y resoluciones aprobados por el Concejo Municipal", "orden": 14},
        {"id": "d4_i3_c1", "texto": "Verifica que las actividades municipales se ejecuten conforme a las ordenanzas, reglamentos y acuerdos vigentes", "orden": 15},
        {"id": "d4_i4_c1", "texto": "Cuando identifica irregularidades o aspectos que requieren aclaración, solicita información o interpela al Alcalde de manera fundamentada en el Concejo", "orden": 16}
      ]
    },
    {
      "id": "dim5_c1",
      "nombre": "APROBACIÓN Y CONTROL PRESUPUESTARIO",
      "descripcion": "Fundamento legal: Artículo 35 literal (f) del Código Municipal - \"La aprobación, control de ejecución, evaluación y liquidación del presupuesto de ingresos y egresos del municipio\"",
      "peso": 0.142857,
      "items": [
        {"id": "d5_i1_c1", "texto": "Revisa y analiza el proyecto de presupuesto municipal antes de votar su aprobación", "orden": 17},
        {"id": "d5_i2_c1", "texto": "Comprende la estructura del presupuesto municipal (ingresos, egresos, fuentes de financiamiento) y lo considera en sus decisiones", "orden": 18},
        {"id": "d5_i3_c1", "texto": "Da seguimiento a la ejecución presupuestaria durante el año, revisando informes financieros presentados al Concejo", "orden": 19},
        {"id": "d5_i4_c1", "texto": "Sus votos sobre modificaciones presupuestarias están fundamentados en el análisis de la información financiera disponible", "orden": 20}
      ]
    },
    {
      "id": "dim6_c1",
      "nombre": "EMISIÓN DE NORMATIVA Y POLÍTICAS PÚBLICAS MUNICIPALES",
      "descripcion": "Fundamento legal: Artículo 35 literal (i) del Código Municipal - \"La emisión y aprobación de acuerdos, reglamentos y ordenanzas municipales\"; Objetivo (d) - \"Gestionar y conocer las normas y ordenanzas municipales\"",
      "peso": 0.142857,
      "items": [
        {"id": "d6_i1_c1", "texto": "Participa activamente en la discusión y análisis de proyectos de ordenanzas, reglamentos y acuerdos municipales", "orden": 21},
        {"id": "d6_i2_c1", "texto": "Conoce y aplica el marco legal vigente (Código Municipal, leyes sectoriales, ordenanzas municipales) en sus decisiones", "orden": 22},
        {"id": "d6_i3_c1", "texto": "Sus votos sobre aprobación de normativa municipal están fundamentados en el análisis técnico y legal de las propuestas", "orden": 23},
        {"id": "d6_i4_c1", "texto": "Impulsa la aprobación de políticas públicas municipales alineadas con las necesidades del municipio", "orden": 24}
      ]
    },
    {
      "id": "dim7_c1",
      "nombre": "TRANSPARENCIA, RENDICIÓN DE CUENTAS Y PROBIDAD",
      "descripcion": "Fundamento legal: Objetivo (g) del Manual de Organización - \"Cumplir con la obligación de rendir cuentas\"; Artículo 35 literal (i) - Comisión de Probidad (obligatoria)",
      "peso": 0.142857,
      "items": [
        {"id": "d7_i1_c1", "texto": "Cumple con la presentación de su declaración patrimonial en los plazos establecidos por la ley", "orden": 25},
        {"id": "d7_i2_c1", "texto": "Identifica y declara oportunamente situaciones donde pueda existir conflicto de interés, absteniéndose de votar cuando corresponde", "orden": 26},
        {"id": "d7_i3_c1", "texto": "Respeta la confidencialidad de los asuntos tratados en sesiones cerradas o con carácter reservado del Concejo Municipal", "orden": 27},
        {"id": "d7_i4_c1", "texto": "Actúa con transparencia en sus decisiones y proporciona información veraz cuando le corresponde rendir cuentas ante la ciudadanía", "orden": 28}
      ]
    }
  ]'::JSONB,
  '[]'::JSONB,  -- IMPORTANTE: C1 NO tiene dimensiones de potencial (array vacío)
  '{"pesoAuto": 1.0, "pesoJefe": 0.0}'::JSONB,  -- 100% autoevaluación, 0% evaluación de jefe
  true
)
ON CONFLICT (id) DO UPDATE SET
  nivel = EXCLUDED.nivel,
  dimensiones_desempeno = EXCLUDED.dimensiones_desempeno,
  dimensiones_potencial = EXCLUDED.dimensiones_potencial,
  configuracion_calculo = EXCLUDED.configuracion_calculo,
  activo = EXCLUDED.activo,
  updated_at = NOW();

COMMENT ON TABLE instrument_configs IS 'Configuraciones de instrumentos de evaluación con sus dimensiones y reglas de cálculo. C1 usa pesos 100/0 (solo autoevaluación, sin evaluación de jefe ni potencial).';

