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
  | { ok: false; code: AuthErrorCode; message: string }

const MESSAGES: Record<AuthErrorCode, string> = {
  invalid_credentials: 'Nieprawidłowy email lub hasło.',
  email_not_confirmed: 'Email nie został potwierdzony. Skontaktuj się z administratorem.',
  too_many_requests: 'Zbyt wiele prób. Spróbuj ponownie za chwilę.',
  oauth_cancelled: 'Logowanie przez Google zostało anulowane.',
  network: 'Brak połączenia. Sprawdź internet i spróbuj ponownie.',
  unknown: 'Coś poszło nie tak. Spróbuj ponownie.',
}

export function formatAuthError(error: unknown): { code: AuthErrorCode; message: string } {
  if (!error || typeof error !== 'object') {
    return { code: 'unknown', message: MESSAGES.unknown }
  }
  const err = error as { code?: string; status?: number; name?: string; message?: string }

  if (err.code === 'invalid_credentials' || err.code === 'invalid_grant') {
    return { code: 'invalid_credentials', message: MESSAGES.invalid_credentials }
  }
  if (err.code === 'email_not_confirmed') {
    return { code: 'email_not_confirmed', message: MESSAGES.email_not_confirmed }
  }
  if (err.code === 'over_request_rate_limit' || err.status === 429) {
    return { code: 'too_many_requests', message: MESSAGES.too_many_requests }
  }
  if (err.name === 'AuthRetryableFetchError' || err.message?.toLowerCase().includes('network')) {
    return { code: 'network', message: MESSAGES.network }
  }
  return { code: 'unknown', message: MESSAGES.unknown }
}

export function errorCodeToMessage(code: string): string {
  if (code in MESSAGES) {
    return MESSAGES[code as AuthErrorCode]
  }
  return MESSAGES.unknown
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
