# Informe Final de Consultoría — Evaluación de Desempeño (Plantilla)

> **Propósito**: plantilla para consolidar resultados, hallazgos y recomendaciones del proceso de evaluación de desempeño.  
> **Fuente de evidencia**: dashboards `src/pages/analisis/*` + `src/pages/AnalisisEstadisticoEvaluaciones.tsx` + métricas derivadas desde `final_evaluation_results` y `evaluations`.

---

## 1) Portada y datos del proyecto
- **Cliente**:
- **Proyecto**: Evaluación de Desempeño (Período: ___)
- **Fecha de entrega**:
- **Equipo consultor**:
- **Stakeholders clave** (RRHH / Gerencia / Direcciones):
- **Versión** (v1.0 / v1.1 …) y control de cambios:

## 2) Resumen ejecutivo para RRHH y Gerencia (1–3 páginas)
- **Contexto**: por qué se ejecutó la evaluación y qué se buscaba lograr.
- **Cobertura**: universo, participación, fechas clave.
- **Hallazgos clave (5–10)**: bullets con datos concretos (ej. promedio, dispersión, % excelencia, brechas).
- **Riesgos/alertas**: si aplica (sesgos, baja participación, brechas por grupo).
- **Recomendaciones priorizadas**: Top 5 con impacto y esfuerzo.
- **Siguientes pasos**: plan 30/60/90 días.

## 3) Ficha técnica (para auditoría y trazabilidad)
> Esta sección permite sostener el informe ante controles internos/externos (Municipalidad).
- **Período analizado**: (ID y nombre)
- **Corte de datos**: fecha/hora en que se extrajeron los datos
- **Fuentes de datos** (tablas/vistas):
  - `evaluation_periods`, `users`, `evaluations`, `final_evaluation_results`
- **Reglas de inclusión**:
  - Estados incluidos (ej. `estado = enviado`)
  - Tratamiento de múltiples evaluadores (promedio / selección / regla)
- **Reglas de exclusión**:
  - Duplicados, incompletos, fuera de rango (documentar)
- **Herramientas**:
  - Dashboards: `/analisis/*` y `/analisis-estadistico`
  - Repositorio/versión: (commit/tag si aplica)
- **Responsables de validación**: RRHH / Gerencia / TI (nombre/cargo/fecha de visto bueno)

## 4) Alcance, supuestos y limitaciones
- **Alcance incluido**:
- **Fuera de alcance**:
- **Supuestos** (ej. validez de jerarquías/asignaciones, consistencia de instrumentos):
- **Limitaciones**:
  - Datos faltantes / no respondidos
  - Evaluaciones múltiples por colaborador (si aplica)
  - Comparabilidad entre niveles/instrumentos

## 5) Metodología (qué se hizo y cómo)
### 5.1 Diseño del instrumento
- **Modelo de competencias** y dimensiones.
- **Instrumentos por nivel** (C1, A1, D1…): qué cambia y por qué.
- **Escalas**:
  - Puntuación base (1–5)
  - Conversión a porcentaje (0–100) y fórmula
  - Ponderación auto vs jefe (actual) y simulaciones (si aplica)

### 5.2 Proceso de evaluación
- Calendario y ventanas (autoevaluación / evaluación jefe / cierres).
- Reglas operativas (roles, asignaciones, excepciones).

### 5.3 Preparación y calidad de datos (Data QA)
- Controles mínimos:
  - Duplicados (por colaborador/periodo)
  - Inconsistencias de asignación jefe–colaborador
  - Completitud de respuestas
  - Outliers / valores fuera de rango
- Resultado: tabla breve con conteos (ej. total, válidos, excluidos y motivo).

## 6) Resultados organizacionales (Sección “foto global”)
**Dashboard sugerido**: `src/pages/analisis/ResultadosGlobales.tsx`
- Promedio, mediana, desviación estándar.
- Distribución por tramos (excelente / muy bueno / satisfactorio / …).
- Interpretación de dispersión (conclusión ejecutiva).
- Brecha auto vs jefe (global): magnitud y lectura.

## 7) Resultados por dimensión (competencias)
**Dashboard sugerido**: `src/pages/analisis/AnalisisPorDimension.tsx`
- Top dimensiones (fortalezas) y bottom (críticas).
- Consolidación de dimensiones (si aplica): explicar mapeo a macro-categorías.
- Recomendaciones por dimensión:
  - Acciones (capacitación, rediseño de proceso, coaching)
  - Indicadores de seguimiento (KPI sugerido)

## 8) Resultados por nivel jerárquico
**Dashboard sugerido**: `src/pages/analisis/AnalisisPorNivel.tsx`
- Comparación entre niveles (promedio y dispersión).
- Riesgos típicos:
  - Sesgo por nivel
  - Instrumentos no comparables (si aplica)
- Recomendaciones de gestión (calibración, capacitación evaluadores).

## 9) Resultados por dirección/unidad (ranking y variabilidad)
**Dashboard sugerido**: `src/pages/analisis/AnalisisPorDireccion.tsx`
- Ranking de direcciones (promedio, n, dispersión).
- Identificar direcciones con:
  - Alto desempeño consistente
  - Alta variabilidad (posible inconsistencia de criterios)
  - Baja participación o cobertura incompleta

## 10) Brechas auto vs jefe (profundización)
**Dashboards sugeridos**:
- `src/pages/analisis/ComparativaAutoJefe.tsx`
- `src/pages/analisis/AnalisisBrechasAutoJefe.tsx`
- `src/pages/analisis/AnalisisBrechasDimension.tsx`

Incluir:
- **Brecha media** (puntos) y distribución.
- **Correlación** (Pearson) e interpretación.
- **Significancia** (t-test pareado) y lectura *práctica*.
- Nota: si hay múltiples comparaciones por dimensión, declarar criterio (p<0.05, corrección si se aplica).

## 11) Potencial y 9-Box (talento)
**Dashboard sugerido**: `src/pages/analisis/AnalisisPotencial.tsx`
- Distribución 9-box (definición de cuadrantes).
- Identificación de “talento clave” (criterio).
- Recomendaciones: sucesión, retención, movilidad, PDI.

## 12) Equidad y segmentación (brechas)
**Dashboards sugeridos**:
- `src/pages/analisis/AnalisisEquidad.tsx`
- `src/pages/analisis/AnalisisDemografico.tsx`
- `src/pages/analisis/AnalisisPorRenglon.tsx`

Incluir:
- Brechas por género/edad/antigüedad/tipo de puesto/renglón.
- Lectura de equidad: dónde hay diferencias relevantes y posibles causas.
- Recomendaciones: políticas, calibración, revisión de criterios.

## 13) Capacitación (necesidades y priorización)
**Dashboard sugerido**: `src/pages/analisis/AnalisisCapacitacion.tsx`
- Top temas/competencias a desarrollar (por nivel y dirección).
- Matriz de priorización: impacto vs urgencia.
- Plan anual sugerido:
  - Programas transversales
  - Programas por rol/nivel
  - Evaluación post-capacitación (Kirkpatrick / indicadores)

## 14) Planes de desarrollo (PDI)
**Dashboard sugerido**: `src/pages/analisis/AnalisisPlanesDesarrollo.tsx`
- Cobertura de PDI (cuántos generados vs esperados).
- Temas repetidos / causas raíz.
- Recomendaciones de gobernanza del PDI (cadencia, responsables, seguimiento).

## 15) Recomendaciones y plan de mejora (roadmap)
Estructura recomendada (tabla):
- **Recomendación**
- **Problema que resuelve**
- **Impacto esperado**
- **Esfuerzo** (bajo/medio/alto)
- **Responsable** (RRHH / Dirección / TI)
- **Plazo** (30/60/90 días)
- **Indicador/KPI**

## 16) Gobierno, sostenibilidad y operación
- RACI (RRHH, direcciones, jefes).
- Cadencia anual (preparación, ejecución, calibración, cierre).
- Auditoría y trazabilidad (qué se guarda y por cuánto).
- Gestión del cambio: comunicación, capacitación de evaluadores, soporte.

## 17) Cumplimiento, confidencialidad y resguardo de información (Municipalidad)
- **Clasificación de información**: qué datos son sensibles (DPI, evaluaciones, comentarios).
- **Acceso**: roles autorizados para ver resultados completos (RRHH/Gerencia).
- **Resguardo**: dónde se almacenan los datos, backups y control de versiones del informe.
- **Trazabilidad**: bitácora de cambios del informe y del dataset.
- **Recomendación mínima**: mantener los dashboards públicos solo en entorno local y controlar el acceso en ambientes reales.

## 18) Anexos (técnicos)
### 16.1 Glosario
- Definiciones (promedio, mediana, desviación, percentiles, 9-box, eNPS, etc.)

### 16.2 Diccionario de datos (mínimo)
- `users`, `evaluations`, `final_evaluation_results`, `evaluation_periods`
- Campos clave y reglas.

### 16.3 Fórmulas y reglas (auditable)
- Conversión 1–5 a % (0–100)
- Definición de “brecha” (Auto − Jefe o Jefe − Auto) por dashboard
- Tratamiento de múltiples evaluadores
- Umbrales usados (ej. excelencia ≥90%, brecha significativa, etc.)

### 16.4 Evidencia
- Capturas de dashboards (con fecha/hora).
- Tablas exportadas (si aplica).
 - Registro de extracción (quién, cuándo, desde qué período).


