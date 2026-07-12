import { formatFeedPostAge } from '../../appHelpers'
import type { AchievementDetailTab, ProfileAchievement } from '../../appTypes'

type AchievementDetailPanelProps = {
  achievement: ProfileAchievement
  activeTab: AchievementDetailTab
  now: number
  onClose: () => void
  onTabChange: (tab: AchievementDetailTab) => void
}

export function AchievementDetailPanel({
  achievement,
  activeTab,
  now,
  onClose,
  onTabChange,
}: AchievementDetailPanelProps) {
  return (
    <>
      <button
        className="feed-comment-backdrop achievement-detail-backdrop"
        type="button"
        aria-label="詳細を閉じる"
        onClick={onClose}
      />
      <section
        className="feed-comment-panel feed-comment-panel-done achievement-detail-panel"
        aria-labelledby="achievement-detail-title"
      >
        <div className="feed-comment-panel-header">
          <h2 id="achievement-detail-title">
            {activeTab === 'likes' ? 'いいね' : 'コメント'}
          </h2>
          <button
            className="feed-comment-panel-close"
            type="button"
            aria-label="詳細を閉じる"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="achievement-detail-tabs" role="tablist">
          <button
            className={activeTab === 'likes' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeTab === 'likes'}
            onClick={() => onTabChange('likes')}
          >
            いいね({achievement.likes})
          </button>
          <button
            className={activeTab === 'comments' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeTab === 'comments'}
            onClick={() => onTabChange('comments')}
          >
            コメント({achievement.comments})
          </button>
        </div>

        <div className="feed-comment-panel-task">{achievement.task}</div>

        {activeTab === 'likes' ? (
          <ul
            className="feed-comment-panel-list achievement-detail-list"
            aria-label="いいねした人"
          >
            {achievement.likedUsers.map((user) => (
              <li
                className={user.afterComplete ? 'achievement-after-complete' : ''}
                key={user.name}
              >
                <div className="feed-comment-author">
                  <span className="feed-comment-avatar" aria-hidden="true" />
                  <span>{user.name}</span>
                  <span className="feed-comment-level">Lv.{user.level}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="feed-comment-panel-list" aria-label="コメント一覧">
            {achievement.commentItems.map((comment) => (
              <li
                className={
                  comment.afterComplete ? 'achievement-after-complete' : ''
                }
                key={`${comment.name}-${comment.text}`}
              >
                <div className="feed-comment-author">
                  <span className="feed-comment-avatar" aria-hidden="true" />
                  <span>{comment.name}</span>
                  <span className="feed-comment-level">Lv.{comment.level}</span>
                </div>
                <div className="feed-comment-body">
                  <span>{comment.text}</span>
                  <time>
                    {formatFeedPostAge(new Date(comment.age).getTime(), now)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
