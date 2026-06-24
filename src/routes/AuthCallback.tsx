import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../lib/use-auth'
import { safeNext } from '../lib/auth'

const NEXT_STORAGE_KEY = 'polygo:auth:next'

function parseHashError(hash: string): string | null {
  if (!hash) return null
  const trimmed = hash.startsWith('#') ? hash.slice(1) : hash
  const params = new URLSearchParams(trimmed)
  return params.get('error')
}

function consumeStoredNext(): string {
  try {
    const stored = sessionStorage.getItem(NEXT_STORAGE_KEY)
    sessionStorage.removeItem(NEXT_STORAGE_KEY)
    return safeNext(stored)
  } catch {
    return '/'
  }
}

function clearStoredNext(): void {
  try {
    sessionStorage.removeItem(NEXT_STORAGE_KEY)
  } catch {
    // ignore
  }
}

export default function AuthCallback() {
  const { status } = useAuth()
  const navigate = useNavigate()

  const oauthError = useMemo(() => {
    const queryError = new URLSearchParams(window.location.search).get('error')
    return queryError ?? parseHashError(window.location.hash)
  }, [])

  useEffect(() => {
    if (oauthError) {
      clearStoredNext()
      navigate('/login?error=oauth_cancelled', { replace: true })
      return
    }
    if (status === 'authenticated') {
      toast.success('Zalogowano pomyślnie')
      navigate(consumeStoredNext(), { replace: true })
    } else if (status === 'anonymous') {
      clearStoredNext()
      navigate('/login', { replace: true })
    }
  }, [oauthError, status, navigate])

  return (
    <div style={{ padding: 'var(--space-6, 24px)', textAlign: 'center' }}>
      Łączenie…
    </div>
  )
}
