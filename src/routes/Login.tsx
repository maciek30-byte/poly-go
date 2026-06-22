import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/use-auth'

function safeNext(raw: string | null): string {
  if (!raw) return '/'
  if (!raw.startsWith('/')) return '/'
  if (raw.startsWith('//')) return '/'
  return raw
}

export default function Login() {
  const { status } = useAuth()
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'))

  if (status === 'authenticated') {
    return <Navigate to={next} replace />
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-3, 12px)',
        padding: 'var(--space-8, 40px)',
        textAlign: 'center',
      }}
    >
      <h1>Logowanie</h1>
      <p style={{ color: 'var(--color-text-muted, #666)' }}>
        Tu pojawi się formularz logowania — S-01.
      </p>
    </div>
  )
}
