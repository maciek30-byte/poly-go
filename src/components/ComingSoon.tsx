import { type JSX } from 'react'

type ComingSoonProps = {
  title: string
}

export function ComingSoon({ title }: ComingSoonProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
      <h1>{title}</h1>
      <p className="text-text-muted">Wkrótce</p>
    </div>
  )
}
