import { useState, type JSX } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/use-auth'

function initialsFromEmail(email: string | null | undefined): string {
  if (!email) return '?'
  const local = email.split('@')[0] ?? ''
  const first = local[0] ?? '?'
  return first.toUpperCase()
}

export function AppShell(): JSX.Element {
  const { t } = useTranslation('common')
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <header
        id="app-header"
        className="sticky top-0 z-10 flex items-center justify-between gap-5 px-5 py-3 bg-bg border-b border-border"
      >
        <Link to="/" className="text-heading font-semibold text-text-strong no-underline">
          {t('brand')}
        </Link>
        <nav className="flex gap-5 ml-6 flex-1 [&_a]:text-text-muted [&_a]:no-underline [&_a]:text-body [&_a]:font-medium [&_a]:py-2 [&_a]:aria-[current=page]:text-text-strong [&_a]:aria-[current=page]:border-b-2 [&_a]:aria-[current=page]:border-accent">
          <NavLink to="/" end>
            {t('nav.search')}
          </NavLink>
          <NavLink to="/favorites">{t('nav.favorites')}</NavLink>
          <NavLink to="/profile">{t('nav.profile')}</NavLink>
        </nav>
        <div
          className="relative"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setMenuOpen(false)
            }
          }}
        >
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-full text-text font-[inherit] cursor-pointer hover:bg-surface-hover"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="w-6 h-6 rounded-full bg-avatar text-accent-on inline-flex items-center justify-center text-label font-semibold">
              {initialsFromEmail(user?.email)}
            </span>
            <span>{user?.email ?? t('account.fallback')}</span>
          </button>
          {menuOpen && (
            <div
              className="absolute top-[calc(100%+8px)] right-0 min-w-[220px] p-3 bg-bg border border-border rounded-md shadow-md flex flex-col gap-2"
              role="menu"
            >
              <span className="text-label text-text-muted break-all">{user?.email}</span>
              <button
                type="button"
                className="px-3 py-2 border border-border rounded-md bg-bg text-text-strong font-[inherit] cursor-pointer text-left hover:bg-surface-hover"
                onClick={() => {
                  setMenuOpen(false)
                  void signOut()
                }}
              >
                {t('account.signOut')}
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </>
  )
}
