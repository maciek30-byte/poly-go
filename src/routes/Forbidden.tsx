import { Link } from 'react-router-dom'

export function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
      <h1>403 — brak dostępu</h1>
      <p className="text-text-muted">
        Nie masz uprawnień, aby zobaczyć tę stronę.
      </p>
      <Link to="/">Wróć do strony głównej</Link>
    </div>
  )
}

export default Forbidden
