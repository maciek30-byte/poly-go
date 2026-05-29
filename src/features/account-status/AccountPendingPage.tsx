import { useTranslation } from '../../shared/i18n'
import { useAuth } from '../../shared/routing/useAuth'

const SUPPORT_EMAIL = 'support@polygo.pl'

export default function AccountPendingPage() {
  const { t } = useTranslation()
  const { signOut } = useAuth()

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#fafafa',
      }}
    >
      <section
        style={{
          maxWidth: '32rem',
          background: '#fff',
          padding: '2rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{t('accountPending.title')}</h1>
        <p style={{ margin: 0, color: '#333', lineHeight: 1.5 }}>{t('accountPending.body')}</p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #111',
              borderRadius: '0.25rem',
              textDecoration: 'none',
              color: '#111',
              background: '#fff',
            }}
          >
            {t('accountPending.contact')}
          </a>
          <button
            type="button"
            onClick={() => {
              void signOut()
            }}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #ccc',
              borderRadius: '0.25rem',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            {t('accountPending.signOut')}
          </button>
        </div>
      </section>
    </main>
  )
}
