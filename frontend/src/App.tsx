import { useEffect, useState } from 'react'
import './App.css'
import {
  clearAuthSession,
  currentPathname,
  saveCompleteProfile,
} from './appHelpers'
import {
  avatarOptions,
  authSessionStorageKey,
  signupCompleteStorageKey,
} from './appConstants'
import { fetchSession } from './sessionApi'
import { LoginPage } from './pages/LoginPage'
import { PasswordResetPage } from './pages/PasswordResetPage'
import { SignupPage } from './pages/SignupPage'
import { HomePage } from './pages/HomePage'
import { LoadingScreen } from './components/LoadingScreen'
import { WelcomePage } from './pages/WelcomePage'

export const loadingScreenDelayMs = 300
const sessionRetryDelayMs = 2000

type InitialLoadingStage = 'hidden' | 'loading'

function pathForAuthState(pathname: string, isAuthenticated: boolean) {
  if (isAuthenticated && pathname === '/') {
    return '/home'
  }

  if (!isAuthenticated && pathname === '/home') {
    return '/'
  }

  return pathname
}

function App() {
  const [pathname, setPathname] = useState(currentPathname)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [initialLoadingStage, setInitialLoadingStage] =
    useState<InitialLoadingStage>('hidden')

  useEffect(() => {
    let isCancelled = false
    let restoreId = 0
    let loadingTimerId: number | undefined
    let retryTimerId: number | undefined

    const waitBeforeRetry = () =>
      new Promise<void>((resolve) => {
        retryTimerId = window.setTimeout(resolve, sessionRetryDelayMs)
      })

    const restoreSession = async () => {
      const currentRestoreId = ++restoreId
      window.clearTimeout(loadingTimerId)
      window.clearTimeout(retryTimerId)
      setInitialLoadingStage('hidden')
      loadingTimerId = window.setTimeout(() => {
        if (!isCancelled && currentRestoreId === restoreId) {
          setInitialLoadingStage('loading')
        }
      }, loadingScreenDelayMs)
      let user: Awaited<ReturnType<typeof fetchSession>> | undefined

      while (!isCancelled && currentRestoreId === restoreId) {
        try {
          user = await fetchSession()
          break
        } catch {
          await waitBeforeRetry()
        }
      }

      if (isCancelled || currentRestoreId !== restoreId) {
        return
      }

      window.clearTimeout(loadingTimerId)
      setInitialLoadingStage('hidden')
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
        window.history.replaceState(null, '', '/')
        setPathname('/')
      }
    }

    window.addEventListener('popstate', updatePathname)
    window.addEventListener('storage', handleStorage)
    window.addEventListener('onestep:unauthorized', handleUnauthorized)
    void restoreSession()

    return () => {
      isCancelled = true
      restoreId += 1
      window.clearTimeout(loadingTimerId)
      window.clearTimeout(retryTimerId)
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

  function openAuthenticationPage(path: '/login' | '/signup') {
    window.history.pushState(null, '', path)
    setPathname(path)
    window.scrollTo({ top: 0, left: 0 })
  }

  if (isAuthenticated === null) {
    if (initialLoadingStage === 'loading') {
      return <LoadingScreen />
    }

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

  if (pathname === '/signup') {
    return <SignupPage />
  }

  return <WelcomePage onNavigate={openAuthenticationPage} />
}

export default App
