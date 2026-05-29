import { useEffect, useMemo, useState, type ReactNode } from 'react'

import supabase, { type Session } from '../lib/supabaseClient'
import { ACCOUNT_STATUS, type AuthStatus } from './accountStatus'
import { AuthContext, type AuthContextValue } from './authContextInternal'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>(ACCOUNT_STATUS.LOADING)

  useEffect(() => {
    let isMounted = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setSession(data.session)
      setStatus(data.session ? ACCOUNT_STATUS.AUTHENTICATED : ACCOUNT_STATUS.UNAUTHENTICATED)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return
      setSession(nextSession)
      setStatus(nextSession ? ACCOUNT_STATUS.AUTHENTICATED : ACCOUNT_STATUS.UNAUTHENTICATED)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      status,
      signOut: async () => {
        await supabase.auth.signOut()
        setSession(null)
        setStatus(ACCOUNT_STATUS.UNAUTHENTICATED)
      },
    }),
    [session, status],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
