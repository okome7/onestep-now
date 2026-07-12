import { formatFeedPostAge } from '../../appHelpers'
import type { AchievementDetailTab, ProfileAchievement } from '../../appTypes'
import commentIcon from '../../assets/icons/comment.svg'
import likeIcon from '../../assets/icons/like.svg'

type AchievementListProps = {
  achievements: ProfileAchievement[]
  now: number
  activeAchievementId?: string | null
  variant?: 'recent' | 'all'
  onOpenDetail: (achievementId: string, tab: AchievementDetailTab) => void
}

export function AchievementList({
  achievements,
  now,
  activeAchievementId,
  variant = 'recent',
  onOpenDetail,
}: AchievementListProps) {
  const listClassName =
    variant === 'all'
      ? 'profile-achievement-list all-achievement-list'
      : 'profile-achievement-list'

  return (
    <div className={listClassName}>
      {achievements.map((achievement) => {
        const isActive = activeAchievementId === achievement.id
        const cardClassName =
          variant === 'all'
            ? `profile-achievement-card all-achievement-card ${
                isActive ? 'is-active' : ''
              }`
            : 'profile-achievement-card'

        return (
          <article className={cardClassName} key={achievement.id}>
            <strong>{achievement.task}</strong>
            <div>
              <button
                className="achievement-reaction-button"
                type="button"
                onClick={() => onOpenDetail(achievement.id, 'likes')}
              >
                <img src={likeIcon} alt="" aria-hidden="true" />
                {achievement.likes}
              </button>
              <button
                className="achievement-reaction-button"
                type="button"
                onClick={() => onOpenDetail(achievement.id, 'comments')}
              >
                <img src={commentIcon} alt="" aria-hidden="true" />
                {achievement.comments}
              </button>
              <time dateTime={new Date(achievement.createdAt).toISOString()}>
                {formatFeedPostAge(achievement.createdAt, now)}
              </time>
            </div>
          </article>
        )
      })}
    </div>
  )
}
