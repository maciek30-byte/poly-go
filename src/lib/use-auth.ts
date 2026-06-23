import { useAuthStore } from './auth-store'

export function useAuth() {
  const status = useAuthStore((state) => state.status)
  const session = useAuthStore((state) => state.session)
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  return { status, session, user, signOut }
}
