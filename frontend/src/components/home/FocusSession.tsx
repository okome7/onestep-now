import { formatElapsedTime } from '../../appHelpers'

type FocusSessionProps = {
  activeTask: string
  elapsedSeconds: number
  isSubmitting: boolean
  isCancelConfirmOpen: boolean
  onDone: () => void
  onCancel: () => void
  onCloseCancelConfirm: () => void
  onConfirmCancel: () => void
}

export function FocusSession({
  activeTask,
  elapsedSeconds,
  isSubmitting,
  isCancelConfirmOpen,
  onDone,
  onCancel,
  onCloseCancelConfirm,
  onConfirmCancel,
}: FocusSessionProps) {
  return (
    <section className="focus-session" aria-labelledby="focus-task-title">
      <div className="focus-main">
        <h1 id="focus-task-title">{activeTask}</h1>
        <time className="focus-timer" dateTime={`PT${elapsedSeconds}S`}>
          {formatElapsedTime(elapsedSeconds)}
        </time>
      </div>

      <div className="focus-actions">
        <button
          className="focus-done-button"
          type="button"
          onClick={onDone}
          disabled={isSubmitting}
        >
          できた！
        </button>
        <button className="focus-cancel-button" type="button" onClick={onCancel}>
          やめる
        </button>
      </div>

      {isCancelConfirmOpen ? (
        <div className="task-cancel-modal-backdrop" role="presentation">
          <div
            className="task-cancel-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-cancel-modal-title"
            aria-describedby="task-cancel-modal-description"
          >
            <h2 id="task-cancel-modal-title">このタスクをやめますか？</h2>
            <p id="task-cancel-modal-description">投稿は削除されます</p>
            <div className="task-cancel-modal-actions">
              <button
                className="task-cancel-modal-secondary"
                type="button"
                onClick={onCloseCancelConfirm}
              >
                キャンセル
              </button>
              <button
                className="task-cancel-modal-primary"
                type="button"
                disabled={isSubmitting}
                onClick={onConfirmCancel}
              >
                やめる
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
