import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { ACCOUNT_STATUS } from './accountStatus'
import { useResolvedAuth } from './useResolvedAuth'

export function ProtectedRoute() {
  const { status } = useResolvedAuth()
  const location = useLocation()

  if (status === ACCOUNT_STATUS.UNAUTHENTICATED) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  }

  return <Outlet />
}
