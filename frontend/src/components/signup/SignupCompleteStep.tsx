type SignupCompleteStepProps = {
  completedName: string
  completedIconSrc: string
  onStart: () => void
}

export function SignupCompleteStep({
  completedName,
  completedIconSrc,
  onStart,
}: SignupCompleteStepProps) {
  return (
    <section className="complete-content" aria-labelledby="complete-title">
      <h2 id="complete-title">登録が完了しました！</h2>
      <p className="complete-description">早速始めましょう！</p>

      <div className="complete-profile">
        <span className="sparkle sparkle-one" aria-hidden="true" />
        <span className="sparkle sparkle-two" aria-hidden="true" />
        <span className="sparkle sparkle-three" aria-hidden="true" />
        <span className="sparkle sparkle-four" aria-hidden="true" />
        <span className="sparkle sparkle-five" aria-hidden="true" />
        <span className="sparkle sparkle-six" aria-hidden="true" />
        <span className="celebration-dot dot-one" aria-hidden="true" />
        <span className="celebration-dot dot-two" aria-hidden="true" />
        <span className="celebration-dot dot-three" aria-hidden="true" />
        <img
          className="complete-avatar"
          src={completedIconSrc}
          alt=""
          aria-hidden="true"
        />
        <span className="complete-check" aria-hidden="true" />
        <p className="complete-name">{completedName}</p>
      </div>

      <button
        className="submit-button start-button"
        type="button"
        onClick={onStart}
      >
        最初の一歩を始める
      </button>
    </section>
  )
}
