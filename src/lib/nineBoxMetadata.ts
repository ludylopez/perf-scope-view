/**
 * Metadatos completos de la Matriz 9-Box
 * Define las características estratégicas de cada cuadrante
 */

export type NineBoxPosition =
  | "alto-alto" | "alto-medio" | "alto-bajo"
  | "medio-alto" | "medio-medio" | "medio-bajo"
  | "bajo-alto" | "bajo-medio" | "bajo-bajo";

export type StrategicImportance = "critical" | "high" | "medium" | "low";
export type RetentionPriority = "urgent" | "high" | "medium" | "low";

export interface ActionRecommendation {
  category: "desarrollo" | "retencion" | "reconocimiento" | "intervencion" | "seguimiento";
  priority: "urgent" | "high" | "medium" | "low";
  title: string;
  description: string;
  icon?: string;
}

export interface QuadrantMetadata {
  key: NineBoxPosition;
  label: string;
  shortName: string;
  icon: string;
  description: string;
  strategicImportance: StrategicImportance;
  retentionPriority: RetentionPriority;
  developmentFocus: string[];
  recommendedActions: ActionRecommendation[];
  careerPath: string;
  typicalTimeframe: string;
  keyCharacteristics: string[];
  managerGuidance: string;
  riskFactors?: string[];
}

export const NINE_BOX_METADATA: Record<NineBoxPosition, QuadrantMetadata> = {
  "alto-alto": {
    key: "alto-alto",
    label: "Estrellas / Talento Clave",
    shortName: "Estrellas",
    icon: "⭐",
    description: "Empleados con alto desempeño y alto potencial. Son los líderes futuros de la organización y representan el talento más valioso.",
    strategicImportance: "critical",
    retentionPriority: "urgent",
    developmentFocus: [
      "Liderazgo estratégico",
      "Gestión de cambio",
      "Toma de decisiones ejecutivas",
      "Visión organizacional",
      "Mentoría y coaching"
    ],
    recommendedActions: [
      {
        category: "desarrollo",
        priority: "urgent",
        title: "Plan de Sucesión Inmediato",
        description: "Identificar posiciones clave para las que este colaborador puede ser sucesor en los próximos 1-2 años."
      },
      {
        category: "desarrollo",
        priority: "high",
        title: "Proyectos de Alto Impacto",
        description: "Asignar a proyectos estratégicos que aumenten su visibilidad y desarrollen competencias de liderazgo."
      },
      {
        category: "retencion",
        priority: "urgent",
        title: "Retención Proactiva",
        description: "Implementar estrategia de retención personalizada. Revisar compensación y beneficios competitivos."
      },
      {
        category: "desarrollo",
        priority: "high",
        title: "Mentoring Ejecutivo",
        description: "Asignar mentor de nivel ejecutivo para acelerar desarrollo de competencias de liderazgo."
      },
      {
        category: "reconocimiento",
        priority: "high",
        title: "Reconocimiento Público",
        description: "Destacar logros en reuniones ejecutivas y eventos organizacionales."
      }
    ],
    careerPath: "Ruta acelerada hacia posiciones de liderazgo senior. Potencial para roles ejecutivos en 2-3 años.",
    typicalTimeframe: "12-24 meses antes de promoción a siguiente nivel",
    keyCharacteristics: [
      "Resultados consistentemente excepcionales",
      "Capacidad de asumir mayores responsabilidades",
      "Habilidades de liderazgo demostradas",
      "Pensamiento estratégico",
      "Influencia positiva en el equipo"
    ],
    managerGuidance: "Prioridad máxima. Mantener conversaciones frecuentes sobre desarrollo de carrera. Preparar plan de sucesión. Proteger de sobrecarga y burnout. Considerar rotaciones estratégicas.",
    riskFactors: [
      "Alto riesgo de reclutamiento externo",
      "Posible frustración si no ven crecimiento rápido",
      "Riesgo de sobrecarga por múltiples asignaciones"
    ]
  },

  "medio-alto": {
    key: "medio-alto",
    label: "Alto Potencial en Desarrollo",
    shortName: "Alto Potencial",
    icon: "💎",
    description: "Empleados con alto potencial pero desempeño medio. Necesitan apoyo y desarrollo para alcanzar su máximo potencial.",
    strategicImportance: "high",
    retentionPriority: "high",
    developmentFocus: [
      "Mejora del desempeño actual",
      "Desarrollo de competencias técnicas",
      "Gestión del tiempo y prioridades",
      "Superación de barreras de desempeño",
      "Construcción de confianza"
    ],
    recommendedActions: [
      {
        category: "desarrollo",
        priority: "urgent",
        title: "Plan de Desarrollo Intensivo",
        description: "Crear plan específico para cerrar brechas de desempeño. Incluir capacitación y coaching personalizado."
      },
      {
        category: "intervencion",
        priority: "high",
        title: "Identificar Barreras",
        description: "Reunión uno-a-uno para entender qué obstaculiza el desempeño. Puede ser falta de recursos, claridad de rol, o habilidades específicas."
      },
      {
        category: "desarrollo",
        priority: "high",
        title: "Mentoría Estructurada",
        description: "Asignar mentor que guíe en desarrollo de competencias y navegación organizacional."
      },
      {
        category: "seguimiento",
        priority: "high",
        title: "Seguimiento Quincenal",
        description: "Establecer reuniones regulares de seguimiento para monitorear progreso y ajustar plan de desarrollo."
      },
      {
        category: "desarrollo",
        priority: "medium",
        title: "Proyectos de Desarrollo",
        description: "Asignar proyectos que permitan desarrollar habilidades mientras demuestran capacidades."
      }
    ],
    careerPath: "Con el apoyo adecuado, pueden convertirse en Estrellas (alto-alto) en 12-18 meses. Potencial de liderazgo a mediano plazo.",
    typicalTimeframe: "12-18 meses para mejorar desempeño a nivel alto",
    keyCharacteristics: [
      "Capacidad demostrada de aprendizaje rápido",
      "Motivación y ambición",
      "Desempeño inconsistente o por debajo del potencial",
      "Falta de experiencia o exposición",
      "Necesita guía y estructura"
    ],
    managerGuidance: "Inversión prioritaria. Identificar y eliminar barreras de desempeño. Proporcionar feedback frecuente y específico. Celebrar mejoras incrementales. Evitar frustraciones que lleven a deserción.",
    riskFactors: [
      "Riesgo de frustración si no ven progreso",
      "Pueden buscar oportunidades externas si se sienten estancados",
      "Posible síndrome del impostor"
    ]
  },

  "bajo-alto": {
    key: "bajo-alto",
    label: "Enigmas / Necesitan Intervención",
    shortName: "Enigmas",
    icon: "❓",
    description: "Empleados con alto potencial pero bajo desempeño. Situación crítica que requiere intervención inmediata para entender y resolver.",
    strategicImportance: "high",
    retentionPriority: "medium",
    developmentFocus: [
      "Diagnóstico de causas de bajo desempeño",
      "Intervención correctiva urgente",
      "Reconstrucción de confianza",
      "Cambio de rol o responsabilidades si es necesario",
      "Plan de mejora con plazos claros"
    ],
    recommendedActions: [
      {
        category: "intervencion",
        priority: "urgent",
        title: "Diagnóstico Inmediato",
        description: "Reunión urgente para entender causas del bajo desempeño. ¿Es ajuste de rol, problemas personales, falta de recursos, o conflicto?"
      },
      {
        category: "intervencion",
        priority: "urgent",
        title: "Plan de Mejora 90 Días",
        description: "Establecer plan de mejora específico con objetivos claros, plazos y métricas. Documentar expectativas."
      },
      {
        category: "desarrollo",
        priority: "high",
        title: "Evaluar Re-ubicación",
        description: "Considerar si un cambio de rol, equipo o responsabilidades podría desbloquear el potencial."
      },
      {
        category: "seguimiento",
        priority: "urgent",
        title: "Seguimiento Semanal",
        description: "Reuniones semanales obligatorias para monitorear progreso del plan de mejora."
      },
      {
        category: "desarrollo",
        priority: "medium",
        title: "Apoyo Especializado",
        description: "Proporcionar coaching, capacitación o recursos específicos según diagnóstico."
      }
    ],
    careerPath: "Situación de bifurcación: Con intervención exitosa pueden moverse a medio-alto o alto-alto. Sin mejora, considerar desvinculación.",
    typicalTimeframe: "90 días para ver mejora significativa, 6 meses para estabilización",
    keyCharacteristics: [
      "Gran discrepancia entre capacidad y resultados",
      "Posible desajuste persona-puesto",
      "Puede haber factores externos o personales",
      "Frustración o desmotivación visible",
      "Talento desaprovechado"
    ],
    managerGuidance: "Situación que requiere atención urgente de RRHH. No ignorar: el talento puede perderse permanentemente o afectar al equipo. Conversación honesta sobre expectativas. Considerar todas las opciones: desarrollo, reubicación, o desvinculación.",
    riskFactors: [
      "Riesgo alto de deserción voluntaria",
      "Impacto negativo en moral del equipo",
      "Posible necesidad de desvinculación si no hay mejora"
    ]
  },

  "alto-medio": {
    key: "alto-medio",
    label: "Pilares / Contribuidores Sólidos",
    shortName: "Pilares",
    icon: "🏛️",
    description: "Empleados confiables con alto desempeño y potencial medio. Son la columna vertebral de la organización.",
    strategicImportance: "high",
    retentionPriority: "high",
    developmentFocus: [
      "Profundización de expertise técnico",
      "Liderazgo de proyectos complejos",
      "Mentoría de colaboradores junior",
      "Innovación en procesos actuales",
      "Reconocimiento y satisfacción en rol actual"
    ],
    recommendedActions: [
      {
        category: "reconocimiento",
        priority: "high",
        title: "Reconocimiento Consistente",
        description: "Valorar públicamente sus contribuciones. Son el ejemplo de consistencia y confiabilidad."
      },
      {
        category: "desarrollo",
        priority: "medium",
        title: "Desarrollo Lateral",
        description: "Ofrecer oportunidades de crecimiento horizontal: proyectos especiales, certificaciones, especialización técnica."
      },
      {
        category: "desarrollo",
        priority: "medium",
        title: "Rol de Mentor",
        description: "Asignar como mentores de empleados junior. Aprovecha su experiencia y les da reconocimiento."
      },
      {
        category: "retencion",
        priority: "high",
        title: "Compensación Competitiva",
        description: "Asegurar que compensación refleja su valor. Son altamente retenibles con reconocimiento adecuado."
      },
      {
        category: "seguimiento",
        priority: "medium",
        title: "Check-ins de Satisfacción",
        description: "Conversaciones regulares sobre satisfacción laboral y necesidades. Prevenir salidas silenciosas."
      }
    ],
    careerPath: "Carrera de profundización técnica o especialización. Posible liderazgo de equipo en área de expertise. Promociones más espaciadas.",
    typicalTimeframe: "Pueden permanecer exitosamente en nivel actual 3-5 años",
    keyCharacteristics: [
      "Desempeño consistentemente alto",
      "Confiables y predecibles",
      "Expertos en su área",
      "Satisfechos en rol actual",
      "No necesariamente ambicionan liderazgo senior"
    ],
    managerGuidance: "No subestimar su importancia. Son críticos para operación diaria. Evitar darlos por sentado. Ofrecer desarrollo que respete su preferencia por expertise sobre management. Reconocimiento frecuente.",
    riskFactors: [
      "Riesgo si se sienten no reconocidos o subestimados",
      "Pueden sentirse presionados a buscar ascensos que no desean"
    ]
  },

  "medio-medio": {
    key: "medio-medio",
    label: "Núcleo Estable / Contribuidores Efectivos",
    shortName: "Núcleo Estable",
    icon: "⚙️",
    description: "El grupo más grande de empleados. Desempeño y potencial sólidos y consistentes. Forman el núcleo operativo de la organización.",
    strategicImportance: "medium",
    retentionPriority: "medium",
    developmentFocus: [
      "Desarrollo continuo de competencias",
      "Mejora incremental de desempeño",
      "Identificación de fortalezas específicas",
      "Oportunidades de crecimiento selectivas",
      "Mantenimiento de motivación"
    ],
    recommendedActions: [
      {
        category: "desarrollo",
        priority: "medium",
        title: "Planes de Desarrollo Estándar",
        description: "Ofrecer capacitaciones y oportunidades de desarrollo que permitan mejora continua."
      },
      {
        category: "seguimiento",
        priority: "medium",
        title: "Evaluaciones Regulares",
        description: "Mantener ciclo normal de evaluaciones. Identificar quiénes pueden moverse a categorías superiores."
      },
      {
        category: "reconocimiento",
        priority: "medium",
        title: "Reconocimiento de Logros",
        description: "Celebrar logros específicos y contribuciones. Mantener motivación y compromiso."
      },
      {
        category: "desarrollo",
        priority: "low",
        title: "Oportunidades de Stretch",
        description: "Ocasionalmente asignar proyectos desafiantes para identificar potencial oculto."
      },
      {
        category: "seguimiento",
        priority: "low",
        title: "Monitoreo de Satisfacción",
        description: "Encuestas periódicas de clima y satisfacción para prevenir desmotivación."
      }
    ],
    careerPath: "Progresión estándar de carrera. Algunos pueden moverse a alto-medio con esfuerzo sostenido. Otros permanecen estables y satisfechos.",
    typicalTimeframe: "Promociones cada 3-5 años típicamente",
    keyCharacteristics: [
      "Desempeño satisfactorio y confiable",
      "Cumplen expectativas consistentemente",
      "Potencial de crecimiento moderado",
      "Mayoría de la fuerza laboral",
      "Estabilidad organizacional"
    ],
    managerGuidance: "Gestión estándar pero atenta. No descuidar por enfocarse solo en alto potencial. Son esenciales para operación. Identificar oportunidades individuales de crecimiento. Mantener equidad en distribución de recursos.",
    riskFactors: [
      "Riesgo de estancamiento si no hay desarrollo",
      "Pueden sentirse invisibles si toda la atención va a alto potencial"
    ]
  },

  "bajo-medio": {
    key: "bajo-medio",
    label: "Requieren Atención / En Desarrollo",
    shortName: "Requieren Atención",
    icon: "⚠️",
    description: "Empleados con potencial medio pero desempeño por debajo de lo esperado. Necesitan plan de mejora y seguimiento.",
    strategicImportance: "medium",
    retentionPriority: "low",
    developmentFocus: [
      "Mejora de desempeño básico",
      "Desarrollo de competencias fundamentales",
      "Clarificación de expectativas",
      "Identificación de brechas de habilidades",
      "Coaching de desempeño"
    ],
    recommendedActions: [
      {
        category: "intervencion",
        priority: "high",
        title: "Plan de Mejora Formal",
        description: "Establecer plan de mejora de desempeño con objetivos específicos, medibles y plazos claros (3-6 meses)."
      },
      {
        category: "desarrollo",
        priority: "high",
        title: "Capacitación Específica",
        description: "Identificar brechas de habilidades y proporcionar capacitación focalizada."
      },
      {
        category: "seguimiento",
        priority: "high",
        title: "Seguimiento Quincenal",
        description: "Reuniones regulares para revisar progreso, proporcionar feedback y ajustar plan."
      },
      {
        category: "intervencion",
        priority: "medium",
        title: "Clarificar Expectativas",
        description: "Asegurar que el colaborador entiende claramente qué se espera de su rol y cómo se mide el éxito."
      },
      {
        category: "seguimiento",
        priority: "medium",
        title: "Evaluar Fit de Rol",
        description: "Considerar si el rol actual es el adecuado o si un cambio podría mejorar desempeño."
      }
    ],
    careerPath: "Con mejora exitosa pueden moverse a medio-medio. Sin mejora sostenida, considerar reubicación o eventual desvinculación.",
    typicalTimeframe: "6 meses para demostrar mejora sostenible",
    keyCharacteristics: [
      "Desempeño por debajo de expectativas",
      "Potencial moderado de mejora",
      "Pueden tener habilidades en desarrollo",
      "Necesitan estructura y dirección clara",
      "Posible desajuste de rol"
    ],
    managerGuidance: "Atención necesaria pero no urgente como bajo-alto. Proporcionar feedback específico y frecuente. Documentar expectativas y progreso. Ser honesto sobre consecuencias de no mejorar. Considerar si hay factores corregibles.",
    riskFactors: [
      "Riesgo de desmotivación del equipo si bajo desempeño persiste",
      "Posible necesidad de desvinculación si no mejora en 6-12 meses"
    ]
  },

  "alto-bajo": {
    key: "alto-bajo",
    label: "Expertos / Especialistas de Alto Valor",
    shortName: "Expertos",
    icon: "🎓",
    description: "Alto desempeño en su rol actual pero con potencial limitado para roles superiores. Son invaluables como especialistas técnicos.",
    strategicImportance: "medium",
    retentionPriority: "high",
    developmentFocus: [
      "Profundización de expertise técnico",
      "Certificaciones y especialización avanzada",
      "Roles de consultoría interna",
      "Transferencia de conocimiento",
      "Reconocimiento como experto"
    ],
    recommendedActions: [
      {
        category: "reconocimiento",
        priority: "high",
        title: "Reconocimiento como Experto",
        description: "Formalizar su rol como experto técnico. Títulos como 'Especialista Senior' o 'Consultor Técnico'."
      },
      {
        category: "desarrollo",
        priority: "high",
        title: "Desarrollo Técnico Profundo",
        description: "Invertir en certificaciones avanzadas, conferencias especializadas, y formación técnica de élite."
      },
      {
        category: "retencion",
        priority: "high",
        title: "Compensación Competitiva",
        description: "Asegurar compensación refleja su valor técnico, sin requerir movimiento a management."
      },
      {
        category: "desarrollo",
        priority: "medium",
        title: "Rol de Consultor Interno",
        description: "Asignar como consultor interno para proyectos complejos. Aprovecha expertise sin forzar liderazgo formal."
      },
      {
        category: "reconocimiento",
        priority: "medium",
        title: "Mentoría Técnica",
        description: "Rol de mentor técnico para nuevos empleados. Reconoce su expertise y preserva conocimiento organizacional."
      }
    ],
    careerPath: "Carrera de especialización técnica profunda. Contributor Individual de alto nivel. NO candidatos para management, pero valiosos como expertos.",
    typicalTimeframe: "Pueden permanecer en nivel técnico indefinidamente con satisfacción",
    keyCharacteristics: [
      "Expertos en su dominio técnico",
      "Alto desempeño consistente",
      "Prefieren trabajo técnico sobre gestión de personas",
      "No aspiran o no son adecuados para liderazgo",
      "Invaluables en conocimiento especializado"
    ],
    managerGuidance: "IMPORTANTE: No forzar a management. Crear carrera técnica paralela. Reconocer que no todos deben ser managers para ser valorados. Proteger de presión para asumir roles de liderazgo que no desean o no se ajustan.",
    riskFactors: [
      "Riesgo si sienten presión para ser managers",
      "Pueden irse si no hay carrera técnica bien definida",
      "Vulnerables a reclutamiento por empresas que valoran expertise técnico"
    ]
  },

  "medio-bajo": {
    key: "medio-bajo",
    label: "Trabajadores Confiables / Desempeño Adecuado",
    shortName: "Confiables",
    icon: "📋",
    description: "Desempeño adecuado que cumple expectativas básicas, con potencial limitado. Contribuyen de manera estable sin destacar.",
    strategicImportance: "low",
    retentionPriority: "medium",
    developmentFocus: [
      "Mantenimiento de desempeño actual",
      "Desarrollo de habilidades específicas del rol",
      "Satisfacción y motivación en trabajo actual",
      "Eficiencia y productividad",
      "Contribución consistente"
    ],
    recommendedActions: [
      {
        category: "reconocimiento",
        priority: "medium",
        title: "Reconocer Confiabilidad",
        description: "Valorar su consistencia y confiabilidad. Agradecer contribuciones estables."
      },
      {
        category: "desarrollo",
        priority: "low",
        title: "Desarrollo Enfocado",
        description: "Ofrecer capacitación que mejore eficiencia en tareas actuales, no necesariamente preparar para promoción."
      },
      {
        category: "seguimiento",
        priority: "low",
        title: "Check-ins Estándar",
        description: "Mantener comunicación regular para asegurar satisfacción y prevenir problemas."
      },
      {
        category: "desarrollo",
        priority: "low",
        title: "Oportunidades Ocasionales",
        description: "De vez en cuando ofrecer proyectos diferentes para mantener interés y detectar habilidades ocultas."
      },
      {
        category: "seguimiento",
        priority: "low",
        title: "Monitoreo de Motivación",
        description: "Estar atento a señales de desmotivación que puedan afectar el desempeño adecuado actual."
      }
    ],
    careerPath: "Progresión limitada. Pueden permanecer en nivel actual. Promociones infrecuentes y basadas en antigüedad más que potencial.",
    typicalTimeframe: "Permanencia prolongada en nivel actual (5+ años)",
    keyCharacteristics: [
      "Desempeño adecuado y predecible",
      "Cumplen con lo mínimo esperado",
      "Potencial de crecimiento limitado",
      "Contribución estable sin destacar",
      "Satisfechos en rol actual"
    ],
    managerGuidance: "Gestión estándar. No requieren alta inversión de desarrollo. Mantener satisfacción para preservar desempeño adecuado. Ser realista sobre expectativas de carrera. Reconocer que no todos pueden o quieren crecer.",
    riskFactors: [
      "Riesgo bajo de pérdida (reemplazables)",
      "Pueden estancarse completamente sin estímulo ocasional"
    ]
  },

  "bajo-bajo": {
    key: "bajo-bajo",
    label: "Bajo Rendimiento / Acción Inmediata Requerida",
    shortName: "Bajo Rendimiento",
    icon: "🔴",
    description: "Bajo desempeño y bajo potencial. Requiere acción inmediata: plan de mejora intensivo o considerar desvinculación.",
    strategicImportance: "low",
    retentionPriority: "low",
    developmentFocus: [
      "Plan de mejora inmediato y documentado",
      "Evaluación de viabilidad de mejora",
      "Clarificación urgente de expectativas",
      "Consideración de desvinculación",
      "Protección del equipo"
    ],
    recommendedActions: [
      {
        category: "intervencion",
        priority: "urgent",
        title: "Plan de Mejora de 60-90 Días",
        description: "Establecer plan de mejora formal y documentado con objetivos muy específicos y plazos cortos. Involucrar a RRHH."
      },
      {
        category: "intervencion",
        priority: "urgent",
        title: "Conversación Honesta",
        description: "Reunión franca sobre realidad de situación. Comunicar claramente expectativas y consecuencias de no mejorar."
      },
      {
        category: "seguimiento",
        priority: "urgent",
        title: "Seguimiento Semanal Obligatorio",
        description: "Reuniones semanales documentadas para revisar progreso. Mantener registro escrito de cada sesión."
      },
      {
        category: "intervencion",
        priority: "high",
        title: "Evaluar Viabilidad",
        description: "Evaluación honesta con RRHH: ¿Es realista esperar mejora suficiente? ¿Vale la pena la inversión?"
      },
      {
        category: "intervencion",
        priority: "high",
        title: "Preparar Desvinculación",
        description: "Si no hay mejora en 60-90 días, iniciar proceso de desvinculación con apoyo de RRHH. Documentar todo."
      }
    ],
    careerPath: "Dos caminos: mejora significativa en 60-90 días para moverse a bajo-medio, o desvinculación.",
    typicalTimeframe: "60-90 días para demostrar mejora dramática o proceder a desvinculación",
    keyCharacteristics: [
      "Desempeño consistentemente deficiente",
      "Potencial limitado o nulo de mejora",
      "Puede afectar negativamente al equipo",
      "Consume tiempo desproporcionado de management",
      "Desajuste fundamental con rol o organización"
    ],
    managerGuidance: "Acción urgente requerida. No prolongar situación indefinidamente. Ser directo y honesto. Documentar todo meticulosamente. Trabajar estrechamente con RRHH. Proteger al equipo del impacto. Considerar impacto legal de desvinculación.",
    riskFactors: [
      "Impacto negativo en moral del equipo si se prolonga",
      "Consumo excesivo de tiempo de management",
      "Riesgo legal si desvinculación no está bien documentada"
    ]
  }
};

/**
 * Obtiene los metadatos de un cuadrante específico
 */
export function getQuadrantMetadata(position: string): QuadrantMetadata | null {
  return NINE_BOX_METADATA[position as NineBoxPosition] || null;
}

/**
 * Obtiene todas las posiciones agrupadas por importancia estratégica
 */
export function getPositionsByImportance(importance: StrategicImportance): QuadrantMetadata[] {
  return Object.values(NINE_BOX_METADATA).filter(
    (metadata) => metadata.strategicImportance === importance
  );
}

/**
 * Obtiene todas las posiciones agrupadas por prioridad de retención
 */
export function getPositionsByRetentionPriority(priority: RetentionPriority): QuadrantMetadata[] {
  return Object.values(NINE_BOX_METADATA).filter(
    (metadata) => metadata.retentionPriority === priority
  );
}

/**
 * Obtiene el color del badge según la posición
 */
export function getPositionColor(position: NineBoxPosition): string {
  const colors: Record<NineBoxPosition, string> = {
    "alto-alto": "bg-green-100 border-green-500 text-green-800",
    "alto-medio": "bg-green-50 border-green-400 text-green-700",
    "alto-bajo": "bg-yellow-50 border-yellow-400 text-yellow-800",
    "medio-alto": "bg-blue-50 border-blue-400 text-blue-800",
    "medio-medio": "bg-gray-50 border-gray-300 text-gray-700",
    "medio-bajo": "bg-orange-50 border-orange-400 text-orange-800",
    "bajo-alto": "bg-purple-50 border-purple-400 text-purple-800",
    "bajo-medio": "bg-red-50 border-red-400 text-red-700",
    "bajo-bajo": "bg-red-100 border-red-500 text-red-800",
  };
  return colors[position] || "bg-gray-50 border-gray-300 text-gray-700";
}

/**
 * Obtiene el color de prioridad para acciones
 */
export function getPriorityColor(priority: "urgent" | "high" | "medium" | "low"): string {
  const colors = {
    urgent: "bg-red-100 text-red-800 border-red-300",
    high: "bg-orange-100 text-orange-800 border-orange-300",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
    low: "bg-blue-100 text-blue-800 border-blue-300",
  };
  return colors[priority];
}

/**
 * Obtiene el icono para cada categoría de acción
 */
export function getActionCategoryIcon(category: ActionRecommendation["category"]): string {
  const icons = {
    desarrollo: "📚",
    retencion: "🔒",
    reconocimiento: "🏆",
    intervencion: "⚡",
    seguimiento: "👁️",
  };
  return icons[category] || "📌";
}
