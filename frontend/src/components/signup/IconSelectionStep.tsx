import type { ChangeEvent, RefObject } from 'react'
import { avatarOptions, customPhotoIconId } from '../../appConstants'

type IconSelectionStepProps = {
  photoInputRef: RefObject<HTMLInputElement | null>
  selectedIconId: string
  customPhotoUrl: string
  isSubmitting: boolean
  message: string
  error: string
  onAvatarClick: (avatarId: string) => void
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void
  onSubmit: () => void
}

export function IconSelectionStep({
  photoInputRef,
  selectedIconId,
  customPhotoUrl,
  isSubmitting,
  message,
  error,
  onAvatarClick,
  onPhotoChange,
  onSubmit,
}: IconSelectionStepProps) {
  return (
    <section className="icon-content" aria-labelledby="icon-title">
      <h2 id="icon-title">アイコンを選ぼう！</h2>
      <p className="icon-description">
        気に入ったアイコンを選んでください。
        <br />
        後からでも変更できます。
      </p>

      <div className="avatar-grid" role="radiogroup" aria-label="アイコン">
        {avatarOptions.map((avatar) => {
          const isCustomPhoto = avatar.id === customPhotoIconId
          const hasCustomPhoto = isCustomPhoto && customPhotoUrl
          const isCameraSlot = isCustomPhoto && !hasCustomPhoto

          return (
            <button
              key={avatar.id}
              className={`avatar-option ${
                selectedIconId === avatar.id ? 'selected' : ''
              } ${isCameraSlot ? 'photo-slot-empty' : ''}`}
              type="button"
              role="radio"
              aria-checked={selectedIconId === avatar.id}
              aria-label={isCameraSlot ? '写真未選択' : avatar.label}
              disabled={isCameraSlot}
              onClick={() => onAvatarClick(avatar.id)}
            >
              {hasCustomPhoto ? (
                <img src={customPhotoUrl} alt="" aria-hidden="true" />
              ) : (
                !isCustomPhoto && (
                  <img src={avatar.src} alt="" aria-hidden="true" />
                )
              )}
            </button>
          )
        })}
      </div>

      <div className="icon-edit-action-list signup-photo-action-list">
        <button
          className="icon-edit-action"
          type="button"
          onClick={() => photoInputRef.current?.click()}
        >
          <span
            className="icon-edit-action-icon icon-edit-action-icon-folder folder-icon"
            aria-hidden="true"
          />
          <span>写真を選ぶ</span>
        </button>
      </div>

      <input
        ref={photoInputRef}
        className="photo-input"
        type="file"
        accept="image/*"
        aria-label="選択する写真"
        onChange={onPhotoChange}
      />

      <button
        className="submit-button icon-submit-button"
        type="button"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        onClick={onSubmit}
      >
        決定
      </button>

      <p
        className={`notice ${message ? 'success' : ''} ${error ? 'error' : ''}`}
        role={error ? 'alert' : undefined}
        aria-live="polite"
      >
        {message || error}
      </p>
    </section>
  )
}
