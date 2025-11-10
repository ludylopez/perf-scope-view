-- Ampliar users.dpi de varchar(10) a varchar(20) para soportar DPIs completos
-- Necesitamos eliminar políticas RLS que dependen de esta columna, cambiar el tipo, y recrearlas
BEGIN;

-- Drop políticas RLS que dependen de users.dpi en job_levels
DROP POLICY IF EXISTS "Solo admins pueden ver niveles inactivos" ON public.job_levels;
DROP POLICY IF EXISTS "Solo admins pueden insertar niveles" ON public.job_levels;
DROP POLICY IF EXISTS "Solo admins pueden actualizar niveles" ON public.job_levels;
DROP POLICY IF EXISTS "Solo admin_general puede eliminar niveles" ON public.job_levels;

-- Alter column type
ALTER TABLE public.users
ALTER COLUMN dpi TYPE varchar(20);

-- Recreate políticas RLS para job_levels
CREATE POLICY "Solo admins pueden ver niveles inactivos"
ON public.job_levels
FOR SELECT
TO public
USING (
  is_active = false 
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.dpi::text = (current_setting('request.jwt.claims', true)::json->>'dpi')::text
    AND users.rol IN ('admin_rrhh', 'admin_general')
  )
);

CREATE POLICY "Solo admins pueden insertar niveles"
ON public.job_levels
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.dpi::text = (current_setting('request.jwt.claims', true)::json->>'dpi')::text
    AND users.rol IN ('admin_rrhh', 'admin_general')
  )
);

CREATE POLICY "Solo admins pueden actualizar niveles"
ON public.job_levels
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.dpi::text = (current_setting('request.jwt.claims', true)::json->>'dpi')::text
    AND users.rol IN ('admin_rrhh', 'admin_general')
  )
);

CREATE POLICY "Solo admin_general puede eliminar niveles"
ON public.job_levels
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.dpi::text = (current_setting('request.jwt.claims', true)::json->>'dpi')::text
    AND users.rol = 'admin_general'
  )
);

COMMIT;