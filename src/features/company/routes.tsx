import type { RouteObject } from 'react-router-dom'
import Home from './routes/Home'
import CompanyDetail from './routes/CompanyDetail'

export const companyRoutes: RouteObject[] = [
  { index: true, element: <Home /> },
  { path: 'companies/:id', element: <CompanyDetail /> },
]
