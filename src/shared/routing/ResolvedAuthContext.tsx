import { type ReactNode } from 'react'

import { ResolvedAuthContext, type ResolvedAuthValue } from './resolvedAuthContextInternal'

interface ResolvedAuthProviderProps {
  value: ResolvedAuthValue
  children: ReactNode
}

export function ResolvedAuthProvider({ value, children }: ResolvedAuthProviderProps) {
  return <ResolvedAuthContext value={value}>{children}</ResolvedAuthContext>
}
