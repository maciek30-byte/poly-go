import { Navigate, Outlet } from 'react-router-dom'

import { PROFILE_STATUS } from './accountStatus'
import { useFakeProfile } from './useFakeProfile'

export function AccountStatusGate() {
  const profile = useFakeProfile()

  if (!profile) {
    return <Outlet />
  }

  if (profile.status === PROFILE_STATUS.LOCKED) {
    return <Navigate to="/account-locked" replace />
  }
  if (profile.status === PROFILE_STATUS.PENDING) {
    return <Navigate to="/account-pending" replace />
  }

  return <Outlet />
}
