type ProfileLevelCardProps = {
  level: number
  nextLevel: number
  remainingToNextLevel: number
  progressPercent: number
}

export function ProfileLevelCard({
  level,
  nextLevel,
  remainingToNextLevel,
  progressPercent,
}: ProfileLevelCardProps) {
  return (
    <section className="profile-level-card" aria-label="レベル">
      <div className="profile-level-row">
        <span className="profile-level-label">
          Lv.<strong>{level}</strong>
        </span>
        <span className="profile-level-next">
          あと{remainingToNextLevel}回でLv.{nextLevel}！
        </span>
      </div>
      <div className="profile-level-meter" aria-hidden="true">
        <span style={{ width: `${progressPercent}%` }} />
      </div>
      <span className="profile-level-percent">{progressPercent}%</span>
    </section>
  )
}
