export function LoadingScreen() {
  return (
    <main className="loading-page" aria-live="polite" aria-busy="true">
      <section className="loading-content">
        <div className="loading-spinner" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p>読み込んでいます…</p>
      </section>
    </main>
  )
}
