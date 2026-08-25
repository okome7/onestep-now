import type { MouseEvent, ReactNode } from 'react'

type SignupHeaderProps = {
  title: string
  onBack?: () => void
}

export function SignupHeader({ title, onBack }: SignupHeaderProps) {
  const isAuthHeader = title === 'ログイン' || title === '新規登録'

  return (
    <header
      className={`signup-header ${isAuthHeader ? 'signup-header-auth' : ''}`}
    >
      {onBack ? (
        <button
          className="back-button"
          type="button"
          aria-label="戻る"
          onClick={onBack}
        >
          &lt;
        </button>
      ) : null}
      <h1>{title}</h1>
    </header>
  )
}

type AppHeaderProps = {
  title?: string
  leftAction?: ReactNode
  rightAction?: ReactNode
}

export function AppHeader({
  title = 'OneStep Now',
  leftAction = null,
  rightAction = null,
}: AppHeaderProps) {
  const isBrandHeader = title === 'OneStep Now'
  const isMainSectionHeader = title === 'フィード' || title === 'マイページ'

  return (
    <header
      className={`home-header ${isBrandHeader ? 'home-header-brand' : ''} ${isMainSectionHeader ? 'home-header-section' : ''}`}
    >
      <div
        className="home-header-action"
        aria-hidden={leftAction ? undefined : 'true'}
      >
        {leftAction}
      </div>
      <h1>{title}</h1>
      <div className="home-header-action home-header-action-right">
        {rightAction}
      </div>
      {isBrandHeader ? (
        <p className="home-brand-message">考える前に、まずひとつ始めよう。</p>
      ) : null}
    </header>
  )
}

type UnsavedChangesModalProps = {
  onContinue: () => void
  onDiscard: () => void
}

export function UnsavedChangesModal({
  onContinue,
  onDiscard,
}: UnsavedChangesModalProps) {
  return (
    <div className="unsaved-modal-backdrop" role="presentation">
      <section
        className="unsaved-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-modal-title"
        aria-describedby="unsaved-modal-description"
      >
        <p id="unsaved-modal-title">変更は保存されていません。</p>
        <p id="unsaved-modal-description">このまま戻りますか？</p>
        <button
          className="unsaved-modal-primary"
          type="button"
          onClick={onContinue}
        >
          編集を続ける
        </button>
        <button
          className="unsaved-modal-secondary"
          type="button"
          onClick={onDiscard}
        >
          編集せずに戻る
        </button>
      </section>
    </div>
  )
}

function HomeNavIcon() {
  return (
    <svg
      className="home-nav-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3 10.5L12 3L21 10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 10V20H10V15H14V20H19V10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FeedNavIcon() {
  return (
    <svg
      className="home-nav-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="5"
        width="16"
        height="14"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 9H16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 13H13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 13.5L17 14.5L19 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ProfileNavIcon() {
  return (
    <svg
      className="home-nav-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 19C5 15.6863 8.13401 13 12 13C15.866 13 19 15.6863 19 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export type HomeBottomNavActiveItem = 'home' | 'feed' | 'profile'

type HomeBottomNavProps = {
  activeItem: HomeBottomNavActiveItem
  onHomeClick?: (event: MouseEvent<HTMLAnchorElement>) => void
  onFeedClick?: (event: MouseEvent<HTMLAnchorElement>) => void
  onProfileClick?: (event: MouseEvent<HTMLAnchorElement>) => void
}

export function HomeBottomNav({
  activeItem,
  onHomeClick,
  onFeedClick,
  onProfileClick,
}: HomeBottomNavProps) {
  return (
    <nav className="home-bottom-nav" aria-label="ホームメニュー">
      <a
        className={`home-nav-item ${activeItem === 'home' ? 'active' : ''}`}
        href="/home"
        aria-label="ホーム"
        aria-current={activeItem === 'home' ? 'page' : undefined}
        onClick={onHomeClick}
      >
        <HomeNavIcon />
      </a>
      <a
        className={`home-nav-item ${activeItem === 'feed' ? 'active' : ''}`}
        href="/home"
        aria-label="投稿"
        aria-current={activeItem === 'feed' ? 'page' : undefined}
        onClick={onFeedClick}
      >
        <FeedNavIcon />
      </a>
      <a
        className={`home-nav-item ${activeItem === 'profile' ? 'active' : ''}`}
        href="/home"
        aria-label="プロフィール"
        aria-current={activeItem === 'profile' ? 'page' : undefined}
        onClick={onProfileClick}
      >
        <ProfileNavIcon />
      </a>
    </nav>
  )
}
