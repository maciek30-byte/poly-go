import type { RouteObject } from 'react-router-dom'
import Favorites from './routes/Favorites'

export const favoritesRoutes: RouteObject[] = [
  { path: 'favorites', element: <Favorites /> },
]
