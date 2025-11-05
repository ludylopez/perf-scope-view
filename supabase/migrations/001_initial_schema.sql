-- Schema SQL para Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- Tabla de períodos de evaluación
CREATE TABLE IF NOT EXISTS evaluation_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_fin TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_cierre_autoevaluacion TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_cierre_evaluacion_jefe TIMESTAMP WITH TIME ZONE NOT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'planificado',
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de usuarios (extendida)
CREATE TABLE IF NOT EXISTS users (
  dpi VARCHAR(20) PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  apellidos VARCHAR(255) NOT NULL,
  fecha_nacimiento VARCHAR(10) NOT NULL,
  correo VARCHAR(255),
  telefono VARCHAR(20),
  nivel VARCHAR(10) NOT NULL,
  cargo VARCHAR(255) NOT NULL,
  area VARCHAR(255) NOT NULL,
  jefe_inmediato_id VARCHAR(20) REFERENCES users(dpi),
  rol VARCHAR(50) NOT NULL DEFAULT 'colaborador',
  estado VARCHAR(20) NOT NULL DEFAULT 'activo',
  primer_ingreso BOOLEAN DEFAULT true,
  instrumento_id VARCHAR(50), -- Override manual del instrumento
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de grupos/cuadrillas (debe crearse antes de user_assignments)
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  jefe_id VARCHAR(20) NOT NULL REFERENCES users(dpi),
  tipo VARCHAR(50) NOT NULL DEFAULT 'equipo',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de asignaciones colaborador-jefe
CREATE TABLE IF NOT EXISTS user_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id VARCHAR(20) NOT NULL REFERENCES users(dpi),
  jefe_id VARCHAR(20) NOT NULL REFERENCES users(dpi),
  grupo_id UUID REFERENCES groups(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(colaborador_id, jefe_id, grupo_id)
);

-- Tabla de miembros de grupos
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  colaborador_id VARCHAR(20) NOT NULL REFERENCES users(dpi),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(grupo_id, colaborador_id)
);

-- Tabla de evaluaciones
CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id VARCHAR(20) NOT NULL REFERENCES users(dpi),
  periodo_id UUID NOT NULL REFERENCES evaluation_periods(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('auto', 'jefe')),
  evaluador_id VARCHAR(20) REFERENCES users(dpi), -- Solo para tipo 'jefe'
  colaborador_id VARCHAR(20) REFERENCES users(dpi), -- Solo para tipo 'jefe'
  responses JSONB NOT NULL DEFAULT '{}',
  comments JSONB NOT NULL DEFAULT '{}',
  evaluacion_potencial JSONB, -- Solo para tipo 'jefe'
  estado VARCHAR(20) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'enviado')),
  progreso INTEGER DEFAULT 0,
  fecha_ultima_modificacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_envio TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de preguntas abiertas
CREATE TABLE IF NOT EXISTS open_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pregunta TEXT NOT NULL UNIQUE,
  tipo VARCHAR(50) NOT NULL DEFAULT 'otro',
  orden INTEGER NOT NULL,
  obligatoria BOOLEAN DEFAULT true,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de respuestas a preguntas abiertas
CREATE TABLE IF NOT EXISTS open_question_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  pregunta_id UUID NOT NULL REFERENCES open_questions(id),
  respuesta TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(evaluacion_id, pregunta_id)
);

-- Tabla de resultados finales
CREATE TABLE IF NOT EXISTS final_evaluation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id VARCHAR(20) NOT NULL REFERENCES users(dpi),
  periodo_id UUID NOT NULL REFERENCES evaluation_periods(id),
  autoevaluacion_id UUID NOT NULL REFERENCES evaluations(id),
  evaluacion_jefe_id UUID NOT NULL REFERENCES evaluations(id),
  resultado_final JSONB NOT NULL,
  comparativo JSONB NOT NULL,
  plan_desarrollo_id UUID,
  fecha_generacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(colaborador_id, periodo_id)
);

-- Tabla de planes de desarrollo
CREATE TABLE IF NOT EXISTS development_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id UUID NOT NULL REFERENCES evaluations(id),
  colaborador_id VARCHAR(20) NOT NULL REFERENCES users(dpi),
  periodo_id UUID NOT NULL REFERENCES evaluation_periods(id),
  competencias_desarrollar JSONB NOT NULL,
  feedback_individual TEXT,
  feedback_grupal TEXT,
  editable BOOLEAN DEFAULT true,
  editado_por VARCHAR(20) REFERENCES users(dpi),
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_modificacion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_evaluations_usuario_periodo ON evaluations(usuario_id, periodo_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_tipo ON evaluations(tipo);
CREATE INDEX IF NOT EXISTS idx_evaluations_estado ON evaluations(estado);
CREATE INDEX IF NOT EXISTS idx_user_assignments_colaborador ON user_assignments(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_user_assignments_jefe ON user_assignments(jefe_id);
CREATE INDEX IF NOT EXISTS idx_groups_jefe ON groups(jefe_id);
CREATE INDEX IF NOT EXISTS idx_group_members_grupo ON group_members(grupo_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_periods_estado ON evaluation_periods(estado);
CREATE INDEX IF NOT EXISTS idx_final_results_colaborador_periodo ON final_evaluation_results(colaborador_id, periodo_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluation_periods_updated_at BEFORE UPDATE ON evaluation_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_assignments_updated_at BEFORE UPDATE ON user_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_development_plans_updated_at BEFORE UPDATE ON development_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para detectar automáticamente el rol de jefe
CREATE OR REPLACE FUNCTION update_user_role_from_assignments()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el usuario tiene asignaciones como jefe, actualizar su rol
  IF EXISTS (
    SELECT 1 FROM user_assignments 
    WHERE jefe_id = NEW.jefe_id AND activo = true
  ) THEN
    UPDATE users SET rol = 'jefe' WHERE dpi = NEW.jefe_id AND rol != 'admin_rrhh' AND rol != 'admin_general';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_role_on_assignment AFTER INSERT OR UPDATE ON user_assignments
  FOR EACH ROW EXECUTE FUNCTION update_user_role_from_assignments();

-- Insertar preguntas abiertas por defecto
INSERT INTO open_questions (pregunta, tipo, orden, obligatoria) VALUES
  ('¿Qué capacitaciones considera necesarias para mejorar su desempeño en el puesto?', 'capacitacion', 1, true),
  ('¿Qué herramientas, recursos o mejoras considera necesarias para desempeñar mejor su trabajo?', 'herramienta', 2, true)
ON CONFLICT (pregunta) DO NOTHING;

