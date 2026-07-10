import type { RouteObject } from 'react-router-dom'
import Profile from './routes/Profile'

export const profileRoutes: RouteObject[] = [
  { path: 'profile', element: <Profile /> },
]
