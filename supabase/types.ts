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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          complement: string | null
          created_at: string
          formatted_address: string | null
          guest_token: string | null
          id: string
          instructions: string | null
          is_default: boolean
          label: string
          latitude: number | null
          longitude: number | null
          neighborhood: string
          number: string
          profile_id: string | null
          state: string
          street: string
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          city: string
          complement?: string | null
          created_at?: string
          formatted_address?: string | null
          guest_token?: string | null
          id?: string
          instructions?: string | null
          is_default?: boolean
          label: string
          latitude?: number | null
          longitude?: number | null
          neighborhood: string
          number: string
          profile_id?: string | null
          state: string
          street: string
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          city?: string
          complement?: string | null
          created_at?: string
          formatted_address?: string | null
          guest_token?: string | null
          id?: string
          instructions?: string | null
          is_default?: boolean
          label?: string
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string
          number?: string
          profile_id?: string | null
          state?: string
          street?: string
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string
          chat_id: string
          created_at: string
          id: string
          sender: string
        }
        Insert: {
          body: string
          chat_id: string
          created_at?: string
          id?: string
          sender: string
        }
        Update: {
          body?: string
          chat_id?: string
          created_at?: string
          id?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          order_code: string
          order_id: string | null
          profile_id: string
          store_id: string
          store_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_code: string
          order_id?: string | null
          profile_id: string
          store_id: string
          store_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_code?: string
          order_id?: string | null
          profile_id?: string
          store_id?: string
          store_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_stores: {
        Row: {
          created_at: string
          profile_id: string
          store_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          store_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_stores_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          selected_options: Json
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          selected_options?: Json
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          selected_options?: Json
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_events: {
        Row: {
          created_at: string
          id: string
          label: string
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_label: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_fee: number
          eta_max_minutes: number | null
          fulfillment_type: string
          guest_token: string | null
          id: string
          metadata: Json
          notes: string | null
          order_code: string
          payment_method: string
          payment_status: string
          profile_id: string | null
          service_fee: number
          status: string
          store_id: string
          store_name: string
          store_slug: string | null
          subtotal_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          address_label?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number
          eta_max_minutes?: number | null
          fulfillment_type?: string
          guest_token?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          order_code?: string
          payment_method?: string
          payment_status?: string
          profile_id?: string | null
          service_fee?: number
          status?: string
          store_id: string
          store_name: string
          store_slug?: string | null
          subtotal_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          address_label?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number
          eta_max_minutes?: number | null
          fulfillment_type?: string
          guest_token?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          order_code?: string
          payment_method?: string
          payment_status?: string
          profile_id?: string | null
          service_fee?: number
          status?: string
          store_id?: string
          store_name?: string
          store_slug?: string | null
          subtotal_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_cards: {
        Row: {
          brand: string
          created_at: string
          expiry_month: string
          expiry_year: string
          holder_name: string
          id: string
          is_default: boolean
          label: string
          last_four: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          brand: string
          created_at?: string
          expiry_month: string
          expiry_year: string
          holder_name: string
          id?: string
          is_default?: boolean
          label: string
          last_four: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          brand?: string
          created_at?: string
          expiry_month?: string
          expiry_year?: string
          holder_name?: string
          id?: string
          is_default?: boolean
          label?: string
          last_four?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_cards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          active: boolean
          created_at: string
          icon: string
          id: string
          name: string
          sort_order: number
          store_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          icon?: string
          id?: string
          name: string
          sort_order?: number
          store_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          badge: string | null
          category_id: string | null
          compare_at_price: number | null
          created_at: string
          description: string | null
          featured: boolean
          gelada: boolean
          id: string
          image_url: string | null
          manage_stock: boolean
          name: string
          prep_time_label: string | null
          price: number
          sort_order: number
          stock_quantity: number | null
          store_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          badge?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          featured?: boolean
          gelada?: boolean
          id?: string
          image_url?: string | null
          manage_stock?: boolean
          name: string
          prep_time_label?: string | null
          price: number
          sort_order?: number
          stock_quantity?: number | null
          store_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          badge?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          featured?: boolean
          gelada?: boolean
          id?: string
          image_url?: string | null
          manage_stock?: boolean
          name?: string
          prep_time_label?: string | null
          price?: number
          sort_order?: number
          stock_quantity?: number | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      store_banners: {
        Row: {
          active: boolean
          created_at: string
          cta_label: string
          gradient_class: string
          id: string
          image_url: string | null
          sort_order: number
          store_id: string | null
          store_slug: string | null
          subtitle: string | null
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          cta_label?: string
          gradient_class?: string
          id?: string
          image_url?: string | null
          sort_order?: number
          store_id?: string | null
          store_slug?: string | null
          subtitle?: string | null
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          cta_label?: string
          gradient_class?: string
          id?: string
          image_url?: string | null
          sort_order?: number
          store_id?: string | null
          store_slug?: string | null
          subtitle?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_banners_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_categories: {
        Row: {
          active: boolean
          created_at: string
          icon: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          icon?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      store_hours: {
        Row: {
          closes_at: string
          created_at: string
          id: string
          is_closed: boolean
          opens_at: string
          store_id: string
          week_day: number
        }
        Insert: {
          closes_at: string
          created_at?: string
          id?: string
          is_closed?: boolean
          opens_at: string
          store_id: string
          week_day: number
        }
        Update: {
          closes_at?: string
          created_at?: string
          id?: string
          is_closed?: boolean
          opens_at?: string
          store_id?: string
          week_day?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_hours_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          accent_color: string
          active: boolean
          category_id: string | null
          category_name: string | null
          cover_image_url: string | null
          created_at: string
          delivery_fee: number
          description: string | null
          description_long: string | null
          eta_max: number
          eta_min: number
          id: string
          is_featured: boolean
          is_open: boolean
          logo_image_url: string | null
          min_order_amount: number
          name: string
          rating: number
          review_count: number
          slug: string
          sort_order: number
          tagline: string | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          accent_color?: string
          active?: boolean
          category_id?: string | null
          category_name?: string | null
          cover_image_url?: string | null
          created_at?: string
          delivery_fee?: number
          description?: string | null
          description_long?: string | null
          eta_max?: number
          eta_min?: number
          id?: string
          is_featured?: boolean
          is_open?: boolean
          logo_image_url?: string | null
          min_order_amount?: number
          name: string
          rating?: number
          review_count?: number
          slug: string
          sort_order?: number
          tagline?: string | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          accent_color?: string
          active?: boolean
          category_id?: string | null
          category_name?: string | null
          cover_image_url?: string | null
          created_at?: string
          delivery_fee?: number
          description?: string | null
          description_long?: string | null
          eta_max?: number
          eta_min?: number
          id?: string
          is_featured?: boolean
          is_open?: boolean
          logo_image_url?: string | null
          min_order_amount?: number
          name?: string
          rating?: number
          review_count?: number
          slug?: string
          sort_order?: number
          tagline?: string | null
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "store_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          marketing_opt_in: boolean
          order_updates_opt_in: boolean
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          marketing_opt_in?: boolean
          order_updates_opt_in?: boolean
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          marketing_opt_in?: boolean
          order_updates_opt_in?: boolean
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_sessions: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          guest_token: string
          id: string
          last_seen_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          guest_token: string
          id?: string
          last_seen_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          guest_token?: string
          id?: string
          last_seen_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      next_order_code: { Args: never; Returns: string }
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
