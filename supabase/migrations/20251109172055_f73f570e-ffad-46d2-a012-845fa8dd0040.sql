-- Ensure fecha_nacimiento has exactly 8 digits (DDMMAAAA)
create or replace function public.validate_users_fecha_nacimiento_format()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Normalize by removing any non-digits
  if new.fecha_nacimiento is not null then
    new.fecha_nacimiento := regexp_replace(new.fecha_nacimiento, '\\D', '', 'g');
  end if;

  -- Must be exactly 8 digits (DDMMAAAA)
  if new.fecha_nacimiento is null or new.fecha_nacimiento !~ '^\\d{8}$' then
    raise exception 'La columna fecha_nacimiento debe tener exactamente 8 dígitos en formato DDMMAAAA';
  end if;

  return new;
end;
$$;

-- Create trigger to validate on insert/update
 drop trigger if exists trg_validate_users_fecha_nacimiento on public.users;
create trigger trg_validate_users_fecha_nacimiento
before insert or update on public.users
for each row execute function public.validate_users_fecha_nacimiento_format();