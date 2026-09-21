import type { ChangeEvent, FormEvent, RefObject } from 'react'
import { avatarOptions, customPhotoIconId } from '../../appConstants'
import iconGridIcon from '../../assets/icons/icon-grid.svg'
import { AppHeader, BackIcon, UnsavedChangesModal } from '../../sharedComponents'

type ProfileIconEditPageProps = {
  photoInputRef: RefObject<HTMLInputElement | null>
  previewSrc: string
  selectedIconId: string
  customPhotoUrl: string
  canSave: boolean
  isSaving: boolean
  saveError: string
  isAvatarGridOpen: boolean
  isDiscardConfirmOpen: boolean
  onBack: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onToggleAvatarGrid: () => void
  onCloseAvatarGrid: () => void
  onAvatarClick: (avatarId: string) => void
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void
  onContinue: () => void
  onDiscard: () => void
}

export function ProfileIconEditPage({
  photoInputRef,
  previewSrc,
  selectedIconId,
  customPhotoUrl,
  canSave,
  isSaving,
  saveError,
  isAvatarGridOpen,
  isDiscardConfirmOpen,
  onBack,
  onSubmit,
  onToggleAvatarGrid,
  onCloseAvatarGrid,
  onAvatarClick,
  onPhotoChange,
  onContinue,
  onDiscard,
}: ProfileIconEditPageProps) {
  return (
    <main className="home-page icon-edit-page">
      <AppHeader
        title="アイコン"
        leftAction={
          <button
            className="settings-back-button"
            type="button"
            aria-label="設定に戻る"
            onClick={onBack}
          >
            <BackIcon />
          </button>
        }
        rightAction={
          <button
            className="name-edit-done-button"
            type="submit"
            form="settings-icon-form"
            disabled={!canSave || isSaving}
          >
            完了
          </button>
        }
      />

      <form
        id="settings-icon-form"
        className="icon-edit-content"
        aria-label="アイコン変更"
        onSubmit={onSubmit}
      >
        <img
          className="icon-edit-preview"
          src={previewSrc}
          alt=""
          aria-hidden="true"
        />
        {saveError ? (
          <p className="notice error" role="alert">
            {saveError}
          </p>
        ) : null}

        <div className="icon-edit-action-list">
          <button
            className="icon-edit-action"
            type="button"
            aria-expanded={isAvatarGridOpen}
            onClick={onToggleAvatarGrid}
          >
            <img
              className="icon-edit-action-icon icon-edit-action-icon-grid"
              src={iconGridIcon}
              alt=""
              aria-hidden="true"
            />
            <span className="icon-edit-action-text-grid">アイコンを選択</span>
          </button>

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

        {isAvatarGridOpen ? (
          <div
            className="icon-palette-backdrop"
            role="presentation"
            onClick={onCloseAvatarGrid}
          >
            <section
              className="icon-palette-modal"
              role="dialog"
              aria-modal="true"
              aria-label="アイコンを選択"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="icon-palette-close-button"
                type="button"
                aria-label="閉じる"
                onClick={onCloseAvatarGrid}
              >
                ×
              </button>
              <div
                className="avatar-grid icon-edit-avatar-grid"
                role="radiogroup"
                aria-label="アイコン"
              >
                {avatarOptions.map((avatar) => {
                  const isCustomPhoto = avatar.id === customPhotoIconId
                  const hasCustomPhoto = isCustomPhoto && customPhotoUrl
                  const isCameraSlot = isCustomPhoto && !hasCustomPhoto
                  const avatarId = hasCustomPhoto ? customPhotoUrl : avatar.id

                  return (
                    <button
                      key={avatar.id}
                      className={`avatar-option ${
                        selectedIconId === avatarId ? 'selected' : ''
                      } ${isCameraSlot ? 'photo-slot-empty' : ''}`}
                      type="button"
                      role="radio"
                      aria-checked={selectedIconId === avatarId}
                      aria-label={isCameraSlot ? '写真未選択' : avatar.label}
                      disabled={isCameraSlot}
                      onClick={() => onAvatarClick(avatarId)}
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
            </section>
          </div>
        ) : null}

        <input
          ref={photoInputRef}
          className="photo-input"
          type="file"
          accept="image/*"
          aria-label="選択する写真"
          onChange={onPhotoChange}
        />
      </form>

      {isDiscardConfirmOpen ? (
        <UnsavedChangesModal onContinue={onContinue} onDiscard={onDiscard} />
      ) : null}
    </main>
  )
}
