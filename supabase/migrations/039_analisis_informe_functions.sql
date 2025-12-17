-- =====================================================
-- MIGRACION 039: Funciones SQL para Analisis de Informe Final
-- =====================================================
-- Funciones para generar estadisticas y datos para el informe final
-- de evaluacion de desempeno municipal
-- =====================================================

-- =====================================================
-- 1. RESUMEN EJECUTIVO (Seccion 1 del Informe)
-- =====================================================
CREATE OR REPLACE FUNCTION get_resumen_ejecutivo(periodo_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    resultado JSONB;
    total_colaboradores INTEGER;
    total_evaluados INTEGER;
    promedio_desempeno NUMERIC;
    promedio_potencial NUMERIC;
BEGIN
    -- Total de colaboradores activos
    SELECT COUNT(*) INTO total_colaboradores
    FROM users
    WHERE estado = 'activo';

    -- Total de colaboradores evaluados en el periodo
    SELECT COUNT(DISTINCT colaborador_id) INTO total_evaluados
    FROM final_evaluation_results
    WHERE periodo_id = periodo_id_param;

    -- Promedio de desempeno global
    SELECT ROUND(AVG(desempeno_porcentaje)::NUMERIC, 2) INTO promedio_desempeno
    FROM final_evaluation_results
    WHERE periodo_id = periodo_id_param;

    -- Promedio de potencial global
    SELECT ROUND(AVG(potencial_porcentaje)::NUMERIC, 2) INTO promedio_potencial
    FROM final_evaluation_results
    WHERE periodo_id = periodo_id_param
    AND potencial_porcentaje IS NOT NULL;

    -- Construir resultado completo
    SELECT jsonb_build_object(
        'totalColaboradores', total_colaboradores,
        'totalEvaluados', total_evaluados,
        'tasaParticipacion', CASE WHEN total_colaboradores > 0
            THEN ROUND((total_evaluados::NUMERIC / total_colaboradores::NUMERIC) * 100, 2)
            ELSE 0 END,
        'promedioDesempeno', COALESCE(promedio_desempeno, 0),
        'promedioPotencial', COALESCE(promedio_potencial, 0),
        'participacionPorNivel', (
            SELECT COALESCE(jsonb_agg(nivel_data ORDER BY orden), '[]'::jsonb)
            FROM (
                SELECT
                    jl.code AS nivel,
                    jl.name AS nombre,
                    jl.category AS categoria,
                    jl.hierarchical_order AS orden,
                    COUNT(DISTINCT u.dpi) AS total,
                    COUNT(DISTINCT fer.colaborador_id) AS evaluados,
                    CASE WHEN COUNT(DISTINCT u.dpi) > 0
                        THEN ROUND((COUNT(DISTINCT fer.colaborador_id)::NUMERIC / COUNT(DISTINCT u.dpi)::NUMERIC) * 100, 2)
                        ELSE 0 END AS porcentaje
                FROM job_levels jl
                LEFT JOIN users u ON u.nivel = jl.code AND u.estado = 'activo'
                LEFT JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                WHERE jl.is_active = true
                GROUP BY jl.code, jl.name, jl.category, jl.hierarchical_order
            ) nivel_data
        ),
        'distribucion9Box', (
            SELECT COALESCE(jsonb_object_agg(posicion_9box, cantidad), '{}'::jsonb)
            FROM (
                SELECT
                    COALESCE(posicion_9box, 'sin_clasificar') AS posicion_9box,
                    COUNT(*) AS cantidad
                FROM final_evaluation_results
                WHERE periodo_id = periodo_id_param
                GROUP BY posicion_9box
            ) dist
        ),
        'evaluacionesPorTipo', (
            SELECT jsonb_build_object(
                'autoevaluaciones', (
                    SELECT COUNT(*) FROM evaluations
                    WHERE periodo_id = periodo_id_param AND tipo = 'auto' AND estado = 'enviado'
                ),
                'evaluacionesJefe', (
                    SELECT COUNT(*) FROM evaluations
                    WHERE periodo_id = periodo_id_param AND tipo = 'jefe' AND estado = 'enviado'
                )
            )
        )
    ) INTO resultado;

    RETURN resultado;
END;
$$;

-- =====================================================
-- 2. RESULTADOS GLOBALES (Seccion 3 del Informe)
-- =====================================================
CREATE OR REPLACE FUNCTION get_resultados_globales(periodo_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    resultado JSONB;
    scores NUMERIC[];
    promedio_auto NUMERIC;
    promedio_jefe NUMERIC;
BEGIN
    -- Obtener todos los scores de desempeno
    SELECT ARRAY_AGG(desempeno_porcentaje) INTO scores
    FROM final_evaluation_results
    WHERE periodo_id = periodo_id_param
    AND desempeno_porcentaje IS NOT NULL;

    -- Calcular promedios de auto y jefe para brecha
    SELECT
        ROUND(AVG(CASE WHEN e.tipo = 'auto' THEN
            (SELECT AVG(value::NUMERIC) FROM jsonb_each_text(e.responses) WHERE value ~ '^\d+\.?\d*$')
        END) * 20, 2),
        ROUND(AVG(CASE WHEN e.tipo = 'jefe' THEN
            (SELECT AVG(value::NUMERIC) FROM jsonb_each_text(e.responses) WHERE value ~ '^\d+\.?\d*$')
        END) * 20, 2)
    INTO promedio_auto, promedio_jefe
    FROM evaluations e
    WHERE e.periodo_id = periodo_id_param
    AND e.estado = 'enviado';

    SELECT jsonb_build_object(
        'promedioOrganizacional', (
            SELECT ROUND(AVG(desempeno_porcentaje)::NUMERIC, 2)
            FROM final_evaluation_results
            WHERE periodo_id = periodo_id_param
        ),
        'mediana', (
            SELECT ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY desempeno_porcentaje)::NUMERIC, 2)
            FROM final_evaluation_results
            WHERE periodo_id = periodo_id_param
        ),
        'desviacionEstandar', (
            SELECT ROUND(STDDEV(desempeno_porcentaje)::NUMERIC, 2)
            FROM final_evaluation_results
            WHERE periodo_id = periodo_id_param
        ),
        'minimo', (
            SELECT ROUND(MIN(desempeno_porcentaje)::NUMERIC, 2)
            FROM final_evaluation_results
            WHERE periodo_id = periodo_id_param
        ),
        'maximo', (
            SELECT ROUND(MAX(desempeno_porcentaje)::NUMERIC, 2)
            FROM final_evaluation_results
            WHERE periodo_id = periodo_id_param
        ),
        'distribucionCalificaciones', (
            SELECT jsonb_agg(jsonb_build_object(
                'categoria', categoria,
                'rango', rango,
                'rangoMin', rango_min,
                'rangoMax', rango_max,
                'cantidad', cantidad,
                'porcentaje', porcentaje,
                'color', color
            ) ORDER BY orden)
            FROM (
                SELECT
                    categoria,
                    rango,
                    rango_min,
                    rango_max,
                    orden,
                    color,
                    COUNT(*) AS cantidad,
                    ROUND((COUNT(*)::NUMERIC / NULLIF((SELECT COUNT(*) FROM final_evaluation_results WHERE periodo_id = periodo_id_param), 0)) * 100, 2) AS porcentaje
                FROM (
                    SELECT
                        fer.desempeno_porcentaje,
                        CASE
                            WHEN fer.desempeno_porcentaje >= 90 THEN 'excelente'
                            WHEN fer.desempeno_porcentaje >= 80 THEN 'muy_bueno'
                            WHEN fer.desempeno_porcentaje >= 70 THEN 'satisfactorio'
                            WHEN fer.desempeno_porcentaje >= 60 THEN 'necesita_mejorar'
                            ELSE 'insatisfactorio'
                        END AS categoria,
                        CASE
                            WHEN fer.desempeno_porcentaje >= 90 THEN '90-100%'
                            WHEN fer.desempeno_porcentaje >= 80 THEN '80-89%'
                            WHEN fer.desempeno_porcentaje >= 70 THEN '70-79%'
                            WHEN fer.desempeno_porcentaje >= 60 THEN '60-69%'
                            ELSE '<60%'
                        END AS rango,
                        CASE
                            WHEN fer.desempeno_porcentaje >= 90 THEN 90
                            WHEN fer.desempeno_porcentaje >= 80 THEN 80
                            WHEN fer.desempeno_porcentaje >= 70 THEN 70
                            WHEN fer.desempeno_porcentaje >= 60 THEN 60
                            ELSE 0
                        END AS rango_min,
                        CASE
                            WHEN fer.desempeno_porcentaje >= 90 THEN 100
                            WHEN fer.desempeno_porcentaje >= 80 THEN 89
                            WHEN fer.desempeno_porcentaje >= 70 THEN 79
                            WHEN fer.desempeno_porcentaje >= 60 THEN 69
                            ELSE 59
                        END AS rango_max,
                        CASE
                            WHEN fer.desempeno_porcentaje >= 90 THEN 1
                            WHEN fer.desempeno_porcentaje >= 80 THEN 2
                            WHEN fer.desempeno_porcentaje >= 70 THEN 3
                            WHEN fer.desempeno_porcentaje >= 60 THEN 4
                            ELSE 5
                        END AS orden,
                        CASE
                            WHEN fer.desempeno_porcentaje >= 90 THEN '#22c55e'
                            WHEN fer.desempeno_porcentaje >= 80 THEN '#84cc16'
                            WHEN fer.desempeno_porcentaje >= 70 THEN '#eab308'
                            WHEN fer.desempeno_porcentaje >= 60 THEN '#f97316'
                            ELSE '#ef4444'
                        END AS color
                    FROM final_evaluation_results fer
                    WHERE fer.periodo_id = periodo_id_param
                ) categorized
                GROUP BY categoria, rango, rango_min, rango_max, orden, color
            ) grouped
        ),
        'brechaAutoJefe', jsonb_build_object(
            'promedioAuto', COALESCE(promedio_auto, 0),
            'promedioJefe', COALESCE(promedio_jefe, 0),
            'diferencia', ROUND(COALESCE(promedio_auto, 0) - COALESCE(promedio_jefe, 0), 2),
            'interpretacion', CASE
                WHEN COALESCE(promedio_auto, 0) - COALESCE(promedio_jefe, 0) > 10 THEN 'Los colaboradores se sobrevaloran significativamente'
                WHEN COALESCE(promedio_auto, 0) - COALESCE(promedio_jefe, 0) > 5 THEN 'Los colaboradores se sobrevaloran moderadamente'
                WHEN COALESCE(promedio_auto, 0) - COALESCE(promedio_jefe, 0) > -5 THEN 'Las evaluaciones estan alineadas'
                WHEN COALESCE(promedio_auto, 0) - COALESCE(promedio_jefe, 0) > -10 THEN 'Los colaboradores se subestiman moderadamente'
                ELSE 'Los colaboradores se subestiman significativamente'
            END
        ),
        'percentiles', jsonb_build_object(
            'p10', (SELECT ROUND(PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY desempeno_porcentaje)::NUMERIC, 2) FROM final_evaluation_results WHERE periodo_id = periodo_id_param),
            'p25', (SELECT ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY desempeno_porcentaje)::NUMERIC, 2) FROM final_evaluation_results WHERE periodo_id = periodo_id_param),
            'p50', (SELECT ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY desempeno_porcentaje)::NUMERIC, 2) FROM final_evaluation_results WHERE periodo_id = periodo_id_param),
            'p75', (SELECT ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY desempeno_porcentaje)::NUMERIC, 2) FROM final_evaluation_results WHERE periodo_id = periodo_id_param),
            'p90', (SELECT ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY desempeno_porcentaje)::NUMERIC, 2) FROM final_evaluation_results WHERE periodo_id = periodo_id_param)
        )
    ) INTO resultado;

    RETURN resultado;
END;
$$;

-- =====================================================
-- 3. ESTADISTICAS POR NIVEL JERARQUICO (Seccion 5)
-- =====================================================
CREATE OR REPLACE FUNCTION get_stats_por_nivel(periodo_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    resultado JSONB;
BEGIN
    SELECT jsonb_build_object(
        'niveles', (
            SELECT COALESCE(jsonb_agg(nivel_stats ORDER BY orden), '[]'::jsonb)
            FROM (
                SELECT
                    jl.code AS codigo,
                    jl.name AS nombre,
                    jl.category AS categoria,
                    jl.hierarchical_order AS orden,
                    COUNT(DISTINCT u.dpi) AS totalColaboradores,
                    COUNT(DISTINCT fer.colaborador_id) AS evaluados,
                    CASE WHEN COUNT(DISTINCT u.dpi) > 0
                        THEN ROUND((COUNT(DISTINCT fer.colaborador_id)::NUMERIC / COUNT(DISTINCT u.dpi)::NUMERIC) * 100, 2)
                        ELSE 0 END AS tasaParticipacion,
                    jsonb_build_object(
                        'promedio', ROUND(AVG(fer.desempeno_porcentaje)::NUMERIC, 2),
                        'mediana', ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY fer.desempeno_porcentaje)::NUMERIC, 2),
                        'desviacion', ROUND(STDDEV(fer.desempeno_porcentaje)::NUMERIC, 2),
                        'minimo', ROUND(MIN(fer.desempeno_porcentaje)::NUMERIC, 2),
                        'maximo', ROUND(MAX(fer.desempeno_porcentaje)::NUMERIC, 2),
                        'p25', ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY fer.desempeno_porcentaje)::NUMERIC, 2),
                        'p75', ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fer.desempeno_porcentaje)::NUMERIC, 2)
                    ) AS desempeno,
                    jsonb_build_object(
                        'promedio', ROUND(AVG(fer.potencial_porcentaje)::NUMERIC, 2),
                        'mediana', ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY fer.potencial_porcentaje)::NUMERIC, 2),
                        'minimo', ROUND(MIN(fer.potencial_porcentaje)::NUMERIC, 2),
                        'maximo', ROUND(MAX(fer.potencial_porcentaje)::NUMERIC, 2)
                    ) AS potencial,
                    (
                        SELECT jsonb_object_agg(cat, cnt)
                        FROM (
                            SELECT
                                CASE
                                    WHEN fer2.desempeno_porcentaje >= 90 THEN 'excelente'
                                    WHEN fer2.desempeno_porcentaje >= 80 THEN 'muy_bueno'
                                    WHEN fer2.desempeno_porcentaje >= 70 THEN 'satisfactorio'
                                    WHEN fer2.desempeno_porcentaje >= 60 THEN 'necesita_mejorar'
                                    ELSE 'insatisfactorio'
                                END AS cat,
                                COUNT(*) AS cnt
                            FROM final_evaluation_results fer2
                            JOIN users u2 ON u2.dpi = fer2.colaborador_id
                            WHERE fer2.periodo_id = periodo_id_param AND u2.nivel = jl.code AND u2.rol NOT IN ('admin_general', 'admin_rrhh')
                            GROUP BY 1
                        ) sub
                    ) AS distribucionCalificaciones,
                    (
                        SELECT jsonb_object_agg(COALESCE(posicion_9box, 'sin_clasificar'), cnt)
                        FROM (
                            SELECT posicion_9box, COUNT(*) AS cnt
                            FROM final_evaluation_results fer2
                            JOIN users u2 ON u2.dpi = fer2.colaborador_id
                            WHERE fer2.periodo_id = periodo_id_param AND u2.nivel = jl.code
                            GROUP BY posicion_9box
                        ) sub
                    ) AS distribucion9Box
                FROM job_levels jl
                LEFT JOIN users u ON u.nivel = jl.code AND u.estado = 'activo' AND u.rol NOT IN ('admin_general', 'admin_rrhh')
                LEFT JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                WHERE jl.is_active = true
                GROUP BY jl.code, jl.name, jl.category, jl.hierarchical_order
                HAVING COUNT(DISTINCT fer.colaborador_id) > 0
            ) nivel_stats
        ),
        'ranking', (
            WITH ranking_data AS (
                SELECT
                    jl.code AS codigo,
                    jl.name AS nombre,
                    ROUND(AVG(fer.desempeno_porcentaje)::NUMERIC, 2) AS promedio
                FROM job_levels jl
                JOIN users u ON u.nivel = jl.code AND u.estado = 'activo' AND u.rol NOT IN ('admin_general', 'admin_rrhh')
                JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                WHERE jl.is_active = true
                GROUP BY jl.code, jl.name
                HAVING COUNT(fer.colaborador_id) > 0
            )
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'posicion', posicion,
                'nivel', codigo,
                'nombre', nombre,
                'promedio', promedio
            ) ORDER BY promedio DESC), '[]'::jsonb)
            FROM (
                SELECT 
                    codigo,
                    nombre,
                    promedio,
                    ROW_NUMBER() OVER (ORDER BY promedio DESC) AS posicion
                FROM ranking_data
            ) ranked
        )
    ) INTO resultado;

    RETURN resultado;
END;
$$;

-- =====================================================
-- 4. ESTADISTICAS POR DIRECCION/UNIDAD (Seccion 6)
-- =====================================================
CREATE OR REPLACE FUNCTION get_stats_por_direccion(periodo_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    resultado JSONB;
    promedio_global NUMERIC;
BEGIN
    -- Obtener promedio global para comparacion
    SELECT ROUND(AVG(desempeno_porcentaje)::NUMERIC, 2) INTO promedio_global
    FROM final_evaluation_results
    WHERE periodo_id = periodo_id_param;

    SELECT jsonb_build_object(
        'promedioGlobal', promedio_global,
        'direcciones', (
            SELECT COALESCE(jsonb_agg(dir_stats ORDER BY desempeno_promedio DESC), '[]'::jsonb)
            FROM (
                SELECT
                    u.direccion_unidad AS nombre,
                    COUNT(DISTINCT u.dpi) AS totalColaboradores,
                    COUNT(DISTINCT fer.colaborador_id) AS evaluados,
                    ROUND(AVG(fer.desempeno_porcentaje)::NUMERIC, 2) AS desempeno_promedio,
                    ROUND(AVG(fer.potencial_porcentaje)::NUMERIC, 2) AS potencial_promedio,
                    ROUND(STDDEV(fer.desempeno_porcentaje)::NUMERIC, 2) AS desviacion,
                    ROUND(MIN(fer.desempeno_porcentaje)::NUMERIC, 2) AS minimo,
                    ROUND(MAX(fer.desempeno_porcentaje)::NUMERIC, 2) AS maximo,
                    ROUND(AVG(fer.desempeno_porcentaje)::NUMERIC - promedio_global, 2) AS diferencia_vs_promedio,
                    (
                        SELECT jsonb_object_agg(COALESCE(posicion_9box, 'sin_clasificar'), cnt)
                        FROM (
                            SELECT posicion_9box, COUNT(*) AS cnt
                            FROM final_evaluation_results fer2
                            JOIN users u2 ON u2.dpi = fer2.colaborador_id
                            WHERE fer2.periodo_id = periodo_id_param AND u2.direccion_unidad = u.direccion_unidad
                            GROUP BY posicion_9box
                        ) sub
                    ) AS distribucion9Box,
                    (
                        SELECT jsonb_object_agg(nivel, cnt)
                        FROM (
                            SELECT u2.nivel, COUNT(*) AS cnt
                            FROM users u2
                            JOIN final_evaluation_results fer2 ON fer2.colaborador_id = u2.dpi
                            WHERE fer2.periodo_id = periodo_id_param AND u2.direccion_unidad = u.direccion_unidad
                            GROUP BY u2.nivel
                        ) sub
                    ) AS distribucionNiveles
                FROM users u
                LEFT JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                WHERE u.estado = 'activo' AND u.direccion_unidad IS NOT NULL AND u.direccion_unidad != ''
                GROUP BY u.direccion_unidad
                HAVING COUNT(DISTINCT fer.colaborador_id) > 0
            ) dir_stats
        ),
        'ranking', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'posicion', posicion,
                'direccion', nombre,
                'promedio', desempeno_promedio,
                'evaluados', evaluados,
                'diferencia', diferencia_vs_promedio
            ) ORDER BY posicion), '[]'::jsonb)
            FROM (
                SELECT
                    ROW_NUMBER() OVER (ORDER BY AVG(fer.desempeno_porcentaje) DESC) AS posicion,
                    u.direccion_unidad AS nombre,
                    ROUND(AVG(fer.desempeno_porcentaje)::NUMERIC, 2) AS desempeno_promedio,
                    COUNT(DISTINCT fer.colaborador_id) AS evaluados,
                    ROUND(AVG(fer.desempeno_porcentaje)::NUMERIC - promedio_global, 2) AS diferencia_vs_promedio
                FROM users u
                JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                WHERE u.estado = 'activo' AND u.direccion_unidad IS NOT NULL AND u.direccion_unidad != ''
                GROUP BY u.direccion_unidad
            ) ranking_data
        ),
        'top5', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'direccion', nombre,
                'promedio', desempeno_promedio
            ) ORDER BY desempeno_promedio DESC), '[]'::jsonb)
            FROM (
                SELECT
                    u.direccion_unidad AS nombre,
                    ROUND(AVG(fer.desempeno_porcentaje)::NUMERIC, 2) AS desempeno_promedio
                FROM users u
                JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                WHERE u.estado = 'activo' AND u.direccion_unidad IS NOT NULL
                GROUP BY u.direccion_unidad
                ORDER BY desempeno_promedio DESC
                LIMIT 5
            ) top
        ),
        'bottom5', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'direccion', nombre,
                'promedio', desempeno_promedio
            ) ORDER BY desempeno_promedio ASC), '[]'::jsonb)
            FROM (
                SELECT
                    u.direccion_unidad AS nombre,
                    ROUND(AVG(fer.desempeno_porcentaje)::NUMERIC, 2) AS desempeno_promedio
                FROM users u
                JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                WHERE u.estado = 'activo' AND u.direccion_unidad IS NOT NULL
                GROUP BY u.direccion_unidad
                ORDER BY desempeno_promedio ASC
                LIMIT 5
            ) bottom
        )
    ) INTO resultado;

    RETURN resultado;
END;
$$;

-- =====================================================
-- 5. BRECHAS Y NECESIDADES DE CAPACITACION (Seccion 8)
-- =====================================================
CREATE OR REPLACE FUNCTION get_brechas_capacitacion(periodo_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    resultado JSONB;
BEGIN
    SELECT jsonb_build_object(
        'topicosConsolidados', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'topico', topico,
                'frecuencia', frecuencia,
                'categoria', categoria,
                'prioridad', prioridad,
                'porcentaje', ROUND((frecuencia::NUMERIC / NULLIF(total, 0)) * 100, 2)
            ) ORDER BY frecuencia DESC), '[]'::jsonb)
            FROM (
                SELECT
                    topico,
                    COUNT(*) AS frecuencia,
                    categoria,
                    prioridad,
                    (SELECT COUNT(*) FROM training_topics WHERE periodo_id = periodo_id_param) AS total
                FROM training_topics
                WHERE periodo_id = periodo_id_param
                GROUP BY topico, categoria, prioridad
            ) topics
        ),
        'porPrioridad', (
            SELECT COALESCE(jsonb_object_agg(prioridad, cantidad), '{}'::jsonb)
            FROM (
                SELECT prioridad, COUNT(*) AS cantidad
                FROM training_topics
                WHERE periodo_id = periodo_id_param
                GROUP BY prioridad
            ) por_prioridad
        ),
        'porCategoria', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'categoria', categoria,
                'cantidad', cantidad,
                'porcentaje', ROUND((cantidad::NUMERIC / NULLIF(total, 0)) * 100, 2)
            ) ORDER BY cantidad DESC), '[]'::jsonb)
            FROM (
                SELECT
                    categoria,
                    COUNT(*) AS cantidad,
                    (SELECT COUNT(*) FROM training_topics WHERE periodo_id = periodo_id_param) AS total
                FROM training_topics
                WHERE periodo_id = periodo_id_param
                GROUP BY categoria
            ) por_cat
        ),
        'porNivel', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'nivel', nivel,
                'cantidad', cantidad,
                'topicos', topicos_list
            ) ORDER BY cantidad DESC), '[]'::jsonb)
            FROM (
                SELECT
                    nivel,
                    COUNT(*) AS cantidad,
                    jsonb_agg(DISTINCT topico) AS topicos_list
                FROM training_topics
                WHERE periodo_id = periodo_id_param
                GROUP BY nivel
            ) por_nivel
        ),
        'porDireccion', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'direccion', area,
                'cantidad', cantidad,
                'topicos', topicos_list
            ) ORDER BY cantidad DESC), '[]'::jsonb)
            FROM (
                SELECT
                    area,
                    COUNT(*) AS cantidad,
                    jsonb_agg(DISTINCT topico) AS topicos_list
                FROM training_topics
                WHERE periodo_id = periodo_id_param
                GROUP BY area
            ) por_dir
        ),
        'porDimension', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'dimension', dimension_relacionada,
                'cantidad', cantidad
            ) ORDER BY cantidad DESC), '[]'::jsonb)
            FROM (
                SELECT
                    dimension_relacionada,
                    COUNT(*) AS cantidad
                FROM training_topics
                WHERE periodo_id = periodo_id_param AND dimension_relacionada IS NOT NULL
                GROUP BY dimension_relacionada
            ) por_dim
        ),
        'totalNecesidades', (
            SELECT COUNT(*) FROM training_topics WHERE periodo_id = periodo_id_param
        ),
        'colaboradoresConNecesidades', (
            SELECT COUNT(DISTINCT colaborador_id) FROM training_topics WHERE periodo_id = periodo_id_param
        )
    ) INTO resultado;

    RETURN resultado;
END;
$$;

-- =====================================================
-- 6. ESTADISTICAS DE PLANES DE DESARROLLO (Seccion 9)
-- =====================================================
CREATE OR REPLACE FUNCTION get_stats_pdi(periodo_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    resultado JSONB;
    total_evaluados INTEGER;
    total_planes INTEGER;
BEGIN
    -- Total evaluados en el periodo
    SELECT COUNT(DISTINCT colaborador_id) INTO total_evaluados
    FROM final_evaluation_results
    WHERE periodo_id = periodo_id_param;

    -- Total planes generados
    SELECT COUNT(*) INTO total_planes
    FROM development_plans
    WHERE periodo_id = periodo_id_param;

    SELECT jsonb_build_object(
        'totalGenerados', total_planes,
        'totalEvaluados', total_evaluados,
        'cobertura', CASE WHEN total_evaluados > 0
            THEN ROUND((total_planes::NUMERIC / total_evaluados::NUMERIC) * 100, 2)
            ELSE 0 END,
        'generadosPorIA', (
            SELECT COUNT(*) FROM development_plans
            WHERE periodo_id = periodo_id_param AND generado_por_ia = true
        ),
        'editados', (
            SELECT COUNT(*) FROM development_plans
            WHERE periodo_id = periodo_id_param AND editado_por IS NOT NULL
        ),
        'porNivel', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'nivel', nivel,
                'cantidad', cantidad
            ) ORDER BY cantidad DESC), '[]'::jsonb)
            FROM (
                SELECT
                    u.nivel,
                    COUNT(*) AS cantidad
                FROM development_plans dp
                JOIN users u ON u.dpi = dp.colaborador_id
                WHERE dp.periodo_id = periodo_id_param
                GROUP BY u.nivel
            ) por_nivel
        ),
        'porDireccion', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'direccion', direccion,
                'cantidad', cantidad
            ) ORDER BY cantidad DESC), '[]'::jsonb)
            FROM (
                SELECT
                    u.direccion_unidad AS direccion,
                    COUNT(*) AS cantidad
                FROM development_plans dp
                JOIN users u ON u.dpi = dp.colaborador_id
                WHERE dp.periodo_id = periodo_id_param AND u.direccion_unidad IS NOT NULL
                GROUP BY u.direccion_unidad
            ) por_dir
        ),
        'competenciasFrecuentes', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'competencia', comp,
                'frecuencia', freq
            ) ORDER BY freq DESC), '[]'::jsonb)
            FROM (
                SELECT
                    comp_item->>'nombre' AS comp,
                    COUNT(*) AS freq
                FROM development_plans dp,
                    jsonb_array_elements(dp.competencias_desarrollar) AS comp_item
                WHERE dp.periodo_id = periodo_id_param
                GROUP BY comp_item->>'nombre'
                ORDER BY freq DESC
                LIMIT 10
            ) comp_freq
        )
    ) INTO resultado;

    RETURN resultado;
END;
$$;

-- =====================================================
-- PERMISOS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_resumen_ejecutivo(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_resultados_globales(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_stats_por_nivel(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_stats_por_direccion(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_brechas_capacitacion(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_stats_pdi(UUID) TO authenticated, anon;

-- =====================================================
-- COMENTARIOS
-- =====================================================
COMMENT ON FUNCTION get_resumen_ejecutivo IS 'Obtiene estadisticas para el resumen ejecutivo del informe (Seccion 1)';
COMMENT ON FUNCTION get_resultados_globales IS 'Obtiene resultados globales de desempeno organizacional (Seccion 3)';
COMMENT ON FUNCTION get_stats_por_nivel IS 'Obtiene estadisticas por nivel jerarquico (Seccion 5)';
COMMENT ON FUNCTION get_stats_por_direccion IS 'Obtiene estadisticas por direccion/unidad (Seccion 6)';
COMMENT ON FUNCTION get_brechas_capacitacion IS 'Obtiene analisis de brechas y necesidades de capacitacion (Seccion 8)';
COMMENT ON FUNCTION get_stats_pdi IS 'Obtiene estadisticas de planes de desarrollo individual (Seccion 9)';
