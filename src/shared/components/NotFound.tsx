import { useTranslation } from 'react-i18next'
import { ComingSoon } from './ComingSoon'

export default function NotFound() {
  const { t } = useTranslation('errors')
  return <ComingSoon title={t('notFound.title')} />
}
