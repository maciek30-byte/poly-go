import { type ReactNode } from 'react'

import { useTranslation } from '../i18n'
import { ACCOUNT_STATUS } from '../routing/accountStatus'
import { ResolvedAuthProvider } from '../routing/ResolvedAuthContext'
import type { ResolvedAuthStatus } from '../routing/resolvedAuthContextInternal'
import { useAuth } from '../routing/useAuth'
import styles from './SessionGate.module.css'

interface SessionGateProps {
  children: ReactNode
}

export function SessionGate({ children }: SessionGateProps) {
  const auth = useAuth()
  const { t } = useTranslation()

  if (auth.status === ACCOUNT_STATUS.LOADING) {
    return (
      <div className={styles.splash} role="status" aria-live="polite" aria-busy="true">
        <span className={styles.wordmark}>polyGo</span>
        <span className={styles.spinner} aria-hidden="true" />
        <span className={styles.label}>{t('splash.loading')}</span>
      </div>
    )
  }

  const resolvedStatus: ResolvedAuthStatus = auth.status
  return (
    <ResolvedAuthProvider
      value={{
        session: auth.session,
        user: auth.user,
        status: resolvedStatus,
        signOut: auth.signOut,
      }}
    >
      {children}
    </ResolvedAuthProvider>
  )
}
