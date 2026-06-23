type ComingSoonProps = {
  title: string
}

export function ComingSoon({ title }: ComingSoonProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2, 8px)',
        padding: 'var(--space-6, 48px)',
        textAlign: 'center',
      }}
    >
      <h1>{title}</h1>
      <p style={{ color: 'var(--color-text-muted, #666)' }}>Wkrótce</p>
    </div>
  )
}
