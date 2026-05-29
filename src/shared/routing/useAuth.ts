import { useContext } from 'react'

import { AuthContext, type AuthContextValue } from './authContextInternal'

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be called inside <AuthProvider>')
  }
  return ctx
}
