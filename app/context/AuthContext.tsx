"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, onAuthStateChange } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  isManager: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isManager: false,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((user) => {
      setUser(user)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Check if user is a manager (has verified email)
  const isManager = user?.email_confirmed_at !== null

  return (
    <AuthContext.Provider value={{ user, loading, isManager }}>
      {children}
    </AuthContext.Provider>
  )
} 