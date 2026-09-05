type LevelUpCelebrationProps = {
  isClosing: boolean
  level: number | null
  onDismiss: () => void
}

export function LevelUpToast({
  isClosing,
  level,
  onDismiss,
}: LevelUpCelebrationProps) {
  if (level === null) return null

  return (
    <div
      className={`level-up-toast${isClosing ? ' is-closing' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="level-up-toast-sparkle-icon" aria-hidden="true">
        ✦
      </span>
      <div className="level-up-toast-copy">
        <strong>
          <span className="level-up-toast-level">Lv.{level}</span>
          にレベルアップしました！
        </strong>
        <span>一歩ずつ前に進んでいます！</span>
      </div>
      <button
        className="level-up-toast-close"
        type="button"
        aria-label="レベルアップ通知を閉じる"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  )
}

type LevelUpAvatarProps = {
  avatarSrc: string
  isLevelingUp: boolean
}

export function LevelUpAvatar({ avatarSrc, isLevelingUp }: LevelUpAvatarProps) {
  return (
    <div
      className={`profile-avatar-celebration${
        isLevelingUp ? ' is-leveling-up' : ''
      }`}
    >
      <img
        className="profile-avatar-large"
        src={avatarSrc}
        alt=""
        aria-hidden="true"
      />
      {isLevelingUp ? (
        <span className="level-up-sparkles" aria-hidden="true">
          {Array.from({ length: 9 }, (_, index) => (
            <i key={index} />
          ))}
        </span>
      ) : null}
    </div>
  )
}
