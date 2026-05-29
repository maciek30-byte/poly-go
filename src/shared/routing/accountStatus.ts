export const ACCOUNT_STATUS = {
  LOADING: 'loading',
  UNAUTHENTICATED: 'unauthenticated',
  AUTHENTICATED: 'authenticated',
} as const

export type AuthStatus = (typeof ACCOUNT_STATUS)[keyof typeof ACCOUNT_STATUS]

export const PROFILE_STATUS = {
  ACTIVATED: 'activated',
  PENDING: 'pending',
  LOCKED: 'locked',
} as const

export type ProfileStatus = (typeof PROFILE_STATUS)[keyof typeof PROFILE_STATUS]

export const FAKE_PROFILE_ROLES = ['admin', 'owner', 'employee'] as const
export type FakeProfileRole = (typeof FAKE_PROFILE_ROLES)[number]

export interface FakeProfile {
  role: FakeProfileRole
  status: ProfileStatus
}
