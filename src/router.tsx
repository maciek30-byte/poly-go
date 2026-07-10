import { createBrowserRouter } from 'react-router-dom'
import i18n from './i18n'
import { AppShell } from './components/AppShell'
import { RequireAuth } from './components/RequireAuth'
import { RequireRole } from './components/RequireRole'
import { ComingSoon } from './components/ComingSoon'
import Login from './routes/Login'
import AuthCallback from './routes/AuthCallback'
import Home from './routes/Home'
import Favorites from './routes/Favorites'
import CompanyDetail from './routes/CompanyDetail'
import Chat from './routes/Chat'
import Profile from './routes/Profile'
import NotFound from './routes/NotFound'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/auth/callback', element: <AuthCallback /> },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Home /> },
      { path: 'favorites', element: <Favorites /> },
      { path: 'companies/:id', element: <CompanyDetail /> },
      { path: 'chat/:companyId', element: <Chat /> },
      { path: 'profile', element: <Profile /> },
      {
        path: 'admin',
        element: (
          <RequireRole allowedRoles={['super_admin']}>
            <ComingSoon title={i18n.t('errors:admin.title')} />
          </RequireRole>
        ),
      },
    ],
  },
  { path: '*', element: <NotFound /> },
])
