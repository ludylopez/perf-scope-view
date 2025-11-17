-- Migración: Crear tabla para trackear uso de OpenAI API
-- Permite medir consumo de créditos de forma precisa y persistente

-- Tabla para logs de llamadas a OpenAI API
CREATE TABLE IF NOT EXISTS openai_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Información de la llamada
  function_name TEXT NOT NULL, -- generate-development-plan, generate-feedback-grupal, etc.
  model_used TEXT DEFAULT 'gpt-4o-mini', -- Modelo de OpenAI usado

  -- Información del colaborador (opcional, para análisis)
  colaborador_id TEXT, -- DPI del colaborador
  periodo_id UUID, -- Referencia al período

  -- Estadísticas de la llamada
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')), -- Estado de la llamada

  -- Tokens consumidos (datos reales de OpenAI)
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,

  -- Información de error (si falló)
  error_message TEXT,
  error_code TEXT,

  -- Metadata adicional
  request_duration_ms INTEGER, -- Duración de la llamada en milisegundos
  user_agent TEXT, -- Usuario/navegador que inició la llamada (si aplica)

  -- Índices para búsquedas rápidas
  CONSTRAINT fk_periodo FOREIGN KEY (periodo_id) REFERENCES evaluation_periods(id) ON DELETE CASCADE
);

-- Índices para optimizar consultas
CREATE INDEX idx_openai_logs_created_at ON openai_api_logs(created_at DESC);
CREATE INDEX idx_openai_logs_function ON openai_api_logs(function_name);
CREATE INDEX idx_openai_logs_periodo ON openai_api_logs(periodo_id);
CREATE INDEX idx_openai_logs_status ON openai_api_logs(status);
CREATE INDEX idx_openai_logs_colaborador ON openai_api_logs(colaborador_id);

COMMENT ON TABLE openai_api_logs IS 'Registro de todas las llamadas a la API de OpenAI para tracking de consumo y costos';
COMMENT ON COLUMN openai_api_logs.function_name IS 'Nombre de la Edge Function que realizó la llamada';
COMMENT ON COLUMN openai_api_logs.total_tokens IS 'Total de tokens consumidos (prompt + completion) según respuesta de OpenAI';
COMMENT ON COLUMN openai_api_logs.status IS 'Estado de la llamada: success (exitosa), failed (falló), pending (en proceso)';

-- Función para obtener estadísticas agregadas de uso de API
CREATE OR REPLACE FUNCTION get_openai_usage_stats(
  periodo_id_param UUID DEFAULT NULL,
  fecha_inicio_param TIMESTAMP DEFAULT NULL,
  fecha_fin_param TIMESTAMP DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
  total_llamadas INTEGER;
  llamadas_exitosas INTEGER;
  llamadas_fallidas INTEGER;
  total_tokens_consumidos BIGINT;
  total_prompt_tokens BIGINT;
  total_completion_tokens BIGINT;
  costo_estimado NUMERIC;
  ultima_llamada TIMESTAMP;
  promedio_tokens_por_llamada NUMERIC;
  llamadas_por_funcion JSONB;
BEGIN
  -- Construir WHERE clause dinámicamente
  WITH filtered_logs AS (
    SELECT *
    FROM openai_api_logs
    WHERE
      (periodo_id_param IS NULL OR periodo_id = periodo_id_param)
      AND (fecha_inicio_param IS NULL OR created_at >= fecha_inicio_param)
      AND (fecha_fin_param IS NULL OR created_at <= fecha_fin_param)
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'success'),
    COUNT(*) FILTER (WHERE status = 'failed'),
    COALESCE(SUM(total_tokens), 0),
    COALESCE(SUM(prompt_tokens), 0),
    COALESCE(SUM(completion_tokens), 0),
    MAX(created_at)
  INTO
    total_llamadas,
    llamadas_exitosas,
    llamadas_fallidas,
    total_tokens_consumidos,
    total_prompt_tokens,
    total_completion_tokens,
    ultima_llamada
  FROM filtered_logs;

  -- Calcular costo estimado (basado en precios de gpt-4o-mini)
  -- Precios: $0.150 por 1M tokens de entrada, $0.600 por 1M tokens de salida
  costo_estimado :=
    (total_prompt_tokens::NUMERIC / 1000000.0 * 0.150) +
    (total_completion_tokens::NUMERIC / 1000000.0 * 0.600);

  -- Promedio de tokens por llamada
  promedio_tokens_por_llamada := CASE
    WHEN total_llamadas > 0 THEN total_tokens_consumidos::NUMERIC / total_llamadas::NUMERIC
    ELSE 0
  END;

  -- Estadísticas por función
  WITH filtered_logs AS (
    SELECT *
    FROM openai_api_logs
    WHERE
      (periodo_id_param IS NULL OR periodo_id = periodo_id_param)
      AND (fecha_inicio_param IS NULL OR created_at >= fecha_inicio_param)
      AND (fecha_fin_param IS NULL OR created_at <= fecha_fin_param)
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'funcion', function_name,
      'llamadas', count,
      'tokens', total_tokens,
      'exitosas', exitosas,
      'fallidas', fallidas
    )
  ) INTO llamadas_por_funcion
  FROM (
    SELECT
      function_name,
      COUNT(*) as count,
      COALESCE(SUM(total_tokens), 0) as total_tokens,
      COUNT(*) FILTER (WHERE status = 'success') as exitosas,
      COUNT(*) FILTER (WHERE status = 'failed') as fallidas
    FROM filtered_logs
    GROUP BY function_name
    ORDER BY COUNT(*) DESC
  ) stats_por_funcion;

  -- Construir objeto JSONB con todas las estadísticas
  SELECT jsonb_build_object(
    'totalLlamadas', total_llamadas,
    'llamadasExitosas', llamadas_exitosas,
    'llamadasFallidas', llamadas_fallidas,
    'totalTokens', total_tokens_consumidos,
    'promptTokens', total_prompt_tokens,
    'completionTokens', total_completion_tokens,
    'costoEstimadoUSD', ROUND(costo_estimado, 4),
    'promedioTokensPorLlamada', ROUND(promedio_tokens_por_llamada, 0),
    'ultimaLlamada', ultima_llamada,
    'tasaExito', CASE
      WHEN total_llamadas > 0 THEN ROUND((llamadas_exitosas::NUMERIC / total_llamadas::NUMERIC) * 100, 2)
      ELSE 0
    END,
    'llamadasPorFuncion', COALESCE(llamadas_por_funcion, '[]'::jsonb)
  ) INTO stats;

  RETURN stats;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_openai_usage_stats(UUID, TIMESTAMP, TIMESTAMP) IS
'Obtiene estadísticas agregadas de uso de la API de OpenAI.
Parámetros opcionales permiten filtrar por período y rango de fechas.
Retorna: llamadas totales/exitosas/fallidas, tokens consumidos, costo estimado, y estadísticas por función.';

-- Función auxiliar para registrar llamadas a OpenAI desde Edge Functions
-- Esta función se llamará desde las Edge Functions de Deno
CREATE OR REPLACE FUNCTION log_openai_api_call(
  function_name_param TEXT,
  model_used_param TEXT DEFAULT 'gpt-4o-mini',
  colaborador_id_param TEXT DEFAULT NULL,
  periodo_id_param UUID DEFAULT NULL,
  status_param TEXT DEFAULT 'pending',
  prompt_tokens_param INTEGER DEFAULT 0,
  completion_tokens_param INTEGER DEFAULT 0,
  total_tokens_param INTEGER DEFAULT 0,
  error_message_param TEXT DEFAULT NULL,
  error_code_param TEXT DEFAULT NULL,
  request_duration_ms_param INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO openai_api_logs (
    function_name,
    model_used,
    colaborador_id,
    periodo_id,
    status,
    prompt_tokens,
    completion_tokens,
    total_tokens,
    error_message,
    error_code,
    request_duration_ms
  ) VALUES (
    function_name_param,
    model_used_param,
    colaborador_id_param,
    periodo_id_param,
    status_param,
    prompt_tokens_param,
    completion_tokens_param,
    total_tokens_param,
    error_message_param,
    error_code_param,
    request_duration_ms_param
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_openai_api_call IS 'Registra una llamada a la API de OpenAI desde Edge Functions. Retorna el ID del log creado.';
