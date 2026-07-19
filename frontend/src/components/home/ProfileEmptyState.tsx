type ProfileEmptyStateProps = {
  onStart: () => void
}

export function ProfileEmptyState({ onStart }: ProfileEmptyStateProps) {
  return (
    <section className="profile-empty-state" aria-label="記録なし">
      <h2>まだ記録はありません</h2>
      <p>最初の一歩を始めてみましょう！</p>
      <button type="button" onClick={onStart}>
        最初の一歩を始める
      </button>
    </section>
  )
}
