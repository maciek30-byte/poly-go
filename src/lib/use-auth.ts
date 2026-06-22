import { useAuthStore } from './auth-store'

export function useAuth() {
  return useAuthStore((state) => ({
    status: state.status,
    session: state.session,
    user: state.user,
    signOut: state.signOut,
  }))
}
