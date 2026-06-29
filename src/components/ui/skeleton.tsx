import { type ComponentProps, type ReactElement } from 'react'
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: ComponentProps<'div'>): ReactElement {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gradient-to-r from-surface via-border to-surface bg-[length:400%_100%]',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
