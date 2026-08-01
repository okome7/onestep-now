import { useEffect } from 'react'
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
  openMenuId?: string | null
  onToggleMenu?: (achievementId: string) => void
  onRequestDelete?: (achievementId: string) => void
}

export function AchievementList({
  achievements,
  now,
  activeAchievementId,
  variant = 'recent',
  onOpenDetail,
  openMenuId = null,
  onToggleMenu,
  onRequestDelete,
}: AchievementListProps) {
  useEffect(() => {
    if (!openMenuId || !onToggleMenu) {
      return undefined
    }

    const closeMenu = (event: PointerEvent) => {
      const target = event.target as Element

      if (!target.closest('.profile-achievement-menu-container')) {
        onToggleMenu(openMenuId)
      }
    }

    document.addEventListener('pointerdown', closeMenu)
    return () => document.removeEventListener('pointerdown', closeMenu)
  }, [onToggleMenu, openMenuId])

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
            <div className="profile-achievement-header">
              <strong>{achievement.task}</strong>
              {achievement.canDelete && onToggleMenu && onRequestDelete ? (
                <div className="profile-achievement-menu-container">
                  <button
                    className="profile-achievement-menu-button"
                    type="button"
                    aria-label={`${achievement.task}のメニュー`}
                    aria-expanded={openMenuId === achievement.id}
                    aria-haspopup="menu"
                    onClick={() => onToggleMenu(achievement.id)}
                  >
                    …
                  </button>
                  {openMenuId === achievement.id ? (
                    <div className="profile-achievement-menu" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => onRequestDelete(achievement.id)}
                      >
                        <svg viewBox="0 0 28 28" aria-hidden="true" focusable="false">
                          <rect
                            x="11"
                            y="4.5"
                            width="6"
                            height="3"
                            rx="1"
                            stroke="#FF5A5F"
                            strokeWidth="2.3"
                          />
                          <path
                            d="M7 8H21"
                            stroke="#FF5A5F"
                            strokeWidth="2.3"
                            strokeLinecap="round"
                          />
                          <rect
                            x="8"
                            y="8"
                            width="12"
                            height="14"
                            rx="2.5"
                            stroke="#FF5A5F"
                            strokeWidth="2.3"
                          />
                          <path
                            d="M12 12V18"
                            stroke="#FF5A5F"
                            strokeWidth="2.3"
                            strokeLinecap="round"
                          />
                          <path
                            d="M16 12V18"
                            stroke="#FF5A5F"
                            strokeWidth="2.3"
                            strokeLinecap="round"
                          />
                        </svg>
                        投稿を削除
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="profile-achievement-meta">
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
