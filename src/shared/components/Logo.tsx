import { type JSX } from 'react'
import { cn } from '@/shared/lib/utils'

type LogoSize = 'sm' | 'md' | 'lg'
type LogoVariant = 'full' | 'mark'

type LogoProps = {
  size?: LogoSize
  variant?: LogoVariant
  className?: string
  decorative?: boolean
}

const markSize: Record<LogoSize, string> = {
  sm: 'size-6',
  md: 'size-10',
  lg: 'size-16',
}

const wordmarkSize: Record<LogoSize, string> = {
  sm: 'text-[14px]',
  md: 'text-[22px]',
  lg: 'text-[32px]',
}

const gap: Record<LogoSize, string> = {
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4',
}

export function Logo({
  size = 'md',
  variant = 'full',
  className,
  decorative = false,
}: LogoProps): JSX.Element {
  const labelProps = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img', 'aria-label': 'PolyGo' }

  return (
    <span
      {...labelProps}
      className={cn(
        'inline-flex items-center leading-none text-text-strong',
        variant === 'full' ? gap[size] : 'gap-0',
        className,
      )}
    >
      <span
        className={cn(
          'relative isolate inline-flex items-center justify-center rounded-full shadow-brand',
          markSize[size],
        )}
        aria-hidden="true"
      >
        <svg
          className="block size-full"
          viewBox="0 0 40 40"
          xmlns="http://www.w3.org/2000/svg"
          focusable="false"
        >
          <defs>
            <linearGradient id="logoGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#34795a" />
              <stop offset="100%" stopColor="#1f4a37" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="20" fill="url(#logoGradient)" />
          <path
            d="M14.4 11.2h7.2c3.43 0 6.08 2.59 6.08 5.92 0 3.33-2.65 5.92-6.08 5.92h-3.5v5.76h-3.7V11.2zm3.7 8.48h3.3c1.4 0 2.5-1.04 2.5-2.56 0-1.52-1.1-2.56-2.5-2.56h-3.3v5.12z"
            fill="#ffffff"
          />
          <circle cx="29.2" cy="28.4" r="2.4" fill="#c8e8d4" />
        </svg>
      </span>
      {variant === 'full' && (
        <span
          className={cn(
            'inline-flex items-baseline bg-gradient-to-br from-text-strong to-accent bg-clip-text font-bold tracking-[-0.025em] text-transparent',
            wordmarkSize[size],
          )}
        >
          <span className="font-bold">Poly</span>
          <span className="ml-px bg-gradient-to-br from-accent to-accent-hover bg-clip-text font-bold text-transparent">
            Go
          </span>
        </span>
      )}
    </span>
  )
}
