
-- Actualizar rol de Alberto Peralta a admin_rrhh para acceso a administración
UPDATE users 
SET rol = 'admin_rrhh'
WHERE dpi = '1982235442007';
