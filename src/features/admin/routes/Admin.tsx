import { type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { ComingSoon } from '@/shared/components/ComingSoon'

export default function Admin(): JSX.Element {
  const { t } = useTranslation('errors')
  return <ComingSoon title={t('admin.title')} />
}
