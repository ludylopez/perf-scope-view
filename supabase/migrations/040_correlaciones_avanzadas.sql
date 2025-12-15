-- =====================================================
-- MIGRACION 040: Funciones SQL para Correlaciones y Analisis Avanzado
-- =====================================================
-- Funciones para analisis estadistico profundo y correlaciones
-- multidimensionales del desempeno organizacional
-- =====================================================

-- =====================================================
-- 1. ESTADISTICAS POR RENGLON PRESUPUESTARIO
-- =====================================================
CREATE OR REPLACE FUNCTION get_stats_por_renglon(periodo_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    resultado JSONB;
BEGIN
    SELECT jsonb_build_object(
        'renglones', (
            SELECT COALESCE(jsonb_agg(renglon_stats ORDER BY cantidad DESC), '[]'::jsonb)
            FROM (
                SELECT
                    u.renglon,
                    COUNT(DISTINCT u.dpi) AS cantidad,
                    ROUND(AVG(fer.desempeno_porcentaje)::NUMERIC, 2) AS promedio_desempeno,
                    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY fer.desempeno_porcentaje)::NUMERIC, 2) AS mediana_desempeno,
                    ROUND(STDDEV(fer.desempeno_porcentaje)::NUMERIC, 2) AS desviacion_desempeno,
                    ROUND(MIN(fer.desempeno_porcentaje)::NUMERIC, 2) AS min_desempeno,
                    ROUND(MAX(fer.desempeno_porcentaje)::NUMERIC, 2) AS max_desempeno,
                    ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY fer.desempeno_porcentaje)::NUMERIC, 2) AS p25_desempeno,
                    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fer.desempeno_porcentaje)::NUMERIC, 2) AS p75_desempeno,
                    ROUND(AVG(fer.potencial_porcentaje)::NUMERIC, 2) AS promedio_potencial,
                    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY fer.potencial_porcentaje)::NUMERIC, 2) AS mediana_potencial,
                    CASE WHEN AVG(fer.desempeno_porcentaje) > 0
                        THEN ROUND((STDDEV(fer.desempeno_porcentaje) / AVG(fer.desempeno_porcentaje) * 100)::NUMERIC, 2)
                        ELSE 0 END AS coeficiente_variacion
                FROM users u
                JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                WHERE u.estado = 'activo' AND u.renglon IS NOT NULL AND u.renglon != ''
                GROUP BY u.renglon
                HAVING COUNT(fer.colaborador_id) >= 3
            ) renglon_stats
        ),
        'comparativa', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'renglon', renglon,
                'promedio', promedio,
                'diferencia_vs_global', diferencia
            ) ORDER BY promedio DESC), '[]'::jsonb)
            FROM (
                SELECT
                    u.renglon,
                    ROUND(AVG(fer.desempeno_porcentaje)::NUMERIC, 2) AS promedio,
                    ROUND(AVG(fer.desempeno_porcentaje)::NUMERIC - (
                        SELECT AVG(desempeno_porcentaje) FROM final_evaluation_results WHERE periodo_id = periodo_id_param
                    ), 2) AS diferencia
                FROM users u
                JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                WHERE u.estado = 'activo' AND u.renglon IS NOT NULL
                GROUP BY u.renglon
            ) comp
        )
    ) INTO resultado;

    RETURN resultado;
END;
$$;

-- =====================================================
-- 2. ESTADISTICAS POR RANGO DE EDAD
-- =====================================================
CREATE OR REPLACE FUNCTION get_stats_por_rango_edad(periodo_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    resultado JSONB;
BEGIN
    SELECT jsonb_build_object(
        'rangos', (
            SELECT COALESCE(jsonb_agg(edad_stats ORDER BY orden), '[]'::jsonb)
            FROM (
                SELECT
                    rango_edad,
                    orden,
                    COUNT(*) AS cantidad,
                    ROUND(AVG(desempeno_porcentaje)::NUMERIC, 2) AS promedio_desempeno,
                    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY desempeno_porcentaje)::NUMERIC, 2) AS mediana_desempeno,
                    ROUND(STDDEV(desempeno_porcentaje)::NUMERIC, 2) AS desviacion,
                    ROUND(MIN(desempeno_porcentaje)::NUMERIC, 2) AS minimo,
                    ROUND(MAX(desempeno_porcentaje)::NUMERIC, 2) AS maximo,
                    ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY desempeno_porcentaje)::NUMERIC, 2) AS p25,
                    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY desempeno_porcentaje)::NUMERIC, 2) AS p75,
                    ROUND(AVG(potencial_porcentaje)::NUMERIC, 2) AS promedio_potencial,
                    CASE WHEN AVG(desempeno_porcentaje) > 0
                        THEN ROUND((STDDEV(desempeno_porcentaje) / AVG(desempeno_porcentaje) * 100)::NUMERIC, 2)
                        ELSE 0 END AS coeficiente_variacion
                FROM (
                    SELECT
                        fer.desempeno_porcentaje,
                        fer.potencial_porcentaje,
                        CASE
                            WHEN u.edad < 25 THEN '18-24'
                            WHEN u.edad < 35 THEN '25-34'
                            WHEN u.edad < 45 THEN '35-44'
                            WHEN u.edad < 55 THEN '45-54'
                            WHEN u.edad < 65 THEN '55-64'
                            ELSE '65+'
                        END AS rango_edad,
                        CASE
                            WHEN u.edad < 25 THEN 1
                            WHEN u.edad < 35 THEN 2
                            WHEN u.edad < 45 THEN 3
                            WHEN u.edad < 55 THEN 4
                            WHEN u.edad < 65 THEN 5
                            ELSE 6
                        END AS orden
                    FROM users u
                    JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                    WHERE u.estado = 'activo' AND u.edad IS NOT NULL
                ) edad_data
                GROUP BY rango_edad, orden
            ) edad_stats
        ),
        'tendencia', (
            SELECT jsonb_build_object(
                'descripcion', CASE
                    WHEN (
                        SELECT CORR(edad::NUMERIC, desempeno)
                        FROM (
                            SELECT u.edad, fer.desempeno_porcentaje AS desempeno
                            FROM users u
                            JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                            WHERE u.edad IS NOT NULL
                        ) corr_data
                    ) > 0.3 THEN 'El desempeno tiende a aumentar con la edad'
                    WHEN (
                        SELECT CORR(edad::NUMERIC, desempeno)
                        FROM (
                            SELECT u.edad, fer.desempeno_porcentaje AS desempeno
                            FROM users u
                            JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                            WHERE u.edad IS NOT NULL
                        ) corr_data
                    ) < -0.3 THEN 'El desempeno tiende a disminuir con la edad'
                    ELSE 'No hay relacion significativa entre edad y desempeno'
                END,
                'correlacion', (
                    SELECT ROUND(CORR(edad::NUMERIC, desempeno)::NUMERIC, 4)
                    FROM (
                        SELECT u.edad, fer.desempeno_porcentaje AS desempeno
                        FROM users u
                        JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                        WHERE u.edad IS NOT NULL
                    ) corr_data
                )
            )
        )
    ) INTO resultado;

    RETURN resultado;
END;
$$;

-- =====================================================
-- 3. ESTADISTICAS POR GENERO
-- =====================================================
CREATE OR REPLACE FUNCTION get_stats_por_genero_completo(periodo_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    resultado JSONB;
    promedio_masculino NUMERIC;
    promedio_femenino NUMERIC;
BEGIN
    -- Obtener promedios por genero
    SELECT ROUND(AVG(fer.desempeno_porcentaje)::NUMERIC, 2) INTO promedio_masculino
    FROM users u
    JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
    WHERE u.genero = 'masculino';

    SELECT ROUND(AVG(fer.desempeno_porcentaje)::NUMERIC, 2) INTO promedio_femenino
    FROM users u
    JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
    WHERE u.genero = 'femenino';

    SELECT jsonb_build_object(
        'generos', (
            SELECT COALESCE(jsonb_agg(genero_stats), '[]'::jsonb)
            FROM (
                SELECT
                    u.genero,
                    COUNT(*) AS cantidad,
                    ROUND((COUNT(*)::NUMERIC / NULLIF((
                        SELECT COUNT(*) FROM final_evaluation_results WHERE periodo_id = periodo_id_param
                    ), 0)) * 100, 2) AS porcentaje,
                    ROUND(AVG(fer.desempeno_porcentaje)::NUMERIC, 2) AS promedio_desempeno,
                    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY fer.desempeno_porcentaje)::NUMERIC, 2) AS mediana_desempeno,
                    ROUND(STDDEV(fer.desempeno_porcentaje)::NUMERIC, 2) AS desviacion,
                    ROUND(MIN(fer.desempeno_porcentaje)::NUMERIC, 2) AS minimo,
                    ROUND(MAX(fer.desempeno_porcentaje)::NUMERIC, 2) AS maximo,
                    ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY fer.desempeno_porcentaje)::NUMERIC, 2) AS p25,
                    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fer.desempeno_porcentaje)::NUMERIC, 2) AS p75,
                    ROUND(AVG(fer.potencial_porcentaje)::NUMERIC, 2) AS promedio_potencial,
                    (
                        SELECT jsonb_object_agg(COALESCE(posicion_9box, 'sin_clasificar'), cnt)
                        FROM (
                            SELECT posicion_9box, COUNT(*) AS cnt
                            FROM final_evaluation_results fer2
                            JOIN users u2 ON u2.dpi = fer2.colaborador_id
                            WHERE fer2.periodo_id = periodo_id_param AND u2.genero = u.genero
                            GROUP BY posicion_9box
                        ) sub
                    ) AS distribucion9Box
                FROM users u
                JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                WHERE u.estado = 'activo' AND u.genero IS NOT NULL
                GROUP BY u.genero
            ) genero_stats
        ),
        'indiceEquidad', jsonb_build_object(
            'brechaAbsoluta', ROUND(COALESCE(promedio_masculino, 0) - COALESCE(promedio_femenino, 0), 2),
            'brechaRelativa', CASE WHEN COALESCE(promedio_femenino, 0) > 0
                THEN ROUND(((COALESCE(promedio_masculino, 0) - COALESCE(promedio_femenino, 0)) / promedio_femenino * 100)::NUMERIC, 2)
                ELSE 0 END,
            'ratio', CASE WHEN COALESCE(promedio_femenino, 0) > 0
                THEN ROUND((COALESCE(promedio_masculino, 0) / promedio_femenino)::NUMERIC, 4)
                ELSE 0 END,
            'esEquitativo', ABS(COALESCE(promedio_masculino, 0) - COALESCE(promedio_femenino, 0)) < 5,
            'interpretacion', CASE
                WHEN ABS(COALESCE(promedio_masculino, 0) - COALESCE(promedio_femenino, 0)) < 3 THEN 'Equidad de genero en desempeno'
                WHEN COALESCE(promedio_masculino, 0) > COALESCE(promedio_femenino, 0) THEN 'Brecha favorable a hombres'
                ELSE 'Brecha favorable a mujeres'
            END
        ),
        'comparativaPorNivel', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'nivel', nivel,
                'masculino', ROUND(AVG(CASE WHEN genero = 'masculino' THEN desempeno END)::NUMERIC, 2),
                'femenino', ROUND(AVG(CASE WHEN genero = 'femenino' THEN desempeno END)::NUMERIC, 2),
                'brecha', ROUND(AVG(CASE WHEN genero = 'masculino' THEN desempeno END)::NUMERIC -
                               AVG(CASE WHEN genero = 'femenino' THEN desempeno END)::NUMERIC, 2)
            )), '[]'::jsonb)
            FROM (
                SELECT u.nivel, u.genero, fer.desempeno_porcentaje AS desempeno
                FROM users u
                JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                WHERE u.genero IN ('masculino', 'femenino')
            ) data
            GROUP BY nivel
        )
    ) INTO resultado;

    RETURN resultado;
END;
$$;

-- =====================================================
-- 4. ESTADISTICAS POR ANTIGUEDAD
-- =====================================================
CREATE OR REPLACE FUNCTION get_stats_por_antiguedad_completo(periodo_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    resultado JSONB;
BEGIN
    SELECT jsonb_build_object(
        'rangos', (
            SELECT COALESCE(jsonb_agg(ant_stats ORDER BY orden), '[]'::jsonb)
            FROM (
                SELECT
                    rango_antiguedad,
                    orden,
                    COUNT(*) AS cantidad,
                    ROUND(AVG(desempeno_porcentaje)::NUMERIC, 2) AS promedio_desempeno,
                    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY desempeno_porcentaje)::NUMERIC, 2) AS mediana_desempeno,
                    ROUND(STDDEV(desempeno_porcentaje)::NUMERIC, 2) AS desviacion,
                    ROUND(MIN(desempeno_porcentaje)::NUMERIC, 2) AS minimo,
                    ROUND(MAX(desempeno_porcentaje)::NUMERIC, 2) AS maximo,
                    ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY desempeno_porcentaje)::NUMERIC, 2) AS p25,
                    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY desempeno_porcentaje)::NUMERIC, 2) AS p75,
                    ROUND(AVG(potencial_porcentaje)::NUMERIC, 2) AS promedio_potencial,
                    CASE WHEN AVG(desempeno_porcentaje) > 0
                        THEN ROUND((STDDEV(desempeno_porcentaje) / AVG(desempeno_porcentaje) * 100)::NUMERIC, 2)
                        ELSE 0 END AS coeficiente_variacion
                FROM (
                    SELECT
                        fer.desempeno_porcentaje,
                        fer.potencial_porcentaje,
                        CASE
                            WHEN u.antiguedad < 6 THEN '0-6 meses'
                            WHEN u.antiguedad < 12 THEN '6-12 meses'
                            WHEN u.antiguedad < 24 THEN '1-2 anios'
                            WHEN u.antiguedad < 60 THEN '2-5 anios'
                            WHEN u.antiguedad < 120 THEN '5-10 anios'
                            ELSE '10+ anios'
                        END AS rango_antiguedad,
                        CASE
                            WHEN u.antiguedad < 6 THEN 1
                            WHEN u.antiguedad < 12 THEN 2
                            WHEN u.antiguedad < 24 THEN 3
                            WHEN u.antiguedad < 60 THEN 4
                            WHEN u.antiguedad < 120 THEN 5
                            ELSE 6
                        END AS orden
                    FROM users u
                    JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                    WHERE u.estado = 'activo' AND u.antiguedad IS NOT NULL
                ) ant_data
                GROUP BY rango_antiguedad, orden
            ) ant_stats
        ),
        'correlacion', (
            SELECT jsonb_build_object(
                'coeficiente', ROUND(CORR(antiguedad::NUMERIC, desempeno)::NUMERIC, 4),
                'interpretacion', CASE
                    WHEN CORR(antiguedad::NUMERIC, desempeno) > 0.5 THEN 'Correlacion positiva fuerte: mayor antiguedad, mejor desempeno'
                    WHEN CORR(antiguedad::NUMERIC, desempeno) > 0.3 THEN 'Correlacion positiva moderada'
                    WHEN CORR(antiguedad::NUMERIC, desempeno) > 0.1 THEN 'Correlacion positiva debil'
                    WHEN CORR(antiguedad::NUMERIC, desempeno) > -0.1 THEN 'Sin correlacion significativa'
                    WHEN CORR(antiguedad::NUMERIC, desempeno) > -0.3 THEN 'Correlacion negativa debil'
                    WHEN CORR(antiguedad::NUMERIC, desempeno) > -0.5 THEN 'Correlacion negativa moderada'
                    ELSE 'Correlacion negativa fuerte'
                END
            )
            FROM (
                SELECT u.antiguedad, fer.desempeno_porcentaje AS desempeno
                FROM users u
                JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                WHERE u.antiguedad IS NOT NULL
            ) corr_data
        ),
        'promedioAntiguedadGeneral', (
            SELECT ROUND(AVG(u.antiguedad)::NUMERIC, 1)
            FROM users u
            JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
        )
    ) INTO resultado;

    RETURN resultado;
END;
$$;

-- =====================================================
-- 5. ESTADISTICAS POR TIPO DE PUESTO
-- =====================================================
CREATE OR REPLACE FUNCTION get_stats_por_tipo_puesto(periodo_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    resultado JSONB;
    promedio_admin NUMERIC;
    promedio_operativo NUMERIC;
BEGIN
    -- Obtener promedios
    SELECT ROUND(AVG(fer.desempeno_porcentaje)::NUMERIC, 2) INTO promedio_admin
    FROM users u
    JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
    WHERE u.tipo_puesto = 'administrativo';

    SELECT ROUND(AVG(fer.desempeno_porcentaje)::NUMERIC, 2) INTO promedio_operativo
    FROM users u
    JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
    WHERE u.tipo_puesto = 'operativo';

    SELECT jsonb_build_object(
        'tipos', (
            SELECT COALESCE(jsonb_agg(tipo_stats), '[]'::jsonb)
            FROM (
                SELECT
                    u.tipo_puesto,
                    COUNT(*) AS cantidad,
                    ROUND((COUNT(*)::NUMERIC / NULLIF((
                        SELECT COUNT(*) FROM final_evaluation_results WHERE periodo_id = periodo_id_param
                    ), 0)) * 100, 2) AS porcentaje,
                    ROUND(AVG(fer.desempeno_porcentaje)::NUMERIC, 2) AS promedio_desempeno,
                    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY fer.desempeno_porcentaje)::NUMERIC, 2) AS mediana_desempeno,
                    ROUND(STDDEV(fer.desempeno_porcentaje)::NUMERIC, 2) AS desviacion,
                    ROUND(MIN(fer.desempeno_porcentaje)::NUMERIC, 2) AS minimo,
                    ROUND(MAX(fer.desempeno_porcentaje)::NUMERIC, 2) AS maximo,
                    ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY fer.desempeno_porcentaje)::NUMERIC, 2) AS p25,
                    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fer.desempeno_porcentaje)::NUMERIC, 2) AS p75,
                    ROUND(AVG(fer.potencial_porcentaje)::NUMERIC, 2) AS promedio_potencial,
                    (
                        SELECT jsonb_object_agg(COALESCE(posicion_9box, 'sin_clasificar'), cnt)
                        FROM (
                            SELECT posicion_9box, COUNT(*) AS cnt
                            FROM final_evaluation_results fer2
                            JOIN users u2 ON u2.dpi = fer2.colaborador_id
                            WHERE fer2.periodo_id = periodo_id_param AND u2.tipo_puesto = u.tipo_puesto
                            GROUP BY posicion_9box
                        ) sub
                    ) AS distribucion9Box
                FROM users u
                JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                WHERE u.estado = 'activo' AND u.tipo_puesto IS NOT NULL
                GROUP BY u.tipo_puesto
            ) tipo_stats
        ),
        'comparativa', jsonb_build_object(
            'administrativo', promedio_admin,
            'operativo', promedio_operativo,
            'brecha', ROUND(COALESCE(promedio_admin, 0) - COALESCE(promedio_operativo, 0), 2),
            'interpretacion', CASE
                WHEN ABS(COALESCE(promedio_admin, 0) - COALESCE(promedio_operativo, 0)) < 3 THEN 'Desempeno similar entre tipos de puesto'
                WHEN COALESCE(promedio_admin, 0) > COALESCE(promedio_operativo, 0) THEN 'Personal administrativo con mejor desempeno'
                ELSE 'Personal operativo con mejor desempeno'
            END
        )
    ) INTO resultado;

    RETURN resultado;
END;
$$;

-- =====================================================
-- 6. DATOS PARA CALCULOS DE CORRELACION EN FRONTEND
-- =====================================================
CREATE OR REPLACE FUNCTION get_datos_correlacion(periodo_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    resultado JSONB;
BEGIN
    SELECT jsonb_build_object(
        'datos', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'colaboradorId', u.dpi,
                'desempeno', ROUND(fer.desempeno_porcentaje::NUMERIC, 2),
                'potencial', ROUND(fer.potencial_porcentaje::NUMERIC, 2),
                'antiguedad', u.antiguedad,
                'edad', u.edad,
                'genero', u.genero,
                'nivel', u.nivel,
                'tipoPuesto', u.tipo_puesto,
                'renglon', u.renglon,
                'direccion', u.direccion_unidad
            )), '[]'::jsonb)
            FROM users u
            JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
            WHERE u.estado = 'activo'
        ),
        'correlaciones', jsonb_build_object(
            'desempeno_antiguedad', (
                SELECT ROUND(CORR(fer.desempeno_porcentaje, u.antiguedad::NUMERIC)::NUMERIC, 4)
                FROM users u
                JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                WHERE u.antiguedad IS NOT NULL
            ),
            'desempeno_edad', (
                SELECT ROUND(CORR(fer.desempeno_porcentaje, u.edad::NUMERIC)::NUMERIC, 4)
                FROM users u
                JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                WHERE u.edad IS NOT NULL
            ),
            'desempeno_potencial', (
                SELECT ROUND(CORR(fer.desempeno_porcentaje, fer.potencial_porcentaje)::NUMERIC, 4)
                FROM final_evaluation_results fer
                WHERE fer.periodo_id = periodo_id_param AND fer.potencial_porcentaje IS NOT NULL
            ),
            'potencial_antiguedad', (
                SELECT ROUND(CORR(fer.potencial_porcentaje, u.antiguedad::NUMERIC)::NUMERIC, 4)
                FROM users u
                JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                WHERE u.antiguedad IS NOT NULL AND fer.potencial_porcentaje IS NOT NULL
            ),
            'potencial_edad', (
                SELECT ROUND(CORR(fer.potencial_porcentaje, u.edad::NUMERIC)::NUMERIC, 4)
                FROM users u
                JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                WHERE u.edad IS NOT NULL AND fer.potencial_porcentaje IS NOT NULL
            )
        ),
        'matrizCorrelacion', (
            SELECT jsonb_build_object(
                'variables', jsonb_build_array('Desempeno', 'Potencial', 'Antiguedad', 'Edad'),
                'matriz', jsonb_build_array(
                    jsonb_build_array(1, corr_dp, corr_da, corr_de),
                    jsonb_build_array(corr_dp, 1, corr_pa, corr_pe),
                    jsonb_build_array(corr_da, corr_pa, 1, corr_ae),
                    jsonb_build_array(corr_de, corr_pe, corr_ae, 1)
                )
            )
            FROM (
                SELECT
                    ROUND(CORR(fer.desempeno_porcentaje, fer.potencial_porcentaje)::NUMERIC, 4) AS corr_dp,
                    ROUND(CORR(fer.desempeno_porcentaje, u.antiguedad::NUMERIC)::NUMERIC, 4) AS corr_da,
                    ROUND(CORR(fer.desempeno_porcentaje, u.edad::NUMERIC)::NUMERIC, 4) AS corr_de,
                    ROUND(CORR(fer.potencial_porcentaje, u.antiguedad::NUMERIC)::NUMERIC, 4) AS corr_pa,
                    ROUND(CORR(fer.potencial_porcentaje, u.edad::NUMERIC)::NUMERIC, 4) AS corr_pe,
                    ROUND(CORR(u.antiguedad::NUMERIC, u.edad::NUMERIC)::NUMERIC, 4) AS corr_ae
                FROM users u
                JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                WHERE u.antiguedad IS NOT NULL AND u.edad IS NOT NULL AND fer.potencial_porcentaje IS NOT NULL
            ) correlaciones
        )
    ) INTO resultado;

    RETURN resultado;
END;
$$;

-- =====================================================
-- 7. INDICES DE EQUIDAD CONSOLIDADOS
-- =====================================================
CREATE OR REPLACE FUNCTION get_indices_equidad(periodo_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    resultado JSONB;
BEGIN
    SELECT jsonb_build_object(
        'equidadGenero', (
            SELECT jsonb_build_object(
                'masculino', jsonb_build_object(
                    'promedio', ROUND(AVG(CASE WHEN u.genero = 'masculino' THEN fer.desempeno_porcentaje END)::NUMERIC, 2),
                    'cantidad', COUNT(CASE WHEN u.genero = 'masculino' THEN 1 END)
                ),
                'femenino', jsonb_build_object(
                    'promedio', ROUND(AVG(CASE WHEN u.genero = 'femenino' THEN fer.desempeno_porcentaje END)::NUMERIC, 2),
                    'cantidad', COUNT(CASE WHEN u.genero = 'femenino' THEN 1 END)
                ),
                'brecha', ROUND(
                    AVG(CASE WHEN u.genero = 'masculino' THEN fer.desempeno_porcentaje END)::NUMERIC -
                    AVG(CASE WHEN u.genero = 'femenino' THEN fer.desempeno_porcentaje END)::NUMERIC, 2),
                'esEquitativo', ABS(
                    AVG(CASE WHEN u.genero = 'masculino' THEN fer.desempeno_porcentaje END) -
                    AVG(CASE WHEN u.genero = 'femenino' THEN fer.desempeno_porcentaje END)
                ) < 5
            )
            FROM users u
            JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
            WHERE u.genero IN ('masculino', 'femenino')
        ),
        'equidadTipoPuesto', (
            SELECT jsonb_build_object(
                'administrativo', jsonb_build_object(
                    'promedio', ROUND(AVG(CASE WHEN u.tipo_puesto = 'administrativo' THEN fer.desempeno_porcentaje END)::NUMERIC, 2),
                    'cantidad', COUNT(CASE WHEN u.tipo_puesto = 'administrativo' THEN 1 END)
                ),
                'operativo', jsonb_build_object(
                    'promedio', ROUND(AVG(CASE WHEN u.tipo_puesto = 'operativo' THEN fer.desempeno_porcentaje END)::NUMERIC, 2),
                    'cantidad', COUNT(CASE WHEN u.tipo_puesto = 'operativo' THEN 1 END)
                ),
                'brecha', ROUND(
                    AVG(CASE WHEN u.tipo_puesto = 'administrativo' THEN fer.desempeno_porcentaje END)::NUMERIC -
                    AVG(CASE WHEN u.tipo_puesto = 'operativo' THEN fer.desempeno_porcentaje END)::NUMERIC, 2),
                'esEquitativo', ABS(
                    AVG(CASE WHEN u.tipo_puesto = 'administrativo' THEN fer.desempeno_porcentaje END) -
                    AVG(CASE WHEN u.tipo_puesto = 'operativo' THEN fer.desempeno_porcentaje END)
                ) < 5
            )
            FROM users u
            JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
        ),
        'equidadEdad', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'rango', rango,
                'promedio', promedio,
                'cantidad', cantidad,
                'diferenciaVsPromedio', diferencia
            ) ORDER BY orden), '[]'::jsonb)
            FROM (
                SELECT
                    rango,
                    orden,
                    ROUND(AVG(desempeno)::NUMERIC, 2) AS promedio,
                    COUNT(*) AS cantidad,
                    ROUND(AVG(desempeno)::NUMERIC - (
                        SELECT AVG(desempeno_porcentaje) FROM final_evaluation_results WHERE periodo_id = periodo_id_param
                    ), 2) AS diferencia
                FROM (
                    SELECT
                        fer.desempeno_porcentaje AS desempeno,
                        CASE
                            WHEN u.edad < 25 THEN '18-24'
                            WHEN u.edad < 35 THEN '25-34'
                            WHEN u.edad < 45 THEN '35-44'
                            WHEN u.edad < 55 THEN '45-54'
                            WHEN u.edad < 65 THEN '55-64'
                            ELSE '65+'
                        END AS rango,
                        CASE
                            WHEN u.edad < 25 THEN 1
                            WHEN u.edad < 35 THEN 2
                            WHEN u.edad < 45 THEN 3
                            WHEN u.edad < 55 THEN 4
                            WHEN u.edad < 65 THEN 5
                            ELSE 6
                        END AS orden
                    FROM users u
                    JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                    WHERE u.edad IS NOT NULL
                ) edad_data
                GROUP BY rango, orden
            ) rangos
        ),
        'resumen', jsonb_build_object(
            'totalIndicadores', 3,
            'indicadoresEquitativos', (
                SELECT COUNT(*)
                FROM (VALUES
                    ((SELECT ABS(AVG(CASE WHEN u.genero = 'masculino' THEN fer.desempeno_porcentaje END) -
                                 AVG(CASE WHEN u.genero = 'femenino' THEN fer.desempeno_porcentaje END)) < 5
                      FROM users u JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param
                      WHERE u.genero IN ('masculino', 'femenino'))),
                    ((SELECT ABS(AVG(CASE WHEN u.tipo_puesto = 'administrativo' THEN fer.desempeno_porcentaje END) -
                                 AVG(CASE WHEN u.tipo_puesto = 'operativo' THEN fer.desempeno_porcentaje END)) < 5
                      FROM users u JOIN final_evaluation_results fer ON fer.colaborador_id = u.dpi AND fer.periodo_id = periodo_id_param))
                ) AS t(es_equitativo)
                WHERE es_equitativo = true
            )
        )
    ) INTO resultado;

    RETURN resultado;
END;
$$;

-- =====================================================
-- 8. ESTADISTICAS POR DIMENSION (para Seccion 4)
-- =====================================================
CREATE OR REPLACE FUNCTION get_stats_por_dimension(periodo_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    resultado JSONB;
BEGIN
    -- Esta funcion requiere parsear el JSONB de resultado_final
    -- Simplificamos retornando estructura base
    SELECT jsonb_build_object(
        'mensaje', 'Los datos de dimension deben calcularse en frontend debido a la estructura JSONB variable por instrumento',
        'promedioGlobalDesempeno', (
            SELECT ROUND(AVG(desempeno_porcentaje)::NUMERIC, 2)
            FROM final_evaluation_results
            WHERE periodo_id = periodo_id_param
        ),
        'totalEvaluados', (
            SELECT COUNT(*)
            FROM final_evaluation_results
            WHERE periodo_id = periodo_id_param
        )
    ) INTO resultado;

    RETURN resultado;
END;
$$;

-- =====================================================
-- PERMISOS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_stats_por_renglon(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_stats_por_rango_edad(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_stats_por_genero_completo(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_stats_por_antiguedad_completo(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_stats_por_tipo_puesto(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_datos_correlacion(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_indices_equidad(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_stats_por_dimension(UUID) TO authenticated, anon;

-- =====================================================
-- COMENTARIOS
-- =====================================================
COMMENT ON FUNCTION get_stats_por_renglon IS 'Estadisticas de desempeno por renglon presupuestario';
COMMENT ON FUNCTION get_stats_por_rango_edad IS 'Estadisticas de desempeno por rangos de edad';
COMMENT ON FUNCTION get_stats_por_genero_completo IS 'Estadisticas de desempeno por genero con indices de equidad';
COMMENT ON FUNCTION get_stats_por_antiguedad_completo IS 'Estadisticas de desempeno por rangos de antiguedad';
COMMENT ON FUNCTION get_stats_por_tipo_puesto IS 'Estadisticas de desempeno por tipo de puesto (admin/operativo)';
COMMENT ON FUNCTION get_datos_correlacion IS 'Datos crudos para calculos de correlacion en frontend';
COMMENT ON FUNCTION get_indices_equidad IS 'Indices de equidad consolidados por diferentes variables';
COMMENT ON FUNCTION get_stats_por_dimension IS 'Estadisticas por dimension de evaluacion';
