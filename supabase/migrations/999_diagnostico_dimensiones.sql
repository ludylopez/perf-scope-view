-- CONSULTA DE DIAGNÓSTICO - NO EJECUTAR EN PRODUCCIÓN
-- Esta consulta te ayuda a verificar si calcular_dimensiones_colaborador funciona

-- 1. Verificar que existe la función
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'calcular_dimensiones_colaborador',
  'get_jerarquia_con_dimensiones',
  'get_jerarquia_directa_con_dimensiones'
);

-- 2. Probar la función con un colaborador específico
-- Reemplaza '1234567890101' con un DPI real de un colaborador con evaluación completada
-- Reemplaza el UUID con el periodo_id actual
SELECT calcular_dimensiones_colaborador(
  '1234567890101'::varchar,
  'tu-periodo-uuid-aqui'::uuid
);

-- 3. Ver un ejemplo de los responses de una evaluación para verificar el formato de las claves
SELECT
  e.id,
  e.evaluator_id,
  e.colaborador_id,
  e.tipo,
  jsonb_object_keys(e.responses) as keys
FROM evaluations e
WHERE e.status = 'completado'
LIMIT 20;

-- 4. Verificar estructura de responses para una evaluación específica
SELECT
  e.id,
  e.tipo,
  e.responses
FROM evaluations e
WHERE e.status = 'completado'
LIMIT 1;

-- 5. Probar el cálculo completo con get_jerarquia_directa_con_dimensiones
-- Reemplaza con los valores reales
SELECT get_jerarquia_directa_con_dimensiones(
  '1234567890101'::varchar,
  'tu-periodo-uuid-aqui'::uuid
);
