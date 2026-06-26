import { type JSX } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import './MessageDrawerPlaceholder.css'

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
        <Dialog.Overlay className="msg-drawer-overlay" />
        <Dialog.Content className="msg-drawer">
          <div className="msg-drawer-head">
            <Dialog.Title className="msg-drawer-title">
              {target ? `Napisz do: ${target.name}` : 'Napisz wiadomość'}
            </Dialog.Title>
            <Dialog.Close className="msg-drawer-close" aria-label="Zamknij">
              ×
            </Dialog.Close>
          </div>

          {target && <p className="msg-drawer-role">{target.role}</p>}

          <div className="msg-drawer-body">
            <Dialog.Description className="msg-drawer-lead">
              Komunikator 1:1 pojawi się wkrótce.
            </Dialog.Description>
            <p className="msg-drawer-note">
              Wkrótce będzie tu można rozpocząć rozmowę z firmą bez wychodzenia z platformy.
              Na razie to podgląd — wiadomości jeszcze nie wysyłamy.
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
