import { type ComponentProps, type ReactElement } from 'react'
import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: ComponentProps<'textarea'>): ReactElement {
  return (
    <textarea
      className={cn(
        'w-full resize-y rounded-md border border-border bg-bg px-3 py-3 text-body text-text',
        'placeholder:text-text-subtle',
        'focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-bg',
        'disabled:cursor-not-allowed disabled:opacity-55',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
