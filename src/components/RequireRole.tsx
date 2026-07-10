import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../lib/auth-store'
import type { Role } from '../lib/auth-store'
import { Forbidden } from '../routes/Forbidden'

type RequireRoleProps = {
  allowedRoles: Role[]
  children: ReactNode
}

// Zakłada, że jest renderowane WEWNĄTRZ RequireAuth — czyli user jest już
// zalogowany. Tu pilnujemy wyłącznie wymiaru roli: czekamy aż rola dojedzie
// (roleStatus !== 'ready'), a potem przepuszczamy albo pokazujemy 403.
export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const { t } = useTranslation('common')
  const role = useAuthStore((s) => s.role)
  const roleStatus = useAuthStore((s) => s.roleStatus)

  if (roleStatus !== 'ready') {
    return (
      <div style={{ padding: 'var(--space-6, 24px)', textAlign: 'center' }}>
        {t('status.loading')}
      </div>
    )
  }

  if (role === null || !allowedRoles.includes(role)) {
    return <Forbidden />
  }

  return <>{children}</>
}
