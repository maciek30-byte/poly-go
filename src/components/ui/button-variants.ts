import { cva } from 'class-variance-authority'

/** Class recipe for Button — kept in its own module so the component file can
 *  export only the component (react-refresh/only-export-components). */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-body font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-55 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-accent text-accent-on border border-transparent hover:bg-accent-hover',
        ghost:
          'bg-bg text-text-strong border border-border hover:border-border-strong hover:bg-surface',
        link: 'text-accent underline-offset-2 hover:underline',
      },
      size: {
        default: 'px-4 py-[9px]',
        sm: 'px-[11px] py-[5px] text-label',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)
