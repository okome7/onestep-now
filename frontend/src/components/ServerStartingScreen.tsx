import { AppHeader } from '../sharedComponents'

function RocketIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M39.5 11.5c5.1-1.6 9.9-1.4 13-.8.6 3.1.8 7.9-.8 13-2.3 7.3-7.6 13.9-14.1 18.3l-8.2-8.2-8.2-8.2c4.4-6.5 11-11.8 18.3-14.1Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.5"
      />
      <circle
        cx="41"
        cy="23"
        r="4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="m23.5 28.5-8.3 1.7-5.7 5.7 11.2 1.3M35.5 40.5l-1.7 8.3-5.7 5.7-1.3-11.2M20 44l-6 6M24 48l-4 4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.5"
      />
    </svg>
  )
}

export function ServerStartingScreen() {
  return (
    <main className="server-starting-page" aria-live="polite" aria-busy="true">
      <AppHeader />
      <section className="server-starting-content">
        <div className="server-starting-icon">
          <RocketIcon />
        </div>
        <h2>サーバーを起動しています</h2>
        <p className="server-starting-description">
          はじめてのアクセスのため、少し時間がかかることがあります。
        </p>
        <div
          className="server-starting-progress"
          role="progressbar"
          aria-label="サーバー起動中"
        >
          <span />
        </div>
        <p className="server-starting-wait">しばらくお待ちください…</p>
      </section>
    </main>
  )
}
