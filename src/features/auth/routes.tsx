import type { RouteObject } from 'react-router-dom'
import Login from './routes/Login'
import AuthCallback from './routes/AuthCallback'

export const authRoutes: RouteObject[] = [
  { path: '/login', element: <Login /> },
  { path: '/auth/callback', element: <AuthCallback /> },
]
