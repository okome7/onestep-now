import { formatFeedRemainingTime } from '../../appHelpers'

type FeedCountdownProps = {
  remainingSeconds: number
  handAngle: number
}

export function FeedCountdown({
  remainingSeconds,
  handAngle,
}: FeedCountdownProps) {
  const formattedTime = formatFeedRemainingTime(remainingSeconds)

  return (
    <time
      className="feed-countdown"
      dateTime={`PT${remainingSeconds}S`}
      aria-label={`残り ${formattedTime}`}
    >
      <svg
        className="feed-countdown-icon"
        viewBox="0 0 120 120"
        aria-hidden="true"
        focusable="false"
      >
        <circle
          cx="60"
          cy="60"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
        />
        <line
          className="feed-countdown-hand"
          style={{ transform: `rotate(${handAngle}deg)` }}
          x1="60"
          y1="60"
          x2="60"
          y2="34"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </svg>
      <span className="feed-countdown-label">
        <span className="feed-countdown-prefix">残り</span>
        <span className="feed-countdown-time">{formattedTime}</span>
      </span>
    </time>
  )
}
