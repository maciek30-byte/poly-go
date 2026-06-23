import './Logo.css'

type LogoSize = 'sm' | 'md' | 'lg'
type LogoVariant = 'full' | 'mark'

type LogoProps = {
  size?: LogoSize
  variant?: LogoVariant
  className?: string
  decorative?: boolean
}

export function Logo({
  size = 'md',
  variant = 'full',
  className,
  decorative = false,
}: LogoProps) {
  const labelProps = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img', 'aria-label': 'PolyGo' }

  return (
    <span
      {...labelProps}
      className={[
        'logo',
        `logo--${size}`,
        `logo--${variant}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="logo__mark" aria-hidden="true">
        <svg
          className="logo__mark-svg"
          viewBox="0 0 40 40"
          xmlns="http://www.w3.org/2000/svg"
          focusable="false"
        >
          <defs>
            <linearGradient id="logoGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--logo-gradient-start, #34795a)" />
              <stop offset="100%" stopColor="var(--logo-gradient-end, #1f4a37)" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="20" fill="url(#logoGradient)" />
          <path
            d="M14.4 11.2h7.2c3.43 0 6.08 2.59 6.08 5.92 0 3.33-2.65 5.92-6.08 5.92h-3.5v5.76h-3.7V11.2zm3.7 8.48h3.3c1.4 0 2.5-1.04 2.5-2.56 0-1.52-1.1-2.56-2.5-2.56h-3.3v5.12z"
            fill="var(--logo-mark-fg, #ffffff)"
          />
          <circle
            cx="29.2"
            cy="28.4"
            r="2.4"
            fill="var(--logo-accent-dot, #c8e8d4)"
          />
        </svg>
      </span>
      {variant === 'full' && (
        <span className="logo__wordmark">
          <span className="logo__wordmark-poly">Poly</span>
          <span className="logo__wordmark-go">Go</span>
        </span>
      )}
    </span>
  )
}
