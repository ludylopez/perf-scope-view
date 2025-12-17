-- Migración 031: Solución de Raíz - Trigger se ejecuta en ambos casos
-- 
-- Problema: El trigger solo se ejecutaba cuando tipo='jefe', por lo que cuando
-- el empleado se autoevaluaba después de que el jefe lo evaluó, no se calculaba el resultado.
--
-- Solución: Actualizar el trigger para que se ejecute también cuando tipo='auto'
-- La función handle_final_result_calculation() ya tenía el código para ambos casos,
-- solo faltaba que el trigger se activara.

-- Eliminar trigger antiguo
DROP TRIGGER IF EXISTS trigger_calculate_final_result ON evaluations;

-- Crear trigger que se ejecute en ambos casos
CREATE TRIGGER trigger_calculate_final_result
  AFTER UPDATE ON evaluations
  FOR EACH ROW
  WHEN (
    -- Se ejecuta cuando se envía evaluación del jefe O autoevaluación
    NEW.estado = 'enviado' 
    AND (OLD.estado IS NULL OR OLD.estado != 'enviado')
    AND (NEW.tipo = 'jefe' OR NEW.tipo = 'auto')
  )
  EXECUTE FUNCTION handle_final_result_calculation();

COMMENT ON TRIGGER trigger_calculate_final_result ON evaluations IS 
'Calcula automáticamente el resultado final cuando se envía una evaluación (jefe o autoevaluación).
Maneja ambos casos: cuando el jefe evalúa después de la autoevaluación y viceversa.';
