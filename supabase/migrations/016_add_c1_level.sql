-- Migración 016: Agregar Nivel C1 (Concejo Municipal)
-- Esta migración agrega el nivel C1 al catálogo de niveles de puesto
-- El Concejo Municipal se autoevalúa solo en desempeño, sin evaluación de potencial

-- ============================================================
-- 1. INSERTAR NIVEL C1
-- ============================================================

INSERT INTO job_levels (code, name, hierarchical_order, category, is_active) 
VALUES ('C1', 'CONCEJO MUNICIPAL', 0.9, 'administrativo', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  hierarchical_order = EXCLUDED.hierarchical_order,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active;

-- Comentarios descriptivos
COMMENT ON TABLE job_levels IS 'Catálogo de niveles de puesto con jerarquía organizacional. Incluye C1 (Concejo Municipal) que se autoevalúa solo en desempeño.';

-- Comentario específico para C1
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM job_levels WHERE code = 'C1') THEN
    EXECUTE format('COMMENT ON COLUMN job_levels.code IS %L', 
      'Código único del nivel (C1=Concejo Municipal, A1=Alcalde, A2=Asesoría, S2=Secretario, D1=Direcciones I, D2=Direcciones II, E1=E1, E2=E2, A3=Administrativos I, A4=Administrativos II, OTE=Operativos Técnico Especializado, O1=Operativos I, O2=Operativos II, OS=Otros Servicios)');
  END IF;
END $$;

-- Verificar que el nivel se insertó correctamente
DO $$
DECLARE
  v_c1_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM job_levels WHERE code = 'C1') INTO v_c1_exists;
  
  IF NOT v_c1_exists THEN
    RAISE EXCEPTION 'Error: No se pudo insertar el nivel C1';
  ELSE
    RAISE NOTICE 'Nivel C1 (CONCEJO MUNICIPAL) agregado exitosamente con hierarchical_order 0.9';
  END IF;
END $$;

