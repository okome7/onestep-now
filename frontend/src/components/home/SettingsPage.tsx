import type { ReactNode } from 'react'
import { AppHeader, BackIcon } from '../../sharedComponents'

type SettingsPageProps = {
  isLogoutConfirmOpen: boolean
  isAccountDeleteConfirmOpen: boolean
  isAccountDeletedOpen: boolean
  isDeletingAccount: boolean
  accountDeleteError: string
  onBack: () => void
  onOpenNameEdit: () => void
  onOpenIconEdit: () => void
  onOpenLogoutConfirm: () => void
  onCloseLogoutConfirm: () => void
  onConfirmLogout: () => void
  onOpenAccountDeleteConfirm: () => void
  onCloseAccountDeleteConfirm: () => void
  onConfirmAccountDelete: () => void
  onGoToLogin: () => void
}

function NameIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path
        d="M5 7.5H15.5"
        stroke="#9B6BFF"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <path
        d="M5 14H12.5"
        stroke="#9B6BFF"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <path
        d="M5 20.5H10"
        stroke="#9B6BFF"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <path
        d="M18.2 9.3L21.7 12.8"
        stroke="#9B6BFF"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.8 21.2L16.1 20.4L23.4 13.1C24.2 12.3 24.2 11 23.4 10.2L22.8 9.6C22 8.8 20.7 8.8 19.9 9.6L12.6 16.9L11.8 20.2C11.6 20.8 12.2 21.4 12.8 21.2Z"
        stroke="#9B6BFF"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AvatarIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="10" r="4" stroke="#2EA8FF" strokeWidth="2.3" />
      <path
        d="M6.5 22C7.6 18.4 10.3 16.5 14 16.5C17.7 16.5 20.4 18.4 21.5 22"
        stroke="#2EA8FF"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <path
        d="M20.5 7.5L22.5 5.5"
        stroke="#2EA8FF"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <path
        d="M22.5 5.5L24.5 7.5"
        stroke="#2EA8FF"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <path
        d="M22.5 5.5V11"
        stroke="#2EA8FF"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path
        d="M17 6H10C8.9 6 8 6.9 8 8V20C8 21.1 8.9 22 10 22H17"
        stroke="#24C58A"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 14H23"
        stroke="#24C58A"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <path
        d="M20 11L23 14L20 17"
        stroke="#24C58A"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect
        x="11"
        y="4.5"
        width="6"
        height="3"
        rx="1"
        stroke="#FF5A5F"
        strokeWidth="2.3"
      />
      <path
        d="M7 8H21"
        stroke="#FF5A5F"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <rect
        x="8"
        y="8"
        width="12"
        height="14"
        rx="2.5"
        stroke="#FF5A5F"
        strokeWidth="2.3"
      />
      <path
        d="M12 12V18"
        stroke="#FF5A5F"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <path
        d="M16 12V18"
        stroke="#FF5A5F"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

type SettingsMenuItemProps = {
  label: string
  iconClassName: string
  icon: ReactNode
  isDanger?: boolean
  onClick: () => void
}

function SettingsMenuItem({
  label,
  iconClassName,
  icon,
  isDanger = false,
  onClick,
}: SettingsMenuItemProps) {
  return (
    <button
      className={
        isDanger
          ? 'settings-menu-item settings-menu-item-danger'
          : 'settings-menu-item'
      }
      type="button"
      onClick={onClick}
    >
      <span className="settings-menu-label">
        <span
          className={`settings-menu-icon ${iconClassName}`}
          aria-hidden="true"
        >
          {icon}
        </span>
        <span>{label}</span>
      </span>
      <span className="settings-menu-chevron" aria-hidden="true">
        &gt;
      </span>
    </button>
  )
}

export function SettingsPage({
  isLogoutConfirmOpen,
  isAccountDeleteConfirmOpen,
  isAccountDeletedOpen,
  isDeletingAccount,
  accountDeleteError,
  onBack,
  onOpenNameEdit,
  onOpenIconEdit,
  onOpenLogoutConfirm,
  onCloseLogoutConfirm,
  onConfirmLogout,
  onOpenAccountDeleteConfirm,
  onCloseAccountDeleteConfirm,
  onConfirmAccountDelete,
  onGoToLogin,
}: SettingsPageProps) {
  return (
    <main className="home-page settings-page">
      <AppHeader
        title="設定"
        leftAction={
          <button
            className="settings-back-button"
            type="button"
            aria-label="マイページに戻る"
            onClick={onBack}
          >
            <BackIcon />
          </button>
        }
      />

      <section className="settings-content" aria-label="設定">
        <div className="settings-menu-group">
          <SettingsMenuItem
            label="表示名変更"
            iconClassName="settings-menu-icon-name"
            icon={<NameIcon />}
            onClick={onOpenNameEdit}
          />
          <SettingsMenuItem
            label="アイコン変更"
            iconClassName="settings-menu-icon-avatar"
            icon={<AvatarIcon />}
            onClick={onOpenIconEdit}
          />
        </div>
        <div className="settings-menu-group">
          <SettingsMenuItem
            label="ログアウト"
            iconClassName="settings-menu-icon-logout"
            icon={<LogoutIcon />}
            onClick={onOpenLogoutConfirm}
          />
          <SettingsMenuItem
            label="アカウント削除"
            iconClassName="settings-menu-icon-delete"
            icon={<DeleteIcon />}
            isDanger
            onClick={onOpenAccountDeleteConfirm}
          />
        </div>
      </section>

      {isLogoutConfirmOpen ? (
        <div className="logout-modal-backdrop" role="presentation">
          <section
            className="logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
            aria-describedby="logout-modal-description"
          >
            <div className="logout-modal-body">
              <h2 id="logout-modal-title">ログアウトしますか？</h2>
              <p id="logout-modal-description">
                現在のアカウントからログアウトします。
              </p>
            </div>
            <div className="logout-modal-actions">
              <button
                className="logout-modal-secondary"
                type="button"
                onClick={onCloseLogoutConfirm}
              >
                キャンセル
              </button>
              <button
                className="logout-modal-primary"
                type="button"
                onClick={onConfirmLogout}
              >
                ログアウト
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isAccountDeleteConfirmOpen ? (
        <div className="logout-modal-backdrop" role="presentation">
          <section
            className="logout-modal account-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-delete-modal-title"
            aria-describedby="account-delete-modal-description"
          >
            <div className="logout-modal-body">
              <h2 id="account-delete-modal-title">
                アカウントを削除しますか？
              </h2>
              <p id="account-delete-modal-description">
                この操作は取り消せません。
                <br />
                アカウントとすべてのデータが削除されます。
              </p>
              {accountDeleteError ? (
                <p className="account-delete-error" role="alert">
                  {accountDeleteError}
                </p>
              ) : null}
            </div>
            <div className="logout-modal-actions">
              <button
                className="logout-modal-secondary"
                type="button"
                onClick={onCloseAccountDeleteConfirm}
                disabled={isDeletingAccount}
              >
                キャンセル
              </button>
              <button
                className="account-delete-modal-primary"
                type="button"
                onClick={onConfirmAccountDelete}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? '削除中' : '削除する'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isAccountDeletedOpen ? (
        <div className="account-deleted-page" role="presentation">
          <section
            className="account-deleted-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-deleted-modal-title"
            aria-describedby="account-deleted-modal-description"
          >
            <h2 id="account-deleted-modal-title">アカウントを削除しました</h2>
            <p id="account-deleted-modal-description">
              ご利用ありがとうございました。
            </p>
            <div className="account-deleted-divider" aria-hidden="true" />
            <button
              className="account-deleted-button"
              type="button"
              onClick={onGoToLogin}
            >
              ログイン画面へ
            </button>
          </section>
        </div>
      ) : null}
    </main>
  )
}
