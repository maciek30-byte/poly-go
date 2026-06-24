import { Link } from 'react-router-dom'

export function Forbidden() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2, 8px)',
        padding: 'var(--space-6, 48px)',
        textAlign: 'center',
      }}
    >
      <h1>403 — brak dostępu</h1>
      <p style={{ color: 'var(--color-text-muted, #666)' }}>
        Nie masz uprawnień, aby zobaczyć tę stronę.
      </p>
      <Link to="/">Wróć do strony głównej</Link>
    </div>
  )
}

export default Forbidden
