-- Agregar campo NPS a la tabla evaluations
ALTER TABLE evaluations 
ADD COLUMN nps_score INTEGER;

-- Agregar comentario explicativo
COMMENT ON COLUMN evaluations.nps_score IS 'Net Promoter Score (0-10): Solo para autoevaluaciones. Pregunta: ¿Qué tan probable es que recomiendes la municipalidad como lugar de trabajo?';