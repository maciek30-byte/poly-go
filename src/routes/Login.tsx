import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useAuth } from '../lib/use-auth'
import {
  errorCodeToMessage,
  safeNext,
  signInWithGoogleOAuth,
  signInWithPassword,
} from '../lib/auth'
import { Logo } from '../components/Logo'
import './Login.css'

const NEXT_STORAGE_KEY = 'polygo:auth:next'

const loginSchema = z.object({
  email: z.email('Podaj prawidłowy email.'),
  password: z.string().min(6, 'Hasło musi mieć co najmniej 6 znaków.'),
})

type LoginValues = z.infer<typeof loginSchema>

function GoogleIcon() {
  return (
    <svg
      className="login__google-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}

function Spinner() {
  return <span className="login__spinner" role="status" aria-label="Ładowanie" />
}

export default function Login() {
  const { status } = useAuth()
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'))
  const urlError = searchParams.get('error')

  const [submitError, setSubmitError] = useState<string | null>(() =>
    urlError ? errorCodeToMessage(urlError) : null,
  )
  const [googleStarting, setGoogleStarting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    mode: 'onSubmit',
    defaultValues: { email: '', password: '' },
    resolver: async (values) => {
      const parsed = loginSchema.safeParse(values)
      if (parsed.success) {
        return { values: parsed.data, errors: {} }
      }
      const fieldErrors: Record<string, { type: string; message: string }> = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path[0]
        if (typeof path === 'string' && !fieldErrors[path]) {
          fieldErrors[path] = { type: issue.code, message: issue.message }
        }
      }
      return { values: {}, errors: fieldErrors }
    },
  })

  if (status === 'authenticated') {
    return <Navigate to={next} replace />
  }

  const onSubmit = async ({ email, password }: LoginValues) => {
    setSubmitError(null)
    const result = await signInWithPassword(email, password)
    if (!result.ok) {
      setSubmitError(result.message)
    }
  }

  const handleGoogle = async () => {
    setSubmitError(null)
    setGoogleStarting(true)
    try {
      sessionStorage.setItem(NEXT_STORAGE_KEY, next)
    } catch {
      // sessionStorage may throw in some browser modes — flow nadal działa,
      // ale po Google user wyląduje na `/` zamiast `next`.
    }
    const result = await signInWithGoogleOAuth()
    if (!result.ok) {
      try {
        sessionStorage.removeItem(NEXT_STORAGE_KEY)
      } catch {
        // ignore
      }
      setSubmitError(result.message)
      setGoogleStarting(false)
    }
  }

  const busy = isSubmitting || googleStarting

  return (
    <main className="login">
      <div className="login__card">
        <div className="login__header">
          <Logo size="lg" decorative />
          <h1 className="login__title">Witaj z powrotem</h1>
          <p className="login__subtitle">
            Zaloguj się, aby kontynuować
          </p>
        </div>

        {submitError && (
          <div role="alert" className="login__alert">
            {submitError}
          </div>
        )}

        <form className="login__form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="login__field">
            <label className="login__label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              className={`login__input${errors.email ? ' login__input--invalid' : ''}`}
              disabled={busy}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <span id="login-email-error" className="login__field-error">
                {errors.email.message}
              </span>
            )}
          </div>

          <div className="login__field">
            <label className="login__label" htmlFor="login-password">
              Hasło
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              className={`login__input${errors.password ? ' login__input--invalid' : ''}`}
              disabled={busy}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              {...register('password')}
            />
            {errors.password && (
              <span id="login-password-error" className="login__field-error">
                {errors.password.message}
              </span>
            )}
          </div>

          <button type="submit" className="login__submit" disabled={busy}>
            {isSubmitting ? <Spinner /> : 'Zaloguj się'}
          </button>
        </form>

        <div className="login__divider">lub</div>

        <button
          type="button"
          className="login__google"
          onClick={handleGoogle}
          disabled={busy}
        >
          {googleStarting ? (
            <Spinner />
          ) : (
            <>
              <GoogleIcon />
              Zaloguj przez Google
            </>
          )}
        </button>
      </div>
    </main>
  )
}
