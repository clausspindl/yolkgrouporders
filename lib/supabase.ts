import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Authentication functions
export const signInWithMagicLink = async (email: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

export const onAuthStateChange = (callback: (user: any) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null)
  })
}

// Database types
export interface RealtimeGroupOrder {
  id: string
  budget: number
  team_size: number
  deadline: string
  venue: string
  time: string
  delivery_type: string
  delivery_address: string | null
  payment_method: 'card' | 'invoice'
  status: 'draft' | 'waiting_for_payment' | 'finalized'
  created_at: string
  updated_at: string
  created_by: string | null
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