import { cva } from 'class-variance-authority'

/** Class recipe for Button — kept in its own module so the component file can
 *  export only the component (react-refresh/only-export-components).
 *
 *  Warianty odwzorowują .btn z mockupu polyGo_mockup_v4/co-ecoplas.html:
 *    primary      → .btn-pri  (teal, biały tekst, cień + hover lift)
 *    secondary    → .btn-sec  (jasne tło, mocniejszy border)
 *    ghost-accent → .btn-gst  (przezroczyste, teal border + tekst)
 *    ghost        → neutralny outline (zachowany z poprzedniej wersji)
 *    link         → tekstowy akcent
 *  Rozmiary: default (.btn 7px 14px / 12px), sm (.btn-sm 4px 10px / 11px). */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-[13px] [&_svg]:[stroke-width:1.5]',
  {
    variants: {
      variant: {
        primary:
          'bg-accent text-accent-on border border-transparent font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.2)] hover:bg-accent-hover hover:-translate-y-px hover:shadow-[0_3px_8px_rgba(0,0,0,0.18)]',
        secondary:
          'bg-bg text-text-strong border border-border-strong shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:bg-surface hover:shadow-[0_3px_10px_rgba(0,0,0,0.10)]',
        'ghost-accent':
          'bg-transparent text-accent border border-accent hover:bg-accent-bg hover:border-accent-hover',
        ghost:
          'bg-bg text-text-strong border border-border hover:border-border-strong hover:bg-surface',
        link: 'text-accent underline-offset-2 hover:underline',
      },
      size: {
        default: 'px-3.5 py-[7px] text-label',
        sm: 'px-2.5 py-1 text-[11px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)
