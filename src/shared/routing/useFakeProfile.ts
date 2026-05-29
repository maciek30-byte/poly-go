import {
  FAKE_PROFILE_ROLES,
  PROFILE_STATUS,
  type FakeProfile,
  type FakeProfileRole,
  type ProfileStatus,
} from './accountStatus'

// Module-load defense: if this file is ever bundled into a production build,
// crash on the first import rather than waiting for the hook to be called.
// Vite/Rollup statically eliminates this branch in dev (PROD === false).
// Defense layers above this one: CLAUDE.md prohibition + CI leak grep on
// VITE_DEV_FAKE_PROFILE in dist/.
if (import.meta.env.PROD) {
  throw new Error(
    'useFakeProfile.ts must never be bundled into a production build. ' +
      'Check that VITE_DEV_FAKE_PROFILE is unset in the Cloudflare Pages ' +
      'environment and that no production code path imports this module.',
  )
}

const VALID_ROLES = new Set<string>(FAKE_PROFILE_ROLES)
const VALID_STATUSES = new Set<string>(Object.values(PROFILE_STATUS))

function parseFakeProfile(raw: string): FakeProfile {
  const [role, status] = raw.split(':')
  if (!role || !status || !VALID_ROLES.has(role) || !VALID_STATUSES.has(status)) {
    throw new Error(
      `VITE_DEV_FAKE_PROFILE has invalid value '${raw}'. ` +
        `Expected '<role>:<status>' where role ∈ {admin, owner, employee} and ` +
        `status ∈ {activated, pending, locked}.`,
    )
  }
  return { role: role as FakeProfileRole, status: status as ProfileStatus }
}

export function useFakeProfile(): FakeProfile | null {
  const raw = import.meta.env.VITE_DEV_FAKE_PROFILE
  if (!raw) return null
  return parseFakeProfile(raw)
}
