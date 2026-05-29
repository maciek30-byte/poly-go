import { Navigate } from 'react-router-dom'

import { useTranslation } from '../i18n'
import { ACCOUNT_STATUS } from './accountStatus'
import { useResolvedAuth } from './useResolvedAuth'

export function RootRedirect() {
  const { status } = useResolvedAuth()
  return (
    <Navigate to={status === ACCOUNT_STATUS.AUTHENTICATED ? '/app/dashboard' : '/login'} replace />
  )
}

export type PlaceholderKey = 'dashboard' | 'directory' | 'messages' | 'favorites' | 'profile'

interface PlaceholderProps {
  i18nKey: PlaceholderKey
}

export function Placeholder({ i18nKey }: PlaceholderProps) {
  const { t } = useTranslation()
  return <h1>{t(`placeholders.${i18nKey}.title`)}</h1>
}

export function AdminQueuePlaceholder() {
  return <h1>Verification queue</h1>
}
