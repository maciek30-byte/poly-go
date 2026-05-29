import { Link, NavLink, Outlet } from 'react-router-dom'

import { useTranslation } from '../i18n'
import { useResolvedAuth } from '../routing/useResolvedAuth'
import styles from './AppLayout.module.css'

const NAV_ITEMS = [
  { to: '/app/directory', key: 'directory' },
  { to: '/app/messages', key: 'messages' },
  { to: '/app/favorites', key: 'favorites' },
  { to: '/app/profile', key: 'profile' },
] as const

type NavKey = (typeof NAV_ITEMS)[number]['key']

export function AppLayout() {
  const { t } = useTranslation()
  const { user, signOut } = useResolvedAuth()

  const renderNavLink = (to: string, key: NavKey) => (
    <NavLink key={to} to={to} className={styles.navLink}>
      {t(`layout.nav.${key}`)}
    </NavLink>
  )

  return (
    <div className={styles.root}>
      <header className={styles.appBar}>
        <Link to="/app/dashboard" className={styles.brand}>
          {t('layout.brand')}
        </Link>
        <div className={styles.userMenu}>
          {user?.email && <span className={styles.userEmail}>{user.email}</span>}
          <button
            type="button"
            onClick={() => {
              void signOut()
            }}
            className={styles.signOutButton}
          >
            {t('layout.signOut')}
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <nav className={styles.sidebar} aria-label="Primary">
          {NAV_ITEMS.map(({ to, key }) => renderNavLink(to, key))}
        </nav>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>

      <nav className={styles.bottomBar} aria-label="Primary mobile">
        {NAV_ITEMS.map(({ to, key }) => renderNavLink(to, key))}
      </nav>
    </div>
  )
}
