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
          apellidos: string
          area: string
          cargo: string
          correo: string | null
          created_at: string | null
          departamento_dependencia: string | null
          direccion_unidad: string | null
          dpi: string
          estado: string
          fecha_ingreso: string | null
          fecha_nacimiento: string
          genero: string | null
          instrumento_id: string | null
          jefe_inmediato_id: string | null
          nivel: string
          nombre: string
          primer_ingreso: boolean | null
          profesion: string | null
          renglon: string | null
          rol: string
          telefono: string | null
          tipo_puesto: string | null
          updated_at: string | null
        }
        Insert: {
          apellidos: string
          area: string
          cargo: string
          correo?: string | null
          created_at?: string | null
          departamento_dependencia?: string | null
          direccion_unidad?: string | null
          dpi: string
          estado?: string
          fecha_ingreso?: string | null
          fecha_nacimiento: string
          genero?: string | null
          instrumento_id?: string | null
          jefe_inmediato_id?: string | null
          nivel: string
          nombre: string
          primer_ingreso?: boolean | null
          profesion?: string | null
          renglon?: string | null
          rol?: string
          telefono?: string | null
          tipo_puesto?: string | null
          updated_at?: string | null
        }
        Update: {
          apellidos?: string
          area?: string
          cargo?: string
          correo?: string | null
          created_at?: string | null
          departamento_dependencia?: string | null
          direccion_unidad?: string | null
          dpi?: string
          estado?: string
          fecha_ingreso?: string | null
          fecha_nacimiento?: string
          genero?: string | null
          instrumento_id?: string | null
          jefe_inmediato_id?: string | null
          nivel?: string
          nombre?: string
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
      [_ in never]: never
    }
    Functions: {
      calcular_antiguedad_meses: {
        Args: { usuario_dpi: string }
        Returns: number
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
      calculate_nine_box_position: {
        Args: { desempeno_final: number; potencial?: number }
        Returns: string
      }
      calculate_performance_score: {
        Args: { dimensions: Json; responses: Json }
        Returns: number
      }
      calculate_potential_score: {
        Args: { potencial_dimensions: Json; potencial_responses: Json }
        Returns: number
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
      es_jefe_intermedio: { Args: { usuario_dpi: string }; Returns: boolean }
      get_9box_por_antiguedad: {
        Args: { periodo_id_param: string }
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
      get_category_from_job_level: {
        Args: { p_nivel: string }
        Returns: string
      }
      get_comparativa_equipos: {
        Args: { jefe_superior_dpi: string; periodo_id_param: string }
        Returns: Json
      }
      get_dashboard_stats: { Args: { periodo_id_param: string }; Returns: Json }
      get_desarrollo_metrics: {
        Args: { periodo_actual_id: string; periodo_anterior_id: string }
        Returns: Json
      }
      get_desarrollo_por_area: {
        Args: { periodo_id_param: string }
        Returns: Json
      }
      get_eligibility_stats: { Args: never; Returns: Json }
      get_equidad_completa_stats: {
        Args: { periodo_id_param: string }
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
      get_instrument_config: { Args: { instrument_id: string }; Returns: Json }
      get_instrument_config_from_user: {
        Args: { user_dpi: string }
        Returns: Json
      }
      get_jefes_subordinados: {
        Args: { jefe_superior_dpi: string }
        Returns: Json
      }
      get_jerarquia_abajo: { Args: { usuario_dpi: string }; Returns: Json }
      get_jerarquia_arriba: { Args: { usuario_dpi: string }; Returns: Json }
      get_job_level_info: { Args: { p_code: string }; Returns: Json }
      get_nivel_antiguedad_stats: { Args: never; Returns: Json }
      get_progresion_desempeno: {
        Args: { periodo_actual_id: string; periodo_anterior_id: string }
        Returns: Json
      }
      get_promedio_equipo: {
        Args: { jefe_dpi: string; periodo_id_param: string }
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
      score_to_percentage: { Args: { score: number }; Returns: number }
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
      validate_evaluation_complete: {
        Args: { dimensions: Json; responses: Json }
        Returns: boolean
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
