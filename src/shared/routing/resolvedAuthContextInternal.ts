import { createContext } from 'react'

import type { Session, User } from '../lib/supabaseClient'
import type { AuthStatus } from './accountStatus'

export type ResolvedAuthStatus = Exclude<AuthStatus, 'loading'>

export interface ResolvedAuthValue {
  session: Session | null
  user: User | null
  status: ResolvedAuthStatus
  signOut: () => Promise<void>
}

export const ResolvedAuthContext = createContext<ResolvedAuthValue | null>(null)
