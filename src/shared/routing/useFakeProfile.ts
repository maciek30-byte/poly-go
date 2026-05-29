import {
  FAKE_PROFILE_ROLES,
  PROFILE_STATUS,
  type FakeProfile,
  type FakeProfileRole,
  type ProfileStatus,
} from './accountStatus'

// Module-load defense: if this file is ever bundled into a production build,
// crash on the first import rather than waiting for the hook to be called.
// Vite/Rollup statically eliminates this branch in dev (PROD === false), so
// no error-message string survives into prod bundles either.
//
// IMPORTANT: do not include the dev-fake-profile env-var name as a literal
// string anywhere in this module that survives DCE — the CI leak grep
// (.github/workflows/deploy.yml) treats any occurrence of that name in
// dist/ as a build-failing leak, even if the value itself is absent.
// Defense layers above this one: CLAUDE.md prohibition + CI leak grep.
if (import.meta.env.PROD) {
  throw new Error(
    'useFakeProfile must never be bundled into a production build. ' +
      'See .env.example and CLAUDE.md "Conventions" for the dev-fake-profile contract.',
  )
}

const VALID_ROLES = new Set<string>(FAKE_PROFILE_ROLES)
const VALID_STATUSES = new Set<string>(Object.values(PROFILE_STATUS))

function parseFakeProfile(raw: string): FakeProfile {
  const [role, status] = raw.split(':')
  if (!role || !status || !VALID_ROLES.has(role) || !VALID_STATUSES.has(status)) {
    throw new Error(
      `Dev fake profile has invalid value '${raw}'. ` +
        `Expected '<role>:<status>' where role ∈ {admin, owner, employee} and ` +
        `status ∈ {activated, pending, locked}. See .env.example.`,
    )
  }
  return { role: role as FakeProfileRole, status: status as ProfileStatus }
}

export function useFakeProfile(): FakeProfile | null {
  const raw = import.meta.env.VITE_DEV_FAKE_PROFILE
  if (!raw) return null
  return parseFakeProfile(raw)
}
