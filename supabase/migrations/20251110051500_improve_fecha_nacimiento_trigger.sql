-- Normalizar y reforzar validación de fecha_nacimiento en users
-- Se mantiene el trigger existente, solo se actualiza la función

create or replace function public.validate_users_fecha_nacimiento_format()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.fecha_nacimiento is not null then
    new.fecha_nacimiento := regexp_replace(coalesce(new.fecha_nacimiento::text, ''), '\D', '', 'g');

    if char_length(new.fecha_nacimiento) = 7 then
      new.fecha_nacimiento := lpad(new.fecha_nacimiento, 8, '0');
    end if;
  end if;

  if new.fecha_nacimiento is null
     or new.fecha_nacimiento = ''
     or char_length(new.fecha_nacimiento) <> 8 then
    raise exception 'La columna fecha_nacimiento debe tener exactamente 8 dígitos en formato DDMMAAAA. Valor recibido: "%"', coalesce(new.fecha_nacimiento, 'NULL');
  end if;

  return new;
end;
$$;

