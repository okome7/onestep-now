import type { FormEvent } from 'react'
import { AppHeader, BackIcon, UnsavedChangesModal } from '../../sharedComponents'

type ProfileNameEditPageProps = {
  displayNameDraft: string
  canSave: boolean
  isSaving: boolean
  saveError: string
  isDiscardConfirmOpen: boolean
  onBack: () => void
  onChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onContinue: () => void
  onDiscard: () => void
}

export function ProfileNameEditPage({
  displayNameDraft,
  canSave,
  isSaving,
  saveError,
  isDiscardConfirmOpen,
  onBack,
  onChange,
  onSubmit,
  onContinue,
  onDiscard,
}: ProfileNameEditPageProps) {
  return (
    <main className="home-page name-edit-page">
      <AppHeader
        title="名前"
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
            form="display-name-form"
            disabled={!canSave || isSaving}
          >
            完了
          </button>
        }
      />

      <section className="name-edit-content" aria-label="表示名変更">
        <form
          id="display-name-form"
          className="name-edit-form"
          onSubmit={onSubmit}
        >
          <label htmlFor="display-name-input">表示名</label>
          <input
            id="display-name-input"
            type="text"
            value={displayNameDraft}
            onChange={(event) => onChange(event.target.value)}
          />
        </form>
        {saveError ? (
          <p className="notice error" role="alert">
            {saveError}
          </p>
        ) : null}
      </section>

      {isDiscardConfirmOpen ? (
        <UnsavedChangesModal onContinue={onContinue} onDiscard={onDiscard} />
      ) : null}
    </main>
  )
}
