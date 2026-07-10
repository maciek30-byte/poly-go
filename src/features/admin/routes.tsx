import type { RouteObject } from 'react-router-dom'
import Admin from './routes/Admin'

export const adminRoutes: RouteObject[] = [
  { path: 'admin', element: <Admin /> },
]
