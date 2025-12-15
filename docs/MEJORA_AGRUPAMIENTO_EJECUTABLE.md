# Mejora: Agrupamiento Inteligente para Planes Ejecutables

## Problema Identificado

El usuario necesita que los planes de capacitación sean **ejecutables** y no tengan un tema de capacitación por cada colaborador, ya que eso entorpecería la ejecución práctica.

**Ejemplo del problema:**
- Si hay 20 colaboradores, no queremos 20 capacitaciones individuales
- Queremos agrupar colaboradores con necesidades similares en capacitaciones grupales ejecutables
- Ejemplo deseado: "Capacitación en Normativa y Seguridad para Analistas de nivel A1 (5 personas)"

## Solución Implementada

### 1. Mejoras en el System Prompt

**Agregado enfoque de ejecutabilidad:**
```
- Debe ser EJECUTABLE: cada temática debe poder ejecutarse como capacitación grupal, NO individual
- PRIORIZA agrupar tópicos que comparten niveles y cargos similares para crear grupos ejecutables
- EVITA crear temáticas con solo 1-2 participantes - busca agrupar con tópicos relacionados
- El objetivo es tener 5-10 temáticas ejecutables con grupos de participantes, no 50 capacitaciones individuales
```

### 2. Mejoras en Instrucciones de Agrupamiento

**Instrucciones específicas para agrupamiento inteligente:**
```
1. ANÁLISIS Y AGRUPAMIENTO INTELIGENTE (CRÍTICO PARA EJECUTABILIDAD):
   - OBJETIVO: Crear temáticas que puedan ejecutarse como capacitaciones grupales, NO individuales
   - PRIORIZA agrupar tópicos que comparten niveles/cargos similares para facilitar la ejecución grupal
   - Al agrupar tópicos, calcula la frecuencia combinada basándote en colaboradores ÚNICOS
   - IMPORTANTE: Al agrupar tópicos, calcula la frecuencia combinada basándote en colaboradores ÚNICOS, no sumes frecuencias
```

### 3. Instrucciones Específicas para Participantes

**Nuevas reglas para determinar participantes:**
```
PARTICIPANTES (CRÍTICO PARA EJECUTABILIDAD):
  * Al agrupar tópicos en una temática, identifica el conjunto ÚNICO de colaboradores que necesitan CUALQUIERA de los tópicos agrupados
  * Calcula la frecuencia combinada basándote en colaboradores únicos, no en suma de frecuencias individuales
  * Usa la información de niveles y cargos de TODOS los tópicos agrupados para describir los participantes
  * Ejemplos de descripción de participantes:
    - 'Analistas y Asistentes de nivel A1 (5 personas)' - cuando agrupas tópicos que comparten niveles/cargos
    - 'Personal de nivel A1 y A2 con cargo Administrativo (8 personas)' - cuando agrupas por categoría de puesto
    - 'Todo el equipo completo (12 personas)' - SOLO si la frecuencia combinada es >= 80% del equipo total
  * EVITA crear temáticas con solo 1-2 participantes - agrupa inteligentemente para crear grupos ejecutables (mínimo 3-4 personas)
  * Si un tópico tiene muy pocos participantes (< 3), busca agruparlo con tópicos relacionados que compartan niveles/cargos similares
```

## Cómo Funciona Ahora

### Proceso de Agrupamiento

1. **La IA recibe tópicos individuales** con información de:
   - Frecuencia (cuántos colaboradores lo necesitan)
   - Niveles específicos que lo necesitan
   - Cargos específicos que lo necesitan
   - Categorías de puesto

2. **La IA agrupa tópicos similares** considerando:
   - Relación semántica (temas relacionados)
   - Niveles y cargos compartidos (para facilitar agrupamiento)
   - Frecuencia combinada (colaboradores únicos)

3. **La IA crea temáticas consolidadas** que:
   - Agrupan múltiples tópicos relacionados
   - Tienen grupos de participantes ejecutables (mínimo 3-4 personas)
   - Pueden ejecutarse como capacitaciones grupales

### Ejemplo de Agrupamiento Inteligente

**Antes (problemático):**
```
- Tópico 1: "Normativa Municipal" (2 personas: Analistas A1)
- Tópico 2: "Seguridad Vial" (1 persona: Analista A1)
- Tópico 3: "Ley de Tránsito" (1 persona: Coordinador A2)
→ Resultado: 3 capacitaciones individuales (no ejecutable)
```

**Después (mejorado):**
```
Temática: "Normativa y Seguridad"
  - Agrupa: "Normativa Municipal" + "Seguridad Vial" + "Ley de Tránsito"
  - Participantes: "Analistas de nivel A1 y Coordinadores de nivel A2 (4 personas)"
  - Frecuencia combinada: 4 colaboradores únicos (no suma de 2+1+1)
  - Ejecutable: Capacitación grupal para 4 personas
```

## Beneficios

✅ **Ejecutabilidad**: Los planes pueden ejecutarse como capacitaciones grupales
✅ **Eficiencia**: Menos capacitaciones individuales, más grupales
✅ **Agrupamiento inteligente**: Colaboradores con necesidades similares se agrupan
✅ **Precisión**: Frecuencia combinada calculada correctamente (colaboradores únicos)
✅ **Especificidad**: Participantes claramente identificados por niveles y cargos

## Archivos Modificados

1. `supabase/functions/generate-training-plan/index.ts`
   - Líneas 86-95: Agregado enfoque de ejecutabilidad al system prompt
   - Líneas 398-410: Mejoras en instrucciones de agrupamiento inteligente
   - Líneas 412-430: Instrucciones específicas para participantes ejecutables

## Resultado Esperado

Con estas mejoras, los planes de capacitación ahora:

1. ✅ Agrupan colaboradores con necesidades similares en temáticas consolidadas
2. ✅ Crean capacitaciones grupales ejecutables (mínimo 3-4 participantes)
3. ✅ Evitan tener una capacitación por cada colaborador individual
4. ✅ Calculan correctamente la frecuencia combinada al agrupar tópicos
5. ✅ Especifican claramente quién participa en cada capacitación

## Notas Técnicas

- La IA ahora tiene instrucciones explícitas para evitar crear temáticas con solo 1-2 participantes
- Se enfatiza el agrupamiento por niveles y cargos compartidos para facilitar la ejecución
- El cálculo de frecuencia combinada se basa en colaboradores únicos, no en suma de frecuencias
- El objetivo es tener 5-10 temáticas ejecutables en lugar de muchas capacitaciones individuales



