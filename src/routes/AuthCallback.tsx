import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/use-auth'

export default function AuthCallback() {
  const { status } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (status === 'authenticated') {
      navigate('/', { replace: true })
    } else if (status === 'anonymous') {
      navigate('/login', { replace: true })
    }
  }, [status, navigate])

  return (
    <div style={{ padding: 'var(--space-6, 24px)', textAlign: 'center' }}>
      Łączenie…
    </div>
  )
}
