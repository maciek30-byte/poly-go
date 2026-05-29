import { createContext } from 'react'

import type { Session, User } from '../lib/supabaseClient'
import type { AuthStatus } from './accountStatus'

export interface AuthContextValue {
  session: Session | null
  user: User | null
  status: AuthStatus
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
