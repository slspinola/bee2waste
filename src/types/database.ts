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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
  public: {
    Tables: {
      area_groups: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          park_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          park_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          park_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "area_groups_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      area_transfers: {
        Row: {
          completed_at: string | null
          created_at: string
          from_area_id: string
          id: string
          ler_code: string | null
          ler_code_id: string | null
          notes: string | null
          operator_id: string | null
          org_id: string
          park_id: string
          status: Database["public"]["Enums"]["transfer_status"]
          to_area_id: string
          transfer_number: string
          updated_at: string
          weighing_id: string | null
          weight_kg: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          from_area_id: string
          id?: string
          ler_code?: string | null
          ler_code_id?: string | null
          notes?: string | null
          operator_id?: string | null
          org_id: string
          park_id: string
          status?: Database["public"]["Enums"]["transfer_status"]
          to_area_id: string
          transfer_number: string
          updated_at?: string
          weighing_id?: string | null
          weight_kg: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          from_area_id?: string
          id?: string
          ler_code?: string | null
          ler_code_id?: string | null
          notes?: string | null
          operator_id?: string | null
          org_id?: string
          park_id?: string
          status?: Database["public"]["Enums"]["transfer_status"]
          to_area_id?: string
          transfer_number?: string
          updated_at?: string
          weighing_id?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "area_transfers_from_area_id_fkey"
            columns: ["from_area_id"]
            isOneToOne: false
            referencedRelation: "storage_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_transfers_ler_code_id_fkey"
            columns: ["ler_code_id"]
            isOneToOne: false
            referencedRelation: "ler_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_transfers_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_transfers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_transfers_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_transfers_to_area_id_fkey"
            columns: ["to_area_id"]
            isOneToOne: false
            referencedRelation: "storage_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_transfers_weighing_id_fkey"
            columns: ["weighing_id"]
            isOneToOne: false
            referencedRelation: "weighing_records"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          org_id: string | null
          park_id: string | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string | null
          park_id?: string | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string | null
          park_id?: string | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      classification_lines: {
        Row: {
          created_at: string
          destination_area_id: string | null
          id: string
          notes: string | null
          output_ler_code: string
          output_ler_code_id: string | null
          sheet_id: string
          weighing_id: string | null
          weight_kg: number
        }
        Insert: {
          created_at?: string
          destination_area_id?: string | null
          id?: string
          notes?: string | null
          output_ler_code: string
          output_ler_code_id?: string | null
          sheet_id: string
          weighing_id?: string | null
          weight_kg: number
        }
        Update: {
          created_at?: string
          destination_area_id?: string | null
          id?: string
          notes?: string | null
          output_ler_code?: string
          output_ler_code_id?: string | null
          sheet_id?: string
          weighing_id?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "classification_lines_destination_area_id_fkey"
            columns: ["destination_area_id"]
            isOneToOne: false
            referencedRelation: "storage_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classification_lines_output_ler_code_id_fkey"
            columns: ["output_ler_code_id"]
            isOneToOne: false
            referencedRelation: "ler_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classification_lines_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "classification_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classification_lines_weighing_id_fkey"
            columns: ["weighing_id"]
            isOneToOne: false
            referencedRelation: "weighing_records"
            referencedColumns: ["id"]
          },
        ]
      }
      classification_sheets: {
        Row: {
          completed_at: string | null
          created_at: string
          entry_id: string
          id: string
          loss_kg: number | null
          notes: string | null
          operator_id: string | null
          org_id: string
          park_id: string
          sheet_number: string
          source_ler_code: string | null
          source_weight_kg: number | null
          status: Database["public"]["Enums"]["classification_status"]
          total_output_kg: number | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          entry_id: string
          id?: string
          loss_kg?: number | null
          notes?: string | null
          operator_id?: string | null
          org_id: string
          park_id: string
          sheet_number: string
          source_ler_code?: string | null
          source_weight_kg?: number | null
          status?: Database["public"]["Enums"]["classification_status"]
          total_output_kg?: number | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          entry_id?: string
          id?: string
          loss_kg?: number | null
          notes?: string | null
          operator_id?: string | null
          org_id?: string
          park_id?: string
          sheet_number?: string
          source_ler_code?: string | null
          source_weight_kg?: number | null
          status?: Database["public"]["Enums"]["classification_status"]
          total_output_kg?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classification_sheets_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classification_sheets_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classification_sheets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classification_sheets_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      client_ler_authorizations: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_active: boolean
          ler_code: string
          ler_code_id: string
          max_quantity_kg: number | null
          notes: string | null
          operation_type: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          ler_code: string
          ler_code_id: string
          max_quantity_kg?: number | null
          notes?: string | null
          operation_type?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          ler_code?: string
          ler_code_id?: string
          max_quantity_kg?: number | null
          notes?: string | null
          operation_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_ler_authorizations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_ler_authorizations_ler_code_id_fkey"
            columns: ["ler_code_id"]
            isOneToOne: false
            referencedRelation: "ler_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      client_park_associations: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_active: boolean
          park_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          park_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          park_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_park_associations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_park_associations_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      client_production_cycles: {
        Row: {
          avg_interval_days: number | null
          client_id: string
          confidence: number | null
          entry_count: number
          id: string
          last_calculated_at: string
          last_entry_date: string | null
          next_predicted_date: string | null
          park_id: string
          std_dev_days: number | null
        }
        Insert: {
          avg_interval_days?: number | null
          client_id: string
          confidence?: number | null
          entry_count?: number
          id?: string
          last_calculated_at?: string
          last_entry_date?: string | null
          next_predicted_date?: string | null
          park_id: string
          std_dev_days?: number | null
        }
        Update: {
          avg_interval_days?: number | null
          client_id?: string
          confidence?: number | null
          entry_count?: number
          id?: string
          last_calculated_at?: string
          last_entry_date?: string | null
          next_predicted_date?: string | null
          park_id?: string
          std_dev_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_production_cycles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_production_cycles_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          address_geocoded_at: string | null
          apa_number: string | null
          city: string | null
          client_type: Database["public"]["Enums"]["client_type"]
          contact_person: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          lat: number | null
          lng: number | null
          name: string
          nif: string | null
          notes: string | null
          org_id: string
          payment_terms_days: number | null
          phone: string | null
          postal_code: string | null
          siliamb_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_geocoded_at?: string | null
          apa_number?: string | null
          city?: string | null
          client_type?: Database["public"]["Enums"]["client_type"]
          contact_person?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          nif?: string | null
          notes?: string | null
          org_id: string
          payment_terms_days?: number | null
          phone?: string | null
          postal_code?: string | null
          siliamb_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_geocoded_at?: string | null
          apa_number?: string | null
          city?: string | null
          client_type?: Database["public"]["Enums"]["client_type"]
          contact_person?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          nif?: string | null
          notes?: string | null
          org_id?: string
          payment_terms_days?: number | null
          phone?: string | null
          postal_code?: string | null
          siliamb_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_prices: {
        Row: {
          contract_id: string
          created_at: string
          currency: string | null
          id: string
          ler_code: string
          ler_code_id: string
          notes: string | null
          price_per_ton: number
        }
        Insert: {
          contract_id: string
          created_at?: string
          currency?: string | null
          id?: string
          ler_code: string
          ler_code_id: string
          notes?: string | null
          price_per_ton: number
        }
        Update: {
          contract_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          ler_code?: string
          ler_code_id?: string
          notes?: string | null
          price_per_ton?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_prices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_prices_ler_code_id_fkey"
            columns: ["ler_code_id"]
            isOneToOne: false
            referencedRelation: "ler_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          auto_renew: boolean | null
          client_id: string
          contract_number: string
          created_at: string
          end_date: string | null
          id: string
          notes: string | null
          org_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"]
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean | null
          client_id: string
          contract_number: string
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          org_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean | null
          client_id?: string
          contract_number?: string
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_lines: {
        Row: {
          actual_weight_kg: number | null
          created_at: string
          id: string
          ler_code: string
          ler_code_id: string | null
          notes: string | null
          planned_weight_kg: number
          request_id: string
          source_area_id: string | null
          weighing_id: string | null
        }
        Insert: {
          actual_weight_kg?: number | null
          created_at?: string
          id?: string
          ler_code: string
          ler_code_id?: string | null
          notes?: string | null
          planned_weight_kg: number
          request_id: string
          source_area_id?: string | null
          weighing_id?: string | null
        }
        Update: {
          actual_weight_kg?: number | null
          created_at?: string
          id?: string
          ler_code?: string
          ler_code_id?: string | null
          notes?: string | null
          planned_weight_kg?: number
          request_id?: string
          source_area_id?: string | null
          weighing_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_lines_ler_code_id_fkey"
            columns: ["ler_code_id"]
            isOneToOne: false
            referencedRelation: "ler_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_lines_source_area_id_fkey"
            columns: ["source_area_id"]
            isOneToOne: false
            referencedRelation: "storage_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_lines_weighing_id_fkey"
            columns: ["weighing_id"]
            isOneToOne: false
            referencedRelation: "weighing_records"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_requests: {
        Row: {
          actual_date: string | null
          client_id: string | null
          confirmed_at: string | null
          created_at: string
          currency: string | null
          destination_address: string | null
          destination_name: string | null
          destination_nif: string | null
          destination_park_id: string | null
          driver_name: string | null
          egar_id: string | null
          egar_number: string | null
          exit_type: Database["public"]["Enums"]["exit_type"]
          id: string
          notes: string | null
          operator_id: string | null
          org_id: string
          park_id: string
          planned_date: string | null
          request_number: string
          status: Database["public"]["Enums"]["delivery_status"]
          total_value: number | null
          total_weight_kg: number | null
          transporter_name: string | null
          transporter_nif: string | null
          updated_at: string
          vehicle_plate: string | null
        }
        Insert: {
          actual_date?: string | null
          client_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string | null
          destination_address?: string | null
          destination_name?: string | null
          destination_nif?: string | null
          destination_park_id?: string | null
          driver_name?: string | null
          egar_id?: string | null
          egar_number?: string | null
          exit_type: Database["public"]["Enums"]["exit_type"]
          id?: string
          notes?: string | null
          operator_id?: string | null
          org_id: string
          park_id: string
          planned_date?: string | null
          request_number: string
          status?: Database["public"]["Enums"]["delivery_status"]
          total_value?: number | null
          total_weight_kg?: number | null
          transporter_name?: string | null
          transporter_nif?: string | null
          updated_at?: string
          vehicle_plate?: string | null
        }
        Update: {
          actual_date?: string | null
          client_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string | null
          destination_address?: string | null
          destination_name?: string | null
          destination_nif?: string | null
          destination_park_id?: string | null
          driver_name?: string | null
          egar_id?: string | null
          egar_number?: string | null
          exit_type?: Database["public"]["Enums"]["exit_type"]
          id?: string
          notes?: string | null
          operator_id?: string | null
          org_id?: string
          park_id?: string
          planned_date?: string | null
          request_number?: string
          status?: Database["public"]["Enums"]["delivery_status"]
          total_value?: number | null
          total_weight_kg?: number | null
          transporter_name?: string | null
          transporter_nif?: string | null
          updated_at?: string
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_destination_park_id_fkey"
            columns: ["destination_park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_egar_id_fkey"
            columns: ["egar_id"]
            isOneToOne: false
            referencedRelation: "egar_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      egar_records: {
        Row: {
          actual_weight_kg: number | null
          confirmed_at: string | null
          created_at: string
          declared_weight_kg: number | null
          destination_address: string | null
          destination_name: string | null
          destination_nif: string | null
          egar_number: string
          egar_type: Database["public"]["Enums"]["egar_type"]
          id: string
          ler_code: string | null
          ler_code_id: string | null
          notes: string | null
          org_id: string
          origin_address: string | null
          origin_name: string | null
          origin_nif: string | null
          park_id: string
          silamb_response: Json | null
          status: Database["public"]["Enums"]["egar_status"]
          transporter_name: string | null
          transporter_nif: string | null
          transporter_plate: string | null
          updated_at: string
          validated_at: string | null
        }
        Insert: {
          actual_weight_kg?: number | null
          confirmed_at?: string | null
          created_at?: string
          declared_weight_kg?: number | null
          destination_address?: string | null
          destination_name?: string | null
          destination_nif?: string | null
          egar_number: string
          egar_type?: Database["public"]["Enums"]["egar_type"]
          id?: string
          ler_code?: string | null
          ler_code_id?: string | null
          notes?: string | null
          org_id: string
          origin_address?: string | null
          origin_name?: string | null
          origin_nif?: string | null
          park_id: string
          silamb_response?: Json | null
          status?: Database["public"]["Enums"]["egar_status"]
          transporter_name?: string | null
          transporter_nif?: string | null
          transporter_plate?: string | null
          updated_at?: string
          validated_at?: string | null
        }
        Update: {
          actual_weight_kg?: number | null
          confirmed_at?: string | null
          created_at?: string
          declared_weight_kg?: number | null
          destination_address?: string | null
          destination_name?: string | null
          destination_nif?: string | null
          egar_number?: string
          egar_type?: Database["public"]["Enums"]["egar_type"]
          id?: string
          ler_code?: string | null
          ler_code_id?: string | null
          notes?: string | null
          org_id?: string
          origin_address?: string | null
          origin_name?: string | null
          origin_nif?: string | null
          park_id?: string
          silamb_response?: Json | null
          status?: Database["public"]["Enums"]["egar_status"]
          transporter_name?: string | null
          transporter_nif?: string | null
          transporter_plate?: string | null
          updated_at?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "egar_records_ler_code_id_fkey"
            columns: ["ler_code_id"]
            isOneToOne: false
            referencedRelation: "ler_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "egar_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "egar_records_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      entries: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          client_id: string | null
          confirmed_at: string | null
          created_at: string
          driver_name: string | null
          egar_id: string | null
          egar_number: string | null
          entity_contact: string | null
          entity_name: string | null
          entity_nif: string | null
          entry_number: string
          gross_weighing_id: string | null
          gross_weight_kg: number | null
          id: string
          inspected_at: string | null
          inspected_by: string | null
          inspection_notes: string | null
          inspection_photos: string[] | null
          inspection_result:
            | Database["public"]["Enums"]["inspection_result"]
            | null
          is_hazardous: boolean
          ler_code: string | null
          ler_code_id: string | null
          net_weight_kg: number | null
          operator_id: string | null
          org_id: string
          park_id: string
          pedido_recolha_id: string | null
          requires_invoice: boolean
          rota_id: string | null
          status: Database["public"]["Enums"]["entry_status"]
          storage_area_id: string | null
          tare_weighing_id: string | null
          tare_weight_kg: number | null
          updated_at: string
          vehicle_plate: string | null
          vfv_data: Json | null
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          driver_name?: string | null
          egar_id?: string | null
          egar_number?: string | null
          entity_contact?: string | null
          entity_name?: string | null
          entity_nif?: string | null
          entry_number: string
          gross_weighing_id?: string | null
          gross_weight_kg?: number | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          inspection_notes?: string | null
          inspection_photos?: string[] | null
          inspection_result?:
            | Database["public"]["Enums"]["inspection_result"]
            | null
          is_hazardous?: boolean
          ler_code?: string | null
          ler_code_id?: string | null
          net_weight_kg?: number | null
          operator_id?: string | null
          org_id: string
          park_id: string
          pedido_recolha_id?: string | null
          requires_invoice?: boolean
          rota_id?: string | null
          status?: Database["public"]["Enums"]["entry_status"]
          storage_area_id?: string | null
          tare_weighing_id?: string | null
          tare_weight_kg?: number | null
          updated_at?: string
          vehicle_plate?: string | null
          vfv_data?: Json | null
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          driver_name?: string | null
          egar_id?: string | null
          egar_number?: string | null
          entity_contact?: string | null
          entity_name?: string | null
          entity_nif?: string | null
          entry_number?: string
          gross_weighing_id?: string | null
          gross_weight_kg?: number | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          inspection_notes?: string | null
          inspection_photos?: string[] | null
          inspection_result?:
            | Database["public"]["Enums"]["inspection_result"]
            | null
          is_hazardous?: boolean
          ler_code?: string | null
          ler_code_id?: string | null
          net_weight_kg?: number | null
          operator_id?: string | null
          org_id?: string
          park_id?: string
          pedido_recolha_id?: string | null
          requires_invoice?: boolean
          rota_id?: string | null
          status?: Database["public"]["Enums"]["entry_status"]
          storage_area_id?: string | null
          tare_weighing_id?: string | null
          tare_weight_kg?: number | null
          updated_at?: string
          vehicle_plate?: string | null
          vfv_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "entries_egar_id_fkey"
            columns: ["egar_id"]
            isOneToOne: false
            referencedRelation: "egar_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_gross_weighing_id_fkey"
            columns: ["gross_weighing_id"]
            isOneToOne: false
            referencedRelation: "weighing_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_inspected_by_fkey"
            columns: ["inspected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_ler_code_id_fkey"
            columns: ["ler_code_id"]
            isOneToOne: false
            referencedRelation: "ler_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_pedido_recolha_id_fkey"
            columns: ["pedido_recolha_id"]
            isOneToOne: false
            referencedRelation: "pedidos_recolha"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_storage_area_id_fkey"
            columns: ["storage_area_id"]
            isOneToOne: false
            referencedRelation: "storage_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_tare_weighing_id_fkey"
            columns: ["tare_weighing_id"]
            isOneToOne: false
            referencedRelation: "weighing_records"
            referencedColumns: ["id"]
          },
        ]
      }
      exits: {
        Row: {
          confirmed_at: string | null
          created_at: string
          egar_id: string | null
          egar_number: string | null
          exit_number: string
          gross_weighing_id: string | null
          gross_weight_kg: number | null
          guide_date: string | null
          guide_number: string | null
          id: string
          net_weight_kg: number | null
          org_id: string
          park_id: string
          request_id: string | null
          tare_weighing_id: string | null
          tare_weight_kg: number | null
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          egar_id?: string | null
          egar_number?: string | null
          exit_number: string
          gross_weighing_id?: string | null
          gross_weight_kg?: number | null
          guide_date?: string | null
          guide_number?: string | null
          id?: string
          net_weight_kg?: number | null
          org_id: string
          park_id: string
          request_id?: string | null
          tare_weighing_id?: string | null
          tare_weight_kg?: number | null
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          egar_id?: string | null
          egar_number?: string | null
          exit_number?: string
          gross_weighing_id?: string | null
          gross_weight_kg?: number | null
          guide_date?: string | null
          guide_number?: string | null
          id?: string
          net_weight_kg?: number | null
          org_id?: string
          park_id?: string
          request_id?: string | null
          tare_weighing_id?: string | null
          tare_weight_kg?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exits_egar_id_fkey"
            columns: ["egar_id"]
            isOneToOne: false
            referencedRelation: "egar_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exits_gross_weighing_id_fkey"
            columns: ["gross_weighing_id"]
            isOneToOne: false
            referencedRelation: "weighing_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exits_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exits_tare_weighing_id_fkey"
            columns: ["tare_weighing_id"]
            isOneToOne: false
            referencedRelation: "weighing_records"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_divergences: {
        Row: {
          created_at: string
          description: string
          divergence_type: Database["public"]["Enums"]["divergence_type"]
          entry_id: string
          id: string
          photos: string[] | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["divergence_severity"]
        }
        Insert: {
          created_at?: string
          description: string
          divergence_type: Database["public"]["Enums"]["divergence_type"]
          entry_id: string
          id?: string
          photos?: string[] | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["divergence_severity"]
        }
        Update: {
          created_at?: string
          description?: string
          divergence_type?: Database["public"]["Enums"]["divergence_type"]
          entry_id?: string
          id?: string
          photos?: string[] | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["divergence_severity"]
        }
        Relationships: [
          {
            foreignKeyName: "inspection_divergences_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_divergences_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ler_codes: {
        Row: {
          chapter: string
          code: string
          created_at: string
          description_en: string | null
          description_pt: string
          id: string
          is_active: boolean
          is_hazardous: boolean
          is_mirror: boolean
          parent_code: string | null
          sub_chapter: string | null
        }
        Insert: {
          chapter: string
          code: string
          created_at?: string
          description_en?: string | null
          description_pt: string
          id?: string
          is_active?: boolean
          is_hazardous?: boolean
          is_mirror?: boolean
          parent_code?: string | null
          sub_chapter?: string | null
        }
        Update: {
          chapter?: string
          code?: string
          created_at?: string
          description_en?: string | null
          description_pt?: string
          id?: string
          is_active?: boolean
          is_hazardous?: boolean
          is_mirror?: boolean
          parent_code?: string | null
          sub_chapter?: string | null
        }
        Relationships: []
      }
      lot_entries: {
        Row: {
          added_at: string
          contribution_kg: number
          entry_id: string
          entry_raw_grade: number | null
          id: string
          lot_id: string
        }
        Insert: {
          added_at?: string
          contribution_kg: number
          entry_id: string
          entry_raw_grade?: number | null
          id?: string
          lot_id: string
        }
        Update: {
          added_at?: string
          contribution_kg?: number
          entry_id?: string
          entry_raw_grade?: number | null
          id?: string
          lot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lot_entries_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_entries_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      lot_zones: {
        Row: {
          added_at: string
          id: string
          lot_id: string
          removed_at: string | null
          zone_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          lot_id: string
          removed_at?: string | null
          zone_id: string
        }
        Update: {
          added_at?: string
          id?: string
          lot_id?: string
          removed_at?: string | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lot_zones_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_zones_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "storage_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      lots: {
        Row: {
          allowed_ler_code_ids: string[]
          allowed_ler_codes: string[]
          classification_sheet_id: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          lot_number: string
          lot_quality_index: number | null
          lqi_grade: Database["public"]["Enums"]["lqi_letter"] | null
          name: string | null
          notes: string | null
          opened_at: string
          org_id: string
          park_id: string
          raw_grade: number | null
          status: Database["public"]["Enums"]["lot_status"]
          total_input_kg: number
          total_output_kg: number | null
          transformed_grade: number | null
          treatment_started_at: string | null
          updated_at: string
          yield_rate: number | null
        }
        Insert: {
          allowed_ler_code_ids?: string[]
          allowed_ler_codes?: string[]
          classification_sheet_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lot_number: string
          lot_quality_index?: number | null
          lqi_grade?: Database["public"]["Enums"]["lqi_letter"] | null
          name?: string | null
          notes?: string | null
          opened_at?: string
          org_id: string
          park_id: string
          raw_grade?: number | null
          status?: Database["public"]["Enums"]["lot_status"]
          total_input_kg?: number
          total_output_kg?: number | null
          transformed_grade?: number | null
          treatment_started_at?: string | null
          updated_at?: string
          yield_rate?: number | null
        }
        Update: {
          allowed_ler_code_ids?: string[]
          allowed_ler_codes?: string[]
          classification_sheet_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lot_number?: string
          lot_quality_index?: number | null
          lqi_grade?: Database["public"]["Enums"]["lqi_letter"] | null
          name?: string | null
          notes?: string | null
          opened_at?: string
          org_id?: string
          park_id?: string
          raw_grade?: number | null
          status?: Database["public"]["Enums"]["lot_status"]
          total_input_kg?: number
          total_output_kg?: number | null
          transformed_grade?: number | null
          treatment_started_at?: string | null
          updated_at?: string
          yield_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lots_classification_sheet_id_fkey"
            columns: ["classification_sheet_id"]
            isOneToOne: false
            referencedRelation: "classification_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencao_viaturas: {
        Row: {
          created_at: string
          custo: number | null
          data_agendada: string | null
          data_realizada: string | null
          descricao: string
          id: string
          notas: string | null
          proxima_data: string | null
          proximo_km: number | null
          realizado_por: string | null
          tipo: Database["public"]["Enums"]["maintenance_type"]
          viatura_id: string
        }
        Insert: {
          created_at?: string
          custo?: number | null
          data_agendada?: string | null
          data_realizada?: string | null
          descricao: string
          id?: string
          notas?: string | null
          proxima_data?: string | null
          proximo_km?: number | null
          realizado_por?: string | null
          tipo?: Database["public"]["Enums"]["maintenance_type"]
          viatura_id: string
        }
        Update: {
          created_at?: string
          custo?: number | null
          data_agendada?: string | null
          data_realizada?: string | null
          descricao?: string
          id?: string
          notas?: string | null
          proxima_data?: string | null
          proximo_km?: number | null
          realizado_por?: string | null
          tipo?: Database["public"]["Enums"]["maintenance_type"]
          viatura_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencao_viaturas_viatura_id_fkey"
            columns: ["viatura_id"]
            isOneToOne: false
            referencedRelation: "viaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      market_prices: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          effective_date: string
          id: string
          ler_code: string
          notes: string | null
          park_id: string
          price_per_ton: number
          product_type: string | null
          source: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_date: string
          id?: string
          ler_code: string
          notes?: string | null
          park_id: string
          price_per_ton: number
          product_type?: string | null
          source?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_date?: string
          id?: string
          ler_code?: string
          notes?: string | null
          park_id?: string
          price_per_ton?: number
          product_type?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_prices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_prices_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      motoristas: {
        Row: {
          adr_certificado: boolean
          categorias_licenca: string[] | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          licenca_validade: string | null
          nome: string
          numero_licenca: string | null
          org_id: string
          park_id: string
          profile_id: string | null
          telefone: string | null
          turno_fim: string | null
          turno_inicio: string | null
          updated_at: string
          viatura_default_id: string | null
        }
        Insert: {
          adr_certificado?: boolean
          categorias_licenca?: string[] | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          licenca_validade?: string | null
          nome: string
          numero_licenca?: string | null
          org_id: string
          park_id: string
          profile_id?: string | null
          telefone?: string | null
          turno_fim?: string | null
          turno_inicio?: string | null
          updated_at?: string
          viatura_default_id?: string | null
        }
        Update: {
          adr_certificado?: boolean
          categorias_licenca?: string[] | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          licenca_validade?: string | null
          nome?: string
          numero_licenca?: string | null
          org_id?: string
          park_id?: string
          profile_id?: string | null
          telefone?: string | null
          turno_fim?: string | null
          turno_inicio?: string | null
          updated_at?: string
          viatura_default_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "motoristas_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motoristas_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motoristas_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motoristas_viatura_default_id_fkey"
            columns: ["viatura_default_id"]
            isOneToOne: false
            referencedRelation: "viaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      non_conformities: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          corrective_action: string | null
          created_at: string
          description: string
          entry_id: string | null
          id: string
          nc_number: string
          nc_type: Database["public"]["Enums"]["nc_type"]
          org_id: string
          park_id: string
          photos: string[] | null
          preventive_action: string | null
          reported_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["nc_severity"]
          sheet_id: string | null
          status: Database["public"]["Enums"]["nc_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          corrective_action?: string | null
          created_at?: string
          description: string
          entry_id?: string | null
          id?: string
          nc_number: string
          nc_type: Database["public"]["Enums"]["nc_type"]
          org_id: string
          park_id: string
          photos?: string[] | null
          preventive_action?: string | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["nc_severity"]
          sheet_id?: string | null
          status?: Database["public"]["Enums"]["nc_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          corrective_action?: string | null
          created_at?: string
          description?: string
          entry_id?: string | null
          id?: string
          nc_number?: string
          nc_type?: Database["public"]["Enums"]["nc_type"]
          org_id?: string
          park_id?: string
          photos?: string[] | null
          preventive_action?: string | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["nc_severity"]
          sheet_id?: string | null
          status?: Database["public"]["Enums"]["nc_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "non_conformities_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "classification_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          nif: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          nif?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          nif?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      park_ler_authorizations: {
        Row: {
          annual_limit_kg: number | null
          created_at: string
          id: string
          is_active: boolean
          ler_code_id: string
          max_capacity_kg: number | null
          notes: string | null
          operation_type: Database["public"]["Enums"]["ler_operation_type"]
          park_id: string
          updated_at: string
        }
        Insert: {
          annual_limit_kg?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          ler_code_id: string
          max_capacity_kg?: number | null
          notes?: string | null
          operation_type?: Database["public"]["Enums"]["ler_operation_type"]
          park_id: string
          updated_at?: string
        }
        Update: {
          annual_limit_kg?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          ler_code_id?: string
          max_capacity_kg?: number | null
          notes?: string | null
          operation_type?: Database["public"]["Enums"]["ler_operation_type"]
          park_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "park_ler_authorizations_ler_code_id_fkey"
            columns: ["ler_code_id"]
            isOneToOne: false
            referencedRelation: "ler_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "park_ler_authorizations_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      parks: {
        Row: {
          address: string | null
          code: string
          coordinates: unknown
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          license_expiry: string | null
          license_number: string | null
          name: string
          org_id: string
          phone: string | null
          settings: Json
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          coordinates?: unknown
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          license_expiry?: string | null
          license_number?: string | null
          name: string
          org_id: string
          phone?: string | null
          settings?: Json
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          coordinates?: unknown
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          license_expiry?: string | null
          license_number?: string | null
          name?: string
          org_id?: string
          phone?: string | null
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_recolha: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cidade_recolha: string | null
          client_id: string | null
          codigo_postal_recolha: string | null
          collection_lat: number | null
          collection_lng: number | null
          completed_at: string | null
          contacto_local: string | null
          contract_ref: string | null
          created_at: string
          created_by: string | null
          data_agendada: string | null
          data_pedido: string
          data_preferida_fim: string | null
          data_preferida_inicio: string | null
          descricao_residuo: string | null
          entry_id: string | null
          failure_reason: string | null
          id: string
          instrucoes_especiais: string | null
          ler_code: string | null
          ler_code_id: string | null
          morada_recolha: string | null
          notas: string | null
          numero_pedido: string
          org_id: string
          park_id: string
          planning_score: number | null
          prioridade: Database["public"]["Enums"]["order_priority"]
          quantidade_estimada_kg: number | null
          quantidade_real_kg: number | null
          score_breakdown: Json | null
          sla_deadline: string | null
          status: Database["public"]["Enums"]["order_status"]
          submitted_by_client_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cidade_recolha?: string | null
          client_id?: string | null
          codigo_postal_recolha?: string | null
          collection_lat?: number | null
          collection_lng?: number | null
          completed_at?: string | null
          contacto_local?: string | null
          contract_ref?: string | null
          created_at?: string
          created_by?: string | null
          data_agendada?: string | null
          data_pedido?: string
          data_preferida_fim?: string | null
          data_preferida_inicio?: string | null
          descricao_residuo?: string | null
          entry_id?: string | null
          failure_reason?: string | null
          id?: string
          instrucoes_especiais?: string | null
          ler_code?: string | null
          ler_code_id?: string | null
          morada_recolha?: string | null
          notas?: string | null
          numero_pedido: string
          org_id: string
          park_id: string
          planning_score?: number | null
          prioridade?: Database["public"]["Enums"]["order_priority"]
          quantidade_estimada_kg?: number | null
          quantidade_real_kg?: number | null
          score_breakdown?: Json | null
          sla_deadline?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          submitted_by_client_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cidade_recolha?: string | null
          client_id?: string | null
          codigo_postal_recolha?: string | null
          collection_lat?: number | null
          collection_lng?: number | null
          completed_at?: string | null
          contacto_local?: string | null
          contract_ref?: string | null
          created_at?: string
          created_by?: string | null
          data_agendada?: string | null
          data_pedido?: string
          data_preferida_fim?: string | null
          data_preferida_inicio?: string | null
          descricao_residuo?: string | null
          entry_id?: string | null
          failure_reason?: string | null
          id?: string
          instrucoes_especiais?: string | null
          ler_code?: string | null
          ler_code_id?: string | null
          morada_recolha?: string | null
          notas?: string | null
          numero_pedido?: string
          org_id?: string
          park_id?: string
          planning_score?: number | null
          prioridade?: Database["public"]["Enums"]["order_priority"]
          quantidade_estimada_kg?: number | null
          quantidade_real_kg?: number | null
          score_breakdown?: Json | null
          sla_deadline?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          submitted_by_client_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_recolha_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_recolha_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_recolha_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_recolha_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_recolha_ler_code_id_fkey"
            columns: ["ler_code_id"]
            isOneToOne: false
            referencedRelation: "ler_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_recolha_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_recolha_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_recolha_submitted_by_client_id_fkey"
            columns: ["submitted_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      posicoes_viaturas: {
        Row: {
          heading_deg: number | null
          id: number
          lat: number
          lng: number
          recorded_at: string
          rota_id: string | null
          velocidade_kmh: number | null
          viatura_id: string
        }
        Insert: {
          heading_deg?: number | null
          id?: number
          lat: number
          lng: number
          recorded_at?: string
          rota_id?: string | null
          velocidade_kmh?: number | null
          viatura_id: string
        }
        Update: {
          heading_deg?: number | null
          id?: number
          lat?: number
          lng?: number
          recorded_at?: string
          rota_id?: string | null
          velocidade_kmh?: number | null
          viatura_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posicoes_viaturas_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posicoes_viaturas_viatura_id_fkey"
            columns: ["viatura_id"]
            isOneToOne: false
            referencedRelation: "viaturas"
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
          is_active: boolean
          org_id: string | null
          phone: string | null
          preferred_locale: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          org_id?: string | null
          phone?: string | null
          preferred_locale?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          org_id?: string | null
          phone?: string | null
          preferred_locale?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rota_paragens: {
        Row: {
          assinatura_url: string | null
          created_at: string
          failure_reason: string | null
          fotos: string[] | null
          hora_chegada_estimada: string | null
          hora_chegada_real: string | null
          hora_saida_real: string | null
          id: string
          notas: string | null
          ordem: number
          pedido_id: string
          quantidade_real_kg: number | null
          rota_id: string
          status: Database["public"]["Enums"]["stop_status"]
          updated_at: string
        }
        Insert: {
          assinatura_url?: string | null
          created_at?: string
          failure_reason?: string | null
          fotos?: string[] | null
          hora_chegada_estimada?: string | null
          hora_chegada_real?: string | null
          hora_saida_real?: string | null
          id?: string
          notas?: string | null
          ordem: number
          pedido_id: string
          quantidade_real_kg?: number | null
          rota_id: string
          status?: Database["public"]["Enums"]["stop_status"]
          updated_at?: string
        }
        Update: {
          assinatura_url?: string | null
          created_at?: string
          failure_reason?: string | null
          fotos?: string[] | null
          hora_chegada_estimada?: string | null
          hora_chegada_real?: string | null
          hora_saida_real?: string | null
          id?: string
          notas?: string | null
          ordem?: number
          pedido_id?: string
          quantidade_real_kg?: number | null
          rota_id?: string
          status?: Database["public"]["Enums"]["stop_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rota_paragens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_recolha"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rota_paragens_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas"
            referencedColumns: ["id"]
          },
        ]
      }
      rotas: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          data_rota: string
          distancia_total_km: number | null
          hora_chegada: string | null
          hora_partida: string | null
          id: string
          motorista_id: string | null
          notas: string | null
          num_paragens: number
          numero_rota: string
          org_id: string
          park_id: string
          peso_total_planeado_kg: number | null
          peso_total_real_kg: number | null
          rota_geojson: Json | null
          status: Database["public"]["Enums"]["route_status"]
          updated_at: string
          viatura_id: string | null
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          data_rota: string
          distancia_total_km?: number | null
          hora_chegada?: string | null
          hora_partida?: string | null
          id?: string
          motorista_id?: string | null
          notas?: string | null
          num_paragens?: number
          numero_rota: string
          org_id: string
          park_id: string
          peso_total_planeado_kg?: number | null
          peso_total_real_kg?: number | null
          rota_geojson?: Json | null
          status?: Database["public"]["Enums"]["route_status"]
          updated_at?: string
          viatura_id?: string | null
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          data_rota?: string
          distancia_total_km?: number | null
          hora_chegada?: string | null
          hora_partida?: string | null
          id?: string
          motorista_id?: string | null
          notas?: string | null
          num_paragens?: number
          numero_rota?: string
          org_id?: string
          park_id?: string
          peso_total_planeado_kg?: number | null
          peso_total_real_kg?: number | null
          rota_geojson?: Json | null
          status?: Database["public"]["Enums"]["route_status"]
          updated_at?: string
          viatura_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rotas_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_viatura_id_fkey"
            columns: ["viatura_id"]
            isOneToOne: false
            referencedRelation: "viaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      scales: {
        Row: {
          calibration_certificate: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          last_calibration: string | null
          max_capacity_kg: number
          min_capacity_kg: number
          mock_endpoint_url: string | null
          name: string
          next_calibration: string | null
          park_id: string
          precision_kg: number
          scale_type: Database["public"]["Enums"]["scale_type"]
          updated_at: string
        }
        Insert: {
          calibration_certificate?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_calibration?: string | null
          max_capacity_kg: number
          min_capacity_kg?: number
          mock_endpoint_url?: string | null
          name: string
          next_calibration?: string | null
          park_id: string
          precision_kg?: number
          scale_type?: Database["public"]["Enums"]["scale_type"]
          updated_at?: string
        }
        Update: {
          calibration_certificate?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_calibration?: string | null
          max_capacity_kg?: number
          min_capacity_kg?: number
          mock_endpoint_url?: string | null
          name?: string
          next_calibration?: string | null
          park_id?: string
          precision_kg?: number
          scale_type?: Database["public"]["Enums"]["scale_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scales_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          area_id: string
          balance_after_kg: number
          classification_sheet_id: string | null
          created_at: string
          delivery_request_id: string | null
          entry_id: string | null
          exit_id: string | null
          id: string
          ler_code: string
          ler_code_id: string | null
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          notes: string | null
          operator_id: string | null
          org_id: string
          park_id: string
          quantity_kg: number
          transfer_id: string | null
        }
        Insert: {
          area_id: string
          balance_after_kg?: number
          classification_sheet_id?: string | null
          created_at?: string
          delivery_request_id?: string | null
          entry_id?: string | null
          exit_id?: string | null
          id?: string
          ler_code: string
          ler_code_id?: string | null
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          notes?: string | null
          operator_id?: string | null
          org_id: string
          park_id: string
          quantity_kg: number
          transfer_id?: string | null
        }
        Update: {
          area_id?: string
          balance_after_kg?: number
          classification_sheet_id?: string | null
          created_at?: string
          delivery_request_id?: string | null
          entry_id?: string | null
          exit_id?: string | null
          id?: string
          ler_code?: string
          ler_code_id?: string | null
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          notes?: string | null
          operator_id?: string | null
          org_id?: string
          park_id?: string
          quantity_kg?: number
          transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "storage_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_classification_sheet_id_fkey"
            columns: ["classification_sheet_id"]
            isOneToOne: false
            referencedRelation: "classification_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_delivery_request_id_fkey"
            columns: ["delivery_request_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_exit_id_fkey"
            columns: ["exit_id"]
            isOneToOne: false
            referencedRelation: "exits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_ler_code_id_fkey"
            columns: ["ler_code_id"]
            isOneToOne: false
            referencedRelation: "ler_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "area_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_areas: {
        Row: {
          allowed_ler_codes: string[] | null
          area_group_id: string | null
          area_type: Database["public"]["Enums"]["area_type"]
          blocked_at: string | null
          blocked_by: string | null
          blocked_reason: string | null
          capacity_kg: number | null
          code: string
          created_at: string
          current_stock_kg: number
          id: string
          is_active: boolean
          is_blocked: boolean
          location_description: string | null
          name: string
          park_id: string
          updated_at: string
        }
        Insert: {
          allowed_ler_codes?: string[] | null
          area_group_id?: string | null
          area_type?: Database["public"]["Enums"]["area_type"]
          blocked_at?: string | null
          blocked_by?: string | null
          blocked_reason?: string | null
          capacity_kg?: number | null
          code: string
          created_at?: string
          current_stock_kg?: number
          id?: string
          is_active?: boolean
          is_blocked?: boolean
          location_description?: string | null
          name: string
          park_id: string
          updated_at?: string
        }
        Update: {
          allowed_ler_codes?: string[] | null
          area_group_id?: string | null
          area_type?: Database["public"]["Enums"]["area_type"]
          blocked_at?: string | null
          blocked_by?: string | null
          blocked_reason?: string | null
          capacity_kg?: number | null
          code?: string
          created_at?: string
          current_stock_kg?: number
          id?: string
          is_active?: boolean
          is_blocked?: boolean
          location_description?: string | null
          name?: string
          park_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_areas_area_group_id_fkey"
            columns: ["area_group_id"]
            isOneToOne: false
            referencedRelation: "area_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storage_areas_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storage_areas_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_scores: {
        Row: {
          avg_lqi: number | null
          avg_raw_grade: number | null
          avg_yield_rate: number | null
          calculated_at: string
          client_id: string
          id: string
          lot_count: number
          org_id: string
          park_id: string | null
          period_end: string
          period_start: string
          score_letter: Database["public"]["Enums"]["lqi_letter"] | null
          total_kg: number
        }
        Insert: {
          avg_lqi?: number | null
          avg_raw_grade?: number | null
          avg_yield_rate?: number | null
          calculated_at?: string
          client_id: string
          id?: string
          lot_count?: number
          org_id: string
          park_id?: string | null
          period_end: string
          period_start: string
          score_letter?: Database["public"]["Enums"]["lqi_letter"] | null
          total_kg?: number
        }
        Update: {
          avg_lqi?: number | null
          avg_raw_grade?: number | null
          avg_yield_rate?: number | null
          calculated_at?: string
          client_id?: string
          id?: string
          lot_count?: number
          org_id?: string
          park_id?: string | null
          period_end?: string
          period_start?: string
          score_letter?: Database["public"]["Enums"]["lqi_letter"] | null
          total_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_scores_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_scores_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_scores_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      turnos_motoristas: {
        Row: {
          created_at: string
          data_turno: string
          hora_fim_planeada: string | null
          hora_fim_real: string | null
          hora_inicio_planeada: string | null
          hora_inicio_real: string | null
          id: string
          motorista_id: string
          notas: string | null
          status: Database["public"]["Enums"]["shift_status"]
          viatura_id: string | null
        }
        Insert: {
          created_at?: string
          data_turno: string
          hora_fim_planeada?: string | null
          hora_fim_real?: string | null
          hora_inicio_planeada?: string | null
          hora_inicio_real?: string | null
          id?: string
          motorista_id: string
          notas?: string | null
          status?: Database["public"]["Enums"]["shift_status"]
          viatura_id?: string | null
        }
        Update: {
          created_at?: string
          data_turno?: string
          hora_fim_planeada?: string | null
          hora_fim_real?: string | null
          hora_inicio_planeada?: string | null
          hora_inicio_real?: string | null
          id?: string
          motorista_id?: string
          notas?: string | null
          status?: Database["public"]["Enums"]["shift_status"]
          viatura_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turnos_motoristas_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnos_motoristas_viatura_id_fkey"
            columns: ["viatura_id"]
            isOneToOne: false
            referencedRelation: "viaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_park_access: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          park_id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          park_id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          park_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_park_access_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_park_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      viaturas: {
        Row: {
          capacidade_kg: number
          capacidade_m3: number | null
          created_at: string
          current_lat: number | null
          current_lng: number | null
          id: string
          is_active: boolean
          ler_autorizados: string[] | null
          marca: string | null
          matricula: string
          modelo: string | null
          notas: string | null
          org_id: string
          park_id: string
          position_updated_at: string | null
          status: Database["public"]["Enums"]["vehicle_status"]
          tipo: Database["public"]["Enums"]["vehicle_type"]
          updated_at: string
        }
        Insert: {
          capacidade_kg?: number
          capacidade_m3?: number | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          is_active?: boolean
          ler_autorizados?: string[] | null
          marca?: string | null
          matricula: string
          modelo?: string | null
          notas?: string | null
          org_id: string
          park_id: string
          position_updated_at?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          tipo?: Database["public"]["Enums"]["vehicle_type"]
          updated_at?: string
        }
        Update: {
          capacidade_kg?: number
          capacidade_m3?: number | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          is_active?: boolean
          ler_autorizados?: string[] | null
          marca?: string | null
          matricula?: string
          modelo?: string | null
          notas?: string | null
          org_id?: string
          park_id?: string
          position_updated_at?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          tipo?: Database["public"]["Enums"]["vehicle_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "viaturas_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viaturas_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      weighing_records: {
        Row: {
          captured_at: string
          created_at: string
          entry_id: string | null
          exit_id: string | null
          id: string
          is_manual: boolean
          is_stable: boolean
          operator_id: string | null
          park_id: string
          scale_id: string | null
          weighing_type: Database["public"]["Enums"]["weighing_type"]
          weight_kg: number
        }
        Insert: {
          captured_at?: string
          created_at?: string
          entry_id?: string | null
          exit_id?: string | null
          id?: string
          is_manual?: boolean
          is_stable?: boolean
          operator_id?: string | null
          park_id: string
          scale_id?: string | null
          weighing_type: Database["public"]["Enums"]["weighing_type"]
          weight_kg: number
        }
        Update: {
          captured_at?: string
          created_at?: string
          entry_id?: string | null
          exit_id?: string | null
          id?: string
          is_manual?: boolean
          is_stable?: boolean
          operator_id?: string | null
          park_id?: string
          scale_id?: string | null
          weighing_type?: Database["public"]["Enums"]["weighing_type"]
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_weighing_entry"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_weighing_exit"
            columns: ["exit_id"]
            isOneToOne: false
            referencedRelation: "exits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weighing_records_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weighing_records_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weighing_records_scale_id_fkey"
            columns: ["scale_id"]
            isOneToOne: false
            referencedRelation: "scales"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      current_stock: {
        Row: {
          area_capacity_kg: number | null
          area_code: string | null
          area_id: string | null
          area_name: string | null
          last_movement_at: string | null
          ler_code: string | null
          ler_code_id: string | null
          movement_count: number | null
          org_id: string | null
          park_id: string | null
          total_kg: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "storage_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_ler_code_id_fkey"
            columns: ["ler_code_id"]
            isOneToOne: false
            referencedRelation: "ler_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_lot_lqi: { Args: { p_lot_id: string }; Returns: undefined }
      entry_inspection_to_grade: {
        Args: {
          p_has_critical_divergence?: boolean
          p_has_major_divergence?: boolean
          p_inspection_result: string
        }
        Returns: number
      }
      generate_entry_number: { Args: { p_park_id: string }; Returns: string }
      generate_lot_number: { Args: { p_park_id: string }; Returns: string }
      generate_numero_pedido: { Args: { p_park_id: string }; Returns: string }
      generate_numero_rota: { Args: { p_park_id: string }; Returns: string }
      get_user_org_id: { Args: never; Returns: string }
      link_user_to_demo_org: { Args: { p_email: string }; Returns: undefined }
      log_audit: {
        Args: {
          p_action: string
          p_new_data?: Json
          p_old_data?: Json
          p_record_id: string
          p_table_name: string
        }
        Returns: undefined
      }
      recalculate_lot_raw_grade: {
        Args: { p_lot_id: string }
        Returns: undefined
      }
    }
    Enums: {
      area_type: "physical" | "logical" | "vfv" | "sorting_line" | "warehouse"
      classification_status: "draft" | "in_progress" | "completed" | "cancelled"
      client_type: "supplier" | "buyer" | "both"
      contract_status: "draft" | "active" | "expired" | "cancelled"
      delivery_status:
        | "draft"
        | "planned"
        | "loading"
        | "loaded"
        | "in_transit"
        | "delivered"
        | "confirmed"
        | "cancelled"
      divergence_severity: "minor" | "major" | "critical"
      divergence_type:
        | "weight_mismatch"
        | "ler_code_mismatch"
        | "contamination"
        | "packaging_issue"
        | "documentation_issue"
        | "other"
      egar_status:
        | "pending"
        | "validated"
        | "confirmed"
        | "rejected"
        | "cancelled"
      egar_type: "reception" | "expedition"
      entry_status:
        | "draft"
        | "vehicle_arrived"
        | "gross_weighed"
        | "egar_validated"
        | "inspected"
        | "tare_weighed"
        | "classified"
        | "stored"
        | "confirmed"
        | "cancelled"
      exit_type: "treatment" | "client" | "group"
      inspection_result: "approved" | "approved_with_divergence" | "rejected"
      ler_operation_type:
        | "reception"
        | "treatment"
        | "storage"
        | "valorization"
        | "elimination"
      lot_status: "open" | "in_treatment" | "closed"
      lqi_letter: "A" | "B" | "C" | "D" | "E"
      maintenance_type: "scheduled" | "corrective" | "inspection"
      nc_severity: "low" | "medium" | "high" | "critical"
      nc_status: "open" | "investigating" | "resolved" | "closed"
      nc_type:
        | "weight_discrepancy"
        | "ler_code_mismatch"
        | "contamination"
        | "documentation"
        | "equipment_failure"
        | "process_deviation"
        | "other"
      order_priority: "normal" | "urgent" | "critical"
      order_status:
        | "draft"
        | "pending"
        | "planned"
        | "on_route"
        | "at_client"
        | "completed"
        | "failed"
        | "cancelled"
      route_status:
        | "draft"
        | "confirmed"
        | "on_execution"
        | "completed"
        | "cancelled"
      scale_type: "platform" | "floor" | "bench" | "crane"
      shift_status:
        | "scheduled"
        | "active"
        | "completed"
        | "absent"
        | "cancelled"
      stock_movement_type:
        | "entry"
        | "exit"
        | "transfer_in"
        | "transfer_out"
        | "classification_in"
        | "classification_out"
        | "adjustment"
      stop_status: "pending" | "at_client" | "completed" | "failed" | "skipped"
      transfer_status: "pending" | "in_transit" | "completed" | "cancelled"
      user_role:
        | "admin"
        | "park_manager"
        | "scale_operator"
        | "classifier"
        | "commercial_manager"
        | "driver"
        | "logistics_manager"
      vehicle_status: "available" | "on_route" | "in_maintenance" | "inactive"
      vehicle_type:
        | "open_body"
        | "container"
        | "compactor"
        | "tank"
        | "flatbed"
        | "other"
      weighing_type: "gross" | "tare" | "internal"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      area_type: ["physical", "logical", "vfv", "sorting_line", "warehouse"],
      classification_status: ["draft", "in_progress", "completed", "cancelled"],
      client_type: ["supplier", "buyer", "both"],
      contract_status: ["draft", "active", "expired", "cancelled"],
      delivery_status: [
        "draft",
        "planned",
        "loading",
        "loaded",
        "in_transit",
        "delivered",
        "confirmed",
        "cancelled",
      ],
      divergence_severity: ["minor", "major", "critical"],
      divergence_type: [
        "weight_mismatch",
        "ler_code_mismatch",
        "contamination",
        "packaging_issue",
        "documentation_issue",
        "other",
      ],
      egar_status: [
        "pending",
        "validated",
        "confirmed",
        "rejected",
        "cancelled",
      ],
      egar_type: ["reception", "expedition"],
      entry_status: [
        "draft",
        "vehicle_arrived",
        "gross_weighed",
        "egar_validated",
        "inspected",
        "tare_weighed",
        "classified",
        "stored",
        "confirmed",
        "cancelled",
      ],
      exit_type: ["treatment", "client", "group"],
      inspection_result: ["approved", "approved_with_divergence", "rejected"],
      ler_operation_type: [
        "reception",
        "treatment",
        "storage",
        "valorization",
        "elimination",
      ],
      lot_status: ["open", "in_treatment", "closed"],
      lqi_letter: ["A", "B", "C", "D", "E"],
      maintenance_type: ["scheduled", "corrective", "inspection"],
      nc_severity: ["low", "medium", "high", "critical"],
      nc_status: ["open", "investigating", "resolved", "closed"],
      nc_type: [
        "weight_discrepancy",
        "ler_code_mismatch",
        "contamination",
        "documentation",
        "equipment_failure",
        "process_deviation",
        "other",
      ],
      order_priority: ["normal", "urgent", "critical"],
      order_status: [
        "draft",
        "pending",
        "planned",
        "on_route",
        "at_client",
        "completed",
        "failed",
        "cancelled",
      ],
      route_status: [
        "draft",
        "confirmed",
        "on_execution",
        "completed",
        "cancelled",
      ],
      scale_type: ["platform", "floor", "bench", "crane"],
      shift_status: ["scheduled", "active", "completed", "absent", "cancelled"],
      stock_movement_type: [
        "entry",
        "exit",
        "transfer_in",
        "transfer_out",
        "classification_in",
        "classification_out",
        "adjustment",
      ],
      stop_status: ["pending", "at_client", "completed", "failed", "skipped"],
      transfer_status: ["pending", "in_transit", "completed", "cancelled"],
      user_role: [
        "admin",
        "park_manager",
        "scale_operator",
        "classifier",
        "commercial_manager",
        "driver",
        "logistics_manager",
      ],
      vehicle_status: ["available", "on_route", "in_maintenance", "inactive"],
      vehicle_type: [
        "open_body",
        "container",
        "compactor",
        "tank",
        "flatbed",
        "other",
      ],
      weighing_type: ["gross", "tare", "internal"],
    },
  },
} as const
