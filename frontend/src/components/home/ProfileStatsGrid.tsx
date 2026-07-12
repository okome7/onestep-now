import achievementCheckIcon from '../../assets/icons/achievement-check.svg'
import achievementFlameIcon from '../../assets/icons/achievement-flame.svg'
import commentIcon from '../../assets/icons/comment.svg'
import likeActiveIcon from '../../assets/icons/like-active.svg'

type ProfileStatsGridProps = {
  achievementsCount: number
  streakDays: number
  likesCount: number
  commentsCount: number
}

export function ProfileStatsGrid({
  achievementsCount,
  streakDays,
  likesCount,
  commentsCount,
}: ProfileStatsGridProps) {
  return (
    <div className="profile-stats-grid">
      <div className="profile-stat-card">
        <img src={achievementCheckIcon} alt="" aria-hidden="true" />
        <strong>{achievementsCount}回</strong>
        <small>達成</small>
      </div>
      <div className="profile-stat-card">
        <img src={achievementFlameIcon} alt="" aria-hidden="true" />
        <strong>{streakDays}日</strong>
        <small>連続</small>
      </div>
      <div className="profile-stat-card">
        <img src={likeActiveIcon} alt="" aria-hidden="true" />
        <strong>{likesCount}</strong>
        <small>いいね</small>
      </div>
      <div className="profile-stat-card">
        <img src={commentIcon} alt="" aria-hidden="true" />
        <strong>{commentsCount}</strong>
        <small>コメント</small>
      </div>
    </div>
  )
}
