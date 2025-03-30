/**
 * This file contains TypeScript type definitions for the Supabase database schema.
 * 
 * These types represent the structure of your database tables for scheduled Instagram posts.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      scheduled_posts: {
        Row: {
          id: string
          created_at: string
          scheduled_for: string
          caption: string
          tags: string[] | null
          images: string[]
          listing_id: string
          status: 'scheduled' | 'published' | 'failed' | 'cancelled'
          carousel_container_id: string | null
          media_container_ids: string[] | null
          error_message: string | null
          user_id: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          scheduled_for: string
          caption: string
          tags?: string[] | null
          images: string[]
          listing_id: string
          status?: 'scheduled' | 'published' | 'failed' | 'cancelled'
          carousel_container_id?: string | null
          media_container_ids?: string[] | null
          error_message?: string | null
          user_id: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          scheduled_for?: string
          caption?: string
          tags?: string[] | null
          images?: string[]
          listing_id?: string
          status?: 'scheduled' | 'published' | 'failed' | 'cancelled'
          carousel_container_id?: string | null
          media_container_ids?: string[] | null
          error_message?: string | null
          user_id?: string
          metadata?: Json | null
        }
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
  }
} 