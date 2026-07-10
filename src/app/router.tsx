import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/shared/components/AppShell'
import NotFound from '@/shared/components/NotFound'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { RequireRole } from '@/features/auth/components/RequireRole'
import { authRoutes } from '@/features/auth/routes'
import { companyRoutes } from '@/features/company/routes'
import { profileRoutes } from '@/features/profile/routes'
import { favoritesRoutes } from '@/features/favorites/routes'
import { chatRoutes } from '@/features/chat/routes'
import { adminRoutes } from '@/features/admin/routes'

export const router = createBrowserRouter([
  ...authRoutes,
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      ...companyRoutes,
      ...favoritesRoutes,
      ...chatRoutes,
      ...profileRoutes,
      ...adminRoutes.map((route) => ({
        ...route,
        element: <RequireRole allowedRoles={['super_admin']}>{route.element}</RequireRole>,
      })),
    ],
  },
  { path: '*', element: <NotFound /> },
])
