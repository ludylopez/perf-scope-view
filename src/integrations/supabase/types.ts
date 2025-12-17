export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_prompts: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion: string | null
          function_name: string
          id: string
          prompt_text: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          function_name: string
          id?: string
          prompt_text: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          function_name?: string
          id?: string
          prompt_text?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      development_plans: {
        Row: {
          colaborador_id: string
          competencias_desarrollar: Json
          created_at: string | null
          editable: boolean | null
          editado_por: string | null
          evaluacion_id: string
          fecha_creacion: string | null
          fecha_modificacion: string | null
          feedback_grupal: string | null
          feedback_individual: string | null
          generado_por_ia: boolean | null
          id: string
          periodo_id: string
          updated_at: string | null
        }
        Insert: {
          colaborador_id: string
          competencias_desarrollar: Json
          created_at?: string | null
          editable?: boolean | null
          editado_por?: string | null
          evaluacion_id: string
          fecha_creacion?: string | null
          fecha_modificacion?: string | null
          feedback_grupal?: string | null
          feedback_individual?: string | null
          generado_por_ia?: boolean | null
          id?: string
          periodo_id: string
          updated_at?: string | null
        }
        Update: {
          colaborador_id?: string
          competencias_desarrollar?: Json
          created_at?: string | null
          editable?: boolean | null
          editado_por?: string | null
          evaluacion_id?: string
          fecha_creacion?: string | null
          fecha_modificacion?: string | null
          feedback_grupal?: string | null
          feedback_individual?: string | null
          generado_por_ia?: boolean | null
          id?: string
          periodo_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "development_plans_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["dpi"]
          },
          {
            foreignKeyName: "development_plans_editado_por_fkey"
            columns: ["editado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["dpi"]
          },
          {
            foreignKeyName: "development_plans_evaluacion_id_fkey"
            columns: ["evaluacion_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plans_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "evaluation_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      dimension_explanations: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion_base: string
          dimension_id: string
          dimension_nombre: string
          explicacion: string
          id: string
          incluye_comparacion: boolean | null
          nivel: string
          rango_maximo: number
          rango_minimo: number
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion_base: string
          dimension_id: string
          dimension_nombre: string
          explicacion: string
          id?: string
          incluye_comparacion?: boolean | null
          nivel: string
          rango_maximo: number
          rango_minimo: number
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion_base?: string
          dimension_id?: string
          dimension_nombre?: string
          explicacion?: string
          id?: string
          incluye_comparacion?: boolean | null
          nivel?: string
          rango_maximo?: number
          rango_minimo?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      evaluation_periods: {
        Row: {
          created_at: string | null
          descripcion: string | null
          estado: string
          fecha_cierre_autoevaluacion: string
          fecha_cierre_evaluacion_jefe: string
          fecha_fin: string
          fecha_inicio: string
          id: string
          nombre: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          estado?: string
          fecha_cierre_autoevaluacion: string
          fecha_cierre_evaluacion_jefe: string
          fecha_fin: string
          fecha_inicio: string
          id?: string
          nombre: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          estado?: string
          fecha_cierre_autoevaluacion?: string
          fecha_cierre_evaluacion_jefe?: string
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          nombre?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      evaluation_results_by_evaluator: {
        Row: {
          autoevaluacion_id: string
          colaborador_id: string
          comparativo: Json
          created_at: string | null
          desempeno_final: number | null
          desempeno_porcentaje: number | null
          evaluacion_jefe_id: string
          evaluador_id: string
          fecha_generacion: string | null
          id: string
          periodo_id: string
          posicion_9box: string | null
          potencial: number | null
          potencial_porcentaje: number | null
          resultado_final: Json
          updated_at: string | null
        }
        Insert: {
          autoevaluacion_id: string
          colaborador_id: string
          comparativo?: Json
          created_at?: string | null
          desempeno_final?: number | null
          desempeno_porcentaje?: number | null
          evaluacion_jefe_id: string
          evaluador_id: string
          fecha_generacion?: string | null
          id?: string
          periodo_id: string
          posicion_9box?: string | null
          potencial?: number | null
          potencial_porcentaje?: number | null
          resultado_final?: Json
          updated_at?: string | null
        }
        Update: {
          autoevaluacion_id?: string
          colaborador_id?: string
          comparativo?: Json
          created_at?: string | null
          desempeno_final?: number | null
          desempeno_porcentaje?: number | null
          evaluacion_jefe_id?: string
          evaluador_id?: string
          fecha_generacion?: string | null
          id?: string
          periodo_id?: string
          posicion_9box?: string | null
          potencial?: number | null
          potencial_porcentaje?: number | null
          resultado_final?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_results_by_evaluator_autoevaluacion_id_fkey"
            columns: ["autoevaluacion_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_results_by_evaluator_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["dpi"]
          },
          {
            foreignKeyName: "evaluation_results_by_evaluator_evaluacion_jefe_id_fkey"
            columns: ["evaluacion_jefe_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_results_by_evaluator_evaluador_id_fkey"
            columns: ["evaluador_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["dpi"]
          },
          {
            foreignKeyName: "evaluation_results_by_evaluator_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "evaluation_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          colaborador_id: string | null
          comments: Json
          created_at: string | null
          estado: string
          evaluacion_potencial: Json | null
          evaluador_id: string | null
          fecha_envio: string | null
          fecha_ultima_modificacion: string | null
          id: string
          nps_score: number | null
          periodo_id: string
          progreso: number | null
          responses: Json
          tipo: string
          updated_at: string | null
          usuario_id: string
        }
        Insert: {
          colaborador_id?: string | null
          comments?: Json
          created_at?: string | null
          estado?: string
          evaluacion_potencial?: Json | null
          evaluador_id?: string | null
          fecha_envio?: string | null
          fecha_ultima_modificacion?: string | null
          id?: string
          nps_score?: number | null
          periodo_id: string
          progreso?: number | null
          responses?: Json
          tipo: string
          updated_at?: string | null
          usuario_id: string
        }
        Update: {
          colaborador_id?: string | null
          comments?: Json
          created_at?: string | null
          estado?: string
          evaluacion_potencial?: Json | null
          evaluador_id?: string | null
          fecha_envio?: string | null
          fecha_ultima_modificacion?: string | null
          id?: string
          nps_score?: number | null
          periodo_id?: string
          progreso?: number | null
          responses?: Json
          tipo?: string
          updated_at?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["dpi"]
          },
          {
            foreignKeyName: "evaluations_evaluador_id_fkey"
            columns: ["evaluador_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["dpi"]
          },
          {
            foreignKeyName: "evaluations_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "evaluation_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["dpi"]
          },
        ]
      }
      feedback_guides: {
        Row: {
          apertura: string | null
          areas_desarrollo: Json | null
          cierre: string | null
          colaborador_id: string
          created_at: string | null
          fecha_generacion: string | null
          fortalezas: Json | null
          generado_por_ia: boolean | null
          id: string
          periodo_id: string
          preguntas_dialogo: Json | null
          preparacion: string | null
          tipo: string
          tips_conduccion: Json | null
          updated_at: string | null
        }
        Insert: {
          apertura?: string | null
          areas_desarrollo?: Json | null
          cierre?: string | null
          colaborador_id: string
          created_at?: string | null
          fecha_generacion?: string | null
          fortalezas?: Json | null
          generado_por_ia?: boolean | null
          id?: string
          periodo_id: string
          preguntas_dialogo?: Json | null
          preparacion?: string | null
          tipo?: string
          tips_conduccion?: Json | null
          updated_at?: string | null
        }
        Update: {
          apertura?: string | null
          areas_desarrollo?: Json | null
          cierre?: string | null
          colaborador_id?: string
          created_at?: string | null
          fecha_generacion?: string | null
          fortalezas?: Json | null
          generado_por_ia?: boolean | null
          id?: string
          periodo_id?: string
          preguntas_dialogo?: Json | null
          preparacion?: string | null
          tipo?: string
          tips_conduccion?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_guides_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["dpi"]
          },
          {
            foreignKeyName: "feedback_guides_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "evaluation_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      final_evaluation_results: {
        Row: {
          autoevaluacion_id: string
          colaborador_id: string
          comparativo: Json
          created_at: string | null
          desempeno_final: number | null
          desempeno_porcentaje: number | null
          evaluacion_jefe_id: string
          fecha_generacion: string | null
          id: string
          periodo_id: string
          plan_desarrollo_id: string | null
          posicion_9box: string | null
          potencial: number | null
          potencial_porcentaje: number | null
          resultado_final: Json
        }
        Insert: {
          autoevaluacion_id: string
          colaborador_id: string
          comparativo: Json
          created_at?: string | null
          desempeno_final?: number | null
          desempeno_porcentaje?: number | null
          evaluacion_jefe_id: string
          fecha_generacion?: string | null
          id?: string
          periodo_id: string
          plan_desarrollo_id?: string | null
          posicion_9box?: string | null
          potencial?: number | null
          potencial_porcentaje?: number | null
          resultado_final: Json
        }
        Update: {
          autoevaluacion_id?: string
          colaborador_id?: string
          comparativo?: Json
          created_at?: string | null
          desempeno_final?: number | null
          desempeno_porcentaje?: number | null
          evaluacion_jefe_id?: string
          fecha_generacion?: string | null
          id?: string
          periodo_id?: string
          plan_desarrollo_id?: string | null
          posicion_9box?: string | null
          potencial?: number | null
          potencial_porcentaje?: number | null
          resultado_final?: Json
        }
        Relationships: [
          {
            foreignKeyName: "final_evaluation_results_autoevaluacion_id_fkey"
            columns: ["autoevaluacion_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_evaluation_results_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["dpi"]
          },
          {
            foreignKeyName: "final_evaluation_results_evaluacion_jefe_id_fkey"
            columns: ["evaluacion_jefe_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_evaluation_results_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "evaluation_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      final_evaluation_results_backup: {
        Row: {
          autoevaluacion_id: string | null
          colaborador_id: string | null
          comparativo: Json | null
          created_at: string | null
          desempeno_final: number | null
          desempeno_porcentaje: number | null
          evaluacion_jefe_id: string | null
          fecha_generacion: string | null
          id: string | null
          periodo_id: string | null
          plan_desarrollo_id: string | null
          posicion_9box: string | null
          potencial: number | null
          potencial_porcentaje: number | null
          resultado_final: Json | null
        }
        Insert: {
          autoevaluacion_id?: string | null
          colaborador_id?: string | null
          comparativo?: Json | null
          created_at?: string | null
          desempeno_final?: number | null
          desempeno_porcentaje?: number | null
          evaluacion_jefe_id?: string | null
          fecha_generacion?: string | null
          id?: string | null
          periodo_id?: string | null
          plan_desarrollo_id?: string | null
          posicion_9box?: string | null
          potencial?: number | null
          potencial_porcentaje?: number | null
          resultado_final?: Json | null
        }
        Update: {
          autoevaluacion_id?: string | null
          colaborador_id?: string | null
          comparativo?: Json | null
          created_at?: string | null
          desempeno_final?: number | null
          desempeno_porcentaje?: number | null
          evaluacion_jefe_id?: string | null
          fecha_generacion?: string | null
          id?: string | null
          periodo_id?: string | null
          plan_desarrollo_id?: string | null
          posicion_9box?: string | null
          potencial?: number | null
          potencial_porcentaje?: number | null
          resultado_final?: Json | null
        }
        Relationships: []
      }
      group_members: {
        Row: {
          activo: boolean | null
          colaborador_id: string
          created_at: string | null
          grupo_id: string
          id: string
        }
        Insert: {
          activo?: boolean | null
          colaborador_id: string
          created_at?: string | null
          grupo_id: string
          id?: string
        }
        Update: {
          activo?: boolean | null
          colaborador_id?: string
          created_at?: string | null
          grupo_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["dpi"]
          },
          {
            foreignKeyName: "group_members_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion: string | null
          id: string
          jefe_id: string
          nombre: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          jefe_id: string
          nombre: string
          tipo?: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          jefe_id?: string
          nombre?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_jefe_id_fkey"
            columns: ["jefe_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["dpi"]
          },
        ]
      }
      instrument_configs: {
        Row: {
          activo: boolean | null
          configuracion_calculo: Json | null
          created_at: string | null
          dimensiones_desempeno: Json
          dimensiones_potencial: Json | null
          id: string
          nivel: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          configuracion_calculo?: Json | null
          created_at?: string | null
          dimensiones_desempeno: Json
          dimensiones_potencial?: Json | null
          id: string
          nivel: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          configuracion_calculo?: Json | null
          created_at?: string | null
          dimensiones_desempeno?: Json
          dimensiones_potencial?: Json | null
          id?: string
          nivel?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      job_levels: {
        Row: {
          category: string
          code: string
          created_at: string | null
          hierarchical_order: number
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          hierarchical_order: number
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          hierarchical_order?: number
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      open_question_responses: {
        Row: {
          created_at: string | null
          evaluacion_id: string
          id: string
          pregunta_id: string
          respuesta: string
        }
        Insert: {
          created_at?: string | null
          evaluacion_id: string
          id?: string
          pregunta_id: string
          respuesta: string
        }
        Update: {
          created_at?: string | null
          evaluacion_id?: string
          id?: string
          pregunta_id?: string
          respuesta?: string
        }
        Relationships: [
          {
            foreignKeyName: "open_question_responses_evaluacion_id_fkey"
            columns: ["evaluacion_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_question_responses_pregunta_id_fkey"
            columns: ["pregunta_id"]
            isOneToOne: false
            referencedRelation: "open_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      open_questions: {
        Row: {
          activa: boolean | null
          created_at: string | null
          id: string
          obligatoria: boolean | null
          orden: number
          pregunta: string
          tipo: string
        }
        Insert: {
          activa?: boolean | null
          created_at?: string | null
          id?: string
          obligatoria?: boolean | null
          orden: number
          pregunta: string
          tipo?: string
        }
        Update: {
          activa?: boolean | null
          created_at?: string | null
          id?: string
          obligatoria?: boolean | null
          orden?: number
          pregunta?: string
          tipo?: string
        }
        Relationships: []
      }
      openai_api_logs: {
        Row: {
          colaborador_id: string | null
          completion_tokens: number | null
          created_at: string | null
          error_code: string | null
          error_message: string | null
          function_name: string
          id: string
          model_used: string | null
          periodo_id: string | null
          prompt_tokens: number | null
          request_duration_ms: number | null
          status: string
          total_tokens: number | null
          user_agent: string | null
        }
        Insert: {
          colaborador_id?: string | null
          completion_tokens?: number | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          function_name: string
          id?: string
          model_used?: string | null
          periodo_id?: string | null
          prompt_tokens?: number | null
          request_duration_ms?: number | null
          status: string
          total_tokens?: number | null
          user_agent?: string | null
        }
        Update: {
          colaborador_id?: string | null
          completion_tokens?: number | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          function_name?: string
          id?: string
          model_used?: string | null
          periodo_id?: string | null
          prompt_tokens?: number | null
          request_duration_ms?: number | null
          status?: string
          total_tokens?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_periodo"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "evaluation_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action: string | null
          error_message: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          resource: string | null
          resource_id: string | null
          success: boolean | null
          timestamp: string | null
          user_dpi: string | null
        }
        Insert: {
          action?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource?: string | null
          resource_id?: string | null
          success?: boolean | null
          timestamp?: string | null
          user_dpi?: string | null
        }
        Update: {
          action?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource?: string | null
          resource_id?: string | null
          success?: boolean | null
          timestamp?: string | null
          user_dpi?: string | null
        }
        Relationships: []
      }
      team_analysis: {
        Row: {
          analysis: Json
          created_at: string | null
          fecha_generacion: string | null
          id: string
          jefe_dpi: string
          periodo_id: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          analysis: Json
          created_at?: string | null
          fecha_generacion?: string | null
          id?: string
          jefe_dpi: string
          periodo_id: string
          tipo?: string
          updated_at?: string | null
        }
        Update: {
          analysis?: Json
          created_at?: string | null
          fecha_generacion?: string | null
          id?: string
          jefe_dpi?: string
          periodo_id?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_analysis_jefe_dpi_fkey"
            columns: ["jefe_dpi"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["dpi"]
          },
          {
            foreignKeyName: "team_analysis_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "evaluation_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plans_structured: {
        Row: {
          fecha_generacion: string
          fecha_modificacion: string
          generado_por_ia: boolean
          id: string
          jefe_dpi: string
          periodo_id: string
          plan_data: Json
          version: number
        }
        Insert: {
          fecha_generacion?: string
          fecha_modificacion?: string
          generado_por_ia?: boolean
          id?: string
          jefe_dpi: string
          periodo_id: string
          plan_data: Json
          version?: number
        }
        Update: {
          fecha_generacion?: string
          fecha_modificacion?: string
          generado_por_ia?: boolean
          id?: string
          jefe_dpi?: string
          periodo_id?: string
          plan_data?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_plans_structured_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "evaluation_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      training_topics: {
        Row: {
          accion_relacionada_id: string | null
          area: string
          categoria: string
          colaborador_id: string
          created_at: string | null
          descripcion: string | null
          development_plan_id: string | null
          dimension_relacionada: string | null
          fecha_deteccion: string | null
          fuente: string
          id: string
          nivel: string
          periodo_id: string
          prioridad: string
          topico: string
          updated_at: string | null
        }
        Insert: {
          accion_relacionada_id?: string | null
          area: string
          categoria: string
          colaborador_id: string
          created_at?: string | null
          descripcion?: string | null
          development_plan_id?: string | null
          dimension_relacionada?: string | null
          fecha_deteccion?: string | null
          fuente: string
          id?: string
          nivel: string
          periodo_id: string
          prioridad: string
          topico: string
          updated_at?: string | null
        }
        Update: {
          accion_relacionada_id?: string | null
          area?: string
          categoria?: string
          colaborador_id?: string
          created_at?: string | null
          descripcion?: string | null
          development_plan_id?: string | null
          dimension_relacionada?: string | null
          fecha_deteccion?: string | null
          fuente?: string
          id?: string
          nivel?: string
          periodo_id?: string
          prioridad?: string
          topico?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_topics_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["dpi"]
          },
          {
            foreignKeyName: "training_topics_development_plan_id_fkey"
            columns: ["development_plan_id"]
            isOneToOne: false
            referencedRelation: "development_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_topics_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "evaluation_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      user_assignments: {
        Row: {
          activo: boolean | null
          colaborador_id: string
          created_at: string | null
          grupo_id: string | null
          id: string
          jefe_id: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          colaborador_id: string
          created_at?: string | null
          grupo_id?: string | null
          id?: string
          jefe_id: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          colaborador_id?: string
          created_at?: string | null
          grupo_id?: string | null
          id?: string
          jefe_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_assignments_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["dpi"]
          },
          {
            foreignKeyName: "user_assignments_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_assignments_jefe_id_fkey"
            columns: ["jefe_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["dpi"]
          },
        ]
      }
      users: {
        Row: {
          antiguedad: number | null
          apellidos: string
          area: string
          cargo: string
          correo: string | null
          created_at: string | null
          departamento_dependencia: string | null
          direccion_unidad: string | null
          dpi: string
          edad: number | null
          es_externo: boolean | null
          estado: string
          fecha_ingreso: string | null
          fecha_nacimiento: string
          genero: string | null
          instrumento_id: string | null
          jefe_inmediato_id: string | null
          nivel: string
          nombre: string
          password_hash: string | null
          primer_ingreso: boolean | null
          profesion: string | null
          renglon: string | null
          rol: string
          telefono: string | null
          tipo_puesto: string | null
          updated_at: string | null
        }
        Insert: {
          antiguedad?: number | null
          apellidos: string
          area: string
          cargo: string
          correo?: string | null
          created_at?: string | null
          departamento_dependencia?: string | null
          direccion_unidad?: string | null
          dpi: string
          edad?: number | null
          es_externo?: boolean | null
          estado?: string
          fecha_ingreso?: string | null
          fecha_nacimiento: string
          genero?: string | null
          instrumento_id?: string | null
          jefe_inmediato_id?: string | null
          nivel: string
          nombre: string
          password_hash?: string | null
          primer_ingreso?: boolean | null
          profesion?: string | null
          renglon?: string | null
          rol?: string
          telefono?: string | null
          tipo_puesto?: string | null
          updated_at?: string | null
        }
        Update: {
          antiguedad?: number | null
          apellidos?: string
          area?: string
          cargo?: string
          correo?: string | null
          created_at?: string | null
          departamento_dependencia?: string | null
          direccion_unidad?: string | null
          dpi?: string
          edad?: number | null
          es_externo?: boolean | null
          estado?: string
          fecha_ingreso?: string | null
          fecha_nacimiento?: string
          genero?: string | null
          instrumento_id?: string | null
          jefe_inmediato_id?: string | null
          nivel?: string
          nombre?: string
          password_hash?: string | null
          primer_ingreso?: boolean | null
          profesion?: string | null
          renglon?: string | null
          rol?: string
          telefono?: string | null
          tipo_puesto?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_nivel_job_levels"
            columns: ["nivel"]
            isOneToOne: false
            referencedRelation: "job_levels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "users_jefe_inmediato_id_fkey"
            columns: ["jefe_inmediato_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["dpi"]
          },
        ]
      }
    }
    Views: {
      final_evaluation_results_consolidated: {
        Row: {
          colaborador_id: string | null
          desempeno_final_maximo: number | null
          desempeno_final_minimo: number | null
          desempeno_final_promedio: number | null
          desempeno_porcentaje_maximo: number | null
          desempeno_porcentaje_minimo: number | null
          desempeno_porcentaje_promedio: number | null
          periodo_id: string | null
          posicion_9box_moda: string | null
          potencial_porcentaje_promedio: number | null
          potencial_promedio: number | null
          resultados_por_evaluador: Json | null
          total_evaluadores: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_results_by_evaluator_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["dpi"]
          },
          {
            foreignKeyName: "evaluation_results_by_evaluator_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "evaluation_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      final_evaluation_results_legacy: {
        Row: {
          autoevaluacion_id: string | null
          colaborador_id: string | null
          comparativo: Json | null
          created_at: string | null
          desempeno_final: number | null
          desempeno_porcentaje: number | null
          evaluacion_jefe_id: string | null
          fecha_generacion: string | null
          id: string | null
          periodo_id: string | null
          posicion_9box: string | null
          potencial: number | null
          potencial_porcentaje: number | null
          resultado_final: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_results_by_evaluator_autoevaluacion_id_fkey"
            columns: ["autoevaluacion_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_results_by_evaluator_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["dpi"]
          },
          {
            foreignKeyName: "evaluation_results_by_evaluator_evaluacion_jefe_id_fkey"
            columns: ["evaluacion_jefe_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_results_by_evaluator_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "evaluation_periods"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calcular_antiguedad_meses: {
        Args: { usuario_dpi: string }
        Returns: number
      }
      calcular_antiguedad_meses_calculado: {
        Args: { fecha_ingreso: string }
        Returns: number
      }
      calcular_dimensiones_colaborador: {
        Args: { p_colaborador_dpi: string; p_periodo_id: string }
        Returns: Json
      }
      calcular_edad: { Args: { fecha_nacimiento_str: string }; Returns: number }
      calculate_and_save_result: {
        Args: {
          p_autoevaluacion_id: string
          p_colaborador_id: string
          p_evaluacion_jefe_id: string
          p_evaluador_id: string
          p_periodo_id: string
        }
        Returns: undefined
      }
      calculate_complete_final_result: {
        Args: {
          autoevaluacion_id: string
          evaluacion_jefe_id: string
          instrument_config: Json
        }
        Returns: Json
      }
      calculate_dimension_average: {
        Args: { dimension: Json; responses: Json }
        Returns: number
      }
      calculate_dimension_percentage: {
        Args: { dimension: Json; responses: Json }
        Returns: number
      }
      calculate_dimension_percentages: {
        Args: {
          auto_responses: Json
          dimensiones_desempeno: Json
          jefe_responses: Json
          peso_auto?: number
          peso_jefe?: number
        }
        Returns: Json
      }
      calculate_dimension_score: {
        Args: { dimension: Json; responses: Json }
        Returns: number
      }
      calculate_final_weighted_score: {
        Args: {
          desempeno_auto: number
          desempeno_jefe: number
          peso_auto?: number
          peso_jefe?: number
        }
        Returns: number
      }
      calculate_municipal_average_by_dimension: {
        Args: { nivel_param: string; periodo_id_param: string }
        Returns: Json
      }
      calculate_nine_box_position: {
        Args: { desempeno_final: number; potencial?: number }
        Returns: string
      }
      calculate_organizational_averages: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      calculate_performance_score: {
        Args: { dimensions: Json; responses: Json }
        Returns: number
      }
      calculate_potential_score: {
        Args: { potencial_dimensions: Json; potencial_responses: Json }
        Returns: number
      }
      consolidate_responses_at_item_level: {
        Args: {
          auto_responses: Json
          jefe_responses: Json
          peso_auto?: number
          peso_jefe?: number
        }
        Returns: Json
      }
      create_job_level: {
        Args: {
          p_category: string
          p_code: string
          p_hierarchical_order: number
          p_name: string
        }
        Returns: Json
      }
      delete_job_level: { Args: { p_code: string }; Returns: Json }
      es_jefe_de_colaborador: {
        Args: { colaborador_dpi_param: string; jefe_dpi_param: string }
        Returns: boolean
      }
      es_jefe_intermedio: { Args: { usuario_dpi: string }; Returns: boolean }
      filter_dimensions_by_cargo: {
        Args: { cargo: string; dimensions: Json; nivel: string }
        Returns: Json
      }
      formatear_antiguedad_legible: { Args: { meses: number }; Returns: string }
      get_9box_cascada_filtrable: {
        Args: {
          filtro_jefe_dpi?: string
          jefe_principal_dpi: string
          periodo_id_param: string
        }
        Returns: Json
      }
      get_9box_por_antiguedad: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_9box_unidad_directa: {
        Args: { periodo_id_param: string; usuario_dpi: string }
        Returns: Json
      }
      get_9box_unidad_filtrable: {
        Args: {
          filtro_grupo_id?: string
          filtro_jefe_dpi?: string
          periodo_id_param: string
          usuario_dpi: string
        }
        Returns: Json
      }
      get_advanced_dashboard_stats: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_all_job_levels: {
        Args: { include_inactive?: boolean }
        Returns: {
          category: string
          code: string
          created_at: string
          hierarchical_order: number
          is_active: boolean
          name: string
          updated_at: string
          users_count: number
        }[]
      }
      get_antiguedad_completa_stats: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_antiguedad_distribution: { Args: never; Returns: Json }
      get_antiguedad_vs_desempeno: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_authenticated_user_dpi: { Args: never; Returns: string }
      get_brechas_capacitacion: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_category_from_job_level: {
        Args: { p_nivel: string }
        Returns: string
      }
      get_comparativa_equipos: {
        Args: { jefe_superior_dpi: string; periodo_id_param: string }
        Returns: Json
      }
      get_comparativa_equipos_cascada: {
        Args: { periodo_id_param: string; usuario_dpi: string }
        Returns: Json
      }
      get_complete_colaborador_result: {
        Args: { colaborador_id_param: string; periodo_id_param: string }
        Returns: Json
      }
      get_consolidated_result: {
        Args: { p_colaborador_id: string; p_periodo_id: string }
        Returns: Json
      }
      get_dashboard_stats: { Args: { periodo_id_param: string }; Returns: Json }
      get_datos_correlacion: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_desarrollo_metrics: {
        Args: { periodo_actual_id: string; periodo_anterior_id: string }
        Returns: Json
      }
      get_desarrollo_por_area: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_detalle_colaborador_completo: {
        Args: { colaborador_dpi: string; periodo_id_param: string }
        Returns: Json
      }
      get_eligibility_stats: { Args: never; Returns: Json }
      get_equidad_completa_stats: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_equipo_cascada_completo: {
        Args: { jefe_dpi_param: string; periodo_id_param: string }
        Returns: Json
      }
      get_equipo_directo_completo: {
        Args: { jefe_dpi_param: string; periodo_id_param: string }
        Returns: Json
      }
      get_equipo_stats: {
        Args: { jefe_dpi: string; periodo_id_param: string }
        Returns: Json
      }
      get_evaluacion_jefe_como_colaborador: {
        Args: {
          jefe_dpi: string
          jefe_superior_dpi: string
          periodo_id_param: string
        }
        Returns: Json
      }
      get_executive_kpis: { Args: { periodo_id_param: string }; Returns: Json }
      get_genero_stats: { Args: { periodo_id_param: string }; Returns: Json }
      get_grupos_unidad: { Args: { usuario_dpi: string }; Returns: Json }
      get_indices_equidad: { Args: { periodo_id_param: string }; Returns: Json }
      get_instrument_config: { Args: { instrument_id: string }; Returns: Json }
      get_instrument_config_from_user: {
        Args: { user_dpi: string }
        Returns: Json
      }
      get_jefes_para_filtro: { Args: { usuario_dpi: string }; Returns: Json }
      get_jefes_subordinados: {
        Args: { jefe_superior_dpi: string }
        Returns: Json
      }
      get_jerarquia_abajo: { Args: { usuario_dpi: string }; Returns: Json }
      get_jerarquia_arriba: { Args: { usuario_dpi: string }; Returns: Json }
      get_jerarquia_con_dimensiones: {
        Args: { periodo_id_param: string; usuario_dpi: string }
        Returns: Json
      }
      get_jerarquia_con_resultados: {
        Args: { periodo_id_param: string; usuario_dpi: string }
        Returns: Json
      }
      get_jerarquia_directa_con_dimensiones: {
        Args: { periodo_id_param: string; usuario_dpi: string }
        Returns: Json
      }
      get_jerarquia_directa_con_resultados: {
        Args: { periodo_id_param: string; usuario_dpi: string }
        Returns: Json
      }
      get_job_level_info: { Args: { p_code: string }; Returns: Json }
      get_multiple_evaluators_stats: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_nivel_antiguedad_stats: { Args: never; Returns: Json }
      get_openai_usage_stats: {
        Args: {
          fecha_fin_param?: string
          fecha_inicio_param?: string
          periodo_id_param?: string
        }
        Returns: Json
      }
      get_personal_analytics: { Args: never; Returns: Json }
      get_plan_capacitacion_area: {
        Args: { area_param: string; periodo_id_param: string }
        Returns: Json
      }
      get_plan_capacitacion_municipalidad: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_progresion_desempeno: {
        Args: { periodo_actual_id: string; periodo_anterior_id: string }
        Returns: Json
      }
      get_promedio_equipo: {
        Args: { jefe_dpi: string; periodo_id_param: string }
        Returns: Json
      }
      get_resultados_consolidados: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_resultados_globales: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_resumen_ejecutivo: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_resumen_seguimiento: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_rotacion_stats: { Args: never; Returns: Json }
      get_seguimiento_evaluaciones: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_stats_pdi: { Args: { periodo_id_param: string }; Returns: Json }
      get_stats_por_antiguedad_completo: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_stats_por_dimension: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_stats_por_direccion: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_stats_por_genero_completo: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_stats_por_nivel: { Args: { periodo_id_param: string }; Returns: Json }
      get_stats_por_rango_edad: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_stats_por_renglon: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_stats_por_tipo_puesto: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_stats_unidad_cascada: {
        Args: { periodo_id_param: string; usuario_dpi: string }
        Returns: Json
      }
      get_stats_unidad_directa: {
        Args: { periodo_id_param: string; usuario_dpi: string }
        Returns: Json
      }
      get_tendencia_semanal: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_tiempo_promedio_por_area: { Args: never; Returns: Json }
      get_top_mejoras: {
        Args: {
          limite?: number
          periodo_actual_id: string
          periodo_anterior_id: string
        }
        Returns: Json
      }
      get_topicos_frecuentes: {
        Args: { limite_param?: number; periodo_id_param: string }
        Returns: Json
      }
      get_topicos_por_area: {
        Args: { area_param: string; periodo_id_param: string }
        Returns: Json
      }
      jsonb_object_keys_count: { Args: { jsonb_obj: Json }; Returns: number }
      log_openai_api_call: {
        Args: {
          colaborador_id_param?: string
          completion_tokens_param?: number
          error_code_param?: string
          error_message_param?: string
          function_name_param: string
          model_used_param?: string
          periodo_id_param?: string
          prompt_tokens_param?: number
          request_duration_ms_param?: number
          status_param?: string
          total_tokens_param?: number
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          action_param: string
          error_message_param?: string
          metadata_param?: Json
          resource_id_param: string
          resource_param: string
          success_param: boolean
        }
        Returns: string
      }
      migrate_single_result_to_multiple_evaluators: {
        Args: { p_colaborador_id: string; p_periodo_id: string }
        Returns: Json
      }
      recalculate_pending_results: {
        Args: { p_periodo_id?: string }
        Returns: {
          colaborador_id: string
          evaluador_id: string
          mensaje: string
          resultado_calculado: boolean
        }[]
      }
      score_to_percentage: { Args: { score: number }; Returns: number }
      tiene_rol_administrativo: {
        Args: { user_dpi_param: string }
        Returns: boolean
      }
      update_job_level: {
        Args: {
          p_category: string
          p_code: string
          p_hierarchical_order: number
          p_is_active: boolean
          p_name: string
        }
        Returns: Json
      }
      validate_alcalde_evaluation: {
        Args: { p_alcalde_id: string; p_colaborador_id: string }
        Returns: Json
      }
      validate_concejo_evaluation: {
        Args: { p_colaborador_id: string; p_concejo_id: string }
        Returns: Json
      }
      validate_evaluation_complete: {
        Args: { dimensions: Json; responses: Json }
        Returns: boolean
      }
      validate_evaluation_permission: {
        Args: { p_colaborador_id: string; p_evaluador_id: string }
        Returns: Json
      }
      validate_period_active: {
        Args: { periodo_id: string; tipo_evaluacion: string }
        Returns: boolean
      }
      validate_responses_structure: {
        Args: { responses: Json }
        Returns: boolean
      }
      verificar_elegibilidad_evaluacion: {
        Args: { usuario_dpi: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
