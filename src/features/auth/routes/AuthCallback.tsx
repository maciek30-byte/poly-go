import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { supabase } from '@/shared/lib/supabase'
import { safeNext } from '../auth'

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
  const navigate = useNavigate()
  const { t } = useTranslation(['common', 'auth'])
  const [exchanging, setExchanging] = useState(true)


  const oauthError = useMemo(() => {
    const queryError = new URLSearchParams(window.location.search).get('error')
    return queryError ?? parseHashError(window.location.hash)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (oauthError) {
        clearStoredNext()
        navigate('/login?error=oauth_cancelled', { replace: true })
        return
      }

      const code = new URLSearchParams(window.location.search).get('code')


      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (cancelled) return

        if (error) {
          clearStoredNext()
          navigate('/login?error=oauth_cancelled', { replace: true })
          return
        }

        toast.success(t('auth:login.success'))
        navigate(consumeStoredNext(), { replace: true })
        return
      }


      const { data } = await supabase.auth.getSession()
      if (cancelled) return

      if (data.session) {
        navigate(consumeStoredNext(), { replace: true })
      } else {
        clearStoredNext()
        navigate('/login', { replace: true })
      }
    }

    void run().finally(() => {
      if (!cancelled) setExchanging(false)
    })

    return () => {
      cancelled = true
    }
  }, [oauthError, navigate, t])

  return (
    <div className="p-6 text-center">
      {exchanging ? t('common:status.connecting') : t('common:status.redirecting')}
    </div>
  )
}
