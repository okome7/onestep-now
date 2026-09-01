import feedStartClockIcon from '../../assets/icons/feed-start-clock.svg'

type FeedStartGateProps = {
  onStart: () => void
}

export function FeedStartGate({ onStart }: FeedStartGateProps) {
  return (
    <section className="feed-start-gate" aria-labelledby="feed-start-title">
      <div className="feed-start-gate-card">
        <span className="feed-start-clock-wrap" aria-hidden="true">
          <img
            className="feed-start-clock"
            src={feedStartClockIcon}
            alt=""
          />
        </span>
        <div className="feed-start-gate-copy">
          <h2 id="feed-start-title">フィードは3分だけ見られます</h2>
          <p>
            タスクを完了すると、みんなの「やります」「できた」を
            <br />
            3分間だけチェックできます。
          </p>
        </div>
      </div>
      <section className="feed-start-guide" aria-labelledby="feed-start-guide-title">
        <h3 id="feed-start-guide-title">フィードってなに？</h3>
        <p>
          みんなの「やります」「できた」を見て、
          <br />
          応援したり、コメントしたりできる場所です。
        </p>
        <ol className="feed-start-steps" aria-label="フィードの流れ">
          <li>
            <span className="feed-start-step-icon feed-start-step-flag">⚑</span>
            <strong>1. やります</strong>
            <small>
              タスクを決めて
              <br />
              宣言しよう
            </small>
          </li>
          <li>
            <span className="feed-start-step-icon feed-start-step-check">✓</span>
            <strong>2. できた！</strong>
            <small>タスクが終わったら完了しよう</small>
          </li>
          <li>
            <span className="feed-start-step-icon feed-start-step-heart">♥</span>
            <strong>3. フィード解放</strong>
            <small>完了すると3分間だけ見られる！</small>
          </li>
        </ol>
      </section>
      <button
        className="feed-expired-start-button"
        type="button"
        onClick={onStart}
      >
        最初の一歩を始める
      </button>
    </section>
  )
}
