import { type JSX } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

export type MessageTarget = {
  name: string
  role: string
}

type MessageDrawerPlaceholderProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: MessageTarget | null
}

// Placeholder czatu (S-04 poza zakresem). CTA "Napisz" otwiera ten drawer,
// zamiast nawigować — pozycja scrolla na profilu zostaje zachowana.
export function MessageDrawerPlaceholder({ open, onOpenChange, target }: MessageDrawerPlaceholderProps): JSX.Element {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/40" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-[101] flex w-[min(420px,100vw)] flex-col gap-3 border-l border-border bg-bg p-6 text-text shadow-md">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="m-0 text-heading text-text-strong">
              {target ? `Napisz do: ${target.name}` : 'Napisz wiadomość'}
            </Dialog.Title>
            <Dialog.Close
              className="m-0 cursor-pointer border-none bg-transparent px-1 py-0 text-[24px] leading-none text-text-muted hover:text-text-strong"
              aria-label="Zamknij"
            >
              ×
            </Dialog.Close>
          </div>

          {target && <p className="m-0 text-label font-normal text-text-muted">{target.role}</p>}

          <div className="mt-4 rounded-lg border border-dashed border-border-strong bg-surface p-5">
            <Dialog.Description className="mb-2 mt-0 text-body font-semibold text-text-strong">
              Komunikator 1:1 pojawi się wkrótce.
            </Dialog.Description>
            <p className="m-0 text-value font-normal leading-relaxed text-text-muted">
              Wkrótce będzie tu można rozpocząć rozmowę z firmą bez wychodzenia z platformy.
              Na razie to podgląd — wiadomości jeszcze nie wysyłamy.
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
