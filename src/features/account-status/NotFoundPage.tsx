import { Link } from 'react-router-dom'

import { useTranslation } from '../../shared/i18n'

export default function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <h1 style={{ margin: 0, fontSize: '2rem' }}>{t('notFound.title')}</h1>
      <p style={{ margin: 0, color: '#555', textAlign: 'center', maxWidth: '32rem' }}>
        {t('notFound.body')}
      </p>
      <Link
        to="/"
        style={{
          padding: '0.5rem 1rem',
          border: '1px solid #111',
          borderRadius: '0.25rem',
          textDecoration: 'none',
          color: '#111',
        }}
      >
        {t('notFound.home')}
      </Link>
    </main>
  )
}
