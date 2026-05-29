import { Link, Outlet } from 'react-router-dom'

import { useResolvedAuth } from '../routing/useResolvedAuth'

// Admin tree intentionally uses inline English strings — no i18n.
// See "Conventions (locked by F-01)" in CLAUDE.md.

export function AdminLayout() {
  const { user, signOut } = useResolvedAuth()

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#fafafa',
        color: '#111',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.25rem',
          background: '#111',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            to="/admin/queue"
            style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              textDecoration: 'none',
              color: '#fff',
            }}
          >
            polyGo
          </Link>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '0.15rem 0.5rem',
              border: '1px solid #fff',
              borderRadius: '0.25rem',
            }}
          >
            Admin
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {user?.email && <span style={{ fontSize: '0.85rem', color: '#ddd' }}>{user.email}</span>}
          <button
            type="button"
            onClick={() => {
              void signOut()
            }}
            style={{
              padding: '0.35rem 0.8rem',
              border: '1px solid #fff',
              borderRadius: '0.25rem',
              background: 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <main style={{ padding: '1.5rem', flex: 1 }}>
        <Outlet />
      </main>
    </div>
  )
}
