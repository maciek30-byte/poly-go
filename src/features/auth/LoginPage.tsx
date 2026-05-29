import { useTranslation } from '../../shared/i18n'
import { useAuth } from '../../shared/routing/useAuth'

export default function LoginPage() {
  const { t } = useTranslation()
  const { session, signOut } = useAuth()

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '2rem',
      }}
    >
      <h1 style={{ fontSize: '2rem', margin: 0 }}>polyGo</h1>
      <p style={{ color: '#555', margin: 0 }}>{t('login.placeholder')}</p>
      {session && (
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
          {t('login.signOut')}
        </button>
      )}
    </main>
  )
}
