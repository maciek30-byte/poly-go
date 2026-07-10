import { supabase } from './supabase'

export function getAuthRedirect(): string {
  return `${window.location.origin}/auth/callback`
}

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'too_many_requests'
  | 'oauth_cancelled'
  | 'network'
  | 'unknown'

export type AuthResult =
  | { ok: true }
  | { ok: false; code: AuthErrorCode; messageKey: string }

const MESSAGE_KEYS: Record<AuthErrorCode, string> = {
  invalid_credentials: 'auth:errors.invalidCredentials',
  email_not_confirmed: 'auth:errors.emailNotConfirmed',
  too_many_requests: 'auth:errors.tooManyRequests',
  oauth_cancelled: 'auth:errors.oauthCancelled',
  network: 'auth:errors.network',
  unknown: 'auth:errors.unknown',
}

export function formatAuthError(error: unknown): { code: AuthErrorCode; messageKey: string } {
  if (!error || typeof error !== 'object') {
    return { code: 'unknown', messageKey: MESSAGE_KEYS.unknown }
  }
  const err = error as { code?: string; status?: number; name?: string; message?: string }

  if (err.code === 'invalid_credentials' || err.code === 'invalid_grant') {
    return { code: 'invalid_credentials', messageKey: MESSAGE_KEYS.invalid_credentials }
  }
  if (err.code === 'email_not_confirmed') {
    return { code: 'email_not_confirmed', messageKey: MESSAGE_KEYS.email_not_confirmed }
  }
  if (err.code === 'over_request_rate_limit' || err.status === 429) {
    return { code: 'too_many_requests', messageKey: MESSAGE_KEYS.too_many_requests }
  }
  if (err.name === 'AuthRetryableFetchError' || err.message?.toLowerCase().includes('network')) {
    return { code: 'network', messageKey: MESSAGE_KEYS.network }
  }
  return { code: 'unknown', messageKey: MESSAGE_KEYS.unknown }
}

export function errorCodeToMessageKey(code: string): string {
  if (code in MESSAGE_KEYS) {
    return MESSAGE_KEYS[code as AuthErrorCode]
  }
  return MESSAGE_KEYS.unknown
}

export function safeNext(raw: string | null): string {
  if (!raw) return '/'
  if (!raw.startsWith('/')) return '/'
  if (raw.startsWith('//')) return '/'
  return raw
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { ok: false, ...formatAuthError(error) }
  }
  return { ok: true }
}

export async function signInWithGoogleOAuth(): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: getAuthRedirect() },
  })
  if (error) {
    return { ok: false, ...formatAuthError(error) }
  }
  return { ok: true }
}
