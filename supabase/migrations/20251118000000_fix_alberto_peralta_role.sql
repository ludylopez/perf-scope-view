-- Corregir rol de Alberto Peralta: De admin_rrhh a jefe (como los demás del Concejo C1)
-- Alberto Peralta es miembro del Concejo Municipal (C1) y debe tener el mismo rol que los demás
UPDATE users 
SET rol = 'jefe'
WHERE dpi = '1982235442007' AND nivel = 'C1';

-- Comentario: Los miembros del Concejo (C1) deben tener rol 'jefe', no 'admin_rrhh'
-- El rol 'admin_rrhh' es exclusivo para administradores de RRHH, no para miembros del Concejo

