import { type JSX } from 'react'
import { useTranslation } from 'react-i18next'

type ComingSoonProps = {
  title: string
}

export function ComingSoon({ title }: ComingSoonProps): JSX.Element {
  const { t } = useTranslation('errors')
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
      <h1>{title}</h1>
      <p className="text-text-muted">{t('comingSoon.default')}</p>
    </div>
  )
}
