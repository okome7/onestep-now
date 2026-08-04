import { useEffect, useState } from 'react'
import './App.css'
import {
  clearAuthSession,
  currentPathname,
  saveCompleteProfile,
} from './appHelpers'
import { avatarOptions, authSessionStorageKey, signupCompleteStorageKey } from './appConstants'
import { fetchSession } from './sessionApi'
import { LoginPage } from './pages/LoginPage'
import { PasswordResetPage } from './pages/PasswordResetPage'
import { SignupPage } from './pages/SignupPage'
import { HomePage } from './pages/HomePage'

function pathForAuthState(pathname: string, isAuthenticated: boolean) {
  if (isAuthenticated && pathname === '/') {
    return '/home'
  }

  if (!isAuthenticated && pathname === '/home') {
    return '/login'
  }

  return pathname
}

function App() {
  const [pathname, setPathname] = useState(currentPathname)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const restoreSession = async () => {
      const user = await fetchSession().catch(() => null)
      const authenticated = Boolean(user)

      if (user) {
        saveCompleteProfile({
          id: user.id,
          name: user.name,
          email: user.email,
          avatarId: user.avatar_key ?? avatarOptions[0].id,
        })
      } else {
        clearAuthSession()
        window.localStorage.removeItem(signupCompleteStorageKey)
      }

      setIsAuthenticated(authenticated)
      const currentPath = currentPathname()
      const nextPath = pathForAuthState(currentPath, authenticated)

      if (nextPath !== currentPath) {
        window.history.replaceState(null, '', nextPath)
      }

      setPathname(nextPath)
    }

    const updatePathname = () => void restoreSession()
    const handleStorage = (event: StorageEvent) => {
      if (event.key === authSessionStorageKey) {
        void restoreSession()
      }
    }
    const handleUnauthorized = () => {
      clearAuthSession()
      window.localStorage.removeItem(signupCompleteStorageKey)
      setIsAuthenticated(false)

      if (currentPathname() === '/home') {
        window.history.replaceState(null, '', '/login')
        setPathname('/login')
      }
    }

    window.addEventListener('popstate', updatePathname)
    window.addEventListener('storage', handleStorage)
    window.addEventListener('onestep:unauthorized', handleUnauthorized)
    void restoreSession()

    return () => {
      window.removeEventListener('popstate', updatePathname)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('onestep:unauthorized', handleUnauthorized)
    }
  }, [])

  function openHomeAfterLogin() {
    window.history.pushState(null, '', '/home')
    setIsAuthenticated(true)
    setPathname('/home')
    window.scrollTo({ top: 0, left: 0 })
  }

  if (isAuthenticated === null) {
    return null
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
