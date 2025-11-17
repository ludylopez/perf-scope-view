-- Script SQL para limpiar planes de desarrollo
-- Ejecuta este script en el SQL Editor de Supabase: https://supabase.com/dashboard

-- 1. Agregar columna generado_por_ia si no existe
ALTER TABLE development_plans ADD COLUMN IF NOT EXISTS generado_por_ia BOOLEAN DEFAULT false;

-- 2. Eliminar planes antiguos del colaborador 3385011422007, dejando solo el más reciente
DELETE FROM development_plans 
WHERE colaborador_id = '3385011422007' 
  AND id != '03018374-bfb7-473c-b00b-c8187fe88c34';

-- 3. Marcar el plan más reciente como generado por IA
UPDATE development_plans 
SET generado_por_ia = true 
WHERE id = '03018374-bfb7-473c-b00b-c8187fe88c34';

-- 4. Verificar resultado
SELECT 
  id, 
  colaborador_id, 
  periodo_id, 
  generado_por_ia, 
  created_at,
  CASE 
    WHEN competencias_desarrollar::jsonb ? 'objetivos' THEN 
      jsonb_array_length(competencias_desarrollar->'objetivos')
    ELSE 0
  END as num_objetivos,
  CASE 
    WHEN competencias_desarrollar::jsonb ? 'acciones' THEN 
      jsonb_array_length(competencias_desarrollar->'acciones')
    ELSE 0
  END as num_acciones
FROM development_plans 
WHERE colaborador_id = '3385011422007'
ORDER BY created_at DESC;





