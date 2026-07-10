import { useAuthStore } from '@/shared/lib/auth-store'

export function useAuth() {
  const status = useAuthStore((state) => state.status)
  const session = useAuthStore((state) => state.session)
  const user = useAuthStore((state) => state.user)
  const role = useAuthStore((state) => state.role)
  const roleStatus = useAuthStore((state) => state.roleStatus)
  const signOut = useAuthStore((state) => state.signOut)
  return { status, session, user, role, roleStatus, signOut }
}
