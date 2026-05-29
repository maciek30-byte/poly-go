import { RouterProvider } from 'react-router-dom'

// Side-effect import: triggers i18n.init() synchronously with the inline pl
// resources, so t() is callable on the first render of the layout shell.
import './shared/i18n'

import { SessionGate } from './shared/layout/SessionGate'
import { AuthProvider } from './shared/routing/AuthContext'
import { router } from './shared/routing/router'

function App() {
  return (
    <AuthProvider>
      <SessionGate>
        <RouterProvider router={router} />
      </SessionGate>
    </AuthProvider>
  )
}

export default App
