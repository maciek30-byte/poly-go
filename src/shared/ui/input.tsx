import { type ComponentProps, type ReactElement } from 'react'
import { cn } from '@/shared/lib/utils'

function Input({ className, ...props }: ComponentProps<'input'>): ReactElement {
  return (
    <input
      className={cn(
        'w-full rounded-md border border-border bg-surface px-4 py-3 text-body text-text-strong transition-colors',
        'placeholder:text-text-subtle',
        'hover:not-disabled:border-border-strong hover:not-disabled:bg-bg',
        'focus:border-accent focus:bg-bg focus:outline-none focus:ring-4 focus:ring-accent-bg',
        'disabled:cursor-not-allowed disabled:opacity-55',
        'aria-invalid:border-error aria-invalid:focus:ring-error-bg',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
