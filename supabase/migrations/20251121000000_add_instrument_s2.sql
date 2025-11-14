-- Migración: Agregar Instrumento S2 (SECRETARIO MUNICIPAL)
-- Fecha: 2025-11-21
-- Descripción: Inserta la configuración del instrumento de evaluación para nivel S2

INSERT INTO instrument_configs (
  id,
  nivel,
  dimensiones_desempeno,
  dimensiones_potencial,
  configuracion_calculo,
  activo
) VALUES (
  'S2',
  'S2',
  '[
    {
      "id": "dim1_s2",
      "nombre": "PRODUCTIVIDAD",
      "descripcion": "Cumplimiento oportuno de las funciones administrativas y legales de la Secretaría Municipal, incluyendo elaboración de actas, certificaciones y gestión documental.",
      "peso": 0.16667,
      "items": [
        {"id": "d1_i1_s2", "texto": "Elaboración de actas del Concejo Municipal - Elabora las actas de las sesiones ordinarias y extraordinarias del Concejo Municipal de forma completa, oportuna y conforme al formato oficial establecido, entregándolas dentro de los plazos legales para firma y aprobación.", "orden": 1},
        {"id": "d1_i2_s2", "texto": "Emisión de certificaciones - Emite certificaciones de documentos oficiales (actas, acuerdos, resoluciones, constancias) de manera oportuna, cumpliendo con los plazos establecidos y atendiendo las solicitudes de unidades internas y ciudadanía.", "orden": 2},
        {"id": "d1_i3_s2", "texto": "Gestión de correspondencia oficial - Recibe, registra, distribuye y da seguimiento a la correspondencia oficial entrante y saliente de la Secretaría Municipal, garantizando trazabilidad y cumplimiento de plazos de respuesta institucionales.", "orden": 3},
        {"id": "d1_i4_s2", "texto": "Organización del archivo municipal - Mantiene organizado, clasificado y actualizado el archivo físico y digital de la Secretaría Municipal (actas, acuerdos, resoluciones, correspondencia), facilitando su consulta y resguardo conforme a normativa de archivo.", "orden": 4}
      ]
    },
    {
      "id": "dim2_s2",
      "nombre": "CALIDAD",
      "descripcion": "Exactitud, precisión y cumplimiento de estándares legales y protocolarios en la elaboración de documentos oficiales y gestión documental.",
      "peso": 0.16667,
      "items": [
        {"id": "d2_i1_s2", "texto": "Precisión y exactitud de documentos oficiales - Los documentos elaborados (actas, certificaciones, oficios) son precisos, exactos y libres de errores ortográficos, gramaticales o de contenido, cumpliendo con los estándares de calidad institucional y legalidad.", "orden": 5},
        {"id": "d2_i2_s2", "texto": "Cumplimiento de formatos y protocolos oficiales - Elabora actas, acuerdos, certificaciones y correspondencia aplicando correctamente los formatos oficiales, protocolos institucionales y requisitos legales establecidos en el Código Municipal y normativa aplicable.", "orden": 6},
        {"id": "d2_i3_s2", "texto": "Validez legal de certificaciones - Las certificaciones que emite cumplen con todos los requisitos legales (sellos, firmas, fechas, folios) garantizando su validez jurídica y evitando rechazos o cuestionamientos por defectos de forma.", "orden": 7},
        {"id": "d2_i4_s2", "texto": "Integridad y resguardo documental - Garantiza la integridad, autenticidad y resguardo adecuado de los libros de actas, documentos originales y archivo municipal, evitando pérdidas, alteraciones o deterioro de documentación oficial.", "orden": 8}
      ]
    },
    {
      "id": "dim3_s2",
      "nombre": "COMPETENCIAS LABORALES",
      "descripcion": "Dominio y aplicación de conocimientos técnico-legales, normativa municipal y procedimientos especializados requeridos para el ejercicio efectivo del cargo de Secretario Municipal.",
      "peso": 0.20833,
      "items": [
        {"id": "d3_i1_s2", "texto": "Dominio de normativa municipal - Demuestra conocimiento actualizado y aplica correctamente el Código Municipal (especialmente Art. 84), Ley de Servicio Municipal, Ley de Acceso a Información Pública y demás normativa aplicable a las funciones de la Secretaría.", "orden": 9},
        {"id": "d3_i2_s2", "texto": "Gestión documental y archivo - Aplica técnicas de gestión documental (clasificación, foliación, índices) y mantiene el archivo municipal conforme a estándares archivísticos y normativa de conservación documental.", "orden": 10},
        {"id": "d3_i3_s2", "texto": "Redacción oficial y protocolo - Redacta actas, acuerdos, resoluciones, oficios y minutas con redacción oficial clara, precisa y protocolar, utilizando lenguaje jurídico-administrativo apropiado y estructura formal correcta.", "orden": 11},
        {"id": "d3_i4_s2", "texto": "Procedimientos de certificación y fe pública - Domina y aplica correctamente los procedimientos de certificación de documentos oficiales, ejerciendo la fe pública conforme a la competencia legal del puesto y resguardando la legalidad institucional.", "orden": 12},
        {"id": "d3_i5_s2", "texto": "Transparencia y acceso a información - Conoce y aplica la Ley de Acceso a Información Pública, gestiona solicitudes de información conforme a plazos legales, identifica excepciones y garantiza el derecho ciudadano al acceso a información municipal.", "orden": 13}
      ]
    },
    {
      "id": "dim4_s2",
      "nombre": "COMPORTAMIENTO ORGANIZACIONAL",
      "descripcion": "Cumplimiento de normas, valores institucionales, ética pública y probidad en el ejercicio de las funciones de Secretario Municipal.",
      "peso": 0.16667,
      "items": [
        {"id": "d4_i1_s2", "texto": "Probidad y ética pública - Actúa con probidad, imparcialidad y transparencia en el ejercicio de sus funciones, evitando conflictos de interés y ejerciendo la fe pública con responsabilidad y apego a la legalidad.", "orden": 14},
        {"id": "d4_i2_s2", "texto": "Discreción y confidencialidad - Mantiene estricta confidencialidad sobre información sensible, deliberaciones del Concejo, asuntos reservados y datos personales, manejando la información institucional con discreción profesional.", "orden": 15},
        {"id": "d4_i3_s2", "texto": "Cumplimiento del Sistema de Control Interno - Cumple y hace cumplir el Sistema de Control Interno (Acuerdo A-039-2023), los procedimientos de la Secretaría y las disposiciones de auditoría, garantizando trazabilidad y respaldo documental de actuaciones.", "orden": 16},
        {"id": "d4_i4_s2", "texto": "Puntualidad, asistencia y disponibilidad - Asiste puntualmente a sesiones del Concejo, cumple con el horario de la Secretaría y demuestra disponibilidad para atender sesiones extraordinarias, emergencias institucionales y requerimientos urgentes de certificación.", "orden": 17}
      ]
    },
    {
      "id": "dim5_s2",
      "nombre": "RELACIONES INTERPERSONALES",
      "descripcion": "Calidad de la comunicación, coordinación y colaboración con autoridades, funcionarios y ciudadanía.",
      "peso": 0.12500,
      "items": [
        {"id": "d5_i1_s2", "texto": "Coordinación con Concejo Municipal y Alcaldía - Mantiene comunicación efectiva, respetuosa y protocolar con los miembros del Concejo Municipal y el Alcalde, brindando apoyo oportuno y facilitando la toma de decisiones institucionales.", "orden": 18},
        {"id": "d5_i2_s2", "texto": "Colaboración con unidades internas - Coordina eficazmente con Gerencia, Direcciones y Unidades municipales, facilitando certificaciones, información y documentación de archivo, con actitud colaborativa y orientación al trabajo en equipo.", "orden": 19},
        {"id": "d5_i3_s2", "texto": "Atención a la ciudadanía - Atiende con respeto, amabilidad y orientación al servicio las solicitudes de información y certificaciones de la ciudadanía, brindando orientación clara sobre procedimientos y requisitos.", "orden": 20}
      ]
    },
    {
      "id": "dim6_s2",
      "nombre": "SERVICIO INSTITUCIONAL Y TRANSPARENCIA",
      "descripcion": "Orientación al servicio público, transparencia activa y apoyo estratégico a las funciones del Concejo Municipal y Alcaldía.",
      "peso": 0.16667,
      "items": [
        {"id": "d6_i1_s2", "texto": "Transparencia activa y acceso a información - Facilita el acceso ciudadano a información pública municipal, responde solicitudes dentro de plazos legales, publica información conforme a Ley y promueve la transparencia institucional.", "orden": 21},
        {"id": "d6_i2_s2", "texto": "Apoyo estratégico al Concejo Municipal - Brinda soporte técnico-administrativo eficaz al Concejo Municipal (preparación de sesiones, seguimiento de acuerdos, elaboración de actas), facilitando la función legislativa y de control del órgano colegiado.", "orden": 22},
        {"id": "d6_i3_s2", "texto": "Apoyo a funciones delegadas por la Alcaldía - Ejecuta oportunamente las funciones que la Alcaldía le delega conforme al Código Municipal, brindando apoyo administrativo y legal al despacho del Alcalde.", "orden": 23},
        {"id": "d6_i4_s2", "texto": "Proactividad y mejora continua - Propone mejoras en procedimientos de la Secretaría, anticipa necesidades de documentación, agiliza trámites sin comprometer legalidad y contribuye a la eficiencia institucional.", "orden": 24}
      ]
    }
  ]'::JSONB,
  '[
    {
      "id": "pot_dim1_s2",
      "nombre": "LIDERAZGO ESTRATÉGICO",
      "descripcion": "Capacidad para influir positivamente, liderar equipos y representar a la institución en niveles estratégicos.",
      "peso": 0.30,
      "items": [
        {"id": "pot_d1_i1_s2", "texto": "Capacidad de influencia institucional - Demuestra capacidad para influir positivamente en decisiones institucionales más allá de su área, siendo reconocido como referente técnico-legal por autoridades y funcionarios de distintos niveles.", "orden": 25},
        {"id": "pot_d1_i2_s2", "texto": "Visión de liderazgo de equipos - Muestra potencial para liderar equipos más amplios, delegar efectivamente, desarrollar colaboradores y gestionar áreas operativas más allá de la Secretaría Municipal.", "orden": 26},
        {"id": "pot_d1_i3_s2", "texto": "Comunicación y representación institucional - Tiene capacidad para representar a la municipalidad en espacios interinstitucionales, comunicar con claridad temas complejos y proyectar imagen institucional profesional.", "orden": 27}
      ]
    },
    {
      "id": "pot_dim2_s2",
      "nombre": "GESTIÓN Y TOMA DE DECISIONES",
      "descripcion": "Capacidad para el pensamiento estratégico, toma de decisiones complejas y gestión de recursos institucionales.",
      "peso": 0.30,
      "items": [
        {"id": "pot_d2_i1_s2", "texto": "Pensamiento estratégico - Demuestra capacidad de análisis estratégico, anticipa escenarios futuros, identifica oportunidades de mejora institucional y propone soluciones innovadoras alineadas a objetivos municipales.", "orden": 28},
        {"id": "pot_d2_i2_s2", "texto": "Toma de decisiones bajo presión - Muestra capacidad para tomar decisiones efectivas en situaciones complejas, ambiguas o de alta presión, evaluando riesgos y considerando impacto institucional.", "orden": 29},
        {"id": "pot_d2_i3_s2", "texto": "Gestión de recursos y resultados - Evidencia potencial para gestionar presupuestos, recursos humanos y materiales de áreas más amplias, con orientación a resultados y eficiencia institucional.", "orden": 30}
      ]
    },
    {
      "id": "pot_dim3_s2",
      "nombre": "DESARROLLO Y APRENDIZAJE",
      "descripcion": "Capacidad para el aprendizaje continuo y la adaptación al cambio.",
      "peso": 0.20,
      "items": [
        {"id": "pot_d3_i1_s2", "texto": "Actualización y aprendizaje continuo - Busca activamente capacitación, actualización en normativa municipal, gestión pública y nuevas tendencias, demostrando iniciativa de desarrollo profesional continuo.", "orden": 31},
        {"id": "pot_d3_i2_s2", "texto": "Adaptabilidad y gestión del cambio - Muestra flexibilidad para adaptarse a cambios organizacionales, nuevas normativas, tecnologías o procedimientos, promoviendo la mejora continua y la innovación institucional.", "orden": 32}
      ]
    },
    {
      "id": "pot_dim4_s2",
      "nombre": "VISIÓN INSTITUCIONAL",
      "descripcion": "Comprensión integral de la gestión municipal y compromiso con el desarrollo institucional.",
      "peso": 0.20,
      "items": [
        {"id": "pot_d4_i1_s2", "texto": "Comprensión integral de la gestión municipal - Demuestra comprensión amplia del funcionamiento municipal más allá de la Secretaría (planificación, presupuesto, servicios, desarrollo local), con visión sistémica de la institución.", "orden": 33},
        {"id": "pot_d4_i2_s2", "texto": "Compromiso con el desarrollo institucional - Evidencia compromiso genuino con el desarrollo y fortalecimiento institucional, propone iniciativas de mejora, participa en proyectos transversales y contribuye al logro de objetivos estratégicos municipales.", "orden": 34}
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

