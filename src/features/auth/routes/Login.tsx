import { useMemo, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { useAuth } from '../hooks/use-auth'
import {
  errorCodeToMessageKey,
  safeNext,
  signInWithGoogleOAuth,
  signInWithPassword,
} from '../auth'
import { Logo } from '@/shared/components/Logo'
import { Input } from '@/shared/ui/input'

const NEXT_STORAGE_KEY = 'polygo:auth:next'

function makeLoginSchema(t: TFunction) {
  return z.object({
    email: z.email(t('validation:login.email')),
    password: z.string().min(6, t('validation:login.passwordMin')),
  })
}

type LoginValues = z.infer<ReturnType<typeof makeLoginSchema>>

function GoogleIcon() {
  return (
    <svg
      className="size-[18px] shrink-0"
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
  const { t } = useTranslation(['auth', 'validation'])
  return (
    <span
      className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      role="status"
      aria-label={t('login.loadingAria')}
    />
  )
}

export default function Login() {
  const { t } = useTranslation(['auth', 'validation'])
  const { status } = useAuth()
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'))
  const urlError = searchParams.get('error')

  const [submitError, setSubmitError] = useState<string | null>(() =>
    urlError ? t(errorCodeToMessageKey(urlError)) : null,
  )
  const [googleStarting, setGoogleStarting] = useState(false)

  const loginSchema = useMemo(() => makeLoginSchema(t), [t])

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
      setSubmitError(t(result.messageKey))
      return
    }
    toast.success(t('login.success'))
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
      setSubmitError(t(result.messageKey))
      setGoogleStarting(false)
    }
  }

  const busy = isSubmitting || googleStarting

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden p-6 bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(47,111,78,0.18),transparent_60%),radial-gradient(900px_500px_at_110%_110%,rgba(124,193,150,0.16),transparent_55%),var(--color-bg)] before:pointer-events-none before:absolute before:inset-0 before:content-[''] before:bg-[linear-gradient(rgba(13,17,23,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(13,17,23,0.04)_1px,transparent_1px)] before:bg-[length:56px_56px] before:[mask-image:radial-gradient(closest-side_at_50%_40%,rgba(0,0,0,0.9),transparent_75%)]">
      <div className="relative flex w-full max-w-[420px] flex-col gap-6 rounded-xl border border-border bg-bg p-8 backdrop-blur-[8px] shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_24px_60px_-20px_rgba(13,17,23,0.18),0_8px_24px_-12px_rgba(31,74,55,0.18)]">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size="lg" decorative />
          <h1 className="text-[22px] font-semibold leading-[1.3] tracking-[-0.015em] text-text-strong">{t('login.title')}</h1>
          <p className="text-body text-text-muted">
            {t('login.subtitle')}
          </p>
        </div>

        {submitError && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-error-border bg-error-bg px-4 py-3 text-body text-error before:mt-px before:inline-flex before:size-[18px] before:shrink-0 before:items-center before:justify-center before:rounded-full before:bg-[var(--color-error)] before:text-[12px] before:font-bold before:text-[var(--color-bg)] before:content-['!']">
            {submitError}
          </div>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-2">
            <label className="text-label font-semibold tracking-[0.01em] text-text" htmlFor="login-email">
              {t('login.emailLabel')}
            </label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              className="min-h-[46px]"
              disabled={busy}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <span id="login-email-error" className="inline-flex items-center gap-1.5 text-label text-error before:size-1 before:rounded-full before:bg-[var(--color-error)] before:content-['']">
                {errors.email.message}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-label font-semibold tracking-[0.01em] text-text" htmlFor="login-password">
              {t('login.passwordLabel')}
            </label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              className="min-h-[46px]"
              disabled={busy}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              {...register('password')}
            />
            {errors.password && (
              <span id="login-password-error" className="inline-flex items-center gap-1.5 text-label text-error before:size-1 before:rounded-full before:bg-[var(--color-error)] before:content-['']">
                {errors.password.message}
              </span>
            )}
          </div>

          <button type="submit" className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-md border border-accent-hover bg-gradient-to-br from-accent to-accent-hover px-4 py-3 text-body font-semibold text-accent-on transition-all hover:not-disabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-55 shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_6px_14px_-6px_rgba(31,74,55,0.45)]" disabled={busy}>
            {isSubmitting ? <Spinner /> : t('login.submit')}
          </button>
        </form>

        <div className="flex items-center gap-3 text-eyebrow uppercase text-text-subtle before:h-px before:flex-1 before:bg-gradient-to-r before:from-transparent before:via-border before:to-transparent before:content-[''] after:h-px after:flex-1 after:bg-gradient-to-r after:from-transparent after:via-border after:to-transparent after:content-['']">{t('login.or')}</div>

        <button
          type="button"
          className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-md border border-border-strong bg-bg px-4 py-3 text-body font-semibold text-text-strong transition-all hover:not-disabled:border-text-subtle hover:not-disabled:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-55"
          onClick={handleGoogle}
          disabled={busy}
        >
          {googleStarting ? (
            <Spinner />
          ) : (
            <>
              <GoogleIcon />
              {t('login.google')}
            </>
          )}
        </button>
      </div>
    </main>
  )
}
