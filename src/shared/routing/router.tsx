import { Navigate, createBrowserRouter } from 'react-router-dom'

import AccountLockedPage from '../../features/account-status/AccountLockedPage'
import AccountPendingPage from '../../features/account-status/AccountPendingPage'
import NotFoundPage from '../../features/account-status/NotFoundPage'
import LoginPage from '../../features/auth/LoginPage'
import { AdminLayout } from '../layout/AdminLayout'
import { AppLayout } from '../layout/AppLayout'
import { AccountStatusGate } from './AccountStatusGate'
import { ProtectedRoute } from './ProtectedRoute'
import { AdminQueuePlaceholder, Placeholder, RootRedirect } from './routeLeaves'

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/account-locked', element: <AccountLockedPage /> },
  { path: '/account-pending', element: <AccountPendingPage /> },
  {
    path: '/app',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AccountStatusGate />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <Placeholder i18nKey="dashboard" /> },
              { path: 'directory', element: <Placeholder i18nKey="directory" /> },
              { path: 'messages', element: <Placeholder i18nKey="messages" /> },
              { path: 'favorites', element: <Placeholder i18nKey="favorites" /> },
              { path: 'profile', element: <Placeholder i18nKey="profile" /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '/admin',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AccountStatusGate />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <Navigate to="queue" replace /> },
              { path: 'queue', element: <AdminQueuePlaceholder /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
