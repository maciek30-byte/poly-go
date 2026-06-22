import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/use-auth'
import './AppShell.css'

function initialsFromEmail(email: string | null | undefined): string {
  if (!email) return '?'
  const local = email.split('@')[0] ?? ''
  const first = local[0] ?? '?'
  return first.toUpperCase()
}

export function AppShell() {
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <header className="app-shell__header">
        <Link to="/" className="app-shell__brand">
          PolyGo
        </Link>
        <nav className="app-shell__nav">
          <NavLink to="/" end>
            Wyszukaj
          </NavLink>
          <NavLink to="/favorites">Ulubione</NavLink>
          <NavLink to="/profile">Profil</NavLink>
        </nav>
        <div
          className="app-shell__user-menu"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setMenuOpen(false)
            }
          }}
        >
          <button
            type="button"
            className="app-shell__user-trigger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="app-shell__user-avatar">
              {initialsFromEmail(user?.email)}
            </span>
            <span>{user?.email ?? 'Konto'}</span>
          </button>
          {menuOpen && (
            <div className="app-shell__user-popover" role="menu">
              <span className="app-shell__user-email">{user?.email}</span>
              <button
                type="button"
                className="app-shell__signout"
                onClick={() => {
                  setMenuOpen(false)
                  void signOut()
                }}
              >
                Wyloguj
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="app-shell__main">
        <Outlet />
      </main>
    </>
  )
}
