// Types du schéma Supabase — périmètre Stock uniquement
// Pour régénérer : npx supabase gen types typescript --project-id <id>

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          color: string;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      stores: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          address: string | null;
          phone: string | null;
          email: string | null;
          is_online: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['stores']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['stores']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          store_id: string;
          category_id: string | null;
          name: string;
          sku: string | null;
          barcode: string | null;
          description: string | null;
          image_url: string | null;
          cost_price: number;
          selling_price: number;
          stock_quantity: number;
          low_stock_alert: number;
          unit: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      stock_movements: {
        Row: {
          id: string;
          product_id: string;
          store_id: string;
          type: 'in' | 'out' | 'adjustment';
          quantity: number;
          reason: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['stock_movements']['Row'], 'id' | 'created_at'>;
        Update: never; // les mouvements sont immuables
      };
    };
    Functions: {
      apply_stock_movement: {
        Args: {
          p_product_id: string;
          p_store_id: string;
          p_type: 'in' | 'out' | 'adjustment';
          p_quantity: number;
          p_reason?: string | null;
          p_created_by?: string | null;
        };
        Returns: void;
      };
    };
  };
}

// ── Types utilitaires stock ──────────────────────────────────
export type Store    = Database['public']['Tables']['stores']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Product  = Database['public']['Tables']['products']['Row'];
