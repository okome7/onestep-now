import { formatFeedPostAge, getAvatarSrc } from '../../appHelpers'
import type { FeedPost } from '../../appTypes'
import commentActiveIcon from '../../assets/icons/comment-active.svg'
import commentIcon from '../../assets/icons/comment.svg'
import likeActiveIcon from '../../assets/icons/like-active.svg'
import likeIcon from '../../assets/icons/like.svg'

type FeedPostCardProps = {
  post: FeedPost
  now: number
  onLike: (postId: string) => void
  onOpenComments: (postId: string) => void
  onOpenProfile: (userId: number) => void
}

export function FeedPostCard({
  post,
  now,
  onLike,
  onOpenComments,
  onOpenProfile,
}: FeedPostCardProps) {
  return (
    <article className={`feed-card feed-card-${post.status}`}>
      <div className="feed-card-header">
        <div className="feed-user">
          {!post.isOwnPost && post.userId ? (
            <button
              className="feed-profile-button"
              type="button"
              aria-label={`${post.userName}さんのマイページを見る`}
              onClick={() => onOpenProfile(post.userId!)}
            >
              <img
                className="feed-avatar"
                src={getAvatarSrc(post.avatarId)}
                alt=""
                aria-hidden="true"
              />
              <span className="feed-user-name">{post.userName}</span>
            </button>
          ) : (
            <>
              <img
                className="feed-avatar"
                src={getAvatarSrc(post.avatarId)}
                alt=""
                aria-hidden="true"
              />
              <span className="feed-user-name">{post.userName}</span>
            </>
          )}
          <span className="feed-user-level">Lv.{post.level}</span>
        </div>
        <span className={`feed-status feed-status-${post.status}`}>
          {post.status === 'done' ? '✓ ' : '⚑ '}
          {post.statusLabel}
        </span>
      </div>

      <p className="feed-task">{post.task}</p>

      <div className="feed-card-footer">
        <button
          className={`feed-reaction ${post.liked ? 'active' : ''}`}
          type="button"
          aria-pressed={post.liked}
          onClick={() => onLike(post.id)}
          disabled={!post.canLike}
        >
          <span className="feed-action-icon">
            <img
              src={post.liked ? likeActiveIcon : likeIcon}
              alt=""
              aria-hidden="true"
            />
          </span>
          <span>{post.likes}</span>
        </button>
        <button
          className={`feed-comment-count ${post.commented ? 'active' : ''}`}
          type="button"
          aria-pressed={post.commented}
          aria-label={`${post.userName}さんのコメントを開く`}
          onClick={() => onOpenComments(post.id)}
          disabled={!post.canComment}
        >
          <span className="feed-action-icon">
            <img
              src={post.commented ? commentActiveIcon : commentIcon}
              alt=""
              aria-hidden="true"
            />
          </span>
          <span>{post.commentsCount}</span>
        </button>
        <time
          className="feed-post-age"
          dateTime={new Date(post.createdAt).toISOString()}
        >
          {formatFeedPostAge(post.createdAt, now)}
        </time>
      </div>
    </article>
  )
}
