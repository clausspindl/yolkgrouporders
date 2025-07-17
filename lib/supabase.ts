import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for group orders
export interface GroupOrder {
  id: string
  budget: number
  team_size: number
  deadline: string
  venue: string
  time: string
  delivery_type: 'delivery' | 'collection'
  delivery_address?: string
  created_at: string
  updated_at: string
}

export interface GroupOrderItem {
  id: string
  group_order_id: string
  person_name: string
  product_id: string
  product_name: string
  product_description: string
  product_price: number
  product_category: string
  product_image: string
  quantity: number
  total_spent: number
  created_at: string
}

// Real-time subscription types
export interface RealtimeGroupOrder {
  id: string
  budget: number
  team_size: number
  deadline: string
  venue: string
  time: string
  delivery_type: 'delivery' | 'collection'
  delivery_address?: string
  created_at: string
  updated_at: string
  items: RealtimeGroupOrderItem[]
}

export interface RealtimeGroupOrderItem {
  id: string
  group_order_id: string
  person_name: string
  product_id: string
  product_name: string
  product_description: string
  product_price: number
  product_category: string
  product_image: string
  quantity: number
  total_spent: number
  created_at: string
} 