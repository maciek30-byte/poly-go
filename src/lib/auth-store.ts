import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

type AuthState = {
  status: AuthStatus
  session: Session | null
  user: User | null
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>(() => ({
  status: 'loading',
  session: null,
  user: null,
  signOut: async () => {
    await supabase.auth.signOut()
  },
}))

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.setState({
    status: session ? 'authenticated' : 'anonymous',
    session,
    user: session?.user ?? null,
  })
})
