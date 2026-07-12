import { formatFeedPostAge, getAvatarSrc } from '../../appHelpers'
import type { FeedPost } from '../../appTypes'

type FeedCommentPanelProps = {
  post: FeedPost
  draft: string
  now: number
  onClose: () => void
  onDraftChange: (postId: string, value: string) => void
  onSubmit: (postId: string) => void
}

export function FeedCommentPanel({
  post,
  draft,
  now,
  onClose,
  onDraftChange,
  onSubmit,
}: FeedCommentPanelProps) {
  return (
    <>
      <button
        className="feed-comment-backdrop"
        type="button"
        aria-label="コメントを閉じる"
        onClick={onClose}
      />
      <section
        className={`feed-comment-panel feed-comment-panel-${post.status}`}
        aria-labelledby="feed-comment-panel-title"
      >
        <div className="feed-comment-panel-header">
          <h2 id="feed-comment-panel-title">コメント</h2>
          <button
            className="feed-comment-panel-close"
            type="button"
            aria-label="コメントを閉じる"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="feed-comment-panel-task">{post.task}</div>

        {post.comments.length > 0 ? (
          <ul className="feed-comment-panel-list" aria-label="コメント一覧">
            {post.comments.map((comment) => (
              <li
                className={`feed-comment-item-${comment.postStatusWhenCommented}`}
                key={comment.id}
              >
                <div className="feed-comment-author">
                  <img
                    className="feed-comment-avatar"
                    src={getAvatarSrc(comment.avatarId)}
                    alt=""
                    aria-hidden="true"
                  />
                  <span>{comment.userName}</span>
                  <span className="feed-comment-level">Lv.{comment.level}</span>
                </div>
                <div className="feed-comment-body">
                  <span>{comment.body}</span>
                  <time dateTime={new Date(comment.createdAt).toISOString()}>
                    {formatFeedPostAge(comment.createdAt, now)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="feed-comment-empty">まだコメントはありません</p>
        )}

        <div className="feed-comment-panel-form">
          <input
            type="text"
            aria-label={`${post.userName}さんの投稿にコメントする`}
            placeholder="コメントを入力"
            value={draft}
            disabled={!post.canComment}
            onChange={(event) => onDraftChange(post.id, event.target.value)}
          />
          <button
            type="button"
            aria-label="コメントを送信"
            onClick={() => onSubmit(post.id)}
            disabled={!post.canComment || !draft.trim()}
          >
            ➤
          </button>
        </div>
      </section>
    </>
  )
}
