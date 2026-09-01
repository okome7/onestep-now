import type { MouseEvent } from 'react'

type WelcomePageProps = {
  onNavigate: (path: '/login' | '/signup') => void
}

export function WelcomePage({ onNavigate }: WelcomePageProps) {
  function handleNavigation(
    event: MouseEvent<HTMLAnchorElement>,
    path: '/login' | '/signup',
  ) {
    event.preventDefault()
    onNavigate(path)
  }

  return (
    <main className="welcome-page">
      <section className="welcome-content" aria-labelledby="welcome-title">
        <h1 id="welcome-title" className="welcome-app-name">
          OneStep Now
        </h1>
        <div className="welcome-logo-area">
          <span className="welcome-logo-dot" aria-hidden="true" />
          <span className="welcome-logo-ring" aria-hidden="true" />
          <div className="welcome-logo-frame">
            <img
              className="welcome-logo"
              src="/favicon.svg"
              alt="OneStep Nowのロゴ"
            />
          </div>
        </div>
        <h2 className="welcome-message">
          <span>今できることから、</span>
          <br />
          <span className="welcome-message-accent">一歩ずつ。</span>
        </h2>
        <p className="welcome-submessage">
          考える前に、まずひとつ始めよう。
        </p>

        <div className="welcome-actions">
          <a
            className="submit-button welcome-login-button"
            href="/login"
            onClick={(event) => handleNavigation(event, '/login')}
          >
            ログイン
          </a>
          <a
            className="login-action-link welcome-signup-button"
            href="/signup"
            onClick={(event) => handleNavigation(event, '/signup')}
          >
            新規登録
          </a>
        </div>
      </section>
    </main>
  )
}
