export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'manager' | 'staff';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: UserRole;
          is_approved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role: UserRole;
          is_approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: UserRole;
          is_approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      brands: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          brand_id: string;
          category_id: string;
          description: string | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          brand_id: string;
          category_id: string;
          description?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          brand_id?: string;
          category_id?: string;
          description?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          size_ml: number;
          sku: string;
          upc: string | null;
          cost: number;
          price: number;
          allocation_only: boolean;
          collectible: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          size_ml: number;
          sku: string;
          upc?: string | null;
          cost: number;
          price: number;
          allocation_only?: boolean;
          collectible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          size_ml?: number;
          sku?: string;
          upc?: string | null;
          cost?: number;
          price?: number;
          allocation_only?: boolean;
          collectible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      distributors: {
        Row: {
          id: string;
          name: string;
          contact_name: string | null;
          email: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      purchase_orders: {
        Row: {
          id: string;
          po_number: string;
          distributor_id: string;
          status: 'draft' | 'sent' | 'received' | 'cancelled';
          total_amount: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          po_number: string;
          distributor_id: string;
          status?: 'draft' | 'sent' | 'received' | 'cancelled';
          total_amount?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          po_number?: string;
          distributor_id?: string;
          status?: 'draft' | 'sent' | 'received' | 'cancelled';
          total_amount?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      po_items: {
        Row: {
          id: string;
          po_id: string;
          variant_id: string;
          quantity: number;
          unit_cost: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          po_id: string;
          variant_id: string;
          quantity: number;
          unit_cost: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          po_id?: string;
          variant_id?: string;
          quantity?: number;
          unit_cost?: number;
          created_at?: string;
        };
      };
      inventory_locations: {
        Row: {
          id: string;
          name: string;
          type: 'floor' | 'backroom' | 'warehouse';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: 'floor' | 'backroom' | 'warehouse';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: 'floor' | 'backroom' | 'warehouse';
          created_at?: string;
          updated_at?: string;
        };
      };
      receiving_sessions: {
        Row: {
          id: string;
          po_id: string | null;
          received_by: string;
          status: 'in_progress' | 'completed';
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          po_id?: string | null;
          received_by: string;
          status?: 'in_progress' | 'completed';
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          po_id?: string | null;
          received_by?: string;
          status?: 'in_progress' | 'completed';
          created_at?: string;
          completed_at?: string | null;
        };
      };
      received_items: {
        Row: {
          id: string;
          session_id: string;
          variant_id: string;
          location_id: string;
          quantity: number;
          lot_number: string | null;
          expiry_date: string | null;
          damage_photo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          variant_id: string;
          location_id: string;
          quantity: number;
          lot_number?: string | null;
          expiry_date?: string | null;
          damage_photo_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          variant_id?: string;
          location_id?: string;
          quantity?: number;
          lot_number?: string | null;
          expiry_date?: string | null;
          damage_photo_url?: string | null;
          created_at?: string;
        };
      };
      stock_levels: {
        Row: {
          id: string;
          variant_id: string;
          location_id: string;
          quantity: number;
          lot_number: string | null;
          expiry_date: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          location_id: string;
          quantity: number;
          lot_number?: string | null;
          expiry_date?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          location_id?: string;
          quantity?: number;
          lot_number?: string | null;
          expiry_date?: string | null;
          updated_at?: string;
        };
      };
      inventory_transactions: {
        Row: {
          id: string;
          variant_id: string;
          location_id: string;
          transaction_type: 'receiving' | 'sale' | 'transfer' | 'adjustment' | 'cycle_count';
          quantity_change: number;
          lot_number: string | null;
          reference_id: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          location_id: string;
          transaction_type: 'receiving' | 'sale' | 'transfer' | 'adjustment' | 'cycle_count';
          quantity_change: number;
          lot_number?: string | null;
          reference_id?: string | null;
          notes?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          location_id?: string;
          transaction_type?: 'receiving' | 'sale' | 'transfer' | 'adjustment' | 'cycle_count';
          quantity_change?: number;
          lot_number?: string | null;
          reference_id?: string | null;
          notes?: string | null;
          created_by?: string;
          created_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          email: string | null;
          phone: string | null;
          first_name: string;
          last_name: string;
          date_of_birth: string | null;
          is_whale: boolean;
          total_spent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email?: string | null;
          phone?: string | null;
          first_name: string;
          last_name: string;
          date_of_birth?: string | null;
          is_whale?: boolean;
          total_spent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          phone?: string | null;
          first_name?: string;
          last_name?: string;
          date_of_birth?: string | null;
          is_whale?: boolean;
          total_spent?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      allocations: {
        Row: {
          id: string;
          variant_id: string;
          customer_id: string;
          quantity: number;
          status: 'pending' | 'fulfilled' | 'cancelled';
          priority: number;
          created_at: string;
          fulfilled_at: string | null;
        };
        Insert: {
          id?: string;
          variant_id: string;
          customer_id: string;
          quantity: number;
          status?: 'pending' | 'fulfilled' | 'cancelled';
          priority?: number;
          created_at?: string;
          fulfilled_at?: string | null;
        };
        Update: {
          id?: string;
          variant_id?: string;
          customer_id?: string;
          quantity?: number;
          status?: 'pending' | 'fulfilled' | 'cancelled';
          priority?: number;
          created_at?: string;
          fulfilled_at?: string | null;
        };
      };
      sales: {
        Row: {
          id: string;
          sale_number: string;
          customer_id: string | null;
          total_amount: number;
          tax_amount: number;
          excise_tax: number;
          payment_method: 'cash' | 'card' | 'split';
          sold_by: string;
          age_verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sale_number: string;
          customer_id?: string | null;
          total_amount: number;
          tax_amount: number;
          excise_tax: number;
          payment_method: 'cash' | 'card' | 'split';
          sold_by: string;
          age_verified: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          sale_number?: string;
          customer_id?: string | null;
          total_amount?: number;
          tax_amount?: number;
          excise_tax?: number;
          payment_method?: 'cash' | 'card' | 'split';
          sold_by?: string;
          age_verified?: boolean;
          created_at?: string;
        };
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          variant_id: string;
          quantity: number;
          unit_price: number;
          lot_number: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sale_id: string;
          variant_id: string;
          quantity: number;
          unit_price: number;
          lot_number?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          sale_id?: string;
          variant_id?: string;
          quantity?: number;
          unit_price?: number;
          lot_number?: string | null;
          created_at?: string;
        };
      };
      tax_rates: {
        Row: {
          id: string;
          name: string;
          rate: number;
          type: 'sales' | 'excise';
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          rate: number;
          type: 'sales' | 'excise';
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          rate?: number;
          type?: 'sales' | 'excise';
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      po_status: 'draft' | 'sent' | 'received' | 'cancelled';
      location_type: 'floor' | 'backroom' | 'warehouse';
      transaction_type: 'receiving' | 'sale' | 'transfer' | 'adjustment' | 'cycle_count';
      allocation_status: 'pending' | 'fulfilled' | 'cancelled';
      payment_method: 'cash' | 'card' | 'split';
      tax_type: 'sales' | 'excise';
    };
  };
}

