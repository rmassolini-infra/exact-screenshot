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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      asset_timeline_events: {
        Row: {
          asset_id: string
          created_at: string | null
          description: string | null
          event_date: string | null
          event_type: string | null
          gap_type: string | null
          has_resolution: boolean | null
          id: string
          impact_value: number | null
          layer: string
          source_doc_id: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          event_type?: string | null
          gap_type?: string | null
          has_resolution?: boolean | null
          id?: string
          impact_value?: number | null
          layer: string
          source_doc_id?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          event_type?: string | null
          gap_type?: string | null
          has_resolution?: boolean | null
          id?: string
          impact_value?: number | null
          layer?: string
          source_doc_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_timeline_events_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_timeline_events_source_doc_id_fkey"
            columns: ["source_doc_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          capex_corrigido_ipca: number | null
          capex_original: number | null
          codigo: string | null
          conformidade_score: number | null
          created_at: string | null
          data_aquisicao: string | null
          depreciacao_aneel_pct: number | null
          depreciacao_fisica_pct: number | null
          fabricante: string | null
          id: string
          modelo: string | null
          numero_serie: string | null
          project_id: string
          risk_score: string | null
          source_documents: Json | null
          timeline_coverage_pct: number | null
          tipo: string | null
          valor_atual: number | null
          vida_util_contratada_anos: number | null
          vida_util_restante_anos: number | null
        }
        Insert: {
          capex_corrigido_ipca?: number | null
          capex_original?: number | null
          codigo?: string | null
          conformidade_score?: number | null
          created_at?: string | null
          data_aquisicao?: string | null
          depreciacao_aneel_pct?: number | null
          depreciacao_fisica_pct?: number | null
          fabricante?: string | null
          id?: string
          modelo?: string | null
          numero_serie?: string | null
          project_id: string
          risk_score?: string | null
          source_documents?: Json | null
          timeline_coverage_pct?: number | null
          tipo?: string | null
          valor_atual?: number | null
          vida_util_contratada_anos?: number | null
          vida_util_restante_anos?: number | null
        }
        Update: {
          capex_corrigido_ipca?: number | null
          capex_original?: number | null
          codigo?: string | null
          conformidade_score?: number | null
          created_at?: string | null
          data_aquisicao?: string | null
          depreciacao_aneel_pct?: number | null
          depreciacao_fisica_pct?: number | null
          fabricante?: string | null
          id?: string
          modelo?: string | null
          numero_serie?: string | null
          project_id?: string
          risk_score?: string | null
          source_documents?: Json | null
          timeline_coverage_pct?: number | null
          tipo?: string | null
          valor_atual?: number | null
          vida_util_contratada_anos?: number | null
          vida_util_restante_anos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          error_msg: string | null
          file_path: string | null
          filename: string
          id: string
          ocr_result: Json | null
          page_count: number | null
          project_id: string
          quality_score: number | null
          status: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          error_msg?: string | null
          file_path?: string | null
          filename: string
          id?: string
          ocr_result?: Json | null
          page_count?: number | null
          project_id: string
          quality_score?: number | null
          status?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          error_msg?: string | null
          file_path?: string | null
          filename?: string
          id?: string
          ocr_result?: Json | null
          page_count?: number | null
          project_id?: string
          quality_score?: number | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inferences_atgi: {
        Row: {
          asset_id: string | null
          created_at: string | null
          finding: string | null
          gap_type: string | null
          id: string
          inference_id: string
          project_id: string
          source_documents: Json | null
          title: string
          value: number | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string | null
          finding?: string | null
          gap_type?: string | null
          id?: string
          inference_id: string
          project_id: string
          source_documents?: Json | null
          title: string
          value?: number | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string | null
          finding?: string | null
          gap_type?: string | null
          id?: string
          inference_id?: string
          project_id?: string
          source_documents?: Json | null
          title?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inferences_atgi_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inferences_atgi_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inferences_gie: {
        Row: {
          asset_id: string | null
          confidence_score: number | null
          created_at: string | null
          finding: string | null
          id: string
          impact_value: number | null
          inference_id: string
          level: string
          project_id: string
          recommendation: string | null
          source_documents: Json | null
          title: string
        }
        Insert: {
          asset_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          finding?: string | null
          id?: string
          impact_value?: number | null
          inference_id: string
          level: string
          project_id: string
          recommendation?: string | null
          source_documents?: Json | null
          title: string
        }
        Update: {
          asset_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          finding?: string | null
          id?: string
          impact_value?: number | null
          inference_id?: string
          level?: string
          project_id?: string
          recommendation?: string | null
          source_documents?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "inferences_gie_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inferences_gie_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      passivo_ajustado: {
        Row: {
          ajuste_tipo1: number | null
          ajuste_tipo2: number | null
          ajuste_tipo3: number | null
          ajuste_tipo4: number | null
          calculated_at: string | null
          delta_absoluto: number | null
          delta_pct: number | null
          id: string
          passivo_oculto_gie: number | null
          passivo_regulatorio: number | null
          passivo_total_ajustado: number | null
          project_id: string
          seller_price: number | null
        }
        Insert: {
          ajuste_tipo1?: number | null
          ajuste_tipo2?: number | null
          ajuste_tipo3?: number | null
          ajuste_tipo4?: number | null
          calculated_at?: string | null
          delta_absoluto?: number | null
          delta_pct?: number | null
          id?: string
          passivo_oculto_gie?: number | null
          passivo_regulatorio?: number | null
          passivo_total_ajustado?: number | null
          project_id: string
          seller_price?: number | null
        }
        Update: {
          ajuste_tipo1?: number | null
          ajuste_tipo2?: number | null
          ajuste_tipo3?: number | null
          ajuste_tipo4?: number | null
          calculated_at?: string | null
          delta_absoluto?: number | null
          delta_pct?: number | null
          id?: string
          passivo_oculto_gie?: number | null
          passivo_regulatorio?: number | null
          passivo_total_ajustado?: number | null
          project_id?: string
          seller_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "passivo_ajustado_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          id: string
          kpi_atgi_coverage: number | null
          kpi_dd_reduction: number | null
          kpi_gie_accuracy: number | null
          kpi_ocr_precision: number | null
          name: string
          passivo_total_ajustado: number | null
          seller_price: number | null
          status: string | null
          target_company: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          kpi_atgi_coverage?: number | null
          kpi_dd_reduction?: number | null
          kpi_gie_accuracy?: number | null
          kpi_ocr_precision?: number | null
          name: string
          passivo_total_ajustado?: number | null
          seller_price?: number | null
          status?: string | null
          target_company: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          kpi_atgi_coverage?: number | null
          kpi_dd_reduction?: number | null
          kpi_gie_accuracy?: number | null
          kpi_ocr_precision?: number | null
          name?: string
          passivo_total_ajustado?: number | null
          seller_price?: number | null
          status?: string | null
          target_company?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rag_messages: {
        Row: {
          confidence: number | null
          content: string
          created_at: string | null
          id: string
          needs_human_review: boolean | null
          project_id: string
          role: string
          sources: Json | null
        }
        Insert: {
          confidence?: number | null
          content: string
          created_at?: string | null
          id?: string
          needs_human_review?: boolean | null
          project_id: string
          role: string
          sources?: Json | null
        }
        Update: {
          confidence?: number | null
          content?: string
          created_at?: string | null
          id?: string
          needs_human_review?: boolean | null
          project_id?: string
          role?: string
          sources?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
