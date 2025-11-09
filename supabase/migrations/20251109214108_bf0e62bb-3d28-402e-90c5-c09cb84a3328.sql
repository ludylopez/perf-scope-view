-- Ampliar users.nivel de varchar(20) a varchar(50) para soportar nombres de nivel largos
BEGIN;

-- Drop dependent trigger
DROP TRIGGER IF EXISTS trigger_sync_tipo_puesto ON public.users;

-- Alter column type
ALTER TABLE public.users
ALTER COLUMN nivel TYPE varchar(50);

-- Recreate trigger as it was
CREATE TRIGGER trigger_sync_tipo_puesto
AFTER INSERT OR UPDATE OF nivel ON public.users
FOR EACH ROW
WHEN (NEW.nivel IS NOT NULL)
EXECUTE FUNCTION public.sync_tipo_puesto_from_job_level();

COMMIT;