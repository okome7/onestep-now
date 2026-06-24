import { useEffect, useState } from 'react'
import './App.css'
import { currentPathname, hasActiveAuthSession } from './appHelpers'
import { LoginPage } from './pages/LoginPage'
import { PasswordResetPage } from './pages/PasswordResetPage'
import { SignupPage } from './pages/SignupPage'
import { HomePage } from './pages/HomePage'

function pathForAuthState(pathname: string) {
  const isAuthenticated = hasActiveAuthSession()

  if (isAuthenticated && pathname === '/') {
    return '/home'
  }

  if (!isAuthenticated && pathname === '/home') {
    return '/'
  }

  return pathname
}

function App() {
  const [pathname, setPathname] = useState(() =>
    pathForAuthState(currentPathname()),
  )

  useEffect(() => {
    const updatePathname = () => {
      const currentPath = currentPathname()
      const nextPath = pathForAuthState(currentPath)

      if (nextPath !== currentPath) {
        window.history.replaceState(null, '', nextPath)
      }

      setPathname(nextPath)
    }

    window.addEventListener('popstate', updatePathname)
    updatePathname()

    return () => window.removeEventListener('popstate', updatePathname)
  }, [])

  function openHomeAfterLogin() {
    window.history.pushState(null, '', '/home')
    setPathname('/home')
    window.scrollTo({ top: 0, left: 0 })
  }

  if (pathname === '/login') {
    return <LoginPage onLoginSuccess={openHomeAfterLogin} />
  }

  if (pathname === '/password-reset') {
    return <PasswordResetPage />
  }

  if (pathname === '/home') {
    return <HomePage />
  }

  return <SignupPage />
}

export default App
