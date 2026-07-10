import { type ComponentProps, type ReactElement } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/shared/lib/utils'

/** Taby profilu firmy — odwzorowanie .tab-bar / .tab-item(.on) z mockupu
 *  polyGo_mockup_v4/co-ecoplas.html. Cienki wrapper na Radix Tabs.
 *
 *  TabsList jest lepki pod nagłówkiem AppShell (sticky). Nagłówek ma
 *  zmienną wysokość (~48px, sticky top-0), więc lista przykleja się na
 *  stałym offsecie top-12 — spójnie z górnym paskiem aplikacji. */

function Tabs({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Root>): ReactElement {
  return <TabsPrimitive.Root className={cn('flex flex-col', className)} {...props} />
}

function TabsList({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.List>): ReactElement {
  return (
    <TabsPrimitive.List
      className={cn(
        'sticky top-12 z-20 flex gap-0 bg-bg border-b border-border px-7 shadow-[0_1px_3px_rgba(0,0,0,0.05)] max-md:px-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>): ReactElement {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'relative -mb-px cursor-pointer whitespace-nowrap border-b-2 border-transparent px-3.5 py-3 text-value text-text-muted transition-colors',
        'hover:text-text-strong',
        'data-[state=active]:border-b-[3px] data-[state=active]:border-accent data-[state=active]:font-semibold data-[state=active]:text-accent',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Content>): ReactElement {
  return (
    <TabsPrimitive.Content
      className={cn('outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
