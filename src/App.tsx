import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from './router'

// Odstęp toastu od dołu top bara. Toast zawsze po prawej, 10px pod paskiem.
const GAP_BELOW_TOPBAR = 10

function App() {
  const [toastOffsetTop, setToastOffsetTop] = useState(GAP_BELOW_TOPBAR)

  useEffect(() => {
    const measure = (): void => {
      const header = document.getElementById('app-header')
      const barHeight = header ? header.getBoundingClientRect().height : 0
      setToastOffsetTop(barHeight + GAP_BELOW_TOPBAR)
    }
    measure()
    window.addEventListener('resize', measure)
    const observer = new MutationObserver(measure)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      window.removeEventListener('resize', measure)
      observer.disconnect()
    }
  }, [])

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        richColors
        offset={`${toastOffsetTop}px`}
      />
    </>
  )
}

export default App
