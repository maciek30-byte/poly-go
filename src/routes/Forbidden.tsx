import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function Forbidden() {
  const { t } = useTranslation(['errors', 'common'])
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
      <h1>{t('forbidden.title')}</h1>
      <p className="text-text-muted">{t('forbidden.body')}</p>
      <Link to="/">{t('common:actions.backHome')}</Link>
    </div>
  )
}

export default Forbidden
