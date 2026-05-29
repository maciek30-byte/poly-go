import { useContext } from 'react'

import { ResolvedAuthContext, type ResolvedAuthValue } from './resolvedAuthContextInternal'

export function useResolvedAuth(): ResolvedAuthValue {
  const ctx = useContext(ResolvedAuthContext)
  if (!ctx) {
    throw new Error(
      'useResolvedAuth must be called inside <SessionGate> (below the gate where status is guaranteed non-loading)',
    )
  }
  return ctx
}
