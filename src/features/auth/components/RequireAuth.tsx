import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/use-auth'

type RequireAuthProps = {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { t } = useTranslation('common')
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div style={{ padding: 'var(--space-6, 24px)', textAlign: 'center' }}>
        {t('status.loading')}
      </div>
    )
  }

  if (status === 'anonymous') {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  return <>{children}</>
}
