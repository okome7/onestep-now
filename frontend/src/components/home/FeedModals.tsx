import type { MouseEvent } from 'react'
import feedExpiredClockIcon from '../../assets/icons/feed-expired-clock.svg'

type FeedIntroModalProps = {
  onClose: () => void
}

type FeedExpiredModalProps = {
  onStart: (event: MouseEvent<HTMLButtonElement>) => void
}

export function FeedIntroModal({ onClose }: FeedIntroModalProps) {
  return (
    <div className="feed-expired-backdrop" role="presentation">
      <section
        className="feed-expired-modal feed-intro-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feed-intro-title"
      >
        <h2 id="feed-intro-title">利用時間は5分限定！</h2>
        <p>
          みんなの「やります」「できた」にリアクションして応援しましょう！
          <br />
          フィードは5分だけ見られます
        </p>
        <button
          className="feed-expired-start-button"
          type="button"
          onClick={onClose}
        >
          OK
        </button>
      </section>
    </div>
  )
}

export function FeedExpiredModal({ onStart }: FeedExpiredModalProps) {
  return (
    <div className="feed-expired-backdrop" role="presentation">
      <section
        className="feed-expired-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feed-expired-title"
        aria-describedby="feed-expired-description"
      >
        <img
          className="feed-expired-illustration"
          src={feedExpiredClockIcon}
          alt=""
          aria-hidden="true"
        />
        <h2 id="feed-expired-title">5分経過しました</h2>
        <p id="feed-expired-description">
          リフレッシュできましたか？
          <br />
          次の一歩を始めましょう！
        </p>
        <button
          className="feed-expired-start-button"
          type="button"
          onClick={onStart}
        >
          始める
        </button>
      </section>
    </div>
  )
}
