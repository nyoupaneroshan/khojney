export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          description_en: string | null
          description_ne: string | null
          display_order: number
          icon_url: string | null
          id: string
          is_published: boolean
          name_en: string
          name_ne: string | null
          parent_category_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_en?: string | null
          description_ne?: string | null
          display_order?: number
          icon_url?: string | null
          id?: string
          is_published?: boolean
          name_en: string
          name_ne?: string | null
          parent_category_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_en?: string | null
          description_ne?: string | null
          display_order?: number
          icon_url?: string | null
          id?: string
          is_published?: boolean
          name_en?: string
          name_ne?: string | null
          parent_category_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboards: {
        Row: {
          category_id: string | null
          full_name: string | null
          id: number
          period: string
          quizzes_completed: number
          rank: number
          total_score: number
          user_id: string
        }
        Insert: {
          category_id?: string | null
          full_name?: string | null
          id?: number
          period: string
          quizzes_completed: number
          rank: number
          total_score: number
          user_id: string
        }
        Update: {
          category_id?: string | null
          full_name?: string | null
          id?: number
          period?: string
          quizzes_completed?: number
          rank?: number
          total_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      options: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_correct: boolean
          option_text_en: string
          option_text_ne: string | null
          question_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_correct?: boolean
          option_text_en: string
          option_text_ne?: string | null
          question_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_correct?: boolean
          option_text_en?: string
          option_text_ne?: string | null
          question_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          last_attempt_date: string | null
          quiz_attempts_today: number | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          last_attempt_date?: string | null
          quiz_attempts_today?: number | null
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          last_attempt_date?: string | null
          quiz_attempts_today?: number | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      question_categories: {
        Row: {
          category_id: string
          question_id: string
        }
        Insert: {
          category_id: string
          question_id: string
        }
        Update: {
          category_id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_categories_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          author_id: string | null
          created_at: string
          difficulty_level: string
          explanation_en: string | null
          explanation_ne: string | null
          id: string
          image_url: string | null
          is_published: boolean
          language: string
          points: number
          question_text_en: string
          question_text_ne: string | null
          source_reference: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          difficulty_level?: string
          explanation_en?: string | null
          explanation_ne?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          language: string
          points?: number
          question_text_en: string
          question_text_ne?: string | null
          source_reference?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          difficulty_level?: string
          explanation_en?: string | null
          explanation_ne?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          language?: string
          points?: number
          question_text_en?: string
          question_text_ne?: string | null
          source_reference?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          category_id: string | null
          completed_at: string | null
          correct_answers_count: number | null
          created_at: string
          id: string
          incorrect_answers_count: number | null
          score: number | null
          settings_snapshot: Json | null
          started_at: string
          status: string
          time_taken_seconds: number | null
          total_questions_attempted: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          completed_at?: string | null
          correct_answers_count?: number | null
          created_at?: string
          id?: string
          incorrect_answers_count?: number | null
          score?: number | null
          settings_snapshot?: Json | null
          started_at?: string
          status?: string
          time_taken_seconds?: number | null
          total_questions_attempted?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          completed_at?: string | null
          correct_answers_count?: number | null
          created_at?: string
          id?: string
          incorrect_answers_count?: number | null
          score?: number | null
          settings_snapshot?: Json | null
          started_at?: string
          status?: string
          time_taken_seconds?: number | null
          total_questions_attempted?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_answers: {
        Row: {
          answered_at: string
          created_at: string
          id: string
          is_correct: boolean | null
          question_id: string
          quiz_attempt_id: string
          selected_option_id: string | null
        }
        Insert: {
          answered_at?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          quiz_attempt_id: string
          selected_option_id?: string | null
        }
        Update: {
          answered_at?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          quiz_attempt_id?: string
          selected_option_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_answers_quiz_attempt_id_fkey"
            columns: ["quiz_attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_start_quiz: {
        Args: { user_id_input: string }
        Returns: boolean
      }
      get_all_users_with_email: {
        Args: { search_term: string }
        Returns: {
          id: string
          full_name: string
          email: string
          role: string
          created_at: string
          last_sign_in_at: string
        }[]
      }
      get_leaderboard: {
        Args: Record<PropertyKey, never> | { category_id_filter?: string }
        Returns: {
          rank: number
          user_id: string
          full_name: string
          total_score: number
        }[]
      }
      get_my_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_rank: {
        Args:
          | { p_user_id: string }
          | { p_user_id: string; p_period: string; p_category_id?: string }
        Returns: {
          rank: number
          total_score: number
        }[]
      }
      get_users_with_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          full_name: string
          email: string
          role: string
          created_at: string
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      update_all_time_leaderboard: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_category_leaderboards: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_monthly_leaderboard: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_weekly_leaderboard: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
