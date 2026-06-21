import { useEffect, useState } from 'react'
import './App.css'
import { currentPathname } from './appHelpers'
import { LoginPage } from './pages/LoginPage'
import { PasswordResetPage } from './pages/PasswordResetPage'
import { SignupPage } from './pages/SignupPage'
import { HomePage } from './pages/HomePage'

function App() {
  const [pathname, setPathname] = useState(currentPathname)

  useEffect(() => {
    const updatePathname = () => setPathname(currentPathname())

    window.addEventListener('popstate', updatePathname)

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
