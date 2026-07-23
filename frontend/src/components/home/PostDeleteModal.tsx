type PostDeleteModalProps = {
  isDeleting: boolean
  error: string
  onCancel: () => void
  onConfirm: () => void
}

export function PostDeleteModal({
  isDeleting,
  error,
  onCancel,
  onConfirm,
}: PostDeleteModalProps) {
  return (
    <div className="post-delete-modal-backdrop" role="presentation">
      <section
        className="post-delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-delete-modal-title"
        aria-describedby="post-delete-modal-description"
      >
        <h2 id="post-delete-modal-title">投稿を削除しますか？</h2>
        <p id="post-delete-modal-description">
          削除した投稿は元に戻せません。この投稿に関する達成回数・いいね・コメントも実績から削除されます。
        </p>
        {error ? (
          <p className="post-delete-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="post-delete-modal-actions">
          <button type="button" onClick={onCancel} disabled={isDeleting}>
            キャンセル
          </button>
          <button
            className="post-delete-confirm-button"
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? '削除中…' : '削除する'}
          </button>
        </div>
      </section>
    </div>
  )
}
