import type { MouseEvent } from 'react'
import { getAvatarSrc } from '../../appHelpers'
import type { FeedComment } from '../../appTypes'
import commentIcon from '../../assets/icons/comment.svg'
import likeIcon from '../../assets/icons/like.svg'

type TaskCompleteScreenProps = {
  activeTask: string
  likes: number
  comments: FeedComment[]
  onOpenFeed: (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void
  onNextTask: () => void
}

export function TaskCompleteScreen({
  activeTask,
  likes,
  comments,
  onOpenFeed,
  onNextTask,
}: TaskCompleteScreenProps) {
  const hasComments = comments.length > 0

  return (
    <section
      className="task-complete-screen"
      aria-labelledby="task-complete-title"
    >
      <div className="complete-confetti" aria-hidden="true">
        <div className="cracker-burst cracker-burst-left">
          {Array.from({ length: 18 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>
        <div className="cracker-burst cracker-burst-right">
          {Array.from({ length: 18 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>
      </div>

      <div className="task-complete-content">
        <h1 id="task-complete-title" className="task-complete-title">
          <svg
            className="title-star title-star-left"
            width="34"
            height="34"
            viewBox="0 0 34 34"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M17 2.5L20.8 12.6L31.5 13.1L23.1 19.8L25.9 30.2L17 24.3L8.1 30.2L10.9 19.8L2.5 13.1L13.2 12.6L17 2.5Z" />
          </svg>
          <span>よくできた</span>
          <svg
            className="title-star title-star-right"
            width="34"
            height="34"
            viewBox="0 0 34 34"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M17 2.5L20.8 12.6L31.5 13.1L23.1 19.8L25.9 30.2L17 24.3L8.1 30.2L10.9 19.8L2.5 13.1L13.2 12.6L17 2.5Z" />
          </svg>
        </h1>
        <p className="task-complete-name">{activeTask}</p>

        <div className="task-complete-stats" aria-label="リアクション">
          <span>
            <img src={likeIcon} alt="" aria-hidden="true" />
            {likes}件
          </span>
          <span>
            <img src={commentIcon} alt="" aria-hidden="true" />
            {comments.length}件
          </span>
        </div>

        {hasComments ? (
          <section className="complete-comments">
            <h2>コメント</h2>
            <div
              className="complete-comments-scroll"
              role="region"
              aria-label="コメント"
            >
              <ul>
                {comments.map((comment) => (
                  <li key={comment.id}>
                    <img
                      className="comment-avatar"
                      src={getAvatarSrc(comment.avatarId)}
                      alt=""
                      aria-hidden="true"
                    />
                    <span className="complete-comment-text">
                      {comment.body}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </div>

      <div className="task-complete-actions">
        <a className="complete-feed-button" href="/home" onClick={onOpenFeed}>
          みんなを見る
        </a>
        <button
          className="complete-next-button"
          type="button"
          onClick={onNextTask}
        >
          次の一歩へ
        </button>
      </div>
    </section>
  )
}
