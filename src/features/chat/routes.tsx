import type { RouteObject } from 'react-router-dom'
import Chat from './routes/Chat'

export const chatRoutes: RouteObject[] = [
  { path: 'chat/:companyId', element: <Chat /> },
]
