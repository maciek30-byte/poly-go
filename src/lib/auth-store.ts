import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'
export type Role = 'user' | 'super_admin'

// Osobny status roli, bo rola dojeżdża asynchronicznie (zapytanie do
// user_roles) PO tym jak sesja jest już znana. RequireRole czeka na
// 'ready', żeby nie mignąć 403 w oknie authenticated-bez-roli.
export type RoleStatus = 'idle' | 'loading' | 'ready'

type AuthState = {
  status: AuthStatus
  session: Session | null
  user: User | null
  role: Role | null
  roleStatus: RoleStatus
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>(() => ({
  status: 'loading',
  session: null,
  user: null,
  role: null,
  roleStatus: 'idle',
  signOut: async () => {
    await supabase.auth.signOut()
  },
}))

// Token sekwencji: chroni przed wyścigiem przy szybkich zmianach sesji
// (np. przelogowanie). Odpowiedź na rolę nadpisuje stan tylko jeśli jest
// najświeższym żądaniem — starsze, które dojadą później, są ignorowane.
let roleRequestSeq = 0

function normalizeRole(value: unknown): Role | null {
  return value === 'user' || value === 'super_admin' ? value : null
}

async function loadRole(userId: string) {
  const seq = ++roleRequestSeq
  useAuthStore.setState({ roleStatus: 'loading' })

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()

  // Zignoruj, jeśli w międzyczasie wystartowało nowsze żądanie.
  if (seq !== roleRequestSeq) return

  if (error) {
    // Fail-closed: brak pewności co do roli => brak roli (żadnego admina).
    useAuthStore.setState({ role: null, roleStatus: 'ready' })
    return
  }

  useAuthStore.setState({
    role: normalizeRole(data?.role),
    roleStatus: 'ready',
  })
}

function clearRole() {
  // Unieważnij ewentualne in-flight loadRole (anonimowy user nie ma roli).
  roleRequestSeq++
  useAuthStore.setState({ role: null, roleStatus: 'idle' })
}

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.setState({
    status: session ? 'authenticated' : 'anonymous',
    session,
    user: session?.user ?? null,
  })

  if (session?.user) {
    void loadRole(session.user.id)
  } else {
    clearRole()
  }
})
